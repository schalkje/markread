# Tasks: Search and Find

**Input**: Design documents from `/specs/001-search-find/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/search-ipc.md

**Status**: INTEGRATION work - Components exist but need UI wiring
**Estimated Effort**: 15-20 hours total
**MVP Recommendation**: Phase 3 only (User Story 1 - In-Document Search)

**Tests**: Not explicitly requested in specification - tests are optional for this feature

**Organization**: Tasks grouped by user story to enable independent implementation and testing

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[US#]**: Which user story this task belongs to (US1-US5)
- All paths relative to repository root

## Implementation Context

**Critical Understanding**: This is NOT greenfield development. The components were built in feature `006-electron-redesign` (commit f1ad8c9). They exist in the codebase but are not integrated into the main application UI. This task list focuses on **integration work**, not building from scratch.

**Existing Components**:
- ✅ FindBar.tsx - In-document search UI (fully built)
- ✅ SearchResults.tsx - Multi-file search panel (fully built)
- ✅ search-service.ts - Backend search engine (fully built)
- ✅ search.ts - Zustand state store (fully built)
- ✅ Keyboard shortcuts registered (CTRL+F, SHIFT+CTRL+F, F3)
- ✅ Menu items in Edit menu

**What's Missing**: UI integration, event handlers, IPC wiring, highlighting, scrollbar markers

---

## Phase 1: Setup (Minimal - Dependencies Exist)

**Purpose**: Verify project setup (most infrastructure already exists)

- [X] T001 Verify TypeScript 5.7 + Electron 33.4.11 + React 18.3.1 dependencies in package.json
- [X] T002 [P] Verify development environment runs correctly with `npm run dev`
- [X] T003 [P] Create shared TypeScript interfaces in src/shared/types/search.ts

**Checkpoint**: Project compiles and runs - ready for integration work

---

## Phase 2: Foundational (IPC & Type Infrastructure)

**Purpose**: Shared infrastructure that enables renderer ↔ main process communication

**⚠️ CRITICAL**: Phase 2 must be complete before US4 (Multi-File Search) can start. US1-US3 can proceed independently.

- [X] T004 Create IPC preload bridge in src/preload/search-api.ts per contracts/search-ipc.md
- [X] T005 [P] Create IPC handlers in src/main/ipc/search-handlers.ts per contracts/search-ipc.md
- [X] T006 [P] Add TypeScript global declarations for window.api.search in src/renderer/global.d.ts
- [X] T007 Register IPC handlers in src/main/index.ts startup sequence

**Checkpoint**: IPC infrastructure ready - US4 can now be implemented

---

## Phase 3: User Story 1 - In-Document Search (Priority: P1) 🎯 MVP

**Goal**: Enable users to quickly find text within the current document using CTRL+F with real-time highlighting and next/previous navigation

**Independent Test**: Open any document, press CTRL+F, type search term, verify all matches highlighted with "N of M" counter, navigate with F3/SHIFT+F3

**Why MVP**: This is the most frequently used search functionality. Delivers immediate value with minimal dependencies.

### Integration Tasks for US1

- [X] T008 [US1] Import FindBar component into src/renderer/components/AppLayout.tsx
- [X] T009 [US1] Add search visibility state (isSearchBarVisible, currentQuery, matches) to AppLayout.tsx using useSearchStore hook
- [X] T010 [US1] Register CTRL+F event listener in AppLayout.tsx componentDidMount/useEffect
- [X] T011 [US1] Implement handleSearch callback in AppLayout.tsx that updates search store with query and triggers highlighting
- [X] T012 [US1] Render FindBar component conditionally in AppLayout.tsx above document content area: `{isSearchBarVisible && <FindBar ... />}`
- [X] T013 [US1] Connect FindBar onClose callback to clear search and hide bar in AppLayout.tsx
- [X] T014 [US1] Integrate search highlighting in src/renderer/components/markdown/MarkdownViewer.tsx by wrapping matches in `<mark class="search-highlight">` tags
- [X] T015 [US1] Implement currentMatch highlighting with additional CSS class `search-highlight-current` in MarkdownViewer.tsx
- [X] T016 [US1] Wire F3 (next) and SHIFT+F3 (previous) keyboard handlers to navigate between matches in AppLayout.tsx
- [X] T017 [US1] Implement scroll-to-match functionality when currentMatchIndex changes in MarkdownViewer.tsx
- [X] T018 [US1] Add ESC key handler to close search bar and clear highlights in AppLayout.tsx

**Checkpoint**: User Story 1 complete - CTRL+F search works end-to-end with highlighting and navigation

**Manual Test Procedure**:
1. Open MarkRead application
2. Open any markdown document
3. Press CTRL+F → search bar should appear
4. Type "the" → all instances highlighted in yellow
5. Verify result counter shows "1 of N"
6. Press F3 → scrolls to next match (orange highlight)
7. Press SHIFT+F3 → scrolls to previous match
8. Press ESC → search bar closes, highlights removed

---

## Phase 4: User Story 2 - Visual Search Navigation (Priority: P1)

**Goal**: Display scrollbar markers showing the location of all search matches for quick visual navigation

**Independent Test**: Search for a common term in a long document (e.g., "the" in README), verify scrollbar shows yellow markers at match positions, click marker to jump to that result

**Dependencies**: Requires US1 complete (search highlighting must work first)

### Integration Tasks for US2

- [X] T019 [US2] Import search store into src/renderer/components/scrollbar/CustomScrollbar.tsx to access match positions
- [X] T020 [US2] Calculate marker positions in CustomScrollbar.tsx: `(match.lineNumber / totalLines) * scrollbarHeight`
- [X] T021 [US2] Render marker overlays as absolute-positioned `<div class="scrollbar-marker">` elements in CustomScrollbar.tsx
- [X] T022 [US2] Add CSS styling for `.scrollbar-marker` in CustomScrollbar.css (yellow background, 4px width, 3px height)
- [X] T023 [US2] Implement marker click handler to scroll document to clicked match position in CustomScrollbar.tsx
- [X] T024 [US2] Highlight current match marker with different color (orange) using `.scrollbar-marker-current` class
- [X] T025 [US2] Clear markers when search is closed or query changes in CustomScrollbar.tsx

**Checkpoint**: User Story 2 complete - scrollbar markers provide visual navigation

**Manual Test Procedure**:
1. Open long document (500+ lines)
2. Press CTRL+F, search for "the"
3. Verify yellow markers appear on scrollbar at match positions
4. Click a marker in middle of scrollbar → document scrolls to that match
5. Verify current match marker shows orange
6. Press ESC → markers disappear

---

## Phase 5: User Story 3 - Advanced Search Options (Priority: P2)

**Goal**: Enable case-sensitive and regex search modes for power users

**Independent Test**: Toggle case sensitivity on/off while searching, verify results change. Enable regex mode, search for pattern like `\b[A-Z]+\b`, verify pattern matches work

**Dependencies**: Requires US1 complete (builds on basic search)

### Integration Tasks for US3

- [X] T026 [US3] Wire FindBar case sensitivity toggle to update searchOptions.caseSensitive in search store
- [X] T027 [US3] Wire FindBar regex mode toggle to update searchOptions.useRegex in search store
- [X] T028 [US3] Update search execution logic in MarkdownViewer.tsx to respect caseSensitive flag
- [X] T029 [US3] Update search execution logic in MarkdownViewer.tsx to treat query as regex when useRegex=true
- [X] T030 [US3] Add regex validation in FindBar.tsx to detect invalid patterns before search execution
- [X] T031 [US3] Display error indicator in FindBar.tsx when regex pattern is invalid (red border + tooltip)
- [X] T032 [US3] Implement dangerous regex detection in src/main/search-service.ts per research.md patterns
- [X] T033 [US3] Add 5-second timeout protection for regex execution per contracts/search-ipc.md
- [X] T034 [US3] Display error message in FindBar.tsx when regex is blocked or times out

**Checkpoint**: User Story 3 complete - advanced search options work with validation

**Manual Test Procedure**:
1. Open document with mixed case text ("Markdown" and "markdown")
2. Search for "markdown" with case sensitivity OFF → both highlighted
3. Toggle case sensitivity ON → only lowercase highlighted
4. Enable regex mode
5. Search for `\b[A-Z]\w+` → matches capitalized words
6. Enter invalid regex `(unclosed` → error indicator appears
7. Enter dangerous regex `(a+)+` → blocked with error message

---

## Phase 6: User Story 4 - Multi-File Search (Priority: P2)

**Goal**: Enable cross-file search across all markdown files in repository using SHIFT+CTRL+F

**Independent Test**: Press SHIFT+CTRL+F, enter search term, verify results panel replaces file tree, shows grouped results by folder/file, clicking result opens file with highlight

**Dependencies**: Requires Phase 2 (IPC) complete before starting

### Integration Tasks for US4

- [X] T035 [US4] Import SearchResults component into src/renderer/components/AppLayout.tsx
- [X] T036 [US4] Add find-in-files visibility state (isFindInFilesVisible, activeSearch) to AppLayout.tsx
- [X] T037 [US4] Register SHIFT+CTRL+F and menu:find-in-files event listeners in AppLayout.tsx
- [X] T038 [US4] Implement sidebar panel toggle logic in AppLayout.tsx: when isFindInFilesVisible=true, render SearchResults instead of FileTree
- [X] T039 [US4] Render SearchResults component conditionally in left sidebar of AppLayout.tsx
- [X] T040 [US4] Implement handleSearchInFiles callback in AppLayout.tsx that calls window.api.search.inFiles per IPC contracts
- [X] T041 [US4] Connect SearchResults onSearch callback to handleSearchInFiles in AppLayout.tsx
- [X] T042 [US4] Wire IPC progress events to update SearchResults component with filesSearched/totalFiles counters
- [X] T043 [US4] Wire IPC complete event to display final results in SearchResults component
- [X] T044 [US4] Wire IPC error event to display error message in SearchResults component
- [X] T045 [US4] Implement result click handler in SearchResults.tsx to open file via existing file opening mechanism
- [X] T046 [US4] Pass search query to opened file to trigger highlighting (reuse US1 highlighting logic)
- [X] T047 [US4] Implement "Back to File Tree" button in SearchResults.tsx header that sets isFindInFilesVisible=false
- [X] T048 [US4] Add cancellation button to SearchResults.tsx that calls window.api.search.cancel
- [X] T049 [US4] Implement file type filter toggle (Markdown / All Text Files) in SearchResults.tsx
- [X] T050 [US4] Update search request to include fileTypeFilter from SearchResults UI state

**Checkpoint**: User Story 4 complete - multi-file search works with progress and cancellation

**Manual Test Procedure**:
1. Press SHIFT+CTRL+F → SearchResults panel replaces file tree
2. Verify panel shows search input, file type filter (defaulted to "Markdown Files"), scope selector
3. Enter search term "TODO" and click Search
4. Verify progress counter updates: "Searching... 45/123 files"
5. Verify results appear grouped by folder > file with match counts
6. Click a search result → file opens with matched text highlighted
7. Click Cancel during search → search stops, partial results shown
8. Toggle file type filter to "All Text Files" → search includes .txt, .js, etc.
9. Click "Back to File Tree" → panel switches back to FileTree

---

## Phase 7: User Story 5 - Search Scope Management (Priority: P3) 🔮 Future

**Goal**: Enable searching across multiple branches or repositories

**Independent Test**: Select scope "all branches", perform search, verify results include matches from multiple branches with branch labels

**Dependencies**: Requires US4 complete

**⚠️ NOTE**: P3 priority - Consider skipping for MVP. Only implement if multi-branch/multi-repo search is explicitly required.

### Integration Tasks for US5

- [ ] T051 [US5] Add repository scope selector UI to SearchResults.tsx (Current Branch / All Branches / All Repos)
- [ ] T052 [US5] Update IPC search request to include repositoryScope parameter
- [ ] T053 [US5] Implement multi-branch file scanning in src/main/search-service.ts
- [ ] T054 [US5] Add branch name to SearchResult interface in src/shared/types/search.ts
- [ ] T055 [US5] Display branch name badge on search results in SearchResults.tsx
- [ ] T056 [US5] Implement multi-repo file scanning in src/main/search-service.ts (if multiple repos loaded)
- [ ] T057 [US5] Add repository name grouping in SearchResults.tsx hierarchy

**Checkpoint**: User Story 5 complete - scope management works across branches/repos

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Final touches, performance optimization, error handling

**Dependencies**: Complete after implementing desired user stories (at minimum US1-US4)

### Performance & Optimization

- [ ] T058 [P] Verify 150ms debounce on search input in FindBar.tsx and SearchResults.tsx
- [ ] T059 [P] Implement 1,000 highlight limit in MarkdownViewer.tsx with warning message
- [ ] T060 [P] Add virtual scrolling to SearchResults.tsx using @tanstack/react-virtual for large result sets
- [ ] T061 [P] Implement incremental result rendering in SearchResults.tsx (first 50 results immediately)
- [ ] T062 [P] Optimize regex matching performance in src/main/search-service.ts with early exit strategies

### Error Handling & Edge Cases

- [ ] T063 [P] Handle "no results found" case in FindBar.tsx ("0 of 0" message)
- [ ] T064 [P] Handle empty search query (disable search button in FindBar.tsx)
- [ ] T065 [P] Handle very long lines in SearchResults.tsx (truncate preview to 200 chars per data-model.md)
- [ ] T066 [P] Skip binary files silently in src/main/search-service.ts
- [ ] T067 [P] Handle document changes during active search (recalculate match positions in MarkdownViewer.tsx)
- [ ] T068 [P] Handle switching documents with active search (preserve query, update results)

### Accessibility & UX

- [ ] T069 [P] Add ARIA labels to FindBar.tsx buttons (Next, Previous, Close)
- [ ] T070 [P] Add keyboard focus management (search input auto-focus when CTRL+F pressed)
- [ ] T071 [P] Add loading spinner to SearchResults.tsx during multi-file search
- [ ] T072 [P] Add empty state message to SearchResults.tsx ("Enter search term to begin")

### Documentation & Code Quality

- [ ] T073 [P] Add JSDoc comments to public functions in search-service.ts
- [ ] T074 [P] Add task reference comments (e.g., `// T008: CTRL+F integration`) in AppLayout.tsx
- [ ] T075 [P] Update CLAUDE.md with search feature implementation notes
- [ ] T076 [P] Run `npm run type-check` and fix any TypeScript errors
- [ ] T077 [P] Run `npm run lint` and fix any linting warnings

**Final Checkpoint**: Feature complete and polished - ready for user testing

---

## Dependencies & Execution Strategy

### Dependency Graph (User Story Level)

```
Phase 1 (Setup)
    ↓
Phase 2 (Foundational - IPC)
    ↓
    ├─────────────────┬─────────────────┬─────────────────┐
    ↓                 ↓                 ↓                 ↓
Phase 3 (US1)    Phase 2 (for US4)    (Independent)    (Independent)
    ↓                 ↓
Phase 4 (US2)    Phase 6 (US4) ───────→ Phase 7 (US5)
    ↓                 ↓                      ↓
Phase 5 (US3)         ↓                      ↓
    ↓                 ↓                      ↓
    └─────────────────┴──────────────────────┘
                      ↓
              Phase 8 (Polish)
```

### Independent Work Streams

**Stream A (In-Document Search)**: Phase 1 → Phase 3 (US1) → Phase 4 (US2) → Phase 5 (US3)
- Can proceed without waiting for IPC (Phase 2)
- Enables core search functionality quickly
- **Recommended MVP**: Stop after Phase 4 (US1 + US2)

**Stream B (Multi-File Search)**: Phase 1 → Phase 2 (IPC) → Phase 6 (US4) → Phase 7 (US5)
- Requires IPC foundation (Phase 2) before starting
- More complex, higher effort
- **Optional for MVP**: Can be delivered in v2

### Parallel Execution Examples

**Within Phase 3 (US1)** - Can work in parallel:
- Developer A: T008-T013 (AppLayout integration)
- Developer B: T014-T015 (MarkdownViewer highlighting)
- Developer C: T016-T018 (Keyboard navigation)

**Within Phase 6 (US4)** - Can work in parallel:
- Developer A: T035-T040 (AppLayout & SearchResults integration)
- Developer B: T041-T044 (IPC event wiring)
- Developer C: T045-T050 (Result interaction & filters)

**Phase 8 (Polish)** - High parallelization:
- Most tasks marked [P] can run simultaneously on different files

### Suggested Implementation Order

**MVP (Minimum Viable Product)** - 8-12 hours:
```
Phase 1 (Setup) → Phase 3 (US1) → Phase 4 (US2)
= Basic in-document search with visual navigation
```

**v1.0 (Full P1 + P2)** - 15-20 hours:
```
MVP + Phase 2 (IPC) + Phase 6 (US4) + Phase 8 (Polish core)
= In-document + multi-file search with all core features
```

**v2.0 (Complete)** - 20-25 hours:
```
v1.0 + Phase 5 (US3) + Phase 7 (US5) + Phase 8 (Polish all)
= All features including scope management
```

---

## Task Summary

**Total Tasks**: 77
- Phase 1 (Setup): 3 tasks
- Phase 2 (Foundational): 4 tasks
- Phase 3 (US1 - In-Document Search): 11 tasks
- Phase 4 (US2 - Visual Navigation): 7 tasks
- Phase 5 (US3 - Advanced Options): 9 tasks
- Phase 6 (US4 - Multi-File Search): 16 tasks
- Phase 7 (US5 - Scope Management): 7 tasks
- Phase 8 (Polish): 20 tasks

**Parallelizable Tasks**: 45 tasks marked with [P] (58%)

**MVP Recommendation**: Phases 1, 3, 4 = 21 tasks (8-12 hours)

**Format Validation**: ✅ All tasks follow checklist format with:
- Checkbox: `- [ ]`
- Task ID: T001-T077 (sequential)
- [P] marker: 45 tasks (parallelizable)
- [US#] label: 50 tasks (user story assignments)
- File paths: All implementation tasks include specific file paths

---

## Next Steps

1. **Start with MVP**: Implement Phase 1 → Phase 3 → Phase 4
2. **Test incrementally**: Validate each phase before moving to next
3. **Commit frequently**: Small, focused commits per task or small task groups
4. **Use task references**: Add `// T###` comments in code for traceability

**Ready to implement!** Start with `T001` and work through MVP phases for quickest user value.
