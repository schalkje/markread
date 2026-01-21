# Changelog

All notable changes to MarkRead will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned
- Cross-file search functionality
- Export to PDF
- Bookmarks/favorites

## [0.5.0] - 2026-01-05

### Changed
- **Major rewrite**: Reimplemented application using Electron + React + TypeScript
- Migrated from .NET WPF to Electron 33.4 framework
- Updated UI with React 18.3 components
- Replaced Markdig with markdown-it 14.1 for markdown processing
- Enhanced file tree navigation with improved styling
- Improved tab management and navigation
- Added mouse back/forward button support for navigation
- Enhanced directory handling and folder viewing
- Better support for directory listings and index files
- Git repository integration

### Technical
- TypeScript 5.7 with full type safety
- Zustand 4.5 for state management
- Chokidar 5.0 for file watching
- Mermaid 11.12 for diagram rendering
- Highlight.js 11.11 for syntax highlighting

## [0.4.1] - 2025-12-09

### Fixed
- Fixed release script

## [0.4.0] - 2025-12-09

### Added
- Signed deployment with code signing certificates
- Development certificate support

### Fixed
- GitHub Actions workflow improvements

## [0.3.0] - 2025-11-28

### Added
- Zoom and pan functionality
- Settings for zoom control
- Help page for keyboard shortcuts

### Changed
- New scroll and zoom factor visualization

### Fixed
- Keyboard control improvements

## [0.2.1] - 2025-11-08

### Changed
- Release script no longer requires version number verification

## [0.2.0] - 2025-11-08

### Added
- Release automation

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

### Version 0.5.0 - Electron Rewrite

This is a major architectural change, moving from .NET WPF to Electron. The core functionality remains the same while gaining cross-platform capabilities and modern web technologies.

**What's new:**
- Modern Electron + React + TypeScript stack
- Enhanced file navigation with mouse button support
- Improved directory handling and viewing
- Better performance with Zustand state management

**Migration notes:**
- Settings may need to be reconfigured
- File associations will be updated during installation

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

[Unreleased]: https://github.com/schalkje/markread/compare/v0.5.0...HEAD
[0.5.0]: https://github.com/schalkje/markread/releases/tag/v0.5.0
[0.4.1]: https://github.com/schalkje/markread/releases/tag/v0.4.1
[0.4.0]: https://github.com/schalkje/markread/releases/tag/v0.4.0
[0.3.0]: https://github.com/schalkje/markread/releases/tag/v0.3.0
[0.2.1]: https://github.com/schalkje/markread/releases/tag/v0.2.1
[0.2.0]: https://github.com/schalkje/markread/releases/tag/v0.2.0
[0.1.0]: https://github.com/schalkje/markread/releases/tag/v0.1.0
