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

### User Story 1 - Open and Navigate Multiple Folders (Priority: P1)

A technical writer works on documentation for multiple interconnected projects. They need to view documentation from project-core, project-api, and project-examples simultaneously, switching between folders without losing context or closing tabs.

**Why this priority**: This is the foundational capability that differentiates this redesign from the current single-folder approach. Multi-folder support enables real-world documentation workflows where information spans multiple repositories or project components.

**Independent Test**: Open 3 folders (e.g., "docs-main", "docs-api", "docs-examples"). Each folder should maintain its own file tree and set of tabs. Switching between folders should preserve all open tabs and their scroll positions. User can close one folder without affecting others.

**Acceptance Scenarios**:

1. **Given** no folders are open, **When** user selects "Open Folder" and chooses 3 different directories, **Then** the application shows all 3 folders in a folder switcher, each with independent file trees
2. **Given** folder A has 3 tabs open and folder B has 2 tabs open, **When** user switches from folder A to folder B, **Then** folder A's tabs are hidden but preserved, and folder B's tabs are displayed
3. **Given** multiple folders are open, **When** user closes one folder, **Then** only that folder's tabs are closed, other folders remain unaffected
4. **Given** user has tabs open in multiple folders, **When** application is closed and reopened, **Then** all folders and their tab states are restored

---

### User Story 2 - Keyboard-Driven Navigation and Commands (Priority: P1)

A developer reviews API documentation while keeping hands on the keyboard. They use keyboard shortcuts to open files, navigate between tabs, search content, toggle panels, and execute commands without touching the mouse.

**Why this priority**: Keyboard efficiency is core to the VS Code-inspired experience. Power users rely on keyboard shortcuts for speed and workflow continuity. This foundational capability must work from day one.

**Independent Test**: Using only the keyboard, open the command palette (Ctrl+Shift+P), execute "Open Folder", navigate file tree with arrow keys, open files with Enter, create new tabs (Ctrl+T), switch between tabs (Ctrl+1-9), toggle sidebar (Ctrl+B), search (Ctrl+F), and navigate back/forward (Alt+Left/Right). All actions should complete successfully without mouse.

**Acceptance Scenarios**:

1. **Given** application is launched, **When** user presses Ctrl+Shift+P, **Then** command palette opens showing all available commands with fuzzy search
2. **Given** command palette is open, **When** user types "theme" and presses Enter, **Then** theme selection menu appears
3. **Given** file tree has focus, **When** user presses arrow keys and Enter, **Then** navigation moves between files and folders, Enter opens selected file
4. **Given** multiple tabs are open, **When** user presses Ctrl+[1-9], **Then** application jumps directly to that tab number
5. **Given** any state, **When** user presses F1, **Then** keyboard shortcuts help overlay displays

---

### User Story 3 - Multi-Pane Layout with Split Views (Priority: P2)

A documentation reviewer compares the new API guide against the old version. They split the window vertically, opening the new guide on the left and old guide on the right, scrolling each independently to verify changes.

**Why this priority**: Split views enable side-by-side comparison, a common workflow for reviewers and technical writers. While not essential for basic viewing, it significantly improves productivity for comparison tasks.

**Independent Test**: Open two markdown files. Execute "Split Editor Right" command (Ctrl+\\). Both files should be visible side-by-side, each with independent scroll position, zoom level, and search state. Closing one pane should not affect the other. Rearranging panes should work smoothly.

**Acceptance Scenarios**:

1. **Given** a file is open in the main editor, **When** user presses Ctrl+\\, **Then** editor splits into two panes with the same file shown in both
2. **Given** editor is split, **When** user opens a different file in the right pane, **Then** two different files are displayed side-by-side
3. **Given** editor is split, **When** user scrolls or zooms in one pane, **Then** the other pane is unaffected
4. **Given** editor has multiple splits, **When** user presses Ctrl+W on one pane, **Then** only that pane closes, others remain
5. **Given** editor is split, **When** user drags the divider, **Then** pane sizes adjust responsively

---

### User Story 4 - Native File Integration and System Menus (Priority: P2)

A user receives a README.md file via email. They right-click the file in Windows Explorer, select "Open with MarkRead", and the file opens immediately. They also access MarkRead from the Windows Start menu, the taskbar, and can drag-drop files onto the application window.

**Why this priority**: Native OS integration provides seamless user experience and discoverability. Users expect desktop applications to work with Windows conventions like file associations, context menus, and drag-drop.

**Independent Test**: Associate .md files with MarkRead during installation. Right-click a .md file in Explorer and verify "Open with MarkRead" appears. Drag a .md file onto MarkRead window and verify it opens. Pin MarkRead to taskbar and verify recent files appear in jumplist.

**Acceptance Scenarios**:

1. **Given** MarkRead is installed, **When** user right-clicks a .md file in Explorer, **Then** "Open with MarkRead" appears in context menu
2. **Given** MarkRead is running, **When** user drags a .md file onto the window, **Then** file opens in a new tab
3. **Given** MarkRead is pinned to taskbar, **When** user right-clicks the taskbar icon, **Then** recent files and folders appear in the jumplist
4. **Given** application menu is open, **When** user selects File → Open Recent, **Then** list shows recently opened files and folders
5. **Given** MarkRead window is open, **When** user double-clicks a .md file in Explorer, **Then** file opens in existing MarkRead window (single instance behavior)

---

### User Story 5 - Real-Time File Monitoring and Auto-Reload (Priority: P3)

A technical writer edits documentation in VS Code while previewing it in MarkRead. When they save changes in VS Code, MarkRead automatically refreshes the preview within 1 second, preserving scroll position and showing the updated content.

**Why this priority**: Real-time updates improve the preview workflow but are not critical for basic document viewing. The current application already has this feature; the redesign should maintain and improve it.

**Independent Test**: Open a .md file in MarkRead and the same file in a text editor. Edit and save the file in the text editor. Verify MarkRead updates the preview within 1 second without user action, maintaining scroll position and current zoom level.

**Acceptance Scenarios**:

1. **Given** a file is open in MarkRead, **When** the file is modified externally and saved, **Then** MarkRead refreshes the view within 1 second with a brief "Reloaded" notification
2. **Given** a file is being edited rapidly (multiple saves within 2 seconds), **When** saves complete, **Then** MarkRead debounces updates and refreshes once after 500ms of inactivity
3. **Given** a file is renamed or deleted externally, **When** filesystem event occurs, **Then** MarkRead updates the tab title or shows "File deleted" message
4. **Given** a file is open and user is scrolled 50% down, **When** file is modified externally, **Then** MarkRead reloads and maintains 50% scroll position
5. **Given** multiple files are open, **When** only one is modified externally, **Then** only that file's tab is refreshed, others remain unchanged

---

### User Story 6 - Theme Customization with Dark/Light/High Contrast (Priority: P3)

A user with visual sensitivity works in a dark environment. They switch to dark theme for comfortable reading. Later, when presenting documentation in a bright meeting room, they quickly toggle to light theme. A colleague with accessibility needs uses high contrast mode for better visibility.

**Why this priority**: Theme support improves accessibility and user comfort. Dark/light themes are table stakes for modern desktop apps. High contrast is an accessibility requirement but affects fewer users, making this P3.

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

#### Markdown Rendering (Preserved from Current Implementation)

- **FR-035**: System MUST support GitHub Flavored Markdown including tables, task lists, strikethrough, and autolinks
- **FR-036**: Application MUST provide syntax highlighting for code blocks with support for 50+ languages (using Prism.js or Highlight.js)
- **FR-037**: System MUST render Mermaid diagrams (flowcharts, sequence diagrams, class diagrams, state diagrams, Gantt charts)
- **FR-038**: Application MUST sanitize HTML content and prevent script execution for security
- **FR-039**: System MUST resolve relative image paths and markdown links relative to the current file's location
- **FR-040**: Application MUST support anchor links and scrolling to heading IDs within documents

#### Search Capabilities (Enhanced)

- **FR-041**: System MUST provide in-page search (Ctrl+F) with case-sensitive/insensitive options, whole word matching, and regex support
- **FR-042**: Application MUST implement cross-file search (Ctrl+Shift+F) searching all files in the active folder
- **FR-043**: Cross-file search MUST display results grouped by file with preview snippets and click-to-navigate functionality
- **FR-044**: System MUST support search-and-replace functionality within single files (Ctrl+H)
- **FR-045**: Application MUST highlight all search matches in the document with distinct styling for the active match

#### Settings and Configuration

- **FR-046**: System MUST store all settings in a local JSON configuration file (e.g., %APPDATA%/MarkRead/settings.json)
- **FR-047**: Application MUST provide a settings UI (Ctrl+,) for configuring themes, keyboard shortcuts, file watching, auto-reload, and UI preferences
- **FR-048**: System MUST support workspace-specific settings that override global settings for individual folders
- **FR-049**: Application MUST validate configuration file on load and repair/reset if corrupted

#### Migration from Current .NET/WPF Implementation

- **FR-050**: Migration scripts MUST convert existing user settings from .NET configuration to Electron JSON format
- **FR-051**: Application MUST preserve user data including theme preferences, recent files, folder state, and window position during migration
- **FR-052**: Old .NET/WPF codebase MUST be moved to `/src.old` folder and clearly marked as deprecated
- **FR-053**: Installation process MUST detect existing .NET version and offer to import settings and uninstall old version

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

- **SC-001**: Users can open and work with 5 folders simultaneously, each with 10 tabs, without performance degradation (measured: folder switch time < 300ms, tab switch time < 100ms)
- **SC-002**: 90% of common user actions can be completed using only the keyboard, verified through usability testing with power users
- **SC-003**: Application launches in under 2 seconds on a standard Windows 10 machine (cold start, measured from double-click to first rendered window)
- **SC-004**: File watcher updates appear in the UI within 1 second of external file modification, with scroll position preserved in 95% of cases
- **SC-005**: Application handles folders containing 10,000+ markdown files with file tree load time under 3 seconds and smooth scrolling
- **SC-006**: Theme switching completes within 200ms with no visual flicker or jarring transitions
- **SC-007**: Split view performance matches single-pane performance (scrolling, searching, zooming all < 16ms frame time for 60 FPS)
- **SC-008**: Command palette fuzzy search returns relevant results within 50ms for command lists up to 500 commands
- **SC-009**: Application memory footprint remains under 300MB with 20 tabs open across 3 folders
- **SC-010**: Native integration works seamlessly: file associations, drag-drop, recent files, and context menus all functional at 100% reliability
- **SC-011**: Migration from .NET version succeeds for 100% of tested user configurations without data loss
- **SC-012**: Keyboard shortcut discoverability improves: 80% of surveyed users find and use at least 5 keyboard shortcuts within first week

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

- **FR-053 (Migration Scripts)** depends on FR-046 (Settings Storage) being defined and implemented first
- **FR-018 (Persist Split Layout)** depends on FR-014-017 (Multi-Pane Layout) being functional
- **FR-043 (Cross-File Search Results)** depends on FR-042 (Cross-File Search Implementation) providing search API
- **FR-029 (Global Shortcuts)** depends on FR-010 (Keyboard Navigation) and FR-011 (Configurable Shortcuts) being implemented
- **FR-032 (Theme Application Speed)** depends on FR-030 (Theme Modes) architecture supporting async theme loading

## Out of Scope

The following features are explicitly excluded from this redesign phase:

1. **Markdown Editing**: Application remains view-only; no text editing, file creation, or content modification capabilities
2. **Collaboration Features**: No real-time co-viewing, comments, or multi-user capabilities
3. **Cloud Sync**: No synchronization of settings, recent files, or bookmarks across devices
4. **Plugin System**: No extensibility API or third-party plugin support in initial release
5. **Export to PDF/HTML**: No file export functionality beyond native browser print-to-PDF
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

### Migration Constraints

- **Backwards Compatibility**: Must support import of settings from current .NET/WPF version (version 1.x)
- **No Breaking Changes to File Formats**: Markdown files, images, and folder structures must work identically in both old and new versions
- **Coexistence Period**: Old .NET version and new Electron version may coexist on user systems during transition; must not conflict (different executable names, separate settings locations)

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
