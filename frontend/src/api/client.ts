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

export interface SourceCodeLine {
  line_number: number;
  content: string;
  is_problematic: boolean;
}

export interface FindingSourceCode {
  audit_id: string;
  finding_id: string;
  title: string;
  severity: string;
  category: string;
  confidence: number;
  verification_status: string;
  lifecycle_state: string;
  affected_file: string;
  line_number: number;
  target_line?: number;
  end_line_number?: number;
  file_exists: boolean;
  language: string;
  start_line: number;
  end_line: number;
  total_lines: number;
  lines: SourceCodeLine[];
  raw_snippet: string;
  technical_explanation: string;
  potential_impact: string;
  recommended_remediation: string;
  counterevidence_considered: string[];
  related_nodes: string[];
}

export interface AuditHistoryItem {
  id?: string;
  audit_id: string;
  repo_path: string;
  repo_name?: string;
  status: string;
  overall_score?: number;
  security_risk_score?: number;
  implementation_completeness_score?: number;
  code_quality_score?: number;
  development_hygiene_score?: number;
  rating?: string;
  total_findings?: number;
  critical_count?: number;
  high_count?: number;
  medium_count?: number;
  low_count?: number;
  incremental?: boolean;
  created_at?: string;
  completed_at?: string;
}

export interface AuditCompareResult {
  audit_id_1: string;
  audit_id_2: string;
  score_delta: number;
  score_previous?: number;
  score_current?: number;
  new_findings: Finding[];
  resolved_findings: Finding[];
  persisting_findings: Finding[];
  resolved_count?: number;
  new_count?: number;
  persistent_count?: number;
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
    const viteUrl = (import.meta as any).env?.VITE_API_URL;
    if (viteUrl) {
      return String(viteUrl).trim().replace(/\/+$/, "");
    }
  } catch {
    // Ignore in non-Vite environments
  }
  try {
    if (typeof process !== "undefined" && process?.env?.REACT_APP_API_URL) {
      return String(process.env.REACT_APP_API_URL).trim().replace(/\/+$/, "");
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

  async getFindingSource(
    auditId: string,
    findingId: string,
    contextLines = 12
  ): Promise<FindingSourceCode> {
    const res = await fetch(
      `${BASE_URL}/api/v1/audits/${encodeURIComponent(auditId)}/findings/${encodeURIComponent(findingId)}/source?context_lines=${contextLines}`
    );
    if (!res.ok) throw new Error(`Failed to load source code: ${res.statusText}`);
    return res.json();
  },

  async getReport(auditId: string, format = "json"): Promise<any> {
    const res = await fetch(
      `${BASE_URL}/api/v1/audits/${encodeURIComponent(auditId)}/report?format=${format}`
    );
    if (!res.ok) throw new Error(`Failed to fetch report: ${res.statusText}`);
    return res.json();
  },

  async getGraph(auditId: string): Promise<{
    audit_id: string;
    graph_stats: any;
    overview: any;
    graph_coverage?: any;
    nodes: Array<{ id: string; name: string; kind: string; file: string; line: number }>;
    edges: Array<{ source: string; target: string; relation: string }>;
  }> {
    const res = await fetch(`${BASE_URL}/api/v1/audits/${encodeURIComponent(auditId)}/graph`);
    if (!res.ok) throw new Error(`Failed to fetch graph: ${res.statusText}`);
    return res.json();
  },

  async listAudits(
    repoPath?: string,
    status?: string,
    limit = 50,
    offset = 0
  ): Promise<AuditHistoryItem[]> {
    const params = new URLSearchParams({
      limit: String(limit),
      offset: String(offset),
    });
    if (repoPath) params.set("repo_path", repoPath);
    if (status) params.set("status", status);
    const res = await fetch(`${BASE_URL}/api/v1/audits?${params}`);
    if (!res.ok) throw new Error(`Failed to list audits: ${res.statusText}`);
    const data = await res.json();
    const rawList: any[] = Array.isArray(data) ? data : data.audits || [];
    return rawList.map((item) => ({
      ...item,
      audit_id: String(item.audit_id || item.id || ""),
      repo_name: item.repo_name || (item.repo_path ? item.repo_path.split(/[/\\]/).pop() : "Unknown"),
      incremental: typeof item.incremental === "boolean" ? item.incremental : Boolean(item.is_incremental),
      created_at: item.created_at || item.started_at,
    }));
  },

  async compareAudits(id1: string, id2: string): Promise<AuditCompareResult> {
    const res = await fetch(
      `${BASE_URL}/api/v1/audits/${encodeURIComponent(id1)}/compare/${encodeURIComponent(id2)}`
    );
    if (!res.ok) throw new Error(`Failed to compare audits: ${res.statusText}`);
    return res.json();
  },
};
