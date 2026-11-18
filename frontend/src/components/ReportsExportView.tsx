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

  const textPrimary = darkMode ? "#f8fafc" : "#0f172a";
  const textSecondary = darkMode ? "#cbd5e1" : "#334155";
  const textMuted = darkMode ? "#94a3b8" : "#64748b";

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
    <div style={{ marginBottom: "36px", display: "flex", flexDirection: "column", gap: "24px" }}>
      <div
        className="animate-reveal"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: "20px",
        }}
      >
        {/* HTML Report Lens */}
        <div
          className="vibgyor-prism-surface vib-tint-blue"
          style={{
            borderRadius: "28px",
            padding: "26px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
              <FileCode size={22} color="#3b82f6" />
              <h4 style={{ margin: 0, fontSize: "17px", color: textPrimary, fontWeight: 800 }}>
                Interactive HTML Bundle
              </h4>
            </div>
            <p style={{ margin: "0 0 20px 0", fontSize: "13px", color: textSecondary, lineHeight: 1.55 }}>
              Standalone zero-dependency visual report with executive summary, severity matrix, and remediation plan.
            </p>
          </div>
          <button
            onClick={() => handleDownload("html")}
            disabled={loadingFormat === "html"}
            style={{
              padding: "11px 18px",
              borderRadius: "9999px",
              background: "rgba(59, 130, 246, 0.18)",
              border: "none",
              color: "#3b82f6",
              fontSize: "13px",
              fontWeight: 800,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
            }}
          >
            <Download size={14} /> {loadingFormat === "html" ? "Preparing…" : "Download HTML"}
          </button>
        </div>

        {/* Markdown Report Lens */}
        <div
          className="vibgyor-prism-surface vib-tint-violet"
          style={{
            borderRadius: "28px",
            padding: "26px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
              <FileText size={22} color="#8b5cf6" />
              <h4 style={{ margin: 0, fontSize: "17px", color: textPrimary, fontWeight: 800 }}>
                GitHub PR Markdown
              </h4>
            </div>
            <p style={{ margin: "0 0 20px 0", fontSize: "13px", color: textSecondary, lineHeight: 1.55 }}>
              GitHub-flavored Markdown report formatted for CI/CD pull request checks and code review comments.
            </p>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={() => handleDownload("markdown")}
              disabled={loadingFormat === "markdown"}
              style={{
                flex: 1,
                padding: "11px 16px",
                borderRadius: "9999px",
                background: "rgba(139, 92, 246, 0.18)",
                border: "none",
                color: "#8b5cf6",
                fontSize: "13px",
                fontWeight: 800,
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
                padding: "11px 16px",
                borderRadius: "9999px",
                background: darkMode ? "rgba(255, 255, 255, 0.06)" : "rgba(15, 23, 42, 0.06)",
                border: "none",
                color: textSecondary,
                fontSize: "12.5px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Preview
            </button>
          </div>
        </div>

        {/* JSON Machine Report Lens */}
        <div
          className="vibgyor-prism-surface vib-tint-green"
          style={{
            borderRadius: "28px",
            padding: "26px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
              <FileJson size={22} color="#10b981" />
              <h4 style={{ margin: 0, fontSize: "17px", color: textPrimary, fontWeight: 800 }}>
                Structured Machine JSON
              </h4>
            </div>
            <p style={{ margin: "0 0 20px 0", fontSize: "13px", color: textSecondary, lineHeight: 1.55 }}>
              Complete Pydantic AuditReport schema for automated security pipelines and SIEM ingestion.
            </p>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={() => handleDownload("json")}
              disabled={loadingFormat === "json"}
              style={{
                flex: 1,
                padding: "11px 16px",
                borderRadius: "9999px",
                background: "rgba(16, 185, 129, 0.18)",
                border: "none",
                color: "#10b981",
                fontSize: "13px",
                fontWeight: 800,
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
                padding: "11px 16px",
                borderRadius: "9999px",
                background: darkMode ? "rgba(255, 255, 255, 0.06)" : "rgba(15, 23, 42, 0.06)",
                border: "none",
                color: textSecondary,
                fontSize: "12.5px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Preview
            </button>
          </div>
        </div>
      </div>

      {previewContent && (
        <div
          className="vibgyor-prism-surface animate-reveal"
          style={{
            borderRadius: "28px",
            padding: "26px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "16px",
              flexWrap: "wrap",
              gap: "10px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontWeight: 800, fontSize: "16px", color: textPrimary }}>
                {previewFormat === "markdown" ? "Markdown Report Stream" : "JSON Schema Stream"}
              </span>
              <span
                style={{
                  fontSize: "10.5px",
                  padding: "3px 10px",
                  borderRadius: "9999px",
                  background: "rgba(139, 92, 246, 0.18)",
                  color: "#8b5cf6",
                  fontWeight: 800,
                }}
              >
                {previewFormat.toUpperCase()}
              </span>
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                onClick={handleCopy}
                style={{
                  padding: "7px 14px",
                  borderRadius: "9999px",
                  background: darkMode ? "rgba(255, 255, 255, 0.06)" : "rgba(15, 23, 42, 0.06)",
                  border: "none",
                  color: copied ? "#10b981" : textSecondary,
                  fontSize: "12px",
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? "Copied" : "Copy Stream"}
              </button>
              <button
                onClick={() => setPreviewContent(null)}
                style={{
                  padding: "7px 14px",
                  borderRadius: "9999px",
                  background: "transparent",
                  border: "1px solid var(--hairline)",
                  color: textMuted,
                  fontSize: "12px",
                  fontWeight: 700,
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
              padding: "18px",
              borderRadius: "20px",
              background: darkMode ? "rgba(4, 7, 17, 0.75)" : "rgba(255, 255, 255, 0.85)",
              fontSize: "12px",
              lineHeight: 1.6,
              color: darkMode ? "#e2e8f0" : "#0f172a",
              maxHeight: "480px",
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
