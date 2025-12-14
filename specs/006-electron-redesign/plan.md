# Implementation Plan: Electron-Based Application Redesign

**Branch**: `006-electron-redesign` | **Date**: 2025-12-14 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/006-electron-redesign/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Redesign MarkRead as an Electron-based desktop application with VS Code-like features including single-window + tabs + multi-pane layout, full keyboard model, filesystem watching, native menus, and offline-first approach. The application will target Windows 10/11 desktop users with a focus on rich markdown rendering (GitHub Flavored Markdown, syntax highlighting with Highlight.js, Mermaid diagrams), smooth navigation (zoom up to 2000%, 60 FPS scrolling, pan), multi-folder workspaces, comprehensive keyboard shortcuts, and a settings system with live preview.

## Technical Context

**Language/Version**: JavaScript/TypeScript with Node.js (Electron framework - specific version NEEDS CLARIFICATION)
**Primary Dependencies**: Electron (main framework), markdown-it (markdown parsing), Highlight.js (syntax highlighting with automatic language detection), Mermaid.js (diagram rendering), NEEDS CLARIFICATION for file watching library (chokidar or similar)
**Storage**: Local JSON files for settings (%APPDATA%/MarkRead/settings.json, theme-settings.json, ui-state.json, animation-settings.json) + per-folder .markread.json overrides
**Testing**: Use Playwright for Electron testing
**Target Platform**: Windows 10 (version 1809+) and Windows 11 desktop, initially; cross-platform expansion potential (macOS, Linux) deferred
**Project Type**: Desktop (Electron) with main process (Node.js) and renderer process (Chromium)
**Performance Goals**:
- Render complex markdown (10+ code blocks, 5+ diagrams, 20+ images) within 500ms
- Maintain 60 FPS (< 16ms frame time) during scrolling for documents up to 10,000 lines
- Tab switching < 100ms for up to 20 tabs
- Application launch < 2 seconds (cold start)
- Zoom operations (10%-2000% range) < 50ms
- Settings UI load < 200ms, live preview updates < 100ms

**Constraints**:
- Bundle size < 150MB (installer)
- Memory footprint < 300MB with 20 tabs open
- Startup time < 2 seconds
- Scrolling/interactions maintain 60 FPS on mid-range hardware (Intel i5-8250U equivalent)
- No admin privileges required for installation
- Offline-first (no internet connectivity requirements)
- WCAG AA accessibility baseline (4.5:1 contrast, keyboard navigable)

**Scale/Scope**:
- Single-window with multi-folder workspaces
- Soft tab limit: 20 tabs (warning), hard limit: 50 tabs
- File tree virtualization activates at 1000+ files
- Cross-file search handles large folder trees (10,000+ files) asynchronously
- 190+ language support for syntax highlighting
- 80+ keyboard shortcuts across 6+ categories

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Initial Check**: ✅ PASS (completed before Phase 0)
**Post-Design Re-evaluation**: ✅ PASS (completed after Phase 1)

### I. Code Quality ✅ PASS

**Requirement**: Code should be maintainable, well-structured, tested for critical functionality, linted, and documented.

**Feature Alignment**:
- Electron + TypeScript enables strong typing and modern tooling
- ESLint and Prettier integration standard for Electron projects
- Critical paths identified: markdown rendering, file watching, settings persistence, tab management
- Testing framework Playwright
- Complex algorithms (virtualization, debouncing, zoom transforms) will be documented inline

**Gate Status**: PASS - Feature design supports code quality principles with TypeScript, modern tooling, and test coverage for core functionality.

---

### II. User Experience Consistency ✅ PASS

**Requirement**: Application should behave consistently with clear error messages, consistent UI patterns, and easy-to-find settings.

**Feature Alignment**:
- Spec emphasizes VS Code-like patterns for familiarity (FR-011: keyboard shortcuts, FR-009: command palette)
- Comprehensive settings UI with organized categories (FR-054: Appearance, Behavior, Search, Performance, Keyboard)
- Error handling defined for edge cases (file deleted while open, corrupted settings, circular symlinks)
- Native Windows conventions for menus and window management (FR-026, FR-027)
- Theme consistency across all UI elements (FR-032: 200ms theme application)

**Gate Status**: PASS - Feature specification prioritizes UX consistency as core design principle with explicit patterns, error handling, and discoverability.

---

### III. Documentation Standard ✅ PASS

**Requirement**: Include README, document non-obvious decisions, keep documentation simple and up-to-date.

**Feature Alignment**:
- Help system requirements (FR-080-087: keyboard shortcuts window, command palette with tooltips, Help menu, context-sensitive help)
- Settings documentation via UI tooltips and help links (FR-084)
- User guide and migration guide required before release (Constraints: Documentation Completeness)
- Technical documentation for complex decisions (virtualization threshold, debounce timings) to be captured in research.md and data-model.md

**Gate Status**: PASS - Feature includes comprehensive help system and documentation requirements aligned with standard.

---

### IV. Performance Requirements ✅ PASS

**Requirement**: Application should start quickly (<5s), be responsive, use reasonable memory, and profile heavy operations.

**Feature Alignment**:
- Startup time: 2 seconds (< 5 second guideline) ✓
- UI responsiveness: 60 FPS scrolling, <100ms actions ✓
- Memory usage: 300MB with 20 tabs (reasonable for desktop app) ✓
- Heavy operations profiled: file tree virtualization (1000+ files), cross-file search (async with progress), markdown rendering (500ms for complex docs)

**Gate Status**: PASS - Feature exceeds constitution performance requirements with explicit performance goals and profiling strategy for heavy operations.

---

**Overall Constitution Check**: ✅ **PASS**

All four core principles are satisfied. No violations require justification. Feature design aligns with solo development guidelines emphasizing maintainability, consistency, documentation, and performance.

**Post-Design Re-evaluation (After Phase 1)**:

After completing research.md, data-model.md, API contracts, and quickstart.md, the constitution check remains **PASS** with additional confidence:

1. **Code Quality** - Research established TypeScript + ESLint + Prettier tooling, Playwright testing framework, and documented security patterns (context isolation, input validation with Zod)
2. **User Experience Consistency** - Data model defines clear entity relationships, API contracts enforce consistent IPC patterns, error handling documented in edge cases
3. **Documentation Standard** - quickstart.md provides developer onboarding, contracts/ directory documents all IPC APIs, research.md captures technical decisions
4. **Performance Requirements** - Bundle size projection (120-125MB < 150MB target), memory projections (200-250MB < 300MB target), virtual scrolling strategy at 1000+ files, debouncing intervals established

No new risks or violations identified. Ready for Phase 2: Implementation (via `/speckit.tasks` command).

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

```text
src/
├── main/                    # Main process (Node.js, Electron backend)
│   ├── index.ts            # Application entry point
│   ├── window-manager.ts   # Window lifecycle management
│   ├── menu-builder.ts     # Native menu construction
│   ├── file-watcher.ts     # Filesystem monitoring (chokidar)
│   ├── ipc-handlers.ts     # IPC communication handlers
│   └── settings-manager.ts # Settings persistence and validation
│
├── renderer/                # Renderer process (Chromium, UI)
│   ├── index.html          # Main window HTML entry
│   ├── App.tsx             # React root component
│   ├── components/         # UI components
│   │   ├── editor/         # Editor pane, tabs, split views
│   │   ├── sidebar/        # File tree, folder switcher
│   │   ├── command-palette/ # Command palette UI
│   │   ├── settings/       # Settings UI panels
│   │   └── markdown/       # Markdown renderer wrapper
│   ├── services/           # Renderer-side services
│   │   ├── markdown-renderer.ts  # markdown-it + Highlight.js + Mermaid
│   │   ├── theme-manager.ts      # Theme switching logic
│   │   ├── search-service.ts     # In-page and cross-file search
│   │   └── navigation-history.ts # Tab history management
│   └── styles/             # CSS/SCSS global styles and themes
│
├── shared/                  # Shared code (main + renderer)
│   ├── types/              # TypeScript interfaces and types
│   │   ├── settings.d.ts   # Settings schema types
│   │   ├── folder.d.ts     # Folder and tab types
│   │   └── commands.d.ts   # Command definitions
│   ├── constants.ts        # Shared constants (default settings, file patterns)
│   └── utils/              # Shared utility functions
│
├── preload/                 # Preload scripts (context bridge)
│   └── index.ts            # Expose IPC APIs to renderer
│
└── assets/                  # Static assets
    ├── icons/              # Application icons (Windows ICO, PNG)
    ├── themes/             # Theme JSON definitions
    └── docs/               # Bundled documentation

tests/
├── e2e/                     # End-to-end tests (Playwright)
│   ├── rendering.spec.ts   # Markdown rendering tests
│   ├── navigation.spec.ts  # Tab, pane, history tests
│   ├── settings.spec.ts    # Settings UI and persistence tests
│   └── search.spec.ts      # Search functionality tests
│
├── integration/             # Integration tests (cross-process)
│   ├── file-watcher.test.ts # File system integration
│   └── ipc.test.ts         # Main-renderer IPC tests
│
└── unit/                    # Unit tests (isolated functions)
    ├── main/               # Main process unit tests
    ├── renderer/           # Renderer process unit tests
    └── shared/             # Shared utilities unit tests

build/                       # Build configuration
├── electron-builder.yml    # Electron Builder config
├── notarize.js             # Code signing script (Windows)
└── installer.nsi           # NSIS installer script (optional)
```

**Structure Decision**: **Electron Desktop Application** (single project with main/renderer separation)

The structure follows Electron best practices with clear separation between main process (Node.js backend handling OS integration, file system, windows) and renderer process (Chromium frontend for UI). The `shared/` directory contains TypeScript types and utilities used by both processes. The `preload/` directory implements the context bridge for secure IPC communication between main and renderer.

This structure supports:
- TypeScript throughout (main, renderer, shared, preload)
- Component-based UI architecture using React 18 with TypeScript
- Service layer for markdown rendering, themes, search, and navigation
- Comprehensive testing at all levels (e2e, integration, unit)
- Build tooling for Windows installer generation and code signing

## Complexity Tracking

**No violations detected.** All constitution principles are satisfied without exceptions requiring justification.
