import React, { useState } from "react";
import { traceguardApi } from "../api/client";
import { Download, FileCode, FileText, FileJson, Check, Copy } from "lucide-react";

interface ReportsExportViewProps {
  auditId: string;
  darkMode?: boolean;
}

export const ReportsExportView: React.FC<ReportsExportViewProps> = ({ auditId, darkMode = true }) => {
  const [loadingFormat, setLoadingFormat] = useState<string | null>(null);
  const [previewContent, setPreviewContent] = useState<string | null>(null);
  const [previewFormat, setPreviewFormat] = useState<string>("markdown");
  const [copied, setCopied] = useState<boolean>(false);

  const panelBg = darkMode ? "rgba(15, 23, 42, 0.75)" : "#ffffff";
  const borderBase = darkMode ? "rgba(255, 255, 255, 0.08)" : "#e2e8f0";
  const textPrimary = darkMode ? "#f8fafc" : "#0f172a";
  const textSecondary = darkMode ? "#94a3b8" : "#475569";
  const textMuted = darkMode ? "#64748b" : "#94a3b8";
  const cyan = darkMode ? "#38bdf8" : "#0284c7";
  const purple = darkMode ? "#a855f7" : "#7c3aed";
  const emerald = darkMode ? "#10b981" : "#059669";

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
            background: panelBg,
            backdropFilter: "blur(14px)",
            border: `1px solid ${borderBase}`,
            borderRadius: "14px",
            padding: "20px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            boxShadow: darkMode ? "0 8px 30px rgba(0, 0, 0, 0.3)" : "0 4px 20px rgba(0, 0, 0, 0.05)",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
              <FileCode size={20} color={cyan} />
              <h4 style={{ margin: 0, fontSize: "15px", color: textPrimary, fontWeight: 700 }}>
                Interactive HTML Dashboard
              </h4>
            </div>
            <p style={{ margin: "0 0 16px 0", fontSize: "12px", color: textSecondary, lineHeight: 1.5 }}>
              Standalone zero-dependency single-file visual report with styled tables, badges, and remediation plan.
            </p>
          </div>
          <button
            onClick={() => handleDownload("html")}
            disabled={loadingFormat === "html"}
            style={{
              padding: "10px 16px",
              borderRadius: "8px",
              background: `${cyan}18`,
              border: `1px solid ${cyan}44`,
              color: cyan,
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
            background: panelBg,
            backdropFilter: "blur(14px)",
            border: `1px solid ${borderBase}`,
            borderRadius: "14px",
            padding: "20px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            boxShadow: darkMode ? "0 8px 30px rgba(0, 0, 0, 0.3)" : "0 4px 20px rgba(0, 0, 0, 0.05)",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
              <FileText size={20} color={purple} />
              <h4 style={{ margin: 0, fontSize: "15px", color: textPrimary, fontWeight: 700 }}>
                Markdown Summary (PR Ready)
              </h4>
            </div>
            <p style={{ margin: "0 0 16px 0", fontSize: "12px", color: textSecondary, lineHeight: 1.5 }}>
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
                background: `${purple}18`,
                border: `1px solid ${purple}44`,
                color: purple,
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
                background: darkMode ? "rgba(255, 255, 255, 0.05)" : "#f1f5f9",
                border: darkMode ? "1px solid rgba(255, 255, 255, 0.1)" : "1px solid #cbd5e1",
                color: textSecondary,
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
            background: panelBg,
            backdropFilter: "blur(14px)",
            border: `1px solid ${borderBase}`,
            borderRadius: "14px",
            padding: "20px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            boxShadow: darkMode ? "0 8px 30px rgba(0, 0, 0, 0.3)" : "0 4px 20px rgba(0, 0, 0, 0.05)",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
              <FileJson size={20} color={emerald} />
              <h4 style={{ margin: 0, fontSize: "15px", color: textPrimary, fontWeight: 700 }}>
                Structured Machine JSON
              </h4>
            </div>
            <p style={{ margin: "0 0 16px 0", fontSize: "12px", color: textSecondary, lineHeight: 1.5 }}>
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
                background: `${emerald}18`,
                border: `1px solid ${emerald}44`,
                color: emerald,
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
                background: darkMode ? "rgba(255, 255, 255, 0.05)" : "#f1f5f9",
                border: darkMode ? "1px solid rgba(255, 255, 255, 0.1)" : "1px solid #cbd5e1",
                color: textSecondary,
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

      {/* Report Preview Panel */}
      {previewContent && (
        <div
          style={{
            background: panelBg,
            backdropFilter: "blur(14px)",
            border: `1px solid ${borderBase}`,
            borderRadius: "16px",
            padding: "24px",
            boxShadow: darkMode ? "0 10px 40px rgba(0, 0, 0, 0.5)" : "0 4px 20px rgba(0, 0, 0, 0.06)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "16px",
              paddingBottom: "12px",
              borderBottom: `1px solid ${borderBase}`,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontWeight: 700, fontSize: "15px", color: textPrimary }}>
                {previewFormat === "markdown" ? "Markdown Report Preview" : "JSON Report Preview"}
              </span>
              <span
                style={{
                  fontSize: "11px",
                  padding: "2px 8px",
                  borderRadius: "4px",
                  background: `${cyan}20`,
                  color: cyan,
                  fontWeight: 600,
                }}
              >
                {previewFormat.toUpperCase()}
              </span>
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                onClick={handleCopy}
                style={{
                  padding: "6px 12px",
                  borderRadius: "6px",
                  background: darkMode ? "rgba(255, 255, 255, 0.05)" : "#f1f5f9",
                  border: darkMode ? "1px solid rgba(255, 255, 255, 0.1)" : "1px solid #cbd5e1",
                  color: copied ? emerald : textSecondary,
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? "Copied" : "Copy Content"}
              </button>
              <button
                onClick={() => setPreviewContent(null)}
                style={{
                  padding: "6px 12px",
                  borderRadius: "6px",
                  background: "transparent",
                  border: `1px solid ${borderBase}`,
                  color: textMuted,
                  fontSize: "12px",
                  cursor: "pointer",
                }}
              >
                Close
              </button>
            </div>
          </div>

          <pre
            style={{
              margin: 0,
              padding: "16px",
              borderRadius: "10px",
              background: darkMode ? "#030712" : "#f8fafc",
              border: `1px solid ${borderBase}`,
              fontSize: "12px",
              lineHeight: 1.6,
              color: darkMode ? "#e2e8f0" : "#0f172a",
              maxHeight: "500px",
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
