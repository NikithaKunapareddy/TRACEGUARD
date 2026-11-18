import React, { useState, useEffect } from "react";
import { traceguardApi, Finding, FindingSourceCode } from "../api/client";
import {
  X,
  FileCode,
  AlertTriangle,
  Copy,
  Check,
  Globe2,
  Terminal,
  Loader2,
  Sparkles,
  Info,
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

  const textPrimary = darkMode ? "#f8fafc" : "#0f172a";
  const textSecondary = darkMode ? "#cbd5e1" : "#334155";
  const textMuted = darkMode ? "#94a3b8" : "#64748b";

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
        return "#f43f5e";
      case "high":
        return "#f97316";
      case "medium":
        return "#eab308";
      case "low":
        return "#3b82f6";
      default:
        return "#8b5cf6";
    }
  };

  const sevColor = getSeverityColor(finding.severity);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(4, 7, 17, 0.72)",
        backdropFilter: "blur(14px)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "clamp(12px, 3vw, 28px)",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="vibgyor-prism-surface animate-reveal"
        style={{
          width: "100%",
          maxWidth: "960px",
          maxHeight: "90vh",
          borderRadius: "32px",
          background: darkMode
            ? "radial-gradient(120% 120% at 0% 0%, rgba(139,92,246,0.18) 0%, transparent 50%), radial-gradient(120% 120% at 100% 100%, rgba(59,130,246,0.16) 0%, transparent 50%), rgba(10, 15, 29, 0.94)"
            : "radial-gradient(120% 120% at 0% 0%, rgba(139,92,246,0.14) 0%, transparent 50%), radial-gradient(120% 120% at 100% 100%, rgba(56,189,248,0.14) 0%, transparent 50%), rgba(255, 255, 255, 0.96)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "22px 28px",
            borderBottom: "1px solid var(--hairline)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            flexWrap: "wrap",
            gap: "16px",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "10px" }}>
              <span
                style={{
                  fontSize: "10.5px",
                  fontWeight: 800,
                  textTransform: "uppercase",
                  padding: "3px 10px",
                  borderRadius: "9999px",
                  background: `${sevColor}22`,
                  color: sevColor,
                }}
              >
                {finding.severity}
              </span>
              <span
                style={{
                  fontSize: "10.5px",
                  fontWeight: 800,
                  padding: "3px 10px",
                  borderRadius: "9999px",
                  background: "rgba(139, 92, 246, 0.16)",
                  color: "#8b5cf6",
                  textTransform: "capitalize",
                }}
              >
                {finding.category}
              </span>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  padding: "3px 10px",
                  borderRadius: "9999px",
                  background: darkMode ? "rgba(255, 255, 255, 0.06)" : "rgba(15, 23, 42, 0.06)",
                  color: textSecondary,
                }}
              >
                {(finding.confidence * 100).toFixed(0)}% ({finding.verification_status})
              </span>
            </div>

            <h2
              style={{
                margin: "0 0 6px 0",
                fontSize: "clamp(18px, 2.5vw, 22px)",
                fontWeight: 800,
                color: textPrimary,
                lineHeight: 1.25,
              }}
            >
              {finding.title}
            </h2>

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
              <FileCode size={14} color="#8b5cf6" />
              <span>
                {finding.affected_file} : Line {finding.line_number}
              </span>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {onViewInGraph && (
              <button
                onClick={() => {
                  onClose();
                  onViewInGraph(finding.affected_file);
                }}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "8px 16px",
                  borderRadius: "9999px",
                  fontSize: "12px",
                  fontWeight: 700,
                  background: "rgba(59, 130, 246, 0.16)",
                  border: "none",
                  color: "#3b82f6",
                  cursor: "pointer",
                }}
              >
                <Globe2 size={14} />
                <span>Locate in Topology</span>
              </button>
            )}

            <button
              onClick={onClose}
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                background: darkMode ? "rgba(255, 255, 255, 0.08)" : "rgba(15, 23, 42, 0.08)",
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

        {/* Scrollable Body */}
        <div
          style={{
            padding: "24px 28px",
            overflowY: "auto",
            flex: 1,
            display: "flex",
            flexDirection: "column",
            gap: "22px",
          }}
        >
          {/* Root Cause */}
          <div className="vibgyor-prism-surface vib-tint-indigo" style={{ padding: "18px 22px", borderRadius: "22px" }}>
            <div
              style={{
                fontSize: "11.5px",
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                color: "#6366f1",
                marginBottom: "6px",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <Info size={14} />
              <span>Deterministic Detection Rationale</span>
            </div>
            <div style={{ fontSize: "13.5px", lineHeight: 1.6, color: textPrimary }}>
              {finding.technical_explanation || "No explanation recorded."}
            </div>
          </div>

          {/* Source Code Evidence */}
          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "10px",
              }}
            >
              <span
                style={{
                  fontSize: "12px",
                  fontWeight: 800,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  color: "#f43f5e",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <Terminal size={14} />
                <span>On-Disk Source Code Evidence</span>
              </span>

              {sourceData?.file_exists && (
                <button
                  onClick={() => setContextPadding((p) => Math.min(30, p + 8))}
                  style={{
                    fontSize: "11px",
                    fontWeight: 700,
                    padding: "4px 12px",
                    borderRadius: "9999px",
                    background: darkMode ? "rgba(255, 255, 255, 0.06)" : "rgba(15, 23, 42, 0.06)",
                    border: "none",
                    color: textSecondary,
                    cursor: "pointer",
                  }}
                >
                  + Expand Context ({sourceData.lines.length} lines)
                </button>
              )}
            </div>

            {loading ? (
              <div
                style={{
                  padding: "36px",
                  textAlign: "center",
                  background: darkMode ? "rgba(4, 7, 17, 0.65)" : "rgba(241, 245, 249, 0.8)",
                  borderRadius: "20px",
                  color: textMuted,
                  fontSize: "13px",
                }}
              >
                <Loader2
                  size={24}
                  color="#8b5cf6"
                  style={{ animation: "spin 1s linear infinite", display: "inline-block", marginBottom: "8px" }}
                />
                <div>Reading source code from target repository…</div>
              </div>
            ) : error || !sourceData?.file_exists ? (
              <div
                style={{
                  background: darkMode ? "rgba(4, 7, 17, 0.75)" : "#0f172a",
                  borderRadius: "20px",
                  padding: "16px 20px",
                }}
              >
                <pre
                  style={{
                    margin: 0,
                    fontFamily: "JetBrains Mono, monospace",
                    fontSize: "12.5px",
                    color: "#fda4af",
                    overflowX: "auto",
                  }}
                >
                  {finding.snippet || "(No snippet available)"}
                </pre>
              </div>
            ) : (
              <div
                style={{
                  background: "#050914",
                  borderRadius: "20px",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    padding: "8px 16px",
                    background: "rgba(255, 255, 255, 0.04)",
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
                    Lines {sourceData.start_line} – {sourceData.end_line}
                  </span>
                </div>

                <div
                  style={{
                    fontFamily: "JetBrains Mono, monospace",
                    fontSize: "12.5px",
                    lineHeight: "22px",
                    maxHeight: "260px",
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
                          background: isProb ? "rgba(244, 63, 94, 0.22)" : "transparent",
                          borderLeft: isProb ? "4px solid #f43f5e" : "4px solid transparent",
                          padding: "0 14px 0 10px",
                        }}
                      >
                        <span
                          style={{
                            width: "44px",
                            flexShrink: 0,
                            textAlign: "right",
                            marginRight: "16px",
                            color: isProb ? "#f43f5e" : "#475569",
                            fontWeight: isProb ? 800 : 500,
                            userSelect: "none",
                          }}
                        >
                          {l.line_number}
                        </span>
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
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Remediation */}
          <div className="vibgyor-prism-surface vib-tint-green" style={{ padding: "18px 22px", borderRadius: "22px" }}>
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
                  fontSize: "11.5px",
                  fontWeight: 800,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  color: "#10b981",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <Sparkles size={14} />
                <span>Recommended Remediation</span>
              </span>

              {finding.recommended_remediation && (
                <button
                  onClick={handleCopyRemediation}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "5px",
                    padding: "5px 12px",
                    borderRadius: "9999px",
                    fontSize: "11.5px",
                    fontWeight: 700,
                    background: "rgba(16, 185, 129, 0.2)",
                    border: "none",
                    color: "#10b981",
                    cursor: "pointer",
                  }}
                >
                  {copiedRemediation ? <Check size={12} /> : <Copy size={12} />}
                  <span>{copiedRemediation ? "Copied" : "Copy Fix"}</span>
                </button>
              )}
            </div>

            <pre
              style={{
                margin: 0,
                fontFamily: "JetBrains Mono, monospace",
                fontSize: "12.5px",
                color: textPrimary,
                lineHeight: 1.55,
                whiteSpace: "pre-wrap",
              }}
            >
              {finding.recommended_remediation || "No automated remediation available."}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
