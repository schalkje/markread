# Tasks – MarkRead – Viewer MVP

## Phase 1 – Setup (project initialization)

- [ ] T001 Create WPF app scaffold in src/App (App.xaml, MainWindow.xaml, .csproj)
- [ ] T002 Add WebView2 package and initialize control in src/App/MainWindow.xaml.cs
- [ ] T003 Create project folders per plan in src/Rendering, src/Services, src/UI, src/Cli
- [ ] T004 Add front-end assets folders in src/Rendering/assets (highlight.js, mermaid, styles)
- [ ] T005 Create HTML template for rendering at src/Rendering/template/index.html
- [ ] T006 Create solution/test folders tests/unit and tests/integration
- [ ] T007 Wire keyboard shortcuts (Ctrl+O/Ctrl+T/Ctrl+W/Ctrl+F, Alt+Left/Right) in src/App/App.xaml.cs
- [ ] T008 Implement basic theming bootstrap (system/dark/light toggles) in src/App/ThemeManager.cs
- [ ] T009 Create settings persistence stub in src/Services/SettingsService.cs

## Phase 2 – Foundational (blocking prerequisites)

- [ ] T010 Implement CLI argument parsing (folder or file) in src/Cli/StartupArguments.cs
- [ ] T011 Implement FolderRoot selection and validation in src/Services/FolderService.cs
- [ ] T012 Implement Markdown pipeline (Markdig optional) in src/Services/MarkdownService.cs
- [ ] T013 Implement HTML sanitization utility in src/Services/HtmlSanitizer.cs
- [ ] T014 Implement link resolution and external link routing in src/Services/LinkResolver.cs
- [ ] T015 Implement per-tab navigation history service in src/Services/HistoryService.cs
- [ ] T016 Implement file watcher with debounce (250–500ms) in src/Services/FileWatcherService.cs
- [ ] T017 Create WebView host component and injection bridge in src/Rendering/WebViewHost.cs
- [ ] T018 Load template and inject rendered content plus assets in src/Rendering/Renderer.cs
- [ ] T019 Implement start page (README or folder view) in src/UI/Start/StartView.xaml
- [ ] T020 Integrate SettingsService persistence to disk in src/Services/SettingsService.cs

## Phase 3 – User Story 1 (P1): Open folder and view README

Story goal: Open a folder and render README.md with images, checklists, code highlighting, and mermaid. Independent test criteria in spec → “User Story 1”.

- [ ] T021 [US1] Implement Open Folder command (Ctrl+O) in src/UI/Shell/OpenFolderCommand.cs
- [ ] T022 [P] [US1] Resolve README.md at root and load in active tab in src/Services/FolderService.cs
- [ ] T023 [P] [US1] Apply syntax highlighting (Python, SQL, YAML) via assets in src/Rendering/assets
- [ ] T024 [P] [US1] Integrate Mermaid rendering offline in src/Rendering/assets/mermaid
- [ ] T025 [US1] Ensure image and relative link resolution works in src/Services/LinkResolver.cs
- [ ] T026 [US1] Ensure external links open in system browser in src/Rendering/WebViewHost.cs
- [ ] T027 [US1] Enforce HTML sanitization in render pipeline in src/Services/HtmlSanitizer.cs
- [ ] T028 [US1] Update window title from current document in src/App/MainWindow.xaml.cs
- [ ] T029 [US1] Integration smoke: open folder and render README in tests/integration/StartupSmokeTests.cs

## Phase 4 – User Story 2 (P2): Navigate internal links with history

Story goal: Navigate relative links and anchors; use Back/Forward per tab. Independent test criteria in spec → “User Story 2”.

- [ ] T030 [US2] Intercept link clicks in WebView and route internal links in src/Rendering/WebViewHost.cs
- [ ] T031 [P] [US2] Block links outside root with friendly message in src/Services/LinkResolver.cs
- [ ] T032 [US2] Push history entries on navigation in src/Services/HistoryService.cs
- [ ] T033 [US2] Implement Alt+Left/Alt+Right handlers per tab in src/UI/Shell/NavigationCommands.cs
- [ ] T034 [US2] Support in-document anchor navigation and history in src/Services/HistoryService.cs
- [ ] T035 [US2] Integration test: link traversal + back/forward in tests/integration/HistoryNavigationTests.cs

## Phase 5 – User Story 3 (P3): Tabs and in-document search

Story goal: Multiple tabs and Ctrl+F search with highlights and next/prev. Independent test criteria in spec → “User Story 3”.

- [ ] T036 [US3] Implement tab model and UI (new/close) in src/UI/Tabs/TabsView.xaml
- [ ] T037 [P] [US3] Ctrl+Click opens link in new tab in src/Rendering/WebViewHost.cs
- [ ] T038 [US3] Implement find UI and bridge to content in src/UI/Find/FindBar.xaml
- [ ] T039 [P] [US3] Highlight all matches and next/prev navigation in src/Rendering/content/find.js
- [ ] T040 [US3] Persist per-tab search state in src/Services/HistoryService.cs
- [ ] T041 [US3] Integration test: tabs open/close + Ctrl+F in tests/integration/TabsAndSearchTests.cs

## Phase 6 – Polish & Cross-Cutting Concerns

- [ ] T042 Implement theme settings UI and apply system/dark/light in src/UI/Settings/ThemeSettingsView.xaml
- [ ] T043 Persist settings across sessions (start file, auto-reload, show file tree) in src/Services/SettingsService.cs
- [ ] T044 Implement file tree sidebar toggle and persistence in src/UI/Sidebar/SidebarView.xaml
- [ ] T045 Implement CLI start behavior (file/folder, FR-017/018) integration in src/Cli/Program.cs
- [ ] T046 Handle render errors with raw text fallback in src/Rendering/Renderer.cs
- [ ] T047 Large file loading indicator and scroll preservation in src/Rendering/WebViewHost.cs
- [ ] T048 Run quickstart.md validation in tests/integration/QuickstartValidation.md

## Dependencies (user story order)

- US1 → US2 → US3
- Foundational completes before US1. Setup completes before Foundational.

## Parallel execution examples

- US1: T023 (syntax highlighting) and T024 (Mermaid integration) can run in parallel after T018.
- US2: T031 (block outside root) can run in parallel with T032 (history push).
- US3: T037 (Ctrl+Click new tab) and T039 (highlight matches) can run in parallel after T036.

## Implementation strategy

- MVP delivery focuses on US1 first (open folder and render README), then US2 (navigation/history), then US3 (tabs/search).
- Keep renderer assets self-contained to allow future portability.
- Validate performance targets (startup <5s; search <1s on 1MB docs) during integration tests.
