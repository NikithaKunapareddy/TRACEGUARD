"""
Rich Terminal Console Formatter for TraceGuard CLI.
Displays colorized summaries, statistics tables, top findings, and prioritized remediation.
"""

from __future__ import annotations
from typing import List, Optional
from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich.text import Text

from ..core.models import (
    AuditReport,
    Finding,
    Severity,
    Category,
    VerificationStatus,
)


class ConsoleReporter:
    """Renders formatted terminal output using Rich."""

    def __init__(self, console: Optional[Console] = None):
        self.console = console or Console()

    def print_banner(self) -> None:
        banner = """
[bold cyan]╔══════════════════════════════════════════════════════════════════════╗
║               TRACEGUARD - Repository Integrity Agent                ║
║           Architecture-Agnostic Structural & Security Audit          ║
╚══════════════════════════════════════════════════════════════════════╝[/bold cyan]
"""
        self.console.print(banner)

    def print_report(self, report: AuditReport) -> None:
        self.print_banner()

        # 1. Repository Overview Panel
        ov = report.overview
        lang_str = ", ".join([f"{k} ({v})" for k, v in ov.languages.items()]) or "None"
        fw_str = ", ".join(ov.detected_frameworks) or "Generic / Standard Library"

        overview_text = (
            f"[bold]Root Path:[/bold] {ov.root_path}\n"
            f"[bold]Total Files:[/bold] {ov.total_files} | [bold]Total Lines of Code:[/bold] {ov.total_lines:,}\n"
            f"[bold]Languages:[/bold] {lang_str}\n"
            f"[bold]Frameworks:[/bold] {fw_str}\n"
            f"[bold]Graph Nodes:[/bold] {report.graph_stats.get('total_nodes', 0)} | [bold]Graph Edges:[/bold] {report.graph_stats.get('total_edges', 0)}\n"
            f"[bold]Execution Time:[/bold] {report.execution_time_seconds:.2f}s"
        )
        self.console.print(Panel(overview_text, title="[bold green]Repository Overview[/bold green]", border_style="green"))

        # 2. Integrity Assessment Panel
        assess = report.assessment
        score_color = "green" if assess.overall_score >= 85 else ("yellow" if assess.overall_score >= 65 else "red")
        rating_text = (
            f"[bold]Integrity Score:[/bold] [{score_color}]{assess.overall_score:.1f} / 100[/{score_color}] "
            f"([{score_color}]{assess.rating}[/{score_color}])\n"
            f"[bold]Verdict:[/bold] {assess.summary_verdict}"
        )
        self.console.print(Panel(rating_text, title="[bold cyan]Integrity Assessment[/bold cyan]", border_style="cyan"))

        # 3. Findings Breakdown Table
        summary_table = Table(title="Findings Breakdown by Category and Severity", expand=True)
        summary_table.add_column("Category", style="bold")
        summary_table.add_column("Critical", justify="center", style="bold red")
        summary_table.add_column("High", justify="center", style="red")
        summary_table.add_column("Medium", justify="center", style="yellow")
        summary_table.add_column("Low", justify="center", style="blue")
        summary_table.add_column("Info", justify="center", style="dim")
        summary_table.add_column("Total", justify="center", style="bold white")

        categories = [Category.SECURITY, Category.GAP, Category.SLOP, Category.LOOSE_END]
        for cat in categories:
            cat_findings = [f for f in report.findings if f.category == cat]
            c_crit = sum(1 for f in cat_findings if f.severity == Severity.CRITICAL)
            c_high = sum(1 for f in cat_findings if f.severity == Severity.HIGH)
            c_med = sum(1 for f in cat_findings if f.severity == Severity.MEDIUM)
            c_low = sum(1 for f in cat_findings if f.severity == Severity.LOW)
            c_info = sum(1 for f in cat_findings if f.severity == Severity.INFO)
            tot = len(cat_findings)

            cat_display = {
                Category.SECURITY: "🛡️  Security",
                Category.GAP: "🧩 Coding Gaps (Negative-Space)",
                Category.SLOP: "🧹 Code Slop & Complexity",
                Category.LOOSE_END: "⏳ Loose Ends & Unfinished Work",
            }.get(cat, cat.value)

            summary_table.add_row(
                cat_display,
                str(c_crit) if c_crit else "-",
                str(c_high) if c_high else "-",
                str(c_med) if c_med else "-",
                str(c_low) if c_low else "-",
                str(c_info) if c_info else "-",
                str(tot),
            )

        self.console.print(summary_table)

        # 4. Detailed Findings List
        if not report.findings:
            self.console.print("\n[bold green]✓ No integrity or security issues detected across the repository![/bold green]\n")
            return

        self.console.print("\n[bold]Detailed Actionable Findings:[/bold]")

        # Sort: Critical -> High -> Medium -> Low
        sorted_findings = sorted(report.findings, key=lambda f: (f.severity.score, f.confidence), reverse=True)

        for f in sorted_findings:
            sev_colors = {
                Severity.CRITICAL: "bold red",
                Severity.HIGH: "red",
                Severity.MEDIUM: "yellow",
                Severity.LOW: "blue",
                Severity.INFO: "dim",
            }
            sev_style = sev_colors.get(f.severity, "white")
            status_style = "green" if f.verification_status == VerificationStatus.CONFIRMED else "yellow"

            title_panel = (
                f"[{sev_style}][{f.severity.value.upper()}][/{sev_style}] "
                f"[bold white]{f.id}: {f.title}[/bold white] "
                f"([{status_style}]{f.verification_status.value}[/{status_style}] | Confidence: {int(f.confidence*100)}%)\n"
                f"[dim]Location:[/dim] [cyan]{f.affected_file}:{f.line_number}[/cyan]\n"
                f"[dim]Explanation:[/dim] {f.technical_explanation}\n"
                f"[dim]Potential Impact:[/dim] [italic]{f.potential_impact}[/italic]\n"
                f"[dim]Remediation:[/dim] [green]{f.recommended_remediation}[/green]"
            )
            if f.snippet:
                title_panel += f"\n[dim]Evidence Snippet:[/dim]\n[black on white] {f.snippet.strip()} [/black on white]"

            self.console.print(Panel(title_panel, border_style=sev_style.split()[-1]))

        # 5. Prioritized Remediation Roadmap
        self.console.print("\n[bold cyan]=== Prioritized Remediation Roadmap ===[/bold cyan]")
        prio_1 = [f for f in sorted_findings if f.severity in (Severity.CRITICAL, Severity.HIGH)]
        prio_2 = [f for f in sorted_findings if f.severity == Severity.MEDIUM]
        prio_3 = [f for f in sorted_findings if f.severity in (Severity.LOW, Severity.INFO)]

        if prio_1:
            self.console.print("[bold red]Phase 1 (Immediate / Blocker):[/bold red]")
            for f in prio_1[:5]:
                self.console.print(f"  • [{f.id}] {f.title} ({f.affected_file}:{f.line_number})")
        if prio_2:
            self.console.print("[bold yellow]Phase 2 (High Priority Debt):[/bold yellow]")
            for f in prio_2[:5]:
                self.console.print(f"  • [{f.id}] {f.title} ({f.affected_file}:{f.line_number})")
        if prio_3:
            self.console.print("[bold blue]Phase 3 (Quality & Polish):[/bold blue]")
            for f in prio_3[:5]:
                self.console.print(f"  • [{f.id}] {f.title} ({f.affected_file}:{f.line_number})")
        self.console.print()
