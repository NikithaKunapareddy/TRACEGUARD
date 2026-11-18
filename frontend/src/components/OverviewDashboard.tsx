import React, { useState } from "react";
import { AuditStatus, Finding } from "../api/client";
import { FindingEvidenceModal } from "./FindingEvidenceModal";
import {
  Globe2,
  CheckCircle2,
  FolderOpen,
  ArrowRight,
  ShieldAlert,
  Puzzle,
  Code2,
  Sparkles,
  FileCode,
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
  if (score >= 75) return "#3b82f6";
  if (score >= 60) return "#eab308";
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
  const textPrimary = darkMode ? "#f8fafc" : "#0f172a";
  const textSecondary = darkMode ? "#cbd5e1" : "#334155";
  const textMuted = darkMode ? "#94a3b8" : "#64748b";

  const criticalCount = findings.filter((f) => f.severity === "critical").length;
  const highCount = findings.filter((f) => f.severity === "high").length;
  const mediumCount = findings.filter((f) => f.severity === "medium").length;
  const lowCount = findings.filter((f) => f.severity === "low" || f.severity === "info").length;

  const topCriticalFindings = findings
    .filter((f) => f.severity === "critical" || f.severity === "high")
    .slice(0, 5);

  const overall = status.overall_score ?? 100;
  const qualityCombined =
    status.code_quality_score != null
      ? status.code_quality_score * 0.67 + (status.development_hygiene_score || 100) * 0.33
      : 100;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
      {/* ====================================================================
          1. SPECTRAL 4-AXIS METRIC LENSES (Soft VIBGYOR Prism Interiors)
         ==================================================================== */}
      <div
        className="overview-metrics-grid animate-reveal"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: "18px",
        }}
      >
        {/* Overall Score Lens */}
        <div
          onClick={() => onNavigateTab("score")}
          className="vibgyor-prism-surface vib-tint-violet"
          style={{
            padding: "24px",
            borderRadius: "28px",
            cursor: "pointer",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "10px",
              }}
            >
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 800,
                  color: "#8b5cf6",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                }}
              >
                Composite Integrity
              </span>
              <span
                style={{
                  fontSize: "10.5px",
                  fontWeight: 800,
                  padding: "2px 10px",
                  borderRadius: "9999px",
                  background: `${scoreColor(overall)}22`,
                  color: scoreColor(overall),
                }}
              >
                {status.rating || "EXCELLENT"}
              </span>
            </div>

            <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
              <span
                style={{
                  fontSize: "42px",
                  fontWeight: 800,
                  color: scoreColor(overall),
                  letterSpacing: "-0.03em",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {overall.toFixed(1)}
              </span>
              <span style={{ fontSize: "14px", color: textMuted, fontWeight: 600 }}>/ 100</span>
            </div>
          </div>
          <div style={{ marginTop: "12px", fontSize: "12px", color: textSecondary }}>
            Weighted across 4 deterministic axes →
          </div>
        </div>

        {/* Security Risk (40%) */}
        <div
          onClick={() => onNavigateTab("findings")}
          className="vibgyor-prism-surface vib-tint-red"
          style={{
            padding: "24px",
            borderRadius: "28px",
            cursor: "pointer",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
              <span style={{ fontSize: "11px", fontWeight: 800, color: "#f43f5e", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Security Risk (40%)
              </span>
              <ShieldAlert size={16} color="#f43f5e" />
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
              <span
                style={{
                  fontSize: "34px",
                  fontWeight: 800,
                  color: scoreColor(status.security_risk_score),
                  letterSpacing: "-0.03em",
                }}
              >
                {status.security_risk_score != null ? status.security_risk_score.toFixed(1) : "100.0"}
              </span>
              <span style={{ fontSize: "13px", color: textMuted }}>/ 100</span>
            </div>
          </div>
          <div style={{ marginTop: "12px", fontSize: "12px", color: textSecondary }}>
            {criticalCount} critical · {highCount} high vulnerabilities
          </div>
        </div>

        {/* Implementation Completeness (30%) */}
        <div
          onClick={() => onNavigateTab("negspace")}
          className="vibgyor-prism-surface vib-tint-orange"
          style={{
            padding: "24px",
            borderRadius: "28px",
            cursor: "pointer",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
              <span style={{ fontSize: "11px", fontWeight: 800, color: "#f97316", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Completeness (30%)
              </span>
              <Puzzle size={16} color="#f97316" />
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
              <span
                style={{
                  fontSize: "34px",
                  fontWeight: 800,
                  color: scoreColor(status.implementation_completeness_score),
                  letterSpacing: "-0.03em",
                }}
              >
                {status.implementation_completeness_score != null
                  ? status.implementation_completeness_score.toFixed(1)
                  : "100.0"}
              </span>
              <span style={{ fontSize: "13px", color: textMuted }}>/ 100</span>
            </div>
          </div>
          <div style={{ marginTop: "12px", fontSize: "12px", color: textSecondary }}>
            Negative-space gaps &amp; mock stubs
          </div>
        </div>

        {/* Code Quality & Hygiene (30%) */}
        <div
          onClick={() => onNavigateTab("findings")}
          className="vibgyor-prism-surface vib-tint-green"
          style={{
            padding: "24px",
            borderRadius: "28px",
            cursor: "pointer",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
              <span style={{ fontSize: "11px", fontWeight: 800, color: "#10b981", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Quality &amp; Hygiene (30%)
              </span>
              <Code2 size={16} color="#10b981" />
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
              <span
                style={{
                  fontSize: "34px",
                  fontWeight: 800,
                  color: scoreColor(qualityCombined),
                  letterSpacing: "-0.03em",
                }}
              >
                {qualityCombined.toFixed(1)}
              </span>
              <span style={{ fontSize: "13px", color: textMuted }}>/ 100</span>
            </div>
          </div>
          <div style={{ marginTop: "12px", fontSize: "12px", color: textSecondary }}>
            Slop elimination &amp; exception hygiene
          </div>
        </div>
      </div>

      {/* ====================================================================
          2. SEVERITY SPECTRUM STREAM & PRIORITY EVIDENCE LENSES
         ==================================================================== */}
      <div
        className="overview-split-grid animate-reveal-delay-1"
        style={{
          display: "grid",
          gridTemplateColumns: "0.9fr 1.1fr",
          gap: "24px",
          alignItems: "start",
        }}
      >
        {/* Left: VIBGYOR Severity Distribution Lens */}
        <div className="vibgyor-prism-surface" style={{ padding: "28px", borderRadius: "30px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "22px" }}>
            <div>
              <div style={{ fontSize: "11px", fontWeight: 800, color: "#3b82f6", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Spectrum Distribution
              </div>
              <h3 style={{ margin: "4px 0 0 0", fontSize: "19px", fontWeight: 800, color: textPrimary }}>
                {findings.length} Total Findings
              </h3>
            </div>
            <button
              onClick={() => onNavigateTab("graph")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 14px",
                borderRadius: "9999px",
                fontSize: "12px",
                fontWeight: 700,
                background: "rgba(139, 92, 246, 0.14)",
                color: "#8b5cf6",
                border: "none",
                cursor: "pointer",
              }}
            >
              <Globe2 size={14} />
              <span>Open Topology</span>
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {[
              { label: "Critical Severity", count: criticalCount, color: "#f43f5e" },
              { label: "High Severity", count: highCount, color: "#f97316" },
              { label: "Medium Severity", count: mediumCount, color: "#eab308" },
              { label: "Low & Informational", count: lowCount, color: "#10b981" },
            ].map((sev) => {
              const pct = findings.length > 0 ? (sev.count / findings.length) * 100 : 0;
              return (
                <div key={sev.label}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: "13px",
                      marginBottom: "6px",
                    }}
                  >
                    <span style={{ fontWeight: 700, color: textSecondary }}>{sev.label}</span>
                    <span style={{ fontWeight: 800, color: sev.color }}>
                      {sev.count} ({pct.toFixed(0)}%)
                    </span>
                  </div>
                  <div
                    style={{
                      height: "8px",
                      borderRadius: "9999px",
                      background: darkMode ? "rgba(255, 255, 255, 0.06)" : "rgba(15, 23, 42, 0.06)",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${pct}%`,
                        height: "100%",
                        background: `linear-gradient(90deg, ${sev.color}99, ${sev.color})`,
                        borderRadius: "9999px",
                        transition: "width 0.6s cubic-bezier(0.16, 1, 0.3, 1)",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Priority Findings Stream */}
        <div className="vibgyor-prism-surface" style={{ padding: "28px", borderRadius: "30px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "18px",
            }}
          >
            <div>
              <div style={{ fontSize: "11px", fontWeight: 800, color: "#f43f5e", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Immediate Remediation Stream
              </div>
              <h3 style={{ margin: "4px 0 0 0", fontSize: "19px", fontWeight: 800, color: textPrimary }}>
                Critical &amp; High Priority Evidence
              </h3>
            </div>
            <button
              onClick={() => onNavigateTab("findings")}
              style={{
                fontSize: "12.5px",
                color: "#8b5cf6",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                fontWeight: 700,
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <span>Inspect All ({findings.length})</span>
              <ArrowRight size={14} />
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {topCriticalFindings.length === 0 ? (
              <div style={{ fontSize: "13.5px", color: "#10b981", padding: "28px 0", textAlign: "center" }}>
                <CheckCircle2 size={28} style={{ marginBottom: "8px", display: "inline-block" }} />
                <div style={{ fontWeight: 700 }}>Zero critical or high defects detected!</div>
              </div>
            ) : (
              topCriticalFindings.map((f, idx) => {
                const isCrit = f.severity === "critical";
                const accent = isCrit ? "#f43f5e" : "#f97316";
                const tint = isCrit ? "vib-tint-red" : "vib-tint-orange";
                return (
                  <div
                    key={f.id || idx}
                    onClick={() => setEvidenceFinding(f)}
                    className={`vibgyor-prism-surface ${tint}`}
                    style={{
                      padding: "14px 18px",
                      borderRadius: "20px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "12px",
                    }}
                  >
                    <div style={{ overflow: "hidden" }}>
                      <div
                        style={{
                          fontSize: "13.5px",
                          fontWeight: 700,
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
                          fontSize: "11.5px",
                          color: textMuted,
                          fontFamily: "JetBrains Mono, monospace",
                          marginTop: "2px",
                        }}
                      >
                        {f.affected_file}:{f.line_number}
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                      <span
                        style={{
                          fontSize: "10px",
                          fontWeight: 800,
                          textTransform: "uppercase",
                          padding: "3px 9px",
                          borderRadius: "9999px",
                          background: `${accent}22`,
                          color: accent,
                        }}
                      >
                        {f.severity}
                      </span>
                      <FileCode size={15} color={accent} />
                    </div>
                  </div>
                );
              })
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
