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

## WPF Feature Inventory & Migration Checklist

> **Purpose**: Comprehensive inventory of functionality in existing WPF app (`src.old/`) that must be functionally implemented in MAUI rebuild. Since this is a complete rebuild with no code reuse, this section ensures nothing is overlooked.

### Core Architecture (All P1)

**Service Layer** (36+ services identified):
- ✅ `MarkdownService` - Markdig integration for markdown processing
- ✅ `FileWatcherService` - Real-time file system monitoring (System.IO.FileSystemWatcher)
- ✅ `FolderService` - Folder tree operations and validation
- ✅ `NavigationService` - Back/forward history with per-tab state
- ✅ `HistoryService` - Navigation history tracking with search state preservation
- ✅ `TabService` - Tab lifecycle management
- ✅ `SettingsService` - JSON/XML persistence for preferences
- ✅ `UIStateService` - Window state and layout persistence
- ✅ `SidebarService` - File tree visibility and state management
- ✅ `SearchService` - In-page search with match counting
- ✅ `ThemeManager` (IThemeService) - Theme switching and configuration
- ✅ `HtmlSanitizerService` - Security sanitization for rendered HTML (uses Ganss.Xss)
- ✅ `LinkResolver` - Resolves relative/absolute/root-relative links with security checks
- ✅ `RootRelativeLinkRewriter` - Converts root-relative links (e.g., `/docs/file.md`)
- ✅ `AnimationPerformanceMonitor` - 60fps tracking, frame drop detection, performance reporting
- ✅ `AccessibilityValidator` - WCAG 2.1 AA contrast validation, color accessibility checks
- ✅ `AnimationService` - Animation state management
- ✅ `TreeViewService` - Tree node operations
- ✅ `TreeViewContextMenuService` - Context menu for file tree
- ✅ `FolderExclusionSettings` - Built-in exclusions (.git, node_modules, bin, obj, .vscode, etc.)
- ✅ `StartupPerformanceMonitor` (if exists - needs verification)

**Migration Action**: Implement equivalent functionality following MAUI best practices and modern C# patterns. **Not** a 1:1 code port - redesign services to leverage MAUI architecture (dependency injection, async/await, MVVM patterns, platform services). Use WPF implementation only as functional reference for requirements and behavior, not as code template.

### CLI Arguments Handling (P1)

**Existing Implementation**: `src.old/Cli/StartupArguments.cs`
- ✅ Parse command-line arguments for file/folder paths
- ✅ `StartupPathKind` enum: None, Directory, File, Unknown
- ✅ Normalize input (remove quotes, trim)
- ✅ Expand environment variables
- ✅ Resolve to full paths
- ✅ `RootCandidate` property for folder root
- ✅ `DocumentCandidate` property for initial file

**Usage Pattern**:
```bash
# Open specific markdown file
markread.exe README.md

# Open folder
markread.exe ./documentation

# With environment variables
markread.exe %USERPROFILE%\docs\notes.md
```

**Migration Action**: Implement equivalent CLI functionality using MAUI startup patterns. May use platform-specific code in `Platforms/Windows/` or custom argument handler. Focus on behavior (open file/folder on launch) rather than replicating WPF argument parsing structure.

### Rendering Infrastructure (P1)

**Existing Implementation**: `src.old/Rendering/`
- ✅ **WebViewHost.cs** - WebView2 integration with message bridge
  - CoreWebView2 initialization and readiness tracking
  - Virtual host mapping for local assets
  - JavaScript-C# bridge for link clicks, anchor navigation
  - Scroll position tracking and restoration
  - Theme injection into WebView
  - Performance optimization (theme caching)
- ✅ **Renderer.cs** - HTML generation from markdown
  - Markdig pipeline integration
  - HTML template token replacement
  - Theme inline style injection (prevents white flash)
  - Root-relative link conversion (`/` → `file:///rootPath/`)
  - Mermaid code fence conversion (`:::mermaid` → ` ```mermaid `)
  - HTML sanitization integration
  - Base URL resolution for relative paths
- ✅ **templates/markdown.html** - HTML template with tokens:
  - `<!--CONTENT-->` - Rendered markdown HTML
  - `__STATE_JSON__` - Serialized state for JS bridge
  - `<!--BASE_URL-->` - Base URL for relative paths
  - `<!--THEME_STYLE-->` - Inline CSS for theme
  - `<!--DATA_THEME-->` - Theme attribute for CSS vars
- ✅ **assets/** - Web assets (highlight.js, mermaid.js, CSS)

**Migration Action**: Implement equivalent rendering functionality using MAUI HybridWebView. Design HTML generation following MAUI patterns (may differ from WPF token system). Preserve bridge concept for JS-C# communication but implement using MAUI WebView message handlers.

### UI Components (P1 Core, P2 Advanced)

**Existing Implementation**: `src.old/UI/`
- ✅ **MainWindow.xaml** - Shell container with DI integration (P1)
- ✅ **Tabs/TabsView.xaml** - Tab bar with close buttons, scroll buttons (P1)
  - ObservableCollection binding
  - Active tab highlighting
  - Tab creation/closure/activation events
  - Horizontal scroll for overflow
  - New tab button
- ✅ **Sidebar/SidebarView.xaml** - File tree with animations (P1)
  - Collapse/expand animations (storyboards)
  - Icon rendering for file types
  - Selection highlighting
  - Width animations (expand/collapse)
  - Theme-aware styling (dynamic brush references)
- ✅ **Find/FindBar.xaml** - In-page search with animations (P1)
  - Show/hide animations with storyboard
  - Match count display (`currentIndex + 1 of totalMatches`)
  - Search text change events
  - Next/previous navigation
  - Escape key to close
- ✅ **Settings/SettingsWindow.xaml** - Settings dialog (P2)
  - ViewerSettings panel
  - FolderExclusions panel
  - Save/cancel with unsaved changes prompt
  - Event-based change tracking
- ✅ **Search/SearchPanel.xaml** - Advanced search UI (P2)
- ✅ **Shell/ThemeToggleButton.xaml** - Theme switcher with animation (P2)
  - Cycles: Light → Dark → System
  - Icon updates per theme
  - Theme switch animation storyboard
  - IThemeService integration
- ✅ **Sidebar/TreeView/TreeViewViewModel.cs** - MVVM for tree navigation (P1)
- ✅ **Help/KeyboardShortcutsWindow.xaml** (if exists - needs verification) (P2)

**Migration Action**: Implement equivalent UI functionality using MAUI controls and patterns. Use MAUI animation APIs (not WPF storyboards). Design ViewModels following MAUI best practices with CommunityToolkit.Mvvm. UI structure may differ significantly from WPF while preserving user-facing behavior.

### Theming System (P1)

**Existing Implementation**: `src.old/ThemeManager.cs` and `src.old/Themes/`
- ✅ **IThemeService Interface** with PropertyChanged events
- ✅ **ThemeManager Class** implementation
  - Theme type enum: Light, Dark, System
  - Active theme tracking with `CurrentTheme` property
  - Theme configuration model with color definitions
  - Dynamic theme switching at runtime
  - Settings persistence integration
  - System theme detection (Windows registry/settings)
- ✅ **ThemeConfiguration Model**
  - Background, Foreground, Accent colors
  - Border, Selection, Highlight colors
  - WCAG contrast validation integration
- ✅ **XAML Theme Resources** (ResourceDictionary)
  - Dynamic brush definitions
  - Color theme switching without restart

**Features to Preserve**:
- Three theme modes: Light, Dark, System (auto-detect)
- Real-time theme switching (no restart required)
- Theme persistence across sessions
- Accessibility contrast validation before applying
- Theme injection into WebView to prevent white flash
- CSS variable mapping for web content themes

**Migration Action**: Implement theming functionality following MAUI patterns. Use MAUI AppThemeBinding and ResourceDictionary system (different from WPF). Design service to leverage MAUI's built-in theme capabilities rather than replicating WPF ThemeManager structure. Preserve core behavior: Light/Dark/System modes with real-time switching.

### Performance Monitoring (P2)

**Existing Implementation**: `src.old/Services/AnimationPerformanceMonitor.cs`
- ✅ Singleton pattern for global access
- ✅ Frame rate tracking (60fps target = 16.67ms per frame)
- ✅ Frame time measurements with DateTime.UtcNow ticks
- ✅ Dropped frame counting
- ✅ Average FPS calculation
- ✅ Average frame time calculation
- ✅ WPF CompositionTarget.Rendering event integration
- ✅ Performance report generation
- ✅ Animation validation with tolerance threshold

**Usage Pattern**:
```csharp
// Start monitoring before animation
AnimationPerformanceMonitor.Instance.Start();

// ... run animation ...

// Stop and get report
AnimationPerformanceMonitor.Instance.Stop();
var report = AnimationPerformanceMonitor.Instance.GetReport();

// Validate performance
bool meetsTarget = AnimationPerformanceMonitor.Instance.ValidateAnimationPerformance(durationMs: 300);
```

**Migration Action**: Implement performance monitoring using MAUI-appropriate patterns (`Dispatcher` timers, platform handlers, or diagnostic APIs). Design may differ significantly from WPF singleton pattern. Focus on achieving 60fps tracking functionality, not replicating AnimationPerformanceMonitor structure.

### Accessibility Features (P2)

**Existing Implementation**: `src.old/Services/AccessibilityValidator.cs`
- ✅ WCAG 2.1 Level AA compliance validation
- ✅ Color contrast ratio calculation (relative luminance algorithm)
- ✅ Minimum contrast ratios:
  - Regular text: 4.5:1
  - Large text (18pt+ or 14pt+ bold): 3.0:1
  - UI components: 3.0:1
- ✅ Contrast assessment labels: "AAA (Enhanced)", "AA (Minimum)", "AA Large Text", "Fail"
- ✅ sRGB to linear RGB conversion
- ✅ Accessibility report generation for color schemes

**Usage Pattern**:
```csharp
// Validate theme colors
bool textPass = AccessibilityValidator.ValidateTextContrast(foreground, background);
bool largeTextPass = AccessibilityValidator.ValidateLargeTextContrast(titleColor, bgColor);
bool uiPass = AccessibilityValidator.ValidateUIComponentContrast(accentColor, bgColor);

// Get detailed report
string report = AccessibilityValidator.GenerateAccessibilityReport(
    background: bgColor,
    foreground: fgColor,
    accent: accentColor,
    border: borderColor
);
```

**Migration Action**: Implement WCAG validation functionality using `Microsoft.Maui.Graphics.Color`. Algorithm logic (relative luminance, contrast ratios) remains the same, but service design should follow MAUI patterns. May integrate differently with theme system than WPF implementation.

### Link Resolution & Security (P1)

**Existing Implementation**: `src.old/Services/LinkResolver.cs`
- ✅ Link type detection: Relative, Absolute, Anchor, External (http/https/mailto)
- ✅ Root-relative link resolution (`/docs/file.md` → full path)
- ✅ Security validation: Block links outside active root
- ✅ File system path validation with exception handling
- ✅ Anchor splitting (`file.md#section` → path + anchor)
- ✅ URI scheme validation (block unsupported schemes)
- ✅ Path normalization (Path.GetFullPath)
- ✅ `LinkResolutionResult` model:
  - Type: Local, External, Anchor, Blocked, Empty
  - ResolvedPath, Anchor, ExternalUri properties
  - BlockReason for security violations

**Security Rules**:
- ✅ Links must stay within active folder root
- ✅ Only http/https/mailto/file schemes allowed
- ✅ Invalid paths blocked with descriptive error
- ✅ Path traversal attempts detected and blocked

**Migration Action**: Implement link resolution and security validation for MAUI. Preserve security rules (root boundaries, scheme validation) but design service following MAUI patterns. May use different service composition than WPF (e.g., combine with navigation service rather than separate LinkResolver class).

### HTML Sanitization (P1)

**Existing Implementation**: `src.old/Services/HtmlSanitizerService.cs`
- ✅ Uses Ganss.Xss library (HtmlSanitizer)
- ✅ Thread-safe with lock synchronization
- ✅ Allowed tags: pre, code, span, div, table, thead, tbody, tr, th, td, blockquote, figure, figcaption, dl, dt, dd, ul, ol, li, hr, input, img, sup, sub, kbd
- ✅ Allowed attributes: class, id, href, src, alt, title, type, value, checked, disabled, target, rel, loading, width, height, colspan, rowspan, name
- ✅ Allowed schemes: http, https, mailto, file (likely)
- ✅ Base URI support for relative link resolution

**Migration Action**: Implement HTML sanitization using Ganss.Xss (verify .NET 10 compatibility) or alternative library. Preserve security whitelist (allowed tags/attributes) but service design may differ from WPF wrapper pattern. Integrate with MAUI rendering pipeline.

### Folder Exclusion System (P2)

**Existing Implementation**: `src.old/Services/FolderExclusionSettings.cs`
- ✅ **ExclusionRule Model**:
  - Pattern (case-insensitive folder name)
  - IsEnabled flag
  - IsBuiltIn flag (prevents deletion, allows disable)
  - Optional Description
- ✅ **Built-in Exclusions**:
  - `.git`, `.github`, `.specify`, `.vscode`
  - `.venv`, `.env`, `venv`
  - `bin`, `obj`
  - `node_modules`
- ✅ **Operations**:
  - Get enabled patterns
  - Check if folder is excluded (case-insensitive)
  - User can add custom rules
  - Built-in rules can be disabled but not deleted

**Migration Action**: Implement folder exclusion functionality following MAUI settings patterns. Preserve built-in rules and customization capability but may use different data model or storage approach than WPF. Consider MAUI preferences API for persistence.

### Navigation History (P1)

**Existing Implementation**: `src.old/Services/HistoryService.cs`
- ✅ Per-tab history tracking (`ConcurrentDictionary<Guid, NavigationHistory>`)
- ✅ `NavigationHistory` class:
  - List of NavigationEntry (internal)
  - Current index tracking
  - CanGoBack / CanGoForward properties
  - Push with duplicate collapsing
  - Search state preservation (query, match count, current index)
  - Forward history clearing on new push
- ✅ Thread-safe with ConcurrentDictionary

**Migration Action**: Implement navigation history following MAUI patterns. May integrate differently than WPF (e.g., use Shell navigation stack, combine with MAUI navigation service). Preserve per-tab history and search state functionality. Consider MAUI threading model for concurrency.

### UI State Persistence (P2)

**Existing Implementation**: `src.old/Services/UIStateService.cs`
- ✅ **IUIStateService Interface** with PropertyChanged
- ✅ **UIState Model** (needs inspection - likely contains):
  - Window size and position
  - Sidebar width and visibility
  - Active tab ID
  - Last opened folder/file
  - Zoom level
  - Theme preference
- ✅ **Operations**:
  - SaveUIState - Persist to disk
  - LoadUIState - Restore from disk
  - ResetToDefaults - Clear saved state
  - UpdateCurrentState - Update and auto-persist
  - InitializeAsync - Load on startup
  - Validation (IsValid method)

**Migration Action**: Implement state persistence using MAUI Preferences API or similar. State model will differ (MAUI doesn't have "window" concept like WPF). Focus on preserving user session data (sidebar state, zoom, theme, open tabs) rather than replicating WPF UIState structure.

### File Watching (P1)

**Existing Implementation**: `src.old/Services/FileWatcherService.cs`
- ✅ System.IO.FileSystemWatcher integration
- ✅ IDisposable pattern for cleanup
- ✅ Likely monitors: Changed, Deleted, Renamed events
- ✅ File change notifications for auto-reload

**Migration Action**: Implement file watching using System.IO.FileSystemWatcher or MAUI-appropriate alternative. Design service to integrate with MAUI lifecycle events (OnResume, OnSleep). May structure differently than WPF service while preserving auto-reload behavior.

### Testing Infrastructure (All Phases)

**Existing Tests**: `tests/unit/` and `tests/integration/`
- ✅ MSTest framework (WPF-specific)
- ✅ LinkResolverTests, SettingsServiceTests, ThemeManagerTests
- ✅ StartupSmokeTests, NavigationTests, TabsAndSearchTests
- ✅ Arrange-Act-Assert pattern

**Test Coverage Needed**:
- All service classes (unit tests)
- ViewModels with mock services (unit tests)
- CLI argument parsing (unit tests)
- Link resolution and security (unit tests)
- HTML sanitization (unit tests)
- Accessibility validation (unit tests)
- File watching (integration tests)
- Startup and navigation (integration tests)
- UI interactions (MAUI UI tests)

**Migration Action**: Rewrite tests for MAUI functionality using xUnit (per research.md). Use MAUI Device Runners for UI tests. Test architecture may differ from WPF tests - focus on verifying behavior and requirements, not matching WPF test structure.

### Design Philosophy

**Key Principle**: This is a **functional migration**, not a structural port. 

- ✅ **Preserve**: User-facing behavior, feature requirements, security rules, performance targets, accessibility standards
- ✅ **Redesign**: Service architecture, class structure, dependency patterns, data flow
- ✅ **Modernize**: Use MAUI best practices, async/await, dependency injection, platform services, modern C# features
- ❌ **Avoid**: Blindly copying WPF patterns, translating WPF-specific code, maintaining WPF service boundaries

**Example**: WPF has separate `LinkResolver`, `FolderService`, and `NavigationService`. MAUI implementation might combine these into unified navigation/routing service, or split differently based on MAUI patterns. Both approaches valid as long as functionality (link resolution, security validation, history) is preserved.

### Missing Functionality Verification

**Need to Inspect** (not yet confirmed):
- ✅ Context menu for file tree (TreeViewContextMenuService exists)
- ❓ Drag-and-drop for tabs (reordering)
- ❓ Drag-and-drop for external files
- ❓ Print/export functionality
- ❓ Recent files tracking
- ❓ Pinned tabs persistence
- ❓ Session crash recovery details (SessionService interface defined but implementation needs inspection)
- ❓ Startup performance monitoring (StartupPerformanceMonitor - needs verification)
- ❓ Developer tools integration (F12 WebView DevTools)
- ❓ Logging infrastructure details (ILoggingService interface defined but implementation needs inspection)

**Action**: Continue scanning `src.old/` for remaining functionality. Update this checklist as discoveries are made.

### Implementation Priority

**P1 (MVP - Must Have)**:
- ✅ All core services (Markdown, FileSystem, Settings, Navigation, Tab, Theme)
- ✅ CLI argument parsing
- ✅ WebView rendering with bridge
- ✅ Link resolution and security
- ✅ HTML sanitization
- ✅ File watching
- ✅ History tracking
- ✅ Basic UI components (MainPage, Tabs, Sidebar, FindBar)
- ✅ Theme switching (Light/Dark/System)
- ✅ Essential keyboard shortcuts

**P2 (Post-MVP - Should Have)**:
- ✅ Performance monitoring
- ✅ Accessibility validation
- ✅ Folder exclusions
- ✅ UI state persistence
- ✅ Advanced UI (Settings, Search, Theme toggle)
- ✅ Animation infrastructure
- ✅ Advanced keyboard shortcuts
- ✅ Context menus

**P3 (Nice to Have)**:
- ✅ Touch gestures
- ✅ Developer shortcuts (F12 DevTools)
- ✅ Print/export
- ✅ Drag-and-drop

### Testing Checklist

For each feature above, create tests to verify:
- ✅ Functional correctness (unit tests)
- ✅ Performance targets (60fps, <100ms response)
- ✅ Accessibility compliance (WCAG 2.1 AA)
- ✅ Security validation (link blocking, HTML sanitization)
- ✅ Error handling and edge cases
- ✅ Thread safety where applicable

**Migration Outcome**: Complete rebuild with feature parity to WPF app, plus improvements in performance, animations, and touch support.
