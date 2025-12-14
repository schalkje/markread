/**
 * TypeScript Type Definitions: IPC Contracts
 * Based on specs/006-electron-redesign/contracts/
 *
 * Defines all IPC communication interfaces between main and renderer processes
 */

// ============================================================================
// File Operations
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

export namespace FileOperations {
  export interface OpenFolderRequest {
    defaultPath?: string;
  }

  export interface OpenFolderResponse {
    success: boolean;
    folderPath?: string;
    error?: string;
  }

  export interface OpenFileRequest {
    defaultPath?: string;
    filters?: FileFilter[];
    multiSelect?: boolean;
  }

  export interface OpenFileResponse {
    success: boolean;
    filePaths?: string[];
    error?: string;
  }

  export interface ReadFileRequest {
    filePath: string;
  }

  export interface ReadFileResponse {
    success: boolean;
    content?: string;
    modificationTime?: number;
    fileSize?: number;
    error?: string;
  }

  export interface WatchFolderRequest {
    folderPath: string;
    filePatterns: string[];
    ignorePatterns: string[];
    debounceMs: number;
  }

  export interface WatchFolderResponse {
    success: boolean;
    watcherId?: string;
    error?: string;
  }

  export interface StopWatchingRequest {
    watcherId: string;
  }

  export interface StopWatchingResponse {
    success: boolean;
    error?: string;
  }

  export interface GetFolderTreeRequest {
    folderPath: string;
    includeHidden: boolean;
    maxDepth?: number;
  }

  export interface GetFolderTreeResponse {
    success: boolean;
    tree?: FileTreeNode;
    totalFiles?: number;
    error?: string;
  }

  export interface ResolvePathRequest {
    basePath: string;
    relativePath: string;
  }

  export interface ResolvePathResponse {
    success: boolean;
    absolutePath?: string;
    exists?: boolean;
    error?: string;
  }

  export interface ShowInExplorerRequest {
    filePath: string;
  }

  export interface ShowInExplorerResponse {
    success: boolean;
    error?: string;
  }
}

export namespace FileEvents {
  export interface FileChangedEvent {
    watcherId: string;
    filePath: string;
    eventType: 'add' | 'change' | 'unlink';
    modificationTime: number;
  }

  export interface FolderChangedEvent {
    watcherId: string;
    folderPath: string;
    eventType: 'addDir' | 'unlinkDir';
  }

  export interface FileWatchErrorEvent {
    watcherId: string;
    error: string;
    filePath?: string;
  }
}

// ============================================================================
// Settings Operations
// ============================================================================

export interface ValidationError {
  category: string;
  field: string;
  value: any;
  message: string;
  constraint: string;
}

export interface ValidationWarning {
  category: string;
  field: string;
  value: any;
  message: string;
  suggestion?: string;
}

export namespace SettingsOperations {
  export interface LoadSettingsRequest {
    folderPath?: string;
  }

  export interface LoadSettingsResponse {
    success: boolean;
    settings?: any; // Settings type from entities
    source: 'global' | 'folder' | 'default';
    warnings?: string[];
    error?: string;
  }

  export interface SaveSettingsRequest {
    settings: any; // Partial<Settings>
    folderPath?: string;
  }

  export interface SaveSettingsResponse {
    success: boolean;
    backupCreated?: boolean;
    error?: string;
  }

  export interface ValidateSettingsRequest {
    settings: any; // Partial<Settings>
    category?: string;
  }

  export interface ValidateSettingsResponse {
    success: boolean;
    errors?: ValidationError[];
    warnings?: ValidationWarning[];
  }

  export interface ResetSettingsRequest {
    categories?: string[];
    confirm: boolean;
  }

  export interface ResetSettingsResponse {
    success: boolean;
    settings?: any;
    error?: string;
  }

  export interface ExportSettingsRequest {
    filePath: string;
    categories?: string[];
  }

  export interface ExportSettingsResponse {
    success: boolean;
    exportedCategories?: string[];
    error?: string;
  }

  export interface ImportSettingsRequest {
    filePath: string;
    mode: 'merge' | 'replace' | 'selective';
    categories?: string[];
  }

  export interface ImportSettingsResponse {
    success: boolean;
    importedCategories?: string[];
    errors?: ValidationError[];
    warnings?: string[];
    error?: string;
  }
}

export namespace SettingsEvents {
  export interface SettingsChangedEvent {
    changedCategories: string[];
    newSettings: any;
    source: 'user' | 'import' | 'reset' | 'repair' | 'env_override';
  }
}

// ============================================================================
// Search Operations
// ============================================================================

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

export interface SearchHistoryEntry {
  query: string;
  type: 'inPage' | 'inFiles';
  timestamp: number;
  resultsCount?: number;
}

export namespace SearchOperations {
  export interface SearchInFilesRequest {
    folderPath: string;
    query: string;
    options: SearchOptions;
    maxResults?: number;
  }

  export interface SearchInFilesResponse {
    success: boolean;
    searchId?: string;
    error?: string;
  }

  export interface CancelSearchRequest {
    searchId: string;
  }

  export interface CancelSearchResponse {
    success: boolean;
    cancelled?: boolean;
    error?: string;
  }

  export interface GetSearchHistoryRequest {
    maxEntries?: number;
  }

  export interface GetSearchHistoryResponse {
    success: boolean;
    history?: SearchHistoryEntry[];
    error?: string;
  }

  export interface AddSearchHistoryRequest {
    query: string;
    type: 'inPage' | 'inFiles';
    timestamp: number;
  }

  export interface AddSearchHistoryResponse {
    success: boolean;
  }
}

export namespace SearchEvents {
  export interface SearchProgressEvent {
    searchId: string;
    filesSearched: number;
    totalFiles: number;
    currentFile: string;
    resultsFound: number;
  }

  export interface SearchResultEvent {
    searchId: string;
    result: SearchResult;
  }

  export interface SearchCompletedEvent {
    searchId: string;
    totalResults: number;
    filesWithMatches: number;
    durationMs: number;
    cancelled: boolean;
  }

  export interface SearchErrorEvent {
    searchId: string;
    error: string;
    filePath?: string;
  }
}

// ============================================================================
// Window Operations
// ============================================================================

export namespace WindowOperations {
  export interface MinimizeWindowRequest {}
  export interface MinimizeWindowResponse {
    success: boolean;
  }

  export interface MaximizeWindowRequest {}
  export interface MaximizeWindowResponse {
    success: boolean;
    isMaximized: boolean;
  }

  export interface CloseWindowRequest {}
  export interface CloseWindowResponse {
    success: boolean;
  }

  export interface GetWindowBoundsRequest {}
  export interface GetWindowBoundsResponse {
    success: boolean;
    bounds?: {
      x: number;
      y: number;
      width: number;
      height: number;
      isMaximized: boolean;
    };
  }

  export interface SetWindowBoundsRequest {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
  }

  export interface SetWindowBoundsResponse {
    success: boolean;
    error?: string;
  }
}

// ============================================================================
// UI State Operations
// ============================================================================

export namespace UIStateOperations {
  export interface LoadUIStateRequest {}
  export interface LoadUIStateResponse {
    success: boolean;
    uiState?: any; // UIState type
    error?: string;
  }

  export interface SaveUIStateRequest {
    uiState: any; // Partial<UIState>
  }

  export interface SaveUIStateResponse {
    success: boolean;
    error?: string;
  }
}

// ============================================================================
// Electron API (exposed via preload)
// ============================================================================

export interface ElectronAPI {
  file: {
    openFolderDialog: (payload: FileOperations.OpenFolderRequest) => Promise<FileOperations.OpenFolderResponse>;
    openFileDialog: (payload: FileOperations.OpenFileRequest) => Promise<FileOperations.OpenFileResponse>;
    read: (payload: FileOperations.ReadFileRequest) => Promise<FileOperations.ReadFileResponse>;
    watchFolder: (payload: FileOperations.WatchFolderRequest) => Promise<FileOperations.WatchFolderResponse>;
    stopWatching: (payload: FileOperations.StopWatchingRequest) => Promise<FileOperations.StopWatchingResponse>;
    getFolderTree: (payload: FileOperations.GetFolderTreeRequest) => Promise<FileOperations.GetFolderTreeResponse>;
    resolvePath: (payload: FileOperations.ResolvePathRequest) => Promise<FileOperations.ResolvePathResponse>;
    showInExplorer: (payload: FileOperations.ShowInExplorerRequest) => Promise<FileOperations.ShowInExplorerResponse>;
  };
  settings: {
    load: (payload: SettingsOperations.LoadSettingsRequest) => Promise<SettingsOperations.LoadSettingsResponse>;
    save: (payload: SettingsOperations.SaveSettingsRequest) => Promise<SettingsOperations.SaveSettingsResponse>;
    validate: (payload: SettingsOperations.ValidateSettingsRequest) => Promise<SettingsOperations.ValidateSettingsResponse>;
    reset: (payload: SettingsOperations.ResetSettingsRequest) => Promise<SettingsOperations.ResetSettingsResponse>;
    export: (payload: SettingsOperations.ExportSettingsRequest) => Promise<SettingsOperations.ExportSettingsResponse>;
    import: (payload: SettingsOperations.ImportSettingsRequest) => Promise<SettingsOperations.ImportSettingsResponse>;
  };
  search: {
    inFiles: (payload: SearchOperations.SearchInFilesRequest) => Promise<SearchOperations.SearchInFilesResponse>;
    cancel: (payload: SearchOperations.CancelSearchRequest) => Promise<SearchOperations.CancelSearchResponse>;
    getHistory: (payload: SearchOperations.GetSearchHistoryRequest) => Promise<SearchOperations.GetSearchHistoryResponse>;
    addHistory: (payload: SearchOperations.AddSearchHistoryRequest) => Promise<SearchOperations.AddSearchHistoryResponse>;
  };
  window: {
    minimize: (payload: WindowOperations.MinimizeWindowRequest) => Promise<WindowOperations.MinimizeWindowResponse>;
    maximize: (payload: WindowOperations.MaximizeWindowRequest) => Promise<WindowOperations.MaximizeWindowResponse>;
    close: (payload: WindowOperations.CloseWindowRequest) => Promise<WindowOperations.CloseWindowResponse>;
    getBounds: (payload: WindowOperations.GetWindowBoundsRequest) => Promise<WindowOperations.GetWindowBoundsResponse>;
    setBounds: (payload: WindowOperations.SetWindowBoundsRequest) => Promise<WindowOperations.SetWindowBoundsResponse>;
  };
  uiState: {
    load: (payload: UIStateOperations.LoadUIStateRequest) => Promise<UIStateOperations.LoadUIStateResponse>;
    save: (payload: UIStateOperations.SaveUIStateRequest) => Promise<UIStateOperations.SaveUIStateResponse>;
  };
  on: (channel: string, callback: (event: any) => void) => void;
}

// Extend Window interface to include electronAPI
declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
