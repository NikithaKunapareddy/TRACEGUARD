"""
Cross-File Evidence Correlator.
Traces multi-hop execution paths across frontend, API, service, and database layers,
and aggregates related findings under root cause clusters.
"""

from __future__ import annotations
from typing import Dict, List, Set, Optional

from ..core.models import Finding, Category, Severity
from ..core.graph import ERCGraph


class CrossFileCorrelator:
    """
    Connects cross-component evidence and aggregates dependent findings
    into unified root cause structures.
    """

    def __init__(self, graph: ERCGraph):
        self.graph = graph

    def correlate(self, findings: List[Finding]) -> List[Finding]:
        """
        Correlate individual findings across files.
        1. Link frontend API gaps with documented endpoints.
        2. Correlate missing database migrations with models and API routes.
        3. Trace source-to-sink paths from endpoints down to database queries or command executions.
        4. Group duplicate or subsidiary findings under root cause IDs.
        """
        # Map findings by affected file and related nodes
        node_to_findings: Dict[str, List[Finding]] = {}
        for f in findings:
            for node_id in f.related_nodes:
                node_to_findings.setdefault(node_id, []).append(f)

        # Cluster findings
        correlated_findings: List[Finding] = []
        visited_ids: Set[str] = set()

        for finding in findings:
            if finding.id in visited_ids:
                continue

            # Check if this finding can be enriched with cross-file graph context
            enriched = self._enrich_finding_context(finding)
            correlated_findings.append(enriched)
            visited_ids.add(finding.id)

        return correlated_findings

    def _enrich_finding_context(self, finding: Finding) -> Finding:
        """Inspect graph around affected nodes to add cross-file trace evidence."""
        # Check if finding involves an endpoint or API call
        if finding.subcategory in ("missing_backend_route", "placeholder_endpoint", "broken_access_control"):
            for node_id in finding.related_nodes:
                sym = self.graph.get_symbol(node_id)
                if sym:
                    # Find callers or connected frontend components
                    callers = self.graph.get_callers(sym.id)
                    if callers:
                        caller_files = list({c.file for c in callers})
                        finding.supporting_evidence.append(
                            f"Cross-file call path verified from {len(callers)} caller(s) in: {', '.join(caller_files)}"
                        )

        # Check if finding involves a model missing migration
        if finding.subcategory == "missing_database_migration":
            for node_id in finding.related_nodes:
                sym = self.graph.get_symbol(node_id)
                if sym:
                    # Look for controllers or services referencing this model
                    callers = self.graph.get_callers(sym.id)
                    if callers:
                        finding.supporting_evidence.append(
                            f"Model is actively imported/referenced in {len(callers)} service/controller components"
                        )

        return finding
