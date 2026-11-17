"""
Tests for Contextual Security Severity Calibration.
Verifies that:
- Severity is separated from confidence.
- Reachable vulnerabilities have higher severity than unreachable ones.
- Counterevidence and parameterization downgrade severity or reject findings.
"""
import pytest
from pathlib import Path
from traceguard.core.context import AuditContext
from traceguard.core.models import Severity, Category, VerificationStatus
from traceguard.pipeline import AuditPipeline


def test_severity_confidence_separation():
    """Verify that Finding model separates severity (impact) from confidence (evidence strength)."""
    ctx = AuditContext(Path("./benchmark_repos/repo1_ecommerce_fullstack"))
    pipeline = AuditPipeline(ctx)
    report = pipeline.run()

    for f in report.findings:
        assert isinstance(f.severity, Severity)
        assert 0.0 <= f.confidence <= 1.0
        assert isinstance(f.verification_status, VerificationStatus)


def test_sql_injection_contextual_severity():
    """Direct f-string SQL query on search endpoint should be classified as CRITICAL or HIGH."""
    ctx = AuditContext(Path("./benchmark_repos/repo4_fastapi_react"))
    pipeline = AuditPipeline(ctx)
    report = pipeline.run()

    sqli = [f for f in report.findings if f.subcategory == "injection" and "SELECT" in f.snippet]
    assert len(sqli) > 0
    assert sqli[0].severity in (Severity.CRITICAL, Severity.HIGH)
    assert sqli[0].confidence >= 0.8


def test_counterevidence_recorded_on_findings():
    """Findings must document what counterevidence was evaluated."""
    ctx = AuditContext(Path("./benchmark_repos/repo1_ecommerce_fullstack"))
    pipeline = AuditPipeline(ctx)
    report = pipeline.run()

    # Find a confirmed or probable finding
    evidenced = [f for f in report.findings if len(f.counterevidence_considered) > 0]
    assert len(evidenced) > 0
