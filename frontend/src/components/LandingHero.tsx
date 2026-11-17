import React from "react";
import {
  Shield,
  Layers,
  Puzzle,
  Code2,
  ArrowRight,
  History,
  Sparkles,
  CheckCircle2,
} from "lucide-react";

interface LandingHeroProps {
  onStartAudit: () => void;
  onViewHistory: () => void;
  onExploreCapabilities: () => void;
  darkMode: boolean;
  totalAuditsCount?: number;
}

export const LandingHero: React.FC<LandingHeroProps> = ({
  onStartAudit,
  onViewHistory,
  onExploreCapabilities,
  darkMode,
  totalAuditsCount,
}) => {
  const cyan = darkMode ? "#38bdf8" : "#0284c7";
  const purple = darkMode ? "#a855f7" : "#7c3aed";
  const emerald = darkMode ? "#10b981" : "#059669";
  const amber = darkMode ? "#f59e0b" : "#d97706";
  const textPrimary = darkMode ? "#f8fafc" : "#0f172a";
  const textSecondary = darkMode ? "#94a3b8" : "#475569";
  const textMuted = darkMode ? "#64748b" : "#94a3b8";

  const capabilities = [
    {
      icon: <Shield size={14} color={cyan} />,
      label: "Security Intelligence",
      bg: `${cyan}18`,
      border: `${cyan}33`,
      color: cyan,
    },
    {
      icon: <Layers size={14} color={purple} />,
      label: "Architecture Intelligence",
      bg: `${purple}18`,
      border: `${purple}33`,
      color: purple,
    },
    {
      icon: <Puzzle size={14} color={emerald} />,
      label: "Negative-Space Detection",
      bg: `${emerald}18`,
      border: `${emerald}33`,
      color: emerald,
    },
    {
      icon: <Code2 size={14} color={amber} />,
      label: "Engineering Quality",
      bg: `${amber}18`,
      border: `${amber}33`,
      color: amber,
    },
  ];

  return (
    <div
      style={{
        borderRadius: "20px",
        background: darkMode
          ? "linear-gradient(180deg, rgba(15, 23, 42, 0.85) 0%, rgba(10, 15, 29, 0.95) 100%)"
          : "linear-gradient(180deg, rgba(255, 255, 255, 0.95) 0%, rgba(241, 245, 249, 0.9) 100%)",
        border: darkMode
          ? "1px solid rgba(56, 189, 248, 0.2)"
          : "1px solid rgba(0, 0, 0, 0.08)",
        backdropFilter: "blur(20px)",
        padding: "44px 36px 36px 36px",
        marginBottom: "28px",
        position: "relative",
        overflow: "hidden",
        boxShadow: darkMode
          ? "0 20px 50px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1)"
          : "0 10px 30px rgba(0, 0, 0, 0.06)",
      }}
    >
      {/* Decorative ambient gradient */}
      <div
        style={{
          position: "absolute",
          top: "-80px",
          right: "-80px",
          width: "300px",
          height: "300px",
          borderRadius: "50%",
          background: darkMode
            ? "radial-gradient(circle, rgba(56, 189, 248, 0.15) 0%, transparent 70%)"
            : "radial-gradient(circle, rgba(2, 132, 199, 0.1) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      <div style={{ maxWidth: "820px", margin: "0 auto", textAlign: "center" }}>
        {/* Capability indicator badges */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "8px",
            justifyContent: "center",
            marginBottom: "20px",
          }}
        >
          {capabilities.map((c) => (
            <span
              key={c.label}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "5px 12px",
                borderRadius: "9999px",
                background: c.bg,
                border: `1px solid ${c.border}`,
                color: c.color,
                fontSize: "12px",
                fontWeight: 600,
                letterSpacing: "0.2px",
              }}
            >
              {c.icon}
              {c.label}
            </span>
          ))}
        </div>

        {/* Main Headline */}
        <h1
          style={{
            margin: "0 0 16px 0",
            fontSize: "40px",
            lineHeight: 1.15,
            fontWeight: 800,
            letterSpacing: "-1px",
            color: textPrimary,
          }}
        >
          Know what's broken before it reaches production.
        </h1>

        {/* Supporting Description */}
        <p
          style={{
            margin: "0 0 28px 0",
            fontSize: "16px",
            lineHeight: 1.6,
            color: textSecondary,
            maxWidth: "700px",
            marginLeft: "auto",
            marginRight: "auto",
          }}
        >
          An architecture-agnostic repository integrity agent that uncovers
          security vulnerabilities, missing implementations, architectural
          inconsistencies and hidden engineering debt.
        </p>

        {/* Action Buttons */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "14px",
            flexWrap: "wrap",
            marginBottom: "20px",
          }}
        >
          <button
            onClick={onStartAudit}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "13px 28px",
              borderRadius: "12px",
              fontSize: "15px",
              fontWeight: 700,
              color: "#ffffff",
              background: "linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)",
              border: "none",
              cursor: "pointer",
              boxShadow: "0 6px 20px rgba(56, 189, 248, 0.4)",
              transition: "transform 0.15s ease, box-shadow 0.15s ease",
            }}
          >
            <span>Start Repository Audit</span>
            <ArrowRight size={18} />
          </button>

          <button
            onClick={onViewHistory}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "12px 22px",
              borderRadius: "12px",
              fontSize: "14px",
              fontWeight: 600,
              color: textPrimary,
              background: darkMode
                ? "rgba(15, 23, 42, 0.7)"
                : "rgba(241, 245, 249, 0.9)",
              border: darkMode
                ? "1px solid rgba(255, 255, 255, 0.12)"
                : "1px solid rgba(0, 0, 0, 0.12)",
              cursor: "pointer",
            }}
          >
            <History size={16} color={purple} />
            <span>Audit History</span>
            {totalAuditsCount !== undefined && totalAuditsCount > 0 && (
              <span
                style={{
                  fontSize: "11px",
                  padding: "1px 7px",
                  borderRadius: "9999px",
                  background: `${purple}22`,
                  color: purple,
                  fontWeight: 700,
                }}
              >
                {totalAuditsCount}
              </span>
            )}
          </button>

          <button
            onClick={onExploreCapabilities}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "12px 18px",
              borderRadius: "12px",
              fontSize: "14px",
              fontWeight: 600,
              color: cyan,
              background: "transparent",
              border: "none",
              cursor: "pointer",
            }}
          >
            <Sparkles size={16} />
            <span>Explore Capabilities</span>
          </button>
        </div>

        {/* Small supporting trust bar */}
        <div
          style={{
            fontSize: "12px",
            color: textMuted,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "18px",
            flexWrap: "wrap",
          }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: "5px" }}>
            <CheckCircle2 size={13} color={emerald} /> Static AST Analysis
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: "5px" }}>
            <CheckCircle2 size={13} color={emerald} /> Evidence-Linked Findings
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: "5px" }}>
            <CheckCircle2 size={13} color={emerald} /> Strict Read-Only Target Inspection
          </span>
        </div>
      </div>
    </div>
  );
};
