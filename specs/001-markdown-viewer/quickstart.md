# Quickstart: MarkRead Viewer (Feature 001)

This guide helps you set up a Windows dev environment to build and run the MarkRead Markdown viewer MVP.

## Prerequisites

- Windows 10 or 11
- .NET SDK 8.0+
- One of:
  - Visual Studio 2022 (17.10+) with .NET desktop workload
  - VS Code with C# Dev Kit + C# extensions
- Microsoft Edge WebView2 Runtime (Stable)
  - If not installed, get it from Microsoft (Evergreen Standalone Installer)

## Get the code

- Clone this repository and switch to the feature branch:
  - Branch: `001-markdown-viewer`
- Project structure for this feature is documented in `specs/001-markdown-viewer/plan.md`.

## Build and Run (once app scaffold exists)

- Open the solution/workspace and restore packages.
- Build the WPF app project under `src/App`.
- Run the app:
  - With a folder: `markview C:\path\to\docs`
  - With a file: `markview C:\path\to\docs\README.md` (root becomes the file's parent)
  - No argument (first launch): a folder picker will prompt; cancel shows start screen.

Notes:

- External links open in your default system browser.
- Rendering is sanitized (no scripts). Supported: code blocks, checklists, images, mermaid.
- Auto-reload watches the selected root with a debounce to avoid flicker.


## Developer workflow

- The spec lives at `specs/001-markdown-viewer/spec.md`.
- Planning artifacts:
  - `plan.md` (this feature plan)
  - `research.md`, `data-model.md`, `contracts/`
  - `quickstart.md` (this file)
- After implementation tasks are generated (`/speckit.tasks`), use them to drive development.

## Troubleshooting

- If WebView2 is missing, install the Evergreen runtime.
- If PowerShell blocks scripts, run terminal as Admin or temporarily allow local scripts: `Set-ExecutionPolicy -Scope Process Bypass` (PowerShell only).
- If build fails due to SDK version, confirm `.NET 8.0` is installed and selected in your IDE.

## What to expect in MVP

- File tree for the chosen root, tabbed viewing, in-page search, back/forward, and theme switching.
- Safe markdown rendering with syntax highlighting and mermaid diagrams.
