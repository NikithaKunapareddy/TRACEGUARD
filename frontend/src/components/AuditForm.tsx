import React, { useState } from "react";
import { traceguardApi, AuditRequest } from "../api/client";

interface AuditFormProps {
  onAuditStarted: (auditId: string) => void;
}

export const AuditForm: React.FC<AuditFormProps> = ({ onAuditStarted }) => {
  const [repoPath, setRepoPath] = useState("./benchmark_repos/repo1_ecommerce_fullstack");
  const [minSeverity, setMinSeverity] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [incremental, setIncremental] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const availableCategories = [
    { key: "security", label: "Security Vulnerabilities" },
    { key: "gap", label: "Negative-Space & Gaps" },
    { key: "slop", label: "Code Slop & Redundancy" },
    { key: "loose_end", label: "Loose Ends & Hygiene" },
  ];

  const toggleCategory = (key: string) => {
    setCategories((prev) =>
      prev.includes(key) ? prev.filter((c) => c !== key) : [...prev, key]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoPath.trim()) {
      setError("Repository path cannot be empty.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload: AuditRequest = {
        repo_path: repoPath.trim(),
        min_severity: minSeverity || undefined,
        categories: categories.length > 0 ? categories : undefined,
        incremental,
      };

      const res = await traceguardApi.startAudit(payload);
      onAuditStarted(res.audit_id);
    } catch (err: any) {
      setError(err.message || "Failed to trigger repository audit.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        background: "#ffffff",
        borderRadius: "12px",
        padding: "24px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
        marginBottom: "24px",
        border: "1px solid #e2e8f0",
      }}
    >
      <h2 style={{ margin: "0 0 16px 0", fontSize: "18px", color: "#1e293b" }}>
        Launch Repository Integrity Audit
      </h2>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: "16px" }}>
          <label style={{ display: "block", fontSize: "14px", fontWeight: 500, color: "#334155", marginBottom: "6px" }}>
            Repository Filesystem Path
          </label>
          <input
            type="text"
            value={repoPath}
            onChange={(e) => setRepoPath(e.target.value)}
            placeholder="e.g. ./benchmark_repos/repo1_ecommerce_fullstack"
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: "6px",
              border: "1px solid #cbd5e1",
              fontSize: "14px",
              boxSizing: "border-box",
            }}
          />
          <span style={{ fontSize: "12px", color: "#64748b" }}>
            Read-only access strictly enforced; no files in target repository are modified.
          </span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
          <div>
            <label style={{ display: "block", fontSize: "14px", fontWeight: 500, color: "#334155", marginBottom: "6px" }}>
              Minimum Severity Threshold
            </label>
            <select
              value={minSeverity}
              onChange={(e) => setMinSeverity(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: "6px",
                border: "1px solid #cbd5e1",
                fontSize: "14px",
                backgroundColor: "#fff",
              }}
            >
              <option value="">All Severities (info - critical)</option>
              <option value="low">Low & above</option>
              <option value="medium">Medium & above</option>
              <option value="high">High & above</option>
              <option value="critical">Critical only</option>
            </select>
          </div>

          <div style={{ display: "flex", alignItems: "center", paddingTop: "24px" }}>
            <label style={{ display: "flex", alignItems: "center", cursor: "pointer", fontSize: "14px", color: "#334155" }}>
              <input
                type="checkbox"
                checked={incremental}
                onChange={(e) => setIncremental(e.target.checked)}
                style={{ marginRight: "8px" }}
              />
              Enable Change-Aware Incremental Auditing
            </label>
          </div>
        </div>

        <div style={{ marginBottom: "20px" }}>
          <label style={{ display: "block", fontSize: "14px", fontWeight: 500, color: "#334155", marginBottom: "8px" }}>
            Filter Categories (Optional)
          </label>
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            {availableCategories.map((c) => (
              <button
                key={c.key}
                type="button"
                onClick={() => toggleCategory(c.key)}
                style={{
                  padding: "6px 12px",
                  borderRadius: "20px",
                  border: "1px solid",
                  borderColor: categories.includes(c.key) ? "#2563eb" : "#cbd5e1",
                  backgroundColor: categories.includes(c.key) ? "#eff6ff" : "#ffffff",
                  color: categories.includes(c.key) ? "#1d4ed8" : "#475569",
                  fontSize: "13px",
                  cursor: "pointer",
                  fontWeight: categories.includes(c.key) ? 600 : 400,
                }}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div
            style={{
              padding: "10px 14px",
              backgroundColor: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: "6px",
              color: "#b91c1c",
              fontSize: "13px",
              marginBottom: "16px",
            }}
          >
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            padding: "10px 20px",
            backgroundColor: "#2563eb",
            color: "#ffffff",
            border: "none",
            borderRadius: "6px",
            fontSize: "14px",
            fontWeight: 600,
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? "Initializing Audit..." : "Run TraceGuard Audit"}
        </button>
      </form>
    </div>
  );
};
