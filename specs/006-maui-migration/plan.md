# Implementation Plan: Migrate MarkRead to .NET MAUI

**Branch**: `006-maui-migration` | **Date**: 2025-12-09 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/006-maui-migration/spec.md`

## Summary

Completely rebuild MarkRead as a .NET MAUI application from the ground up, replacing the current WPF implementation with a modern, fluid UI featuring smooth animations (60+ FPS), responsive interactions (<100ms), and touch support. The rebuild preserves all existing functionality while improving user experience through modern design patterns (hybrid Fluent/Material), enhanced theming, and better performance. Architecture follows MAUI MVVM best practices and modern C# patterns. The existing WPF code (moved to src.old/) serves only as a functional reference for feature requirements, not for code reuse.

## Technical Context

**Language/Version**: C# / .NET 10.0 (net10.0-windows for Windows-focused build)  
**Primary Framework**: .NET MAUI 10.0+  
**UI Framework**: MAUI XAML with MVVM architecture  
**Web Rendering**: MAUI WebView for markdown content display  
**Markdown Processing**: Markdig 0.44.0  
**Syntax Highlighting**: highlight.js (latest stable, web asset)  
**Diagrams**: Mermaid.js 11.12.2 (web asset)  
**Storage**: Local filesystem for documents, JSON/XML for settings persistence  
**Testing**: NEEDS CLARIFICATION (xUnit vs NUnit for unit tests, MAUI UI testing framework)  
**Target Platform**: Windows 10 (1809+) and Windows 11 (primary), with architectural support for cross-platform expansion  
**Project Type**: Single MAUI desktop application  
**Performance Goals**: 60+ FPS scrolling/animations, <100ms interaction response, <1s startup time, <50ms theme switching  
**Constraints**: Offline-capable, no telemetry, local-only data, WCAG 2.1 AA accessibility, stable memory with 100+ tab cycles  
**Scale/Scope**: Single-user desktop app, 1000+ file trees, 20+ tabs (soft limit with warning), 10MB+ markdown files (with virtualization)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Code Quality

✅ **PASS** - Complete rebuild with modern MAUI best practices
- Fresh codebase with clean MVVM architecture: Views, ViewModels, Services, Models
- No legacy code or technical debt from WPF implementation
- CommunityToolkit.Mvvm with source generators for maintainability
- MAUI best practices and modern C# patterns from research phase

### II. User Experience Consistency

✅ **PASS** - Core focus of this migration
- Hybrid design system (Fluent on Windows) ensures consistent visual language
- All UI patterns standardized through modern MAUI controls
- Error handling with inline warnings and modern dialogs specified
- Settings interface with clear organization planned
- 60+ FPS animations and <100ms response times for fluid experience

### III. Documentation Standard

✅ **PASS** - Documentation approach defined
- README will explain MAUI architecture and setup
- Migration rationale and design decisions documented in this plan
- Quickstart guide for developers (Phase 1 output)
- MAUI best practices captured in research.md

### IV. Performance Requirements

✅ **PASS** - Explicit performance targets defined
- 60+ FPS for scrolling and animations specified
- <100ms interaction response required
- <1s startup time target
- Memory stability tested with 100+ tab cycles
- Performance profiling planned for migration validation

**Overall Status**: ✅ **ALL GATES PASSED** - No violations requiring justification

## Project Structure

### Documentation (this feature)

```text
specs/006-maui-migration/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/                              # New MAUI application (clean rebuild)
├── MarkRead.csproj              # MAUI project file
├── App.xaml                     # MAUI application entry point
├── App.xaml.cs
├── AppShell.xaml                # Shell container for navigation
├── AppShell.xaml.cs
├── MauiProgram.cs               # DI container and service registration
├── Views/                       # XAML views (pages and controls)
│   ├── MainPage.xaml            # Main window with tabs and sidebar
│   ├── MainPage.xaml.cs
│   ├── MarkdownView.xaml        # Markdown content display with WebView
│   ├── MarkdownView.xaml.cs
│   ├── FileTreeView.xaml        # File navigation sidebar
│   ├── FileTreeView.xaml.cs
│   ├── TabBar.xaml              # Tab management control
│   ├── TabBar.xaml.cs
│   ├── SearchBar.xaml           # Inline search UI
│   ├── SearchBar.xaml.cs
│   ├── SettingsPage.xaml        # Settings/preferences UI
│   └── SettingsPage.xaml.cs
├── ViewModels/                  # MVVM ViewModels
│   ├── MainViewModel.cs         # Main window state and orchestration
│   ├── DocumentViewModel.cs     # Single document state
│   ├── FileTreeViewModel.cs     # File tree navigation state
│   ├── TabViewModel.cs          # Tab management state
│   ├── SearchViewModel.cs       # Search state and logic
│   └── SettingsViewModel.cs     # Settings/preferences state
├── Services/                    # Reusable business logic (from existing WPF)
│   ├── IMarkdownService.cs      # Markdown processing interface
│   ├── MarkdownService.cs       # Markdig wrapper
│   ├── IFileSystemService.cs    # File operations interface
│   ├── FileSystemService.cs     # File watching and loading
│   ├── ISettingsService.cs      # Persistence interface
│   ├── SettingsService.cs       # JSON/XML settings storage
│   ├── INavigationService.cs    # Navigation history interface
│   ├── NavigationService.cs     # Back/forward history
│   ├── IThemeService.cs         # Theme management interface
│   ├── ThemeService.cs          # Theme switching logic
│   ├── ISessionService.cs       # Session state interface
│   ├── SessionService.cs        # Crash recovery persistence
│   └── ILoggingService.cs       # Local logging interface
│       └── LoggingService.cs    # File-based logging
├── Models/                      # Data models and entities
│   ├── Document.cs              # Markdown document model
│   ├── FileTreeNode.cs          # File tree item model
│   ├── Tab.cs                   # Tab model
│   ├── Theme.cs                 # Theme configuration model
│   ├── NavigationHistory.cs     # History state model
│   ├── Settings.cs              # Settings model
│   ├── SearchState.cs           # Search context model
│   └── SessionState.cs          # Session recovery model
├── Rendering/                   # Web rendering assets and HTML generation
│   ├── HtmlTemplateService.cs   # HTML template generation
│   ├── templates/
│   │   └── markdown.html        # HTML template for WebView
│   └── assets/                  # Web assets (JS/CSS)
│       ├── highlight.js         # Syntax highlighting
│       ├── mermaid.js           # Diagram rendering (v11.12.2)
│       ├── styles.css           # Base styles
│       ├── theme-light.css      # Light theme styles
│       └── theme-dark.css       # Dark theme styles
├── Converters/                  # XAML value converters
│   ├── BoolToVisibilityConverter.cs
│   ├── ThemeToColorConverter.cs
│   └── FileTypeToIconConverter.cs
├── Behaviors/                   # XAML behaviors for interactions
│   ├── TabDragBehavior.cs       # Drag-to-reorder tabs
│   └── TreeViewKeyboardBehavior.cs  # Keyboard navigation
├── Resources/                   # MAUI resources
│   ├── Styles/                  # XAML style dictionaries
│   │   ├── Colors.xaml          # Color definitions (Fluent/Material)
│   │   ├── Styles.xaml          # Control styles
│   │   └── Animations.xaml      # Animation definitions
│   ├── Images/                  # Image assets
│   └── Fonts/                   # Custom fonts if needed
└── Platforms/                   # Platform-specific code
    └── Windows/                 # Windows-specific implementations
        ├── App.xaml             # Windows app manifest
        └── Package.appxmanifest # Windows packaging

tests/
├── unit/                        # Unit tests for services and ViewModels
│   ├── Services/
│   │   ├── MarkdownServiceTests.cs
│   │   ├── FileSystemServiceTests.cs
│   │   ├── SettingsServiceTests.cs
│   │   ├── NavigationServiceTests.cs
│   │   ├── ThemeServiceTests.cs
│   │   ├── SessionServiceTests.cs
│   │   └── LoggingServiceTests.cs
│   └── ViewModels/
│       ├── MainViewModelTests.cs
│       ├── DocumentViewModelTests.cs
│       ├── FileTreeViewModelTests.cs
│       └── SearchViewModelTests.cs
├── integration/                 # Integration tests
│   ├── StartupTests.cs          # App launch and initialization
│   ├── FileLoadingTests.cs      # End-to-end file loading
│   ├── NavigationTests.cs       # Link and history navigation
│   └── ThemeSwitchingTests.cs   # Theme change scenarios
└── ui/                          # MAUI UI tests
    ├── TabManagementTests.cs    # Tab operations
    ├── FileTreeTests.cs         # Tree navigation
    └── SearchTests.cs           # Search functionality

installer/                       # MSI installer (requires updates for MAUI)
└── [existing WiX structure - needs MAUI compatibility updates]

src.old/                         # Renamed WPF app (functional reference only)
└── [existing WPF structure preserved for feature reference]
```

**Structure Decision**: Complete rebuild with MAUI single-project structure in new `src/` directory. The existing WPF app is renamed to `src.old/` and serves only as a functional reference to ensure feature completeness - no code will be reused. MVVM architecture with clear separation: Views (XAML UI), ViewModels (UI logic), Services (business logic), Models (data). All code written fresh following MAUI best practices from research phase. New Rendering/ folder contains WebView HTML generation and web assets.

## Complexity Tracking

> **No violations** - Constitution Check passed all gates. No complexity justification required.

## Keyboard Interactions & Shortcuts

> **Important**: Since this is a complete rebuild, all keyboard shortcuts and navigation must be explicitly implemented. Reference: `src.old/` for complete feature list and `documentation/reference/keyboard-shortcuts.md` for specification.

### Essential Shortcuts (P1 - MVP)

**File Operations**:
- `Ctrl+O` - Open file dialog
- `Ctrl+Shift+O` - Open folder dialog  
- `Ctrl+W` - Close current tab
- `F5` - Reload current document

**Navigation**:
- `Alt+Left` / `Alt+Right` - Back/Forward in history
- `Ctrl+Home` / `Ctrl+End` - Scroll to top/bottom
- `Ctrl+Tab` / `Ctrl+Shift+Tab` - Next/Previous tab
- `Ctrl+1-9` - Switch to specific tab (1-9)

**Search**:
- `Ctrl+F` - Open in-page search
- `F3` / `Shift+F3` - Find next/previous match
- `Escape` - Close search panel

**View**:
- `Ctrl+B` or `Ctrl+\` - Toggle file tree sidebar
- `Ctrl+=` / `Ctrl+-` / `Ctrl+0` - Zoom in/out/reset

**Application**:
- `Ctrl+,` - Open settings
- `Alt+F4` - Close application
- `F1` - Show keyboard shortcuts help

### File Tree Navigation (P1 - MVP)

- `Up` / `Down` - Navigate through files
- `Right` / `Enter` - Expand folder or open file
- `Left` / `Escape` - Collapse folder
- `Ctrl+Enter` - Open file in new tab
- `Ctrl+R` / `F5` - Refresh tree
- Type-ahead search (2-second auto-clear)

### Advanced Shortcuts (P2 - Post-MVP)

**Tabs**:
- `Ctrl+T` - New tab
- `Ctrl+Shift+W` - Close all tabs
- `Ctrl+Shift+T` - Reopen last closed tab
- `Ctrl+P` - Pin/unpin current tab
- `Ctrl+K Ctrl+W` - Close other tabs

**Copy Operations**:
- `Ctrl+C` - Copy selected text
- `Ctrl+A` - Select all
- `Ctrl+Shift+C` - Copy file path
- `Ctrl+Shift+H` - Copy as HTML

**View**:
- `F11` - Toggle fullscreen
- `Ctrl+1` - Zoom to 100%
- `Ctrl+2` - Fit to width
- `Ctrl+K Ctrl+T` - Toggle theme

**Quick Actions**:
- `Ctrl+Shift+P` - Command palette
- `Ctrl+K Ctrl+O` - Open recent files
- `Ctrl+G` - Go to line/heading

### Accessibility Shortcuts (P2)

- `Alt+Shift+T` - Screen reader: read title
- `Ctrl+Shift+[` / `Ctrl+Shift+]` - Adjust contrast
- `Ctrl+Shift+H` - Toggle high contrast mode

### Developer Shortcuts (P3 - Optional)

- `F12` / `Ctrl+Shift+I` - Open WebView dev tools
- `Ctrl+Shift+J` - Open console
- `Ctrl+Shift+R` - Hard reload (clear cache)

### Touch Equivalents (P3)

For touch-enabled devices, provide gesture equivalents:
- **Swipe left/right on tabs**: Switch between tabs
- **Swipe left/right on document**: Back/forward navigation
- **Pinch to zoom**: Zoom in/out on content
- **Long press**: Context menu (equivalent to right-click)
- **Two-finger swipe from edge**: Toggle sidebar

### Implementation Notes

1. **MAUI Accelerator Keys**: Use `KeyboardAccelerator` API for menu shortcuts
2. **Custom Key Handlers**: Implement in ViewModels using `KeyDown` events or behaviors
3. **Command Binding**: Bind shortcuts to `ICommand` implementations via CommunityToolkit.Mvvm
4. **Platform Differences**: Handle Windows-specific shortcuts; plan for Cmd key on macOS if cross-platform
5. **Conflict Resolution**: Check for conflicts with system shortcuts; provide customization in settings
6. **Discoverability**: Show shortcuts in tooltips, menus, and F1 help dialog
7. **Testing**: Create UI tests for critical shortcuts in P1 set

### Reference Files

- **Functional spec**: `src.old/` for current shortcut behavior
- **Documentation**: `documentation/reference/keyboard-shortcuts.md` (complete list)
- **User guide**: `documentation/user-guide/keyboard-shortcuts.md` (usage patterns)

All keyboard shortcuts must be implemented explicitly - nothing is implicit from the WPF migration.
