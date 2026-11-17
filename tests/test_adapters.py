import pytest
from traceguard.core.graph import ERCGraph
from traceguard.core.models import FileMetadata, FileRole, NodeType
from traceguard.adapters import PythonAdapter, JavaScriptAdapter, ConfigAdapter, DocAdapter


def test_python_adapter_ast_extraction():
    code = """
import os
from fastapi import APIRouter

router = APIRouter(prefix="/api/v1")

@router.get("/items/{item_id}")
def read_item(item_id: int):
    val = os.getenv("SECRET_FLAG")
    return {"id": item_id}
"""
    meta = FileMetadata(
        path="server.py",
        relative_path="server.py",
        language="python",
        role=FileRole.BACKEND,
        size_bytes=len(code),
        lines_of_code=len(code.splitlines()),
    )
    g = ERCGraph()
    adapter = PythonAdapter()
    adapter.parse(meta, code, g)

    endpoints = g.get_all_endpoints()
    assert len(endpoints) == 1
    assert endpoints[0].attributes["path"] == "/api/v1/items/{item_id}"
    assert endpoints[0].attributes["method"] == "GET"

    configs = g.get_symbols_by_kind(NodeType.CONFIG)
    assert any(c.name == "SECRET_FLAG" for c in configs)


def test_javascript_adapter_extraction():
    js_code = """
export async function getReport() {
    const res = await fetch('/api/reports/annual', { method: 'GET' });
    return res.json();
}
"""
    meta = FileMetadata(
        path="client.js",
        relative_path="client.js",
        language="javascript",
        role=FileRole.FRONTEND,
        size_bytes=len(js_code),
        lines_of_code=len(js_code.splitlines()),
    )
    g = ERCGraph()
    adapter = JavaScriptAdapter()
    adapter.parse(meta, js_code, g)

    api_calls = g.get_all_api_calls()
    assert len(api_calls) == 1
    assert api_calls[0].attributes["path"] == "/api/reports/annual"


def test_config_adapter_env():
    env_content = """
# Database config
DB_HOST=10.0.0.1
DB_PORT=5432
"""
    meta = FileMetadata(
        path=".env",
        relative_path=".env",
        language="env",
        role=FileRole.CONFIG,
        size_bytes=len(env_content),
        lines_of_code=len(env_content.splitlines()),
    )
    g = ERCGraph()
    adapter = ConfigAdapter()
    adapter.parse(meta, env_content, g)

    configs = g.get_symbols_by_kind(NodeType.CONFIG)
    assert len(configs) == 2
    keys = {c.name for c in configs}
    assert "DB_HOST" in keys
    assert "DB_PORT" in keys
