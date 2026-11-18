import React from "react";
import { AuditStatus } from "../api/client";
import { ShieldCheck, ShieldAlert, Cpu, Layers, GitBranch, AlertTriangle } from "lucide-react";

interface IntegrityScoreRadarProps {
  status: AuditStatus;
  executionTime?: number;
  darkMode?: boolean;
}

export const IntegrityScoreRadar: React.FC<IntegrityScoreRadarProps> = ({
  status,
  executionTime,
  darkMode = true,
}) => {
  const panelBg = darkMode ? "rgba(15, 23, 42, 0.75)" : "#ffffff";
  const borderBase = darkMode ? "rgba(255, 255, 255, 0.08)" : "#e2e8f0";
  const textPrimary = darkMode ? "#f8fafc" : "#0f172a";
  const textSecondary = darkMode ? "#94a3b8" : "#475569";
  const textMuted = darkMode ? "#64748b" : "#94a3b8";
  const trackBg = darkMode ? "rgba(255, 255, 255, 0.06)" : "#f1f5f9";
  const disclaimerBg = darkMode ? "rgba(11, 17, 32, 0.6)" : "#fef3c720";
  const disclaimerBorder = darkMode ? "rgba(255, 255, 255, 0.05)" : "rgba(245, 158, 11, 0.25)";

  const score = status.overall_score ?? 100;
  const rating = status.rating || "EXCELLENT";

  const getScoreColor = (val: number) => {
    if (val >= 90) return "#10b981"; // Emerald
    if (val >= 80) return "#38bdf8"; // Cyan
    if (val >= 70) return "#f59e0b"; // Amber
    return "#f43f5e"; // Rose
  };

  const scoreColor = getScoreColor(score);
  const radius = 64;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  const dimensions = [
    {
      name: "Security Risk Score",
      weight: "40%",
      score: status.security_risk_score ?? 100,
      icon: ShieldAlert,
      color: "#f43f5e",
      desc: "SQL injections, secret exposures, sensitive unauthenticated endpoints",
    },
    {
      name: "Implementation Completeness",
      weight: "30%",
      score: status.implementation_completeness_score ?? 100,
      icon: Layers,
      color: "#a855f7",
      desc: "Negative-space analysis: missing routes, placeholder mock stubs",
    },
    {
      name: "Code Quality & Cleanliness",
      weight: "20%",
      score: status.code_quality_score ?? 100,
      icon: Cpu,
      color: "#38bdf8",
      desc: "Code slop, dead logic, redundant wrappers, blind exceptions",
    },
    {
      name: "Development Hygiene",
      weight: "10%",
      score: status.development_hygiene_score ?? 100,
      icon: GitBranch,
      color: "#10b981",
      desc: "TODO markers, debug print statements, untested endpoints",
    },
  ];

  return (
    <div
      style={{
        background: panelBg,
        backdropFilter: "blur(16px)",
        border: `1px solid ${borderBase}`,
        borderRadius: "16px",
        padding: "24px",
        marginBottom: "28px",
        boxShadow: darkMode ? "0 10px 30px rgba(0, 0, 0, 0.35)" : "0 4px 20px rgba(0, 0, 0, 0.05)",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "240px 1fr",
          gap: "32px",
          alignItems: "center",
        }}
      >
        {/* Radial Score Meter */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
          }}
        >
          <svg width="170" height="170" style={{ transform: "rotate(-90deg)" }}>
            <circle
              cx="85"
              cy="85"
              r={radius}
              stroke={trackBg}
              strokeWidth="12"
              fill="transparent"
            />
            <circle
              cx="85"
              cy="85"
              r={radius}
              stroke={scoreColor}
              strokeWidth="12"
              fill="transparent"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              style={{ transition: "stroke-dashoffset 1s ease-in-out" }}
            />
          </svg>

          {/* Inner Number */}
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -60%)",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "36px", fontWeight: 800, color: textPrimary, lineHeight: 1 }}>
              {score.toFixed(1)}
            </div>
            <div style={{ fontSize: "12px", color: textMuted, fontWeight: 600 }}>OVERALL</div>
          </div>

          {/* Rating Pill */}
          <div
            style={{
              marginTop: "12px",
              padding: "4px 14px",
              borderRadius: "9999px",
              background: `${scoreColor}15`,
              border: `1px solid ${scoreColor}40`,
              color: scoreColor,
              fontWeight: 800,
              fontSize: "12px",
              letterSpacing: "0.5px",
            }}
          >
            {rating}
          </div>
        </div>

        {/* 4-Dimensional Metrics Bars */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px" }}>
            <div>
              <h2 style={{ margin: "0 0 4px 0", fontSize: "18px", color: textPrimary, fontWeight: 700 }}>
                Integrity Dimension Breakdown
              </h2>
              <p style={{ margin: 0, color: textSecondary, fontSize: "13px" }}>
                {status.summary_verdict || "Repository evaluated across 4 core engineering axes."}
              </p>
            </div>
            {executionTime && (
              <span style={{ fontSize: "12px", color: textMuted, fontWeight: 500 }}>
                Analyzed in {executionTime.toFixed(2)}s
              </span>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {dimensions.map((dim) => {
              const Icon = dim.icon;
              return (
                <div key={dim.name}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "6px",
                      fontSize: "13px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <Icon size={14} color={dim.color} />
                      <span style={{ fontWeight: 600, color: textPrimary }}>{dim.name}</span>
                      <span style={{ fontSize: "11px", color: textMuted }}>({dim.weight} weight)</span>
                    </div>
                    <span style={{ fontWeight: 700, color: dim.color }}>
                      {dim.score.toFixed(1)} / 100
                    </span>
                  </div>

                  {/* Progress track */}
                  <div
                    style={{
                      height: "8px",
                      borderRadius: "4px",
                      background: trackBg,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${Math.min(100, Math.max(0, dim.score))}%`,
                        background: `linear-gradient(90deg, ${dim.color}80, ${dim.color})`,
                        borderRadius: "4px",
                        transition: "width 0.8s ease-in-out",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Disclaimer Notice */}
      <div
        style={{
          marginTop: "20px",
          padding: "10px 16px",
          borderRadius: "8px",
          background: disclaimerBg,
          border: `1px solid ${disclaimerBorder}`,
          display: "flex",
          alignItems: "center",
          gap: "10px",
          fontSize: "12px",
          color: textSecondary,
        }}
      >
        <AlertTriangle size={15} color="#f59e0b" style={{ flexShrink: 0 }} />
        <span>
          {status.disclaimer ||
            "Heuristic Architectural Assessment: Scores reflect structural and consistency indicators based on available evidence, not an absolute security guarantee."}
        </span>
      </div>
    </div>
  );
};
