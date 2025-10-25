# Implementation Plan: MarkRead – Viewer MVP

**Branch**: `001-markdown-viewer` | **Date**: 2025-10-25 | **Spec**: specs/001-markdown-viewer/spec.md
**Input**: Feature specification from `/specs/001-markdown-viewer/spec.md`

## Summary

Viewer-only Windows desktop app to render and navigate Markdown within a selected folder. Key behaviors: safe sanitized rendering (code, checklists, images, mermaid), file tree, tabs, per‑tab history, in‑document search, themes, and auto‑reload. Startup supports: `markview <folderOrFile>` (file sets root to its parent), or prompt to pick a folder on first launch without a root.

## Technical Context

**Language/Version**: .NET 8 (C#)  
**Primary Dependencies**: WPF + WebView2; Markdig (optional if server‑side rendering), Prism/Highlight.js + Mermaid (front-end assets)  
**Storage**: Local filesystem only (no DB)  
**Testing**: xUnit/NUnit for core services; WinAppDriver/Playwright (optional) for UI smoke  
**Target Platform**: Windows 10/11 desktop  
**Project Type**: Single desktop app (WPF) with embedded web content for rendering  
**Performance Goals**: Startup to first render < 5s; search highlight < 1s on 1MB docs  
**Constraints**: Offline-capable; no telemetry; sanitized HTML; small footprint; responsive UI  
**Scale/Scope**: Single-user, single-instance; typical project folders up to tens of thousands of small files

Assumptions derived from spec: No external services; all rendering assets bundled; navigation constrained to chosen root.

## Constitution Check

Gate alignment with MarkRead Constitution (v1.0.0):

- I. Code Quality: Plan favors simple, maintainable services (file tree, renderer, history) and minimal testing focused on core flows → PASS
- II. UX Consistency: Clear error messages (invalid paths, blocked links), consistent shortcuts and themes → PASS
- III. Documentation Standard: Spec + plan + quickstart; avoid over‑documentation → PASS
- IV. Performance Requirements: Startup <5s; responsive rendering and search; auto‑reload debounce → PASS

No violations requiring Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)
<!--
  ACTION REQUIRED: Replace the placeholder tree below with the concrete layout
  for this feature. Delete unused options and expand the chosen structure with
  real paths (e.g., apps/admin, packages/something). The delivered plan must
  not include Option labels.
-->

```text
src/
├── App/                  # WPF app (shell, DI, theming, shortcuts)
├── Rendering/            # WebView2 host, HTML template, assets (highlight.js, mermaid)
├── Services/             # File system, markdown pipeline, link resolution, history
├── UI/                   # Views (Tabs, Sidebar, Find), ViewModels
└── Cli/                  # Entry parsing for folder/file startup

tests/
├── unit/                 # Services tests (link resolution, settings, history)
└── integration/          # Startup + basic render smoke
```

**Structure Decision**: Single WPF desktop app with WebView2 for Markdown rendering; services isolate IO and state from UI; assets bundled for offline use.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |

## Post-design Constitution Re-check

Re-evaluated after Phase 1 artifacts (research, data model, contracts, quickstart):

- I. Code Quality: Simple services and minimal test focus remain appropriate → PASS
- II. UX Consistency: Startup flows, link handling, themes consistent with spec → PASS
- III. Documentation Standard: Spec + plan + quickstart present and current → PASS
- IV. Performance Requirements: Targets and constraints unchanged and feasible → PASS

No complexity justifications required.
