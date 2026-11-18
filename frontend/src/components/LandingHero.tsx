import React, { useEffect, useRef, useState } from "react";
import {
  Shield,
  Puzzle,
  Code2,
  ArrowRight,
  History,
  CheckCircle2,
  Lock,
  Network,
  Sparkles,
  Play,
  Terminal,
  Zap,
  Globe2,
  Layers,
} from "lucide-react";

interface LandingHeroProps {
  onStartAudit: () => void;
  onViewHistory: () => void;
  onExploreCapabilities: () => void;
  onQuickLaunchRepo?: (repoPath: string) => void;
  darkMode: boolean;
  totalAuditsCount?: number;
}

interface TopologyNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
  label: string;
  role: string;
  color: string;
  radius: number;
}

// ─── Interactive Full-Spectrum VIBGYOR Constellation Canvas ─────────────────
const SpectralConstellationCanvas: React.FC<{ darkMode: boolean }> = ({ darkMode }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = canvas.offsetWidth * dpr;
      canvas.height = canvas.offsetHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    // VIBGYOR Spectral Nodes
    const templates = [
      { label: "POST /checkout", role: "API Gateway", color: "#8b5cf6", radius: 5.5 }, // Violet
      { label: "AuthGuard.verify", role: "Zero-Trust", color: "#6366f1", radius: 5 },   // Indigo
      { label: "OrderController", role: "Domain Core", color: "#3b82f6", radius: 6 },   // Blue
      { label: "InventoryStream", role: "Async Event", color: "#06b6d4", radius: 4.5 }, // Cyan
      { label: "LedgerSQLModel", role: "Persistence", color: "#10b981", radius: 5.5 },  // Green
      { label: "AppConfig.env", role: "Config Guard", color: "#eab308", radius: 4.5 },   // Yellow
      { label: "CartService.route", role: "Route Handler", color: "#f97316", radius: 5.5 }, // Orange
      { label: "QueryBuilder.exec", role: "Data Access", color: "#f43f5e", radius: 6 },  // Red
    ];

    const w = () => canvas.offsetWidth;
    const h = () => canvas.offsetHeight;

    const nodes: TopologyNode[] = templates.map((t, i) => {
      const angle = (i / templates.length) * Math.PI * 2;
      const rx = Math.max(110, w() * 0.34);
      const ry = Math.max(90, h() * 0.34);
      return {
        x: w() / 2 + Math.cos(angle) * rx,
        y: h() / 2 + Math.sin(angle) * ry,
        vx: (Math.random() - 0.5) * (prefersReducedMotion ? 0 : 0.35),
        vy: (Math.random() - 0.5) * (prefersReducedMotion ? 0 : 0.35),
        label: t.label,
        role: t.role,
        color: t.color,
        radius: t.radius,
      };
    });

    const edges: Array<[number, number]> = [
      [0, 1],
      [0, 2],
      [1, 5],
      [2, 3],
      [2, 4],
      [2, 7],
      [3, 4],
      [6, 0],
      [7, 4],
      [1, 7],
    ];

    let phase = 0;

    const render = () => {
      const width = w();
      const height = h();
      ctx.clearRect(0, 0, width, height);
      phase += 0.014;

      // Draw soft concentric radar rings in the center
      const cx = width / 2;
      const cy = height / 2;
      [0.18, 0.3, 0.42].forEach((rFactor, idx) => {
        ctx.beginPath();
        ctx.arc(cx, cy, Math.min(width, height) * rFactor, 0, Math.PI * 2);
        ctx.strokeStyle = darkMode
          ? `rgba(139, 92, 246, ${0.08 - idx * 0.02})`
          : `rgba(99, 102, 241, ${0.09 - idx * 0.02})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      });

      if (!prefersReducedMotion) {
        for (const n of nodes) {
          n.x += n.vx;
          n.y += n.vy;
          const pad = 48;
          if (n.x < pad || n.x > width - pad) n.vx *= -1;
          if (n.y < pad || n.y > height - pad) n.vy *= -1;
        }
      }

      // Draw VIBGYOR gradient edges and traveling photons
      edges.forEach(([ai, bi], idx) => {
        const a = nodes[ai];
        const b = nodes[bi];
        if (!a || !b) return;

        const grad = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
        grad.addColorStop(0, `${a.color}55`);
        grad.addColorStop(1, `${b.color}55`);

        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.4;
        ctx.stroke();

        if (!prefersReducedMotion) {
          const t = (phase + idx * 0.17) % 1;
          const px = a.x + (b.x - a.x) * t;
          const py = a.y + (b.y - a.y) * t;

          ctx.beginPath();
          ctx.arc(px, py, 2.8, 0, Math.PI * 2);
          ctx.fillStyle = a.color;
          ctx.fill();
        }
      });

      // Draw nodes with glowing haloes and floating labels
      nodes.forEach((n, idx) => {
        const pulse = Math.sin(phase * 2 + idx) * 2;

        // Outer halo
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.radius + 7 + pulse, 0, Math.PI * 2);
        ctx.fillStyle = `${n.color}22`;
        ctx.fill();

        // Core orb
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
        ctx.fillStyle = n.color;
        ctx.fill();

        // Crisp label pill
        ctx.font = "600 10.5px 'JetBrains Mono', monospace";
        ctx.fillStyle = darkMode ? "#e2e8f0" : "#1e293b";
        ctx.textAlign = "center";
        ctx.fillText(n.label, n.x, n.y + n.radius + 14);
      });

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
        width: "100%",
        height: "100%",
        display: "block",
      }}
    />
  );
};

export const LandingHero: React.FC<LandingHeroProps> = ({
  onStartAudit,
  onViewHistory,
  onExploreCapabilities,
  onQuickLaunchRepo,
  darkMode,
  totalAuditsCount = 0,
}) => {
  const capabilitiesRef = useRef<HTMLDivElement>(null);

  const textPrimary = darkMode ? "#f8fafc" : "#0f172a";
  const textSecondary = darkMode ? "#cbd5e1" : "#334155";
  const textMuted = darkMode ? "#94a3b8" : "#64748b";

  const quickSuites = [
    {
      label: "E-Commerce Fullstack",
      tag: "FastAPI · React · SQLite",
      path: "./benchmark_repos/repo1_ecommerce_fullstack",
      color: "#8b5cf6",
    },
    {
      label: "Polyglot Fintech",
      tag: "FastAPI · SQLAlchemy",
      path: "./benchmark_repos/repo3_polyglot_fintech",
      color: "#3b82f6",
    },
    {
      label: "Cloud Microservice",
      tag: "Python · AsyncIO · Docker",
      path: "./benchmark_repos/repo2_cloud_microservice",
      color: "#10b981",
    },
    {
      label: "Node.js Express API",
      tag: "Node.js · Express",
      path: "./benchmark_repos/repo6_node_express",
      color: "#f97316",
    },
  ];

  const capabilities = [
    {
      id: "sec",
      tintClass: "vib-tint-red",
      icon: <Shield size={22} color="#f43f5e" />,
      title: "Cross-File Security Taint Engine",
      tag: "Deterministic AST",
      accent: "#f43f5e",
      desc: "Tracks untrusted inputs across module boundaries to expose SQL injections, command execution sinks, hardcoded credentials, and unauthenticated admin routes.",
    },
    {
      id: "arch",
      tintClass: "vib-tint-violet",
      icon: <Network size={22} color="#8b5cf6" />,
      title: "2D & 3D Graph Architecture",
      tag: "NetworkX ERCG",
      accent: "#8b5cf6",
      desc: "Synthesizes an Evidence-linked Repository Consistency Graph mapping every route, controller, database model, and call edge in interactive space.",
    },
    {
      id: "neg",
      tintClass: "vib-tint-orange",
      icon: <Puzzle size={22} color="#f97316" />,
      title: "Negative-Space Absence Detection",
      tag: "Structural Gaps",
      accent: "#f97316",
      desc: "Discovers what should exist in your architecture but is missing: dangling frontend client calls, mock checkout stubs, and unfulfilled interfaces.",
    },
    {
      id: "eng",
      tintClass: "vib-tint-green",
      icon: <Code2 size={22} color="#10b981" />,
      title: "Engineering Hygiene & Slop Radar",
      tag: "Engineering Quality Analysis",
      accent: "#10b981",
      desc: "Eliminates blind exception swallowing, redundant wrapper functions, dead handlers, and leftover debug artifacts before they reach production.",
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
    <div style={{ display: "flex", flexDirection: "column", gap: "56px", padding: "12px 0 36px" }}>
      {/* ====================================================================
          1. SEAMLESS OPEN SPATIAL HERO (Zero Outer Box — Flows on Living Aurora)
         ==================================================================== */}
      <section
        className="hero-asymmetric-grid animate-reveal"
        style={{
          display: "grid",
          gridTemplateColumns: "1.15fr 0.85fr",
          gap: "clamp(28px, 4vw, 56px)",
          alignItems: "center",
          minHeight: "min(68vh, 640px)",
        }}
      >
        {/* Left Editorial Column */}
        <div>
          {/* Spectral Status Pill */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "10px",
              padding: "6px 16px",
              borderRadius: "9999px",
              background: darkMode
                ? "linear-gradient(90deg, rgba(139, 92, 246, 0.16), rgba(59, 130, 246, 0.14), rgba(16, 185, 129, 0.14))"
                : "linear-gradient(90deg, rgba(139, 92, 246, 0.12), rgba(59, 130, 246, 0.12), rgba(16, 185, 129, 0.12))",
              marginBottom: "24px",
            }}
          >
            <Sparkles size={14} color="#8b5cf6" />
            <span
              style={{
                fontSize: "11.5px",
                fontWeight: 800,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: darkMode ? "#c4b5fd" : "#5b21b6",
              }}
            >
              Architecture-Agnostic Repository Intelligence
            </span>
          </div>

          {/* Fluid Display Headline */}
          <h1
            style={{
              margin: "0 0 22px 0",
              fontSize: "clamp(36px, 5.4vw, 66px)",
              lineHeight: 1.06,
              fontWeight: 800,
              letterSpacing: "-0.04em",
              color: textPrimary,
            }}
          >
            <span style={{ display: "block", marginBottom: "6px" }}>
              Understand your codebase.
            </span>
            <span className="hero-gradient-title">Find what others miss.</span>
          </h1>

          {/* Editorial Lead Copy */}
          <p
            style={{
              margin: "0 0 32px 0",
              fontSize: "clamp(16px, 1.8vw, 19px)",
              lineHeight: 1.65,
              color: textSecondary,
              maxWidth: "640px",
              fontWeight: 400,
            }}
          >
            TraceGuard analyzes software repositories to uncover security vulnerabilities,
            missing implementations, architectural inconsistencies and hidden engineering
            debt — with evidence you can investigate.
          </p>

          {/* Primary Actions Row */}
          <div
            className="hero-actions-row"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "14px",
              flexWrap: "wrap",
              marginBottom: "34px",
            }}
          >
            <button onClick={onStartAudit} className="vibgyor-cta-btn">
              <Play size={16} fill="#ffffff" />
              <span>Open Audit Workspace</span>
              <ArrowRight size={17} />
            </button>

            <button
              onClick={handleScrollToCapabilities}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "14px 24px",
                borderRadius: "9999px",
                fontSize: "14.5px",
                fontWeight: 700,
                color: textPrimary,
                background: darkMode ? "rgba(255, 255, 255, 0.06)" : "rgba(15, 23, 42, 0.05)",
                border: "none",
                cursor: "pointer",
              }}
            >
              <Layers size={16} color="#3b82f6" />
              <span>Explore Architecture</span>
            </button>

            {totalAuditsCount > 0 && (
              <button
                onClick={onViewHistory}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "14px 22px",
                  borderRadius: "9999px",
                  fontSize: "14px",
                  fontWeight: 700,
                  color: textSecondary,
                  background: darkMode ? "rgba(249, 115, 22, 0.12)" : "rgba(249, 115, 22, 0.10)",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                <History size={15} color="#f97316" />
                <span>Audit History ({totalAuditsCount})</span>
              </button>
            )}
          </div>

          {/* Instant One-Click Benchmark Stream */}
          <div>
            <div
              style={{
                fontSize: "11px",
                fontWeight: 800,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: textMuted,
                marginBottom: "10px",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <Zap size={13} color="#eab308" />
              <span>Instant Target Mount — Jump Straight to Inspection</span>
            </div>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {quickSuites.map((s) => (
                <button
                  key={s.path}
                  onClick={() => {
                    if (onQuickLaunchRepo) {
                      onQuickLaunchRepo(s.path);
                    } else {
                      onStartAudit();
                    }
                  }}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "8px 14px",
                    borderRadius: "9999px",
                    background: darkMode
                      ? `radial-gradient(circle at 0% 50%, ${s.color}28 0%, rgba(255,255,255,0.04) 100%)`
                      : `radial-gradient(circle at 0% 50%, ${s.color}20 0%, rgba(15,23,42,0.04) 100%)`,
                    border: "none",
                    color: textPrimary,
                    fontSize: "12px",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  <span
                    style={{
                      width: "7px",
                      height: "7px",
                      borderRadius: "50%",
                      background: s.color,
                      boxShadow: `0 0 8px ${s.color}`,
                    }}
                  />
                  <span>{s.label}</span>
                  <span style={{ fontSize: "10.5px", color: textMuted, fontWeight: 500 }}>
                    {s.tag}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Live Interactive VIBGYOR Constellation Orb */}
        <div
          className="vibgyor-prism-surface"
          style={{
            height: "clamp(320px, 46vw, 470px)",
            borderRadius: "36px",
            position: "relative",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "20px",
          }}
        >
          {/* Top floating overlay pill inside visualizer */}
          <div
            style={{
              position: "relative",
              zIndex: 2,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              pointerEvents: "none",
            }}
          >
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "7px",
                padding: "5px 12px",
                borderRadius: "9999px",
                background: darkMode ? "rgba(4, 7, 17, 0.65)" : "rgba(255, 255, 255, 0.75)",
                backdropFilter: "blur(12px)",
                fontSize: "11px",
                fontWeight: 700,
                color: textPrimary,
              }}
            >
              <Globe2 size={13} color="#06b6d4" />
              <span>Graph Architecture · Illustrative ERCG Preview</span>
            </span>

            <span
              style={{
                padding: "4px 10px",
                borderRadius: "9999px",
                background: "rgba(16, 185, 129, 0.16)",
                color: "#10b981",
                fontSize: "10.5px",
                fontWeight: 800,
              }}
            >
              READ-ONLY SANDBOX
            </span>
          </div>

          {/* Interactive Canvas */}
          <div style={{ position: "absolute", inset: 0, zIndex: 1 }}>
            <SpectralConstellationCanvas darkMode={darkMode} />
          </div>

          {/* Bottom Spectrum Legend Ribbon */}
          <div
            style={{
              position: "relative",
              zIndex: 2,
              display: "flex",
              justifyContent: "center",
              gap: "12px",
              flexWrap: "wrap",
              padding: "8px 14px",
              borderRadius: "9999px",
              background: darkMode ? "rgba(4, 7, 17, 0.65)" : "rgba(255, 255, 255, 0.78)",
              backdropFilter: "blur(12px)",
              fontSize: "11px",
              fontWeight: 600,
              color: textSecondary,
              pointerEvents: "none",
            }}
          >
            {[
              { label: "Gateway", color: "#8b5cf6" },
              { label: "Controller", color: "#3b82f6" },
              { label: "Persistence", color: "#10b981" },
              { label: "Config", color: "#eab308" },
              { label: "Gap", color: "#f97316" },
              { label: "Taint Sink", color: "#f43f5e" },
            ].map((item) => (
              <span key={item.label} style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
                <span
                  style={{
                    width: "7px",
                    height: "7px",
                    borderRadius: "50%",
                    background: item.color,
                  }}
                />
                {item.label}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ====================================================================
          2. OPEN SPECTRAL TELEMETRY RIBBON (No Box — Pure Flowing Typography)
         ==================================================================== */}
      <section className="animate-reveal-delay-1" style={{ position: "relative", padding: "24px 0" }}>
        <div className="spectral-hairline" style={{ marginBottom: "28px" }} />

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
            gap: "24px",
            textAlign: "center",
          }}
        >
          {[
            {
              value: "9 Suites",
              label: "Polyglot Benchmark Architectures",
              sub: "FastAPI · React · Go · Express · AsyncIO",
              color: "#8b5cf6",
            },
            {
              value: "62 Checks",
              label: "Deterministic AST Verifications",
              sub: "Evidence-Linked Static Analysis",
              color: "#3b82f6",
            },
            {
              value: "4 Axes",
              label: "Weighted Integrity Dimensions",
              sub: "Security · Completeness · Quality · Hygiene",
              color: "#10b981",
            },
            {
              value: "2D + 3D",
              label: "Interactive Topology Engines",
              sub: "Real-Time Force & Three.js WebGL",
              color: "#f97316",
            },
          ].map((stat) => (
            <div key={stat.label} style={{ padding: "4px 12px" }}>
              <div
                style={{
                  fontSize: "clamp(28px, 3.5vw, 40px)",
                  fontWeight: 800,
                  letterSpacing: "-0.03em",
                  color: stat.color,
                  lineHeight: 1.1,
                  marginBottom: "6px",
                }}
              >
                {stat.value}
              </div>
              <div style={{ fontSize: "13.5px", fontWeight: 700, color: textPrimary }}>
                {stat.label}
              </div>
              <div style={{ fontSize: "11.5px", color: textMuted, marginTop: "2px" }}>
                {stat.sub}
              </div>
            </div>
          ))}
        </div>

        <div className="spectral-hairline" style={{ marginTop: "28px" }} />
      </section>

      {/* ====================================================================
          3. VIBGYOR PRISM INTELLIGENCE PILLARS (Light Rainbow Interior Lenses)
         ==================================================================== */}
      <section ref={capabilitiesRef} className="animate-reveal-delay-2">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            flexWrap: "wrap",
            gap: "16px",
            marginBottom: "28px",
          }}
        >
          <div>
            <div
              style={{
                fontSize: "11.5px",
                fontWeight: 800,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "#8b5cf6",
                marginBottom: "6px",
              }}
            >
              Four-Dimensional Inspection Spectrum
            </div>
            <h2
              style={{
                margin: 0,
                fontSize: "clamp(24px, 3.2vw, 34px)",
                fontWeight: 800,
                letterSpacing: "-0.03em",
                color: textPrimary,
              }}
            >
              Engineered to uncover what linters can’t see.
            </h2>
          </div>

          <button
            onClick={onStartAudit}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 20px",
              borderRadius: "9999px",
              background: darkMode ? "rgba(139, 92, 246, 0.14)" : "rgba(124, 58, 237, 0.10)",
              color: darkMode ? "#c4b5fd" : "#6d28d9",
              border: "none",
              fontSize: "13px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            <span>Configure Custom Audit</span>
            <ArrowRight size={15} />
          </button>
        </div>

        <div
          className="pillars-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(270px, 1fr))",
            gap: "20px",
          }}
        >
          {capabilities.map((c) => (
            <div
              key={c.id}
              onClick={onStartAudit}
              className={`vibgyor-prism-surface ${c.tintClass}`}
              style={{
                padding: "28px",
                borderRadius: "28px",
                cursor: "pointer",
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
                    marginBottom: "20px",
                  }}
                >
                  <div
                    style={{
                      width: "46px",
                      height: "46px",
                      borderRadius: "16px",
                      background: `${c.accent}20`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {c.icon}
                  </div>
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: 800,
                      padding: "4px 12px",
                      borderRadius: "9999px",
                      background: `${c.accent}18`,
                      color: c.accent,
                    }}
                  >
                    {c.tag}
                  </span>
                </div>

                <h3
                  style={{
                    fontSize: "18px",
                    fontWeight: 800,
                    color: textPrimary,
                    margin: "0 0 10px 0",
                    letterSpacing: "-0.02em",
                  }}
                >
                  {c.title}
                </h3>
                <p
                  style={{
                    fontSize: "13.5px",
                    color: textSecondary,
                    lineHeight: 1.6,
                    margin: 0,
                  }}
                >
                  {c.desc}
                </p>
              </div>

              <div
                style={{
                  marginTop: "22px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "12px",
                  fontWeight: 700,
                  color: c.accent,
                }}
              >
                <span>Inspect with this lens</span>
                <ArrowRight size={13} />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
