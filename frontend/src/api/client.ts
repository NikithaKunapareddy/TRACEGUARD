/**
 * TraceGuard API Client
 * Interfaces with the FastAPI REST API backend (POST /api/v1/audits, GET /api/v1/audits/{id}, etc.)
 */

declare const process: any;

export interface AuditRequest {
  repo_path: string;
  min_severity?: string;
  categories?: string[];
  incremental?: boolean;
}

export interface AuditResponse {
  audit_id: string;
  status: string;
  repo_path: string;
  message: string;
}

export interface Finding {
  id: string;
  stable_id?: string;
  category: "security" | "gap" | "slop" | "loose_end";
  subcategory?: string;
  title: string;
  severity: "critical" | "high" | "medium" | "low" | "info";
  confidence: number;
  verification_status: "Confirmed" | "Probable" | "Needs review";
  lifecycle_state: "NEW" | "EXISTING" | "RESOLVED" | "REINTRODUCED" | "ACCEPTED_RISK";
  affected_file: string;
  line_number: number;
  snippet: string;
  technical_explanation: string;
  potential_impact: string;
  recommended_remediation: string;
  counterevidence_considered?: string[];
}

export interface IntegrityAssessment {
  overall_score: number;
  rating: string;
  security_risk_score: number;
  implementation_completeness_score: number;
  code_quality_score: number;
  development_hygiene_score: number;
  disclaimer: string;
  evidence_sufficiency: string;
  summary_verdict: string;
}

export interface AuditStatus {
  audit_id: string;
  status: "queued" | "running" | "completed" | "failed";
  repo_path?: string;
  total_findings?: number;
  overall_score?: number;
  security_risk_score?: number;
  implementation_completeness_score?: number;
  code_quality_score?: number;
  development_hygiene_score?: number;
  rating?: string;
  disclaimer?: string;
  summary_verdict?: string;
  error?: string;
}

export interface PaginatedFindings {
  audit_id: string;
  total: number;
  page: number;
  page_size: number;
  findings: Finding[];
}

const getBaseUrl = (): string => {
  try {
    if (typeof process !== "undefined" && process?.env?.REACT_APP_API_URL) {
      return process.env.REACT_APP_API_URL;
    }
  } catch {
    // Ignore in browser
  }
  if (typeof window !== "undefined" && window.location) {
    if (window.location.port === "8000") {
      return "";
    }
    const host = window.location.hostname || "127.0.0.1";
    return `http://${host}:8000`;
  }
  return "http://127.0.0.1:8000";
};

const BASE_URL = getBaseUrl();

export const traceguardApi = {
  async health(): Promise<{ status: string; service: string; version: string }> {
    const res = await fetch(`${BASE_URL}/api/v1/health`);
    if (!res.ok) throw new Error(`Health check failed: ${res.statusText}`);
    return res.json();
  },

  async startAudit(req: AuditRequest): Promise<AuditResponse> {
    const res = await fetch(`${BASE_URL}/api/v1/audits`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || "Failed to trigger audit");
    }
    return res.json();
  },

  async getAudit(auditId: string): Promise<AuditStatus> {
    const res = await fetch(`${BASE_URL}/api/v1/audits/${encodeURIComponent(auditId)}`);
    if (!res.ok) throw new Error(`Failed to fetch audit: ${res.statusText}`);
    return res.json();
  },

  async getFindings(
    auditId: string,
    page = 1,
    pageSize = 50,
    category?: string,
    minSeverity?: string
  ): Promise<PaginatedFindings> {
    const params = new URLSearchParams({
      page: String(page),
      page_size: String(pageSize),
    });
    if (category) params.set("category", category);
    if (minSeverity) params.set("min_severity", minSeverity);

    const res = await fetch(
      `${BASE_URL}/api/v1/audits/${encodeURIComponent(auditId)}/findings?${params}`
    );
    if (!res.ok) throw new Error(`Failed to fetch findings: ${res.statusText}`);
    return res.json();
  },

  async getReport(auditId: string, format = "json"): Promise<any> {
    const res = await fetch(
      `${BASE_URL}/api/v1/audits/${encodeURIComponent(auditId)}/report?format=${format}`
    );
    if (!res.ok) throw new Error(`Failed to fetch report: ${res.statusText}`);
    return res.json();
  },
};
