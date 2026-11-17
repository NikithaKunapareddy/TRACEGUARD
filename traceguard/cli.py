"""
TraceGuard CLI Interface.
Command-line driver for running repository integrity audits.
"""

from __future__ import annotations
import argparse
import sys
from pathlib import Path

from .core.context import AuditContext, AuditConfig
from .pipeline import AuditPipeline
from .reporting.console import ConsoleReporter
from .reporting.json_report import JsonReporter
from .reporting.markdown_report import MarkdownReporter
from .reporting.html_report import HtmlReporter


def create_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="traceguard",
        description="TraceGuard: Architecture-Agnostic Repository Integrity Agent",
    )
    parser.add_argument("--version", action="version", version="traceguard 0.1.0")

    subparsers = parser.add_subparsers(dest="command", help="Available subcommands")

    # audit subcommand
    audit_parser = subparsers.add_parser("audit", help="Audit a repository directory for integrity, security, slop, gaps, and loose ends")
    audit_parser.add_argument("target", nargs="?", default=".", help="Path to repository directory (default: current directory)")
    audit_parser.add_argument("--format", choices=["terminal", "json", "markdown", "html"], default="terminal", help="Report output format (default: terminal)")
    audit_parser.add_argument("--output", "-o", help="Write report output to specified file path")
    audit_parser.add_argument("--category", "-c", choices=["security", "slop", "gap", "loose_end"], help="Filter findings by category")
    audit_parser.add_argument("--severity", "-s", choices=["critical", "high", "medium", "low", "info"], help="Filter findings by minimum severity")
    audit_parser.add_argument("--max-size-mb", type=int, default=5, help="Maximum file size to inspect in MB (default: 5)")

    return parser


def main(argv=None) -> int:
    parser = create_parser()
    args = parser.parse_args(argv)

    if not args.command:
        parser.print_help()
        return 1

    if args.command == "audit":
        target_path = Path(args.target).resolve()
        if not target_path.exists():
            print(f"Error: Target path does not exist: {target_path}", file=sys.stderr)
            return 1
        if not target_path.is_dir():
            print(f"Error: Target path is not a directory: {target_path}", file=sys.stderr)
            return 1

        config = AuditConfig(
            max_file_size_bytes=args.max_size_mb * 1024 * 1024,
            categories_filter=[args.category] if args.category else None,
            min_severity=args.severity,
            read_only=True,
        )

        context = AuditContext(root_dir=target_path, config=config)
        pipeline = AuditPipeline(context)

        # Run pipeline
        report = pipeline.run()

        # Render format
        fmt = args.format.lower()
        output_content = ""

        if fmt == "terminal":
            reporter = ConsoleReporter()
            reporter.print_report(report)
            if args.output:
                # If output file specified with terminal format, also dump markdown
                output_content = MarkdownReporter.render(report)
        elif fmt == "json":
            output_content = JsonReporter.render(report)
            if not args.output:
                print(output_content)
        elif fmt == "markdown":
            output_content = MarkdownReporter.render(report)
            if not args.output:
                print(output_content)
        elif fmt == "html":
            output_content = HtmlReporter.render(report)
            if not args.output:
                print(output_content)

        if args.output and output_content:
            out_file = Path(args.output)
            out_file.parent.mkdir(parents=True, exist_ok=True)
            with open(out_file, "w", encoding="utf-8") as f:
                f.write(output_content)
            print(f"\n[✓] Audit report successfully saved to: {out_file.resolve()}")

        # Exit code: 0 for successful audit run
        return 0


    return 0


if __name__ == "__main__":
    sys.exit(main())
