import React, { useState } from "react";
import { Finding } from "../api/client";

interface FindingsTableProps {
  findings: Finding[];
  total: number;
}

export const FindingsTable: React.FC<FindingsTableProps> = ({ findings, total }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedSeverity, setSelectedSeverity] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const getSeverityBadge = (sev: string) => {
    const colors: Record<string, { bg: string; text: string }> = {
      critical: { bg: "#fef2f2", text: "#b91c1c" },
      high: { bg: "#fff7ed", text: "#c2410c" },
      medium: { bg: "#fffbeb", text: "#b45309" },
      low: { bg: "#eff6ff", text: "#1d4ed8" },
      info: { bg: "#f1f5f9", text: "#475569" },
    };
    const c = colors[sev.toLowerCase()] || colors.info;
    return (
      <span
        style={{
          padding: "2px 8px",
          borderRadius: "4px",
          backgroundColor: c.bg,
          color: c.text,
          fontSize: "11px",
          fontWeight: 700,
          textTransform: "uppercase",
        }}
      >
        {sev}
      </span>
    );
  };

  const getLifecycleBadge = (state?: string) => {
    if (!state) return null;
    const colors: Record<string, { bg: string; text: string }> = {
      NEW: { bg: "#ecfdf5", text: "#047857" },
      EXISTING: { bg: "#f1f5f9", text: "#475569" },
      REINTRODUCED: { bg: "#fef2f2", text: "#b91c1c" },
      RESOLVED: { bg: "#eff6ff", text: "#1d4ed8" },
      ACCEPTED_RISK: { bg: "#fdf4ff", text: "#86198f" },
    };
    const c = colors[state] || { bg: "#f8fafc", text: "#64748b" };
    return (
      <span
        style={{
          padding: "2px 6px",
          borderRadius: "4px",
          backgroundColor: c.bg,
          color: c.text,
          fontSize: "10px",
          fontWeight: 600,
          marginLeft: "6px",
        }}
      >
        {state}
      </span>
    );
  };

  const filtered = findings.filter((f) => {
    if (selectedCategory !== "all" && f.category !== selectedCategory) return false;
    if (selectedSeverity !== "all" && f.severity.toLowerCase() !== selectedSeverity) return false;
    return true;
  });

  return (
    <div
      style={{
        background: "#ffffff",
        borderRadius: "12px",
        padding: "24px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
        border: "1px solid #e2e8f0",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <h2 style={{ margin: 0, fontSize: "18px", color: "#1e293b" }}>
          Findings & Evidence Log ({filtered.length} of {total})
        </h2>

        <div style={{ display: "flex", gap: "10px" }}>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px" }}
          >
            <option value="all">All Categories</option>
            <option value="security">Security</option>
            <option value="gap">Gaps (Negative Space)</option>
            <option value="slop">Code Slop</option>
            <option value="loose_end">Loose Ends</option>
          </select>

          <select
            value={selectedSeverity}
            onChange={(e) => setSelectedSeverity(e.target.value)}
            style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px" }}
          >
            <option value="all">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      <div style={{ border: "1px solid #e2e8f0", borderRadius: "8px", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" }}>
          <thead style={{ backgroundColor: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
            <tr>
              <th style={{ padding: "10px 14px", color: "#64748b", fontWeight: 600 }}>Severity</th>
              <th style={{ padding: "10px 14px", color: "#64748b", fontWeight: 600 }}>Category</th>
              <th style={{ padding: "10px 14px", color: "#64748b", fontWeight: 600 }}>Finding Title & Evidence</th>
              <th style={{ padding: "10px 14px", color: "#64748b", fontWeight: 600 }}>File Location</th>
              <th style={{ padding: "10px 14px", color: "#64748b", fontWeight: 600 }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((f) => {
              const isExpanded = expandedId === f.id;
              return (
                <React.Fragment key={f.id}>
                  <tr
                    onClick={() => setExpandedId(isExpanded ? null : f.id)}
                    style={{
                      borderBottom: "1px solid #f1f5f9",
                      cursor: "pointer",
                      backgroundColor: isExpanded ? "#f8fafc" : "#ffffff",
                    }}
                  >
                    <td style={{ padding: "10px 14px", whiteSpace: "nowrap" }}>
                      {getSeverityBadge(f.severity)}
                    </td>
                    <td style={{ padding: "10px 14px", color: "#475569", fontWeight: 500, whiteSpace: "nowrap" }}>
                      {f.category}
                    </td>
                    <td style={{ padding: "10px 14px", color: "#0f172a", fontWeight: 500 }}>
                      <div>{f.title}</div>
                      <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px", fontFamily: "monospace" }}>
                        ID: {f.stable_id || f.id}
                        {getLifecycleBadge(f.lifecycle_state)}
                      </div>
                    </td>
                    <td style={{ padding: "10px 14px", color: "#2563eb", fontFamily: "monospace", fontSize: "12px", whiteSpace: "nowrap" }}>
                      {f.affected_file}:{f.line_number}
                    </td>
                    <td style={{ padding: "10px 14px", whiteSpace: "nowrap" }}>
                      <span
                        style={{
                          fontSize: "11px",
                          color: f.verification_status === "Confirmed" ? "#16a34a" : "#d97706",
                          fontWeight: 600,
                        }}
                      >
                        {f.verification_status} ({(f.confidence * 100).toFixed(0)}%)
                      </span>
                    </td>
                  </tr>

                  {isExpanded && (
                    <tr style={{ backgroundColor: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                      <td colSpan={5} style={{ padding: "16px 20px" }}>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                          <div>
                            <div style={{ fontWeight: 600, color: "#334155", marginBottom: "4px" }}>
                              Technical Explanation:
                            </div>
                            <p style={{ margin: "0 0 12px 0", color: "#475569", lineHeight: 1.5 }}>
                              {f.technical_explanation}
                            </p>

                            <div style={{ fontWeight: 600, color: "#334155", marginBottom: "4px" }}>
                              Potential Impact:
                            </div>
                            <p style={{ margin: "0 0 12px 0", color: "#dc2626", lineHeight: 1.5 }}>
                              {f.potential_impact}
                            </p>

                            <div style={{ fontWeight: 600, color: "#334155", marginBottom: "4px" }}>
                              Recommended Remediation:
                            </div>
                            <p style={{ margin: 0, color: "#16a34a", lineHeight: 1.5 }}>
                              {f.recommended_remediation}
                            </p>
                          </div>

                          <div>
                            <div style={{ fontWeight: 600, color: "#334155", marginBottom: "4px" }}>
                              Code Snippet & Provenance:
                            </div>
                            <pre
                              style={{
                                background: "#0f172a",
                                color: "#f8fafc",
                                padding: "10px 14px",
                                borderRadius: "6px",
                                fontSize: "12px",
                                overflowX: "auto",
                                margin: 0,
                              }}
                            >
                              <code>{f.snippet || "// No direct snippet available"}</code>
                            </pre>

                            {f.counterevidence_considered && f.counterevidence_considered.length > 0 && (
                              <div style={{ marginTop: "12px" }}>
                                <div style={{ fontWeight: 600, color: "#334155", marginBottom: "4px" }}>
                                  Counterevidence Evaluated:
                                </div>
                                <ul style={{ margin: 0, paddingLeft: "16px", color: "#64748b", fontSize: "12px" }}>
                                  {f.counterevidence_considered.map((c, i) => (
                                    <li key={i}>{c}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
