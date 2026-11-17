import React from "react";
import { Finding } from "../api/client";
import { Puzzle, ArrowRight, AlertCircle, CheckCircle2, ShieldQuestion } from "lucide-react";

interface NegativeSpaceViewProps {
  findings: Finding[];
}

export const NegativeSpaceView: React.FC<NegativeSpaceViewProps> = ({ findings }) => {
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
          background: "rgba(168, 85, 247, 0.08)",
          border: "1px solid rgba(168, 85, 247, 0.25)",
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
            <Puzzle size={20} color="#c084fc" />
            <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#f8fafc" }}>
              Negative-Space Architectural Analysis
            </h3>
          </div>
          <p style={{ margin: 0, color: "#cbd5e1", fontSize: "13px", lineHeight: 1.5 }}>
            Traditional linters analyze code that is present. TraceGuard identifies <strong>what is missing</strong>:
            unimplemented backend routes invoked by frontends, mock data stubs disguised as production endpoints, and broken cross-service contracts.
          </p>
        </div>

        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ fontSize: "28px", fontWeight: 800, color: "#c084fc" }}>
            {gapFindings.length}
          </div>
          <div style={{ fontSize: "11px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase" }}>
            Detected Gaps
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
        {/* Missing Backend Routes (Frontend calls non-existent endpoint) */}
        <div
          style={{
            background: "rgba(15, 23, 42, 0.75)",
            backdropFilter: "blur(14px)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "14px",
            padding: "20px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
            <AlertCircle size={18} color="#f43f5e" />
            <h4 style={{ margin: 0, fontSize: "15px", color: "#f8fafc", fontWeight: 700 }}>
              Dangling Client Invocations
            </h4>
          </div>

          {missingRoutes.length === 0 ? (
            <div style={{ padding: "24px", textAlign: "center", color: "#64748b", fontSize: "13px" }}>
              ✓ All frontend client calls have verified corresponding backend endpoints.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {missingRoutes.map((mr) => (
                <div
                  key={mr.id}
                  style={{
                    background: "rgba(244, 63, 94, 0.08)",
                    border: "1px solid rgba(244, 63, 94, 0.25)",
                    borderRadius: "10px",
                    padding: "14px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                    <span style={{ fontWeight: 700, fontSize: "13px", color: "#f87171" }}>
                      {mr.title}
                    </span>
                    <span style={{ fontSize: "11px", color: "#94a3b8" }}>
                      {mr.affected_file}:{mr.line_number}
                    </span>
                  </div>
                  <pre
                    style={{
                      margin: 0,
                      padding: "8px 12px",
                      borderRadius: "6px",
                      background: "#030712",
                      fontSize: "11px",
                      color: "#fca5a5",
                      fontFamily: "JetBrains Mono, monospace",
                    }}
                  >
                    {mr.snippet}
                  </pre>
                  <p style={{ margin: "8px 0 0 0", fontSize: "12px", color: "#cbd5e1" }}>
                    {mr.recommended_remediation}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Mock Stubs and Incomplete Handlers */}
        <div
          style={{
            background: "rgba(15, 23, 42, 0.75)",
            backdropFilter: "blur(14px)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "14px",
            padding: "20px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
            <ShieldQuestion size={18} color="#f59e0b" />
            <h4 style={{ margin: 0, fontSize: "15px", color: "#f8fafc", fontWeight: 700 }}>
              Mock Stubs & Unconnected Handlers
            </h4>
          </div>

          {mockStubs.length === 0 ? (
            <div style={{ padding: "24px", textAlign: "center", color: "#64748b", fontSize: "13px" }}>
              ✓ No hardcoded dummy mocks detected in live route controllers.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {mockStubs.map((ms) => (
                <div
                  key={ms.id}
                  style={{
                    background: "rgba(245, 158, 11, 0.08)",
                    border: "1px solid rgba(245, 158, 11, 0.25)",
                    borderRadius: "10px",
                    padding: "14px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                    <span style={{ fontWeight: 700, fontSize: "13px", color: "#fbbf24" }}>
                      {ms.title}
                    </span>
                    <span style={{ fontSize: "11px", color: "#94a3b8" }}>
                      {ms.affected_file}:{ms.line_number}
                    </span>
                  </div>
                  <pre
                    style={{
                      margin: 0,
                      padding: "8px 12px",
                      borderRadius: "6px",
                      background: "#030712",
                      fontSize: "11px",
                      color: "#fde68a",
                      fontFamily: "JetBrains Mono, monospace",
                    }}
                  >
                    {ms.snippet}
                  </pre>
                  <p style={{ margin: "8px 0 0 0", fontSize: "12px", color: "#cbd5e1" }}>
                    {ms.recommended_remediation}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
