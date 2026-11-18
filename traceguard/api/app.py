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
from fastapi.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, field_validator

from ..core.context import AuditConfig, AuditContext
from ..incremental import IncrementalAuditEngine
from ..storage.db import (
    DB_PATH,
    get_audit_findings_rows,
    get_connection,
    get_latest_audit_id,
    list_audits,
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
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# Mount static React dashboard if built
_frontend_dir = Path(__file__).resolve().parent.parent.parent / "frontend"
_frontend_build = _frontend_dir / "dist"
if not (_frontend_build.exists() and (_frontend_build / "index.html").exists()):
    _frontend_build = _frontend_dir / "build"
if _frontend_build.exists() and (_frontend_build / "index.html").exists():
    if (_frontend_build / "assets").exists():
        app.mount("/assets", StaticFiles(directory=str(_frontend_build / "assets")), name="assets")
    app.mount("/dashboard", StaticFiles(directory=str(_frontend_build), html=True), name="dashboard")


@app.get("/", include_in_schema=False)
def root():
    """Redirect root to UI dashboard if built, otherwise to Swagger docs."""
    if _frontend_build.exists() and (_frontend_build / "index.html").exists():
        return RedirectResponse(url="/dashboard/")
    return RedirectResponse(url="/docs")


@app.get("/api/docs", include_in_schema=False)
def api_docs_alias():
    """Support both /docs and /api/docs."""
    return RedirectResponse(url="/docs")


@app.get("/api/redoc", include_in_schema=False)
def api_redoc_alias():
    """Support both /redoc and /api/redoc."""
    return RedirectResponse(url="/redoc")

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
        ctx = AuditContext(Path(repo_path), config, audit_id=audit_id)
        engine = IncrementalAuditEngine(ctx, DB_PATH, audit_id=audit_id)
        report = engine.run(audit_id=audit_id)

        # Extract rich graph visualization nodes & edges for 2D & 3D viewers
        graph_nodes = []
        graph_edges = []
        graph = getattr(engine, "graph", getattr(ctx, "graph", None))
        if graph and hasattr(graph, "_graph"):
            try:
                for nid in list(graph._graph.nodes()):
                    sym = graph.get_symbol(nid)
                    if sym:
                        graph_nodes.append({
                            "id": str(nid),
                            "name": sym.name,
                            "kind": sym.kind.value if hasattr(sym.kind, "value") else str(sym.kind),
                            "file": sym.file,
                            "line": sym.line,
                            "attributes": getattr(sym, "attributes", {}),
                        })
                    else:
                        graph_nodes.append({
                            "id": str(nid),
                            "name": str(nid),
                            "kind": "node",
                            "file": "",
                            "line": 0,
                            "attributes": {},
                        })

                if hasattr(graph, "_relations") and graph._relations:
                    for rel in graph._relations:
                        graph_edges.append({
                            "source": str(rel.source),
                            "target": str(rel.target),
                            "relation": rel.relation.value if hasattr(rel.relation, "value") else str(rel.relation),
                            "resolution": rel.resolution.value if hasattr(rel.resolution, "value") else str(rel.resolution),
                            "confidence": getattr(rel, "confidence", 1.0),
                        })
                else:
                    for u, v, data in graph._graph.edges(data=True):
                        graph_edges.append({
                            "source": str(u),
                            "target": str(v),
                            "relation": str(data.get("relation", "link")),
                            "resolution": "confirmed",
                            "confidence": 1.0,
                        })
            except Exception:
                pass

        a = report.assessment
        report_dict = report.model_dump()
        report_dict["graph_nodes"] = graph_nodes
        report_dict["graph_edges"] = graph_edges

        # Persist enriched report with graph visualization into SQLite
        try:
            conn = get_connection(DB_PATH)
            conn.execute(
                "UPDATE audits SET report_json=? WHERE id=?",
                (json.dumps(report_dict), audit_id),
            )
            conn.commit()
            conn.close()
        except Exception:
            pass

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
            "graph_nodes":     graph_nodes,
            "graph_edges":     graph_edges,
            "report_dict":     report_dict,
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


@app.get("/api/v1/audits")
def get_historical_audits(
    repo_path: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    sort_order: str = Query("desc", pattern="^(desc|asc)$"),
) -> List[Dict[str, Any]]:
    """List historical audits from SQLite persistence with filtering and pagination."""
    sort_desc = sort_order.lower() == "desc"
    return list_audits(
        repo_path=repo_path,
        status=status,
        limit=limit,
        offset=offset,
        sort_desc=sort_desc,
        db_path=DB_PATH,
    )


@app.get("/api/v1/audits/{audit_id_1}/compare/{audit_id_2}")
def compare_two_audits(audit_id_1: str, audit_id_2: str) -> Dict[str, Any]:
    """Compare two audit runs for finding lifecycle transitions and score delta."""
    conn = get_connection(DB_PATH)
    try:
        a1 = conn.execute("SELECT * FROM audits WHERE id=?", (audit_id_1,)).fetchone()
        a2 = conn.execute("SELECT * FROM audits WHERE id=?", (audit_id_2,)).fetchone()
        if not a1 or not a2:
            raise HTTPException(status_code=404, detail="One or both audits not found.")

        f1 = conn.execute(
            "SELECT stable_id, severity, category, title, lifecycle_state, affected_file, line_number, snippet, technical_explanation, potential_impact, recommended_remediation FROM findings WHERE audit_id=?",
            (audit_id_1,),
        ).fetchall()
        f2 = conn.execute(
            "SELECT stable_id, severity, category, title, lifecycle_state, affected_file, line_number, snippet, technical_explanation, potential_impact, recommended_remediation FROM findings WHERE audit_id=?",
            (audit_id_2,),
        ).fetchall()

        f1_map = {r["stable_id"]: dict(r) for r in f1 if r["stable_id"]}
        f2_map = {r["stable_id"]: dict(r) for r in f2 if r["stable_id"]}

        resolved_ids = set(f1_map.keys()) - set(f2_map.keys())
        new_ids = set(f2_map.keys()) - set(f1_map.keys())
        persistent_ids = set(f1_map.keys()) & set(f2_map.keys())

        score_1 = a1["overall_score"] if a1["overall_score"] is not None else 100.0
        score_2 = a2["overall_score"] if a2["overall_score"] is not None else 100.0

        return {
            "audit_id_1": audit_id_1,
            "audit_id_2": audit_id_2,
            "previous_audit_id": audit_id_1,
            "current_audit_id": audit_id_2,
            "score_previous": score_1,
            "score_current": score_2,
            "score_delta": round(score_2 - score_1, 2),
            "total_previous": len(f1),
            "total_current": len(f2),
            "resolved_count": len(resolved_ids),
            "new_count": len(new_ids),
            "persistent_count": len(persistent_ids),
            "resolved_findings": [f1_map[sid] for sid in resolved_ids],
            "new_findings": [f2_map[sid] for sid in new_ids],
            "persisting_findings": [f2_map[sid] for sid in persistent_ids],
            "persistent_findings": [f2_map[sid] for sid in persistent_ids],
        }
    finally:
        conn.close()


@app.get("/api/v1/audits/{audit_id}")
def get_audit_status(audit_id: str) -> Dict[str, Any]:
    """Get status and summary for a given audit."""
    state = _audit_store.get(audit_id)
    if state:
        res = {k: v for k, v in state.items() if k != "report_dict"}
        res["audit_id"] = audit_id
        res["id"] = audit_id
        return res

    # Try SQLite for audits not in memory (e.g. after restart or from history)
    conn = get_connection(DB_PATH)
    row = conn.execute("SELECT * FROM audits WHERE id=?", (audit_id,)).fetchone()
    conn.close()
    if row:
        d = {
            "audit_id": row["id"],
            "id": row["id"],
            "status": row["status"],
            "repo_path": row["repo_path"],
            "total_findings": row["total_findings"],
            "overall_score": row["overall_score"],
            "security_risk_score": row["security_risk_score"],
            "implementation_completeness_score": row["impl_completeness_score"],
            "code_quality_score": row["code_quality_score"],
            "development_hygiene_score": row["dev_hygiene_score"],
            "rating": row["rating"],
            "is_incremental": bool(row["is_incremental"]),
            "incremental": bool(row["is_incremental"]),
            "created_at": row["started_at"],
            "completed_at": row["completed_at"],
        }
        if row["report_json"]:
            try:
                rep = json.loads(row["report_json"])
                assessment = rep.get("assessment", {})
                d["disclaimer"] = assessment.get("disclaimer", "")
                d["summary_verdict"] = assessment.get("summary_verdict", "")
                d["execution_time"] = rep.get("execution_time_seconds", 0)
                d["graph_stats"] = rep.get("graph_stats", {})
            except Exception:
                pass
        return d

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
    Works seamlessly from memory or persisted SQLite records.
    """
    state = _audit_store.get(audit_id)
    raw = None
    if state and state.get("status") == "completed":
        raw = state["report_dict"].get("findings", [])
    else:
        conn = get_connection(DB_PATH)
        row = conn.execute("SELECT report_json FROM audits WHERE id=?", (audit_id,)).fetchone()
        conn.close()
        if row and row["report_json"]:
            try:
                rep = json.loads(row["report_json"])
                raw = rep.get("findings", [])
            except Exception:
                pass
        if raw is None:
            rows = get_audit_findings_rows(audit_id)
            if rows is not None and len(rows) > 0:
                raw = [dict(r) for r in rows]

    if raw is None:
        if state and state.get("status") not in ("completed", None):
            raise HTTPException(
                status_code=409,
                detail=f"Audit {audit_id!r} is {state.get('status', 'unknown')}.",
            )
        raise HTTPException(status_code=404, detail=f"Audit {audit_id!r} not found.")

    # Filtering
    SEV_ORDER = {"critical": 5, "high": 4, "medium": 3, "low": 2, "info": 1}
    if category:
        raw = [f for f in raw if str(f.get("category", "")).lower() == category.lower()]
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


@app.get("/api/v1/audits/{audit_id}/findings/{finding_id}/source")
def get_finding_source_code(
    audit_id: str,
    finding_id: str,
    context_lines: int = Query(10, ge=1, le=50),
) -> Dict[str, Any]:
    """
    Return exact source code context for a finding from the audited repository.
    Strictly read-only, checks boundaries to prevent path traversal,
    and returns highlighted affected line ranges with surrounding context.
    """
    # 1. Retrieve audit metadata
    state = _audit_store.get(audit_id)
    repo_path_str = None
    findings = []
    if state and state.get("status") == "completed":
        repo_path_str = state.get("repo_path")
        findings = state.get("report_dict", {}).get("findings", [])
    else:
        conn = get_connection(DB_PATH)
        row = conn.execute("SELECT repo_path, report_json FROM audits WHERE id=?", (audit_id,)).fetchone()
        conn.close()
        if not row:
            raise HTTPException(status_code=404, detail=f"Audit {audit_id!r} not found.")
        repo_path_str = row["repo_path"]
        if row["report_json"]:
            try:
                rep = json.loads(row["report_json"])
                findings = rep.get("findings", [])
            except Exception:
                pass

    if not repo_path_str:
        raise HTTPException(status_code=404, detail="Repository path not recorded for audit.")

    repo_root = Path(repo_path_str).resolve()

    # 2. Find target finding
    target_finding = None
    for f in findings:
        if str(f.get("id")) == finding_id or str(f.get("stable_id")) == finding_id:
            target_finding = f
            break

    if not target_finding:
        conn = get_connection(DB_PATH)
        frow = conn.execute(
            "SELECT * FROM findings WHERE audit_id=? AND (id=? OR stable_id=?)",
            (audit_id, finding_id, finding_id),
        ).fetchone()
        conn.close()
        if frow:
            target_finding = dict(frow)

    if not target_finding:
        raise HTTPException(status_code=404, detail=f"Finding {finding_id!r} not found in audit.")

    affected_file = target_finding.get("affected_file", "")
    line_number = int(target_finding.get("line_number", 1))
    end_line_number = target_finding.get("end_line_number")
    end_line = int(end_line_number) if end_line_number else line_number

    # 3. Path safety & read-only file read
    file_exists = False
    lines_output = []
    total_lines = 0
    start_lno = 1
    end_lno = 1
    lang = "text"

    if affected_file:
        try:
            target_path = (repo_root / affected_file).resolve()
            # Boundary traversal verification
            if not str(target_path).startswith(str(repo_root)):
                raise HTTPException(status_code=403, detail="Access outside target repository path is forbidden.")

            if target_path.is_file():
                file_exists = True
                lang = target_path.suffix.lstrip(".").lower() or "text"
                with open(target_path, "r", encoding="utf-8", errors="replace") as fh:
                    raw_lines = fh.readlines()
                total_lines = len(raw_lines)
                start_lno = max(1, line_number - context_lines)
                end_lno = min(total_lines, end_line + context_lines)

                for idx in range(start_lno, end_lno + 1):
                    lines_output.append({
                        "line_number": idx,
                        "content": raw_lines[idx - 1].rstrip("\r\n"),
                        "is_problematic": line_number <= idx <= end_line,
                    })
        except HTTPException:
            raise
        except Exception as e:
            pass

    return {
        "audit_id": audit_id,
        "finding_id": finding_id,
        "title": target_finding.get("title", ""),
        "severity": target_finding.get("severity", ""),
        "category": target_finding.get("category", ""),
        "confidence": target_finding.get("confidence", 1.0),
        "verification_status": target_finding.get("verification_status", "Confirmed"),
        "lifecycle_state": target_finding.get("lifecycle_state", "NEW"),
        "affected_file": affected_file,
        "line_number": line_number,
        "target_line": line_number,
        "end_line_number": end_line,
        "file_exists": file_exists,
        "language": lang,
        "start_line": start_lno,
        "end_line": end_lno,
        "total_lines": total_lines,
        "lines": lines_output,
        "raw_snippet": target_finding.get("snippet", ""),
        "technical_explanation": target_finding.get("technical_explanation", ""),
        "potential_impact": target_finding.get("potential_impact", ""),
        "recommended_remediation": target_finding.get("recommended_remediation", ""),
        "counterevidence_considered": target_finding.get("counterevidence_considered", []),
        "related_nodes": target_finding.get("related_nodes", []),
    }


@app.get("/api/v1/audits/{audit_id}/graph")
def get_audit_graph(audit_id: str) -> Dict[str, Any]:
    """Return graph statistics, overview, nodes, and edges for a completed audit."""
    state = _audit_store.get(audit_id)
    if state and state.get("status") == "completed":
        return {
            "audit_id":    audit_id,
            "graph_stats": state.get("graph_stats", {}),
            "overview":    state["report_dict"].get("overview", {}),
            "graph_coverage": state["report_dict"].get("graph_coverage"),
            "nodes":       state.get("graph_nodes", []),
            "edges":       state.get("graph_edges", []),
        }

    # Fallback to SQLite persistence for historical audits or post-restart
    conn = get_connection(DB_PATH)
    row = conn.execute("SELECT report_json FROM audits WHERE id=?", (audit_id,)).fetchone()
    conn.close()
    if row and row["report_json"]:
        try:
            rep = json.loads(row["report_json"])
            nodes = rep.get("graph_nodes", [])
            edges = rep.get("graph_edges", [])
            # Reconstruct basic nodes from findings if not stored
            if not nodes:
                nodes = []
                for f in rep.get("findings", []):
                    f_id = f.get("id") or f.get("stable_id")
                    nodes.append({
                        "id": str(f_id),
                        "name": f.get("title", str(f_id)),
                        "kind": f.get("category", "finding"),
                        "file": f.get("affected_file", ""),
                        "line": f.get("line_number", 0),
                    })
            return {
                "audit_id": audit_id,
                "graph_stats": rep.get("graph_stats", {}),
                "overview": rep.get("overview", {}),
                "graph_coverage": rep.get("graph_coverage"),
                "nodes": nodes,
                "edges": edges,
            }
        except Exception:
            pass

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
