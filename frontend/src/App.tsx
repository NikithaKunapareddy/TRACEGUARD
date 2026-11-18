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
  PlusCircle,
  FolderOpen,
} from "lucide-react";

type ViewState = "landing" | "workspace" | "dashboard" | "history";
type TabKey = "overview" | "graph" | "score" | "findings" | "negspace" | "reports" | "history";

export const App: React.FC = () => {
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

  const [currentView, setCurrentView] = useState<ViewState>("landing");
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

  useEffect(() => {
    traceguardApi
      .health()
      .then(() => setServerHealth(true))
      .catch(() => setServerHealth(false));

    traceguardApi
      .listAudits(undefined, undefined, 100)
      .then((res) => setTotalAuditsCount(res.length))
      .catch(() => {});
  }, []);

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

      const fRes = await traceguardApi.getFindings(auditId, 1, 150);
      setFindings(fRes.findings || []);
      setTotalFindings(fRes.total || (fRes.findings ? fRes.findings.length : 0));

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

  const textPrimary = darkMode ? "#f8fafc" : "#0f172a";
  const textSecondary = darkMode ? "#cbd5e1" : "#334155";
  const textMuted = darkMode ? "#94a3b8" : "#64748b";

  // 7 VIBGYOR-accented Intelligence Lenses
  const tabs: Array<{
    key: TabKey;
    label: string;
    icon: React.ElementType;
    accent: string;
    badge?: number;
  }> = [
    { key: "overview", label: "Overview", icon: LayoutDashboard, accent: "#8b5cf6" },
    { key: "graph", label: "Graph Architecture", icon: Globe2, accent: "#6366f1" },
    { key: "score", label: "Integrity Radar", icon: BarChart3, accent: "#3b82f6" },
    { key: "findings", label: "Findings", icon: ShieldAlert, accent: "#f43f5e", badge: findings.length },
    { key: "negspace", label: "Negative Space", icon: Puzzle, accent: "#f97316" },
    { key: "reports", label: "Exports", icon: FileText, accent: "#10b981" },
    { key: "history", label: "Audit History", icon: History, accent: "#eab308" },
  ];

  const repoName = auditStatus?.repo_path
    ? auditStatus.repo_path.split(/[/\\]/).pop()
    : "Repository";

  return (
    <>
      {/* Living VIBGYOR Atmospheric Aurora Canvas */}
      <div className="gemini-ambient-bg" aria-hidden="true">
        <div className="aurora-floating-orb orb-1" />
        <div className="aurora-floating-orb orb-2" />
        <div className="aurora-floating-orb orb-3" />
        <div className="aurora-floating-orb orb-4" />
        <div className="aurora-floating-orb orb-5" />
        <div className="aurora-floating-orb orb-6" />
      </div>

      <div className="app-main-layout">
        {/* Floating Unified Spectral Navbar */}
        <CyberHeader
          serverHealth={serverHealth}
          darkMode={darkMode}
          onToggleTheme={handleToggleTheme}
          onNavigateLanding={() => setCurrentView("landing")}
          onNavigateWorkspace={() => setCurrentView("workspace")}
          onNavigateHistory={() => setCurrentView("history")}
          onNavigateDashboard={
            auditStatus ? () => setCurrentView("dashboard") : undefined
          }
          hasActiveAudit={Boolean(auditStatus)}
          activeScore={auditStatus?.overall_score}
          currentView={currentView}
        />

        {/* ======================================================== */}
        {/* 1. OPEN SPATIAL LANDING STREAM                          */}
        {/* ======================================================== */}
        {currentView === "landing" && (
          <LandingHero
            onStartAudit={() => setCurrentView("workspace")}
            onViewHistory={() => setCurrentView("history")}
            onExploreCapabilities={() => setCurrentView("workspace")}
            onQuickLaunchRepo={(path) => {
              setSelectedRepo(path);
              setCurrentView("workspace");
            }}
            darkMode={darkMode}
            totalAuditsCount={totalAuditsCount}
          />
        )}

        {/* ======================================================== */}
        {/* 2. STUDIO AUDIT LAUNCHPAD STREAM                        */}
        {/* ======================================================== */}
        {currentView === "workspace" && (
          <>
            {polling && auditStatus?.status === "running" && (
              <div
                className="vibgyor-prism-surface animate-reveal"
                style={{
                  borderRadius: "26px",
                  padding: "18px 24px",
                  marginBottom: "28px",
                  display: "flex",
                  alignItems: "center",
                  gap: "16px",
                }}
              >
                <Loader2
                  size={24}
                  color="#8b5cf6"
                  style={{ animation: "spin 1s linear infinite", flexShrink: 0 }}
                />
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontWeight: 800,
                      fontSize: "14.5px",
                      color: textPrimary,
                      marginBottom: "2px",
                    }}
                  >
                    Parsing AST, Resolving Cross-File Taint &amp; Traversing ERCG Consistency Graph…
                  </div>
                  <div style={{ fontSize: "12px", color: textMuted }}>
                    Audit ID: {currentAuditId} · Target: {selectedRepo}
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
        {/* 3. LIVE INTELLIGENCE DASHBOARD STREAM                   */}
        {/* ======================================================== */}
        {currentView === "dashboard" && auditStatus && (
          <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
            {/* Open Spectral Context Header (Zero Box) */}
            <div
              className="animate-reveal"
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-end",
                flexWrap: "wrap",
                gap: "16px",
              }}
            >
              <div>
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                    fontSize: "11.5px",
                    fontWeight: 800,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    color: "#8b5cf6",
                    marginBottom: "6px",
                  }}
                >
                  <FolderOpen size={14} />
                  <span>Active Intelligence Session · {currentAuditId?.slice(0, 12)}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                  <h1
                    style={{
                      margin: 0,
                      fontSize: "clamp(26px, 3.6vw, 40px)",
                      fontWeight: 800,
                      letterSpacing: "-0.035em",
                      color: textPrimary,
                    }}
                  >
                    {repoName}
                  </h1>
                  <span
                    style={{
                      fontSize: "13px",
                      fontWeight: 800,
                      padding: "5px 14px",
                      borderRadius: "9999px",
                      background: "rgba(16, 185, 129, 0.16)",
                      color: "#10b981",
                    }}
                  >
                    Integrity{" "}
                    {auditStatus.overall_score != null
                      ? auditStatus.overall_score.toFixed(1)
                      : "100.0"}{" "}
                    / 100
                  </span>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                <button
                  onClick={() => setCurrentView("workspace")}
                  className="vibgyor-cta-btn"
                  style={{ padding: "10px 20px", fontSize: "13px" }}
                >
                  <PlusCircle size={15} />
                  <span>New Audit</span>
                </button>
              </div>
            </div>

            {/* Floating VIBGYOR Pill Mode Switcher */}
            <div
              className="vibgyor-prism-surface no-scrollbar"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 12px",
                borderRadius: "9999px",
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
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "9px 18px",
                      borderRadius: "9999px",
                      fontSize: "13px",
                      fontWeight: isActive ? 800 : 600,
                      background: isActive ? tab.accent : "transparent",
                      border: "none",
                      color: isActive ? "#ffffff" : textSecondary,
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                      boxShadow: isActive ? `0 6px 18px -4px ${tab.accent}88` : "none",
                    }}
                  >
                    <Icon size={15} color={isActive ? "#ffffff" : tab.accent} />
                    <span>{tab.label}</span>
                    {tab.badge !== undefined && tab.badge > 0 && (
                      <span
                        style={{
                          fontSize: "10.5px",
                          fontWeight: 800,
                          padding: "1px 7px",
                          borderRadius: "9999px",
                          background: isActive ? "rgba(255,255,255,0.25)" : `${tab.accent}22`,
                          color: isActive ? "#ffffff" : tab.accent,
                        }}
                      >
                        {tab.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Active Intelligence Lens */}
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
                        padding: "9px 18px",
                        borderRadius: "9999px",
                        fontSize: "12.5px",
                        fontWeight: 800,
                        background:
                          graphView === "2d"
                            ? "#8b5cf6"
                            : darkMode
                            ? "rgba(255, 255, 255, 0.06)"
                            : "rgba(15, 23, 42, 0.06)",
                        border: "none",
                        color: graphView === "2d" ? "#ffffff" : textSecondary,
                        cursor: "pointer",
                      }}
                    >
                      <span>2D Graph Architecture</span>
                    </button>
                    <button
                      onClick={() => setGraphView("3d")}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "9px 18px",
                        borderRadius: "9999px",
                        fontSize: "12.5px",
                        fontWeight: 800,
                        background:
                          graphView === "3d"
                            ? "#3b82f6"
                            : darkMode
                            ? "rgba(255, 255, 255, 0.06)"
                            : "rgba(15, 23, 42, 0.06)",
                        border: "none",
                        color: graphView === "3d" ? "#ffffff" : textSecondary,
                        cursor: "pointer",
                      }}
                    >
                      <span>3D Graph Architecture</span>
                    </button>
                  </div>

                  <div
                    style={{
                      fontSize: "12px",
                      color: textMuted,
                      fontFamily: "JetBrains Mono, monospace",
                    }}
                  >
                    {graphNodes.length > 0
                      ? `Actual ERCG Data · ${graphNodes.length} ERCG symbols · ${graphEdges.length} verified edges`
                      : "Illustrative Preview · Synthetic fallback topology"}
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
        {/* 4. DEDICATED AUDIT VAULT VIEW                           */}
        {/* ======================================================== */}
        {currentView === "history" && (
          <AuditHistory
            currentAuditId={currentAuditId}
            onLoadAudit={handleLoadHistoricalAudit}
            darkMode={darkMode}
          />
        )}

        {/* Open Spectral Footer Ribbon */}
        <footer style={{ marginTop: "auto", paddingTop: "48px" }}>
          <div className="spectral-hairline" style={{ marginBottom: "20px" }} />
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: "12px",
              color: textMuted,
              flexWrap: "wrap",
              gap: "12px",
            }}
          >
            <div>
              <strong style={{ color: textPrimary }}>TraceGuard</strong> · Autonomous
              Structural &amp; Security Integrity Engine
            </div>
            <div style={{ display: "flex", gap: "14px", flexWrap: "wrap" }}>
              {["Python 3.11+", "FastAPI", "NetworkX ERCG", "Tree-sitter AST", "Three.js", "React 18"].map(
                (t) => (
                  <span key={t}>{t}</span>
                )
              )}
            </div>
          </div>
        </footer>
      </div>
    </>
  );
};
