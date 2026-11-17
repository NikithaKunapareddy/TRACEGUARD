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
  Lock,
  GitBranch,
  Terminal,
  Cpu,
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
  const rose = darkMode ? "#f43f5e" : "#dc2626";
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
      desc: "Cross-file taint tracking, SQL injection, unprotected endpoints & credential leakage.",
    },
    {
      icon: <Layers size={14} color={purple} />,
      label: "Architecture Intelligence",
      bg: `${purple}18`,
      border: `${purple}33`,
      color: purple,
      desc: "Evidence-linked Repository Consistency Graph (ERCG) with 3D WebGL dependency topology.",
    },
    {
      icon: <Puzzle size={14} color={emerald} />,
      label: "Negative-Space Detection",
      bg: `${emerald}18`,
      border: `${emerald}33`,
      color: emerald,
      desc: "Detects what should exist but is missing: dangling client calls & mock stub implementations.",
    },
    {
      icon: <Code2 size={14} color={amber} />,
      label: "Engineering Quality",
      bg: `${amber}18`,
      border: `${amber}33`,
      color: amber,
      desc: "Code slop, redundant functions, blind exception suppression & dead handler analysis.",
    },
  ];

  return (
    <div style={{ padding: "20px 0 40px 0" }}>
      {/* Hero Container */}
      <div
        style={{
          borderRadius: "24px",
          background: darkMode
            ? "linear-gradient(180deg, rgba(15, 23, 42, 0.9) 0%, rgba(10, 15, 29, 0.98) 100%)"
            : "linear-gradient(180deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.95) 100%)",
          border: darkMode
            ? "1px solid rgba(56, 189, 248, 0.2)"
            : "1px solid rgba(0, 0, 0, 0.08)",
          backdropFilter: "blur(24px)",
          padding: "54px 36px 44px 36px",
          position: "relative",
          overflow: "hidden",
          boxShadow: darkMode
            ? "0 20px 60px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.1)"
            : "0 10px 30px rgba(0, 0, 0, 0.06)",
          textAlign: "center",
          marginBottom: "36px",
        }}
      >
        {/* Ambient background glows */}
        <div
          style={{
            position: "absolute",
            top: "-100px",
            left: "50%",
            transform: "translateX(-50%)",
            width: "500px",
            height: "250px",
            borderRadius: "50%",
            background: darkMode
              ? "radial-gradient(circle, rgba(56, 189, 248, 0.18) 0%, transparent 70%)"
              : "radial-gradient(circle, rgba(2, 132, 199, 0.12) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />

        <div style={{ maxWidth: "860px", margin: "0 auto", position: "relative", zIndex: 1 }}>
          {/* Capability indicator badges */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "8px",
              justifyContent: "center",
              marginBottom: "24px",
            }}
          >
            {capabilities.map((c) => (
              <span
                key={c.label}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "6px 14px",
                  borderRadius: "9999px",
                  background: c.bg,
                  border: `1px solid ${c.border}`,
                  color: c.color,
                  fontSize: "12px",
                  fontWeight: 700,
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
              margin: "0 0 18px 0",
              fontSize: "44px",
              lineHeight: 1.15,
              fontWeight: 800,
              letterSpacing: "-1.2px",
              color: textPrimary,
            }}
          >
            Know what's broken before it reaches production.
          </h1>

          {/* Supporting Description */}
          <p
            style={{
              margin: "0 0 32px 0",
              fontSize: "17px",
              lineHeight: 1.6,
              color: textSecondary,
              maxWidth: "720px",
              marginLeft: "auto",
              marginRight: "auto",
            }}
          >
            An architecture-agnostic repository integrity agent that uncovers
            security vulnerabilities, missing implementations, architectural
            inconsistencies and hidden engineering debt.
          </p>

          {/* Call to Actions */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "16px",
              flexWrap: "wrap",
              marginBottom: "28px",
            }}
          >
            <button
              onClick={onStartAudit}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "10px",
                padding: "14px 32px",
                borderRadius: "14px",
                fontSize: "16px",
                fontWeight: 700,
                color: "#ffffff",
                background: "linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)",
                border: "none",
                cursor: "pointer",
                boxShadow: `0 6px 24px ${cyan}55`,
                transition: "all 0.15s ease",
              }}
            >
              <span>Start a Repository Audit</span>
              <ArrowRight size={18} />
            </button>

            <button
              onClick={onViewHistory}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "13px 24px",
                borderRadius: "14px",
                fontSize: "14px",
                fontWeight: 600,
                color: textPrimary,
                background: darkMode ? "rgba(15, 23, 42, 0.7)" : "rgba(241, 245, 249, 0.9)",
                border: darkMode ? "1px solid rgba(255, 255, 255, 0.12)" : "1px solid rgba(0, 0, 0, 0.12)",
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
                    background: `${purple}25`,
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
                padding: "13px 20px",
                borderRadius: "14px",
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

          {/* Trust & Guarantee Indicator Bar */}
          <div
            style={{
              paddingTop: "20px",
              borderTop: darkMode ? "1px solid rgba(255, 255, 255, 0.07)" : "1px solid rgba(0, 0, 0, 0.07)",
              fontSize: "12px",
              color: textMuted,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "24px",
              flexWrap: "wrap",
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <CheckCircle2 size={14} color={emerald} /> Static Tree-sitter &amp; AST Analysis
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <CheckCircle2 size={14} color={emerald} /> Evidence-Linked Graph Findings
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <CheckCircle2 size={14} color={emerald} /> Strict Read-Only Repository Inspection
            </span>
          </div>
        </div>
      </div>

      {/* 4 Feature Preview Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: "18px",
        }}
      >
        {capabilities.map((c) => (
          <div
            key={c.label}
            style={{
              borderRadius: "16px",
              background: darkMode ? "rgba(15, 23, 42, 0.75)" : "rgba(255, 255, 255, 0.85)",
              border: darkMode ? "1px solid rgba(255, 255, 255, 0.07)" : "1px solid rgba(0, 0, 0, 0.07)",
              backdropFilter: "blur(16px)",
              padding: "24px",
              boxShadow: darkMode ? "0 4px 20px rgba(0, 0, 0, 0.2)" : "0 2px 12px rgba(0, 0, 0, 0.04)",
              transition: "transform 0.2s ease, border-color 0.2s ease",
            }}
          >
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                background: c.bg,
                border: `1px solid ${c.border}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "14px",
              }}
            >
              {c.icon}
            </div>
            <div style={{ fontSize: "15px", fontWeight: 700, color: textPrimary, marginBottom: "8px" }}>
              {c.label}
            </div>
            <div style={{ fontSize: "13px", lineHeight: 1.5, color: textSecondary }}>
              {c.desc}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
