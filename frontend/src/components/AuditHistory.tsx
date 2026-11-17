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
  ArrowRight,
  Search,
  Download,
  Filter,
  Eye,
  ChevronLeft,
  ChevronRight,
  Shield,
  FileCode,
} from "lucide-react";

interface AuditHistoryProps {
  currentAuditId?: string | null;
  onLoadAudit?: (auditId: string, jumpToTab?: "overview" | "findings" | "graph" | "reports") => void;
  darkMode?: boolean;
}

const scoreColor = (score?: number) => {
  if (score === undefined || score === null) return "#64748b";
  if (score >= 90) return "#10b981";
  if (score >= 75) return "#38bdf8";
  if (score >= 60) return "#f59e0b";
  return "#f43f5e";
};

const ratingBadge = (rating?: string) => {
  const map: Record<string, { bg: string; color: string }> = {
    EXCELLENT: { bg: "rgba(16,185,129,0.15)", color: "#34d399" },
    Excellent: { bg: "rgba(16,185,129,0.15)", color: "#34d399" },
    GOOD: { bg: "rgba(56,189,248,0.15)", color: "#38bdf8" },
    Good: { bg: "rgba(56,189,248,0.15)", color: "#38bdf8" },
    FAIR: { bg: "rgba(245,158,11,0.15)", color: "#fbbf24" },
    Fair: { bg: "rgba(245,158,11,0.15)", color: "#fbbf24" },
    POOR: { bg: "rgba(244,63,94,0.15)", color: "#f87171" },
    Poor: { bg: "rgba(244,63,94,0.15)", color: "#f87171" },
  };
  const r = rating || "Unknown";
  const style = map[r] || { bg: "rgba(100,116,139,0.15)", color: "#94a3b8" };
  return (
    <span
      style={{
        fontSize: "11px",
        fontWeight: 700,
        padding: "2px 8px",
        borderRadius: "9999px",
        background: style.bg,
        color: style.color,
        letterSpacing: "0.3px",
      }}
    >
      {r}
    </span>
  );
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
  const pageSize = 10;

  // Comparison selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [compareResult, setCompareResult] = useState<AuditCompareResult | null>(null);
  const [comparing, setComparing] = useState(false);
  const [compareError, setCompareError] = useState<string | null>(null);

  const cyan = darkMode ? "#38bdf8" : "#0284c7";
  const purple = darkMode ? "#a855f7" : "#7c3aed";
  const emerald = darkMode ? "#10b981" : "#059669";
  const rose = darkMode ? "#f43f5e" : "#dc2626";
  const amber = darkMode ? "#f59e0b" : "#d97706";
  const textPrimary = darkMode ? "#f8fafc" : "#0f172a";
  const textSecondary = darkMode ? "#94a3b8" : "#475569";
  const textMuted = darkMode ? "#64748b" : "#94a3b8";

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

  // Filtered and sorted audits
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
      const content = typeof report === "string" ? report : report.content || JSON.stringify(report, null, 2);
      const mime = format === "html" ? "text/html" : format === "markdown" ? "text/markdown" : "application/json";
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

  const cardStyle: React.CSSProperties = {
    background: darkMode ? "rgba(15, 23, 42, 0.75)" : "rgba(255, 255, 255, 0.85)",
    backdropFilter: "blur(16px)",
    border: darkMode ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid rgba(0, 0, 0, 0.08)",
    borderRadius: "16px",
    padding: "24px",
    marginBottom: "20px",
  };

  return (
    <div>
      {/* Top Header Card */}
      <div
        style={{
          ...cardStyle,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "16px",
          padding: "18px 24px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "10px",
              background: `${purple}22`,
              border: `1px solid ${purple}44`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <History size={20} color={purple} />
          </div>
          <div>
            <div style={{ fontSize: "16px", fontWeight: 700, color: textPrimary }}>
              Audit History &amp; Comparison
            </div>
            <div style={{ fontSize: "12px", color: textMuted, marginTop: "1px" }}>
              {audits.length} persisted audit{audits.length !== 1 ? "s" : ""} in SQLite
              {selectedIds.size === 2 && " • 2 selected for comparison"}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
          {selectedIds.size === 2 && (
            <button
              onClick={handleCompare}
              disabled={comparing}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "9px 16px",
                borderRadius: "10px",
                fontSize: "13px",
                fontWeight: 700,
                background: comparing ? `${purple}15` : `${purple}33`,
                border: `1px solid ${purple}66`,
                color: darkMode ? "#c084fc" : purple,
                cursor: comparing ? "not-allowed" : "pointer",
              }}
            >
              <GitCompare size={15} />
              {comparing ? "Comparing…" : "Compare 2 Selected"}
            </button>
          )}

          <button
            onClick={fetchAudits}
            disabled={loading}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "9px 16px",
              borderRadius: "10px",
              fontSize: "13px",
              fontWeight: 600,
              background: `${cyan}18`,
              border: `1px solid ${cyan}44`,
              color: cyan,
              cursor: "pointer",
            }}
          >
            <RefreshCw
              size={14}
              style={{
                animation: loading ? "spin 1s linear infinite" : undefined,
              }}
            />
            Refresh
          </button>
        </div>
      </div>

      {/* Controls Bar: Search, Status Filter, Sort */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "14px",
          marginBottom: "16px",
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1, minWidth: "260px" }}>
          <div
            style={{
              position: "relative",
              flex: 1,
              maxWidth: "400px",
            }}
          >
            <Search
              size={15}
              color={textMuted}
              style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)" }}
            />
            <input
              type="text"
              placeholder="Search by repository name or audit ID..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              style={{
                width: "100%",
                padding: "9px 12px 9px 34px",
                borderRadius: "10px",
                background: darkMode ? "rgba(15, 23, 42, 0.6)" : "rgba(255, 255, 255, 0.9)",
                border: darkMode ? "1px solid rgba(255, 255, 255, 0.1)" : "1px solid rgba(0, 0, 0, 0.12)",
                color: textPrimary,
                fontSize: "13px",
                outline: "none",
              }}
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            style={{
              padding: "9px 12px",
              borderRadius: "10px",
              background: darkMode ? "rgba(15, 23, 42, 0.6)" : "rgba(255, 255, 255, 0.9)",
              border: darkMode ? "1px solid rgba(255, 255, 255, 0.1)" : "1px solid rgba(0, 0, 0, 0.12)",
              color: textPrimary,
              fontSize: "13px",
              outline: "none",
              cursor: "pointer",
            }}
          >
            <option value="all">All Statuses</option>
            <option value="completed">Completed</option>
            <option value="running">Running</option>
            <option value="failed">Failed</option>
          </select>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <button
            onClick={() => setSortOrder((o) => (o === "desc" ? "asc" : "desc"))}
            style={{
              padding: "8px 14px",
              borderRadius: "8px",
              fontSize: "12px",
              fontWeight: 600,
              background: darkMode ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.05)",
              border: darkMode ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid rgba(0, 0, 0, 0.08)",
              color: textSecondary,
              cursor: "pointer",
            }}
          >
            Date: {sortOrder === "desc" ? "Newest First ↓" : "Oldest First ↑"}
          </button>
        </div>
      </div>

      {/* Select 2 audits banner */}
      {selectedIds.size === 1 && (
        <div
          style={{
            background: `${purple}15`,
            border: `1px solid ${purple}33`,
            borderRadius: "10px",
            padding: "10px 16px",
            fontSize: "12px",
            color: darkMode ? "#c084fc" : purple,
            marginBottom: "16px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <GitCompare size={14} />
          1 audit selected. Click another audit row to compare side-by-side.
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div
          style={{
            ...cardStyle,
            background: `${rose}15`,
            border: `1px solid ${rose}44`,
            color: rose,
            display: "flex",
            alignItems: "center",
            gap: "10px",
            padding: "14px 20px",
          }}
        >
          <XCircle size={16} />
          <span>{error}</span>
          <button
            onClick={fetchAudits}
            style={{
              marginLeft: "auto",
              padding: "4px 10px",
              borderRadius: "6px",
              background: `${rose}25`,
              border: `1px solid ${rose}44`,
              color: rose,
              cursor: "pointer",
              fontSize: "12px",
              fontWeight: 600,
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading Spinner */}
      {loading && (
        <div style={{ ...cardStyle, textAlign: "center", padding: "50px 20px", color: textMuted }}>
          <RefreshCw
            size={28}
            color={cyan}
            style={{ animation: "spin 1s linear infinite", display: "inline-block", marginBottom: "12px" }}
          />
          <div>Loading persisted audit records from SQLite…</div>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && filteredAudits.length === 0 && (
        <div style={{ ...cardStyle, textAlign: "center", padding: "60px 20px", color: textMuted }}>
          <History size={40} style={{ opacity: 0.3, marginBottom: "14px" }} />
          <div style={{ fontSize: "16px", fontWeight: 700, color: textPrimary, marginBottom: "6px" }}>
            No Audits Found
          </div>
          <div style={{ fontSize: "13px", maxWidth: "420px", margin: "0 auto" }}>
            {searchQuery
              ? `No audits matching "${searchQuery}". Try clearing search.`
              : "Launch your first repository audit above to generate a persistent integrity report."}
          </div>
        </div>
      )}

      {/* Audits Table */}
      {!loading && filteredAudits.length > 0 && (
        <div style={cardStyle}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr style={{ borderBottom: darkMode ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid rgba(0, 0, 0, 0.08)" }}>
                  {["", "Repository", "Score", "Rating", "Findings", "Breakdown", "Type", "Completed", "Actions"].map(
                    (h, idx) => (
                      <th
                        key={idx}
                        style={{
                          textAlign: "left",
                          padding: "10px 12px",
                          color: textMuted,
                          fontSize: "11px",
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: "0.5px",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {paginatedAudits.map((audit, idx) => {
                  const aid = audit.audit_id || audit.id || `audit-${idx}`;
                  const isSelected = selectedIds.has(aid);
                  const isCurrent = aid === currentAuditId;

                  return (
                    <tr
                      key={aid}
                      onClick={() => toggleSelect(aid)}
                      style={{
                        borderBottom:
                          idx < paginatedAudits.length - 1
                            ? darkMode
                              ? "1px solid rgba(255, 255, 255, 0.04)"
                              : "1px solid rgba(0, 0, 0, 0.04)"
                            : "none",
                        background: isSelected
                          ? `${purple}18`
                          : isCurrent
                          ? `${cyan}12`
                          : "transparent",
                        cursor: "pointer",
                        transition: "background 0.15s ease",
                      }}
                    >
                      {/* Checkbox */}
                      <td style={{ padding: "12px 10px", width: "32px" }}>
                        <div
                          style={{
                            width: "18px",
                            height: "18px",
                            borderRadius: "5px",
                            border: isSelected
                              ? `1.5px solid ${purple}`
                              : darkMode
                              ? "1.5px solid rgba(255, 255, 255, 0.2)"
                              : "1.5px solid rgba(0, 0, 0, 0.2)",
                            background: isSelected ? `${purple}33` : "transparent",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          {isSelected && <CheckCircle2 size={12} color={purple} />}
                        </div>
                      </td>

                      {/* Repo info */}
                      <td style={{ padding: "12px 12px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <FolderOpen size={14} color={isCurrent ? cyan : textMuted} />
                          <div>
                            <div
                              style={{
                                fontWeight: 700,
                                color: isCurrent ? cyan : textPrimary,
                                maxWidth: "200px",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {audit.repo_name || shortRepo(audit.repo_path)}
                            </div>
                            <div
                              style={{
                                fontSize: "11px",
                                color: textMuted,
                                fontFamily: "JetBrains Mono, monospace",
                              }}
                            >
                              {aid.slice(0, 14)}…
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Score */}
                      <td style={{ padding: "12px 12px" }}>
                        {audit.overall_score != null ? (
                          <div style={{ display: "flex", alignItems: "baseline", gap: "4px" }}>
                            <span
                              style={{
                                fontSize: "16px",
                                fontWeight: 800,
                                color: scoreColor(audit.overall_score),
                                fontVariantNumeric: "tabular-nums",
                              }}
                            >
                              {audit.overall_score.toFixed(1)}
                            </span>
                            <span style={{ fontSize: "11px", color: textMuted }}>/100</span>
                          </div>
                        ) : (
                          <span style={{ color: textMuted }}>—</span>
                        )}
                      </td>

                      {/* Rating */}
                      <td style={{ padding: "12px 12px" }}>{ratingBadge(audit.rating)}</td>

                      {/* Findings Total */}
                      <td style={{ padding: "12px 12px" }}>
                        <span
                          style={{
                            fontWeight: 700,
                            color: (audit.total_findings ?? 0) > 0 ? rose : emerald,
                          }}
                        >
                          {audit.total_findings ?? 0}
                        </span>
                      </td>

                      {/* Severity Breakdown */}
                      <td style={{ padding: "12px 12px" }}>
                        <div style={{ display: "flex", gap: "4px" }}>
                          {(audit.critical_count ?? 0) > 0 && (
                            <span
                              style={{
                                fontSize: "10px",
                                fontWeight: 700,
                                padding: "1px 5px",
                                borderRadius: "4px",
                                background: `${rose}22`,
                                color: rose,
                              }}
                            >
                              {audit.critical_count}C
                            </span>
                          )}
                          {(audit.high_count ?? 0) > 0 && (
                            <span
                              style={{
                                fontSize: "10px",
                                fontWeight: 700,
                                padding: "1px 5px",
                                borderRadius: "4px",
                                background: `${amber}22`,
                                color: amber,
                              }}
                            >
                              {audit.high_count}H
                            </span>
                          )}
                          {(audit.critical_count ?? 0) === 0 && (audit.high_count ?? 0) === 0 && (
                            <span style={{ fontSize: "11px", color: emerald }}>Clean</span>
                          )}
                        </div>
                      </td>

                      {/* Type */}
                      <td style={{ padding: "12px 12px" }}>
                        {audit.incremental ? (
                          <span
                            style={{
                              fontSize: "11px",
                              fontWeight: 600,
                              color: emerald,
                              padding: "2px 6px",
                              borderRadius: "4px",
                              background: `${emerald}15`,
                            }}
                          >
                            ⚡ Incr
                          </span>
                        ) : (
                          <span style={{ fontSize: "11px", color: textMuted }}>Full</span>
                        )}
                      </td>

                      {/* Completed Date */}
                      <td style={{ padding: "12px 12px", whiteSpace: "nowrap", color: textSecondary, fontSize: "12px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                          <Clock size={12} color={textMuted} />
                          {formatDate(audit.completed_at || audit.created_at)}
                        </div>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: "12px 12px" }}>
                        <div style={{ display: "flex", gap: "6px" }} onClick={(e) => e.stopPropagation()}>
                          {onLoadAudit && (
                            <>
                              <button
                                onClick={() => onLoadAudit(aid, "overview")}
                                title="Load full audit results"
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "4px",
                                  padding: "5px 9px",
                                  borderRadius: "6px",
                                  fontSize: "11px",
                                  fontWeight: 600,
                                  background: `${cyan}18`,
                                  border: `1px solid ${cyan}33`,
                                  color: cyan,
                                  cursor: "pointer",
                                }}
                              >
                                <Eye size={12} />
                                View
                              </button>
                              <button
                                onClick={() => onLoadAudit(aid, "findings")}
                                title="Inspect findings directly"
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "4px",
                                  padding: "5px 9px",
                                  borderRadius: "6px",
                                  fontSize: "11px",
                                  fontWeight: 600,
                                  background: darkMode ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.05)",
                                  border: darkMode ? "1px solid rgba(255, 255, 255, 0.1)" : "1px solid rgba(0, 0, 0, 0.1)",
                                  color: textSecondary,
                                  cursor: "pointer",
                                }}
                              >
                                <Shield size={12} />
                                Findings
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => handleDownloadReport(aid, "html")}
                            title="Download HTML report"
                            style={{
                              padding: "5px 7px",
                              borderRadius: "6px",
                              background: "transparent",
                              border: darkMode ? "1px solid rgba(255, 255, 255, 0.1)" : "1px solid rgba(0, 0, 0, 0.1)",
                              color: textMuted,
                              cursor: "pointer",
                            }}
                          >
                            <Download size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: "16px",
                paddingTop: "14px",
                borderTop: darkMode ? "1px solid rgba(255, 255, 255, 0.05)" : "1px solid rgba(0, 0, 0, 0.05)",
                fontSize: "12px",
                color: textMuted,
              }}
            >
              <div>
                Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, filteredAudits.length)} of{" "}
                {filteredAudits.length} audits
              </div>
              <div style={{ display: "flex", gap: "6px" }}>
                <button
                  disabled={page === 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  style={{
                    padding: "5px 10px",
                    borderRadius: "6px",
                    background: darkMode ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.05)",
                    border: "none",
                    color: page === 1 ? textMuted : textPrimary,
                    cursor: page === 1 ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  <ChevronLeft size={14} /> Prev
                </button>
                <span style={{ padding: "5px 10px", fontWeight: 700, color: textPrimary }}>
                  {page} / {totalPages}
                </span>
                <button
                  disabled={page === totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  style={{
                    padding: "5px 10px",
                    borderRadius: "6px",
                    background: darkMode ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.05)",
                    border: "none",
                    color: page === totalPages ? textMuted : textPrimary,
                    cursor: page === totalPages ? "not-allowed" : "pointer",
                    display: "flex",
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

      {/* Comparison Diff Result View */}
      {compareResult && (
        <div style={cardStyle}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              marginBottom: "18px",
              paddingBottom: "14px",
              borderBottom: darkMode ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid rgba(0, 0, 0, 0.08)",
            }}
          >
            <GitCompare size={18} color={purple} />
            <span style={{ fontSize: "16px", fontWeight: 700, color: textPrimary }}>
              Audit Comparison: Score &amp; Finding Delta
            </span>
            <div
              style={{
                marginLeft: "auto",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "14px",
                fontWeight: 800,
                color:
                  compareResult.score_delta > 0
                    ? emerald
                    : compareResult.score_delta < 0
                    ? rose
                    : textMuted,
              }}
            >
              {compareResult.score_delta > 0 ? (
                <TrendingUp size={16} />
              ) : compareResult.score_delta < 0 ? (
                <TrendingDown size={16} />
              ) : (
                <Minus size={16} />
              )}
              {compareResult.score_delta > 0 ? "+" : ""}
              {compareResult.score_delta.toFixed(1)} Score Delta
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "16px" }}>
            {/* New Findings */}
            <div
              style={{
                background: `${rose}12`,
                borderRadius: "12px",
                padding: "16px",
                border: `1px solid ${rose}33`,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                <AlertTriangle size={15} color={rose} />
                <span style={{ fontWeight: 700, fontSize: "13px", color: rose }}>
                  New Findings Introduced
                </span>
                <span style={{ marginLeft: "auto", fontSize: "18px", fontWeight: 800, color: rose }}>
                  {(compareResult.new_findings || []).length}
                </span>
              </div>
              {(compareResult.new_findings || []).slice(0, 4).map((f, i) => (
                <div
                  key={i}
                  style={{
                    fontSize: "12px",
                    color: textSecondary,
                    padding: "4px 0",
                    borderBottom: darkMode ? "1px solid rgba(255, 255, 255, 0.04)" : "1px solid rgba(0, 0, 0, 0.04)",
                  }}
                >
                  {f.title}
                </div>
              ))}
            </div>

            {/* Resolved Findings */}
            <div
              style={{
                background: `${emerald}12`,
                borderRadius: "12px",
                padding: "16px",
                border: `1px solid ${emerald}33`,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                <CheckCircle2 size={15} color={emerald} />
                <span style={{ fontWeight: 700, fontSize: "13px", color: emerald }}>
                  Findings Resolved
                </span>
                <span style={{ marginLeft: "auto", fontSize: "18px", fontWeight: 800, color: emerald }}>
                  {(compareResult.resolved_findings || []).length}
                </span>
              </div>
              {(compareResult.resolved_findings || []).slice(0, 4).map((f, i) => (
                <div
                  key={i}
                  style={{
                    fontSize: "12px",
                    color: textSecondary,
                    padding: "4px 0",
                    borderBottom: darkMode ? "1px solid rgba(255, 255, 255, 0.04)" : "1px solid rgba(0, 0, 0, 0.04)",
                  }}
                >
                  {f.title}
                </div>
              ))}
            </div>

            {/* Persisting Findings */}
            <div
              style={{
                background: `${amber}12`,
                borderRadius: "12px",
                padding: "16px",
                border: `1px solid ${amber}33`,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                <Zap size={15} color={amber} />
                <span style={{ fontWeight: 700, fontSize: "13px", color: amber }}>
                  Persisting Findings
                </span>
                <span style={{ marginLeft: "auto", fontSize: "18px", fontWeight: 800, color: amber }}>
                  {(compareResult.persisting_findings || []).length}
                </span>
              </div>
              {(compareResult.persisting_findings || []).slice(0, 4).map((f, i) => (
                <div
                  key={i}
                  style={{
                    fontSize: "12px",
                    color: textSecondary,
                    padding: "4px 0",
                    borderBottom: darkMode ? "1px solid rgba(255, 255, 255, 0.04)" : "1px solid rgba(0, 0, 0, 0.04)",
                  }}
                >
                  {f.title}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {compareError && (
        <div
          style={{
            ...cardStyle,
            background: `${rose}15`,
            border: `1px solid ${rose}44`,
            color: rose,
            padding: "14px 20px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <XCircle size={16} />
          <span>{compareError}</span>
        </div>
      )}
    </div>
  );
};
