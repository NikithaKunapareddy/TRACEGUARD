import React, { useState, useEffect, useCallback } from "react";
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
} from "lucide-react";

interface AuditHistoryProps {
  currentAuditId?: string | null;
  onLoadAudit?: (auditId: string) => void;
}

const scoreColor = (score?: number) => {
  if (!score) return "#64748b";
  if (score >= 90) return "#10b981";
  if (score >= 75) return "#38bdf8";
  if (score >= 60) return "#f59e0b";
  return "#f43f5e";
};

const ratingBadge = (rating?: string) => {
  const map: Record<string, { bg: string; color: string }> = {
    Excellent: { bg: "rgba(16,185,129,0.15)", color: "#34d399" },
    Good: { bg: "rgba(56,189,248,0.15)", color: "#38bdf8" },
    Fair: { bg: "rgba(245,158,11,0.15)", color: "#fbbf24" },
    Poor: { bg: "rgba(244,63,94,0.15)", color: "#f87171" },
    Critical: { bg: "rgba(244,63,94,0.25)", color: "#f43f5e" },
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
    return new Date(iso).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
};

const shortRepo = (path: string) => path.replace(/^.*[/\\]/, "") || path;

export const AuditHistory: React.FC<AuditHistoryProps> = ({
  currentAuditId,
  onLoadAudit,
}) => {
  const [audits, setAudits] = useState<AuditHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [compareResult, setCompareResult] = useState<AuditCompareResult | null>(null);
  const [comparing, setComparing] = useState(false);
  const [compareError, setCompareError] = useState<string | null>(null);

  const fetchAudits = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await traceguardApi.listAudits(undefined, 30);
      setAudits(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e.message || "Failed to load audit history");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAudits();
  }, [fetchAudits, currentAuditId]);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size < 2) {
        next.add(id);
      } else {
        // Replace oldest selection
        const [first] = next;
        next.delete(first);
        next.add(id);
      }
      return next;
    });
    setCompareResult(null);
    setCompareError(null);
  };

  const handleCompare = async () => {
    const [id1, id2] = Array.from(selected);
    if (!id1 || !id2) return;
    setComparing(true);
    setCompareError(null);
    try {
      const result = await traceguardApi.compareAudits(id1, id2);
      setCompareResult(result);
    } catch (e: any) {
      setCompareError(e.message || "Compare failed");
    } finally {
      setComparing(false);
    }
  };

  const card = {
    background: "rgba(15,23,42,0.75)",
    backdropFilter: "blur(16px)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "16px",
    padding: "24px",
    marginBottom: "20px",
  } as React.CSSProperties;

  return (
    <div>
      {/* Header */}
      <div
        style={{
          ...card,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "18px 24px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              width: "38px",
              height: "38px",
              borderRadius: "10px",
              background: "rgba(168,85,247,0.15)",
              border: "1px solid rgba(168,85,247,0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <History size={20} color="#a855f7" />
          </div>
          <div>
            <div
              style={{ fontSize: "16px", fontWeight: 700, color: "#f8fafc" }}
            >
              Audit History
            </div>
            <div style={{ fontSize: "12px", color: "#64748b", marginTop: "1px" }}>
              {audits.length} audit{audits.length !== 1 ? "s" : ""} recorded
              {selected.size === 2 && " — 2 selected for comparison"}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          {selected.size === 2 && (
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
                background: comparing
                  ? "rgba(168,85,247,0.1)"
                  : "rgba(168,85,247,0.2)",
                border: "1px solid rgba(168,85,247,0.4)",
                color: "#c084fc",
                cursor: comparing ? "not-allowed" : "pointer",
                transition: "all 0.15s ease",
              }}
            >
              <GitCompare size={15} />
              {comparing ? "Comparing…" : "Compare Selected"}
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
              background: "rgba(56,189,248,0.1)",
              border: "1px solid rgba(56,189,248,0.25)",
              color: "#38bdf8",
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

      {/* Select hint */}
      {audits.length > 0 && selected.size < 2 && (
        <div
          style={{
            fontSize: "12px",
            color: "#64748b",
            marginBottom: "14px",
            padding: "0 4px",
          }}
        >
          💡 Click any two rows to compare audits side-by-side
        </div>
      )}

      {/* Error */}
      {error && (
        <div
          style={{
            ...card,
            background: "rgba(244,63,94,0.08)",
            border: "1px solid rgba(244,63,94,0.3)",
            padding: "14px 20px",
            color: "#f87171",
            fontSize: "13px",
            display: "flex",
            gap: "10px",
            alignItems: "center",
          }}
        >
          <XCircle size={16} />
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div
          style={{
            ...card,
            textAlign: "center",
            padding: "40px",
            color: "#64748b",
            fontSize: "14px",
          }}
        >
          <RefreshCw
            size={24}
            style={{
              animation: "spin 1s linear infinite",
              marginBottom: "12px",
              color: "#38bdf8",
            }}
          />
          <div>Loading audit history…</div>
        </div>
      )}

      {/* Empty */}
      {!loading && !error && audits.length === 0 && (
        <div
          style={{
            ...card,
            textAlign: "center",
            padding: "60px 20px",
            color: "#64748b",
          }}
        >
          <History size={36} style={{ marginBottom: "16px", opacity: 0.4 }} />
          <div style={{ fontSize: "15px", fontWeight: 600, marginBottom: "6px" }}>
            No audits yet
          </div>
          <div style={{ fontSize: "13px" }}>
            Run your first audit and it will appear here.
          </div>
        </div>
      )}

      {/* Audit Table */}
      {!loading && audits.length > 0 && (
        <div style={card}>
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "13px",
              }}
            >
              <thead>
                <tr
                  style={{
                    borderBottom: "1px solid rgba(255,255,255,0.07)",
                  }}
                >
                  {[
                    "",
                    "Repository",
                    "Score",
                    "Rating",
                    "Findings",
                    "Type",
                    "Completed",
                    "",
                  ].map((h, i) => (
                    <th
                      key={i}
                      style={{
                        textAlign: "left",
                        padding: "10px 12px",
                        color: "#64748b",
                        fontWeight: 600,
                        fontSize: "11px",
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {audits.map((audit, idx) => {
                  const isSelected = selected.has(audit.audit_id);
                  const isCurrent = audit.audit_id === currentAuditId;
                  return (
                    <tr
                      key={audit.audit_id}
                      onClick={() => toggleSelect(audit.audit_id)}
                      style={{
                        borderBottom:
                          idx < audits.length - 1
                            ? "1px solid rgba(255,255,255,0.04)"
                            : "none",
                        background: isSelected
                          ? "rgba(168,85,247,0.08)"
                          : isCurrent
                          ? "rgba(56,189,248,0.05)"
                          : "transparent",
                        cursor: "pointer",
                        transition: "background 0.15s ease",
                      }}
                    >
                      {/* Checkbox */}
                      <td style={{ padding: "12px 12px" }}>
                        <div
                          style={{
                            width: "18px",
                            height: "18px",
                            borderRadius: "5px",
                            border: isSelected
                              ? "1.5px solid #a855f7"
                              : "1.5px solid rgba(255,255,255,0.15)",
                            background: isSelected
                              ? "rgba(168,85,247,0.3)"
                              : "transparent",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            transition: "all 0.15s",
                          }}
                        >
                          {isSelected && (
                            <CheckCircle2 size={12} color="#c084fc" />
                          )}
                        </div>
                      </td>

                      {/* Repo */}
                      <td style={{ padding: "12px 12px" }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                          }}
                        >
                          <FolderOpen
                            size={14}
                            color={isCurrent ? "#38bdf8" : "#64748b"}
                          />
                          <div>
                            <div
                              style={{
                                fontWeight: 600,
                                color: isCurrent ? "#38bdf8" : "#f8fafc",
                                maxWidth: "200px",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {shortRepo(audit.repo_path)}
                            </div>
                            <div
                              style={{
                                fontSize: "11px",
                                color: "#475569",
                                fontFamily: "JetBrains Mono, monospace",
                                maxWidth: "200px",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {audit.audit_id.slice(0, 16)}…
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Score */}
                      <td style={{ padding: "12px 12px" }}>
                        {audit.overall_score != null ? (
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "6px",
                            }}
                          >
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
                            <span style={{ color: "#475569", fontSize: "11px" }}>
                              /100
                            </span>
                          </div>
                        ) : (
                          <span style={{ color: "#475569" }}>—</span>
                        )}
                      </td>

                      {/* Rating */}
                      <td style={{ padding: "12px 12px" }}>
                        {ratingBadge(audit.rating)}
                      </td>

                      {/* Findings */}
                      <td style={{ padding: "12px 12px" }}>
                        <span
                          style={{
                            fontSize: "13px",
                            fontWeight: 600,
                            color:
                              (audit.total_findings ?? 0) > 0
                                ? "#f87171"
                                : "#34d399",
                          }}
                        >
                          {audit.total_findings ?? 0}
                        </span>
                      </td>

                      {/* Type */}
                      <td style={{ padding: "12px 12px" }}>
                        {audit.incremental ? (
                          <span
                            style={{
                              fontSize: "11px",
                              fontWeight: 600,
                              padding: "2px 8px",
                              borderRadius: "9999px",
                              background: "rgba(16,185,129,0.12)",
                              color: "#34d399",
                              border: "1px solid rgba(16,185,129,0.25)",
                            }}
                          >
                            ⚡ Incremental
                          </span>
                        ) : (
                          <span
                            style={{
                              fontSize: "11px",
                              fontWeight: 600,
                              padding: "2px 8px",
                              borderRadius: "9999px",
                              background: "rgba(56,189,248,0.1)",
                              color: "#7dd3fc",
                              border: "1px solid rgba(56,189,248,0.2)",
                            }}
                          >
                            Full Scan
                          </span>
                        )}
                      </td>

                      {/* Date */}
                      <td
                        style={{
                          padding: "12px 12px",
                          color: "#64748b",
                          fontSize: "12px",
                          whiteSpace: "nowrap",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "5px",
                          }}
                        >
                          <Clock size={12} />
                          {formatDate(audit.completed_at || audit.created_at)}
                        </div>
                      </td>

                      {/* Action */}
                      <td style={{ padding: "12px 12px" }}>
                        {onLoadAudit && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onLoadAudit(audit.audit_id);
                            }}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "4px",
                              padding: "5px 10px",
                              borderRadius: "7px",
                              fontSize: "11px",
                              fontWeight: 600,
                              background: "rgba(56,189,248,0.1)",
                              border: "1px solid rgba(56,189,248,0.2)",
                              color: "#38bdf8",
                              cursor: "pointer",
                              whiteSpace: "nowrap",
                            }}
                          >
                            View <ArrowRight size={11} />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Compare Result */}
      {compareResult && (
        <div style={card}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              marginBottom: "20px",
              paddingBottom: "16px",
              borderBottom: "1px solid rgba(255,255,255,0.07)",
            }}
          >
            <GitCompare size={18} color="#a855f7" />
            <span style={{ fontSize: "15px", fontWeight: 700, color: "#f8fafc" }}>
              Comparison Result
            </span>
            <span
              style={{
                display: "flex",
                alignItems: "center",
                gap: "5px",
                fontSize: "14px",
                fontWeight: 700,
                color:
                  compareResult.score_delta > 0
                    ? "#10b981"
                    : compareResult.score_delta < 0
                    ? "#f43f5e"
                    : "#64748b",
                marginLeft: "auto",
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
              {compareResult.score_delta.toFixed(1)} score delta
            </span>
          </div>

          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px" }}
          >
            {[
              {
                label: "New Findings",
                items: compareResult.new_findings,
                color: "#f43f5e",
                bg: "rgba(244,63,94,0.08)",
                icon: <AlertTriangle size={14} />,
              },
              {
                label: "Resolved",
                items: compareResult.resolved_findings,
                color: "#10b981",
                bg: "rgba(16,185,129,0.08)",
                icon: <CheckCircle2 size={14} />,
              },
              {
                label: "Persisting",
                items: compareResult.persisting_findings,
                color: "#f59e0b",
                bg: "rgba(245,158,11,0.08)",
                icon: <Zap size={14} />,
              },
            ].map(({ label, items, color, bg, icon }) => (
              <div
                key={label}
                style={{
                  background: bg,
                  borderRadius: "12px",
                  padding: "16px",
                  border: `1px solid ${color}30`,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    marginBottom: "12px",
                  }}
                >
                  <span style={{ color }}>{icon}</span>
                  <span style={{ fontWeight: 700, fontSize: "13px", color }}>
                    {label}
                  </span>
                  <span
                    style={{
                      marginLeft: "auto",
                      fontSize: "18px",
                      fontWeight: 800,
                      color,
                    }}
                  >
                    {items.length}
                  </span>
                </div>
                {items.slice(0, 4).map((f) => (
                  <div
                    key={f.id}
                    style={{
                      fontSize: "11px",
                      color: "#94a3b8",
                      padding: "5px 0",
                      borderBottom: "1px solid rgba(255,255,255,0.04)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {f.title}
                  </div>
                ))}
                {items.length > 4 && (
                  <div
                    style={{
                      fontSize: "11px",
                      color: "#475569",
                      marginTop: "5px",
                    }}
                  >
                    +{items.length - 4} more
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {compareError && (
        <div
          style={{
            ...card,
            background: "rgba(244,63,94,0.08)",
            border: "1px solid rgba(244,63,94,0.3)",
            padding: "14px 20px",
            color: "#f87171",
            fontSize: "13px",
            display: "flex",
            gap: "10px",
            alignItems: "center",
          }}
        >
          <XCircle size={16} />
          {compareError}
        </div>
      )}
    </div>
  );
};
