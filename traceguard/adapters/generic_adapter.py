"""
Generic Multi-Language & Graceful Degradation Parser Adapter.
Provides structural extraction for Go, Java, Rust, Ruby, PHP, C#, C/C++,
and universal fallback for unsupported languages.
"""

from __future__ import annotations
import re
from typing import List, Optional

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


class GenericAdapter(BaseParserAdapter):
    """Universal structural and lexical parser with graceful degradation."""

    def can_parse(self, file_meta: FileMetadata) -> bool:
        # Accepts any code or text file not handled by specialized adapters
        return file_meta.language not in ("python", "javascript", "typescript", "yaml", "json", "toml", "env", "markdown")

    def parse(self, file_meta: FileMetadata, content: str, graph: ERCGraph) -> None:
        rel_path = file_meta.relative_path
        lang = file_meta.language
        lines = content.splitlines()

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

        if lang == "go":
            self._parse_go(file_meta, lines, graph, mod_id)
        elif lang in ("java", "csharp"):
            self._parse_java_csharp(file_meta, lines, graph, mod_id)
        elif lang == "ruby":
            self._parse_ruby(file_meta, lines, graph, mod_id)
        else:
            self._parse_universal_fallback(file_meta, lines, graph, mod_id)

    def _parse_go(self, file_meta: FileMetadata, lines: List[str], graph: ERCGraph, mod_id: str) -> None:
        rel_path = file_meta.relative_path

        # Function & Method patterns: func Foo(..) or func (s *Service) Bar(..)
        fn_pattern = re.compile(r'func\s+(?:\([^)]*\)\s+)?([A-Za-z0-9_]+)\s*\(')
        # Interface pattern: type Storage interface {
        iface_pattern = re.compile(r'type\s+([A-Za-z0-9_]+)\s+interface\s*\{')
        # Struct pattern: type User struct {
        struct_pattern = re.compile(r'type\s+([A-Za-z0-9_]+)\s+struct\s*\{')
        # Gin/Echo route pattern: r.GET("/api/...", ...), e.POST("/api/...", ...)
        route_pattern = re.compile(r'\.(GET|POST|PUT|DELETE|PATCH)\s*\(\s*["\']([^"\']+)["\']')
        # Config: os.Getenv("FOO")
        env_pattern = re.compile(r'os\.Getenv\s*\(\s*["\']([A-Za-z0-9_]+)["\']')

        for idx, line in enumerate(lines, start=1):
            # Endpoints
            m_route = route_pattern.search(line)
            if m_route:
                method = m_route.group(1).upper()
                path = m_route.group(2)
                ep_id = f"ep:{rel_path}:{method}:{path}:{idx}"
                graph.add_symbol(
                    Symbol(
                        id=ep_id,
                        name=f"{method} {path}",
                        kind=NodeType.ENDPOINT,
                        file=rel_path,
                        line=idx,
                        end_line=idx,
                        attributes={"path": path, "method": method, "framework": "go_router"},
                    )
                )

            # Interfaces
            m_iface = iface_pattern.search(line)
            if m_iface:
                name = m_iface.group(1)
                graph.add_symbol(
                    Symbol(
                        id=f"iface:{rel_path}:{name}:{idx}",
                        name=name,
                        kind=NodeType.INTERFACE,
                        file=rel_path,
                        line=idx,
                        end_line=idx,
                    )
                )

            # Structs
            m_struct = struct_pattern.search(line)
            if m_struct:
                name = m_struct.group(1)
                graph.add_symbol(
                    Symbol(
                        id=f"cls:{rel_path}:{name}:{idx}",
                        name=name,
                        kind=NodeType.CLASS,
                        file=rel_path,
                        line=idx,
                        end_line=idx,
                    )
                )

            # Functions
            m_fn = fn_pattern.search(line)
            if m_fn:
                name = m_fn.group(1)
                is_test = name.startswith("Test") or rel_path.endswith("_test.go")
                graph.add_symbol(
                    Symbol(
                        id=f"fn:{rel_path}:{name}:{idx}",
                        name=name,
                        kind=NodeType.TEST if is_test else NodeType.FUNCTION,
                        file=rel_path,
                        line=idx,
                        end_line=idx,
                    )
                )

            # Config
            m_env = env_pattern.search(line)
            if m_env:
                key = m_env.group(1)
                cfg_id = f"cfg:{rel_path}:{key}:{idx}"
                graph.add_symbol(
                    Symbol(
                        id=cfg_id,
                        name=key,
                        kind=NodeType.CONFIG,
                        file=rel_path,
                        line=idx,
                        end_line=idx,
                        attributes={"key": key, "source": "go"},
                    )
                )

    def _parse_java_csharp(
        self, file_meta: FileMetadata, lines: List[str], graph: ERCGraph, mod_id: str
    ) -> None:
        rel_path = file_meta.relative_path

        # Class / Interface
        cls_pattern = re.compile(r'(?:public|protected|private)?\s*(?:static\s+)?(?:abstract\s+)?class\s+([A-Za-z0-9_]+)(?:\s+extends\s+([A-Za-z0-9_]+))?(?:\s+implements\s+([A-Za-z0-9_,\s]+))?')
        iface_pattern = re.compile(r'(?:public|protected|private)?\s*interface\s+([A-Za-z0-9_]+)')
        # Spring Boot annotations: @GetMapping("/api/..."), @PostMapping("/api/...")
        spring_route = re.compile(r'@(Get|Post|Put|Delete|Patch|Request)Mapping\s*\(\s*(?:value\s*=\s*)?["\']([^"\']+)["\']')
        # Method: public ReturnType methodName(..)
        method_pattern = re.compile(r'(?:public|protected|private)\s+(?:static\s+)?(?:final\s+)?(?:[A-Za-z0-9_<>\[\]]+)\s+([A-Za-z0-9_]+)\s*\(')

        for idx, line in enumerate(lines, start=1):
            m_route = spring_route.search(line)
            if m_route:
                m_type = m_route.group(1).upper()
                method = "GET" if m_type == "GET" else ("POST" if m_type == "POST" else m_type)
                path = m_route.group(2)
                graph.add_symbol(
                    Symbol(
                        id=f"ep:{rel_path}:{method}:{path}:{idx}",
                        name=f"{method} {path}",
                        kind=NodeType.ENDPOINT,
                        file=rel_path,
                        line=idx,
                        end_line=idx,
                        attributes={"path": path, "method": method, "framework": "spring"},
                    )
                )

            m_cls = cls_pattern.search(line)
            if m_cls:
                name = m_cls.group(1)
                parent = m_cls.group(2)
                implements = [x.strip() for x in m_cls.group(3).split(",")] if m_cls.group(3) else []
                graph.add_symbol(
                    Symbol(
                        id=f"cls:{rel_path}:{name}:{idx}",
                        name=name,
                        kind=NodeType.CLASS,
                        file=rel_path,
                        line=idx,
                        end_line=idx,
                        attributes={"base_classes": [parent] if parent else [], "implemented_interfaces": implements},
                    )
                )

            m_iface = iface_pattern.search(line)
            if m_iface:
                name = m_iface.group(1)
                graph.add_symbol(
                    Symbol(
                        id=f"iface:{rel_path}:{name}:{idx}",
                        name=name,
                        kind=NodeType.INTERFACE,
                        file=rel_path,
                        line=idx,
                        end_line=idx,
                    )
                )

            m_mth = method_pattern.search(line)
            if m_mth:
                name = m_mth.group(1)
                graph.add_symbol(
                    Symbol(
                        id=f"fn:{rel_path}:{name}:{idx}",
                        name=name,
                        kind=NodeType.FUNCTION,
                        file=rel_path,
                        line=idx,
                        end_line=idx,
                    )
                )

    def _parse_ruby(self, file_meta: FileMetadata, lines: List[str], graph: ERCGraph, mod_id: str) -> None:
        rel_path = file_meta.relative_path
        cls_pattern = re.compile(r'class\s+([A-Za-z0-9_]+)(?:\s*<\s*([A-Za-z0-9_]+))?')
        def_pattern = re.compile(r'def\s+([A-Za-z0-9_!?]+)')
        route_pattern = re.compile(r'(?:get|post|put|delete|patch)\s+[\'"]([^\'"]+)[\'"]')

        for idx, line in enumerate(lines, start=1):
            m_cls = cls_pattern.search(line)
            if m_cls:
                graph.add_symbol(
                    Symbol(
                        id=f"cls:{rel_path}:{m_cls.group(1)}:{idx}",
                        name=m_cls.group(1),
                        kind=NodeType.CLASS,
                        file=rel_path,
                        line=idx,
                        end_line=idx,
                    )
                )
            m_def = def_pattern.search(line)
            if m_def:
                graph.add_symbol(
                    Symbol(
                        id=f"fn:{rel_path}:{m_def.group(1)}:{idx}",
                        name=m_def.group(1),
                        kind=NodeType.FUNCTION,
                        file=rel_path,
                        line=idx,
                        end_line=idx,
                    )
                )
            m_route = route_pattern.search(line)
            if m_route:
                path = m_route.group(1)
                graph.add_symbol(
                    Symbol(
                        id=f"ep:{rel_path}:ANY:{path}:{idx}",
                        name=f"ROUTE {path}",
                        kind=NodeType.ENDPOINT,
                        file=rel_path,
                        line=idx,
                        end_line=idx,
                        attributes={"path": path, "method": "ANY"},
                    )
                )

    def _parse_universal_fallback(
        self, file_meta: FileMetadata, lines: List[str], graph: ERCGraph, mod_id: str
    ) -> None:
        """Universal fallback for arbitrary files: extracts functions, classes, and URLs."""
        rel_path = file_meta.relative_path
        fn_pattern = re.compile(r'\b(?:function|def|func|fn|sub|proc)\s+([A-Za-z0-9_]+)\b')
        url_pattern = re.compile(r'["\'](/api/[a-zA-Z0-9_\-\/]+)["\']')

        for idx, line in enumerate(lines, start=1):
            m_fn = fn_pattern.search(line)
            if m_fn:
                name = m_fn.group(1)
                graph.add_symbol(
                    Symbol(
                        id=f"fn:{rel_path}:{name}:{idx}",
                        name=name,
                        kind=NodeType.FUNCTION,
                        file=rel_path,
                        line=idx,
                        end_line=idx,
                    )
                )
            m_url = url_pattern.search(line)
            if m_url:
                path = m_url.group(1)
                graph.add_symbol(
                    Symbol(
                        id=f"ep:{rel_path}:ANY:{path}:{idx}",
                        name=f"ROUTE {path}",
                        kind=NodeType.ENDPOINT,
                        file=rel_path,
                        line=idx,
                        end_line=idx,
                        attributes={"path": path, "method": "ANY"},
                    )
                )
