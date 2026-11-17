"""
TraceGuard FastAPI Application.
Provides a REST API backed by the same analysis engine used by the CLI.
Core analysis engine is completely independent of FastAPI.

Security controls:
- Repository path validation and traversal prevention.
- No unrestricted filesystem access.
- Findings stored in SQLite only; source code is never modified.
"""
from __future__ import annotations

import json
import uuid
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import BackgroundTasks, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, field_validator

from ..core.context import AuditConfig, AuditContext
from ..incremental import IncrementalAuditEngine
from ..storage.db import (
    DB_PATH,
    get_audit_findings_rows,
    get_connection,
    get_latest_audit_id,
)

# ---------------------------------------------------------------------------
# App setup
# ---------------------------------------------------------------------------

app = FastAPI(
    title="TraceGuard API",
    description=(
        "Architecture-Agnostic Repository Integrity Agent REST API. "
        "Shares the same analysis engine with the CLI."
    ),
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

# In-process audit state store: audit_id -> status dict
_audit_store: Dict[str, Dict[str, Any]] = {}

# ---------------------------------------------------------------------------
# Pydantic request / response models
# ---------------------------------------------------------------------------

class AuditRequest(BaseModel):
    repo_path: str
    min_severity: Optional[str] = None
    categories: Optional[List[str]] = None
    incremental: bool = True

    @field_validator("repo_path")
    @classmethod
    def validate_repo_path(cls, v: str) -> str:
        """
        Prevent path traversal and system path access.
        Only allow absolute paths under home directory (or cwd for demos).
        """
        try:
            p = Path(v).resolve()
        except Exception as e:
            raise ValueError(f"Invalid path: {e}")

        if not p.exists():
            raise ValueError(f"Repository path does not exist: {v!r}")
        if not p.is_dir():
            raise ValueError(f"Repository path is not a directory: {v!r}")

        # Block obvious system directories
        _FORBIDDEN_PREFIXES = [
            "C:\\Windows", "C:\\System32", "/etc", "/proc", "/sys", "/dev",
            "/boot", "C:\\Program Files",
        ]
        for fb in _FORBIDDEN_PREFIXES:
            if str(p).startswith(fb):
                raise ValueError(f"Access to system directory {v!r} is not permitted.")

        return str(p)


class AuditResponse(BaseModel):
    audit_id: str
    status: str
    repo_path: str
    message: str


# ---------------------------------------------------------------------------
# Background task
# ---------------------------------------------------------------------------

def _run_audit_background(
    audit_id: str, repo_path: str, config: AuditConfig
) -> None:
    _audit_store[audit_id]["status"] = "running"
    try:
        ctx = AuditContext(Path(repo_path), config)
        engine = IncrementalAuditEngine(ctx, DB_PATH)
        report = engine.run()

        a = report.assessment
        _audit_store[audit_id].update({
            "status":          "completed",
            "total_findings":  len(report.findings),
            "overall_score":   a.overall_score,
            "security_risk_score":           a.security_risk_score,
            "implementation_completeness_score": a.implementation_completeness_score,
            "code_quality_score":            a.code_quality_score,
            "development_hygiene_score":     a.development_hygiene_score,
            "rating":          a.rating,
            "summary_verdict": a.summary_verdict,
            "disclaimer":      a.disclaimer,
            "execution_time":  report.execution_time_seconds,
            "graph_stats":     report.graph_stats,
            "report_dict":     report.model_dump(),
        })
    except Exception as exc:
        _audit_store[audit_id]["status"] = "failed"
        _audit_store[audit_id]["error"]  = str(exc)


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.get("/api/v1/health")
def health_check() -> Dict[str, str]:
    """Service health check."""
    return {"status": "healthy", "service": "traceguard", "version": "1.0.0"}


@app.post("/api/v1/audits", response_model=AuditResponse)
async def create_audit(
    request: AuditRequest, background_tasks: BackgroundTasks
) -> AuditResponse:
    """
    Enqueue a new repository audit.
    Returns immediately with audit_id; poll GET /api/v1/audits/{audit_id} for status.
    """
    audit_id = str(uuid.uuid4())
    config   = AuditConfig(
        min_severity=request.min_severity,
        categories_filter=request.categories,
    )
    _audit_store[audit_id] = {
        "audit_id":  audit_id,
        "status":    "queued",
        "repo_path": request.repo_path,
    }
    background_tasks.add_task(
        _run_audit_background, audit_id, request.repo_path, config
    )
    return AuditResponse(
        audit_id=audit_id,
        status="queued",
        repo_path=request.repo_path,
        message=f"Audit queued. Poll GET /api/v1/audits/{audit_id} for status.",
    )


@app.get("/api/v1/audits/{audit_id}")
def get_audit_status(audit_id: str) -> Dict[str, Any]:
    """Get status and summary for a given audit."""
    state = _audit_store.get(audit_id)
    if state:
        return {k: v for k, v in state.items() if k != "report_dict"}

    # Try SQLite for audits not in memory (e.g. after restart)
    conn = get_connection(DB_PATH)
    row  = conn.execute("SELECT * FROM audits WHERE id=?", (audit_id,)).fetchone()
    conn.close()
    if row:
        return dict(row)

    raise HTTPException(status_code=404, detail=f"Audit {audit_id!r} not found.")


@app.get("/api/v1/audits/{audit_id}/findings")
def get_audit_findings(
    audit_id: str,
    page:         int           = Query(1, ge=1),
    page_size:    int           = Query(50, ge=1, le=200),
    category:     Optional[str] = Query(None),
    min_severity: Optional[str] = Query(None),
) -> Dict[str, Any]:
    """
    Return paginated, optionally-filtered findings for a completed audit.
    """
    state = _audit_store.get(audit_id)
    if state and state.get("status") == "completed":
        raw = state["report_dict"].get("findings", [])
    else:
        rows = get_audit_findings_rows(audit_id)
        if rows is None:
            raise HTTPException(status_code=404, detail=f"Audit {audit_id!r} not found.")
        raw = [dict(r) for r in rows]

    if not raw and state and state.get("status") not in ("completed", None):
        raise HTTPException(
            status_code=409,
            detail=f"Audit {audit_id!r} is {state.get('status', 'unknown')}.",
        )

    # Filtering
    SEV_ORDER = {"critical": 5, "high": 4, "medium": 3, "low": 2, "info": 1}
    if category:
        raw = [f for f in raw if str(f.get("category", "")) == category]
    if min_severity:
        min_val = SEV_ORDER.get(min_severity.lower(), 0)
        raw = [f for f in raw if SEV_ORDER.get(str(f.get("severity", "")).lower(), 0) >= min_val]

    total = len(raw)
    start = (page - 1) * page_size
    return {
        "audit_id":  audit_id,
        "total":     total,
        "page":      page,
        "page_size": page_size,
        "findings":  raw[start : start + page_size],
    }


@app.get("/api/v1/audits/{audit_id}/graph")
def get_audit_graph(audit_id: str) -> Dict[str, Any]:
    """Return graph statistics and overview for a completed audit."""
    state = _audit_store.get(audit_id)
    if state and state.get("status") == "completed":
        return {
            "audit_id":    audit_id,
            "graph_stats": state.get("graph_stats", {}),
            "overview":    state["report_dict"].get("overview", {}),
            "graph_coverage": state["report_dict"].get("graph_coverage"),
        }
    raise HTTPException(
        status_code=404,
        detail=f"Audit {audit_id!r} not found or not yet completed.",
    )


@app.get("/api/v1/audits/{audit_id}/report")
def get_audit_report(
    audit_id: str,
    format: str = Query("json", pattern="^(json|markdown|html)$"),
) -> Any:
    """Return full audit report in json, markdown, or html format."""
    state = _audit_store.get(audit_id)
    if state and state.get("status") == "completed":
        report_dict = state["report_dict"]
    else:
        conn = get_connection(DB_PATH)
        row  = conn.execute(
            "SELECT report_json FROM audits WHERE id=?", (audit_id,)
        ).fetchone()
        conn.close()
        if not row or not row["report_json"]:
            raise HTTPException(
                status_code=404,
                detail=f"Report for audit {audit_id!r} not found.",
            )
        report_dict = json.loads(row["report_json"])

    if format == "json":
        return report_dict

    assessment = report_dict.get("assessment", {})
    findings   = report_dict.get("findings", [])

    if format == "markdown":
        lines = [
            f"# TraceGuard Audit Report\n",
            f"**Audit ID:** `{audit_id}`\n",
            f"**Score:** {assessment.get('overall_score', 'N/A')}/100 "
            f"({assessment.get('rating', '')})\n",
            f"\n> {assessment.get('disclaimer', '')}\n",
            f"\n## Dimension Scores\n",
            f"| Dimension | Score |",
            f"|-----------|-------|",
            f"| Security Risk | {assessment.get('security_risk_score', 100):.1f} |",
            f"| Implementation Completeness | {assessment.get('implementation_completeness_score', 100):.1f} |",
            f"| Code Quality | {assessment.get('code_quality_score', 100):.1f} |",
            f"| Development Hygiene | {assessment.get('development_hygiene_score', 100):.1f} |",
            f"\n## Findings ({len(findings)})\n",
        ]
        for f in findings:
            lines.append(
                f"### [{f.get('severity','').upper()}] {f.get('title','')}"
            )
            lines.append(f"- **File:** `{f.get('affected_file','')}:{f.get('line_number','')}`")
            lines.append(f"- **Category:** {f.get('category','')}")
            lines.append(f"\n{f.get('technical_explanation','')}\n")
            lines.append(f"**Remediation:** {f.get('recommended_remediation','')}\n")
        return {"format": "markdown", "content": "\n".join(lines)}

    # HTML
    rows_html = ""
    for f in findings:
        sev = f.get("severity", "info")
        color = {
            "critical": "#c62828", "high": "#e65100",
            "medium": "#f57f17", "low": "#1565c0", "info": "#546e7a",
        }.get(sev, "#333")
        rows_html += (
            f"<tr><td style='color:{color};font-weight:bold'>{sev.upper()}</td>"
            f"<td>{f.get('category','')}</td>"
            f"<td>{f.get('title','')}</td>"
            f"<td><code>{f.get('affected_file','')}:{f.get('line_number','')}</code></td></tr>\n"
        )

    html = f"""<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>TraceGuard Report</title>
<style>body{{font-family:sans-serif;max-width:1000px;margin:0 auto;padding:24px}}
h1{{color:#1565c0}}table{{width:100%;border-collapse:collapse}}
th,td{{padding:8px;text-align:left;border-bottom:1px solid #eee}}
th{{background:#f5f5f5}}.disclaimer{{background:#fff3cd;padding:12px;border-radius:4px}}</style>
</head><body>
<h1>🛡️ TraceGuard Audit Report</h1>
<p><strong>Audit ID:</strong> <code>{audit_id}</code></p>
<p><strong>Score:</strong> {assessment.get('overall_score','N/A')}/100 ({assessment.get('rating','')})</p>
<div class="disclaimer">{assessment.get('disclaimer','')}</div>
<h2>Findings ({len(findings)})</h2>
<table><thead><tr><th>Severity</th><th>Category</th><th>Title</th><th>Location</th></tr></thead>
<tbody>{rows_html}</tbody></table>
</body></html>"""

    return {"format": "html", "content": html}
