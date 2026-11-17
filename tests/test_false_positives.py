"""
False-Positive Trap Rejection Regression Tests.
Verifies that benign patterns deliberately placed in benchmark repositories
are rejected or properly counter-evidenced, and NOT confirmed as false defects.
"""
import pytest
from pathlib import Path
from traceguard.core.context import AuditContext
from traceguard.pipeline import AuditPipeline


def test_repo1_traps_rejected():
    """
    Repo 1 Traps:
    - Safe parameterized queries in app/services/billing.py
    - Legitimate external stripe API calls in billing.py (not missing internal backend routes)
    - Declared environment variables in .env.example
    """
    ctx = AuditContext(Path("./benchmark_repos/repo1_ecommerce_fullstack"))
    pipeline = AuditPipeline(ctx)
    report = pipeline.run()

    # 1. Parameterized billing queries should NOT be flagged as injection
    injection_findings = [
        f for f in report.findings
        if f.subcategory == "injection" and "billing.py" in str(f.affected_file)
    ]
    assert len(injection_findings) == 0

    # 2. External API calls (https://api.stripe.com) should not be flagged as missing backend routes
    missing_routes = [
        f for f in report.findings
        if f.subcategory == "missing_backend_route" and "stripe" in f.title.lower()
    ]
    assert len(missing_routes) == 0


def test_repo2_traps_rejected():
    """
    Repo 2 Traps:
    - Safe subprocess.run list call in cleanup.py
    - MetricsProvider interface satisfied by PrometheusMetrics pointer receiver
    - Declared DB_HOST and DB_PORT
    """
    ctx = AuditContext(Path("./benchmark_repos/repo2_cloud_microservice"))
    pipeline = AuditPipeline(ctx)
    report = pipeline.run()

    # 1. MetricsProvider must NOT be flagged as unimplemented interface
    unimplemented_metrics = [
        f for f in report.findings
        if f.subcategory == "unimplemented_interface" and "MetricsProvider" in f.title
    ]
    assert len(unimplemented_metrics) == 0

    # 2. Configured DB_HOST and DB_PORT should not be flagged as unconfigured
    unconfigured_db = [
        f for f in report.findings
        if f.subcategory == "unconfigured_env_var" and any(k in f.title for k in ("DB_HOST", "DB_PORT"))
    ]
    assert len(unconfigured_db) == 0


def test_repo3_traps_rejected():
    """
    Repo 3 Traps:
    - Valid parameterized DB query using pg pool query($1, [val])
    - Documented API endpoint matched to route
    """
    ctx = AuditContext(Path("./benchmark_repos/repo3_polyglot_fintech"))
    pipeline = AuditPipeline(ctx)
    report = pipeline.run()

    # Safe parameterized query in gateway/files.js or auth.js should not be flagged
    false_injection = [
        f for f in report.findings
        if f.subcategory == "injection" and "pool.query" in f.snippet
    ]
    assert len(false_injection) == 0


def test_repo8_traps_rejected():
    """
    Repo 8 Traps:
    - CacheProvider satisfied by RedisCache pointer methods
    """
    ctx = AuditContext(Path("./benchmark_repos/repo8_go_microservice"))
    pipeline = AuditPipeline(ctx)
    report = pipeline.run()

    false_cache_unimpl = [
        f for f in report.findings
        if f.subcategory == "unimplemented_interface" and "CacheProvider" in f.title
    ]
    assert len(false_cache_unimpl) == 0
