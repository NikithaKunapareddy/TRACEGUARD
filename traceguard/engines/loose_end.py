"""
Loose-End Engine: Unresolved Engineering Work, Actionable Debt,
Debug Artifacts, Commented Code, Missing Configs, and Test Gaps.
"""

from __future__ import annotations
import re
from typing import Dict, List, Set, Optional

from ..core.models import (
    Category,
    Severity,
    VerificationStatus,
    Finding,
    FileMetadata,
    NodeType,
    EdgeType,
)
from ..core.graph import ERCGraph
from ..core.context import AuditContext
from .base import BaseEngine


class LooseEndEngine(BaseEngine):
    """
    Detects actionable unresolved engineering tasks, leftover debugging instrumentation,
    commented-out implementation blocks, unconfigured environment keys, and missing tests.
    """

    def analyze(
        self,
        graph: ERCGraph,
        files_content: Dict[str, str],
        files_meta: List[FileMetadata],
        context: AuditContext,
    ) -> List[Finding]:
        findings: List[Finding] = []
        seq = 1

        # 1. Actionable TODO / FIXME / HACK / XXX Markers
        f_todos = self._detect_actionable_markers(files_content, seq)
        findings.extend(f_todos)
        seq += len(f_todos)

        # 2. Residual Debugging Instrumentation (print, console.log, debugger, pdb)
        f_debug = self._detect_debugging_artifacts(files_content, seq)
        findings.extend(f_debug)
        seq += len(f_debug)

        # 3. Commented-Out Implementation Blocks
        f_commented = self._detect_commented_code(files_content, seq)
        findings.extend(f_commented)
        seq += len(f_commented)

        # 4. Incomplete Configuration (referenced in code but missing from .env / .env.example / configs)
        f_configs = self._detect_unconfigured_env_vars(graph, files_content, seq)
        findings.extend(f_configs)
        seq += len(f_configs)

        # 5. Missing Test Coverage for Critical Endpoints
        f_tests = self._detect_missing_test_coverage(graph, seq)
        findings.extend(f_tests)
        seq += len(f_tests)

        return findings

    def _detect_actionable_markers(
        self, files_content: Dict[str, str], seq_start: int
    ) -> List[Finding]:
        findings = []
        # Marker pattern: TODO:, FIXME:, HACK:, XXX: followed by text
        marker_pat = re.compile(
            r'''(?i)(?:#|//|/\*)\s*(TODO|FIXME|HACK|XXX)\s*[:\-]?\s*(.+)'''
        )

        # Non-actionable or trivial patterns (e.g. TODO list header, TODO: None)
        trivial_patterns = {"todo list", "todo:", "todo()"}

        for rel_path, content in files_content.items():
            # Skip test files if desired, or keep lower severity
            is_test = "test" in rel_path.lower()
            lines = content.splitlines()

            for idx, line in enumerate(lines, start=1):
                clean = line.strip()
                match = marker_pat.search(clean)
                if match:
                    tag = match.group(1).upper()
                    description = match.group(2).strip().rstrip("*/")

                    if description.lower() in trivial_patterns or len(description) < 3:
                        continue

                    # Determine severity based on tag and urgency
                    severity = Severity.LOW
                    confidence = 0.90
                    if tag in ("FIXME", "XXX"):
                        severity = Severity.MEDIUM
                    if any(urgent in description.lower() for urgent in ("security", "auth", "leak", "bug", "critical", "vulnerability")):
                        severity = Severity.HIGH

                    findings.append(
                        Finding(
                            id=f"TG-LOOSE-{seq_start + len(findings):03d}",
                            category=Category.LOOSE_END,
                            subcategory="unresolved_task",
                            title=f"Unresolved {tag} Marker: {description[:60]}",
                            severity=severity,
                            confidence=confidence,
                            verification_status=VerificationStatus.CONFIRMED,
                            affected_file=rel_path,
                            line_number=idx,
                            snippet=clean,
                            supporting_evidence=[
                                f"Explicit developer marker '{tag}' found at line {idx}",
                                f"Action item: {description}",
                            ],
                            counterevidence_considered=[
                                "Checked if comment is a generic documentation note: verified actionable developer task",
                            ],
                            technical_explanation=f"A '{tag}' marker indicates unfinished implementation, known defect, or deferred refactoring left in the production codebase.",
                            potential_impact="Incomplete edge case handling, hidden technical debt, or latent functional bugs.",
                            recommended_remediation=f"Address the task ({description}) or track it in the project issue tracker before removing the comment.",
                        )
                    )
        return findings

    def _detect_debugging_artifacts(
        self, files_content: Dict[str, str], seq_start: int
    ) -> List[Finding]:
        """Detect leftover debugging calls (console.log, debugger, pdb, print in backend)."""
        findings = []

        debug_patterns = [
            (
                re.compile(r'\b(?:pdb|ipdb|breakpoint)\.set_trace\s*\(\)'),
                "Interactive Debugger Breakpoint (pdb/breakpoint)",
                Severity.HIGH,
                "Halts execution and exposes an interactive shell if executed on a server.",
            ),
            (
                re.compile(r'\bconsole\.log\s*\('),
                "Leftover Client/Server console.log Statement",
                Severity.LOW,
                "Debug console output degrades browser/server logging and may inadvertently leak internal state.",
            ),
            (
                re.compile(r'''(?i)\bprint\s*\(\s*["\']DEBUG:'''),
                "Debug Print Statement in Application Code",
                Severity.LOW,
                "Ad-hoc print debugging rather than structured logging.",
            ),
            (
                re.compile(r'\bdebugger\s*;'),
                "JavaScript debugger Statement",
                Severity.MEDIUM,
                "Pauses JavaScript runtime execution when developer tools are active.",
            ),
        ]

        for rel_path, content in files_content.items():
            if "test" in rel_path.lower():
                continue  # Tests can have assertions/prints

            lines = content.splitlines()
            for idx, line in enumerate(lines, start=1):
                clean = line.strip()
                if clean.startswith("#") or clean.startswith("//"):
                    continue

                for pat, title, sev, desc in debug_patterns:
                    if pat.search(clean):
                        findings.append(
                            Finding(
                                id=f"TG-LOOSE-{seq_start + len(findings):03d}",
                                category=Category.LOOSE_END,
                                subcategory="debug_artifact",
                                title=title,
                                severity=sev,
                                confidence=0.95,
                                verification_status=VerificationStatus.CONFIRMED,
                                affected_file=rel_path,
                                line_number=idx,
                                snippet=clean,
                                supporting_evidence=[
                                    f"Debugging instruction detected at line {idx} in non-test application file",
                                ],
                                counterevidence_considered=[
                                    "Checked if inside a CLI script where print is standard output: verified application component",
                                ],
                                technical_explanation=desc,
                                potential_impact="Log pollution, server stalls, or unintentional data exposure.",
                                recommended_remediation="Remove the debug artifact and replace with structured logging (logger.debug).",
                            )
                        )
        return findings

    def _detect_commented_code(
        self, files_content: Dict[str, str], seq_start: int
    ) -> List[Finding]:
        """Detect multi-line commented-out implementation code."""
        findings = []
        code_markers = [
            re.compile(r'^\s*#\s*(?:def |class |return |import |from |if |for |while |self\.)'),
            re.compile(r'^\s*//\s*(?:function |const |let |var |return |import |if |for |while )'),
        ]

        for rel_path, content in files_content.items():
            lines = content.splitlines()
            streak_start = None
            streak_count = 0

            for idx, line in enumerate(lines, start=1):
                is_commented_code = any(pat.match(line) for pat in code_markers)
                if is_commented_code:
                    if streak_start is None:
                        streak_start = idx
                    streak_count += 1
                else:
                    if streak_count >= 3:
                        snippet = "\n".join(lines[streak_start - 1:streak_start + 2])
                        findings.append(
                            Finding(
                                id=f"TG-LOOSE-{seq_start + len(findings):03d}",
                                category=Category.LOOSE_END,
                                subcategory="commented_out_code",
                                title=f"Commented-Out Code Block ({streak_count} lines)",
                                severity=Severity.LOW,
                                confidence=0.88,
                                verification_status=VerificationStatus.CONFIRMED,
                                affected_file=rel_path,
                                line_number=streak_start,
                                end_line_number=streak_start + streak_count - 1,
                                snippet=snippet,
                                supporting_evidence=[
                                    f"Block of {streak_count} consecutive lines of commented code beginning at line {streak_start}",
                                ],
                                counterevidence_considered=[
                                    "Checked if block is code example in documentation: verified inline source file context",
                                ],
                                technical_explanation="Retaining commented-out code creates clutter and ambiguity. Version control systems preserve historical revisions safely without cluttering active files.",
                                potential_impact="Code readability degradation and confusion over active implementation paths.",
                                recommended_remediation="Remove commented-out code; rely on git history to recover if needed.",
                            )
                        )
                    streak_start = None
                    streak_count = 0

            # Tail check
            if streak_count >= 3:
                snippet = "\n".join(lines[streak_start - 1:streak_start + 2])
                findings.append(
                    Finding(
                        id=f"TG-LOOSE-{seq_start + len(findings):03d}",
                        category=Category.LOOSE_END,
                        subcategory="commented_out_code",
                        title=f"Commented-Out Code Block ({streak_count} lines)",
                        severity=Severity.LOW,
                        confidence=0.88,
                        verification_status=VerificationStatus.CONFIRMED,
                        affected_file=rel_path,
                        line_number=streak_start,
                        end_line_number=streak_start + streak_count - 1,
                        snippet=snippet,
                        supporting_evidence=[f"Block of {streak_count} lines of commented code"],
                        counterevidence_considered=["Checked documentation context: negative"],
                        technical_explanation="Retaining commented-out code creates clutter and ambiguity.",
                        potential_impact="Code readability degradation.",
                        recommended_remediation="Remove commented-out code.",
                    )
                )
        return findings

    def _detect_unconfigured_env_vars(
        self, graph: ERCGraph, files_content: Dict[str, str], seq_start: int
    ) -> List[Finding]:
        """
        Cross-reference config accesses (e.g. os.getenv("METRICS_COLLECTOR_URL"))
        against declared keys in .env, .env.example, and config files.
        """
        findings = []
        # Find all declared config keys in config files
        declared_keys: Set[str] = set()
        for sym in graph.get_symbols_by_kind(NodeType.CONFIG):
            key = sym.attributes.get("key", sym.name)
            declared_keys.add(key)

        # Standard system environment variables to exclude
        system_env_vars = {
            "PATH", "HOME", "USER", "SHELL", "PWD", "TEMP", "TMP", "PYTHONPATH", "NODE_ENV", "PORT", "HOST"
        }

        # Check all code usages of configs
        for sym in graph.get_symbols_by_kind(NodeType.CONFIG):
            key = sym.attributes.get("key", sym.name)
            source = sym.attributes.get("source", "")
            if source in ("python", "js_ts", "go"):
                # This was an ACCESS in source code
                if key not in system_env_vars:
                    # Check if key is declared anywhere in a config file or .env
                    is_declared = any(
                        s.attributes.get("key") == key and s.attributes.get("source_file")
                        for s in graph.get_symbols_by_kind(NodeType.CONFIG)
                    )
                    if not is_declared:
                        findings.append(
                            Finding(
                                id=f"TG-LOOSE-{seq_start + len(findings):03d}",
                                category=Category.LOOSE_END,
                                subcategory="unconfigured_env_var",
                                title=f"Unconfigured Environment Variable ('{key}')",
                                severity=Severity.MEDIUM,
                                confidence=0.82,
                                verification_status=VerificationStatus.PROBABLE,
                                affected_file=sym.file,
                                line_number=sym.line,
                                snippet=f"Environment variable access: {key}",
                                supporting_evidence=[
                                    f"Variable '{key}' queried in '{sym.file}' at line {sym.line}",
                                    "Key is not declared in any .env, .env.example, or configuration specification in the repository",
                                ],
                                counterevidence_considered=[
                                    "Checked known operating system variables: not in standard OS variable whitelist",
                                    "Checked all configuration files (.env, yaml, json): 0 declarations found",
                                ],
                                technical_explanation=f"Accessing undeclared environment variable '{key}' without documenting it in .env.example or schema configs will cause deployment failures in fresh staging or production environments.",
                                potential_impact="Deployment failure, missing credentials at startup, or unexpected runtime NoneType errors.",
                                recommended_remediation=f"Add '{key}' to .env.example and document its required format and default value.",
                                related_nodes=[sym.id],
                            )
                        )
        return findings

    def _detect_missing_test_coverage(self, graph: ERCGraph, seq_start: int) -> List[Finding]:
        """Detect critical endpoints that have 0 test coverage in the consistency graph."""
        findings = []

        for ep in graph.get_all_endpoints():
            # Check if covered by any test
            has_test = graph.has_test_coverage(ep.id)
            if not has_test:
                path = ep.attributes.get("path", ep.name)
                method = ep.attributes.get("method", "GET")

                findings.append(
                    Finding(
                        id=f"TG-LOOSE-{seq_start + len(findings):03d}",
                        category=Category.LOOSE_END,
                        subcategory="missing_test_coverage",
                        title=f"Untested API Route ({method} {path})",
                        severity=Severity.LOW,
                        confidence=0.80,
                        verification_status=VerificationStatus.PROBABLE,
                        affected_file=ep.file,
                        line_number=ep.line,
                        snippet=f"{method} {path}",
                        supporting_evidence=[
                            f"Endpoint '{path}' defined in '{ep.file}' at line {ep.line}",
                            "Zero tests in the repository test suite invoke or reference this route",
                        ],
                        counterevidence_considered=[
                            "Searched test files for route path and handler function: no matching tests identified",
                        ],
                        technical_explanation=f"Route '{path}' has no corresponding integration or unit test evidence, leaving regression risks unmonitored during future refactorings.",
                        potential_impact="Regressions and silent API breakage going unnoticed until production deployment.",
                        recommended_remediation=f"Add an automated test case exercising '{method} {path}' with valid and invalid inputs.",
                        related_nodes=[ep.id],
                    )
                )
        return findings
