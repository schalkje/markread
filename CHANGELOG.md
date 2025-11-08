# Changelog
## [0.2.0] - 2025-11-08
### Added
- Release automation


All notable changes to MarkRead will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned
- Cross-file search functionality
- Export to PDF
- Bookmarks/favorites
- Additional syntax highlighting languages

## [0.1.0] - 2025-11-05

### Added
- Initial alpha release
- Markdown rendering with GitHub Flavored Markdown support
- File tree navigation with real-time updates
- Multiple tabs support
- Back/forward navigation history
- Light and dark themes with system theme detection
- Mermaid diagram support
- Syntax highlighting for code blocks (Python, SQL, YAML, and more via Prism.js)
- In-page search functionality (Ctrl+F)
- Auto-reload on file changes
- Keyboard shortcuts for common operations
- MSI installer for easy Windows installation
- Desktop and Start Menu shortcuts
- File associations for .md and .markdown files

### Known Issues
- WiX installer requires testing on clean Windows systems
- File tree performance with very large repositories (>10k files) needs optimization
- Some Mermaid diagram types may not render correctly

### Technical Details
- Built with .NET 8 and WPF
- WebView2 for rendering
- Markdig for markdown processing
- Prism.js for syntax highlighting
- Self-contained deployment (no runtime installation required)

## Release Notes

### Version 0.1.0 - Alpha Release

This is the first alpha release of MarkRead. The core functionality is implemented and working, but we're looking for feedback before moving to beta.

**What works well:**
- Basic markdown viewing and navigation
- File tree with folder browsing
- Theme switching
- Tab management

**What needs testing:**
- MSI installer on various Windows versions
- Large document performance
- Edge cases in markdown rendering

**Feedback welcome at:** https://github.com/schalkje/markread/issues

---

[Unreleased]: https://github.com/schalkje/markread/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/schalkje/markread/releases/tag/v0.1.0

