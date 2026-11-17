import React, { useState, useEffect } from "react";
import { traceguardApi, AuditStatus, Finding } from "./api/client";
import { CyberHeader } from "./components/CyberHeader";
import { AuditForm } from "./components/AuditForm";
import { ConsistencyGraph3D, GraphNode, GraphEdge } from "./components/ConsistencyGraph3D";
import { IntegrityScoreRadar } from "./components/IntegrityScoreRadar";
import { FindingsExplorer } from "./components/FindingsExplorer";
import { NegativeSpaceView } from "./components/NegativeSpaceView";
import { ReportsExportView } from "./components/ReportsExportView";
import { Globe2, BarChart3, ShieldAlert, Puzzle, FileText, Loader2 } from "lucide-react";

export const App: React.FC = () => {
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
  const [activeTab, setActiveTab] = useState<"graph" | "score" | "findings" | "negspace" | "reports">(
    "graph"
  );

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
            // Fetch findings
            const fRes = await traceguardApi.getFindings(currentAuditId, 1, 150);
            setFindings(fRes.findings);
            setTotalFindings(fRes.total);

            // Fetch graph
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
  };

  const handleSelectPresetRepo = (path: string) => {
    setSelectedRepo(path);
  };

  const handleSelectNode = (nodeName: string) => {
    setActiveTab("findings");
  };

  const tabs = [
    { key: "graph", label: "🌐 3D Consistency Map", icon: Globe2 },
    { key: "score", label: "📊 Integrity Assessment", icon: BarChart3 },
    {
      key: "findings",
      label: `🛡️ Findings (${findings.length})`,
      icon: ShieldAlert,
      badgeColor: findings.some((f) => f.severity === "critical") ? "#f43f5e" : "#38bdf8",
    },
    { key: "negspace", label: "🧩 Negative-Space Gaps", icon: Puzzle },
    { key: "reports", label: "📄 Reports & Exports", icon: FileText },
  ];

  return (
    <div style={{ maxWidth: "1320px", margin: "0 auto", padding: "28px 24px" }}>
      {/* Cyber Header with Live Health & Preset Selector */}
      <CyberHeader
        serverHealth={serverHealth}
        onSelectPresetRepo={handleSelectPresetRepo}
        selectedRepo={selectedRepo}
      />

      {/* Main Audit Control Form */}
      <AuditForm
        onAuditStarted={handleAuditStarted}
        repoPath={selectedRepo}
        setRepoPath={setSelectedRepo}
      />

      {/* Real-time Scanning Progress Bar */}
      {polling && auditStatus?.status === "running" && (
        <div
          style={{
            background: "rgba(56, 189, 248, 0.1)",
            border: "1px solid rgba(56, 189, 248, 0.3)",
            borderRadius: "14px",
            padding: "16px 20px",
            marginBottom: "24px",
            display: "flex",
            alignItems: "center",
            gap: "14px",
          }}
        >
          <Loader2 size={20} color="#38bdf8" className="radar-sweep" />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: "14px", color: "#38bdf8", marginBottom: "2px" }}>
              Analyzing AST, Extracting Symbols & Traversing ERCG Consistency Graph...
            </div>
            <div style={{ fontSize: "12px", color: "#94a3b8" }}>
              Audit ID: {currentAuditId} • Target: {selectedRepo}
            </div>
          </div>
        </div>
      )}

      {/* Navigation Tab Bar */}
      {auditStatus && auditStatus.status === "completed" && (
        <>
          <div
            style={{
              display: "flex",
              gap: "8px",
              borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
              paddingBottom: "12px",
              marginBottom: "24px",
              overflowX: "auto",
            }}
          >
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "10px 18px",
                    borderRadius: "10px",
                    fontSize: "13px",
                    fontWeight: isActive ? 700 : 500,
                    background: isActive ? "rgba(56, 189, 248, 0.15)" : "rgba(15, 23, 42, 0.5)",
                    border: isActive
                      ? "1px solid rgba(56, 189, 248, 0.4)"
                      : "1px solid rgba(255, 255, 255, 0.05)",
                    color: isActive ? "#38bdf8" : "#94a3b8",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                    whiteSpace: "nowrap",
                  }}
                >
                  <Icon size={16} color={isActive ? "#38bdf8" : "#64748b"} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Active Tab View */}
          {activeTab === "graph" && (
            <div style={{ marginBottom: "28px" }}>
              <ConsistencyGraph3D
                nodes={graphNodes}
                edges={graphEdges}
                findings={findings}
                onSelectNode={handleSelectNode}
              />
            </div>
          )}

          {activeTab === "score" && (
            <IntegrityScoreRadar status={auditStatus} />
          )}

          {activeTab === "findings" && (
            <FindingsExplorer findings={findings} total={totalFindings} />
          )}

          {activeTab === "negspace" && (
            <NegativeSpaceView findings={findings} />
          )}

          {activeTab === "reports" && currentAuditId && (
            <ReportsExportView auditId={currentAuditId} />
          )}
        </>
      )}

      {/* Footer */}
      <footer
        style={{
          marginTop: "48px",
          paddingTop: "20px",
          borderTop: "1px solid rgba(255, 255, 255, 0.05)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: "12px",
          color: "#64748b",
        }}
      >
        <div>
          TraceGuard • Architecture-Agnostic Structural & Security Integrity Agent
        </div>
        <div style={{ display: "flex", gap: "16px" }}>
          <span>Python 3.11+</span>
          <span>FastAPI</span>
          <span>NetworkX</span>
          <span>Tree-sitter</span>
          <span>Three.js</span>
          <span>React 18</span>
        </div>
      </footer>
    </div>
  );
};
