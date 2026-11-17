"""
Tests for Read-Only Safety and Sandbox Containment.
Verifies that auditing a repository NEVER alters, creates, or deletes any file
in the target codebase.
"""
import os
import hashlib
from pathlib import Path
from traceguard.core.context import AuditContext
from traceguard.pipeline import AuditPipeline


def _hash_tree(root: Path) -> dict:
    result = {}
    for path in root.rglob("*"):
        if path.is_file() and not any(part.startswith(".") for part in path.parts):
            try:
                mtime = path.stat().st_mtime_ns
                size = path.stat().st_size
                with open(path, "rb") as f:
                    content_hash = hashlib.sha256(f.read()).hexdigest()
                result[str(path.relative_to(root))] = (size, mtime, content_hash)
            except Exception:
                pass
    return result


def test_target_repository_is_never_modified():
    repo = Path("./benchmark_repos/repo1_ecommerce_fullstack").resolve()
    before = _hash_tree(repo)

    # Run full audit
    ctx = AuditContext(repo)
    pipeline = AuditPipeline(ctx)
    report = pipeline.run()

    after = _hash_tree(repo)

    assert before == after, "Target repository files were altered during the audit run!"
