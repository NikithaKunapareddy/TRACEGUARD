import pytest
from traceguard.core.graph import ERCGraph
from traceguard.core.models import Symbol, Relation, Evidence, NodeType, EdgeType


def test_erc_graph_indexing():
    g = ERCGraph()
    sym = Symbol(
        id="fn:test:foo:10",
        name="foo",
        kind=NodeType.FUNCTION,
        file="test.py",
        line=10,
        end_line=15,
    )
    g.add_symbol(sym)

    assert g.node_count == 1
    assert g.get_symbol("fn:test:foo:10") == sym
    assert g.get_symbols_by_name("foo") == [sym]
    assert g.get_symbols_by_kind(NodeType.FUNCTION) == [sym]
    assert g.get_symbols_in_file("test.py") == [sym]


def test_route_normalization_and_matching():
    g = ERCGraph()
    ep1 = Symbol(
        id="ep:1",
        name="GET /users/{id}",
        kind=NodeType.ENDPOINT,
        file="routes.py",
        line=5,
        end_line=10,
        attributes={"path": "/users/{id}", "method": "GET"},
    )
    g.add_symbol(ep1)

    # Exact match
    assert len(g.find_routes_matching_path("/users/{id}", "GET")) == 1

    # Parameterized variations (:id, 123)
    assert len(g.find_routes_matching_path("/users/123", "GET")) == 1
    assert len(g.find_routes_matching_path("/users/:id", "GET")) == 1
    assert len(g.find_routes_matching_path("/users/<user_id>", "GET")) == 1

    # Method mismatch
    assert len(g.find_routes_matching_path("/users/123", "POST")) == 0


def test_graph_reachability_and_callers():
    g = ERCGraph()
    s1 = Symbol(id="fn:a", name="a", kind=NodeType.FUNCTION, file="a.py", line=1, end_line=5)
    s2 = Symbol(id="fn:b", name="b", kind=NodeType.FUNCTION, file="b.py", line=1, end_line=5)
    s3 = Symbol(id="fn:c", name="c", kind=NodeType.FUNCTION, file="c.py", line=1, end_line=5)

    g.add_symbol(s1)
    g.add_symbol(s2)
    g.add_symbol(s3)

    ev = Evidence(file="a.py", line=2, snippet="b()")
    g.add_relation(Relation(source=s1.id, target=s2.id, relation=EdgeType.CALLS, evidence=ev))
    g.add_relation(Relation(source=s2.id, target=s3.id, relation=EdgeType.CALLS, evidence=ev))

    assert g.is_reachable(s1.id, s3.id) is True
    assert g.is_reachable(s3.id, s1.id) is False
    assert g.get_callees(s1.id) == [s2]
    assert g.get_callers(s2.id) == [s1]
