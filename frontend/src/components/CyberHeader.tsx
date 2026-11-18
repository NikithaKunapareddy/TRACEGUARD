import React from "react";
import { Shield, Sun, Moon, History, Terminal, Sparkles, Compass, Activity } from "lucide-react";

interface CyberHeaderProps {
  serverHealth: boolean | null;
  darkMode: boolean;
  onToggleTheme: () => void;
  onNavigateLanding?: () => void;
  onNavigateWorkspace?: () => void;
  onNavigateHistory?: () => void;
  onNavigateDashboard?: () => void;
  hasActiveAudit?: boolean;
  activeScore?: number;
  currentView?: "landing" | "workspace" | "dashboard" | "history";
}

export const CyberHeader: React.FC<CyberHeaderProps> = ({
  serverHealth,
  darkMode,
  onToggleTheme,
  onNavigateLanding,
  onNavigateWorkspace,
  onNavigateHistory,
  onNavigateDashboard,
  hasActiveAudit = false,
  activeScore,
  currentView = "landing",
}) => {
  const textPrimary = darkMode ? "#f8fafc" : "#0f172a";
  const textSecondary = darkMode ? "#cbd5e1" : "#334155";
  const textMuted = darkMode ? "#64748b" : "#64748b";
  const green = darkMode ? "#10b981" : "#059669";
  const red = darkMode ? "#f43f5e" : "#e11d48";
  const amber = darkMode ? "#f59e0b" : "#d97706";

  const navItems: Array<{
    id: "landing" | "workspace" | "dashboard" | "history";
    label: string;
    icon: React.ElementType;
    accent: string;
    onClick?: () => void;
    badge?: string;
    show: boolean;
  }> = [
      {
        id: "landing",
        label: "Overview",
        icon: Compass,
        accent: "#8b5cf6",
        onClick: onNavigateLanding,
        show: true,
      },
      {
        id: "workspace",
        label: "Audit Workspace",
        icon: Terminal,
        accent: "#3b82f6",
        onClick: onNavigateWorkspace,
        show: true,
      },
      {
        id: "dashboard",
        label: "Live Intelligence",
        icon: Activity,
        accent: "#10b981",
        onClick: onNavigateDashboard,
        badge: activeScore != null ? `${activeScore.toFixed(0)}` : undefined,
        show: hasActiveAudit && Boolean(onNavigateDashboard),
      },
      {
        id: "history",
        label: "Audit History",
        icon: History,
        accent: "#f97316",
        onClick: onNavigateHistory,
        show: true,
      },
    ];

  return (
    <header
      style={{
        position: "relative",
        zIndex: 40,
        marginBottom: "28px",
      }}
    >
      <div
        className="floating-navbar-shell vibgyor-prism-surface"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
          padding: "10px 20px",
          borderRadius: "9999px",
        }}
      >
        {/* Left: Brand Identity */}
        <div
          onClick={onNavigateLanding}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            cursor: "pointer",
            userSelect: "none",
          }}
        >
          <div
            style={{
              position: "relative",
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              background:
                "linear-gradient(135deg, #8b5cf6 0%, #3b82f6 40%, #10b981 75%, #f97316 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 6px 20px rgba(99, 102, 241, 0.45)",
              flexShrink: 0,
            }}
          >
            <Shield size={20} color="#ffffff" />
          </div>

          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span
                style={{
                  fontSize: "clamp(17px, 2vw, 20px)",
                  fontWeight: 800,
                  letterSpacing: "-0.03em",
                  color: textPrimary,
                }}
              >
                Trace<span className="hero-gradient-title">Guard</span>
              </span>
              <span
                style={{
                  fontSize: "10px",
                  fontWeight: 800,
                  padding: "2px 8px",
                  borderRadius: "9999px",
                  background: darkMode
                    ? "rgba(139, 92, 246, 0.16)"
                    : "rgba(124, 58, 237, 0.10)",
                  color: darkMode ? "#c4b5fd" : "#6d28d9",
                  letterSpacing: "0.04em",
                }}
              >
                v1.0.0
              </span>
            </div>
            <div
              style={{
                fontSize: "11px",
                color: textMuted,
                fontWeight: 500,
                display: "block",
              }}
            >
              Autonomous Repository Integrity Engine
            </div>
          </div>
        </div>

        {/* Center: Seamless Floating Pill Navigation */}
        <nav
          className="nav-center-pills no-scrollbar"
          aria-label="Primary Navigation"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          {navItems
            .filter((item) => item.show)
            .map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={item.onClick}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "7px",
                    padding: "8px 16px",
                    borderRadius: "9999px",
                    fontSize: "13px",
                    fontWeight: isActive ? 700 : 600,
                    color: isActive ? "#ffffff" : textSecondary,
                    background: isActive
                      ? `linear-gradient(135deg, ${item.accent} 0%, #6366f1 100%)`
                      : "transparent",
                    border: "none",
                    cursor: "pointer",
                    boxShadow: isActive
                      ? `0 6px 18px -4px ${item.accent}88`
                      : "none",
                    whiteSpace: "nowrap",
                    transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
                  }}
                >
                  <Icon
                    size={15}
                    color={isActive ? "#ffffff" : item.accent}
                  />
                  <span>{item.label}</span>
                  {item.badge && (
                    <span
                      style={{
                        fontSize: "10px",
                        fontWeight: 800,
                        padding: "1px 6px",
                        borderRadius: "9999px",
                        background: isActive
                          ? "rgba(255,255,255,0.25)"
                          : `${item.accent}22`,
                        color: isActive ? "#ffffff" : item.accent,
                      }}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
        </nav>

        {/* Right: Engine Pulse & Theme Orb */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          {/* Engine Health Pill */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "7px",
              padding: "6px 13px",
              borderRadius: "9999px",
              background: darkMode
                ? "rgba(255, 255, 255, 0.04)"
                : "rgba(15, 23, 42, 0.04)",
              fontSize: "11.5px",
              fontWeight: 700,
              color:
                serverHealth === true
                  ? green
                  : serverHealth === false
                    ? red
                    : amber,
            }}
          >
            <span
              style={{
                width: "7px",
                height: "7px",
                borderRadius: "50%",
                backgroundColor:
                  serverHealth === true
                    ? green
                    : serverHealth === false
                      ? red
                      : amber,
                boxShadow:
                  serverHealth === true
                    ? `0 0 10px ${green}`
                    : serverHealth === false
                      ? `0 0 10px ${red}`
                      : `0 0 10px ${amber}`,
              }}
            />
            <span>
              {serverHealth === true
                ? "AST Engine Live"
                : serverHealth === false
                  ? "Engine Offline"
                  : "Syncing…"}
            </span>
          </div>

          {/* Theme Switch Orb */}
          <button
            onClick={onToggleTheme}
            title={darkMode ? "Switch to Luminous Light Mode" : "Switch to Cosmic Dark Mode"}
            aria-label="Toggle color theme"
            style={{
              width: "38px",
              height: "38px",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: darkMode
                ? "radial-gradient(circle, rgba(250, 204, 21, 0.18) 0%, rgba(249, 115, 22, 0.08) 100%)"
                : "radial-gradient(circle, rgba(99, 102, 241, 0.16) 0%, rgba(139, 92, 246, 0.08) 100%)",
              border: "none",
              color: darkMode ? "#facc15" : "#4f46e5",
              cursor: "pointer",
            }}
          >
            {darkMode ? <Sun size={17} /> : <Moon size={17} />}
          </button>
        </div>
      </div>
    </header>
  );
};
