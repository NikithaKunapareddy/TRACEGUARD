"""
TraceGuard Incremental Audit Engine.
Detects file-level changes and compares findings across audits for lifecycle tracking.
Incremental analysis produces results consistent with a full audit.
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Dict, List, Optional, Set, Tuple

from .core.models import AuditReport, Finding, LifecycleState
from .core.context import AuditContext, AuditConfig
from .pipeline import AuditPipeline
from .storage.db import (
    compute_file_hash,
    save_audit,
    save_findings,
    save_file_hashes,
    get_latest_audit_id,
    get_audit_findings_rows,
    get_file_hashes,
    DB_PATH,
)


def _hash_files(files_content: Dict[str, str]) -> Dict[str, str]:
    return {path: compute_file_hash(content) for path, content in files_content.items()}


def diff_hashes(
    prev: Dict[str, str], curr: Dict[str, str]
) -> Tuple[Set[str], Set[str], Set[str]]:
    """
    Returns (modified_files, added_files, deleted_files).
    modified = same path, different hash.
    """
    prev_paths = set(prev.keys())
    curr_paths = set(curr.keys())
    added   = curr_paths - prev_paths
    deleted = prev_paths - curr_paths
    modified = {p for p in prev_paths & curr_paths if prev[p] != curr[p]}
    return modified, added, deleted


def _load_prev_findings(prev_audit_id: str, db_path: Path = DB_PATH) -> List[Finding]:
    """
    Reconstruct minimal Finding objects from SQLite for lifecycle comparison.
    We only need stable_id and lifecycle_state for the comparison.
    """
    from .core.models import (
        Category, Severity, VerificationStatus, LifecycleState, Finding
    )
    rows = get_audit_findings_rows(prev_audit_id, db_path)
    findings = []
    for r in rows:
        try:
            f = Finding(
                id=f"TG-PREV-{r['id']}",
                stable_id=r["stable_id"],
                category=Category(r["category"]),
                subcategory=r["subcategory"] or "",
                severity=Severity(r["severity"]),
                confidence=r["confidence"] if r["confidence"] is not None else 1.0,
                verification_status=VerificationStatus(r["verification_status"]),
                lifecycle_state=LifecycleState(r["lifecycle_state"]),
                affected_file=r["affected_file"] or "",
                line_number=r["line_number"] or 0,
                snippet=r["snippet"] or "",
                title=r["title"] or "",
                technical_explanation=r["technical_explanation"] or "",
                potential_impact=r["potential_impact"] or "",
                recommended_remediation=r["recommended_remediation"] or "",
            )
            findings.append(f)
        except Exception:
            pass
    return findings


class IncrementalAuditEngine:
    """
    Runs a full audit and enriches findings with lifecycle states by comparing
    to the most recent completed audit in SQLite.

    Guarantees:
    - The analysis result is IDENTICAL to a full audit if no previous audit exists.
    - Lifecycle states (NEW / EXISTING / RESOLVED / REINTRODUCED) are assigned
      by comparing stable_ids against the previous audit.
    - File hashes are persisted so future audits can detect changes.
    """

    def __init__(
        self,
        context: AuditContext,
        db_path=DB_PATH,
        audit_id: Optional[str] = None,
    ):
        self.context = context
        self.db_path = db_path
        self.audit_id = audit_id or getattr(context, "audit_id", None)

    def run(self, audit_id: Optional[str] = None) -> AuditReport:
        # Always run a full audit — incremental refers to lifecycle tracking, not analysis scope
        pipeline = AuditPipeline(self.context)

        # Load previous findings if available
        repo_path_str = str(self.context.repo_path.resolve())
        prev_audit_id = get_latest_audit_id(repo_path_str, self.db_path)
        prev_findings = _load_prev_findings(prev_audit_id, self.db_path) if prev_audit_id else []

        # Compute file hashes for change detection
        from .ingestion.scanner import RepositoryScanner
        scanner = RepositoryScanner(self.context)
        files_meta, files_content, _ = scanner.scan()
        curr_hashes = _hash_files(files_content)

        # Determine changed files if previous audit exists
        is_incremental = bool(prev_audit_id)
        if prev_audit_id:
            prev_hashes = get_file_hashes(prev_audit_id, self.db_path)
            modified, added, deleted = diff_hashes(prev_hashes, curr_hashes)
        else:
            modified, added, deleted = set(), set(), set()

        # Run full audit with lifecycle comparison
        effective_audit_id = audit_id or self.audit_id
        report = pipeline.run(prev_findings=prev_findings, audit_id=effective_audit_id)
        self.graph = getattr(pipeline, "graph", None)

        # Persist results
        assessment = report.assessment
        save_audit(
            audit_id=report.audit_id,
            repo_path=repo_path_str,
            status="completed",
            is_incremental=is_incremental,
            overall_score=assessment.overall_score,
            security_risk_score=assessment.security_risk_score,
            impl_completeness_score=assessment.implementation_completeness_score,
            code_quality_score=assessment.code_quality_score,
            dev_hygiene_score=assessment.development_hygiene_score,
            rating=assessment.rating,
            total_findings=len(report.findings),
            report_json=report.model_dump_json(),
            db_path=self.db_path,
        )
        save_findings(report.audit_id, report.findings, self.db_path)
        save_file_hashes(report.audit_id, curr_hashes, self.db_path)

        return report

    def get_change_summary(self, prev_audit_id: str, curr_audit_id: str) -> Dict:
        """Compare findings between two audit runs and summarise lifecycle transitions."""
        prev_rows = {r["stable_id"]: r for r in get_audit_findings_rows(prev_audit_id, self.db_path)}
        curr_rows = {r["stable_id"]: r for r in get_audit_findings_rows(curr_audit_id, self.db_path)}

        new_findings      = [sid for sid in curr_rows if sid not in prev_rows]
        resolved_findings = [sid for sid in prev_rows if sid not in curr_rows]
        existing_findings = [sid for sid in curr_rows if sid in prev_rows]
        reintroduced      = [
            sid for sid in curr_rows
            if sid in prev_rows and prev_rows[sid]["lifecycle_state"] == "RESOLVED"
        ]

        return {
            "prev_audit_id": prev_audit_id,
            "curr_audit_id": curr_audit_id,
            "new_count": len(new_findings),
            "resolved_count": len(resolved_findings),
            "existing_count": len(existing_findings),
            "reintroduced_count": len(reintroduced),
            "new_stable_ids": new_findings,
            "resolved_stable_ids": resolved_findings,
        }
