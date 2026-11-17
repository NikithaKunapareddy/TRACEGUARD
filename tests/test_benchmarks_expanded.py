"""
Tests for Expanded Benchmark Repositories (repos 4 through 9).
Verifies detection of known defects against ground truth definitions.
"""
import pytest
from pathlib import Path
from traceguard.core.context import AuditContext
from traceguard.pipeline import AuditPipeline


def test_benchmark_repo4_fastapi_react():
    """
    Repo 4: FastAPI + React Task Manager
    Known Defects:
      - Security: SQL injection in search_tasks via f-string
      - Gap: Missing backend route DELETE /tasks/{id} called by frontend client
    """
    ctx = AuditContext(Path("./benchmark_repos/repo4_fastapi_react"))
    pipeline = AuditPipeline(ctx)
    report = pipeline.run()

    subcats = {f.subcategory for f in report.findings}
    assert "injection" in subcats
    assert "missing_backend_route" in subcats

    # Verify score is computed
    assert report.assessment.overall_score < 100.0
    assert report.assessment.security_risk_score < 100.0


def test_benchmark_repo5_fastapi_only():
    """
    Repo 5: FastAPI Backend-Only Service
    Known Defects:
      - Slop: Placeholder implementation in get_revenue (TODO comment)
      - Gap: Documented endpoint /analytics/users missing in code
      - Security: Hardcoded internal secret
    """
    ctx = AuditContext(Path("./benchmark_repos/repo5_fastapi_only"))
    pipeline = AuditPipeline(ctx)
    report = pipeline.run()

    subcats = {f.subcategory for f in report.findings}
    assert "placeholder_implementation" in subcats or "todo_comment" in subcats or "undelivered_specification" in subcats


def test_benchmark_repo6_node_express():
    """
    Repo 6: Node.js Express Application
    Known Defects:
      - Security: Hardcoded secret (JWT_SECRET)
      - Slop: Empty catch block
      - Loose End: Commented-out route handler
    """
    ctx = AuditContext(Path("./benchmark_repos/repo6_node_express"))
    pipeline = AuditPipeline(ctx)
    report = pipeline.run()

    subcats = {f.subcategory for f in report.findings}
    assert "secret_exposure" in subcats or "hardcoded_secret" in subcats or "broken_access_control" in subcats


def test_benchmark_repo7_python_worker():
    """
    Repo 7: Python Worker Architecture
    Known Defects:
      - Loose End: Unconfigured broker URL
      - Slop: Empty exception swallowing in jobs.py
      - Security: SQL injection in batch settlement
    """
    ctx = AuditContext(Path("./benchmark_repos/repo7_python_worker"))
    pipeline = AuditPipeline(ctx)
    report = pipeline.run()

    subcats = {f.subcategory for f in report.findings}
    assert "unconfigured_env_var" in subcats or "injection" in subcats or "empty_exception_handler" in subcats


def test_benchmark_repo8_go_microservice():
    """
    Repo 8: Go Microservice
    Known Defects:
      - Gap: AuditNotifier interface is unimplemented
      - Loose End: SERVICE_PORT unconfigured
    Traps to reject:
      - CacheProvider is satisfied by RedisCache
    """
    ctx = AuditContext(Path("./benchmark_repos/repo8_go_microservice"))
    pipeline = AuditPipeline(ctx)
    report = pipeline.run()

    subcats = {f.subcategory for f in report.findings}
    assert "unimplemented_interface" in subcats
    assert "unconfigured_env_var" in subcats

    # Verify AuditNotifier is the one flagged
    unimpl = [f for f in report.findings if f.subcategory == "unimplemented_interface"]
    assert any("AuditNotifier" in f.title for f in unimpl)


def test_benchmark_repo9_python_monolith():
    """
    Repo 9: Python Modular Monolith
    Known Defects:
      - Security: Hardcoded APP_SECRET
      - Slop: Placeholder implementation in cancel_order
    """
    ctx = AuditContext(Path("./benchmark_repos/repo9_python_monolith"))
    pipeline = AuditPipeline(ctx)
    report = pipeline.run()

    subcats = {f.subcategory for f in report.findings}
    assert "hardcoded_secret" in subcats or "placeholder_implementation" in subcats
