import React, { useState, useEffect } from "react";
import { traceguardApi, Finding, FindingSourceCode } from "../api/client";
import {
  X,
  ShieldAlert,
  FileCode,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  Globe2,
  Terminal,
  ExternalLink,
  Loader2,
  Sparkles,
  Info,
  Maximize2,
} from "lucide-react";

interface FindingEvidenceModalProps {
  auditId: string;
  finding: Finding;
  onClose: () => void;
  onViewInGraph?: (nodeIdOrFile: string) => void;
  darkMode?: boolean;
}

export const FindingEvidenceModal: React.FC<FindingEvidenceModalProps> = ({
  auditId,
  finding,
  onClose,
  onViewInGraph,
  darkMode = true,
}) => {
  const [sourceData, setSourceData] = useState<FindingSourceCode | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedRemediation, setCopiedRemediation] = useState<boolean>(false);
  const [contextPadding, setContextPadding] = useState<number>(12);

  const cyan = darkMode ? "#38bdf8" : "#0284c7";
  const purple = darkMode ? "#a855f7" : "#7c3aed";
  const emerald = darkMode ? "#10b981" : "#059669";
  const rose = darkMode ? "#f43f5e" : "#dc2626";
  const amber = darkMode ? "#f59e0b" : "#d97706";
  const textPrimary = darkMode ? "#f8fafc" : "#0f172a";
  const textSecondary = darkMode ? "#94a3b8" : "#475569";
  const textMuted = darkMode ? "#64748b" : "#94a3b8";

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    const findingKey = finding.id || finding.stable_id || "";
    traceguardApi
      .getFindingSource(auditId, findingKey, contextPadding)
      .then((data) => {
        if (isMounted) setSourceData(data);
      })
      .catch((err) => {
        if (isMounted) setError(err.message || "Failed to load source code from repository.");
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [auditId, finding, contextPadding]);

  const handleCopyRemediation = () => {
    if (finding.recommended_remediation) {
      navigator.clipboard.writeText(finding.recommended_remediation);
      setCopiedRemediation(true);
      setTimeout(() => setCopiedRemediation(false), 2000);
    }
  };

  const getSeverityColor = (sev: string) => {
    switch (sev.toLowerCase()) {
      case "critical":
        return rose;
      case "high":
        return amber;
      case "medium":
        return cyan;
      case "low":
        return emerald;
      default:
        return textMuted;
    }
  };

  const sevColor = getSeverityColor(finding.severity);

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.75)",
        backdropFilter: "blur(8px)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: "960px",
          maxHeight: "90vh",
          borderRadius: "20px",
          background: darkMode ? "#0c1324" : "#ffffff",
          border: darkMode ? "1px solid rgba(56, 189, 248, 0.25)" : "1px solid rgba(0, 0, 0, 0.12)",
          boxShadow: darkMode
            ? "0 25px 60px rgba(0, 0, 0, 0.8), 0 0 30px rgba(56, 189, 248, 0.15)"
            : "0 20px 50px rgba(0, 0, 0, 0.15)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: "20px 24px",
            borderBottom: darkMode ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid rgba(0, 0, 0, 0.08)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: "16px",
            background: darkMode ? "rgba(15, 23, 42, 0.6)" : "rgba(248, 250, 252, 0.8)",
          }}
        >
          <div>
            {/* Badges bar */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "8px" }}>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 800,
                  textTransform: "uppercase",
                  padding: "2px 8px",
                  borderRadius: "6px",
                  background: `${sevColor}22`,
                  color: sevColor,
                  border: `1px solid ${sevColor}44`,
                }}
              >
                {finding.severity}
              </span>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  padding: "2px 8px",
                  borderRadius: "6px",
                  background: `${cyan}18`,
                  color: cyan,
                  border: `1px solid ${cyan}33`,
                  textTransform: "capitalize",
                }}
              >
                {finding.category}
              </span>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 600,
                  padding: "2px 8px",
                  borderRadius: "6px",
                  background: darkMode ? "rgba(255, 255, 255, 0.06)" : "rgba(0, 0, 0, 0.06)",
                  color: textSecondary,
                }}
              >
                Confidence: {(finding.confidence * 100).toFixed(0)}% ({finding.verification_status})
              </span>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  padding: "2px 8px",
                  borderRadius: "6px",
                  background: `${emerald}18`,
                  color: emerald,
                }}
              >
                {finding.lifecycle_state}
              </span>
            </div>

            {/* Title */}
            <h2
              style={{
                margin: "0 0 6px 0",
                fontSize: "20px",
                fontWeight: 800,
                color: textPrimary,
                lineHeight: 1.3,
              }}
            >
              {finding.title}
            </h2>

            {/* File Path & Line */}
            <div
              style={{
                fontSize: "12px",
                color: textMuted,
                fontFamily: "JetBrains Mono, monospace",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <FileCode size={13} color={cyan} />
              <span>
                {finding.affected_file} : Line {finding.line_number}
              </span>
            </div>
          </div>

          {/* Action buttons on right */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {onViewInGraph && (
              <button
                onClick={() => {
                  onClose();
                  onViewInGraph(finding.affected_file);
                }}
                title="Locate this affected file in the Architecture Graph"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "8px 14px",
                  borderRadius: "10px",
                  fontSize: "12px",
                  fontWeight: 600,
                  background: `${cyan}18`,
                  border: `1px solid ${cyan}44`,
                  color: cyan,
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                <Globe2 size={14} />
                <span>View in Graph</span>
              </button>
            )}

            <button
              onClick={onClose}
              style={{
                width: "34px",
                height: "34px",
                borderRadius: "8px",
                background: darkMode ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.08)",
                border: "none",
                color: textSecondary,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div style={{ padding: "24px", overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: "22px" }}>
          {/* Section 1: Why was this detected? */}
          <div>
            <div
              style={{
                fontSize: "13px",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                color: textMuted,
                marginBottom: "8px",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <Info size={14} color={cyan} />
              <span>Why Was This Detected?</span>
            </div>
            <div
              style={{
                fontSize: "14px",
                lineHeight: 1.6,
                color: textPrimary,
                background: darkMode ? "rgba(15, 23, 42, 0.5)" : "rgba(248, 250, 252, 0.9)",
                padding: "14px 18px",
                borderRadius: "12px",
                border: darkMode ? "1px solid rgba(255, 255, 255, 0.06)" : "1px solid rgba(0, 0, 0, 0.06)",
              }}
            >
              {finding.technical_explanation || "No explanation recorded."}
            </div>
          </div>

          {/* Section 2: Source Code Evidence Viewer */}
          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "8px",
              }}
            >
              <span
                style={{
                  fontSize: "13px",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  color: textMuted,
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <Terminal size={14} color={rose} />
                <span>Actual Source Code Evidence</span>
              </span>

              {sourceData?.file_exists && (
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <button
                    onClick={() => setContextPadding((p) => Math.min(30, p + 8))}
                    style={{
                      fontSize: "11px",
                      padding: "3px 8px",
                      borderRadius: "6px",
                      background: darkMode ? "rgba(255, 255, 255, 0.06)" : "rgba(0, 0, 0, 0.06)",
                      border: "none",
                      color: textSecondary,
                      cursor: "pointer",
                    }}
                  >
                    + Expand Context ({sourceData.lines.length} lines)
                  </button>
                </div>
              )}
            </div>

            {loading ? (
              <div
                style={{
                  padding: "40px",
                  textAlign: "center",
                  background: darkMode ? "#070c18" : "#f1f5f9",
                  borderRadius: "12px",
                  color: textMuted,
                  fontSize: "13px",
                }}
              >
                <Loader2 size={24} color={cyan} style={{ animation: "spin 1s linear infinite", display: "inline-block", marginBottom: "8px" }} />
                <div>Reading exact source code from repository on disk…</div>
              </div>
            ) : error || !sourceData?.file_exists ? (
              /* Fallback to stored snippet if file was moved or on error */
              <div
                style={{
                  background: darkMode ? "#070c18" : "#f1f5f9",
                  borderRadius: "12px",
                  padding: "16px",
                  border: darkMode ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid rgba(0, 0, 0, 0.08)",
                }}
              >
                <div style={{ fontSize: "11px", color: amber, marginBottom: "8px" }}>
                  ⚠️ {error || "Original file not found on disk. Displaying verified evidence snippet captured at audit time:"}
                </div>
                <pre
                  style={{
                    margin: 0,
                    fontFamily: "JetBrains Mono, monospace",
                    fontSize: "13px",
                    color: rose,
                    background: `${rose}12`,
                    padding: "12px",
                    borderRadius: "8px",
                    overflowX: "auto",
                  }}
                >
                  {finding.snippet || "(No snippet available)"}
                </pre>
              </div>
            ) : (
              /* Interactive Line-by-Line Code Viewer */
              <div
                style={{
                  background: darkMode ? "#050914" : "#1e293b",
                  borderRadius: "12px",
                  border: darkMode ? "1px solid rgba(255, 255, 255, 0.1)" : "1px solid rgba(0, 0, 0, 0.2)",
                  overflow: "hidden",
                  boxShadow: "inset 0 2px 6px rgba(0, 0, 0, 0.4)",
                }}
              >
                {/* File Header Bar */}
                <div
                  style={{
                    padding: "8px 14px",
                    background: darkMode ? "rgba(255, 255, 255, 0.04)" : "rgba(0, 0, 0, 0.2)",
                    borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
                    fontSize: "11px",
                    fontFamily: "JetBrains Mono, monospace",
                    color: "#94a3b8",
                    display: "flex",
                    justifyContent: "space-between",
                  }}
                >
                  <span>
                    {sourceData.affected_file} ({sourceData.language.toUpperCase()})
                  </span>
                  <span>
                    Lines {sourceData.start_line} – {sourceData.end_line} of {sourceData.total_lines}
                  </span>
                </div>

                <div
                  style={{
                    fontFamily: "JetBrains Mono, monospace",
                    fontSize: "12.5px",
                    lineHeight: "22px",
                    maxHeight: "280px",
                    overflowY: "auto",
                    padding: "8px 0",
                  }}
                >
                  {sourceData.lines.map((l) => {
                    const isProb = l.is_problematic;
                    return (
                      <div
                        key={l.line_number}
                        style={{
                          display: "flex",
                          background: isProb ? "rgba(244, 63, 94, 0.18)" : "transparent",
                          borderLeft: isProb ? `4px solid ${rose}` : "4px solid transparent",
                          padding: "0 14px 0 10px",
                          transition: "background 0.1s ease",
                        }}
                      >
                        {/* Line Number */}
                        <span
                          style={{
                            width: "44px",
                            flexShrink: 0,
                            textAlign: "right",
                            marginRight: "16px",
                            color: isProb ? rose : "#475569",
                            fontWeight: isProb ? 800 : 500,
                            userSelect: "none",
                          }}
                        >
                          {l.line_number}
                        </span>

                        {/* Code Content */}
                        <span
                          style={{
                            color: isProb ? "#fecdd3" : "#e2e8f0",
                            fontWeight: isProb ? 700 : 400,
                            whiteSpace: "pre",
                            overflowX: "auto",
                          }}
                        >
                          {l.content || " "}
                        </span>

                        {isProb && (
                          <span
                            style={{
                              marginLeft: "auto",
                              fontSize: "10px",
                              fontWeight: 800,
                              color: rose,
                              background: `${rose}25`,
                              padding: "0 6px",
                              borderRadius: "4px",
                              height: "18px",
                              lineHeight: "18px",
                              alignSelf: "center",
                              flexShrink: 0,
                            }}
                          >
                            DEFECT TARGET
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Section 3: Recommended Remediation with Before/After Comparison */}
          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "8px",
              }}
            >
              <span
                style={{
                  fontSize: "13px",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  color: textMuted,
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <Sparkles size={14} color={emerald} />
                <span>Recommended Remediation</span>
              </span>

              {finding.recommended_remediation && (
                <button
                  onClick={handleCopyRemediation}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "5px",
                    padding: "4px 10px",
                    borderRadius: "6px",
                    fontSize: "11px",
                    fontWeight: 600,
                    background: `${emerald}18`,
                    border: `1px solid ${emerald}44`,
                    color: emerald,
                    cursor: "pointer",
                  }}
                >
                  {copiedRemediation ? <Check size={12} /> : <Copy size={12} />}
                  <span>{copiedRemediation ? "Copied!" : "Copy Fix"}</span>
                </button>
              )}
            </div>

            <div
              style={{
                background: darkMode ? "rgba(16, 185, 129, 0.06)" : "rgba(16, 185, 129, 0.08)",
                border: `1px solid ${emerald}33`,
                borderRadius: "12px",
                padding: "16px",
              }}
            >
              <pre
                style={{
                  margin: 0,
                  fontFamily: "JetBrains Mono, monospace",
                  fontSize: "13px",
                  color: darkMode ? "#a7f3d0" : "#065f46",
                  lineHeight: 1.5,
                  whiteSpace: "pre-wrap",
                }}
              >
                {finding.recommended_remediation || "No automated remediation available."}
              </pre>

              <div
                style={{
                  marginTop: "12px",
                  paddingTop: "10px",
                  borderTop: `1px solid ${emerald}22`,
                  fontSize: "11px",
                  color: textMuted,
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <AlertTriangle size={12} color={amber} />
                <span>
                  Requires developer review. Verify changes against the actual target architecture before committing.
                </span>
              </div>
            </div>
          </div>

          {/* Section 4: Potential Impact & Counterevidence */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            {/* Impact */}
            <div
              style={{
                background: darkMode ? "rgba(15, 23, 42, 0.4)" : "rgba(248, 250, 252, 0.9)",
                borderRadius: "12px",
                padding: "14px",
                border: darkMode ? "1px solid rgba(255, 255, 255, 0.06)" : "1px solid rgba(0, 0, 0, 0.06)",
              }}
            >
              <div style={{ fontSize: "11px", fontWeight: 700, color: textMuted, textTransform: "uppercase", marginBottom: "6px" }}>
                Potential Impact
              </div>
              <div style={{ fontSize: "13px", lineHeight: 1.5, color: textSecondary }}>
                {finding.potential_impact || "Low severity maintenance degradation."}
              </div>
            </div>

            {/* Counterevidence */}
            <div
              style={{
                background: darkMode ? "rgba(15, 23, 42, 0.4)" : "rgba(248, 250, 252, 0.9)",
                borderRadius: "12px",
                padding: "14px",
                border: darkMode ? "1px solid rgba(255, 255, 255, 0.06)" : "1px solid rgba(0, 0, 0, 0.06)",
              }}
            >
              <div style={{ fontSize: "11px", fontWeight: 700, color: textMuted, textTransform: "uppercase", marginBottom: "6px" }}>
                Counterevidence Considered
              </div>
              <div style={{ fontSize: "13px", lineHeight: 1.5, color: textSecondary }}>
                {finding.counterevidence_considered && finding.counterevidence_considered.length > 0 ? (
                  <ul style={{ margin: 0, paddingLeft: "16px" }}>
                    {finding.counterevidence_considered.map((c, idx) => (
                      <li key={idx}>{c}</li>
                    ))}
                  </ul>
                ) : (
                  "No mitigating patterns or sanitizer functions found in call chain."
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
