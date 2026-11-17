"""
Tests for Change-Aware Incremental Auditing and Finding Lifecycle Tracking.
Verifies file hashing, diff detection, lifecycle state transitions,
and consistency between full and incremental audit runs.
"""
import pytest
import tempfile
import shutil
from pathlib import Path

from traceguard.core.context import AuditContext
from traceguard.core.models import (
    Category, Severity, VerificationStatus, LifecycleState, Finding
)
from traceguard.pipeline import AuditPipeline
from traceguard.incremental import IncrementalAuditEngine, diff_hashes, _hash_files
from traceguard.storage.db import (
    compute_file_hash, get_connection, save_audit, save_findings, get_audit_findings_rows
)


def test_file_hash_and_diffing():
    prev = {
        "app/main.py": "hash_a",
        "app/utils.py": "hash_b",
        "app/old.py": "hash_c",
    }
    curr = {
        "app/main.py": "hash_a_modified",
        "app/utils.py": "hash_b",
        "app/new.py": "hash_d",
    }
    modified, added, deleted = diff_hashes(prev, curr)
    assert modified == {"app/main.py"}
    assert added == {"app/new.py"}
    assert deleted == {"app/old.py"}


def test_stable_finding_id_stability():
    """
    Ensure that a finding's stable_id depends on semantic identity
    (category, subcategory, file, title), NOT line numbers.
    """
    f1 = Finding(
        id="TG-GAP-001",
        category=Category.GAP,
        subcategory="missing_backend_route",
        title="Missing Route GET /api/v1/missing",
        severity=Severity.HIGH,
        confidence=0.9,
        verification_status=VerificationStatus.CONFIRMED,
        affected_file="frontend/api.ts",
        line_number=10,  # line 10
        snippet="fetch('/api/v1/missing')",
        technical_explanation="...",
        potential_impact="...",
        recommended_remediation="...",
    )
    f2 = Finding(
        id="TG-GAP-002",
        category=Category.GAP,
        subcategory="missing_backend_route",
        title="Missing Route GET /api/v1/missing",
        severity=Severity.HIGH,
        confidence=0.9,
        verification_status=VerificationStatus.CONFIRMED,
        affected_file="frontend/api.ts",
        line_number=55,  # line shifted to 55
        snippet="fetch('/api/v1/missing')",
        technical_explanation="...",
        potential_impact="...",
        recommended_remediation="...",
    )
    assert f1.compute_stable_id() == f2.compute_stable_id()


def test_lifecycle_transitions_new_to_existing():
    """
    Findings present in both runs transition from NEW to EXISTING.
    """
    pipeline = AuditPipeline(AuditContext(Path("./benchmark_repos/repo1_ecommerce_fullstack")))

    f_base = Finding(
        id="TG-SEC-001",
        category=Category.SECURITY,
        subcategory="injection",
        title="SQL Injection in search",
        severity=Severity.CRITICAL,
        confidence=0.95,
        verification_status=VerificationStatus.CONFIRMED,
        affected_file="app/routers/search.py",
        line_number=20,
        snippet="SELECT *",
        technical_explanation="...",
        potential_impact="...",
        recommended_remediation="...",
    )
    f_base.stable_id = f_base.compute_stable_id()

    # Pass previous finding
    current_findings = [f_base.model_copy()]
    updated = pipeline._apply_lifecycle(current_findings, [f_base])

    assert updated[0].lifecycle_state == LifecycleState.EXISTING


def test_lifecycle_transitions_new_finding():
    pipeline = AuditPipeline(AuditContext(Path("./benchmark_repos/repo1_ecommerce_fullstack")))

    f_existing = Finding(
        id="TG-SEC-001",
        category=Category.SECURITY,
        subcategory="injection",
        title="Old injection",
        severity=Severity.CRITICAL,
        confidence=0.95,
        verification_status=VerificationStatus.CONFIRMED,
        affected_file="app/old.py",
        line_number=20,
        snippet="SELECT *",
        technical_explanation="...",
        potential_impact="...",
        recommended_remediation="...",
    )
    f_existing.stable_id = f_existing.compute_stable_id()

    f_new = Finding(
        id="TG-SEC-002",
        category=Category.SECURITY,
        subcategory="injection",
        title="Brand new injection",
        severity=Severity.CRITICAL,
        confidence=0.95,
        verification_status=VerificationStatus.CONFIRMED,
        affected_file="app/new.py",
        line_number=10,
        snippet="SELECT *",
        technical_explanation="...",
        potential_impact="...",
        recommended_remediation="...",
    )
    f_new.stable_id = f_new.compute_stable_id()

    updated = pipeline._apply_lifecycle([f_new], [f_existing])
    assert updated[0].lifecycle_state == LifecycleState.NEW


def test_lifecycle_reintroduced_state():
    pipeline = AuditPipeline(AuditContext(Path("./benchmark_repos/repo1_ecommerce_fullstack")))

    f_reintro = Finding(
        id="TG-SEC-001",
        category=Category.SECURITY,
        subcategory="injection",
        title="Previously resolved vulnerability reintroduced",
        severity=Severity.CRITICAL,
        confidence=0.95,
        verification_status=VerificationStatus.CONFIRMED,
        lifecycle_state=LifecycleState.RESOLVED,
        affected_file="app/auth.py",
        line_number=15,
        snippet="token == secret",
        technical_explanation="...",
        potential_impact="...",
        recommended_remediation="...",
    )
    f_reintro.stable_id = f_reintro.compute_stable_id()

    # In current audit, it reappears
    f_curr = f_reintro.model_copy(update={"lifecycle_state": LifecycleState.NEW})
    updated = pipeline._apply_lifecycle([f_curr], [f_reintro])
    assert updated[0].lifecycle_state == LifecycleState.REINTRODUCED


def test_incremental_engine_runs_and_persists_to_sqlite():
    with tempfile.TemporaryDirectory() as tmpdir:
        db_path = Path(tmpdir) / "test_traceguard.db"
        ctx = AuditContext(Path("./benchmark_repos/repo1_ecommerce_fullstack"))
        engine = IncrementalAuditEngine(ctx, db_path=db_path)

        # Run 1
        rep1 = engine.run()
        assert rep1.audit_id is not None
        assert len(rep1.findings) > 0
        assert rep1.is_incremental is False

        # Verify DB rows
        rows1 = get_audit_findings_rows(rep1.audit_id, db_path)
        assert len(rows1) == len(rep1.findings)

        # Run 2 on same repo -> should be incremental and mark findings as EXISTING
        engine2 = IncrementalAuditEngine(ctx, db_path=db_path)
        rep2 = engine2.run()
        assert rep2.is_incremental is True
        # Findings should now be marked EXISTING
        existing = [f for f in rep2.findings if f.lifecycle_state == LifecycleState.EXISTING]
        assert len(existing) > 0
