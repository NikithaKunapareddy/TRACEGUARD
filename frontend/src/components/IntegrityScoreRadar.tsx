import React from "react";
import { AuditStatus } from "../api/client";
import { ShieldAlert, Cpu, Layers, GitBranch, Sparkles } from "lucide-react";

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
  const textPrimary = darkMode ? "#f8fafc" : "#0f172a";
  const textSecondary = darkMode ? "#cbd5e1" : "#334155";
  const textMuted = darkMode ? "#94a3b8" : "#64748b";
  const trackBg = darkMode ? "rgba(255, 255, 255, 0.07)" : "rgba(15, 23, 42, 0.07)";

  const score = status.overall_score ?? 100;
  const rating = status.rating || "EXCELLENT";

  const getScoreColor = (val: number) => {
    if (val >= 90) return "#10b981";
    if (val >= 80) return "#3b82f6";
    if (val >= 70) return "#eab308";
    return "#f43f5e";
  };

  const scoreColor = getScoreColor(score);
  const radius = 74;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  const dimensions = [
    {
      name: "Security Risk Posture",
      weight: "40%",
      score: status.security_risk_score ?? 100,
      icon: ShieldAlert,
      color: "#f43f5e",
      tintClass: "vib-tint-red",
      desc: "Cross-file taint flows, SQL injections, secret exposures & unauthenticated endpoints",
    },
    {
      name: "Implementation Completeness",
      weight: "30%",
      score: status.implementation_completeness_score ?? 100,
      icon: Layers,
      color: "#8b5cf6",
      tintClass: "vib-tint-violet",
      desc: "Negative-space analysis: dangling client calls, missing routes & mock stubs",
    },
    {
      name: "Code Quality & Cleanliness",
      weight: "20%",
      score: status.code_quality_score ?? 100,
      icon: Cpu,
      color: "#3b82f6",
      tintClass: "vib-tint-blue",
      desc: "Code slop elimination, dead controller logic & redundant wrapper abstractions",
    },
    {
      name: "Development Hygiene",
      weight: "10%",
      score: status.development_hygiene_score ?? 100,
      icon: GitBranch,
      color: "#10b981",
      tintClass: "vib-tint-green",
      desc: "Exception handling discipline, debug artifact removal & contract alignment",
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "28px", marginBottom: "32px" }}>
      {/* Centerpiece Spectral Orb + 4-Axis Stream */}
      <div
        className="vibgyor-prism-surface radar-hero-grid animate-reveal"
        style={{
          padding: "34px",
          borderRadius: "34px",
          display: "grid",
          gridTemplateColumns: "260px 1fr",
          gap: "36px",
          alignItems: "center",
        }}
      >
        {/* Multi-Ring VIBGYOR Radial Gauge */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
          }}
        >
          <svg width="190" height="190" style={{ transform: "rotate(-90deg)" }}>
            <defs>
              <linearGradient id="vibgyorGaugeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#8b5cf6" />
                <stop offset="35%" stopColor="#3b82f6" />
                <stop offset="70%" stopColor="#10b981" />
                <stop offset="100%" stopColor="#f97316" />
              </linearGradient>
            </defs>
            <circle
              cx="95"
              cy="95"
              r={radius}
              stroke={trackBg}
              strokeWidth="14"
              fill="transparent"
            />
            <circle
              cx="95"
              cy="95"
              r={radius}
              stroke="url(#vibgyorGaugeGrad)"
              strokeWidth="14"
              fill="transparent"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              style={{ transition: "stroke-dashoffset 1s cubic-bezier(0.16, 1, 0.3, 1)" }}
            />
          </svg>

          <div
            style={{
              position: "absolute",
              top: "45%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontSize: "42px",
                fontWeight: 800,
                color: textPrimary,
                lineHeight: 1,
                letterSpacing: "-0.04em",
              }}
            >
              {score.toFixed(1)}
            </div>
            <div style={{ fontSize: "11px", color: textMuted, fontWeight: 700, marginTop: "4px" }}>
              INTEGRITY INDEX
            </div>
          </div>

          <div
            style={{
              marginTop: "14px",
              padding: "5px 16px",
              borderRadius: "9999px",
              background: `${scoreColor}20`,
              color: scoreColor,
              fontWeight: 800,
              fontSize: "12px",
              letterSpacing: "0.06em",
            }}
          >
            {rating}
          </div>
        </div>

        {/* Right: Flowing Dimension Lenses */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "10px", marginBottom: "20px" }}>
            <div>
              <div style={{ fontSize: "11px", fontWeight: 800, color: "#8b5cf6", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "4px" }}>
                Four-Dimensional Telemetry
              </div>
              <h2 style={{ margin: 0, fontSize: "24px", color: textPrimary, fontWeight: 800, letterSpacing: "-0.03em" }}>
                Architectural Integrity Breakdown
              </h2>
              <p style={{ margin: "4px 0 0 0", color: textSecondary, fontSize: "13.5px" }}>
                {status.summary_verdict || "Evaluated deterministically across security, completeness, quality, and hygiene."}
              </p>
            </div>
            {executionTime && (
              <span style={{ fontSize: "12px", color: textMuted, fontWeight: 600 }}>
                Completed in {executionTime.toFixed(2)}s
              </span>
            )}
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: "14px",
            }}
          >
            {dimensions.map((dim) => {
              const Icon = dim.icon;
              return (
                <div
                  key={dim.name}
                  className={`vibgyor-prism-surface ${dim.tintClass}`}
                  style={{
                    padding: "18px 20px",
                    borderRadius: "22px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "8px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <Icon size={16} color={dim.color} />
                      <span style={{ fontWeight: 700, fontSize: "13.5px", color: textPrimary }}>
                        {dim.name}
                      </span>
                    </div>
                    <span style={{ fontWeight: 800, fontSize: "14px", color: dim.color }}>
                      {dim.score.toFixed(1)}
                    </span>
                  </div>

                  <div
                    style={{
                      height: "6px",
                      borderRadius: "9999px",
                      background: trackBg,
                      overflow: "hidden",
                      marginBottom: "8px",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${Math.min(100, Math.max(0, dim.score))}%`,
                        background: dim.color,
                        borderRadius: "9999px",
                        transition: "width 0.8s cubic-bezier(0.16, 1, 0.3, 1)",
                      }}
                    />
                  </div>

                  <div style={{ fontSize: "11.5px", color: textSecondary, lineHeight: 1.45 }}>
                    {dim.desc}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Subtle Floating Methodology Note */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "8px",
          fontSize: "12px",
          color: textMuted,
          textAlign: "center",
          padding: "0 16px",
        }}
      >
        <Sparkles size={14} color="#eab308" style={{ flexShrink: 0 }} />
        <span>
          {status.disclaimer ||
            "Deterministic Architectural Assessment: Scores reflect structural and consistency evidence verified in the repository AST."}
        </span>
      </div>
    </div>
  );
};
