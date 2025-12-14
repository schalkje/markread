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

- [ ] T001 Create project structure (src/main/, src/renderer/, src/shared/, src/preload/, tests/, build/)
- [ ] T002 Initialize package.json with Electron 39.2.7, Vue 3.4.0, TypeScript 5.3.0 dependencies from [research.md](research.md)
- [ ] T003 [P] Install build tools: electron-vite 2.0.0, electron-builder from [research.md](research.md)
- [ ] T004 [P] Configure TypeScript: tsconfig.json for main/renderer/shared with strict mode
- [ ] T005 [P] Setup ESLint and Prettier configs per [research.md](research.md) code quality standards
- [ ] T006 [P] Create electron-vite.config.ts with main/renderer/preload entry points
- [ ] T007 [P] Configure Playwright E2E testing framework in tests/e2e/ per [research.md](research.md) Section 2
- [ ] T008 Create build/electron-builder.yml for Windows installer packaging (<150MB target from [plan.md](plan.md))

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core Electron infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Security & IPC Foundation

- [ ] T009 Create BrowserWindow with security config (nodeIntegration: false, contextIsolation: true, sandbox: true) in src/main/window-manager.ts per [research.md](research.md) Section 6
- [ ] T010 Implement preload script with contextBridge exposing IPC APIs in src/preload/index.ts per [contracts/README.md](contracts/README.md)
- [ ] T011 Setup IPC handler registration system in src/main/ipc-handlers.ts with Zod validation per [research.md](research.md) Section 6
- [ ] T012 [P] Implement Content Security Policy (CSP) for renderer process in src/main/window-manager.ts per [research.md](research.md) Section 6

### Vue 3 & State Management

- [ ] T013 Setup Vue 3 app entry in src/renderer/app.vue with Composition API per [research.md](research.md) Section 4
- [ ] T014 Configure vue-router for tab navigation in src/renderer/router.ts per [research.md](research.md) Section 4
- [ ] T015 [P] Setup Pinia store structure in src/renderer/stores/ (folders, tabs, panes, settings, theme) per [research.md](research.md) Section 4
- [ ] T016 Create base layout component with sidebar/content/toolbar structure in src/renderer/components/AppLayout.vue

### Shared Types & Error Handling

- [ ] T017 [P] Define TypeScript interfaces for all 13 entities from [data-model.md](data-model.md) in src/shared/types/ (settings.d.ts, folder.d.ts, commands.d.ts, etc.)
- [ ] T018 [P] Create IPC contract types from [contracts/](contracts/) in src/shared/types/ (file-operations, settings, search, window, ui-state)
- [ ] T019 Implement global error handler in src/main/index.ts and src/renderer/error-handler.ts
- [ ] T020 [P] Setup logging infrastructure with LogConfiguration from [data-model.md](data-model.md) in src/main/logger.ts (FR-077)

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Rich Markdown Rendering with Code and Diagrams (Priority: P1) 🎯 MVP

**Goal**: Render complex markdown documents with syntax highlighting, Mermaid diagrams, tables, task lists within 500ms (SC-001)

**Independent Test**: Open a markdown file containing GFM (tables, task lists), code blocks in 5+ languages, embedded images, and a Mermaid diagram. Verify all elements render correctly with proper syntax highlighting within 500ms per [spec.md](spec.md) User Story 1.

### E2E Tests for User Story 1

> **NOTE: Write these tests FIRST with Playwright, ensure they FAIL before implementation**

- [ ] T021 [P] [US1] E2E test for markdown rendering in tests/e2e/rendering.spec.ts: verify GFM, code blocks, diagrams render correctly
- [ ] T022 [P] [US1] E2E test for syntax highlighting in tests/e2e/rendering.spec.ts: verify 5+ languages display with colors
- [ ] T023 [P] [US1] E2E test for Mermaid diagrams in tests/e2e/rendering.spec.ts: verify diagram appears as graphic not code
- [ ] T024 [P] [US1] E2E test for performance in tests/e2e/rendering.spec.ts: verify complex doc renders <500ms (SC-001)

### Core Rendering Pipeline

- [ ] T025 [US1] Configure markdown-it v14.1.0 with GFM plugins (task lists, tables, linkify) in src/renderer/services/markdown-renderer.ts per [research.md](research.md) Section 9
- [ ] T026 [US1] Integrate Highlight.js v11.11.1 with markdown-it highlight callback in src/renderer/services/markdown-renderer.ts per [research.md](research.md) Section 10
- [ ] T027 [P] [US1] Register 40 common languages for Highlight.js (JavaScript, Python, TypeScript, etc.) in src/renderer/services/markdown-renderer.ts per [research.md](research.md) Section 10
- [ ] T028 [US1] Implement custom markdown-it fence rule for Mermaid diagrams in src/renderer/services/markdown-renderer.ts per [research.md](research.md) Section 11
- [ ] T029 [US1] Configure Mermaid v11.12.2 with securityLevel: 'strict' in src/renderer/services/markdown-renderer.ts per [research.md](research.md) Section 11
- [ ] T030 [US1] Integrate DOMPurify v3.3.1 sanitization after markdown-it rendering in src/renderer/services/markdown-renderer.ts per [research.md](research.md) Section 12

### Image & Link Resolution

- [ ] T031 [P] [US1] Implement custom markdown-it image renderer with file:// path resolution in src/renderer/services/markdown-renderer.ts per [research.md](research.md) Section 13
- [ ] T032 [P] [US1] Add path sanitization to prevent directory traversal in src/renderer/services/markdown-renderer.ts per [research.md](research.md) Section 13
- [ ] T033 [P] [US1] Add rel="noopener noreferrer" to external links via DOMPurify hook in src/renderer/services/markdown-renderer.ts per [research.md](research.md) Section 12

### File Operations & IPC

- [ ] T034 [US1] Implement file:read IPC handler in src/main/ipc-handlers.ts per [contracts/file-operations.contract.ts](contracts/file-operations.contract.ts)
- [ ] T035 [US1] Implement file:openFileDialog IPC handler in src/main/ipc-handlers.ts per [contracts/file-operations.contract.ts](contracts/file-operations.contract.ts)
- [ ] T036 [US1] Implement file:resolvePath IPC handler for image resolution in src/main/ipc-handlers.ts per [contracts/file-operations.contract.ts](contracts/file-operations.contract.ts)

### UI Components

- [ ] T037 [US1] Create MarkdownViewer component in src/renderer/components/markdown/MarkdownViewer.vue to display rendered HTML
- [ ] T038 [US1] Create FileOpener component in src/renderer/components/FileOpener.vue with file dialog integration
- [ ] T039 [US1] Integrate MarkdownViewer with Pinia tabs store in src/renderer/stores/tabs.ts to track active file
- [ ] T040 [US1] Add loading state and error handling to MarkdownViewer component

**Checkpoint**: At this point, User Story 1 should be fully functional - users can open markdown files and see rich rendering with syntax highlighting and diagrams

---

## Phase 4: User Story 2 - Smooth Zoom, Scroll, and Page Navigation (Priority: P2)

**Goal**: Enable fluid navigation with zoom (10%-2000%), smooth 60 FPS scrolling, pan, and jump-to-heading per [spec.md](spec.md) User Story 2

**Independent Test**: Open a 50-page markdown document. Zoom to 200%, pan content, scroll smoothly at 60 FPS, jump to headings. All interactions respond within 50ms per [spec.md](spec.md) User Story 2.

### E2E Tests for User Story 2

- [ ] T041 [P] [US2] E2E test for zoom functionality in tests/e2e/navigation.spec.ts: verify 10%-2000% range, scroll preservation (SC-004)
- [ ] T042 [P] [US2] E2E test for pan in tests/e2e/navigation.spec.ts: verify click-drag panning when zoomed
- [ ] T043 [P] [US2] E2E test for smooth scrolling in tests/e2e/navigation.spec.ts: verify 60 FPS (SC-005)

### Zoom Implementation

- [ ] T044 [P] [US2] Create ZoomControls component in src/renderer/components/editor/ZoomControls.vue with +/- buttons and reset
- [ ] T045 [US2] Implement zoom state management in src/renderer/stores/tabs.ts (zoomLevel: 10-2000 per [data-model.md](data-model.md) Tab entity)
- [ ] T046 [US2] Add keyboard shortcuts for zoom (Ctrl+Plus, Ctrl+Minus, Ctrl+0) in src/renderer/services/keyboard-handler.ts
- [ ] T047 [US2] Implement CSS transform scaling in MarkdownViewer with scroll position preservation

### Pan & Scroll

- [ ] T048 [P] [US2] Implement pan functionality with click-drag in src/renderer/components/markdown/MarkdownViewer.vue
- [ ] T049 [P] [US2] Add grab cursor styling when panning
- [ ] T050 [US2] Optimize scroll performance with requestAnimationFrame in src/renderer/services/scroll-optimizer.ts per [research.md](research.md) Section 5
- [ ] T051 [P] [US2] Add touch gesture support for pinch-zoom and pan

### Navigation

- [ ] T052 [P] [US2] Create TableOfContents component in src/renderer/components/editor/TableOfContents.vue to extract headings
- [ ] T053 [P] [US2] Implement jump-to-heading functionality with smooth scroll
- [ ] T054 [P] [US2] Add Ctrl+G shortcut for quick heading navigation

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently - users can open files (US1) and navigate them smoothly with zoom/pan/scroll (US2)

---

## Phase 5: User Story 3 - Multi-Tab and Multi-Document Navigation (Priority: P3)

**Goal**: Multi-tab interface with tab switching (Ctrl+Tab, Ctrl+1-9), navigation history (Alt+Left/Right), split view per [spec.md](spec.md) User Story 3

**Independent Test**: Open 5 markdown files in tabs, switch between them using shortcuts, navigate via links then use history, split view to compare docs. All operations <100ms per [spec.md](spec.md) User Story 3.

### E2E Tests for User Story 3

- [ ] T055 [P] [US3] E2E test for tab switching in tests/e2e/navigation.spec.ts: verify Ctrl+Tab, Ctrl+1-9 shortcuts (SC-006)
- [ ] T056 [P] [US3] E2E test for navigation history in tests/e2e/navigation.spec.ts: verify Alt+Left/Right, scroll restoration
- [ ] T057 [P] [US3] E2E test for split view in tests/e2e/navigation.spec.ts: verify independent scroll, zoom per pane

### Tab Management

- [ ] T058 [P] [US3] Create Tab entity type from [data-model.md](data-model.md) in src/shared/types/tab.d.ts (id, filePath, title, scrollPosition, zoomLevel, searchState)
- [ ] T059 [US3] Implement tabs store in src/renderer/stores/tabs.ts with Tab[] collection, activeTabId, max 50 tabs (soft 20, hard 50 per [data-model.md](data-model.md))
- [ ] T060 [P] [US3] Create TabBar component in src/renderer/components/editor/TabBar.vue with close buttons, active state
- [ ] T061 [US3] Implement tab switching logic with Ctrl+Tab (next), Ctrl+Shift+Tab (previous), Ctrl+1-9 (jump to index) in src/renderer/services/keyboard-handler.ts
- [ ] T062 [US3] Add tab close functionality (Ctrl+W) with next tab activation in src/renderer/stores/tabs.ts
- [ ] T063 [US3] Implement tab limit warnings: soft limit at 20 tabs (warning dialog), hard limit at 50 tabs (block) per [spec.md](spec.md) Clarifications

### Navigation History

- [ ] T064 [P] [US3] Create HistoryEntry type from [data-model.md](data-model.md) in src/shared/types/tab.d.ts (filePath, scrollPosition, timestamp)
- [ ] T065 [US3] Implement navigation history stack in src/renderer/stores/tabs.ts (max 50 entries per tab per [data-model.md](data-model.md))
- [ ] T066 [US3] Add Alt+Left (back) and Alt+Right (forward) keyboard shortcuts in src/renderer/services/keyboard-handler.ts
- [ ] T067 [US3] Implement scroll position restoration when navigating history

### Split View

- [ ] T068 [P] [US3] Create Pane entity type from [data-model.md](data-model.md) in src/shared/types/pane.d.ts (id, tabs, activeTabId, orientation, sizeRatio)
- [ ] T069 [US3] Implement panes store in src/renderer/stores/panes.ts with split layout management per [data-model.md](data-model.md)
- [ ] T070 [P] [US3] Create SplitView component in src/renderer/components/editor/SplitView.vue with resizable divider
- [ ] T071 [US3] Add keyboard shortcuts for split: Ctrl+\\ (vertical), Ctrl+K Ctrl+\\ (horizontal) in src/renderer/services/keyboard-handler.ts
- [ ] T072 [US3] Implement independent scroll/zoom state per pane in src/renderer/stores/panes.ts
- [ ] T073 [US3] Add responsive stacking for narrow windows (<768px) per [spec.md](spec.md) Edge Cases

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

- [ ] T077 [P] [US4] Create Command entity type from [data-model.md](data-model.md) in src/shared/types/commands.d.ts (id, label, category, defaultShortcut, whenClause)
- [ ] T078 [US4] Implement command registry in src/renderer/services/command-service.ts with 80+ commands per [data-model.md](data-model.md)
- [ ] T079 [P] [US4] Register all file commands (open, close, save as PDF) in src/renderer/services/command-service.ts
- [ ] T080 [P] [US4] Register all navigation commands (tabs, panes, history) in src/renderer/services/command-service.ts
- [ ] T081 [P] [US4] Register all view commands (zoom, theme, sidebar) in src/renderer/services/command-service.ts
- [ ] T082 [P] [US4] Register all search commands (find in page, find in files) in src/renderer/services/command-service.ts

### Command Palette

- [ ] T083 [P] [US4] Create CommandPalette component in src/renderer/components/command-palette/CommandPalette.vue with fuzzy search
- [ ] T084 [US4] Implement fuzzy search algorithm for command filtering in src/renderer/services/command-service.ts
- [ ] T085 [US4] Add keyboard navigation (up/down arrows, Enter to execute, Escape to close) to CommandPalette
- [ ] T086 [US4] Show keyboard shortcuts next to command names in palette (FR-082)
- [ ] T087 [US4] Prioritize recently used commands in search results (FR-083)

### Keyboard Shortcuts

- [ ] T088 [P] [US4] Create KeyboardShortcut entity type from [data-model.md](data-model.md) in src/shared/types/keyboard.d.ts (id, commandId, keyCombination, isCustom)
- [ ] T089 [US4] Implement keyboard event handler in src/renderer/services/keyboard-handler.ts with whenClause evaluation
- [ ] T090 [P] [US4] Create ShortcutsReference component in src/renderer/components/help/ShortcutsReference.vue organized by category (FR-080)
- [ ] T091 [US4] Add F1 shortcut to open shortcuts reference (FR-080)
- [ ] T092 [US4] Implement conflict detection for custom shortcuts in src/renderer/services/keyboard-handler.ts per [spec.md](spec.md) Edge Cases

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

- [ ] T096 [P] [US5] Create Folder entity type from [data-model.md](data-model.md) in src/shared/types/folder.d.ts (id, path, fileTreeState, tabCollection, activeFolderId)
- [ ] T097 [US5] Implement folders store in src/renderer/stores/folders.ts with Folder[] array, activeFolder
- [ ] T098 [P] [US5] Implement file:openFolderDialog IPC handler in src/main/ipc-handlers.ts per [contracts/file-operations.contract.ts](contracts/file-operations.contract.ts)
- [ ] T099 [US5] Add folder to folders store when opened, track active folder
- [ ] T100 [US5] Implement folder close functionality, cleanup tabs and file watcher

### File Tree

- [ ] T101 [P] [US5] Create FileTreeNode type from [contracts/file-operations.contract.ts](contracts/file-operations.contract.ts) in src/shared/types/file-tree.d.ts
- [ ] T102 [US5] Implement file:getFolderTree IPC handler in src/main/ipc-handlers.ts with recursive directory traversal per [contracts/file-operations.contract.ts](contracts/file-operations.contract.ts)
- [ ] T103 [P] [US5] Create FileTree component in src/renderer/components/sidebar/FileTree.vue with expand/collapse
- [ ] T104 [US5] Implement TanStack Virtual for file tree virtualization (activates at 1000+ files) in src/renderer/components/sidebar/FileTree.vue per [research.md](research.md) Section 7
- [ ] T105 [US5] Add file tree expansion state persistence in src/renderer/stores/folders.ts per [data-model.md](data-model.md) FileTreeState

### File Watching

- [ ] T106 [P] [US5] Create FileWatcher entity type from [data-model.md](data-model.md) in src/shared/types/file-watcher.d.ts (id, watchedPath, filePatterns, debounceInterval)
- [ ] T107 [US5] Implement file watching with chokidar v5 in src/main/file-watcher.ts with 300ms debounce per [research.md](research.md) Section 3, 8
- [ ] T108 [US5] Implement file:watchFolder and file:stopWatching IPC handlers in src/main/ipc-handlers.ts per [contracts/file-operations.contract.ts](contracts/file-operations.contract.ts)
- [ ] T109 [US5] Send file:changed events to renderer when files modified (FR-020)
- [ ] T110 [US5] Handle file:changed events in renderer: auto-reload files preserving scroll/zoom per [spec.md](spec.md) Clarifications (FR-021)

### Folder Switcher UI

- [ ] T111 [P] [US5] Create FolderSwitcher component in src/renderer/components/sidebar/FolderSwitcher.vue with dropdown
- [ ] T112 [US5] Display all open folders in switcher, highlight active folder
- [ ] T113 [US5] Switch active folder on selection, update file tree and tabs

**Checkpoint**: All five user stories now work - multi-folder workspaces with file watching functional

---

## Phase 8: User Story 6 - Theme Customization with Dark/Light/High Contrast (Priority: P4)

**Goal**: System/Dark/Light/High Contrast themes with 200ms switching per [spec.md](spec.md) User Story 6

**Independent Test**: Verify app respects system theme. Use command palette to switch to dark, light, high contrast. Verify all UI updates within 200ms. Verify 7:1 contrast in high contrast mode per [spec.md](spec.md) User Story 6.

### E2E Tests for User Story 6

- [ ] T114 [P] [US6] E2E test for theme switching in tests/e2e/settings.spec.ts: verify <200ms switch time (FR-032)
- [ ] T115 [P] [US6] E2E test for high contrast in tests/e2e/settings.spec.ts: verify 7:1 contrast ratio (FR-031)

### Theme System

- [ ] T116 [P] [US6] Create Theme entity type from [data-model.md](data-model.md) in src/shared/types/theme.d.ts (id, name, type, colorMappings, syntaxHighlightTheme)
- [ ] T117 [US6] Create built-in theme definitions in src/assets/themes/ (system-light.json, system-dark.json, high-contrast-light.json, high-contrast-dark.json) per [data-model.md](data-model.md)
- [ ] T118 [P] [US6] Implement theme store in src/renderer/stores/theme.ts with active theme, available themes
- [ ] T119 [US6] Implement theme loading from JSON in src/renderer/services/theme-manager.ts
- [ ] T120 [US6] Apply theme to UI via CSS custom properties with <200ms target (FR-032)

### Theme Switching

- [ ] T121 [P] [US6] Add "Change Theme" command in src/renderer/services/command-service.ts
- [ ] T122 [US6] Create theme selector UI in command palette or settings
- [ ] T123 [US6] Implement system theme detection and auto-switch in src/renderer/services/theme-manager.ts (FR-034)
- [ ] T124 [US6] Update Mermaid theme when app theme changes in src/renderer/services/markdown-renderer.ts per [research.md](research.md) Section 11

### Syntax Highlighting Themes

- [ ] T125 [P] [US6] Load Highlight.js CSS themes for light/dark modes in src/renderer/services/markdown-renderer.ts per [research.md](research.md) Section 10
- [ ] T126 [US6] Switch syntax highlighting theme CSS when app theme changes

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

- [ ] T131 [P] [US7] Create Settings entity type from [data-model.md](data-model.md) in src/shared/types/settings.d.ts (appearance, behavior, search, performance, keyboard, advanced)
- [ ] T132 [US7] Implement settings manager in src/main/settings-manager.ts with atomic writes and backup per [research.md](research.md) Section 6, [contracts/settings.contract.ts](contracts/settings.contract.ts)
- [ ] T133 [P] [US7] Implement settings:load IPC handler in src/main/ipc-handlers.ts per [contracts/settings.contract.ts](contracts/settings.contract.ts)
- [ ] T134 [P] [US7] Implement settings:save IPC handler with validation (Zod schemas) in src/main/ipc-handlers.ts per [contracts/settings.contract.ts](contracts/settings.contract.ts)
- [ ] T135 [P] [US7] Implement settings:validate IPC handler for live preview in src/main/ipc-handlers.ts per [contracts/settings.contract.ts](contracts/settings.contract.ts)
- [ ] T136 [US7] Handle corrupted settings.json: detect, restore from backup, reset to defaults (FR-057) in src/main/settings-manager.ts

### Settings UI

- [ ] T137 [P] [US7] Create SettingsWindow component in src/renderer/components/settings/SettingsWindow.vue with 5 tabs (Appearance, Behavior, Search, Performance, Keyboard) per [data-model.md](data-model.md)
- [ ] T138 [P] [US7] Create AppearancePanel component in src/renderer/components/settings/AppearancePanel.vue (theme, fonts, line height, sidebar width) per [data-model.md](data-model.md) FR-063-067
- [ ] T139 [P] [US7] Create BehaviorPanel component in src/renderer/components/settings/BehaviorPanel.vue (auto-reload, tabs, scrolling) per [data-model.md](data-model.md) FR-068-070
- [ ] T140 [P] [US7] Create SearchPanel component in src/renderer/components/settings/SearchPanel.vue (case sensitive, history, exclusions) per [data-model.md](data-model.md) FR-071-073
- [ ] T141 [P] [US7] Create PerformancePanel component in src/renderer/components/settings/PerformancePanel.vue (indexing, large file threshold) per [data-model.md](data-model.md) FR-074-075
- [ ] T142 [P] [US7] Create KeyboardPanel component in src/renderer/components/settings/KeyboardPanel.vue with shortcut customization and conflict detection per [data-model.md](data-model.md) FR-088
- [ ] T143 [US7] Implement live preview for appearance settings: update active document in real-time (FR-055)
- [ ] T144 [US7] Add Ctrl+, keyboard shortcut to open settings in src/renderer/services/keyboard-handler.ts

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

- [ ] T159 [P] Implement native Windows menu bar (File, Edit, View, Go, Help) in src/main/menu-builder.ts (FR-026)
- [ ] T160 [P] Register .md and .markdown file associations on Windows in src/main/index.ts (FR-022)
- [ ] T161 [P] Implement Windows Explorer context menu "Open with MarkRead" in build/installer.nsi or electron-builder.yml (FR-024)
- [ ] T162 [P] Implement Windows taskbar jumplist with recent files in src/main/index.ts (FR-025)
- [ ] T163 [P] Register global keyboard shortcut (e.g., Ctrl+Alt+M) in src/main/index.ts (FR-029)

### UI State Persistence

- [ ] T164 [P] Create UIState entity type from [data-model.md](data-model.md) in src/shared/types/ui-state.d.ts (windowBounds, sidebarWidth, activeFolder, folders, recentItems)
- [ ] T165 Implement uiState:load and uiState:save IPC handlers in src/main/ipc-handlers.ts per [contracts/ui-state.contract.ts](contracts/ui-state.contract.ts)
- [ ] T166 Save window bounds on resize/move with 500ms debounce in src/main/window-manager.ts (FR-062)
- [ ] T167 Restore window bounds, folders, tabs on app launch from ui-state.json (FR-007)
- [ ] T168 Save split layouts per folder in src/renderer/stores/panes.ts (FR-018)

### Search Implementation

- [ ] T169 [P] Implement in-page search (Ctrl+F) with case-sensitive, whole-word, regex options in src/renderer/components/search/FindBar.vue (FR-042)
- [ ] T170 Implement cross-file search (Ctrl+Shift+F) with async progress and cancel in src/main/search-service.ts (FR-043, FR-044)
- [ ] T171 [P] Create search results panel with file grouping and preview snippets in src/renderer/components/search/SearchResults.vue per [contracts/search.contract.ts](contracts/search.contract.ts)
- [ ] T172 [P] Implement search history with max 200 entries in src/renderer/stores/search.ts (FR-071)

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
Task T060: "Create TabBar component in src/renderer/components/editor/TabBar.vue"
Task T070: "Create SplitView component in src/renderer/components/editor/SplitView.vue"
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

**Total Tasks**: 189 tasks

**Breakdown by Phase**:
- Phase 1 (Setup): 8 tasks
- Phase 2 (Foundational): 12 tasks
- Phase 3 (US1 - Markdown Rendering): 20 tasks 🎯 **MVP**
- Phase 4 (US2 - Zoom/Scroll/Pan): 14 tasks
- Phase 5 (US3 - Multi-Tab): 19 tasks
- Phase 6 (US4 - Keyboard Shortcuts): 16 tasks
- Phase 7 (US5 - Multi-Folder): 21 tasks
- Phase 8 (US6 - Themes): 13 tasks
- Phase 9 (US7 - Settings): 27 tasks
- Phase 10 (Polish): 39 tasks

**Parallel Opportunities**: 89 tasks marked [P] can run in parallel with other tasks in their phase

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
