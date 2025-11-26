# Tasks: Zoom and Pan Controls

**Input**: Design documents from `/specs/004-zoom-pan/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/webview-api.md, quickstart.md

**Tests**: Tests are NOT explicitly requested in the specification, so test tasks are OPTIONAL and minimal.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

Single WPF desktop application:
- Source code: `src/`
- Tests: `tests/unit/`, `tests/integration/`
- Assets: `src/Rendering/assets/`, `src/Rendering/template/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure for zoom/pan feature

- [X] T001 Review existing project structure in src/ to understand WebView2 integration
- [X] T002 Review existing TabItem class in src/UI/Tabs/TabItem.cs to understand tab state management
- [X] T003 Review existing SettingsService in src/Services/SettingsService.cs to understand settings pattern
- [X] T004 [P] Review WebView2 message passing patterns in src/Rendering/WebViewHost.cs

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T005 Add ZoomPercent property (double, default 100.0) to TabItem class in src/UI/Tabs/TabItem.cs with INotifyPropertyChanged
- [X] T006 [P] Add PanOffsetX property (double, default 0.0) to TabItem class in src/UI/Tabs/TabItem.cs with INotifyPropertyChanged
- [X] T007 [P] Add PanOffsetY property (double, default 0.0) to TabItem class in src/UI/Tabs/TabItem.cs with INotifyPropertyChanged
- [X] T008 Add property validation in TabItem to clamp ZoomPercent to [10.0, 1000.0] range
- [X] T009 Add ResetZoomPan() method to TabItem class to reset zoom to 100% and pan to (0, 0)
- [X] T010 Add DefaultZoomPercent property (double, default 100.0) to AppSettings in src/Services/SettingsService.cs
- [X] T011 Add validation in AppSettings.Validate() to clamp DefaultZoomPercent to [10.0, 1000.0] range
- [X] T012 Create zoom-pan.js file in src/Rendering/assets/zoom-pan.js with ZoomPanController class skeleton
- [X] T013 Implement message listener in zoom-pan.js to receive commands from WPF via window.chrome.webview
- [X] T014 Implement applyTransform() method in zoom-pan.js to apply CSS matrix transform to content element
- [X] T015 Implement sendStateUpdate() method in zoom-pan.js to send zoom/pan state back to WPF
- [X] T016 Include zoom-pan.js script in HTML template at src/Rendering/template/template.html
- [X] T017 Ensure content container has id="content" in HTML template for JavaScript to target

**Checkpoint**: Foundation ready - TabItem has zoom/pan properties, JavaScript controller exists, message passing infrastructure ready

---

## Phase 3: User Story 1 - Mouse Scroll Zoom (Priority: P1) 🎯 MVP

**Goal**: Users can zoom in/out using CTRL + mouse wheel with cursor-centered zoom

**Independent Test**: Open a markdown document, hold CTRL and scroll mouse wheel. Document should zoom in/out smoothly with content under cursor staying fixed. Test min/max boundaries (10%, 1000%).

### Implementation for User Story 1

- [X] T018 [US1] Add PreviewMouseWheel event handler to WebViewHost or MainWindow in src/Rendering/WebViewHost.cs
- [X] T019 [US1] Detect CTRL key modifier in PreviewMouseWheel handler using Keyboard.Modifiers
- [X] T020 [US1] Calculate zoom delta (+10 for scroll up, -10 for scroll down) in mouse wheel handler
- [X] T021 [US1] Get mouse cursor position relative to WebView using e.GetPosition(webView)
- [X] T022 [US1] Create zoom command JSON with action="zoom", delta, cursorX, cursorY in mouse wheel handler
- [X] T023 [US1] Send zoom command to JavaScript using webView.CoreWebView2.PostWebMessageAsJson()
- [X] T024 [US1] Set e.Handled = true to prevent default scroll behavior when CTRL is pressed
- [X] T025 [US1] Implement zoom() method in zoom-pan.js to handle zoom commands
- [X] T026 [US1] Calculate new zoom level in zoom() by adding delta to current zoom percentage
- [X] T027 [US1] Clamp new zoom level to [10, 1000] range in zoom()
- [X] T028 [US1] Implement cursor-centered zoom math in zoom() to adjust pan offset keeping cursor fixed
- [X] T029 [US1] Call applyTransform() to apply zoom via CSS matrix in zoom()
- [X] T030 [US1] Call sendStateUpdate() to notify WPF of new zoom level in zoom()
- [X] T031 [US1] Add WebMessageReceived event handler in WebViewHost to receive zoom state responses
- [X] T032 [US1] Parse ZoomPanResponse JSON in WebMessageReceived handler
- [X] T033 [US1] Update active TabItem properties (ZoomPercent, PanOffsetX, PanOffsetY) from response
- [X] T034 [US1] Add null check for CoreWebView2 before sending messages in mouse wheel handler

**Checkpoint**: CTRL + mouse wheel zoom works independently. Can zoom from 10% to 1000%. Cursor position stays fixed during zoom.

---

## Phase 4: User Story 2 - Keyboard Zoom Controls (Priority: P1)

**Goal**: Users can zoom using CTRL+/-, with Edit menu displaying these options

**Independent Test**: Open document, press CTRL++ to zoom in, CTRL+- to zoom out. Open Edit menu and verify "Zoom In" and "Zoom Out" options are visible with shortcuts. Click menu items to zoom.

### Implementation for User Story 2

- [X] T035 [P] [US2] Add PreviewKeyDown event handler to WebViewHost or MainWindow in src/Rendering/WebViewHost.cs (Implemented in JavaScript via document.addEventListener)
- [X] T036 [US2] Detect CTRL+OemPlus, CTRL+Add keys in PreviewKeyDown for zoom in (Implemented in zoom-pan.js handleKeyboardEvent)
- [X] T037 [US2] Detect CTRL+OemMinus, CTRL+Subtract keys in PreviewKeyDown for zoom out (Implemented in zoom-pan.js handleKeyboardEvent)
- [X] T038 [US2] Calculate viewport center position (ActualWidth/2, ActualHeight/2) for keyboard zoom (Implemented in zoom-pan.js)
- [X] T039 [US2] Create zoom command JSON with delta=+10 or -10 and viewport center coordinates (Handled internally in JavaScript)
- [X] T040 [US2] Send keyboard zoom command to JavaScript using PostWebMessageAsJson (Direct JavaScript implementation)
- [X] T041 [US2] Set e.Handled = true when CTRL+/- keys detected (Implemented via event.preventDefault() in JavaScript)
- [X] T042 [P] [US2] Add "Zoom In" MenuItem to Edit menu in src/UI/Shell/NavigationBar.xaml with InputGestureText="Ctrl++"
- [X] T043 [P] [US2] Add "Zoom Out" MenuItem to Edit menu in src/UI/Shell/NavigationBar.xaml with InputGestureText="Ctrl+-"
- [X] T044 [US2] Add Separator before zoom menu items in Edit menu
- [X] T045 [US2] Create ZoomIn_Click event handler in src/MainWindow.xaml.cs to send zoom command with delta=+10
- [X] T046 [US2] Create ZoomOut_Click event handler in src/MainWindow.xaml.cs to send zoom command with delta=-10
- [X] T047 [US2] Wire up Click handlers to menu items in MainWindow.xaml

**Checkpoint**: CTRL+/- keyboard shortcuts zoom correctly. Edit menu shows zoom options with shortcuts. Menu items work.

---

## Phase 5: User Story 3 - Reset Zoom (Priority: P2)

**Goal**: Users can reset zoom to 100% using CTRL+0 or Edit menu

**Independent Test**: Zoom to any level (e.g., 150%), press CTRL+0 or use Edit menu "Reset Zoom". Document should return to 100% zoom centered on viewport.

### Implementation for User Story 3

- [X] T048 [US3] Detect CTRL+D0, CTRL+NumPad0 keys in PreviewKeyDown handler (Implemented in zoom-pan.js handleKeyboardEvent)
- [X] T049 [US3] Create reset command JSON with action="reset" when CTRL+0 detected (Handled internally in JavaScript)
- [X] T050 [US3] Send reset command to JavaScript using PostWebMessageAsJson (Direct JavaScript implementation)
- [X] T051 [US3] Set e.Handled = true when CTRL+0 detected (Implemented via event.preventDefault() in JavaScript)
- [X] T052 [P] [US3] Add "Reset Zoom" MenuItem to Edit menu in src/UI/Shell/NavigationBar.xaml with InputGestureText="Ctrl+0"
- [X] T053 [US3] Create ResetZoom_Click event handler in src/MainWindow.xaml.cs to send reset command
- [X] T054 [US3] Wire up ResetZoom_Click handler to menu item in MainWindow.xaml
- [X] T055 [US3] Implement reset() method in zoom-pan.js to handle reset commands
- [X] T056 [US3] Set zoomPercent to 100.0 in reset()
- [X] T057 [US3] Set panX and panY to 0.0 in reset()
- [X] T058 [US3] Call applyTransform() in reset()
- [X] T059 [US3] Call sendStateUpdate() in reset()

**Checkpoint**: CTRL+0 resets zoom to 100%. Edit menu "Reset Zoom" works. Pan position resets to (0, 0).

---

## Phase 5.5: Additional Navigation Features (Implemented)

**Goal**: Enhanced navigation controls beyond original spec for better user experience

**Implemented Features:**

- [X] T059a [Extra] Implement arrow key navigation (Up/Down/Left/Right) for 40px pan steps in zoom-pan.js
- [X] T059b [Extra] Implement PageUp/PageDown navigation for ~80% viewport height pan in zoom-pan.js
- [X] T059c [Extra] Implement Home key to jump to top of document in zoom-pan.js
- [X] T059d [Extra] Implement End key to jump to bottom of document in zoom-pan.js
- [X] T059e [Extra] Implement Shift+Scroll for horizontal panning in zoom-pan.js handleWheelEvent
- [X] T059f [Extra] Implement normal scroll wheel for vertical panning (replacing native scrolling)
- [X] T059g [Extra] Create position indicator UI (vertical scrollbar replacement) in position-indicator.css
- [X] T059h [Extra] Create horizontal position indicator in position-indicator.css
- [X] T059i [Extra] Create zoom level indicator overlay (bottom-right) in position-indicator.css
- [X] T059j [Extra] Implement updatePositionIndicator() in zoom-pan.js to show scroll position
- [X] T059k [Extra] Implement updateZoomIndicator() in zoom-pan.js to show current zoom %
- [X] T059l [Extra] Add auto-hide behavior to indicators (fade after 1.5 seconds)
- [X] T059m [Extra] Disable native scrollbars via overflow:hidden in base.css
- [X] T059n [Extra] Add 10vh bottom spacing via ::after pseudo-element for better end-of-document visibility
- [X] T059o [Extra] Cache original content dimensions for accurate pan boundary calculation

**Checkpoint**: Full navigation suite working - arrow keys, PageUp/Down, Home/End, Shift+Scroll horizontal pan, position indicators showing location and zoom level.

---

## Phase 6: User Story 4 - Per-Tab Zoom Persistence (Priority: P2) ✅ COMPLETE

**Goal**: Each tab maintains its own zoom level during session, restored on tab switch

**Independent Test**: Open 3 tabs, set each to different zoom (Tab A=150%, Tab B=75%, Tab C=200%). Switch between tabs. Each should display at its saved zoom level.

### Implementation for User Story 4

- [X] T060 [US4] Find or create tab selection changed event handler in TabsView or TabService
- [X] T061 [US4] Get newly activated TabItem when tab selection changes
- [X] T062 [US4] Read ZoomPercent, PanOffsetX, PanOffsetY from activated TabItem
- [X] T063 [US4] Create restore command JSON with action="restore", zoom, panX, panY
- [X] T064 [US4] Send restore command to JavaScript using PostWebMessageAsJson when tab activates
- [X] T065 [US4] Implement restore() method in zoom-pan.js to handle restore commands (already existed)
- [X] T066 [US4] Set zoomPercent, panX, panY to values from restore command (already existed)
- [X] T067 [US4] Call applyTransform() in restore() to apply saved state (already existed)
- [X] T068 [US4] Initialize new TabItem with DefaultZoomPercent from settings when creating tabs
- [X] T069 [US4] Ensure TabItem zoom/pan state is NOT persisted to disk (session-only, verify in TabService)

**Implementation Notes**:
- Added restore command sending in `LoadDocumentInTabAsync` after `WaitForReadyAsync()` (T060-T064)
- Updated all `new TabItemModel()` calls in MainWindow.xaml.cs to initialize with `_currentSettings.DefaultZoomPercent` (T068)
- Verified TabItem is plain C# class with no serialization - zoom/pan state is session-only by design (T069)
- restore() method in zoom-pan.js was already implemented in Phase 2, so T065-T067 were already complete
- Added 150ms delay after WaitForReadyAsync() to ensure JavaScript fully initializes before sending restore command
- Pan offsets serve as scroll position - no separate scroll tracking needed since we replaced native scrolling

**Checkpoint**: Switching between tabs restores each tab's zoom level and pan position (including vertical scroll). New tabs use default zoom from settings. Zoom/pan state is session-only and works across different documents.

---

## Phase 7: User Story 5 - Configurable Default Zoom (Priority: P3)

**Goal**: Users can set default zoom level in settings that applies to new tabs

**Independent Test**: Open Settings, change default zoom to 125%, save. Open new tab. It should display at 125%. Existing tabs should keep their zoom levels.

### Implementation for User Story 5

- [X] T070 [P] [US5] Locate or create Settings UI file (likely in src/UI/Settings/)
- [X] T071 [US5] Add "Zoom Settings" GroupBox to Settings UI XAML
- [X] T072 [US5] Add Slider control for DefaultZoomPercent with Minimum=10, Maximum=200 in Settings UI
- [X] T073 [US5] Add TextBlock to display current slider value as percentage (e.g., "125%")
- [X] T074 [US5] Bind Slider.Value to DefaultZoomPercent from settings (via DataContext or ViewModel)
- [X] T075 [US5] Add descriptive text "Applies to newly opened tabs" below slider
- [X] T076 [US5] Ensure settings are saved when user closes Settings dialog
- [X] T077 [US5] Verify TabItem initialization uses DefaultZoomPercent when creating new tabs (completed in T068)
- [X] T078 [US5] Verify existing tabs maintain their zoom level when DefaultZoomPercent changes

**Implementation Notes**:
- Created ViewerSettingsView.xaml with Slider control (Minimum=10, Maximum=200) and live percentage display (T070-T075)
- Added Viewer tab to SettingsWindow.xaml before Folder Exclusions tab (T071, T076)
- ViewerSettingsView.xaml.cs implements Initialize(), GetSettings(), and ZoomSlider_ValueChanged event (T074)
- SettingsWindow loads/saves ViewerSettings alongside FolderExclusionSettings (T076)
- MainWindow reloads _currentSettings after SettingsSaved event to pick up changes (T078)
- New TabItems initialized with _currentSettings.DefaultZoomPercent in all TabService.CreateTab calls (T077)

**Checkpoint**: Settings UI shows default zoom slider. Changing default zoom affects only new tabs. Existing tabs unaffected. ✅ COMPLETE

---

## Phase 8: User Story 6 - Pan Document with Mouse Drag (Priority: P2)

**Goal**: Users can pan zoomed documents by clicking and dragging middle mouse button

**Independent Test**: Zoom document to 200%, click and hold middle mouse button, drag. Viewport should pan in direction of drag. Test pan boundaries - should not pan beyond document edges. At 100% zoom, panning should be disabled.

### Implementation for User Story 6

- [X] T079 [US6] Add PreviewMouseDown event handler to WebViewHost or MainWindow
- [X] T080 [US6] Detect middle button press (e.MiddleButton == MouseButtonState.Pressed) in PreviewMouseDown
- [X] T081 [US6] Store initial mouse position in _panStartPoint field when middle button pressed
- [X] T082 [US6] Set _isPanning flag to true and capture mouse with webView.CaptureMouse()
- [X] T083 [US6] Set e.Handled = true when middle button pressed to prevent default behavior
- [X] T084 [US6] Add PreviewMouseMove event handler to track mouse movement
- [X] T085 [US6] Check _isPanning flag in PreviewMouseMove
- [X] T086 [US6] Calculate deltaX and deltaY from current position minus _panStartPoint
- [X] T087 [US6] Update _panStartPoint to current position for continuous dragging
- [X] T088 [US6] Create pan command JSON with action="pan", deltaX, deltaY
- [X] T089 [US6] Send pan command to JavaScript using PostWebMessageAsJson
- [X] T090 [US6] Add PreviewMouseUp event handler to detect middle button release
- [X] T091 [US6] Clear _isPanning flag and release mouse capture on middle button release
- [X] T092 [US6] Implement pan() method in zoom-pan.js to handle pan commands
- [X] T093 [US6] Add deltaX to panX and deltaY to panY in pan()
- [X] T094 [US6] Implement clampPanBoundaries() method in zoom-pan.js
- [X] T095 [US6] Calculate scaled content size and viewport size in clampPanBoundaries()
- [X] T096 [US6] Calculate maxPanX and maxPanY based on content overflow
- [X] T097 [US6] Clamp panX to [0, maxPanX] and panY to [0, maxPanY] in clampPanBoundaries()
- [X] T098 [US6] Call clampPanBoundaries() in pan() before applying transform
- [X] T099 [US6] Call applyTransform() in pan()
- [X] T100 [US6] Call sendStateUpdate() in pan()

**Implementation Notes**:
- Initially attempted WPF-side mouse handling with Window.PreviewMouseDown/Move/Up (T079-T091)
- WebView2 browser process intercepts mouse events before WPF receives them
- Final solution: JavaScript-side mouse handling in zoom-pan.js (T079-T091 completed via JavaScript)
- Added mousedown/mousemove/mouseup event listeners in zoom-pan.js initialize()
- handleMouseDown() detects middle button (event.button === 1), sets isPanning flag, changes cursor to "grabbing"
- handleMouseMove() calculates delta from start position and calls pan() continuously while dragging
- handleMouseUp() releases panning state and restores cursor
- pan(), clampPanBoundaries(), applyTransform(), sendStateUpdate() already existed from Phase 2/5.5 (T092-T100)
- WPF-side handlers with AddHandler(..., handledEventsToo: true) handle panning when drag starts outside WebView

**Checkpoint**: Middle mouse drag pans zoomed documents. Panning stops at boundaries. Works on WebView and sidebar. ✅ COMPLETE

---

## Phase 9: User Story 7 - Per-Tab Pan Position Persistence (Priority: P3)

**Goal**: Each tab remembers its pan position when zoomed, restored on tab switch

**Independent Test**: Open 2 tabs, zoom and pan each to different positions (Tab A: zoomed, panned right; Tab B: zoomed, panned down). Switch between tabs. Each should restore to its panned position.

### Implementation for User Story 7

- [ ] T101 [US7] Verify TabItem properties PanOffsetX and PanOffsetY are updated from JavaScript responses (completed in T033)
- [ ] T102 [US7] Verify restore command includes panX and panY values (completed in T063-T067)
- [ ] T103 [US7] Test tab switching with panned positions to ensure pan state restores correctly
- [ ] T104 [US7] Verify pan position resets to (0, 0) when tab is closed and reopened (session-only)
- [ ] T105 [US7] Add logic to reset pan to (0, 0) when zoom returns to 100% in zoom() method

**Checkpoint**: Pan positions persist per-tab during session. Switching tabs restores pan position. Pan resets when tab closed/reopened.

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories and edge cases

- [ ] T106 [P] Add debouncing to mouse wheel zoom events (100ms delay) to handle rapid scrolling smoothly
- [ ] T107 [P] Add requestAnimationFrame to pan updates in zoom-pan.js for smooth 60fps performance
- [ ] T108 Add edge case handling: reset pan to (0, 0) when document fits in viewport after zoom out
- [ ] T109 Add edge case handling: maintain pan position proportionally during window resize
- [ ] T110 [P] Add CSS will-change: transform hint to content element for performance
- [ ] T111 Test zoom/pan with large markdown files (10MB+) to verify performance
- [ ] T112 Test zoom/pan integration with existing touchpad/touchscreen pinch gestures
- [ ] T113 Verify keyboard shortcuts only work when document view has focus (not in dialogs)
- [ ] T114 [P] Add inline documentation for coordinate transform math in zoom() method
- [ ] T115 [P] Update quickstart.md if implementation differs from plan
- [ ] T116 Code cleanup: remove any debug console.log statements from zoom-pan.js
- [ ] T117 Verify all zoom/pan operations complete without visual lag or stuttering
- [ ] T118 Manual test all acceptance scenarios from spec.md user stories

---

## Phase 11: Interactive Position Indicators (Scrollbar Functionality)

**Purpose**: Make position indicators interactive - allow click-and-drag like traditional scrollbars

**Goal**: Users can click and drag the position indicator thumbs (vertical/horizontal) to pan the document, just like native scrollbars

**Independent Test**: Zoom document to 150%, click and drag the vertical position indicator thumb (right side). Document should pan accordingly. Release mouse - panning stops. Repeat with horizontal indicator (bottom).

### Implementation for User Story - Interactive Scrollbars

- [ ] T119 [US-Interactive] Add mousedown event listener to position indicator thumbs in zoom-pan.js
- [ ] T120 [US-Interactive] Detect click on vertical thumb (positionThumb element)
- [ ] T121 [US-Interactive] Store initial mouse Y position and initial panY when thumb clicked
- [ ] T122 [US-Interactive] Set isThumbDragging flag and capture mouse events
- [ ] T123 [US-Interactive] Add mousemove listener to track vertical thumb drag
- [ ] T124 [US-Interactive] Calculate pan delta based on mouse Y movement relative to indicator height
- [ ] T125 [US-Interactive] Convert indicator ratio to pan offset (indicatorRatio * scrollableHeight)
- [ ] T126 [US-Interactive] Update panY based on calculated offset
- [ ] T127 [US-Interactive] Call clampPanBoundaries(), applyTransform(), sendStateUpdate() during thumb drag
- [ ] T128 [US-Interactive] Add mouseup listener to stop thumb dragging
- [ ] T129 [US-Interactive] Implement same logic for horizontal thumb (positionThumbHorizontal)
- [ ] T130 [US-Interactive] Handle click on indicator track (not thumb) to jump to that position
- [ ] T131 [US-Interactive] Add CSS cursor: pointer to thumbs and cursor: default to tracks
- [ ] T132 [US-Interactive] Add visual feedback on thumb hover (slightly lighter background)
- [ ] T133 [US-Interactive] Prevent text selection while dragging thumbs
- [ ] T134 [US-Interactive] Test thumb drag at various zoom levels (100%, 150%, 500%)
- [ ] T135 [US-Interactive] Test edge cases: drag beyond boundaries, rapid drag movements

**Checkpoint**: Position indicator thumbs are draggable. Dragging vertical thumb pans vertically. Dragging horizontal thumb pans horizontally. Click on track jumps to position. Visual feedback on hover.

---

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - review existing code
- **Foundational (Phase 2)**: Depends on Setup - BLOCKS all user stories
- **User Stories (Phases 3-9)**: All depend on Foundational phase completion
  - US1 (Mouse Scroll Zoom) is MVP and should be completed first
  - US2 (Keyboard Zoom) depends on US1 for message passing infrastructure
  - US3 (Reset Zoom) depends on US1/US2 for zoom infrastructure
  - US4 (Per-Tab Persistence) depends on US1/US2/US3 for zoom to work
  - US5 (Default Zoom Settings) can be done anytime after Foundational
  - US6 (Pan) depends on US1/US2 for zoom to work (need zoom > 100% to pan)
  - US7 (Pan Persistence) depends on US6 for pan to work
- **Polish (Phase 10)**: Depends on all user stories being complete
- **Interactive Scrollbars (Phase 11)**: Depends on Phase 5.5 (position indicators must exist)

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational - Independent (MVP)
- **User Story 2 (P1)**: Can start after US1 - Reuses message infrastructure
- **User Story 3 (P2)**: Can start after US1/US2 - Reuses zoom infrastructure
- **User Story 4 (P2)**: Can start after US1/US2/US3 - Adds tab switching
- **User Story 5 (P3)**: Can start after Foundational - Independent (settings only)
- **User Story 6 (P2)**: Can start after US1/US2 - Needs zoom to be functional
- **User Story 7 (P3)**: Can start after US6 - Adds pan persistence to tab switching

### Within Each User Story

- Foundation tasks before implementation
- JavaScript infrastructure before WPF event handlers
- Message sending before message receiving
- Core zoom/pan logic before UI polish
- Individual story complete and testable before moving to next

### Parallel Opportunities

- T005, T006, T007 (TabItem properties) can run in parallel
- T010, T011 (Settings properties) can run in parallel with TabItem work
- T012-T017 (JavaScript setup) can run in parallel after TabItem properties exist
- T042, T043 (Menu items) can run in parallel with keyboard handler code
- T052 (Reset menu item) can run in parallel with reset logic
- T070-T075 (Settings UI) can run in parallel (different XAML file)
- Within US6: T079-T091 (WPF handlers) can be developed in parallel with T092-T100 (JavaScript pan logic)
- All Phase 10 polish tasks marked [P] can run in parallel
- Phase 11 (Interactive scrollbars): T119-T129 (vertical) can run in parallel with T129-T135 (horizontal + polish)

---

## Parallel Example: User Story 1 (MVP)

```bash
# After Foundation is complete, these can run in parallel:

# JavaScript zoom logic:
Task: "T025 [US1] Implement zoom() method in zoom-pan.js"
Task: "T026 [US1] Calculate new zoom level in zoom() by adding delta"
Task: "T027 [US1] Clamp new zoom level to [10, 1000] range"

# WPF mouse event handling (different developer):
Task: "T018 [US1] Add PreviewMouseWheel event handler"
Task: "T019 [US1] Detect CTRL key modifier"
Task: "T020 [US1] Calculate zoom delta (+10/-10)"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (review existing code) - 30 minutes
2. Complete Phase 2: Foundational (TabItem properties, JS infrastructure) - 2 hours
3. Complete Phase 3: User Story 1 (CTRL+scroll zoom) - 3 hours
4. **STOP and VALIDATE**: Test US1 independently with various zoom levels, boundaries, cursor positioning
5. Demo/Review before continuing

**Total MVP: ~5-6 hours of focused work**

### Incremental Delivery

1. Setup + Foundational → Foundation ready (2.5 hours)
2. Add User Story 1 → Test → Demo (MVP in 5-6 hours!)
3. Add User Story 2 → Test → Demo (keyboard zoom) (+2 hours = 7-8 hours)
4. Add User Story 3 → Test → Demo (reset) (+1 hour = 8-9 hours)
5. Add User Story 4 → Test → Demo (per-tab persistence) (+1.5 hours = 10-11 hours)
6. Add User Story 6 → Test → Demo (pan) (+3 hours = 13-14 hours)
7. Add User Story 5, 7 → Test → Demo (settings, pan persistence) (+2 hours = 15-16 hours)
8. Polish phase → Final testing (+1-2 hours = 16-18 hours total)
9. Interactive scrollbars → Test → Demo (+2-3 hours = 18-21 hours total)

### Parallel Team Strategy

With 2 developers:

1. Both complete Setup + Foundational together (2.5 hours)
2. Once Foundational is done:
   - **Developer A**: US1 (Mouse Zoom) → US2 (Keyboard) → US3 (Reset)
   - **Developer B**: US5 (Settings UI) → US6 (Pan) → US7 (Pan Persistence)
3. Developer A finishes first, helps with US4 (Per-Tab Persistence) or Polish
4. Stories integrate naturally as they both update TabItem state

---

## Notes

- [P] tasks = different files, no dependencies on other incomplete tasks
- [Story] label maps task to specific user story for traceability
- Each user story should be independently testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Tests are OPTIONAL per specification - focus on manual testing of acceptance scenarios
- MVP is US1 only - can ship basic zoom after ~6 hours of work
- US1+US2+US3 (all P1) provides complete zoom functionality - good first milestone
- Pan functionality (US6+US7) can be added later without breaking zoom
- Settings (US5) is independent and can be added anytime

---

## Success Metrics

After completion, verify these success criteria from spec.md:

- **SC-001**: Zoom in/out using any method within 5 seconds ✓
- **SC-002**: Reset zoom within 2 seconds ✓
- **SC-003**: Tab switching shows correct zoom within 1 second ✓
- **SC-004**: Navigate zoomed document by panning within 10 seconds ✓
- **SC-005**: Keyboard shortcuts discoverable in Edit menu ✓
- **SC-006**: No visual lag at any zoom level 10%-1000% ✓
- **SC-007**: Configure default zoom within 2 minutes ✓
- **SC-008**: Pan position stable when switching tabs ✓
