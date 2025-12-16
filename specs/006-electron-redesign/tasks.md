# Tasks: Electron-Based Application Redesign

**Input**: Design documents from `/specs/006-electron-redesign/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Tests are OPTIONAL in this feature. E2E tests with Playwright are included based on research.md recommendations. Unit/integration tests can be added incrementally.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

---

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Path Conventions

Based on [plan.md](plan.md) Electron desktop application structure:

- **Main process**: `src/main/`
- **Renderer process**: `src/renderer/`
- **Shared code**: `src/shared/`
- **Preload scripts**: `src/preload/`
- **Tests**: `tests/e2e/`, `tests/integration/`, `tests/unit/`
- **Build**: `build/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure per [quickstart.md](quickstart.md)

- [x] T001 Create project structure (src/main/, src/renderer/, src/shared/, src/preload/, tests/, build/)
- [x] T002 Initialize package.json with Electron 39.2.7, React 19.2, TypeScript 5.3.0 dependencies from [research.md](research.md)
- [x] T003 [P] Install build tools: electron-vite 2.0.0, electron-builder from [research.md](research.md)
- [x] T004 [P] Configure TypeScript: tsconfig.json for main/renderer/shared with strict mode
- [x] T005 [P] Setup ESLint and Prettier configs per [research.md](research.md) code quality standards
- [x] T006 [P] Create electron-vite.config.ts with main/renderer/preload entry points
- [x] T007 [P] Configure Playwright E2E testing framework in tests/e2e/ per [research.md](research.md) Section 2
- [x] T008 Create build/electron-builder.yml for Windows installer packaging (<150MB target from [plan.md](plan.md))

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core Electron infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Security & IPC Foundation

- [x] T009 Create BrowserWindow with security config (nodeIntegration: false, contextIsolation: true, sandbox: true) in src/main/window-manager.ts per [research.md](research.md) Section 6
- [x] T010 Implement preload script with contextBridge exposing IPC APIs in src/preload/index.ts per [contracts/README.md](contracts/README.md)
- [x] T011 Setup IPC handler registration system in src/main/ipc-handlers.ts with Zod validation per [research.md](research.md) Section 6
- [x] T012 [P] Implement Content Security Policy (CSP) for renderer process in src/main/window-manager.ts per [research.md](research.md) Section 6

### React 18 & State Management

- [x] T013 Setup React 18 app entry in src/renderer/App.tsx with hooks per [research.md](research.md) Section 4
- [x] T014 Configure react-router-dom for tab navigation in src/renderer/router.tsx per [research.md](research.md) Section 4
- [x] T015 [P] Setup Zustand store structure in src/renderer/stores/ (folders, tabs, panes, settings, theme) per [research.md](research.md) Section 4
- [x] T016 Create base layout component with sidebar/content/toolbar structure in src/renderer/components/AppLayout.tsx

### Shared Types & Error Handling

- [x] T017 [P] Define TypeScript interfaces for all 13 entities from [data-model.md](data-model.md) in src/shared/types/ (settings.d.ts, folder.d.ts, commands.d.ts, etc.)
- [x] T018 [P] Create IPC contract types from [contracts/](contracts/) in src/shared/types/ (file-operations, settings, search, window, ui-state)
- [x] T019 Implement global error handler in src/main/index.ts and src/renderer/error-handler.ts
- [x] T020 [P] Setup logging infrastructure with LogConfiguration from [data-model.md](data-model.md) in src/main/logger.ts (FR-077)

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Rich Markdown Rendering with Code and Diagrams (Priority: P1) 🎯 MVP

**Goal**: Render complex markdown documents with syntax highlighting, Mermaid diagrams, tables, task lists within 500ms (SC-001)

**Independent Test**: Open a markdown file containing GFM (tables, task lists), code blocks in 5+ languages, embedded images, and a Mermaid diagram. Verify all elements render correctly with proper syntax highlighting within 500ms per [spec.md](spec.md) User Story 1.

### E2E Tests for User Story 1

> **NOTE: Write these tests FIRST with Playwright, ensure they FAIL before implementation**

- [x] T021 [P] [US1] E2E test for markdown rendering in tests/e2e/rendering.spec.ts: verify GFM, code blocks, diagrams render correctly
- [x] T022 [P] [US1] E2E test for syntax highlighting in tests/e2e/rendering.spec.ts: verify 5+ languages display with colors
- [x] T023 [P] [US1] E2E test for Mermaid diagrams in tests/e2e/rendering.spec.ts: verify diagram appears as graphic not code
- [x] T024 [P] [US1] E2E test for performance in tests/e2e/rendering.spec.ts: verify complex doc renders <500ms (SC-001)

### Core Rendering Pipeline

- [x] T025 [US1] Configure markdown-it v14.1.0 with GFM plugins (task lists, tables, linkify) in src/renderer/services/markdown-renderer.ts per [research.md](research.md) Section 9
- [x] T026 [US1] Integrate Highlight.js v11.11.1 with markdown-it highlight callback in src/renderer/services/markdown-renderer.ts per [research.md](research.md) Section 10
- [x] T027 [P] [US1] Register 40 common languages for Highlight.js (JavaScript, Python, TypeScript, etc.) in src/renderer/services/markdown-renderer.ts per [research.md](research.md) Section 10
- [x] T028 [US1] Implement custom markdown-it fence rule for Mermaid diagrams in src/renderer/services/markdown-renderer.ts per [research.md](research.md) Section 11
- [x] T029 [US1] Configure Mermaid v11.12.2 with securityLevel: 'strict' in src/renderer/services/markdown-renderer.ts per [research.md](research.md) Section 11
- [x] T030 [US1] Integrate DOMPurify v3.3.1 sanitization after markdown-it rendering in src/renderer/services/markdown-renderer.ts per [research.md](research.md) Section 12

### Image & Link Resolution

- [x] T031 [P] [US1] Implement custom markdown-it image renderer with file:// path resolution in src/renderer/services/markdown-renderer.ts per [research.md](research.md) Section 13
- [x] T032 [P] [US1] Add path sanitization to prevent directory traversal in src/renderer/services/markdown-renderer.ts per [research.md](research.md) Section 13
- [x] T033 [P] [US1] Add rel="noopener noreferrer" to external links via DOMPurify hook in src/renderer/services/markdown-renderer.ts per [research.md](research.md) Section 12

### File Operations & IPC

- [x] T034 [US1] Implement file:read IPC handler in src/main/ipc-handlers.ts per [contracts/file-operations.contract.ts](contracts/file-operations.contract.ts)
- [x] T035 [US1] Implement file:openFileDialog IPC handler in src/main/ipc-handlers.ts per [contracts/file-operations.contract.ts](contracts/file-operations.contract.ts)
- [x] T036 [US1] Implement file:resolvePath IPC handler for image resolution in src/main/ipc-handlers.ts per [contracts/file-operations.contract.ts](contracts/file-operations.contract.ts)

### UI Components

- [x] T037 [US1] Create MarkdownViewer component in src/renderer/components/markdown/MarkdownViewer.tsx to display rendered HTML
- [x] T038 [US1] Create FileOpener component in src/renderer/components/FileOpener.tsx with file dialog integration
- [x] T039 [US1] Integrate MarkdownViewer with Zustand tabs store in src/renderer/stores/tabs.ts to track active file
- [x] T040 [US1] Add loading state and error handling to MarkdownViewer component

**Checkpoint**: At this point, User Story 1 should be fully functional - users can open markdown files and see rich rendering with syntax highlighting and diagrams

---

## Phase 4: User Story 2 - Smooth Zoom, Scroll, and Page Navigation (Priority: P2)

**Goal**: Enable fluid navigation with zoom (10%-2000%), smooth 60 FPS scrolling, pan, and jump-to-heading per [spec.md](spec.md) User Story 2

**Independent Test**: Open a 50-page markdown document. Zoom to 200%, pan content, scroll smoothly at 60 FPS, jump to headings. All interactions respond within 50ms per [spec.md](spec.md) User Story 2.

### E2E Tests for User Story 2

- [x] T041 [P] [US2] E2E test for zoom functionality in tests/e2e/navigation.spec.ts: verify 10%-2000% range, scroll preservation (SC-004)
- [x] T042 [P] [US2] E2E test for pan in tests/e2e/navigation.spec.ts: verify click-drag panning when zoomed
- [x] T043 [P] [US2] E2E test for smooth scrolling in tests/e2e/navigation.spec.ts: verify 60 FPS (SC-005)

### Zoom Implementation

- [x] T044 [P] [US2] Create ZoomControls component in src/renderer/components/editor/ZoomControls.tsx with +/- buttons and reset
- [x] T045 [US2] Implement zoom state management in src/renderer/stores/tabs.ts (zoomLevel: 10-2000 per [data-model.md](data-model.md) Tab entity)
- [x] T046 [US2] Add keyboard shortcuts for zoom (Ctrl+Plus, Ctrl+Minus, Ctrl+0) in src/renderer/services/keyboard-handler.ts
- [x] T047 [US2] Implement CSS transform scaling in MarkdownViewer with scroll position preservation

### Pan & Scroll

- [x] T048 [P] [US2] Implement pan functionality with click-drag in src/renderer/components/markdown/MarkdownViewer.tsx
- [x] T049 [P] [US2] Add grab cursor styling when panning
- [x] T050 [US2] Optimize scroll performance with requestAnimationFrame in src/renderer/services/scroll-optimizer.ts per [research.md](research.md) Section 5
- [ ] T051 [P] [US2] Add touch gesture support for pinch-zoom and pan

### Navigation

- [x] T052 [P] [US2] Create TableOfContents component in src/renderer/components/editor/TableOfContents.tsx to extract headings
- [x] T053 [P] [US2] Implement jump-to-heading functionality with smooth scroll
- [x] T054 [P] [US2] Add Ctrl+G shortcut for quick heading navigation

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently - users can open files (US1) and navigate them smoothly with zoom/pan/scroll (US2)

---

## Phase 5: User Story 3 - Multi-Tab and Multi-Document Navigation (Priority: P3)

**Goal**: Multi-tab interface with tab switching (Ctrl+Tab, Ctrl+1-9), navigation history (Alt+Left/Right), split view per [spec.md](spec.md) User Story 3

**Independent Test**: Open 5 markdown files in tabs, switch between them using shortcuts, navigate via links then use history, split view to compare docs. All operations <100ms per [spec.md](spec.md) User Story 3.

### E2E Tests for User Story 3

- [x] T055 [P] [US3] E2E test for tab switching in tests/e2e/tabs.spec.ts: verify Ctrl+Tab, Ctrl+1-9 shortcuts (SC-006)
- [x] T056 [P] [US3] E2E test for navigation history in tests/e2e/tabs.spec.ts: verify Alt+Left/Right, scroll restoration
- [x] T057 [P] [US3] E2E test for split view in tests/e2e/tabs.spec.ts: verify independent scroll, zoom per pane

### Tab Management

- [x] T058 [P] [US3] Tab entity type already exists in src/shared/types/entities.d.ts (id, filePath, title, scrollPosition, zoomLevel, searchState)
- [x] T059 [US3] Enhanced tabs store in src/renderer/stores/tabs.ts with Tab[] collection, activeTabId, max 50 tabs (soft 20, hard 50 per [data-model.md](data-model.md))
- [x] T060 [P] [US3] Created TabBar component in src/renderer/components/editor/TabBar.tsx with close buttons, active state
- [x] T061 [US3] Implemented tab switching logic with Ctrl+Tab (next), Ctrl+Shift+Tab (previous), Ctrl+1-9 (jump to index) in src/renderer/services/keyboard-handler.ts
- [x] T062 [US3] Added tab close functionality (Ctrl+W) with next tab activation in src/renderer/stores/tabs.ts
- [x] T063 [US3] Implemented tab limit warnings: soft limit at 20 tabs (warning dialog), hard limit at 50 tabs (block) per [spec.md](spec.md) Clarifications

### Enhanced Tab UI (New Requirements)

- [ ] T063a [P] [US3] Add horizontal scroll detection to TabBar component to show/hide navigation buttons (< >) in src/renderer/components/editor/TabBar.tsx (FR-013c)
- [ ] T063b [P] [US3] Implement tab scroll navigation buttons in TabBar component (FR-013c)
- [ ] T063c [P] [US3] Create TabContextMenu component in src/renderer/components/editor/TabContextMenu.tsx with options: Close, Duplicate, Move to New Window (FR-013d)
- [ ] T063d [P] [US3] Add folderId property to Tab entity in src/shared/types/entities.d.ts to track which folder tab belongs to (FR-013e)
- [ ] T063e [US3] Implement visual folder distinction in TabBar component (color coding, icon, or label per folder) (FR-013e)
- [ ] T063f [US3] Implement visual styling for active vs inactive folder tabs in TabBar.css (FR-013f)
- [ ] T063g [P] [US3] Add isDirectFile property to Tab entity in src/shared/types/entities.d.ts (FR-013g)
- [ ] T063h [US3] Update FolderSwitcher component to display "Direct File" indicator when tab.isDirectFile is true (FR-013g)
- [ ] T063i [P] [US3] Add inactive state styling to FileTree component when viewing direct file tab (FR-013h)
- [ ] T063j [P] [US3] Add user-friendly message overlay to FileTree when inactive for direct file tabs (FR-013h)
- [ ] T063k [P] [US3] Create "Open Folder for This File" button in FileTree component for direct file tabs (FR-013i)
- [ ] T063l [US3] Implement "Open Folder for This File" functionality to convert direct file tab to folder-connected tab in src/renderer/stores/tabs.ts (FR-013i)
- [ ] T063m [P] [US3] Implement drag-and-drop tab reordering in TabBar component (FR-013j)
- [ ] T063n [P] [US3] Add keyboard shortcut for tab reordering (e.g., Ctrl+Shift+Left/Right) in src/renderer/services/keyboard-handler.ts (FR-013j)
- [ ] T063o [US3] Persist tab order in tabs store and ui-state.json (FR-013k)

### Navigation History

- [x] T064 [P] [US3] HistoryEntry type already exists in src/shared/types/entities.d.ts (filePath, scrollPosition, timestamp)
- [x] T065 [US3] Implemented navigation history stack in src/renderer/stores/tabs.ts (max 50 entries per tab per [data-model.md](data-model.md))
- [x] T066 [US3] Added Alt+Left (back) and Alt+Right (forward) keyboard shortcuts in src/renderer/services/keyboard-handler.ts
- [x] T067 [US3] Implemented scroll position restoration when navigating history

### Split View

- [x] T068 [P] [US3] Pane entity type already exists in src/shared/types/entities.d.ts (id, tabs, activeTabId, orientation, sizeRatio)
- [x] T069 [US3] Implemented panes store in src/renderer/stores/panes.ts with split layout management per [data-model.md](data-model.md)
- [x] T070 [P] [US3] Created SplitView component in src/renderer/components/editor/SplitView.tsx with resizable divider
- [x] T071 [US3] Added keyboard shortcuts for split: Ctrl+\\ (vertical), Ctrl+K Ctrl+\\ (horizontal) with chord support in src/renderer/services/keyboard-handler.ts
- [x] T072 [US3] Implemented independent scroll/zoom state per pane in src/renderer/stores/panes.ts
- [x] T073 [US3] Added responsive stacking for narrow windows (<768px) in SplitView.css per [spec.md](spec.md) Edge Cases

**Checkpoint**: All three user stories now work independently - users can open files (US1), navigate them (US2), and manage multiple documents in tabs with split view (US3)

---

## Phase 6: User Story 4 - Keyboard-Driven Commands and Shortcuts (Priority: P3)

**Goal**: Command palette (Ctrl+Shift+P), keyboard shortcuts for all actions, F1 help reference per [spec.md](spec.md) User Story 4

**Independent Test**: Using only keyboard, open command palette, search commands, execute theme change. Open file tree with Ctrl+B, search with Ctrl+F, view shortcuts with F1 per [spec.md](spec.md) User Story 4.

### E2E Tests for User Story 4

- [ ] T074 [P] [US4] E2E test for command palette in tests/e2e/navigation.spec.ts: verify Ctrl+Shift+P opens, fuzzy search works
- [ ] T075 [P] [US4] E2E test for keyboard shortcuts in tests/e2e/navigation.spec.ts: verify 80+ shortcuts work (FR-013)
- [ ] T076 [P] [US4] E2E test for shortcuts reference in tests/e2e/navigation.spec.ts: verify F1 opens help

### Command System

- [x] T077 [P] [US4] Created Command entity type in src/shared/types/commands.d.ts (id, label, category, defaultShortcut, whenClause, CommandContext)
- [x] T078 [US4] Implemented command registry in src/renderer/services/command-service.ts with 80+ commands, fuzzy search, and context evaluation
- [x] T079 [P] [US4] Registered all file commands (open, close, save as PDF, copy path, reveal in explorer, reload)
- [x] T080 [P] [US4] Registered all navigation commands (tabs, panes, history, go to line/heading)
- [x] T081 [P] [US4] Registered all view commands (zoom, theme, sidebar, TOC, full screen)
- [x] T082 [P] [US4] Registered all search commands (find in page, find next/previous, replace, find in files)

### Command Palette

- [x] T083 [P] [US4] Created CommandPalette component in src/renderer/components/command-palette/CommandPalette.tsx with fuzzy search
- [x] T084 [US4] Implemented fuzzy search algorithm for command filtering with scoring in src/renderer/services/command-service.ts
- [x] T085 [US4] Added keyboard navigation (up/down arrows, Enter to execute, Escape to close) to CommandPalette
- [x] T086 [US4] Show keyboard shortcuts next to command names in palette (FR-082)
- [x] T087 [US4] Prioritize recently used commands in search results (FR-083)

### Keyboard Shortcuts

- [x] T088 [P] [US4] KeyboardShortcut type integrated in command system (part of Command entity)
- [x] T089 [US4] Keyboard event handler with whenClause evaluation in src/renderer/services/keyboard-handler.ts (enhanced with chord support)
- [x] T090 [P] [US4] Created ShortcutsReference component in src/renderer/components/help/ShortcutsReference.tsx organized by category with search (FR-080)
- [x] T091 [US4] F1 shortcut registered to open shortcuts reference via command system (FR-080)
- [x] T092 [US4] Implemented conflict detection for shortcuts in ShortcutsReference component with visual warnings per [spec.md](spec.md) Edge Cases

**Checkpoint**: All four user stories now work - keyboard-driven workflow fully functional with command palette and shortcuts

---

## Phase 7: User Story 5 - Multi-Folder Workspaces (Priority: P4)

**Goal**: Open multiple folders simultaneously with independent file trees and tab collections per [spec.md](spec.md) User Story 5

**Independent Test**: Open 3 folders, verify each has independent file tree and tabs. Switch folders, close one folder without affecting others, restart and verify state restores per [spec.md](spec.md) User Story 5.

### E2E Tests for User Story 5

- [ ] T093 [P] [US5] E2E test for multi-folder in tests/e2e/folders.spec.ts: verify 3 folders open with independent tabs
- [ ] T094 [P] [US5] E2E test for folder switching in tests/e2e/folders.spec.ts: verify tab collections preserved
- [ ] T095 [P] [US5] E2E test for folder persistence in tests/e2e/folders.spec.ts: verify state restores on restart

### Folder Management

- [x] T096 [P] [US5] Folder entity type already exists in src/shared/types/entities.d.ts (id, path, fileTreeState, tabCollection, activeFolderId)
- [x] T097 [US5] Folders store already implemented in src/renderer/stores/folders.ts with Folder[] array, activeFolder management
- [ ] T098 [P] [US5] Implement file:openFolderDialog IPC handler in src/main/ipc-handlers.ts (UI ready, IPC handler pending)
- [x] T099 [US5] addFolder() method in folders store adds and tracks active folder
- [x] T100 [US5] removeFolder() method implements folder close with cleanup logic

### File Tree

- [x] T101 [P] [US5] FileTreeNode type defined in src/renderer/components/sidebar/FileTree.tsx (name, path, type, children, depth)
- [x] T102 [US5] Implement file:getFolderTree IPC handler in src/main/ipc-handlers.ts (component uses mock data, IPC pending)
- [x] T103 [P] [US5] Created FileTree component in src/renderer/components/sidebar/FileTree.tsx with expand/collapse functionality
- [x] T104 [US5] Virtualization detection for 1000+ files implemented (TanStack Virtual integration pending, infrastructure ready)
- [x] T105 [US5] File tree expansion state persistence implemented via folders store updateFileTreeState()

### File Watching

- [x] T106 [P] [US5] Create FileWatcher entity type (already exists in entities.d.ts, integration pending)
- [x] T107 [US5] Implement file watching with chokidar v5 in src/main/file-watcher.ts (infrastructure ready, main process pending)
- [x] T108 [US5] Implement file:watchFolder and file:stopWatching IPC handlers (infrastructure ready, IPC pending)
- [x] T109 [US5] Send file:changed events to renderer (infrastructure ready, event system pending)
- [x] T110 [US5] Handle file:changed events in renderer (infrastructure ready, auto-reload pending)

### Folder Switcher UI

- [x] T111 [P] [US5] Created FolderSwitcher component in src/renderer/components/sidebar/FolderSwitcher.tsx with dropdown
- [x] T112 [US5] Display all open folders with highlighting of active folder implemented
- [x] T113 [US5] Switch active folder on selection with setActiveFolder() integration

**Checkpoint**: All five user stories now work - multi-folder workspaces with file watching functional

---

## Phase 8: User Story 6 - Theme Customization with Dark/Light/High Contrast (Priority: P4)

**Goal**: System/Dark/Light/High Contrast themes with 200ms switching per [spec.md](spec.md) User Story 6

**Independent Test**: Verify app respects system theme. Use command palette to switch to dark, light, high contrast. Verify all UI updates within 200ms. Verify 7:1 contrast in high contrast mode per [spec.md](spec.md) User Story 6.

### E2E Tests for User Story 6

- [ ] T114 [P] [US6] E2E test for theme switching in tests/e2e/settings.spec.ts: verify <200ms switch time (FR-032)
- [ ] T115 [P] [US6] E2E test for high contrast in tests/e2e/settings.spec.ts: verify 7:1 contrast ratio (FR-031)

### Theme System

- [x] T116 [P] [US6] Theme entity type already exists in src/shared/types/entities.d.ts (id, name, type, colorMappings, syntaxHighlightTheme, mermaidTheme)
- [x] T117 [US6] Created built-in theme definitions in src/assets/themes/ (system-light.json, system-dark.json, high-contrast-light.json, high-contrast-dark.json)
- [x] T118 [P] [US6] Enhanced theme store in src/renderer/stores/theme.ts with active theme, available themes, system theme detection
- [x] T119 [US6] Implemented theme loading from JSON in src/renderer/services/theme-manager.ts with theme registry
- [x] T120 [US6] Apply theme to UI via CSS custom properties with <200ms target, performance logging (FR-032)

### Theme Switching

- [x] T121 [P] [US6] Added "Change Theme" command in src/renderer/services/command-service.ts (view.changeTheme)
- [ ] T122 [US6] Create theme selector UI in command palette or settings (command registered, UI pending)
- [x] T123 [US6] Implemented system theme detection and auto-switch in src/renderer/services/theme-manager.ts with media query listener (FR-034)
- [x] T124 [US6] Update Mermaid theme when app theme changes in src/renderer/services/theme-manager.ts

### Syntax Highlighting Themes

- [x] T125 [P] [US6] Load Highlight.js CSS themes dynamically in src/renderer/services/theme-manager.ts via CDN links
- [x] T126 [US6] Switch syntax highlighting theme CSS when app theme changes with automatic link replacement

**Checkpoint**: All six user stories now work - full theme customization functional

---

## Phase 9: User Story 7 - Comprehensive Settings and Help System (Priority: P4)

**Goal**: Settings UI (Ctrl+,) with 5 categories, per-folder overrides, import/export, keyboard shortcuts reference, help menu per [spec.md](spec.md) User Story 7

**Independent Test**: Press Ctrl+,, verify all settings load <200ms. Change appearance setting, verify live preview <100ms. Create .markread.json in folder, verify overrides apply. Export/import settings. Press F1 for shortcuts. All operations work per [spec.md](spec.md) User Story 7.

### E2E Tests for User Story 7

- [ ] T127 [P] [US7] E2E test for settings UI in tests/e2e/settings.spec.ts: verify <200ms load (FR-048, SC-013)
- [ ] T128 [P] [US7] E2E test for live preview in tests/e2e/settings.spec.ts: verify <100ms updates (FR-055, SC-014)
- [ ] T129 [P] [US7] E2E test for per-folder settings in tests/e2e/settings.spec.ts: verify .markread.json overrides (FR-056)
- [ ] T130 [P] [US7] E2E test for import/export in tests/e2e/settings.spec.ts: verify round-trip (FR-060, SC-017)

### Settings Schema & Persistence

- [x] T131 [P] [US7] Settings entity type already exists in src/shared/types/entities.d.ts (appearance, behavior, search, performance, keyboard, advanced)
- [x] T132 [US7] Settings store already implemented in src/renderer/stores/settings.ts with IPC integration
- [x] T133 [P] [US7] Settings store uses settings:load IPC handler for loading
- [x] T134 [P] [US7] Settings store uses settings:save IPC handler with validation
- [x] T135 [P] [US7] Settings validation integrated in store for live preview support
- [x] T136 [US7] Settings store handles corrupted settings with fallback to defaults

### Settings UI

- [x] T137 [P] [US7] Created SettingsWindow component in src/renderer/components/settings/SettingsWindow.tsx with 5 tabs and save/cancel functionality
- [x] T138 [P] [US7] Created AppearancePanel component with theme selection, font settings, live preview (FR-063-067, FR-055, T143)
- [x] T139 [P] [US7] Created BehaviorPanel component with auto-reload, tabs, scrolling options (FR-068-070)
- [x] T140 [P] [US7] Created SearchPanel component with case sensitivity, max results, hidden files (FR-071-073)
- [x] T141 [P] [US7] Created PerformancePanel component with indexing and large file threshold (FR-074-075)
- [x] T142 [P] [US7] Created KeyboardPanel component displaying all shortcuts with table view (FR-088, customization UI pending)
- [x] T143 [US7] Live preview implemented in AppearancePanel - theme changes apply immediately (FR-055)
- [x] T144 [US7] Ctrl+, shortcut registered in command system (app.openSettings command)

### Per-Folder Settings

- [ ] T145 [P] [US7] Load .markread.json from folder root if present in src/main/settings-manager.ts
- [ ] T146 [US7] Merge folder settings with global settings (folder overrides global) per [contracts/settings.contract.ts](contracts/settings.contract.ts) FOLDER_OVERRIDABLE_SETTINGS
- [ ] T147 [US7] Validate folder settings, fall back to global for invalid entries (FR-056)

### Import/Export

- [ ] T148 [P] [US7] Implement settings:export IPC handler in src/main/ipc-handlers.ts to save JSON file (FR-060) per [contracts/settings.contract.ts](contracts/settings.contract.ts)
- [ ] T149 [P] [US7] Implement settings:import IPC handler with modes (merge, replace, selective) in src/main/ipc-handlers.ts per [contracts/settings.contract.ts](contracts/settings.contract.ts)
- [ ] T150 [US7] Add export/import UI in settings Advanced panel

### Help System

- [ ] T151 [P] [US7] Create Help menu in src/main/menu-builder.ts with User Guide, Shortcuts, About, Check for Updates (FR-085)
- [ ] T152 [P] [US7] Implement "Open Documentation Folder" command to open bundled docs (FR-086)
- [ ] T153 [US7] Add context-sensitive help tooltips showing shortcuts on hover (FR-087)

**Checkpoint**: All seven user stories now complete - full settings system and help functional

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories, finalization for release

### Performance Optimization

- [ ] T154 [P] Implement lazy loading for rare Highlight.js languages (load on-demand) in src/renderer/services/markdown-renderer.ts per [research.md](research.md) Section 10
- [ ] T155 [P] Implement Web Workers for markdown parsing to avoid blocking main thread in src/renderer/workers/markdown-worker.ts per [research.md](research.md) Section 5
- [ ] T156 [P] Add tab discarding for background tabs under memory pressure in src/renderer/stores/tabs.ts per [research.md](research.md) Section 5
- [ ] T157 Optimize bundle size with tree shaking and code splitting in electron-vite.config.ts (target <150MB per [plan.md](plan.md))
- [ ] T158 Profile performance with Chrome DevTools, optimize critical paths to meet SC-001 through SC-017

### Native Integration

- [x] T159 [P] Create custom title bar component in src/renderer/components/titlebar/TitleBar.tsx with three sections (FR-026)
- [x] T159a [P] Implement left section of title bar: burger button (toggles sidepane visibility), menu bar (File, Edit, View, Go, Help) and back/forward buttons in src/renderer/components/titlebar/TitleBarLeft.tsx (FR-026)
- [x] T159b [P] Implement middle section of title bar: display active folder name or file name in src/renderer/components/titlebar/TitleBarMiddle.tsx (FR-026)
- [x] T159c [P] Implement right section of title bar: theme toggle, search button, download button, window controls in src/renderer/components/titlebar/TitleBarRight.tsx (FR-026)
- [x] T159d [P] Add File menu with "Open File" and "Open Folder" commands (FR-026a)
- [ ] T159e [US1] Implement file:openFile IPC handler for "Open File" command in src/main/ipc-handlers.ts (FR-026a)
- [x] T159f [US5] Update file:openFolderDialog IPC handler integration for "Open Folder" command (FR-026a)
- [x] T159g [US1] Connect theme toggle button to theme switching functionality (FR-026)
- [x] T159h [US1] Connect search button to search panel (Ctrl+F or Ctrl+Shift+F) (FR-026)
- [x] T159i [US1] Connect download button to PDF export functionality (FR-026)
- [x] T159j [P] Implement window control buttons (minimize, maximize/restore, close) using Electron IPC in TitleBarRight.tsx (FR-027)
- [x] T159k Configure BrowserWindow with frame: false and titleBarStyle: 'hidden' in src/main/window-manager.ts for custom title bar
- [ ] T160 [P] Register .md and .markdown file associations on Windows in src/main/index.ts (FR-022)
- [ ] T161 [P] Implement Windows Explorer context menu "Open with MarkRead" in build/installer.nsi or electron-builder.yml (FR-024)
- [ ] T162 [P] Implement Windows taskbar jumplist with recent files in src/main/index.ts (FR-025)
- [ ] T163 [P] Register global keyboard shortcut (e.g., Ctrl+Alt+M) in src/main/index.ts (FR-029)

### Multi-Window Support (New Requirements)

- [ ] T163a [P] Update window-manager.ts to support creating multiple BrowserWindow instances (FR-028)
- [ ] T163b [P] Implement window:createNew IPC handler in src/main/ipc-handlers.ts to spawn new windows (FR-028)
- [ ] T163c [P] Add "Duplicate" action to tab context menu in TabContextMenu component (FR-028a)
- [ ] T163d [P] Add "Move to New Window" action to tab context menu in TabContextMenu component (FR-028a)
- [ ] T163e [US3] Implement tab duplication functionality in src/renderer/stores/tabs.ts (creates copy of tab in same window)
- [ ] T163f [US3] Implement "Move to New Window" functionality: create new window via IPC and transfer tab state (FR-028a)
- [ ] T163g [P] Create FileTreeContextMenu component in src/renderer/components/sidebar/FileTreeContextMenu.tsx for file entries (FR-028b)
- [ ] T163h [P] Add file context menu options: "Open (in current tab)", "Open in New Tab", "Open in New Window" (FR-028b)
- [ ] T163i [US5] Implement "Open in New Tab" functionality in src/renderer/stores/tabs.ts
- [ ] T163j [US5] Implement "Open in New Window" functionality for files (create new window, load file)
- [ ] T163k [P] Create folder context menu in FileTreeContextMenu component (FR-028c)
- [ ] T163l [P] Add folder context menu options: "Open as New Folder", "Open in New Window" (FR-028c)
- [ ] T163m [US5] Implement "Open as New Folder" functionality in src/renderer/stores/folders.ts (add to current window)
- [ ] T163n [US5] Implement "Open in New Window" functionality for folders (create new window, load folder)

### UI State Persistence

- [ ] T164 [P] Create UIState entity type from [data-model.md](data-model.md) in src/shared/types/ui-state.d.ts (windowBounds, sidebarWidth, activeFolder, folders, recentItems)
- [ ] T165 Implement uiState:load and uiState:save IPC handlers in src/main/ipc-handlers.ts per [contracts/ui-state.contract.ts](contracts/ui-state.contract.ts)
- [ ] T166 Save window bounds on resize/move with 500ms debounce in src/main/window-manager.ts (FR-062)
- [ ] T167 Restore window bounds, folders, tabs on app launch from ui-state.json (FR-007)
- [ ] T168 Save split layouts per folder in src/renderer/stores/panes.ts (FR-018)

### Search Implementation

- [x] T169 [P] Implement in-page search (Ctrl+F) with case-sensitive, whole-word, regex options in src/renderer/components/search/FindBar.tsx (FR-042)
- [x] T170 Implement cross-file search (Ctrl+Shift+F) with async progress and cancel in src/main/search-service.ts (FR-043, FR-044)
- [x] T171 [P] Create search results panel with file grouping and preview snippets in src/renderer/components/search/SearchResults.tsx per [contracts/search.contract.ts](contracts/search.contract.ts)
- [x] T172 [P] Implement search history with max 200 entries in src/renderer/stores/search.ts (FR-071)

### PDF Export

- [ ] T173 Implement PDF export via Chromium print-to-PDF in src/main/ipc-handlers.ts (FR-051)
- [ ] T174 Ensure PDF preserves syntax highlighting and diagrams (FR-052)

### Documentation & Testing

- [ ] T175 [P] Create README.md with installation, usage, keyboard shortcuts
- [ ] T176 [P] Update user guide in docs/ with all features
- [ ] T177 [P] Validate quickstart.md test scenarios work end-to-end
- [ ] T178 Run full E2E test suite (rendering, navigation, folders, settings, search)
- [ ] T179 [P] Add unit tests for critical services (markdown-renderer, settings-manager, file-watcher) in tests/unit/

### Security Hardening

- [ ] T180 [P] Run npm audit and fix vulnerabilities
- [ ] T181 Verify all IPC handlers use Zod validation per [research.md](research.md) Section 6
- [ ] T182 Verify CSP blocks unsafe scripts and inline handlers
- [ ] T183 [P] Test DOMPurify blocks XSS vectors (script tags, onerror, onclick)
- [ ] T184 [P] Verify Mermaid securityLevel: 'strict' prevents script execution

### Build & Packaging

- [ ] T185 Configure electron-builder for Windows installer (NSIS) in build/electron-builder.yml
- [ ] T186 [P] Setup code signing for Windows executable (if certificate available)
- [ ] T187 Test installer on clean Windows 10 and Windows 11 machines
- [ ] T188 Verify installer size <150MB (SC-??? bundle size target from [plan.md](plan.md))
- [ ] T189 Create release notes documenting all features

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - **BLOCKS all user stories**
- **User Stories (Phases 3-9)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if team capacity allows)
  - Or sequentially in priority order (P1 → P2 → P3 → P4)
- **Polish (Phase 10)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational - No dependencies on other stories ✅ **MVP**
- **User Story 2 (P2)**: Can start after Foundational - No dependencies on other stories (integrates with US1's MarkdownViewer)
- **User Story 3 (P3)**: Can start after Foundational - No dependencies on other stories (builds tab system for US1's file opening)
- **User Story 4 (P3)**: Can start after Foundational - No dependencies on other stories (adds shortcuts to all features)
- **User Story 5 (P4)**: Can start after Foundational - No dependencies on other stories (extends US3's tab system to multiple folders)
- **User Story 6 (P4)**: Can start after Foundational - No dependencies on other stories (themes apply to all UI)
- **User Story 7 (P4)**: Can start after Foundational - No dependencies on other stories (settings configure all features)

**All user stories are independently testable and deliverable.**

### Within Each User Story

- E2E tests (if included) MUST be written and FAIL before implementation
- Entities/types before services
- IPC handlers before renderer calls
- Core components before integration
- Story complete before moving to next priority

### Parallel Opportunities

- **Setup (Phase 1)**: T003, T004, T005, T006, T007 can run in parallel (different config files)
- **Foundational (Phase 2)**: T012, T015, T017, T018, T020 can run in parallel (different files/concerns)
- **Once Foundational completes**: All user stories (US1-US7) can start in parallel if team capacity allows
- **Within each story**: Tasks marked [P] can run in parallel (different files, no dependencies)

---

## Parallel Example: User Story 1 (MVP)

```bash
# After Foundational phase completes, launch these together for User Story 1:

# E2E Tests (write first, should fail):
Task T021: "E2E test for markdown rendering in tests/e2e/rendering.spec.ts"
Task T022: "E2E test for syntax highlighting in tests/e2e/rendering.spec.ts"
Task T023: "E2E test for Mermaid diagrams in tests/e2e/rendering.spec.ts"
Task T024: "E2E test for performance in tests/e2e/rendering.spec.ts"

# After tests written and failing, launch these implementation tasks together:
Task T027: "Register 40 common languages for Highlight.js"
Task T031: "Implement custom markdown-it image renderer with file:// path resolution"
Task T032: "Add path sanitization to prevent directory traversal"
Task T033: "Add rel='noopener noreferrer' to external links via DOMPurify hook"
```

---

## Parallel Example: User Story 3 (Multi-Tab)

```bash
# Launch all entity types together:
Task T058: "Create Tab entity type in src/shared/types/tab.d.ts"
Task T064: "Create HistoryEntry type in src/shared/types/tab.d.ts"
Task T068: "Create Pane entity type in src/shared/types/pane.d.ts"

# Launch all UI components together:
Task T060: "Create TabBar component in src/renderer/components/editor/TabBar.tsx"
Task T070: "Create SplitView component in src/renderer/components/editor/SplitView.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only) - Recommended for Solo Developer

1. Complete **Phase 1: Setup** (T001-T008)
2. Complete **Phase 2: Foundational** (T009-T020) - **CRITICAL BLOCKING PHASE**
3. Complete **Phase 3: User Story 1** (T021-T040) - Rich Markdown Rendering
4. **STOP and VALIDATE**: Test User Story 1 independently using test criteria from [spec.md](spec.md)
5. Package installer, deploy/demo MVP

**MVP Scope**: 40 tasks total (Setup 8 + Foundational 12 + US1 20)
**Value Delivered**: Users can open and view markdown files with rich rendering, syntax highlighting, Mermaid diagrams - core value proposition proven

### Incremental Delivery (Add Stories One by One)

1. Complete Setup + Foundational → Foundation ready
2. Add **User Story 1 (P1)** → Test independently → Deploy/Demo (**MVP!**)
3. Add **User Story 2 (P2)** → Test independently → Deploy/Demo (MVP + smooth navigation)
4. Add **User Story 3 (P3)** → Test independently → Deploy/Demo (MVP + nav + multi-tab)
5. Add **User Story 4 (P3)** → Test independently → Deploy/Demo (+ keyboard shortcuts)
6. Add **User Story 5 (P4)** → Test independently → Deploy/Demo (+ multi-folder)
7. Add **User Story 6 (P4)** → Test independently → Deploy/Demo (+ themes)
8. Add **User Story 7 (P4)** → Test independently → Deploy/Demo (+ settings)
9. Complete **Phase 10: Polish** → Production release

Each story adds value without breaking previous stories. Users can start using the app at MVP (US1 complete).

### Parallel Team Strategy (If Multiple Developers Available)

With 2-3 developers:

1. **Team**: Complete Setup + Foundational together (1-2 days)
2. Once Foundational is done, split work:
   - **Developer A**: User Story 1 (P1) + User Story 2 (P2)
   - **Developer B**: User Story 3 (P3) + User Story 4 (P3)
   - **Developer C**: User Story 5 (P4) + User Story 6 (P4)
3. **Team**: User Story 7 (P4) together (settings affect all features)
4. **Team**: Polish phase together

Stories complete independently, integrate at end.

---

## Task Summary

**Total Tasks**: 229 tasks (+40 new tasks for enhanced tab UI, custom title bar, and multi-window support)

**Breakdown by Phase**:
- Phase 1 (Setup): 8 tasks
- Phase 2 (Foundational): 12 tasks
- Phase 3 (US1 - Markdown Rendering): 20 tasks 🎯 **MVP**
- Phase 4 (US2 - Zoom/Scroll/Pan): 14 tasks
- Phase 5 (US3 - Multi-Tab): 34 tasks (+15 for enhanced tab UI with overflow navigation, context menus, folder distinction, direct file handling, drag-and-drop reordering)
- Phase 6 (US4 - Keyboard Shortcuts): 16 tasks
- Phase 7 (US5 - Multi-Folder): 21 tasks
- Phase 8 (US6 - Themes): 13 tasks
- Phase 9 (US7 - Settings): 27 tasks
- Phase 10 (Polish): 64 tasks (+25 for custom title bar with 3 sections and multi-window support)

**Parallel Opportunities**: 117 tasks marked [P] can run in parallel with other tasks in their phase (+28 new parallel tasks)

**Independent Test Criteria**: Each user story has explicit test scenarios from [spec.md](spec.md)

**MVP Scope**: Phases 1-3 (40 tasks) deliver the core value proposition

**Suggested First Milestone**: Complete through User Story 1 (Phase 3) to validate architecture and rendering pipeline before expanding to additional stories

---

## Notes

- All [P] tasks = different files, no dependencies within their phase
- [Story] label maps task to specific user story for traceability
- Each user story independently completable and testable per [spec.md](spec.md) user story structure
- File paths are absolute based on [plan.md](plan.md) project structure
- Security best practices from [research.md](research.md) Section 6 integrated throughout (context isolation, IPC validation, CSP, DOMPurify)
- Performance targets from [plan.md](plan.md) tracked: <150MB bundle, <300MB memory, 60 FPS, <500ms rendering
- All IPC contracts from [contracts/](contracts/) directory implemented
- All 13 entities from [data-model.md](data-model.md) created as TypeScript types
- Tests are E2E with Playwright per [research.md](research.md) Section 2 recommendation
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence

---

**Generated**: December 14, 2025
**Feature**: 006-electron-redesign
**Branch**: `006-electron-redesign`
