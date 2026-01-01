/**
 * IPC Contract: File Operations
 *
 * Defines the communication interface between renderer and main processes
 * for file system operations (open, read, watch, navigate).
 *
 * Pattern: invoke/handle (async request-response)
 */

// ============================================================================
// Requests (Renderer → Main)
// ============================================================================

export namespace FileOperations {
  /**
   * Open folder dialog and return selected folder path
   * Shortcut: Ctrl+O
   * FR-005, FR-022
   */
  export interface OpenFolderRequest {
    channel: 'file:openFolderDialog';
    payload: {
      defaultPath?: string;  // Optional: Start dialog at this path
    };
  }

  export interface OpenFolderResponse {
    success: boolean;
    folderPath?: string;      // Absolute path to selected folder
    error?: string;           // Error message if failed
  }

  /**
   * Open file dialog and return selected file path(s)
   * Shortcut: Ctrl+Shift+O
   * FR-022
   */
  export interface OpenFileRequest {
    channel: 'file:openFileDialog';
    payload: {
      defaultPath?: string;
      filters?: FileFilter[];  // e.g., [{ name: 'Markdown', extensions: ['md', 'markdown'] }]
      multiSelect?: boolean;   // Allow multiple file selection
    };
  }

  export interface OpenFileResponse {
    success: boolean;
    filePaths?: string[];     // Array of selected file paths
    error?: string;
  }

  /**
   * Read file content from disk
   * Called when opening file in tab
   * FR-019, FR-021
   */
  export interface ReadFileRequest {
    channel: 'file:read';
    payload: {
      filePath: string;        // Absolute path to file
    };
  }

  export interface ReadFileResponse {
    success: boolean;
    content?: string;          // File content as UTF-8 string
    modificationTime?: number; // Unix timestamp (ms) of last modification
    fileSize?: number;         // File size in bytes
    error?: string;            // Error if file not found or not readable
  }

  /**
   * Start watching folder for file changes
   * FR-019, FR-020
   */
  export interface WatchFolderRequest {
    channel: 'file:watchFolder';
    payload: {
      folderPath: string;      // Absolute path to folder
      filePatterns: string[];  // Glob patterns (e.g., ['**/*.md', '**/*.markdown'])
      ignorePatterns: string[]; // Patterns to ignore (node_modules, .git, etc.)
      debounceMs: number;      // Debounce interval (default: 300ms)
    };
  }

  export interface WatchFolderResponse {
    success: boolean;
    watcherId?: string;        // Unique watcher ID for stopping later
    error?: string;
  }

  /**
   * Stop watching folder
   * Called when folder is closed
   * FR-019
   */
  export interface StopWatchingRequest {
    channel: 'file:stopWatching';
    payload: {
      watcherId: string;       // Watcher ID from WatchFolderResponse
    };
  }

  export interface StopWatchingResponse {
    success: boolean;
    error?: string;
  }

  /**
   * Get folder tree structure
   * Used for sidebar file tree
   * FR-006, FR-008a (virtualization at 1000+ files)
   */
  export interface GetFolderTreeRequest {
    channel: 'file:getFolderTree';
    payload: {
      folderPath: string;      // Root folder path
      includeHidden: boolean;  // Include hidden files/folders
      maxDepth?: number;       // Max depth to traverse (optional)
    };
  }

  export interface GetFolderTreeResponse {
    success: boolean;
    tree?: FileTreeNode;
    totalFiles?: number;       // Total file count (for virtualization decision)
    error?: string;
  }

  /**
   * Resolve relative path to absolute path
   * Used for markdown image/link resolution
   * FR-040
   */
  export interface ResolvePathRequest {
    channel: 'file:resolvePath';
    payload: {
      basePath: string;        // Base file path (markdown file)
      relativePath: string;    // Relative path from markdown
    };
  }

  export interface ResolvePathResponse {
    success: boolean;
    absolutePath?: string;     // Resolved absolute path
    exists?: boolean;          // File/folder exists
    error?: string;
  }

  /**
   * Show file in system file explorer
   * FR-024 (context menu integration)
   */
  export interface ShowInExplorerRequest {
    channel: 'file:showInExplorer';
    payload: {
      filePath: string;        // Absolute file path to reveal
    };
  }

  export interface ShowInExplorerResponse {
    success: boolean;
    error?: string;
  }
}

// ============================================================================
// Events (Main → Renderer)
// ============================================================================

export namespace FileEvents {
  /**
   * File changed event (triggered by file watcher)
   * FR-019, FR-020, FR-021
   */
  export interface FileChangedEvent {
    channel: 'file:changed';
    payload: {
      watcherId: string;       // Watcher that detected change
      filePath: string;        // Absolute path to changed file
      eventType: 'add' | 'change' | 'unlink';  // Change type
      modificationTime: number; // New modification timestamp
    };
  }

  /**
   * Folder changed event (folder added/removed)
   * FR-019
   */
  export interface FolderChangedEvent {
    channel: 'folder:changed';
    payload: {
      watcherId: string;
      folderPath: string;
      eventType: 'addDir' | 'unlinkDir';
    };
  }

  /**
   * File watch error event
   * Edge case: circular symlinks, permission errors
   */
  export interface FileWatchErrorEvent {
    channel: 'file:watchError';
    payload: {
      watcherId: string;
      error: string;
      filePath?: string;       // Path that caused error (if applicable)
    };
  }
}

// ============================================================================
// Supporting Types
// ============================================================================

export interface FileFilter {
  name: string;                // Display name (e.g., "Markdown Files")
  extensions: string[];        // File extensions (e.g., ['md', 'markdown'])
}

export interface FileTreeNode {
  name: string;                // File/folder name
  path: string;                // Absolute path
  type: 'file' | 'directory';
  children?: FileTreeNode[];   // Child nodes (for directories)
  size?: number;               // File size in bytes (for files)
  modificationTime?: number;   // Last modified timestamp
}

// ============================================================================
// Usage Example
// ============================================================================

/**
 * Example: Renderer requests to open a file
 *
 * // In renderer process:
 * const result = await window.electronAPI.file.read({
 *   filePath: 'C:\\Users\\user\\Documents\\readme.md'
 * });
 *
 * if (result.success) {
 *   console.log('File content:', result.content);
 * }
 *
 *
 * // In main process (ipc-handlers.ts):
 * ipcMain.handle('file:read', async (event, payload: FileOperations.ReadFileRequest['payload']) => {
 *   try {
 *     const content = await fs.readFile(payload.filePath, 'utf-8');
 *     const stats = await fs.stat(payload.filePath);
 *     return {
 *       success: true,
 *       content,
 *       modificationTime: stats.mtimeMs,
 *       fileSize: stats.size
 *     } as FileOperations.ReadFileResponse;
 *   } catch (error) {
 *     return {
 *       success: false,
 *       error: error.message
 *     } as FileOperations.ReadFileResponse;
 *   }
 * });
 *
 *
 * // In preload script (preload/index.ts):
 * contextBridge.exposeInMainWorld('electronAPI', {
 *   file: {
 *     read: (payload) => ipcRenderer.invoke('file:read', payload),
 *     openFolderDialog: (payload) => ipcRenderer.invoke('file:openFolderDialog', payload),
 *     // ... other file operations
 *   }
 * });
 */
