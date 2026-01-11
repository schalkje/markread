/**
 * Repository Search Service (Main Process)
 *
 * Cross-file search for Git repositories with async progress and cancellation.
 * Searches files by fetching them from the repository provider (GitHub/Azure DevOps).
 */

import { BrowserWindow } from 'electron';
import { repositoryService } from './services/git/repository-service';
import type { TreeNode } from '@shared/types/repository';
import type { SearchOptions, SearchMatch, SearchResult } from './search-service';

interface ActiveRepositorySearch {
  id: string;
  repositoryId: string;
  branch: string;
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
 * Repository search service for cross-file search in Git repositories
 */
export class RepositorySearchService {
  private activeSearches: Map<string, ActiveRepositorySearch> = new Map();
  private searchIdCounter = 0;

  /**
   * Start a new cross-file search in a repository
   */
  async startSearch(
    window: BrowserWindow,
    repositoryId: string,
    branch: string,
    query: string,
    options: SearchOptions,
    maxResults: number = 1000
  ): Promise<string> {
    const searchId = `repo-search-${++this.searchIdCounter}-${Date.now()}`;

    const activeSearch: ActiveRepositorySearch = {
      id: searchId,
      repositoryId,
      branch,
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
      console.error('Repository search error:', error);
      this.sendSearchError(window, searchId, error.message || 'Unknown search error');
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
    search: ActiveRepositorySearch
  ): Promise<void> {
    try {
      // Fetch repository tree to get list of markdown files
      const treeResponse = await repositoryService.fetchTree({
        repositoryId: search.repositoryId,
        branch: search.branch,
        markdownOnly: true,
      });

      if (!treeResponse?.tree) {
        throw new Error('Failed to fetch repository tree');
      }

      // Collect all markdown file paths from the tree
      const markdownFiles: string[] = [];
      const collectMarkdownFiles = (nodes: TreeNode[]) => {
        for (const node of nodes) {
          if (node.type === 'file' && node.isMarkdown) {
            markdownFiles.push(node.path);
          }
          if (node.children) {
            collectMarkdownFiles(node.children);
          }
        }
      };

      collectMarkdownFiles(treeResponse.tree);

      search.totalFiles = markdownFiles.length;

      // Send initial progress
      this.sendProgress(window, search);

      // Search each file
      for (const filePath of markdownFiles) {
        if (search.cancelled) {
          break;
        }

        try {
          // Fetch file content from repository
          const fileResponse = await repositoryService.fetchFile({
            repositoryId: search.repositoryId,
            filePath: filePath,
            branch: search.branch,
          });

          if (!fileResponse?.content) {
            console.warn(`[RepositorySearch] No content for file: ${filePath}`);
            search.filesSearched++;
            continue;
          }

          // Search the file content
          const result = this.searchFileContent(
            filePath,
            fileResponse.content,
            search.query,
            search.options
          );

          search.filesSearched++;

          if (result && result.matches.length > 0) {
            search.resultsFound += result.matches.length;

            // Send result incrementally
            this.sendResult(window, search.id, result);

            // Check if max results reached
            if (search.resultsFound >= search.maxResults) {
              search.cancelled = true;
              break;
            }
          }

          // Send progress update every 5 files or on last file
          if (
            search.filesSearched % 5 === 0 ||
            search.filesSearched === search.totalFiles
          ) {
            this.sendProgress(window, search);
          }
        } catch (error) {
          // Log file error but continue searching
          console.error(`Error searching file ${filePath}:`, error);
          search.filesSearched++; // Still count it as searched
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
   * Search a file's content for matches
   */
  private searchFileContent(
    filePath: string,
    content: string,
    query: string,
    options: SearchOptions
  ): SearchResult | null {
    const lines = content.split('\n');
    const matches: SearchMatch[] = [];

    const searchRegex = this.buildSearchRegex(query, options);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineMatches = this.findMatchesInLine(
        line,
        searchRegex,
        i + 1
      );

      matches.push(...lineMatches);
    }

    if (matches.length === 0) {
      return null;
    }

    // Extract just the filename from the path
    const fileName = filePath.split('/').pop() || filePath;

    return {
      filePath,
      fileName,
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
    lineNumber: number
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
  private sendProgress(window: BrowserWindow, search: ActiveRepositorySearch): void {
    window.webContents.send('search:progress', {
      searchId: search.id,
      filesSearched: search.filesSearched,
      totalFiles: search.totalFiles,
      currentFile: '',
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
  private sendCompletion(window: BrowserWindow, search: ActiveRepositorySearch): void {
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

export default RepositorySearchService;
