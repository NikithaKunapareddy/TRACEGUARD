import React, { useState, useEffect } from "react";
import { traceguardApi, AuditStatus, Finding } from "./api/client";
import { AuditForm } from "./components/AuditForm";
import { ScoreCard } from "./components/ScoreCard";
import { FindingsTable } from "./components/FindingsTable";

export const App: React.FC = () => {
  const [currentAuditId, setCurrentAuditId] = useState<string | null>(null);
  const [auditStatus, setAuditStatus] = useState<AuditStatus | null>(null);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [totalFindings, setTotalFindings] = useState<number>(0);
  const [polling, setPolling] = useState<boolean>(false);
  const [serverHealth, setServerHealth] = useState<boolean | null>(null);

  // Check health on mount
  useEffect(() => {
    traceguardApi
      .health()
      .then(() => setServerHealth(true))
      .catch(() => setServerHealth(false));
  }, []);

  // Poll audit status
  useEffect(() => {
    if (!currentAuditId || !polling) return;

    const interval = setInterval(async () => {
      try {
        const res = await traceguardApi.getAudit(currentAuditId);
        setAuditStatus(res);

        if (res.status === "completed" || res.status === "failed") {
          setPolling(false);
          if (res.status === "completed") {
            // Load findings
            const fRes = await traceguardApi.getFindings(currentAuditId, 1, 100);
            setFindings(fRes.findings);
            setTotalFindings(fRes.total);
          }
        }
      } catch (err) {
        console.error("Polling error:", err);
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [currentAuditId, polling]);

  const handleAuditStarted = (id: string) => {
    setCurrentAuditId(id);
    setAuditStatus({ audit_id: id, status: "running" });
    setFindings([]);
    setTotalFindings(0);
    setPolling(true);
  };

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "32px 16px" }}>
      {/* Header */}
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px" }}>
        <div>
          <h1 style={{ margin: "0 0 6px 0", fontSize: "28px", color: "#0f172a", display: "flex", alignItems: "center", gap: "10px" }}>
            <span>🛡️</span> TraceGuard
          </h1>
          <p style={{ margin: 0, color: "#64748b", fontSize: "15px" }}>
            Architecture-Agnostic Repository Integrity Agent
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span
            style={{
              width: "10px",
              height: "10px",
              borderRadius: "50%",
              backgroundColor: serverHealth === true ? "#16a34a" : serverHealth === false ? "#dc2626" : "#d97706",
              display: "inline-block",
            }}
          />
          <span style={{ fontSize: "13px", color: "#64748b" }}>
            Backend API: {serverHealth === true ? "Online (FastAPI)" : serverHealth === false ? "Offline" : "Connecting..."}
          </span>
        </div>
      </header>

      {/* Main Form */}
      <AuditForm onAuditStarted={handleAuditStarted} />

      {/* Running Indicator */}
      {polling && auditStatus?.status === "running" && (
        <div
          style={{
            background: "#eff6ff",
            border: "1px solid #bfdbfe",
            borderRadius: "8px",
            padding: "16px 20px",
            marginBottom: "24px",
            display: "flex",
            alignItems: "center",
            gap: "12px",
            color: "#1e40af",
          }}
        >
          <div style={{ fontWeight: 600 }}>Analyzing Repository Structure & ERCG Graph...</div>
          <span style={{ fontSize: "13px", color: "#3b82f6" }}>
            Building intermediate representation, running 4 engines, checking negative-space relations.
          </span>
        </div>
      )}

      {/* Results View */}
      {auditStatus && auditStatus.status === "completed" && (
        <>
          <ScoreCard status={auditStatus} />
          <FindingsTable findings={findings} total={totalFindings} />
        </>
      )}

      {auditStatus && auditStatus.status === "failed" && (
        <div
          style={{
            background: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: "8px",
            padding: "16px 20px",
            color: "#991b1b",
          }}
        >
          <strong>Audit Execution Failed:</strong> {auditStatus.error || "An unexpected error occurred."}
        </div>
      )}
    </div>
  );
};
