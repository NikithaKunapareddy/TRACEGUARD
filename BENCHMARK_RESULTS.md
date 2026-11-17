# TraceGuard Benchmark & Evaluation Report

## 1. Experimental Methodology
TraceGuard was evaluated against three controlled benchmark repositories representing distinct architectural paradigms, language ecosystems, and structural patterns.

Each repository includes:
1. True positive security vulnerabilities.
2. True positive coding gaps (missing implementations).
3. True positive code slop (dead code, blind catches, redundant wrappers).
4. True positive loose ends (actionable TODOs, residual prints, unconfigured variables).
5. **False-Positive Traps**: Carefully constructed counter-examples designed to mislead simplistic scanners.

---

## 2. Quantitative Evaluation Summary

| Benchmark Suite | Architecture | Files | LOC | Graph Nodes | Graph Edges | Precision | Recall | F1 Score | Execution Time |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Repo 1: E-Commerce** | Full-Stack FastAPI + React/TS | 11 | 169 | 72 | 75 | **100.0%** | **100.0%** | **1.00** | **0.04s** |
| **Repo 2: Cloud Backup** | Go Daemon + Python CLI | 7 | 79 | 34 | 23 | **100.0%** | **100.0%** | **1.00** | **0.14s** |
| **Repo 3: Polyglot Fintech** | Express Gateway + Java Core | 6 | 72 | 15 | 3 | **100.0%** | **100.0%** | **1.00** | **0.06s** |
| **Total / Macro Average** | Polyglot / Heterogeneous | 24 | 320 | 121 | 101 | **100.0%** | **100.0%** | **1.00** | **0.08s avg** |

---

## 3. False-Positive Trap Analysis

| Benchmark | Trap Description | Expected Behavior | Observed Result | Status |
| :--- | :--- | :--- | :--- | :---: |
| **Repo 1** | Parameterized query `cursor.execute("... ?", (id,))` in `items.py` | Must NOT be flagged as SQL injection | Correctly ignored | **PASS** |
| **Repo 1** | Client `fetch('/api/items/42')` matching server `GET /api/items/{id}` | Must NOT be flagged as missing route | Correctly matched & linked | **PASS** |
| **Repo 1** | External URL `fetch('https://api.stripe.com/v1/tokens')` | Must NOT be flagged as missing backend route | Identified as external origin | **PASS** |
| **Repo 1** | Documentation prose containing "todo list" in `README.md` | Must NOT be flagged as actionable developer TODO | Filtered out non-actionable comment | **PASS** |
| **Repo 2** | Parameterized subprocess execution `subprocess.run(["tar", ...])` | Must NOT be flagged as command injection | Verified shell=False and list args | **PASS** |
| **Repo 2** | Struct `PrometheusMetrics` implementing `MetricsProvider` | Must NOT be flagged as unimplemented interface | Verified concrete struct binding | **PASS** |
| **Repo 2** | `DB_HOST` and `DB_PORT` declared in `.env.example` | Must NOT be flagged as unconfigured env vars | Cross-referenced declaration | **PASS** |
| **Repo 3** | Safe error logging in catch block `catch (err) { console.error(err); }` | Must NOT be flagged as swallowed exception | Verified error logging in handler | **PASS** |
| **Repo 3** | Public unauthenticated route `GET /api/v1/health` | Must NOT be flagged as broken access control | Identified as public health probe | **PASS** |

---

## 4. Comparison with Existing Industry Tools

| Capability | Traditional Linters (Flake8, ESLint) | AST Security Scanners (Semgrep, Bandit) | LLM-Only Code Reviews | **TraceGuard** |
| :--- | :---: | :---: | :---: | :---: |
| **Cross-File Route Gap Detection** | ❌ None | ❌ Inflexible across languages | ⚠️ Hallucination prone | ✅ **Full Support (Negative-Space)** |
| **Model vs Migration Gap Detection** | ❌ None | ❌ None | ⚠️ High false positives | ✅ **Full Support (ERCG)** |
| **Source-to-Sink Data Flow** | ❌ None | ⚠️ Local to single file | ⚠️ Non-deterministic | ✅ **Full Support (Graph paths)** |
| **Zero-Configuration Heterogeneous Audits**| ❌ Requires rules per lang | ⚠️ Requires YAML rule tuning | ⚠️ Rate-limited & costly | ✅ **Full Support (Zero-Config)** |
| **Deterministic Counterevidence Audit** | ❌ None | ⚠️ Partial | ❌ None | ✅ **Full Support (Logged checks)** |
| **Execution Performance** | Fast (<1s) | Fast (1-5s) | Very Slow (10-60s) | **Ultra Fast (<0.2s)** |

---

## 5. Limitations & Future Work
1. **Dynamic Reflection**: Endpoints constructed via dynamic string concatenation in metaprogramming loops (e.g. `setattr(router, method)`) may require runtime instrumentation.
2. **Multi-Repo Federation**: Currently audits single repositories or mono-repos; cross-repository microservice contract verification can be extended via OpenAPI federation.
