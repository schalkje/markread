# Tasks: Mockup UI Implementation

**Input**: Design documents from `/specs/003-mockup-ui/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Integration and unit tests are included to validate UI behavior and theme functionality.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

Based on WPF desktop application structure from plan.md:
- **Main source**: `src/` at repository root
- **Tests**: `tests/` with unit/ and integration/ subdirectories
- **Assets**: `src/Rendering/assets/` for CSS, JavaScript, and icons

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project structure and theme system foundation

- [x] T001 Create theme resource directories in src/Rendering/assets/styles/ and src/Rendering/assets/scripts/
- [x] T002 [P] Create theme enum and basic data models in src/Services/ThemeConfiguration.cs
- [x] T003 [P] Create UI state data models in src/Services/UIState.cs
- [x] T004 [P] Create animation settings model in src/Services/AnimationSettings.cs
- [x] T005 Setup JSON settings persistence infrastructure in src/Services/SettingsService.cs

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core theme and UI state management that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T006 Implement IThemeService interface and base ThemeManager class in src/App/ThemeManager.cs
- [x] T007 [P] Implement IUIStateService interface in src/Services/UIStateService.cs  
- [x] T008 [P] Implement IAnimationService interface in src/Services/AnimationService.cs
- [x] T009 Create base CSS custom properties system in src/Rendering/assets/styles/theme-variables.css
- [x] T010 Implement JavaScript theme bridge for WebView2 in src/Rendering/assets/scripts/theme-bridge.js
- [x] T011 Create WPF ResourceDictionary theme templates in src/App/Themes/LightTheme.xaml and DarkTheme.xaml
- [x] T012 Update main App.xaml with theme resource dictionary integration
- [x] T013 Add theme change event handling infrastructure in src/App/ThemeManager.cs

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Modern Visual Interface (Priority: P1) 🎯 MVP

**Goal**: Implement the core visual design that matches the Figma mockup with proper layout, spacing, colors, and typography

**Independent Test**: Launch application and compare visual elements against mockup reference for layout accuracy and professional appearance

### Tests for User Story 1

- [x] T014 [P] [US1] Create visual mockup comparison test in tests/integration/VisualDesignTests.cs
- [x] T015 [P] [US1] Create responsive layout test in tests/integration/ResponsiveLayoutTests.cs

### Implementation for User Story 1

- [x] T016 [P] [US1] Create light theme color scheme definition in src/App/Themes/LightTheme.xaml
- [x] T017 [P] [US1] Create dark theme color scheme definition in src/App/Themes/DarkTheme.xaml
- [x] T018 [P] [US1] Implement base CSS styling for markdown content in src/Rendering/assets/styles/markdown-base.css
- [x] T019 [US1] Update MainWindow.xaml with enhanced layout structure and mockup-accurate spacing
- [x] T020 [US1] Apply typography and color styling to all WPF controls in MainWindow.xaml.cs
- [x] T021 [US1] Implement WebView2 content styling integration in src/Rendering/WebViewHost.cs
- [x] T022 [US1] Add window chrome and border styling to match mockup design
- [x] T023 [US1] Implement responsive design basics with CSS media queries in src/Rendering/assets/styles/responsive.css

**Checkpoint**: At this point, the application should visually match the mockup design and be independently testable

---

## Phase 4: User Story 2 - Light/Dark Theme System (Priority: P1)

**Goal**: Enable seamless theme switching with instant visual updates and persistent user preferences

**Independent Test**: Toggle theme button and verify all interface elements switch between light/dark schemes instantly with persistence across restarts

### Tests for User Story 2

- [ ] T024 [P] [US2] Create theme switching integration test in tests/integration/ThemeIntegrationTests.cs
- [ ] T025 [P] [US2] Create theme persistence unit test in tests/unit/ThemeManagerTests.cs
- [ ] T026 [P] [US2] Create settings service unit test in tests/unit/SettingsServiceTests.cs

### Implementation for User Story 2

- [x] T027 [P] [US2] Implement theme detection and system theme support in src/App/ThemeManager.cs
- [x] T028 [P] [US2] Create theme toggle button component in src/UI/Shell/ThemeToggleButton.xaml
- [x] T029 [US2] Integrate theme switching logic with WPF ResourceDictionary system in src/App/ThemeManager.cs
- [x] T030 [US2] Implement CSS custom property injection for WebView2 theme switching in src/Rendering/WebViewHost.cs
- [x] T031 [US2] Add theme preference persistence to local settings file in src/Services/SettingsService.cs
- [x] T032 [US2] Implement automatic theme restoration on application startup in src/App/App.xaml.cs
- [x] T033 [US2] Add theme change event handling throughout UI components
- [x] T034 [US2] Implement theme switching performance optimization (<100ms target)

**Checkpoint**: At this point, theme switching should work instantly across all UI elements with proper persistence

---

## Phase 5: User Story 3 - Enhanced Navigation Experience (Priority: P2)

**Goal**: Implement unified header with navigation controls, file path display, search, and export functions

**Independent Test**: Use navigation controls, search buttons, and export options to verify proper positioning and functionality in enhanced header

### Tests for User Story 3

- [x] T035 [P] [US3] Create navigation functionality test in tests/integration/NavigationTests.cs
- [x] T036 [P] [US3] Create header layout integration test in tests/integration/HeaderLayoutTests.cs

### Implementation for User Story 3

- [x] T037 [P] [US3] Implement INavigationService interface in src/Services/NavigationService.cs
- [x] T038 [P] [US3] Create unified header layout in src/UI/Shell/NavigationBar.xaml
- [x] T039 [P] [US3] Implement back/forward navigation buttons in src/UI/Shell/NavigationCommands.cs
- [x] T040 [US3] Add current file path display component in src/UI/Shell/FilePathDisplay.xaml
- [x] T041 [US3] Integrate search button with existing search functionality in src/UI/Shell/NavigationBar.xaml.cs
- [x] T042 [US3] Implement export dropdown menu in src/UI/Shell/ExportDropdown.xaml
- [x] T043 [US3] Add window control buttons (minimize, maximize, close) in src/UI/Shell/WindowControls.xaml
- [x] T044 [US3] Apply navigation bar styling to match mockup design
- [x] T045 [US3] Implement navigation state management and button state updates

**Checkpoint**: At this point, the enhanced header should provide full navigation functionality with mockup-accurate styling

---

## Phase 6: User Story 4 - Professional Tab Interface (Priority: P2)

**Goal**: Enhance tab system with scrollable container, hover effects, close buttons, and active indicators

**Independent Test**: Open multiple files and verify tab scrolling, closing, and selection behaviors match mockup design

### Tests for User Story 4

- [ ] T046 [P] [US4] Create tab management integration test in tests/integration/TabsAndSearchTests.cs
- [ ] T047 [P] [US4] Create tab scrolling behavior test in tests/integration/TabScrollingTests.cs

### Implementation for User Story 4

- [ ] T048 [P] [US4] Implement ITabService interface in src/Services/TabService.cs
- [ ] T049 [P] [US4] Create enhanced TabItem control in src/UI/Tabs/TabItem.cs
- [ ] T050 [P] [US4] Implement scrollable tab container in src/UI/Tabs/TabsView.xaml
- [ ] T051 [US4] Add hover-based close button animations in src/UI/Tabs/TabContentControl.xaml
- [ ] T052 [US4] Implement active tab visual indicators and transitions
- [ ] T053 [US4] Add tab scrolling controls and smooth scroll animations
- [ ] T054 [US4] Integrate tab service with existing file management system
- [ ] T055 [US4] Apply professional tab styling to match mockup design
- [ ] T056 [US4] Implement tab performance optimization for 20+ open files

**Checkpoint**: At this point, tab management should provide professional UX with smooth scrolling and animations

---

## Phase 7: User Story 5 - Enhanced File Tree Sidebar (Priority: P3)

**Goal**: Improve sidebar with better visual hierarchy, icons, collapsible folders, and responsive behavior

**Independent Test**: Use sidebar to browse folders and select files, verifying visual improvements and responsive collapse at 768px

### Tests for User Story 5

- [ ] T057 [P] [US5] Create sidebar functionality test in tests/integration/SidebarTests.cs
- [ ] T058 [P] [US5] Create responsive sidebar test in tests/integration/ResponsiveLayoutTests.cs

### Implementation for User Story 5

- [ ] T059 [P] [US5] Implement ISidebarService interface in src/Services/SidebarService.cs
- [ ] T060 [P] [US5] Create enhanced file tree icons in src/Rendering/assets/icons/
- [ ] T061 [P] [US5] Implement improved file tree styling in src/UI/Sidebar/SidebarView.xaml
- [ ] T062 [US5] Add folder/file icon system with visual hierarchy
- [ ] T063 [US5] Implement smooth sidebar collapse/expand animations
- [ ] T064 [US5] Add responsive sidebar auto-collapse at 768px breakpoint
- [ ] T065 [US5] Implement file selection highlighting and navigation
- [ ] T066 [US5] Add sidebar width persistence and resize handling
- [ ] T067 [US5] Apply enhanced sidebar styling to match mockup design

**Checkpoint**: At this point, the sidebar should provide enhanced file navigation with responsive behavior

---

## Phase 8: User Story 6 - Search Interface Improvements (Priority: P3)

**Goal**: Update search interfaces with enhanced visual design for both in-page and global search features

**Independent Test**: Open search interfaces and verify they match mockup design with proper styling and layout

### Tests for User Story 6

- [ ] T068 [P] [US6] Create search interface integration test in tests/integration/SearchInterfaceTests.cs
- [ ] T069 [P] [US6] Create search styling validation test in tests/integration/SearchStylingTests.cs

### Implementation for User Story 6

- [ ] T070 [P] [US6] Implement ISearchService interface in src/Services/SearchService.cs
- [ ] T071 [P] [US6] Update in-page search bar styling in src/UI/Find/FindBar.xaml
- [ ] T072 [P] [US6] Enhance global search panel design in src/UI/Search/GlobalSearchPanel.xaml
- [ ] T073 [US6] Apply search interface styling to match mockup design
- [ ] T074 [US6] Implement search animation and transition effects
- [ ] T075 [US6] Add search result highlighting and navigation enhancements
- [ ] T076 [US6] Integrate enhanced search with theme system
- [ ] T077 [US6] Implement search performance optimization and visual feedback

**Checkpoint**: At this point, all search interfaces should have professional styling matching the mockup

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Final improvements and validation that affect multiple user stories

- [ ] T078 [P] Add comprehensive animation performance monitoring across all components
- [ ] T079 [P] Implement error handling and fallback themes in src/App/ThemeManager.cs
- [ ] T080 [P] Create settings backup and restoration system in src/Services/SettingsService.cs
- [ ] T081 [P] Add accessibility validation for color contrast ratios
- [ ] T082 [P] Implement memory usage optimization for styling assets
- [ ] T083 [P] Add application startup performance validation
- [ ] T084 Run quickstart.md validation checklist against implemented features
- [ ] T085 Final mockup comparison validation and any remaining visual adjustments
- [ ] T086 Code cleanup and documentation updates

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-8)**: All depend on Foundational phase completion
  - User stories can proceed in parallel (if staffed) since they focus on different UI areas
  - Or sequentially in priority order (P1 → P1 → P2 → P2 → P3 → P3)
- **Polish (Phase 9)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1) - Visual Interface**: Can start after Foundational - Foundation for all other stories
- **User Story 2 (P1) - Theme System**: Can start after Foundational - Independent from US1 but enhances it
- **User Story 3 (P2) - Navigation**: Can start after Foundational - Independent but integrates with theme system
- **User Story 4 (P2) - Tabs**: Can start after Foundational - Independent but benefits from theme system
- **User Story 5 (P3) - Sidebar**: Can start after Foundational - Independent but integrates with responsive design
- **User Story 6 (P3) - Search**: Can start after Foundational - Independent but benefits from theme system

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Models/interfaces before services
- Services before UI components
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational tasks marked [P] can run in parallel (within Phase 2)
- Once Foundational phase completes, multiple user stories can start in parallel
- Tests within each story marked [P] can run in parallel
- Models and interfaces within a story marked [P] can run in parallel
- Different user stories can be worked on in parallel by different team members

---

## Parallel Example: User Story 1

```bash
# Launch all tests for User Story 1 together:
Task: "Create visual mockup comparison test in tests/integration/VisualDesignTests.cs"
Task: "Create responsive layout test in tests/integration/ResponsiveLayoutTests.cs"

# Launch theme definitions in parallel:
Task: "Create light theme color scheme definition in src/App/Themes/LightTheme.xaml"
Task: "Create dark theme color scheme definition in src/App/Themes/DarkTheme.xaml"
Task: "Implement base CSS styling for markdown content in src/Rendering/assets/styles/markdown-base.css"
```

---

## Implementation Strategy

### MVP First (User Stories 1 & 2 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 (Visual Interface)
4. Complete Phase 4: User Story 2 (Theme System)
5. **STOP and VALIDATE**: Test visual design and theme switching independently
6. Deploy/demo if ready - this provides immediate visual transformation

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Basic visual improvement
3. Add User Story 2 → Test independently → Full theme system (MVP!)
4. Add User Story 3 → Test independently → Enhanced navigation
5. Add User Story 4 → Test independently → Professional tabs
6. Add User Story 5 → Test independently → Enhanced sidebar
7. Add User Story 6 → Test independently → Complete UI overhaul
8. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (Visual Interface) + User Story 2 (Theme System)
   - Developer B: User Story 3 (Navigation) + User Story 4 (Tabs)
   - Developer C: User Story 5 (Sidebar) + User Story 6 (Search)
3. Stories complete and integrate independently

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Focus on mockup visual accuracy throughout implementation
- Maintain <100ms theme switching performance target
- Ensure 60fps animation performance across all interactions