import React, { useState } from "react";
import { traceguardApi } from "../api/client";
import { Download, FileCode, FileText, FileJson, Check, Copy } from "lucide-react";

interface ReportsExportViewProps {
  auditId: string;
}

export const ReportsExportView: React.FC<ReportsExportViewProps> = ({ auditId }) => {
  const [loadingFormat, setLoadingFormat] = useState<string | null>(null);
  const [previewContent, setPreviewContent] = useState<string | null>(null);
  const [previewFormat, setPreviewFormat] = useState<string>("markdown");
  const [copied, setCopied] = useState<boolean>(false);

  const handleDownload = async (format: "json" | "markdown" | "html") => {
    try {
      setLoadingFormat(format);
      const res = await traceguardApi.getReport(auditId, format);

      let content = "";
      let filename = `traceguard_audit_${auditId.slice(0, 8)}`;
      let mimeType = "text/plain";

      if (format === "json") {
        content = JSON.stringify(res, null, 2);
        filename += ".json";
        mimeType = "application/json";
      } else if (format === "markdown") {
        content = res.content || "";
        filename += ".md";
        mimeType = "text/markdown";
      } else if (format === "html") {
        content = res.content || "";
        filename += ".html";
        mimeType = "text/html";
      }

      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download failed:", err);
    } finally {
      setLoadingFormat(null);
    }
  };

  const handlePreview = async (format: "json" | "markdown") => {
    try {
      setLoadingFormat(format);
      setPreviewFormat(format);
      const res = await traceguardApi.getReport(auditId, format);
      if (format === "json") {
        setPreviewContent(JSON.stringify(res, null, 2));
      } else {
        setPreviewContent(res.content || "");
      }
    } catch (err) {
      console.error("Preview failed:", err);
    } finally {
      setLoadingFormat(null);
    }
  };

  const handleCopy = () => {
    if (!previewContent) return;
    navigator.clipboard.writeText(previewContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ marginBottom: "32px" }}>
      {/* Download Action Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: "16px",
          marginBottom: "24px",
        }}
      >
        {/* HTML Report */}
        <div
          style={{
            background: "rgba(15, 23, 42, 0.75)",
            backdropFilter: "blur(14px)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "14px",
            padding: "20px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
              <FileCode size={20} color="#38bdf8" />
              <h4 style={{ margin: 0, fontSize: "15px", color: "#f8fafc", fontWeight: 700 }}>
                Interactive HTML Dashboard
              </h4>
            </div>
            <p style={{ margin: "0 0 16px 0", fontSize: "12px", color: "#94a3b8", lineHeight: 1.5 }}>
              Standalone zero-dependency single-file visual report with styled tables, badges, and remediation plan.
            </p>
          </div>
          <button
            onClick={() => handleDownload("html")}
            disabled={loadingFormat === "html"}
            style={{
              padding: "10px 16px",
              borderRadius: "8px",
              background: "rgba(56, 189, 248, 0.15)",
              border: "1px solid rgba(56, 189, 248, 0.4)",
              color: "#38bdf8",
              fontSize: "13px",
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
            }}
          >
            <Download size={14} /> {loadingFormat === "html" ? "Preparing..." : "Download HTML"}
          </button>
        </div>

        {/* Markdown Report */}
        <div
          style={{
            background: "rgba(15, 23, 42, 0.75)",
            backdropFilter: "blur(14px)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "14px",
            padding: "20px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
              <FileText size={20} color="#a855f7" />
              <h4 style={{ margin: 0, fontSize: "15px", color: "#f8fafc", fontWeight: 700 }}>
                Markdown Summary (PR Ready)
              </h4>
            </div>
            <p style={{ margin: "0 0 16px 0", fontSize: "12px", color: "#94a3b8", lineHeight: 1.5 }}>
              GitHub GFM formatted document designed for CI/CD pull request comment integration.
            </p>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={() => handleDownload("markdown")}
              disabled={loadingFormat === "markdown"}
              style={{
                flex: 1,
                padding: "10px 16px",
                borderRadius: "8px",
                background: "rgba(168, 85, 247, 0.15)",
                border: "1px solid rgba(168, 85, 247, 0.4)",
                color: "#c084fc",
                fontSize: "13px",
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
              }}
            >
              <Download size={14} /> Download MD
            </button>
            <button
              onClick={() => handlePreview("markdown")}
              style={{
                padding: "10px 14px",
                borderRadius: "8px",
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                color: "#cbd5e1",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Preview
            </button>
          </div>
        </div>

        {/* JSON Machine Report */}
        <div
          style={{
            background: "rgba(15, 23, 42, 0.75)",
            backdropFilter: "blur(14px)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "14px",
            padding: "20px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
              <FileJson size={20} color="#10b981" />
              <h4 style={{ margin: 0, fontSize: "15px", color: "#f8fafc", fontWeight: 700 }}>
                Structured Machine JSON
              </h4>
            </div>
            <p style={{ margin: "0 0 16px 0", fontSize: "12px", color: "#94a3b8", lineHeight: 1.5 }}>
              Complete Pydantic AuditReport schema for automated downstream security tooling & SIEM ingestion.
            </p>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={() => handleDownload("json")}
              disabled={loadingFormat === "json"}
              style={{
                flex: 1,
                padding: "10px 16px",
                borderRadius: "8px",
                background: "rgba(16, 185, 129, 0.15)",
                border: "1px solid rgba(16, 185, 129, 0.4)",
                color: "#34d399",
                fontSize: "13px",
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
              }}
            >
              <Download size={14} /> Download JSON
            </button>
            <button
              onClick={() => handlePreview("json")}
              style={{
                padding: "10px 14px",
                borderRadius: "8px",
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                color: "#cbd5e1",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Preview
            </button>
          </div>
        </div>
      </div>

      {/* In-Browser Preview Modal/Card */}
      {previewContent && (
        <div
          style={{
            background: "#030712",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            borderRadius: "14px",
            padding: "20px",
            boxShadow: "0 10px 40px rgba(0, 0, 0, 0.6)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "12px",
              paddingBottom: "12px",
              borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
            }}
          >
            <span style={{ fontSize: "13px", fontWeight: 700, color: "#f8fafc" }}>
              In-Browser {previewFormat.toUpperCase()} Preview
            </span>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                onClick={handleCopy}
                style={{
                  background: "rgba(255, 255, 255, 0.05)",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  color: "#f8fafc",
                  borderRadius: "6px",
                  padding: "4px 10px",
                  fontSize: "12px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                {copied ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                {copied ? "Copied" : "Copy Content"}
              </button>
              <button
                onClick={() => setPreviewContent(null)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#64748b",
                  fontSize: "14px",
                  cursor: "pointer",
                  padding: "4px 8px",
                }}
              >
                ✕
              </button>
            </div>
          </div>
          <pre
            style={{
              margin: 0,
              padding: "12px",
              borderRadius: "8px",
              background: "#080c18",
              color: "#e2e8f0",
              fontSize: "12px",
              maxHeight: "360px",
              overflowY: "auto",
              fontFamily: "JetBrains Mono, monospace",
              whiteSpace: "pre-wrap",
            }}
          >
            {previewContent}
          </pre>
        </div>
      )}
    </div>
  );
};
