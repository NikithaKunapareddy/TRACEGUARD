import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  traceguardApi,
  AuditHistoryItem,
  AuditCompareResult,
} from "../api/client";
import {
  History,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Minus,
  GitCompare,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  FolderOpen,
  Zap,
  Search,
  Download,
  Eye,
  ChevronLeft,
  ChevronRight,
  Shield,
} from "lucide-react";

interface AuditHistoryProps {
  currentAuditId?: string | null;
  onLoadAudit?: (auditId: string, jumpToTab?: "overview" | "findings" | "graph" | "reports") => void;
  darkMode?: boolean;
}

const scoreColor = (score?: number) => {
  if (score === undefined || score === null) return "#64748b";
  if (score >= 90) return "#10b981";
  if (score >= 75) return "#3b82f6";
  if (score >= 60) return "#eab308";
  return "#f43f5e";
};

const formatDate = (iso?: string) => {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
};

const shortRepo = (path?: string) => {
  if (!path) return "Repository";
  return path.replace(/^.*[/\\]/, "") || path;
};

const VIB_TINTS = [
  "vib-tint-violet",
  "vib-tint-indigo",
  "vib-tint-blue",
  "vib-tint-green",
  "vib-tint-yellow",
  "vib-tint-orange",
  "vib-tint-red",
];

export const AuditHistory: React.FC<AuditHistoryProps> = ({
  currentAuditId,
  onLoadAudit,
  darkMode = true,
}) => {
  const [audits, setAudits] = useState<AuditHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");
  const [page, setPage] = useState(1);
  const pageSize = 8;

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [compareResult, setCompareResult] = useState<AuditCompareResult | null>(null);
  const [comparing, setComparing] = useState(false);
  const [compareError, setCompareError] = useState<string | null>(null);

  const textPrimary = darkMode ? "#f8fafc" : "#0f172a";
  const textSecondary = darkMode ? "#cbd5e1" : "#334155";
  const textMuted = darkMode ? "#94a3b8" : "#64748b";

  const fetchAudits = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await traceguardApi.listAudits(undefined, undefined, 100);
      setAudits(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e.message || "Failed to load audit history");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAudits();
  }, [fetchAudits]);

  const filteredAudits = useMemo(() => {
    return audits
      .filter((a) => {
        const path = a.repo_path || "";
        const id = a.audit_id || a.id || "";
        const matchesSearch =
          path.toLowerCase().includes(searchQuery.toLowerCase()) ||
          id.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus =
          statusFilter === "all" ||
          (a.status || "").toLowerCase() === statusFilter.toLowerCase();
        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => {
        const timeA = new Date(a.created_at || a.completed_at || 0).getTime();
        const timeB = new Date(b.created_at || b.completed_at || 0).getTime();
        return sortOrder === "desc" ? timeB - timeA : timeA - timeB;
      });
  }, [audits, searchQuery, statusFilter, sortOrder]);

  const totalPages = Math.ceil(filteredAudits.length / pageSize) || 1;
  const paginatedAudits = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredAudits.slice(start, start + pageSize);
  }, [filteredAudits, page, pageSize]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size < 2) {
        next.add(id);
      } else {
        const [first] = Array.from(next);
        next.delete(first);
        next.add(id);
      }
      return next;
    });
    setCompareResult(null);
    setCompareError(null);
  };

  const handleCompare = async () => {
    const [id1, id2] = Array.from(selectedIds);
    if (!id1 || !id2) return;
    setComparing(true);
    setCompareError(null);
    try {
      const result = await traceguardApi.compareAudits(id1, id2);
      setCompareResult(result);
    } catch (e: any) {
      setCompareError(e.message || "Audit comparison failed");
    } finally {
      setComparing(false);
    }
  };

  const handleDownloadReport = async (auditId: string, format = "html") => {
    try {
      const report = await traceguardApi.getReport(auditId, format);
      const content =
        typeof report === "string" ? report : report.content || JSON.stringify(report, null, 2);
      const mime =
        format === "html" ? "text/html" : format === "markdown" ? "text/markdown" : "application/json";
      const blob = new Blob([content], { type: mime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `traceguard_report_${auditId.slice(0, 8)}.${format === "markdown" ? "md" : format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(`Report download failed: ${err.message}`);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "28px", paddingBottom: "36px" }}>
      {/* ====================================================================
          1. OPEN VAULT HEADER & FILTER DOCK
         ==================================================================== */}
      <div
        className="vibgyor-prism-surface animate-reveal"
        style={{
          padding: "22px 28px",
          borderRadius: "30px",
          display: "flex",
          flexDirection: "column",
          gap: "18px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "16px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "14px",
                background: "rgba(139, 92, 246, 0.18)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <History size={20} color="#8b5cf6" />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 800, color: textPrimary }}>
                Audit History &amp; Delta Engine
              </h2>
              <div style={{ fontSize: "12.5px", color: textMuted }}>
                {audits.length} persisted SQLite audit snapshots · Select any 2 rows to compute lifecycle delta
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
            {selectedIds.size === 2 && (
              <button
                onClick={handleCompare}
                disabled={comparing}
                className="vibgyor-cta-btn"
                style={{ padding: "10px 20px", fontSize: "13px" }}
              >
                <GitCompare size={15} />
                <span>{comparing ? "Computing Delta…" : "Compare 2 Selected"}</span>
              </button>
            )}

            <button
              onClick={fetchAudits}
              disabled={loading}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "7px",
                padding: "9px 16px",
                borderRadius: "9999px",
                fontSize: "12.5px",
                fontWeight: 700,
                background: darkMode ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.06)",
                border: "none",
                color: textPrimary,
                cursor: "pointer",
              }}
            >
              <RefreshCw
                size={14}
                style={{ animation: loading ? "spin 1s linear infinite" : undefined }}
              />
              <span>Refresh History</span>
            </button>
          </div>
        </div>

        {/* Search & Filter Stream */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "12px",
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              position: "relative",
              flex: "1 1 260px",
              maxWidth: "420px",
            }}
          >
            <Search
              size={14}
              color={textMuted}
              style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)" }}
            />
            <input
              type="text"
              placeholder="Search repository name or audit ID…"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              style={{
                width: "100%",
                padding: "9px 14px 9px 36px",
                borderRadius: "9999px",
                background: darkMode ? "rgba(4, 7, 17, 0.55)" : "rgba(255, 255, 255, 0.85)",
                border: "none",
                color: textPrimary,
                fontSize: "12.5px",
                outline: "none",
              }}
            />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            {["all", "completed", "running", "failed"].map((st) => {
              const active = statusFilter === st;
              return (
                <button
                  key={st}
                  onClick={() => {
                    setStatusFilter(st);
                    setPage(1);
                  }}
                  style={{
                    padding: "6px 14px",
                    borderRadius: "9999px",
                    fontSize: "11.5px",
                    fontWeight: active ? 800 : 600,
                    textTransform: "capitalize",
                    background: active ? "#8b5cf6" : "transparent",
                    color: active ? "#ffffff" : textMuted,
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  {st}
                </button>
              );
            })}

            <button
              onClick={() => setSortOrder((o) => (o === "desc" ? "asc" : "desc"))}
              style={{
                padding: "6px 14px",
                borderRadius: "9999px",
                fontSize: "11.5px",
                fontWeight: 700,
                background: darkMode ? "rgba(255, 255, 255, 0.05)" : "rgba(15, 23, 42, 0.05)",
                border: "none",
                color: textSecondary,
                cursor: "pointer",
              }}
            >
              {sortOrder === "desc" ? "Newest ↓" : "Oldest ↑"}
            </button>
          </div>
        </div>
      </div>

      {/* Comparison result stream if active */}
      {compareResult && (
        <div
          className="vibgyor-prism-surface animate-reveal"
          style={{ padding: "26px", borderRadius: "28px" }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "12px",
              marginBottom: "20px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <GitCompare size={19} color="#8b5cf6" />
              <span style={{ fontSize: "18px", fontWeight: 800, color: textPrimary }}>
                Lifecycle Delta Analysis
              </span>
            </div>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "15px",
                fontWeight: 800,
                color:
                  compareResult.score_delta > 0
                    ? "#10b981"
                    : compareResult.score_delta < 0
                    ? "#f43f5e"
                    : textMuted,
              }}
            >
              {compareResult.score_delta > 0 ? (
                <TrendingUp size={17} />
              ) : compareResult.score_delta < 0 ? (
                <TrendingDown size={17} />
              ) : (
                <Minus size={17} />
              )}
              {compareResult.score_delta > 0 ? "+" : ""}
              {compareResult.score_delta.toFixed(1)} Integrity Score Delta
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: "16px",
            }}
          >
            <div className="vibgyor-prism-surface vib-tint-red" style={{ padding: "18px", borderRadius: "22px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
                <span style={{ fontWeight: 800, fontSize: "13px", color: "#f43f5e" }}>
                  New Findings Introduced
                </span>
                <span style={{ fontSize: "20px", fontWeight: 800, color: "#f43f5e" }}>
                  {(compareResult.new_findings || []).length}
                </span>
              </div>
              {(compareResult.new_findings || []).slice(0, 4).map((f, i) => (
                <div key={i} style={{ fontSize: "12px", color: textSecondary, padding: "4px 0" }}>
                  • {f.title}
                </div>
              ))}
            </div>

            <div className="vibgyor-prism-surface vib-tint-green" style={{ padding: "18px", borderRadius: "22px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
                <span style={{ fontWeight: 800, fontSize: "13px", color: "#10b981" }}>
                  Findings Resolved
                </span>
                <span style={{ fontSize: "20px", fontWeight: 800, color: "#10b981" }}>
                  {(compareResult.resolved_findings || []).length}
                </span>
              </div>
              {(compareResult.resolved_findings || []).slice(0, 4).map((f, i) => (
                <div key={i} style={{ fontSize: "12px", color: textSecondary, padding: "4px 0" }}>
                  • {f.title}
                </div>
              ))}
            </div>

            <div className="vibgyor-prism-surface vib-tint-yellow" style={{ padding: "18px", borderRadius: "22px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
                <span style={{ fontWeight: 800, fontSize: "13px", color: "#eab308" }}>
                  Persisting Findings
                </span>
                <span style={{ fontSize: "20px", fontWeight: 800, color: "#eab308" }}>
                  {(compareResult.persisting_findings || []).length}
                </span>
              </div>
              {(compareResult.persisting_findings || []).slice(0, 4).map((f, i) => (
                <div key={i} style={{ fontSize: "12px", color: textSecondary, padding: "4px 0" }}>
                  • {f.title}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {compareError && (
        <div
          className="vibgyor-prism-surface vib-tint-red"
          style={{ padding: "14px 20px", borderRadius: "20px", color: "#f43f5e", fontSize: "13px" }}
        >
          {compareError}
        </div>
      )}

      {/* ====================================================================
          2. VIBGYOR PRISM AUDIT STREAM (Responsive Cards for All Screen Sizes)
         ==================================================================== */}
      {loading ? (
        <div
          className="vibgyor-prism-surface"
          style={{ textAlign: "center", padding: "54px 20px", borderRadius: "28px", color: textMuted }}
        >
          <RefreshCw
            size={26}
            color="#8b5cf6"
            style={{ animation: "spin 1s linear infinite", display: "inline-block", marginBottom: "12px" }}
          />
          <div>Loading persisted SQLite audit snapshots…</div>
        </div>
      ) : filteredAudits.length === 0 ? (
        <div
          className="vibgyor-prism-surface"
          style={{ textAlign: "center", padding: "60px 24px", borderRadius: "28px", color: textMuted }}
        >
          <History size={38} style={{ opacity: 0.35, marginBottom: "12px" }} />
          <div style={{ fontSize: "17px", fontWeight: 800, color: textPrimary, marginBottom: "6px" }}>
            No Persisted Audits Found
          </div>
          <div style={{ fontSize: "13.5px" }}>
            Launch a repository inspection to populate the SQLite Audit History.
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {paginatedAudits.map((audit, idx) => {
            const aid = audit.audit_id || audit.id || `audit-${idx}`;
            const isSelected = selectedIds.has(aid);
            const isCurrent = aid === currentAuditId;
            const tintClass = VIB_TINTS[idx % VIB_TINTS.length];

            return (
              <div
                key={aid}
                onClick={() => toggleSelect(aid)}
                className={`vibgyor-prism-surface ${tintClass}`}
                style={{
                  padding: "18px 24px",
                  borderRadius: "24px",
                  cursor: "pointer",
                  border: isSelected
                    ? "2px solid #8b5cf6"
                    : isCurrent
                    ? "1.5px solid #3b82f6"
                    : "1px solid var(--hairline)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: "16px",
                }}
              >
                {/* Left: Checkbox + Repo Identity */}
                <div style={{ display: "flex", alignItems: "center", gap: "14px", flex: "1 1 240px" }}>
                  <div
                    style={{
                      width: "20px",
                      height: "20px",
                      borderRadius: "50%",
                      border: isSelected ? "2px solid #8b5cf6" : "1.5px solid var(--hairline-strong)",
                      background: isSelected ? "#8b5cf6" : "transparent",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    {isSelected && <CheckCircle2 size={13} color="#ffffff" />}
                  </div>

                  <FolderOpen size={18} color="#8b5cf6" style={{ flexShrink: 0 }} />

                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                      <span style={{ fontWeight: 800, fontSize: "15px", color: textPrimary }}>
                        {audit.repo_name || shortRepo(audit.repo_path)}
                      </span>
                      {audit.incremental && (
                        <span
                          style={{
                            fontSize: "10px",
                            fontWeight: 800,
                            padding: "2px 8px",
                            borderRadius: "9999px",
                            background: "rgba(16, 185, 129, 0.16)",
                            color: "#10b981",
                          }}
                        >
                          ⚡ INCREMENTAL
                        </span>
                      )}
                    </div>
                    <div
                      style={{
                        fontSize: "11.5px",
                        color: textMuted,
                        fontFamily: "JetBrains Mono, monospace",
                        marginTop: "2px",
                      }}
                    >
                      ID: {aid.slice(0, 14)}… · {formatDate(audit.completed_at || audit.created_at)}
                    </div>
                  </div>
                </div>

                {/* Middle: Score & Severity Pills */}
                <div style={{ display: "flex", alignItems: "center", gap: "18px", flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontSize: "10px", fontWeight: 700, color: textMuted, textTransform: "uppercase" }}>
                      Score
                    </div>
                    <div
                      style={{
                        fontSize: "20px",
                        fontWeight: 800,
                        color: scoreColor(audit.overall_score),
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {audit.overall_score != null ? audit.overall_score.toFixed(1) : "—"}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: "10px", fontWeight: 700, color: textMuted, textTransform: "uppercase" }}>
                      Findings
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "2px" }}>
                      <span style={{ fontWeight: 800, fontSize: "14px", color: textPrimary }}>
                        {audit.total_findings ?? 0}
                      </span>
                      {(audit.critical_count ?? 0) > 0 && (
                        <span
                          style={{
                            fontSize: "10px",
                            fontWeight: 800,
                            padding: "2px 7px",
                            borderRadius: "9999px",
                            background: "rgba(244, 63, 94, 0.18)",
                            color: "#f43f5e",
                          }}
                        >
                          {audit.critical_count}C
                        </span>
                      )}
                      {(audit.high_count ?? 0) > 0 && (
                        <span
                          style={{
                            fontSize: "10px",
                            fontWeight: 800,
                            padding: "2px 7px",
                            borderRadius: "9999px",
                            background: "rgba(249, 115, 22, 0.18)",
                            color: "#f97316",
                          }}
                        >
                          {audit.high_count}H
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Action Pills */}
                <div
                  style={{ display: "flex", alignItems: "center", gap: "8px" }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {onLoadAudit && (
                    <>
                      <button
                        onClick={() => onLoadAudit(aid, "overview")}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "5px",
                          padding: "7px 14px",
                          borderRadius: "9999px",
                          fontSize: "12px",
                          fontWeight: 700,
                          background: "rgba(59, 130, 246, 0.16)",
                          color: "#3b82f6",
                          border: "none",
                          cursor: "pointer",
                        }}
                      >
                        <Eye size={13} />
                        <span>Open</span>
                      </button>
                      <button
                        onClick={() => onLoadAudit(aid, "findings")}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "5px",
                          padding: "7px 14px",
                          borderRadius: "9999px",
                          fontSize: "12px",
                          fontWeight: 700,
                          background: darkMode ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.06)",
                          color: textSecondary,
                          border: "none",
                          cursor: "pointer",
                        }}
                      >
                        <Shield size={13} />
                        <span>Findings</span>
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => handleDownloadReport(aid, "html")}
                    title="Download HTML Report"
                    style={{
                      padding: "7px 10px",
                      borderRadius: "9999px",
                      background: "transparent",
                      border: "1px solid var(--hairline)",
                      color: textMuted,
                      cursor: "pointer",
                    }}
                  >
                    <Download size={13} />
                  </button>
                </div>
              </div>
            );
          })}

          {totalPages > 1 && (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                paddingTop: "12px",
                fontSize: "12.5px",
                color: textMuted,
              }}
            >
              <div>
                Page {page} of {totalPages} ({filteredAudits.length} audits)
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  disabled={page === 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  style={{
                    padding: "6px 14px",
                    borderRadius: "9999px",
                    background: darkMode ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.06)",
                    border: "none",
                    color: page === 1 ? textMuted : textPrimary,
                    cursor: page === 1 ? "not-allowed" : "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  <ChevronLeft size={14} /> Prev
                </button>
                <button
                  disabled={page === totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  style={{
                    padding: "6px 14px",
                    borderRadius: "9999px",
                    background: darkMode ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.06)",
                    border: "none",
                    color: page === totalPages ? textMuted : textPrimary,
                    cursor: page === totalPages ? "not-allowed" : "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  Next <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
