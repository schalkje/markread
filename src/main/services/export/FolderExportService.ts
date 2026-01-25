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
   * Load the MarkRead logo as a base64 data URL for embedding in PDF
   */
  private async loadLogoAsBase64(): Promise<string | undefined> {
    try {
      // Try multiple possible paths for the logo
      const possiblePaths = [
        path.join(__dirname, '../../../../assets/markread-logo.png'),
        path.join(__dirname, '../../../assets/markread-logo.png'),
        path.join(process.resourcesPath || '', 'assets/markread-logo.png'),
      ];

      for (const logoPath of possiblePaths) {
        try {
          const logoBuffer = await fs.readFile(logoPath);
          return `data:image/png;base64,${logoBuffer.toString('base64')}`;
        } catch {
          // Try next path
        }
      }
      return undefined;
    } catch {
      return undefined;
    }
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

      // Load logo for cover page
      const logoBase64 = await this.loadLogoAsBase64();

      // T064: Generate cover page with enhanced details
      const coverPageHtml = this.generateCoverPage(
        mergedOptions.coverPage?.title || path.basename(folderPath),
        mergedOptions.coverPage?.subtitle,
        mergedOptions.coverPage?.author,
        folderPath,
        mergedOptions.gitInfo,
        mergedOptions.subfolderPath,
        logoBase64
      );

      // Generate subfolder separator pages
      const subfolderSeparators = mergedOptions.includeSubfolders
        ? this.generateSubfolderSeparatorPages(renderedFiles, folderPath, logoBase64)
        : new Map<string, string>();

      // T065: Generate table of contents with clickable subfolder links
      const tocHtml = mergedOptions.generateTOC
        ? this.generateTableOfContents(renderedFiles, subfolderSeparators)
        : '';

      // T066: Build combined HTML document with separator pages
      const combinedHtml = this.buildCombinedDocument(
        coverPageHtml,
        tocHtml,
        renderedFiles,
        mergedOptions,
        job.id,
        subfolderSeparators
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
   * T064: Generate cover page HTML with enhanced details
   */
  private generateCoverPage(
    title: string,
    subtitle?: string,
    author?: string,
    folderPath?: string,
    gitInfo?: { repoName?: string; branch?: string },
    subfolderPath?: string,
    logoBase64?: string
  ): string {
    const date = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const folderName = folderPath ? path.basename(folderPath) : '';

    return `
      <div class="cover-page">
        <div class="cover-content">
          ${logoBase64 ? `<img src="${logoBase64}" alt="MarkRead" class="cover-logo" />` : ''}
          <h1 class="cover-title">${this.escapeHtml(title)}</h1>
          ${subtitle ? `<p class="cover-subtitle">${this.escapeHtml(subtitle)}</p>` : ''}

          <div class="cover-details">
            ${folderName ? `
              <div class="cover-detail-row">
                <span class="cover-detail-label">Base Folder</span>
                <span class="cover-detail-value">${this.escapeHtml(folderName)}</span>
              </div>
            ` : ''}
            ${gitInfo?.repoName ? `
              <div class="cover-detail-row">
                <span class="cover-detail-label">Repository</span>
                <span class="cover-detail-value">${this.escapeHtml(gitInfo.repoName)}${gitInfo.branch ? ` <span class="cover-branch">${this.escapeHtml(gitInfo.branch)}</span>` : ''}</span>
              </div>
            ` : ''}
            ${subfolderPath ? `
              <div class="cover-detail-row">
                <span class="cover-detail-label">Subfolder</span>
                <span class="cover-detail-value">${this.escapeHtml(subfolderPath)}</span>
              </div>
            ` : ''}
          </div>

          <div class="cover-meta">
            ${author ? `<p class="cover-author">${this.escapeHtml(author)}</p>` : ''}
            <p class="cover-date">${date}</p>
          </div>
        </div>
        <div class="cover-footer">
          <span>Generated by MarkRead</span>
        </div>
      </div>
    `;
  }

  /**
   * T065: Generate table of contents with folder hierarchy and clickable subfolder links
   */
  private generateTableOfContents(
    files: MarkdownFile[],
    subfolderSeparators: Map<string, string> = new Map()
  ): string {
    // Build a tree structure from the flat file list
    interface TocNode {
      name: string;
      fullPath: string;
      anchor?: string;
      title?: string;
      children: TocNode[];
      isFolder: boolean;
    }

    const root: TocNode = { name: '', fullPath: '', children: [], isFolder: true };

    files.forEach((file, index) => {
      const parts = file.relativePath.split(path.sep);
      let current = root;
      let currentPath = '';

      // Navigate/create folder nodes
      for (let i = 0; i < parts.length - 1; i++) {
        currentPath = currentPath ? `${currentPath}/${parts[i]}` : parts[i];
        let folder = current.children.find(c => c.name === parts[i] && c.isFolder);
        if (!folder) {
          folder = { name: parts[i], fullPath: currentPath, children: [], isFolder: true };
          current.children.push(folder);
        }
        current = folder;
      }

      // Add file node
      current.children.push({
        name: parts[parts.length - 1],
        fullPath: file.relativePath,
        anchor: `doc-${index}`,
        title: file.title,
        children: [],
        isFolder: false,
      });
    });

    // Render the tree as nested lists with clickable folder links
    const renderNode = (node: TocNode, depth: number): string => {
      if (node.anchor) {
        // File entry
        return `<li class="toc-file"><a href="#${node.anchor}">${this.escapeHtml(node.title || node.name)}</a></li>`;
      }
      // Folder entry - make it clickable if there's a separator page
      const folderAnchor = subfolderSeparators.has(node.fullPath)
        ? `folder-${this.slugify(node.fullPath)}`
        : null;
      const childrenHtml = node.children.map(c => renderNode(c, depth + 1)).join('\n');
      if (depth === 0 && !node.name) {
        // Root node - just render children
        return childrenHtml;
      }
      const folderNameHtml = folderAnchor
        ? `<a href="#${folderAnchor}" class="toc-folder-link">${this.escapeHtml(node.name)}</a>`
        : `<span class="toc-folder-name">${this.escapeHtml(node.name)}</span>`;
      return `<li class="toc-folder">${folderNameHtml}<ol>${childrenHtml}</ol></li>`;
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
   * Generate a URL-safe slug from a string
   */
  private slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  /**
   * Generate separator pages for each subfolder
   * Returns a map of folder path -> HTML content
   */
  private generateSubfolderSeparatorPages(
    files: MarkdownFile[],
    _rootPath: string,
    logoBase64?: string
  ): Map<string, string> {
    const separators = new Map<string, string>();

    // Collect unique folder paths
    const folderData = new Map<string, {
      files: MarkdownFile[];
      subfolders: Set<string>;
    }>();

    files.forEach((file, index) => {
      const parts = file.relativePath.split(path.sep);
      if (parts.length > 1) {
        // File is in a subfolder
        let currentPath = '';
        for (let i = 0; i < parts.length - 1; i++) {
          const parentPath = currentPath;
          currentPath = currentPath ? `${currentPath}/${parts[i]}` : parts[i];

          if (!folderData.has(currentPath)) {
            folderData.set(currentPath, { files: [], subfolders: new Set() });
          }

          // Track immediate subfolders for parent
          if (parentPath && folderData.has(parentPath)) {
            folderData.get(parentPath)!.subfolders.add(parts[i]);
          }
        }

        // Add file to its immediate parent folder
        const immediateParent = parts.slice(0, -1).join('/');
        if (folderData.has(immediateParent)) {
          folderData.get(immediateParent)!.files.push({ ...file, order: index });
        }

        // Track subfolders at each level
        for (let i = 0; i < parts.length - 2; i++) {
          const parentPath = parts.slice(0, i + 1).join('/');
          const childFolder = parts[i + 1];
          if (folderData.has(parentPath)) {
            folderData.get(parentPath)!.subfolders.add(childFolder);
          }
        }
      }
    });

    // Generate separator page for each folder
    folderData.forEach((data, folderPath) => {
      const anchor = `folder-${this.slugify(folderPath)}`;
      const folderName = folderPath.split('/').pop() || folderPath;

      // Build submenu of files and subfolders
      const subfolderLinks = Array.from(data.subfolders).sort().map(sf => {
        const sfPath = `${folderPath}/${sf}`;
        const sfAnchor = `folder-${this.slugify(sfPath)}`;
        return `<li class="separator-submenu-folder"><a href="#${sfAnchor}"><span class="folder-icon">📁</span> ${this.escapeHtml(sf)}</a></li>`;
      });

      const fileLinks = data.files
        .sort((a, b) => a.title.localeCompare(b.title))
        .map(f => {
          return `<li class="separator-submenu-file"><a href="#doc-${f.order}"><span class="file-icon">📄</span> ${this.escapeHtml(f.title)}</a></li>`;
        });

      const separatorHtml = `
        <div class="separator-page" id="${anchor}">
          <div class="separator-content">
            ${logoBase64 ? `<img src="${logoBase64}" alt="MarkRead" class="separator-logo" />` : ''}
            <div class="separator-header">
              <span class="separator-label">Section</span>
              <h1 class="separator-title">${this.escapeHtml(folderName)}</h1>
              <p class="separator-path">${this.escapeHtml(folderPath)}</p>
            </div>
            <div class="separator-submenu">
              <h3 class="separator-submenu-title">Contents</h3>
              <ul class="separator-submenu-list">
                ${subfolderLinks.join('\n')}
                ${fileLinks.join('\n')}
              </ul>
            </div>
          </div>
        </div>
      `;

      separators.set(folderPath, separatorHtml);
    });

    return separators;
  }

  /**
   * T066: Build combined HTML document with all files, separator pages, and enhanced styling
   */
  private buildCombinedDocument(
    coverPage: string,
    toc: string,
    files: MarkdownFile[],
    _options: FolderExportOptions,
    jobId: string,
    subfolderSeparators: Map<string, string> = new Map()
  ): string {
    // T067: Build document sections with page breaks between them
    // Insert separator pages before the first file of each subfolder
    const processedFolders = new Set<string>();
    const documentSections: string[] = [];

    files.forEach((file, index) => {
      const parts = file.relativePath.split(path.sep);
      if (parts.length > 1) {
        // Check if we need to insert separator pages for parent folders
        let currentPath = '';
        for (let i = 0; i < parts.length - 1; i++) {
          currentPath = currentPath ? `${currentPath}/${parts[i]}` : parts[i];
          if (!processedFolders.has(currentPath) && subfolderSeparators.has(currentPath)) {
            documentSections.push(subfolderSeparators.get(currentPath)!);
            processedFolders.add(currentPath);
          }
        }
      }

      const anchor = `doc-${index}`;
      documentSections.push(`
        <div class="document-section" id="${anchor}">
          <div class="document-header">
            <h1 class="document-title">${this.escapeHtml(file.title)}</h1>
            <p class="document-path">${this.escapeHtml(file.relativePath)}</p>
          </div>
          <div class="document-content">
            ${file.renderedHtml}
          </div>
        </div>
      `);
    });

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    /* ============================================
       MarkRead Export Theme
       Professional PDF export styling
       ============================================ */

    :root {
      --primary-color: #0969da;
      --primary-light: #ddf4ff;
      --text-primary: #24292f;
      --text-secondary: #57606a;
      --text-muted: #8b949e;
      --bg-primary: #ffffff;
      --bg-secondary: #f6f8fa;
      --bg-tertiary: #eaeef2;
      --border-color: #d0d7de;
      --border-light: #eaeef2;
      --accent-blue: #0969da;
      --accent-green: #1a7f37;
      --accent-purple: #8250df;
      --accent-orange: #bf8700;
      --accent-red: #cf222e;
    }

    * {
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans', Helvetica, Arial, sans-serif;
      font-size: 14px;
      line-height: 1.6;
      color: var(--text-primary);
      margin: 0;
      padding: 0;
      background: var(--bg-primary);
    }

    /* ============================================
       Page Header & Footer (Print)
       ============================================ */
    @page {
      margin: 1in 0.75in;
      @top-center {
        content: "MarkRead Export";
        font-size: 10px;
        color: #8b949e;
      }
      @bottom-center {
        content: counter(page);
        font-size: 10px;
        color: #8b949e;
      }
    }

    /* ============================================
       Cover Page
       ============================================ */
    .cover-page {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      page-break-after: always;
      text-align: center;
      background: linear-gradient(180deg, var(--bg-primary) 0%, var(--bg-secondary) 100%);
      padding: 60px 40px;
      position: relative;
    }

    .cover-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }

    .cover-logo {
      width: 120px;
      height: auto;
      margin-bottom: 40px;
      opacity: 0.9;
    }

    .cover-title {
      font-size: 42px;
      font-weight: 700;
      margin: 0 0 16px 0;
      color: var(--text-primary);
      letter-spacing: -0.5px;
    }

    .cover-subtitle {
      font-size: 20px;
      color: var(--text-secondary);
      margin: 0 0 40px 0;
      font-weight: 400;
    }

    .cover-details {
      background: var(--bg-primary);
      border: 1px solid var(--border-color);
      border-radius: 12px;
      padding: 24px 32px;
      margin: 24px 0;
      min-width: 320px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.04);
    }

    .cover-detail-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 0;
      border-bottom: 1px solid var(--border-light);
    }

    .cover-detail-row:last-child {
      border-bottom: none;
    }

    .cover-detail-label {
      font-size: 12px;
      font-weight: 600;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .cover-detail-value {
      font-size: 14px;
      color: var(--text-primary);
      font-weight: 500;
    }

    .cover-branch {
      display: inline-block;
      background: var(--primary-light);
      color: var(--primary-color);
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
      margin-left: 8px;
    }

    .cover-meta {
      margin-top: 40px;
      color: var(--text-muted);
      font-size: 13px;
    }

    .cover-author {
      margin: 0 0 8px 0;
      font-weight: 500;
      color: var(--text-secondary);
    }

    .cover-date {
      margin: 0;
      font-style: italic;
    }

    .cover-footer {
      position: absolute;
      bottom: 40px;
      font-size: 11px;
      color: var(--text-muted);
    }

    /* ============================================
       Table of Contents
       ============================================ */
    .toc-page {
      page-break-after: always;
      padding: 40px 20px;
    }

    .toc-title {
      font-size: 28px;
      font-weight: 700;
      margin: 0 0 32px 0;
      padding-bottom: 16px;
      border-bottom: 3px solid var(--primary-color);
      color: var(--text-primary);
    }

    .toc-list {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    .toc-list ol {
      list-style: none;
      padding-left: 24px;
      margin: 0;
    }

    .toc-file {
      padding: 6px 0;
      border-bottom: 1px solid var(--border-light);
    }

    .toc-file a {
      display: block;
      text-decoration: none;
      color: var(--text-primary);
      transition: color 0.15s;
    }

    .toc-file a:hover {
      color: var(--primary-color);
    }

    .toc-folder {
      padding: 0;
      border: none;
      margin-top: 8px;
    }

    .toc-folder-name,
    .toc-folder-link {
      display: block;
      font-weight: 600;
      font-size: 14px;
      color: var(--text-secondary);
      padding: 10px 12px;
      margin: 8px 0 4px 0;
      background: var(--bg-secondary);
      border-radius: 6px;
      border-left: 3px solid var(--primary-color);
    }

    .toc-folder-link {
      text-decoration: none;
      cursor: pointer;
    }

    .toc-folder-link:hover {
      background: var(--primary-light);
      color: var(--primary-color);
    }

    /* ============================================
       Separator Pages (Subfolder)
       ============================================ */
    .separator-page {
      page-break-before: always;
      page-break-after: always;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 60px 40px;
      background: linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-primary) 100%);
    }

    .separator-content {
      text-align: center;
      max-width: 600px;
    }

    .separator-logo {
      width: 80px;
      height: auto;
      margin-bottom: 32px;
      opacity: 0.7;
    }

    .separator-header {
      margin-bottom: 40px;
    }

    .separator-label {
      display: inline-block;
      background: var(--primary-color);
      color: white;
      padding: 4px 16px;
      border-radius: 16px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 16px;
    }

    .separator-title {
      font-size: 36px;
      font-weight: 700;
      margin: 0 0 12px 0;
      color: var(--text-primary);
    }

    .separator-path {
      font-size: 14px;
      color: var(--text-muted);
      margin: 0;
      font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
      background: var(--bg-tertiary);
      padding: 8px 16px;
      border-radius: 6px;
      display: inline-block;
    }

    .separator-submenu {
      text-align: left;
      background: var(--bg-primary);
      border: 1px solid var(--border-color);
      border-radius: 12px;
      padding: 24px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.04);
    }

    .separator-submenu-title {
      font-size: 12px;
      font-weight: 600;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin: 0 0 16px 0;
      padding-bottom: 8px;
      border-bottom: 1px solid var(--border-light);
    }

    .separator-submenu-list {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    .separator-submenu-folder,
    .separator-submenu-file {
      padding: 8px 0;
      border-bottom: 1px solid var(--border-light);
    }

    .separator-submenu-folder:last-child,
    .separator-submenu-file:last-child {
      border-bottom: none;
    }

    .separator-submenu-folder a,
    .separator-submenu-file a {
      display: flex;
      align-items: center;
      text-decoration: none;
      color: var(--text-primary);
      font-size: 14px;
    }

    .separator-submenu-folder a:hover,
    .separator-submenu-file a:hover {
      color: var(--primary-color);
    }

    .folder-icon,
    .file-icon {
      margin-right: 10px;
      font-size: 16px;
    }

    .separator-submenu-folder a {
      font-weight: 600;
    }

    /* ============================================
       Document Sections
       ============================================ */
    .document-section {
      page-break-before: always;
      padding: 20px 0;
    }

    .document-section:first-of-type {
      page-break-before: auto;
    }

    .document-header {
      margin-bottom: 32px;
      padding-bottom: 16px;
      border-bottom: 2px solid var(--border-color);
    }

    .document-title {
      font-size: 28px;
      font-weight: 700;
      margin: 0 0 8px 0;
      color: var(--text-primary);
    }

    .document-path {
      font-size: 12px;
      color: var(--text-muted);
      margin: 0;
      font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
      background: var(--bg-secondary);
      padding: 4px 10px;
      border-radius: 4px;
      display: inline-block;
    }

    .document-content {
      margin-top: 24px;
    }

    /* ============================================
       Standard Markdown Styles
       ============================================ */
    .document-content h1 {
      font-size: 24px;
      margin: 32px 0 16px;
      padding-bottom: 8px;
      border-bottom: 1px solid var(--border-light);
    }

    .document-content h2 {
      font-size: 20px;
      margin: 28px 0 14px;
    }

    .document-content h3 {
      font-size: 16px;
      margin: 24px 0 12px;
    }

    .document-content h4 {
      font-size: 14px;
      margin: 20px 0 10px;
    }

    .document-content p {
      margin: 0 0 16px;
    }

    .document-content code {
      background: var(--bg-secondary);
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 13px;
      font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
      color: var(--accent-red);
    }

    .document-content pre {
      background: var(--bg-secondary);
      padding: 16px;
      border-radius: 8px;
      overflow-x: auto;
      border: 1px solid var(--border-light);
    }

    .document-content pre code {
      background: none;
      padding: 0;
      color: inherit;
    }

    .document-content blockquote {
      margin: 16px 0;
      padding: 12px 20px;
      border-left: 4px solid var(--primary-color);
      background: var(--bg-secondary);
      color: var(--text-secondary);
      border-radius: 0 8px 8px 0;
    }

    .document-content blockquote p:last-child {
      margin-bottom: 0;
    }

    .document-content table {
      border-collapse: collapse;
      width: 100%;
      margin: 16px 0;
      border-radius: 8px;
      overflow: hidden;
      border: 1px solid var(--border-color);
    }

    .document-content th,
    .document-content td {
      border: 1px solid var(--border-color);
      padding: 10px 14px;
      text-align: left;
    }

    .document-content th {
      background: var(--bg-secondary);
      font-weight: 600;
    }

    .document-content tr:nth-child(even) {
      background: var(--bg-secondary);
    }

    .document-content img {
      max-width: 100%;
      height: auto;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    }

    .document-content ul,
    .document-content ol {
      margin: 0 0 16px;
      padding-left: 28px;
    }

    .document-content li {
      margin: 6px 0;
    }

    .document-content hr {
      border: none;
      border-top: 2px solid var(--border-light);
      margin: 32px 0;
    }

    .document-content a {
      color: var(--primary-color);
      text-decoration: none;
    }

    .document-content a:hover {
      text-decoration: underline;
    }

    /* ============================================
       Mermaid Diagrams
       ============================================ */
    .mermaid-rendered text,
    .mermaid text {
      fill: var(--text-primary) !important;
    }

    .mermaid-rendered .edgeLabel rect.background,
    .mermaid .edgeLabel rect.background {
      fill: var(--bg-primary) !important;
      fill-opacity: 0.9 !important;
    }

    .mermaid-rendered .entityBox,
    .mermaid .entityBox {
      fill: var(--bg-primary) !important;
      stroke: var(--border-color) !important;
    }

    pre.mermaid {
      background: none;
      border: none;
      padding: 24px 0;
      text-align: center;
    }

    pre.mermaid svg {
      max-width: 100%;
      height: auto;
    }

    /* ============================================
       Container/Callout Styles
       ============================================ */
    .markdown-container {
      margin: 20px 0;
      border-radius: 8px;
      border-left: 4px solid var(--border-color);
      overflow: hidden;
      background: var(--bg-secondary);
    }

    .markdown-container-title {
      padding: 10px 16px;
      font-weight: 600;
      font-size: 14px;
      background: rgba(0,0,0,0.02);
    }

    .markdown-container-content {
      padding: 14px 16px;
    }

    .markdown-container-content > *:last-child {
      margin-bottom: 0;
    }

    .markdown-container-info {
      border-left-color: var(--accent-blue);
      background: #ddf4ff;
    }

    .markdown-container-info .markdown-container-title {
      color: var(--accent-blue);
    }

    .markdown-container-warning {
      border-left-color: var(--accent-orange);
      background: #fff8c5;
    }

    .markdown-container-warning .markdown-container-title {
      color: var(--accent-orange);
    }

    .markdown-container-error {
      border-left-color: var(--accent-red);
      background: #ffebe9;
    }

    .markdown-container-error .markdown-container-title {
      color: var(--accent-red);
    }

    .markdown-container-success {
      border-left-color: var(--accent-green);
      background: #dafbe1;
    }

    .markdown-container-success .markdown-container-title {
      color: var(--accent-green);
    }

    .markdown-container-note {
      border-left-color: var(--accent-purple);
      background: #fbefff;
    }

    .markdown-container-note .markdown-container-title {
      color: var(--accent-purple);
    }

    /* ============================================
       Footnotes
       ============================================ */
    .footnote-ref {
      font-size: 0.75em;
      vertical-align: super;
      text-decoration: none;
      color: var(--primary-color);
    }

    .footnotes {
      margin-top: 40px;
      border-top: 2px solid var(--border-light);
      padding-top: 20px;
      font-size: 13px;
      color: var(--text-secondary);
    }

    .footnotes-list {
      padding-left: 24px;
    }

    .footnote-item {
      margin: 6px 0;
    }

    .footnote-backref {
      text-decoration: none;
      margin-left: 6px;
      color: var(--primary-color);
    }

    /* ============================================
       Task Lists
       ============================================ */
    .task-list-item {
      list-style: none;
      margin-left: -24px;
    }

    .task-list-item input[type="checkbox"] {
      margin-right: 10px;
      accent-color: var(--primary-color);
    }

    /* ============================================
       Syntax Highlighting (GitHub Theme)
       ============================================ */
    .hljs {
      color: #24292e;
      background: var(--bg-secondary);
    }

    .hljs-doctag,
    .hljs-keyword,
    .hljs-meta .hljs-keyword,
    .hljs-template-tag,
    .hljs-template-variable,
    .hljs-type,
    .hljs-variable.language_ {
      color: #d73a49;
    }

    .hljs-title,
    .hljs-title.class_,
    .hljs-title.class_.inherited__,
    .hljs-title.function_ {
      color: #6f42c1;
    }

    .hljs-attr,
    .hljs-attribute,
    .hljs-literal,
    .hljs-meta,
    .hljs-number,
    .hljs-operator,
    .hljs-variable,
    .hljs-selector-attr,
    .hljs-selector-class,
    .hljs-selector-id {
      color: #005cc5;
    }

    .hljs-regexp,
    .hljs-string,
    .hljs-meta .hljs-string {
      color: #032f62;
    }

    .hljs-built_in,
    .hljs-symbol {
      color: #e36209;
    }

    .hljs-comment,
    .hljs-code,
    .hljs-formula {
      color: #6a737d;
    }

    .hljs-name,
    .hljs-quote,
    .hljs-selector-tag,
    .hljs-selector-pseudo {
      color: #22863a;
    }

    .hljs-subst {
      color: #24292e;
    }

    .hljs-section {
      color: #005cc5;
      font-weight: bold;
    }

    .hljs-bullet {
      color: #735c0f;
    }

    .hljs-emphasis {
      color: #24292e;
      font-style: italic;
    }

    .hljs-strong {
      color: #24292e;
      font-weight: bold;
    }

    .hljs-addition {
      color: #22863a;
      background-color: #f0fff4;
    }

    .hljs-deletion {
      color: #b31d28;
      background-color: #ffeef0;
    }

    .hljs-copy-button {
      display: none !important;
    }

    /* ============================================
       Print Styles
       ============================================ */
    @media print {
      .cover-page {
        page-break-after: always;
      }

      .toc-page {
        page-break-after: always;
      }

      .separator-page {
        page-break-before: always;
        page-break-after: always;
      }

      .document-section {
        page-break-before: always;
      }

      /* Avoid orphan headings */
      h1, h2, h3, h4 {
        page-break-after: avoid;
      }

      /* Keep images with their captions */
      img {
        page-break-inside: avoid;
      }

      /* Keep tables together when possible */
      table {
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  ${coverPage}
  ${toc}
  ${documentSections.join('\n')}
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
