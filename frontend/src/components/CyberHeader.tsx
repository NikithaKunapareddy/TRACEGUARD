import React from "react";
import { Shield, Sun, Moon, ArrowRight, History, Terminal } from "lucide-react";

interface CyberHeaderProps {
  serverHealth: boolean | null;
  darkMode: boolean;
  onToggleTheme: () => void;
  onNavigateLanding?: () => void;
  onNavigateWorkspace?: () => void;
  onNavigateHistory?: () => void;
  currentView?: "landing" | "workspace" | "dashboard" | "history";
}

export const CyberHeader: React.FC<CyberHeaderProps> = ({
  serverHealth,
  darkMode,
  onToggleTheme,
  onNavigateLanding,
  onNavigateWorkspace,
  onNavigateHistory,
  currentView = "landing",
}) => {
  const cyan = darkMode ? "#38bdf8" : "#0284c7";
  const green = darkMode ? "#10b981" : "#059669";
  const red = darkMode ? "#f43f5e" : "#dc2626";
  const amber = darkMode ? "#f59e0b" : "#d97706";
  const purple = darkMode ? "#a855f7" : "#7c3aed";
  const textPrimary = darkMode ? "#f8fafc" : "#0f172a";
  const textMuted = darkMode ? "#64748b" : "#94a3b8";
  const cardBg = darkMode ? "rgba(15, 23, 42, 0.85)" : "rgba(255, 255, 255, 0.9)";
  const cardBorder = darkMode ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.08)";

  return (
    <header style={{ marginBottom: "24px" }}>
      <div
        className="cyber-header-inner"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "14px 22px",
          borderRadius: "16px",
          background: cardBg,
          backdropFilter: "blur(16px)",
          border: `1px solid ${cardBorder}`,
          boxShadow: darkMode
            ? "0 8px 32px rgba(0,0,0,0.4)"
            : "0 4px 20px rgba(0,0,0,0.06)",
        }}
      >
        {/* Logo + Branding (Clicking returns to Landing) */}
        <div
          className="cyber-header-left"
          onClick={onNavigateLanding}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "14px",
            cursor: "pointer",
            userSelect: "none",
          }}
        >
          <div
            style={{
              width: "42px",
              height: "42px",
              borderRadius: "12px",
              background: "linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: `0 0 18px ${cyan}55`,
              flexShrink: 0,
            }}
          >
            <Shield size={22} color="#ffffff" />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span
                className="cyber-header-brand-name"
                style={{
                  fontSize: "22px",
                  fontWeight: 800,
                  letterSpacing: "-0.5px",
                  color: textPrimary,
                }}
              >
                Trace<span style={{ color: cyan }}>Guard</span>
              </span>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  padding: "2px 8px",
                  borderRadius: "9999px",
                  background: `${cyan}20`,
                  color: cyan,
                  border: `1px solid ${cyan}44`,
                  letterSpacing: "0.5px",
                  whiteSpace: "nowrap",
                }}
              >
                v1.0.0
              </span>
            </div>
            <p className="cyber-header-subtitle" style={{ margin: "2px 0 0 0", color: textMuted, fontSize: "12px" }}>
              Architecture-Agnostic Repository Integrity Agent
            </p>
          </div>
        </div>

        {/* Right Navigation & Controls */}
        <div className="cyber-header-controls" style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {/* Quick Nav Links */}
          {currentView !== "workspace" && onNavigateWorkspace && (
            <button
              onClick={onNavigateWorkspace}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 14px",
                borderRadius: "10px",
                fontSize: "13px",
                fontWeight: 600,
                background: `${cyan}18`,
                border: `1px solid ${cyan}44`,
                color: cyan,
                cursor: "pointer",
              }}
            >
              <Terminal size={14} color={cyan} />
              <span>Audit Workspace</span>
            </button>
          )}

          {currentView !== "history" && onNavigateHistory && (
            <button
              onClick={onNavigateHistory}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 14px",
                borderRadius: "10px",
                fontSize: "13px",
                fontWeight: 600,
                background: darkMode ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.05)",
                border: darkMode ? "1px solid rgba(255, 255, 255, 0.1)" : "1px solid rgba(0, 0, 0, 0.1)",
                color: textPrimary,
                cursor: "pointer",
              }}
            >
              <History size={14} color={purple} />
              <span>History</span>
            </button>
          )}

          {/* Engine Health Indicator */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "6px 12px",
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
                  serverHealth === true ? `0 0 8px ${green}`
                  : serverHealth === false ? `0 0 8px ${red}`
                  : `0 0 8px ${amber}`,
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
                ? "FastAPI Offline"
                : "Connecting…"}
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
              width: "38px",
              height: "38px",
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
            {darkMode ? <Sun size={17} /> : <Moon size={17} />}
          </button>
        </div>
      </div>
    </header>
  );
};
