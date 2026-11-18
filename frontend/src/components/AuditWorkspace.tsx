import React, { useState, useMemo } from "react";
import { traceguardApi, AuditRequest } from "../api/client";
import {
  ArrowLeft,
  Sparkles,
  Search,
  Play,
  Loader2,
  ShieldAlert,
  AlertCircle,
  Puzzle,
  Code2,
  Lock,
  Layers,
  Terminal,
  Server,
  Zap,
  Check,
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
  vibTint: string;
  vibAccent: string;
}

const BENCHMARKS: BenchmarkSuite[] = [
  {
    id: "repo1",
    name: "Fullstack E-Commerce",
    tag: "Polyglot",
    path: "./benchmark_repos/repo1_ecommerce_fullstack",
    description: "Complete fullstack e-commerce app with React frontend, Python API & SQLite store.",
    tech: ["Python", "FastAPI", "React", "SQLite"],
    mistakes: ["SQL Injection", "Missing DELETE /cart", "Mock Checkout Stub"],
    vibTint: "vib-tint-violet",
    vibAccent: "#8b5cf6",
  },
  {
    id: "repo2",
    name: "Cloud Microservice",
    tag: "Cloud",
    path: "./benchmark_repos/repo2_cloud_microservice",
    description: "Cloud-native microservice architecture with async messaging and event handlers.",
    tech: ["Python", "AsyncIO", "Docker"],
    mistakes: ["Command Injection", "Unimplemented Interface", "Missing Env Var"],
    vibTint: "vib-tint-indigo",
    vibAccent: "#6366f1",
  },
  {
    id: "repo3",
    name: "Polyglot Fintech Ledger",
    tag: "Fintech",
    path: "./benchmark_repos/repo3_polyglot_fintech",
    description: "Financial transaction ledger with high consistency and zero-trust security bounds.",
    tech: ["Python", "FastAPI", "SQLAlchemy"],
    mistakes: ["Hardcoded JWT Secret", "Missing Route", "Swallowed Exception"],
    vibTint: "vib-tint-blue",
    vibAccent: "#3b82f6",
  },
  {
    id: "repo4",
    name: "FastAPI + React SPA",
    tag: "Fullstack",
    path: "./benchmark_repos/repo4_fastapi_react",
    description: "Modern Single Page Application paired with typed FastAPI backend endpoints.",
    tech: ["Python", "FastAPI", "React", "TypeScript"],
    mistakes: ["Search SQLi", "Missing DELETE /tasks", "Unanchored Docs"],
    vibTint: "vib-tint-green",
    vibAccent: "#10b981",
  },
  {
    id: "repo5",
    name: "Headless Cloud API",
    tag: "API",
    path: "./benchmark_repos/repo5_fastapi_only",
    description: "Pure headless REST API service focusing on endpoint routing and data schemas.",
    tech: ["FastAPI", "Pydantic", "Python 3.11"],
    mistakes: ["Missing /analytics/users", "Unresolved TODO Stub"],
    vibTint: "vib-tint-yellow",
    vibAccent: "#eab308",
  },
  {
    id: "repo6",
    name: "Node.js Express Gateway",
    tag: "Node",
    path: "./benchmark_repos/repo6_node_express",
    description: "JavaScript Express server with middleware, JWT auth routes, and route handlers.",
    tech: ["Node.js", "Express", "JavaScript"],
    mistakes: ["Hardcoded JWT Secret", "Unprotected /admin/data", "Debug Logs"],
    vibTint: "vib-tint-orange",
    vibAccent: "#f97316",
  },
  {
    id: "repo7",
    name: "Async Queue Worker",
    tag: "Worker",
    path: "./benchmark_repos/repo7_python_worker",
    description: "Background queue worker with task pipelines, retry loops, and job handlers.",
    tech: ["Python", "Async", "Queues"],
    mistakes: ["Unconfigured Broker Env", "Swallowed Worker Exception"],
    vibTint: "vib-tint-red",
    vibAccent: "#f43f5e",
  },
  {
    id: "repo8",
    name: "Go Concurrent Service",
    tag: "Go",
    path: "./benchmark_repos/repo8_go_microservice",
    description: "Go microservice demonstrating implicit interface satisfaction and concurrent routines.",
    tech: ["Go", "Interfaces", "Goroutines"],
    mistakes: ["Unimplemented AuditNotifier", "Unconfigured Port"],
    vibTint: "vib-tint-violet",
    vibAccent: "#8b5cf6",
  },
  {
    id: "repo9",
    name: "Modular Domain Monolith",
    tag: "Enterprise",
    path: "./benchmark_repos/repo9_python_monolith",
    description: "Multi-domain modular monolith with domain layers and clean architecture boundaries.",
    tech: ["Python", "Clean Arch", "Domain Models"],
    mistakes: ["Empty Stub cancel_order", "Pass Implementation"],
    vibTint: "vib-tint-blue",
    vibAccent: "#3b82f6",
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
  const [selectedTag, setSelectedTag] = useState("ALL");

  const textPrimary = darkMode ? "#f8fafc" : "#0f172a";
  const textSecondary = darkMode ? "#cbd5e1" : "#334155";
  const textMuted = darkMode ? "#94a3b8" : "#64748b";

  const inspectionDimensions = [
    {
      key: "security",
      label: "Security Taint & Sinks",
      badge: "40% Weight",
      desc: "Cross-file taint propagation, SQLi, command injection & exposed secrets",
      icon: <ShieldAlert size={18} color="#f43f5e" />,
      color: "#f43f5e",
      tintClass: "vib-tint-red",
    },
    {
      key: "gap",
      label: "Negative-Space Gaps",
      badge: "30% Weight",
      desc: "Dangling client invocations, missing backend routes & mock checkout stubs",
      icon: <Puzzle size={18} color="#f97316" />,
      color: "#f97316",
      tintClass: "vib-tint-orange",
    },
    {
      key: "slop",
      label: "Code Slop & Redundancy",
      badge: "20% Weight",
      desc: "Duplicate logic, dead controller handlers & redundant wrapper abstractions",
      icon: <Code2 size={18} color="#8b5cf6" />,
      color: "#8b5cf6",
      tintClass: "vib-tint-violet",
    },
    {
      key: "loose_end",
      label: "Development Hygiene",
      badge: "10% Weight",
      desc: "Blind exception swallowing, leftover debug logs & unanchored contracts",
      icon: <Sparkles size={18} color="#10b981" />,
      color: "#10b981",
      tintClass: "vib-tint-green",
    },
  ];

  const toggleCategory = (key: string) => {
    setCategories((prev) =>
      prev.includes(key) ? prev.filter((c) => c !== key) : [...prev, key]
    );
  };

  const filteredBenchmarks = useMemo(() => {
    return BENCHMARKS.filter((b) => {
      const matchesTag =
        selectedTag === "ALL" ||
        b.tag.toUpperCase() === selectedTag ||
        b.tech.some((t) => t.toUpperCase().includes(selectedTag));

      const q = benchmarkSearch.trim().toLowerCase();
      const matchesSearch =
        !q ||
        b.name.toLowerCase().includes(q) ||
        b.path.toLowerCase().includes(q) ||
        b.description.toLowerCase().includes(q) ||
        b.tech.some((t) => t.toLowerCase().includes(q));

      return matchesTag && matchesSearch;
    });
  }, [benchmarkSearch, selectedTag]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoPath.trim()) {
      setError("Please select or enter a target repository filesystem path.");
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
    <div style={{ display: "flex", flexDirection: "column", gap: "36px", paddingBottom: "40px" }}>
      {/* ====================================================================
          1. OPEN STUDIO HEADER STREAM (Zero Box — Flows Directly on Canvas)
         ==================================================================== */}
      <section className="animate-reveal">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            flexWrap: "wrap",
            gap: "18px",
            marginBottom: "20px",
          }}
        >
          <div>
            <button
              onClick={onBackToLanding}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "7px",
                padding: "6px 14px",
                borderRadius: "9999px",
                fontSize: "12px",
                fontWeight: 700,
                color: textSecondary,
                background: darkMode ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.05)",
                border: "none",
                cursor: "pointer",
                marginBottom: "14px",
              }}
            >
              <ArrowLeft size={14} />
              <span>Back to Overview</span>
            </button>

            <h1
              style={{
                margin: "0 0 8px 0",
                fontSize: "clamp(28px, 4vw, 44px)",
                fontWeight: 800,
                letterSpacing: "-0.035em",
                color: textPrimary,
                lineHeight: 1.1,
              }}
            >
              Repository <span className="hero-gradient-title">Audit Workspace</span>
            </h1>
            <p style={{ margin: 0, fontSize: "15px", color: textSecondary }}>
              Mount a polyglot benchmark suite or local repository path and tune your inspection lenses.
            </p>
          </div>

          {/* Floating Telemetry Badges */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "11.5px",
                fontWeight: 700,
                padding: "6px 14px",
                borderRadius: "9999px",
                background: "rgba(16, 185, 129, 0.14)",
                color: "#10b981",
              }}
            >
              <Lock size={13} />
              <span>Strict Read-Only Sandbox</span>
            </span>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "11.5px",
                fontWeight: 700,
                padding: "6px 14px",
                borderRadius: "9999px",
                background: "rgba(139, 92, 246, 0.14)",
                color: "#8b5cf6",
              }}
            >
              <Zap size={13} />
              <span>Deterministic AST + ERCG</span>
            </span>
          </div>
        </div>

        <div className="spectral-hairline" />
      </section>

      {/* ====================================================================
          2. UNIFIED LAUNCHCOMMAND & MOUNT RIBBON (Floating Prism Pill Bar)
         ==================================================================== */}
      <form onSubmit={handleSubmit} className="animate-reveal-delay-1" style={{ display: "flex", flexDirection: "column", gap: "36px" }}>
        <div
          className="vibgyor-prism-surface"
          style={{
            padding: "22px 26px",
            borderRadius: "30px",
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "16px",
          }}
        >
          <div style={{ flex: "1 1 320px" }}>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontSize: "11.5px",
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "#8b5cf6",
                marginBottom: "8px",
              }}
            >
              <Terminal size={14} />
              <span>Active Repository Mount Path</span>
            </label>
            <input
              type="text"
              value={repoPath}
              onChange={(e) => setRepoPath(e.target.value)}
              placeholder="./benchmark_repos/repo1_ecommerce_fullstack"
              style={{
                width: "100%",
                padding: "13px 18px",
                borderRadius: "9999px",
                background: darkMode ? "rgba(4, 7, 17, 0.65)" : "rgba(255, 255, 255, 0.85)",
                border: "1px solid var(--hairline-strong)",
                color: textPrimary,
                fontSize: "13.5px",
                fontFamily: "JetBrains Mono, monospace",
                outline: "none",
              }}
            />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "14px", flexWrap: "wrap" }}>
            <button
              type="submit"
              disabled={loading || isScanning}
              className="vibgyor-cta-btn"
              style={{ padding: "15px 34px", fontSize: "15px" }}
            >
              {loading || isScanning ? (
                <>
                  <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />
                  <span>Traversing AST &amp; ERCG…</span>
                </>
              ) : (
                <>
                  <Play size={16} fill="#ffffff" />
                  <span>Launch Integrity Audit</span>
                </>
              )}
            </button>
          </div>
        </div>

        {error && (
          <div
            className="vibgyor-prism-surface vib-tint-red"
            style={{
              padding: "14px 20px",
              borderRadius: "20px",
              color: "#f43f5e",
              fontSize: "13px",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <AlertCircle size={17} />
            <span>{error}</span>
          </div>
        )}

        {/* ====================================================================
            3. BENCHMARK ARCHITECTURE STREAM (VIBGYOR Prism Lenses — Non-Boxy)
           ==================================================================== */}
        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "14px",
              marginBottom: "18px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <Server size={18} color="#3b82f6" />
              <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 800, color: textPrimary }}>
                Benchmark Architecture Stream
              </h2>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 800,
                  padding: "3px 10px",
                  borderRadius: "9999px",
                  background: "rgba(59, 130, 246, 0.15)",
                  color: "#3b82f6",
                }}
              >
                {filteredBenchmarks.length} Suites
              </span>
            </div>

            {/* Search + Tag Pills */}
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              <div style={{ position: "relative", minWidth: "230px" }}>
                <Search
                  size={14}
                  color={textMuted}
                  style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)" }}
                />
                <input
                  type="text"
                  placeholder="Filter suites by stack…"
                  value={benchmarkSearch}
                  onChange={(e) => setBenchmarkSearch(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 14px 8px 36px",
                    borderRadius: "9999px",
                    background: darkMode ? "rgba(255,255,255,0.05)" : "rgba(15,23,42,0.05)",
                    border: "none",
                    color: textPrimary,
                    fontSize: "12.5px",
                    outline: "none",
                  }}
                />
              </div>

              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                {["ALL", "POLYGLOT", "CLOUD", "FINTECH", "FULLSTACK", "GO", "NODE"].map((tag) => {
                  const active = selectedTag === tag;
                  return (
                    <button
                      type="button"
                      key={tag}
                      onClick={() => setSelectedTag(tag)}
                      style={{
                        padding: "6px 12px",
                        borderRadius: "9999px",
                        fontSize: "11px",
                        fontWeight: active ? 800 : 600,
                        color: active ? "#ffffff" : textSecondary,
                        background: active
                          ? "linear-gradient(135deg, #8b5cf6, #3b82f6)"
                          : darkMode
                          ? "rgba(255, 255, 255, 0.05)"
                          : "rgba(15, 23, 42, 0.05)",
                        border: "none",
                        cursor: "pointer",
                      }}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Flowing Responsive Prism Grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 310px), 1fr))",
              gap: "16px",
            }}
          >
            {filteredBenchmarks.map((b) => {
              const isSelected = repoPath === b.path;
              return (
                <div
                  key={b.id}
                  onClick={() => setRepoPath(b.path)}
                  className={`vibgyor-prism-surface ${b.vibTint}`}
                  style={{
                    padding: "22px",
                    borderRadius: "26px",
                    cursor: "pointer",
                    border: isSelected
                      ? `2px solid ${b.vibAccent}`
                      : "1px solid var(--hairline)",
                    boxShadow: isSelected
                      ? `0 16px 38px -8px ${b.vibAccent}55`
                      : undefined,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                  }}
                >
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
                          fontSize: "10.5px",
                          fontWeight: 800,
                          padding: "3px 10px",
                          borderRadius: "9999px",
                          background: `${b.vibAccent}22`,
                          color: b.vibAccent,
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                        }}
                      >
                        {b.tag}
                      </span>

                      {isSelected && (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            fontSize: "10.5px",
                            fontWeight: 800,
                            padding: "3px 10px",
                            borderRadius: "9999px",
                            background: b.vibAccent,
                            color: "#ffffff",
                          }}
                        >
                          <Check size={11} />
                          <span>MOUNTED</span>
                        </span>
                      )}
                    </div>

                    <h3
                      style={{
                        margin: "0 0 6px 0",
                        fontSize: "16.5px",
                        fontWeight: 800,
                        color: textPrimary,
                        letterSpacing: "-0.02em",
                      }}
                    >
                      {b.name}
                    </h3>

                    <p
                      style={{
                        margin: "0 0 14px 0",
                        fontSize: "12.5px",
                        color: textSecondary,
                        lineHeight: 1.5,
                      }}
                    >
                      {b.description}
                    </p>
                  </div>

                  <div>
                    {/* Tech Stack Pills */}
                    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "10px" }}>
                      {b.tech.map((t) => (
                        <span
                          key={t}
                          style={{
                            fontSize: "10.5px",
                            fontWeight: 700,
                            padding: "2px 9px",
                            borderRadius: "9999px",
                            background: darkMode ? "rgba(255,255,255,0.07)" : "rgba(15,23,42,0.06)",
                            color: textPrimary,
                          }}
                        >
                          {t}
                        </span>
                      ))}
                    </div>

                    {/* Seeded Anomalies Preview */}
                    <div style={{ display: "flex", gap: "5px", flexWrap: "wrap" }}>
                      {b.mistakes.map((m) => (
                        <span
                          key={m}
                          style={{
                            fontSize: "10px",
                            fontWeight: 600,
                            color: b.vibAccent,
                            opacity: 0.9,
                          }}
                        >
                          • {m}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ====================================================================
            4. INSPECTION LENSES & SENSITIVITY EQUALIZER (Open Flowing Stream)
           ==================================================================== */}
        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "12px",
              marginBottom: "16px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <Layers size={18} color="#8b5cf6" />
              <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 800, color: textPrimary }}>
                Inspection Lenses &amp; Sensitivity
              </h2>
              <span style={{ fontSize: "12px", color: textMuted, fontWeight: 600 }}>
                ({categories.length === 0 ? "All 4 Lenses Active" : `${categories.length} Selected`})
              </span>
            </div>

            {categories.length > 0 && (
              <button
                type="button"
                onClick={() => setCategories([])}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#8b5cf6",
                  fontSize: "12px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Enable All 4 Lenses
              </button>
            )}
          </div>

          {/* 4 VIBGYOR Inspection Lenses */}
          <div
            className="categories-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
              gap: "16px",
              marginBottom: "24px",
            }}
          >
            {inspectionDimensions.map((dim) => {
              const isChecked = categories.includes(dim.key);
              const isAllMode = categories.length === 0;
              const isActive = isChecked || isAllMode;

              return (
                <div
                  key={dim.key}
                  onClick={() => toggleCategory(dim.key)}
                  className={`vibgyor-prism-surface ${dim.tintClass}`}
                  style={{
                    padding: "20px",
                    borderRadius: "24px",
                    cursor: "pointer",
                    opacity: isActive ? 1 : 0.48,
                    border: isActive ? `1.5px solid ${dim.color}66` : "1px solid var(--hairline)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "10px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      {dim.icon}
                      <span style={{ fontSize: "14px", fontWeight: 800, color: textPrimary }}>
                        {dim.label}
                      </span>
                    </div>
                    <span
                      style={{
                        fontSize: "10px",
                        fontWeight: 800,
                        padding: "2px 8px",
                        borderRadius: "9999px",
                        background: `${dim.color}22`,
                        color: dim.color,
                      }}
                    >
                      {dim.badge}
                    </span>
                  </div>
                  <div style={{ fontSize: "12px", color: textSecondary, lineHeight: 1.5 }}>
                    {dim.desc}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Sensitivity Equalizer + Incremental Toggle Bar */}
          <div
            className="vibgyor-prism-surface"
            style={{
              padding: "20px 26px",
              borderRadius: "26px",
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "20px",
            }}
          >
            {/* Sensitivity Pills */}
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              <span
                style={{
                  fontSize: "11.5px",
                  fontWeight: 800,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  color: textMuted,
                  marginRight: "4px",
                }}
              >
                Sensitivity Floor:
              </span>
              {[
                { value: "", label: "All Spectrum", color: "#8b5cf6" },
                { value: "low", label: "Low+", color: "#3b82f6" },
                { value: "medium", label: "Medium+", color: "#eab308" },
                { value: "high", label: "High+", color: "#f97316" },
                { value: "critical", label: "Critical Only", color: "#f43f5e" },
              ].map((s) => {
                const active = minSeverity === s.value;
                return (
                  <button
                    type="button"
                    key={s.label}
                    onClick={() => setMinSeverity(s.value)}
                    style={{
                      padding: "7px 14px",
                      borderRadius: "9999px",
                      background: active
                        ? s.color
                        : darkMode
                        ? "rgba(255,255,255,0.05)"
                        : "rgba(15,23,42,0.05)",
                      color: active ? "#ffffff" : textSecondary,
                      border: "none",
                      fontSize: "12px",
                      fontWeight: active ? 800 : 600,
                      cursor: "pointer",
                    }}
                  >
                    {s.label}
                  </button>
                );
              })}
            </div>

            {/* Incremental SQLite Switch */}
            <label
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "10px",
                cursor: "pointer",
                fontSize: "13px",
                fontWeight: 700,
                color: textPrimary,
              }}
            >
              <input
                type="checkbox"
                checked={incremental}
                onChange={(e) => setIncremental(e.target.checked)}
                style={{ width: "17px", height: "17px", accentColor: "#10b981", cursor: "pointer" }}
              />
              <span>Change-Aware Incremental SQLite Tracking</span>
            </label>
          </div>
        </div>
      </form>
    </div>
  );
};
