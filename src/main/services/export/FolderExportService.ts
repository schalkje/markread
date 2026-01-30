/**
 * FolderExportService
 * Tasks: T061-T067
 * Handles exporting an entire folder of markdown files to a single PDF
 * with cover page, table of contents, and page breaks between documents
 */

import { BrowserWindow, app } from 'electron';
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
  PdfStylingOptions,
} from '../../../shared/types/export';
import type { DefaultFileEntry } from '../../../shared/types/entities';
import { ExportErrorCode, DEFAULT_PDF_STYLING } from '../../../shared/types/export';
import { DEFAULT_EXCLUDED_FOLDERS } from '../../../shared/constants/folderExclusions';
import { getExportLogger } from './ExportLogger';
import { getExportSettingsStore } from './ExportSettingsStore';
import { repositoryService } from '../git/repository-service';
import type { TreeNode } from '../../../shared/types/repository';

// Maximum number of documents in a single folder export
const MAX_DOCUMENTS = 500;

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
   * Get possible asset paths for a given filename
   */
  private getAssetPaths(filename: string): string[] {
    const appPath = app.getAppPath();
    return [
      // Development paths
      path.join(appPath, 'assets', filename),
      path.join(appPath, '..', 'assets', filename),
      path.join(__dirname, '../../../../assets', filename),
      path.join(__dirname, '../../../assets', filename),
      path.join(__dirname, '../../assets', filename),
      // Production paths
      path.join(process.resourcesPath || '', 'assets', filename),
      path.join(process.resourcesPath || '', 'app', 'assets', filename),
      path.join(process.resourcesPath || '', 'app.asar', 'assets', filename),
    ];
  }

  /**
   * Load the MarkRead logo as a base64 data URL for embedding in PDF
   */
  private async loadLogoAsBase64(): Promise<string | undefined> {
    const possiblePaths = this.getAssetPaths('markread-icon.png');

    for (const logoPath of possiblePaths) {
      try {
        const logoBuffer = await fs.readFile(logoPath);
        return `data:image/png;base64,${logoBuffer.toString('base64')}`;
      } catch {
        // Try next path
      }
    }
    console.warn('[FolderExportService] Could not find markread-icon.png in any expected location');
    return undefined;
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
      gitInfo: options.gitInfo,
      subfolderPath: options.subfolderPath,
      pdfStyling: {
        coverPage: { ...DEFAULT_PDF_STYLING.coverPage, ...defaults.pdfStyling?.coverPage, ...options.pdfStyling?.coverPage },
        header: { ...DEFAULT_PDF_STYLING.header, ...defaults.pdfStyling?.header, ...options.pdfStyling?.header },
        footer: { ...DEFAULT_PDF_STYLING.footer, ...defaults.pdfStyling?.footer, ...options.pdfStyling?.footer },
        toc: { ...DEFAULT_PDF_STYLING.toc, ...defaults.pdfStyling?.toc, ...options.pdfStyling?.toc },
        sectionSeparators: { ...DEFAULT_PDF_STYLING.sectionSeparators, ...defaults.pdfStyling?.sectionSeparators, ...options.pdfStyling?.sectionSeparators },
      },
      defaultFilesToOpen: options.defaultFilesToOpen,
      repositoryInfo: options.repositoryInfo,
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

    const isRepositoryExport = !!mergedOptions.repositoryInfo;

    try {
      job.status = 'in-progress';
      job.startedAt = new Date();
      job.progress.percentComplete = 5;
      job.progress.currentStage = isRepositoryExport ? 'Fetching repository tree...' : 'Scanning folder...';
      this.emitProgress(job);

      // T062: Collect markdown files from folder or repository
      const files = isRepositoryExport
        ? await this.collectMarkdownFilesFromRepository(
            mergedOptions.repositoryInfo!,
            mergedOptions.subfolderPath,
            mergedOptions.includeSubfolders,
            mergedOptions.defaultFilesToOpen
          )
        : await this.collectMarkdownFiles(
            folderPath,
            mergedOptions.includeSubfolders,
            mergedOptions.defaultFilesToOpen
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
      job.progress.currentStage = `Found ${files.length} files`;
      this.emitProgress(job);

      // T063: Order files by hierarchy
      const orderedFiles = this.orderFilesByHierarchy(files);

      // Build file path map for link transformation
      const filePathMap = this.buildFilePathMap(orderedFiles);

      // Read and render each file
      const renderedFiles: MarkdownFile[] = [];
      for (let i = 0; i < orderedFiles.length; i++) {
        if (this.isJobCancelled(job.id)) {
          throw this.createError(ExportErrorCode.CANCELLED, 'Export cancelled by user.', false);
        }

        const file = orderedFiles[i];
        job.progress.currentFile = file.relativePath;
        job.progress.currentStage = 'Rendering markdown...';
        job.progress.filesProcessed = i;
        job.progress.percentComplete = 10 + Math.floor((i / orderedFiles.length) * 50);
        this.emitProgress(job);

        // T071: Read file content and render to HTML
        const content = isRepositoryExport
          ? await this.readRepositoryFileContent(mergedOptions.repositoryInfo!, file.path)
          : await fs.readFile(file.path, 'utf-8');
        file.content = content;
        const rawHtml = this.md.render(content);
        // Resolve image paths (skip for repository exports as images are remote),
        // prefix header IDs for uniqueness, and transform links
        let processedHtml = isRepositoryExport
          ? rawHtml
          : this.resolveImagePaths(rawHtml, path.dirname(file.path));
        processedHtml = this.prefixHeaderIds(processedHtml, i);
        processedHtml = this.transformLinks(processedHtml, i, file, filePathMap);
        file.renderedHtml = processedHtml;
        renderedFiles.push(file);
      }

      job.progress.percentComplete = 65;
      job.progress.currentFile = undefined;
      job.progress.currentStage = 'Building document structure...';
      this.emitProgress(job);

      const styling = mergedOptions.pdfStyling!;

      // Load logo for cover page (if enabled)
      const logoBase64 = styling.coverPage.showLogo
        ? await this.loadLogoAsBase64()
        : undefined;

      // T064: Generate cover page with enhanced details
      // For repository exports, use repo name as fallback title
      const defaultTitle = isRepositoryExport
        ? (mergedOptions.gitInfo?.repoName || mergedOptions.repositoryInfo?.name || 'Repository')
        : path.basename(folderPath);
      const coverPageHtml = this.generateCoverPage(
        mergedOptions.coverPage?.title || defaultTitle,
        mergedOptions.coverPage?.subtitle,
        mergedOptions.coverPage?.author,
        isRepositoryExport ? undefined : folderPath, // Don't show local path for repo exports
        mergedOptions.gitInfo,
        mergedOptions.subfolderPath,
        logoBase64,
        styling
      );

      // Generate subfolder separator pages
      const subfolderSeparators = mergedOptions.includeSubfolders
        ? this.generateSubfolderSeparatorPages(renderedFiles, folderPath, styling, mergedOptions.defaultFilesToOpen)
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
        job.id,
        subfolderSeparators
      );

      job.progress.percentComplete = 70;
      job.progress.currentStage = 'Generating table of contents...';
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

      job.progress.percentComplete = 75;
      job.progress.currentStage = 'Rendering diagrams...';
      this.emitProgress(job);

      // Wait for content to render
      await this.waitForContentReady(pdfWindow);

      job.progress.percentComplete = 80;
      job.progress.currentStage = 'Calculating page numbers...';
      this.emitProgress(job);

      // Calculate and inject page numbers into TOC and separator pages
      await this.injectPageNumbers(pdfWindow, mergedOptions.pageSize, mergedOptions.margins);

      job.progress.percentComplete = 85;
      job.progress.currentStage = 'Generating PDF...';
      this.emitProgress(job);

      // Generate PDF with page numbering footer
      const showPageNumbers = styling?.footer?.showPageNumbers ?? true;

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
        displayHeaderFooter: showPageNumbers,
        footerTemplate: showPageNumbers
          ? `<div style="width: 100%; font-size: 9px; color: #8b949e; text-align: right; padding-right: 0.75in;">
              <span class="pageNumber"></span> / <span class="totalPages"></span>
            </div>`
          : '<div></div>',
        headerTemplate: '<div></div>',
      });

      job.progress.percentComplete = 95;
      job.progress.currentStage = 'Saving file...';
      this.emitProgress(job);

      // Write PDF to file
      await fs.writeFile(destination, pdfData);

      // Complete
      job.status = 'completed';
      job.completedAt = new Date();
      job.progress.filesProcessed = renderedFiles.length;
      job.progress.percentComplete = 100;
      job.progress.currentStage = undefined;
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
    includeSubfolders: boolean,
    defaultFilesToOpen?: DefaultFileEntry[]
  ): Promise<MarkdownFile[]> {
    const files: MarkdownFile[] = [];
    await this.walkDirectory(folderPath, folderPath, files, includeSubfolders, 0, defaultFilesToOpen);
    return files;
  }

  /**
   * Collect markdown files from a git repository
   */
  private async collectMarkdownFilesFromRepository(
    repositoryInfo: NonNullable<FolderExportOptions['repositoryInfo']>,
    subfolderPath: string | undefined,
    includeSubfolders: boolean,
    defaultFilesToOpen?: DefaultFileEntry[]
  ): Promise<MarkdownFile[]> {
    // Fetch the repository tree
    const treeResponse = await repositoryService.fetchTree({
      repositoryId: repositoryInfo.repositoryId,
      branch: repositoryInfo.branch,
      markdownOnly: true,
    });

    if (!treeResponse.tree) {
      return [];
    }

    // Flatten the tree to get all markdown files
    const files: MarkdownFile[] = [];
    let order = 0;

    const processNode = (node: TreeNode, currentPath: string = '') => {
      const nodePath = currentPath ? `${currentPath}/${node.path.split('/').pop()}` : node.path;

      // If we have a subfolder filter, check if this path is within it
      if (subfolderPath) {
        const normalizedSubfolder = subfolderPath.replace(/\\/g, '/').replace(/^\/+/, '');
        const normalizedNodePath = nodePath.replace(/\\/g, '/');

        if (node.type === 'directory') {
          // For directories, check if it's the subfolder or a parent/child of it
          if (!normalizedNodePath.startsWith(normalizedSubfolder) &&
              !normalizedSubfolder.startsWith(normalizedNodePath)) {
            return; // Skip this branch
          }
        } else {
          // For files, check if it's within the subfolder
          if (!normalizedNodePath.startsWith(normalizedSubfolder + '/') &&
              normalizedNodePath !== normalizedSubfolder) {
            return; // Skip this file
          }
        }
      }

      if (node.type === 'file' && this.isMarkdownFile(node.path)) {
        // Calculate relative path from subfolder root if applicable
        let relativePath = nodePath;
        if (subfolderPath) {
          const normalizedSubfolder = subfolderPath.replace(/\\/g, '/').replace(/^\/+/, '');
          relativePath = nodePath.replace(normalizedSubfolder + '/', '').replace(/^\/+/, '');
        }

        files.push({
          path: nodePath, // Virtual path within repo
          relativePath,
          title: this.extractTitle(path.basename(node.path)),
          content: '', // Will be fetched later
          order: order++,
        });
      } else if (node.type === 'directory' && node.children) {
        // Only recurse into subdirectories if includeSubfolders is true
        // or if we haven't reached the target subfolder yet
        const shouldRecurse = includeSubfolders ||
          (subfolderPath && !nodePath.includes(subfolderPath.replace(/\\/g, '/')));

        if (shouldRecurse || !subfolderPath) {
          // Separate files and directories
          const fileChildren = node.children.filter(c => c.type === 'file');
          const dirChildren = node.children.filter(c => c.type === 'directory');

          // Sort files with priority ordering (matching local folder behavior)
          const sortedFiles = this.sortTreeNodesByPriority(fileChildren, defaultFilesToOpen);
          // Sort directories alphabetically
          const sortedDirs = [...dirChildren].sort((a, b) => a.path.localeCompare(b.path));

          // Process files first, then directories
          for (const child of sortedFiles) {
            processNode(child, nodePath);
          }
          for (const child of sortedDirs) {
            processNode(child, nodePath);
          }
        }
      }
    };

    // Process root level nodes - separate files and directories
    const rootFiles = treeResponse.tree.filter(n => n.type === 'file');
    const rootDirs = treeResponse.tree.filter(n => n.type === 'directory');

    // Sort root files with priority ordering
    const sortedRootFiles = this.sortTreeNodesByPriority(rootFiles, defaultFilesToOpen);
    // Sort root directories alphabetically
    const sortedRootDirs = [...rootDirs].sort((a, b) => a.path.localeCompare(b.path));

    // Process root files first (with priority ordering), then directories
    for (const node of sortedRootFiles) {
      processNode(node);
    }
    for (const node of sortedRootDirs) {
      processNode(node);
    }

    return files;
  }

  /**
   * Sort tree nodes by priority: files matching defaultFilesToOpen come first (in order),
   * then remaining files alphabetically
   */
  private sortTreeNodesByPriority(
    nodes: TreeNode[],
    defaultFilesToOpen?: DefaultFileEntry[]
  ): TreeNode[] {
    if (!defaultFilesToOpen || defaultFilesToOpen.length === 0) {
      // No priority config, just sort alphabetically
      return [...nodes].sort((a, b) => a.path.localeCompare(b.path));
    }

    // Create a map of lowercase filename to priority index (only enabled entries)
    const priorityMap = new Map<string, number>();
    defaultFilesToOpen.forEach((entry, index) => {
      if (entry.isEnabled) {
        priorityMap.set(entry.filename.toLowerCase(), index);
      }
    });

    return [...nodes].sort((a, b) => {
      const aFilename = a.path.split('/').pop()?.toLowerCase() || '';
      const bFilename = b.path.split('/').pop()?.toLowerCase() || '';

      const aPriority = priorityMap.get(aFilename);
      const bPriority = priorityMap.get(bFilename);

      // Both have priority: sort by priority index
      if (aPriority !== undefined && bPriority !== undefined) {
        return aPriority - bPriority;
      }
      // Only a has priority: a comes first
      if (aPriority !== undefined) {
        return -1;
      }
      // Only b has priority: b comes first
      if (bPriority !== undefined) {
        return 1;
      }
      // Neither has priority: sort alphabetically
      return a.path.localeCompare(b.path);
    });
  }

  /**
   * Read file content from repository
   */
  private async readRepositoryFileContent(
    repositoryInfo: NonNullable<FolderExportOptions['repositoryInfo']>,
    filePath: string
  ): Promise<string> {
    const response = await repositoryService.fetchFile({
      repositoryId: repositoryInfo.repositoryId,
      filePath,
      branch: repositoryInfo.branch,
    });
    return response.content;
  }

  private async walkDirectory(
    currentPath: string,
    rootPath: string,
    files: MarkdownFile[],
    recurse: boolean,
    order: number,
    defaultFilesToOpen?: DefaultFileEntry[]
  ): Promise<number> {
    let currentOrder = order;
    const entries = await fs.readdir(currentPath, { withFileTypes: true });

    // Separate files and directories
    const fileEntries = entries.filter(e => e.isFile() && this.isMarkdownFile(e.name));
    const dirEntries = entries.filter(e => e.isDirectory());

    // Sort files: priority files first (by their order in defaultFilesToOpen), then alphabetically
    const sortedFiles = this.sortFilesByPriority(fileEntries, defaultFilesToOpen);

    // Sort directories alphabetically
    const sortedDirs = dirEntries.sort((a, b) => a.name.localeCompare(b.name));

    // Process files first
    for (const entry of sortedFiles) {
      const fullPath = path.join(currentPath, entry.name);
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

    // Then process directories
    if (recurse) {
      for (const entry of sortedDirs) {
        const fullPath = path.join(currentPath, entry.name);
        // T074: Skip hidden directories and excluded folders from default list
        if (entry.name.startsWith('.') || DEFAULT_EXCLUDED_FOLDERS.includes(entry.name)) continue;
        currentOrder = await this.walkDirectory(fullPath, rootPath, files, recurse, currentOrder, defaultFilesToOpen);
      }
    }

    return currentOrder;
  }

  /**
   * Sort file entries by priority: files matching defaultFilesToOpen come first (in order),
   * then remaining files alphabetically
   */
  private sortFilesByPriority(
    fileEntries: import('fs').Dirent[],
    defaultFilesToOpen?: DefaultFileEntry[]
  ): import('fs').Dirent[] {
    console.log('[FolderExport] sortFilesByPriority - input files:', fileEntries.map(f => f.name));
    console.log('[FolderExport] sortFilesByPriority - defaultFilesToOpen:', defaultFilesToOpen);

    if (!defaultFilesToOpen || defaultFilesToOpen.length === 0) {
      // No priority config, just sort alphabetically
      console.log('[FolderExport] No priority config, sorting alphabetically');
      return fileEntries.sort((a, b) => a.name.localeCompare(b.name));
    }

    // Create a map of lowercase filename to priority index (only enabled entries)
    const priorityMap = new Map<string, number>();
    defaultFilesToOpen.forEach((entry, index) => {
      if (entry.isEnabled) {
        priorityMap.set(entry.filename.toLowerCase(), index);
      }
    });
    console.log('[FolderExport] Priority map:', Array.from(priorityMap.entries()));

    const sorted = fileEntries.sort((a, b) => {
      const aPriority = priorityMap.get(a.name.toLowerCase());
      const bPriority = priorityMap.get(b.name.toLowerCase());

      // Both have priority: sort by priority index
      if (aPriority !== undefined && bPriority !== undefined) {
        return aPriority - bPriority;
      }
      // Only a has priority: a comes first
      if (aPriority !== undefined) {
        return -1;
      }
      // Only b has priority: b comes first
      if (bPriority !== undefined) {
        return 1;
      }
      // Neither has priority: sort alphabetically
      return a.name.localeCompare(b.name);
    });

    console.log('[FolderExport] Sorted files:', sorted.map(f => f.name));
    return sorted;
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
  private orderFilesByHierarchy(files: MarkdownFile[]): MarkdownFile[] {
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
    gitInfo?: { repoName?: string; repoUrl?: string; branch?: string },
    subfolderPath?: string,
    logoBase64?: string,
    styling?: PdfStylingOptions
  ): string {
    const date = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const appVersion = app.getVersion();
    const showBranding = styling?.coverPage?.showBranding ?? true;

    // Determine if this is a git repo export or regular folder export
    const isGitRepo = !!gitInfo?.repoUrl || !!gitInfo?.repoName;

    // For non-git folders, calculate base (root) and folder (relative path)
    // If subfolderPath is set, derive root from folderPath by removing subfolderPath
    // Otherwise, use parent directory as base and folder name as folder
    let basePath = '';
    let relativeFolderPath = '';
    if (subfolderPath && folderPath) {
      // subfolderPath is relative path from root, so root = folderPath - subfolderPath
      const normalizedSubfolder = subfolderPath.replace(/\\/g, '/');
      const normalizedFolderPath = folderPath.replace(/\\/g, '/');
      if (normalizedFolderPath.endsWith(normalizedSubfolder)) {
        basePath = folderPath.slice(0, folderPath.length - subfolderPath.length).replace(/[/\\]+$/, '');
      } else {
        basePath = path.dirname(folderPath);
      }
      relativeFolderPath = subfolderPath;
    } else if (folderPath) {
      basePath = path.dirname(folderPath);
      relativeFolderPath = path.basename(folderPath);
    }

    return `
      <div class="cover-page">
        <div class="cover-content">
          ${logoBase64 ? `<img src="${logoBase64}" alt="MarkRead" class="cover-logo" />` : ''}
          <h1 class="cover-title">${this.escapeHtml(title)}</h1>
          ${subtitle ? `<p class="cover-subtitle">${this.escapeHtml(subtitle)}</p>` : ''}

          <div class="cover-details">
            ${isGitRepo ? `
              ${gitInfo?.repoUrl ? `
                <div class="cover-detail-row">
                  <span class="cover-detail-label">Repo</span>
                  <span class="cover-detail-value">${this.escapeHtml(gitInfo.repoUrl)}</span>
                </div>
              ` : gitInfo?.repoName ? `
                <div class="cover-detail-row">
                  <span class="cover-detail-label">Repo</span>
                  <span class="cover-detail-value">${this.escapeHtml(gitInfo.repoName)}</span>
                </div>
              ` : ''}
              ${gitInfo?.branch ? `
                <div class="cover-detail-row">
                  <span class="cover-detail-label">Branch</span>
                  <span class="cover-detail-value"><span class="cover-branch">${this.escapeHtml(gitInfo.branch)}</span></span>
                </div>
              ` : ''}
              ${subfolderPath ? `
                <div class="cover-detail-row">
                  <span class="cover-detail-label">Folder</span>
                  <span class="cover-detail-value">${this.escapeHtml(subfolderPath)}</span>
                </div>
              ` : ''}
            ` : `
              ${basePath ? `
                <div class="cover-detail-row">
                  <span class="cover-detail-label">Base</span>
                  <span class="cover-detail-value">${this.escapeHtml(basePath)}</span>
                </div>
              ` : ''}
              ${relativeFolderPath ? `
                <div class="cover-detail-row">
                  <span class="cover-detail-label">Folder</span>
                  <span class="cover-detail-value">${this.escapeHtml(relativeFolderPath)}</span>
                </div>
              ` : ''}
            `}
          </div>

          <div class="cover-meta">
            ${author ? `<p class="cover-author">${this.escapeHtml(author)}</p>` : ''}
            <p class="cover-date">${date}</p>
          </div>
        </div>
        ${showBranding ? `
        <div class="cover-footer">
          <div class="cover-branding">
            <span class="cover-branding-app">MarkRead ${appVersion}</span>
            <span class="cover-branding-site">schalken.net</span>
          </div>
        </div>
        ` : ''}
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
    // Page numbers are calculated via JavaScript after render and before PDF generation
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
      const parts = file.relativePath.split(/[/\\]/);
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

      // Add file node with page number placeholder
      current.children.push({
        name: parts[parts.length - 1],
        fullPath: file.relativePath,
        anchor: `doc-${index}`,
        title: file.title,
        children: [],
        isFolder: false,
      });
    });

    // Render the tree as nested lists with clickable folder links and page numbers
    const renderNode = (node: TocNode, depth: number): string => {
      if (node.anchor) {
        // File entry with page number placeholder
        return `<li class="toc-file"><a href="#${node.anchor}"><span class="toc-file-title">${this.escapeHtml(node.title || node.name)}</span><span class="toc-page-num" data-target="${node.anchor}"></span></a></li>`;
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
        ? `<a href="#${folderAnchor}" class="toc-folder-link">${this.escapeHtml(node.name)}<span class="toc-page-num" data-target="${folderAnchor}"></span></a>`
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
    _styling?: PdfStylingOptions,
    defaultFilesToOpen?: DefaultFileEntry[]
  ): Map<string, string> {
    const separators = new Map<string, string>();
    // Note: Page numbers are removed because we can't accurately predict them
    // before PDF generation (documents may span multiple pages)

    // Collect unique folder paths
    const folderData = new Map<string, {
      files: MarkdownFile[];
      subfolders: Set<string>;
    }>();

    files.forEach((file, index) => {
      const parts = file.relativePath.split(/[/\\]/);
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

    // Generate separator page for each folder with page number placeholders
    folderData.forEach((data, folderPath) => {
      const anchor = `folder-${this.slugify(folderPath)}`;
      const folderName = folderPath.split('/').pop() || folderPath;

      // Build submenu of subfolders (sorted alphabetically)
      const subfolderLinks = Array.from(data.subfolders).sort().map(sf => {
        const sfPath = `${folderPath}/${sf}`;
        const sfAnchor = `folder-${this.slugify(sfPath)}`;
        return `<li class="separator-submenu-folder"><a href="#${sfAnchor}"><span class="folder-icon">📁</span> <span class="separator-item-title">${this.escapeHtml(sf)}</span><span class="separator-page-num" data-target="${sfAnchor}"></span></a></li>`;
      });

      // Sort files by priority (matching defaultFilesToOpen first), then alphabetically
      const sortedFiles = this.sortMarkdownFilesByPriority(data.files, defaultFilesToOpen);
      const fileLinks = sortedFiles.map(f => {
        return `<li class="separator-submenu-file"><a href="#doc-${f.order}"><span class="file-icon">📄</span> <span class="separator-item-title">${this.escapeHtml(f.title)}</span><span class="separator-page-num" data-target="doc-${f.order}"></span></a></li>`;
      });

      // Files first, then subfolders
      const separatorHtml = `
        <div class="separator-page" id="${anchor}">
          <div class="separator-content">
            <div class="separator-header-compact">
              <span class="separator-icon">📁</span>
              <h1 class="separator-title-compact">${this.escapeHtml(folderName)}</h1>
            </div>
            <ul class="separator-contents-list">
              ${fileLinks.join('\n')}
              ${subfolderLinks.join('\n')}
            </ul>
          </div>
        </div>
      `;

      separators.set(folderPath, separatorHtml);
    });

    return separators;
  }

  /**
   * Sort MarkdownFile array by priority: files matching defaultFilesToOpen come first,
   * then remaining files alphabetically by title
   */
  private sortMarkdownFilesByPriority(
    files: MarkdownFile[],
    defaultFilesToOpen?: DefaultFileEntry[]
  ): MarkdownFile[] {
    if (!defaultFilesToOpen || defaultFilesToOpen.length === 0) {
      return files.sort((a, b) => a.title.localeCompare(b.title));
    }

    // Create a map of lowercase filename to priority index (only enabled entries)
    const priorityMap = new Map<string, number>();
    defaultFilesToOpen.forEach((entry, index) => {
      if (entry.isEnabled) {
        priorityMap.set(entry.filename.toLowerCase(), index);
      }
    });

    return files.sort((a, b) => {
      // Extract filename from relativePath
      const aFilename = path.basename(a.relativePath).toLowerCase();
      const bFilename = path.basename(b.relativePath).toLowerCase();

      const aPriority = priorityMap.get(aFilename);
      const bPriority = priorityMap.get(bFilename);

      // Both have priority: sort by priority index
      if (aPriority !== undefined && bPriority !== undefined) {
        return aPriority - bPriority;
      }
      // Only a has priority: a comes first
      if (aPriority !== undefined) {
        return -1;
      }
      // Only b has priority: b comes first
      if (bPriority !== undefined) {
        return 1;
      }
      // Neither has priority: sort alphabetically by title
      return a.title.localeCompare(b.title);
    });
  }

  /**
   * T066: Build combined HTML document with all files, separator pages, and enhanced styling
   */
  private buildCombinedDocument(
    coverPage: string,
    toc: string,
    files: MarkdownFile[],
    jobId: string,
    subfolderSeparators: Map<string, string> = new Map()
  ): string {
    // T067: Build document sections with page breaks between them
    // Insert separator pages before the first file of each subfolder
    const processedFolders = new Set<string>();
    const documentSections: string[] = [];

    files.forEach((file, index) => {
      const parts = file.relativePath.split(/[/\\]/);
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
       Page Margins
       ============================================ */
    @page {
      margin: 0.75in;
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
      background-color: var(--bg-primary);
      padding: 60px 40px;
      position: relative;
      overflow: hidden;
    }

    .cover-content {
      position: relative;
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
      align-items: baseline;
      padding: 8px 0;
      border-bottom: 1px solid var(--border-light);
      gap: 16px;
    }

    .cover-detail-row:last-child {
      border-bottom: none;
    }

    .cover-detail-label {
      font-size: 11px;
      font-weight: 600;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      min-width: 60px;
      flex-shrink: 0;
    }

    .cover-detail-value {
      font-size: 13px;
      color: var(--text-primary);
      font-weight: 500;
      word-break: break-word;
    }

    .cover-branch {
      display: inline-block;
      background: var(--primary-light);
      color: var(--primary-color);
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
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
      left: 40px;
    }

    .cover-branding {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 2px;
    }

    .cover-branding-app {
      font-size: 11px;
      font-weight: 500;
      color: var(--text-secondary);
    }

    .cover-branding-site {
      font-size: 10px;
      color: var(--text-muted);
    }

    /* Note: The PDF footer (page numbers) appears in the margin area which
       cannot be easily hidden on specific pages with CSS alone. The footer
       will appear on all pages including the title page. */

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
      display: flex;
      justify-content: space-between;
      align-items: center;
      text-decoration: none;
      color: var(--text-primary);
      transition: color 0.15s;
    }

    .toc-file a:hover {
      color: var(--primary-color);
    }

    .toc-file-title {
      flex: 1;
    }

    .toc-page-num {
      flex-shrink: 0;
      color: var(--text-muted);
      font-size: 12px;
      margin-left: 16px;
      min-width: 30px;
      text-align: right;
    }

    .toc-folder {
      padding: 0;
      border: none;
      margin-top: 8px;
    }

    .toc-folder-name,
    .toc-folder-link {
      display: flex;
      justify-content: space-between;
      align-items: center;
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

    .toc-folder-link .toc-page-num {
      font-weight: 400;
    }

    /* ============================================
       Separator Pages (Subfolder) - Compact Layout
       ============================================ */
    .separator-page {
      page-break-before: always;
      page-break-after: always;
      padding: 40px 20px;
    }

    .separator-content {
      max-width: 100%;
    }

    .separator-header-compact {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 3px solid var(--primary-color);
    }

    .separator-icon {
      font-size: 24px;
      flex-shrink: 0;
    }

    .separator-title-compact {
      font-size: 24px;
      font-weight: 700;
      margin: 0;
      color: var(--text-primary);
    }

    .separator-contents-list {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    .separator-submenu-folder,
    .separator-submenu-file {
      padding: 6px 0;
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
      flex-shrink: 0;
      margin-right: 10px;
      font-size: 14px;
    }

    .separator-item-title {
      flex: 1;
    }

    .separator-page-num {
      flex-shrink: 0;
      color: var(--text-muted);
      font-size: 12px;
      margin-left: 16px;
      min-width: 30px;
      text-align: right;
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
      position: relative;
      min-height: calc(100vh - 80px);
    }

    .document-section:first-of-type {
      page-break-before: auto;
    }

    .document-header {
      margin-top: 40px;
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
      padding-bottom: 40px;
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

    /* Broken link styling for out-of-scope links */
    .document-content a.broken-link {
      color: var(--secondary-color);
      cursor: not-allowed;
    }

    .document-content a.broken-link > span {
      text-decoration: underline;
      text-decoration-style: wavy;
      text-decoration-color: #cf222e;
    }

    .document-content .broken-link-ref {
      color: #cf222e;
      font-size: 0.75em;
      margin-left: 1px;
      text-decoration: none;
    }

    /* Broken links footnote section */
    .broken-links-footnote {
      margin-top: 48px;
      padding-top: 16px;
      border-top: 1px solid var(--border-light);
      font-size: 0.9em;
      color: var(--text-secondary);
    }

    .broken-links-footnote .footnote-marker {
      color: #cf222e;
      font-weight: 600;
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
  ${this.generateBrokenLinksFootnote(files)}
  <script src="markread-mermaid-${jobId}.min.js"></script>
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
  </script>
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

  /**
   * Calculate and inject page numbers into TOC and separator page placeholders.
   * This must be called after content is fully rendered.
   *
   * The calculation accounts for:
   * 1. Forced page breaks (page-break-before/after: always)
   * 2. Content height per page
   * 3. Margin space
   */
  private async injectPageNumbers(
    window: BrowserWindow,
    pageSize: 'A4' | 'Letter',
    margins: { top: number; bottom: number }
  ): Promise<void> {
    // Page dimensions in pixels at 96 DPI (standard screen DPI)
    // A4: 210mm x 297mm = ~794 x 1123 pixels
    // Letter: 8.5in x 11in = 816 x 1056 pixels
    const pageHeightPx = pageSize === 'A4' ? 1123 : 1056;
    const marginTopPx = margins.top * 96; // inches to pixels
    const marginBottomPx = margins.bottom * 96;
    const contentHeightPx = pageHeightPx - marginTopPx - marginBottomPx;

    const script = `
      (function() {
        const contentHeight = ${contentHeightPx};

        // Collect all elements that force page breaks in document order
        // These are: cover page, TOC page, separator pages, document sections
        const pageBreakElements = [];

        // Cover page always takes page 1
        const coverPage = document.querySelector('.cover-page');
        if (coverPage) {
          pageBreakElements.push({ element: coverPage, startPage: 1, endPage: 1 });
        }

        // TOC page - starts on page 2
        const tocPage = document.querySelector('.toc-page');
        if (tocPage) {
          // TOC may span multiple pages - calculate based on its height
          const tocRect = tocPage.getBoundingClientRect();
          const tocPages = Math.max(1, Math.ceil(tocRect.height / contentHeight));
          const tocStartPage = pageBreakElements.length > 0
            ? pageBreakElements[pageBreakElements.length - 1].endPage + 1
            : 1;
          pageBreakElements.push({ element: tocPage, startPage: tocStartPage, endPage: tocStartPage + tocPages - 1 });
        }

        // Separator pages and document sections - each starts on a new page
        const contentElements = document.querySelectorAll('.separator-page, .document-section');
        let currentPage = pageBreakElements.length > 0
          ? pageBreakElements[pageBreakElements.length - 1].endPage + 1
          : 1;

        contentElements.forEach(el => {
          const rect = el.getBoundingClientRect();
          const elementPages = Math.max(1, Math.ceil(rect.height / contentHeight));
          pageBreakElements.push({
            element: el,
            id: el.id,
            startPage: currentPage,
            endPage: currentPage + elementPages - 1
          });
          currentPage += elementPages;
        });

        // Now inject page numbers based on the calculated pages
        const pageNumElements = document.querySelectorAll('[data-target]');

        pageNumElements.forEach(el => {
          const targetId = el.getAttribute('data-target');

          // Find the element with this ID in our page break list
          const pageInfo = pageBreakElements.find(p => p.id === targetId);

          if (pageInfo) {
            el.textContent = pageInfo.startPage.toString();
          } else {
            // Fallback: find the element directly and look for its container
            const target = document.getElementById(targetId);
            if (target) {
              // Find which page break container this element is in
              let container = target.closest('.document-section, .separator-page');
              if (container) {
                const containerInfo = pageBreakElements.find(p => p.element === container);
                if (containerInfo) {
                  el.textContent = containerInfo.startPage.toString();
                }
              }
            }
          }
        });

        return true;
      })();
    `;

    await window.webContents.executeJavaScript(script);
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

  /**
   * Generate footnote section for broken links if any exist in the document
   */
  private generateBrokenLinksFootnote(files: MarkdownFile[]): string {
    // Check if any file contains broken links
    const hasBrokenLinks = files.some(f => f.renderedHtml?.includes('class="broken-link"'));

    if (!hasBrokenLinks) {
      return '';
    }

    return `
      <div class="broken-links-footnote" id="broken-link-footnote">
        <p><span class="footnote-marker">[X]</span> This link has been removed as it refers to a location in the original folder that is not part of the export.</p>
      </div>
    `;
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

  /**
   * Build a lookup map from normalized relative paths to file indices
   * Handles various path formats: ./file.md, file.md, subfolder/file.md
   */
  private buildFilePathMap(files: MarkdownFile[]): Map<string, number> {
    const pathMap = new Map<string, number>();
    files.forEach((file, index) => {
      // Normalize path separators and remove leading ./
      const normalizedPath = file.relativePath
        .replace(/\\/g, '/')
        .replace(/^\.\//, '');
      pathMap.set(normalizedPath, index);
      // Also add lowercase version for case-insensitive matching
      pathMap.set(normalizedPath.toLowerCase(), index);
    });
    return pathMap;
  }

  /**
   * Prefix header IDs with document anchor to ensure uniqueness across combined PDF
   * Transforms: <h2 id="intro"> -> <h2 id="doc-0-intro">
   */
  private prefixHeaderIds(html: string, docIndex: number): string {
    const docPrefix = `doc-${docIndex}-`;
    return html.replace(
      /(<h[1-6][^>]*\s)id=(["'])([^"']+)\2/gi,
      (match, tagStart, quote, id) => {
        // Don't prefix if already prefixed
        if (id.startsWith('doc-')) {
          return match;
        }
        return `${tagStart}id=${quote}${docPrefix}${id}${quote}`;
      }
    );
  }

  /**
   * Transform markdown links for PDF export:
   * - Within-page anchor links: prefix with current doc anchor
   * - Cross-file links: transform to internal #doc-X anchors
   * - Out-of-scope links: mark as broken with visual indicator
   */
  private transformLinks(
    html: string,
    currentFileIndex: number,
    currentFile: MarkdownFile,
    filePathMap: Map<string, number>
  ): string {
    const docPrefix = `doc-${currentFileIndex}-`;
    const currentFileDir = path.dirname(currentFile.relativePath);

    return html.replace(
      /(<a\s[^>]*href=["'])([^"']+)(["'][^>]*>)([\s\S]*?)(<\/a>)/gi,
      (match, prefix, href, suffix, linkText, closeTag) => {
        // Skip absolute URLs, mailto, javascript, etc.
        if (/^(https?:|mailto:|javascript:|tel:|file:|data:)/i.test(href)) {
          return match;
        }

        // Handle anchor-only links (within-page)
        if (href.startsWith('#')) {
          const anchor = href.slice(1);
          // Prefix with current document anchor for uniqueness
          return `${prefix}#${docPrefix}${anchor}${suffix}${linkText}${closeTag}`;
        }

        // Handle relative file links
        // Parse the href to separate file path from fragment
        const fragmentIndex = href.indexOf('#');
        const filePath = fragmentIndex >= 0 ? href.slice(0, fragmentIndex) : href;
        const fragment = fragmentIndex >= 0 ? href.slice(fragmentIndex + 1) : '';

        // Handle "." links - reference to the folder's index/separator page
        if (filePath === '.' || filePath === './') {
          // Get the folder path of the current file
          const folderPath = currentFileDir && currentFileDir !== '.'
            ? currentFileDir.replace(/\\/g, '/')
            : '';

          if (folderPath) {
            // Link to the subfolder's separator page (use same slugify as separator generation)
            const folderAnchor = `folder-${this.slugify(folderPath)}`;
            const newHref = fragment ? `#${folderAnchor}-${fragment}` : `#${folderAnchor}`;
            return `${prefix}${newHref}${suffix}${linkText}${closeTag}`;
          } else {
            // Root folder - link to first document (doc-0)
            const newHref = fragment ? `#doc-0-${fragment}` : '#doc-0';
            return `${prefix}${newHref}${suffix}${linkText}${closeTag}`;
          }
        }

        // Skip non-markdown file links (images, etc.)
        if (filePath && !filePath.toLowerCase().endsWith('.md')) {
          return match;
        }

        // Normalize the target path relative to the export folder
        let normalizedTarget = filePath
          .replace(/\\/g, '/')
          .replace(/^\.\//, '');

        // If target is relative to current file's directory, resolve it
        if (currentFileDir && currentFileDir !== '.') {
          normalizedTarget = path.posix.normalize(
            path.posix.join(currentFileDir.replace(/\\/g, '/'), normalizedTarget)
          );
        }

        // Look up target file in the export
        let targetIndex = filePathMap.get(normalizedTarget);
        if (targetIndex === undefined) {
          // Try case-insensitive match
          targetIndex = filePathMap.get(normalizedTarget.toLowerCase());
        }

        if (targetIndex !== undefined) {
          // File is in the export - transform to internal anchor
          let newHref = `#doc-${targetIndex}`;
          if (fragment) {
            // Link to specific section within the target document
            newHref = `#doc-${targetIndex}-${fragment}`;
          }
          return `${prefix}${newHref}${suffix}${linkText}${closeTag}`;
        }

        // File is not in the export - mark as broken
        // Wrap link text in span for styling, add broken-link class and footnote reference
        const brokenPrefix = prefix
          .replace(/href=["']/, 'href="')
          .replace(/<a\s/, '<a class="broken-link" ');
        return `${brokenPrefix}#broken-link-footnote${suffix}<span>${linkText}</span><sup class="broken-link-ref">[X]</sup>${closeTag}`;
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
