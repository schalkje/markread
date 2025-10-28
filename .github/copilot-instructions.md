# markread Development Guidelines

Auto-generated from all feature plans. Last updated: 2025-10-25

## Active Technologies
- Local filesystem only (no DB) (001-markdown-viewer)
- .NET 8 (C#) + WPF + WebView2; Markdig (optional if server‑side rendering), Prism/Highlight.js + Mermaid (front-end assets) (001-markdown-viewer)
- .NET 8 (C#) + WPF TreeView control, System.IO.FileSystemWatcher for real-time monitoring (002-folder-treeview)
- Local filesystem only (settings persisted via existing SettingsService) (002-folder-treeview)

## Project Structure

```text
src/
├── App/                  # WPF app (shell, DI, theming, shortcuts)
├── Rendering/            # WebView2 host, HTML template, assets (highlight.js, mermaid)
├── Services/             # File system, markdown pipeline, link resolution, history
├── UI/                   # Views (Tabs, Sidebar, Find), ViewModels
└── Cli/                  # Entry parsing for folder/file startup

tests/
├── unit/                 # Services tests (link resolution, settings, history)
└── integration/          # Startup + basic render smoke
```

## Commands

# Add commands for .NET 8 (C#)

## Code Style

.NET 8 (C#): Follow standard conventions

## Recent Changes
- 002-folder-treeview: Added .NET 8 (C#) + WPF TreeView control, System.IO.FileSystemWatcher for real-time monitoring
- 001-markdown-viewer: Added .NET 8 (C#) + WPF + WebView2; Markdig (optional if server‑side rendering), Prism/Highlight.js + Mermaid (front-end assets)


<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
