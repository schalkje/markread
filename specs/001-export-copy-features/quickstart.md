# Quickstart: Export and Copy Features

**Last Updated**: 2026-01-22  
**For**: Developers implementing export and copy functionality

## Overview

This guide helps you implement export and copy features in MarkRead. Follow the phases in order for systematic implementation.

## Prerequisites

- Node.js 18+ and npm
- Electron development environment set up
- Familiarity with TypeScript and React
- MarkRead repository cloned and dependencies installed

## Development Setup

### Install Additional Dependencies

```bash
npm install html2canvas --save
npm install @types/html2canvas --save-dev
```

### Project Structure

```
src/
├── main/services/export/    # PDF export services (main process)
├── renderer/services/        # Clipboard services (renderer)
├── renderer/components/      # UI components
├── renderer/hooks/           # React hooks
├── preload/                  # IPC bridge
└── shared/types/             # Shared TypeScript types
```

## Implementation Phases

### Phase 1: PDF Export (Main Process)

**Goal**: Implement single document PDF export using Electron's printToPDF API.

#### Step 1.1: Create Export Service

Create `src/main/services/export/PdfExportService.ts`:

```typescript
import { BrowserWindow } from 'electron';
import * as fs from 'fs/promises';

export class PdfExportService {
  async exportToPdf(
    source: string,
    destination: string,
    options: ExportOptions
  ): Promise<ExportJob> {
    // 1. Create hidden window
    const win = new BrowserWindow({ show: false, webPreferences: { offscreen: true } });
    
    // 2. Load markdown file (rendered as HTML)
    await win.loadFile(source);
    
    // 3. Generate PDF
    const pdf = await win.webContents.printToPDF({
      pageSize: options.pageSize,
      printBackground: options.printBackground,
      margins: options.margins
    });
    
    // 4. Save to file
    await fs.writeFile(destination, pdf);
    
    // 5. Clean up
    win.close();
    
    return { jobId: generateUUID(), status: 'completed' };
  }
}
```

#### Step 1.2: Add IPC Handlers

Create `src/main/services/ipc/exportHandlers.ts`:

```typescript
import { ipcMain } from 'electron';
import { PdfExportService } from '../export/PdfExportService';

const exportService = new PdfExportService();

export function registerExportHandlers() {
  ipcMain.handle('export:pdf:single', async (event, request) => {
    try {
      return await exportService.exportToPdf(
        request.source,
        request.destination,
        request.options
      );
    } catch (error) {
      throw new ExportError('EXPORT_FAILED', error.message);
    }
  });
}
```

#### Step 1.3: Create Preload Bridge

Create/update `src/preload/exportApi.ts`:

```typescript
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('exportApi', {
  exportToPdf: (source: string, destination: string, options: ExportOptions) =>
    ipcRenderer.invoke('export:pdf:single', { source, destination, options }),
});
```

#### Step 1.4: Test

```typescript
// tests/unit/services/PdfExportService.test.ts
describe('PdfExportService', () => {
  it('should export markdown to PDF', async () => {
    const service = new PdfExportService();
    const result = await service.exportToPdf(
      'test.md',
      'output.pdf',
      { pageSize: 'A4', printBackground: true, margins: { top: 1, bottom: 1, left: 1, right: 1 } }
    );
    expect(result.status).toBe('completed');
  });
});
```

---

### Phase 2: Clipboard Operations (Renderer)

**Goal**: Implement multi-format text copying with keyboard shortcuts.

#### Step 2.1: Create Clipboard Service

Create `src/renderer/services/ClipboardService.ts`:

```typescript
export class ClipboardService {
  async copyText(content: TextClipboardContent): Promise<void> {
    if (!content.plainText) {
      throw new ClipboardError('INVALID_DATA', 'Plain text required');
    }

    const formats: Record<string, Blob> = {
      'text/plain': new Blob([content.plainText], { type: 'text/plain' })
    };

    if (content.htmlText) {
      formats['text/html'] = new Blob([content.htmlText], { type: 'text/html' });
    }

    if (content.markdownText) {
      formats['text/markdown'] = new Blob([content.markdownText], { type: 'text/markdown' });
    }

    const clipboardItem = new ClipboardItem(formats);
    await navigator.clipboard.write([clipboardItem]);
  }

  canCopy(): boolean {
    return typeof navigator.clipboard !== 'undefined';
  }
}
```

#### Step 2.2: Create Copy Shortcuts Hook

Create `src/renderer/hooks/useCopyShortcuts.ts`:

```typescript
import { useEffect } from 'react';
import { ClipboardService } from '../services/ClipboardService';

export function useCopyShortcuts() {
  const clipboardService = new ClipboardService();

  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'c') {
        const selection = window.getSelection();
        if (!selection || selection.isCollapsed) return;

        e.preventDefault();

        if (e.shiftKey) {
          // Show format picker
          showFormatPicker(selection);
        } else {
          // Copy as rich text
          await copyAsRichText(selection, clipboardService);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);
}
```

#### Step 2.3: Add Context Menu

Create `src/renderer/components/CopyContextMenu.tsx`:

```typescript
export function CopyContextMenu({ selection }: Props) {
  const clipboardService = new ClipboardService();

  return (
    <ContextMenu>
      <MenuItem onClick={() => copyAsPlainText(selection, clipboardService)}>
        Copy as Plain Text
      </MenuItem>
      <MenuItem onClick={() => copyAsMarkdown(selection, clipboardService)}>
        Copy as Markdown
      </MenuItem>
      <MenuItem onClick={() => copyAsRichText(selection, clipboardService)}>
        Copy as Rich Text
      </MenuItem>
    </ContextMenu>
  );
}
```

---

### Phase 3: Mermaid Diagram Actions

**Goal**: Add hover buttons for diagram copy/download/open actions.

#### Step 3.1: Create Diagram Capture Service

Create `src/renderer/services/DiagramCaptureService.ts`:

```typescript
import html2canvas from 'html2canvas';

export class DiagramCaptureService {
  async captureAsPNG(element: HTMLElement): Promise<Blob> {
    const canvas = await html2canvas(element, {
      backgroundColor: null,
      scale: 2
    });

    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob!), 'image/png');
    });
  }

  captureAsSVG(element: HTMLElement): string {
    const svgElement = element.querySelector('svg');
    if (!svgElement) throw new Error('No SVG found');

    const serializer = new XMLSerializer();
    return serializer.serializeToString(svgElement);
  }

  extractMermaidCode(element: HTMLElement): string {
    // Extract from data attribute or parse from element
    return element.dataset.mermaidSource || '';
  }
}
```

#### Step 3.2: Create Hover Buttons Component

Create `src/renderer/components/DiagramHoverButtons.tsx`:

```typescript
export function DiagramHoverButtons({ diagramElement }: Props) {
  const [isVisible, setIsVisible] = useState(false);
  const [shouldShow, setShouldShow] = useState(false);
  const captureService = new DiagramCaptureService();
  const clipboardService = new ClipboardService();

  const handleMouseEnter = () => {
    setTimeout(() => setShouldShow(true), 200);
  };

  const handleMouseLeave = () => {
    setShouldShow(false);
    setTimeout(() => setIsVisible(false), 500);
  };

  useEffect(() => {
    if (shouldShow) setIsVisible(true);
  }, [shouldShow]);

  const copyAsPNG = async () => {
    const blob = await captureService.captureAsPNG(diagramElement);
    await clipboardService.copyImage({ imageBlob: blob, format: 'png' });
    showToast('Copied as PNG');
  };

  const copyAsSVG = async () => {
    const svg = captureService.captureAsSVG(diagramElement);
    await clipboardService.copyText({ plainText: svg });
    showToast('Copied as SVG');
  };

  return (
    <div onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      {diagramElement}
      {isVisible && (
        <div className="hover-buttons">
          <button onClick={copyAsPNG}>PNG</button>
          <button onClick={copyAsSVG}>SVG</button>
          <button onClick={copyCode}>Code</button>
          <button onClick={download}>Download</button>
          <button onClick={openInTab}>Open</button>
        </div>
      )}
    </div>
  );
}
```

---

### Phase 4: Folder Export

**Goal**: Export entire folders with table of contents.

#### Step 4.1: Create Folder Export Service

Create `src/main/services/export/FolderExportService.ts`:

```typescript
export class FolderExportService {
  async exportFolderToPdf(
    folderPath: string,
    destination: string,
    options: FolderExportOptions
  ): Promise<ExportJob> {
    // 1. Collect markdown files
    const files = await this.collectMarkdownFiles(folderPath, options.includeSubfolders);

    // 2. Render each to HTML
    const renderedDocs = await Promise.all(
      files.map(file => this.renderMarkdown(file))
    );

    // 3. Build combined document with TOC
    const html = this.buildCombinedDocument({
      title: path.basename(folderPath),
      date: new Date(),
      documents: renderedDocs
    });

    // 4. Export to PDF
    const win = new BrowserWindow({ show: false });
    await win.loadURL(`data:text/html,${encodeURIComponent(html)}`);
    const pdf = await win.webContents.printToPDF(options);
    await fs.writeFile(destination, pdf);
    win.close();

    return { jobId: generateUUID(), status: 'completed' };
  }

  private buildCombinedDocument(data: CombinedDocumentData): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            @page { margin: 1cm; }
            .cover-page { page-break-after: always; }
            .toc { page-break-after: always; }
            .document { page-break-after: always; }
          </style>
        </head>
        <body>
          <div class="cover-page">
            <h1>${data.title}</h1>
            <p>${data.date.toISOString().split('T')[0]}</p>
          </div>
          <div class="toc">
            <h2>Table of Contents</h2>
            ${this.buildTOC(data.documents)}
          </div>
          ${data.documents.map(doc => `
            <div class="document">
              <h1 id="${doc.id}">${doc.title}</h1>
              ${doc.html}
            </div>
          `).join('')}
        </body>
      </html>
    `;
  }
}
```

---

### Phase 5: Progress & Error Handling

**Goal**: Show progress indicators and handle errors gracefully.

#### Step 5.1: Progress Events

Update export service to emit progress:

```typescript
export class PdfExportService extends EventEmitter {
  async exportToPdf(/* ... */): Promise<ExportJob> {
    this.emit('progress', { percentComplete: 0 });
    
    // ... PDF generation ...
    
    this.emit('progress', { percentComplete: 50 });
    
    // ... Save file ...
    
    this.emit('progress', { percentComplete: 100 });
  }
}
```

#### Step 5.2: Error Dialog Component

Create `src/renderer/components/ErrorDialog.tsx`:

```typescript
export function ErrorDialog({ error, onRetry, onViewLogs }: Props) {
  return (
    <Dialog>
      <h2>Export Failed</h2>
      <p>{error.message}</p>
      {error.retryable && (
        <button onClick={onRetry}>Retry</button>
      )}
      <button onClick={onViewLogs}>View Logs</button>
      <button onClick={onClose}>Close</button>
    </Dialog>
  );
}
```

---

## Testing Your Implementation

### Manual Testing Checklist

- [ ] Single document PDF export works
- [ ] Folder PDF export includes TOC and cover page
- [ ] Ctrl+C copies text as rich text
- [ ] Ctrl+Shift+C shows format picker
- [ ] Hover over diagram shows buttons after 200ms
- [ ] Buttons stay visible 500ms after mouse leaves
- [ ] Copy PNG button copies diagram to clipboard
- [ ] Copy SVG button copies diagram as SVG
- [ ] Paste in Word preserves formatting
- [ ] Paste in VSCode shows plain text
- [ ] Error dialog shows on failed export
- [ ] Retry button works for retryable errors

### Automated Tests

```bash
# Unit tests
npm run test:unit

# E2E tests
npm run test:e2e
```

---

## Common Issues & Solutions

### Issue: Clipboard permission denied

**Solution**: Ensure operations are triggered by user gesture (click/keypress). Check browser console for permission prompts.

### Issue: PDF export timeout

**Solution**: Large documents may exceed timeout. Increase timeout in service or split document.

### Issue: Hover buttons don't appear

**Solution**: Check z-index, ensure `pointer-events` are correct, verify timeouts are firing.

### Issue: SVG clipboard not working

**Solution**: SVG clipboard support is limited. Use PNG for wider compatibility.

---

## Next Steps

1. Implement Phase 1 (PDF Export)
2. Test manually and add unit tests
3. Proceed to Phase 2 (Clipboard)
4. Continue through remaining phases
5. Run full test suite
6. Update documentation

## Reference Documentation

- [Export API Contract](contracts/export-api.md)
- [Clipboard API Contract](contracts/clipboard-api.md)
- [Data Model](data-model.md)
- [Research](research.md)

## Support

For questions or issues, consult:
- Feature spec: `specs/001-export-copy-features/spec.md`
- Implementation plan: `specs/001-export-copy-features/plan.md`
- Constitution: `.specify/memory/constitution.md`
