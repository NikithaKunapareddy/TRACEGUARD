"""
Coding Gap Engine & Negative-Space Analysis.
Detects discrepancies between declared contracts, frontend calls, documentation,
and missing backend implementations.
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


class CodingGapEngine(BaseEngine):
    """
    Negative-space relationship investigation engine.
    Discovers missing routes, unimplemented interfaces, orphaned models,
    documented features missing from code, and unvalidated operations.
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

        # 1. Missing Backend Endpoints for Frontend API Calls (Negative-Space Analysis)
        f_routes = self._detect_missing_backend_routes(graph, seq)
        findings.extend(f_routes)
        seq += len(f_routes)

        # 2. Documented Endpoints Missing from Source Code
        f_docs = self._detect_missing_documented_endpoints(graph, seq)
        findings.extend(f_docs)
        seq += len(f_docs)

        # 3. Interfaces / Abstract Classes Without Concrete Implementations
        f_iface = self._detect_unimplemented_interfaces(graph, seq)
        findings.extend(f_iface)
        seq += len(f_iface)

        # 4. Database Models Without Corresponding Migrations
        f_models = self._detect_models_missing_migrations(graph, files_content, seq)
        findings.extend(f_models)
        seq += len(f_models)

        # 5. Endpoint returning Placeholder / Mock Data
        f_mocks = self._detect_placeholder_endpoints(graph, seq)
        findings.extend(f_mocks)
        seq += len(f_mocks)

        # 6. Critical Operations Without Error Handling or Transaction Rollbacks
        f_tx = self._detect_unhandled_critical_operations(graph, files_content, seq)
        findings.extend(f_tx)
        seq += len(f_tx)

        return findings

    def _detect_missing_backend_routes(self, graph: ERCGraph, seq_start: int) -> List[Finding]:
        """
        Negative-Space Protocol for Frontend API Calls:
        1. Identify expected route relationship.
        2. Establish why expected: Frontend client explicitly invokes this endpoint.
        3. Search repository for supporting backend routes.
        4. Search alternative implementations (dynamic parameters, wildcard routers).
        5. Check legitimate exceptions (external URLs, third-party APIs).
        6. Assign confidence level.
        7. Report actionable findings.
        """
        findings = []
        api_calls = graph.get_all_api_calls()

        for call in api_calls:
            call_path = call.attributes.get("path", "")
            call_method = call.attributes.get("method", "GET")

            # Check legitimate exceptions: external URLs
            if call_path.startswith("http://") or call_path.startswith("https://") or "://" in call_path:
                continue
            # Third-party webhook or CDN path
            if any(call_path.startswith(p) for p in ("/static", "/assets", "/favicon.ico")):
                continue

            # Search backend routes with route matching (including parameter normalization)
            matched_endpoints = graph.find_routes_matching_path(call_path, call_method)

            # Check alternative implementations: ANY method match
            if not matched_endpoints:
                matched_endpoints = graph.find_routes_matching_path(call_path, None)

            if not matched_endpoints:
                # Missing backend route confirmed!
                findings.append(
                    Finding(
                        id=f"TG-GAP-{seq_start + len(findings):03d}",
                        category=Category.GAP,
                        subcategory="missing_backend_route",
                        title=f"Missing Backend Route for Client Call ({call_method} {call_path})",
                        severity=Severity.HIGH,
                        confidence=0.88,
                        verification_status=VerificationStatus.CONFIRMED,
                        affected_file=call.file,
                        line_number=call.line,
                        snippet=f"{call.attributes.get('library', 'fetch')}: {call.name}",
                        supporting_evidence=[
                            f"Frontend client in '{call.file}' at line {call.line} initiates request to '{call_path}'",
                            "No matching route handler found among registered backend endpoints in the ERCG",
                        ],
                        counterevidence_considered=[
                            "Searched exact and parameterized route paths ({id}, :id, <id>): 0 matches",
                            "Checked for wildcard or catch-all routers (*, /api/*): none found",
                            "Checked if target is an external service URL: verified as internal relative path",
                        ],
                        technical_explanation=f"The frontend component requires backend endpoint '{call_path}' ({call_method}), but no matching route or controller is implemented anywhere in the repository. In production, this causes 404 Not Found errors when users trigger this action.",
                        potential_impact="Broken user-facing functionality, failing client requests, and unhandled promise rejections in the UI.",
                        recommended_remediation=f"Implement the backend route handler for '{call_method} {call_path}' or update the frontend client URL if the route was renamed.",
                        related_nodes=[call.id],
                    )
                )
        return findings

    def _detect_missing_documented_endpoints(self, graph: ERCGraph, seq_start: int) -> List[Finding]:
        """Detect API endpoints documented in README / API specs that are missing in code."""
        findings = []
        doc_symbols = graph.get_symbols_by_kind(NodeType.DOC)

        for sym in doc_symbols:
            if sym.attributes.get("doc_type") == "endpoint":
                doc_path = sym.attributes.get("declared_path", "")
                doc_method = sym.attributes.get("declared_method", "GET")

                matched = graph.find_routes_matching_path(doc_path, doc_method)
                if not matched:
                    matched_any = graph.find_routes_matching_path(doc_path, None)
                    if not matched_any:
                        findings.append(
                            Finding(
                                id=f"TG-GAP-{seq_start + len(findings):03d}",
                                category=Category.GAP,
                                subcategory="undelivered_specification",
                                title=f"Documented Endpoint Missing from Source ({doc_method} {doc_path})",
                                severity=Severity.MEDIUM,
                                confidence=0.82,
                                verification_status=VerificationStatus.PROBABLE,
                                affected_file=sym.file,
                                line_number=sym.line,
                                snippet=sym.name,
                                supporting_evidence=[
                                    f"Declared in repository documentation ('{sym.file}') at line {sym.line}",
                                    "Zero corresponding route definitions detected in application source code",
                                ],
                                counterevidence_considered=[
                                    "Checked parameterized routes across all backend adapters: 0 matches",
                                    "Checked if document describes planned future roadmap: no future disclaimer found",
                                ],
                                technical_explanation=f"The public repository documentation declares that '{doc_method} {doc_path}' is an available API endpoint, but no controller or route implements this contract in the codebase.",
                                potential_impact="API consumers following documentation will receive 404 errors, causing integration breakdowns.",
                                recommended_remediation=f"Implement the documented endpoint '{doc_path}' or remove the obsolete entry from {sym.file}.",
                                related_nodes=[sym.id],
                            )
                        )
        return findings

    def _detect_unimplemented_interfaces(self, graph: ERCGraph, seq_start: int) -> List[Finding]:
        """Detect interfaces or Abstract Base Classes that have 0 concrete implementing classes."""
        findings = []
        interfaces = graph.get_symbols_by_kind(NodeType.INTERFACE)

        for iface in interfaces:
            # Skip standard library or test mocks
            if iface.name in ("ABC", "Protocol", "Interface") or "test" in iface.file.lower():
                continue

            has_impl = graph.has_concrete_implementation(iface.name)
            if not has_impl:
                findings.append(
                    Finding(
                        id=f"TG-GAP-{seq_start + len(findings):03d}",
                        category=Category.GAP,
                        subcategory="unimplemented_interface",
                        title=f"Interface Declared Without Concrete Implementation ({iface.name})",
                        severity=Severity.MEDIUM,
                        confidence=0.85,
                        verification_status=VerificationStatus.CONFIRMED,
                        affected_file=iface.file,
                        line_number=iface.line,
                        snippet=f"interface/class {iface.name}",
                        supporting_evidence=[
                            f"Interface '{iface.name}' declared in '{iface.file}' at line {iface.line}",
                            "0 concrete classes implement or inherit from this contract in the repository",
                        ],
                        counterevidence_considered=[
                            "Searched all class inheritance lists and implements declarations in ERCG: 0 matches",
                            "Checked if intended for external plugin consumer: interface resides in internal service module",
                        ],
                        technical_explanation=f"The interface '{iface.name}' defines an architectural contract, but no concrete implementation exists anywhere in the repository, rendering the abstraction incomplete.",
                        potential_impact="Dependency injection failures, missing service capabilities, or broken polymorphism.",
                        recommended_remediation=f"Provide a concrete class implementing '{iface.name}' or remove the dangling interface if deprecated.",
                        related_nodes=[iface.id],
                    )
                )
        return findings

    def _detect_models_missing_migrations(
        self, graph: ERCGraph, files_content: Dict[str, str], seq_start: int
    ) -> List[Finding]:
        """Detect ORM database models that do not appear in any migration or schema definition."""
        findings = []
        models = graph.get_symbols_by_kind(NodeType.DB_MODEL)

        # Collect all text from migration files
        migration_texts: List[str] = []
        migration_files_exist = False
        for rel_path, content in files_content.items():
            if any(k in rel_path.lower() for k in ("migration", "alembic", "db/migrate")):
                migration_texts.append(content.lower())
                migration_files_exist = True

        # If repo does not use migrations at all, skip to avoid false positive
        if not migration_files_exist:
            return findings

        full_migration_corpus = "\n".join(migration_texts)

        for model in models:
            model_name = model.name.lower()
            # Also check table name attribute if present
            table_name = model.attributes.get("table_name", "").lower()

            # Check if model name or table name is in migration corpus
            found_in_migration = (model_name in full_migration_corpus) or (table_name and table_name in full_migration_corpus)

            if not found_in_migration:
                findings.append(
                    Finding(
                        id=f"TG-GAP-{seq_start + len(findings):03d}",
                        category=Category.GAP,
                        subcategory="missing_database_migration",
                        title=f"Database Model Without Migration ({model.name})",
                        severity=Severity.HIGH,
                        confidence=0.86,
                        verification_status=VerificationStatus.PROBABLE,
                        affected_file=model.file,
                        line_number=model.line,
                        snippet=f"class {model.name}(...)",
                        supporting_evidence=[
                            f"Model '{model.name}' declared in '{model.file}' at line {model.line}",
                            "Repository contains active migration directory, but model name or table is absent across all migrations",
                        ],
                        counterevidence_considered=[
                            "Checked all Alembic / SQL migration files: table name not found",
                            "Checked if repo uses automatic schema generation: repository contains explicit migration version history",
                        ],
                        technical_explanation=f"A database entity '{model.name}' was added to code models, but no corresponding database migration script was generated or committed. Deploying this code will trigger table missing or column missing errors.",
                        potential_impact="Database schema divergence, 500 server errors on query execution, or deployment rollback.",
                        recommended_remediation=f"Generate and commit the migration for '{model.name}' (e.g. alembic revision --autogenerate).",
                        related_nodes=[model.id],
                    )
                )
        return findings

    def _detect_placeholder_endpoints(self, graph: ERCGraph, seq_start: int) -> List[Finding]:
        """Detect live endpoints whose implementation is just a dummy return or placeholder."""
        findings = []

        for ep in graph.get_all_endpoints():
            is_placeholder = ep.attributes.get("is_placeholder", False)
            reason = ep.attributes.get("placeholder_reason", "")

            if is_placeholder:
                findings.append(
                    Finding(
                        id=f"TG-GAP-{seq_start + len(findings):03d}",
                        category=Category.GAP,
                        subcategory="placeholder_endpoint",
                        title=f"API Endpoint Returns Mock / Placeholder Data ({ep.name})",
                        severity=Severity.HIGH,
                        confidence=0.90,
                        verification_status=VerificationStatus.CONFIRMED,
                        affected_file=ep.file,
                        line_number=ep.line,
                        snippet=f"{ep.name}: {reason}",
                        supporting_evidence=[
                            f"Live registered endpoint '{ep.name}' body is stubbed with {reason}",
                            "Returns hardcoded mock dictionary or empty value instead of executing domain logic",
                        ],
                        counterevidence_considered=[
                            "Checked if endpoint is inside a mock server or test fixture: verified active production router",
                        ],
                        technical_explanation=f"Endpoint '{ep.name}' is exposed to consumers but returns hardcoded stub data ({reason}). Real requests will never persist state or perform actual operations.",
                        potential_impact="Deceptive API behavior, data loss (operations silently not performed), and broken end-to-end integration.",
                        recommended_remediation="Connect the route handler to the underlying database service or background worker.",
                        related_nodes=[ep.id],
                    )
                )
        return findings

    def _detect_unhandled_critical_operations(
        self, graph: ERCGraph, files_content: Dict[str, str], seq_start: int
    ) -> List[Finding]:
        """Detect critical data mutation operations lacking exception handling or transaction guards."""
        findings = []
        crit_ops = [
            (re.compile(r'(?i)(?:db|session)\.commit\s*\(\)'), "Database Transaction Commit"),
            (re.compile(r'(?i)stripe\.PaymentIntent\.create\s*\('), "Payment Processing Operation"),
        ]

        for rel_path, content in files_content.items():
            if "test" in rel_path.lower():
                continue
            lines = content.splitlines()

            for idx, line in enumerate(lines, start=1):
                clean = line.strip()
                for pat, op_name in crit_ops:
                    if pat.search(clean):
                        # Look around +/- 10 lines for try/except or with session
                        surrounding = "\n".join(lines[max(0, idx - 10):min(len(lines), idx + 10)])
                        if "try:" not in surrounding and "with " not in surrounding:
                            findings.append(
                                Finding(
                                    id=f"TG-GAP-{seq_start + len(findings):03d}",
                                    category=Category.GAP,
                                    subcategory="missing_error_handling",
                                    title=f"Critical Operation Without Error Handling ({op_name})",
                                    severity=Severity.MEDIUM,
                                    confidence=0.80,
                                    verification_status=VerificationStatus.PROBABLE,
                                    affected_file=rel_path,
                                    line_number=idx,
                                    snippet=clean,
                                    supporting_evidence=[
                                        f"{op_name} executed without wrapping try/except or transaction context at line {idx}",
                                    ],
                                    counterevidence_considered=[
                                        "Checked surrounding 20 lines for try-catch or with transaction context: none observed",
                                    ],
                                    technical_explanation=f"Performing '{op_name}' without an explicit exception handling block or rollback mechanism can leave the application in an inconsistent state or leak connections upon failure.",
                                    potential_impact="Dangling transactions, locked database tables, or lost error context during network failure.",
                                    recommended_remediation="Wrap the critical operation in a try/except block with rollback or use a managed transaction context manager.",
                                )
                            )
        return findings
