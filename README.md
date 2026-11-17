# TRACEGUARD: Architecture-Agnostic Repository Integrity Agent

[![Python 3.11+](https://img.shields.io/badge/python-3.11+-blue.svg)](https://www.python.org/downloads/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-green.svg)](https://fastapi.tiangolo.com)
[![React 18](https://img.shields.io/badge/React-18.2+-61dafb.svg)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178c6.svg)](https://www.typescriptlang.org)
[![Tree-sitter](https://img.shields.io/badge/Tree--sitter-0.20+-orange.svg)](https://tree-sitter.github.io/tree-sitter/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Tests: 57 Passing](https://img.shields.io/badge/tests-57%20passed-brightgreen.svg)]()

> **TraceGuard** is a lightweight, intelligent, architecture-agnostic software engineering agent that detects security vulnerabilities, code slop, coding gaps, and loose ends across heterogeneous codebases using an **Evidence-Linked Repository Consistency Graph (ERCG)** and **Negative-Space Analysis**.

---

## ⚡ Core Capabilities & Architecture

- **Architecture-Agnostic Analysis**: Audits polyglot codebases without assumptions about directory conventions or application framework styles.
- **Evidence-Linked Repository Consistency Graph (ERCG)**: Graph representation mapping relationships between files, functions, API routes, client network calls, configurations, data models, schema migrations, and tests.
- **Negative-Space Analysis Protocol**: Identifies critical omissions that single-file linters cannot detect (e.g., client API invocations with missing server-side route handlers, declared models lacking database migrations, unimplemented interfaces, or unprotected sensitive endpoints).
- **Go Implicit Interface Satisfaction**: Deep method-set analysis via Tree-sitter Go to verify concrete type satisfaction with pointer vs. value receiver semantics without requiring explicit implementation declarations.
- **Change-Aware Incremental Auditing**: File-level SHA-256 hash tracking detecting modified, added, and deleted files, with finding lifecycle state transitions (`NEW`, `EXISTING`, `RESOLVED`, `REINTRODUCED`, `ACCEPTED_RISK`).
- **4-Dimensional Integrity Scoring**: Independent evaluation across **Security Risk (40%)**, **Implementation Completeness (30%)**, **Code Quality (20%)**, and **Development Hygiene (10%)** with heuristic disclaimers and evidence sufficiency safeguards.
- **Multi-Interface Deployment**: Shared core analysis engine supporting both a command-line interface (CLI) and an asynchronous **FastAPI REST API** with a **React + TypeScript web dashboard**.
- **100% Read-Only Safety**: Strictly non-destructive execution with sandbox containment and automatic secret redaction.

---

## 🛠️ Technology Stack

| Layer | Technologies | Purpose |
| :--- | :--- | :--- |
| **Core Analysis Engine** | Python 3.11+, NetworkX, Pydantic v2 | Graph indexing, negative-space reasoning, 4 engines, scoring |
| **Language Parsing** | Python `ast`, `tree-sitter`, `tree-sitter-go` | Deep AST parsing, Go method-set extraction, lexical fallback |
| **Persistence** | SQLite (`traceguard.db`) | Audit history, file hash state tracking, finding lifecycle persistence |
| **Application Backend** | FastAPI, Uvicorn | REST API, background audit task execution, path traversal guards |
| **User Interface** | React 18, TypeScript | Web dashboard, 4D scorecards, finding provenance viewer, filters |
| **CLI & Reporting** | Rich, Jinja2 / HTML templates | Console dashboards, JSON, Markdown, and self-contained HTML reports |

---

## 🚀 Getting Started

### 1. Installation

```bash
# Clone repository
git clone https://github.com/NikithaKunapareddy/TRACEGUARD.git
cd TRACEGUARD

# Install Python backend dependencies in editable mode
python -m pip install -e ".[dev]"
```

### 2. Command-Line Interface (CLI)

```bash
# Audit current repository
traceguard audit .

# Audit an external repository and generate Markdown report
traceguard audit ./benchmark_repos/repo1_ecommerce_fullstack --format markdown --output ./report.md

# Generate self-contained interactive HTML dashboard
traceguard audit ./benchmark_repos/repo1_ecommerce_fullstack --format html --output ./dashboard.html

# Export structured JSON for CI/CD gates
traceguard audit ./benchmark_repos/repo1_ecommerce_fullstack --format json --output ./audit.json

# Filter audit by category or minimum severity
traceguard audit . --category security --severity high
```

### 3. FastAPI REST API & Web Dashboard

#### Start the Backend API
```bash
python -m uvicorn traceguard.api.app:app --host 0.0.0.0 --port 8000 --reload
```
Interactive API documentation is available at `http://localhost:8000/api/docs`.

#### API Endpoints
- `GET  /api/v1/health`: Health status.
- `POST /api/v1/audits`: Enqueue repository audit (with path traversal security checks).
- `GET  /api/v1/audits/{id}`: Query audit execution status, score, and summary.
- `GET  /api/v1/audits/{id}/findings`: Paginated findings with category & severity filtering.
- `GET  /api/v1/audits/{id}/graph`: Graph structural metrics and relationship coverage.
- `GET  /api/v1/audits/{id}/report`: Full report export in `json`, `markdown`, or `html`.

#### Launch the React Frontend
```bash
cd frontend
npm install
npm start
```
The dashboard will open at `http://localhost:3000`.

---

## 📊 Benchmark Evaluation Across 9 Repositories

TraceGuard includes nine controlled benchmark repositories designed to evaluate detection capabilities across varied architectures, languages, and deliberate false-positive traps:

| Suite | Target Repository | Architecture & Tech Stack | Known Defects | Detected (TP) | False Negatives | Recall | Exec Time |
| :---: | :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| **Repo 1** | `repo1_ecommerce_fullstack` | Full-Stack FastAPI + React/TS + SQLite | 9 | 8 | 1 | 88.9% | 0.055s |
| **Repo 2** | `repo2_cloud_microservice` | Go Daemon + Python CLI | 5 | 5 | 0 | 100.0% | 0.032s |
| **Repo 3** | `repo3_polyglot_fintech` | Node.js Express Gateway + Python Analytics | 3 | 3 | 0 | 100.0% | 0.018s |
| **Repo 4** | `repo4_fastapi_react` | FastAPI + React Task Manager | 3 | 3 | 0 | 100.0% | 0.025s |
| **Repo 5** | `repo5_fastapi_only` | FastAPI Analytics Service | 2 | 2 | 0 | 100.0% | 0.017s |
| **Repo 6** | `repo6_node_express` | Node.js Express Application | 3 | 3 | 0 | 100.0% | 0.018s |
| **Repo 7** | `repo7_python_worker` | Python Worker Queue (Celery/RQ style) | 2 | 2 | 0 | 100.0% | 0.021s |
| **Repo 8** | `repo8_go_microservice` | Go Microservice (Implicit Interfaces) | 2 | 2 | 0 | 100.0% | 0.015s |
| **Repo 9** | `repo9_python_monolith` | Python Modular Monolith | 1 | 1 | 0 | 100.0% | 0.012s |
| **Total** | **All 9 Benchmark Suites** | **Polyglot & Heterogeneous** | **30** | **29** | **1** | **96.7%** | **0.024s avg** |

> **Evaluation Methodology Notice:** Synthetic benchmarks provide reproducible defect detection controls and trap validation. Real-world codebases with high dynamic metaprogramming or unsupported languages will experience reduced analysis depth according to the language support tier.

---

## 🌐 Language Support Tiers & Analysis Depth

TraceGuard applies tiered structural adapters with graceful degradation:

| Tier | Languages | Parser Mechanism | Capabilities |
| :--- | :--- | :--- | :--- |
| **Deep AST** | Python (`.py`) | Python `ast` module | Full call graph, classes, functions, decorators, async handlers, route extraction, SQL/exec sinks, imports |
| **Tree-sitter AST** | Go (`.go`) | `tree-sitter-go` grammar | Interface method extraction, struct declarations, pointer vs. value receiver method sets, implicit satisfaction |
| **Structural Lexical** | JavaScript, TypeScript (`.js`, `.jsx`, `.ts`, `.tsx`) | Regex + Template parser | Route declarations (Express, Next.js), client fetch/axios calls, template literal URLs, export bindings |
| **Configuration** | `.env`, YAML, JSON, TOML | Standard schema parsers | Environment key definitions, configuration references, secret detection |
| **Documentation** | Markdown (`.md`), OpenAPI | Markdown structural parser | Declared API specifications, documented endpoint route matching |
| **Graceful Degradation** | Java, C#, C/C++, Rust, Ruby, PHP, Shell | Lexical fallback parser | Module, function, and class declarations, URL routes, secrets |

---

## 🧪 Automated Test Suite

TraceGuard includes 57 automated tests covering all components:

```bash
python -m pytest tests/ -v
```

- `tests/test_adapters.py`: Language parser and metadata extraction (3 tests).
- `tests/test_api.py`: FastAPI endpoints, validation, and traversal protection (5 tests).
- `tests/test_benchmarks.py`: Core benchmark suites 1–3 (3 tests).
- `tests/test_benchmarks_expanded.py`: Benchmark suites 4–9 (6 tests).
- `tests/test_false_positives.py`: Trap rejection across benchmarks (4 tests).
- `tests/test_go_interface_analysis.py`: Implicit method-set interface satisfaction (10 tests).
- `tests/test_graph.py`: ERCG indexing, route normalization, reachability (3 tests).
- `tests/test_incremental.py`: File hash diffing and finding lifecycle tracking (6 tests).
- `tests/test_read_only_safety.py`: Read-only execution verification (1 test).
- `tests/test_scoring.py`: 4D integrity scoring formula and sufficiency guards (13 tests).
- `tests/test_security_calibration.py`: Contextual severity and confidence separation (3 tests).

---

## 🔒 Safety, Security & Disclaimer

1. **Non-Destructive Guarantee**: TraceGuard runs strictly in read-only mode and never creates, modifies, or deletes files in target codebases.
2. **Credential Redaction**: High-entropy API tokens, AWS keys, and private keys are masked across all outputs (`AKIA************1234`).
3. **Sandbox Path Validation**: FastAPI endpoints reject relative path traversals and block requests targeting protected system directories.
4. **Heuristic Assessment Disclaimer**: TraceGuard integrity scores are heuristic engineering quality indicators derived from static repository analysis. They do **not** constitute an official security certification, penetration test, or compliance guarantee.
