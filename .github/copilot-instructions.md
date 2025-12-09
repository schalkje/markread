# markread Development Guidelines

Auto-generated from all feature plans. Last updated: 2025-10-25

## Active Technologies
- Local filesystem only (no DB) (001-markdown-viewer)
- .NET 8 (C#) + WPF + WebView2; Markdig (optional if server‑side rendering), Prism/Highlight.js + Mermaid (front-end assets) (001-markdown-viewer)
- C# .NET 8 + WPF, WebView2, Markdig (for markdown processing) (003-mockup-ui)
- Local application settings file (JSON/XML) for theme preferences and UI state (003-mockup-ui)
- .NET 8 (C#) + WPF TreeView control, System.IO.FileSystemWatcher for real-time monitoring (002-folder-treeview)
- Local filesystem only (settings persisted via existing SettingsService) (002-folder-treeview)
- C# .NET 8 (net8.0-windows) + WPF, Microsoft.Web.WebView2 (1.0.2420.47), Markdig (0.34.0) (004-zoom-pan)
- Local application settings file (JSON/XML) for default zoom preference (004-zoom-pan)
- PowerShell (for scripts), Windows Installer XML (WiX), GitHub Actions YAML + Windows, PowerShell, WiX Toolset, GitHub Actions, self-signed certificate (PFX), GitHub Secrets (005-msi-signing)
- Local filesystem (MSI, certificate files), GitHub Secrets (005-msi-signing)

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
- 005-msi-signing: Added PowerShell (for scripts), Windows Installer XML (WiX), GitHub Actions YAML + Windows, PowerShell, WiX Toolset, GitHub Actions, self-signed certificate (PFX), GitHub Secrets
- 004-zoom-pan: Added C# .NET 8 (net8.0-windows) + WPF, Microsoft.Web.WebView2 (1.0.2420.47), Markdig (0.34.0)
- 003-mockup-ui: Added C# .NET 8 + WPF, WebView2, Markdig (for markdown processing)


<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
