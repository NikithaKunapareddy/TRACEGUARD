import React, { useState, useMemo } from "react";
import { traceguardApi, AuditRequest } from "../api/client";
import {
  ArrowLeft,
  Sparkles,
  Search,
  CheckCircle2,
  FolderOpen,
  Play,
  Loader2,
  ShieldAlert,
  AlertCircle,
  Puzzle,
  Code2,
  Clock,
  Lock,
} from "lucide-react";

interface AuditWorkspaceProps {
  onBackToLanding: () => void;
  onAuditStarted: (auditId: string) => void;
  repoPath: string;
  setRepoPath: (path: string) => void;
  darkMode: boolean;
  isScanning?: boolean;
}

interface BenchmarkSuite {
  id: string;
  name: string;
  tag: string;
  path: string;
  description: string;
  tech: string[];
  mistakes: string[];
}

const BENCHMARKS: BenchmarkSuite[] = [
  {
    id: "repo1",
    name: "Repo 1: Fullstack E-Commerce",
    tag: "Polyglot",
    path: "./benchmark_repos/repo1_ecommerce_fullstack",
    description: "Complete fullstack e-commerce app with React frontend, Python API & SQLite store.",
    tech: ["Python", "FastAPI", "React", "SQLite"],
    mistakes: ["SQL Injection", "Missing Route (DELETE /cart)", "Mock Checkout Stub", "Blind Exceptions"],
  },
  {
    id: "repo2",
    name: "Repo 2: Cloud Microservice",
    tag: "Cloud",
    path: "./benchmark_repos/repo2_cloud_microservice",
    description: "Cloud-native microservice architecture with async messaging and event handlers.",
    tech: ["Python", "AsyncIO", "Docker"],
    mistakes: ["Command Injection (shell=True)", "Unimplemented Go Interface", "Unconfigured Env Var"],
  },
  {
    id: "repo3",
    name: "Repo 3: Polyglot Fintech",
    tag: "Fintech",
    path: "./benchmark_repos/repo3_polyglot_fintech",
    description: "Polyglot financial transaction ledger with high consistency and security bounds.",
    tech: ["Python", "FastAPI", "SQLAlchemy"],
    mistakes: ["Hardcoded JWT Secret", "Documented Route Missing", "Swallowed Exception"],
  },
  {
    id: "repo4",
    name: "Repo 4: FastAPI + React",
    tag: "Fullstack",
    path: "./benchmark_repos/repo4_fastapi_react",
    description: "Modern Single Page Application paired with typed FastAPI backend endpoints.",
    tech: ["Python", "FastAPI", "React", "TypeScript"],
    mistakes: ["SQL Injection in Search", "Missing Route (DELETE /tasks)", "Unanchored Docs"],
  },
  {
    id: "repo5",
    name: "Repo 5: Cloud API Only",
    tag: "API",
    path: "./benchmark_repos/repo5_fastapi_only",
    description: "Pure headless REST API service focusing on endpoint routing and data schemas.",
    tech: ["FastAPI", "Pydantic", "Python 3.11"],
    mistakes: ["Missing Documented /analytics/users", "Unresolved TODO Placeholder"],
  },
  {
    id: "repo6",
    name: "Repo 6: Node.js Express",
    tag: "Node",
    path: "./benchmark_repos/repo6_node_express",
    description: "JavaScript Express server with middleware, JWT auth routes, and route handlers.",
    tech: ["Node.js", "Express", "JavaScript"],
    mistakes: ["Hardcoded JWT Secret", "Unprotected Sensitive /admin/data", "Leftover console.log"],
  },
  {
    id: "repo7",
    name: "Repo 7: Python Worker",
    tag: "Worker",
    path: "./benchmark_repos/repo7_python_worker",
    description: "Background queue worker with task pipelines, retry loops, and job handlers.",
    tech: ["Python", "Async", "Queues"],
    mistakes: ["Unconfigured Broker Env Var", "Swallowed Exception in Worker"],
  },
  {
    id: "repo8",
    name: "Repo 8: Go Microservice",
    tag: "Go",
    path: "./benchmark_repos/repo8_go_microservice",
    description: "Go microservice demonstrating implicit interface satisfaction and concurrent routines.",
    tech: ["Go", "Interfaces", "Goroutines"],
    mistakes: ["Unimplemented AuditNotifier Interface", "Unconfigured Service Port"],
  },
  {
    id: "repo9",
    name: "Repo 9: Python Modular Monolith",
    tag: "Enterprise",
    path: "./benchmark_repos/repo9_python_monolith",
    description: "Multi-domain modular monolith with domain layers and clean architecture boundaries.",
    tech: ["Python", "Clean Arch", "Domain Models"],
    mistakes: ["Empty Stub Method (cancel_order)", "Pass Implementation"],
  },
];

export const AuditWorkspace: React.FC<AuditWorkspaceProps> = ({
  onBackToLanding,
  onAuditStarted,
  repoPath,
  setRepoPath,
  darkMode,
  isScanning = false,
}) => {
  const [minSeverity, setMinSeverity] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [incremental, setIncremental] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [benchmarkSearch, setBenchmarkSearch] = useState("");
  const [hoveredBenchmarkId, setHoveredBenchmarkId] = useState<string | null>(null);

  const cyan = darkMode ? "#38bdf8" : "#0284c7";
  const purple = darkMode ? "#a855f7" : "#7c3aed";
  const emerald = darkMode ? "#10b981" : "#059669";
  const rose = darkMode ? "#f43f5e" : "#dc2626";
  const amber = darkMode ? "#f59e0b" : "#d97706";
  const textPrimary = darkMode ? "#f8fafc" : "#0f172a";
  const textSecondary = darkMode ? "#94a3b8" : "#475569";
  const textMuted = darkMode ? "#64748b" : "#94a3b8";

  const cardStyle: React.CSSProperties = {
    background: darkMode ? "rgba(15, 23, 42, 0.75)" : "#ffffff",
    backdropFilter: "blur(16px)",
    border: darkMode ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid #e2e8f0",
    borderRadius: "16px",
    padding: "24px",
    boxShadow: darkMode ? "0 8px 32px rgba(0, 0, 0, 0.3)" : "0 4px 20px rgba(0, 0, 0, 0.06)",
  };

  const availableCategories = [
    { key: "security", label: "Security Vulnerabilities", icon: <ShieldAlert size={14} color={rose} /> },
    { key: "gap", label: "Negative-Space & Gaps", icon: <Puzzle size={14} color={emerald} /> },
    { key: "slop", label: "Code Slop & Redundancy", icon: <Code2 size={14} color={amber} /> },
    { key: "loose_end", label: "Loose Ends & Hygiene", icon: <Clock size={14} color={purple} /> },
  ];

  const toggleCategory = (key: string) => {
    setCategories((prev) =>
      prev.includes(key) ? prev.filter((c) => c !== key) : [...prev, key]
    );
  };

  const filteredBenchmarks = useMemo(() => {
    if (!benchmarkSearch.trim()) return BENCHMARKS;
    const q = benchmarkSearch.toLowerCase();
    return BENCHMARKS.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        b.path.toLowerCase().includes(q) ||
        b.description.toLowerCase().includes(q) ||
        b.tech.some((t) => t.toLowerCase().includes(q))
    );
  }, [benchmarkSearch]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoPath.trim()) {
      setError("Please provide or select a repository filesystem path.");
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
    <div style={{ paddingBottom: "40px" }}>
      {/* Top Header & Breadcrumb */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
        }}
      >
        <button
          onClick={onBackToLanding}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "8px 16px",
            borderRadius: "10px",
            fontSize: "13px",
            fontWeight: 600,
            background: darkMode ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.05)",
            border: darkMode ? "1px solid rgba(255, 255, 255, 0.1)" : "1px solid rgba(0, 0, 0, 0.1)",
            color: textPrimary,
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
        >
          <ArrowLeft size={16} />
          <span>Back to Home</span>
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: textMuted }}>
          <Lock size={13} color={emerald} />
          <span>Strict read-only target guarantee</span>
        </div>
      </div>

      {/* Responsive 2-column / 1-column layout without clipping */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
          gap: "24px",
          alignItems: "start",
        }}
      >
        {/* Left Column: Repository & Benchmark Selection */}
        <div style={cardStyle}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
            <FolderOpen size={18} color={cyan} />
            <h2 style={{ margin: 0, fontSize: "17px", fontWeight: 700, color: textPrimary }}>
              Target Repository Selection
            </h2>
          </div>
          <p style={{ margin: "0 0 18px 0", fontSize: "13px", color: textSecondary }}>
            Choose one of the 9 benchmark test suites or enter a custom local path.
          </p>

          {/* Search Benchmarks */}
          <div style={{ position: "relative", marginBottom: "14px" }}>
            <Search
              size={14}
              color={textMuted}
              style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)" }}
            />
            <input
              type="text"
              placeholder="Search benchmark suites by keyword (Python, Go, React, FastAPI...)"
              value={benchmarkSearch}
              onChange={(e) => setBenchmarkSearch(e.target.value)}
              style={{
                width: "100%",
                padding: "9px 12px 9px 34px",
                borderRadius: "10px",
                background: darkMode ? "rgba(3, 7, 18, 0.6)" : "rgba(241, 245, 249, 0.8)",
                border: darkMode ? "1px solid rgba(255, 255, 255, 0.1)" : "1px solid rgba(0, 0, 0, 0.1)",
                color: textPrimary,
                fontSize: "13px",
                outline: "none",
              }}
            />
          </div>

          {/* Benchmark Grid (All 9) */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              maxHeight: "380px",
              overflowY: "auto",
              paddingRight: "4px",
              marginBottom: "20px",
            }}
          >
            {filteredBenchmarks.map((b) => {
              const isSelected = repoPath === b.path;
              const isHovered = hoveredBenchmarkId === b.id;
              return (
                <div
                  key={b.id}
                  onClick={() => setRepoPath(b.path)}
                  onMouseEnter={() => setHoveredBenchmarkId(b.id)}
                  onMouseLeave={() => setHoveredBenchmarkId(null)}
                  style={{
                    padding: "14px 16px",
                    borderRadius: "12px",
                    background: isSelected
                      ? `${cyan}20`
                      : isHovered
                      ? darkMode
                        ? "rgba(56, 189, 248, 0.08)"
                        : "rgba(2, 132, 199, 0.08)"
                      : darkMode
                      ? "rgba(255, 255, 255, 0.03)"
                      : "rgba(248, 250, 252, 0.95)",
                    border: isSelected
                      ? `2px solid ${cyan}`
                      : isHovered
                      ? `1.5px solid ${cyan}88`
                      : darkMode
                      ? "1px solid rgba(255, 255, 255, 0.07)"
                      : "1px solid #e2e8f0",
                    boxShadow: isSelected
                      ? `0 0 20px ${cyan}35`
                      : isHovered
                      ? `0 6px 20px rgba(0, 0, 0, ${darkMode ? "0.35" : "0.08"})`
                      : "none",
                    transform: isHovered ? "translateY(-1.5px)" : "none",
                    cursor: "pointer",
                    transition: "all 0.18s cubic-bezier(0.16, 1, 0.3, 1)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                    <span style={{ fontWeight: 700, fontSize: "13.5px", color: isSelected ? cyan : textPrimary }}>
                      {b.name}
                    </span>
                    <span
                      style={{
                        fontSize: "10.5px",
                        fontWeight: 700,
                        padding: "2px 8px",
                        borderRadius: "9999px",
                        background: isSelected ? `${cyan}33` : darkMode ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.06)",
                        color: isSelected ? cyan : textSecondary,
                      }}
                    >
                      {b.tag}
                    </span>
                  </div>
                  <div style={{ fontSize: "12px", color: textSecondary, marginBottom: "8px", lineHeight: 1.4 }}>
                    {b.description}
                  </div>

                  <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                    {b.tech.map((t) => (
                      <span
                        key={t}
                        style={{
                          fontSize: "10.5px",
                          color: isSelected ? cyan : textMuted,
                          padding: "2px 7px",
                          borderRadius: "4px",
                          background: darkMode ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.04)",
                          border: darkMode ? "1px solid rgba(255, 255, 255, 0.06)" : "1px solid rgba(0, 0, 0, 0.06)",
                        }}
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Custom Path Input */}
          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: textSecondary, marginBottom: "6px" }}>
              Active Filesystem Path (or enter custom directory)
            </label>
            <input
              type="text"
              value={repoPath}
              onChange={(e) => setRepoPath(e.target.value)}
              placeholder="e.g. ./benchmark_repos/repo1_ecommerce_fullstack"
              style={{
                width: "100%",
                padding: "11px 14px",
                borderRadius: "10px",
                background: darkMode ? "rgba(3, 7, 18, 0.7)" : "rgba(241, 245, 249, 0.9)",
                border: darkMode ? "1px solid rgba(255, 255, 255, 0.12)" : "1px solid rgba(0, 0, 0, 0.12)",
                color: textPrimary,
                fontSize: "13px",
                fontFamily: "JetBrains Mono, monospace",
                outline: "none",
              }}
            />
          </div>
        </div>

        {/* Right Column: Audit Configuration & Execution */}
        <div style={cardStyle}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
            <Sparkles size={18} color={purple} />
            <h2 style={{ margin: 0, fontSize: "17px", fontWeight: 700, color: textPrimary }}>
              Audit Configuration
            </h2>
          </div>
          <p style={{ margin: "0 0 20px 0", fontSize: "13px", color: textSecondary }}>
            Configure detection sensitivity, category filters and incremental auditing.
          </p>

          <form onSubmit={handleSubmit}>
            {/* Minimum Severity Selector */}
            <div style={{ marginBottom: "20px" }}>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: textSecondary, marginBottom: "6px" }}>
                Minimum Severity Threshold
              </label>
              <select
                value={minSeverity}
                onChange={(e) => setMinSeverity(e.target.value)}
                style={{
                  width: "100%",
                  padding: "11px 14px",
                  borderRadius: "10px",
                  background: darkMode ? "rgba(3, 7, 18, 0.7)" : "rgba(241, 245, 249, 0.9)",
                  border: darkMode ? "1px solid rgba(255, 255, 255, 0.12)" : "1px solid rgba(0, 0, 0, 0.12)",
                  color: textPrimary,
                  fontSize: "13px",
                  outline: "none",
                  cursor: "pointer",
                }}
              >
                <option value="">All Severities (info → critical)</option>
                <option value="low">Low, Medium, High &amp; Critical</option>
                <option value="medium">Medium, High &amp; Critical</option>
                <option value="high">High &amp; Critical Only</option>
                <option value="critical">Critical Only</option>
              </select>
              <div style={{ fontSize: "11px", color: textMuted, marginTop: "4px" }}>
                Repository-wide score is always calculated on full repository findings.
              </div>
            </div>

            {/* Category Filter Toggles */}
            <div style={{ marginBottom: "20px" }}>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: textSecondary, marginBottom: "8px" }}>
                Filter Analysis Categories (Optional)
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                {availableCategories.map((cat) => {
                  const isChecked = categories.includes(cat.key);
                  return (
                    <button
                      type="button"
                      key={cat.key}
                      onClick={() => toggleCategory(cat.key)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        padding: "10px 12px",
                        borderRadius: "10px",
                        fontSize: "12px",
                        fontWeight: 600,
                        background: isChecked
                          ? `${cyan}20`
                          : darkMode
                          ? "rgba(255, 255, 255, 0.03)"
                          : "rgba(0, 0, 0, 0.02)",
                        border: isChecked
                          ? `1px solid ${cyan}`
                          : darkMode
                          ? "1px solid rgba(255, 255, 255, 0.08)"
                          : "1px solid rgba(0, 0, 0, 0.08)",
                        color: isChecked ? cyan : textSecondary,
                        cursor: "pointer",
                        textAlign: "left",
                      }}
                    >
                      {cat.icon}
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {cat.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Incremental Auditing Checkbox */}
            <div
              style={{
                marginBottom: "24px",
                padding: "12px",
                borderRadius: "10px",
                background: darkMode ? "rgba(255, 255, 255, 0.02)" : "rgba(0, 0, 0, 0.02)",
                border: darkMode ? "1px solid rgba(255, 255, 255, 0.06)" : "1px solid rgba(0, 0, 0, 0.06)",
              }}
            >
              <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={incremental}
                  onChange={(e) => setIncremental(e.target.checked)}
                  style={{ width: "16px", height: "16px", cursor: "pointer", accentColor: cyan }}
                />
                <div>
                  <div style={{ fontSize: "13px", fontWeight: 600, color: textPrimary }}>
                    Enable Change-Aware Incremental Auditing
                  </div>
                  <div style={{ fontSize: "11px", color: textMuted }}>
                    Compares stable finding IDs against prior SQLite audits to assign NEW, RESOLVED, or REINTRODUCED lifecycle states.
                  </div>
                </div>
              </label>
            </div>

            {/* Error Message */}
            {error && (
              <div
                style={{
                  background: `${rose}15`,
                  border: `1px solid ${rose}44`,
                  color: rose,
                  padding: "10px 14px",
                  borderRadius: "8px",
                  fontSize: "12px",
                  marginBottom: "16px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <AlertCircle size={15} />
                <span>{error}</span>
              </div>
            )}

            {/* Submit Run Button */}
            <button
              type="submit"
              disabled={loading || isScanning}
              style={{
                width: "100%",
                padding: "14px 20px",
                borderRadius: "12px",
                fontSize: "15px",
                fontWeight: 700,
                color: "#ffffff",
                background: "linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)",
                border: "none",
                cursor: loading || isScanning ? "not-allowed" : "pointer",
                boxShadow: `0 6px 20px ${cyan}44`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "10px",
                opacity: loading || isScanning ? 0.7 : 1,
              }}
            >
              {loading || isScanning ? (
                <>
                  <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />
                  <span>Auditing Repository AST &amp; Constructing ERCG…</span>
                </>
              ) : (
                <>
                  <Play size={16} fill="#ffffff" />
                  <span>Run TraceGuard Audit</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
