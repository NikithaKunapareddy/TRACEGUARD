"""
Markdown Audit Report Generator for TraceGuard.
Produces GitHub-flavored Markdown suitable for pull request comments and security reviews.
"""

from __future__ import annotations
from ..core.models import AuditReport, Severity, Category, VerificationStatus


class MarkdownReporter:
    """Generates structured Markdown reports from AuditReport."""

    @staticmethod
    def render(report: AuditReport) -> str:
        ov = report.overview
        assess = report.assessment

        md = []
        md.append("# TraceGuard Repository Integrity Audit Report\n")
        md.append("> **Architecture-Agnostic Structural & Security Analysis Engine**\n")

        # Summary Badges / Overview
        md.append("## Executive Summary\n")
        md.append(f"- **Audited Path:** `{ov.root_path}`")
        md.append(f"- **Total Files:** `{ov.total_files}` | **Total Lines of Code:** `{ov.total_lines:,}`")
        md.append(f"- **Integrity Score:** **{assess.overall_score:.1f} / 100** (`{assess.rating}`)")
        md.append(f"- **Analysis Execution Time:** `{report.execution_time_seconds:.2f}s`")
        md.append(f"- **Consistency Graph:** `{report.graph_stats.get('total_nodes', 0)}` nodes, `{report.graph_stats.get('total_edges', 0)}` edges\n")
        md.append(f"**Verdict:** {assess.summary_verdict}\n")

        # Breakdown Table
        md.append("## Findings Summary\n")
        md.append("| Category | Critical | High | Medium | Low | Info | Total |")
        md.append("| :--- | :---: | :---: | :---: | :---: | :---: | :---: |")

        for cat in [Category.SECURITY, Category.GAP, Category.SLOP, Category.LOOSE_END]:
            cat_findings = [f for f in report.findings if f.category == cat]
            c_crit = sum(1 for f in cat_findings if f.severity == Severity.CRITICAL)
            c_high = sum(1 for f in cat_findings if f.severity == Severity.HIGH)
            c_med = sum(1 for f in cat_findings if f.severity == Severity.MEDIUM)
            c_low = sum(1 for f in cat_findings if f.severity == Severity.LOW)
            c_info = sum(1 for f in cat_findings if f.severity == Severity.INFO)
            name_map = {
                Category.SECURITY: "🛡️ Security",
                Category.GAP: "🧩 Coding Gaps (Negative-Space)",
                Category.SLOP: "🧹 Code Slop & Complexity",
                Category.LOOSE_END: "⏳ Loose Ends & Unfinished Work",
            }
            md.append(f"| {name_map.get(cat, cat.value)} | {c_crit} | {c_high} | {c_med} | {c_low} | {c_info} | **{len(cat_findings)}** |")

        # Detailed Findings
        md.append("\n## Detailed Findings\n")
        if not report.findings:
            md.append("🎉 *No integrity issues, security vulnerabilities, or incomplete implementations detected.*\n")
        else:
            sorted_findings = sorted(report.findings, key=lambda f: (f.severity.score, f.confidence), reverse=True)
            for f in sorted_findings:
                status_badge = f"**[{f.verification_status.value}]**"
                sev_badge = f"`{f.severity.value.upper()}`"
                md.append(f"### [{f.id}] {f.title}\n")
                md.append(f"- **Category:** `{f.category.value}` ({f.subcategory})")
                md.append(f"- **Severity:** {sev_badge} | **Status:** {status_badge} | **Confidence:** `{int(f.confidence * 100)}%`")
                md.append(f"- **Location:** `{f.affected_file}:{f.line_number}`\n")
                md.append(f"**Technical Explanation:**\n{f.technical_explanation}\n")
                if f.snippet:
                    md.append(f"```\n{f.snippet}\n```\n")
                if f.supporting_evidence:
                    md.append("**Supporting Evidence:**")
                    for ev in f.supporting_evidence:
                        md.append(f"- {ev}")
                    md.append("")
                if f.counterevidence_considered:
                    md.append("**Counterevidence Considered:**")
                    for cev in f.counterevidence_considered:
                        md.append(f"- {cev}")
                    md.append("")
                md.append(f"**Potential Impact:** {f.potential_impact}\n")
                md.append(f"**Recommended Remediation:**\n> {f.recommended_remediation}\n")
                md.append("---\n")

        # Remediation Roadmap
        md.append("## Prioritized Remediation Roadmap\n")
        crit_high = [f for f in report.findings if f.severity in (Severity.CRITICAL, Severity.HIGH)]
        meds = [f for f in report.findings if f.severity == Severity.MEDIUM]
        lows = [f for f in report.findings if f.severity in (Severity.LOW, Severity.INFO)]

        if crit_high:
            md.append("### Phase 1: Critical & High Priority (Immediate Remediation)")
            for f in crit_high:
                md.append(f"1. **[{f.id}]** `{f.affected_file}:{f.line_number}` - {f.title}")
            md.append("")
        if meds:
            md.append("### Phase 2: Medium Priority (Next Sprint)")
            for f in meds:
                md.append(f"1. **[{f.id}]** `{f.affected_file}:{f.line_number}` - {f.title}")
            md.append("")
        if lows:
            md.append("### Phase 3: Low Priority (Hygiene & Polish)")
            for f in lows:
                md.append(f"1. **[{f.id}]** `{f.affected_file}:{f.line_number}` - {f.title}")
            md.append("")

        return "\n".join(md)
