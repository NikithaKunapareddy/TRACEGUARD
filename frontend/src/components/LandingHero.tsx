import React, { useEffect, useRef, useState } from "react";
import {
  Shield,
  Layers,
  Puzzle,
  Code2,
  ArrowRight,
  History,
  CheckCircle2,
  Lock,
  GitBranch,
  Network,
  Cpu,
  BarChart3,
  ExternalLink,
  ChevronRight,
} from "lucide-react";

interface LandingHeroProps {
  onStartAudit: () => void;
  onViewHistory: () => void;
  onExploreCapabilities: () => void;
  darkMode: boolean;
  totalAuditsCount?: number;
}

// ─── Topological Repository Intelligence Visualizer Canvas ───────────────────
interface TopologyNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
  label: string;
  type: "endpoint" | "controller" | "model" | "security" | "config";
  color: string;
}

const RepositoryTopologyCanvas: React.FC<{ darkMode: boolean }> = ({ darkMode }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Check prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();

    // Semantic architecture graph nodes
    const nodeTemplates: Array<{ label: string; type: TopologyNode["type"]; color: string }> = [
      { label: "POST /checkout", type: "endpoint", color: darkMode ? "#00F0FF" : "#0284C7" },
      { label: "GET /inventory", type: "endpoint", color: darkMode ? "#38BDF8" : "#0EA5E9" },
      { label: "DELETE /admin", type: "security", color: darkMode ? "#F43F5E" : "#DC2626" },
      { label: "OrderService", type: "controller", color: darkMode ? "#A855F7" : "#7C3AED" },
      { label: "AuthGuard", type: "security", color: darkMode ? "#F43F5E" : "#DC2626" },
      { label: "DatabasePool", type: "model", color: darkMode ? "#10B981" : "#059669" },
      { label: "PaymentLedger", type: "model", color: darkMode ? "#10B981" : "#059669" },
      { label: "JWT_SECRET", type: "config", color: darkMode ? "#F59E0B" : "#D97706" },
      { label: "AuditSink", type: "controller", color: darkMode ? "#8B5CF6" : "#6D28D9" },
      { label: "UserSession", type: "model", color: darkMode ? "#10B981" : "#059669" },
    ];

    const nodes: TopologyNode[] = nodeTemplates.map((t, i) => {
      const angle = (i / nodeTemplates.length) * Math.PI * 2;
      const radiusX = canvas.width * 0.38;
      const radiusY = canvas.height * 0.36;
      return {
        x: canvas.width / 2 + Math.cos(angle) * radiusX + (Math.random() - 0.5) * 40,
        y: canvas.height / 2 + Math.sin(angle) * radiusY + (Math.random() - 0.5) * 30,
        vx: (Math.random() - 0.5) * (prefersReducedMotion ? 0 : 0.25),
        vy: (Math.random() - 0.5) * (prefersReducedMotion ? 0 : 0.25),
        label: t.label,
        type: t.type,
        color: t.color,
      };
    });

    // Edges linking related components
    const links: Array<[number, number]> = [
      [0, 3], // POST /checkout -> OrderService
      [1, 3], // GET /inventory -> OrderService
      [2, 4], // DELETE /admin -> AuthGuard
      [3, 5], // OrderService -> DatabasePool
      [3, 6], // OrderService -> PaymentLedger
      [4, 8], // AuthGuard -> AuditSink
      [7, 4], // JWT_SECRET -> AuthGuard
      [5, 9], // DatabasePool -> UserSession
      [8, 5], // AuditSink -> DatabasePool
    ];

    let pulseTime = 0;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      pulseTime += 0.015;

      // Update positions
      if (!prefersReducedMotion) {
        for (const n of nodes) {
          n.x += n.vx;
          n.y += n.vy;
          const pad = 40;
          if (n.x < pad || n.x > canvas.width - pad) n.vx *= -1;
          if (n.y < pad || n.y > canvas.height - pad) n.vy *= -1;
        }
      }

      // Draw edges with subtle animated pulse
      for (let i = 0; i < links.length; i++) {
        const [aIdx, bIdx] = links[i];
        const a = nodes[aIdx];
        const b = nodes[bIdx];
        if (!a || !b) continue;

        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.strokeStyle = darkMode ? "rgba(56, 189, 248, 0.12)" : "rgba(15, 23, 42, 0.08)";
        ctx.lineWidth = 1;
        ctx.stroke();

        // Traveling dataflow pulse
        if (!prefersReducedMotion) {
          const t = (pulseTime + i * 0.22) % 1;
          const px = a.x + (b.x - a.x) * t;
          const py = a.y + (b.y - a.y) * t;

          ctx.beginPath();
          ctx.arc(px, py, 2, 0, Math.PI * 2);
          ctx.fillStyle = a.color;
          ctx.globalAlpha = 0.65;
          ctx.fill();
          ctx.globalAlpha = 1.0;
        }
      }

      // Draw nodes
      for (const n of nodes) {
        // Outer subtle halo
        ctx.beginPath();
        ctx.arc(n.x, n.y, 5, 0, Math.PI * 2);
        ctx.fillStyle = n.color;
        ctx.globalAlpha = darkMode ? 0.35 : 0.2;
        ctx.fill();
        ctx.globalAlpha = 1.0;

        // Core pip
        ctx.beginPath();
        ctx.arc(n.x, n.y, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = n.color;
        ctx.fill();
      }

      animRef.current = requestAnimationFrame(render);
    };

    animRef.current = requestAnimationFrame(render);

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    return () => {
      cancelAnimationFrame(animRef.current);
      ro.disconnect();
    };
  }, [darkMode]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 0,
        borderRadius: "20px",
        opacity: darkMode ? 0.8 : 0.5,
      }}
    />
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
export const LandingHero: React.FC<LandingHeroProps> = ({
  onStartAudit,
  onViewHistory,
  onExploreCapabilities,
  darkMode,
  totalAuditsCount = 0,
}) => {
  const [ctaHovered, setCtaHovered] = useState(false);
  const capabilitiesRef = useRef<HTMLDivElement>(null);

  // Exact executive color palette
  const cyan = darkMode ? "#00F0FF" : "#0284C7";
  const cyanSoft = darkMode ? "#38BDF8" : "#0EA5E9";
  const blue = darkMode ? "#3B82F6" : "#2563EB";
  const purple = darkMode ? "#A855F7" : "#7C3AED";
  const emerald = darkMode ? "#10B981" : "#059669";
  const amber = darkMode ? "#F59E0B" : "#D97706";
  const rose = darkMode ? "#F43F5E" : "#DC2626";

  const textPrimary = darkMode ? "#F8FAFC" : "#0F172A";
  const textSecondary = darkMode ? "#94A3B8" : "#475569";
  const textMuted = darkMode ? "#64748B" : "#94A3B8";

  const panelBg = darkMode ? "#101A2B" : "#FFFFFF";
  const cardBg = darkMode ? "#111D30" : "#FFFFFF";
  const borderSubtle = darkMode ? "rgba(56, 189, 248, 0.12)" : "rgba(0, 0, 0, 0.08)";
  const borderHover = darkMode ? "rgba(56, 189, 248, 0.35)" : "rgba(2, 132, 199, 0.35)";

  const capabilities = [
    {
      id: "sec",
      icon: <Shield size={18} color={cyanSoft} />,
      title: "Security Intelligence",
      tag: "Deterministic AST",
      color: cyanSoft,
      bg: darkMode ? "rgba(0, 240, 255, 0.08)" : "rgba(2, 132, 199, 0.06)",
      border: darkMode ? "rgba(0, 240, 255, 0.22)" : "rgba(2, 132, 199, 0.2)",
      desc: "Cross-file taint tracking, SQL injection detection, unprotected privileged routes and hardcoded secret isolation.",
    },
    {
      id: "arch",
      icon: <Network size={18} color={purple} />,
      title: "Architecture Intelligence",
      tag: "NetworkX ERCG",
      color: purple,
      bg: darkMode ? "rgba(168, 85, 247, 0.08)" : "rgba(124, 58, 237, 0.06)",
      border: darkMode ? "rgba(168, 85, 247, 0.22)" : "rgba(124, 58, 237, 0.2)",
      desc: "Evidence-linked Repository Consistency Graph indexing all symbols, call relations, dataflows and dependency topologies in 2D & 3D.",
    },
    {
      id: "neg",
      icon: <Puzzle size={18} color={rose} />,
      title: "Negative-Space Detection",
      tag: "Structural Absence",
      color: rose,
      bg: darkMode ? "rgba(244, 63, 94, 0.08)" : "rgba(220, 38, 38, 0.06)",
      border: darkMode ? "rgba(244, 63, 94, 0.22)" : "rgba(220, 38, 38, 0.2)",
      desc: "Discovers what should exist but is missing: dangling frontend client calls, mock checkout stubs and broken API contracts.",
    },
    {
      id: "eng",
      icon: <Code2 size={18} color={amber} />,
      title: "Engineering Quality",
      tag: "Hygiene & Debt",
      color: amber,
      bg: darkMode ? "rgba(245, 158, 11, 0.08)" : "rgba(217, 119, 6, 0.06)",
      border: darkMode ? "rgba(245, 158, 11, 0.22)" : "rgba(217, 119, 6, 0.2)",
      desc: "Identifies code slop, redundant functions, blind exception suppression and dead controller handlers before production merges.",
    },
  ];

  const handleScrollToCapabilities = () => {
    if (capabilitiesRef.current) {
      capabilitiesRef.current.scrollIntoView({ behavior: "smooth" });
    } else {
      onExploreCapabilities();
    }
  };

  return (
    <div style={{ padding: "10px 0 30px 0" }}>
      {/* ── Hero Container ─────────────────────────────────────────────────── */}
      <div
        style={{
          borderRadius: "20px",
          background: darkMode
            ? "linear-gradient(180deg, #0A1224 0%, #070B14 100%)"
            : "linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 100%)",
          border: `1px solid ${borderSubtle}`,
          position: "relative",
          overflow: "hidden",
          padding: "54px 36px 48px 36px",
          boxShadow: darkMode
            ? "0 20px 60px rgba(0, 0, 0, 0.75), inset 0 1px 0 rgba(255, 255, 255, 0.05)"
            : "0 10px 30px rgba(0, 0, 0, 0.06)",
          textAlign: "center",
          marginBottom: "32px",
        }}
      >
        {/* Subtle Ambient Topology Network Canvas (Behind Text) */}
        <RepositoryTopologyCanvas darkMode={darkMode} />

        {/* Hero Content (Clean, Z-Indexed Above Canvas) */}
        <div style={{ position: "relative", zIndex: 1, maxWidth: "860px", margin: "0 auto" }}>
          {/* Release Badge */}
          <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", marginBottom: "22px" }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "7px",
                padding: "5px 14px",
                borderRadius: "9999px",
                background: darkMode ? "rgba(0, 240, 255, 0.08)" : "rgba(2, 132, 199, 0.08)",
                border: darkMode ? "1px solid rgba(0, 240, 255, 0.28)" : "1px solid rgba(2, 132, 199, 0.25)",
                color: cyan,
                fontSize: "12px",
                fontWeight: 700,
                letterSpacing: "0.4px",
              }}
            >
              <span
                style={{
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  background: cyan,
                  boxShadow: `0 0 8px ${cyan}`,
                }}
              />
              ENTERPRISE REPOSITORY INTEGRITY AGENT v1.0.0
            </span>
          </div>

          {/* ── Headline: Guaranteed High-Contrast & Readable ───────────────── */}
          <h1
            style={{
              margin: "0 0 18px 0",
              fontSize: "clamp(34px, 5.2vw, 56px)",
              lineHeight: 1.14,
              fontWeight: 800,
              letterSpacing: "-0.035em",
            }}
          >
            <span
              style={{
                display: "block",
                color: textPrimary,
                marginBottom: "4px",
              }}
            >
              Understand your codebase.
            </span>
            <span
              style={{
                display: "inline-block",
                background: darkMode
                  ? "linear-gradient(135deg, #00F0FF 0%, #38BDF8 35%, #818CF8 75%, #A855F7 100%)"
                  : "linear-gradient(135deg, #0284C7 0%, #2563EB 50%, #7C3AED 100%)",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                WebkitTextFillColor: "transparent",
                color: cyan, // Critical fallback so text is ALWAYS legible if webkit clip is disabled
              }}
            >
              Expose what others miss.
            </span>
          </h1>

          {/* ── Supporting Copy ────────────────────────────────────────────── */}
          <p
            style={{
              margin: "0 auto 32px auto",
              fontSize: "17px",
              lineHeight: 1.6,
              color: textSecondary,
              maxWidth: "740px",
            }}
          >
            TraceGuard is an architecture-agnostic repository intelligence agent that discovers security
            vulnerabilities, missing implementations, architectural inconsistencies and hidden engineering debt.
          </p>

          {/* ── CTAs & Actions ─────────────────────────────────────────────── */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "14px",
              flexWrap: "wrap",
              marginBottom: "32px",
            }}
          >
            {/* Primary CTA */}
            <button
              onClick={onStartAudit}
              onMouseEnter={() => setCtaHovered(true)}
              onMouseLeave={() => setCtaHovered(false)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "10px",
                padding: "13px 30px",
                borderRadius: "12px",
                fontSize: "15px",
                fontWeight: 700,
                color: "#FFFFFF",
                background: darkMode
                  ? "linear-gradient(135deg, #00B4D8 0%, #0077B6 50%, #7209B7 100%)"
                  : "linear-gradient(135deg, #0284C7 0%, #2563EB 100%)",
                border: "none",
                cursor: "pointer",
                boxShadow: ctaHovered
                  ? `0 10px 28px ${cyan}66`
                  : `0 6px 20px ${cyan}44`,
                transform: ctaHovered ? "translateY(-1.5px)" : "none",
                transition: "all 0.18s ease",
              }}
            >
              <span>Launch Repository Audit</span>
              <ArrowRight size={17} />
            </button>

            {/* Secondary CTA */}
            <button
              onClick={handleScrollToCapabilities}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "13px 22px",
                borderRadius: "12px",
                fontSize: "14.5px",
                fontWeight: 600,
                color: textPrimary,
                background: darkMode ? "rgba(16, 26, 43, 0.75)" : "rgba(241, 245, 249, 0.9)",
                border: `1px solid ${borderSubtle}`,
                cursor: "pointer",
                transition: "all 0.18s ease",
              }}
            >
              <span>Explore Capabilities</span>
              <ChevronRight size={16} color={cyan} />
            </button>

            {/* Audit History Pill */}
            {totalAuditsCount > 0 && (
              <button
                onClick={onViewHistory}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "7px",
                  padding: "13px 20px",
                  borderRadius: "12px",
                  fontSize: "14px",
                  fontWeight: 600,
                  color: textSecondary,
                  background: darkMode ? "rgba(16, 26, 43, 0.5)" : "rgba(241, 245, 249, 0.7)",
                  border: `1px solid ${borderSubtle}`,
                  cursor: "pointer",
                  transition: "all 0.18s ease",
                }}
              >
                <History size={15} color={purple} />
                <span>Audit History ({totalAuditsCount})</span>
              </button>
            )}
          </div>

          {/* ── Verified Product Statistics Bar ────────────────────────────── */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: "14px",
              padding: "14px 18px",
              borderRadius: "14px",
              background: darkMode ? "rgba(7, 11, 20, 0.65)" : "rgba(248, 250, 252, 0.9)",
              border: `1px solid ${borderSubtle}`,
              marginBottom: "28px",
            }}
          >
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "20px", fontWeight: 800, color: cyan }}>9</div>
              <div style={{ fontSize: "11px", color: textMuted, fontWeight: 600, textTransform: "uppercase" }}>
                Benchmark Repositories
              </div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "20px", fontWeight: 800, color: emerald }}>62</div>
              <div style={{ fontSize: "11px", color: textMuted, fontWeight: 600, textTransform: "uppercase" }}>
                Passing Automated Tests
              </div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "20px", fontWeight: 800, color: purple }}>4</div>
              <div style={{ fontSize: "11px", color: textMuted, fontWeight: 600, textTransform: "uppercase" }}>
                Analysis Dimensions
              </div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "20px", fontWeight: 800, color: blue }}>7</div>
              <div style={{ fontSize: "11px", color: textMuted, fontWeight: 600, textTransform: "uppercase" }}>
                Dashboard Sections
              </div>
            </div>
          </div>

          {/* ── Trust Indicators ───────────────────────────────────────────── */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: "24px",
              flexWrap: "wrap",
              fontSize: "12px",
              color: textMuted,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <CheckCircle2 size={14} color={emerald} />
              <span>Static AST &amp; Tree-sitter Analysis</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <CheckCircle2 size={14} color={cyan} />
              <span>Evidence-Linked Repository Graph</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <Lock size={13} color={purple} />
              <span>Strict Read-Only Target Inspection</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Section: Refined 4 Core Intelligence Capabilities ───────────────── */}
      <div ref={capabilitiesRef} style={{ marginTop: "36px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "18px" }}>
          <div>
            <div style={{ fontSize: "11.5px", fontWeight: 800, color: cyan, textTransform: "uppercase", letterSpacing: "1px", marginBottom: "4px" }}>
              Platform Pillars
            </div>
            <h2 style={{ fontSize: "24px", fontWeight: 800, color: textPrimary, margin: 0 }}>
              Continuous Repository Integrity Intelligence
            </h2>
          </div>
          <button
            onClick={onStartAudit}
            style={{
              background: "transparent",
              border: "none",
              color: cyan,
              fontSize: "13px",
              fontWeight: 700,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            <span>Start Audit Workspace</span>
            <ArrowRight size={14} />
          </button>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "18px",
          }}
        >
          {capabilities.map((c) => (
            <div
              key={c.id}
              style={{
                borderRadius: "16px",
                background: cardBg,
                border: `1px solid ${borderSubtle}`,
                padding: "24px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                transition: "all 0.18s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = borderHover;
                e.currentTarget.style.transform = "translateY(-2px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = borderSubtle;
                e.currentTarget.style.transform = "none";
              }}
            >
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                  <div
                    style={{
                      width: "38px",
                      height: "38px",
                      borderRadius: "10px",
                      background: c.bg,
                      border: `1px solid ${c.border}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {c.icon}
                  </div>
                  <span
                    style={{
                      fontSize: "10.5px",
                      fontWeight: 700,
                      padding: "2px 8px",
                      borderRadius: "6px",
                      background: c.bg,
                      color: c.color,
                      border: `1px solid ${c.border}`,
                    }}
                  >
                    {c.tag}
                  </span>
                </div>

                <h3 style={{ fontSize: "16px", fontWeight: 700, color: textPrimary, margin: "0 0 8px 0" }}>
                  {c.title}
                </h3>
                <p style={{ fontSize: "13px", color: textSecondary, lineHeight: 1.55, margin: 0 }}>
                  {c.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
