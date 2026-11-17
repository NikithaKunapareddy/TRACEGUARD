import React, { useState } from "react";
import { Finding } from "../api/client";
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
  ExternalLink,
  Code2,
} from "lucide-react";

interface FindingsExplorerProps {
  findings: Finding[];
  total: number;
}

export const FindingsExplorer: React.FC<FindingsExplorerProps> = ({ findings, total }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedSeverity, setSelectedSeverity] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const categories = [
    { key: "all", label: "All Categories", icon: null },
    { key: "security", label: "Security Vulnerabilities", icon: ShieldAlert, color: "#f43f5e" },
    { key: "gap", label: "Negative-Space & Gaps", icon: Puzzle, color: "#a855f7" },
    { key: "slop", label: "Code Slop & Redundancy", icon: Trash2, color: "#38bdf8" },
    { key: "loose_end", label: "Loose Ends & Hygiene", icon: Clock, color: "#10b981" },
  ];

  const severities = ["all", "critical", "high", "medium", "low", "info"];

  const getSeverityBadge = (sev: string) => {
    const config: Record<string, { bg: string; border: string; text: string }> = {
      critical: { bg: "rgba(244, 63, 94, 0.15)", border: "rgba(244, 63, 94, 0.4)", text: "#f43f5e" },
      high: { bg: "rgba(249, 115, 22, 0.15)", border: "rgba(249, 115, 22, 0.4)", text: "#f97316" },
      medium: { bg: "rgba(245, 158, 11, 0.15)", border: "rgba(245, 158, 11, 0.4)", text: "#f59e0b" },
      low: { bg: "rgba(56, 189, 248, 0.15)", border: "rgba(56, 189, 248, 0.4)", text: "#38bdf8" },
      info: { bg: "rgba(148, 163, 184, 0.15)", border: "rgba(148, 163, 184, 0.4)", text: "#94a3b8" },
    };
    const c = config[sev.toLowerCase()] || config.info;
    return (
      <span
        style={{
          padding: "3px 10px",
          borderRadius: "6px",
          background: c.bg,
          border: `1px solid ${c.border}`,
          color: c.text,
          fontSize: "11px",
          fontWeight: 800,
          textTransform: "uppercase",
          letterSpacing: "0.5px",
        }}
      >
        {sev}
      </span>
    );
  };

  const getLifecycleBadge = (state?: string) => {
    if (!state) return null;
    const config: Record<string, { bg: string; text: string }> = {
      NEW: { bg: "rgba(16, 185, 129, 0.2)", text: "#34d399" },
      EXISTING: { bg: "rgba(148, 163, 184, 0.15)", text: "#cbd5e1" },
      REINTRODUCED: { bg: "rgba(244, 63, 94, 0.2)", text: "#f87171" },
      RESOLVED: { bg: "rgba(56, 189, 248, 0.2)", text: "#60a5fa" },
      ACCEPTED_RISK: { bg: "rgba(168, 85, 247, 0.2)", text: "#c084fc" },
    };
    const c = config[state] || { bg: "rgba(255, 255, 255, 0.1)", text: "#94a3b8" };
    return (
      <span
        style={{
          padding: "2px 8px",
          borderRadius: "4px",
          background: c.bg,
          color: c.text,
          fontSize: "10px",
          fontWeight: 700,
          marginLeft: "8px",
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

  // Filter findings
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
    <div style={{ marginBottom: "32px" }}>
      {/* Top Filter & Severity Counter Bar */}
      <div
        style={{
          background: "rgba(15, 23, 42, 0.75)",
          backdropFilter: "blur(16px)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          borderRadius: "16px",
          padding: "20px",
          marginBottom: "20px",
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)",
        }}
      >
        {/* Severity Summary Pills */}
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "16px" }}>
          {[
            { label: "Critical", sev: "critical", color: "#f43f5e" },
            { label: "High", sev: "high", color: "#f97316" },
            { label: "Medium", sev: "medium", color: "#f59e0b" },
            { label: "Low", sev: "low", color: "#38bdf8" },
            { label: "Info", sev: "info", color: "#94a3b8" },
          ].map((item) => {
            const count = countBySeverity(item.sev);
            const isSelected = selectedSeverity === item.sev;
            return (
              <button
                key={item.sev}
                onClick={() => setSelectedSeverity(isSelected ? "all" : item.sev)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "6px 14px",
                  borderRadius: "8px",
                  background: isSelected ? `${item.color}25` : "rgba(11, 17, 32, 0.6)",
                  border: isSelected ? `1px solid ${item.color}` : "1px solid rgba(255, 255, 255, 0.06)",
                  color: isSelected ? item.color : "#cbd5e1",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                <span>{item.label}</span>
                <span
                  style={{
                    background: item.color,
                    color: "#ffffff",
                    fontSize: "10px",
                    fontWeight: 800,
                    padding: "1px 6px",
                    borderRadius: "9999px",
                  }}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search & Category Tabs */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "16px",
            flexWrap: "wrap",
          }}
        >
          {/* Category Tabs */}
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {categories.map((cat) => {
              const isSelected = selectedCategory === cat.key;
              return (
                <button
                  key={cat.key}
                  onClick={() => setSelectedCategory(cat.key)}
                  style={{
                    padding: "6px 14px",
                    borderRadius: "8px",
                    fontSize: "12px",
                    fontWeight: isSelected ? 700 : 500,
                    background: isSelected ? "rgba(56, 189, 248, 0.15)" : "transparent",
                    border: isSelected
                      ? "1px solid #38bdf8"
                      : "1px solid rgba(255, 255, 255, 0.06)",
                    color: isSelected ? "#38bdf8" : "#94a3b8",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>

          {/* Search Box */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              background: "rgba(11, 17, 32, 0.8)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: "8px",
              padding: "6px 12px",
              minWidth: "260px",
            }}
          >
            <Search size={14} color="#64748b" />
            <input
              type="text"
              placeholder="Search findings or files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                background: "transparent",
                border: "none",
                outline: "none",
                color: "#f8fafc",
                fontSize: "12px",
                width: "100%",
              }}
            />
          </div>
        </div>
      </div>

      {/* Findings List */}
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {filteredFindings.length === 0 ? (
          <div
            style={{
              padding: "48px 24px",
              textAlign: "center",
              background: "rgba(15, 23, 42, 0.5)",
              borderRadius: "14px",
              border: "1px solid rgba(255, 255, 255, 0.05)",
              color: "#94a3b8",
            }}
          >
            No findings matching the selected filters.
          </div>
        ) : (
          filteredFindings.map((finding) => {
            const isExpanded = expandedId === finding.id;
            return (
              <div
                key={finding.id}
                style={{
                  background: "rgba(15, 23, 42, 0.75)",
                  backdropFilter: "blur(14px)",
                  border: isExpanded
                    ? "1px solid rgba(56, 189, 248, 0.4)"
                    : "1px solid rgba(255, 255, 255, 0.07)",
                  borderRadius: "14px",
                  overflow: "hidden",
                  transition: "all 0.2s ease",
                  boxShadow: isExpanded ? "0 8px 30px rgba(0, 0, 0, 0.5)" : "none",
                }}
              >
                {/* Header Row */}
                <div
                  onClick={() => setExpandedId(isExpanded ? null : finding.id)}
                  style={{
                    padding: "16px 20px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    cursor: "pointer",
                    userSelect: "none",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", flex: 1 }}>
                    {isExpanded ? (
                      <ChevronDown size={18} color="#38bdf8" />
                    ) : (
                      <ChevronRight size={18} color="#64748b" />
                    )}

                    {getSeverityBadge(finding.severity)}
                    {getLifecycleBadge(finding.lifecycle_state)}

                    <div style={{ fontWeight: 700, fontSize: "14px", color: "#f8fafc" }}>
                      {finding.title}
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                    <span
                      style={{
                        fontSize: "12px",
                        color: "#94a3b8",
                        fontFamily: "JetBrains Mono, monospace",
                      }}
                    >
                      {finding.affected_file}:{finding.line_number}
                    </span>
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: 700,
                        padding: "2px 8px",
                        borderRadius: "9999px",
                        background:
                          finding.verification_status === "Confirmed"
                            ? "rgba(16, 185, 129, 0.15)"
                            : "rgba(56, 189, 248, 0.15)",
                        color:
                          finding.verification_status === "Confirmed" ? "#10b981" : "#38bdf8",
                      }}
                    >
                      {finding.verification_status} ({Math.round(finding.confidence * 100)}%)
                    </span>
                  </div>
                </div>

                {/* Expanded Accordion Body */}
                {isExpanded && (
                  <div
                    style={{
                      padding: "0 20px 20px 20px",
                      borderTop: "1px solid rgba(255, 255, 255, 0.05)",
                      marginTop: "4px",
                    }}
                  >
                    {/* Code Snippet Box */}
                    {finding.snippet && (
                      <div style={{ marginTop: "16px", marginBottom: "16px" }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            fontSize: "11px",
                            fontWeight: 700,
                            color: "#64748b",
                            textTransform: "uppercase",
                            marginBottom: "6px",
                          }}
                        >
                          <Code2 size={13} /> Evidence Snippet ({finding.affected_file}:
                          {finding.line_number})
                        </div>
                        <pre
                          style={{
                            margin: 0,
                            padding: "12px 16px",
                            borderRadius: "8px",
                            background: "#030712",
                            border: "1px solid rgba(255, 255, 255, 0.08)",
                            fontSize: "12px",
                            color: "#f87171",
                            overflowX: "auto",
                            fontFamily: "JetBrains Mono, monospace",
                          }}
                        >
                          {finding.snippet}
                        </pre>
                      </div>
                    )}

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: "16px",
                        marginBottom: "16px",
                      }}
                    >
                      {/* Technical Explanation */}
                      <div
                        style={{
                          background: "rgba(11, 17, 32, 0.6)",
                          padding: "14px",
                          borderRadius: "10px",
                          border: "1px solid rgba(255, 255, 255, 0.05)",
                        }}
                      >
                        <div
                          style={{
                            fontSize: "11px",
                            fontWeight: 700,
                            color: "#38bdf8",
                            textTransform: "uppercase",
                            marginBottom: "6px",
                          }}
                        >
                          Technical Root Cause
                        </div>
                        <p style={{ margin: 0, fontSize: "13px", color: "#cbd5e1", lineHeight: 1.5 }}>
                          {finding.technical_explanation}
                        </p>
                      </div>

                      {/* Potential Impact */}
                      <div
                        style={{
                          background: "rgba(11, 17, 32, 0.6)",
                          padding: "14px",
                          borderRadius: "10px",
                          border: "1px solid rgba(255, 255, 255, 0.05)",
                        }}
                      >
                        <div
                          style={{
                            fontSize: "11px",
                            fontWeight: 700,
                            color: "#f43f5e",
                            textTransform: "uppercase",
                            marginBottom: "6px",
                          }}
                        >
                          Potential Production Impact
                        </div>
                        <p style={{ margin: 0, fontSize: "13px", color: "#cbd5e1", lineHeight: 1.5 }}>
                          {finding.potential_impact}
                        </p>
                      </div>
                    </div>

                    {/* Recommended Remediation */}
                    <div
                      style={{
                        background: "rgba(16, 185, 129, 0.06)",
                        padding: "14px 16px",
                        borderRadius: "10px",
                        border: "1px solid rgba(16, 185, 129, 0.2)",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        gap: "16px",
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontSize: "11px",
                            fontWeight: 700,
                            color: "#34d399",
                            textTransform: "uppercase",
                            marginBottom: "4px",
                          }}
                        >
                          Recommended Remediation
                        </div>
                        <p style={{ margin: 0, fontSize: "13px", color: "#f8fafc", lineHeight: 1.5 }}>
                          {finding.recommended_remediation}
                        </p>
                      </div>

                      <button
                        onClick={() =>
                          handleCopy(finding.recommended_remediation, finding.id)
                        }
                        style={{
                          background: "rgba(16, 185, 129, 0.15)",
                          border: "1px solid rgba(16, 185, 129, 0.4)",
                          color: "#34d399",
                          borderRadius: "8px",
                          padding: "6px 12px",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                          fontSize: "12px",
                          fontWeight: 600,
                          flexShrink: 0,
                        }}
                      >
                        {copiedId === finding.id ? (
                          <>
                            <Check size={14} /> Copied!
                          </>
                        ) : (
                          <>
                            <Copy size={14} /> Copy Fix
                          </>
                        )}
                      </button>
                    </div>

                    {/* Counterevidence considered */}
                    {finding.counterevidence_considered &&
                      finding.counterevidence_considered.length > 0 && (
                        <div style={{ marginTop: "12px", fontSize: "12px", color: "#64748b" }}>
                          <span style={{ fontWeight: 600 }}>Counterevidence Checked: </span>
                          {finding.counterevidence_considered.join(" • ")}
                        </div>
                      )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
