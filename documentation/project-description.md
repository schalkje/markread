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
