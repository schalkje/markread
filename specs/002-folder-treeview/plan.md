# Implementation Plan: Folder Structure Treeview

**Branch**: `002-folder-treeview` | **Date**: October 28, 2025 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/002-folder-treeview/spec.md`

## Summary

Add hierarchical folder/file treeview navigation to the existing MarkRead viewer, displaying only folders containing markdown files. The treeview loads asynchronously in the background after initial markdown content displays, supports real-time file system watching with minimal performance impact, provides full keyboard navigation including type-ahead search, and persists visibility preferences (global default and per-folder overrides) and last-viewed file per folder. Initial file selection prioritizes last-viewed → README.md → first alphabetically, with folders always starting collapsed and items sorted alphabetically (folders before files, case-insensitive).

## Technical Context

**Language/Version**: .NET 8 (C#)  
**Primary Dependencies**: WPF TreeView control, System.IO.FileSystemWatcher for real-time monitoring  
**Storage**: Local filesystem only (settings persisted via existing SettingsService)  
**Testing**: xUnit/NUnit for services (tree building, file watching, settings persistence); integration tests for treeview population and user interactions  
**Target Platform**: Windows 10/11 desktop  
**Project Type**: Single desktop app (WPF) enhancement - adding treeview navigation to existing viewer  
**Performance Goals**: Initial markdown display < 1s; treeview population < 5s for 1000 files; type-ahead search < 100ms; file system watching < 2% CPU idle; navigation response < 500ms  
**Constraints**: Minimal performance impact; keyboard accessible; offline-capable; responsive UI during background scanning  
**Scale/Scope**: Folders with up to thousands of markdown files across deep hierarchies (10+ levels); real-time file system monitoring without blocking UI

Assumptions: Leverage existing WPF TreeView control with custom styling; FileSystemWatcher for change detection; extend existing SettingsService for preferences; integrate with existing FolderService and HistoryService.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Gate alignment with MarkRead Constitution (v1.0.0):

- **I. Code Quality**: Plan favors clean separation of concerns with TreeViewService for tree building logic, FileWatcherService for monitoring (already exists), and ViewModel for UI state management. Code will be testable with unit tests for tree construction and sorting logic → PASS
- **II. UX Consistency**: Maintains consistent keyboard shortcuts (Ctrl+R/F5 for refresh), error handling patterns for permission issues, and UI responsiveness standards from existing features → PASS
- **III. Documentation Standard**: Spec + plan + research + data-model + quickstart will document design decisions; inline documentation for complex tree building and file watching logic → PASS
- **IV. Performance Requirements**: Strict performance targets defined (< 1s initial display, < 5s tree load, < 2% CPU for watching, < 100ms type-ahead). Async background loading ensures UI responsiveness → PASS

No violations requiring Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── App/                  # WPF app (shell, DI, theming, shortcuts)
├── Rendering/            # WebView2 host, HTML template, assets (highlight.js, mermaid)
├── Services/             
│   ├── FileWatcherService.cs    # Existing - may need enhancement for markdown-specific monitoring
│   ├── FolderService.cs         # Existing - may need enhancement for tree building
│   ├── HistoryService.cs        # Existing - tracks last viewed file per folder
│   ├── SettingsService.cs       # Existing - will store treeview preferences
│   └── TreeViewService.cs       # NEW - builds tree structure, sorts, filters empty folders
├── UI/
│   ├── Sidebar/
│   │   ├── TreeView/            # NEW - treeview view and viewmodel
│   │   │   ├── TreeViewView.xaml
│   │   │   ├── TreeViewView.xaml.cs
│   │   │   └── TreeViewViewModel.cs
│   │   └── SidebarViewModel.cs  # May need enhancement for treeview integration
│   ├── Shell/                   # Main window - may need layout updates for treeview toggle
│   └── Settings/                # May need UI for treeview default preference
└── Cli/                         # Entry parsing for folder/file startup

tests/
├── unit/
│   ├── TreeViewServiceTests.cs  # NEW - tree building, sorting, filtering logic
│   ├── FileWatcherTests.cs      # Existing - may add tests for markdown-specific watching
│   └── SettingsServiceTests.cs  # Existing - may add tests for treeview preferences
└── integration/
    └── TreeViewIntegrationTests.cs  # NEW - treeview population, keyboard navigation, refresh
```

**Structure Decision**: Extend existing WPF structure with new TreeViewService for business logic and UI/Sidebar/TreeView for presentation. Reuse existing FileWatcherService, SettingsService, and HistoryService where possible. TreeView will be a collapsible panel in the sidebar area.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations - table not needed.

## Post-design Constitution Re-check

Re-evaluated after Phase 1 artifacts (research, data-model, contracts, quickstart):

- **I. Code Quality**: TreeViewService provides clean separation of concerns; TreeNode model is simple and testable; unit tests planned for tree building, sorting, and filtering logic; MVVM pattern maintains testability → PASS
- **II. UX Consistency**: Keyboard shortcuts consistent with existing patterns; error messages follow application standards; treeview toggle behavior matches sidebar conventions → PASS
- **III. Documentation Standard**: All Phase 1 artifacts created (research.md documents technical decisions; data-model.md defines entities and relationships; commands.md specifies user interactions; quickstart.md provides implementation guide) → PASS
- **IV. Performance Requirements**: All success criteria remain achievable with chosen technologies (WPF TreeView virtualization handles 1000+ nodes; async I/O prevents UI blocking; FileSystemWatcher with debouncing keeps CPU < 2%; type-ahead 300ms debounce ensures < 100ms filter time) → PASS

No complexity justifications required. Implementation can proceed following quickstart guide.
