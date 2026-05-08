# Research: Export and Copy Features

**Feature**: Export and Copy Features  
**Date**: 2026-01-22  
**Phase**: 0 (Research)

## Overview

This document consolidates research findings for implementing PDF export, mermaid diagram actions, and multi-format text copying in the MarkRead Electron application.

## 1. PDF Generation in Electron

### Decision: Electron's printToPDF API

**Rationale**:
- Native Electron API (`webContents.printToPDF()`) uses Chromium's print-to-PDF engine
- Ensures perfect consistency with rendered content (what you see is what you get)
- No external dependencies required
- Supports print CSS for page breaks and formatting
- Already available in Electron 33.4.11

**Alternatives Considered**:
- **Puppeteer**: Requires additional dependency, essentially wraps same Chromium API
- **Playwright**: Similar to Puppeteer, adds complexity without benefit for embedded use
- **PDFKit/jsPDF**: Requires reconstructing content manually, risk of inconsistency
- **wkhtmltopdf**: External binary, outdated WebKit engine

**Implementation Approach**:
```typescript
// Main process
const pdfBuffer = await win.webContents.printToPDF({
  printBackground: true,
  pageSize: 'A4',
  margins: { top: 1, bottom: 1, left: 1, right: 1 }
});
```

**Best Practices**:
- Use print CSS (`@media print`) to control page breaks
- Set `printBackground: true` to preserve colors and backgrounds
- Handle large documents by streaming to file rather than buffering
- Show progress by monitoring IPC events
- Add print-specific CSS for headers/footers

## 2. Mermaid Diagram Capture

### Decision: html2canvas for PNG, direct SVG extraction for SVG

**Rationale**:
- **html2canvas**: Widely used, mature library for canvas-based capture
  - Can capture rendered mermaid diagrams as PNG
  - Good browser compatibility
  - Handles complex CSS styling
- **SVG extraction**: Mermaid already renders to SVG
  - Can directly serialize SVG DOM element
  - Preserves vector quality
  - No external library needed

**Alternatives Considered**:
- **dom-to-image**: Similar to html2canvas, less maintained
- **Puppeteer screenshot**: Overkill for in-app capture
- **Canvas API directly**: Too low-level, reinventing wheel

**Implementation Approach**:
```typescript
// PNG capture (renderer)
import html2canvas from 'html2canvas';

async function captureDiagramAsPNG(element: HTMLElement): Promise<Blob> {
  const canvas = await html2canvas(element, {
    backgroundColor: null,
    scale: 2 // High DPI
  });
  return new Promise(resolve => canvas.toBlob(resolve!, 'image/png'));
}

// SVG extraction (renderer)
function captureDiagramAsSVG(element: HTMLElement): string {
  const svgElement = element.querySelector('svg');
  if (!svgElement) throw new Error('No SVG found');
  
  const serializer = new XMLSerializer();
  return serializer.serializeToString(svgElement);
}
```

**Best Practices**:
- Set `scale: 2` for html2canvas to improve quality on high-DPI displays
- Include CSS styles inline when extracting SVG for portability
- Use transparent background for PNG to support various paste targets
- Cache captured images briefly to avoid re-capturing on multiple actions

## 3. Multi-Format Clipboard Operations

### Decision: ClipboardItem API with multiple formats

**Rationale**:
- Modern `ClipboardItem` API supports multiple formats simultaneously
- Paste target automatically selects best available format
- Supported in Chromium (Electron's engine)
- Enables rich text, plain text, and HTML in single clipboard operation

**Alternatives Considered**:
- **document.execCommand('copy')**: Deprecated, limited format control
- **Separate clipboard writes**: User must choose format before copy
- **External clipboard library**: Unnecessary complexity

**Implementation Approach**:
```typescript
// Multi-format clipboard write
async function copyAsMultiFormat(
  plain: string,
  html: string,
  markdown: string
): Promise<void> {
  const clipboardItem = new ClipboardItem({
    'text/plain': new Blob([plain], { type: 'text/plain' }),
    'text/html': new Blob([html], { type: 'text/html' }),
    'text/markdown': new Blob([markdown], { type: 'text/markdown' })
  });
  
  await navigator.clipboard.write([clipboardItem]);
}

// Image to clipboard
async function copyImage(blob: Blob): Promise<void> {
  const clipboardItem = new ClipboardItem({
    [blob.type]: blob
  });
  
  await navigator.clipboard.write([clipboardItem]);
}
```

**Format Mapping**:
- **Plain text**: Strip all formatting, use text content only
- **Markdown**: Preserve markdown syntax from source
- **Rich text (HTML)**: Convert rendered HTML with inline CSS
- **PNG**: Use `image/png` MIME type
- **SVG**: Use `image/svg+xml` MIME type (note: limited application support)

**Best Practices**:
- Check `navigator.clipboard` availability before use
- Handle clipboard permission errors gracefully
- Provide fallback for older clipboard APIs if needed
- Test paste behavior in Word, Teams, Outlook, VSCode
- For rich text, include minimal CSS for formatting preservation

## 4. Folder Export with Table of Contents

### Decision: Generate unified HTML, then PDF

**Rationale**:
- Render all markdown files to HTML
- Build HTML document with:
  - Cover page (folder name, date)
  - Table of contents with page number placeholders
  - All documents with consistent styling
- Use Electron's printToPDF with page numbering

**Implementation Approach**:
```typescript
interface FolderExportOptions {
  folderPath: string;
  includeSubfolders: boolean;
  outputPath: string;
}

async function exportFolderToPDF(options: FolderExportOptions): Promise<void> {
  // 1. Collect all markdown files
  const files = await collectMarkdownFiles(options.folderPath, options.includeSubfolders);
  
  // 2. Render each to HTML
  const renderedDocs = await Promise.all(
    files.map(file => renderMarkdownToHTML(file))
  );
  
  // 3. Build combined HTML with TOC
  const html = buildCombinedDocument({
    title: path.basename(options.folderPath),
    date: new Date(),
    documents: renderedDocs
  });
  
  // 4. Load in hidden window and export to PDF
  const win = new BrowserWindow({ show: false });
  await win.loadURL(`data:text/html,${encodeURIComponent(html)}`);
  const pdf = await win.webContents.printToPDF({ /* options */ });
  await fs.writeFile(options.outputPath, pdf);
  win.close();
}
```

**Best Practices**:
- Use hidden BrowserWindow for rendering (avoid flickering)
- Add CSS page breaks between documents
- Generate TOC with anchor links for PDF navigation
- Show progress per-file during export
- Handle missing/corrupted files gracefully
- Limit max documents (50) to prevent memory issues

## 5. Hover Button Implementation

### Decision: CSS-based hover with React state

**Rationale**:
- Pure CSS for hover detection (`:hover` pseudo-class)
- React state for button visibility timing
- Position absolute buttons over diagram container
- Use `onMouseEnter`/`onMouseLeave` for timing control

**Implementation Approach**:
```typescript
function DiagramHoverButtons({ diagramElement }: Props) {
  const [isVisible, setIsVisible] = useState(false);
  const [shouldShow, setShouldShow] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const handleMouseEnter = () => {
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setShouldShow(true), 200);
  };

  const handleMouseLeave = () => {
    clearTimeout(timeoutRef.current);
    setShouldShow(false);
    timeoutRef.current = setTimeout(() => setIsVisible(false), 500);
  };

  useEffect(() => {
    if (shouldShow) setIsVisible(true);
  }, [shouldShow]);

  return (
    <div 
      onMouseEnter={handleMouseEnter} 
      onMouseLeave={handleMouseLeave}
      className="diagram-container"
    >
      {diagramElement}
      {isVisible && (
        <div className="hover-buttons">
          <button onClick={copyAsPNG}>Copy PNG</button>
          <button onClick={copyAsSVG}>Copy SVG</button>
          <button onClick={copyCode}>Copy Code</button>
          <button onClick={download}>Download</button>
          <button onClick={openInTab}>Open Tab</button>
        </div>
      )}
    </div>
  );
}
```

**Best Practices**:
- Use `pointer-events: none` on buttons container to prevent hover gaps
- Add smooth fade transition for appearance
- Clear timeouts on unmount to prevent memory leaks
- Position buttons in top-right corner of diagram
- Use semantic button elements with aria-labels
- Include keyboard navigation support

## 6. Keyboard Shortcuts

### Decision: React event handlers with global shortcuts

**Rationale**:
- Use `onKeyDown` handlers for document-level shortcuts
- Check for `Ctrl+C` and `Ctrl+Shift+C` combinations
- Override default copy behavior when text is selected
- Show format picker on `Ctrl+Shift+C`

**Implementation Approach**:
```typescript
function useCopyShortcuts() {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'c') {
        const selection = window.getSelection();
        if (!selection || selection.isCollapsed) return;

        if (e.shiftKey) {
          e.preventDefault();
          showFormatPicker();
        } else {
          e.preventDefault();
          copyAsRichText(selection);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);
}
```

**Best Practices**:
- Use `e.preventDefault()` to stop default browser copy
- Check for active selection before overriding
- Respect other modifier keys (Alt, Meta)
- Provide visual feedback when copy succeeds
- Handle edge cases (empty selection, cross-element selection)

## 7. Error Handling and Logging

### Decision: Structured logging with error recovery

**Rationale**:
- Use structured JSON logs for export operations
- Store logs in app data directory
- Provide UI to view recent logs
- Implement retry logic for transient failures

**Implementation Approach**:
```typescript
interface ExportLogEntry {
  timestamp: Date;
  operation: 'pdf-export' | 'diagram-copy' | 'text-copy';
  source: string;
  destination?: string;
  status: 'success' | 'error';
  duration: number;
  error?: {
    message: string;
    stack?: string;
  };
}

class ExportLogger {
  private logPath: string;

  async log(entry: ExportLogEntry): Promise<void> {
    const logFile = path.join(this.logPath, 'export.jsonl');
    const line = JSON.stringify(entry) + '\n';
    await fs.appendFile(logFile, line);
  }

  async getRecentLogs(limit: number = 100): Promise<ExportLogEntry[]> {
    // Read last N lines from log file
  }
}
```

**Best Practices**:
- Rotate logs daily or at size threshold (10MB)
- Include full error stack traces for debugging
- Sanitize file paths in logs (remove user-specific portions)
- Provide "Open Logs" button in error dialogs
- Implement exponential backoff for retry attempts
- Show user-friendly error messages with actionable guidance

## 8. Testing Strategy

### Unit Tests
- `PdfExportService`: Mock Electron APIs, test options handling
- `ClipboardService`: Test format conversion logic
- `DiagramCaptureService`: Mock html2canvas, test SVG extraction
- React components: Test hover timing, button interactions

### Integration Tests
- End-to-end PDF export with sample markdown file
- Clipboard operations (may require headless environment setup)
- Error scenarios (permission denied, disk full)

### E2E Tests (Playwright)
- Full export workflow with file dialog
- Hover button interaction on rendered diagram
- Keyboard shortcut handling
- Error dialog display and retry

**Test Data**:
- Sample markdown files with various content (tables, images, diagrams)
- Mermaid diagrams of different types (flowchart, sequence, etc.)
- Large documents (50+ pages) for performance testing

## Summary

All technical decisions are finalized with clear implementation paths. No "NEEDS CLARIFICATION" items remain. Ready to proceed to Phase 1 (Design & Contracts).
