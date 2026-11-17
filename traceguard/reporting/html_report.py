"""
Self-Contained Interactive HTML Report Generator for TraceGuard.
Features interactive category filtering, search, severity badges, and evidence inspection.
"""

from __future__ import annotations
import json
import html
from ..core.models import AuditReport, Severity, Category


class HtmlReporter:
    """Generates a modern, responsive, zero-dependency interactive HTML dashboard."""

    @staticmethod
    def render(report: AuditReport) -> str:
        ov = report.overview
        assess = report.assessment

        findings_json = json.dumps([
            {
                "id": f.id,
                "category": f.category.value,
                "subcategory": f.subcategory,
                "title": f.title,
                "severity": f.severity.value,
                "confidence": int(f.confidence * 100),
                "verification_status": f.verification_status.value,
                "affected_file": f.affected_file,
                "line_number": f.line_number,
                "snippet": f.snippet,
                "supporting_evidence": f.supporting_evidence,
                "counterevidence_considered": f.counterevidence_considered,
                "technical_explanation": f.technical_explanation,
                "potential_impact": f.potential_impact,
                "recommended_remediation": f.recommended_remediation,
            }
            for f in report.findings
        ])

        html_template = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TraceGuard Audit Report - {html.escape(ov.root_path)}</title>
  <style>
    :root {{
      --bg: #0d1117;
      --card-bg: #161b22;
      --border: #30363d;
      --text: #c9d1d9;
      --text-dim: #8b949e;
      --accent: #58a6ff;
      --critical: #f85149;
      --high: #ff7b72;
      --medium: #d29922;
      --low: #388bfd;
      --success: #3fb950;
    }}
    * {{ box-sizing: border-box; margin: 0; padding: 0; }}
    body {{
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.6;
      padding: 24px;
    }}
    .container {{ max-width: 1200px; margin: 0 auto; }}
    header {{
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 20px;
      border-bottom: 1px solid var(--border);
      margin-bottom: 24px;
    }}
    .brand {{ font-size: 26px; font-weight: 800; color: #58a6ff; letter-spacing: -0.5px; }}
    .badge {{
      display: inline-block;
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
    }}
    .badge-critical {{ background: rgba(248, 81, 73, 0.2); color: var(--critical); border: 1px solid var(--critical); }}
    .badge-high {{ background: rgba(255, 123, 114, 0.2); color: var(--high); border: 1px solid var(--high); }}
    .badge-medium {{ background: rgba(210, 153, 34, 0.2); color: var(--medium); border: 1px solid var(--medium); }}
    .badge-low {{ background: rgba(56, 139, 253, 0.2); color: var(--low); border: 1px solid var(--low); }}
    .grid {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px; margin-bottom: 24px; }}
    .card {{
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 16px;
    }}
    .card-title {{ font-size: 13px; color: var(--text-dim); text-transform: uppercase; margin-bottom: 6px; font-weight: 600; }}
    .card-value {{ font-size: 28px; font-weight: 700; color: #fff; }}
    .controls {{
      display: flex;
      gap: 12px;
      margin-bottom: 20px;
      flex-wrap: wrap;
    }}
    .search-input {{
      flex: 1;
      min-width: 260px;
      background: var(--card-bg);
      border: 1px solid var(--border);
      color: #fff;
      padding: 10px 14px;
      border-radius: 6px;
      font-size: 14px;
    }}
    .filter-btn {{
      background: var(--card-bg);
      border: 1px solid var(--border);
      color: var(--text);
      padding: 8px 16px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 600;
      transition: all 0.15s ease;
    }}
    .filter-btn.active {{
      background: var(--accent);
      color: #000;
      border-color: var(--accent);
    }}
    .finding-card {{
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 16px;
    }}
    .finding-header {{
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 10px;
    }}
    .finding-title {{ font-size: 18px; font-weight: 700; color: #fff; }}
    .finding-meta {{ font-size: 13px; color: var(--text-dim); margin-bottom: 12px; }}
    .code-box {{
      background: #000;
      border: 1px solid #21262d;
      border-radius: 6px;
      padding: 12px;
      font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
      font-size: 13px;
      overflow-x: auto;
      margin: 10px 0;
      color: #7ee787;
    }}
    .evidence-list {{ margin: 8px 0 12px 20px; font-size: 13px; color: var(--text-dim); }}
    .remediation {{
      background: rgba(63, 185, 80, 0.1);
      border-left: 3px solid var(--success);
      padding: 10px 14px;
      font-size: 13px;
      margin-top: 12px;
      border-radius: 0 4px 4px 0;
    }}
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div>
        <div class="brand">TRACEGUARD</div>
        <div style="font-size: 13px; color: var(--text-dim);">Architecture-Agnostic Repository Integrity Agent</div>
      </div>
      <div>
        <span class="badge" style="background: rgba(88, 166, 255, 0.2); color: var(--accent); font-size: 14px;">
          Score: {assess.overall_score:.1f} / 100 ({assess.rating})
        </span>
      </div>
    </header>

    <div class="grid">
      <div class="card">
        <div class="card-title">Files Audited</div>
        <div class="card-value">{ov.total_files}</div>
        <div style="font-size: 12px; color: var(--text-dim); margin-top: 4px;">{ov.total_lines:,} lines of code</div>
      </div>
      <div class="card">
        <div class="card-title">ERCG Consistency Graph</div>
        <div class="card-value">{report.graph_stats.get('total_nodes', 0)}</div>
        <div style="font-size: 12px; color: var(--text-dim); margin-top: 4px;">{report.graph_stats.get('total_edges', 0)} evidence relations</div>
      </div>
      <div class="card">
        <div class="card-title">Security & Gaps</div>
        <div class="card-value" style="color: var(--critical);">{assess.findings_by_category.get('security', 0) + assess.findings_by_category.get('gap', 0)}</div>
        <div style="font-size: 12px; color: var(--text-dim); margin-top: 4px;">Critical & High priority issues</div>
      </div>
      <div class="card">
        <div class="card-title">Slop & Loose Ends</div>
        <div class="card-value" style="color: var(--medium);">{assess.findings_by_category.get('slop', 0) + assess.findings_by_category.get('loose_end', 0)}</div>
        <div style="font-size: 12px; color: var(--text-dim); margin-top: 4px;">Quality debt & unfinished work</div>
      </div>
    </div>

    <div class="controls">
      <input type="text" id="searchInput" class="search-input" placeholder="Search findings by ID, title, file, or keyword...">
      <button class="filter-btn active" data-filter="all">All ({len(report.findings)})</button>
      <button class="filter-btn" data-filter="security">Security</button>
      <button class="filter-btn" data-filter="gap">Gaps</button>
      <button class="filter-btn" data-filter="slop">Slop</button>
      <button class="filter-btn" data-filter="loose_end">Loose Ends</button>
    </div>

    <div id="findingsContainer"></div>
  </div>

  <script>
    const findings = {findings_json};
    let currentFilter = 'all';
    let searchQuery = '';

    function renderFindings() {{
      const container = document.getElementById('findingsContainer');
      const filtered = findings.filter(f => {{
        const matchFilter = currentFilter === 'all' || f.category === currentFilter;
        const text = (f.id + ' ' + f.title + ' ' + f.affected_file + ' ' + f.technical_explanation).toLowerCase();
        const matchSearch = !searchQuery || text.includes(searchQuery.toLowerCase());
        return matchFilter && matchSearch;
      }});

      if (filtered.length === 0) {{
        container.innerHTML = '<div style="text-align: center; padding: 40px; color: var(--text-dim);">No matching findings found.</div>';
        return;
      }}

      container.innerHTML = filtered.map(f => `
        <div class="finding-card">
          <div class="finding-header">
            <div>
              <span class="badge badge-${{f.severity}}">${{f.severity.toUpperCase()}}</span>
              <span style="font-weight: 700; margin-left: 8px;">${{f.id}}</span>
              <span style="color: var(--text-dim); font-size: 13px; margin-left: 8px;">[${{f.verification_status}}]</span>
            </div>
            <div style="font-size: 13px; color: var(--accent); font-weight: 600;">${{f.confidence}}% confidence</div>
          </div>
          <div class="finding-title">${{f.title}}</div>
          <div class="finding-meta">📁 <code>${{f.affected_file}}:${{f.line_number}}</code> | Category: <strong>${{f.category}}</strong> (${{f.subcategory}})</div>
          <p style="font-size: 14px; margin-bottom: 8px;">${{f.technical_explanation}}</p>
          ${{f.snippet ? `<pre class="code-box">${{escapeHtml(f.snippet)}}</pre>` : ''}}
          ${{f.supporting_evidence && f.supporting_evidence.length ? `
            <div style="font-size: 12px; font-weight: 600; color: var(--text-dim); margin-top: 8px;">SUPPORTING EVIDENCE:</div>
            <ul class="evidence-list">${{f.supporting_evidence.map(e => `<li>${{escapeHtml(e)}}</li>`).join('')}}</ul>
          ` : ''}}
          <div class="remediation"><strong>💡 Recommended Remediation:</strong> ${{escapeHtml(f.recommended_remediation)}}</div>
        </div>
      `).join('');
    }}

    function escapeHtml(str) {{
      return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }}

    document.querySelectorAll('.filter-btn').forEach(btn => {{
      btn.addEventListener('click', () => {{
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentFilter = btn.dataset.filter;
        renderFindings();
      }});
    }});

    document.getElementById('searchInput').addEventListener('input', (e) => {{
      searchQuery = e.target.value;
      renderFindings();
    }});

    renderFindings();
  </script>
</body>
</html>
"""
        return html_template
