"""
TraceGuard Master 14-Step Audit Pipeline Orchestrator.
Coordinates repository discovery, ERCG graph construction, 4 analysis engines,
cross-file correlation, false-positive validation, and risk prioritization.
"""

from __future__ import annotations
import time
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

    def run(self) -> AuditReport:
        start_time = time.time()

        # Step 1, 2, 3: Repository discovery, Technology ID, and File classification
        scanner = RepositoryScanner(self.context)
        files_meta, files_content, overview = scanner.scan()

        # Step 4, 5, 6: Structural analysis, IR construction, ERCG construction
        graph = ERCGraph()
        for meta in files_meta:
            content = files_content.get(meta.relative_path, "")
            # Find matching adapter
            for adapter in self.adapters:
                if adapter.can_parse(meta):
                    try:
                        adapter.parse(meta, content, graph)
                    except Exception:
                        pass
                    break

        # Step 7: Security scanning
        raw_security_findings = self.security_engine.analyze(
            graph, files_content, files_meta, self.context
        )

        # Step 8: Code slop analysis
        raw_slop_findings = self.slop_engine.analyze(
            graph, files_content, files_meta, self.context
        )

        # Step 9: Negative-space analysis & Coding gap detection
        raw_gap_findings = self.gap_engine.analyze(
            graph, files_content, files_meta, self.context
        )

        # Step 10: Loose-end analysis
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

        # Step 13: Risk prioritization & Integrity assessment calculation
        assessment = self._calculate_assessment(validated_findings, overview)

        # Step 14: Report generation data assembly
        exec_time = time.time() - start_time
        return AuditReport(
            overview=overview,
            assessment=assessment,
            findings=validated_findings,
            graph_stats=graph.get_stats(),
            execution_time_seconds=exec_time,
        )

    def _calculate_assessment(
        self, findings: List[Finding], overview: RepositoryOverview
    ) -> IntegrityAssessment:
        counts_by_cat: Dict[str, int] = {}
        counts_by_sev: Dict[str, int] = {}
        counts_by_status: Dict[str, int] = {}

        deductions = 0.0

        for f in findings:
            counts_by_cat[f.category.value] = counts_by_cat.get(f.category.value, 0) + 1
            counts_by_sev[f.severity.value] = counts_by_sev.get(f.severity.value, 0) + 1
            counts_by_status[f.verification_status.value] = (
                counts_by_status.get(f.verification_status.value, 0) + 1
            )

            # Score deductions based on severity and verification
            mult = 1.0 if f.verification_status == VerificationStatus.CONFIRMED else 0.7
            if f.severity == Severity.CRITICAL:
                deductions += 15.0 * mult
            elif f.severity == Severity.HIGH:
                deductions += 7.0 * mult
            elif f.severity == Severity.MEDIUM:
                deductions += 3.0 * mult
            elif f.severity == Severity.LOW:
                deductions += 1.0 * mult

        score = max(0.0, 100.0 - deductions)

        if score >= 90.0:
            rating = "EXCELLENT"
            verdict = "Repository exhibits strong architectural integrity with minimal defects."
        elif score >= 75.0:
            rating = "GOOD"
            verdict = "Repository is generally solid but contains actionable technical debt or minor gaps."
        elif score >= 50.0:
            rating = "FAIR"
            verdict = "Moderate engineering risks detected, including unverified routes or error swallowing."
        elif score >= 30.0:
            rating = "POOR"
            verdict = "Substantial architectural gaps, code slop, or security risks require prompt remediation."
        else:
            rating = "CRITICAL CONCERNS"
            verdict = "Critical security vulnerabilities or core structural gaps threaten repository integrity."

        return IntegrityAssessment(
            overall_score=score,
            rating=rating,
            findings_by_category=counts_by_cat,
            findings_by_severity=counts_by_sev,
            findings_by_status=counts_by_status,
            summary_verdict=verdict,
        )
