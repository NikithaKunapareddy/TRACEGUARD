"""TraceGuard SQLite persistence layer."""
from .db import (
    get_connection,
    save_audit,
    save_findings,
    save_file_hashes,
    get_latest_audit_id,
    get_audit_findings_rows,
    get_file_hashes,
    compute_file_hash,
    DB_PATH,
)

__all__ = [
    "get_connection", "save_audit", "save_findings", "save_file_hashes",
    "get_latest_audit_id", "get_audit_findings_rows", "get_file_hashes",
    "compute_file_hash", "DB_PATH",
]
