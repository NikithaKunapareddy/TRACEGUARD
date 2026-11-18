import React, { useState } from "react";
import { Finding } from "../api/client";
import { FindingEvidenceModal } from "./FindingEvidenceModal";
import { Puzzle, AlertCircle, ShieldQuestion, FileCode, Globe2 } from "lucide-react";

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

  const textPrimary = darkMode ? "#f8fafc" : "#0f172a";
  const textSecondary = darkMode ? "#cbd5e1" : "#334155";
  const textMuted = darkMode ? "#94a3b8" : "#64748b";

  const gapFindings = findings.filter((f) => f.category === "gap");
  const missingRoutes = gapFindings.filter(
    (f) =>
      f.title.toLowerCase().includes("missing backend route") ||
      f.subcategory === "missing_backend_route"
  );
  const mockStubs = gapFindings.filter(
    (f) =>
      f.title.toLowerCase().includes("mock") ||
      f.subcategory === "mock_placeholder_endpoint" ||
      !missingRoutes.includes(f)
  );

  return (
    <div style={{ marginBottom: "36px", display: "flex", flexDirection: "column", gap: "28px" }}>
      {/* Open Spectral Header Stream */}
      <div
        className="vibgyor-prism-surface vib-tint-violet animate-reveal"
        style={{
          borderRadius: "30px",
          padding: "26px 30px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "18px",
        }}
      >
        <div style={{ maxWidth: "760px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
            <Puzzle size={22} color="#8b5cf6" />
            <h3 style={{ margin: 0, fontSize: "20px", fontWeight: 800, color: textPrimary }}>
              Negative-Space Architectural Intelligence
            </h3>
          </div>
          <p style={{ margin: 0, color: textSecondary, fontSize: "13.5px", lineHeight: 1.6 }}>
            Conventional static tools only inspect code that exists. TraceGuard cross-references client
            invocations, route tables, and interface contracts to expose <strong>what is missing</strong>:
            dangling frontend API calls, mock stubs, and unimplemented handlers.
          </p>
        </div>

        <div style={{ textAlign: "center", padding: "8px 18px" }}>
          <div style={{ fontSize: "36px", fontWeight: 800, color: "#8b5cf6", lineHeight: 1 }}>
            {gapFindings.length}
          </div>
          <div
            style={{
              fontSize: "11px",
              fontWeight: 800,
              color: textMuted,
              textTransform: "uppercase",
              marginTop: "4px",
            }}
          >
            Structural Gaps
          </div>
        </div>
      </div>

      {/* 2-Column Flowing VIBGYOR Lenses */}
      <div
        className="negspace-split-grid animate-reveal-delay-1"
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "22px" }}
      >
        {/* Left: Dangling Client Invocations */}
        <div className="vibgyor-prism-surface vib-tint-red" style={{ borderRadius: "28px", padding: "24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "18px" }}>
            <AlertCircle size={19} color="#f43f5e" />
            <h4 style={{ margin: 0, fontSize: "16.5px", color: textPrimary, fontWeight: 800 }}>
              Dangling Client Invocations ({missingRoutes.length})
            </h4>
          </div>

          {missingRoutes.length === 0 ? (
            <div style={{ padding: "28px", textAlign: "center", color: textMuted, fontSize: "13px" }}>
              ✓ All frontend client calls resolve to verified backend endpoints.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {missingRoutes.map((mr) => (
                <div
                  key={mr.id}
                  style={{
                    background: darkMode ? "rgba(4, 7, 17, 0.45)" : "rgba(255, 255, 255, 0.72)",
                    borderRadius: "20px",
                    padding: "16px 18px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      flexWrap: "wrap",
                      gap: "6px",
                      marginBottom: "8px",
                    }}
                  >
                    <span style={{ fontWeight: 800, fontSize: "13.5px", color: "#f43f5e" }}>
                      {mr.title}
                    </span>
                    <span style={{ fontSize: "11px", color: textMuted, fontFamily: "JetBrains Mono, monospace" }}>
                      {mr.affected_file}:{mr.line_number}
                    </span>
                  </div>
                  <pre
                    style={{
                      margin: 0,
                      padding: "10px 14px",
                      borderRadius: "14px",
                      background: darkMode ? "#030712" : "#0f172a",
                      fontSize: "11.5px",
                      color: "#fda4af",
                      fontFamily: "JetBrains Mono, monospace",
                      overflowX: "auto",
                    }}
                  >
                    {mr.snippet}
                  </pre>
                  <p style={{ margin: "10px 0 12px 0", fontSize: "12.5px", color: textSecondary }}>
                    {mr.recommended_remediation}
                  </p>
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    <button
                      onClick={() => setModalFinding(mr)}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "6px 13px",
                        borderRadius: "9999px",
                        fontSize: "11.5px",
                        fontWeight: 700,
                        background: "rgba(244, 63, 94, 0.16)",
                        color: "#f43f5e",
                        border: "none",
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
                          gap: "6px",
                          padding: "6px 13px",
                          borderRadius: "9999px",
                          fontSize: "11.5px",
                          fontWeight: 700,
                          background: "rgba(139, 92, 246, 0.16)",
                          color: "#8b5cf6",
                          border: "none",
                          cursor: "pointer",
                        }}
                      >
                        <Globe2 size={13} />
                        <span>Locate in Graph</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Mock Stubs & Unimplemented Contracts */}
        <div className="vibgyor-prism-surface vib-tint-orange" style={{ borderRadius: "28px", padding: "24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "18px" }}>
            <ShieldQuestion size={19} color="#f97316" />
            <h4 style={{ margin: 0, fontSize: "16.5px", color: textPrimary, fontWeight: 800 }}>
              Mock Stubs &amp; Unfulfilled Contracts ({mockStubs.length})
            </h4>
          </div>

          {mockStubs.length === 0 ? (
            <div style={{ padding: "28px", textAlign: "center", color: textMuted, fontSize: "13px" }}>
              ✓ No mock stubs or unimplemented interfaces detected.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {mockStubs.map((ms) => (
                <div
                  key={ms.id}
                  style={{
                    background: darkMode ? "rgba(4, 7, 17, 0.45)" : "rgba(255, 255, 255, 0.72)",
                    borderRadius: "20px",
                    padding: "16px 18px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      flexWrap: "wrap",
                      gap: "6px",
                      marginBottom: "8px",
                    }}
                  >
                    <span style={{ fontWeight: 800, fontSize: "13.5px", color: "#f97316" }}>
                      {ms.title}
                    </span>
                    <span style={{ fontSize: "11px", color: textMuted, fontFamily: "JetBrains Mono, monospace" }}>
                      {ms.affected_file}:{ms.line_number}
                    </span>
                  </div>
                  <pre
                    style={{
                      margin: 0,
                      padding: "10px 14px",
                      borderRadius: "14px",
                      background: darkMode ? "#030712" : "#0f172a",
                      fontSize: "11.5px",
                      color: "#fdba74",
                      fontFamily: "JetBrains Mono, monospace",
                      overflowX: "auto",
                    }}
                  >
                    {ms.snippet}
                  </pre>
                  <p style={{ margin: "10px 0 12px 0", fontSize: "12.5px", color: textSecondary }}>
                    {ms.recommended_remediation}
                  </p>
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    <button
                      onClick={() => setModalFinding(ms)}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "6px 13px",
                        borderRadius: "9999px",
                        fontSize: "11.5px",
                        fontWeight: 700,
                        background: "rgba(249, 115, 22, 0.16)",
                        color: "#f97316",
                        border: "none",
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
                          gap: "6px",
                          padding: "6px 13px",
                          borderRadius: "9999px",
                          fontSize: "11.5px",
                          fontWeight: 700,
                          background: "rgba(139, 92, 246, 0.16)",
                          color: "#8b5cf6",
                          border: "none",
                          cursor: "pointer",
                        }}
                      >
                        <Globe2 size={13} />
                        <span>Locate in Graph</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

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
