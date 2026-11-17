import React from "react";
import { AuditStatus } from "../api/client";

interface ScoreCardProps {
  status: AuditStatus;
}

export const ScoreCard: React.FC<ScoreCardProps> = ({ status }) => {
  const getRatingColor = (rating?: string) => {
    switch (rating) {
      case "EXCELLENT":
        return "#16a34a";
      case "GOOD":
        return "#2563eb";
      case "FAIR":
        return "#d97706";
      case "POOR":
      case "CRITICAL CONCERNS":
        return "#dc2626";
      default:
        return "#475569";
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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <div>
          <h2 style={{ margin: "0 0 4px 0", fontSize: "20px", color: "#1e293b" }}>
            Repository Integrity Assessment
          </h2>
          <p style={{ margin: 0, color: "#64748b", fontSize: "14px" }}>
            {status.summary_verdict || "Audit evaluation complete"}
          </p>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: "36px", fontWeight: "bold", color: getRatingColor(status.rating) }}>
            {status.overall_score?.toFixed(1) ?? "100.0"}
            <span style={{ fontSize: "18px", color: "#94a3b8" }}>/100</span>
          </div>
          <span
            style={{
              display: "inline-block",
              padding: "4px 10px",
              borderRadius: "9999px",
              backgroundColor: getRatingColor(status.rating) + "15",
              color: getRatingColor(status.rating),
              fontWeight: 600,
              fontSize: "12px",
            }}
          >
            {status.rating || "EVALUATED"}
          </span>
        </div>
      </div>

      {/* 4 Independent Dimensions */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "16px",
          marginTop: "16px",
        }}
      >
        <div style={{ background: "#f8fafc", padding: "12px 16px", borderRadius: "8px" }}>
          <div style={{ fontSize: "12px", color: "#64748b", fontWeight: 500 }}>Security Risk (40%)</div>
          <div style={{ fontSize: "22px", fontWeight: "bold", color: "#0f172a", marginTop: "4px" }}>
            {status.security_risk_score?.toFixed(1) ?? "100.0"}
          </div>
          <div style={{ fontSize: "11px", color: "#94a3b8" }}>100 = No detected exploits</div>
        </div>

        <div style={{ background: "#f8fafc", padding: "12px 16px", borderRadius: "8px" }}>
          <div style={{ fontSize: "12px", color: "#64748b", fontWeight: 500 }}>Implementation Completeness (30%)</div>
          <div style={{ fontSize: "22px", fontWeight: "bold", color: "#0f172a", marginTop: "4px" }}>
            {status.implementation_completeness_score?.toFixed(1) ?? "100.0"}
          </div>
          <div style={{ fontSize: "11px", color: "#94a3b8" }}>Negative-space & gap analysis</div>
        </div>

        <div style={{ background: "#f8fafc", padding: "12px 16px", borderRadius: "8px" }}>
          <div style={{ fontSize: "12px", color: "#64748b", fontWeight: 500 }}>Code Quality (20%)</div>
          <div style={{ fontSize: "22px", fontWeight: "bold", color: "#0f172a", marginTop: "4px" }}>
            {status.code_quality_score?.toFixed(1) ?? "100.0"}
          </div>
          <div style={{ fontSize: "11px", color: "#94a3b8" }}>Slop & complexity penalty</div>
        </div>

        <div style={{ background: "#f8fafc", padding: "12px 16px", borderRadius: "8px" }}>
          <div style={{ fontSize: "12px", color: "#64748b", fontWeight: 500 }}>Development Hygiene (10%)</div>
          <div style={{ fontSize: "22px", fontWeight: "bold", color: "#0f172a", marginTop: "4px" }}>
            {status.development_hygiene_score?.toFixed(1) ?? "100.0"}
          </div>
          <div style={{ fontSize: "11px", color: "#94a3b8" }}>Loose ends & unconfigured vars</div>
        </div>
      </div>

      {/* Mandatory Disclaimer */}
      <div
        style={{
          marginTop: "16px",
          padding: "12px",
          background: "#fffbeb",
          border: "1px solid #fef3c7",
          borderRadius: "6px",
          fontSize: "12px",
          color: "#92400e",
          lineHeight: 1.5,
        }}
      >
        <strong>Notice:</strong>{" "}
        {status.disclaimer ||
          "TraceGuard integrity scores are heuristic engineering quality indicators derived from static repository analysis and consistency graphs. They do not constitute an official security certification or regulatory compliance guarantee."}
      </div>
    </div>
  );
};
