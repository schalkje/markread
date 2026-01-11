/**
 * Search IPC Handlers
 * Task: T005
 *
 * Electron IPC handlers for search operations.
 * Bridges renderer requests to the SearchService in main process.
 *
 * Provides handlers for:
 * - Multi-file search (FR-043)
 * - Search cancellation (FR-044)
 * - Progress events and result streaming
 */

import { ipcMain, BrowserWindow } from 'electron';
import { SearchService } from '../search-service';
import { RepositorySearchService } from '../repository-search-service';
import type {
  SearchRequest,
  SearchResponse,
  SearchCancelRequest,
  SearchCancelResponse,
} from '@shared/types/search';

// Create singleton search service instances
const searchService = new SearchService();
const repositorySearchService = new RepositorySearchService();

/**
 * Register all Search IPC handlers
 * T005: IPC handler registration
 */
export function registerSearchHandlers(): void {
  console.log('[IPC] Registering search handlers...');

  // =========================================================================
  // Multi-File Search Handler (FR-043)
  // =========================================================================

  /**
   * T041: Handle multi-file search request
   * Channel: search:in-files
   *
   * Starts an asynchronous search operation that sends progress events
   * back to the renderer process via 'search:progress', 'search:result',
   * 'search:complete', and 'search:error' channels.
   *
   * @param request - SearchRequest with query, folder path, and options
   * @returns SearchResponse with searchId for tracking
   */
  ipcMain.handle(
    'search:in-files',
    async (event, request: SearchRequest): Promise<SearchResponse> => {
      try {
        console.log('[IPC] search:in-files request:', {
          query: request.query,
          folderPath: request.folderPath,
          repositoryId: request.repositoryId,
          branch: request.branch,
          options: request.options,
        });

        // Validate request
        if (!request.query) {
          return {
            success: false,
            searchId: '',
            error: 'Invalid search request: query is required',
          };
        }

        // Check if this is a repository or folder search
        const isRepositorySearch = !!request.repositoryId;
        const isFolderSearch = !!request.folderPath;

        if (!isRepositorySearch && !isFolderSearch) {
          return {
            success: false,
            searchId: '',
            error: 'Invalid search request: either folderPath or repositoryId is required',
          };
        }

        // Get the browser window that sent the request
        const window = BrowserWindow.fromWebContents(event.sender);
        if (!window) {
          return {
            success: false,
            searchId: '',
            error: 'Unable to find browser window',
          };
        }

        let searchId: string;

        // Prepare search options
        const searchOptions = {
          caseSensitive: request.options?.caseSensitive ?? false,
          wholeWord: request.options?.wholeWord ?? false,
          useRegex: request.options?.useRegex ?? false,
          excludePatterns: request.options?.excludePatterns ?? ['node_modules', '.git', 'dist', 'build'],
          includeHiddenFiles: request.options?.includeHiddenFiles ?? false,
        };

        if (isRepositorySearch) {
          // Repository search
          const branch = request.branch || 'main'; // Default to 'main' if not specified
          searchId = await repositorySearchService.startSearch(
            window,
            request.repositoryId!,
            branch,
            request.query,
            searchOptions,
            request.maxResults ?? 1000
          );
          console.log('[IPC] Repository search started with ID:', searchId);
        } else {
          // Local folder search - determine search type based on scope
          const folderScope = request.folderScope || 'current';

          if (folderScope === 'allBranches') {
            // T053: Multi-branch search across Git worktrees
            searchId = await searchService.startMultiBranchSearch(
              window,
              request.folderPath!,
              request.query,
              searchOptions,
              request.maxResults ?? 1000
            );
            console.log('[IPC] Multi-branch search started with ID:', searchId);
          } else if (folderScope === 'allOpen' && request.folderPaths && request.folderPaths.length > 0) {
            // T056: Multi-folder search across all open folders
            searchId = await searchService.startMultiFolderSearch(
              window,
              request.folderPaths,
              request.query,
              searchOptions,
              request.maxResults ?? 1000
            );
            console.log('[IPC] Multi-folder search started with ID:', searchId, 'folders:', request.folderPaths.length);
          } else {
            // Default: Single folder search
            searchId = await searchService.startSearch(
              window,
              request.folderPath!,
              request.query,
              searchOptions,
              request.maxResults ?? 1000
            );
            console.log('[IPC] Single folder search started with ID:', searchId);
          }
        }

        return {
          success: true,
          searchId,
        };
      } catch (error: any) {
        console.error('[IPC] Error starting search:', error);
        return {
          success: false,
          searchId: '',
          error: error.message || 'Unknown error starting search',
        };
      }
    }
  );

  // =========================================================================
  // Search Cancellation Handler (FR-044)
  // =========================================================================

  /**
   * T042: Handle search cancellation request
   * Channel: search:cancel
   *
   * Cancels an active search operation. The search will stop as soon as
   * possible and send a completion event with cancelled=true.
   *
   * @param request - SearchCancelRequest with searchId
   * @returns SearchCancelResponse indicating success
   */
  ipcMain.handle(
    'search:cancel',
    async (_event, request: SearchCancelRequest): Promise<SearchCancelResponse> => {
      try {
        console.log('[IPC] search:cancel request:', request.searchId);

        if (!request.searchId) {
          return {
            success: false,
            error: 'Invalid cancel request: searchId is required',
          };
        }

        // Try to cancel in both services (one will succeed if search exists)
        const cancelledInFolder = searchService.cancelSearch(request.searchId);
        const cancelledInRepo = repositorySearchService.cancelSearch(request.searchId);
        const cancelled = cancelledInFolder || cancelledInRepo;

        if (!cancelled) {
          return {
            success: false,
            error: 'Search not found or already completed',
          };
        }

        console.log('[IPC] Search cancelled:', request.searchId);

        return {
          success: true,
        };
      } catch (error: any) {
        console.error('[IPC] Error cancelling search:', error);
        return {
          success: false,
          error: error.message || 'Unknown error cancelling search',
        };
      }
    }
  );

  console.log('[IPC] Search handlers registered successfully');
}

/**
 * Unregister search handlers (for cleanup)
 */
export function unregisterSearchHandlers(): void {
  ipcMain.removeHandler('search:in-files');
  ipcMain.removeHandler('search:cancel');
  console.log('[IPC] Search handlers unregistered');
}
