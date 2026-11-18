import React, { useState } from "react";
import { AuditStatus, Finding } from "../api/client";
import { FindingEvidenceModal } from "./FindingEvidenceModal";
import {
  ShieldAlert,
  BarChart3,
  Globe2,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Clock,
  FolderOpen,
  ArrowRight,
  TrendingUp,
} from "lucide-react";

interface OverviewDashboardProps {
  status: AuditStatus;
  findings: Finding[];
  onNavigateTab: (tab: "graph" | "score" | "findings" | "negspace" | "reports") => void;
  darkMode: boolean;
  auditId?: string;
  onViewInGraph?: (file: string) => void;
}

const scoreColor = (score?: number) => {
  if (score === undefined || score === null) return "#64748b";
  if (score >= 90) return "#10b981";
  if (score >= 75) return "#38bdf8";
  if (score >= 60) return "#f59e0b";
  return "#f43f5e";
};

export const OverviewDashboard: React.FC<OverviewDashboardProps> = ({
  status,
  findings,
  onNavigateTab,
  darkMode,
  auditId,
  onViewInGraph,
}) => {
  const [evidenceFinding, setEvidenceFinding] = useState<Finding | null>(null);
  const cyan = darkMode ? "#38bdf8" : "#0284c7";
  const purple = darkMode ? "#a855f7" : "#7c3aed";
  const emerald = darkMode ? "#10b981" : "#059669";
  const rose = darkMode ? "#f43f5e" : "#dc2626";
  const amber = darkMode ? "#f59e0b" : "#d97706";
  const textPrimary = darkMode ? "#f8fafc" : "#0f172a";
  const textSecondary = darkMode ? "#94a3b8" : "#475569";
  const textMuted = darkMode ? "#64748b" : "#94a3b8";

  const cardStyle: React.CSSProperties = {
    background: darkMode ? "rgba(15, 23, 42, 0.75)" : "#ffffff",
    backdropFilter: "blur(16px)",
    border: darkMode ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid #e2e8f0",
    borderRadius: "16px",
    padding: "22px",
    boxShadow: darkMode ? "0 4px 20px rgba(0, 0, 0, 0.2)" : "0 4px 16px rgba(0, 0, 0, 0.04)",
  };

  const criticalCount = findings.filter((f) => f.severity === "critical").length;
  const highCount = findings.filter((f) => f.severity === "high").length;
  const mediumCount = findings.filter((f) => f.severity === "medium").length;
  const lowCount = findings.filter((f) => f.severity === "low" || f.severity === "info").length;

  const repoName = status.repo_path ? status.repo_path.split(/[/\\]/).pop() : "Repository";

  const topCriticalFindings = findings
    .filter((f) => f.severity === "critical" || f.severity === "high")
    .slice(0, 4);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Top Banner: Repo & Summary */}
      <div
        style={{
          ...cardStyle,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "16px",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
            <FolderOpen size={18} color={cyan} />
            <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: textPrimary }}>
              {repoName}
            </h2>
            <span
              style={{
                fontSize: "11px",
                fontWeight: 700,
                padding: "2px 8px",
                borderRadius: "9999px",
                background: "rgba(16, 185, 129, 0.15)",
                color: emerald,
                border: "1px solid rgba(16, 185, 129, 0.3)",
              }}
            >
              Audit Completed
            </span>
          </div>
          <div style={{ fontSize: "12px", color: textMuted, fontFamily: "JetBrains Mono, monospace" }}>
            {status.repo_path}
          </div>
        </div>

        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <button
            onClick={() => onNavigateTab("findings")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "8px 16px",
              borderRadius: "10px",
              fontSize: "13px",
              fontWeight: 600,
              background: "rgba(56, 189, 248, 0.12)",
              border: `1px solid ${cyan}44`,
              color: cyan,
              cursor: "pointer",
            }}
          >
            <span>Inspect Findings</span>
            <ArrowRight size={14} />
          </button>
          <button
            onClick={() => onNavigateTab("graph")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "8px 16px",
              borderRadius: "10px",
              fontSize: "13px",
              fontWeight: 600,
              background: "rgba(168, 85, 247, 0.12)",
              border: `1px solid ${purple}44`,
              color: purple,
              cursor: "pointer",
            }}
          >
            <Globe2 size={14} />
            <span>3D Consistency Map</span>
          </button>
        </div>
      </div>

      {/* 4 Score Dimension Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: "16px",
        }}
      >
        {/* Overall Score Card */}
        <div
          style={{
            ...cardStyle,
            borderLeft: `4px solid ${scoreColor(status.overall_score)}`,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div style={{ fontSize: "12px", fontWeight: 700, color: textMuted, textTransform: "uppercase" }}>
              Overall Integrity Score
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: "6px", marginTop: "8px" }}>
              <span
                style={{
                  fontSize: "36px",
                  fontWeight: 800,
                  color: scoreColor(status.overall_score),
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {status.overall_score != null ? status.overall_score.toFixed(1) : "—"}
              </span>
              <span style={{ fontSize: "14px", color: textMuted }}>/ 100</span>
            </div>
          </div>
          <div style={{ marginTop: "12px", fontSize: "12px", fontWeight: 600, color: emerald }}>
            Rating: {status.rating || "Excellent"}
          </div>
        </div>

        {/* Security Risk (40%) */}
        <div style={cardStyle}>
          <div style={{ fontSize: "12px", fontWeight: 700, color: textMuted, textTransform: "uppercase" }}>
            Security Risk (40%)
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: "6px", marginTop: "8px" }}>
            <span
              style={{
                fontSize: "28px",
                fontWeight: 800,
                color: scoreColor(status.security_risk_score),
              }}
            >
              {status.security_risk_score != null ? status.security_risk_score.toFixed(1) : "100.0"}
            </span>
            <span style={{ fontSize: "12px", color: textMuted }}>/ 100</span>
          </div>
          <div style={{ marginTop: "8px", fontSize: "11px", color: textSecondary }}>
            {criticalCount} critical, {highCount} high vulnerabilities detected
          </div>
        </div>

        {/* Implementation Completeness (30%) */}
        <div style={cardStyle}>
          <div style={{ fontSize: "12px", fontWeight: 700, color: textMuted, textTransform: "uppercase" }}>
            Completeness (30%)
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: "6px", marginTop: "8px" }}>
            <span
              style={{
                fontSize: "28px",
                fontWeight: 800,
                color: scoreColor(status.implementation_completeness_score),
              }}
            >
              {status.implementation_completeness_score != null
                ? status.implementation_completeness_score.toFixed(1)
                : "100.0"}
            </span>
            <span style={{ fontSize: "12px", color: textMuted }}>/ 100</span>
          </div>
          <div style={{ marginTop: "8px", fontSize: "11px", color: textSecondary }}>
            Negative-space gaps, dangling routes &amp; mock stubs
          </div>
        </div>

        {/* Code Quality & Hygiene (30%) */}
        <div style={cardStyle}>
          <div style={{ fontSize: "12px", fontWeight: 700, color: textMuted, textTransform: "uppercase" }}>
            Quality &amp; Hygiene (30%)
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: "6px", marginTop: "8px" }}>
            <span
              style={{
                fontSize: "28px",
                fontWeight: 800,
                color: scoreColor(
                  status.code_quality_score && status.development_hygiene_score
                    ? (status.code_quality_score * 0.2 + status.development_hygiene_score * 0.1) / 0.3
                    : 100
                ),
              }}
            >
              {status.code_quality_score != null
                ? (status.code_quality_score * 0.67 + (status.development_hygiene_score || 100) * 0.33).toFixed(1)
                : "100.0"}
            </span>
            <span style={{ fontSize: "12px", color: textMuted }}>/ 100</span>
          </div>
          <div style={{ marginTop: "8px", fontSize: "11px", color: textSecondary }}>
            Redundant code, blind exceptions &amp; loose ends
          </div>
        </div>
      </div>

      {/* Severity Breakdown Bar + Top Findings */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
        {/* Severity Distribution */}
        <div style={cardStyle}>
          <div style={{ fontSize: "14px", fontWeight: 700, color: textPrimary, marginBottom: "16px" }}>
            Findings by Severity ({findings.length} total)
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {[
              { label: "Critical", count: criticalCount, color: rose, bg: `${rose}18` },
              { label: "High", count: highCount, color: amber, bg: `${amber}18` },
              { label: "Medium", count: mediumCount, color: cyan, bg: `${cyan}18` },
              { label: "Low / Info", count: lowCount, color: emerald, bg: `${emerald}18` },
            ].map((sev) => {
              const pct = findings.length > 0 ? (sev.count / findings.length) * 100 : 0;
              return (
                <div key={sev.label}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: "12px",
                      marginBottom: "4px",
                    }}
                  >
                    <span style={{ fontWeight: 600, color: textSecondary }}>{sev.label}</span>
                    <span style={{ fontWeight: 700, color: sev.color }}>
                      {sev.count} ({pct.toFixed(0)}%)
                    </span>
                  </div>
                  <div
                    style={{
                      height: "6px",
                      borderRadius: "3px",
                      background: darkMode ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.06)",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${pct}%`,
                        height: "100%",
                        background: sev.color,
                        borderRadius: "3px",
                        transition: "width 0.4s ease",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Priority Findings to Address */}
        <div style={cardStyle}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "14px",
            }}
          >
            <span style={{ fontSize: "14px", fontWeight: 700, color: textPrimary }}>
              Critical &amp; High Findings
            </span>
            <button
              onClick={() => onNavigateTab("findings")}
              style={{
                fontSize: "12px",
                color: cyan,
                background: "transparent",
                border: "none",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              View all ({findings.length}) →
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {topCriticalFindings.length === 0 ? (
              <div style={{ fontSize: "13px", color: emerald, padding: "20px 0", textAlign: "center" }}>
                <CheckCircle2 size={24} style={{ marginBottom: "6px", display: "inline-block" }} />
                <div>No critical or high findings detected!</div>
              </div>
            ) : (
              topCriticalFindings.map((f) => (
                <div
                  key={f.id}
                  onClick={() => setEvidenceFinding(f)}
                  style={{
                    padding: "10px 12px",
                    borderRadius: "8px",
                    background: darkMode ? "rgba(255, 255, 255, 0.03)" : "rgba(0, 0, 0, 0.02)",
                    border: darkMode ? "1px solid rgba(255, 255, 255, 0.05)" : "1px solid rgba(0, 0, 0, 0.05)",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "10px",
                    transition: "transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLDivElement).style.transform = "scale(1.01)";
                    (e.currentTarget as HTMLDivElement).style.boxShadow = `0 0 12px ${f.severity === "critical" ? "rgba(244,63,94,0.25)" : "rgba(249,115,22,0.25)"}`;
                    (e.currentTarget as HTMLDivElement).style.borderColor = f.severity === "critical" ? "rgba(244,63,94,0.4)" : "rgba(249,115,22,0.4)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLDivElement).style.transform = "scale(1)";
                    (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
                    (e.currentTarget as HTMLDivElement).style.borderColor = darkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)";
                  }}
                >
                  <div style={{ overflow: "hidden" }}>
                    <div
                      style={{
                        fontSize: "12px",
                        fontWeight: 600,
                        color: textPrimary,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {f.title}
                    </div>
                    <div
                      style={{
                        fontSize: "11px",
                        color: textMuted,
                        fontFamily: "JetBrains Mono, monospace",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {f.affected_file}:{f.line_number}
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: "10px",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      padding: "2px 6px",
                      borderRadius: "4px",
                      background: f.severity === "critical" ? `${rose}22` : `${amber}22`,
                      color: f.severity === "critical" ? rose : amber,
                      border: `1px solid ${f.severity === "critical" ? rose : amber}44`,
                      flexShrink: 0,
                    }}
                  >
                    {f.severity}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Source Code Evidence Explorer Modal */}
      {evidenceFinding && (
        <FindingEvidenceModal
          auditId={auditId || status.audit_id || ""}
          finding={evidenceFinding}
          onClose={() => setEvidenceFinding(null)}
          onViewInGraph={onViewInGraph}
          darkMode={darkMode}
        />
      )}
    </div>
  );
};
