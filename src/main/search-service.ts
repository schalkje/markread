/**
 * Search Service (Main Process)
 * Task: T170
 *
 * Cross-file search with async progress and cancellation (FR-043, FR-044)
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { BrowserWindow } from 'electron';

export interface SearchOptions {
  caseSensitive: boolean;
  wholeWord: boolean;
  useRegex: boolean;
  excludePatterns: string[];
  includeHiddenFiles: boolean;
}

export interface SearchMatch {
  lineNumber: number;
  columnStart: number;
  columnEnd: number;
  lineContent: string;
  previewSnippet: string;
  highlightStart: number;
  highlightEnd: number;
}

export interface SearchResult {
  filePath: string;
  fileName: string;
  matches: SearchMatch[];
  relativePath?: string;   // T056: Relative path from root folder
  repository?: string;     // T056: Folder/repository name for grouping
  branch?: string;         // T053: Git branch name for multi-branch search
}

interface ActiveSearch {
  id: string;
  folderPath: string; // Single folder path (for backward compatibility)
  folderPaths?: string[]; // T056: Multiple folder paths for multi-folder search
  query: string;
  options: SearchOptions;
  maxResults: number;
  cancelled: boolean;
  startTime: number;
  filesSearched: number;
  totalFiles: number;
  resultsFound: number;
  currentFolderIndex?: number; // T056: Track which folder is being searched
  currentFolderName?: string; // T056: Current folder name for progress display
}

/**
 * T170: Search service for cross-file search
 */
export class SearchService {
  private activeSearches: Map<string, ActiveSearch> = new Map();
  private searchIdCounter = 0;

  /**
   * Start a new cross-file search
   */
  async startSearch(
    window: BrowserWindow,
    folderPath: string,
    query: string,
    options: SearchOptions,
    maxResults: number = 1000
  ): Promise<string> {
    const searchId = `search-${++this.searchIdCounter}-${Date.now()}`;

    const activeSearch: ActiveSearch = {
      id: searchId,
      folderPath,
      query,
      options,
      maxResults,
      cancelled: false,
      startTime: Date.now(),
      filesSearched: 0,
      totalFiles: 0,
      resultsFound: 0,
    };

    this.activeSearches.set(searchId, activeSearch);

    // Start search asynchronously
    this.performSearch(window, activeSearch).catch((error) => {
      console.error('Search error:', error);
      this.sendSearchError(window, searchId, error.message);
    });

    return searchId;
  }

  /**
   * T056: Start a new multi-folder search
   * Searches across multiple folder paths
   */
  async startMultiFolderSearch(
    window: BrowserWindow,
    folderPaths: string[],
    query: string,
    options: SearchOptions,
    maxResults: number = 1000
  ): Promise<string> {
    const searchId = `search-${++this.searchIdCounter}-${Date.now()}`;

    const activeSearch: ActiveSearch = {
      id: searchId,
      folderPath: folderPaths[0] || '', // Fallback to first folder for compatibility
      folderPaths,
      query,
      options,
      maxResults,
      cancelled: false,
      startTime: Date.now(),
      filesSearched: 0,
      totalFiles: 0,
      resultsFound: 0,
      currentFolderIndex: 0,
    };

    this.activeSearches.set(searchId, activeSearch);

    // Start search asynchronously
    this.performMultiFolderSearch(window, activeSearch).catch((error) => {
      console.error('Multi-folder search error:', error);
      this.sendSearchError(window, searchId, error.message);
    });

    return searchId;
  }

  /**
   * T053: Start a new multi-branch search
   * Searches across all Git worktrees (branches)
   */
  async startMultiBranchSearch(
    window: BrowserWindow,
    basePath: string,
    query: string,
    options: SearchOptions,
    maxResults: number = 1000
  ): Promise<string> {
    const searchId = `search-${++this.searchIdCounter}-${Date.now()}`;

    // Discover all worktree folders
    const worktrees = await this.discoverWorktrees(basePath);

    if (worktrees.length === 0) {
      throw new Error('No Git worktrees found');
    }

    const activeSearch: ActiveSearch = {
      id: searchId,
      folderPath: worktrees[0].path, // Fallback to first worktree
      folderPaths: worktrees.map(w => w.path),
      query,
      options,
      maxResults,
      cancelled: false,
      startTime: Date.now(),
      filesSearched: 0,
      totalFiles: 0,
      resultsFound: 0,
      currentFolderIndex: 0,
    };

    this.activeSearches.set(searchId, activeSearch);

    // Start search asynchronously across all branches
    this.performMultiBranchSearch(window, activeSearch, worktrees).catch((error) => {
      console.error('Multi-branch search error:', error);
      this.sendSearchError(window, searchId, error.message);
    });

    return searchId;
  }

  /**
   * Cancel an active search
   */
  cancelSearch(searchId: string): boolean {
    const search = this.activeSearches.get(searchId);
    if (search && !search.cancelled) {
      search.cancelled = true;
      return true;
    }
    return false;
  }

  /**
   * Perform the actual search operation
   */
  private async performSearch(
    window: BrowserWindow,
    search: ActiveSearch
  ): Promise<void> {
    try {
      // Get all markdown files in folder
      const files = await this.findMarkdownFiles(
        search.folderPath,
        search.options
      );

      search.totalFiles = files.length;

      // Send initial progress
      this.sendProgress(window, search);

      // Search each file
      for (const filePath of files) {
        if (search.cancelled) {
          break;
        }

        try {
          const result = await this.searchFile(
            filePath,
            search.query,
            search.options
          );

          search.filesSearched++;

          if (result && result.matches.length > 0) {
            search.resultsFound += result.matches.length;

            // Send result incrementally (FR-044)
            this.sendResult(window, search.id, result);

            // Check if max results reached
            if (search.resultsFound >= search.maxResults) {
              search.cancelled = true;
              break;
            }
          }

          // Send progress update every 10 files or on last file
          if (
            search.filesSearched % 10 === 0 ||
            search.filesSearched === search.totalFiles
          ) {
            this.sendProgress(window, search);
          }
        } catch (error) {
          // Log file error but continue searching
          console.error(`Error searching file ${filePath}:`, error);
          this.sendSearchError(
            window,
            search.id,
            `Error reading file: ${path.basename(filePath)}`,
            filePath
          );
        }
      }

      // Send completion event
      this.sendCompletion(window, search);
    } finally {
      // Clean up
      this.activeSearches.delete(search.id);
    }
  }

  /**
   * T056: Perform multi-folder search operation
   * Searches across multiple folders sequentially
   */
  private async performMultiFolderSearch(
    window: BrowserWindow,
    search: ActiveSearch
  ): Promise<void> {
    try {
      const folderPaths = search.folderPaths || [search.folderPath];

      // First, collect all files from all folders
      const allFiles: Array<{ filePath: string; folderPath: string; folderName: string }> = [];

      for (let i = 0; i < folderPaths.length; i++) {
        if (search.cancelled) break;

        const folderPath = folderPaths[i];
        search.currentFolderIndex = i;
        search.currentFolderName = path.basename(folderPath);

        const files = await this.findMarkdownFiles(folderPath, search.options);

        // Tag each file with its source folder
        for (const filePath of files) {
          allFiles.push({
            filePath,
            folderPath,
            folderName: path.basename(folderPath),
          });
        }
      }

      search.totalFiles = allFiles.length;

      // Send initial progress
      this.sendProgress(window, search);

      // Search each file
      for (const { filePath, folderPath, folderName } of allFiles) {
        if (search.cancelled) {
          break;
        }

        try {
          const result = await this.searchFile(
            filePath,
            search.query,
            search.options,
            folderPath, // Pass folder path for relative path calculation
            folderName  // Pass folder name for grouping
          );

          search.filesSearched++;

          if (result && result.matches.length > 0) {
            search.resultsFound += result.matches.length;

            // Send result incrementally (FR-044)
            this.sendResult(window, search.id, result);

            // Check if max results reached
            if (search.resultsFound >= search.maxResults) {
              search.cancelled = true;
              break;
            }
          }

          // Send progress update every 10 files or on last file
          if (
            search.filesSearched % 10 === 0 ||
            search.filesSearched === search.totalFiles
          ) {
            this.sendProgress(window, search);
          }
        } catch (error) {
          // Log file error but continue searching
          console.error(`Error searching file ${filePath}:`, error);
          this.sendSearchError(
            window,
            search.id,
            `Error reading file: ${path.basename(filePath)}`,
            filePath
          );
        }
      }

      // Send completion event
      this.sendCompletion(window, search);
    } finally {
      // Clean up
      this.activeSearches.delete(search.id);
    }
  }

  /**
   * T053: Discover all Git worktrees in a base directory
   * Worktrees are expected to be in folders like: /repo/markread.worktrees/001-feature-name
   */
  private async discoverWorktrees(basePath: string): Promise<Array<{ path: string; branch: string }>> {
    try {
      const worktrees: Array<{ path: string; branch: string }> = [];

      // Get parent directory that contains worktrees
      const worktreeBase = path.dirname(basePath);
      const entries = await fs.readdir(worktreeBase, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isDirectory()) {
          const worktreePath = path.join(worktreeBase, entry.name);

          // Check if this is a Git worktree by looking for .git file
          try {
            const gitPath = path.join(worktreePath, '.git');
            const gitStat = await fs.stat(gitPath);

            // Worktrees have a .git file (not directory) pointing to main repo
            if (gitStat.isFile()) {
              worktrees.push({
                path: worktreePath,
                branch: entry.name, // Use folder name as branch name
              });
            }
          } catch {
            // Not a worktree, skip
          }
        }
      }

      return worktrees;
    } catch (error) {
      console.error('Error discovering worktrees:', error);
      return [];
    }
  }

  /**
   * T053: Perform multi-branch search operation
   * Searches across multiple Git branches (worktrees)
   */
  private async performMultiBranchSearch(
    window: BrowserWindow,
    search: ActiveSearch,
    worktrees: Array<{ path: string; branch: string }>
  ): Promise<void> {
    try {
      // First, collect all files from all worktrees
      const allFiles: Array<{
        filePath: string;
        folderPath: string;
        folderName: string;
        branch: string;
      }> = [];

      for (let i = 0; i < worktrees.length; i++) {
        if (search.cancelled) break;

        const worktree = worktrees[i];
        search.currentFolderIndex = i;
        search.currentFolderName = worktree.branch;

        const files = await this.findMarkdownFiles(worktree.path, search.options);

        // Tag each file with its branch
        for (const filePath of files) {
          allFiles.push({
            filePath,
            folderPath: worktree.path,
            folderName: path.basename(worktree.path),
            branch: worktree.branch,
          });
        }
      }

      search.totalFiles = allFiles.length;

      // Send initial progress
      this.sendProgress(window, search);

      // Search each file
      for (const { filePath, folderPath, folderName, branch } of allFiles) {
        if (search.cancelled) {
          break;
        }

        try {
          const result = await this.searchFile(
            filePath,
            search.query,
            search.options,
            folderPath,  // Pass folder path for relative path calculation
            folderName,  // Pass folder name for grouping
            branch       // T053: Pass branch name
          );

          search.filesSearched++;

          if (result && result.matches.length > 0) {
            search.resultsFound += result.matches.length;

            // Send result incrementally (FR-044)
            this.sendResult(window, search.id, result);

            // Check if max results reached
            if (search.resultsFound >= search.maxResults) {
              search.cancelled = true;
              break;
            }
          }

          // Send progress update every 10 files or on last file
          if (
            search.filesSearched % 10 === 0 ||
            search.filesSearched === search.totalFiles
          ) {
            this.sendProgress(window, search);
          }
        } catch (error) {
          // Log file error but continue searching
          console.error(`Error searching file ${filePath}:`, error);
          this.sendSearchError(
            window,
            search.id,
            `Error reading file: ${path.basename(filePath)}`,
            filePath
          );
        }
      }

      // Send completion event
      this.sendCompletion(window, search);
    } finally {
      // Clean up
      this.activeSearches.delete(search.id);
    }
  }

  /**
   * Find all markdown files in folder
   */
  private async findMarkdownFiles(
    folderPath: string,
    options: SearchOptions
  ): Promise<string[]> {
    const files: string[] = [];

    const traverse = async (dirPath: string) => {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);

        // Skip hidden files if not included
        if (!options.includeHiddenFiles && entry.name.startsWith('.')) {
          continue;
        }

        // Skip excluded patterns
        if (this.isExcluded(fullPath, folderPath, options.excludePatterns)) {
          continue;
        }

        if (entry.isDirectory()) {
          await traverse(fullPath);
        } else if (entry.isFile() && this.isMarkdownFile(entry.name)) {
          files.push(fullPath);
        }
      }
    };

    await traverse(folderPath);
    return files;
  }

  /**
   * Check if file is markdown
   */
  private isMarkdownFile(fileName: string): boolean {
    const ext = path.extname(fileName).toLowerCase();
    return ext === '.md' || ext === '.markdown';
  }

  /**
   * Check if path should be excluded
   */
  private isExcluded(
    filePath: string,
    rootPath: string,
    excludePatterns: string[]
  ): boolean {
    const relativePath = path.relative(rootPath, filePath);

    for (const pattern of excludePatterns) {
      if (relativePath.includes(pattern)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Search a single file
   * T056: Enhanced to include folder/repository metadata
   * T053: Enhanced to include branch metadata
   */
  private async searchFile(
    filePath: string,
    query: string,
    options: SearchOptions,
    rootFolderPath?: string, // T056: Root folder for relative path calculation
    folderName?: string,     // T056: Folder name for grouping
    branch?: string          // T053: Branch name for multi-branch search
  ): Promise<SearchResult | null> {
    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.split('\n');
    const matches: SearchMatch[] = [];

    const searchRegex = this.buildSearchRegex(query, options);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineMatches = this.findMatchesInLine(
        line,
        searchRegex,
        i + 1,
        query,
        options
      );

      matches.push(...lineMatches);
    }

    if (matches.length === 0) {
      return null;
    }

    // Calculate relative path if root folder provided
    const relativePath = rootFolderPath
      ? path.relative(rootFolderPath, filePath)
      : filePath;

    return {
      filePath,
      fileName: path.basename(filePath),
      matches,
      relativePath,       // T056: Added for better result display
      repository: folderName, // T056: Use folder name as repository identifier
      branch,             // T053: Include branch name
    };
  }

  /**
   * Build search regex from query and options
   */
  private buildSearchRegex(query: string, options: SearchOptions): RegExp {
    let pattern = query;

    if (!options.useRegex) {
      // Escape special regex characters
      pattern = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    if (options.wholeWord) {
      pattern = `\\b${pattern}\\b`;
    }

    const flags = options.caseSensitive ? 'g' : 'gi';

    try {
      return new RegExp(pattern, flags);
    } catch (error) {
      // Invalid regex, fall back to literal search
      const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return new RegExp(escapedQuery, flags);
    }
  }

  /**
   * Find all matches in a line
   */
  private findMatchesInLine(
    line: string,
    regex: RegExp,
    lineNumber: number,
    query: string,
    options: SearchOptions
  ): SearchMatch[] {
    const matches: SearchMatch[] = [];
    let match: RegExpExecArray | null;

    // Reset regex lastIndex
    regex.lastIndex = 0;

    while ((match = regex.exec(line)) !== null) {
      const columnStart = match.index;
      const columnEnd = columnStart + match[0].length;

      // Create preview snippet (50 chars before/after)
      const snippetStart = Math.max(0, columnStart - 50);
      const snippetEnd = Math.min(line.length, columnEnd + 50);
      const previewSnippet = line.slice(snippetStart, snippetEnd);

      const highlightStart = columnStart - snippetStart;
      const highlightEnd = highlightStart + match[0].length;

      matches.push({
        lineNumber,
        columnStart,
        columnEnd,
        lineContent: line,
        previewSnippet,
        highlightStart,
        highlightEnd,
      });

      // Prevent infinite loop on zero-width matches
      if (match[0].length === 0) {
        regex.lastIndex++;
      }
    }

    return matches;
  }

  /**
   * Send progress update to renderer
   */
  private sendProgress(window: BrowserWindow, search: ActiveSearch): void {
    window.webContents.send('search:progress', {
      searchId: search.id,
      filesSearched: search.filesSearched,
      totalFiles: search.totalFiles,
      currentFile: '', // Could track current file if needed
      resultsFound: search.resultsFound,
    });
  }

  /**
   * Send search result to renderer
   */
  private sendResult(
    window: BrowserWindow,
    searchId: string,
    result: SearchResult
  ): void {
    window.webContents.send('search:result', {
      searchId,
      result,
    });
  }

  /**
   * Send completion event to renderer
   */
  private sendCompletion(window: BrowserWindow, search: ActiveSearch): void {
    const executionTime = Date.now() - search.startTime;

    window.webContents.send('search:complete', {
      searchId: search.id,
      results: [], // Results already sent incrementally via search:result
      totalMatches: search.resultsFound,
      filesSearched: search.filesSearched,
      executionTime: executionTime,
    });
  }

  /**
   * Send error event to renderer
   */
  private sendSearchError(
    window: BrowserWindow,
    searchId: string,
    error: string,
    filePath?: string
  ): void {
    window.webContents.send('search:error', {
      searchId,
      error,
      filePath,
    });
  }
}

export default SearchService;
