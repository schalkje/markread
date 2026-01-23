/**
 * Export API Bridge (Preload)
 * Task: T015
 * Exposes export IPC channels to the renderer process securely
 */

import { contextBridge, ipcRenderer } from 'electron';
import type { ExportOptions, FolderExportOptions, ExportSettings } from '../shared/types/export';

export interface ExportAPI {
  // PDF Export
  exportToPdf: (payload: {
    htmlContent: string;
    defaultFilename?: string;
    options?: Partial<Pick<ExportOptions, 'pageSize' | 'margins' | 'printBackground'>>;
  }) => Promise<{
    success: boolean;
    cancelled?: boolean;
    job?: { id: string; status: string; destination: string };
    error?: { code: string; message: string; retryable: boolean; details?: string };
  }>;

  // T069: Folder PDF Export
  exportFolderToPdf: (payload: {
    folderPath: string;
    defaultFilename?: string;
    options?: Partial<Pick<FolderExportOptions, 'pageSize' | 'margins' | 'printBackground' | 'includeSubfolders' | 'generateTOC' | 'coverPage'>>;
  }) => Promise<{
    success: boolean;
    cancelled?: boolean;
    job?: { id: string; status: string; destination: string; filesProcessed?: number };
    error?: { code: string; message: string; retryable: boolean; details?: string };
  }>;

  // Diagram Save
  saveDiagram: (payload: {
    defaultFilename?: string;
    svgData: string;
    pngDataBase64: string;
  }) => Promise<{
    success: boolean;
    cancelled?: boolean;
    filePath?: string;
    error?: string;
  }>;

  // Cancel Export
  cancelExport: (jobId: string) => Promise<{ success: boolean; error?: string }>;

  // Settings
  getSettings: () => Promise<{ success: boolean; settings?: ExportSettings; error?: string }>;
  updateSettings: (settings: Partial<ExportSettings>) => Promise<{ success: boolean; error?: string }>;

  // Logs
  getLogs: (limit?: number) => Promise<{ success: boolean; logs?: any[]; error?: string }>;
  openLogsFolder: () => Promise<{ success: boolean; error?: string }>;

  // Progress events
  onProgress: (callback: (data: {
    jobId: string;
    status: string;
    progress: { filesProcessed: number; totalFiles: number; percentComplete: number; currentFile?: string };
    error?: { code: string; message: string; retryable: boolean };
  }) => void) => () => void;
}

/**
 * Expose export API to renderer
 */
export function exposeExportAPI(): void {
  const exportApi: ExportAPI = {
    exportToPdf: (payload) => ipcRenderer.invoke('export:pdf:single', payload),
    exportFolderToPdf: (payload) => ipcRenderer.invoke('export:pdf:folder', payload),
    saveDiagram: (payload) => ipcRenderer.invoke('diagram:save', payload),
    cancelExport: (jobId) => ipcRenderer.invoke('export:cancel', { jobId }),
    getSettings: () => ipcRenderer.invoke('export:settings:get'),
    updateSettings: (settings) => ipcRenderer.invoke('export:settings:update', { settings }),
    getLogs: (limit) => ipcRenderer.invoke('export:logs:get', { limit }),
    openLogsFolder: () => ipcRenderer.invoke('export:logs:open-folder'),
    onProgress: (callback) => {
      const listener = (_: any, data: any) => callback(data);
      ipcRenderer.on('export:progress', listener);
      return () => ipcRenderer.removeListener('export:progress', listener);
    },
  };

  contextBridge.exposeInMainWorld('exportApi', exportApi);
}
