import pytest
import time
from pathlib import Path
from traceguard.core.context import AuditContext, AuditConfig
from traceguard.pipeline import AuditPipeline
from traceguard.core.models import Category, Severity


def test_benchmark_repo1_ecommerce():
    """
    Benchmark 1: Full-Stack FastAPI + React/TS + SQLite
    Known Defects:
      - Security: SQL injection in search.py (TG-SEC)
      - Security: Unprotected admin endpoint in admin.py (TG-SEC)
      - Gap: Missing backend route for /api/v2/discounts/apply (TG-GAP)
      - Gap: API Endpoint returns placeholder mock in checkout.py (TG-GAP)
      - Slop: Blind exception suppression in helpers.py (TG-SLOP)
      - Slop: Unreachable code in helpers.py (TG-SLOP)
      - Slop: Redundant pass-through wrapper in helpers.py (TG-SLOP)
      - Loose End: Actionable TODO in billing.py (TG-LOOSE)
      - Loose End: Debug print statement in billing.py (TG-LOOSE)
    Traps (False Positives to Reject):
      - Parameterized query in items.py
      - Client call matching /api/items/{id}
      - External call to api.stripe.com
      - Documentation comment with 'todo list'
    """
    repo_dir = Path("./benchmark_repos/repo1_ecommerce_fullstack")
    ctx = AuditContext(repo_dir)
    pipeline = AuditPipeline(ctx)

    start = time.time()
    report = pipeline.run()
    elapsed = time.time() - start

    assert elapsed < 2.0, f"Execution time too slow: {elapsed}s"
    assert report.overview.total_files >= 10

    subcats = {f.subcategory for f in report.findings}
    assert "injection" in subcats
    assert "missing_backend_route" in subcats
    assert "placeholder_endpoint" in subcats
    assert "swallowed_exception" in subcats
    assert "unreachable_code" in subcats
    assert "unresolved_task" in subcats
    assert "debug_artifact" in subcats

    # Verify False Positive Traps are NOT present
    finding_titles = [f.title for f in report.findings]
    # Trap 1: /api/items/{id} not flagged as missing route
    assert not any("Missing Backend Route for Client Call" in t and "/api/items" in t for t in finding_titles)
    # Trap 2: api.stripe.com not flagged as missing route
    assert not any("stripe.com" in t for t in finding_titles)


def test_benchmark_repo2_cloud_microservice():
    """
    Benchmark 2: Go Worker + Python CLI Microservice
    Known Defects:
      - Security: Command injection in backup_tool.py (TG-SEC)
      - Gap: Unimplemented StorageBackend interface (TG-GAP)
      - Slop: Excessive nesting depth in cleanup.py (TG-SLOP)
      - Loose End: Unconfigured METRICS_COLLECTOR_URL (TG-LOOSE)
      - Loose End: Commented-out implementation block (TG-LOOSE)
    Traps to Reject:
      - Safe subprocess.run list call
      - MetricsProvider implemented by PrometheusMetrics
      - Declared DB_HOST and DB_PORT
    """
    repo_dir = Path("./benchmark_repos/repo2_cloud_microservice")
    ctx = AuditContext(repo_dir)
    pipeline = AuditPipeline(ctx)

    report = pipeline.run()
    subcats = {f.subcategory for f in report.findings}

    assert "injection" in subcats
    assert "unimplemented_interface" in subcats
    assert "excessive_complexity" in subcats
    assert "unconfigured_env_var" in subcats
    assert "commented_out_code" in subcats

    # Verify False Positive Traps
    finding_snippets = [f.snippet for f in report.findings]
    # Safe subprocess trap
    assert not any("inspect_archive_safe" in s for s in finding_snippets)
    # MetricsProvider trap
    assert not any("MetricsProvider" in s for s in finding_snippets)


def test_benchmark_repo3_polyglot_fintech():
    """
    Benchmark 3: Polyglot Node.js Gateway + Docs
    Known Defects:
      - Security: Hardcoded JWT secret (TG-SEC)
      - Gap: Documented POST /api/v1/transfers/wire missing from code (TG-GAP)
      - Slop: Empty catch block in routes.js (TG-SLOP)
    """
    repo_dir = Path("./benchmark_repos/repo3_polyglot_fintech")
    ctx = AuditContext(repo_dir)
    pipeline = AuditPipeline(ctx)

    report = pipeline.run()
    subcats = {f.subcategory for f in report.findings}

    assert "secret_exposure" in subcats
    assert "undelivered_specification" in subcats
    assert "swallowed_exception" in subcats
