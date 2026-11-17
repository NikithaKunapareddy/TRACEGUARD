import React from "react";
import { Shield, Activity, Terminal, Sparkles, CheckCircle2 } from "lucide-react";

interface CyberHeaderProps {
  serverHealth: boolean | null;
  onSelectPresetRepo: (path: string) => void;
  selectedRepo: string;
}

export const CyberHeader: React.FC<CyberHeaderProps> = ({
  serverHealth,
  onSelectPresetRepo,
  selectedRepo,
}) => {
  const presets = [
    { name: "⚡ Repo 1: Fullstack E-Commerce", path: "./benchmark_repos/repo1_ecommerce_fullstack" },
    { name: "☁️ Repo 2: Cloud Microservice", path: "./benchmark_repos/repo2_cloud_microservice" },
    { name: "🏦 Repo 3: Polyglot Fintech", path: "./benchmark_repos/repo3_polyglot_fintech" },
    { name: "📱 Repo 4: FastAPI + React", path: "./benchmark_repos/repo4_fastapi_react" },
    { name: "🚀 Repo 5: Cloud API Only", path: "./benchmark_repos/repo5_fastapi_only" },
    { name: "🟩 Repo 6: Node.js Express", path: "./benchmark_repos/repo6_node_express" },
    { name: "⚙️ Repo 7: Python Worker", path: "./benchmark_repos/repo7_python_worker" },
    { name: "🔷 Repo 8: Go Microservice", path: "./benchmark_repos/repo8_go_microservice" },
    { name: "🏛️ Repo 9: Python Monolith", path: "./benchmark_repos/repo9_python_monolith" },
  ];

  return (
    <header style={{ marginBottom: "28px" }}>
      {/* Top Brand Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "16px 20px",
          borderRadius: "16px",
          background: "rgba(15, 23, 42, 0.75)",
          backdropFilter: "blur(16px)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          marginBottom: "16px",
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "12px",
              background: "linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 0 20px rgba(56, 189, 248, 0.4)",
            }}
          >
            <Shield size={24} color="#ffffff" />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <h1
                style={{
                  margin: 0,
                  fontSize: "24px",
                  fontWeight: 800,
                  letterSpacing: "-0.5px",
                  background: "linear-gradient(90deg, #f8fafc 0%, #94a3b8 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                TraceGuard
              </h1>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  padding: "2px 8px",
                  borderRadius: "9999px",
                  background: "rgba(56, 189, 248, 0.15)",
                  color: "#38bdf8",
                  border: "1px solid rgba(56, 189, 248, 0.3)",
                  letterSpacing: "0.5px",
                }}
              >
                v1.0.0 RELEASE
              </span>
            </div>
            <p style={{ margin: "2px 0 0 0", color: "#64748b", fontSize: "13px" }}>
              Architecture-Agnostic Repository Integrity Agent • Tree-sitter & NetworkX ERCG Engine
            </p>
          </div>
        </div>

        {/* Status Indicators */}
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "6px 14px",
              borderRadius: "9999px",
              background: "rgba(11, 17, 32, 0.8)",
              border:
                serverHealth === true
                  ? "1px solid rgba(16, 185, 129, 0.3)"
                  : "1px solid rgba(244, 63, 94, 0.3)",
            }}
          >
            <span
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                backgroundColor:
                  serverHealth === true ? "#10b981" : serverHealth === false ? "#f43f5e" : "#f59e0b",
                boxShadow:
                  serverHealth === true
                    ? "0 0 10px #10b981"
                    : serverHealth === false
                    ? "0 0 10px #f43f5e"
                    : "0 0 10px #f59e0b",
                display: "inline-block",
              }}
            />
            <span
              style={{
                fontSize: "12px",
                fontWeight: 600,
                color: serverHealth === true ? "#34d399" : "#f87171",
              }}
            >
              {serverHealth === true
                ? "FastAPI Engine Online"
                : serverHealth === false
                ? "FastAPI Engine Offline"
                : "Connecting to Engine..."}
            </span>
          </div>
        </div>
      </div>

      {/* Benchmark Repo Quick-Picker */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          overflowX: "auto",
          paddingBottom: "4px",
        }}
      >
        <span
          style={{
            fontSize: "11px",
            fontWeight: 700,
            textTransform: "uppercase",
            color: "#64748b",
            marginRight: "4px",
            whiteSpace: "nowrap",
            display: "flex",
            alignItems: "center",
            gap: "4px",
          }}
        >
          <Sparkles size={12} color="#38bdf8" /> Benchmark Suites:
        </span>
        {presets.map((p) => {
          const isSelected = selectedRepo === p.path;
          return (
            <button
              key={p.path}
              onClick={() => onSelectPresetRepo(p.path)}
              style={{
                padding: "6px 12px",
                borderRadius: "8px",
                fontSize: "12px",
                fontWeight: isSelected ? 700 : 500,
                background: isSelected ? "rgba(56, 189, 248, 0.2)" : "rgba(15, 23, 42, 0.6)",
                border: isSelected
                  ? "1px solid #38bdf8"
                  : "1px solid rgba(255, 255, 255, 0.08)",
                color: isSelected ? "#38bdf8" : "#94a3b8",
                cursor: "pointer",
                whiteSpace: "nowrap",
                transition: "all 0.15s ease",
              }}
            >
              {p.name}
            </button>
          );
        })}
      </div>
    </header>
  );
};
