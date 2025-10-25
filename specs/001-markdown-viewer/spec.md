# Feature Specification: MarkRead – Viewer MVP

**Feature Branch**: `001-markdown-viewer`  
**Created**: 2025-10-25  
**Status**: Draft  
**Input**: User description: "Stand-alone desktop app to view and navigate Markdown in a local project folder."

## Clarifications

### Session 2025-10-25

- Q: When launching with a file path, what is the root directory? → A: Use the file’s parent directory as root for the session.

- FR-017: Command-line start supports an optional first argument specifying a folder or a file to open. If a folder is provided (e.g., `markview .`), the app opens that folder as root; if a file is provided (e.g., `markview design.md`), the app sets the root to the file’s parent directory and opens that file in the active tab.

- If a file argument is outside any previously set root, the app sets the root to the file’s parent directory for the session; if the path is inaccessible, show a friendly error and load the start view.

## User Scenarios & Testing (mandatory)

### User Story 1 - Open folder and view README (Priority: P1)

A user opens a local project folder and immediately sees the rendered README.md with correct styles, images, checklists, code highlighting, and mermaid diagrams.

Why this priority: This is the core value proposition—quickly view Markdown in a project folder without setup.

Independent Test: Start the app, open a folder with a README.md, and verify it renders correctly without errors.

Acceptance Scenarios:

1. Given the app is launched, when the user presses Ctrl+O and selects a folder containing a README.md at its root, then the README.md is rendered in the active tab within seconds and the app title reflects the file name.
2. Given images and relative links in the README, when the document renders, then image paths resolve relative to the file and external http/https links are marked to open in the system browser.
3. Given code fences in Python, SQL, or YAML, when rendered, then syntax highlighting is applied; unknown languages render as plain code without errors.

---

### User Story 2 - Navigate internal links with history (Priority: P2)

From a README, a user follows relative links to other Markdown files, moves to anchors within a page, and uses Back/Forward to move through history.

Why this priority: Fast navigation makes documentation usable across a project.

Independent Test: Click internal links and headings; confirm history navigation works per tab.

Acceptance Scenarios:

1. Given a relative link to another Markdown file in the opened folder, when the user clicks it, then the target file replaces the current view in the same tab.
2. Given the user followed a link or anchor, when the user presses Alt+Left, then the previous location is shown; Alt+Right moves forward if available.
3. Given a link is outside the opened root, when clicked, then the app blocks navigation and shows a friendly message.

---

### User Story 3 - Use tabs and search within document (Priority: P3)

The user opens multiple documents in tabs and searches within a document for specific text.

Why this priority: Tabs support parallel reading; search supports focused reading.

Independent Test: Open two files (one via Ctrl+Click), close a tab, and run Ctrl+F search.

Acceptance Scenarios:

1. Given a link in a document, when the user holds Ctrl and clicks the link, then the target opens in a new tab with focus.
2. Given multiple tabs, when the user presses Ctrl+W, then the active tab closes without affecting others.
3. Given the user presses Ctrl+F, when they search for a term, then all matches are highlighted and next/previous navigate between them (case-insensitive by default).

### Edge Cases

- Very large Markdown files (e.g., >1 MB) should still render with a responsive UI; if slow, show a subtle loading indicator.
- Broken internal links should be indicated inline without crashing the view.
- Mermaid diagram errors should fall back to a friendly message (with raw text available) instead of blocking the page.
- Non-UTF-8 files should display a friendly error or fallback rendering.
- Large images or missing images should not break layout; missing images show an indicator.
- If the file changes on disk while open, and auto-reload is enabled, the view updates after a short debounce without losing the user’s scroll position.
- Invalid CLI path argument (non-existent or inaccessible) shows a friendly error and loads the start view without crashing.
- If a file argument is outside any previously set root, the app sets the root to the file’s parent directory for the session; if the path is inaccessible, show a friendly error and load the start view.

## Requirements (mandatory)

### Functional Requirements

- FR-001: The user can select a folder (Ctrl+O) to set the root; the app remembers this root for the session.
- FR-002: On open, if README.md exists at the root, it is displayed; otherwise, a simple folder overview is shown.
- FR-003: Markdown renders GitHub-style checklists (read-only), fenced code blocks, images, and mermaid diagrams.
- FR-004: Code highlighting is applied for Python, SQL, and YAML; unknown languages render as plain code gracefully.
- FR-005: HTML is sanitized; inline scripts and dangerous attributes are inert or removed; no scripts execute from content.
- FR-006: Relative links and images resolve relative to the current file’s location; links outside the chosen root are blocked with a friendly message.
- FR-007: External http/https links open in the system web browser and the app remains focused.
- FR-008: Each tab maintains its own navigation history; Alt+Left/Alt+Right navigate back/forward within that tab, including anchors and file hops.
- FR-009: A toggleable file tree displays the opened folder; clicking a file opens it in the current tab; Ctrl+Click or a context action can open in a new tab.
- FR-010: Tabs support new (Ctrl+T) and close (Ctrl+W) actions and display the file name; a modified indicator appears only if the file changed on disk.
- FR-011: In-document search (Ctrl+F) highlights all matches, supports next/previous navigation, and is case-insensitive by default.
- FR-012: Themes support system/dark/light; user override persists; UI and content adapt for readability and contrast.
- FR-013: Auto-reload (when enabled) updates the active view after a 250–500 ms debounce on file changes.
- FR-014: Settings include: theme (system/dark/light), start file (readme|last-session), auto-reload (on/off), and show file tree by default (on/off); settings persist between sessions.
- FR-015: No telemetry or background network calls except explicit external link opens.
- FR-016: On render errors, show a friendly message with raw text fallback; broken internal links are indicated inline.
- FR-017: Command-line start supports an optional first argument specifying a folder or a file to open. If a folder is provided (e.g., `markview .`), the app opens that folder as root; if a file is provided (e.g., `markview design.md`), the app sets the root to the file’s parent directory and opens that file in the active tab.

### Key Entities

- Folder Root: The selected directory that bounds navigation and link resolution.
- Document: A Markdown file and its resolved resources (images, diagrams) within the folder root.
- Tab: A container that displays a single document with its own navigation history and search state.
- Settings: Persisted user preferences (theme, start file behavior, auto-reload, sidebar visibility).

### Assumptions

- Target users work on Windows 10/11 laptops and have local project folders with Markdown documentation.
- README.md is the default start file when present; otherwise a folder view is acceptable.
- Auto-reload is enabled by default and can be disabled if performance issues are observed.
- The app operates fully offline once installed; only external link opens touch the network.

## Success Criteria (mandatory)

### Measurable Outcomes

- SC-001: From app launch to rendering a root README.md after selecting a folder takes under 5 seconds on a typical Windows laptop.
- SC-002: 95% of in-document searches return and highlight results in under 1 second on documents up to 1 MB.
- SC-003: Users can traverse at least 10 steps of back/forward history per tab without losing state or encountering errors.
- SC-004: 100% of embedded scripts in Markdown content are inert; security tests confirm no script execution via Markdown.
- SC-005: Theme changes (system/dark/light) apply across UI and content within 1 second and persist across app restarts.
- SC-006: With auto-reload enabled, edits saved to disk appear in the viewer within 0.5–1.0 seconds (debounced) and maintain the user’s scroll position.
- SC-007: Launching via CLI with a folder or file argument opens the target and renders initial content in under 5 seconds on a typical Windows laptop.
