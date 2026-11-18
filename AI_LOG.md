# AI Engineering Log (`AI_LOG.md`)

This document records the AI-assisted engineering, architecture design, verification, and UI/UX refinement workflow for **TraceGuard**.

---

## 1. Project Goal & Scope
- **Objective**: Build a lightweight, architecture-agnostic software engineering agent for **security vulnerabilities**, **code slop**, **coding gaps (negative-space omissions)**, and **loose ends** across polyglot codebases.
- **Safety Constraint**: 100% read-only target inspection, automatic credential redaction, and sandbox path validation.

## 2. AI-Assisted Development Milestones

### Milestone 1: Core Architecture & Multi-Tier Parsing Engine
- Designed the decoupled **14-stage `AuditPipeline`** (`traceguard/pipeline.py`) shared by both the CLI and FastAPI REST API.
- Implemented the **Evidence-Linked Repository Consistency Graph (ERCG)** (`traceguard/core/graph.py`) on NetworkX `MultiDiGraph`.
- Built multi-tier language adapters (`traceguard/adapters/`):
  - `python_adapter.py`: Python `ast` extraction for routes, functions, classes, SQL/exec sinks, and swallowed exceptions.
  - `go_adapter.py`: `tree-sitter-go` method-set extraction with pointer vs. value receiver implicit interface satisfaction.
  - `javascript_adapter.py`: Express/Next.js routes and `fetch`/`axios` client call extraction.
  - `config_adapter.py`, `doc_adapter.py`, `generic_adapter.py`: `.env`/YAML/JSON/TOML, Markdown/OpenAPI specs, and lexical fallback.

### Milestone 2: Four Specialized Analysis Engines & Validation
- **Security Engine** (`traceguard/engines/security.py`): Secret exposure with `AuditContext.mask_secret`, SQL/command injection, unsafe deserialization, weak crypto, path traversal, insecure configs, ERCG-correlated broken access control, and dependency CVE checks.
- **Code Slop Engine** (`traceguard/engines/slop.py`): Blind exception suppression, unreachable/dead code, redundant pass-through wrappers, deep nesting ($\ge 5$ levels), empty stubs, duplicate implementations, and unused imports.
- **Coding Gap Engine** (`traceguard/engines/gap.py`): Negative-space detection for missing backend routes, undelivered documented endpoints, unimplemented interfaces, ORM models missing migrations, mock/placeholder endpoints, and unhandled critical operations.
- **Loose End Engine** (`traceguard/engines/loose_end.py`): Actionable `TODO`/`FIXME`/`HACK`/`XXX` markers, debug artifacts, commented-out code blocks, unconfigured environment variables, and untested API routes.
- **False-Positive Validator & Incremental Lifecycle** (`traceguard/correlation/validator.py`, `traceguard/incremental.py`, `traceguard/storage/db.py`): Counterevidence tracking, SHA-256 file hashing, and SQLite persistence (`NEW`, `EXISTING`, `RESOLVED`, `REINTRODUCED`).

### Milestone 3: Frontend Web Studio & Graph Architecture Visualization
- Built and restructured the **React 18 + TypeScript** dashboard (`frontend/src/`) with:
  - Unified floating navigation (`CyberHeader.tsx`) and editorial landing page (`LandingHero.tsx`).
  - **Audit Workspace** (`AuditWorkspace.tsx`) with 9 polyglot benchmark suites and custom repository mount path.
  - **2D Graph Architecture** (`ArchitectureGraph2D.tsx`) using a deterministic stratified column layout with zero overlapping nodes/labels and **3D Graph Architecture** (`ConsistencyGraph3D.tsx`) using Three.js WebGL.
  - **Integrity Radar** (`IntegrityScoreRadar.tsx`), **Findings Explorer** (`FindingsExplorer.tsx`), **Negative-Space View** (`NegativeSpaceView.tsx`), **On-Disk Source Evidence Modal** (`FindingEvidenceModal.tsx`), **Report Exports** (`ReportsExportView.tsx`), and **Audit History & Delta Comparison** (`AuditHistory.tsx`).

### Milestone 4: Verification, Benchmarks & Documentation
- Verified **62/62 automated tests passing** (`python -m pytest tests/ -v`) across all 9 benchmark repositories, false-positive trap rejection, Go interface satisfaction, incremental lifecycle, scoring, and API security.
- Verified production frontend build (`npm run build`: `tsc --noEmit && vite build`).
- Captured 9 live UI screenshots via headless Chromium (`docs/screenshots/`) and updated `README.md` with badges, Mermaid architecture & pipeline diagrams, and product showcase.
