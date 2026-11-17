import React, { useState } from "react";
import { traceguardApi, AuditRequest } from "../api/client";
import { Play, Shield, RefreshCw, AlertCircle, Sparkles } from "lucide-react";

interface AuditFormProps {
  onAuditStarted: (auditId: string) => void;
  repoPath: string;
  setRepoPath: (path: string) => void;
}

export const AuditForm: React.FC<AuditFormProps> = ({
  onAuditStarted,
  repoPath,
  setRepoPath,
}) => {
  const [minSeverity, setMinSeverity] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [incremental, setIncremental] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const availableCategories = [
    { key: "security", label: "🛡️ Security Vulnerabilities" },
    { key: "gap", label: "🧩 Negative-Space & Gaps" },
    { key: "slop", label: "🧹 Code Slop & Redundancy" },
    { key: "loose_end", label: "⏳ Loose Ends & Hygiene" },
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
        background: "rgba(15, 23, 42, 0.75)",
        backdropFilter: "blur(16px)",
        borderRadius: "16px",
        padding: "24px",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        marginBottom: "28px",
        boxShadow: "0 10px 30px rgba(0, 0, 0, 0.35)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <h2 style={{ margin: 0, fontSize: "17px", fontWeight: 700, color: "#f8fafc", display: "flex", alignItems: "center", gap: "8px" }}>
          <Sparkles size={18} color="#38bdf8" /> Launch Repository Integrity Audit
        </h2>
        <span style={{ fontSize: "12px", color: "#64748b" }}>
          Target filesystem remains strictly read-only
        </span>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: "18px" }}>
          <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#cbd5e1", marginBottom: "6px" }}>
            Repository Filesystem Path
          </label>
          <input
            type="text"
            value={repoPath}
            onChange={(e) => setRepoPath(e.target.value)}
            placeholder="e.g. ./benchmark_repos/repo1_ecommerce_fullstack"
            style={{
              width: "100%",
              padding: "12px 14px",
              borderRadius: "10px",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              background: "rgba(3, 7, 18, 0.6)",
              color: "#f8fafc",
              fontSize: "14px",
              fontFamily: "JetBrains Mono, monospace",
              outline: "none",
              transition: "border 0.2s ease",
            }}
          />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "18px" }}>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#cbd5e1", marginBottom: "6px" }}>
              Minimum Severity Threshold
            </label>
            <select
              value={minSeverity}
              onChange={(e) => setMinSeverity(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: "8px",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                background: "#080c18",
                color: "#f8fafc",
                fontSize: "13px",
                outline: "none",
              }}
            >
              <option value="">All Severities (info → critical)</option>
              <option value="low">Low, Medium, High & Critical</option>
              <option value="medium">Medium, High & Critical</option>
              <option value="high">High & Critical Only</option>
              <option value="critical">Critical Vulnerabilities Only</option>
            </select>
          </div>

          <div style={{ display: "flex", alignItems: "center", paddingTop: "24px" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", fontSize: "13px", color: "#cbd5e1" }}>
              <input
                type="checkbox"
                checked={incremental}
                onChange={(e) => setIncremental(e.target.checked)}
                style={{ width: "16px", height: "16px", accentColor: "#38bdf8" }}
              />
              <span style={{ fontWeight: 600 }}>Enable Change-Aware Incremental Auditing</span>
            </label>
          </div>
        </div>

        {/* Category Pills */}
        <div style={{ marginBottom: "20px" }}>
          <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#cbd5e1", marginBottom: "8px" }}>
            Filter Categories (Optional)
          </label>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {availableCategories.map((cat) => {
              const active = categories.includes(cat.key);
              return (
                <button
                  type="button"
                  key={cat.key}
                  onClick={() => toggleCategory(cat.key)}
                  style={{
                    padding: "6px 14px",
                    borderRadius: "9999px",
                    border: active ? "1px solid #38bdf8" : "1px solid rgba(255, 255, 255, 0.08)",
                    background: active ? "rgba(56, 189, 248, 0.2)" : "rgba(11, 17, 32, 0.6)",
                    color: active ? "#38bdf8" : "#94a3b8",
                    fontSize: "12px",
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div
            style={{
              padding: "12px 16px",
              borderRadius: "8px",
              background: "rgba(244, 63, 94, 0.15)",
              border: "1px solid rgba(244, 63, 94, 0.3)",
              color: "#f87171",
              fontSize: "13px",
              marginBottom: "16px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            background: "linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)",
            border: "none",
            borderRadius: "10px",
            padding: "12px 28px",
            color: "#ffffff",
            fontSize: "14px",
            fontWeight: 700,
            cursor: loading ? "not-allowed" : "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "10px",
            boxShadow: "0 4px 15px rgba(56, 189, 248, 0.4)",
            transition: "all 0.2s ease",
          }}
        >
          {loading ? <RefreshCw size={16} className="radar-sweep" /> : <Play size={16} />}
          {loading ? "Executing Audit Pipeline..." : "Run TraceGuard Audit"}
        </button>
      </form>
    </div>
  );
};
