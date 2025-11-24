# Feature Specification: Zoom and Pan Controls

**Feature Branch**: `004-zoom-pan`  
**Created**: 2025-11-21  
**Status**: Draft  
**Input**: User description: "Allow users to zoom and pan the markdown view with mouse and keyboard controls"

## Clarifications

### Session 2025-11-21

- Q: What increment should zoom operations use for keyboard shortcuts (CTRL+/-) and mouse wheel? → A: 10% increments (100% → 110% → 120% → 130%)
- Q: What should the minimum and maximum zoom limits be? → A: 10% minimum, 1000% maximum
- Q: Which mouse button(s) should trigger panning when dragging? → A: Middle mouse button only
- Q: When zooming with CTRL + mouse wheel, what point should remain fixed (zoom center)? → A: Mouse cursor position
- Q: When zooming with keyboard shortcuts (CTRL+/-, CTRL+0), what point should remain fixed (zoom center)? → A: Viewport center

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Mouse Scroll Zoom (Priority: P1)

Users can zoom in and out of the markdown document using CTRL + mouse wheel, providing quick and intuitive control over document magnification while reading.

**Why this priority**: Most critical zoom control method, widely recognized pattern across applications, essential for basic zoom functionality.

**Independent Test**: Can be fully tested by opening a markdown document and using CTRL + scroll wheel to zoom in/out, verifying that content scales proportionally.

**Acceptance Scenarios**:

1. **Given** a markdown document is open, **When** user holds CTRL and scrolls mouse wheel up, **Then** document zooms in (increases magnification) centered on the mouse cursor position
2. **Given** a markdown document is open, **When** user holds CTRL and scrolls mouse wheel down, **Then** document zooms out (decreases magnification) centered on the mouse cursor position
3. **Given** document is at minimum zoom level, **When** user attempts to zoom out further, **Then** zoom level remains at minimum without error
4. **Given** document is at maximum zoom level, **When** user attempts to zoom in further, **Then** zoom level remains at maximum without error
5. **Given** user hovers over specific content in document, **When** user zooms in with CTRL + mouse wheel, **Then** the content under the cursor remains visible and centered at the cursor position

---

### User Story 2 - Keyboard Zoom Controls (Priority: P1)

Users can zoom in and out using CTRL + (plus) and CTRL - (minus) keyboard shortcuts, with these options also available in the Edit menu for discoverability.

**Why this priority**: Essential keyboard accessibility, provides alternative to mouse-based zoom, critical for users who prefer keyboard navigation.

**Independent Test**: Can be fully tested by opening a document and pressing CTRL+/CTRL- to verify zoom changes, and checking that Edit menu contains these options.

**Acceptance Scenarios**:

1. **Given** a markdown document is open, **When** user presses CTRL and + (plus key), **Then** document zooms in by one increment
2. **Given** a markdown document is open, **When** user presses CTRL and - (minus key), **Then** document zooms out by one increment
3. **Given** Edit menu is open, **When** user views menu options, **Then** "Zoom In" and "Zoom Out" options are visible with keyboard shortcuts displayed
4. **Given** Edit menu is open, **When** user clicks "Zoom In" menu item, **Then** document zooms in
5. **Given** Edit menu is open, **When** user clicks "Zoom Out" menu item, **Then** document zooms out

---

### User Story 3 - Reset Zoom (Priority: P2)

Users can quickly return to default zoom level using CTRL + 0 keyboard shortcut or via the Edit menu, allowing instant recovery from extreme zoom levels.

**Why this priority**: Important for usability and recovery, but users can manually zoom back to default if this feature is missing.

**Independent Test**: Can be fully tested by zooming in/out to various levels, then pressing CTRL+0 or using Edit menu to verify return to 100% zoom.

**Acceptance Scenarios**:

1. **Given** document is zoomed in or out, **When** user presses CTRL and 0 (zero key), **Then** document returns to default zoom level
2. **Given** Edit menu is open, **When** user views menu options, **Then** "Reset Zoom" option is visible with CTRL+0 shortcut displayed
3. **Given** Edit menu is open and document is zoomed, **When** user clicks "Reset Zoom" menu item, **Then** document returns to default zoom level
4. **Given** document is already at default zoom, **When** user presses CTRL+0, **Then** zoom level remains at default without visual disruption

---

### User Story 4 - Per-Tab Zoom Persistence (Priority: P2)

Each tab maintains its own zoom level, so when users switch between tabs, each document displays at its previously set zoom level.

**Why this priority**: Enhances user experience when working with multiple documents, but not blocking for basic zoom functionality.

**Independent Test**: Can be fully tested by opening multiple tabs, setting different zoom levels, switching between tabs, and verifying each maintains its zoom level.

**Acceptance Scenarios**:

1. **Given** Tab A is zoomed to 150% and Tab B is zoomed to 75%, **When** user switches from Tab A to Tab B, **Then** Tab B displays at 75% zoom
2. **Given** Tab B is at 75% zoom, **When** user switches from Tab B to Tab A, **Then** Tab A displays at 150% zoom
3. **Given** a new tab is opened, **When** tab becomes active, **Then** tab displays at the default zoom level from settings
4. **Given** user has set zoom in Tab A, **When** user closes and reopens Tab A, **Then** Tab A returns to default zoom level (zoom is session-only)

---

### User Story 5 - Configurable Default Zoom (Priority: P3)

Users can set a default zoom level in application settings that applies to all newly opened tabs, accommodating different display sizes and user preferences.

**Why this priority**: Quality of life feature that can be added later without affecting core zoom functionality.

**Independent Test**: Can be fully tested by changing default zoom setting, opening new tabs, and verifying they use the new default zoom level.

**Acceptance Scenarios**:

1. **Given** user opens Settings, **When** user views zoom preferences, **Then** "Default Zoom" setting is visible with current value
2. **Given** user sets default zoom to 125%, **When** user opens a new tab, **Then** new tab displays at 125% zoom
3. **Given** no custom default is set, **When** user opens a new tab, **Then** new tab displays at 100% zoom
4. **Given** user changes default zoom, **When** user switches to existing tab, **Then** existing tab maintains its current zoom level (change only affects new tabs)

---

### User Story 6 - Pan Document with Mouse Drag (Priority: P2)

Users can click and drag with the middle mouse button to pan around zoomed documents, allowing easy navigation when content extends beyond visible viewport without interfering with text selection.

**Why this priority**: Essential for usability at high zoom levels, but zoom functionality can work without it initially.

**Independent Test**: Can be fully tested by zooming in on a document, clicking middle mouse button and dragging to verify viewport moves, and testing pan boundaries.

**Acceptance Scenarios**:

1. **Given** document is zoomed in beyond 100%, **When** user clicks middle mouse button and drags, **Then** viewport pans in the direction of drag
2. **Given** user is panning document with middle mouse button, **When** user releases button, **Then** panning stops and document remains at current position
3. **Given** document is at default zoom (100%), **When** document fits entirely in viewport, **Then** middle mouse button panning has no effect or is disabled
4. **Given** user pans to edge of document, **When** user attempts to drag beyond boundary with middle mouse button, **Then** panning stops at document boundary
5. **Given** document is panned to a specific position, **When** user zooms in or out, **Then** zoom centers on current viewport center (reasonable default behavior)

---

### User Story 7 - Per-Tab Pan Position Persistence (Priority: P3)

Each tab remembers its pan position when zoomed, so switching between tabs returns to the exact view location users were working with.

**Why this priority**: Nice to have for user experience, but not critical for basic zoom and pan functionality.

**Independent Test**: Can be fully tested by opening multiple tabs, zooming and panning each to different positions, switching between tabs, and verifying positions are maintained.

**Acceptance Scenarios**:

1. **Given** Tab A is panned to show bottom section and Tab B is panned to show top section, **When** user switches from Tab A to Tab B, **Then** Tab B displays at its panned position (top section)
2. **Given** Tab B shows top section, **When** user switches from Tab B to Tab A, **Then** Tab A displays at its panned position (bottom section)
3. **Given** user closes and reopens a tab, **When** tab is reopened, **Then** tab returns to default pan position (top-left, pan position is session-only)
4. **Given** tab is at 100% zoom with no panning, **When** user switches to another tab and back, **Then** tab displays at default position (no need to persist default state)

---

### User Story 8 - Enhanced Keyboard Navigation (Priority: P2) **[IMPLEMENTED]**

Users can navigate zoomed documents using arrow keys, PageUp/PageDown, Home/End, and Shift+Scroll for efficient document traversal without a mouse.

**Why this priority**: Significantly improves accessibility and power user workflows, especially for keyboard-first users and when working with large zoomed documents.

**Independent Test**: Can be fully tested by zooming document, then using arrow keys for fine movement, PageUp/PageDown for large jumps, Home/End for document boundaries, and Shift+Scroll for horizontal movement.

**Acceptance Scenarios**:

1. **Given** document is zoomed or at default zoom, **When** user presses arrow keys (↑↓←→), **Then** viewport pans in the pressed direction by small increments (~40px)
2. **Given** document is zoomed or at default zoom, **When** user presses PageUp, **Then** viewport pans up by approximately 80% of viewport height
3. **Given** document is zoomed or at default zoom, **When** user presses PageDown, **Then** viewport pans down by approximately 80% of viewport height
4. **Given** document is zoomed or at default zoom, **When** user presses Home, **Then** viewport jumps to top of document
5. **Given** document is zoomed or at default zoom, **When** user presses End, **Then** viewport jumps to bottom of document
6. **Given** document extends beyond viewport horizontally, **When** user holds Shift and scrolls mouse wheel, **Then** viewport pans horizontally in direction of scroll
7. **Given** native scrollbars are disabled, **When** user scrolls mouse wheel (without modifiers), **Then** viewport pans vertically to replace native scrolling

---

### User Story 9 - Position Indicators (Priority: P3) **[IMPLEMENTED]**

Users see visual indicators showing their current position in the document and zoom level, providing spatial awareness when native scrollbars are disabled.

**Why this priority**: Quality of life feature that compensates for disabled native scrollbars, helps users understand their location in long documents.

**Independent Test**: Can be fully tested by zooming and panning document, observing vertical/horizontal position bars and zoom percentage indicator that appear temporarily.

**Acceptance Scenarios**:

1. **Given** user zooms or pans document, **When** operation completes, **Then** position indicators fade in showing current viewport location
2. **Given** position indicators are visible, **When** 1.5 seconds elapse with no zoom/pan activity, **Then** indicators automatically fade out
3. **Given** document is longer than viewport, **When** user pans vertically, **Then** vertical position indicator shows relative position with proportional thumb size
4. **Given** document is wider than viewport, **When** user pans horizontally, **Then** horizontal position indicator shows relative position with proportional thumb size
5. **Given** user changes zoom level, **When** zoom operation completes, **Then** zoom percentage indicator (bottom-right) displays current zoom level (e.g., "150%")
6. **Given** document is at bottom with 10vh extra spacing, **When** user scrolls to absolute bottom, **Then** last content is clearly visible without being cut off at viewport edge

---

### Edge Cases

- What happens when zoom level reaches minimum (10%) or maximum (1000%) limits? System should silently cap at boundaries without error messages.
- How does system handle rapid zoom changes (e.g., fast scroll wheel movement)? Should debounce or smooth zoom transitions to avoid jarring user experience.
- What happens when window is resized while document is zoomed and panned? System should maintain pan position relative to document coordinates, adjusting viewport as needed.
- How does panning behave when document becomes smaller than viewport (e.g., zoom out from 200% to 50%)? System should reset pan position to default (top-left) when document fits entirely in viewport.
- What happens to text selection during zoom or pan operations? Text selection should be preserved across zoom changes when possible, but may reset during pan operations.
- How do existing touchpad/touchscreen pinch zoom gestures interact with new controls? All zoom methods should sync to same zoom level state - changing zoom via any method affects all methods.
- What happens when user attempts to use zoom shortcuts in UI elements outside the document view (e.g., settings dialog)? Shortcuts should only work when document view has focus.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST support CTRL + mouse wheel zoom, where scroll up increases zoom and scroll down decreases zoom, with 10% increments per scroll step, keeping the mouse cursor position as the zoom center point
- **FR-002**: System MUST support CTRL + (plus key) keyboard shortcut to zoom in by 10% increments, keeping the viewport center as the zoom center point
- **FR-003**: System MUST support CTRL - (minus key) keyboard shortcut to zoom out by 10% increments, keeping the viewport center as the zoom center point
- **FR-004**: System MUST support CTRL + 0 (zero key) keyboard shortcut to reset zoom to default level, keeping the viewport center as the zoom center point
- **FR-005**: System MUST provide "Zoom In", "Zoom Out", and "Reset Zoom" options in Edit menu with keyboard shortcuts displayed
- **FR-006**: System MUST maintain independent zoom levels for each open tab
- **FR-007**: System MUST apply a configurable default zoom level (stored in settings) to newly opened tabs
- **FR-008**: System MUST default to 100% zoom when no custom default is configured
- **FR-009**: System MUST support middle mouse button click-and-drag panning when document is zoomed beyond viewport size
- **FR-010**: System MUST maintain independent pan positions for each open tab
- **FR-011**: System MUST prevent panning beyond document boundaries
- **FR-012**: System MUST integrate new zoom controls with existing touchpad pinch and touchscreen pinch zoom gestures (all methods control same zoom state)
- **FR-013**: System MUST enforce minimum zoom limit of 10% and maximum zoom limit of 1000% to prevent unusable zoom levels
- **FR-014**: Zoom levels MUST reset to default when tab is closed and reopened (zoom is session-only, not persisted to disk)
- **FR-015**: Pan positions MUST reset to default when tab is closed and reopened (pan is session-only, not persisted to disk)
- **FR-016**: System MUST display default zoom setting in application settings interface with ability to modify value
- **FR-017**: Changes to default zoom setting MUST only affect newly opened tabs, not existing tabs
- **FR-018**: System MUST support arrow key navigation (Up/Down/Left/Right) for panning with ~40px increments per keypress **[IMPLEMENTED]**
- **FR-019**: System MUST support PageUp/PageDown keys for panning with ~80% viewport height increments **[IMPLEMENTED]**
- **FR-020**: System MUST support Home key to jump to top of document **[IMPLEMENTED]**
- **FR-021**: System MUST support End key to jump to bottom of document **[IMPLEMENTED]**
- **FR-022**: System MUST support Shift+Scroll for horizontal panning when document is wider than viewport **[IMPLEMENTED]**
- **FR-023**: System MUST replace native scroll with pan-based navigation (normal scroll wheel = vertical pan) **[IMPLEMENTED]**
- **FR-024**: System MUST display temporary position indicators (vertical and horizontal) showing viewport location **[IMPLEMENTED]**
- **FR-025**: System MUST display temporary zoom level indicator showing current zoom percentage **[IMPLEMENTED]**
- **FR-026**: Position and zoom indicators MUST auto-hide after 1.5 seconds of inactivity **[IMPLEMENTED]**
- **FR-027**: System MUST disable native scrollbars and use overflow:hidden on body/html elements **[IMPLEMENTED]**
- **FR-028**: System MUST provide 10vh extra spacing at document bottom for better end-of-document visibility **[IMPLEMENTED]**

### Key Entities

- **Tab Zoom State**: Each tab's current zoom level (percentage value, e.g., 100%, 150%, 75%), maintained during session but not persisted across application restarts
- **Tab Pan State**: Each tab's current pan position (viewport coordinates relative to document), maintained during session but not persisted across application restarts
- **Default Zoom Setting**: Application-wide setting defining default zoom level for new tabs (percentage value), persisted in application settings file

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can zoom in/out using any supported method (CTRL+scroll, CTRL+/-, Edit menu, touchpad/touchscreen pinch) and reach desired zoom level within 5 seconds
- **SC-002**: Users can reset to default zoom using CTRL+0 or Edit menu within 2 seconds from any zoom level
- **SC-003**: When switching between 5 tabs with different zoom levels, each tab displays at its correct zoom level within 1 second of tab activation
- **SC-004**: Users can navigate zoomed documents by panning with mouse drag and reach any document section within 10 seconds
- **SC-005**: 95% of users successfully discover keyboard shortcuts through Edit menu labels on first attempt
- **SC-006**: All zoom and pan operations complete without visual lag or stuttering at zoom levels between 10% and 1000%
- **SC-007**: Users can configure default zoom setting and have it apply to new tabs within 2 minutes of first attempting to change it
- **SC-008**: Pan position remains stable when switching between tabs - no unexpected viewport jumps or position drift
- **SC-009**: Users can navigate through entire document using only keyboard (arrow keys, PageUp/Down, Home/End) within 30 seconds **[IMPLEMENTED]**
- **SC-010**: Position indicators provide clear visual feedback of location within 100ms of zoom/pan operation **[IMPLEMENTED]**
- **SC-011**: Shift+Scroll horizontal panning works intuitively in documents wider than viewport **[IMPLEMENTED]**
- **SC-012**: Users can identify current zoom level via indicator within 1 second of any zoom operation **[IMPLEMENTED]**
