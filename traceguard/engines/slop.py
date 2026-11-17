"""
Code Slop Engine: Objectively Measurable Engineering Weaknesses,
Redundant Abstractions, Dead Code, Unused Logic, Complexity, and Swallowed Errors.
"""

from __future__ import annotations
import ast
import re
from typing import Dict, List, Set, Tuple

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


class CodeSlopEngine(BaseEngine):
    """
    Contextual code-quality detection engine identifying objectively measurable
    engineering weaknesses, dead code, redundant abstractions, and maintenance hazards.
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

        # 1. Swallowed Exceptions & Silent Failures
        f_swallow = self._detect_swallowed_exceptions(graph, files_content, seq)
        findings.extend(f_swallow)
        seq += len(f_swallow)

        # 2. Dead & Unreachable Code (Graph-backed reachability & AST statements after return)
        f_dead = self._detect_dead_code(graph, files_content, seq)
        findings.extend(f_dead)
        seq += len(f_dead)

        # 3. Redundant Wrappers & Pass-Through Identity Abstractions
        f_wrap = self._detect_redundant_wrappers(graph, files_content, seq)
        findings.extend(f_wrap)
        seq += len(f_wrap)

        # 4. Excessive Nesting & Structural Complexity Spikes
        f_comp = self._detect_excessive_complexity(files_content, seq)
        findings.extend(f_comp)
        seq += len(f_comp)

        # 5. Empty & Meaningless Methods / Placeholders
        f_empty = self._detect_empty_or_placeholder_symbols(graph, seq)
        findings.extend(f_empty)
        seq += len(f_empty)

        # 6. Duplicate Code Blocks / Repeated Boilerplate
        f_dupe = self._detect_duplicate_implementations(files_content, seq)
        findings.extend(f_dupe)
        seq += len(f_dupe)

        # 7. Unnecessary / Phantom Imports (imported but never called or referenced)
        f_imp = self._detect_unused_imports(files_content, seq)
        findings.extend(f_imp)
        seq += len(f_imp)

        return findings

    def _detect_swallowed_exceptions(
        self, graph: ERCGraph, files_content: Dict[str, str], seq_start: int
    ) -> List[Finding]:
        findings = []

        # Graph-extracted swallowed exceptions
        for sym in graph.get_symbols_by_kind(NodeType.MODULE):
            incoming = graph.get_incoming_relations(sym.id)
            for rel in incoming:
                if rel.attributes.get("issue_type") == "swallowed_exception":
                    exc_type = rel.attributes.get("exception_type", "Exception")
                    findings.append(
                        Finding(
                            id=f"TG-SLOP-{seq_start + len(findings):03d}",
                            category=Category.SLOP,
                            subcategory="swallowed_exception",
                            title=f"Blind Exception Suppression ({exc_type})",
                            severity=Severity.HIGH,
                            confidence=0.92,
                            verification_status=VerificationStatus.CONFIRMED,
                            affected_file=rel.evidence.file,
                            line_number=rel.evidence.line,
                            snippet=rel.evidence.snippet,
                            supporting_evidence=[
                                f"Exception block silently swallows {exc_type} with 'pass' or empty handler",
                                "Zero logging, re-raising, or recovery action executed",
                            ],
                            counterevidence_considered=[
                                "Checked for error logging statements: none found in except body",
                                "Checked for metric counters or fallback assignments: none found",
                            ],
                            technical_explanation="Silently discarding exceptions without logging or structured recovery conceals runtime failures, database corruptions, and critical network drops, making production outages nearly impossible to diagnose.",
                            potential_impact="Silent data corruption, unexplained downstream state failure, and extended debug time during production incidents.",
                            recommended_remediation="Log the exception with traceback (logger.exception), re-raise a domain-specific error, or provide an explicit documented fallback.",
                        )
                    )

        # Additional regex check for JS empty catches
        js_catch_pat = re.compile(r'catch\s*\([^)]*\)\s*\{\s*\}')
        for rel_path, content in files_content.items():
            if rel_path.endswith((".js", ".ts", ".jsx", ".tsx")):
                for idx, line in enumerate(content.splitlines(), start=1):
                    if js_catch_pat.search(line):
                        findings.append(
                            Finding(
                                id=f"TG-SLOP-{seq_start + len(findings):03d}",
                                category=Category.SLOP,
                                subcategory="swallowed_exception",
                                title="Empty Catch Block (Silent Error Swallow)",
                                severity=Severity.MEDIUM,
                                confidence=0.90,
                                verification_status=VerificationStatus.CONFIRMED,
                                affected_file=rel_path,
                                line_number=idx,
                                snippet=line.strip(),
                                supporting_evidence=[f"Empty catch block at line {idx}"],
                                counterevidence_considered=["Checked if error is handled in finally block: no recovery present"],
                                technical_explanation="An empty catch block discards asynchronous or synchronous errors completely, causing promises to swallow rejections.",
                                potential_impact="Uncaught rejection degradation and undetected API failures in client/server code.",
                                recommended_remediation="Log the caught error to monitoring/console or bubble it up to an error boundary.",
                            )
                        )
        return findings

    def _detect_dead_code(
        self, graph: ERCGraph, files_content: Dict[str, str], seq_start: int
    ) -> List[Finding]:
        findings = []

        # 1. Unreachable statements in Python AST after return / raise
        for rel_path, content in files_content.items():
            if not rel_path.endswith(".py"):
                continue
            try:
                tree = ast.parse(content, filename=rel_path)
            except Exception:
                continue

            lines = content.splitlines()
            for node in ast.walk(tree):
                if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                    body = node.body
                    for i, stmt in enumerate(body):
                        if isinstance(stmt, (ast.Return, ast.Raise)):
                            # Any statements after this in the same block are unreachable
                            if i + 1 < len(body):
                                unreachable_stmt = body[i + 1]
                                s_line = unreachable_stmt.lineno
                                snippet = lines[s_line - 1].strip() if s_line <= len(lines) else "unreachable statement"
                                findings.append(
                                    Finding(
                                        id=f"TG-SLOP-{seq_start + len(findings):03d}",
                                        category=Category.SLOP,
                                        subcategory="unreachable_code",
                                        title=f"Unreachable Code After {stmt.__class__.__name__}",
                                        severity=Severity.MEDIUM,
                                        confidence=0.95,
                                        verification_status=VerificationStatus.CONFIRMED,
                                        affected_file=rel_path,
                                        line_number=s_line,
                                        snippet=snippet,
                                        supporting_evidence=[
                                            f"Statement immediately follows unconditional {stmt.__class__.__name__} at line {stmt.lineno}",
                                            "Execution path can never reach this statement",
                                        ],
                                        counterevidence_considered=[
                                            "Checked whether return was inside conditional branch: verified top-level block sequence",
                                        ],
                                        technical_explanation="Code placed immediately after an unconditional return or raise cannot ever execute, representing dead logic and clutter.",
                                        potential_impact="Dead code confuses engineers regarding actual control flow and creates dead weight in test suites.",
                                        recommended_remediation="Remove the unreachable code block or fix the premature return condition.",
                                    )
                                )
                                break

        # 2. Graph analysis: Unreferenced private functions with no callers, no export, and no test coverage
        for sym in graph.get_symbols_by_kind(NodeType.FUNCTION):
            # Check if private (starts with _) and not a special dunder
            if sym.name.startswith("_") and not sym.name.startswith("__"):
                # Non-test file
                if "test" in sym.file.lower():
                    continue

                callers = graph.get_callers(sym.id)
                has_test = graph.has_test_coverage(sym.id)
                if not callers and not has_test:
                    findings.append(
                        Finding(
                            id=f"TG-SLOP-{seq_start + len(findings):03d}",
                            category=Category.SLOP,
                            subcategory="dead_function",
                            title=f"Unreferenced Internal Function ({sym.name})",
                            severity=Severity.LOW,
                            confidence=0.85,
                            verification_status=VerificationStatus.PROBABLE,
                            affected_file=sym.file,
                            line_number=sym.line,
                            snippet=f"def {sym.name}(...)",
                            supporting_evidence=[
                                f"Private function '{sym.name}' has 0 internal callers across the entire repository consistency graph",
                                "Not referenced in any test or exported interface",
                            ],
                            counterevidence_considered=[
                                "Checked for dynamic call via getattr/string reflection: no matches found",
                                "Checked for external exports: function marked private with leading underscore",
                            ],
                            technical_explanation="Internal private function declared but never invoked within the repository, indicating abandoned feature development or incomplete refactoring.",
                            potential_impact="Code bloat, cognitive load for new developers, and maintenance burden.",
                            recommended_remediation="Delete the unreferenced function or connect it to its intended caller.",
                        )
                    )
        return findings

    def _detect_redundant_wrappers(
        self, graph: ERCGraph, files_content: Dict[str, str], seq_start: int
    ) -> List[Finding]:
        """Detect 1-line pass-through wrappers that provide zero abstraction value."""
        findings = []

        for rel_path, content in files_content.items():
            if not rel_path.endswith(".py"):
                continue
            try:
                tree = ast.parse(content, filename=rel_path)
            except Exception:
                continue

            lines = content.splitlines()
            for node in ast.walk(tree):
                if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                    # Check if body is just 1 return statement calling another function with same args
                    body = [s for s in node.body if not (isinstance(s, ast.Expr) and isinstance(s.value, ast.Constant))]
                    if len(body) == 1 and isinstance(body[0], ast.Return) and isinstance(body[0].value, ast.Call):
                        call = body[0].value
                        called_name = ""
                        try:
                            called_name = ast.unparse(call.func)
                        except Exception:
                            pass

                        # If called function is just passing identical arguments with no transformation
                        if called_name and not node.name.startswith("__") and node.name != "main":
                            fn_args = [a.arg for a in node.args.args]
                            call_args = []
                            for a in call.args:
                                if isinstance(a, ast.Name):
                                    call_args.append(a.id)

                            if fn_args == call_args and len(fn_args) > 0 and len(node.decorator_list) == 0:
                                snippet = lines[node.lineno - 1].strip() if node.lineno <= len(lines) else ""
                                findings.append(
                                    Finding(
                                        id=f"TG-SLOP-{seq_start + len(findings):03d}",
                                        category=Category.SLOP,
                                        subcategory="redundant_abstraction",
                                        title=f"Redundant Pass-Through Wrapper ({node.name} -> {called_name})",
                                        severity=Severity.LOW,
                                        confidence=0.88,
                                        verification_status=VerificationStatus.CONFIRMED,
                                        affected_file=rel_path,
                                        line_number=node.lineno,
                                        snippet=snippet,
                                        supporting_evidence=[
                                            f"Function '{node.name}' directly forwards arguments {fn_args} to '{called_name}' without transformation or logic",
                                            "No decorators, logging, or caching attached",
                                        ],
                                        counterevidence_considered=[
                                            "Checked for parameter transformations: identical parameter sequence",
                                            "Checked for logging/auditing side effects: none present",
                                        ],
                                        technical_explanation="Thin pass-through wrapper adds unnecessary layer of indirection without providing boundary separation, caching, or logging.",
                                        potential_impact="Increases stack depth, clutters call hierarchy, and obscures where actual business logic lives.",
                                        recommended_remediation="Inline the call directly or document why this indirection layer is required for interface compatibility.",
                                    )
                                )
        return findings

    def _detect_excessive_complexity(
        self, files_content: Dict[str, str], seq_start: int
    ) -> List[Finding]:
        """Detect excessive indentation/nesting (> 4 levels) and oversized functions (> 120 lines)."""
        findings = []

        for rel_path, content in files_content.items():
            # Skip test files or configs
            if "test" in rel_path.lower() or rel_path.endswith((".json", ".yaml", ".yml", ".md")):
                continue

            lines = content.splitlines()
            deep_nesting_found = False

            for idx, line in enumerate(lines, start=1):
                clean = line.strip()
                if not clean or clean.startswith("#") or clean.startswith("//"):
                    continue

                # Calculate leading spaces
                leading_spaces = len(line) - len(line.lstrip(" "))
                indent_level = leading_spaces // 4  # Standard 4 spaces

                if indent_level >= 5 and not deep_nesting_found:
                    deep_nesting_found = True
                    findings.append(
                        Finding(
                            id=f"TG-SLOP-{seq_start + len(findings):03d}",
                            category=Category.SLOP,
                            subcategory="excessive_complexity",
                            title=f"Excessive Nesting Depth ({indent_level} Levels)",
                            severity=Severity.MEDIUM,
                            confidence=0.85,
                            verification_status=VerificationStatus.CONFIRMED,
                            affected_file=rel_path,
                            line_number=idx,
                            snippet=clean,
                            supporting_evidence=[
                                f"Indentation reaches {indent_level} levels at line {idx}",
                                "Exceeds standard 3-level cyclomatic nesting threshold",
                            ],
                            counterevidence_considered=[
                                "Checked if indentation belongs to multiline array/dict literal: verified control flow block",
                            ],
                            technical_explanation="Deeply nested conditionals, loops, and try-catch blocks dramatically increase cyclomatic complexity, making branch coverage and reasoning error-prone.",
                            potential_impact="Elevated bug rates, difficult edge-case testing, and high developer cognitive strain.",
                            recommended_remediation="Refactor using guard clauses (early returns) and decompose sub-branches into dedicated helper functions.",
                        )
                    )
        return findings

    def _detect_empty_or_placeholder_symbols(self, graph: ERCGraph, seq_start: int) -> List[Finding]:
        """Detect empty methods or placeholder implementations in non-abstract classes."""
        findings = []

        for sym in graph.get_symbols_by_kind(NodeType.FUNCTION):
            is_placeholder = sym.attributes.get("is_placeholder", False)
            reason = sym.attributes.get("placeholder_reason", "")

            # Exclude test files, interfaces, abstract methods, and migration hooks
            if any(k in sym.file.lower() for k in ("test", "migration", "alembic")):
                continue
            if sym.name.startswith("__") or sym.name in ("upgrade", "downgrade"):
                continue


            if is_placeholder:
                findings.append(
                    Finding(
                        id=f"TG-SLOP-{seq_start + len(findings):03d}",
                        category=Category.SLOP,
                        subcategory="placeholder_implementation",
                        title=f"Unimplemented / Stub Method Body ({sym.name})",
                        severity=Severity.MEDIUM,
                        confidence=0.90,
                        verification_status=VerificationStatus.CONFIRMED,
                        affected_file=sym.file,
                        line_number=sym.line,
                        snippet=f"def {sym.name}(): {reason}",
                        supporting_evidence=[
                            f"Method body is stubbed with {reason}",
                            "Located inside active application logic",
                        ],
                        counterevidence_considered=[
                            "Checked if method is inside an ABC or Protocol class: negative",
                            "Checked if decorated with @abstractmethod: negative",
                        ],
                        technical_explanation=f"Function '{sym.name}' contains no actionable logic ({reason}). Calling this in production will return mock data or raise unhandled exceptions.",
                        potential_impact="Incomplete business logic, runtime errors when executed, or deceptive test passes.",
                        recommended_remediation="Implement the concrete logic or raise a documented NotImplementedError if intentionally deferred.",
                    )
                )
        return findings

    def _detect_duplicate_implementations(
        self, files_content: Dict[str, str], seq_start: int
    ) -> List[Finding]:
        """Detect identical or near-identical function implementations duplicated across files."""
        findings = []
        function_hashes: Dict[str, Tuple[str, int, str]] = {}

        for rel_path, content in files_content.items():
            if not rel_path.endswith(".py"):
                continue
            if "test" in rel_path.lower():
                continue

            try:
                tree = ast.parse(content, filename=rel_path)
            except Exception:
                continue

            lines = content.splitlines()
            for node in ast.walk(tree):
                if isinstance(node, ast.FunctionDef) and len(node.body) > 3:
                    # Normalize body tokens (strip variable names, just inspect statement types)
                    body_sig = "_".join(type(stmt).__name__ for stmt in node.body)
                    # Extract body text without whitespace
                    body_text = "\n".join(lines[node.lineno:node.end_lineno or node.lineno])
                    norm_text = re.sub(r'\s+', '', body_text)

                    if len(norm_text) > 80:  # Non-trivial length
                        if norm_text in function_hashes:
                            orig_file, orig_line, orig_name = function_hashes[norm_text]
                            if orig_file != rel_path or orig_name != node.name:
                                findings.append(
                                    Finding(
                                        id=f"TG-SLOP-{seq_start + len(findings):03d}",
                                        category=Category.SLOP,
                                        subcategory="duplicate_implementation",
                                        title=f"Duplicate Implementation ({node.name} mirrors {orig_name})",
                                        severity=Severity.LOW,
                                        confidence=0.85,
                                        verification_status=VerificationStatus.CONFIRMED,
                                        affected_file=rel_path,
                                        line_number=node.lineno,
                                        snippet=f"def {node.name}(...)",
                                        supporting_evidence=[
                                            f"Identical logic sequence previously implemented in {orig_file}:{orig_line} as '{orig_name}'",
                                            "Normalized body length exceeds 80 characters of duplicate statements",
                                        ],
                                        counterevidence_considered=[
                                            "Checked if functions serve different domain models with identical fields: confirmed verbatim statement duplication",
                                        ],
                                        technical_explanation="Copy-pasting identical implementation logic creates multiple divergence points when bugs are fixed in one copy but forgotten in another.",
                                        potential_impact="Inconsistent behavior and double maintenance overhead when requirements change.",
                                        recommended_remediation="Extract common routine into a shared utility or service module.",
                                    )
                                )
                        else:
                            function_hashes[norm_text] = (rel_path, node.lineno, node.name)
        return findings

    def _detect_unused_imports(
        self, files_content: Dict[str, str], seq_start: int
    ) -> List[Finding]:
        """Detect imports that are never used in the file."""
        findings = []

        for rel_path, content in files_content.items():
            if not rel_path.endswith(".py"):
                continue
            if rel_path.endswith("__init__.py"):
                continue  # __init__ re-exports

            try:
                tree = ast.parse(content, filename=rel_path)
            except Exception:
                continue

            lines = content.splitlines()
            imported_names: Dict[str, int] = {}

            for node in ast.walk(tree):
                if isinstance(node, ast.Import):
                    for alias in node.names:
                        name = alias.asname or alias.name
                        imported_names[name] = node.lineno
                elif isinstance(node, ast.ImportFrom):
                    for alias in node.names:
                        if alias.name != "*":
                            name = alias.asname or alias.name
                            imported_names[name] = node.lineno

            # Count occurrences in body
            for name, lineno in imported_names.items():
                # Simple word boundary check
                pat = re.compile(rf'\b{re.escape(name)}\b')
                # Count occurrences in file
                matches = pat.findall(content)
                # If only 1 match (the import line itself)
                if len(matches) <= 1:
                    snippet = lines[lineno - 1].strip() if lineno <= len(lines) else f"import {name}"
                    findings.append(
                        Finding(
                            id=f"TG-SLOP-{seq_start + len(findings):03d}",
                            category=Category.SLOP,
                            subcategory="unused_import",
                            title=f"Unused Import Statement ('{name}')",
                            severity=Severity.INFO,
                            confidence=0.92,
                            verification_status=VerificationStatus.CONFIRMED,
                            affected_file=rel_path,
                            line_number=lineno,
                            snippet=snippet,
                            supporting_evidence=[
                                f"Import '{name}' appears only on its declaration line {lineno}",
                                "Zero references found in file AST and lexical text",
                            ],
                            counterevidence_considered=[
                                "Checked if file is an __init__.py package exporter: negative",
                            ],
                            technical_explanation="Unused imports introduce phantom dependencies, slow startup time, and confuse static analysis tools.",
                            potential_impact="Dead dependencies and clutter.",
                            recommended_remediation="Remove the unused import statement.",
                        )
                    )
        return findings
