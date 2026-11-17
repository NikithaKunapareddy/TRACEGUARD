"""
Evidence-Linked Repository Consistency Graph (ERCG)
Core Graph Representation of Repository Relationships, Evidence Links, and Consistency Queries.
"""

from __future__ import annotations
import re
from typing import Dict, List, Optional, Set, Tuple, Any
import networkx as nx

from .models import (
    NodeType,
    EdgeType,
    Symbol,
    Relation,
    Evidence,
)


class ERCGraph:
    """
    Evidence-Linked Repository Consistency Graph.
    Enables multi-file consistency checks, negative-space relationship detection,
    and source-to-sink reachability analysis across heterogeneous architectures.
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

    def add_relation(self, relation: Relation) -> None:
        """Add an evidence-linked edge between two symbols."""
        # Ensure source and target nodes exist in graph
        if relation.source not in self._graph:
            self._graph.add_node(relation.source)
        if relation.target not in self._graph:
            self._graph.add_node(relation.target)

        self._graph.add_edge(
            relation.source,
            relation.target,
            key=relation.relation.value,
            relation=relation,
            evidence=relation.evidence,
            attributes=relation.attributes,
        )

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
        # Direct test relation
        for rel in self.get_incoming_relations(symbol_id, EdgeType.TESTS):
            return True

        # Check if caller in tests
        symbol = self.get_symbol(symbol_id)
        if not symbol:
            return False

        # If any caller has 'test' in its file or name
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

    def find_routes_matching_path(self, target_path: str, method: Optional[str] = None) -> List[Symbol]:
        """
        Match an API path (e.g. from frontend fetch) against backend route declarations.
        Handles parameter normalizations: /users/:id, /users/{id}, /users/<id>, /users/[id].
        """
        normalized_target = self._normalize_route(target_path)
        method_norm = method.upper() if method else None

        matches = []
        for ep in self._endpoints:
            ep_path = ep.attributes.get("path", ep.name)
            ep_method = ep.attributes.get("method", "ANY").upper()

            # Method check
            if method_norm and ep_method != "ANY" and ep_method != method_norm:
                continue

            normalized_ep = self._normalize_route(ep_path)
            if self._routes_match(normalized_target, normalized_ep):
                matches.append(ep)

        return matches

    @staticmethod
    def _normalize_route(route: str) -> str:
        """Normalize URL path parameters to a standard {param} placeholder."""
        # Strip query strings, hashes, and trailing slashes
        clean = route.split("?")[0].split("#")[0].strip().rstrip("/")
        if not clean.startswith("/"):
            clean = "/" + clean
        # Replace :param, <param>, [param], {param} with {*}
        clean = re.sub(r':[a-zA-Z0-9_]+', '{*}', clean)
        clean = re.sub(r'<[^>]+>', '{*}', clean)
        clean = re.sub(r'\[[^\]]+\]', '{*}', clean)
        clean = re.sub(r'\{[^\}]+\}', '{*}', clean)
        return clean

    @classmethod
    def _routes_match(cls, target: str, pattern: str) -> bool:
        """Check if normalized route matches pattern, including wildcards."""
        if target == pattern:
            return True
        # Check wildcard pattern
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

    def has_concrete_implementation(self, interface_name: str) -> bool:
        """Check whether an interface has at least one class that implements or extends it."""
        clean_iface = interface_name.replace("Provider", "").replace("Interface", "").replace("Service", "")
        for sym in self.get_symbols_by_kind(NodeType.CLASS):
            parents = sym.attributes.get("base_classes", [])
            implemented = sym.attributes.get("implemented_interfaces", [])
            if interface_name in parents or interface_name in implemented:
                return True
            # Semantic matching for structural languages (e.g. Go, Rust) where struct PrometheusMetrics satisfies MetricsProvider
            if clean_iface and clean_iface in sym.name and sym.name != interface_name:
                return True
        return False


    def get_stats(self) -> Dict[str, int]:
        return {
            "total_nodes": self._graph.number_of_nodes(),
            "total_edges": self._graph.number_of_edges(),
            "endpoints": len(self._endpoints),
            "api_calls": len(self._api_calls),
            "db_models": len(self._models),
            "interfaces": len(self._interfaces),
            "config_keys": len(self._configs),
        }
