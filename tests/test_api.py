"""
FastAPI REST API Endpoint Integration Tests.
Verifies all routes: health, audits create, audit status,
findings pagination, graph overview, report generation, and security path validation.
"""
import pytest
from pathlib import Path
from fastapi.testclient import TestClient
from traceguard.api.app import app

client = TestClient(app)


def test_health_endpoint():
    res = client.get("/api/v1/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert data["service"] == "traceguard"


def test_audit_rejection_on_nonexistent_path():
    res = client.post(
        "/api/v1/audits",
        json={"repo_path": "./benchmark_repos/nonexistent_fake_path_12345"},
    )
    assert res.status_code == 422  # Pydantic validation failure


def test_audit_rejection_on_forbidden_path():
    res = client.post(
        "/api/v1/audits",
        json={"repo_path": "C:\\Windows\\System32"},
    )
    assert res.status_code == 422


def test_audit_lifecycle_sync_flow():
    """Trigger an audit synchronously or wait for completion, then test all sub-endpoints."""
    repo = str(Path("./benchmark_repos/repo1_ecommerce_fullstack").resolve())
    post_res = client.post(
        "/api/v1/audits",
        json={"repo_path": repo, "incremental": False},
    )
    assert post_res.status_code == 200
    data = post_res.json()
    assert "audit_id" in data
    audit_id = data["audit_id"]

    # In TestClient, BackgroundTasks execute before response returns, so it's completed
    status_res = client.get(f"/api/v1/audits/{audit_id}")
    assert status_res.status_code == 200
    status_data = status_res.json()
    assert status_data["status"] == "completed"
    assert status_data["total_findings"] > 0
    assert "overall_score" in status_data
    assert "security_risk_score" in status_data
    assert "disclaimer" in status_data

    # Test findings endpoint
    findings_res = client.get(f"/api/v1/audits/{audit_id}/findings?page=1&page_size=10")
    assert findings_res.status_code == 200
    f_data = findings_res.json()
    assert f_data["audit_id"] == audit_id
    assert f_data["total"] > 0
    assert len(f_data["findings"]) <= 10
    first = f_data["findings"][0]
    assert "title" in first
    assert "severity" in first
    assert "category" in first

    # Test source code evidence endpoint
    first_id = first["id"]
    src_res = client.get(f"/api/v1/audits/{audit_id}/findings/{first_id}/source")
    assert src_res.status_code == 200
    src_data = src_res.json()
    assert src_data["finding_id"] == first_id
    assert "lines" in src_data
    assert "affected_file" in src_data
    assert "target_line" in src_data
    assert "file_exists" in src_data

    # Test graph endpoint
    graph_res = client.get(f"/api/v1/audits/{audit_id}/graph")
    assert graph_res.status_code == 200
    g_data = graph_res.json()
    assert "graph_stats" in g_data
    assert "overview" in g_data

    # Test reports endpoint (json, markdown, html)
    rep_json = client.get(f"/api/v1/audits/{audit_id}/report?format=json")
    assert rep_json.status_code == 200
    assert "assessment" in rep_json.json()

    rep_md = client.get(f"/api/v1/audits/{audit_id}/report?format=markdown")
    assert rep_md.status_code == 200
    assert rep_md.json()["format"] == "markdown"
    assert "TraceGuard Audit Report" in rep_md.json()["content"]

    rep_html = client.get(f"/api/v1/audits/{audit_id}/report?format=html")
    assert rep_html.status_code == 200
    assert rep_html.json()["format"] == "html"
    assert "TraceGuard Audit Report" in rep_html.json()["content"]


def test_get_nonexistent_audit_returns_404():
    res = client.get("/api/v1/audits/non_existent_uuid_99999")
    assert res.status_code == 404


def test_finding_source_nonexistent_returns_404():
    res = client.get("/api/v1/audits/non_existent_uuid/findings/non_existent_finding/source")
    assert res.status_code == 404

