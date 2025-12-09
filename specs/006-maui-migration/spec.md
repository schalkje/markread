# Feature Specification: Migrate MarkRead to .NET MAUI

**Feature Branch**: `006-maui-migration`  
**Created**: 2025-12-09  
**Status**: Draft  
**Input**: User description: "WPF is not working for this app, The UI is very clunky. Reimplement the entire app as a dotnet MAUI application, following the best practices to make a real modern app"

## Clarifications

### Session 2025-12-09

- Q: Which design system should guide the UI implementation? → A: Hybrid approach - Fluent on Windows, Material elsewhere
- Q: Should there be a maximum number of open tabs? → A: Soft limit with warning - warn at 20+ tabs but allow continuation
- Q: How should the application handle crash recovery? → A: Auto-restore with prompt - ask user to restore previous session
- Q: How should file permission errors be communicated to users? → A: Show inline warning icon next to inaccessible folders in tree
- Q: What observability approach should be implemented? → A: Local logging only - file-based logs for diagnostics, no telemetry

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Core Document Viewing (Priority: P1)

Users open a markdown file or folder and view beautifully rendered content with smooth scrolling, modern typography, and responsive layout that adapts to window resizing.

**Why this priority**: This is the fundamental value proposition of MarkRead. Without excellent document viewing, the application has no purpose. Users are currently frustrated with WPF's clunky UI, making this the most critical improvement.

**Independent Test**: Can be fully tested by opening any markdown file and verifying smooth rendering, scrolling, and window resizing. Delivers immediate value as a standalone markdown viewer.

**Acceptance Scenarios**:

1. **Given** a markdown file with text, code blocks, and images, **When** user opens the file, **Then** content renders with modern typography, proper spacing, and smooth animations
2. **Given** the application window, **When** user resizes the window, **Then** content reflows smoothly without layout jank or flickering
3. **Given** a long markdown document, **When** user scrolls, **Then** scrolling is fluid with 60+ FPS and modern momentum/inertia effects
4. **Given** code blocks with syntax highlighting, **When** user views the code, **Then** highlighting is crisp with modern color schemes
5. **Given** embedded images, **When** images load, **Then** they display with proper aspect ratios and modern image rendering

---

### User Story 2 - Modern File Navigation (Priority: P1)

Users browse and navigate their markdown documentation using an intuitive, responsive file tree with smooth animations, instant search, and modern visual feedback.

**Why this priority**: Navigation is the second core feature after viewing. The WPF tree view is clunky and outdated. Modern users expect instant feedback, smooth animations, and responsive interactions.

**Independent Test**: Can be fully tested by opening a folder with nested markdown files, verifying tree navigation, expansion/collapse animations, and search functionality.

**Acceptance Scenarios**:

1. **Given** a folder with nested markdown files, **When** user opens the folder, **Then** file tree loads with smooth fade-in animation and modern visual hierarchy
2. **Given** the file tree, **When** user clicks a folder to expand/collapse, **Then** animation is smooth with easing curves (not instant or jerky)
3. **Given** the file tree, **When** user starts typing, **Then** tree filters instantly with highlighted matches and smooth transitions
4. **Given** a file in the tree, **When** user hovers over it, **Then** modern hover effects appear (subtle background change, smooth transition)
5. **Given** the file tree sidebar, **When** user drags the splitter, **Then** resizing is smooth and responsive with live preview

---

### User Story 3 - Fluid Tab Management (Priority: P2)

Users work with multiple documents simultaneously using a modern tab interface with smooth transitions, drag-to-reorder, and visual feedback that feels native to modern applications.

**Why this priority**: Multiple document support is essential for comparing documentation or working across files. Current WPF tabs feel outdated compared to modern applications like VS Code or web browsers.

**Independent Test**: Can be tested by opening multiple files in tabs, verifying tab switching animations, drag-drop reordering, and close interactions.

**Acceptance Scenarios**:

1. **Given** multiple open documents, **When** user switches tabs, **Then** transition is instant with smooth content fade-in (no white flash)
2. **Given** multiple tabs, **When** user drags a tab to reorder, **Then** tabs smoothly reposition with animated transitions
3. **Given** a tab, **When** user hovers over the close button, **Then** modern hover effects appear with proper touch target sizing
4. **Given** many open tabs, **When** tabs overflow the tab bar, **Then** modern overflow handling appears (scrollable or dropdown) with smooth scrolling
5. **Given** a tab, **When** user middle-clicks or Ctrl+W, **Then** tab closes with smooth fade-out animation

---

### User Story 4 - Modern Theme System (Priority: P2)

Users switch between light and dark themes with instant, flicker-free transitions and enjoy a cohesive visual design that follows modern UI guidelines.

**Why this priority**: Theme support exists in WPF but feels dated. Modern applications have sophisticated theme systems with smooth transitions and attention to detail. This significantly impacts user perception of quality.

**Independent Test**: Can be tested by toggling themes and verifying instant transitions, proper color contrast, and modern visual design across all UI elements.

**Acceptance Scenarios**:

1. **Given** the application in light mode, **When** user switches to dark mode, **Then** all UI elements transition instantly without flicker or white flash
2. **Given** dark mode, **When** user views markdown content, **Then** colors have proper contrast ratios for accessibility (WCAG AA minimum)
3. **Given** any theme, **When** user views code blocks, **Then** syntax highlighting colors are optimized for that theme
4. **Given** the application, **When** system theme changes, **Then** application theme updates automatically if set to "system default"
5. **Given** themed UI elements, **When** rendered, **Then** modern design language is consistent (rounded corners, proper shadows, modern colors)

---

### User Story 5 - Responsive Touch & Gestures (Priority: P3)

Users with touch-enabled devices interact naturally with pinch-to-zoom, swipe navigation, and properly sized touch targets throughout the application.

**Why this priority**: MAUI enables touch support that WPF lacks. While not critical for MVP, modern applications should support touch interactions, especially as Windows devices increasingly include touch screens.

**Independent Test**: Can be tested on a touch-enabled device by verifying pinch-to-zoom, swipe gestures, and touch target sizes across the UI.

**Acceptance Scenarios**:

1. **Given** a markdown document on a touch device, **When** user pinches to zoom, **Then** content scales smoothly with natural inertia
2. **Given** the file tree on a touch device, **When** user swipes, **Then** tree scrolls with momentum and edge bounce effects
3. **Given** tabs on a touch device, **When** user swipes left/right, **Then** navigate to previous/next tab with animated transition
4. **Given** any interactive element, **When** viewed on touch device, **Then** touch targets are minimum 44x44 pixels (Apple HIG standard)
5. **Given** sidebar splitter on touch device, **When** user drags with finger, **Then** resizing is smooth and responsive to touch

---

### User Story 6 - Smooth Link Navigation (Priority: P2)

Users click links within documents and experience instant, smooth navigation with modern loading states and back/forward transitions.

**Why this priority**: Link navigation is core to documentation browsing. Current WPF implementation may feel sluggish. Modern applications show loading states and smooth transitions.

**Independent Test**: Can be tested by clicking internal links and verifying smooth transitions, loading states, and back/forward navigation.

**Acceptance Scenarios**:

1. **Given** a link in a markdown document, **When** user clicks it, **Then** navigation happens instantly with smooth content transition
2. **Given** a slow-loading document, **When** navigating to it, **Then** modern loading indicator appears (spinner or skeleton screen)
3. **Given** navigation history, **When** user clicks back/forward, **Then** content animates in the appropriate direction (slide left/right)
4. **Given** an external link, **When** user clicks it, **Then** modern confirmation dialog appears before opening in browser
5. **Given** a link hover state, **When** user hovers, **Then** modern tooltip appears showing target path with smooth fade-in

---

### User Story 7 - Modern Search Experience (Priority: P3)

Users search within documents with an inline, modern search UI featuring smooth animations, highlighted results, and keyboard navigation.

**Why this priority**: Search (Ctrl+F) is important but not critical for MVP. Modern search UIs are more discoverable and pleasant to use than traditional find dialogs.

**Independent Test**: Can be tested by opening search (Ctrl+F) and verifying modern UI, highlighting, and keyboard navigation through results.

**Acceptance Scenarios**:

1. **Given** a document, **When** user presses Ctrl+F, **Then** modern inline search bar appears with smooth slide-down animation
2. **Given** search bar with query, **When** matches are found, **Then** results highlight with modern color and smooth transitions
3. **Given** multiple search results, **When** user presses Enter/Shift+Enter, **Then** navigate between results with smooth scrolling
4. **Given** search bar open, **When** user presses Escape, **Then** search bar closes with smooth animation and highlights fade out
5. **Given** search in progress, **When** typing query, **Then** results update in real-time without lag or jank

---

### User Story 8 - Settings & Preferences UI (Priority: P3)

Users access and modify application settings through a modern, native settings interface with clear organization and instant feedback.

**Why this priority**: Settings are important for customization but not critical for core functionality. Modern settings UIs significantly improve user experience and application feel.

**Independent Test**: Can be tested by opening settings and verifying modern UI, clear organization, and instant preview of changes.

**Acceptance Scenarios**:

1. **Given** the application, **When** user opens settings, **Then** modern settings window appears with clear sections and modern controls
2. **Given** theme setting, **When** user changes theme, **Then** preview updates instantly showing the new theme
3. **Given** settings window, **When** user navigates sections, **Then** transitions are smooth with modern animations
4. **Given** a setting change, **When** user modifies it, **Then** change applies immediately without requiring restart
5. **Given** settings UI, **When** rendered, **Then** follows platform guidelines for proper control sizing and spacing

---

### Edge Cases

- What happens when markdown file is extremely large (10MB+)? Should load progressively with modern virtualization
- How does application handle markdown with malformed syntax? Should gracefully render what's possible without crashes
- What happens when file tree has 10,000+ files? Should use virtualization and lazy-loading for performance
- What happens when folders lack read permissions? Should show inline warning icon in tree with tooltip explaining access denial
- How does touch interaction work on non-touch devices? Should degrade gracefully to mouse-only
- What happens when user rapidly switches between many tabs? Should handle without memory leaks or performance degradation
- What happens when user opens more than 20 tabs? Should display warning about potential performance impact but allow continuation
- How does application handle very fast file system changes (100+ files changed)? Should debounce and batch updates
- What happens when resizing window to minimum size? Should maintain usability with responsive layout, not break UI
- How does application handle high-DPI displays? MAUI should handle automatically with proper DPI scaling
- What happens when system theme changes while application is running? Should update immediately if using system theme
- How does application handle concurrent tab operations (e.g., close multiple tabs rapidly)? Should remain stable without race conditions

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Application MUST render markdown content with smooth scrolling at 60+ FPS on typical hardware
- **FR-002**: Application MUST provide a file tree navigation that loads and displays folder hierarchies with modern animations
- **FR-003**: Application MUST support multiple document tabs with smooth tab switching and content transitions
- **FR-004**: Application MUST support light and dark themes with instant, flicker-free transitions
- **FR-005**: Application MUST respond to all user interactions (clicks, hovers, typing) within 100ms
- **FR-006**: Application MUST support window resizing with smooth, responsive layout adjustments
- **FR-007**: Application MUST render code blocks with modern syntax highlighting optimized for each theme
- **FR-008**: Application MUST handle touch gestures on touch-enabled devices (pinch-to-zoom, swipe)
- **FR-009**: Application MUST provide modern visual feedback for all interactive elements (hover, active, disabled states)
- **FR-010**: Application MUST use modern UI patterns (rounded corners, subtle shadows, proper spacing, modern typography)
- **FR-011**: Application MUST support keyboard shortcuts matching current WPF implementation
- **FR-012**: Application MUST handle file system changes and update the file tree in real-time
- **FR-013**: Application MUST render images with modern loading states and proper aspect ratios
- **FR-014**: Application MUST support Mermaid diagrams with modern rendering quality
- **FR-015**: Application MUST maintain navigation history with smooth back/forward transitions
- **FR-016**: Application MUST provide inline search (Ctrl+F) with modern UI and smooth result highlighting
- **FR-017**: Application MUST persist user preferences (theme, window size, tree visibility) across sessions
- **FR-018**: Application MUST support all markdown features from current WPF implementation (GFM, tables, task lists, etc.)
- **FR-019**: Application MUST handle external links with modern confirmation dialogs before opening
- **FR-020**: Application MUST support drag-to-reorder for tabs with smooth animated transitions
- **FR-021**: Application MUST follow MAUI best practices for MVVM architecture and data binding
- **FR-022**: Application MUST be responsive on high-DPI displays with proper scaling
- **FR-023**: Application MUST provide modern loading indicators for slow operations
- **FR-024**: Application MUST handle errors gracefully with user-friendly modern dialogs
- **FR-025**: Application MUST support accessibility features (keyboard navigation, screen reader compatibility)
- **FR-026**: Application MUST display a warning dialog when user attempts to open more than 20 tabs, informing about potential performance impact while allowing continuation
- **FR-027**: Application MUST persist session state (open tabs, scroll positions, window state) continuously during normal operation
- **FR-028**: Application MUST detect abnormal termination on next startup and prompt user to restore previous session with options to restore or start fresh
- **FR-029**: Application MUST display inline warning icon next to folders in the file tree that are inaccessible due to permission errors, with tooltip showing error details on hover
- **FR-030**: Application MUST write diagnostic logs to local file system including errors, warnings, and key application events for troubleshooting
- **FR-031**: Application MUST implement log rotation to prevent unbounded log file growth (maximum 10MB per log file, keep last 5 files)
- **FR-032**: Application MUST NOT collect or transmit any telemetry, usage analytics, or user data to external services

### Key Entities

- **Document**: Represents an open markdown file with content, rendering state, scroll position, and metadata
- **FileTreeNode**: Represents a file or folder in the navigation tree with path, name, type, and children
- **Tab**: Represents an open document tab with title, document reference, and UI state
- **Theme**: Represents visual theme configuration with colors, typography, and spacing values
- **NavigationHistory**: Represents back/forward navigation history with document stack and current position
- **Settings**: Represents user preferences including theme choice, default behaviors, and UI state
- **SearchState**: Represents current search context with query, results, current match index, and highlight positions
- **SessionState**: Represents recoverable application state including all open tabs, scroll positions, window dimensions, and active tab index for crash recovery

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can scroll through markdown documents at 60+ FPS on hardware with Intel i5 or equivalent
- **SC-002**: Tab switching completes with visible transition in under 100ms
- **SC-003**: File tree expansion/collapse animations complete in 200-300ms with smooth easing
- **SC-004**: Theme switching applies to all UI elements in under 50ms without visible flicker
- **SC-005**: Touch targets throughout the application are minimum 44x44 pixels on touch-enabled devices
- **SC-006**: Application startup time is under 1 second on typical hardware with SSD
- **SC-007**: Window resizing maintains 60 FPS performance without layout jank
- **SC-008**: Search highlighting updates in under 50ms as user types
- **SC-009**: File tree with 1,000+ files loads initial view in under 2 seconds
- **SC-010**: All interactive elements respond to user input within 100ms (visual feedback appears)
- **SC-011**: Application memory usage remains stable (no leaks) when opening/closing 100+ tabs in sequence
- **SC-012**: Pinch-to-zoom on touch devices scales content smoothly at 60 FPS
- **SC-013**: Document content reflow on window resize completes within 100ms
- **SC-014**: Users report "modern and smooth" UI in usability testing (80%+ positive feedback)
- **SC-015**: Application passes WCAG 2.1 AA contrast requirements for all theme color combinations

## Assumptions

1. **Target Platform**: Windows 10/11 remains the primary platform; MAUI's cross-platform capabilities are a bonus but not required for MVP
2. **Rendering Engine**: MAUI WebView (or equivalent modern web control) will be used for markdown rendering, similar to current WebView2 approach
3. **Performance Baseline**: "Typical hardware" defined as Intel i5 (8th gen+) or equivalent with 8GB RAM and SSD
4. **Modern UI Standards**: Using hybrid design approach - Fluent Design on Windows for native feel, Material Design 3 for other platforms if cross-platform support is added
5. **Touch Support**: Touch gesture support is optional for MVP but should be architecturally planned for
6. **Migration Approach**: Complete rebuild from scratch, not incremental migration or code reuse
7. **Existing Functionality**: All current WPF features must be preserved or improved, no feature regression
8. **Code Reuse**: No code reuse from WPF implementation; existing code serves only as functional reference for feature completeness
9. **Testing Strategy**: Automated UI testing will use MAUI's testing frameworks rather than WPF-specific tools
10. **Package Management**: Continue using same markdown libraries (Markdig) and web assets (highlight.js, Mermaid) where possible

## Out of Scope

- Cross-platform distribution for macOS, Linux, iOS, or Android in initial release
- Markdown editing capabilities (viewer-only remains the focus)
- Cloud synchronization or online features
- Telemetry, usage analytics, or any data transmission to external services
- Plugin or extension system
- Advanced document annotations or commenting
- Multi-window support (single main window with tabs)
- Command-line interface changes (maintain current CLI compatibility)
- MSI installer changes (should work with existing WiX-based installer)
- Significant changes to file format or settings storage structure

## Dependencies

- Migration to .NET MAUI framework
- MAUI WebView control or equivalent for rendering HTML content
- Existing markdown processing libraries (Markdig) compatibility with MAUI
- Existing web assets (highlight.js, Mermaid) compatibility with MAUI WebView
- WiX installer compatibility with MAUI output structure
- Testing on Windows 10 and Windows 11 with various hardware configurations
- Accessibility testing tools compatible with MAUI applications
- Touch-enabled device for testing touch gestures and interactions

## Risks

- **MAUI Maturity**: MAUI is newer than WPF; may have undiscovered bugs or limitations
- **WebView Compatibility**: MAUI WebView may have differences from WebView2 affecting rendering
- **Performance**: Need to validate MAUI can match or exceed WPF performance for this use case
- **Learning Curve**: Team familiarity with MAUI may be lower than WPF
- **Third-party Libraries**: Some WPF-specific libraries may not have MAUI equivalents
- **Migration Effort**: Full rewrite is high-risk; comprehensive testing required
- **Breaking Changes**: MAUI framework updates could introduce breaking changes during development
- **Deployment**: MSI packaging for MAUI may have different requirements than WPF

## Notes

- This is a significant architectural change requiring careful planning and extensive testing
- Consider creating a feature branch with early MAUI prototype to validate approach before full migration
- Prioritize maintaining feature parity while improving UI/UX quality
- User testing throughout development is critical to ensure "modern" UI actually improves user experience
- Performance benchmarking against current WPF version should be continuous throughout development
- Consider running WPF and MAUI versions in parallel during transition period
- Documentation for developers should include MAUI best practices and migration learnings
