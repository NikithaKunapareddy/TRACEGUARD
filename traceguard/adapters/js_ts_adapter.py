"""
JavaScript & TypeScript Lexical & Structural Adapter.
Extracts functions, classes, frontend API calls, backend routes, configs, and relationships.
"""

from __future__ import annotations
import re
from typing import List, Optional, Set, Dict, Any

from ..core.models import (
    FileMetadata,
    NodeType,
    EdgeType,
    Symbol,
    Relation,
    Evidence,
)
from ..core.graph import ERCGraph
from .base import BaseParserAdapter


class JavaScriptAdapter(BaseParserAdapter):
    """Adapter for JavaScript, TypeScript, JSX, and TSX files."""

    def can_parse(self, file_meta: FileMetadata) -> bool:
        return file_meta.language in ("javascript", "typescript")

    def parse(self, file_meta: FileMetadata, content: str, graph: ERCGraph) -> None:
        rel_path = file_meta.relative_path
        lines = content.splitlines()

        # Add Module symbol
        mod_id = f"mod:{rel_path}"
        graph.add_symbol(
            Symbol(
                id=mod_id,
                name=rel_path,
                kind=NodeType.MODULE,
                file=rel_path,
                line=1,
                end_line=len(lines) if lines else 1,
            )
        )

        self._extract_backend_routes(file_meta, lines, graph, mod_id)
        self._extract_frontend_api_calls(file_meta, lines, graph, mod_id)
        self._extract_symbols_and_classes(file_meta, lines, graph, mod_id)
        self._extract_config_usage(file_meta, lines, graph, mod_id)
        self._extract_security_sinks(file_meta, lines, graph, mod_id)
        self._extract_swallowed_catches(file_meta, lines, graph, mod_id)

    def _extract_backend_routes(
        self, file_meta: FileMetadata, lines: List[str], graph: ERCGraph, mod_id: str
    ) -> None:
        """Extract Express, Fastify, Next.js backend endpoint definitions."""
        rel_path = file_meta.relative_path
        full_text = "\n".join(lines)

        # Pattern: app.get('/path', ...), router.post('/path', ...)
        route_pattern = re.compile(
            r'(?:app|router|server)\.(get|post|put|delete|patch|options|head)\s*\(\s*[\'"`]([^\'"`]+)[\'"`]',
            re.IGNORECASE,
        )
        for idx, line in enumerate(lines, start=1):
            for match in route_pattern.finditer(line):
                method = match.group(1).upper()
                path = match.group(2)
                ep_id = f"ep:{rel_path}:{method}:{path}:{idx}"
                graph.add_symbol(
                    Symbol(
                        id=ep_id,
                        name=f"{method} {path}",
                        kind=NodeType.ENDPOINT,
                        file=rel_path,
                        line=idx,
                        end_line=idx,
                        attributes={"path": path, "method": method, "framework": "express/fastify"},
                    )
                )
                graph.add_relation(
                    Relation(
                        source=mod_id,
                        target=ep_id,
                        relation=EdgeType.DEFINES,
                        evidence=Evidence(file=rel_path, line=idx, snippet=line.strip()),
                    )
                )

        # Next.js App Router: app/api/.../route.ts
        if "app/api/" in rel_path.replace("\\", "/"):
            # Path inferred from directory
            subpath = rel_path.replace("\\", "/").split("app/api/")[-1]
            api_route = "/api/" + subpath.rsplit("/route.", 1)[0]
            methods = ["GET", "POST", "PUT", "DELETE", "PATCH"]
            for m in methods:
                m_pattern = re.compile(rf'export\s+(?:async\s+)?function\s+{m}\b')
                for idx, line in enumerate(lines, start=1):
                    if m_pattern.search(line):
                        ep_id = f"ep:{rel_path}:{m}:{api_route}:{idx}"
                        graph.add_symbol(
                            Symbol(
                                id=ep_id,
                                name=f"{m} {api_route}",
                                kind=NodeType.ENDPOINT,
                                file=rel_path,
                                line=idx,
                                end_line=idx,
                                attributes={"path": api_route, "method": m, "framework": "nextjs"},
                            )
                        )
                        graph.add_relation(
                            Relation(
                                source=mod_id,
                                target=ep_id,
                                relation=EdgeType.DEFINES,
                                evidence=Evidence(file=rel_path, line=idx, snippet=line.strip()),
                            )
                        )

    def _extract_frontend_api_calls(
        self, file_meta: FileMetadata, lines: List[str], graph: ERCGraph, mod_id: str
    ) -> None:
        """Extract fetch(), axios.get(), axios.post(), etc."""
        rel_path = file_meta.relative_path

        # fetch('/api/...', { method: 'POST' }) or fetch('/tasks/' + id, { method: 'DELETE' })
        fetch_pattern = re.compile(
            r'fetch\s*\(\s*[\'"`]([^\'"`]+)[\'"`](\s*\+\s*[a-zA-Z0-9_\.]+)?(?:\s*,\s*\{[^}]*method\s*:\s*[\'"]([A-Z]+)[\'"])?',
            re.IGNORECASE,
        )
        # axios.get('/api/...'), axios.post('/api/...')
        axios_pattern = re.compile(
            r'(?:axios|apiClient|httpClient|client)\.(get|post|put|delete|patch)\s*\(\s*[\'"`]([^\'"`]+)[\'"`]',
            re.IGNORECASE,
        )

        for idx, line in enumerate(lines, start=1):
            # check fetch
            for m in fetch_pattern.finditer(line):
                raw_path = m.group(1).strip()
                has_concat = bool(m.group(2))
                clean_path = re.sub(r'^\$\{[A-Za-z0-9_]+\}', '', raw_path)
                clean_path = re.sub(r'\$\{[^}]+\}', '{id}', clean_path)
                path = clean_path.split('?')[0].strip()
                if has_concat and path.endswith('/'):
                    path = path + '{id}'
                method = m.group(3).upper() if m.group(3) else "GET"
                # Exclude static assets or external URLs (http://, https://)
                if path and not path.startswith("http://") and not path.startswith("https://"):
                    call_id = f"apicall:{rel_path}:{method}:{path}:{idx}"
                    graph.add_symbol(
                        Symbol(
                            id=call_id,
                            name=f"CALL {method} {path}",
                            kind=NodeType.API_CALL,
                            file=rel_path,
                            line=idx,
                            end_line=idx,
                            attributes={"path": path, "method": method, "library": "fetch"},
                        )
                    )
                    graph.add_relation(
                        Relation(
                            source=mod_id,
                            target=call_id,
                            relation=EdgeType.CALLS,
                            evidence=Evidence(file=rel_path, line=idx, snippet=line.strip()),
                        )
                    )

            # check axios / client
            for m in axios_pattern.finditer(line):
                method = m.group(1).upper()
                raw_path = m.group(2).strip()
                clean_path = re.sub(r'^\$\{[A-Za-z0-9_]+\}', '', raw_path)
                clean_path = re.sub(r'\$\{[^}]+\}', '{id}', clean_path)
                path = clean_path.split('?')[0].strip()
                if path and not path.startswith("http://") and not path.startswith("https://"):
                    call_id = f"apicall:{rel_path}:{method}:{path}:{idx}"
                    graph.add_symbol(
                        Symbol(
                            id=call_id,
                            name=f"CALL {method} {path}",
                            kind=NodeType.API_CALL,
                            file=rel_path,
                            line=idx,
                            end_line=idx,
                            attributes={"path": path, "method": method, "library": "axios"},
                        )
                    )
                    graph.add_relation(
                        Relation(
                            source=mod_id,
                            target=call_id,
                            relation=EdgeType.CALLS,
                            evidence=Evidence(file=rel_path, line=idx, snippet=line.strip()),
                        )
                    )

    def _extract_symbols_and_classes(
        self, file_meta: FileMetadata, lines: List[str], graph: ERCGraph, mod_id: str
    ) -> None:
        rel_path = file_meta.relative_path

        # Class pattern
        cls_pattern = re.compile(r'class\s+([A-Za-z0-9_]+)(?:\s+extends\s+([A-Za-z0-9_]+))?(?:\s+implements\s+([A-Za-z0-9_,\s]+))?')
        # Interface pattern (TS)
        interface_pattern = re.compile(r'interface\s+([A-Za-z0-9_]+)')
        # Function pattern
        fn_pattern = re.compile(r'(?:export\s+)?(?:async\s+)?function\s+([A-Za-z0-9_]+)\s*\(')
        # Const arrow function: const myFunc = (...) =>
        arrow_pattern = re.compile(r'(?:export\s+)?const\s+([A-Za-z0-9_]+)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>')

        for idx, line in enumerate(lines, start=1):
            m_cls = cls_pattern.search(line)
            if m_cls:
                name = m_cls.group(1)
                parent = m_cls.group(2)
                implements = [x.strip() for x in m_cls.group(3).split(",")] if m_cls.group(3) else []
                cls_id = f"cls:{rel_path}:{name}:{idx}"
                graph.add_symbol(
                    Symbol(
                        id=cls_id,
                        name=name,
                        kind=NodeType.CLASS,
                        file=rel_path,
                        line=idx,
                        end_line=idx,
                        attributes={"base_classes": [parent] if parent else [], "implemented_interfaces": implements},
                    )
                )

            m_iface = interface_pattern.search(line)
            if m_iface:
                name = m_iface.group(1)
                iface_id = f"iface:{rel_path}:{name}:{idx}"
                graph.add_symbol(
                    Symbol(
                        id=iface_id,
                        name=name,
                        kind=NodeType.INTERFACE,
                        file=rel_path,
                        line=idx,
                        end_line=idx,
                    )
                )

            m_fn = fn_pattern.search(line) or arrow_pattern.search(line)
            if m_fn:
                name = m_fn.group(1)
                is_test = name.startswith("test") or "describe" in line or "it(" in line
                kind = NodeType.TEST if is_test else NodeType.FUNCTION
                fn_id = f"fn:{rel_path}:{name}:{idx}"
                graph.add_symbol(
                    Symbol(
                        id=fn_id,
                        name=name,
                        kind=kind,
                        file=rel_path,
                        line=idx,
                        end_line=idx,
                    )
                )

    def _extract_config_usage(
        self, file_meta: FileMetadata, lines: List[str], graph: ERCGraph, mod_id: str
    ) -> None:
        rel_path = file_meta.relative_path
        env_pattern = re.compile(r'process\.env\.([A-Za-z0-9_]+)|import\.meta\.env\.([A-Za-z0-9_]+)')

        for idx, line in enumerate(lines, start=1):
            for match in env_pattern.finditer(line):
                key = match.group(1) or match.group(2)
                cfg_id = f"cfg:{rel_path}:{key}:{idx}"
                graph.add_symbol(
                    Symbol(
                        id=cfg_id,
                        name=key,
                        kind=NodeType.CONFIG,
                        file=rel_path,
                        line=idx,
                        end_line=idx,
                        attributes={"key": key, "source": "js_ts"},
                    )
                )
                graph.add_relation(
                    Relation(
                        source=mod_id,
                        target=cfg_id,
                        relation=EdgeType.USES_CONFIG,
                        evidence=Evidence(file=rel_path, line=idx, snippet=line.strip()),
                    )
                )

    def _extract_security_sinks(
        self, file_meta: FileMetadata, lines: List[str], graph: ERCGraph, mod_id: str
    ) -> None:
        rel_path = file_meta.relative_path
        sinks = [
            (re.compile(r'\beval\s*\('), "eval Code Execution"),
            (re.compile(r'\b(?:exec|execSync|spawn|spawnSync)\s*\('), "Command Injection (exec/spawn)"),
            (re.compile(r'dangerouslySetInnerHTML'), "XSS sink (dangerouslySetInnerHTML)"),
            (re.compile(r'document\.write\s*\('), "DOM XSS (document.write)"),
        ]

        for idx, line in enumerate(lines, start=1):
            for pat, desc in sinks:
                if pat.search(line):
                    sink_id = f"sink:{rel_path}:{desc}:{idx}"
                    graph.add_symbol(
                        Symbol(
                            id=sink_id,
                            name=desc,
                            kind=NodeType.SINK,
                            file=rel_path,
                            line=idx,
                            end_line=idx,
                            attributes={"description": desc},
                        )
                    )
                    graph.add_relation(
                        Relation(
                            source=mod_id,
                            target=sink_id,
                            relation=EdgeType.DATA_FLOW_TO,
                            evidence=Evidence(file=rel_path, line=idx, snippet=line.strip()),
                        )
                    )

    def _extract_swallowed_catches(
        self, file_meta: FileMetadata, lines: List[str], graph: ERCGraph, mod_id: str
    ) -> None:
        rel_path = file_meta.relative_path
        # Pattern: catch\s*(\([^\)]*\))?\s*\{\s*\}
        full_text = "\n".join(lines)
        empty_catch_pattern = re.compile(r'catch\s*(?:\([^)]*\))?\s*\{\s*\}', re.MULTILINE)
        for match in empty_catch_pattern.finditer(full_text):
            # calculate line
            line_idx = full_text[:match.start()].count("\n") + 1
            graph.add_relation(
                Relation(
                    source=mod_id,
                    target=mod_id,
                    relation=EdgeType.DATA_FLOW_TO,
                    evidence=Evidence(
                        file=rel_path,
                        line=line_idx,
                        snippet=match.group(0),
                    ),
                    attributes={"issue_type": "swallowed_exception", "exception_type": "JavaScript Empty Catch"},
                )
            )
