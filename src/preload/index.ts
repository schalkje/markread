import { contextBridge, ipcRenderer } from 'electron';

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
  };
  settings: {
    load: (payload: any) => Promise<any>;
    save: (payload: any) => Promise<any>;
    reset: (payload: any) => Promise<any>;
  };
  shell: {
    openExternal: (url: string) => Promise<any>;
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
  },
  settings: {
    load: (payload: any) => ipcRenderer.invoke('settings:load', payload),
    save: (payload: any) => ipcRenderer.invoke('settings:save', payload),
    reset: (payload: any) => ipcRenderer.invoke('settings:reset', payload),
  },
  shell: {
    openExternal: (url: string) => ipcRenderer.invoke('shell:openExternal', { url }),
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
    ];
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, callback);
    }
  },
} as ElectronAPI);

// Type declaration for global window object
declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
