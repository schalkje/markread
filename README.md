# MarkRead - Markdown Viewer for Windows

[![.NET 8](https://img.shields.io/badge/.NET-8.0-512BD4?logo=dotnet)](https://dotnet.microsoft.com/)
[![Windows](https://img.shields.io/badge/Windows-10%2F11-0078D6?logo=windows)](https://www.microsoft.com/windows)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

**MarkRead** is a fast, modern, stand-alone desktop application for viewing and navigating Markdown files on Windows. Designed for developers and technical writers who work with documentation in local project folders, MarkRead provides a clean, professional interface with powerful navigation and rendering capabilities.

![MarkRead Screenshot](documentation/images/screenshots/main-window.png)

## ✨ Key Features

- 📄 **Powerful Markdown Rendering** - Full GitHub Flavored Markdown support with syntax highlighting, tables, task lists, and more
- 🎨 **Beautiful UI** - Modern, professional interface with light and dark themes
- 🗂️ **Smart Navigation** - File tree sidebar, tabbed interface, and intelligent link resolution
- 🔍 **Advanced Search** - In-page search and global cross-file search capabilities
- 📊 **Mermaid Diagrams** - Native support for flowcharts, sequence diagrams, and more
- ⚡ **Fast & Offline** - Instant startup, no internet required, fully local operation
- 🎯 **Developer-Focused** - Perfect for documentation in Git repositories and project folders

## � Installation

### Via MSI Installer (Recommended)

1. Download the latest MSI installer from [GitHub Releases](https://github.com/schalkje/markread/releases/latest)
2. Run the installer
3. Follow the installation wizard

The installer will:
- Install MarkRead to `C:\Program Files\MarkRead`
- Create Start Menu and Desktop shortcuts
- Associate `.md` and `.markdown` files with MarkRead
- Add MarkRead to Windows Programs & Features for easy uninstallation

### System Requirements

- **OS:** Windows 10 (1809+) or Windows 11
- **Runtime:** None required (self-contained)
- **Disk Space:** ~50 MB
- **Memory:** Minimal (WPF + WebView2)

## �🚀 Quick Start

```powershell
# Launch MarkRead and open a folder
MarkRead.exe "C:\path\to\your\docs"

# Or open a specific file
MarkRead.exe "C:\path\to\your\docs\README.md"

# After installation, you can also:
# - Double-click any .md file
# - Right-click a folder and "Open with MarkRead"
# - Launch from Start Menu
```

For detailed usage instructions, see the [Getting Started Guide](documentation/user-guide/getting-started.md).

## 📚 Documentation

Comprehensive documentation is available in the [`documentation`](documentation/) folder:

- **[User Guide](documentation/user-guide/)** - Installation, basic usage, and features
- **[Markdown Features](documentation/markdown-features/)** - Complete showcase of supported markdown syntax
- **[Developer Guide](documentation/developer/)** - Architecture, contribution guidelines, and development setup
- **[Reference](documentation/reference/)** - API documentation, keyboard shortcuts, and configuration

> 💡 **Tip**: The documentation folder itself is an excellent example of the kind of structured markdown documentation that MarkRead is designed to view!

## 🎯 Use Cases

MarkRead is perfect for:

- **Documentation Browsing** - Navigate technical documentation in Git repositories
- **Project README Viewing** - Quick, beautiful rendering of project documentation
- **Knowledge Bases** - Browse personal or team markdown-based wikis
- **Technical Writing** - Preview markdown content as you write
- **Learning Resources** - View educational content with code examples and diagrams

## ⌨️ Essential Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+O` | Open folder |
| `Ctrl+T` | New tab |
| `Ctrl+W` | Close tab |
| `Ctrl+F` | Find in document |
| `Alt+Left/Right` | Navigate back/forward |
| `F5` | Refresh current document |

See the [complete shortcuts reference](documentation/reference/keyboard-shortcuts.md) for more.

## 🛠️ Technology Stack

MarkRead is built with modern, reliable technologies:

- **.NET 8** - Cross-platform framework with C#
- **WPF** - Windows Presentation Foundation for native UI
- **WebView2** - Chromium-based rendering engine
- **Markdig** - Fast, extensible Markdown processor
- **Prism/Highlight.js** - Syntax highlighting for code blocks
- **Mermaid** - Diagram and flowchart rendering

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](documentation/developer/contributing.md) for details on:

- Code of conduct
- Development setup
- Coding standards
- Pull request process

## � Building from Source

For developers who want to build MarkRead:

```powershell
# Clone the repository
git clone https://github.com/schalkje/markread.git
cd markread

# Restore dependencies
dotnet restore

# Build the application
dotnet build --configuration Release

# Build the MSI installer (requires WiX Toolset v4)
dotnet tool install --global wix --version 4.0.5
dotnet build src\Installer\MarkRead.Installer.wixproj --configuration Release

# Run from source
.\src\App\bin\Release\net8.0-windows\MarkRead.App.exe
```

See the [Developer Guide](documentation/developer/getting-started.md) for detailed setup instructions.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Markdig](https://github.com/xoofx/markdig) - Excellent Markdown processor
- [Highlight.js](https://highlightjs.org/) - Code syntax highlighting
- [Mermaid](https://mermaid.js.org/) - Diagram rendering
- All our [contributors](CONTRIBUTORS.md)

## 🔗 Links

- [Documentation](documentation/README.md)
- [User Guide](documentation/user-guide/getting-started.md)
- [Issue Tracker](https://github.com/schalkje/markread/issues)
- [Release Notes](CHANGELOG.md)

---

**Made with ❤️ for the developer community**
