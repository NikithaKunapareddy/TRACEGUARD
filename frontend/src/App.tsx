import React, { useState, useEffect, useRef } from "react";
import { traceguardApi, AuditStatus, Finding } from "./api/client";
import { CyberHeader } from "./components/CyberHeader";
import { LandingHero } from "./components/LandingHero";
import { AuditForm } from "./components/AuditForm";
import { OverviewDashboard } from "./components/OverviewDashboard";
import { ConsistencyGraph3D, GraphNode, GraphEdge } from "./components/ConsistencyGraph3D";
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
  ChevronDown,
  ChevronUp,
} from "lucide-react";

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
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [showLaunchForm, setShowLaunchForm] = useState<boolean>(true);

  const formRef = useRef<HTMLDivElement>(null);

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
            setFindings(fRes.findings);
            setTotalFindings(fRes.total);

            try {
              const gRes = await traceguardApi.getGraph(currentAuditId);
              if (gRes.nodes) setGraphNodes(gRes.nodes);
              if (gRes.edges) setGraphEdges(gRes.edges);
            } catch (gErr) {
              console.warn("Could not load 3D graph data:", gErr);
            }
            setActiveTab("overview");
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
    setActiveTab("overview");
  };

  const handleSelectPresetRepo = (path: string) => {
    setSelectedRepo(path);
  };

  const handleSelectNode = (_nodeName: string) => {
    setActiveTab("findings");
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

      // Fetch historical findings
      const fRes = await traceguardApi.getFindings(auditId, 1, 150);
      setFindings(fRes.findings || []);
      setTotalFindings(fRes.total || (fRes.findings ? fRes.findings.length : 0));

      // Fetch historical graph
      try {
        const gRes = await traceguardApi.getGraph(auditId);
        if (gRes.nodes) setGraphNodes(gRes.nodes);
        if (gRes.edges) setGraphEdges(gRes.edges);
      } catch (gErr) {
        console.warn("Graph load notice:", gErr);
      }

      setActiveTab(jumpToTab);
    } catch (err: any) {
      alert(`Could not load historical audit: ${err.message}`);
    }
  };

  const scrollToLaunchForm = () => {
    setShowLaunchForm(true);
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  // Color tokens
  const cyan = darkMode ? "#38bdf8" : "#0284c7";
  const purple = darkMode ? "#a855f7" : "#7c3aed";
  const textMuted = darkMode ? "#64748b" : "#94a3b8";
  const cardBorder = darkMode ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.08)";

  const tabs: Array<{ key: TabKey; label: string; icon: React.ElementType; badge?: number }> = [
    { key: "overview", label: "Overview", icon: LayoutDashboard },
    { key: "graph", label: "3D Consistency Map", icon: Globe2 },
    { key: "score", label: "Integrity Assessment", icon: BarChart3 },
    { key: "findings", label: "Findings", icon: ShieldAlert, badge: findings.length },
    { key: "negspace", label: "Negative-Space Gaps", icon: Puzzle },
    { key: "reports", label: "Reports & Exports", icon: FileText },
    { key: "history", label: "Audit History", icon: History },
  ];

  return (
    <div style={{ maxWidth: "1340px", margin: "0 auto", padding: "24px 20px" }}>
      {/* Product Identity Header */}
      <CyberHeader
        serverHealth={serverHealth}
        onSelectPresetRepo={handleSelectPresetRepo}
        selectedRepo={selectedRepo}
        darkMode={darkMode}
        onToggleTheme={handleToggleTheme}
      />

      {/* Landing Hero Screen (Shown as clean introductory banner) */}
      <LandingHero
        onStartAudit={scrollToLaunchForm}
        onViewHistory={() => setActiveTab("history")}
        onExploreCapabilities={() => setActiveTab("graph")}
        darkMode={darkMode}
        totalAuditsCount={totalAuditsCount}
      />

      {/* Audit Launch Section (Collapsible) */}
      <div ref={formRef} style={{ marginBottom: "24px" }}>
        <div
          onClick={() => setShowLaunchForm((prev) => !prev)}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            cursor: "pointer",
            padding: "8px 4px",
            marginBottom: "8px",
          }}
        >
          <div style={{ fontSize: "13px", fontWeight: 700, color: textMuted, textTransform: "uppercase", letterSpacing: "0.5px" }}>
            Audit Configuration &amp; Target Repository
          </div>
          <button
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              background: "transparent",
              border: "none",
              color: cyan,
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {showLaunchForm ? (
              <>
                <span>Collapse Form</span>
                <ChevronUp size={14} />
              </>
            ) : (
              <>
                <span>Configure New Audit</span>
                <ChevronDown size={14} />
              </>
            )}
          </button>
        </div>

        {showLaunchForm && (
          <AuditForm
            onAuditStarted={handleAuditStarted}
            repoPath={selectedRepo}
            setRepoPath={setSelectedRepo}
          />
        )}
      </div>

      {/* Real-time Scanning Progress Bar */}
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

      {/* Main Dashboard Navigation Bar (7 Tabs) */}
      <div
        style={{
          display: "flex",
          gap: "8px",
          borderBottom: `1px solid ${cardBorder}`,
          paddingBottom: "12px",
          marginBottom: "24px",
          overflowX: "auto",
        }}
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          const hasAudit = auditStatus && auditStatus.status === "completed";
          const isResultTab = tab.key !== "history";
          const isDisabled = isResultTab && !hasAudit;

          return (
            <button
              key={tab.key}
              disabled={isDisabled}
              onClick={() => !isDisabled && setActiveTab(tab.key)}
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
                color: isActive ? cyan : isDisabled ? textMuted : darkMode ? "#94a3b8" : "#475569",
                cursor: isDisabled ? "not-allowed" : "pointer",
                opacity: isDisabled ? 0.45 : 1,
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
      {activeTab === "overview" && auditStatus?.status === "completed" && (
        <OverviewDashboard
          status={auditStatus}
          findings={findings}
          onNavigateTab={setActiveTab}
          darkMode={darkMode}
        />
      )}

      {activeTab === "graph" && auditStatus?.status === "completed" && (
        <div style={{ marginBottom: "28px" }}>
          <ConsistencyGraph3D
            nodes={graphNodes}
            edges={graphEdges}
            findings={findings}
            onSelectNode={handleSelectNode}
          />
        </div>
      )}

      {activeTab === "score" && auditStatus?.status === "completed" && (
        <IntegrityScoreRadar status={auditStatus} />
      )}

      {activeTab === "findings" && auditStatus?.status === "completed" && (
        <FindingsExplorer findings={findings} total={totalFindings} />
      )}

      {activeTab === "negspace" && auditStatus?.status === "completed" && (
        <NegativeSpaceView findings={findings} />
      )}

      {activeTab === "reports" && auditStatus?.status === "completed" && currentAuditId && (
        <ReportsExportView auditId={currentAuditId} />
      )}

      {activeTab === "history" && (
        <AuditHistory
          currentAuditId={currentAuditId}
          onLoadAudit={handleLoadHistoricalAudit}
          darkMode={darkMode}
        />
      )}

      {/* Footer */}
      <footer
        style={{
          marginTop: "48px",
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
  );
};
