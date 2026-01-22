# Feature Specification: Export and Copy Features

**Feature Branch**: `001-export-copy-features`
**Created**: 2026-01-22
**Status**: Draft
**Input**: User description: "Export to PDF function, Export mermaid diagrams as SVG, Select and copy functionality with multiple formats, Open mermaid in new tab"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Export Current Page to PDF (Priority: P1)

As a user viewing a markdown document, I want to export the current page to PDF so I can share it with colleagues who don't have access to the application or prefer offline reading.

**Why this priority**: PDF export is the most commonly requested feature for document sharing and archival. It delivers immediate value for any document the user is viewing.

**Independent Test**: Can be fully tested by opening any markdown file, clicking export, and verifying the generated PDF matches the rendered content.

**Acceptance Scenarios**:

1. **Given** a user is viewing a markdown document, **When** they click the "Export to PDF" option, **Then** a save dialog appears allowing them to choose the destination and filename
2. **Given** a user has initiated PDF export, **When** the export completes, **Then** the PDF contains the rendered content matching the visual display including formatted text, images, and diagrams
3. **Given** a document contains mermaid diagrams, **When** exported to PDF, **Then** the diagrams appear as rendered images in the PDF

---

### User Story 2 - Copy Mermaid Diagram as Image (Priority: P2)

As a user viewing a document with mermaid diagrams, I want to quickly copy a diagram to my clipboard so I can paste it into presentations, emails, or other documents.

**Why this priority**: Mermaid diagrams are frequently used in documentation and users need to share them in other contexts. Hover buttons provide a frictionless experience.

**Independent Test**: Can be tested by hovering over any mermaid diagram, clicking the copy button, and pasting into another application.

**Acceptance Scenarios**:

1. **Given** a rendered mermaid diagram is visible, **When** the user hovers over it, **Then** action buttons appear (copy as PNG, copy as SVG, copy code, download, open in tab)
2. **Given** hover buttons are visible on a mermaid diagram, **When** the user clicks "Copy as PNG", **Then** the diagram is copied to clipboard as a PNG image that can be pasted elsewhere
3. **Given** hover buttons are visible on a mermaid diagram, **When** the user clicks "Copy as SVG", **Then** the diagram is copied to clipboard as an SVG image that can be pasted elsewhere
4. **Given** hover buttons are visible on a mermaid diagram, **When** the user clicks "Copy Code", **Then** the mermaid source code is copied to clipboard
5. **Given** hover buttons are visible on a mermaid diagram, **When** the user clicks "Download", **Then** the diagram is saved as an SVG file

---

### User Story 3 - Copy Selected Text in Multiple Formats (Priority: P3)

As a user reading a document, I want to select text and copy it in different formats (plain text, markdown, or rich text) so I can paste it appropriately into Teams, Word, or other applications.

**Why this priority**: Users frequently need to share portions of documents. Different target applications require different formats for optimal results.

**Independent Test**: Can be tested by selecting text, using the copy options, and pasting into different applications to verify formatting.

**Acceptance Scenarios**:

1. **Given** a user has selected text in the document, **When** they press Ctrl+C, **Then** the text is copied in rich text format
2. **Given** a user has selected text in the document, **When** they press Ctrl+Shift+C, **Then** a format picker appears showing plain text, markdown, and rich text options
3. **Given** a user has selected text in the document, **When** they right-click, **Then** they see options to copy as plain text, markdown, or rich text
4. **Given** a user copies text as "plain text", **When** they paste into any application, **Then** they get unformatted text content
5. **Given** a user copies text as "markdown", **When** they paste into a markdown-supporting editor, **Then** they get the original markdown syntax
6. **Given** a user copies text as "rich text", **When** they paste into Word or Teams, **Then** they get formatted text with styling preserved

---

### User Story 4 - Export Folder to PDF with Index (Priority: P4)

As a user managing a collection of markdown documents in a folder, I want to export the entire folder as a single PDF with a header page and table of contents so I can create comprehensive documentation packages.

**Why this priority**: Bulk export is valuable for creating documentation bundles but is used less frequently than single-page export.

**Independent Test**: Can be tested by selecting a folder with multiple markdown files and verifying the output PDF contains all documents with proper navigation.

**Acceptance Scenarios**:

1. **Given** a user has a folder selected in the file tree, **When** they choose "Export Folder to PDF", **Then** the system generates a single PDF containing all markdown files in the folder
2. **Given** folder export is initiated, **When** the PDF is generated, **Then** it includes a cover page with the folder name and generation date
3. **Given** folder export is initiated, **When** the PDF is generated, **Then** it includes a table of contents with clickable links to each document section
4. **Given** a folder contains subfolders, **When** exported, **Then** the PDF structure reflects the folder hierarchy

---

### User Story 5 - Export File from File Tree (Priority: P5)

As a user browsing the file tree, I want to export a file to PDF directly from the tree context menu without opening it first.

**Why this priority**: Convenience feature that improves workflow efficiency but not essential for core functionality.

**Independent Test**: Can be tested by right-clicking a file in the tree and selecting export, verifying PDF is created without opening the file.

**Acceptance Scenarios**:

1. **Given** a user right-clicks a markdown file in the file tree, **When** they see the context menu, **Then** an "Export to PDF" option is available
2. **Given** a user selects "Export to PDF" from the file tree context menu, **When** export completes, **Then** the file is exported without being opened in the main view

---

### User Story 6 - Open Mermaid Diagram in New Tab (Priority: P6)

As a user viewing a complex mermaid diagram, I want to open it in a dedicated tab so I can see it at full size and interact with it more easily.

**Why this priority**: Useful for complex diagrams but less critical than export and copy functionality.

**Independent Test**: Can be tested by clicking the open-in-tab button on a diagram and verifying it opens in a dedicated view.

**Acceptance Scenarios**:

1. **Given** a mermaid diagram has hover buttons visible, **When** the user clicks "Open in New Tab", **Then** the diagram opens in a new dedicated tab within the application
2. **Given** a diagram is open in its own tab, **When** the user views it, **Then** the diagram is displayed at a larger size with zoom and pan controls

---

### Edge Cases

- What happens when exporting a very large document to PDF? System shows progress indicator; if memory limits exceeded, displays error dialog with retry option and suggestion to export smaller sections
- How does the system handle mermaid diagrams that fail to render? Show error placeholder in PDF with diagram source; skip in copy operations and notify user via error dialog
- What happens when copying selected text that spans multiple formatting elements? Preserve hierarchy and nesting according to selected format (plain/markdown/rich)
- How does folder export handle non-markdown files? Skip them; optionally log skipped files in export summary
- What happens when clipboard copy fails due to permissions? Show error dialog with specific reason and troubleshooting guidance
- How does the system handle images in documents during PDF export? Embed images inline; for missing images, show placeholder with broken image indicator and continue export
- What happens when PDF export fails? Show error dialog with specific reason, retry button, and option to view detailed logs

## Requirements *(mandatory)*

### Functional Requirements

**PDF Export**
- **FR-001**: System MUST allow users to export the currently viewed document to PDF format
- **FR-002**: System MUST render all document content in the PDF including text, images, code blocks, and diagrams
- **FR-003**: System MUST allow users to export an entire folder of markdown files as a single PDF
- **FR-004**: System MUST generate a cover page for folder exports containing folder name and export date
- **FR-005**: System MUST generate a table of contents with navigation links for folder exports
- **FR-006**: System MUST allow PDF export from the file tree context menu without opening the file
- **FR-007**: System MUST preserve document formatting and styling in exported PDFs

**Mermaid Diagram Actions**
- **FR-008**: System MUST display hover action buttons when user hovers over a rendered mermaid diagram
- **FR-009**: System MUST allow users to copy mermaid diagrams as PNG images to clipboard
- **FR-010**: System MUST allow users to copy mermaid diagrams as SVG images to clipboard
- **FR-011**: System MUST allow users to copy mermaid source code to clipboard
- **FR-012**: System MUST allow users to download mermaid diagrams as SVG files
- **FR-013**: System MUST allow users to open mermaid diagrams in a dedicated full-size tab

**Text Selection and Copy**
- **FR-014**: System MUST allow users to select text within the rendered document
- **FR-015**: System MUST provide option to copy selected text as plain text
- **FR-016**: System MUST provide option to copy selected text as markdown source
- **FR-017**: System MUST provide option to copy selected text as rich formatted text (compatible with Word/Teams)
- **FR-018**: System MUST make copy format options accessible via context menu (right-click)
- **FR-019**: System MUST support Ctrl+C to copy selected text in default format (rich text)
- **FR-020**: System MUST support Ctrl+Shift+C to show format picker for copy operation
- **FR-021**: Default copy format MUST be rich text to preserve formatting in most common paste scenarios

**User Interface**
- **FR-022**: Hover buttons on diagrams MUST appear after 200ms hover delay to prevent accidental triggering
- **FR-023**: Hover buttons MUST remain visible for 500ms after mouse leaves diagram bounds to allow users to reach them
- **FR-024**: System MUST show progress indication for long-running export operations
- **FR-025**: System MUST display success or error feedback after export/copy operations

**Error Handling**
- **FR-026**: System MUST display error dialog with specific reason when PDF export fails
- **FR-027**: Error dialog MUST provide a retry button to attempt export again
- **FR-028**: Error dialog MUST provide option to view detailed logs for troubleshooting
- **FR-029**: System MUST log all export operations with timestamps, file paths, and error details

### Key Entities

- **Document**: A markdown file being viewed or exported; contains text, images, code blocks, and diagrams
- **Mermaid Diagram**: An embedded diagram defined using mermaid syntax; can be rendered, copied, or exported independently
- **Export Job**: Represents an export operation in progress; tracks source, destination, format, and status
- **Clipboard Content**: Data copied to system clipboard; can be plain text, markdown, rich text, or image data

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can export a single document to PDF in under 5 seconds for documents up to 50 pages
- **SC-002**: Users can copy a mermaid diagram to clipboard in under 1 second
- **SC-003**: Hover buttons appear within 200ms of hovering over a diagram
- **SC-004**: 95% of users can successfully complete their first export operation without assistance
- **SC-005**: Exported PDFs maintain visual fidelity with less than 5% deviation from screen rendering
- **SC-006**: Rich text copied from the application pastes correctly in Microsoft Word and Teams
- **SC-007**: Folder export with table of contents completes within 30 seconds for folders with up to 50 documents
- **SC-008**: Users report 80% or higher satisfaction with export quality in user testing

## Clarifications

### Session 2026-01-22

- Q: Which PDF generation technology should be used? → A: Use Chromium's built-in print-to-PDF API (Puppeteer/Playwright or direct DevTools Protocol)
- Q: What should the hover button interaction behavior be? → A: Buttons appear after 200ms hover delay, remain visible for 500ms after mouse leaves diagram
- Q: What clipboard image format should be used for mermaid diagrams? → A: Both - separate buttons for PNG and SVG copy options
- Q: How should the system handle failed PDF export? → A: Show error dialog with reason, retry button, and option to view logs
- Q: What keyboard shortcuts should be used for copy operations? → A: Ctrl+C (default format), Ctrl+Shift+C (show format picker), context menu available

## Technical Constraints

- **TC-001**: PDF generation MUST use Chromium's built-in print-to-PDF API via Electron's DevTools Protocol or Puppeteer/Playwright integration
- **TC-002**: PDF generation MUST leverage existing WebView2/Chromium rendering infrastructure to ensure consistency between screen display and exported output

## Assumptions

- Users have appropriate file system permissions to save exported files
- The system clipboard API is available and not restricted by OS security settings
- Mermaid diagrams render correctly before export/copy operations are attempted
- Target PDF readers support the standard PDF format generated
- Rich text clipboard format is compatible with common applications (Word, Teams, Outlook)
- Documents being exported fit within reasonable memory constraints (under 100MB rendered)
