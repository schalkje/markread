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
}

interface ActiveSearch {
  id: string;
  folderPath: string;
  query: string;
  options: SearchOptions;
  maxResults: number;
  cancelled: boolean;
  startTime: number;
  filesSearched: number;
  totalFiles: number;
  resultsFound: number;
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
   */
  private async searchFile(
    filePath: string,
    query: string,
    options: SearchOptions
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

    return {
      filePath,
      fileName: path.basename(filePath),
      matches,
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
    const durationMs = Date.now() - search.startTime;

    window.webContents.send('search:completed', {
      searchId: search.id,
      totalResults: search.resultsFound,
      filesWithMatches: 0, // Could track this separately if needed
      durationMs,
      cancelled: search.cancelled,
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
