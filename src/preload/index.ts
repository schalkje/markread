import { contextBridge, ipcRenderer } from 'electron';
import { exposeGitAPI } from './git-api';

console.log('[Preload] Script starting...');

// T010: Preload script with contextBridge exposing IPC APIs (contracts/README.md)
// Security: No direct access to ipcRenderer from renderer process

// Type-safe IPC API
export interface ElectronAPI {
  file: {
    read: (payload: { filePath: string }) => Promise<any>;
    openFileDialog: (payload?: any) => Promise<any>;
    openFolderDialog: (payload?: any) => Promise<any>;
    getFolderTree: (payload: {
      folderPath: string;
      includeHidden: boolean;
      maxDepth?: number;
    }) => Promise<any>;
    watchFolder: (payload: {
      folderPath: string;
      filePatterns: string[];
      ignorePatterns: string[];
      debounceMs: number;
    }) => Promise<any>;
    stopWatching: (payload: { watcherId: string }) => Promise<any>;
    resolvePath: (payload: {
      basePath: string;
      relativePath: string;
    }) => Promise<any>;
    getDirectoryListing: (payload: { directoryPath: string }) => Promise<any>;
    exportToPDF: (payload: { filePath: string; htmlContent: string }) => Promise<any>;
  };
  settings: {
    load: (payload: any) => Promise<any>;
    save: (payload: any) => Promise<any>;
    reset: (payload: any) => Promise<any>;
  };
  shell: {
    openExternal: (url: string) => Promise<any>;
  };
  window: {
    minimize: () => Promise<any>;
    maximize: () => Promise<any>;
    close: () => Promise<any>;
    isMaximized: () => Promise<any>;
    createNew: (payload?: {
      filePath?: string;
      folderPath?: string;
      tabState?: any;
    }) => Promise<any>;
    setGlobalZoom: (payload: { zoomFactor: number }) => Promise<any>; // T051b
    getGlobalZoom: () => Promise<any>; // T051b
  };
  uiState: {
    load: () => Promise<any>;
    save: (payload: { uiState: any }) => Promise<any>;
  };
  on: (channel: string, callback: (event: any, ...args: any[]) => void) => void;
  // More APIs will be added in later phases
}

contextBridge.exposeInMainWorld('electronAPI', {
  file: {
    read: (payload: any) => ipcRenderer.invoke('file:read', payload),
    openFileDialog: (payload: any) => ipcRenderer.invoke('file:openFileDialog', payload),
    openFolderDialog: (payload: any) => ipcRenderer.invoke('file:openFolderDialog', payload),
    getFolderTree: (payload: any) => ipcRenderer.invoke('file:getFolderTree', payload),
    watchFolder: (payload: any) => ipcRenderer.invoke('file:watchFolder', payload),
    stopWatching: (payload: any) => ipcRenderer.invoke('file:stopWatching', payload),
    resolvePath: (payload: any) => ipcRenderer.invoke('file:resolvePath', payload),
    getImageData: (payload: any) => ipcRenderer.invoke('file:getImageData', payload),
    getDirectoryListing: (payload: any) => ipcRenderer.invoke('file:getDirectoryListing', payload),
    exportToPDF: (payload: any) => ipcRenderer.invoke('file:exportToPDF', payload),
  },
  settings: {
    load: (payload: any) => ipcRenderer.invoke('settings:load', payload),
    save: (payload: any) => ipcRenderer.invoke('settings:save', payload),
    reset: (payload: any) => ipcRenderer.invoke('settings:reset', payload),
  },
  shell: {
    openExternal: (url: string) => ipcRenderer.invoke('shell:openExternal', { url }),
  },
  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    maximize: () => ipcRenderer.invoke('window:maximize'),
    close: () => ipcRenderer.invoke('window:close'),
    isMaximized: () => ipcRenderer.invoke('window:isMaximized'),
    createNew: (payload: any) => ipcRenderer.invoke('window:createNew', payload),
    setGlobalZoom: (payload: any) => ipcRenderer.invoke('window:setGlobalZoom', payload), // T051b
    getGlobalZoom: () => ipcRenderer.invoke('window:getGlobalZoom'), // T051b
  },
  uiState: {
    load: () => ipcRenderer.invoke('uiState:load'),
    save: (payload: any) => ipcRenderer.invoke('uiState:save', payload),
  },
  on: (channel: string, callback: (event: any, ...args: any[]) => void) => {
    // T109: Allow renderer to listen for file:changed events and menu commands
    const validChannels = [
      'file:changed',
      'file:watchError',
      'folder:changed',
      'menu:open-file',
      'menu:open-folder',
      'menu:close-current',
      'menu:close-folder',
      'menu:close-all',
      'window:initialState',
      'app:initialState',
      // T051k-view: Content zoom menu events
      'menu:content-zoom-in',
      'menu:content-zoom-out',
      'menu:content-zoom-reset',
      'menu:content-zoom-preset',
      // T051k-view: Global zoom menu events
      'menu:global-zoom-in',
      'menu:global-zoom-out',
      'menu:global-zoom-reset',
      'menu:global-zoom-preset',
    ];
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, callback);
    }
  },
} as ElectronAPI);

console.log('[Preload] ElectronAPI exposed successfully');

// Expose Git API
try {
  console.log('[Preload] Exposing Git API...');
  exposeGitAPI();
  console.log('[Preload] Git API exposed successfully');
} catch (error) {
  console.error('[Preload] Failed to expose Git API:', error);
}

// Type declaration for global window object
declare global {
  interface Window {
    electronAPI: ElectronAPI;
    git: {
      repo: {
        connect: (request: any) => Promise<any>;
        fetchInfo: (request: any) => Promise<any>;
        fetchFile: (request: any) => Promise<any>;
        fetchTree: (request: any) => Promise<any>;
        getCachedTree: (request: any) => Promise<any>;
      };
      auth: Record<string, any>;
      connectivity: {
        check: (request?: any) => Promise<any>;
      };
      recent: Record<string, any>;
    };
  }
}
