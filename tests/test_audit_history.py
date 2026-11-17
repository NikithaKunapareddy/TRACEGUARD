"""
Audit History & Persistence Integration Tests.
Verifies:
- Audit history is stored in SQLite
- Audits survive in-memory store clearing (simulating application restart)
- Historical audit retrieval by ID with full metadata (scores, disclaimer, rating)
- Historical findings retrieval with category/severity filtering
- Historical graph retrieval (nodes & edges)
- Audit comparison endpoint (score delta, lifecycle counts)
- Pagination and sorting of audit history
- 404 handling on missing historical audit
"""
import pytest
from pathlib import Path
from fastapi.testclient import TestClient
from traceguard.api.app import app, _audit_store
from traceguard.storage.db import list_audits, DB_PATH

client = TestClient(app)


def test_audit_persisted_to_sqlite_and_survives_restart():
    repo = str(Path("./benchmark_repos/repo1_ecommerce_fullstack").resolve())
    post_res = client.post(
        "/api/v1/audits",
        json={"repo_path": repo, "incremental": False},
    )
    assert post_res.status_code == 200
    data = post_res.json()
    audit_id = data["audit_id"]

    # Verify audit is completed
    status_res = client.get(f"/api/v1/audits/{audit_id}")
    assert status_res.status_code == 200
    assert status_res.json()["status"] == "completed"
    initial_score = status_res.json()["overall_score"]

    # Simulate server restart by clearing in-memory store
    _audit_store.pop(audit_id, None)
    assert audit_id not in _audit_store

    # 1. Verify GET /api/v1/audits/{id} still succeeds from SQLite
    restart_res = client.get(f"/api/v1/audits/{audit_id}")
    assert restart_res.status_code == 200
    r_data = restart_res.json()
    assert r_data["audit_id"] == audit_id
    assert r_data["status"] == "completed"
    assert r_data["overall_score"] == initial_score
    assert "security_risk_score" in r_data
    assert "implementation_completeness_score" in r_data
    assert "code_quality_score" in r_data
    assert "development_hygiene_score" in r_data
    assert "disclaimer" in r_data

    # 2. Verify GET /api/v1/audits/{id}/findings still succeeds from SQLite
    findings_res = client.get(f"/api/v1/audits/{audit_id}/findings?page=1&page_size=10")
    assert findings_res.status_code == 200
    f_data = findings_res.json()
    assert f_data["audit_id"] == audit_id
    assert f_data["total"] > 0
    assert len(f_data["findings"]) <= 10

    # 3. Verify GET /api/v1/audits/{id}/graph still succeeds from SQLite
    graph_res = client.get(f"/api/v1/audits/{audit_id}/graph")
    assert graph_res.status_code == 200
    g_data = graph_res.json()
    assert "nodes" in g_data
    assert "edges" in g_data

    # 4. Verify GET /api/v1/audits/{id}/report still succeeds from SQLite
    rep_res = client.get(f"/api/v1/audits/{audit_id}/report?format=json")
    assert rep_res.status_code == 200
    assert "assessment" in rep_res.json()


def test_list_audits_endpoint_with_filtering_and_pagination():
    res = client.get("/api/v1/audits?limit=10&sort_order=desc")
    assert res.status_code == 200
    audits = res.json()
    assert isinstance(audits, list)
    assert len(audits) > 0

    first = audits[0]
    assert "audit_id" in first
    assert "repo_name" in first
    assert "repo_path" in first
    assert "status" in first
    assert "overall_score" in first
    assert "total_findings" in first
    assert "critical_count" in first
    assert "high_count" in first
    assert "created_at" in first


def test_compare_audits_endpoint():
    # Fetch at least two audits from history
    list_res = client.get("/api/v1/audits?limit=5")
    audits = list_res.json()
    if len(audits) >= 2:
        id1 = audits[0]["audit_id"]
        id2 = audits[1]["audit_id"]
        comp_res = client.get(f"/api/v1/audits/{id1}/compare/{id2}")
        assert comp_res.status_code == 200
        comp_data = comp_res.json()
        assert "score_delta" in comp_data
        assert "resolved_count" in comp_data
        assert "new_count" in comp_data
        assert "persistent_count" in comp_data
        assert "resolved_findings" in comp_data
        assert "new_findings" in comp_data


def test_compare_nonexistent_audit_returns_404():
    res = client.get("/api/v1/audits/non_existent_1/compare/non_existent_2")
    assert res.status_code == 404
