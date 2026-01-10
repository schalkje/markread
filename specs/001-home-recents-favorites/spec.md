# Feature Specification: Home Page - Recents and Favorites

**Feature Branch**: `001-home-recents-favorites`
**Created**: 2026-01-05
**Status**: Draft
**Input**: User description: Home page
## last x opened
extend with last x opened, sort by last opened
Make columns; just like the buttons:
- Files
- Folders
- Repo's and branches

Take some inspiratin for the ui from the folder selector

On mouse over, see when it was last opened

## favorites
The user can add/remove favorites and even add a description to them. These favorites, stay on top of the last x opened; sort alphabetically"

## Clarifications

### Session 2026-01-05

- Q: How should the system uniquely identify items to prevent duplicates? → A: Item uniqueness based on full path; display name only; show full path on mouse over
- Q: When should items that no longer exist be automatically removed from recents/favorites? → A: On next access attempt (lazy cleanup when user clicks the item)
- Q: Should certain paths be excluded from recents tracking for privacy/security reasons? → A: No exclusions, but provide a delete button (x) to remove items from history
- Q: Is there a maximum number of favorites? → A: 10 per category (same as recents limit)
- Q: How should users edit favorite descriptions? → A: Remove description requirement entirely; no description for favorites

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Quick Access to Recent Items (Priority: P1)

Users need quick access to their recently opened files, folders, and repositories without navigating through the file system. The home page displays the most recently accessed items across all three categories, making it faster to resume previous work.

**Why this priority**: This is the core value proposition - reducing friction in accessing recently used items. This addresses the primary user need and delivers immediate value.

**Independent Test**: Can be fully tested by opening various items (files, folders, repos), closing them, and verifying they appear in the recents list sorted by most recent first. Delivers value by providing faster access to work items.

**Acceptance Scenarios**:

1. **Given** the user has previously opened 5 files, 3 folders, and 2 repositories, **When** they navigate to the home page, **Then** all items appear in their respective columns sorted by most recent access time
2. **Given** the user opens a file that was already in the recents list, **When** they return to the home page, **Then** that file moves to the top of the Files column
3. **Given** the recents list contains 15 items in a category, **When** the user opens a new item in that category, **Then** the oldest item is removed and the new item appears at the top
4. **Given** the user hovers over any recent item, **When** the mouse cursor is over the item, **Then** a tooltip displays the last opened timestamp and full absolute path in a human-readable format
5. **Given** a recent item has been deleted from the file system, **When** the user clicks on that item, **Then** an error message is displayed and the item is automatically removed from the recents list
6. **Given** a recent item is displayed, **When** the user clicks the delete button (×) on that item, **Then** the item is immediately removed from the recents list without confirmation

---

### User Story 2 - Manage Favorites for Persistent Quick Access (Priority: P2)

Users want to mark certain files, folders, or repositories as favorites to ensure they always appear prominently on the home page, regardless of when they were last opened.

**Why this priority**: Favorites provide persistent access to important items that might otherwise fall off the recents list. This is valuable but builds on the basic recents functionality.

**Independent Test**: Can be fully tested by adding/removing favorites from different categories and verifying they always appear above recents and are sorted alphabetically. Delivers value by providing bookmarking functionality.

**Acceptance Scenarios**:

1. **Given** the user is viewing any item (file, folder, or repo) on the home page or in a browser view, **When** they select "Add to Favorites", **Then** the item appears in the Favorites section of its category on the home page
2. **Given** multiple favorites exist in a category, **When** the home page loads, **Then** favorites appear above the recents list and are sorted alphabetically by name
3. **Given** a favorited item exists, **When** the user selects "Remove from Favorites", **Then** the item is removed from the favorites section but may still appear in recents if recently accessed
4. **Given** a category already has 10 favorites, **When** the user attempts to add another favorite to that category, **Then** the system displays a message requiring the user to remove an existing favorite first

---

### User Story 3 - Visual Organization with Column Layout (Priority: P1)

Users need to quickly distinguish between different item types (files, folders, repositories/branches) when scanning the home page. The layout organizes items into clear columns similar to the existing button layout, with visual design inspired by the folder selector.

**Why this priority**: This is part of the core UX that makes the feature usable and intuitive. Without proper organization, the recents feature would be confusing.

**Independent Test**: Can be fully tested by opening items of different types and verifying they appear in the correct columns with appropriate visual styling. Delivers value through clear information architecture.

**Acceptance Scenarios**:

1. **Given** the user navigates to the home page, **When** the page loads, **Then** three distinct columns are visible: "Files", "Folders", and "Repos & Branches"
2. **Given** each column contains items, **When** the user views the layout, **Then** the visual design is consistent with the folder selector (similar spacing, typography, interaction patterns)
3. **Given** favorites and recents exist in a column, **When** the user views the column, **Then** favorites appear in a visually distinct section at the top, followed by a separator, then recents below
4. **Given** a column has no items, **When** the user views it, **Then** an appropriate empty state message is displayed (e.g., "No recent files" or "No favorite folders")

---

### Edge Cases

- What happens when a favorited or recent item is deleted or moved from the file system? (Item remains visible in list; on click attempt, system shows error message and automatically removes item from list)
- How does the system handle items with very long names? (Truncate display name with ellipsis if needed, full path always visible on hover)
- What happens if the user has no recent items on first launch? (Show empty state with helpful message about getting started)
- How does the system handle repositories with multiple branches? (Show most recent branch accessed, allow access to branch list on interaction)
- What happens when a recent item is also a favorite? (Show only in favorites section to avoid duplication)
- How does the system handle rapid successive opens of the same item? (Update timestamp but don't create duplicate entries)
- What happens when a user tries to add an 11th favorite to a category? (System prevents addition and prompts user to remove an existing favorite first)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST track the last opened timestamp for files, folders, and repositories/branches accessed through the application
- **FR-002**: System MUST display up to 10 recently opened items per category (Files, Folders, Repos & Branches) on the home page
- **FR-003**: System MUST sort recent items by last opened timestamp in descending order (most recent first)
- **FR-004**: System MUST organize the home page into three distinct columns: Files, Folders, and Repos & Branches
- **FR-005**: System MUST display a tooltip showing the last opened timestamp and full absolute path when users hover over any recent or favorite item
- **FR-006**: System MUST provide a mechanism for users to add any item to favorites
- **FR-007**: System MUST provide a mechanism for users to remove items from favorites
- **FR-008**: System MUST display favorites above recent items within each category column
- **FR-009**: System MUST sort favorites alphabetically by item name within each category
- **FR-010**: System MUST persist favorites and recent items across application sessions
- **FR-011**: System MUST not display the same item in both favorites and recents sections (favorites take precedence)
- **FR-012**: System MUST navigate to/open the selected item when a user clicks on any recent or favorite entry
- **FR-013**: System MUST apply visual design patterns consistent with the existing folder selector component
- **FR-014**: System MUST show an appropriate empty state when no items exist in a category
- **FR-015**: System MUST uniquely identify items by their full absolute path to prevent duplicate entries
- **FR-016**: System MUST display only the item name (not the full path) in the recents and favorites lists for clean presentation
- **FR-017**: System MUST remove items from recents/favorites lists when a user attempts to access an unavailable item (lazy cleanup on access attempt)
- **FR-018**: System MUST display an error message when a user attempts to access an item that no longer exists at its stored path
- **FR-019**: System MUST provide a delete button (×) on each recent item allowing users to manually remove unwanted items from the recents list
- **FR-020**: System MUST track all opened items without automatic path exclusions (no privacy filtering by default)
- **FR-021**: System MUST limit favorites to a maximum of 10 items per category (Files, Folders, Repos & Branches)
- **FR-022**: System MUST prevent adding new favorites when the category limit (10 items) is reached and inform the user they must remove an existing favorite first

### Key Entities *(include if feature involves data)*

- **RecentItem**: Represents a recently accessed item with attributes: full absolute path (unique identifier), item type (file/folder/repo), last opened timestamp, display name (filename/folder name only)
- **Favorite**: Represents a favorited item with attributes: full absolute path (unique identifier), item type (file/folder/repo), display name (filename/folder name only), date added
- **HomePageSection**: Represents a category column with attributes: section type (Files/Folders/Repos & Branches), list of favorites, list of recent items

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can access any recently opened item in 2 clicks or less (1 click to home page, 1 click to item)
- **SC-002**: The home page displays all recent items within 500ms of navigation
- **SC-003**: Users can identify item type (file/folder/repo) within 1 second of viewing the home page without reading labels
- **SC-004**: 90% of users successfully add a favorite on their first attempt without additional guidance
- **SC-005**: The system accurately maintains recents and favorites for up to 60 items total (10 recents + 10 favorites per category × 3 categories) without performance degradation

## Assumptions

- The number of recent items to display is set at 10 per category, providing a balance between useful history and visual clutter
- Clicking an item from recents or favorites will open/navigate to that item using the application's standard opening mechanism
- Recent items are stored persistently in the application's data storage (e.g., AppData folder)
- Favorites are stored persistently with the same persistence mechanism as application settings
- Timestamp display follows the application's existing date/time formatting conventions
- The folder selector component mentioned for UI inspiration already exists in the codebase
- All three item types (files, folders, repos/branches) are already trackable through the application's existing navigation system
- Items that are deleted from the file system but remain in recents/favorites will be handled gracefully with an "unavailable" indicator

## Dependencies

- Existing folder selector component (for UI design patterns)
- Application's current file/folder/repository opening mechanism
- Application's persistent storage system
- Application's navigation and routing system

## Out of Scope

- Searching or filtering within recents and favorites (future enhancement)
- Customizing the number of recent items displayed
- Adding descriptions, notes, or tags to favorites
- Syncing favorites across multiple devices
- Exporting or importing favorites
- Pinning specific items to always appear at the top
- Viewing detailed statistics about item usage patterns
