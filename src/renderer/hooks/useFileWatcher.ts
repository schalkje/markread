/**
 * File Watcher Hook
 * Task: T110
 *
 * Handles file:changed events from main process
 * Provides auto-reload functionality for open files
 */

import { useEffect } from 'react';

export interface FileChangedEvent {
  watcherId: string;
  filePath: string;
  eventType: 'add' | 'change' | 'unlink';
  modificationTime: number;
}

export interface FileWatchErrorEvent {
  watcherId: string;
  error: string;
  filePath?: string;
}

/**
 * T110: Hook to listen for file changes
 */
export function useFileWatcher(
  onFileChanged?: (event: FileChangedEvent) => void,
  onError?: (event: FileWatchErrorEvent) => void
) {
  useEffect(() => {
    if (!window.electronAPI?.on) {
      console.warn('File watcher API not available');
      return;
    }

    // T110: Handle file:changed events
    const handleFileChanged = (_event: any, data: FileChangedEvent) => {
      console.log(`File ${data.eventType}: ${data.filePath}`);
      onFileChanged?.(data);
    };

    // Handle file watch errors
    const handleWatchError = (_event: any, data: FileWatchErrorEvent) => {
      console.error(`File watch error: ${data.error}`);
      onError?.(data);
    };

    // Register event listeners
    window.electronAPI.on('file:changed', handleFileChanged);
    window.electronAPI.on('file:watchError', handleWatchError);

    // Cleanup not needed as IPC listeners are managed by main process
    return () => {
      // Note: ipcRenderer.removeListener would be needed here if exposed
      // For now, listeners will be cleaned up when window is closed
    };
  }, [onFileChanged, onError]);
}

/**
 * Hook for auto-reloading open files when they change
 */
export function useFileAutoReload(
  currentFilePath: string | null,
  onFileReload: (filePath: string) => void
) {
  useFileWatcher(
    (event) => {
      // T110: Auto-reload if the changed file is currently open
      if (event.eventType === 'change' && currentFilePath === event.filePath) {
        console.log(`Auto-reloading file: ${event.filePath}`);
        onFileReload(event.filePath);
      } else if (event.eventType === 'unlink' && currentFilePath === event.filePath) {
        console.warn(`Current file was deleted: ${event.filePath}`);
        // Could show a notification to user
      }
    },
    (error) => {
      console.error('File watch error:', error);
    }
  );
}
