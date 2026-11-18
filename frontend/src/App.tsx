import React, { useState, useEffect } from "react";
import { traceguardApi, AuditStatus, Finding } from "./api/client";
import { CyberHeader } from "./components/CyberHeader";
import { LandingHero } from "./components/LandingHero";
import { AuditWorkspace } from "./components/AuditWorkspace";
import { OverviewDashboard } from "./components/OverviewDashboard";
import { ConsistencyGraph3D, GraphNode, GraphEdge } from "./components/ConsistencyGraph3D";
import ArchitectureGraph2D from "./components/ArchitectureGraph2D";
import { IntegrityScoreRadar } from "./components/IntegrityScoreRadar";
import { FindingsExplorer } from "./components/FindingsExplorer";
import { NegativeSpaceView } from "./components/NegativeSpaceView";
import { ReportsExportView } from "./components/ReportsExportView";
import { AuditHistory } from "./components/AuditHistory";
import {
  LayoutDashboard,
  Globe2,
  BarChart3,
  ShieldAlert,
  Puzzle,
  FileText,
  History,
  Loader2,
  ArrowLeft,
  PlusCircle,
  FolderOpen,
} from "lucide-react";

type ViewState = "landing" | "workspace" | "dashboard" | "history";
type TabKey = "overview" | "graph" | "score" | "findings" | "negspace" | "reports" | "history";

export const App: React.FC = () => {
  // Theme state
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem("traceguard-theme");
      return stored !== "light";
    } catch {
      return true;
    }
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", darkMode ? "dark" : "light");
    try {
      localStorage.setItem("traceguard-theme", darkMode ? "dark" : "light");
    } catch {}
  }, [darkMode]);

  const handleToggleTheme = () => setDarkMode((d) => !d);

  // App Navigation View
  const [currentView, setCurrentView] = useState<ViewState>("landing");

  // Audit state
  const [currentAuditId, setCurrentAuditId] = useState<string | null>(null);
  const [auditStatus, setAuditStatus] = useState<AuditStatus | null>(null);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [totalFindings, setTotalFindings] = useState<number>(0);
  const [graphNodes, setGraphNodes] = useState<GraphNode[]>([]);
  const [graphEdges, setGraphEdges] = useState<GraphEdge[]>([]);
  const [polling, setPolling] = useState<boolean>(false);
  const [serverHealth, setServerHealth] = useState<boolean | null>(null);
  const [totalAuditsCount, setTotalAuditsCount] = useState<number>(0);
  const [selectedRepo, setSelectedRepo] = useState<string>(
    "./benchmark_repos/repo1_ecommerce_fullstack"
  );
  const [activeDashboardTab, setActiveDashboardTab] = useState<TabKey>("overview");
  const [graphView, setGraphView] = useState<"2d" | "3d">("2d");
  const [highlightedGraphNode, setHighlightedGraphNode] = useState<string | null>(null);

  const handleViewInGraph = (fileOrNode: string) => {
    setHighlightedGraphNode(fileOrNode);
    setActiveDashboardTab("graph");
    setGraphView("2d");
  };

  // Health check and initial audits count
  useEffect(() => {
    traceguardApi
      .health()
      .then(() => setServerHealth(true))
      .catch(() => setServerHealth(false));

    traceguardApi
      .listAudits(undefined, undefined, 1)
      .then((res) => setTotalAuditsCount(res.length))
      .catch(() => {});
  }, []);

  // Polling audit lifecycle
  useEffect(() => {
    if (!currentAuditId || !polling) return;

    const interval = setInterval(async () => {
      try {
        const res = await traceguardApi.getAudit(currentAuditId);
        setAuditStatus(res);

        if (res.status === "completed" || res.status === "failed") {
          setPolling(false);
          if (res.status === "completed") {
            const fRes = await traceguardApi.getFindings(currentAuditId, 1, 150);
            setFindings(fRes.findings || []);
            setTotalFindings(fRes.total || (fRes.findings ? fRes.findings.length : 0));

            try {
              const gRes = await traceguardApi.getGraph(currentAuditId);
              if (gRes.nodes) setGraphNodes(gRes.nodes);
              if (gRes.edges) setGraphEdges(gRes.edges);
            } catch (gErr) {
              console.warn("Could not load 3D graph data:", gErr);
            }
            setActiveDashboardTab("overview");
            setCurrentView("dashboard");
          }
        }
      } catch (err) {
        console.error("Polling error:", err);
      }
    }, 1200);

    return () => clearInterval(interval);
  }, [currentAuditId, polling]);

  const handleAuditStarted = (id: string) => {
    setCurrentAuditId(id);
    setAuditStatus({ audit_id: id, status: "running" });
    setFindings([]);
    setTotalFindings(0);
    setGraphNodes([]);
    setGraphEdges([]);
    setPolling(true);
  };

  const handleLoadHistoricalAudit = async (
    auditId: string,
    jumpToTab: TabKey = "overview"
  ) => {
    try {
      setCurrentAuditId(auditId);
      const statusRes = await traceguardApi.getAudit(auditId);
      setAuditStatus(statusRes);
      if (statusRes.repo_path) setSelectedRepo(statusRes.repo_path);

      // Fetch historical findings from SQLite
      const fRes = await traceguardApi.getFindings(auditId, 1, 150);
      setFindings(fRes.findings || []);
      setTotalFindings(fRes.total || (fRes.findings ? fRes.findings.length : 0));

      // Fetch historical graph from SQLite
      try {
        const gRes = await traceguardApi.getGraph(auditId);
        if (gRes.nodes) setGraphNodes(gRes.nodes);
        if (gRes.edges) setGraphEdges(gRes.edges);
      } catch (gErr) {
        console.warn("Historical graph load:", gErr);
      }

      setActiveDashboardTab(jumpToTab);
      setCurrentView("dashboard");
    } catch (err: any) {
      alert(`Could not load historical audit: ${err.message}`);
    }
  };

  // Color tokens
  const cyan = darkMode ? "#38bdf8" : "#0284c7";
  const purple = darkMode ? "#a855f7" : "#7c3aed";
  const emerald = darkMode ? "#10b981" : "#059669";
  const rose = darkMode ? "#f43f5e" : "#dc2626";
  const textPrimary = darkMode ? "#f8fafc" : "#0f172a";
  const textSecondary = darkMode ? "#94a3b8" : "#475569";
  const textMuted = darkMode ? "#64748b" : "#94a3b8";
  const cardBorder = darkMode ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.08)";
  const cardBg = darkMode ? "rgba(15, 23, 42, 0.75)" : "rgba(255, 255, 255, 0.85)";

  const tabs: Array<{ key: TabKey; label: string; icon: React.ElementType; badge?: number }> = [
    { key: "overview", label: "Overview", icon: LayoutDashboard },
    { key: "graph", label: "Architecture Graph", icon: Globe2 },
    { key: "score", label: "Integrity Assessment", icon: BarChart3 },
    { key: "findings", label: "Findings", icon: ShieldAlert, badge: findings.length },
    { key: "negspace", label: "Negative-Space Gaps", icon: Puzzle },
    { key: "reports", label: "Reports & Exports", icon: FileText },
    { key: "history", label: "Audit History", icon: History },
  ];

  const repoName = auditStatus?.repo_path
    ? auditStatus.repo_path.split(/[/\\]/).pop()
    : "Repository";

  return (
    <>
      {/* Google Gemini-Style Living Atmospheric Aurora Background */}
      <div className="gemini-ambient-bg" aria-hidden="true">
        <div className="aurora-floating-orb orb-1" />
        <div className="aurora-floating-orb orb-2" />
        <div className="aurora-floating-orb orb-3" />
        <div className="aurora-floating-orb orb-4" />
      </div>

      <div className="app-main-layout">
        {/* Universal Clean Header */}
        <CyberHeader
          serverHealth={serverHealth}
          darkMode={darkMode}
          onToggleTheme={handleToggleTheme}
          onNavigateLanding={() => setCurrentView("landing")}
          onNavigateWorkspace={() => setCurrentView("workspace")}
          onNavigateHistory={() => setCurrentView("history")}
          currentView={currentView}
        />

      {/* ======================================================== */}
      {/* 1. PRODUCT LANDING PAGE VIEW                            */}
      {/* ======================================================== */}
      {currentView === "landing" && (
        <LandingHero
          onStartAudit={() => setCurrentView("workspace")}
          onViewHistory={() => setCurrentView("history")}
          onExploreCapabilities={() => setCurrentView("workspace")}
          darkMode={darkMode}
          totalAuditsCount={totalAuditsCount}
        />
      )}

      {/* ======================================================== */}
      {/* 2. DEDICATED AUDIT WORKSPACE VIEW                       */}
      {/* ======================================================== */}
      {currentView === "workspace" && (
        <>
          {/* Scanning Progress Bar when running */}
          {polling && auditStatus?.status === "running" && (
            <div
              style={{
                background: `${cyan}18`,
                border: `1px solid ${cyan}44`,
                borderRadius: "14px",
                padding: "16px 20px",
                marginBottom: "24px",
                display: "flex",
                alignItems: "center",
                gap: "14px",
              }}
            >
              <Loader2
                size={22}
                color={cyan}
                style={{ animation: "spin 1s linear infinite", flexShrink: 0 }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: "14px", color: cyan, marginBottom: "2px" }}>
                  Analyzing AST, Extracting Symbols &amp; Traversing ERCG Consistency Graph…
                </div>
                <div style={{ fontSize: "12px", color: textMuted }}>
                  Audit ID: {currentAuditId} • Target: {selectedRepo}
                </div>
              </div>
            </div>
          )}

          <AuditWorkspace
            onBackToLanding={() => setCurrentView("landing")}
            onAuditStarted={handleAuditStarted}
            repoPath={selectedRepo}
            setRepoPath={setSelectedRepo}
            darkMode={darkMode}
            isScanning={polling}
          />
        </>
      )}

      {/* ======================================================== */}
      {/* 3. DEDICATED AUDIT RESULTS DASHBOARD VIEW               */}
      {/* ======================================================== */}
      {currentView === "dashboard" && auditStatus && (
        <div>
          {/* Active Audit Context & Action Bar */}
          <div
            className="dashboard-header-bar"
            style={{
              background: cardBg,
              backdropFilter: "blur(16px)",
              border: `1px solid ${cardBorder}`,
              borderRadius: "16px",
              padding: "16px 22px",
              marginBottom: "20px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "14px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
              <button
                onClick={() => setCurrentView("workspace")}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "7px 14px",
                  borderRadius: "10px",
                  fontSize: "12px",
                  fontWeight: 600,
                  background: `${cyan}15`,
                  border: `1px solid ${cyan}33`,
                  color: cyan,
                  cursor: "pointer",
                }}
              >
                <PlusCircle size={14} />
                <span>New Audit</span>
              </button>

              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <FolderOpen size={16} color={cyan} />
                <span style={{ fontSize: "16px", fontWeight: 700, color: textPrimary }}>
                  {repoName}
                </span>
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: 700,
                    padding: "2px 8px",
                    borderRadius: "9999px",
                    background: `${emerald}20`,
                    color: emerald,
                    border: `1px solid ${emerald}40`,
                  }}
                >
                  Score: {auditStatus.overall_score != null ? auditStatus.overall_score.toFixed(1) : "100.0"}/100
                </span>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontSize: "12px", color: textMuted, fontFamily: "JetBrains Mono, monospace" }}>
                ID: {currentAuditId ? currentAuditId.slice(0, 16) : ""}…
              </span>
              <button
                onClick={() => setCurrentView("history")}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "6px 12px",
                  borderRadius: "8px",
                  fontSize: "12px",
                  fontWeight: 600,
                  background: darkMode ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.05)",
                  border: darkMode ? "1px solid rgba(255, 255, 255, 0.1)" : "1px solid rgba(0, 0, 0, 0.1)",
                  color: textSecondary,
                  cursor: "pointer",
                }}
              >
                <History size={13} color={purple} />
                <span>All Audits</span>
              </button>
            </div>
          </div>

          {/* 7 Clean Navigation Tabs */}
          <div
            className="dashboard-tabs-container no-scrollbar"
            style={{
              display: "flex",
              gap: "8px",
              borderBottom: `1px solid ${cardBorder}`,
              paddingBottom: "12px",
              marginBottom: "24px",
              overflowX: "auto",
              WebkitOverflowScrolling: "touch",
            }}
          >
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeDashboardTab === tab.key;

              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveDashboardTab(tab.key)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "10px 16px",
                    borderRadius: "10px",
                    fontSize: "13px",
                    fontWeight: isActive ? 700 : 500,
                    background: isActive
                      ? `${cyan}22`
                      : darkMode
                      ? "rgba(15, 23, 42, 0.5)"
                      : "rgba(241, 245, 249, 0.6)",
                    border: isActive
                      ? `1px solid ${cyan}66`
                      : `1px solid ${cardBorder}`,
                    color: isActive ? cyan : darkMode ? "#94a3b8" : "#475569",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                    whiteSpace: "nowrap",
                  }}
                >
                  <Icon size={16} color={isActive ? cyan : textMuted} />
                  <span>{tab.label}</span>
                  {tab.badge !== undefined && tab.badge > 0 && (
                    <span
                      style={{
                        fontSize: "10px",
                        fontWeight: 700,
                        padding: "1px 6px",
                        borderRadius: "9999px",
                        background: `${cyan}33`,
                        color: cyan,
                      }}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Active Tab View */}
          {activeDashboardTab === "overview" && (
            <OverviewDashboard
              status={auditStatus}
              findings={findings}
              onNavigateTab={(tab) => setActiveDashboardTab(tab)}
              darkMode={darkMode}
              auditId={currentAuditId || undefined}
              onViewInGraph={handleViewInGraph}
            />
          )}

          {activeDashboardTab === "graph" && (
            <div style={{ marginBottom: "28px" }}>
              {/* 2D / 3D Switch Toolbar */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "16px",
                  flexWrap: "wrap",
                  gap: "10px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <button
                    onClick={() => setGraphView("2d")}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "8px 16px",
                      borderRadius: "10px",
                      fontSize: "12px",
                      fontWeight: 700,
                      background: graphView === "2d" ? `${cyan}25` : darkMode ? "rgba(255, 255, 255, 0.05)" : "#f1f5f9",
                      border: graphView === "2d" ? `1.5px solid ${cyan}` : `1px solid ${cardBorder}`,
                      color: graphView === "2d" ? cyan : textSecondary,
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <span>🗺️ 2D Architecture Graph</span>
                  </button>
                  <button
                    onClick={() => setGraphView("3d")}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "8px 16px",
                      borderRadius: "10px",
                      fontSize: "12px",
                      fontWeight: 700,
                      background: graphView === "3d" ? `${cyan}25` : darkMode ? "rgba(255, 255, 255, 0.05)" : "#f1f5f9",
                      border: graphView === "3d" ? `1.5px solid ${cyan}` : `1px solid ${cardBorder}`,
                      color: graphView === "3d" ? cyan : textSecondary,
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <span>🌐 3D Consistency Map</span>
                  </button>
                </div>

                <div style={{ fontSize: "12px", color: textMuted, fontFamily: "JetBrains Mono, monospace" }}>
                  {graphNodes.length} ERCG symbols · {graphEdges.length} verified edges
                </div>
              </div>

              {graphView === "2d" ? (
                <ArchitectureGraph2D
                  nodes={graphNodes}
                  edges={graphEdges}
                  findings={findings}
                  highlightedNodeId={highlightedGraphNode}
                  onToggle3D={() => setGraphView("3d")}
                  darkMode={darkMode}
                />
              ) : (
                <ConsistencyGraph3D
                  nodes={graphNodes}
                  edges={graphEdges}
                  findings={findings}
                  onSelectNode={() => setActiveDashboardTab("findings")}
                  darkMode={darkMode}
                  auditId={currentAuditId || undefined}
                />
              )}
            </div>
          )}

          {activeDashboardTab === "score" && (
            <IntegrityScoreRadar status={auditStatus} darkMode={darkMode} />
          )}

          {activeDashboardTab === "findings" && (
            <FindingsExplorer
              findings={findings}
              total={totalFindings}
              auditId={currentAuditId || ""}
              darkMode={darkMode}
              onViewInGraph={handleViewInGraph}
            />
          )}

          {activeDashboardTab === "negspace" && (
            <NegativeSpaceView
              findings={findings}
              darkMode={darkMode}
              auditId={currentAuditId || ""}
              onViewInGraph={handleViewInGraph}
            />
          )}

          {activeDashboardTab === "reports" && currentAuditId && (
            <ReportsExportView auditId={currentAuditId} darkMode={darkMode} />
          )}

          {activeDashboardTab === "history" && (
            <AuditHistory
              currentAuditId={currentAuditId}
              onLoadAudit={handleLoadHistoricalAudit}
              darkMode={darkMode}
            />
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* 4. DEDICATED AUDIT HISTORY VIEW                         */}
      {/* ======================================================== */}
      {currentView === "history" && (
        <div>
          <div style={{ marginBottom: "16px" }}>
            <button
              onClick={() => setCurrentView(auditStatus ? "dashboard" : "landing")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
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
              <ArrowLeft size={16} />
              <span>Back to {auditStatus ? "Dashboard" : "Home"}</span>
            </button>
          </div>

          <AuditHistory
            currentAuditId={currentAuditId}
            onLoadAudit={handleLoadHistoricalAudit}
            darkMode={darkMode}
          />
        </div>
      )}

      {/* Footer */}
      <footer
        style={{
          marginTop: "54px",
          paddingTop: "20px",
          borderTop: `1px solid ${cardBorder}`,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: "12px",
          color: textMuted,
          flexWrap: "wrap",
          gap: "8px",
        }}
      >
        <div>TraceGuard • Architecture-Agnostic Structural &amp; Security Integrity Agent</div>
        <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
          {["Python 3.11+", "FastAPI", "NetworkX", "Tree-sitter", "Three.js", "React 18"].map((t) => (
            <span key={t} style={{ opacity: 0.7 }}>
              {t}
            </span>
          ))}
        </div>
      </footer>
    </div>
  </>
  );
};
