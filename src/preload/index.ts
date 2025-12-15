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
  };
  settings: {
    load: (payload: any) => Promise<any>;
    save: (payload: any) => Promise<any>;
    reset: (payload: any) => Promise<any>;
  };
  // More APIs will be added in later phases
}

contextBridge.exposeInMainWorld('electronAPI', {
  file: {
    read: (payload: any) => ipcRenderer.invoke('file:read', payload),
    openFileDialog: (payload: any) => ipcRenderer.invoke('file:openFileDialog', payload),
    openFolderDialog: (payload: any) => ipcRenderer.invoke('file:openFolderDialog', payload),
    getFolderTree: (payload: any) => ipcRenderer.invoke('file:getFolderTree', payload),
  },
  settings: {
    load: (payload: any) => ipcRenderer.invoke('settings:load', payload),
    save: (payload: any) => ipcRenderer.invoke('settings:save', payload),
    reset: (payload: any) => ipcRenderer.invoke('settings:reset', payload),
  },
} as ElectronAPI);

// Type declaration for global window object
declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
