# MarkRead – Markdown Viewer (Windows)

An application to view and navigate markdown files in a folder on the drive of a windows pc. Typically use case is a development project, in git, with a markdown based documentation structure of linked markdown files.
There can also be unlinked files.

The viewer should show and support:

- code blocks
- todo lists
- mermaid diagrams
- images

This application should run stand-alone on a windows laptop. It should use open source libraries voor interpreting, handling showing markdown files and all possibilities.

The application should support dark and light mode.
There should be multiple tabs
There should be a navigation history, where the user can go one step back, or multiple

## MVP scope

- Viewer-only (no editing in MVP)
- In-document search (Ctrl+F)
- File tree sidebar (toggle show/hide)
- Multiple tabs for open documents
- Back/forward navigation history
- Dark and light themes

## Rendering

- Markdown features: code blocks, todo checkboxes, mermaid diagrams, images
- Syntax highlighting languages (MVP): Python, SQL, YAML
- No math/KaTeX in MVP
- Sanitize HTML; do not execute scripts
- Resolve relative links and images relative to the current file
- External links open in the system web browser

## Navigation

- Internal links open in the same tab by default; Ctrl+Click opens in a new tab
- Clickable links across the opened folder
- Auto-reload when files change on disk (with a small debounce)

## Sidebar and start

- Toggleable file tree for the opened folder
- Start page opens README.md if present; otherwise show a simple folder view

## Platform and packaging

- Windows 10/11
- Stand-alone desktop app; offline after install
- No telemetry

## Settings (minimal)

- Theme: system/dark/light
- Start file: README.md or last session
- Auto-reload on file change: on/off
- Show file tree by default: on/off

## Keyboard shortcuts

- Ctrl+O: Open folder
- Ctrl+T: New tab
- Ctrl+W: Close tab
- Alt+Left/Right: Back/Forward
- Ctrl+F: Find in document

## Non-goals (initial)

- Editing Markdown files
- Math/KaTeX rendering
- Plugin system or extensibility
- Cloud sync or collaboration features
- Heavy full‑text indexing/search

## Technical approach (choose based on available open-source libraries)

- .NET WPF + WebView2
  - Markdown via Markdig or a web renderer; Prism/Highlight.js for code; Mermaid bundled for offline use
- Tauri (Rust) + WebView2
  - Front-end using markdown-it, Prism/Highlight.js, Mermaid
- Electron (Node.js/Chromium)
  - markdown-it, Prism/Highlight.js, Mermaid
- Goals: small footprint, fast startup, offline-capable

## Nice-to-haves (backlog)

- Cross-file search
- Export to PDF/print
- Bookmarks/favorites

## Accessibility and UX

- Respect system font scaling and high-contrast mode
- Keyboard-navigable UI throughout

## Error handling

- Friendly message on render errors with raw text fallback
- Indicate broken internal links where possible

---

## Spec commands (speckit)

<!--
Note: The following blocks use a YAML-in-HTML-comment format under the key
"speckit.specify". Assumption: your tooling scans Markdown comments for
"speckit.specify" and ingests the nested YAML as atomic specification items.
IDs are kebab-case and stable; status is one of: proposed | accepted | done.
-->

<!--
speckit.specify:
  type: product
  id: markread
  title: MarkRead – Markdown Viewer (Windows)
  description: Stand-alone desktop app to view and navigate Markdown in a local project folder.
  goals:
    - Small footprint, fast startup, offline-capable
    - Safe rendering with sanitized HTML
  status: proposed
  tags: [windows, desktop, markdown, viewer]
-->

<!--
speckit.specify:
  type: feature
  id: mvp.viewer-only
  title: Viewer-only mode (no editing)
  description: MVP disables any content editing; app acts strictly as a reader.
  acceptance:
    - No editable text areas for Markdown content
    - Context menus omit Edit/Save actions
    - Keyboard input does not modify file contents
  priority: must
  status: proposed
  tags: [mvp]
-->

<!--
speckit.specify:
  type: feature
  id: mvp.in-document-search
  title: In-document search
  description: Find text within the currently open Markdown document.
  acceptance:
    - Ctrl+F opens a search UI within the tab
    - Next/Previous navigation across matches
    - Highlights all matches; search is case-insensitive by default
  priority: must
  status: proposed
  tags: [mvp, search]
-->

<!--
speckit.specify:
  type: feature
  id: mvp.file-tree
  title: File tree sidebar
  description: Toggleable file tree for the opened folder.
  acceptance:
    - Sidebar can be shown/hidden via UI and setting
    - Clicking a file opens it in the current tab by default
    - Right-click or Ctrl+Click can open in a new tab
  priority: must
  status: proposed
  tags: [mvp, navigation, sidebar]
-->

<!--
speckit.specify:
  type: feature
  id: mvp.tabs
  title: Multiple tabs
  description: Support multiple open documents via tabbed interface.
  acceptance:
    - Ctrl+T opens a new empty tab or start view
    - Ctrl+W closes the active tab
    - Tabs show file name and modified indicator only if file changed on disk
  priority: must
  status: proposed
  tags: [mvp, ux]
-->

<!--
speckit.specify:
  type: feature
  id: mvp.history
  title: Back/forward navigation history
  description: Per-tab navigation history for internal link traversal.
  acceptance:
    - Alt+Left navigates back; Alt+Right navigates forward
    - History includes in-document anchor navigations and file-to-file hops
  priority: must
  status: proposed
  tags: [mvp, navigation]
-->

<!--
speckit.specify:
  type: feature
  id: mvp.themes
  title: Dark and light themes
  description: Support system, dark, and light themes.
  acceptance:
    - Theme follows system by default
    - User can override to dark or light in Settings
    - All UI and content styles adapt for contrast and readability
  priority: must
  status: proposed
  tags: [mvp, theming, accessibility]
-->

<!-- Rendering -->

<!--
speckit.specify:
  type: rendering
  id: render.markdown-core
  title: Markdown rendering core
  description: Render Markdown with code blocks, todo checkboxes, images, and mermaid diagrams.
  acceptance:
    - Github-flavored checklist syntax renders as checkboxes (disabled)
    - Fenced code blocks render with syntax highlighting
    - Images resolve relative to the file location and support file:// URIs
    - Mermaid diagrams render offline using a bundled engine
  status: proposed
  tags: [rendering, markdown, mermaid]
-->

<!--
speckit.specify:
  type: rendering
  id: render.syntax-highlighting
  title: Syntax highlighting languages (MVP)
  description: Highlight Python, SQL, and YAML code blocks.
  acceptance:
    - Code fences with language hints python|sql|yaml are highlighted
    - Unknown languages fall back to plain code style without errors
  status: proposed
  tags: [rendering, syntax]
-->

<!--
speckit.specify:
  type: security
  id: render.html-sanitization
  title: Sanitize HTML and disable scripts
  description: Do not execute scripts or unsafe HTML in rendered content.
  acceptance:
    - Inline scripts are stripped or inert
    - Dangerous attributes (onload, onclick, etc.) are removed
    - Links use rel="noopener noreferrer" where applicable
  status: proposed
  tags: [security]
-->

<!--
speckit.specify:
  type: rendering
  id: render.link-resolution
  title: Resolve relative links and images
  description: Links and image paths resolve relative to the current file.
  acceptance:
    - Relative links navigate within the opened folder
    - Broken links show an inline indicator/error state
  status: proposed
  tags: [rendering, navigation]
-->

<!--
speckit.specify:
  type: behavior
  id: render.external-links
  title: External links open in system browser
  description: http/https links open externally via default OS browser.
  acceptance:
    - Clicking an external link launches the system browser
    - App remains focused after opening the external link
  status: proposed
  tags: [navigation]
-->

<!-- Navigation -->

<!--
speckit.specify:
  type: behavior
  id: nav.internal-link-defaults
  title: Internal link behavior
  description: Internal links open in the same tab; Ctrl+Click opens in a new tab.
  acceptance:
    - Clicking a relative link replaces content in the current tab
    - Ctrl+Click opens the target in a new tab
  status: proposed
  tags: [navigation, ux]
-->

<!--
speckit.specify:
  type: behavior
  id: nav.cross-folder-links
  title: Clickable links across opened folder
  description: Navigate to any file under the chosen root folder via links.
  acceptance:
    - Links to sibling and nested files work if under the root
    - Links outside the root are blocked with a friendly message
  status: proposed
  tags: [navigation]
-->

<!--
speckit.specify:
  type: performance
  id: nav.auto-reload
  title: Auto-reload on file change
  description: Watch files and update the active view with a debounce.
  acceptance:
    - File changes on disk trigger reload within 250–500ms debounce
    - Toggle via setting; off by default if performance issues are detected
  status: proposed
  tags: [watch, reload]
-->

<!-- Sidebar and start -->

<!--
speckit.specify:
  type: feature
  id: sidebar.toggle
  title: Toggleable file tree
  description: Show/hide folder tree for navigation.
  acceptance:
    - Toggle button in UI; persisted per session
    - Default controlled by a setting
  status: proposed
  tags: [sidebar, navigation]
-->

<!--
speckit.specify:
  type: behavior
  id: start.readme-or-folder
  title: Start page shows README or folder
  description: On open, show README.md if present; otherwise, a simple folder view.
  acceptance:
    - If README.md exists at root, it opens automatically
    - Else render a simple folder overview with quick open actions
  status: proposed
  tags: [startup]
-->

<!-- Platform and packaging -->

<!--
speckit.specify:
  type: platform
  id: platform.windows
  title: Windows 10/11 support
  description: App runs on Windows 10 and 11 without additional dependencies after install.
  acceptance:
    - Single installer produces a working offline app
    - Verified on Windows 10 and Windows 11 latest patch levels
  status: proposed
  tags: [windows, packaging]
-->

<!--
speckit.specify:
  type: privacy
  id: privacy.no-telemetry
  title: No telemetry
  description: Do not collect or send usage data.
  acceptance:
    - No outbound network calls except explicit external link opens
    - No analytics libraries bundled
  status: proposed
  tags: [privacy]
-->

<!-- Settings -->

<!--
speckit.specify:
  type: setting
  id: setting.theme
  title: Theme
  description: Choose system|dark|light
  schema:
    type: enum
    values: [system, dark, light]
    default: system
  status: proposed
  tags: [settings, theming]
-->

<!--
speckit.specify:
  type: setting
  id: setting.start-file
  title: Start file
  description: Choose README.md or last session restore
  schema:
    type: enum
    values: [readme, last-session]
    default: readme
  status: proposed
  tags: [settings, startup]
-->

<!--
speckit.specify:
  type: setting
  id: setting.auto-reload
  title: Auto-reload on file change
  description: Toggle file watch reload behavior
  schema:
    type: boolean
    default: true
  status: proposed
  tags: [settings]
-->

<!--
speckit.specify:
  type: setting
  id: setting.show-file-tree
  title: Show file tree by default
  description: Whether the sidebar is visible at startup
  schema:
    type: boolean
    default: true
  status: proposed
  tags: [settings, sidebar]
-->

<!-- Keyboard shortcuts -->

<!--
speckit.specify:
  type: shortcut
  id: shortcut.open-folder
  title: Open folder
  keys: Ctrl+O
  action: app.openFolder
  acceptance:
    - Opens folder select dialog and sets root
  status: proposed
  tags: [shortcut]
-->

<!--
speckit.specify:
  type: shortcut
  id: shortcut.new-tab
  title: New tab
  keys: Ctrl+T
  action: tab.new
  status: proposed
  tags: [shortcut]
-->

<!--
speckit.specify:
  type: shortcut
  id: shortcut.close-tab
  title: Close tab
  keys: Ctrl+W
  action: tab.close
  status: proposed
  tags: [shortcut]
-->

<!--
speckit.specify:
  type: shortcut
  id: shortcut.back-forward
  title: Back and Forward
  keys: Alt+Left/Alt+Right
  action: nav.backForward
  status: proposed
  tags: [shortcut]
-->

<!--
speckit.specify:
  type: shortcut
  id: shortcut.find
  title: Find in document
  keys: Ctrl+F
  action: find.open
  status: proposed
  tags: [shortcut]
-->

<!-- Non-goals and backlog -->

<!--
speckit.specify:
  type: out_of_scope
  id: nogo.editing
  title: Editing Markdown files
  description: Editing is explicitly excluded from MVP.
  status: proposed
  tags: [nongoal]
-->

<!--
speckit.specify:
  type: out_of_scope
  id: nogo.math
  title: Math/KaTeX rendering
  status: proposed
  tags: [nongoal]
-->

<!--
speckit.specify:
  type: backlog
  id: backlog.cross-file-search
  title: Cross-file search
  status: proposed
  tags: [backlog, search]
-->

<!--
speckit.specify:
  type: backlog
  id: backlog.export
  title: Export to PDF/print
  status: proposed
  tags: [backlog]
-->

<!--
speckit.specify:
  type: backlog
  id: backlog.bookmarks
  title: Bookmarks/favorites
  status: proposed
  tags: [backlog]
-->

<!-- Accessibility and error handling -->

<!--
speckit.specify:
  type: accessibility
  id: a11y.scaling-contrast
  title: Respect system scaling and high-contrast
  acceptance:
    - Text scales with system settings
    - High-contrast mode uses appropriate colors
    - All interactive controls are keyboard reachable
  status: proposed
  tags: [accessibility]
-->

<!--
speckit.specify:
  type: error_handling
  id: error.fallback
  title: Friendly render error fallback
  acceptance:
    - On render failure, show message and raw markdown text
    - Broken internal links indicate missing targets
  status: proposed
  tags: [error]
-->

<!-- Architecture options (decision record) -->

<!--
speckit.specify:
  type: architecture_option
  id: arch.dotnet-wpf
  title: .NET WPF + WebView2
  description: Markdig or web renderer; Prism/Highlight.js; bundled Mermaid.
  status: proposed
  tags: [architecture, dotnet]
-->

<!--
speckit.specify:
  type: architecture_option
  id: arch.tauri
  title: Tauri (Rust) + WebView2
  description: markdown-it, Prism/Highlight.js, Mermaid.
  status: proposed
  tags: [architecture, rust]
-->

<!--
speckit.specify:
  type: architecture_option
  id: arch.electron
  title: Electron (Node.js/Chromium)
  description: markdown-it, Prism/Highlight.js, Mermaid.
  status: proposed
  tags: [architecture, node]
-->
