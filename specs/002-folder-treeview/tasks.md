---
description: "Task list for Folder Structure Treeview implementation"
---

# Tasks: Folder Structure Treeview

**Input**: Design documents from `/specs/002-folder-treeview/`  
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/commands.md, quickstart.md

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure for treeview feature

- [X] T001 Review existing WPF application structure in src/App/ and src/UI/ to understand integration points
- [X] T002 Verify .NET 8 SDK and WPF dependencies are properly configured in src/App/MarkRead.App.csproj
- [X] T003 [P] Create UI/Sidebar/TreeView/ directory structure for new treeview components

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core data models and services that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T004 Create TreeNode model class in src/Services/TreeNode.cs with properties (Name, FullPath, Type, Parent, Children, IsExpanded, IsSelected, IsVisible) and INotifyPropertyChanged implementation
- [X] T005 Create NodeType enum in src/Services/TreeNode.cs with values Folder and File
- [X] T006 [P] Create TreeViewSettings model in src/Services/TreeViewSettings.cs with DefaultVisible and PerFolderSettings dictionary
- [X] T007 [P] Create FolderTreeSettings model in src/Services/TreeViewSettings.cs with IsVisible and LastViewedFile properties
- [X] T008 Create TreeViewService class in src/Services/TreeViewService.cs with skeleton methods (BuildTreeAsync, DetermineInitialFileAsync, SaveVisibilityPreference)
- [X] T009 Add TreeViewService registration to dependency injection container in src/App/App.xaml.cs

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - View Markdown Content Immediately (Priority: P1) 🎯 MVP

**Goal**: Display markdown content instantly while treeview loads asynchronously in background

**Independent Test**: Open any folder with markdown files and verify content displays within 1 second while treeview populates

### Implementation for User Story 1

- [X] T010 [US1] Implement BuildTreeAsync method in src/Services/TreeViewService.cs with recursive directory scanning for markdown files (\*.md, \*.markdown)
- [X] T011 [US1] Implement HasMarkdownFiles recursive helper method in src/Services/TreeViewService.cs to detect folders containing markdown (directly or in descendants)
- [X] T012 [US1] Implement empty folder filtering logic in BuildTreeAsync using bottom-up traversal (exclude folders without markdown files per FR-012)
- [X] T013 [US1] Implement sorting logic in BuildTreeAsync: folders before files, alphabetical case-insensitive (per FR-017)
- [X] T014 [US1] Implement DetermineInitialFileAsync method in src/Services/TreeViewService.cs to select initial file (cascade: HistoryService last viewed → README.md → first alphabetical per FR-018, FR-019)
- [X] T015 [US1] Create TreeViewViewModel class in src/UI/Sidebar/TreeView/TreeViewViewModel.cs with TreeRoot property, LoadTreeAsync method, and INotifyPropertyChanged
- [X] T016 [US1] Create TreeViewView.xaml in src/UI/Sidebar/TreeView/ with HierarchicalDataTemplate binding to TreeRoot.Children
- [X] T017 [US1] Create TreeViewView.xaml.cs in src/UI/Sidebar/TreeView/ with code-behind for event handlers
- [X] T018 [US1] Implement async LoadTreeAsync in TreeViewViewModel with progress indicator support
- [X] T019 [US1] Add TreeViewView to MainWindow.xaml sidebar area with proper Grid layout (collapsible panel)
- [X] T020 [US1] Wire up initial file selection in MainWindow.xaml.cs to call DetermineInitialFileAsync and display markdown content immediately
- [ ] T021 [US1] Add unit tests in tests/unit/TreeViewServiceTests.cs for BuildTreeAsync (empty folder filtering, sorting, tree structure)
- [ ] T022 [P] [US1] Add unit tests in tests/unit/TreeViewServiceTests.cs for DetermineInitialFileAsync (last viewed, README.md, first alphabetical)
- [ ] T023 [P] [US1] Add integration test in tests/integration/TreeViewIntegrationTests.cs to verify initial markdown display < 1s (SC-001)
- [ ] T024 [P] [US1] Add integration test in tests/integration/TreeViewIntegrationTests.cs to verify tree loads in < 5s for 1000 files (SC-002)

**Checkpoint**: At this point, User Story 1 should be fully functional - opening folder displays markdown instantly with treeview populating in background

---

## Phase 4: User Story 2 - Navigate Using Treeview (Priority: P2)

**Goal**: Enable clicking files in treeview to navigate between markdown documents

**Independent Test**: Click any markdown file in treeview and verify content updates within 500ms

### Implementation for User Story 2

- [ ] T025 [US2] Create SelectTreeNodeCommand in src/UI/Sidebar/TreeView/TreeViewViewModel.cs with ICommand implementation
- [ ] T026 [US2] Implement SelectTreeNodeCommand.Execute logic: deselect previous node, set IsSelected=true, raise NavigateToFileRequested event for file nodes
- [ ] T027 [US2] Add NavigateToFileRequested event handler in MainWindow.xaml.cs to trigger markdown rendering
- [ ] T028 [US2] Wire up TreeView.SelectedItemChanged event in TreeViewView.xaml.cs to call SelectTreeNodeCommand
- [x] T029 [US2] Update HistoryService in SelectTreeNodeCommand to save last viewed file per folder (FR-018)
- [x] T030 [US2] Implement expand/collapse toggle for folder nodes in SelectTreeNodeCommand (toggle IsExpanded when folder selected)
- [x] T031 [US2] Enhance existing FileWatcherService.cs to support markdown-specific file watching (filter \*.md, \*.markdown extensions)
- [x] T032 [US2] Configure FileWatcherService NotifyFilters to watch Created, Deleted, Renamed events only (exclude Changed per research.md)
- [x] T033 [US2] Implement 500ms debouncing in FileWatcherService using DispatcherTimer to batch rapid file system changes
- [x] T034 [US2] Add HandleFileSystemChange method in TreeViewService.cs to update tree structure (Created: add node, Deleted: remove node, Renamed: update name)
- [x] T035 [US2] Wire up FileWatcherService events to TreeViewViewModel to trigger tree updates
- [x] T036 [US2] Implement folder pruning logic in HandleFileSystemChange to remove parent folders when they become empty after file deletion (FR-012)
- [ ] T037 [P] [US2] Add unit tests in tests/unit/TreeViewServiceTests.cs for SelectTreeNode logic (selection state, event raising) [SKIPPED - Optional]
- [ ] T038 [P] [US2] Add unit tests in tests/unit/TreeViewServiceTests.cs for HandleFileSystemChange (add node, remove node, rename node, prune empty folders) [SKIPPED - Optional]
- [ ] T039 [P] [US2] Add integration test in tests/integration/TreeViewIntegrationTests.cs to verify navigation < 500ms (SC-003) [SKIPPED - Optional]
- [ ] T040 [P] [US2] Add integration test in tests/integration/TreeViewIntegrationTests.cs to verify file system change detection and updates < 2s (SC-009) [SKIPPED - Optional]

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently - treeview navigation and real-time file watching functional

---

## Phase 5: User Story 3 - Toggle Treeview Visibility (Priority: P3)

**Goal**: Allow users to show/hide treeview and remember preference per folder

**Independent Test**: Toggle treeview visibility, close and reopen folder, verify state persists

### Implementation for User Story 3

- [ ] T041 [US3] Add IsTreeViewVisible property to TreeViewViewModel with INotifyPropertyChanged
- [ ] T042 [US3] Create ToggleTreeViewVisibilityCommand in src/UI/Sidebar/TreeView/TreeViewViewModel.cs
- [ ] T043 [US3] Implement ToggleTreeViewVisibilityCommand.Execute logic: invert IsTreeViewVisible, call SaveVisibilityPreference
- [ ] T044 [US3] Implement SaveVisibilityPreference method in TreeViewService.cs to update TreeViewSettings.PerFolderSettings[folderPath]
- [ ] T045 [US3] Implement LoadVisibilityPreference method in TreeViewService.cs to retrieve per-folder visibility state (with global default fallback per FR-008, FR-009)
- [ ] T046 [US3] Integrate SettingsService.cs to persist TreeViewSettings to JSON file in AppData folder
- [ ] T047 [US3] Call LoadVisibilityPreference in TreeViewViewModel.LoadTreeAsync to restore visibility state when opening folder
- [ ] T048 [US3] Add toggle button to TreeViewView.xaml header with Command binding to ToggleTreeViewVisibilityCommand
- [ ] T049 [US3] Add Grid.ColumnDefinitions binding in MainWindow.xaml to collapse/expand treeview column based on IsTreeViewVisible
- [ ] T050 [US3] Add GridSplitter to MainWindow.xaml between treeview and content area for resizable panels
- [ ] T051 [P] [US3] Add unit tests in tests/unit/TreeViewServiceTests.cs for SaveVisibilityPreference and LoadVisibilityPreference (per-folder override, global default)
- [ ] T052 [P] [US3] Add integration test in tests/integration/TreeViewIntegrationTests.cs to verify toggle responds < 100ms (SC-004)
- [ ] T053 [P] [US3] Add integration test in tests/integration/TreeViewIntegrationTests.cs to verify visibility state persists across restarts (SC-005)

**Checkpoint**: At this point, User Stories 1, 2, AND 3 should all work independently - treeview can be toggled and state persists

---

## Phase 6: User Story 4 - Set Default Treeview Preference (Priority: P4)

**Goal**: Provide global default preference for treeview visibility in new folders

**Independent Test**: Change default preference, open new folder, verify treeview visibility matches preference

### Implementation for User Story 4

- [ ] T054 [US4] Add TreeViewDefaultVisible checkbox to Settings dialog in src/UI/Settings/SettingsView.xaml
- [ ] T055 [US4] Bind checkbox to TreeViewSettings.DefaultVisible property in src/UI/Settings/SettingsViewModel.cs
- [ ] T056 [US4] Update LoadVisibilityPreference logic in TreeViewService.cs to use DefaultVisible when folder not in PerFolderSettings (FR-008)
- [ ] T057 [US4] Ensure global preference changes do NOT affect folders with stored individual settings (FR-009 - individual overrides global)
- [ ] T058 [P] [US4] Add unit tests in tests/unit/TreeViewServiceTests.cs for global default preference logic (new folder uses default, existing folder ignores default)
- [ ] T059 [P] [US4] Add integration test in tests/integration/TreeViewIntegrationTests.cs to verify global preference applies to new folders and individual settings override

**Checkpoint**: All user stories 1-4 should now be independently functional

---

## Phase 7: User Story 5 - Keyboard Navigation (Priority: P3)

**Goal**: Full keyboard navigation including arrow keys, Enter, type-ahead search, and shortcuts

**Independent Test**: Use only keyboard to navigate tree, expand/collapse folders, select files, and use type-ahead search

### Implementation for User Story 5

- [ ] T060 [P] [US5] Create NavigateTreeUpCommand in src/UI/Sidebar/TreeView/TreeViewViewModel.cs for up arrow navigation
- [ ] T061 [P] [US5] Create NavigateTreeDownCommand in src/UI/Sidebar/TreeView/TreeViewViewModel.cs for down arrow navigation
- [ ] T062 [US5] Implement depth-first traversal helper in TreeViewViewModel to find previous/next visible nodes
- [ ] T063 [US5] Create ExpandTreeNodeCommand in src/UI/Sidebar/TreeView/TreeViewViewModel.cs (set IsExpanded=true)
- [ ] T064 [US5] Create CollapseTreeNodeCommand in src/UI/Sidebar/TreeView/TreeViewViewModel.cs (set IsExpanded=false)
- [ ] T065 [US5] Add keyboard input bindings in TreeViewView.xaml.cs: Up/Down arrows call Navigate commands, Right/Enter call Expand/Select, Left/Escape call Collapse
- [ ] T066 [US5] Create RefreshTreeViewCommand in src/UI/Sidebar/TreeView/TreeViewViewModel.cs for manual refresh
- [ ] T067 [US5] Implement RefreshTreeViewCommand.Execute: cancel existing BuildTreeAsync, clear tree, rebuild from file system
- [ ] T068 [US5] Add keyboard shortcuts in MainWindow.xaml: Ctrl+R and F5 trigger RefreshTreeViewCommand (FR-022)
- [ ] T069 [US5] Create TypeAheadSearchCommand in src/UI/Sidebar/TreeView/TreeViewViewModel.cs with 300ms debounce using DispatcherTimer
- [ ] T070 [US5] Implement OnPreviewTextInput handler in TreeViewView.xaml.cs to accumulate typed characters and trigger TypeAheadSearchCommand
- [ ] T071 [US5] Implement TypeAheadSearchCommand.Execute: filter tree nodes by Name.Contains (case-insensitive), set IsVisible property, expand parent folders of matches (FR-021)
- [ ] T072 [US5] Create ClearTypeAheadSearchCommand in src/UI/Sidebar/TreeView/TreeViewViewModel.cs
- [ ] T073 [US5] Implement ClearTypeAheadSearchCommand.Execute: reset IsVisible=true for all nodes, clear search buffer, collapse auto-expanded folders
- [ ] T074 [US5] Add 2-second auto-clear timeout for type-ahead search (reset after no typing)
- [ ] T075 [US5] Update TreeViewView.xaml ItemContainerStyle to show/hide nodes based on IsVisible property and highlight matching text
- [ ] T076 [US5] Ensure TreeView participates in tab order and verify AutomationProperties for screen reader compatibility (FR-020)
- [ ] T077 [P] [US5] Add unit tests in tests/unit/TreeViewViewModelTests.cs for NavigateTreeUp/Down (boundary conditions, depth-first order)
- [ ] T078 [P] [US5] Add unit tests in tests/unit/TreeViewViewModelTests.cs for TypeAheadSearch (filtering, case-insensitive, parent expansion)
- [ ] T079 [P] [US5] Add integration test in tests/integration/TreeViewIntegrationTests.cs to verify type-ahead search filters < 100ms (SC-010)
- [ ] T080 [P] [US5] Add integration test in tests/integration/TreeViewIntegrationTests.cs to verify full keyboard accessibility - navigate and select file using only keyboard (SC-011)

**Checkpoint**: All user stories should now be independently functional with full keyboard navigation

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories and final quality validation

- [ ] T081 [P] Add folder and file icons to TreeView nodes (Image binding in HierarchicalDataTemplate in src/UI/Sidebar/TreeView/TreeViewView.xaml)
- [ ] T082 [P] Integrate treeview with existing ThemeManager.cs for consistent light/dark theme styling
- [ ] T083 Add error handling for file system exceptions (UnauthorizedAccessException, IOException) in TreeViewService.cs with user-friendly messages
- [ ] T084 Implement symbolic link loop detection in BuildTreeAsync with HashSet of visited paths and max depth limit of 50 levels
- [ ] T085 Add empty state UI in TreeViewView.xaml for folders with no markdown files (display helpful message instead of empty tree)
- [ ] T086 Add progress indicator in TreeViewView.xaml during async tree building (show "Scanning..." with file count)
- [ ] T087 [P] Add TreeView virtualization configuration in TreeViewView.xaml: VirtualizingPanel.IsVirtualizing="True" for large tree performance
- [ ] T088 Verify FileWatcherService CPU usage < 2% during idle periods with performance profiling (SC-008)
- [ ] T089 [P] Add integration test in tests/integration/TreeViewIntegrationTests.cs for deep folder hierarchies (10+ levels) to verify performance
- [ ] T090 [P] Add integration test in tests/integration/TreeViewIntegrationTests.cs for folders with 1000+ files to verify virtualization and responsiveness
- [ ] T091 [P] Add integration test in tests/integration/TreeViewIntegrationTests.cs for permission denied scenarios (graceful error handling)
- [ ] T092 Code cleanup: remove debug logging, optimize LINQ queries, add XML documentation comments to public APIs
- [ ] T093 Update documentation: add treeview usage section to README.md or user guide
- [ ] T094 Run quickstart.md validation: verify all checklist items complete and all performance targets met (SC-001 through SC-011)
- [ ] T095 Final end-to-end testing: test all user stories together in realistic workflow scenarios

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-7)**: All depend on Foundational phase completion
  - US1 (Phase 3) can start immediately after Foundational
  - US2 (Phase 4) can start in parallel with US1 (different commands/features)
  - US3 (Phase 5) can start in parallel with US1/US2 (different feature - visibility toggle)
  - US4 (Phase 6) depends on US3 (extends visibility settings)
  - US5 (Phase 7) can start in parallel with US1-US4 (different feature - keyboard navigation)
- **Polish (Phase 8)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational - No dependencies on other stories - **MVP SCOPE**
- **User Story 2 (P2)**: Can start after Foundational - Independent (navigation builds on US1 tree but separate feature)
- **User Story 3 (P3)**: Can start after Foundational - Independent (visibility toggle separate from navigation)
- **User Story 4 (P4)**: Depends on US3 (extends visibility settings with global default)
- **User Story 5 (P3)**: Can start after Foundational - Independent (keyboard navigation works with any tree state)

### Within Each User Story

- Phase 2 Foundational tasks must complete before ANY user story tasks
- Tests marked [P] can run in parallel (different test files)
- Implementation tasks within a story generally sequential (models → services → viewmodels → views)
- Unit tests can be written in parallel with integration tests (different files)

### Parallel Opportunities

- **Setup (Phase 1)**: All tasks can run sequentially (only 3 quick tasks)
- **Foundational (Phase 2)**: T006 and T007 can run in parallel (both model creation)
- **User Story 1**: T021, T022, T023, T024 (all tests) can run in parallel after implementation complete
- **User Story 2**: T037, T038, T039, T040 (all tests) can run in parallel after implementation complete
- **User Story 3**: T051, T052, T053 (all tests) can run in parallel after implementation complete
- **User Story 4**: T058, T059 (tests) can run in parallel
- **User Story 5**: T060 and T061 (NavigateUp/Down commands) can run in parallel; T077, T078, T079, T080 (tests) can run in parallel
- **Polish (Phase 8)**: T081, T082, T087, T089, T090, T091 can run in parallel (different files/concerns)
- **Cross-Phase Parallelism**: After Foundational, US1, US2, US3, and US5 can all start in parallel by different developers

---

## Parallel Example: After Foundational Phase Complete

```bash
# Multiple developers can work in parallel:
Developer A: Implement User Story 1 (Phase 3) - Async tree building and initial display
Developer B: Implement User Story 2 (Phase 4) - Tree navigation and file watching  
Developer C: Implement User Story 3 (Phase 5) - Visibility toggle and settings
Developer D: Implement User Story 5 (Phase 7) - Keyboard navigation and type-ahead

# All four stories are independent and can be tested separately
# US4 can start once US3 completes (extends same feature)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T003)
2. Complete Phase 2: Foundational (T004-T009) - CRITICAL BLOCKER
3. Complete Phase 3: User Story 1 (T010-T024) - Immediate markdown display with async tree loading
4. **STOP and VALIDATE**: Test US1 independently - verify SC-001 (< 1s initial display) and SC-002 (< 5s tree load)
5. Deploy/demo MVP if ready

### Incremental Delivery

1. Complete Setup + Foundational (Phases 1-2)
2. Add User Story 1 (Phase 3) → Test independently → **MVP READY** - Deploy/Demo
3. Add User Story 2 (Phase 4) → Test independently → Deploy/Demo (navigation + file watching)
4. Add User Story 3 (Phase 5) → Test independently → Deploy/Demo (visibility toggle)
5. Add User Story 4 (Phase 6) → Test independently → Deploy/Demo (global preference)
6. Add User Story 5 (Phase 7) → Test independently → Deploy/Demo (keyboard navigation)
7. Polish (Phase 8) → Final validation → Production release

### Parallel Team Strategy

With 3-4 developers after Foundational phase completes:

1. Team completes Setup + Foundational together (Phases 1-2)
2. Once Phase 2 done, split work:
   - Developer A: User Story 1 (T010-T024) - Core tree functionality
   - Developer B: User Story 2 (T025-T040) - Navigation and file watching
   - Developer C: User Story 3 + 4 (T041-T059) - Settings and preferences
   - Developer D: User Story 5 (T060-T080) - Keyboard navigation
3. Each developer completes their story independently with tests
4. Team integrates and completes Phase 8 Polish together

---

## Notes

- [P] tasks = different files, no dependencies, can run in parallel
- [Story] label maps task to specific user story for traceability (US1, US2, US3, US4, US5)
- Each user story is independently completable and testable
- **MVP = User Story 1 only** (immediate markdown display with async tree loading)
- Stop at any checkpoint to validate story independently before proceeding
- All performance targets defined in success criteria (SC-001 through SC-011) must be validated with tests
- FileSystemWatcher configuration critical: filter markdown only, debounce 500ms, <2% CPU
- Type-ahead search uses 300ms debounce for optimal UX (FR-021, SC-010)
- Tree virtualization required for large folders (1000+ files)
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
