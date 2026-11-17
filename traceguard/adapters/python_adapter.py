"""
Python AST & Lexical Parsing Adapter.
Extracts functions, classes, routes, models, calls, sinks, configs, and relationships.
"""

from __future__ import annotations
import ast
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


class PythonAdapter(BaseParserAdapter):
    """Deep Python AST and lexical structural extractor."""

    def can_parse(self, file_meta: FileMetadata) -> bool:
        return file_meta.language == "python"

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

        try:
            tree = ast.parse(content, filename=rel_path)
        except SyntaxError:
            # Fall back to lexical fallback
            self._lexical_fallback(file_meta, content, graph)
            return

        # Check for router prefix in file
        router_prefix = ""
        m_prefix = re.search(r'(?:APIRouter|Blueprint)\s*\([^)]*prefix\s*=\s*["\']([^"\']+)["\']', content)
        if not m_prefix:
            m_prefix = re.search(r'url_prefix\s*=\s*["\']([^"\']+)["\']', content)
        if m_prefix:
            router_prefix = m_prefix.group(1).rstrip("/")

        visitor = _PythonASTVisitor(rel_path, lines, graph, mod_id, router_prefix)

        visitor.visit(tree)

    def _lexical_fallback(self, file_meta: FileMetadata, content: str, graph: ERCGraph) -> None:
        """Regex-based fallback if Python syntax error occurs (e.g. unclosed syntax in wip file)."""
        rel_path = file_meta.relative_path
        lines = content.splitlines()

        for idx, line in enumerate(lines, start=1):
            # Function definitions
            fn_match = re.match(r'^\s*def\s+([a-zA-Z0-9_]+)\s*\(', line)
            if fn_match:
                name = fn_match.group(1)
                sym_id = f"fn:{rel_path}:{name}:{idx}"
                graph.add_symbol(
                    Symbol(
                        id=sym_id,
                        name=name,
                        kind=NodeType.FUNCTION,
                        file=rel_path,
                        line=idx,
                        end_line=idx,
                    )
                )

            # Class definitions
            cls_match = re.match(r'^\s*class\s+([a-zA-Z0-9_]+)\s*(\([^)]*\))?:', line)
            if cls_match:
                name = cls_match.group(1)
                sym_id = f"cls:{rel_path}:{name}:{idx}"
                graph.add_symbol(
                    Symbol(
                        id=sym_id,
                        name=name,
                        kind=NodeType.CLASS,
                        file=rel_path,
                        line=idx,
                        end_line=idx,
                    )
                )


class _PythonASTVisitor(ast.NodeVisitor):
    def __init__(self, rel_path: str, lines: List[str], graph: ERCGraph, mod_id: str, router_prefix: str = ""):
        self.rel_path = rel_path
        self.lines = lines
        self.graph = graph
        self.mod_id = mod_id
        self.router_prefix = router_prefix
        self.current_scope_id = mod_id
        self.scope_stack: List[str] = [mod_id]


    def _get_snippet(self, start_line: int, end_line: Optional[int] = None) -> str:
        s = max(0, start_line - 1)
        e = min(len(self.lines), end_line or start_line)
        return "\n".join(self.lines[s:e])

    def visit_Import(self, node: ast.Import) -> None:
        for alias in node.names:
            target_mod = alias.name
            evidence = Evidence(
                file=self.rel_path,
                line=node.lineno,
                snippet=self._get_snippet(node.lineno),
            )
            self.graph.add_relation(
                Relation(
                    source=self.mod_id,
                    target=f"mod:{target_mod}",
                    relation=EdgeType.IMPORTS,
                    evidence=evidence,
                    attributes={"imported_name": alias.name, "as_name": alias.asname},
                )
            )
        self.generic_visit(node)

    def visit_ImportFrom(self, node: ast.ImportFrom) -> None:
        target_mod = node.module or ""
        evidence = Evidence(
            file=self.rel_path,
            line=node.lineno,
            snippet=self._get_snippet(node.lineno),
        )
        for alias in node.names:
            self.graph.add_relation(
                Relation(
                    source=self.mod_id,
                    target=f"mod:{target_mod}.{alias.name}" if target_mod else f"mod:{alias.name}",
                    relation=EdgeType.IMPORTS,
                    evidence=evidence,
                    attributes={"imported_name": alias.name, "from_module": target_mod},
                )
            )
        self.generic_visit(node)

    def visit_ClassDef(self, node: ast.ClassDef) -> None:
        cls_id = f"cls:{self.rel_path}:{node.name}:{node.lineno}"
        docstring = ast.get_docstring(node)
        base_names = []
        for b in node.bases:
            if isinstance(b, ast.Name):
                base_names.append(b.id)
            elif isinstance(b, ast.Attribute):
                base_names.append(f"{ast.unparse(b.value)}.{b.attr}")

        # Check for __tablename__ attribute
        table_name = ""
        for stmt in node.body:
            if isinstance(stmt, ast.Assign):
                for target in stmt.targets:
                    if isinstance(target, ast.Name) and target.id == "__tablename__":
                        if isinstance(stmt.value, ast.Constant) and isinstance(stmt.value.value, str):
                            table_name = stmt.value.value

        is_pydantic = "BaseModel" in base_names
        is_model = bool(table_name) or (
            not is_pydantic and any(
                b in ("Base", "Model", "DeclarativeBase", "db.Model", "models.Model")
                for b in base_names
            )
        )

        kind = NodeType.DB_MODEL if is_model else NodeType.CLASS
        if any(b in ("ABC", "Interface", "Protocol") for b in base_names):
            kind = NodeType.INTERFACE

        sym = Symbol(
            id=cls_id,
            name=node.name,
            kind=kind,
            file=self.rel_path,
            line=node.lineno,
            end_line=node.end_lineno or node.lineno,
            docstring=docstring,
            exported=not node.name.startswith("_"),
            attributes={
                "base_classes": base_names,
                "is_model": is_model,
                "table_name": table_name,
                "body_len": len(node.body),
            },
        )

        self.graph.add_symbol(sym)

        # Relation: defines
        self.graph.add_relation(
            Relation(
                source=self.current_scope_id,
                target=cls_id,
                relation=EdgeType.DEFINES,
                evidence=Evidence(
                    file=self.rel_path,
                    line=node.lineno,
                    snippet=self._get_snippet(node.lineno),
                ),
            )
        )

        # Relation: extends / implements
        for base in base_names:
            self.graph.add_relation(
                Relation(
                    source=cls_id,
                    target=f"cls:{base}",
                    relation=EdgeType.IMPLEMENTS if kind == NodeType.INTERFACE else EdgeType.EXTENDS,
                    evidence=Evidence(
                        file=self.rel_path,
                        line=node.lineno,
                        snippet=self._get_snippet(node.lineno),
                    ),
                )
            )

        self.scope_stack.append(cls_id)
        self.current_scope_id = cls_id
        self.generic_visit(node)
        self.scope_stack.pop()
        self.current_scope_id = self.scope_stack[-1]

    def visit_FunctionDef(self, node: ast.FunctionDef) -> None:
        self._handle_function(node, is_async=False)

    def visit_AsyncFunctionDef(self, node: ast.AsyncFunctionDef) -> None:
        self._handle_function(node, is_async=True)

    def _handle_function(self, node: ast.FunctionDef | ast.AsyncFunctionDef, is_async: bool) -> None:
        fn_id = f"fn:{self.rel_path}:{node.name}:{node.lineno}"
        docstring = ast.get_docstring(node)

        # Inspect decorators for routes, auth, etc.
        endpoint_info = self._extract_endpoint_info(node)
        auth_guards = self._extract_auth_guards(node)

        is_test = (
            node.name.startswith("test_")
            or self.rel_path.startswith("test")
            or "tests/" in self.rel_path
        )

        kind = NodeType.TEST if is_test else NodeType.FUNCTION
        if endpoint_info:
            kind = NodeType.ENDPOINT

        # Check for placeholder / empty implementations
        is_placeholder, placeholder_reason = self._check_placeholder_body(node)

        sym = Symbol(
            id=fn_id,
            name=node.name,
            kind=kind,
            file=self.rel_path,
            line=node.lineno,
            end_line=node.end_lineno or node.lineno,
            docstring=docstring,
            exported=not node.name.startswith("_"),
            attributes={
                "is_async": is_async,
                "is_placeholder": is_placeholder,
                "placeholder_reason": placeholder_reason,
                "auth_guards": auth_guards,
                "endpoint_info": endpoint_info,
                "args": [arg.arg for arg in node.args.args],
                "body_len": len(node.body),
            },
        )
        if endpoint_info:
            sym.attributes.update(endpoint_info)

        self.graph.add_symbol(sym)

        # Relation: defines
        self.graph.add_relation(
            Relation(
                source=self.current_scope_id,
                target=fn_id,
                relation=EdgeType.DEFINES,
                evidence=Evidence(
                    file=self.rel_path,
                    line=node.lineno,
                    snippet=self._get_snippet(node.lineno),
                ),
            )
        )

        # If it has auth guards, add guard relation
        for g in auth_guards:
            self.graph.add_relation(
                Relation(
                    source=f"guard:{g}",
                    target=fn_id,
                    relation=EdgeType.GUARDS,
                    evidence=Evidence(
                        file=self.rel_path,
                        line=node.lineno,
                        snippet=self._get_snippet(node.lineno),
                    ),
                    attributes={"guard_name": g},
                )
            )

        self.scope_stack.append(fn_id)
        self.current_scope_id = fn_id
        self.generic_visit(node)
        self.scope_stack.pop()
        self.current_scope_id = self.scope_stack[-1]

    def _extract_endpoint_info(self, node: ast.FunctionDef | ast.AsyncFunctionDef) -> Optional[Dict[str, Any]]:
        """Detect FastAPI, Flask, etc. endpoint decorators."""
        for deco in node.decorator_list:
            deco_str = ""
            try:
                deco_str = ast.unparse(deco)
            except Exception:
                continue

            # FastAPI: @app.get('/path'), @router.post('/path')
            # Flask: @app.route('/path', methods=['POST'])
            m_route = re.search(r'@?(app|router|blueprint|api)\.(get|post|put|delete|patch|options|head|route)\s*\(\s*["\']([^"\']*)["\']', deco_str, re.IGNORECASE)
            if m_route:
                target_obj = m_route.group(1).lower()
                method = m_route.group(2).upper()
                raw_path = m_route.group(3)

                # Prepend router prefix if applicable
                full_path = raw_path
                if target_obj in ("router", "blueprint", "api") and self.router_prefix:
                    if not raw_path or raw_path == "/":
                        full_path = self.router_prefix
                    elif raw_path.startswith("/"):
                        full_path = f"{self.router_prefix}{raw_path}"
                    else:
                        full_path = f"{self.router_prefix}/{raw_path}"

                if not full_path.startswith("/"):
                    full_path = "/" + full_path

                if method == "ROUTE":
                    m_methods = re.search(r'methods\s*=\s*\[(["\'][A-Z]+["\']\s*,\s*)*["\']([A-Z]+)["\']\]', deco_str)
                    method = m_methods.group(2) if m_methods else "GET"
                return {"path": full_path, "method": method, "decorator": deco_str}

        return None

    def _extract_auth_guards(self, node: ast.FunctionDef | ast.AsyncFunctionDef) -> List[str]:
        """Detect auth decorators and Depends(get_current_user)."""
        guards = []
        for deco in node.decorator_list:
            try:
                deco_str = ast.unparse(deco)
            except Exception:
                continue

            lower = deco_str.lower()
            if any(k in lower for k in ("auth", "login_required", "permission", "protect", "token_required", "jwt_required", "admin")):
                guards.append(deco_str)

        # Check FastAPI Depends in args
        for arg in node.args.args:
            # check type annotation or default
            pass
        return guards

    def _check_placeholder_body(self, node: ast.FunctionDef | ast.AsyncFunctionDef) -> Tuple[bool, str]:
        """Detect stub / placeholder implementations."""
        # Filter docstrings
        body_non_doc = [
            stmt for stmt in node.body
            if not (isinstance(stmt, ast.Expr) and isinstance(stmt.value, ast.Constant) and isinstance(stmt.value.value, str))
        ]

        if not body_non_doc:
            return True, "Empty body (only docstring or blank)"

        if len(body_non_doc) == 1:
            stmt = body_non_doc[0]
            # `pass`
            if isinstance(stmt, ast.Pass):
                return True, "Single 'pass' statement"
            # `raise NotImplementedError`
            if isinstance(stmt, ast.Raise):
                exc_name = ""
                if isinstance(stmt.exc, ast.Name):
                    exc_name = stmt.exc.id
                elif isinstance(stmt.exc, ast.Call) and isinstance(stmt.exc.func, ast.Name):
                    exc_name = stmt.exc.func.id
                if exc_name in ("NotImplementedError", "NotImplemented"):
                    return True, f"Raises {exc_name}"
            # `return None`, `return {}`, `return []`, `return "mock"`
            if isinstance(stmt, ast.Return):
                if stmt.value is None:
                    return True, "Returns None"
                if isinstance(stmt.value, ast.Constant) and stmt.value.value in (None, "", "mock", "stub", "todo"):
                    return True, f"Returns dummy constant '{stmt.value.value}'"
                if isinstance(stmt.value, ast.Dict) and not stmt.value.keys:
                    return True, "Returns empty dict"
                if isinstance(stmt.value, ast.List) and not stmt.value.elts:
                    return True, "Returns empty list"
                # Check dict with "mock" or "status": "ok"
                try:
                    raw_return = ast.unparse(stmt.value)
                    if "mock" in raw_return.lower() or "placeholder" in raw_return.lower():
                        return True, f"Returns mock data: {raw_return}"
                except Exception:
                    pass

        return False, ""

    def visit_Call(self, node: ast.Call) -> None:
        call_name = ""
        try:
            call_name = ast.unparse(node.func)
        except Exception:
            pass

        if call_name:
            evidence = Evidence(
                file=self.rel_path,
                line=node.lineno,
                snippet=self._get_snippet(node.lineno),
            )

            # Check if calling a config
            if (
                call_name in ("os.getenv", "os.environ.get")
                or call_name.startswith("os.environ")
            ):
                config_key = None
                if node.args and isinstance(node.args[0], ast.Constant) and isinstance(node.args[0].value, str):
                    config_key = node.args[0].value
                if config_key:
                    cfg_id = f"cfg:{self.rel_path}:{config_key}:{node.lineno}"
                    self.graph.add_symbol(
                        Symbol(
                            id=cfg_id,
                            name=config_key,
                            kind=NodeType.CONFIG,
                            file=self.rel_path,
                            line=node.lineno,
                            end_line=node.lineno,
                            attributes={"key": config_key, "source": "python"},
                        )
                    )

                    self.graph.add_relation(
                        Relation(
                            source=self.current_scope_id,
                            target=cfg_id,
                            relation=EdgeType.USES_CONFIG,
                            evidence=evidence,
                        )
                    )

            # Check if security sensitive sink
            sinks = {
                "eval": "Code Execution (eval)",
                "exec": "Code Execution (exec)",
                "os.system": "Command Injection (os.system)",
                "subprocess.Popen": "Command Execution (subprocess)",
                "subprocess.run": "Command Execution (subprocess)",
                "pickle.loads": "Insecure Deserialization (pickle)",
                "yaml.load": "Unsafe Deserialization (yaml.load)",
                "cursor.execute": "SQL Execution",
                "session.execute": "SQL Execution",
                "db.execute": "SQL Execution",
            }
            for sink_call, desc in sinks.items():
                if sink_call in call_name:
                    sink_id = f"sink:{self.rel_path}:{sink_call}:{node.lineno}"
                    self.graph.add_symbol(
                        Symbol(
                            id=sink_id,
                            name=sink_call,
                            kind=NodeType.SINK,
                            file=self.rel_path,
                            line=node.lineno,
                            end_line=node.lineno,
                            attributes={"description": desc, "call": call_name},
                        )
                    )
                    self.graph.add_relation(
                        Relation(
                            source=self.current_scope_id,
                            target=sink_id,
                            relation=EdgeType.DATA_FLOW_TO,
                            evidence=evidence,
                        )
                    )

            # General function call relation
            self.graph.add_relation(
                Relation(
                    source=self.current_scope_id,
                    target=f"fn:{call_name}",
                    relation=EdgeType.CALLS,
                    evidence=evidence,
                    attributes={"called_name": call_name},
                )
            )

        self.generic_visit(node)

    def visit_Try(self, node: ast.Try) -> None:
        # Check for exception suppression
        for handler in node.handlers:
            exc_type = ""
            if handler.type:
                try:
                    exc_type = ast.unparse(handler.type)
                except Exception:
                    exc_type = "unknown"
            else:
                exc_type = "BareExcept"

            body_non_doc = [
                s for s in handler.body
                if not (isinstance(s, ast.Expr) and isinstance(s.value, ast.Constant))
            ]
            if len(body_non_doc) == 1 and isinstance(body_non_doc[0], ast.Pass):
                # Swallowed exception
                self.graph.add_relation(
                    Relation(
                        source=self.current_scope_id,
                        target=f"mod:{self.rel_path}",
                        relation=EdgeType.DATA_FLOW_TO,
                        evidence=Evidence(
                            file=self.rel_path,
                            line=handler.lineno,
                            snippet=self._get_snippet(handler.lineno),
                        ),
                        attributes={
                            "issue_type": "swallowed_exception",
                            "exception_type": exc_type,
                        },
                    )
                )

        self.generic_visit(node)
