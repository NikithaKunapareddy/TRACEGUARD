import React, { useState } from "react";
import { Finding } from "../api/client";
import { FindingEvidenceModal } from "./FindingEvidenceModal";
import {
  ShieldAlert,
  Puzzle,
  Trash2,
  Clock,
  Check,
  Copy,
  ChevronDown,
  ChevronRight,
  Search,
  Code2,
  FileCode,
  Globe2,
} from "lucide-react";

interface FindingsExplorerProps {
  findings: Finding[];
  total: number;
  auditId?: string;
  darkMode?: boolean;
  onViewInGraph?: (file: string) => void;
}

export const FindingsExplorer: React.FC<FindingsExplorerProps> = ({
  findings,
  auditId,
  darkMode = true,
  onViewInGraph,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedSeverity, setSelectedSeverity] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [modalFinding, setModalFinding] = useState<Finding | null>(null);

  const textPrimary = darkMode ? "#f8fafc" : "#0f172a";
  const textSecondary = darkMode ? "#cbd5e1" : "#334155";
  const textMuted = darkMode ? "#94a3b8" : "#64748b";

  const categories = [
    { key: "all", label: "All Spectrum", color: "#8b5cf6" },
    { key: "security", label: "Security Sinks", icon: ShieldAlert, color: "#f43f5e" },
    { key: "gap", label: "Negative-Space Gaps", icon: Puzzle, color: "#f97316" },
    { key: "slop", label: "Code Slop", icon: Trash2, color: "#3b82f6" },
    { key: "loose_end", label: "Hygiene", icon: Clock, color: "#10b981" },
  ];

  const getSeverityConfig = (sev: string) => {
    const config: Record<string, { color: string; tint: string }> = {
      critical: { color: "#f43f5e", tint: "vib-tint-red" },
      high: { color: "#f97316", tint: "vib-tint-orange" },
      medium: { color: "#eab308", tint: "vib-tint-yellow" },
      low: { color: "#3b82f6", tint: "vib-tint-blue" },
      info: { color: "#8b5cf6", tint: "vib-tint-violet" },
    };
    return config[sev.toLowerCase()] || config.info;
  };

  const getLifecycleBadge = (state?: string) => {
    if (!state) return null;
    const config: Record<string, { bg: string; text: string }> = {
      NEW: { bg: "rgba(16, 185, 129, 0.18)", text: "#10b981" },
      EXISTING: { bg: "rgba(99, 102, 241, 0.16)", text: "#6366f1" },
      REINTRODUCED: { bg: "rgba(244, 63, 94, 0.18)", text: "#f43f5e" },
      RESOLVED: { bg: "rgba(59, 130, 246, 0.18)", text: "#3b82f6" },
      ACCEPTED_RISK: { bg: "rgba(139, 92, 246, 0.18)", text: "#8b5cf6" },
    };
    const c = config[state] || { bg: "rgba(148, 163, 184, 0.15)", text: "#94a3b8" };
    return (
      <span
        style={{
          padding: "2px 9px",
          borderRadius: "9999px",
          background: c.bg,
          color: c.text,
          fontSize: "10px",
          fontWeight: 800,
        }}
      >
        {state}
      </span>
    );
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredFindings = findings.filter((f) => {
    if (selectedCategory !== "all" && f.category !== selectedCategory) return false;
    if (selectedSeverity !== "all" && f.severity.toLowerCase() !== selectedSeverity) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match =
        f.title.toLowerCase().includes(q) ||
        f.affected_file.toLowerCase().includes(q) ||
        f.snippet.toLowerCase().includes(q) ||
        f.technical_explanation.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  const countBySeverity = (sev: string) =>
    findings.filter((f) => f.severity.toLowerCase() === sev).length;

  return (
    <div style={{ marginBottom: "36px", display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* ====================================================================
          1. FLOATING SPECTRAL FILTER DOCK (Non-Boxy Pill Stream)
         ==================================================================== */}
      <div
        className="vibgyor-prism-surface animate-reveal"
        style={{
          padding: "20px 24px",
          borderRadius: "28px",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
        }}
      >
        {/* Top Row: Severity Spectrum Pills + Search */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {[
              { label: "Critical", sev: "critical", color: "#f43f5e" },
              { label: "High", sev: "high", color: "#f97316" },
              { label: "Medium", sev: "medium", color: "#eab308" },
              { label: "Low", sev: "low", color: "#3b82f6" },
              { label: "Info", sev: "info", color: "#8b5cf6" },
            ].map((item) => {
              const count = countBySeverity(item.sev);
              const isSelected = selectedSeverity === item.sev;
              return (
                <button
                  key={item.sev}
                  onClick={() => setSelectedSeverity(isSelected ? "all" : item.sev)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "7px",
                    padding: "7px 14px",
                    borderRadius: "9999px",
                    background: isSelected
                      ? item.color
                      : darkMode
                      ? "rgba(255,255,255,0.05)"
                      : "rgba(15,23,42,0.05)",
                    border: "none",
                    color: isSelected ? "#ffffff" : textSecondary,
                    fontSize: "12px",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  <span>{item.label}</span>
                  <span
                    style={{
                      background: isSelected ? "rgba(255,255,255,0.25)" : `${item.color}25`,
                      color: isSelected ? "#ffffff" : item.color,
                      fontSize: "10.5px",
                      fontWeight: 800,
                      padding: "1px 7px",
                      borderRadius: "9999px",
                    }}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search Pill */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              background: darkMode ? "rgba(4, 7, 17, 0.55)" : "rgba(255, 255, 255, 0.85)",
              borderRadius: "9999px",
              padding: "8px 16px",
              minWidth: "250px",
              flex: "0 1 320px",
            }}
          >
            <Search size={14} color={textMuted} />
            <input
              type="text"
              placeholder="Filter findings, files or snippets…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                background: "transparent",
                border: "none",
                outline: "none",
                color: textPrimary,
                fontSize: "12.5px",
                width: "100%",
              }}
            />
          </div>
        </div>

        {/* Bottom Row: Category Lenses */}
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat.key;
            return (
              <button
                key={cat.key}
                onClick={() => setSelectedCategory(cat.key)}
                style={{
                  padding: "6px 15px",
                  borderRadius: "9999px",
                  fontSize: "12px",
                  fontWeight: isSelected ? 800 : 600,
                  background: isSelected
                    ? `${cat.color}22`
                    : "transparent",
                  border: isSelected ? `1.5px solid ${cat.color}` : "1px solid transparent",
                  color: isSelected ? cat.color : textMuted,
                  cursor: "pointer",
                }}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ====================================================================
          2. VIBGYOR PRISM FINDING LENSES STREAM
         ==================================================================== */}
      <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        {filteredFindings.length === 0 ? (
          <div
            className="vibgyor-prism-surface"
            style={{
              padding: "54px 24px",
              textAlign: "center",
              borderRadius: "28px",
              color: textMuted,
              fontSize: "14px",
            }}
          >
            No findings match the active spectrum filters.
          </div>
        ) : (
          filteredFindings.map((finding) => {
            const isExpanded = expandedId === finding.id;
            const sevCfg = getSeverityConfig(finding.severity);

            return (
              <div
                key={finding.id}
                className={`vibgyor-prism-surface ${sevCfg.tint}`}
                style={{
                  borderRadius: "26px",
                  overflow: "hidden",
                }}
              >
                {/* Header Row */}
                <div
                  onClick={() => setExpandedId(isExpanded ? null : finding.id)}
                  style={{
                    padding: "18px 24px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: "12px",
                    cursor: "pointer",
                    userSelect: "none",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: "1 1 280px" }}>
                    {isExpanded ? (
                      <ChevronDown size={18} color={sevCfg.color} />
                    ) : (
                      <ChevronRight size={18} color={textMuted} />
                    )}

                    <span
                      style={{
                        padding: "3px 11px",
                        borderRadius: "9999px",
                        background: `${sevCfg.color}22`,
                        color: sevCfg.color,
                        fontSize: "10.5px",
                        fontWeight: 800,
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                      }}
                    >
                      {finding.severity}
                    </span>

                    {getLifecycleBadge(finding.lifecycle_state)}

                    <div style={{ fontWeight: 800, fontSize: "14.5px", color: textPrimary }}>
                      {finding.title}
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                    <span
                      style={{
                        fontSize: "12px",
                        color: textMuted,
                        fontFamily: "JetBrains Mono, monospace",
                      }}
                    >
                      {finding.affected_file}:{finding.line_number}
                    </span>

                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: 700,
                        padding: "3px 10px",
                        borderRadius: "9999px",
                        background:
                          finding.verification_status === "Confirmed"
                            ? "rgba(16, 185, 129, 0.16)"
                            : "rgba(59, 130, 246, 0.16)",
                        color:
                          finding.verification_status === "Confirmed" ? "#10b981" : "#3b82f6",
                      }}
                    >
                      {finding.verification_status} ({Math.round(finding.confidence * 100)}%)
                    </span>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setModalFinding(finding);
                      }}
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
                      <FileCode size={13} />
                      <span>Inspect Source</span>
                    </button>
                  </div>
                </div>

                {/* Expanded Body */}
                {isExpanded && (
                  <div
                    style={{
                      padding: "0 24px 24px 24px",
                      borderTop: "1px solid var(--hairline)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        gap: "10px",
                        alignItems: "center",
                        flexWrap: "wrap",
                        padding: "14px 0",
                      }}
                    >
                      <button
                        onClick={() => setModalFinding(finding)}
                        className="vibgyor-cta-btn"
                        style={{ padding: "9px 18px", fontSize: "12px" }}
                      >
                        <FileCode size={14} />
                        <span>Inspect Full File Context on Disk</span>
                      </button>

                      {onViewInGraph && (
                        <button
                          onClick={() => onViewInGraph(finding.affected_file)}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                            padding: "9px 16px",
                            borderRadius: "9999px",
                            fontSize: "12px",
                            fontWeight: 700,
                            background: "rgba(59, 130, 246, 0.15)",
                            color: "#3b82f6",
                            border: "none",
                            cursor: "pointer",
                          }}
                        >
                          <Globe2 size={14} />
                          <span>Locate in Topology Graph</span>
                        </button>
                      )}
                    </div>

                    {finding.snippet && (
                      <div style={{ marginBottom: "18px" }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            fontSize: "11px",
                            fontWeight: 800,
                            color: textMuted,
                            textTransform: "uppercase",
                            marginBottom: "6px",
                          }}
                        >
                          <Code2 size={13} /> Verified AST Snippet
                        </div>
                        <pre
                          style={{
                            margin: 0,
                            padding: "14px 18px",
                            borderRadius: "18px",
                            background: darkMode ? "rgba(4, 7, 17, 0.78)" : "rgba(15, 23, 42, 0.92)",
                            fontSize: "12px",
                            color: "#fda4af",
                            overflowX: "auto",
                            fontFamily: "JetBrains Mono, monospace",
                          }}
                        >
                          {finding.snippet}
                        </pre>
                      </div>
                    )}

                    <div
                      className="finding-detail-grid"
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: "16px",
                        marginBottom: "16px",
                      }}
                    >
                      <div
                        style={{
                          background: darkMode ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.65)",
                          padding: "16px 18px",
                          borderRadius: "20px",
                        }}
                      >
                        <div
                          style={{
                            fontSize: "11px",
                            fontWeight: 800,
                            color: "#3b82f6",
                            textTransform: "uppercase",
                            marginBottom: "6px",
                          }}
                        >
                          Technical Root Cause
                        </div>
                        <p style={{ margin: 0, fontSize: "13px", color: textSecondary, lineHeight: 1.55 }}>
                          {finding.technical_explanation}
                        </p>
                      </div>

                      <div
                        style={{
                          background: darkMode ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.65)",
                          padding: "16px 18px",
                          borderRadius: "20px",
                        }}
                      >
                        <div
                          style={{
                            fontSize: "11px",
                            fontWeight: 800,
                            color: "#f43f5e",
                            textTransform: "uppercase",
                            marginBottom: "6px",
                          }}
                        >
                          Production Risk Impact
                        </div>
                        <p style={{ margin: 0, fontSize: "13px", color: textSecondary, lineHeight: 1.55 }}>
                          {finding.potential_impact}
                        </p>
                      </div>
                    </div>

                    {/* Remediation Stream */}
                    <div
                      style={{
                        background: "rgba(16, 185, 129, 0.10)",
                        padding: "16px 20px",
                        borderRadius: "20px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        flexWrap: "wrap",
                        gap: "14px",
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            fontSize: "11px",
                            fontWeight: 800,
                            color: "#10b981",
                            textTransform: "uppercase",
                            marginBottom: "4px",
                          }}
                        >
                          Recommended Remediation
                        </div>
                        <p style={{ margin: 0, fontSize: "13px", color: textPrimary, lineHeight: 1.55 }}>
                          {finding.recommended_remediation}
                        </p>
                      </div>

                      <button
                        onClick={() => handleCopy(finding.recommended_remediation, finding.id)}
                        style={{
                          background: "rgba(16, 185, 129, 0.2)",
                          color: "#10b981",
                          border: "none",
                          borderRadius: "9999px",
                          padding: "7px 14px",
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          fontSize: "12px",
                          fontWeight: 700,
                        }}
                      >
                        {copiedId === finding.id ? (
                          <>
                            <Check size={14} /> Copied
                          </>
                        ) : (
                          <>
                            <Copy size={14} /> Copy Fix
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
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
