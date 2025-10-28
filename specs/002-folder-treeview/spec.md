# Feature Specification: Folder Structure Treeview

**Feature Branch**: `002-folder-treeview`  
**Created**: October 28, 2025  
**Status**: Draft  
**Input**: User description: "Add a treeview with the folder structure of all markdown files in this folder and its subfolders; use lazy loading: first display the markdown than update the tree in the background. The tree can be used for quick navigation. The tree can be hidden and shown. User preferences stores the default for the user for new folders, the application remembers the setting with opened folders"

## Clarifications

### Session 2025-10-28

- Q: When there are no markdown files in a folder, should the folder be shown in the treeview? → A: Do not show the folder

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View Markdown Content Immediately (Priority: P1)

Users need to see their markdown content immediately when opening a folder, without waiting for the folder structure to load. The treeview should populate in the background while users can already read and interact with their documents.

**Why this priority**: This ensures the application feels fast and responsive. Users can start working immediately rather than waiting for file scanning to complete, which is critical for folders with many files or deep directory structures.

**Independent Test**: Can be fully tested by opening any folder with markdown files and verifying the markdown content displays instantly while the treeview populates asynchronously in the background.

**Acceptance Scenarios**:

1. **Given** a user opens a folder containing markdown files, **When** the application loads, **Then** the selected markdown content displays immediately without waiting for the treeview to complete loading
2. **Given** the markdown content is displayed, **When** the treeview is still loading, **Then** the user can read and interact with the displayed markdown without any blocking or performance degradation
3. **Given** a folder with hundreds of markdown files, **When** the application opens, **Then** the initial markdown displays within 1 second while the treeview continues to populate in the background

---

### User Story 2 - Navigate Using Treeview (Priority: P2)

Users want to quickly navigate between markdown files using a visual folder structure that shows all markdown files in the current folder and its subfolders. This provides an overview of the document hierarchy and enables fast switching between related files.

**Why this priority**: Navigation is core functionality that significantly improves productivity, but the application can function without it (users can still open files directly). This makes it second priority after immediate content display.

**Independent Test**: Can be fully tested by clicking on any markdown file in the treeview and verifying the content updates to show the selected file.

**Acceptance Scenarios**:

1. **Given** the treeview has finished loading, **When** a user clicks on a markdown file in the tree, **Then** the application displays that file's content in the main viewing area
2. **Given** a folder structure with nested subfolders, **When** the treeview displays, **Then** all markdown files are shown in their respective folder hierarchy
3. **Given** multiple markdown files across different folders, **When** a user navigates between them using the treeview, **Then** each file loads and displays correctly with proper syntax highlighting and rendering
4. **Given** a folder contains both markdown and non-markdown files, **When** the treeview displays, **Then** only markdown files are shown in the tree structure

---

### User Story 3 - Toggle Treeview Visibility (Priority: P3)

Users want to show or hide the treeview to maximize screen space for reading content or to reveal it when needing to navigate. The application should remember whether the treeview was visible or hidden for each folder.

**Why this priority**: This is a nice-to-have feature that improves user experience but isn't essential for core functionality. Users can still use the application effectively with the treeview always visible.

**Independent Test**: Can be fully tested by toggling the treeview visibility on/off and verifying the UI updates correctly and remembers the state when reopening the same folder.

**Acceptance Scenarios**:

1. **Given** the treeview is visible, **When** a user clicks the hide/toggle control, **Then** the treeview disappears and the content area expands to use the full width
2. **Given** the treeview is hidden, **When** a user clicks the show/toggle control, **Then** the treeview appears and the content area adjusts to accommodate it
3. **Given** a user has hidden the treeview for a specific folder, **When** they close and reopen that same folder, **Then** the treeview remains hidden as per their previous choice
4. **Given** a user has the treeview visible in one folder, **When** they open a different folder for the first time, **Then** the treeview visibility follows the user's global default preference

---

### User Story 4 - Set Default Treeview Preference (Priority: P4)

Users want to set a global default preference for whether the treeview should be visible or hidden when opening new folders. This prevents them from having to repeatedly show/hide the treeview for each new folder they work with.

**Why this priority**: This is a convenience feature that reduces repetitive actions, but the application can function fully without it. Users can manually toggle the treeview for each folder if needed.

**Independent Test**: Can be fully tested by changing the default preference, opening a new folder, and verifying the treeview visibility matches the preference setting.

**Acceptance Scenarios**:

1. **Given** a user sets their global preference to "treeview visible by default", **When** they open any new folder (one they haven't opened before), **Then** the treeview is automatically displayed
2. **Given** a user sets their global preference to "treeview hidden by default", **When** they open any new folder, **Then** the treeview is automatically hidden
3. **Given** a user has a global preference set, **When** they manually toggle the treeview for a specific folder, **Then** that folder's individual setting overrides the global preference for that folder only
4. **Given** a user changes their global preference, **When** they open a folder they've previously opened (which has a stored individual setting), **Then** the individual setting takes precedence over the new global preference

---

### Edge Cases

- What happens when a folder contains no markdown files? (Treeview should show an empty state or message indicating no markdown files found)
- How does the system handle very deep folder hierarchies (10+ levels)? (Should load efficiently without performance degradation)
- What happens when markdown files are added, removed, or renamed while the folder is open? (Treeview should detect changes and update accordingly, or at minimum update on next folder open)
- How does the system handle folders with thousands of markdown files? (Background loading should remain responsive; treeview may use virtualization or pagination)
- What happens when a user opens a folder without proper read permissions on some subfolders? (Should display accessible files and gracefully handle permission errors)
- How does the system handle symbolic links or junction points in the folder structure? (Should either follow them once or ignore them to prevent infinite loops)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST display markdown content immediately upon opening a folder, without waiting for the folder structure scan to complete
- **FR-002**: System MUST scan folder structure for markdown files in the background after displaying initial content
- **FR-003**: System MUST display a treeview showing all markdown files (\*.md, \*.markdown) in the current folder and all subfolders
- **FR-004**: Treeview MUST organize files hierarchically according to their folder structure
- **FR-005**: Users MUST be able to click on any file in the treeview to navigate to that markdown document
- **FR-006**: Users MUST be able to toggle the treeview visibility (show/hide)
- **FR-007**: System MUST remember treeview visibility state per folder (folder-specific setting)
- **FR-008**: System MUST provide a global user preference for default treeview visibility for new folders
- **FR-009**: Folder-specific treeview visibility settings MUST override the global default preference
- **FR-010**: System MUST persist both global preferences and per-folder settings across application restarts
- **FR-011**: Treeview MUST filter and display only markdown file types, excluding non-markdown files
- **FR-012**: System MUST handle folders without markdown files gracefully (show appropriate message or empty state)
- **FR-013**: Background folder scanning MUST not block or degrade the performance of markdown rendering and reading

### Key Entities

- **Folder Settings**: Represents per-folder configuration including treeview visibility state, associated with a unique folder path identifier
- **User Preferences**: Represents global user settings including default treeview visibility for new folders
- **Tree Node**: Represents an item in the folder hierarchy, contains name, path, type (folder or file), and parent-child relationships
- **Markdown File**: Represents a discoverable markdown document with file path, name, and parent folder

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Markdown content displays within 1 second of opening a folder, regardless of folder size
- **SC-002**: Treeview completes background loading for folders with up to 1,000 markdown files within 5 seconds
- **SC-003**: Users can successfully navigate to any markdown file by clicking on it in the treeview with content appearing within 500 milliseconds
- **SC-004**: Treeview visibility toggle responds instantly (under 100 milliseconds) to user input
- **SC-005**: Treeview visibility state persists correctly across application restarts for 100% of folders
- **SC-006**: Users can set and modify their default treeview preference successfully on first attempt
- **SC-007**: Folder-specific settings correctly override global preferences in 100% of cases
