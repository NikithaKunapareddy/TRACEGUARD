import React, { useState } from "react";
import { Finding } from "../api/client";
import { FindingEvidenceModal } from "./FindingEvidenceModal";
import { Puzzle, ArrowRight, AlertCircle, CheckCircle2, ShieldQuestion, FileCode, Globe2 } from "lucide-react";

interface NegativeSpaceViewProps {
  findings: Finding[];
  darkMode?: boolean;
  auditId?: string;
  onViewInGraph?: (file: string) => void;
}

export const NegativeSpaceView: React.FC<NegativeSpaceViewProps> = ({
  findings,
  darkMode = true,
  auditId,
  onViewInGraph,
}) => {
  const [modalFinding, setModalFinding] = useState<Finding | null>(null);

  const panelBg = darkMode ? "rgba(15, 23, 42, 0.75)" : "#ffffff";
  const borderBase = darkMode ? "rgba(255, 255, 255, 0.08)" : "#e2e8f0";
  const textPrimary = darkMode ? "#f8fafc" : "#0f172a";
  const textSecondary = darkMode ? "#cbd5e1" : "#475569";
  const textMuted = darkMode ? "#64748b" : "#94a3b8";
  const cyan = darkMode ? "#38bdf8" : "#0284c7";
  const purple = darkMode ? "#a855f7" : "#7c3aed";
  const emerald = darkMode ? "#10b981" : "#059669";
  const rose = darkMode ? "#f43f5e" : "#dc2626";
  const amber = darkMode ? "#f59e0b" : "#d97706";

  const gapFindings = findings.filter((f) => f.category === "gap");
  const missingRoutes = gapFindings.filter(
    (f) => f.title.toLowerCase().includes("missing backend route") || f.subcategory === "missing_backend_route"
  );
  const mockStubs = gapFindings.filter(
    (f) => f.title.toLowerCase().includes("mock") || f.subcategory === "mock_placeholder_endpoint"
  );

  return (
    <div style={{ marginBottom: "32px" }}>
      {/* Overview Banner */}
      <div
        style={{
          background: darkMode ? "rgba(168, 85, 247, 0.08)" : "rgba(124, 58, 237, 0.08)",
          border: darkMode ? "1px solid rgba(168, 85, 247, 0.25)" : "1px solid rgba(124, 58, 237, 0.25)",
          borderRadius: "16px",
          padding: "20px 24px",
          marginBottom: "24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
            <Puzzle size={20} color={purple} />
            <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: textPrimary }}>
              Negative-Space Architectural Analysis
            </h3>
          </div>
          <p style={{ margin: 0, color: textSecondary, fontSize: "13px", lineHeight: 1.5 }}>
            Traditional linters analyze code that is present. TraceGuard identifies <strong>what is missing</strong>:
            unimplemented backend routes invoked by frontends, mock data stubs disguised as production endpoints, and broken cross-service contracts.
          </p>
        </div>

        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ fontSize: "28px", fontWeight: 800, color: purple }}>
            {gapFindings.length}
          </div>
          <div style={{ fontSize: "11px", fontWeight: 700, color: textMuted, textTransform: "uppercase" }}>
            Detected Gaps
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
        {/* Missing Backend Routes (Frontend calls non-existent endpoint) */}
        <div
          style={{
            background: panelBg,
            backdropFilter: "blur(14px)",
            border: `1px solid ${borderBase}`,
            borderRadius: "14px",
            padding: "20px",
            boxShadow: darkMode ? "0 8px 30px rgba(0, 0, 0, 0.3)" : "0 4px 20px rgba(0, 0, 0, 0.05)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
            <AlertCircle size={18} color={rose} />
            <h4 style={{ margin: 0, fontSize: "15px", color: textPrimary, fontWeight: 700 }}>
              Dangling Client Invocations
            </h4>
          </div>

          {missingRoutes.length === 0 ? (
            <div style={{ padding: "24px", textAlign: "center", color: textMuted, fontSize: "13px" }}>
              ✓ All frontend client calls have verified corresponding backend endpoints.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {missingRoutes.map((mr) => (
                <div
                  key={mr.id}
                  style={{
                    background: darkMode ? "rgba(244, 63, 94, 0.08)" : "rgba(254, 242, 242, 0.8)",
                    border: darkMode ? "1px solid rgba(244, 63, 94, 0.25)" : "1px solid rgba(244, 63, 94, 0.25)",
                    borderRadius: "10px",
                    padding: "14px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                    <span style={{ fontWeight: 700, fontSize: "13px", color: rose }}>
                      {mr.title}
                    </span>
                    <span style={{ fontSize: "11px", color: textMuted, fontFamily: "JetBrains Mono, monospace" }}>
                      {mr.affected_file}:{mr.line_number}
                    </span>
                  </div>
                  <pre
                    style={{
                      margin: 0,
                      padding: "8px 12px",
                      borderRadius: "6px",
                      background: darkMode ? "#030712" : "#ffffff",
                      border: `1px solid ${borderBase}`,
                      fontSize: "11px",
                      color: rose,
                      fontFamily: "JetBrains Mono, monospace",
                    }}
                  >
                    {mr.snippet}
                  </pre>
                  <p style={{ margin: "8px 0 10px 0", fontSize: "12px", color: textSecondary }}>
                    {mr.recommended_remediation}
                  </p>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      onClick={() => setModalFinding(mr)}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "5px",
                        padding: "5px 10px",
                        borderRadius: "6px",
                        fontSize: "11px",
                        fontWeight: 700,
                        background: `${cyan}18`,
                        border: `1px solid ${cyan}44`,
                        color: cyan,
                        cursor: "pointer",
                      }}
                    >
                      <FileCode size={13} />
                      <span>Inspect Evidence</span>
                    </button>
                    {onViewInGraph && (
                      <button
                        onClick={() => onViewInGraph(mr.affected_file)}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "5px",
                          padding: "5px 10px",
                          borderRadius: "6px",
                          fontSize: "11px",
                          fontWeight: 600,
                          background: `${purple}15`,
                          border: `1px solid ${purple}33`,
                          color: purple,
                          cursor: "pointer",
                        }}
                      >
                        <Globe2 size={13} />
                        <span>View in Graph</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Mock Stubs and Incomplete Handlers */}
        <div
          style={{
            background: panelBg,
            backdropFilter: "blur(14px)",
            border: `1px solid ${borderBase}`,
            borderRadius: "14px",
            padding: "20px",
            boxShadow: darkMode ? "0 8px 30px rgba(0, 0, 0, 0.3)" : "0 4px 20px rgba(0, 0, 0, 0.05)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
            <ShieldQuestion size={18} color={amber} />
            <h4 style={{ margin: 0, fontSize: "15px", color: textPrimary, fontWeight: 700 }}>
              Mock Stubs & Unconnected Handlers
            </h4>
          </div>

          {mockStubs.length === 0 ? (
            <div style={{ padding: "24px", textAlign: "center", color: textMuted, fontSize: "13px" }}>
              ✓ No hardcoded dummy mocks detected in live route controllers.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {mockStubs.map((ms) => (
                <div
                  key={ms.id}
                  style={{
                    background: darkMode ? "rgba(245, 158, 11, 0.08)" : "rgba(254, 243, 199, 0.6)",
                    border: darkMode ? "1px solid rgba(245, 158, 11, 0.25)" : "1px solid rgba(245, 158, 11, 0.25)",
                    borderRadius: "10px",
                    padding: "14px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                    <span style={{ fontWeight: 700, fontSize: "13px", color: amber }}>
                      {ms.title}
                    </span>
                    <span style={{ fontSize: "11px", color: textMuted, fontFamily: "JetBrains Mono, monospace" }}>
                      {ms.affected_file}:{ms.line_number}
                    </span>
                  </div>
                  <pre
                    style={{
                      margin: 0,
                      padding: "8px 12px",
                      borderRadius: "6px",
                      background: darkMode ? "#030712" : "#ffffff",
                      border: `1px solid ${borderBase}`,
                      fontSize: "11px",
                      color: amber,
                      fontFamily: "JetBrains Mono, monospace",
                    }}
                  >
                    {ms.snippet}
                  </pre>
                  <p style={{ margin: "8px 0 10px 0", fontSize: "12px", color: textSecondary }}>
                    {ms.recommended_remediation}
                  </p>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      onClick={() => setModalFinding(ms)}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "5px",
                        padding: "5px 10px",
                        borderRadius: "6px",
                        fontSize: "11px",
                        fontWeight: 700,
                        background: `${cyan}18`,
                        border: `1px solid ${cyan}44`,
                        color: cyan,
                        cursor: "pointer",
                      }}
                    >
                      <FileCode size={13} />
                      <span>Inspect Evidence</span>
                    </button>
                    {onViewInGraph && (
                      <button
                        onClick={() => onViewInGraph(ms.affected_file)}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "5px",
                          padding: "5px 10px",
                          borderRadius: "6px",
                          fontSize: "11px",
                          fontWeight: 600,
                          background: `${purple}15`,
                          border: `1px solid ${purple}33`,
                          color: purple,
                          cursor: "pointer",
                        }}
                      >
                        <Globe2 size={13} />
                        <span>View in Graph</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Source Code Evidence Explorer Modal */}
      {modalFinding && (
        <FindingEvidenceModal
          auditId={auditId || ""}
          finding={modalFinding}
          onClose={() => setModalFinding(null)}
          onViewInGraph={onViewInGraph}
          darkMode={darkMode}
        />
      )}
    </div>
  );
};
