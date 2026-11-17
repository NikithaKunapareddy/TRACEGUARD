"""
TraceGuard Master 14-Step Audit Pipeline Orchestrator.
Coordinates repository discovery, ERCG graph construction, 4 analysis engines,
cross-file correlation, false-positive validation, and risk prioritization.
"""

from __future__ import annotations
import time
import uuid
from pathlib import Path
from typing import Dict, List, Optional

from .core.models import (
    AuditReport,
    Finding,
    IntegrityAssessment,
    RepositoryOverview,
    Severity,
    Category,
    VerificationStatus,
    LifecycleState,
    GraphCoverageMetrics,
)
from .core.graph import ERCGraph
from .core.context import AuditContext, AuditConfig
from .ingestion.scanner import RepositoryScanner
from .adapters import (
    BaseParserAdapter,
    PythonAdapter,
    JavaScriptAdapter,
    GenericAdapter,
    ConfigAdapter,
    DocAdapter,
)
from .engines import (
    SecurityEngine,
    CodeSlopEngine,
    CodingGapEngine,
    LooseEndEngine,
)
from .correlation.correlator import CrossFileCorrelator
from .correlation.validator import FindingValidator


class AuditPipeline:
    """
    Executes the 14-stage architecture-agnostic repository audit workflow.
    """

    def __init__(self, context: AuditContext):
        self.context = context
        self.adapters: List[BaseParserAdapter] = [
            PythonAdapter(),
            JavaScriptAdapter(),
            ConfigAdapter(),
            DocAdapter(),
            GenericAdapter(),  # Fallback adapter must be last
        ]
        self.security_engine = SecurityEngine()
        self.slop_engine = CodeSlopEngine()
        self.gap_engine = CodingGapEngine()
        self.loose_end_engine = LooseEndEngine()

    def run(self, prev_findings: Optional[List[Finding]] = None) -> AuditReport:
        """
        Execute the full 14-stage audit pipeline.
        If prev_findings is supplied, lifecycle states (NEW/EXISTING/RESOLVED/REINTRODUCED)
        are computed by comparing against the previous audit's findings.
        """
        start_time = time.time()
        audit_id = str(uuid.uuid4())

        # Step 1, 2, 3: Repository discovery, Technology ID, and File classification
        scanner = RepositoryScanner(self.context)
        files_meta, files_content, overview = scanner.scan()

        # Step 4, 5, 6: Structural analysis, IR construction, ERCG construction
        graph = ERCGraph()
        for meta in files_meta:
            content = files_content.get(meta.relative_path, "")
            for adapter in self.adapters:
                if adapter.can_parse(meta):
                    try:
                        adapter.parse(meta, content, graph)
                    except Exception:
                        pass
                    break

        # Step 7-10: Run all four analysis engines
        raw_security_findings = self.security_engine.analyze(
            graph, files_content, files_meta, self.context
        )
        raw_slop_findings = self.slop_engine.analyze(
            graph, files_content, files_meta, self.context
        )
        raw_gap_findings = self.gap_engine.analyze(
            graph, files_content, files_meta, self.context
        )
        raw_loose_findings = self.loose_end_engine.analyze(
            graph, files_content, files_meta, self.context
        )

        all_findings = (
            raw_security_findings
            + raw_slop_findings
            + raw_gap_findings
            + raw_loose_findings
        )

        # Apply category filter if configured
        if self.context.config.categories_filter:
            cats = set(self.context.config.categories_filter)
            all_findings = [f for f in all_findings if f.category.value in cats]

        # Apply severity filter if configured
        if self.context.config.min_severity:
            min_sev = Severity(self.context.config.min_severity.lower())
            all_findings = [f for f in all_findings if f.severity.score >= min_sev.score]

        # Step 11: Cross-file evidence correlation
        correlator = CrossFileCorrelator(graph)
        correlated_findings = correlator.correlate(all_findings)

        # Step 12: Finding validation & False-positive reduction
        validator = FindingValidator(graph)
        validated_findings = validator.validate(correlated_findings)

        # Compute stable IDs on all validated findings
        for f in validated_findings:
            if not f.stable_id:
                f.stable_id = f.compute_stable_id()

        # Step 12b: Lifecycle tracking (compare with previous audit if supplied)
        if prev_findings:
            validated_findings = self._apply_lifecycle(validated_findings, prev_findings)

        # Step 13: 4-dimensional risk assessment
        assessment = self._calculate_assessment(validated_findings, overview)

        # Graph coverage metrics
        graph_coverage = graph.get_coverage_metrics()

        # Step 14: Assemble report
        exec_time = time.time() - start_time
        return AuditReport(
            overview=overview,
            assessment=assessment,
            findings=validated_findings,
            graph_stats=graph.get_stats(),
            graph_coverage=graph_coverage,
            execution_time_seconds=exec_time,
            audit_id=audit_id,
            is_incremental=bool(prev_findings),
        )

    def _apply_lifecycle(
        self,
        current: List[Finding],
        previous: List[Finding],
    ) -> List[Finding]:
        """
        Compare current findings to previous findings by stable_id.
        Assigns lifecycle states: NEW, EXISTING, REINTRODUCED.
        RESOLVED findings from the previous audit are NOT added back (they were removed).
        """
        prev_ids = {f.stable_id for f in previous if f.stable_id}
        prev_resolved = {f.stable_id for f in previous if f.lifecycle_state == LifecycleState.RESOLVED}

        for f in current:
            sid = f.stable_id or f.compute_stable_id()
            if sid in prev_resolved:
                f.lifecycle_state = LifecycleState.REINTRODUCED
            elif sid in prev_ids:
                f.lifecycle_state = LifecycleState.EXISTING
            else:
                f.lifecycle_state = LifecycleState.NEW
        return current

    def _calculate_assessment(
        self, findings: List[Finding], overview: RepositoryOverview
    ) -> IntegrityAssessment:
        """
        4-Dimensional Integrity Scoring
        ================================
        Dimensions and weights in overall composite:
          Security Risk              40%
          Implementation Completeness 30%
          Code Quality               20%
          Development Hygiene        10%

        Deduction per finding = severity_weight × confidence × status_multiplier
          CRITICAL=15, HIGH=7, MEDIUM=3, LOW=1, INFO=0.3
          CONFIRMED=1.0, PROBABLE=0.7, NEEDS_REVIEW=0.4
        """
        counts_by_cat: Dict[str, int] = {}
        counts_by_sev: Dict[str, int] = {}
        counts_by_status: Dict[str, int] = {}
        counts_by_lifecycle: Dict[str, int] = {}

        SEVERITY_WEIGHTS: Dict[Severity, float] = {
            Severity.CRITICAL: 15.0,
            Severity.HIGH:      7.0,
            Severity.MEDIUM:    3.0,
            Severity.LOW:       1.0,
            Severity.INFO:      0.3,
        }
        STATUS_MULTIPLIERS: Dict[VerificationStatus, float] = {
            VerificationStatus.CONFIRMED:    1.0,
            VerificationStatus.PROBABLE:     0.7,
            VerificationStatus.NEEDS_REVIEW: 0.4,
        }

        sec_deductions = 0.0
        impl_deductions = 0.0
        quality_deductions = 0.0
        hygiene_deductions = 0.0

        for f in findings:
            counts_by_cat[f.category.value] = counts_by_cat.get(f.category.value, 0) + 1
            counts_by_sev[f.severity.value] = counts_by_sev.get(f.severity.value, 0) + 1
            counts_by_status[f.verification_status.value] = (
                counts_by_status.get(f.verification_status.value, 0) + 1
            )
            counts_by_lifecycle[f.lifecycle_state.value] = (
                counts_by_lifecycle.get(f.lifecycle_state.value, 0) + 1
            )

            sev_w    = SEVERITY_WEIGHTS.get(f.severity, 1.0)
            status_m = STATUS_MULTIPLIERS.get(f.verification_status, 0.6)
            conf_m   = getattr(f, 'confidence', 1.0)
            d = sev_w * conf_m * status_m

            if f.category == Category.SECURITY:
                sec_deductions += d
            elif f.category == Category.GAP:
                impl_deductions += d
            elif f.category == Category.SLOP:
                quality_deductions += d
            elif f.category == Category.LOOSE_END:
                hygiene_deductions += d

        security_risk_score          = max(0.0, 100.0 - sec_deductions)
        implementation_completeness  = max(0.0, 100.0 - impl_deductions)
        code_quality_score           = max(0.0, 100.0 - quality_deductions)
        development_hygiene_score    = max(0.0, 100.0 - hygiene_deductions)

        WEIGHTS = {"security": 0.40, "completeness": 0.30, "quality": 0.20, "hygiene": 0.10}
        overall_score = (
            security_risk_score        * WEIGHTS["security"]
            + implementation_completeness * WEIGHTS["completeness"]
            + code_quality_score          * WEIGHTS["quality"]
            + development_hygiene_score   * WEIGHTS["hygiene"]
        )

        total_files = overview.total_files if overview.total_files > 0 else 1
        total_lines = overview.total_lines if overview.total_lines > 0 else 0
        if total_files < 3 or total_lines < 10:
            evidence_sufficiency = "INSUFFICIENT_EVIDENCE"
        elif total_files < 8:
            evidence_sufficiency = "LIMITED"
        else:
            evidence_sufficiency = "ADEQUATE"

        if overall_score >= 90.0:
            rating  = "EXCELLENT"
            verdict = "Repository exhibits strong architectural integrity with minimal defects."
        elif overall_score >= 75.0:
            rating  = "GOOD"
            verdict = "Repository is generally solid but contains actionable technical debt or minor gaps."
        elif overall_score >= 50.0:
            rating  = "FAIR"
            verdict = "Moderate engineering risks detected, including unverified routes or error swallowing."
        elif overall_score >= 30.0:
            rating  = "POOR"
            verdict = "Substantial architectural gaps, code slop, or security risks require prompt remediation."
        else:
            rating  = "CRITICAL CONCERNS"
            verdict = "Critical security vulnerabilities or core structural gaps threaten repository integrity."

        disclaimer = (
            "DISCLAIMER: This score is a heuristic engineering quality estimate based on static analysis. "
            "It is NOT a security certification, penetration test, or compliance audit. "
            "Human expert review is required before making security or deployment decisions."
        )

        return IntegrityAssessment(
            overall_score=round(overall_score, 2),
            rating=rating,
            security_risk_score=round(security_risk_score, 2),
            implementation_completeness_score=round(implementation_completeness, 2),
            code_quality_score=round(code_quality_score, 2),
            development_hygiene_score=round(development_hygiene_score, 2),
            dimension_scores={
                "security_risk":               round(security_risk_score, 2),
                "implementation_completeness": round(implementation_completeness, 2),
                "code_quality":                round(code_quality_score, 2),
                "development_hygiene":         round(development_hygiene_score, 2),
            },
            scoring_weights=WEIGHTS,
            evidence_sufficiency=evidence_sufficiency,
            disclaimer=disclaimer,
            findings_by_category=counts_by_cat,
            findings_by_severity=counts_by_sev,
            findings_by_status=counts_by_status,
            findings_by_lifecycle=counts_by_lifecycle,
            summary_verdict=verdict,
        )
