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
import * as os from 'os';
import crypto from 'crypto';
import MarkdownIt from 'markdown-it';
import hljs from 'highlight.js';
// @ts-expect-error - markdown-it-task-lists may not have types
import taskLists from 'markdown-it-task-lists';
// @ts-expect-error - markdown-it-footnote may not have types
import footnote from 'markdown-it-footnote';
// @ts-expect-error - markdown-it-deflist may not have types
import deflist from 'markdown-it-deflist';
// @ts-expect-error - markdown-it-container may not have types
import container from 'markdown-it-container';
import type {
  ExportJob,
  FolderExportOptions,
  ExportError,
  MarkdownFile,
} from '../../../shared/types/export';
import { ExportErrorCode } from '../../../shared/types/export';
import { getExportLogger } from './ExportLogger';
import { getExportSettingsStore } from './ExportSettingsStore';

// Maximum number of documents in a single folder export
const MAX_DOCUMENTS = 150;

export class FolderExportService extends EventEmitter {
  private md: MarkdownIt;
  private activeJobs: Map<string, ExportJob> = new Map();

  constructor() {
    super();
    this.md = new MarkdownIt({
      html: true,
      linkify: true,
      typographer: true,
      highlight: (code: string, lang: string): string => {
        // Mermaid blocks handled by custom fence rule
        if (lang === 'mermaid') return code;
        if (lang && hljs.getLanguage(lang)) {
          try {
            return hljs.highlight(code, { language: lang }).value;
          } catch { /* fall through */ }
        }
        return MarkdownIt().utils.escapeHtml(code);
      },
    });

    // Enable GFM features
    this.md.enable(['table', 'strikethrough']);

    // Plugins
    this.md.use(taskLists, { enabled: true, label: true, labelAfter: false });
    this.md.use(footnote);
    this.md.use(deflist);

    // Container/callout plugin
    const containerTypes = [
      { name: 'info', defaultTitle: 'Info' },
      { name: 'warning', defaultTitle: 'Warning' },
      { name: 'error', defaultTitle: 'Error' },
      { name: 'success', defaultTitle: 'Success' },
      { name: 'note', defaultTitle: 'Note' },
    ];
    containerTypes.forEach(({ name, defaultTitle }) => {
      this.md.use(container, name, {
        render: (tokens: { nesting: number; info: string }[], idx: number): string => {
          const token = tokens[idx];
          if (token.nesting === 1) {
            const title = token.info.trim().slice(name.length).trim() || defaultTitle;
            return `<div class="markdown-container markdown-container-${name}">
<div class="markdown-container-title">${this.md.utils.escapeHtml(title)}</div>
<div class="markdown-container-content">\n`;
          }
          return '</div></div>\n';
        },
      });
    });

    // Custom fence rule for mermaid blocks
    const defaultFence = this.md.renderer.rules.fence!;
    this.md.renderer.rules.fence = (tokens, idx, options, env, self) => {
      const token = tokens[idx];
      const lang = token.info.trim().split(/\s+/)[0];
      if (lang === 'mermaid') {
        const code = token.content.trim();
        return `<pre class="mermaid">${this.md.utils.escapeHtml(code)}</pre>\n`;
      }
      return defaultFence(tokens, idx, options, env, self);
    };
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
        const rawHtml = this.md.render(content);
        file.renderedHtml = this.resolveImagePaths(rawHtml, path.dirname(file.path));
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
        mergedOptions,
        job.id
      );

      job.progress.percentComplete = 75;
      this.emitProgress(job);

      // Ensure destination directory exists
      const destDir = path.dirname(destination);
      await fs.mkdir(destDir, { recursive: true });

      // Copy local mermaid library to temp dir (avoids CDN dependency)
      const tempMermaidPath = path.join(os.tmpdir(), `markread-mermaid-${job.id}.min.js`);
      const mermaidSrcPath = require.resolve('mermaid/dist/mermaid.min.js');
      await fs.copyFile(mermaidSrcPath, tempMermaidPath);

      // Write HTML to temp file (uses local mermaid script)
      const tempHtmlPath = path.join(os.tmpdir(), `markread-export-${job.id}.html`);
      await fs.writeFile(tempHtmlPath, combinedHtml, 'utf-8');

      // Create hidden window for PDF rendering
      pdfWindow = new BrowserWindow({
        show: false,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          offscreen: true,
          webSecurity: false, // Allow loading file:// images from any directory
        },
      });

      // Load from temp file
      await pdfWindow.loadFile(tempHtmlPath);

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
      // Clean up temp files
      const tempHtmlPath = path.join(os.tmpdir(), `markread-export-${job.id}.html`);
      const tempMermaidPath = path.join(os.tmpdir(), `markread-mermaid-${job.id}.min.js`);
      fs.unlink(tempHtmlPath).catch(() => {});
      fs.unlink(tempMermaidPath).catch(() => {});
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
   * T065: Generate table of contents with folder hierarchy
   */
  private generateTableOfContents(files: MarkdownFile[]): string {
    // Build a tree structure from the flat file list
    interface TocNode {
      name: string;
      anchor?: string;
      title?: string;
      children: TocNode[];
    }

    const root: TocNode = { name: '', children: [] };

    files.forEach((file, index) => {
      const parts = file.relativePath.split(path.sep);
      let current = root;

      // Navigate/create folder nodes
      for (let i = 0; i < parts.length - 1; i++) {
        let folder = current.children.find(c => c.name === parts[i] && !c.anchor);
        if (!folder) {
          folder = { name: parts[i], children: [] };
          current.children.push(folder);
        }
        current = folder;
      }

      // Add file node
      current.children.push({
        name: parts[parts.length - 1],
        anchor: `doc-${index}`,
        title: file.title,
        children: [],
      });
    });

    // Render the tree as nested lists
    const renderNode = (node: TocNode, depth: number): string => {
      if (node.anchor) {
        // File entry
        return `<li class="toc-file"><a href="#${node.anchor}">${this.escapeHtml(node.title || node.name)}</a></li>`;
      }
      // Folder entry
      const childrenHtml = node.children.map(c => renderNode(c, depth + 1)).join('\n');
      if (depth === 0 && !node.name) {
        // Root node - just render children
        return childrenHtml;
      }
      return `<li class="toc-folder"><span class="toc-folder-name">${this.escapeHtml(node.name)}</span><ol>${childrenHtml}</ol></li>`;
    };

    const tocItems = root.children.map(c => renderNode(c, 0)).join('\n');

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
    _options: FolderExportOptions,
    jobId: string
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
      margin: 0;
    }
    .toc-list ol {
      list-style: none;
      padding-left: 20px;
      margin: 0;
    }
    .toc-file {
      padding: 4px 0;
      border-bottom: 1px solid #f5f5f5;
    }
    .toc-folder {
      padding: 0;
      border: none;
    }
    .toc-folder-name {
      display: block;
      font-weight: 600;
      font-size: 13px;
      color: #555;
      padding: 8px 0 4px;
      margin-top: 4px;
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

    /* Mermaid diagrams: force dark text and light backgrounds for PDF */
    .mermaid-rendered text, .mermaid text {
      fill: #24292f !important;
    }
    .mermaid-rendered .edgeLabel rect.background, .mermaid .edgeLabel rect.background {
      fill: #ffffff !important;
      fill-opacity: 0.8 !important;
    }
    .mermaid-rendered .entityBox, .mermaid .entityBox {
      fill: rgba(255, 255, 255, 0.85) !important;
      stroke: #d0d7de !important;
    }

    /* Container/callout styles */
    .markdown-container {
      margin: 16px 0;
      border-radius: 6px;
      border-left: 4px solid #d0d7de;
      overflow: hidden;
    }
    .markdown-container-title {
      padding: 8px 16px;
      font-weight: 600;
      font-size: 14px;
      border-bottom: 1px solid rgba(0, 0, 0, 0.05);
    }
    .markdown-container-content {
      padding: 12px 16px;
    }
    .markdown-container-content > *:last-child {
      margin-bottom: 0;
    }
    .markdown-container-info {
      border-left-color: #0969da;
      background: #e6f2ff;
    }
    .markdown-container-info .markdown-container-title {
      color: #0969da;
    }
    .markdown-container-warning {
      border-left-color: #bf8700;
      background: #fff8e6;
    }
    .markdown-container-warning .markdown-container-title {
      color: #bf8700;
    }
    .markdown-container-error {
      border-left-color: #cf222e;
      background: #ffebe9;
    }
    .markdown-container-error .markdown-container-title {
      color: #cf222e;
    }
    .markdown-container-success {
      border-left-color: #1a7f37;
      background: #dafbe1;
    }
    .markdown-container-success .markdown-container-title {
      color: #1a7f37;
    }
    .markdown-container-note {
      border-left-color: #8250df;
      background: #f6f0ff;
    }
    .markdown-container-note .markdown-container-title {
      color: #8250df;
    }

    /* Footnotes */
    .footnote-ref { font-size: 0.75em; vertical-align: super; text-decoration: none; }
    .footnotes { margin-top: 32px; border-top: 1px solid #ddd; padding-top: 16px; font-size: 13px; }
    .footnotes-list { padding-left: 20px; }
    .footnote-item { margin: 4px 0; }
    .footnote-backref { text-decoration: none; margin-left: 4px; }

    /* Task lists */
    .task-list-item { list-style: none; margin-left: -24px; }
    .task-list-item input[type="checkbox"] { margin-right: 8px; }

    /* Mermaid diagrams */
    pre.mermaid { background: none; border: none; padding: 16px 0; text-align: center; }
    pre.mermaid svg { max-width: 100%; height: auto; }

    /* Syntax highlighting (GitHub light theme) */
    .hljs { color: #24292e; background: #f6f8fa; }
    .hljs-doctag, .hljs-keyword, .hljs-meta .hljs-keyword,
    .hljs-template-tag, .hljs-template-variable, .hljs-type,
    .hljs-variable.language_ { color: #d73a49; }
    .hljs-title, .hljs-title.class_, .hljs-title.class_.inherited__,
    .hljs-title.function_ { color: #6f42c1; }
    .hljs-attr, .hljs-attribute, .hljs-literal, .hljs-meta,
    .hljs-number, .hljs-operator, .hljs-variable, .hljs-selector-attr,
    .hljs-selector-class, .hljs-selector-id { color: #005cc5; }
    .hljs-regexp, .hljs-string, .hljs-meta .hljs-string { color: #032f62; }
    .hljs-built_in, .hljs-symbol { color: #e36209; }
    .hljs-comment, .hljs-code, .hljs-formula { color: #6a737d; }
    .hljs-name, .hljs-quote, .hljs-selector-tag, .hljs-selector-pseudo { color: #22863a; }
    .hljs-subst { color: #24292e; }
    .hljs-section { color: #005cc5; font-weight: bold; }
    .hljs-bullet { color: #735c0f; }
    .hljs-emphasis { color: #24292e; font-style: italic; }
    .hljs-strong { color: #24292e; font-weight: bold; }
    .hljs-addition { color: #22863a; background-color: #f0fff4; }
    .hljs-deletion { color: #b31d28; background-color: #ffeef0; }
    .hljs-copy-button { display: none !important; }

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
  <script src="markread-mermaid-${jobId}.min.js"><\/script>
  <script>
    try {
      if (typeof mermaid !== 'undefined') {
        mermaid.initialize({ startOnLoad: false, theme: 'default' });
        mermaid.run({ querySelector: 'pre.mermaid' }).then(function() {
          window.__mermaidReady = true;
        }).catch(function() {
          window.__mermaidReady = true;
        });
      } else {
        window.__mermaidReady = true;
      }
    } catch(e) {
      window.__mermaidReady = true;
    }
    // Fallback in case no mermaid blocks exist
    if (!document.querySelector('pre.mermaid')) {
      window.__mermaidReady = true;
    }
  <\/script>
</body>
</html>`;
  }

  /**
   * Wait for async content (including mermaid diagrams) to render.
   */
  private waitForContentReady(window: BrowserWindow): Promise<void> {
    return new Promise((resolve) => {
      const maxWait = 15000;
      const interval = 200;
      let elapsed = 0;

      const check = () => {
        elapsed += interval;
        if (elapsed >= maxWait) {
          resolve();
          return;
        }
        window.webContents.executeJavaScript('window.__mermaidReady === true')
          .then((ready) => {
            if (ready) {
              // Small additional delay for rendering to settle
              setTimeout(resolve, 300);
            } else {
              setTimeout(check, interval);
            }
          })
          .catch(() => {
            setTimeout(check, interval);
          });
      };

      setTimeout(check, 500); // Initial delay for scripts to load
    });
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

  private resolveImagePaths(html: string, fileDir: string): string {
    return html.replace(
      /(<img\s[^>]*src=["'])([^"']+)(["'][^>]*>)/gi,
      (match, prefix, src, suffix) => {
        // Skip absolute URLs and data URIs
        if (/^(https?:|data:|file:)/i.test(src)) {
          return match;
        }
        // Resolve relative path against the markdown file's directory
        const absolutePath = path.resolve(fileDir, src);
        const fileUrl = `file:///${absolutePath.replace(/\\/g, '/')}`;
        return `${prefix}${fileUrl}${suffix}`;
      }
    );
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
