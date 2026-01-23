/**
 * FolderExportService
 * Tasks: T061-T067
 * Handles exporting an entire folder of markdown files to a single PDF
 * with cover page, table of contents, and page breaks between documents
 */

import { BrowserWindow } from 'electron';
import { EventEmitter } from 'events';
import * as fs from 'fs/promises';
import * as path from 'path';
import crypto from 'crypto';
import MarkdownIt from 'markdown-it';
import type {
  ExportJob,
  FolderExportOptions,
  ExportError,
  MarkdownFile,
  TOCEntry,
} from '../../../shared/types/export';
import { ExportErrorCode } from '../../../shared/types/export';
import { getExportLogger } from './ExportLogger';
import { getExportSettingsStore } from './ExportSettingsStore';

// Maximum number of documents in a single folder export
const MAX_DOCUMENTS = 50;

export class FolderExportService extends EventEmitter {
  private md: MarkdownIt;
  private activeJobs: Map<string, ExportJob> = new Map();

  constructor() {
    super();
    this.md = new MarkdownIt({
      html: true,
      linkify: true,
      typographer: true,
    });
  }

  /**
   * T061: Export a folder of markdown files to a single PDF
   */
  async exportFolderToPdf(
    folderPath: string,
    destination: string,
    options: Partial<FolderExportOptions> = {}
  ): Promise<ExportJob> {
    const settingsStore = getExportSettingsStore();
    const defaults = settingsStore.getSettings();

    const mergedOptions: FolderExportOptions = {
      pageSize: options.pageSize || defaults.defaultPageSize,
      margins: options.margins || defaults.defaultMargins,
      printBackground: options.printBackground ?? defaults.printBackground,
      includeSubfolders: options.includeSubfolders ?? defaults.includeSubfoldersDefault,
      generateTOC: options.generateTOC ?? true,
      coverPage: options.coverPage,
    };

    // Create job
    const job: ExportJob = {
      id: crypto.randomUUID(),
      type: 'folder-pdf',
      status: 'pending',
      source: folderPath,
      destination,
      options: mergedOptions,
      progress: {
        filesProcessed: 0,
        totalFiles: 0,
        percentComplete: 0,
      },
      createdAt: new Date(),
    };

    this.activeJobs.set(job.id, job);
    this.emitProgress(job);

    let pdfWindow: BrowserWindow | null = null;

    try {
      job.status = 'in-progress';
      job.startedAt = new Date();
      job.progress.percentComplete = 5;
      this.emitProgress(job);

      // T062: Collect markdown files from folder
      const files = await this.collectMarkdownFiles(
        folderPath,
        mergedOptions.includeSubfolders
      );

      // T075: Enforce file count limit
      if (files.length === 0) {
        throw this.createError(
          ExportErrorCode.NO_FILES,
          'No markdown files found in the selected folder.',
          false
        );
      }

      if (files.length > MAX_DOCUMENTS) {
        throw this.createError(
          ExportErrorCode.RATE_LIMITED,
          `Folder contains ${files.length} documents, which exceeds the limit of ${MAX_DOCUMENTS}. Please select a smaller folder.`,
          false
        );
      }

      job.progress.totalFiles = files.length;
      job.progress.percentComplete = 10;
      this.emitProgress(job);

      // T063: Order files by hierarchy
      const orderedFiles = this.orderFilesByHierarchy(files, folderPath);

      // Read and render each file
      const renderedFiles: MarkdownFile[] = [];
      for (let i = 0; i < orderedFiles.length; i++) {
        if (this.isJobCancelled(job.id)) {
          throw this.createError(ExportErrorCode.CANCELLED, 'Export cancelled by user.', false);
        }

        const file = orderedFiles[i];
        job.progress.currentFile = file.relativePath;
        job.progress.filesProcessed = i;
        job.progress.percentComplete = 10 + Math.floor((i / orderedFiles.length) * 50);
        this.emitProgress(job);

        // T071: Read file content and render to HTML
        const content = await fs.readFile(file.path, 'utf-8');
        file.content = content;
        file.renderedHtml = this.md.render(content);
        renderedFiles.push(file);
      }

      job.progress.percentComplete = 65;
      this.emitProgress(job);

      // T064: Generate cover page
      const coverPageHtml = this.generateCoverPage(
        mergedOptions.coverPage?.title || path.basename(folderPath),
        mergedOptions.coverPage?.subtitle,
        mergedOptions.coverPage?.author
      );

      // T065: Generate table of contents
      const tocHtml = mergedOptions.generateTOC
        ? this.generateTableOfContents(renderedFiles)
        : '';

      // T066: Build combined HTML document
      const combinedHtml = this.buildCombinedDocument(
        coverPageHtml,
        tocHtml,
        renderedFiles,
        mergedOptions
      );

      job.progress.percentComplete = 75;
      this.emitProgress(job);

      // Ensure destination directory exists
      const destDir = path.dirname(destination);
      await fs.mkdir(destDir, { recursive: true });

      // Create hidden window for PDF rendering
      pdfWindow = new BrowserWindow({
        show: false,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          offscreen: true,
        },
      });

      // Load combined HTML
      await pdfWindow.loadURL(
        `data:text/html;charset=utf-8,${encodeURIComponent(combinedHtml)}`
      );

      // Wait for content to render
      await this.waitForContentReady(pdfWindow);

      job.progress.percentComplete = 85;
      this.emitProgress(job);

      // Generate PDF
      const pdfData = await pdfWindow.webContents.printToPDF({
        pageSize: mergedOptions.pageSize,
        printBackground: mergedOptions.printBackground,
        margins: {
          top: mergedOptions.margins.top,
          right: mergedOptions.margins.right,
          bottom: mergedOptions.margins.bottom,
          left: mergedOptions.margins.left,
        },
        landscape: false,
      });

      // Write PDF to file
      await fs.writeFile(destination, pdfData);

      // Complete
      job.status = 'completed';
      job.completedAt = new Date();
      job.progress.filesProcessed = renderedFiles.length;
      job.progress.percentComplete = 100;
      this.emitProgress(job);

      await this.logExport(job);

      settingsStore.addRecentExport({
        source: folderPath,
        destination,
        timestamp: new Date(),
        type: 'folder-pdf',
      });

      return job;
    } catch (error) {
      const exportError = this.handleError(error);
      job.status = 'failed';
      job.completedAt = new Date();
      job.error = exportError;
      this.emitProgress(job);
      await this.logExport(job);
      throw exportError;
    } finally {
      if (pdfWindow && !pdfWindow.isDestroyed()) {
        pdfWindow.close();
      }
      this.activeJobs.delete(job.id);
    }
  }

  /**
   * Cancel an active export job
   */
  async cancelExport(jobId: string): Promise<void> {
    const job = this.activeJobs.get(jobId);
    if (job) {
      job.status = 'cancelled';
      job.completedAt = new Date();
      this.emitProgress(job);
      this.activeJobs.delete(jobId);
    }
  }

  private isJobCancelled(jobId: string): boolean {
    const job = this.activeJobs.get(jobId);
    return !job || job.status === 'cancelled';
  }

  /**
   * T062: Collect markdown files from folder (recursive)
   */
  private async collectMarkdownFiles(
    folderPath: string,
    includeSubfolders: boolean
  ): Promise<MarkdownFile[]> {
    const files: MarkdownFile[] = [];
    await this.walkDirectory(folderPath, folderPath, files, includeSubfolders, 0);
    return files;
  }

  private async walkDirectory(
    currentPath: string,
    rootPath: string,
    files: MarkdownFile[],
    recurse: boolean,
    order: number
  ): Promise<number> {
    let currentOrder = order;
    const entries = await fs.readdir(currentPath, { withFileTypes: true });

    // Sort entries: directories first, then files, alphabetically within each group
    const sorted = entries.sort((a, b) => {
      if (a.isDirectory() && !b.isDirectory()) return -1;
      if (!a.isDirectory() && b.isDirectory()) return 1;
      return a.name.localeCompare(b.name);
    });

    for (const entry of sorted) {
      const fullPath = path.join(currentPath, entry.name);

      if (entry.isDirectory() && recurse) {
        // T074: Skip hidden directories and node_modules
        if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
        currentOrder = await this.walkDirectory(fullPath, rootPath, files, recurse, currentOrder);
      } else if (entry.isFile() && this.isMarkdownFile(entry.name)) {
        const relativePath = path.relative(rootPath, fullPath);
        const title = this.extractTitle(entry.name);
        files.push({
          path: fullPath,
          relativePath,
          title,
          content: '',
          order: currentOrder++,
        });
      }
    }

    return currentOrder;
  }

  private isMarkdownFile(filename: string): boolean {
    const ext = path.extname(filename).toLowerCase();
    return ['.md', '.markdown', '.mdown', '.mkd'].includes(ext);
  }

  private extractTitle(filename: string): string {
    // Remove extension and convert common separators to spaces
    const name = path.basename(filename, path.extname(filename));
    return name.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  /**
   * T063: Order files by directory hierarchy
   */
  private orderFilesByHierarchy(files: MarkdownFile[], _rootPath: string): MarkdownFile[] {
    // Files are already ordered by the walk function (directories first, alphabetical)
    // Just ensure consistent ordering
    return files.sort((a, b) => a.order - b.order);
  }

  /**
   * T064: Generate cover page HTML
   */
  private generateCoverPage(title: string, subtitle?: string, author?: string): string {
    const date = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    return `
      <div class="cover-page">
        <div class="cover-content">
          <h1 class="cover-title">${this.escapeHtml(title)}</h1>
          ${subtitle ? `<p class="cover-subtitle">${this.escapeHtml(subtitle)}</p>` : ''}
          <div class="cover-meta">
            ${author ? `<p class="cover-author">${this.escapeHtml(author)}</p>` : ''}
            <p class="cover-date">${date}</p>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * T065: Generate table of contents with anchor links
   */
  private generateTableOfContents(files: MarkdownFile[]): string {
    const entries: TOCEntry[] = files.map((file, index) => {
      const anchor = `doc-${index}`;
      const level = file.relativePath.split(path.sep).length - 1;
      return {
        title: file.title,
        level,
        anchor,
        children: [],
      };
    });

    const tocItems = entries.map(entry => {
      const indent = entry.level > 0 ? `padding-left: ${entry.level * 20}px;` : '';
      return `<li style="${indent}"><a href="#${entry.anchor}">${this.escapeHtml(entry.title)}</a></li>`;
    }).join('\n');

    return `
      <div class="toc-page">
        <h2 class="toc-title">Table of Contents</h2>
        <ol class="toc-list">
          ${tocItems}
        </ol>
      </div>
    `;
  }

  /**
   * T066: Build combined HTML document with all files
   */
  private buildCombinedDocument(
    coverPage: string,
    toc: string,
    files: MarkdownFile[],
    _options: FolderExportOptions
  ): string {
    // T067: Build document sections with page breaks between them
    const documentSections = files.map((file, index) => {
      const anchor = `doc-${index}`;
      return `
        <div class="document-section" id="${anchor}">
          <div class="document-header">
            <h1 class="document-title">${this.escapeHtml(file.title)}</h1>
            <p class="document-path">${this.escapeHtml(file.relativePath)}</p>
          </div>
          <div class="document-content">
            ${file.renderedHtml}
          </div>
        </div>
      `;
    }).join('\n');

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      line-height: 1.6;
      color: #333;
      margin: 0;
      padding: 0;
    }

    /* Cover page */
    .cover-page {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      page-break-after: always;
      text-align: center;
    }
    .cover-title {
      font-size: 36px;
      font-weight: 700;
      margin-bottom: 16px;
      color: #1a1a1a;
    }
    .cover-subtitle {
      font-size: 20px;
      color: #555;
      margin-bottom: 32px;
    }
    .cover-meta {
      margin-top: 48px;
      color: #777;
      font-size: 14px;
    }
    .cover-author { margin-bottom: 8px; }
    .cover-date { font-style: italic; }

    /* Table of Contents */
    .toc-page {
      page-break-after: always;
      padding: 40px 20px;
    }
    .toc-title {
      font-size: 24px;
      margin-bottom: 24px;
      border-bottom: 2px solid #eee;
      padding-bottom: 12px;
    }
    .toc-list {
      list-style: none;
      padding: 0;
    }
    .toc-list li {
      padding: 6px 0;
      border-bottom: 1px solid #f0f0f0;
    }
    .toc-list a {
      text-decoration: none;
      color: #0066cc;
    }
    .toc-list a:hover {
      text-decoration: underline;
    }

    /* Document sections */
    .document-section {
      page-break-before: always;
      padding: 20px 0;
    }
    .document-section:first-of-type {
      page-break-before: auto;
    }
    .document-header {
      margin-bottom: 24px;
      padding-bottom: 12px;
      border-bottom: 1px solid #ddd;
    }
    .document-title {
      font-size: 24px;
      margin: 0 0 4px 0;
    }
    .document-path {
      font-size: 12px;
      color: #888;
      margin: 0;
    }
    .document-content {
      margin-top: 16px;
    }

    /* Standard markdown styles */
    h1 { font-size: 24px; margin: 24px 0 12px; }
    h2 { font-size: 20px; margin: 20px 0 10px; }
    h3 { font-size: 16px; margin: 16px 0 8px; }
    p { margin: 0 0 12px; }
    code {
      background: #f5f5f5;
      padding: 2px 4px;
      border-radius: 3px;
      font-size: 13px;
    }
    pre {
      background: #f5f5f5;
      padding: 12px;
      border-radius: 4px;
      overflow-x: auto;
    }
    pre code {
      background: none;
      padding: 0;
    }
    blockquote {
      margin: 12px 0;
      padding: 8px 16px;
      border-left: 4px solid #ddd;
      color: #555;
    }
    table {
      border-collapse: collapse;
      width: 100%;
      margin: 12px 0;
    }
    th, td {
      border: 1px solid #ddd;
      padding: 8px;
      text-align: left;
    }
    th { background: #f5f5f5; font-weight: 600; }
    img { max-width: 100%; height: auto; }
    ul, ol { margin: 0 0 12px; padding-left: 24px; }
    li { margin: 4px 0; }
    hr { border: none; border-top: 1px solid #ddd; margin: 24px 0; }

    @media print {
      .document-section { page-break-before: always; }
      .cover-page { page-break-after: always; }
      .toc-page { page-break-after: always; }
    }
  </style>
</head>
<body>
  ${coverPage}
  ${toc}
  ${documentSections}
</body>
</html>`;
  }

  /**
   * Wait for async content to render after loadURL has resolved.
   */
  private waitForContentReady(_window: BrowserWindow): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, 1500));
  }

  private emitProgress(job: ExportJob): void {
    this.emit('progress', {
      jobId: job.id,
      status: job.status,
      progress: { ...job.progress },
      error: job.error,
    });
  }

  private async logExport(job: ExportJob): Promise<void> {
    const logger = getExportLogger();
    await logger.log({
      timestamp: new Date(),
      jobId: job.id,
      type: job.type,
      source: job.source,
      destination: job.destination,
      status: job.status === 'completed' ? 'completed' : job.status === 'cancelled' ? 'cancelled' : 'failed',
      duration: job.completedAt && job.startedAt
        ? job.completedAt.getTime() - job.startedAt.getTime()
        : 0,
      filesProcessed: job.progress.filesProcessed,
      error: job.error ? { code: job.error.code, message: job.error.message } : undefined,
    });
  }

  private handleError(error: unknown): ExportError {
    if (error && typeof error === 'object' && 'code' in error) {
      // Already an ExportError
      return error as ExportError;
    }
    if (error instanceof Error) {
      if (error.message.includes('EACCES') || error.message.includes('permission')) {
        return this.createError(ExportErrorCode.PERMISSION_DENIED, 'Permission denied.', true);
      }
      if (error.message.includes('ENOSPC')) {
        return this.createError(ExportErrorCode.DISK_FULL, 'Disk is full.', true);
      }
      return this.createError(ExportErrorCode.UNKNOWN, `Export failed: ${error.message}`, true, error.stack);
    }
    return this.createError(ExportErrorCode.UNKNOWN, 'An unknown error occurred.', true);
  }

  private createError(code: ExportErrorCode, message: string, retryable: boolean, details?: string): ExportError {
    return { code, message, retryable, details };
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}

// Singleton
let folderExportServiceInstance: FolderExportService | null = null;

export function getFolderExportService(): FolderExportService {
  if (!folderExportServiceInstance) {
    folderExportServiceInstance = new FolderExportService();
  }
  return folderExportServiceInstance;
}
