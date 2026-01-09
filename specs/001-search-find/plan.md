# Implementation Plan: Search and Find

**Branch**: `001-search-find` | **Date**: 2026-01-09 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-search-find/spec.md`

**Status**: ✅ Implementation Complete (Commit b6196da)

**Note**: This plan documents the technical approach for the search and find feature implementation.

## Summary

Implement comprehensive search functionality for the MarkRead electron application, including in-document search (CTRL+F) with real-time highlighting and navigation, plus cross-file search (SHIFT+CTRL+F) across markdown repositories. The feature provides regex support, case-sensitive matching, scrollbar markers for visual navigation, and session-based search history.

**Technical Approach**: Leverage React for UI components, Zustand for state management, IPC for cross-process communication between renderer (UI) and main process (file system operations), and markdown-it's existing parsing capabilities for text matching.

## Technical Context

**Language/Version**: TypeScript 5.7 with Node.js (Electron 33.4.11)
**Primary Dependencies**:
- React 18.3.1 (UI framework)
- Zustand 4.5.0 (state management)
- markdown-it 14.1.0 (markdown parsing)
- Vite 6.0.0 (build tool)
- electron-vite 5.0.0 (Electron + Vite integration)

**Storage**:
- electron-store 11.0.2 (persistent settings)
- In-memory storage for search history (session-only, no persistence)

**Testing**:
- Vitest 2.1.0 (unit tests)
- Playwright 1.49.0 (E2E tests)

**Target Platform**:
- Windows 10+ (primary)
- Cross-platform Electron desktop application

**Project Type**: Electron desktop application (main process + renderer process architecture)

**Performance Goals**:
- Search highlighting update < 200ms for documents up to 10,000 lines
- Multi-file search complete within 10 seconds for repositories with up to 1,000 markdown files
- Regex timeout protection at 5 seconds per file

**Constraints**:
- 150ms debounce delay for real-time search updates
- Maximum 1,000 highlights displayed simultaneously
- Regex validation to block dangerous patterns (catastrophic backtracking)
- Session-only search history (cleared on app close)

**Scale/Scope**:
- Support documents up to 10,000 lines efficiently
- Handle repositories with up to 1,000 markdown files
- Maintain search history up to 200 entries per session

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Code Quality (Principle I)
✅ **PASS** - Implementation follows Clean Architecture principles:
- Separation of concerns: search-service.ts (main process), search store (renderer state), FindBar/SearchResults (UI components)
- Clear interfaces for SearchOptions, SearchMatch, SearchResult
- Task references in code comments for traceability

### User Experience Consistency (Principle II)
✅ **PASS** - Standard keyboard shortcuts (CTRL+F, F3, SHIFT+F3, ESC) align with user expectations from text editors and browsers. Clear result counters ("N of M") and visual scrollbar markers provide consistent feedback patterns.

### Documentation Standard (Principle III)
✅ **PASS** - Feature has complete specification with user scenarios, functional requirements, and success criteria. Code includes inline task references for complex logic.

### Performance Requirements (Principle IV)
✅ **PASS** - Design includes:
- Debouncing (150ms) to prevent excessive re-renders
- Timeout protection (5 seconds) for regex execution
- Progress indicators for long-running cross-file searches
- Cancellation support for user control

**Re-check after Phase 1 Design**: ✅ All gates remain PASS. The design properly balances responsiveness (debouncing, async operations) with safety (regex validation, timeouts, cancellation).

## Project Structure

### Documentation (this feature)

```text
specs/001-search-find/
├── spec.md              # Feature specification with requirements and success criteria
├── plan.md              # This file - implementation plan and technical approach
├── research.md          # Phase 0 output - research findings and decisions
├── data-model.md        # Phase 1 output - entities and state management design
├── quickstart.md        # Phase 1 output - developer setup and usage guide
├── contracts/           # Phase 1 output - IPC API contracts
│   └── search-ipc.md    # IPC interface between renderer and main process
└── tasks.md             # Phase 2 output (created by /speckit.tasks command)
```

### Source Code (repository root)

```text
src/
├── main/                          # Electron main process
│   ├── index.ts                  # Main process entry point
│   ├── search-service.ts         # T170: Cross-file search implementation (FR-015 to FR-028)
│   ├── ipc/
│   │   └── search-handlers.ts    # IPC handlers for search operations
│   └── services/
│       └── regex-validator.ts    # FR-012: Safe regex pattern validation
│
├── renderer/                      # React renderer process
│   ├── App.tsx                   # Main application component
│   ├── components/
│   │   ├── search/
│   │   │   ├── FindBar.tsx       # T171: In-document search UI (FR-001 to FR-014)
│   │   │   ├── FindBar.css       # FindBar styling
│   │   │   ├── SearchResults.tsx # T173: Multi-file search results panel (FR-015 to FR-028)
│   │   │   └── SearchResults.css # SearchResults styling
│   │   ├── scrollbar/
│   │   │   └── CustomScrollbar.tsx # T174: Scrollbar markers for search (FR-008, FR-009)
│   │   └── markdown/
│   │       └── MarkdownViewer.tsx  # Integration point for search highlighting
│   │
│   ├── stores/
│   │   └── search.ts             # T172: Zustand store for search state and history (FR-032, FR-033)
│   │
│   ├── services/
│   │   ├── search-highlighter.ts # FR-003: Real-time text highlighting logic
│   │   └── keyboard-handler.ts   # FR-014: Search keyboard shortcuts
│   │
│   └── hooks/
│       ├── useSearch.ts          # React hook for search functionality
│       └── useSearchHistory.ts   # React hook for search history management
│
├── preload/
│   └── search-api.ts             # Preload script exposing search IPC to renderer
│
└── shared/
    └── types/
        └── search.ts             # Shared TypeScript interfaces for search

tests/
├── unit/
│   ├── main/
│   │   ├── search-service.test.ts      # Unit tests for search service
│   │   └── regex-validator.test.ts     # Unit tests for regex validation (FR-012)
│   └── renderer/
│       ├── components/
│       │   └── search/
│       │       ├── FindBar.test.tsx    # Unit tests for FindBar component
│       │       └── SearchResults.test.tsx # Unit tests for SearchResults
│       └── stores/
│           └── search.test.ts          # Unit tests for search store
│
├── integration/
│   ├── search-workflow.test.ts         # Integration tests for end-to-end search
│   └── ipc-communication.test.ts       # IPC communication tests
│
└── e2e/
    ├── in-document-search.spec.ts      # E2E tests for CTRL+F functionality
    └── cross-file-search.spec.ts       # E2E tests for SHIFT+CTRL+F functionality
```

**Structure Decision**: The project follows Electron's standard architecture with clear separation between main process (Node.js file system operations), renderer process (React UI), and preload scripts (secure IPC bridge). The search feature integrates into this existing structure by adding:
- A search service in the main process for file system scanning
- React components in the renderer for UI
- A Zustand store for state management
- IPC contracts for cross-process communication

This structure aligns with the existing MarkRead architecture (evident from existing git, markdown, and settings modules) and follows Electron security best practices (contextIsolation via preload scripts).

## Phase 0: Research Findings

**Status**: ✅ Complete

All research findings documented in [research.md](./research.md). Key decisions:

1. **Regex Validation Strategy**: Implement safe subset validation blocking dangerous constructs + 5-second timeout fallback
2. **File Type Filtering**: Default to markdown-only (.md, .markdown) with opt-in "All Text Files" expansion
3. **Debouncing Configuration**: 150ms delay for real-time search updates
4. **Search History Persistence**: Session-only (in-memory), cleared on app close

## Phase 1: Design & Contracts

**Status**: ✅ Complete

### Data Model
Complete entity definitions in [data-model.md](./data-model.md):
- `SearchQuery`: User search request with term, flags, file filters, and scope
- `SearchResult`: Individual match with position, context, and preview
- `SearchScope`: Repository/branch boundaries for multi-file search
- `SearchHistory`: Session-based collection of previous queries

### API Contracts
IPC interface specification in [contracts/search-ipc.md](./contracts/search-ipc.md):
- `search:in-document` - In-page search request/response
- `search:in-files` - Cross-file search with progress events
- `search:cancel` - Cancel active search operation
- `search:validate-regex` - Validate regex pattern safety

### Quickstart Guide
Developer setup and usage instructions in [quickstart.md](./quickstart.md)

## Implementation Status

### Phase 1: Foundation (Completed in 006-electron-redesign)

**Commit**: f1ad8c9 (Dec 2025) - "Implement FindBar and SearchResults components"

✅ **Components Created**:
- [FindBar.tsx](../../src/renderer/components/search/FindBar.tsx) - In-document search UI
- [SearchResults.tsx](../../src/renderer/components/search/SearchResults.tsx) - Multi-file search results panel
- [search-service.ts](../../src/main/search-service.ts) - Main process search backend
- [search.ts](../../src/renderer/stores/search.ts) - Zustand store for search state

✅ **Infrastructure**:
- Keyboard shortcuts registered (CTRL+F, SHIFT+CTRL+F, F3)
- Command service integration
- Search store with history management
- Menu items in Edit menu

### Phase 2: Current Status (INCOMPLETE)

**Commit**: b6196da (Jan 2026) - Created specification only, no code implementation

#### User Story 1: In-Document Search (CTRL+F) - ⚠️ PARTIAL
- ⚠️ FindBar component exists but NOT imported/rendered in AppLayout
- ⚠️ Keyboard shortcut registered but no handler to show FindBar
- ❌ Search highlighting not integrated into MarkdownViewer
- **Status**: Components built but not wired to UI

#### User Story 2: Visual Search Navigation - ❌ NOT IMPLEMENTED
- ❌ Scrollbar markers for search results not implemented
- ❌ CustomScrollbar integration missing
- **Status**: Not started

#### User Story 3: Advanced Search Options - ⚠️ PARTIAL
- ✅ Case sensitivity and regex toggles exist in FindBar component
- ✅ Regex validation service exists in search-service.ts
- ❌ Not accessible since FindBar not rendered
- **Status**: Backend ready, UI not integrated

#### User Story 4: Multi-File Search (SHIFT+CTRL+F) - ⚠️ PARTIAL
- ⚠️ SearchResults component exists but NOT imported/rendered in AppLayout
- ⚠️ Keyboard shortcut registered but no handler to show SearchResults panel
- ❌ No event listener for 'menu:find-in-files' event
- ❌ Panel toggle mechanism (FR-016: replace file tree) not implemented
- ❌ File opening from search results not wired up
- **Status**: Components built but not wired to UI - **THIS IS WHAT YOU REPORTED AS MISSING**

#### User Story 5: Search Scope Management - ❌ NOT IMPLEMENTED
- ❌ Multi-branch/multi-repo search not implemented
- ❌ Scope selector UI missing
- **Status**: Not started (P3 priority)

### What's Missing for Full Implementation

**Critical - Required for P1 User Stories (In-Document Search & Visual Navigation)**:
1. ❌ Import FindBar component into AppLayout.tsx
2. ❌ Add state for search bar visibility (isSearchBarVisible)
3. ❌ Create event listener for keyboard shortcut (CTRL+F)
4. ❌ Render FindBar overlay when search is active
5. ❌ Integrate text highlighting in MarkdownViewer component
6. ❌ Add scrollbar marker overlay to CustomScrollbar component
7. ❌ Wire up F3/SHIFT+F3 navigation between matches

**Important - Required for P2 User Stories (Multi-File Search)**:
8. ❌ Import SearchResults component into AppLayout.tsx
9. ❌ Add state for find-in-files panel visibility (isFindInFilesVisible)
10. ❌ Create event listener for 'menu:find-in-files' custom event
11. ❌ Toggle between FileTree and SearchResults in sidebar (FR-016)
12. ❌ Wire up IPC communication between renderer and main process
13. ❌ Connect search result clicks to file opening
14. ❌ Implement progress tracking UI for long-running searches
15. ❌ Add cancellation button and logic
16. ❌ Implement file type filter (markdown vs all text files)

**Nice to Have - P3 Features**:
17. ❌ Multi-branch search scope
18. ❌ Multi-repository search scope
19. ❌ Search history persistence (currently session-only)

### Success Criteria Validation

**Current Status**: Most success criteria CANNOT be validated because the UI integration is incomplete.

- **SC-001**: ❌ Search bar doesn't open (component not rendered)
- **SC-002**: ⚠️ Debouncing implemented in component but cannot be tested
- **SC-003**: ❌ Scrollbar markers not implemented
- **SC-004**: ⚠️ Case-sensitive and regex toggles exist but not accessible
- **SC-005**: ❌ Multi-file search not functional (UI not integrated)
- **SC-006**: ⚠️ Grouping logic exists in SearchResults component but not testable
- **SC-007**: ⚠️ Validation service exists but not connected to UI
- **SC-008**: ❌ Cancellation UI not integrated
- **SC-009**: ⚠️ Shortcuts registered but handlers don't show search UI
- **SC-010**: ⚠️ Result counting implemented in components but not visible to user

## Next Steps

### Immediate Actions Required

The feature is **INCOMPLETE**. The components were built in a previous feature (006-electron-redesign) but were never integrated into the main application UI.

**To complete this feature, you need to**:

1. **Run `/speckit.tasks`** to generate the complete task breakdown for integration work
2. **Prioritize integration tasks** for User Stories 1-4 (P1 and P2)
3. **Start with in-document search** (User Story 1) as it's the highest priority

### Recommended Implementation Order

```
Phase A: In-Document Search (US1) - ~3-5 hours
→ Integrate FindBar into AppLayout
→ Add text highlighting to MarkdownViewer
→ Connect keyboard shortcuts

Phase B: Visual Navigation (US2) - ~2-3 hours
→ Add scrollbar markers to CustomScrollbar
→ Implement click-to-navigate

Phase C: Multi-File Search (US4) - ~5-8 hours
→ Integrate SearchResults into AppLayout
→ Implement panel toggling (FileTree ↔ SearchResults)
→ Wire up IPC communication
→ Connect file opening from results

Phase D: Advanced Options (US3) - ~1-2 hours
→ Test regex validation
→ Add error messaging for invalid patterns

Phase E: Search Scope (US5) - Future/Optional
→ Only if multi-branch/multi-repo search is needed
```

### Commands

Generate task breakdown:
```bash
/speckit.tasks
```

Convert tasks to GitHub issues:
```bash
/speckit.taskstoissues
```
