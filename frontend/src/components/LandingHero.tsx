import React, { useEffect, useRef, useState } from "react";
import {
  Shield,
  Layers,
  Puzzle,
  Code2,
  ArrowRight,
  History,
  Sparkles,
  CheckCircle2,
} from "lucide-react";

interface LandingHeroProps {
  onStartAudit: () => void;
  onViewHistory: () => void;
  onExploreCapabilities: () => void;
  darkMode: boolean;
  totalAuditsCount?: number;
}

// ─── Particle types ────────────────────────────────────────────────────────────
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  color: string;
}

// ─── Particle Canvas ──────────────────────────────────────────────────────────
const ParticleCanvas: React.FC<{ darkMode: boolean }> = ({ darkMode }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const COLORS_DARK = ["#38bdf8", "#a855f7", "#10b981", "#818cf8", "#34d399"];
    const COLORS_LIGHT = ["#0284c7", "#7c3aed", "#059669", "#4f46e5", "#10b981"];
    const COLORS = darkMode ? COLORS_DARK : COLORS_LIGHT;
    const COUNT = 60;
    const CONNECT_DIST = 120;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();

    // Initialise particles
    particlesRef.current = Array.from({ length: COUNT }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      r: Math.random() * 2.2 + 1,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
    }));

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const pts = particlesRef.current;

      // Update positions
      for (const p of pts) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
      }

      // Draw connecting lines
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const dx = pts[i].x - pts[j].x;
          const dy = pts[i].y - pts[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < CONNECT_DIST) {
            const alpha = (1 - dist / CONNECT_DIST) * (darkMode ? 0.25 : 0.18);
            ctx.beginPath();
            ctx.moveTo(pts[i].x, pts[i].y);
            ctx.lineTo(pts[j].x, pts[j].y);
            ctx.strokeStyle = darkMode
              ? `rgba(148,163,184,${alpha})`
              : `rgba(71,85,105,${alpha})`;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
      }

      // Draw dots
      for (const p of pts) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.color + (darkMode ? "cc" : "aa");
        ctx.shadowBlur = darkMode ? 8 : 4;
        ctx.shadowColor = p.color;
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);

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
        borderRadius: "24px",
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
  totalAuditsCount,
}) => {
  const cyan = darkMode ? "#38bdf8" : "#0284c7";
  const purple = darkMode ? "#a855f7" : "#7c3aed";
  const emerald = darkMode ? "#10b981" : "#059669";
  const amber = darkMode ? "#f59e0b" : "#d97706";
  const textPrimary = darkMode ? "#f8fafc" : "#0f172a";
  const textSecondary = darkMode ? "#94a3b8" : "#475569";
  const textMuted = darkMode ? "#64748b" : "#94a3b8";

  // Card hover state
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  // CTA hover
  const [ctaHovered, setCtaHovered] = useState(false);

  const capabilities = [
    {
      icon: <Shield size={14} color={cyan} />,
      label: "Security Intelligence",
      bg: `${cyan}18`,
      border: `${cyan}33`,
      color: cyan,
      desc: "Cross-file taint tracking, SQL injection, unprotected endpoints & credential leakage.",
    },
    {
      icon: <Layers size={14} color={purple} />,
      label: "Architecture Intelligence",
      bg: `${purple}18`,
      border: `${purple}33`,
      color: purple,
      desc: "Evidence-linked Repository Consistency Graph (ERCG) with 3D WebGL dependency topology.",
    },
    {
      icon: <Puzzle size={14} color={emerald} />,
      label: "Negative-Space Detection",
      bg: `${emerald}18`,
      border: `${emerald}33`,
      color: emerald,
      desc: "Detects what should exist but is missing: dangling client calls & mock stub implementations.",
    },
    {
      icon: <Code2 size={14} color={amber} />,
      label: "Engineering Quality",
      bg: `${amber}18`,
      border: `${amber}33`,
      color: amber,
      desc: "Code slop, redundant functions, blind exception suppression & dead handler analysis.",
    },
  ];

  return (
    <div style={{ padding: "20px 0 40px 0" }}>
      {/* ── Keyframe styles ───────────────────────────────────────────────── */}
      <style>{`
        @keyframes float-pill {
          0%, 100% { transform: translateY(0); }
          50%       { transform: translateY(-4px); }
        }
        @keyframes card-in {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes shimmer {
          0%   { background-position: -200% 0; }
          100% { background-position:  200% 0; }
        }
        @keyframes drift {
          0%, 100% { transform: translate(0, 0); }
          50%       { transform: translate(20px, -15px); }
        }
        @keyframes drift2 {
          0%, 100% { transform: translate(0, 0); }
          50%       { transform: translate(-18px, 12px); }
        }
        @keyframes drift3 {
          0%, 100% { transform: translate(0, 0); }
          50%       { transform: translate(10px, 20px); }
        }
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.5; transform: scale(1.5); }
        }
        @keyframes hero-fade-in {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* ── Hero Container ─────────────────────────────────────────────────── */}
      <div
        style={{
          borderRadius: "24px",
          background: darkMode
            ? "linear-gradient(180deg, rgba(15,23,42,0.92) 0%, rgba(10,15,29,0.98) 100%)"
            : "linear-gradient(180deg, rgba(255,255,255,0.97) 0%, rgba(248,250,252,0.97) 100%)",
          border: darkMode
            ? "1px solid rgba(56,189,248,0.22)"
            : "1px solid rgba(0,0,0,0.09)",
          backdropFilter: "blur(24px)",
          padding: "54px 36px 44px 36px",
          position: "relative",
          overflow: "hidden",
          boxShadow: darkMode
            ? "0 20px 60px rgba(0,0,0,0.65), inset 0 1px 0 rgba(255,255,255,0.1)"
            : "0 10px 30px rgba(0,0,0,0.07)",
          textAlign: "center",
          marginBottom: "36px",
        }}
      >
        {/* Particle canvas */}
        <ParticleCanvas darkMode={darkMode} />

        {/* ── Animated glowing orbs ──────────────────────────────────────── */}
        {/* Orb 1 – cyan, top-left */}
        <div
          style={{
            position: "absolute",
            top: "-60px",
            left: "10%",
            width: "340px",
            height: "340px",
            borderRadius: "50%",
            background: darkMode
              ? "radial-gradient(circle, rgba(56,189,248,0.22) 0%, transparent 70%)"
              : "radial-gradient(circle, rgba(2,132,199,0.14) 0%, transparent 70%)",
            filter: "blur(32px)",
            pointerEvents: "none",
            animation: "drift 9s ease-in-out infinite",
            zIndex: 0,
          }}
        />
        {/* Orb 2 – purple, top-right */}
        <div
          style={{
            position: "absolute",
            top: "-40px",
            right: "8%",
            width: "300px",
            height: "300px",
            borderRadius: "50%",
            background: darkMode
              ? "radial-gradient(circle, rgba(168,85,247,0.2) 0%, transparent 70%)"
              : "radial-gradient(circle, rgba(124,58,237,0.12) 0%, transparent 70%)",
            filter: "blur(28px)",
            pointerEvents: "none",
            animation: "drift2 11s ease-in-out infinite",
            zIndex: 0,
          }}
        />
        {/* Orb 3 – emerald, bottom-center */}
        <div
          style={{
            position: "absolute",
            bottom: "-80px",
            left: "50%",
            transform: "translateX(-50%)",
            width: "360px",
            height: "240px",
            borderRadius: "50%",
            background: darkMode
              ? "radial-gradient(circle, rgba(16,185,129,0.15) 0%, transparent 70%)"
              : "radial-gradient(circle, rgba(5,150,105,0.1) 0%, transparent 70%)",
            filter: "blur(28px)",
            pointerEvents: "none",
            animation: "drift3 13s ease-in-out infinite",
            zIndex: 0,
          }}
        />

        {/* ── Content (above canvas & orbs) ─────────────────────────────── */}
        <div
          style={{
            maxWidth: "860px",
            margin: "0 auto",
            position: "relative",
            zIndex: 1,
            animation: "hero-fade-in 0.7s ease both",
          }}
        >
          {/* Capability pills */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "8px",
              justifyContent: "center",
              marginBottom: "24px",
            }}
          >
            {capabilities.map((c, i) => (
              <span
                key={c.label}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "6px 14px",
                  borderRadius: "9999px",
                  background: c.bg,
                  border: `1px solid ${c.border}`,
                  color: c.color,
                  fontSize: "12px",
                  fontWeight: 700,
                  letterSpacing: "0.2px",
                  animation: "float-pill 3s ease-in-out infinite",
                  animationDelay: `${i * 0.2}s`,
                }}
              >
                {c.icon}
                {c.label}
              </span>
            ))}
          </div>

          {/* Main Headline */}
          <h1
            style={{
              margin: "0 0 18px 0",
              fontSize: "44px",
              lineHeight: 1.15,
              fontWeight: 800,
              letterSpacing: "-1.2px",
              color: textPrimary,
            }}
          >
            Know what's broken before it reaches production.
          </h1>

          {/* Supporting Description */}
          <p
            style={{
              margin: "0 0 32px 0",
              fontSize: "17px",
              lineHeight: 1.6,
              color: textSecondary,
              maxWidth: "720px",
              marginLeft: "auto",
              marginRight: "auto",
            }}
          >
            An architecture-agnostic repository integrity agent that uncovers
            security vulnerabilities, missing implementations, architectural
            inconsistencies and hidden engineering debt.
          </p>

          {/* Call to Actions */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "16px",
              flexWrap: "wrap",
              marginBottom: "20px",
            }}
          >
            {/* Primary CTA – shimmer */}
            <button
              onClick={onStartAudit}
              onMouseEnter={() => setCtaHovered(true)}
              onMouseLeave={() => setCtaHovered(false)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "10px",
                padding: "14px 32px",
                borderRadius: "14px",
                fontSize: "16px",
                fontWeight: 700,
                color: "#ffffff",
                background:
                  "linear-gradient(90deg, #0284c7 0%, #38bdf8 40%, #a855f7 70%, #0284c7 100%)",
                backgroundSize: "200% 100%",
                border: "none",
                cursor: "pointer",
                boxShadow: ctaHovered
                  ? `0 8px 32px ${cyan}88`
                  : `0 6px 24px ${cyan}55`,
                animation: "shimmer 2.8s linear infinite",
                transform: ctaHovered ? "scale(1.04)" : "scale(1)",
                transition: "box-shadow 0.2s ease, transform 0.2s ease",
              }}
            >
              <span>Start a Repository Audit</span>
              <ArrowRight size={18} />
            </button>

            {/* View History */}
            <button
              onClick={onViewHistory}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "13px 24px",
                borderRadius: "14px",
                fontSize: "14px",
                fontWeight: 600,
                color: textPrimary,
                background: darkMode
                  ? "rgba(15,23,42,0.7)"
                  : "rgba(241,245,249,0.9)",
                border: darkMode
                  ? "1px solid rgba(255,255,255,0.12)"
                  : "1px solid rgba(0,0,0,0.12)",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              <History size={16} color={purple} />
              <span>Audit History</span>
              {totalAuditsCount !== undefined && totalAuditsCount > 0 && (
                <span
                  style={{
                    fontSize: "11px",
                    padding: "1px 7px",
                    borderRadius: "9999px",
                    background: `${purple}25`,
                    color: purple,
                    fontWeight: 700,
                  }}
                >
                  {totalAuditsCount}
                </span>
              )}
            </button>

            {/* Explore */}
            <button
              onClick={onExploreCapabilities}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "13px 20px",
                borderRadius: "14px",
                fontSize: "14px",
                fontWeight: 600,
                color: cyan,
                background: "transparent",
                border: "none",
                cursor: "pointer",
              }}
            >
              <Sparkles size={16} />
              <span>Explore Capabilities</span>
            </button>
          </div>

          {/* ── Stats counter row ─────────────────────────────────────── */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "20px",
              flexWrap: "wrap",
              marginBottom: "28px",
            }}
          >
            {[
              "57 Tests Passing",
              "9 Benchmark Repositories",
              "v1.0.0 Release",
            ].map((label, i) => (
              <span
                key={label}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "7px",
                  fontSize: "12px",
                  fontWeight: 600,
                  color: textSecondary,
                }}
              >
                <span
                  style={{
                    width: "7px",
                    height: "7px",
                    borderRadius: "50%",
                    background: emerald,
                    display: "inline-block",
                    animation: "pulse-dot 2s ease-in-out infinite",
                    animationDelay: `${i * 0.4}s`,
                    boxShadow: `0 0 6px ${emerald}`,
                  }}
                />
                {label}
              </span>
            ))}
          </div>

          {/* Trust indicator bar */}
          <div
            style={{
              paddingTop: "20px",
              borderTop: darkMode
                ? "1px solid rgba(255,255,255,0.07)"
                : "1px solid rgba(0,0,0,0.07)",
              fontSize: "12px",
              color: textMuted,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "24px",
              flexWrap: "wrap",
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <CheckCircle2 size={14} color={emerald} /> Static Tree-sitter &amp; AST Analysis
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <CheckCircle2 size={14} color={emerald} /> Evidence-Linked Graph Findings
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <CheckCircle2 size={14} color={emerald} /> Strict Read-Only Repository Inspection
            </span>
          </div>
        </div>
      </div>

      {/* ── 4 Feature Preview Cards ─────────────────────────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: "18px",
        }}
      >
        {capabilities.map((c, i) => {
          const isHovered = hoveredCard === c.label;
          return (
            <div
              key={c.label}
              onMouseEnter={() => setHoveredCard(c.label)}
              onMouseLeave={() => setHoveredCard(null)}
              style={{
                borderRadius: "16px",
                background: darkMode
                  ? "rgba(15,23,42,0.75)"
                  : "rgba(255,255,255,0.88)",
                border: isHovered
                  ? `1px solid ${c.color}66`
                  : darkMode
                  ? "1px solid rgba(255,255,255,0.07)"
                  : "1px solid rgba(0,0,0,0.07)",
                backdropFilter: "blur(16px)",
                padding: "24px",
                boxShadow: isHovered
                  ? darkMode
                    ? `0 8px 32px rgba(0,0,0,0.3), 0 0 0 1px ${c.color}44`
                    : `0 8px 24px rgba(0,0,0,0.1), 0 0 0 1px ${c.color}33`
                  : darkMode
                  ? "0 4px 20px rgba(0,0,0,0.2)"
                  : "0 2px 12px rgba(0,0,0,0.04)",
                transform: isHovered ? "scale(1.03)" : "scale(1)",
                transition:
                  "transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease",
                animation: "card-in 0.5s ease both",
                animationDelay: `${i * 0.1}s`,
                cursor: "default",
              }}
            >
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "10px",
                  background: c.bg,
                  border: `1px solid ${c.border}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "14px",
                  boxShadow: isHovered ? `0 0 12px ${c.color}55` : "none",
                  transition: "box-shadow 0.22s ease",
                }}
              >
                {c.icon}
              </div>
              <div
                style={{
                  fontSize: "15px",
                  fontWeight: 700,
                  color: textPrimary,
                  marginBottom: "8px",
                }}
              >
                {c.label}
              </div>
              <div
                style={{
                  fontSize: "13px",
                  lineHeight: 1.5,
                  color: textSecondary,
                }}
              >
                {c.desc}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
