import React from "react";
import { Shield, Sparkles, Sun, Moon } from "lucide-react";

interface CyberHeaderProps {
  serverHealth: boolean | null;
  onSelectPresetRepo: (path: string) => void;
  selectedRepo: string;
  darkMode: boolean;
  onToggleTheme: () => void;
}

export const CyberHeader: React.FC<CyberHeaderProps> = ({
  serverHealth,
  onSelectPresetRepo,
  selectedRepo,
  darkMode,
  onToggleTheme,
}) => {
  const presets = [
    { name: "⚡ Repo 1: Fullstack E-Commerce", path: "./benchmark_repos/repo1_ecommerce_fullstack" },
    { name: "☁️ Repo 2: Cloud Microservice",   path: "./benchmark_repos/repo2_cloud_microservice" },
    { name: "🏦 Repo 3: Polyglot Fintech",     path: "./benchmark_repos/repo3_polyglot_fintech" },
    { name: "📱 Repo 4: FastAPI + React",       path: "./benchmark_repos/repo4_fastapi_react" },
    { name: "🚀 Repo 5: Cloud API Only",        path: "./benchmark_repos/repo5_fastapi_only" },
    { name: "🟩 Repo 6: Node.js Express",       path: "./benchmark_repos/repo6_node_express" },
    { name: "⚙️ Repo 7: Python Worker",         path: "./benchmark_repos/repo7_python_worker" },
    { name: "🐷 Repo 8: Go Microservice",       path: "./benchmark_repos/repo8_go_microservice" },
    { name: "🏛️ Repo 9: Python Monolith",       path: "./benchmark_repos/repo9_python_monolith" },
  ];

  const cyan   = darkMode ? "#38bdf8" : "#0284c7";
  const green  = darkMode ? "#10b981" : "#059669";
  const red    = darkMode ? "#f43f5e" : "#dc2626";
  const amber  = darkMode ? "#f59e0b" : "#d97706";
  const textPrimary   = darkMode ? "#f8fafc"  : "#0f172a";
  const textSecondary = darkMode ? "#94a3b8"  : "#475569";
  const textMuted     = darkMode ? "#64748b"  : "#94a3b8";
  const cardBg        = darkMode ? "rgba(15,23,42,0.75)"  : "rgba(255,255,255,0.85)";
  const cardBorder    = darkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";
  const presetBg      = darkMode ? "rgba(15,23,42,0.6)"   : "rgba(241,245,249,0.8)";
  const presetBorder  = darkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";

  return (
    <header style={{ marginBottom: "28px" }}>
      {/* Top Brand Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "16px 20px",
          borderRadius: "16px",
          background: cardBg,
          backdropFilter: "blur(16px)",
          border: `1px solid ${cardBorder}`,
          marginBottom: "16px",
          boxShadow: darkMode
            ? "0 8px 32px rgba(0,0,0,0.4)"
            : "0 4px 24px rgba(0,0,0,0.08)",
        }}
      >
        {/* Logo + Branding */}
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "12px",
              background: "linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: `0 0 20px ${cyan}66`,
            }}
          >
            <Shield size={24} color="#ffffff" />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <h1
                style={{
                  margin: 0,
                  fontSize: "24px",
                  fontWeight: 800,
                  letterSpacing: "-0.5px",
                  background: darkMode
                    ? "linear-gradient(90deg, #f8fafc 0%, #94a3b8 100%)"
                    : "linear-gradient(90deg, #0f172a 0%, #334155 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                TraceGuard
              </h1>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  padding: "2px 8px",
                  borderRadius: "9999px",
                  background: `${cyan}22`,
                  color: cyan,
                  border: `1px solid ${cyan}44`,
                  letterSpacing: "0.5px",
                }}
              >
                v1.0.0 RELEASE
              </span>
            </div>
            <p style={{ margin: "2px 0 0 0", color: textMuted, fontSize: "13px" }}>
              Architecture-Agnostic Repository Integrity Agent • Tree-sitter &amp; NetworkX ERCG Engine
            </p>
          </div>
        </div>

        {/* Right Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {/* Health Indicator */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "6px 14px",
              borderRadius: "9999px",
              background: darkMode ? "rgba(11,17,32,0.8)" : "rgba(241,245,249,0.9)",
              border:
                serverHealth === true
                  ? `1px solid ${green}44`
                  : `1px solid ${red}44`,
            }}
          >
            <span
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                backgroundColor:
                  serverHealth === true ? green
                  : serverHealth === false ? red
                  : amber,
                boxShadow:
                  serverHealth === true ? `0 0 10px ${green}`
                  : serverHealth === false ? `0 0 10px ${red}`
                  : `0 0 10px ${amber}`,
                display: "inline-block",
              }}
            />
            <span
              style={{
                fontSize: "12px",
                fontWeight: 600,
                color:
                  serverHealth === true ? green
                  : serverHealth === false ? red
                  : amber,
              }}
            >
              {serverHealth === true
                ? "FastAPI Engine Online"
                : serverHealth === false
                ? "FastAPI Engine Offline"
                : "Connecting to Engine…"}
            </span>
          </div>

          {/* Dark/Light Toggle */}
          <button
            onClick={onToggleTheme}
            title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "40px",
              height: "40px",
              borderRadius: "10px",
              background: darkMode
                ? "rgba(248,215,70,0.1)"
                : "rgba(15,23,42,0.08)",
              border: darkMode
                ? "1px solid rgba(248,215,70,0.25)"
                : "1px solid rgba(15,23,42,0.15)",
              cursor: "pointer",
              transition: "all 0.2s ease",
              color: darkMode ? "#fbbf24" : "#0f172a",
            }}
          >
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </div>

      {/* Benchmark Repo Quick-Picker */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          overflowX: "auto",
          paddingBottom: "4px",
        }}
      >
        <span
          style={{
            fontSize: "11px",
            fontWeight: 700,
            textTransform: "uppercase",
            color: textMuted,
            marginRight: "4px",
            whiteSpace: "nowrap",
            display: "flex",
            alignItems: "center",
            gap: "4px",
          }}
        >
          <Sparkles size={12} color={cyan} /> Benchmark Suites:
        </span>
        {presets.map((p) => {
          const isSelected = selectedRepo === p.path;
          return (
            <button
              key={p.path}
              onClick={() => onSelectPresetRepo(p.path)}
              style={{
                padding: "6px 12px",
                borderRadius: "8px",
                fontSize: "12px",
                fontWeight: isSelected ? 700 : 500,
                background: isSelected
                  ? `${cyan}33`
                  : presetBg,
                border: isSelected
                  ? `1px solid ${cyan}`
                  : `1px solid ${presetBorder}`,
                color: isSelected ? cyan : textSecondary,
                cursor: "pointer",
                whiteSpace: "nowrap",
                transition: "all 0.15s ease",
              }}
            >
              {p.name}
            </button>
          );
        })}
      </div>
    </header>
  );
};
