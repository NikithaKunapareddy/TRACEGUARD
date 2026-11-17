"""
Tests for 4-dimensional integrity scoring.
Verifies that findings in each category affect the correct dimension only.
"""
import pytest
from pathlib import Path
from traceguard.pipeline import AuditPipeline
from traceguard.core.models import (
    Finding, Category, Severity, VerificationStatus,
    LifecycleState, RepositoryOverview,
)
from traceguard.core.context import AuditContext


def _overview(files: int = 20, lines: int = 1000) -> RepositoryOverview:
    return RepositoryOverview(
        root_path="./test",
        total_files=files,
        total_lines=lines,
        languages={"python": lines},
        detected_frameworks=[],
    )


def _finding(category: Category, severity: Severity,
             status: VerificationStatus = VerificationStatus.CONFIRMED,
             confidence: float = 1.0) -> Finding:
    return Finding(
        id=f"TG-TEST-001",
        category=category,
        subcategory="test",
        severity=severity,
        confidence=confidence,
        verification_status=status,
        affected_file="test.py",
        line_number=1,
        snippet="pass",
        title="Test Finding",
        technical_explanation="Test explanation",
        potential_impact="Test impact",
        recommended_remediation="Test remediation",
    )


def _pipeline():
    return AuditPipeline(AuditContext(Path("./benchmark_repos/repo1_ecommerce_fullstack")))


# ---------------------------------------------------------------------------
# No findings → perfect score across all dimensions
# ---------------------------------------------------------------------------

def test_no_findings_perfect_score():
    pipeline = _pipeline()
    assessment = pipeline._calculate_assessment([], _overview())
    assert assessment.overall_score == 100.0
    assert assessment.security_risk_score == 100.0
    assert assessment.implementation_completeness_score == 100.0
    assert assessment.code_quality_score == 100.0
    assert assessment.development_hygiene_score == 100.0
    assert assessment.rating == "EXCELLENT"


# ---------------------------------------------------------------------------
# Security findings only affect security dimension
# ---------------------------------------------------------------------------

def test_security_finding_affects_only_security_score():
    pipeline = _pipeline()
    findings = [_finding(Category.SECURITY, Severity.CRITICAL)]
    assessment = pipeline._calculate_assessment(findings, _overview())
    assert assessment.security_risk_score < 100.0
    # Other dimensions untouched
    assert assessment.implementation_completeness_score == 100.0
    assert assessment.code_quality_score == 100.0
    assert assessment.development_hygiene_score == 100.0


# ---------------------------------------------------------------------------
# GAP findings only affect implementation completeness
# ---------------------------------------------------------------------------

def test_gap_findings_affect_only_completeness():
    pipeline = _pipeline()
    findings = [_finding(Category.GAP, Severity.HIGH)]
    assessment = pipeline._calculate_assessment(findings, _overview())
    assert assessment.implementation_completeness_score < 100.0
    assert assessment.security_risk_score == 100.0
    assert assessment.code_quality_score == 100.0
    assert assessment.development_hygiene_score == 100.0


# ---------------------------------------------------------------------------
# SLOP findings only affect code quality
# ---------------------------------------------------------------------------

def test_slop_findings_affect_only_quality():
    pipeline = _pipeline()
    findings = [_finding(Category.SLOP, Severity.MEDIUM) for _ in range(5)]
    assessment = pipeline._calculate_assessment(findings, _overview())
    assert assessment.code_quality_score < 100.0
    assert assessment.security_risk_score == 100.0
    assert assessment.implementation_completeness_score == 100.0
    assert assessment.development_hygiene_score == 100.0


# ---------------------------------------------------------------------------
# LOOSE_END findings only affect development hygiene
# ---------------------------------------------------------------------------

def test_loose_end_findings_affect_only_hygiene():
    pipeline = _pipeline()
    findings = [_finding(Category.LOOSE_END, Severity.LOW) for _ in range(3)]
    assessment = pipeline._calculate_assessment(findings, _overview())
    assert assessment.development_hygiene_score < 100.0
    assert assessment.security_risk_score == 100.0
    assert assessment.implementation_completeness_score == 100.0
    assert assessment.code_quality_score == 100.0


# ---------------------------------------------------------------------------
# Weighted composite formula: Security(40%) + Completeness(30%) + Quality(20%) + Hygiene(10%)
# ---------------------------------------------------------------------------

def test_overall_score_weighted_formula():
    pipeline = _pipeline()
    # Only security finding → only security score drops
    findings = [_finding(Category.SECURITY, Severity.CRITICAL)]  # -15 pts
    assessment = pipeline._calculate_assessment(findings, _overview())
    # security_risk = max(0, 100 - 15*1.0*1.0) = 85
    # overall = 85*0.4 + 100*0.3 + 100*0.2 + 100*0.1 = 34 + 30 + 20 + 10 = 94
    assert assessment.security_risk_score == pytest.approx(85.0, abs=1.0)
    assert assessment.overall_score == pytest.approx(94.0, abs=1.0)


# ---------------------------------------------------------------------------
# Confidence multiplier reduces penalty for uncertain findings
# ---------------------------------------------------------------------------

def test_low_confidence_reduces_penalty():
    pipeline = _pipeline()
    high_conf = _finding(Category.SECURITY, Severity.HIGH, confidence=1.0)
    low_conf  = _finding(Category.SECURITY, Severity.HIGH, confidence=0.5)
    a_high = pipeline._calculate_assessment([high_conf], _overview())
    a_low  = pipeline._calculate_assessment([low_conf],  _overview())
    # Lower confidence → less deduction → higher security score
    assert a_low.security_risk_score > a_high.security_risk_score


# ---------------------------------------------------------------------------
# Needs-review status multiplier reduces penalty
# ---------------------------------------------------------------------------

def test_needs_review_status_reduces_penalty():
    pipeline = _pipeline()
    confirmed    = _finding(Category.SECURITY, Severity.HIGH, VerificationStatus.CONFIRMED)
    needs_review = _finding(Category.SECURITY, Severity.HIGH, VerificationStatus.NEEDS_REVIEW)
    a_conf = pipeline._calculate_assessment([confirmed],    _overview())
    a_nr   = pipeline._calculate_assessment([needs_review], _overview())
    assert a_nr.security_risk_score > a_conf.security_risk_score


# ---------------------------------------------------------------------------
# Disclaimer must be present and must NOT claim certification
# ---------------------------------------------------------------------------

def test_disclaimer_present_and_not_certification():
    pipeline = _pipeline()
    assessment = pipeline._calculate_assessment([], _overview())
    assert assessment.disclaimer
    text = assessment.disclaimer.upper()
    assert "NOT A SECURITY CERTIFICATION" in text or "NOT" in text


# ---------------------------------------------------------------------------
# Insufficient evidence flag for tiny repos
# ---------------------------------------------------------------------------

def test_insufficient_evidence_tiny_repo():
    pipeline = _pipeline()
    assessment = pipeline._calculate_assessment([], _overview(files=1, lines=5))
    assert assessment.evidence_sufficiency == "INSUFFICIENT_EVIDENCE"


def test_adequate_evidence_normal_repo():
    pipeline = _pipeline()
    assessment = pipeline._calculate_assessment([], _overview(files=25, lines=2000))
    assert assessment.evidence_sufficiency == "ADEQUATE"


# ---------------------------------------------------------------------------
# Score clamps at 0 — never goes negative
# ---------------------------------------------------------------------------

def test_score_does_not_go_below_zero():
    pipeline = _pipeline()
    # 20 critical security findings → massive deduction
    findings = [_finding(Category.SECURITY, Severity.CRITICAL) for _ in range(20)]
    assessment = pipeline._calculate_assessment(findings, _overview())
    assert assessment.security_risk_score >= 0.0
    assert assessment.overall_score >= 0.0


# ---------------------------------------------------------------------------
# Scoring weights are documented in the returned assessment
# ---------------------------------------------------------------------------

def test_scoring_weights_documented():
    pipeline = _pipeline()
    assessment = pipeline._calculate_assessment([], _overview())
    weights = assessment.scoring_weights
    assert weights.get("security") == pytest.approx(0.40)
    assert weights.get("completeness") == pytest.approx(0.30)
    assert weights.get("quality") == pytest.approx(0.20)
    assert weights.get("hygiene") == pytest.approx(0.10)
