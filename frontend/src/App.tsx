import React, { useState, useEffect } from "react";
import { traceguardApi, AuditStatus, Finding } from "./api/client";
import { CyberHeader } from "./components/CyberHeader";
import { AuditForm } from "./components/AuditForm";
import { ConsistencyGraph3D, GraphNode, GraphEdge } from "./components/ConsistencyGraph3D";
import { IntegrityScoreRadar } from "./components/IntegrityScoreRadar";
import { FindingsExplorer } from "./components/FindingsExplorer";
import { NegativeSpaceView } from "./components/NegativeSpaceView";
import { ReportsExportView } from "./components/ReportsExportView";
import { AuditHistory } from "./components/AuditHistory";
import {
  Globe2,
  BarChart3,
  ShieldAlert,
  Puzzle,
  FileText,
  Loader2,
  History,
} from "lucide-react";

type TabKey = "graph" | "score" | "findings" | "negspace" | "reports" | "history";

export const App: React.FC = () => {
  // ── Theme ───────────────────────────────────────────────────────────────────
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem("traceguard-theme");
      return stored !== "light";
    } catch {
      return true;
    }
  });

  useEffect(() => {
    document.documentElement.setAttribute(
      "data-theme",
      darkMode ? "dark" : "light"
    );
    try {
      localStorage.setItem("traceguard-theme", darkMode ? "dark" : "light");
    } catch {}
  }, [darkMode]);

  const handleToggleTheme = () => setDarkMode((d) => !d);

  // ── Audit state ──────────────────────────────────────────────────────────────
  const [currentAuditId, setCurrentAuditId] = useState<string | null>(null);
  const [auditStatus, setAuditStatus] = useState<AuditStatus | null>(null);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [totalFindings, setTotalFindings] = useState<number>(0);
  const [graphNodes, setGraphNodes] = useState<GraphNode[]>([]);
  const [graphEdges, setGraphEdges] = useState<GraphEdge[]>([]);
  const [polling, setPolling] = useState<boolean>(false);
  const [serverHealth, setServerHealth] = useState<boolean | null>(null);
  const [selectedRepo, setSelectedRepo] = useState<string>(
    "./benchmark_repos/repo1_ecommerce_fullstack"
  );
  const [activeTab, setActiveTab] = useState<TabKey>("graph");

  // Health check on mount
  useEffect(() => {
    traceguardApi
      .health()
      .then(() => setServerHealth(true))
      .catch(() => setServerHealth(false));
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
    setActiveTab("graph");
  };

  const handleSelectPresetRepo = (path: string) => setSelectedRepo(path);
  const handleSelectNode = (_nodeName: string) => setActiveTab("findings");

  // Colour tokens (passed to child as inline styles)
  const cyan = darkMode ? "#38bdf8" : "#0284c7";
  const textPrimary = darkMode ? "#f8fafc" : "#0f172a";
  const textMuted = darkMode ? "#64748b" : "#94a3b8";
  const cardBg = darkMode ? "rgba(15,23,42,0.75)" : "rgba(255,255,255,0.85)";
  const cardBorder = darkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";

  const tabs: Array<{ key: TabKey; label: string; icon: React.ElementType; badge?: string; badgeColor?: string }> = [
    { key: "graph",    label: "3D Consistency Map",  icon: Globe2 },
    { key: "score",    label: "Integrity Assessment", icon: BarChart3 },
    {
      key: "findings",
      label: `Findings (${findings.length})`,
      icon: ShieldAlert,
      badgeColor: findings.some((f) => f.severity === "critical") ? "#f43f5e" : cyan,
    },
    { key: "negspace", label: "Negative-Space Gaps", icon: Puzzle },
    { key: "reports",  label: "Reports & Exports",   icon: FileText },
    { key: "history",  label: "Audit History",        icon: History },
  ];

  const tabIcons: Record<TabKey, string> = {
    graph:    "🌐",
    score:    "📊",
    findings: "🛡️",
    negspace: "🧩",
    reports:  "📄",
    history:  "🕐",
  };

  return (
    <div style={{ maxWidth: "1320px", margin: "0 auto", padding: "28px 24px" }}>
      {/* Header */}
      <CyberHeader
        serverHealth={serverHealth}
        onSelectPresetRepo={handleSelectPresetRepo}
        selectedRepo={selectedRepo}
        darkMode={darkMode}
        onToggleTheme={handleToggleTheme}
      />

      {/* Audit Form */}
      <AuditForm
        onAuditStarted={handleAuditStarted}
        repoPath={selectedRepo}
        setRepoPath={setSelectedRepo}
      />

      {/* Scanning progress bar */}
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
            size={20}
            color={cyan}
            style={{ animation: "spin 1s linear infinite", flexShrink: 0 }}
          />
          <div style={{ flex: 1 }}>
            <div
              style={{ fontWeight: 700, fontSize: "14px", color: cyan, marginBottom: "2px" }}
            >
              Analyzing AST, Extracting Symbols &amp; Traversing ERCG Consistency Graph…
            </div>
            <div style={{ fontSize: "12px", color: textMuted }}>
              Audit ID: {currentAuditId} • Target: {selectedRepo}
            </div>
          </div>
        </div>
      )}

      {/* Failed state */}
      {auditStatus?.status === "failed" && (
        <div
          style={{
            background: "rgba(244,63,94,0.08)",
            border: "1px solid rgba(244,63,94,0.3)",
            borderRadius: "14px",
            padding: "16px 20px",
            marginBottom: "24px",
            color: "#f87171",
            fontSize: "13px",
          }}
        >
          ❌ Audit failed: {auditStatus.error || "Unknown error. Check FastAPI logs."}
        </div>
      )}

      {/* Tab Nav (always show History tab, rest only after completed audit) */}
      {(auditStatus?.status === "completed" || true) && (
        <>
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
              // Disable result tabs until audit completes
              const isDisabled =
                tab.key !== "history" &&
                (!auditStatus || auditStatus.status !== "completed");

              return (
                <button
                  key={tab.key}
                  disabled={isDisabled}
                  onClick={() => !isDisabled && setActiveTab(tab.key)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "10px 18px",
                    borderRadius: "10px",
                    fontSize: "13px",
                    fontWeight: isActive ? 700 : 500,
                    background: isActive
                      ? `${cyan}22`
                      : darkMode
                      ? "rgba(15,23,42,0.5)"
                      : "rgba(241,245,249,0.6)",
                    border: isActive
                      ? `1px solid ${cyan}66`
                      : `1px solid ${cardBorder}`,
                    color: isActive ? cyan : isDisabled ? textMuted : (darkMode ? "#94a3b8" : "#475569"),
                    cursor: isDisabled ? "not-allowed" : "pointer",
                    opacity: isDisabled ? 0.5 : 1,
                    transition: "all 0.15s ease",
                    whiteSpace: "nowrap",
                  }}
                >
                  <span>{tabIcons[tab.key]}</span>
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Tab Content */}
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
              onLoadAudit={(id) => {
                // Switch to score tab to show that audit's details
                setCurrentAuditId(id);
                setActiveTab("score");
              }}
            />
          )}

          {/* Landing state: no audit run yet */}
          {activeTab !== "history" && !auditStatus && (
            <div
              style={{
                background: cardBg,
                backdropFilter: "blur(16px)",
                border: `1px solid ${cardBorder}`,
                borderRadius: "16px",
                padding: "60px 20px",
                textAlign: "center",
                color: textMuted,
              }}
            >
              <div style={{ fontSize: "48px", marginBottom: "16px" }}>🛡️</div>
              <div
                style={{ fontSize: "17px", fontWeight: 700, color: textPrimary, marginBottom: "8px" }}
              >
                Ready to Audit
              </div>
              <div style={{ fontSize: "13px", maxWidth: "400px", margin: "0 auto" }}>
                Select a benchmark repository above and click <strong>Run TraceGuard Audit</strong> to
                begin the ERCG analysis.
              </div>
            </div>
          )}
        </>
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
          {["Python 3.11+", "FastAPI", "NetworkX", "Tree-sitter", "Three.js", "React 18"].map(
            (t) => (
              <span key={t} style={{ opacity: 0.7 }}>
                {t}
              </span>
            )
          )}
        </div>
      </footer>
    </div>
  );
};
