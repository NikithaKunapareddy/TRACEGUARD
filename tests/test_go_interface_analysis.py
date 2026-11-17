"""
Tests for Go implicit interface satisfaction analysis.
Covers: valid implicit implementation, missing methods,
pointer vs value receivers, multiple implementors, no implementation.
"""
import pytest
from traceguard.core.graph import ERCGraph
from traceguard.core.models import NodeType, Symbol, FileRole


def _graph():
    return ERCGraph()


def _sym(name: str, kind: NodeType, file: str = "test.go", line: int = 1) -> Symbol:
    return Symbol(id=f"{kind.value}:{file}:{name}:{line}", name=name, kind=kind,
                  file=file, line=line, end_line=line)


# ---------------------------------------------------------------------------
# 1. Valid implicit implementation — pointer receiver
# ---------------------------------------------------------------------------

def test_valid_implicit_implementation_pointer():
    """PrometheusMetrics fully implements MetricsProvider via pointer receiver."""
    g = _graph()
    g.register_interface_methods("MetricsProvider", ["RecordMetric", "GetMetrics"])
    g.register_type_method("PrometheusMetrics", "RecordMetric", "pointer")
    g.register_type_method("PrometheusMetrics", "GetMetrics",   "pointer")

    result = g.check_interface_satisfaction("MetricsProvider")
    assert result["status"] == "fully_satisfied"
    assert "PrometheusMetrics" in result["pointer_implementors"]
    assert g.has_concrete_implementation("MetricsProvider")


def test_valid_implicit_implementation_value():
    """FileWriter fully implements Writer via value receiver."""
    g = _graph()
    g.register_interface_methods("Writer", ["Write"])
    g.register_type_method("FileWriter", "Write", "value")

    result = g.check_interface_satisfaction("Writer")
    assert result["status"] == "fully_satisfied"
    assert "FileWriter" in result["implementors"]   # value implementors list


# ---------------------------------------------------------------------------
# 2. Missing interface methods → unsatisfied
# ---------------------------------------------------------------------------

def test_missing_interface_methods():
    """StorageBackend with no implementors → unsatisfied."""
    g = _graph()
    g.register_interface_methods("StorageBackend", ["Upload", "Download"])

    result = g.check_interface_satisfaction("StorageBackend")
    assert result["status"] == "unsatisfied"
    assert result["implementors"] == []
    assert result["pointer_implementors"] == []
    assert not g.has_concrete_implementation("StorageBackend")


def test_partial_implementation_not_sufficient():
    """Type with only Upload but not Download → partial, not satisfied."""
    g = _graph()
    g.register_interface_methods("Storage", ["Upload", "Download"])
    g.register_type_method("PartialStore", "Upload", "value")

    result = g.check_interface_satisfaction("Storage")
    assert result["status"] in ("partial", "unsatisfied")
    assert "PartialStore" not in result["implementors"]
    assert "PartialStore" not in result["pointer_implementors"]


# ---------------------------------------------------------------------------
# 3. Pointer vs value receivers
# ---------------------------------------------------------------------------

def test_value_receiver_satisfies_value_and_pointer():
    """
    A value receiver method is in BOTH value-method set and pointer-method set.
    So *T also satisfies the interface if only value methods are required.
    """
    g = _graph()
    g.register_interface_methods("Stringer", ["String"])
    g.register_type_method("MyType", "String", "value")

    result = g.check_interface_satisfaction("Stringer")
    assert result["status"] == "fully_satisfied"
    # MyType should appear in value implementors (value receiver covers value calls)
    assert "MyType" in result["implementors"]


def test_pointer_receiver_does_not_satisfy_value_interface():
    """
    A pointer-receiver method does NOT satisfy a value-type interface requirement
    (only *T satisfies, not T).
    The type should appear in pointer_implementors only, not plain implementors.
    """
    g = _graph()
    g.register_interface_methods("Closer", ["Close"])
    g.register_type_method("NetConn", "Close", "pointer")

    result = g.check_interface_satisfaction("Closer")
    assert result["status"] == "fully_satisfied"
    # pointer receiver → pointer_implementors only
    assert "NetConn" in result["pointer_implementors"]
    assert "NetConn" not in result["implementors"]


# ---------------------------------------------------------------------------
# 4. Multiple possible implementations
# ---------------------------------------------------------------------------

def test_multiple_implementations():
    """Two types both satisfy the same interface."""
    g = _graph()
    g.register_interface_methods("Logger", ["Log", "Warn"])
    g.register_type_method("FileLogger", "Log",  "value")
    g.register_type_method("FileLogger", "Warn", "value")
    g.register_type_method("SysLogger",  "Log",  "pointer")
    g.register_type_method("SysLogger",  "Warn", "pointer")

    result = g.check_interface_satisfaction("Logger")
    assert result["status"] == "fully_satisfied"
    all_impl = result["implementors"] + result["pointer_implementors"]
    assert "FileLogger" in all_impl
    assert "SysLogger"  in all_impl


# ---------------------------------------------------------------------------
# 5. Interface with no discoverable implementation
# ---------------------------------------------------------------------------

def test_interface_no_implementation():
    """Interface with required methods but zero registered types → unsatisfied."""
    g = _graph()
    g.register_interface_methods("Repository", ["Find", "Save", "Delete"])
    # No type methods registered at all

    result = g.check_interface_satisfaction("Repository")
    assert result["status"] in ("unsatisfied", "unknown")
    assert len(result["implementors"]) == 0


# ---------------------------------------------------------------------------
# 6. Empty interface (Go any / interface{}) → trivially satisfied
# ---------------------------------------------------------------------------

def test_empty_interface_trivially_satisfied():
    """An interface with no required methods is satisfied by any type."""
    g = _graph()
    g.register_interface_methods("Empty", [])  # empty

    result = g.check_interface_satisfaction("Empty")
    assert result["status"] == "fully_satisfied"


# ---------------------------------------------------------------------------
# 7. End-to-end: adapter extracts method sets from actual Go source
# ---------------------------------------------------------------------------

def test_go_adapter_extracts_method_sets():
    """GenericAdapter must correctly extract interface methods and type methods."""
    from traceguard.adapters.generic_adapter import GenericAdapter, _HAS_TS_GO
    from traceguard.core.models import FileMetadata, FileRole

    if not _HAS_TS_GO:
        pytest.skip("tree-sitter-go not installed")

    code = """package storage

type StorageBackend interface {
    Upload(key string, data []byte) error
    Download(key string) ([]byte, error)
}

type MetricsProvider interface {
    RecordMetric(name string, value float64)
}

type PrometheusMetrics struct {
    endpoint string
}

func (p *PrometheusMetrics) RecordMetric(name string, value float64) {
    // implemented
}
"""
    g = _graph()
    adapter = GenericAdapter()
    meta = FileMetadata(path="service/storage/storage.go",
                        relative_path="service/storage/storage.go",
                        language="go", role=FileRole.BACKEND,
                        size_bytes=len(code), lines_of_code=len(code.splitlines()))
    adapter.parse(meta, code, g)

    # StorageBackend: 2 methods, no implementation
    sb = g.check_interface_satisfaction("StorageBackend")
    assert sb["status"] == "unsatisfied"

    # MetricsProvider: 1 method, PrometheusMetrics implements via pointer
    mp = g.check_interface_satisfaction("MetricsProvider")
    assert mp["status"] == "fully_satisfied"
    assert "PrometheusMetrics" in mp["pointer_implementors"]
