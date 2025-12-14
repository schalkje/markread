# Feature Specification: Electron-Based Application Redesign

**Feature Branch**: `006-electron-redesign`  
**Created**: December 14, 2025  
**Status**: Draft  
**Input**: User description: "Electron-based redesign of the application with VS Code-like features, optimized for desktop with single-window + tabs + multi-pane layout, full keyboard model, filesystem watching, native menus, and offline-first approach"

## User Scenarios & Testing *(mandatory)*

<!--
  IMPORTANT: User stories should be PRIORITIZED as user journeys ordered by importance.
  Each user story/journey must be INDEPENDENTLY TESTABLE - meaning if you implement just ONE of them,
  you should still have a viable MVP (Minimum Viable Product) that delivers value.
  
  Assign priorities (P1, P2, P3, etc.) to each story, where P1 is the most critical.
  Think of each story as a standalone slice of functionality that can be:
  - Developed independently
  - Tested independently
  - Deployed independently
  - Demonstrated to users independently
-->

### User Story 1 - Rich Markdown Rendering with Code and Diagrams (Priority: P1)

A developer opens a complex documentation file containing code examples in multiple languages, tables, task lists, and Mermaid sequence diagrams. The document renders immediately with proper syntax highlighting, formatted tables, and interactive diagrams.

**Why this priority**: Accurate, fast markdown rendering is the core value proposition. Without excellent rendering, all other features are meaningless. Users must trust that their documentation displays correctly with all formatting, code syntax, and diagrams intact.

**Independent Test**: Open a markdown file containing GitHub Flavored Markdown (tables, task lists, strikethrough), code blocks in 5+ languages (JavaScript, Python, C#, SQL, YAML), embedded images, and a Mermaid diagram. Verify all elements render correctly with proper syntax highlighting colors, table borders, checkbox rendering, and diagram layout within 500ms.

**Acceptance Scenarios**:

1. **Given** a markdown file with code blocks in JavaScript, Python, and SQL, **When** file is opened, **Then** each code block displays with language-specific syntax highlighting within 500ms
2. **Given** a markdown file with a Mermaid flowchart diagram, **When** file is rendered, **Then** diagram appears as a formatted graphic (not raw code) with proper node layout and connectors
3. **Given** a markdown file with tables and task lists, **When** file is displayed, **Then** tables show borders and alignment, checkboxes appear as interactive UI elements
4. **Given** a markdown file with relative image links, **When** file is rendered, **Then** images load and display at correct positions
5. **Given** a markdown file with HTML content, **When** file is rendered, **Then** HTML is sanitized (scripts removed) but formatting preserved

---

### User Story 2 - Smooth Zoom, Scroll, and Page Navigation (Priority: P2)

A reviewer reads a long technical specification document on a touch-enabled laptop. They use pinch-to-zoom to enlarge diagrams, scroll smoothly through sections with trackpad, jump to headings using keyboard shortcuts, and pan zoomed content with mouse drag - all interactions feel responsive and natural.

**Why this priority**: Once content renders correctly, users need fluid navigation within documents. Zoom, scroll, and pan are fundamental reading interactions that must feel native and responsive, whether using mouse, keyboard, or touch.

**Independent Test**: Open a 50-page markdown document. Use Ctrl+Scroll to zoom in 200%, verify content scales smoothly. Scroll through document with mouse wheel, trackpad gestures, and Page Down key - all should be smooth (60 FPS). Use Ctrl+F to search, jump to matches with Enter/Shift+Enter. Pan zoomed content by click-dragging. All interactions should respond within 50ms.

**Acceptance Scenarios**:

1. **Given** a document is open at 100% zoom, **When** user presses Ctrl+Plus or Ctrl+Scroll-up, **Then** content zooms in 10% increments up to 2000%, maintaining scroll position
2. **Given** a document is zoomed to 200%, **When** user click-drags on the content, **Then** content pans in all directions, cursor shows pan/grab icon
3. **Given** a long document is open, **When** user scrolls with mouse wheel or trackpad, **Then** scrolling is smooth at 60 FPS with no stuttering
4. **Given** a document with multiple headings, **When** user presses Ctrl+G or uses heading navigation, **Then** view jumps to selected heading instantly
5. **Given** a document on touch device, **When** user uses pinch gesture, **Then** content zooms smoothly following finger positions

---

### User Story 3 - Multi-Tab and Multi-Document Navigation (Priority: P3)

A technical writer works on interconnected documentation files. They open multiple related files in tabs, switch between them using Ctrl+Tab or Ctrl+1-9, navigate forward/backward through their reading history with Alt+Left/Right, and view two documents side-by-side when comparing content.

**Why this priority**: Multi-document workflows are essential for serious documentation work, but rely on having excellent single-document rendering and navigation first. Tabs and history enable efficient context switching.

**Independent Test**: Open 5 markdown files in separate tabs. Switch between tabs using Ctrl+1-5 and Ctrl+Tab. Click links to navigate between documents, then use Alt+Left to return. Split view with Ctrl+\\ to show two documents side-by-side. Close tabs with Ctrl+W. All operations should complete within 100ms.

**Acceptance Scenarios**:

1. **Given** 5 files are open in tabs, **When** user presses Ctrl+3, **Then** application switches to tab 3 instantly (< 100ms)
2. **Given** user clicks a link to navigate from Doc A to Doc B, **When** user presses Alt+Left, **Then** view returns to Doc A at previous scroll position
3. **Given** a file is open, **When** user presses Ctrl+\\, **Then** editor splits showing same file in both panes
4. **Given** split view is active, **When** user opens different file in right pane, **Then** two files display side-by-side with independent scroll
5. **Given** multiple tabs are open, **When** user presses Ctrl+W, **Then** active tab closes, next tab becomes active

---

### User Story 4 - Keyboard-Driven Commands and Shortcuts (Priority: P3)

A power user reviews documentation while keeping hands on the keyboard. They use Ctrl+Shift+P to open the command palette, type commands to switch themes, toggle sidebar, and search files. They use Ctrl+O to open files, Ctrl+F to search content, and F1 to view all keyboard shortcuts.

**Why this priority**: Keyboard efficiency accelerates workflows for power users. While mouse and touch are important, keyboard commands enable fastest navigation for users who learn the shortcuts.

**Independent Test**: Using only the keyboard, open command palette (Ctrl+Shift+P), search for "theme" command, execute theme change. Open file tree with Ctrl+B, navigate with arrows, open file with Enter. Search document with Ctrl+F, navigate matches with F3. View shortcuts with F1. All actions complete successfully.

**Acceptance Scenarios**:

1. **Given** application is launched, **When** user presses Ctrl+Shift+P, **Then** command palette opens with fuzzy search of all commands
2. **Given** document is open, **When** user presses Ctrl+F, **Then** find bar appears with search input focused
3. **Given** sidebar is visible, **When** user presses Ctrl+B, **Then** sidebar toggles hidden
4. **Given** multiple tabs are open, **When** user presses Ctrl+Tab, **Then** next tab becomes active
5. **Given** any state, **When** user presses F1, **Then** keyboard shortcuts reference overlay displays

---

### User Story 5 - Multi-Folder Workspaces (Priority: P4)

A technical writer works on documentation for multiple interconnected projects. They open project-core, project-api, and project-examples folders simultaneously, each maintaining independent file trees and tabs. Switching between folders preserves all context.

**Why this priority**: Multi-folder support enables advanced workflows where documentation spans repositories, but most users work in single folders. This can be added after core viewing and navigation features are solid.

**Independent Test**: Open 3 folders. Each folder should show independent file tree and tab collection. Switch between folders and verify tabs are preserved. Close one folder without affecting others. Restart application and verify all folders and tabs restore.

**Acceptance Scenarios**:

1. **Given** no folders are open, **When** user opens 3 different directories, **Then** application shows all 3 folders in folder switcher
2. **Given** folder A has 3 tabs and folder B has 2 tabs, **When** user switches folders, **Then** appropriate tabs display for active folder
3. **Given** multiple folders are open, **When** user closes one folder, **Then** only that folder's tabs close
4. **Given** folders are open with tabs, **When** application restarts, **Then** all folders and tab states restore
5. **Given** multiple folders are open, **When** user opens file from tree, **Then** file opens in tab within that folder's tab group

---

### User Story 6 - Theme Customization with Dark/Light/High Contrast (Priority: P4)

A user with visual sensitivity works in a dark environment. They switch to dark theme for comfortable reading. Later, when presenting documentation in a bright meeting room, they quickly toggle to light theme. A colleague with accessibility needs uses high contrast mode for better visibility.

**Why this priority**: Theme support improves accessibility and user comfort. Dark/light themes are expected in modern apps but are secondary to core viewing functionality. High contrast is important for accessibility.

**Independent Test**: Open application and verify it respects system theme. Use command palette or settings to switch to dark theme - verify UI and content both update. Switch to light theme - verify complete update. Enable high contrast theme - verify all text has sufficient contrast ratio (WCAG AA minimum 4.5:1).

**Acceptance Scenarios**:

1. **Given** system is set to dark mode, **When** application launches, **Then** MarkRead opens in dark theme without user intervention
2. **Given** application is running, **When** user executes "Change Theme" command, **Then** theme selector appears with System/Dark/Light/High Contrast options
3. **Given** user selects dark theme, **When** theme applies, **Then** all UI elements (sidebar, tabs, menus, content area) update to dark colors
4. **Given** user has custom theme preference, **When** system theme changes, **Then** application ignores system changes and maintains user preference
5. **Given** high contrast theme is enabled, **When** viewing any markdown content, **Then** all text has minimum 7:1 contrast ratio with background

---

### Edge Cases

- What happens when a folder is opened that contains 10,000+ files? (File tree should load progressively, showing first 1000 files immediately, loading rest in background with virtualization)
- How does the application handle circular symbolic links in folder structures? (Detect circular references and skip them with a warning log entry, preventing infinite loops)
- What happens when multiple MarkRead windows are open and both try to open the same file? (Each window operates independently; file watchers work per-window; no file locking)
- How does the application behave when a file is deleted while open in a tab? (Tab shows "File not found" message with options: Close Tab, Reload Folder, or Choose New File)
- What happens if user drags 100 files onto the application simultaneously? (Open first 20 files in tabs, show notification "20 files opened, 80 files skipped (tab limit)", provide "Open All" option in notification)
- How does the command palette handle very long command lists (100+ commands)? (Show first 50 matches, virtual scrolling for rest, fuzzy search prioritizes recently used commands)
- What happens when user switches between folders rapidly (5 folder switches in 2 seconds)? (Debounce folder switches with 300ms delay, queue rapid switches and execute the final one, show loading spinner for transitions >500ms)
- How does split view work when window is resized to very narrow width (400px)? (Automatically stack splits vertically when width < 768px, show scroll indicators, allow manual re-split)

## Requirements *(mandatory)*

### Functional Requirements

#### Architecture and Platform

- **FR-001**: System MUST be built on Electron framework with Node.js runtime, providing cross-platform desktop capabilities while targeting Windows 10/11 initially
- **FR-002**: Application MUST support single-window architecture with tabbed interface, matching VS Code's window management model
- **FR-003**: System MUST operate fully offline after installation, with no internet connectivity requirements for core functionality
- **FR-004**: Application MUST use Chromium rendering engine (via Electron's webview) for consistent markdown rendering across all systems

#### Multi-Folder Support

- **FR-005**: System MUST allow users to open multiple folders simultaneously, each maintaining independent file trees and tab collections
- **FR-006**: Application MUST provide a folder switcher UI element (similar to VS Code's workspace folders) for navigating between open folders
- **FR-007**: System MUST persist folder state across sessions, including open folders, active folder, tab states, and UI layout preferences
- **FR-008**: Each folder MUST maintain its own navigation history, recent files list, and file tree expansion state

#### Keyboard-Driven Interface

- **FR-009**: Application MUST implement a command palette (Ctrl+Shift+P or F1) showing all available commands with fuzzy search
- **FR-010**: System MUST support keyboard navigation for all major functions: file operations, tab management, navigation, search, and settings
- **FR-011**: Application MUST provide configurable keyboard shortcuts with defaults matching VS Code conventions where applicable
- **FR-012**: System MUST display an interactive keyboard shortcuts reference (F1 or Help menu) showing current bindings and descriptions
- **FR-013**: Application MUST support tab jumping with Ctrl+[1-9] for tabs 1-9 and Ctrl+0 for the last tab

#### Multi-Pane Layout

- **FR-014**: System MUST support editor splitting with vertical split (Ctrl+\\), horizontal split (Ctrl+K Ctrl+\\), and grid layouts
- **FR-015**: Each editor pane MUST maintain independent scroll position, zoom level, search state, and navigation history
- **FR-016**: Application MUST allow users to drag tabs between panes and rearrange pane layouts
- **FR-017**: System MUST support closing individual panes (Ctrl+W) without affecting other panes or tabs
- **FR-018**: Application MUST persist split layout preferences per folder across sessions

#### File System Integration

- **FR-019**: System MUST watch all open folders for file changes (add, modify, delete, rename) and update UI within 1 second
- **FR-020**: Application MUST debounce rapid file changes (multiple saves within 500ms) and batch updates to prevent flicker
- **FR-021**: System MUST preserve scroll position and zoom level when reloading files after external modifications
- **FR-022**: Application MUST register as a handler for .md and .markdown file extensions during installation on Windows
- **FR-023**: System MUST support drag-and-drop for files and folders onto the application window, opening them in new tabs
- **FR-024**: Application MUST implement Windows Explorer context menu integration ("Open with MarkRead" for files and folders)
- **FR-025**: System MUST maintain a recent files and folders list (maximum 20 items) accessible via File menu and taskbar jumplist

#### Native Menus and Window Management

- **FR-026**: Application MUST implement native Windows menu bar with File, Edit, View, Go, Help menus following Windows conventions
- **FR-027**: System MUST support native window controls (minimize, maximize/restore, close) with standard Windows behavior
- **FR-028**: Application MUST implement single-instance mode where opening a file/folder reuses the existing window rather than creating a new instance
- **FR-029**: System MUST support global keyboard shortcuts (e.g., Ctrl+Alt+M to activate MarkRead) registered with the operating system

#### Theme System

- **FR-030**: Application MUST support three theme modes: System (follow OS), Dark, and Light with seamless switching
- **FR-031**: System MUST provide a high contrast theme meeting WCAG AAA standards (7:1 contrast ratio minimum)
- **FR-032**: Application MUST apply theme changes to all UI elements (chrome, menus, sidebar, tabs, content) within 200ms
- **FR-033**: System MUST persist user theme preference across sessions, overriding system theme when user has explicit preference
- **FR-034**: Application MUST update theme immediately when system theme changes (if theme mode is set to "System")

#### Markdown Rendering (Reusing Current Implementation Libraries)

- **FR-035**: System MUST support GitHub Flavored Markdown including tables, task lists, strikethrough, and autolinks
- **FR-036**: Application MUST provide syntax highlighting for code blocks with support for 50+ languages using existing libraries (Prism.js or Highlight.js from current implementation)
- **FR-037**: System MUST render Mermaid diagrams (flowcharts, sequence diagrams, class diagrams, state diagrams, Gantt charts) using existing Mermaid.js library
- **FR-038**: Application MUST use existing markdown-it library (or equivalent markdown parser currently in use) for parsing and rendering markdown to HTML
- **FR-039**: Application MUST sanitize HTML content and prevent script execution for security
- **FR-040**: System MUST resolve relative image paths and markdown links relative to the current file's location
- **FR-041**: Application MUST support anchor links and scrolling to heading IDs within documents

#### Search Capabilities (Enhanced)

- **FR-042**: System MUST provide in-page search (Ctrl+F) with case-sensitive/insensitive options, whole word matching, and regex support
- **FR-043**: Application MUST implement cross-file search (Ctrl+Shift+F) searching all files in the active folder
- **FR-044**: Cross-file search MUST display results grouped by file with preview snippets and click-to-navigate functionality
- **FR-045**: System MUST support search-and-replace functionality within single files (Ctrl+H)
- **FR-046**: Application MUST highlight all search matches in the document with distinct styling for the active match

#### Settings and Configuration

- **FR-047**: System MUST store all settings in a local JSON configuration file (e.g., %APPDATA%/MarkRead/settings.json)
- **FR-048**: Application MUST provide a settings UI (Ctrl+,) for configuring themes, keyboard shortcuts, file watching, auto-reload, and UI preferences
- **FR-049**: System MUST support workspace-specific settings that override global settings for individual folders
- **FR-050**: Application MUST validate configuration file on load and repair/reset if corrupted

#### Export and Advanced Features

- **FR-051**: Application MUST support export to PDF via native browser print-to-PDF functionality
- **FR-052**: Export MUST preserve markdown formatting, code syntax highlighting, and rendered diagrams in PDF output

### Key Entities *(include if feature involves data)*

- **Folder**: Represents an opened documentation root with properties: path, file tree state, active tab, tab collection, recent files, expansion state
- **Tab**: Represents an open document with properties: file path, title, icon, scroll position, zoom level, search state, modification timestamp, is-dirty flag
- **Pane**: Represents an editor viewing area with properties: pane ID, tab collection, active tab, split orientation (vertical/horizontal), size ratio
- **Command**: Represents a user action with properties: command ID, label, keyboard shortcut, category, when-clause (context condition)
- **Theme**: Represents a color scheme with properties: theme ID, name, type (dark/light/high-contrast), color mappings, syntax highlighting colors
- **FileWatcher**: Represents a filesystem monitor with properties: watched path, file patterns, debounce interval, change event handlers
- **RecentItem**: Represents a recent file or folder with properties: path, type (file/folder), last accessed timestamp, display name
- **KeyboardShortcut**: Represents a key binding with properties: key combination, command ID, when-clause, is-custom flag

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Complex markdown documents (10+ code blocks, 5+ diagrams, 20+ images) render completely within 500ms on standard hardware
- **SC-002**: Syntax highlighting displays correctly for 50+ programming languages using existing library configurations
- **SC-003**: Mermaid diagrams render as formatted graphics (not code) with proper layout in 100% of valid diagram cases
- **SC-004**: Zoom operations (10%-500% range) complete within 50ms with smooth scaling and maintained scroll position
- **SC-005**: Scrolling maintains 60 FPS (< 16ms frame time) on documents up to 10,000 lines with mouse, keyboard, and touch input
- **SC-006**: Tab switching completes within 100ms for up to 20 open tabs
- **SC-007**: Split view performance matches single-pane performance (scrolling, zooming, searching all maintain 60 FPS)
- **SC-008**: Application launches in under 2 seconds on standard Windows 10 machine (cold start to first rendered window)
- **SC-009**: Application memory footprint remains under 300MB with 20 tabs open
- **SC-010**: 90% of common user actions can be completed using keyboard shortcuts
- **SC-011**: PDF export preserves all formatting including syntax highlighting and diagrams
- **SC-012**: Theme switching completes within 200ms with no visual flicker

## Assumptions

1. **Technology Stack**: Electron is the appropriate choice for desktop-first, Windows-optimized application with potential future cross-platform expansion (assumption: Electron's maturity and ecosystem outweigh bundle size concerns)
2. **VS Code Benchmark**: VS Code's UX patterns and keyboard model are the gold standard for desktop productivity apps in the developer/technical writer space (assumption: target users are familiar with or aspire to VS Code workflows)
3. **Single Instance Model**: Users prefer single-window, multi-tab experience over multiple application windows (assumption: verified by current MarkRead usage patterns and VS Code conventions)
4. **Offline Operation**: Users work in environments without reliable internet or prefer not to send documentation content over the network (assumption: privacy and offline capability are key differentiators)
5. **Markdown Rendering Libraries**: Existing rendering libraries (Markdig → markdown-it, Prism.js, Mermaid) provide equivalent or better functionality in Electron environment (assumption: web-based rendering libraries are mature and performant)
6. **Migration Path**: Users of current .NET/WPF version will accept a one-time migration process if the new version provides significant UX improvements (assumption: improved feature set justifies migration friction)
7. **Performance Expectations**: Users expect desktop application responsiveness (frame times < 16ms, actions < 100ms) rather than web application tolerance (frame times < 50ms, actions < 300ms) (assumption: desktop context sets higher performance bar)
8. **Keyboard-First Users**: Target audience includes power users who value keyboard efficiency over mouse convenience (assumption: technical writers and developers prefer keyboard navigation)
9. **Folder Structure**: User documentation follows hierarchical folder structures with markdown files, not flat structures or database-backed content (assumption: git-based documentation is the primary use case)
10. **Theme Preferences**: Users have strong theme preferences and expect applications to honor system theme or remember custom preference (assumption: theme consistency across apps improves user experience)

## Dependencies

### External Dependencies

- **Electron Framework**: Core application shell and Chromium rendering engine (specific version to be determined during planning)
- **Node.js Ecosystem**: NPM packages for markdown parsing (markdown-it), syntax highlighting (Prism.js or Highlight.js), diagram rendering (Mermaid)
- **Windows APIs**: File system watcher APIs, file association registry, taskbar jumplist APIs, global shortcut registration
- **Build Tooling**: Electron Builder or Electron Forge for packaging, code signing, and Windows installer generation

### Internal Dependencies

- **Asset Migration**: Existing icon designs, color schemes, and visual assets must be adapted for Electron environment
- **Settings Schema**: Definition of configuration file structure compatible with Electron's preferences system
- **Documentation Update**: All user-facing documentation must be updated to reflect Electron UI patterns and capabilities
- **Testing Infrastructure**: New automated testing approach for Electron (Spectron or Playwright) replacing .NET testing tools

### Dependent Features

- **FR-018 (Persist Split Layout)** depends on FR-014-017 (Multi-Pane Layout) being functional
- **FR-044 (Cross-File Search Results)** depends on FR-043 (Cross-File Search Implementation) providing search API
- **FR-029 (Global Shortcuts)** depends on FR-010 (Keyboard Navigation) and FR-011 (Configurable Shortcuts) being implemented
- **FR-032 (Theme Application Speed)** depends on FR-030 (Theme Modes) architecture supporting async theme loading
- **FR-051-052 (PDF Export)** depends on FR-035-041 (Markdown Rendering) being complete and tested

## Out of Scope

The following features are explicitly excluded from this redesign phase:

1. **Markdown Editing**: Application remains view-only; no text editing, file creation, or content modification capabilities
2. **Collaboration Features**: No real-time co-viewing, comments, or multi-user capabilities
3. **Cloud Sync**: No synchronization of settings, recent files, or bookmarks across devices
4. **Plugin System**: No extensibility API or third-party plugin support in initial release
5. **Migration from .NET/WPF Version**: No automatic migration of settings from current .NET implementation; users configure Electron version from scratch
6. **Mobile or Web Versions**: Electron application targets Windows desktop only; no responsive mobile web UI
7. **Git Integration**: No built-in git status indicators, diff views, or commit history integration
8. **Full-Text Indexing**: No search index building; cross-file search uses real-time file system scanning
9. **Math/LaTeX Rendering**: KaTeX or MathJax support deferred to future enhancement
10. **Accessibility Beyond High Contrast**: Screen reader optimization and ARIA labels deferred to future accessibility-focused sprint
11. **Internationalization**: UI text remains English-only; no localization framework in this phase
12. **Custom Syntax Highlighting Themes**: Fixed set of syntax themes (5-10 presets); no user-customizable code color schemes
13. **Macro or Scripting Support**: No user-defined automation or scripting capabilities
14. **Performance Profiling UI**: No built-in performance monitoring or diagnostics panel for users

## Constraints

### Technical Constraints

- **Platform Target**: Must run on Windows 10 (version 1809+) and Windows 11 without requiring admin privileges
- **Bundle Size**: Application installer must remain under 150MB to enable reasonable download and installation times
- **Memory Footprint**: Maximum 300MB RAM usage with typical workload (20 tabs, 3 folders) to avoid system resource strain
- **Startup Time**: Cold start (launch) must complete within 2 seconds to meet desktop application expectations
- **Rendering Performance**: Scrolling and interactions must maintain 60 FPS (16ms frame time) on mid-range hardware (Intel i5-8250U equivalent)

### File Format Constraints

- **No Breaking Changes to File Formats**: Markdown files, images, and folder structures must work identically, enabling users to switch between any markdown viewer
- **Clean Installation**: Electron version installs independently; no automatic migration from .NET version (users reconfigure manually)

### UX Constraints

- **Learning Curve**: Users familiar with current MarkRead should recognize 80% of UI patterns without training
- **VS Code Similarity**: Keyboard shortcuts and command palette should match VS Code conventions where applicable to leverage existing user knowledge
- **Accessibility Baseline**: Must meet WCAG AA standards minimum (4.5:1 contrast for normal text, keyboard navigable)

### Development Constraints

- **Technology Reuse**: Maximize reuse of existing markdown rendering logic, theme color schemes, and icon assets to accelerate development
- **Testing Requirements**: Must maintain existing end-to-end test coverage (smoke tests for open, render, navigate, search, theme)
- **Documentation Completeness**: All user-facing features must have documentation updated before release (user guide, keyboard reference, migration guide)

### Operational Constraints

- **Single Maintainer**: Project has one primary maintainer; architecture must prioritize maintainability over cutting-edge complexity
- **Release Schedule**: Full redesign should achieve feature parity with current version within 3-4 months to avoid extended transition period
- **Support Burden**: Must not increase support complexity; documentation and error messages must be clear enough to minimize user questions

## Related Features

- **001-markdown-viewer**: Original MVP specification for viewer-only functionality - core rendering requirements carry forward
- **002-folder-treeview**: File tree sidebar specification - UI patterns inform Electron sidebar design
- **003-mockup-ui**: UI mockup and design system - color schemes and layout principles apply to Electron redesign
- **004-zoom-pan**: Zoom and pan functionality - interaction model must work identically in Electron
- **005-msi-signing**: MSI installer and code signing - Windows installation patterns apply to Electron installer

## Open Questions

**Q1: Multi-Window vs. Single-Window Model**

Should the application support opening multiple windows (like VS Code's "New Window" feature), or strictly enforce single-window + multi-folder model?

**Implications**:
- **Multi-window**: Enables users to span folders across multiple monitors, increases complexity for state management and IPC
- **Single-window only**: Simpler architecture, all state in one process, easier multi-folder management, but limits multi-monitor workflows

**Recommendation**: Start with single-window model (simpler, faster to implement), add multi-window in future release if users request it based on usage data.

---

**Q2: Command Palette Scope and Extensibility**

Should the command palette be limited to built-in commands, or should it support user-defined commands and keyboard bindings from a configuration file (like VS Code's keybindings.json)?

**Implications**:
- **Built-in only**: Simpler implementation, no config file parsing, but less flexible for power users
- **Configurable commands**: Higher user value, matches VS Code model, but requires config schema, validation, and UI for command customization

**Recommendation**: Start with built-in commands only, expose keybindings.json in future release with settings UI.

---

**Q3: Pane Layout Persistence Strategy**

Should split pane layouts be persisted globally (all folders use same split config), per-folder (each folder remembers its own layout), or both with user choice?

**Implications**:
- **Global only**: Simpler, but users who want different layouts for different folders (e.g., split for API docs, single pane for readme files) cannot achieve it
- **Per-folder**: More flexible, matches VS Code workspace behavior, but requires more complex state management
- **Hybrid with toggle**: Best of both worlds, but adds UI complexity for mode selection

**Recommendation**: Implement per-folder layout persistence (matches FR-018 and multi-folder philosophy), with no global override initially.
