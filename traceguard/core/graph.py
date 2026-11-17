"""
Evidence-Linked Repository Consistency Graph (ERCG)
Core Graph Representation of Repository Relationships, Evidence Links,
Method-Set Implicit Interface Analysis, and Consistency Queries.
"""

from __future__ import annotations
import re
from typing import Dict, List, Optional, Set, Tuple, Any
import networkx as nx

from .models import (
    NodeType,
    EdgeType,
    EdgeResolution,
    Symbol,
    Relation,
    Evidence,
    GraphCoverageMetrics,
)


class ERCGraph:
    """
    Evidence-Linked Repository Consistency Graph.
    Enables multi-file consistency checks, negative-space relationship detection,
    source-to-sink reachability analysis, and Go implicit method-set satisfaction.
    """

    def __init__(self):
        self._graph = nx.MultiDiGraph()
        self._symbols: Dict[str, Symbol] = {}
        self._name_index: Dict[str, List[str]] = {}
        self._kind_index: Dict[NodeType, List[str]] = {k: [] for k in NodeType}
        self._file_index: Dict[str, List[str]] = {}
        self._endpoints: List[Symbol] = []
        self._api_calls: List[Symbol] = []
        self._configs: Dict[str, List[Symbol]] = {}  # key -> symbols
        self._models: Dict[str, Symbol] = {}
        self._migrations: Dict[str, Symbol] = {}
        self._interfaces: Dict[str, Symbol] = {}
        self._relations: List[Relation] = []

        # Method-Set Analysis Registry for Go and Implicit Object Models
        # interface_name -> set of required method names
        self._interface_method_sets: Dict[str, Set[str]] = {}
        # interface_name -> dict of method_name -> signature string
        self._interface_method_signatures: Dict[str, Dict[str, str]] = {}
        # type_name -> set of methods defined with value receiver
        self._type_value_methods: Dict[str, Set[str]] = {}
        # type_name -> set of methods defined with pointer receiver
        self._type_pointer_methods: Dict[str, Set[str]] = {}
        # type_name -> file path where struct was defined
        self._type_definitions: Dict[str, str] = {}

    @property
    def node_count(self) -> int:
        return self._graph.number_of_nodes()

    @property
    def edge_count(self) -> int:
        return self._graph.number_of_edges()

    def add_symbol(self, symbol: Symbol) -> None:
        """Add a symbol node into the consistency graph with indexing."""
        self._symbols[symbol.id] = symbol
        self._graph.add_node(
            symbol.id,
            symbol=symbol,
            kind=symbol.kind.value,
            name=symbol.name,
            file=symbol.file,
        )

        # Index by name
        self._name_index.setdefault(symbol.name, []).append(symbol.id)

        # Index by kind
        self._kind_index.setdefault(symbol.kind, []).append(symbol.id)

        # Index by file
        self._file_index.setdefault(symbol.file, []).append(symbol.id)

        # Specialized indices
        if symbol.kind == NodeType.ENDPOINT:
            self._endpoints.append(symbol)
        elif symbol.kind == NodeType.API_CALL:
            self._api_calls.append(symbol)
        elif symbol.kind == NodeType.CONFIG:
            key = symbol.attributes.get("key", symbol.name)
            self._configs.setdefault(key, []).append(symbol)
        elif symbol.kind == NodeType.DB_MODEL:
            self._models[symbol.name] = symbol
        elif symbol.kind == NodeType.DB_MIGRATION:
            self._migrations[symbol.name] = symbol
        elif symbol.kind == NodeType.INTERFACE:
            self._interfaces[symbol.name] = symbol
            methods = symbol.attributes.get("methods", [])
            if methods:
                self.register_interface_methods(symbol.name, methods, symbol.attributes.get("signatures"))
        elif symbol.kind == NodeType.CLASS:
            self._type_definitions[symbol.name] = symbol.file
            # If attributes contain methods, register them
            val_m = symbol.attributes.get("value_methods", [])
            ptr_m = symbol.attributes.get("pointer_methods", [])
            for m in val_m:
                self.register_type_method(symbol.name, m, receiver_type="value")
            for m in ptr_m:
                self.register_type_method(symbol.name, m, receiver_type="pointer")

    def add_relation(self, relation: Relation) -> None:
        """Add an evidence-linked edge between two symbols."""
        if relation.source not in self._graph:
            self._graph.add_node(relation.source)
        if relation.target not in self._graph:
            self._graph.add_node(relation.target)

        self._relations.append(relation)
        self._graph.add_edge(
            relation.source,
            relation.target,
            key=relation.relation.value,
            relation=relation,
            evidence=relation.evidence,
            resolution=relation.resolution.value,
            confidence=relation.confidence,
            attributes=relation.attributes,
        )

    # -------------------------------------------------------------------------
    # Go Method-Set Analysis Registry & Verification
    # -------------------------------------------------------------------------

    def register_interface_methods(
        self,
        interface_name: str,
        methods: List[str] | Set[str],
        signatures: Optional[Dict[str, str]] = None,
    ) -> None:
        """Register required methods for an interface (Go or universal contract)."""
        self._interface_method_sets.setdefault(interface_name, set()).update(methods)
        if signatures:
            self._interface_method_signatures.setdefault(interface_name, {}).update(signatures)

    def register_type_method(
        self,
        type_name: str,
        method_name: str,
        receiver_type: str = "value",  # "value" or "pointer"
        signature: Optional[str] = None,
    ) -> None:
        """Register a method implemented on a concrete struct/class."""
        clean_type = type_name.lstrip("*")
        if receiver_type == "pointer":
            self._type_pointer_methods.setdefault(clean_type, set()).add(method_name)
        else:
            self._type_value_methods.setdefault(clean_type, set()).add(method_name)

    def check_interface_satisfaction(self, interface_name: str) -> Dict[str, Any]:
        """
        Evaluate Go implicit method-set interface satisfaction:
        - Value receiver methods satisfy both T and *T.
        - Pointer receiver methods satisfy *T only.
        - A concrete type T satisfies I iff InterfaceMethods(I) <= ValueMethods(T).
        - A pointer type *T satisfies I iff InterfaceMethods(I) <= (ValueMethods(T) U PointerMethods(T)).
        """
        required_methods = self._interface_method_sets.get(interface_name, set())

        # If interface is completely empty (e.g. any / interface{}), any type satisfies
        if not required_methods:
            return {
                "interface": interface_name,
                "required_methods": [],
                "satisfied": True,
                "implementors": ["any"],
                "pointer_implementors": [],
                "partial_implementors": {},
                "missing_methods_by_type": {},
                "status": "fully_satisfied",
            }

        value_implementors: List[str] = []
        pointer_implementors: List[str] = []
        partial_implementors: Dict[str, List[str]] = {}

        # Scan all registered concrete types
        all_types = set(self._type_definitions.keys()) | set(self._type_value_methods.keys()) | set(self._type_pointer_methods.keys())

        for c_type in all_types:
            val_methods = self._type_value_methods.get(c_type, set())
            ptr_methods = self._type_pointer_methods.get(c_type, set())
            all_type_methods = val_methods | ptr_methods

            # Check value satisfaction: required <= val_methods
            is_val_satisfied = required_methods.issubset(val_methods)
            # Check pointer satisfaction: required <= (val_methods U ptr_methods)
            is_ptr_satisfied = required_methods.issubset(all_type_methods)

            if is_val_satisfied:
                value_implementors.append(c_type)
            elif is_ptr_satisfied:
                pointer_implementors.append(c_type)
            else:
                # Check if it has ANY overlapping methods
                intersection = required_methods.intersection(all_type_methods)
                if intersection:
                    missing = sorted(list(required_methods - all_type_methods))
                    partial_implementors[c_type] = missing

        satisfied = bool(value_implementors or pointer_implementors)
        status = "fully_satisfied" if satisfied else ("partial" if partial_implementors else "unsatisfied")

        missing_by_type: Dict[str, List[str]] = {}
        for t, missing in partial_implementors.items():
            missing_by_type[t] = missing

        return {
            "interface": interface_name,
            "required_methods": sorted(list(required_methods)),
            "satisfied": satisfied,
            "implementors": sorted(value_implementors),
            "pointer_implementors": sorted(pointer_implementors),
            "partial_implementors": partial_implementors,
            "missing_methods_by_type": missing_by_type,
            "status": status,
        }

    def has_concrete_implementation(self, interface_name: str) -> bool:
        """
        Check whether an interface has at least one class/struct that implements it:
        1. Checks explicit class inheritance / implements declarations.
        2. Evaluates Go implicit method-set satisfaction.
        """
        # 1. Explicit inheritance (Python, TS, Java)
        for sym in self.get_symbols_by_kind(NodeType.CLASS):
            parents = sym.attributes.get("base_classes", [])
            implemented = sym.attributes.get("implemented_interfaces", [])
            if interface_name in parents or interface_name in implemented:
                return True

        # 2. Go Implicit method-set evaluation
        sat_result = self.check_interface_satisfaction(interface_name)
        if sat_result["satisfied"]:
            return True

        return False

    # -------------------------------------------------------------------------
    # Symbol & Relation Query APIs
    # -------------------------------------------------------------------------

    def get_symbol(self, symbol_id: str) -> Optional[Symbol]:
        return self._symbols.get(symbol_id)

    def get_symbols_by_kind(self, kind: NodeType) -> List[Symbol]:
        node_ids = self._kind_index.get(kind, [])
        return [self._symbols[nid] for nid in node_ids if nid in self._symbols]

    def get_symbols_by_name(self, name: str) -> List[Symbol]:
        node_ids = self._name_index.get(name, [])
        return [self._symbols[nid] for nid in node_ids if nid in self._symbols]

    def get_symbols_in_file(self, file_path: str) -> List[Symbol]:
        node_ids = self._file_index.get(file_path, [])
        return [self._symbols[nid] for nid in node_ids if nid in self._symbols]

    def get_callers(self, symbol_id: str) -> List[Symbol]:
        """Find all symbols that call this symbol."""
        if symbol_id not in self._graph:
            return []
        callers = []
        for src, _, edge_data in self._graph.in_edges(symbol_id, data=True):
            if edge_data.get("relation") and edge_data["relation"].relation == EdgeType.CALLS:
                if src in self._symbols:
                    callers.append(self._symbols[src])
        return callers

    def get_callees(self, symbol_id: str) -> List[Symbol]:
        """Find all symbols called by this symbol."""
        if symbol_id not in self._graph:
            return []
        callees = []
        for _, dst, edge_data in self._graph.out_edges(symbol_id, data=True):
            if edge_data.get("relation") and edge_data["relation"].relation == EdgeType.CALLS:
                if dst in self._symbols:
                    callees.append(self._symbols[dst])
        return callees

    def get_outgoing_relations(self, symbol_id: str, edge_type: Optional[EdgeType] = None) -> List[Relation]:
        if symbol_id not in self._graph:
            return []
        relations = []
        for _, _, edge_data in self._graph.out_edges(symbol_id, data=True):
            rel = edge_data.get("relation")
            if rel:
                if edge_type is None or rel.relation == edge_type:
                    relations.append(rel)
        return relations

    def get_incoming_relations(self, symbol_id: str, edge_type: Optional[EdgeType] = None) -> List[Relation]:
        if symbol_id not in self._graph:
            return []
        relations = []
        for _, _, edge_data in self._graph.in_edges(symbol_id, data=True):
            rel = edge_data.get("relation")
            if rel:
                if edge_type is None or rel.relation == edge_type:
                    relations.append(rel)
        return relations

    def has_test_coverage(self, symbol_id: str) -> bool:
        """Check if any test node has a TESTS relation to this symbol or its file."""
        if symbol_id not in self._graph:
            return False
        for rel in self.get_incoming_relations(symbol_id, EdgeType.TESTS):
            return True

        symbol = self.get_symbol(symbol_id)
        if not symbol:
            return False

        for caller in self.get_callers(symbol_id):
            if "test" in caller.file.lower() or caller.name.lower().startswith("test"):
                return True

        return False

    def is_reachable(self, source_id: str, target_id: str) -> bool:
        """Check if there is a directed path between two nodes in the graph."""
        if source_id not in self._graph or target_id not in self._graph:
            return False
        try:
            return nx.has_path(self._graph, source_id, target_id)
        except Exception:
            return False

    def get_source_to_sink_trace(self, source_id: str, sink_id: str) -> List[Dict[str, Any]]:
        """Compute the shortest path from source to sink with file and line provenance."""
        if source_id not in self._graph or sink_id not in self._graph:
            return []
        try:
            path = nx.shortest_path(self._graph, source_id, sink_id)
            trace = []
            for step_idx, node_id in enumerate(path, start=1):
                sym = self.get_symbol(node_id)
                trace.append({
                    "step": step_idx,
                    "node_id": node_id,
                    "name": sym.name if sym else node_id,
                    "file": sym.file if sym else "",
                    "line": sym.line if sym else 0,
                    "kind": sym.kind.value if sym else "unknown",
                })
            return trace
        except Exception:
            return []

    def find_routes_matching_path(self, target_path: str, method: Optional[str] = None) -> List[Symbol]:
        """Match an API path against backend route declarations with parameter normalization."""
        normalized_target = self._normalize_route(target_path)
        method_norm = method.upper() if method else None

        matches = []
        for ep in self._endpoints:
            ep_path = ep.attributes.get("path", ep.name)
            ep_method = ep.attributes.get("method", "ANY").upper()

            if method_norm and ep_method != "ANY" and ep_method != method_norm:
                continue

            normalized_ep = self._normalize_route(ep_path)
            if self._routes_match(normalized_target, normalized_ep):
                matches.append(ep)

        return matches

    @staticmethod
    def _normalize_route(route: str) -> str:
        """Normalize URL path parameters to standard standard {*} placeholder."""
        clean = route.split("?")[0].split("#")[0].strip().rstrip("/")
        if not clean.startswith("/"):
            clean = "/" + clean
        clean = re.sub(r':[a-zA-Z0-9_]+', '{*}', clean)
        clean = re.sub(r'<[^>]+>', '{*}', clean)
        clean = re.sub(r'\[[^\]]+\]', '{*}', clean)
        clean = re.sub(r'\{[^\}]+\}', '{*}', clean)
        return clean

    @classmethod
    def _routes_match(cls, target: str, pattern: str) -> bool:
        if target == pattern:
            return True
        regex_pattern = "^" + pattern.replace("{*}", "[^/]+") + "$"
        try:
            if re.match(regex_pattern, target):
                return True
        except re.error:
            pass
        return False

    def get_all_endpoints(self) -> List[Symbol]:
        return list(self._endpoints)

    def get_all_api_calls(self) -> List[Symbol]:
        return list(self._api_calls)

    def get_all_models(self) -> Dict[str, Symbol]:
        return dict(self._models)

    def get_all_migrations(self) -> Dict[str, Symbol]:
        return dict(self._migrations)

    def get_all_interfaces(self) -> Dict[str, Symbol]:
        return dict(self._interfaces)

    def get_all_configs(self) -> Dict[str, List[Symbol]]:
        return dict(self._configs)

    def get_coverage_metrics(self) -> GraphCoverageMetrics:
        """Compute structural relationship extraction coverage across the graph."""
        total = len(self._relations)
        resolved = sum(1 for r in self._relations if r.resolution == EdgeResolution.CONFIRMED)
        inferred = sum(1 for r in self._relations if r.resolution == EdgeResolution.INFERRED)
        unresolved = sum(1 for r in self._relations if r.resolution == EdgeResolution.UNRESOLVED)

        rate = (resolved + inferred * 0.5) / max(1, total)

        return GraphCoverageMetrics(
            total_relations=total,
            resolved_relations=resolved,
            inferred_relations=inferred,
            unresolved_relations=unresolved,
            resolution_rate=round(rate, 3),
            language_support={
                "python": "deep_ast",
                "typescript": "ast_lexical",
                "javascript": "ast_lexical",
                "go": "tree_sitter_method_set",
                "generic": "lexical_fallback",
            },
        )

    def get_stats(self) -> Dict[str, int]:
        return {
            "total_nodes": self._graph.number_of_nodes(),
            "total_edges": self._graph.number_of_edges(),
            "endpoints": len(self._endpoints),
            "api_calls": len(self._api_calls),
            "db_models": len(self._models),
            "interfaces": len(self._interfaces),
            "config_keys": len(self._configs),
            "relations": len(self._relations),
        }
