"""
TraceGuard SQLite Persistence Layer.
Stores audit history, findings, file hashes, and finding lifecycle state.
Keeps source code read-only — only TraceGuard's own metadata is written here.
"""
from __future__ import annotations

import hashlib
import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

# Default DB lives in ~/.traceguard/traceguard.db
DB_PATH = Path.home() / ".traceguard" / "traceguard.db"


def get_connection(db_path: Path = DB_PATH) -> sqlite3.Connection:
    """Return a WAL-mode connection to the TraceGuard database."""
    db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(db_path))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    _init_schema(conn)
    return conn


def _init_schema(conn: sqlite3.Connection) -> None:
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS audits (
            id                      TEXT PRIMARY KEY,
            repo_path               TEXT NOT NULL,
            started_at              TEXT NOT NULL,
            completed_at            TEXT,
            status                  TEXT DEFAULT 'running',
            is_incremental          INTEGER DEFAULT 0,
            overall_score           REAL,
            security_risk_score     REAL,
            impl_completeness_score REAL,
            code_quality_score      REAL,
            dev_hygiene_score       REAL,
            rating                  TEXT,
            total_findings          INTEGER DEFAULT 0,
            report_json             TEXT
        );

        CREATE TABLE IF NOT EXISTS findings (
            id                      INTEGER PRIMARY KEY AUTOINCREMENT,
            audit_id                TEXT NOT NULL,
            stable_id               TEXT NOT NULL,
            category                TEXT NOT NULL,
            subcategory             TEXT,
            severity                TEXT NOT NULL,
            confidence              REAL DEFAULT 1.0,
            verification_status     TEXT,
            lifecycle_state         TEXT DEFAULT 'NEW',
            affected_file           TEXT,
            line_number             INTEGER,
            snippet                 TEXT,
            title                   TEXT,
            technical_explanation   TEXT,
            potential_impact        TEXT,
            recommended_remediation TEXT,
            FOREIGN KEY(audit_id) REFERENCES audits(id)
        );

        CREATE INDEX IF NOT EXISTS idx_findings_audit     ON findings(audit_id);
        CREATE INDEX IF NOT EXISTS idx_findings_stable    ON findings(stable_id);
        CREATE INDEX IF NOT EXISTS idx_findings_lifecycle ON findings(lifecycle_state);

        CREATE TABLE IF NOT EXISTS file_hashes (
            audit_id      TEXT NOT NULL,
            relative_path TEXT NOT NULL,
            content_hash  TEXT NOT NULL,
            PRIMARY KEY(audit_id, relative_path),
            FOREIGN KEY(audit_id) REFERENCES audits(id)
        );
    """)
    conn.commit()


def save_audit(
    *,
    audit_id: str,
    repo_path: str,
    status: str = "completed",
    is_incremental: bool = False,
    overall_score: Optional[float] = None,
    security_risk_score: Optional[float] = None,
    impl_completeness_score: Optional[float] = None,
    code_quality_score: Optional[float] = None,
    dev_hygiene_score: Optional[float] = None,
    rating: Optional[str] = None,
    total_findings: int = 0,
    report_json: Optional[str] = None,
    db_path: Path = DB_PATH,
) -> None:
    """Upsert an audit record."""
    now = datetime.now(timezone.utc).isoformat()
    conn = get_connection(db_path)
    try:
        existing = conn.execute("SELECT id FROM audits WHERE id=?", (audit_id,)).fetchone()
        if existing:
            conn.execute(
                """UPDATE audits SET completed_at=?, status=?, overall_score=?,
                   security_risk_score=?, impl_completeness_score=?, code_quality_score=?,
                   dev_hygiene_score=?, rating=?, total_findings=?, report_json=?
                   WHERE id=?""",
                (now, status, overall_score, security_risk_score, impl_completeness_score,
                 code_quality_score, dev_hygiene_score, rating, total_findings,
                 report_json, audit_id),
            )
        else:
            conn.execute(
                """INSERT INTO audits(id, repo_path, started_at, completed_at, status,
                   is_incremental, overall_score, security_risk_score, impl_completeness_score,
                   code_quality_score, dev_hygiene_score, rating, total_findings, report_json)
                   VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                (audit_id, repo_path, now, now, status, int(is_incremental),
                 overall_score, security_risk_score, impl_completeness_score,
                 code_quality_score, dev_hygiene_score, rating, total_findings, report_json),
            )
        conn.commit()
    finally:
        conn.close()


def get_latest_audit_id(repo_path: str, db_path: Path = DB_PATH) -> Optional[str]:
    """Return most recent completed audit_id for a repo path."""
    conn = get_connection(db_path)
    try:
        row = conn.execute(
            "SELECT id FROM audits WHERE repo_path=? AND status='completed' "
            "ORDER BY completed_at DESC LIMIT 1",
            (repo_path,),
        ).fetchone()
        return row["id"] if row else None
    finally:
        conn.close()


def save_findings(audit_id: str, findings: List[Any], db_path: Path = DB_PATH) -> None:
    """Persist a list of Finding models."""
    conn = get_connection(db_path)
    try:
        for f in findings:
            stable = getattr(f, "stable_id", None) or f.compute_stable_id()
            conn.execute(
                """INSERT INTO findings(audit_id, stable_id, category, subcategory, severity,
                   confidence, verification_status, lifecycle_state, affected_file, line_number,
                   snippet, title, technical_explanation, potential_impact, recommended_remediation)
                   VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                (audit_id, stable, f.category.value, getattr(f, "subcategory", ""),
                 f.severity.value, getattr(f, "confidence", 1.0),
                 f.verification_status.value, f.lifecycle_state.value,
                 f.affected_file, f.line_number, f.snippet, f.title,
                 f.technical_explanation, f.potential_impact, f.recommended_remediation),
            )
        conn.commit()
    finally:
        conn.close()


def get_audit_findings_rows(audit_id: str, db_path: Path = DB_PATH) -> List[sqlite3.Row]:
    conn = get_connection(db_path)
    try:
        return conn.execute(
            "SELECT * FROM findings WHERE audit_id=?", (audit_id,)
        ).fetchall()
    finally:
        conn.close()


def compute_file_hash(content: str) -> str:
    return hashlib.sha256(content.encode("utf-8", errors="replace")).hexdigest()


def save_file_hashes(
    audit_id: str, file_hashes: Dict[str, str], db_path: Path = DB_PATH
) -> None:
    conn = get_connection(db_path)
    try:
        conn.executemany(
            "INSERT OR REPLACE INTO file_hashes(audit_id, relative_path, content_hash) VALUES(?,?,?)",
            [(audit_id, path, h) for path, h in file_hashes.items()],
        )
        conn.commit()
    finally:
        conn.close()


def get_file_hashes(audit_id: str, db_path: Path = DB_PATH) -> Dict[str, str]:
    conn = get_connection(db_path)
    try:
        rows = conn.execute(
            "SELECT relative_path, content_hash FROM file_hashes WHERE audit_id=?",
            (audit_id,),
        ).fetchall()
        return {r["relative_path"]: r["content_hash"] for r in rows}
    finally:
        conn.close()
