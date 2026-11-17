# TraceGuard Benchmark & Evaluation Report

## 1. Experimental Methodology & Benchmark Suites

TraceGuard was evaluated across **nine controlled benchmark repositories** representing distinct architectural paradigms, language ecosystems, and structural patterns. 

Each repository contains:
1. **Known Defects (Ground Truth)**: Realistically planted security vulnerabilities, architectural gaps, code slop, and loose ends.
2. **False-Positive Traps**: Deliberately constructed architectural counter-examples (e.g., safe parameterized queries, external third-party API calls, implicit interface satisfaction, declared environment variables) designed to test false-positive resistance.

### Benchmark Repository Overview
- **Repo 1 (`repo1_ecommerce_fullstack`)**: Full-Stack FastAPI + React/TS + SQLite (SQL injection, missing route, mock checkout, dead code, unhandled transaction).
- **Repo 2 (`repo2_cloud_microservice`)**: Go Worker Daemon + Python CLI (Command injection, unimplemented Go interface, excessive complexity, unconfigured env var).
- **Repo 3 (`repo3_polyglot_fintech`)**: Node.js Express Gateway + Python Analytics + Docs (Hardcoded secret, documented missing route, swallowed exception).
- **Repo 4 (`repo4_fastapi_react`)**: FastAPI Backend + React Client (SQLi, missing `DELETE /tasks/{id}` route, unanchored docs).
- **Repo 5 (`repo5_fastapi_only`)**: FastAPI Analytics Service (Missing documented `/analytics/users` route, unresolved TODO placeholder).
- **Repo 6 (`repo6_node_express`)**: Node.js Express API (Hardcoded JWT secret, broken access control on auth route, console debug statement).
- **Repo 7 (`repo7_python_worker`)**: Python Worker Queue (Unconfigured Celery broker env var, swallowed exceptions in email worker).
- **Repo 8 (`repo8_go_microservice`)**: Go Microservice with Implicit Interfaces (Unimplemented `AuditNotifier`, unconfigured service port).
- **Repo 9 (`repo9_python_monolith`)**: Python Modular Monolith (Empty placeholder pass implementation in orders service).

---

## 2. Quantitative Evaluation Results

The following measurements were recorded running on an automated test harness across all nine benchmark repositories:

| Suite | Target Repository | Architecture & Tech Stack | Files | LOC | Known Defects | Detected (TP) | False Negatives | Recall | Execution Time |
| :---: | :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Repo 1** | `repo1_ecommerce_fullstack` | FastAPI + React/TS + SQLite | 11 | 169 | 9 | 8 | 1 | 88.9% | 0.055s |
| **Repo 2** | `repo2_cloud_microservice` | Go Daemon + Python CLI | 7 | 79 | 5 | 5 | 0 | 100.0% | 0.032s |
| **Repo 3** | `repo3_polyglot_fintech` | Express Gateway + Python | 6 | 72 | 3 | 3 | 0 | 100.0% | 0.018s |
| **Repo 4** | `repo4_fastapi_react` | FastAPI + React Task Manager | 4 | 55 | 3 | 3 | 0 | 100.0% | 0.025s |
| **Repo 5** | `repo5_fastapi_only` | FastAPI Analytics Service | 2 | 34 | 2 | 2 | 0 | 100.0% | 0.017s |
| **Repo 6** | `repo6_node_express` | Node.js Express Application | 3 | 42 | 3 | 3 | 0 | 100.0% | 0.018s |
| **Repo 7** | `repo7_python_worker` | Python Celery/RQ Worker | 3 | 31 | 2 | 2 | 0 | 100.0% | 0.021s |
| **Repo 8** | `repo8_go_microservice` | Go Microservice (Method-Sets) | 3 | 48 | 2 | 2 | 0 | 100.0% | 0.015s |
| **Repo 9** | `repo9_python_monolith` | Python Modular Monolith | 4 | 38 | 1 | 1 | 0 | 100.0% | 0.012s |
| **Total** | **All 9 Benchmark Suites** | **Polyglot & Heterogeneous** | **43** | **568** | **30** | **29** | **1** | **96.7%** | **0.024s avg** |

> **Evaluation Distinction Notice:** These results represent evaluation against controlled synthetic benchmark suites with known ground truth defect matrices. On complex real-world codebases, detection performance varies depending on framework metaprogramming, reflection, and language support tiers.

---

## 3. False-Positive Trap Rejection Analysis

All benchmark suites include deliberately placed traps designed to cause naive scanners to report false positives. The table below documents the observed behavior of TraceGuard's false-positive validation stage:

| Benchmark | Trap Description | Expected Behavior | Observed Result | Status |
| :--- | :--- | :--- | :--- | :---: |
| **Repo 1** | Parameterized query `cursor.execute("... ?", (id,))` in `billing.py` | Must NOT be flagged as SQL injection | Correctly recognized parameterized query | **PASS** |
| **Repo 1** | External URL `fetch('https://api.stripe.com/v1/tokens')` | Must NOT be flagged as missing backend route | Identified as external origin URL | **PASS** |
| **Repo 1** | Documentation comment with "todo list" in `README.md` | Must NOT be flagged as actionable developer TODO | Filtered out non-actionable documentation prose | **PASS** |
| **Repo 2** | Parameterized subprocess `subprocess.run(["tar", "-xzf", ...])` | Must NOT be flagged as command injection | Verified `shell=False` and list arguments | **PASS** |
| **Repo 2** | Concrete type `PrometheusMetrics` satisfying `MetricsProvider` | Must NOT be flagged as unimplemented interface | Verified pointer receiver method set satisfaction | **PASS** |
| **Repo 2** | `DB_HOST` and `DB_PORT` declared in `.env.example` | Must NOT be flagged as unconfigured env vars | Cross-referenced declared environment variables | **PASS** |
| **Repo 3** | Parameterized query using `pool.query($1, [val])` in Node gateway | Must NOT be flagged as injection | Verified parameterized query placeholder syntax | **PASS** |
| **Repo 4** | Safe parameterized INSERT in `create_task` | Must NOT be flagged as SQL injection | Recognized parameterized arguments `(title, False)` | **PASS** |
| **Repo 6** | Standard Express middleware `app.use(express.json())` | Must NOT be flagged as dangerous evaluation | Verified standard request parsing middleware | **PASS** |
| **Repo 8** | Concrete type `RedisCache` satisfying `CacheProvider` | Must NOT be flagged as unimplemented interface | Verified pointer receiver methods `Get` and `Set` | **PASS** |

---

## 4. Architectural Comparison with Existing Static Analysis Tools

| Capability | Traditional Linters (ESLint, Flake8) | AST Security Scanners (Semgrep, Bandit) | LLM-Only Code Reviewers | **TraceGuard** |
| :--- | :---: | :---: | :---: | :---: |
| **Cross-File Route Gap Detection** | ❌ None | ❌ Inflexible across languages | ⚠️ Hallucination prone | ✅ **Full Support (Negative-Space)** |
| **Model vs. Migration Consistency** | ❌ None | ❌ None | ⚠️ High false positives | ✅ **Full Support (ERCG)** |
| **Implicit Interface Satisfaction (Go)** | ❌ None | ⚠️ Partial (single file) | ⚠️ Unreliable | ✅ **Full Support (Method-Set Analysis)** |
| **Change-Aware Finding Lifecycle** | ❌ None | ⚠️ Requires external SaaS | ❌ None | ✅ **Full Support (SQLite Persistence)** |
| **Zero-Configuration Polyglot Auditing** | ❌ Separate rulesets | ⚠️ Heavy YAML configuration | ⚠️ Token costs & rate limits | ✅ **Full Support (Zero-Config)** |
| **Deterministic Counterevidence Logging** | ❌ None | ⚠️ Partial | ❌ None | ✅ **Full Support (Audited in Finding)** |
| **Execution Performance** | Fast (<0.5s) | Fast (1–5s) | Very Slow (10–60s) | **Ultra Fast (<0.06s per repo)** |

---

## 5. Known Limitations & Engineering Scope

1. **Dynamic Metaprogramming**: Server endpoints constructed via dynamic reflection or dictionary dispatch loops (e.g., `setattr(router, method_name, handler)`) cannot be statically resolved and are marked with `EdgeResolution.UNRESOLVED`.
2. **Multi-Repository Federation**: TraceGuard currently analyzes single repositories and monorepos. Multi-repository distributed microservice contract validation requires federated OpenAPI schema resolution.
3. **Language Depth Variation**: Deep semantic and AST call-graph extraction is provided for Python and Go (Tree-sitter). JavaScript/TypeScript uses structural regex and template literal parsing, while less common languages rely on lexical degradation.
