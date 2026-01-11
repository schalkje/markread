# Feature Specification: Search and Find

**Feature Branch**: `001-search-find`
**Created**: 2026-01-06
**Status**: Draft
**Input**: User description: "Implement search and find, to locate specific text"

## Clarifications

### Session 2026-01-09

- Q: How should the system prevent malicious or accidental regex patterns that could freeze the UI or consume excessive resources? → A: Validate patterns with safe subset and timeout protection (block known dangerous constructs like excessive nesting, quantifier stacking; enforce timeout as fallback)
- Q: Should the system filter by file type or search all files indiscriminately during multi-file search? → A: Search only markdown files by default with UI option to expand scope to all text files
- Q: Which specific file types should qualify as "text files" when users expand beyond markdown? → A: Markdown files are explicitly required; no other specific file type requirements - keep "All Text Files" definition flexible
- Q: What specific debouncing delay should be used for real-time search updates to balance responsiveness and performance? → A: 150ms debounce delay
- Q: Should search queries be saved and recalled across sessions? → A: Session-only history (no persistence)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Quick Document Search (Priority: P1)

As a user reading a markdown document, I want to quickly find specific text within the current document so I can navigate to relevant sections without manual scrolling.

**Why this priority**: This is the most frequently used search functionality. Users need immediate access to in-document search to efficiently locate information while reading. This mirrors standard text editor behavior that users expect.

**Independent Test**: Can be fully tested by opening any document, pressing CTRL+F, typing a search term, and verifying that all matches are highlighted and the user can navigate between them. Delivers immediate value as a standalone feature.

**Acceptance Scenarios**:

1. **Given** a document is open with multiple instances of the word "markdown", **When** I press CTRL+F and type "markdown", **Then** all instances are highlighted with yellow background and the search bar shows "1 of 5" results
2. **Given** search results are displayed, **When** I click the "Next" button or press F3, **Then** the view scrolls to and highlights the next match
3. **Given** search results are displayed, **When** I click the "Previous" button or press SHIFT+F3, **Then** the view scrolls to and highlights the previous match
4. **Given** the search bar is open, **When** I press ESC or click the close button, **Then** the search bar closes and all highlights are removed

---

### User Story 2 - Visual Search Navigation (Priority: P1)

As a user with many search results, I want to see all result locations marked on the scrollbar so I can understand the distribution of matches and quickly jump to any result.

**Why this priority**: Visual feedback on result distribution is critical for user efficiency. Without scrollbar markers, users cannot gauge how many results exist or navigate large documents effectively. This is a core part of modern search UX.

**Independent Test**: Can be tested by searching for a common term in a long document and verifying that the scrollbar displays clickable markers for each match. Delivers independent value by improving search result visibility.

**Acceptance Scenarios**:

1. **Given** a long document with search results throughout, **When** I perform a search, **Then** the vertical scrollbar displays markers at positions corresponding to each match
2. **Given** scrollbar markers are displayed, **When** I click on any marker, **Then** the view scrolls to that specific search result
3. **Given** search results are visible, **When** I close the search or clear the search term, **Then** all scrollbar markers are removed

---

### User Story 3 - Advanced Search Options (Priority: P2)

As a power user, I want to search with case sensitivity and regular expressions so I can perform precise searches for specific patterns or exact matches.

**Why this priority**: Advanced search options are essential for technical users and complex search scenarios, but not required for basic search functionality. This enhances the P1 feature without being mandatory for initial value.

**Independent Test**: Can be tested by toggling case sensitivity and regex options while searching, verifying that results change appropriately. Works independently of other features.

**Acceptance Scenarios**:

1. **Given** a document containing "Markdown" and "markdown", **When** I search for "markdown" with case sensitivity OFF (default), **Then** both "Markdown" and "markdown" are highlighted
2. **Given** the same document, **When** I search for "markdown" with case sensitivity ON, **Then** only "markdown" (lowercase) is highlighted
3. **Given** a document with email addresses, **When** I enable regex mode and search for "\b[\w.-]+@[\w.-]+\.\w{2,}\b", **Then** all email addresses are highlighted
4. **Given** regex mode is enabled with invalid syntax, **When** I type an invalid regex pattern, **Then** an error indicator appears and no results are shown

---

### User Story 4 - Multi-File Search (Priority: P2)

As a user working with multiple markdown files, I want to search across all markdown files in my repository so I can find information regardless of which document contains it.

**Why this priority**: Cross-file search is valuable for larger projects but not needed for single-document workflows. This extends search capabilities beyond single documents and serves users with multi-file projects.

**Independent Test**: Can be tested by performing a search across multiple files and verifying results appear grouped by folder and file, showing only markdown files by default. Delivers value for multi-document workflows independently of in-document search.

**Acceptance Scenarios**:

1. **Given** I press SHIFT+CTRL+F, **When** the find-in-files panel opens, **Then** it replaces the file tree/history panel and displays scope options, file type filter (defaulted to "Markdown Files"), and search controls
2. **Given** the find-in-files panel is open with scope set to "current repo/branch" and file type "Markdown Files", **When** I search for "TODO", **Then** results are displayed only from .md and .markdown files, grouped by folder then file, with match counts shown at both levels
3. **Given** search results are displayed, **When** I click on a specific result, **Then** that file opens with the matched text highlighted
4. **Given** I am viewing find-in-files results with "Markdown Files" filter, **When** I change filter to "All Text Files", **Then** results update to include matches from all text-based files
5. **Given** I am viewing find-in-files results, **When** I click back to file tree view, **Then** the panel switches back to normal file navigation

---

### User Story 5 - Search Scope Management (Priority: P3)

As a user with multiple repository branches, I want to search across different branches or multiple repositories so I can find historical or related information.

**Why this priority**: Multi-branch and multi-repo search is valuable for advanced workflows but not essential for core search functionality. This serves specific use cases and can be added after core search is stable.

**Independent Test**: Can be tested by changing search scope options and verifying that results include files from the selected scope. Works independently as an extension to multi-file search.

**Acceptance Scenarios**:

1. **Given** the find-in-files panel is open, **When** I select scope "current repo - all branches", **Then** search results include matches from all branches in the current repository
2. **Given** multiple repositories are loaded, **When** I select scope "all repositories", **Then** search results include matches from all loaded repositories, grouped by repository then folder
3. **Given** scope is set to "all branches", **When** results are displayed, **Then** each result shows which branch contains the match

---

### Edge Cases

- What happens when searching for text that doesn't exist in the document? Display "0 of 0" and show a "No results found" message
- What happens when the search term is empty? Disable the search and show no highlights
- What happens when a very long document has thousands of matches? Limit highlights to visible results plus a configurable maximum (e.g., 1000) and show a warning that not all results are displayed
- How does the system handle very large multi-file searches? Display a progress indicator and allow cancellation of long-running searches
- What happens when searching with regex that causes catastrophic backtracking? Validate and block dangerous regex constructs before execution; enforce 5-second timeout as fallback safety mechanism; show error message for blocked or timed-out patterns
- How are search results updated when the document is edited? Update highlights in real-time as text changes, recalculating match positions
- What happens when switching between documents while a search is active? Preserve the search term but update results for the new document
- How does search behave with very long lines (e.g., minified code)? Truncate display of long lines in find-in-files results but allow full file opening on click
- What happens when binary files or non-text files exist in the search scope? Silently skip binary files; only search text-based files when "All Text Files" filter is selected

## Requirements *(mandatory)*

### Functional Requirements

#### Find in Document (CTRL+F)

- **FR-001**: System MUST display a search bar above the document content when user presses CTRL+F or selects Edit > Find in Document
- **FR-002**: Search bar MUST include: text input field, case sensitivity toggle (default OFF), regex mode toggle (default OFF), result counter showing "N of M", Previous button, Next button, and Close button
- **FR-003**: System MUST highlight all matching text in the document with yellow background in real-time as the user types
- **FR-004**: System MUST display current match count and total match count in format "N of M" in the search bar
- **FR-005**: System MUST navigate to the next match when user clicks Next button or presses F3
- **FR-006**: System MUST navigate to the previous match when user clicks Previous button or presses SHIFT+F3
- **FR-007**: System MUST close the search bar and remove all highlights when user presses ESC or clicks the Close button
- **FR-008**: System MUST mark all match positions on the vertical scrollbar with clickable visual indicators
- **FR-009**: System MUST scroll the document to the clicked match when user clicks a scrollbar marker
- **FR-010**: System MUST perform case-insensitive search by default and case-sensitive search when the toggle is enabled
- **FR-011**: System MUST interpret search terms as regular expressions when regex mode is enabled
- **FR-012**: System MUST validate regex patterns and reject dangerous constructs (excessive nesting, quantifier stacking) that could cause catastrophic backtracking or resource exhaustion
- **FR-013**: System MUST display an error indicator when regex syntax is invalid or contains blocked dangerous constructs
- **FR-014**: System MUST support keyboard shortcuts consistent with standard text editors (F3 for next, SHIFT+F3 for previous, ESC to close)

#### Find in Files (SHIFT+CTRL+F)

- **FR-015**: System MUST open a find-in-files panel when user presses SHIFT+CTRL+F or selects Edit > Find in Files
- **FR-016**: Find-in-files panel MUST replace the file tree/history panel in the UI layout
- **FR-017**: Panel MUST include: text input field, case sensitivity toggle (default OFF), regex mode toggle (default OFF), file type filter, and scope selector
- **FR-018**: File type filter MUST default to "Markdown Files" with option to expand to "All Text Files"
- **FR-019**: Scope selector MUST offer options: "Current Repo - Current Branch", "Current Repo - All Branches", "All Repositories"
- **FR-020**: System MUST search only markdown files (.md, .markdown extensions) by default when user enters a search term
- **FR-021**: System MUST search all text-based files when user selects "All Text Files" filter option
- **FR-022**: System MUST display results grouped hierarchically: repository > folder > file
- **FR-023**: System MUST display match counts at both folder level and file level
- **FR-024**: System MUST show a preview of each matching line with context in the results
- **FR-025**: System MUST open the file and highlight the matched text when user clicks on a search result
- **FR-026**: System MUST display a progress indicator for long-running searches across many files
- **FR-027**: System MUST allow users to cancel in-progress searches
- **FR-028**: System MUST provide a way to return to normal file tree view from the search results panel

#### Search Behavior

- **FR-029**: System MUST update search results in real-time as the user types with 150ms debounce delay to balance responsiveness and performance
- **FR-030**: System MUST wrap search navigation (after last result, go to first result; before first result, go to last result)
- **FR-031**: System MUST preserve search terms when switching between documents but recalculate results for the new context
- **FR-032**: System MUST maintain search history within the current session to allow users to recall previous searches
- **FR-033**: System MUST clear all search history when the application closes (no persistence across sessions)
- **FR-034**: System MUST enforce timeout protection (5 seconds per file) as a fallback safety mechanism for regex execution
- **FR-035**: System MUST handle matches across line boundaries when regex multiline mode is implied

### Key Entities

- **Search Query**: Represents a user's search request including the search term, flags (case sensitivity, regex mode), file type filter (markdown only or all text files), and scope (document or multi-file with branch/repo specification)
- **Search Result**: Represents a single match including the text matched, position (file, line number, character offset), surrounding context for preview, and parent document/file reference
- **Search Scope**: Represents the boundaries of a search operation including repository selection, branch selection (current or all), and file type filtering (markdown files by default, expandable to all text files)
- **Search History**: In-memory collection of previous search queries from the current session, cleared on application close, allowing users to recall recent searches

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can locate specific text in a document within 5 seconds of pressing CTRL+F (excluding time to type search term)
- **SC-002**: Search highlighting and result counting updates in under 200ms for documents up to 10,000 lines
- **SC-003**: All matches in a document are visible through scrollbar markers, allowing instant navigation to any result
- **SC-004**: Users can successfully perform case-sensitive and regex searches with appropriate results returned
- **SC-005**: Multi-file search completes within 10 seconds for repositories containing up to 1,000 markdown files
- **SC-006**: Search results panel displays hierarchical results that allow users to identify relevant files within 3 clicks
- **SC-007**: 95% of searches complete without errors or timeouts
- **SC-008**: Users can cancel long-running searches within 1 second of clicking cancel
- **SC-009**: Search behavior matches user expectations from familiar tools (VS Code, browsers) as measured by usability testing feedback
- **SC-010**: Find-in-files result count accuracy is 100% for all non-regex searches and 99%+ for valid regex patterns

## Assumptions

- Users are familiar with standard search UX patterns from text editors and browsers (CTRL+F, F3/SHIFT+F3 navigation)
- Markdown files are text-based and can be efficiently searched using string matching algorithms
- Repository structures follow standard Git conventions with branches and folders
- Most search queries will return fewer than 1,000 matches per document and 10,000 matches across files
- Performance is acceptable if search operations complete within 10 seconds for typical repositories
- The application already has file system access and can read file contents from repositories
- Users expect incremental search (results update as they type) rather than requiring explicit search execution
- Regex syntax follows JavaScript/ECMAScript standards for consistency with the underlying platform
- Primary use case is searching markdown documentation, so markdown-first filtering improves performance and reduces noise from configuration files, build artifacts, etc.
- Definition of "text files" beyond markdown is intentionally flexible to allow implementation discretion based on platform capabilities and user needs
- 150ms debounce delay provides real-time feel (well under 200ms perceptual threshold) while reducing search operations by ~60% compared to per-keystroke execution
- Session-only search history avoids complexity around persistent storage, privacy concerns, and data cleanup while still providing recall capability during active sessions

## Dependencies

- Requires access to current document content and ability to read from file system for multi-file search
- Requires ability to parse and navigate Git repository structure including branch information
- Requires UI framework support for overlaying search bar, highlighting text, and rendering scrollbar markers
- Requires regex engine capable of handling user-provided patterns safely with timeout protection
- May depend on file indexing or caching mechanisms for acceptable multi-file search performance in large repositories
- Requires integration with Edit menu to add menu items for Find in Document and Find in Files
