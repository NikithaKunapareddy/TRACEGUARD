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
  Layers,
  Terminal,
  Server,
  Database,
  Cpu,
  Check,
  Zap,
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
  const [selectedTag, setSelectedTag] = useState("ALL");
  const [hoveredBenchmarkId, setHoveredBenchmarkId] = useState<string | null>(null);

  // Enterprise cybersecurity color tokens
  const cyan = darkMode ? "#00F0FF" : "#0284C7";
  const cyanSoft = darkMode ? "#38BDF8" : "#0EA5E9";
  const purple = darkMode ? "#A855F7" : "#7C3AED";
  const emerald = darkMode ? "#10B981" : "#059669";
  const rose = darkMode ? "#F43F5E" : "#DC2626";
  const amber = darkMode ? "#F59E0B" : "#D97706";
  const blue = darkMode ? "#3B82F6" : "#2563EB";

  const textPrimary = darkMode ? "#F8FAFC" : "#0F172A";
  const textSecondary = darkMode ? "#94A3B8" : "#475569";
  const textMuted = darkMode ? "#64748B" : "#94A3B8";

  const panelBg = darkMode ? "#101A2B" : "#FFFFFF";
  const cardBg = darkMode ? "#111D30" : "#FFFFFF";
  const borderSubtle = darkMode ? "rgba(56, 189, 248, 0.12)" : "rgba(0, 0, 0, 0.08)";
  const borderHover = darkMode ? "rgba(56, 189, 248, 0.4)" : "rgba(2, 132, 199, 0.4)";

  // 4 Core Inspection Dimensions
  const inspectionDimensions = [
    {
      key: "security",
      label: "Security Vulnerabilities",
      badge: "Taint Analysis",
      desc: "Cross-file taint propagation, SQL injection, unprotected endpoints & secrets",
      icon: <ShieldAlert size={18} color={rose} />,
      color: rose,
      accentBg: darkMode ? "rgba(244, 63, 94, 0.12)" : "rgba(220, 38, 38, 0.08)",
      borderActive: darkMode ? "rgba(244, 63, 94, 0.45)" : "rgba(220, 38, 38, 0.35)",
    },
    {
      key: "gap",
      label: "Negative-Space Gaps",
      badge: "Structural Absence",
      desc: "Dangling frontend client calls, unbacked routes, mock checkout stubs",
      icon: <Puzzle size={18} color={amber} />,
      color: amber,
      accentBg: darkMode ? "rgba(245, 158, 11, 0.12)" : "rgba(217, 119, 6, 0.08)",
      borderActive: darkMode ? "rgba(245, 158, 11, 0.45)" : "rgba(217, 119, 6, 0.35)",
    },
    {
      key: "slop",
      label: "Code Slop & Redundancy",
      badge: "Quality & Debt",
      desc: "Duplicate logic, redundant functions, dead controller handlers",
      icon: <Code2 size={18} color={purple} />,
      color: purple,
      accentBg: darkMode ? "rgba(168, 85, 247, 0.12)" : "rgba(124, 58, 237, 0.08)",
      borderActive: darkMode ? "rgba(168, 85, 247, 0.45)" : "rgba(124, 58, 237, 0.35)",
    },
    {
      key: "loose_end",
      label: "Development Hygiene",
      badge: "Reliability",
      desc: "Blind exception suppression, leftover console logs, unanchored routes",
      icon: <Sparkles size={18} color={emerald} />,
      color: emerald,
      accentBg: darkMode ? "rgba(16, 185, 129, 0.12)" : "rgba(5, 150, 105, 0.08)",
      borderActive: darkMode ? "rgba(16, 185, 129, 0.45)" : "rgba(5, 150, 105, 0.35)",
    },
  ];

  const toggleCategory = (key: string) => {
    setCategories((prev) =>
      prev.includes(key) ? prev.filter((c) => c !== key) : [...prev, key]
    );
  };

  // Filter benchmarks by search and tag
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
      setError("Please provide or select a target repository filesystem path.");
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
      {/* ── Top Operations Command Bar ───────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "14px",
          marginBottom: "24px",
          padding: "12px 18px",
          borderRadius: "14px",
          background: darkMode ? "rgba(16, 26, 43, 0.75)" : "rgba(255, 255, 255, 0.9)",
          border: `1px solid ${borderSubtle}`,
          backdropFilter: "blur(14px)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button
            onClick={onBackToLanding}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "7px",
              padding: "7px 14px",
              borderRadius: "8px",
              fontSize: "12.5px",
              fontWeight: 700,
              color: textPrimary,
              background: darkMode ? "rgba(255, 255, 255, 0.06)" : "rgba(0, 0, 0, 0.05)",
              border: `1px solid ${borderSubtle}`,
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            <ArrowLeft size={15} />
            <span>PORTAL HOME</span>
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: textMuted }}>
            <span>OPERATIONS</span>
            <span>/</span>
            <span style={{ color: cyan, fontWeight: 700 }}>WORKSPACE</span>
          </div>
        </div>

        {/* Security & Sandbox Telemetry Pills */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "11px",
              fontWeight: 700,
              padding: "4px 10px",
              borderRadius: "9999px",
              background: darkMode ? "rgba(16, 185, 129, 0.1)" : "rgba(5, 150, 105, 0.08)",
              border: `1px solid ${emerald}33`,
              color: emerald,
            }}
          >
            <Lock size={12} />
            <span>STRICT READ-ONLY SANDBOX</span>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "11px",
              fontWeight: 700,
              padding: "4px 10px",
              borderRadius: "9999px",
              background: darkMode ? "rgba(0, 240, 255, 0.1)" : "rgba(2, 132, 199, 0.08)",
              border: `1px solid ${cyan}33`,
              color: cyan,
            }}
          >
            <Zap size={12} />
            <span>FASTAPI ENGINE CONNECTED</span>
          </div>
        </div>
      </div>

      {/* ── 2-Column Responsive Workspace Grid ──────────────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(440px, 1fr))",
          gap: "24px",
          alignItems: "start",
        }}
      >
        {/* ==================================================================== */}
        {/* Left Column: Repository Target Selection                            */}
        {/* ==================================================================== */}
        <div
          style={{
            background: panelBg,
            borderRadius: "18px",
            border: `1px solid ${borderSubtle}`,
            padding: "26px",
            boxShadow: darkMode ? "0 16px 40px rgba(0, 0, 0, 0.5)" : "0 8px 24px rgba(0, 0, 0, 0.06)",
          }}
        >
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "9px", marginBottom: "4px" }}>
                <Server size={18} color={cyan} />
                <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 800, color: textPrimary, letterSpacing: "-0.3px" }}>
                  Target Repository
                </h2>
              </div>
              <p style={{ margin: 0, fontSize: "13px", color: textSecondary }}>
                Select an architecture benchmark suite or mount a custom directory.
              </p>
            </div>
            <span
              style={{
                fontSize: "11px",
                fontWeight: 700,
                padding: "3px 9px",
                borderRadius: "9999px",
                background: `${cyan}18`,
                color: cyan,
                border: `1px solid ${cyan}33`,
              }}
            >
              {filteredBenchmarks.length} SUITES
            </span>
          </div>

          {/* Architecture Quick-Filter Chips */}
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "14px" }}>
            {["ALL", "POLYGLOT", "CLOUD", "FINTECH", "FULLSTACK", "GO", "NODE", "ENTERPRISE"].map((tag) => {
              const active = selectedTag === tag;
              return (
                <button
                  key={tag}
                  onClick={() => setSelectedTag(tag)}
                  style={{
                    padding: "4px 10px",
                    borderRadius: "6px",
                    fontSize: "11px",
                    fontWeight: active ? 800 : 600,
                    color: active ? "#FFFFFF" : textSecondary,
                    background: active
                      ? cyan
                      : darkMode
                      ? "rgba(255, 255, 255, 0.04)"
                      : "rgba(0, 0, 0, 0.04)",
                    border: active ? `1px solid ${cyan}` : `1px solid ${borderSubtle}`,
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  {tag}
                </button>
              );
            })}
          </div>

          {/* Search Benchmarks */}
          <div style={{ position: "relative", marginBottom: "16px" }}>
            <Search
              size={15}
              color={textMuted}
              style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)" }}
            />
            <input
              type="text"
              placeholder="Filter by technology or architecture (FastAPI, React, Go, Microservice)..."
              value={benchmarkSearch}
              onChange={(e) => setBenchmarkSearch(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 14px 10px 36px",
                borderRadius: "10px",
                background: darkMode ? "rgba(7, 11, 20, 0.7)" : "rgba(248, 250, 252, 0.9)",
                border: `1px solid ${borderSubtle}`,
                color: textPrimary,
                fontSize: "13px",
                outline: "none",
                fontFamily: "inherit",
              }}
            />
          </div>

          {/* Server Blade Repository Cards List */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "10px",
              maxHeight: "410px",
              overflowY: "auto",
              paddingRight: "6px",
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
                    position: "relative",
                    padding: "14px 16px 14px 20px",
                    borderRadius: "12px",
                    background: isSelected
                      ? darkMode
                        ? "linear-gradient(90deg, rgba(0, 240, 255, 0.12) 0%, rgba(17, 29, 48, 0.9) 100%)"
                        : "linear-gradient(90deg, rgba(2, 132, 199, 0.1) 0%, rgba(248, 250, 252, 0.95) 100%)"
                      : isHovered
                      ? darkMode
                        ? "#152238"
                        : "#F1F5F9"
                      : cardBg,
                    border: isSelected
                      ? `1.5px solid ${cyan}`
                      : isHovered
                      ? `1px solid ${borderHover}`
                      : `1px solid ${borderSubtle}`,
                    boxShadow: isSelected
                      ? `0 0 24px rgba(0, 240, 255, 0.22)`
                      : isHovered
                      ? "0 6px 20px rgba(0, 0, 0, 0.2)"
                      : "none",
                    transform: isHovered ? "translateY(-1.5px)" : "none",
                    cursor: "pointer",
                    transition: "all 0.16s ease",
                  }}
                >
                  {/* Left Active Accent Bar */}
                  {isSelected && (
                    <div
                      style={{
                        position: "absolute",
                        left: 0,
                        top: "12px",
                        bottom: "12px",
                        width: "3.5px",
                        borderRadius: "0 4px 4px 0",
                        background: cyan,
                        boxShadow: `0 0 10px ${cyan}`,
                      }}
                    />
                  )}

                  {/* Top: Name & Tag */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontWeight: 800, fontSize: "14px", color: isSelected ? cyan : textPrimary }}>
                        {b.name}
                      </span>
                      {isSelected && (
                        <span
                          style={{
                            fontSize: "10px",
                            fontWeight: 800,
                            padding: "1px 6px",
                            borderRadius: "4px",
                            background: cyan,
                            color: "#070B14",
                          }}
                        >
                          LOCKED
                        </span>
                      )}
                    </div>
                    <span
                      style={{
                        fontSize: "10.5px",
                        fontWeight: 700,
                        padding: "2px 8px",
                        borderRadius: "9999px",
                        background: isSelected ? `${cyan}25` : darkMode ? "rgba(255, 255, 255, 0.06)" : "rgba(0, 0, 0, 0.05)",
                        color: isSelected ? cyan : textSecondary,
                        border: `1px solid ${borderSubtle}`,
                      }}
                    >
                      {b.tag}
                    </span>
                  </div>

                  {/* Description */}
                  <div style={{ fontSize: "12px", color: textSecondary, marginBottom: "10px", lineHeight: 1.45 }}>
                    {b.description}
                  </div>

                  {/* Tech stack badges */}
                  <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                    {b.tech.map((t) => (
                      <span
                        key={t}
                        style={{
                          fontSize: "10.5px",
                          fontWeight: 600,
                          color: isSelected ? cyanSoft : textMuted,
                          padding: "2px 8px",
                          borderRadius: "4px",
                          background: darkMode ? "rgba(7, 11, 20, 0.6)" : "rgba(0, 0, 0, 0.04)",
                          border: `1px solid ${borderSubtle}`,
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

          {/* Custom Local Path Input */}
          <div
            style={{
              padding: "14px",
              borderRadius: "12px",
              background: darkMode ? "rgba(7, 11, 20, 0.7)" : "rgba(248, 250, 252, 0.9)",
              border: `1px solid ${borderSubtle}`,
            }}
          >
            <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", fontWeight: 700, color: textSecondary, marginBottom: "8px" }}>
              <Terminal size={14} color={cyan} />
              <span>Custom Local Filesystem Mount Path</span>
            </label>
            <input
              type="text"
              value={repoPath}
              onChange={(e) => setRepoPath(e.target.value)}
              placeholder="e.g. ./benchmark_repos/repo1_ecommerce_fullstack"
              style={{
                width: "100%",
                padding: "11px 14px",
                borderRadius: "8px",
                background: darkMode ? "#070B14" : "#FFFFFF",
                border: `1px solid ${borderSubtle}`,
                color: textPrimary,
                fontSize: "12.5px",
                fontFamily: "JetBrains Mono, monospace",
                outline: "none",
              }}
            />
          </div>
        </div>

        {/* ==================================================================== */}
        {/* Right Column: Audit Configuration Matrix & Execution                */}
        {/* ==================================================================== */}
        <div
          style={{
            background: panelBg,
            borderRadius: "18px",
            border: `1px solid ${borderSubtle}`,
            padding: "26px",
            boxShadow: darkMode ? "0 16px 40px rgba(0, 0, 0, 0.5)" : "0 8px 24px rgba(0, 0, 0, 0.06)",
          }}
        >
          {/* Header */}
          <div style={{ marginBottom: "20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "9px", marginBottom: "4px" }}>
              <Layers size={18} color={purple} />
              <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 800, color: textPrimary, letterSpacing: "-0.3px" }}>
                Inspection Matrix
              </h2>
            </div>
            <p style={{ margin: 0, fontSize: "13px", color: textSecondary }}>
              Configure analysis dimensions, sensitivity thresholds and state caching.
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            {/* 4 Interactive Dimension Tiles */}
            <div style={{ marginBottom: "22px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                <label style={{ fontSize: "12px", fontWeight: 700, color: textSecondary, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Analysis Dimensions ({categories.length === 0 ? "ALL 4 ACTIVE" : `${categories.length} SELECTED`})
                </label>
                {categories.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setCategories([])}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: cyan,
                      fontSize: "11px",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    RESET TO ALL
                  </button>
                )}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                {inspectionDimensions.map((dim) => {
                  const isChecked = categories.includes(dim.key);
                  const isAllMode = categories.length === 0;
                  const isActive = isChecked || isAllMode;

                  return (
                    <div
                      key={dim.key}
                      onClick={() => toggleCategory(dim.key)}
                      style={{
                        padding: "14px",
                        borderRadius: "12px",
                        background: isActive ? dim.accentBg : darkMode ? "rgba(7, 11, 20, 0.4)" : "rgba(0, 0, 0, 0.02)",
                        border: isActive ? `1.5px solid ${dim.borderActive}` : `1px solid ${borderSubtle}`,
                        cursor: "pointer",
                        transition: "all 0.16s ease",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          {dim.icon}
                          <span style={{ fontSize: "13px", fontWeight: 700, color: isActive ? textPrimary : textMuted }}>
                            {dim.label}
                          </span>
                        </div>
                        <span
                          style={{
                            fontSize: "10px",
                            fontWeight: 800,
                            padding: "1px 6px",
                            borderRadius: "4px",
                            background: isActive ? `${dim.color}25` : "transparent",
                            color: isActive ? dim.color : textMuted,
                            border: `1px solid ${dim.borderActive}`,
                          }}
                        >
                          {dim.badge}
                        </span>
                      </div>
                      <div style={{ fontSize: "11.5px", color: textSecondary, lineHeight: 1.4 }}>
                        {dim.desc}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Minimum Severity Selector */}
            <div style={{ marginBottom: "22px" }}>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: textSecondary, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>
                Detection Sensitivity Bounds
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "6px" }}>
                {[
                  { value: "", label: "ALL", sub: "Info → Crit", color: cyan },
                  { value: "low", label: "LOW+", sub: "Exclude Info", color: blue },
                  { value: "medium", label: "MED+", sub: "Med & Above", color: amber },
                  { value: "high", label: "HIGH+", sub: "High & Crit", color: "#F97316" },
                  { value: "critical", label: "CRIT", sub: "Critical Only", color: rose },
                ].map((s) => {
                  const active = minSeverity === s.value;
                  return (
                    <button
                      type="button"
                      key={s.label}
                      onClick={() => setMinSeverity(s.value)}
                      style={{
                        padding: "8px 6px",
                        borderRadius: "8px",
                        background: active ? `${s.color}25` : darkMode ? "rgba(7, 11, 20, 0.5)" : "rgba(0, 0, 0, 0.03)",
                        border: active ? `1.5px solid ${s.color}` : `1px solid ${borderSubtle}`,
                        color: active ? s.color : textSecondary,
                        cursor: "pointer",
                        textAlign: "center",
                        transition: "all 0.15s ease",
                      }}
                    >
                      <div style={{ fontSize: "11.5px", fontWeight: 800 }}>{s.label}</div>
                      <div style={{ fontSize: "9.5px", color: textMuted }}>{s.sub}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Incremental Auditing Engine Switch */}
            <div
              style={{
                marginBottom: "26px",
                padding: "14px 16px",
                borderRadius: "12px",
                background: darkMode ? "rgba(7, 11, 20, 0.6)" : "rgba(248, 250, 252, 0.9)",
                border: `1px solid ${borderSubtle}`,
              }}
            >
              <label style={{ display: "flex", alignItems: "center", gap: "12px", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={incremental}
                  onChange={(e) => setIncremental(e.target.checked)}
                  style={{ width: "18px", height: "18px", cursor: "pointer", accentColor: cyan }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "2px" }}>
                    <span style={{ fontSize: "13px", fontWeight: 700, color: textPrimary }}>
                      Change-Aware Incremental Auditing
                    </span>
                    <span
                      style={{
                        fontSize: "10px",
                        fontWeight: 700,
                        padding: "1px 6px",
                        borderRadius: "4px",
                        background: `${emerald}20`,
                        color: emerald,
                      }}
                    >
                      SQLITE ENGINE
                    </span>
                  </div>
                  <div style={{ fontSize: "11.5px", color: textMuted, lineHeight: 1.4 }}>
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

            {/* Cinematic Launch Action Button */}
            <button
              type="submit"
              disabled={loading || isScanning}
              style={{
                width: "100%",
                padding: "15px 22px",
                borderRadius: "12px",
                fontSize: "15px",
                fontWeight: 800,
                color: "#FFFFFF",
                background: darkMode
                  ? "linear-gradient(135deg, #00F0FF 0%, #0077B6 60%, #7209B7 100%)"
                  : "linear-gradient(135deg, #0284C7 0%, #2563EB 100%)",
                border: "none",
                cursor: loading || isScanning ? "not-allowed" : "pointer",
                boxShadow: `0 8px 28px ${cyan}55`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "10px",
                letterSpacing: "0.2px",
                opacity: loading || isScanning ? 0.75 : 1,
                transition: "all 0.18s ease",
              }}
            >
              {loading || isScanning ? (
                <>
                  <Loader2 size={19} style={{ animation: "spin 1s linear infinite" }} />
                  <span>PARSING AST &amp; TRAVERSING ERCG TOPOLOGY…</span>
                </>
              ) : (
                <>
                  <Play size={16} fill="#FFFFFF" />
                  <span>LAUNCH REPOSITORY INTEGRITY AUDIT</span>
                </>
              )}
            </button>
            <div style={{ textAlign: "center", marginTop: "10px", fontSize: "11px", color: textMuted }}>
              Target filesystem remains strictly read-only • Deterministic AST &amp; ERCG analysis
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
