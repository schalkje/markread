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

    // Register event listeners and store cleanup functions
    const cleanupFileChanged = window.electronAPI.on('file:changed', handleFileChanged);
    const cleanupWatchError = window.electronAPI.on('file:watchError', handleWatchError);

    // Return cleanup function to remove listeners when component unmounts
    return () => {
      cleanupFileChanged?.();
      cleanupWatchError?.();
    };
  }, [onFileChanged, onError]);
}

/**
 * Normalize file path for comparison (handles different separators and case)
 */
function normalizePath(filePath: string): string {
  // Convert all separators to forward slashes and lowercase for consistent comparison
  return filePath.replace(/\\/g, '/').toLowerCase();
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
      console.log('[useFileAutoReload] File changed event:', {
        eventType: event.eventType,
        changedFile: event.filePath,
        currentFile: currentFilePath,
        normalizedChanged: normalizePath(event.filePath),
        normalizedCurrent: currentFilePath ? normalizePath(currentFilePath) : null,
        match: currentFilePath ? normalizePath(event.filePath) === normalizePath(currentFilePath) : false
      });

      if (!currentFilePath) return;

      // Normalize paths for comparison (handles \ vs / and case sensitivity)
      const normalizedEventPath = normalizePath(event.filePath);
      const normalizedCurrentPath = normalizePath(currentFilePath);

      if (event.eventType === 'change' && normalizedEventPath === normalizedCurrentPath) {
        console.log(`[useFileAutoReload] Auto-reloading file: ${event.filePath}`);
        onFileReload(event.filePath);
      } else if (event.eventType === 'unlink' && normalizedEventPath === normalizedCurrentPath) {
        console.warn(`[useFileAutoReload] Current file was deleted: ${event.filePath}`);
        // Could show a notification to user
      }
    },
    (error) => {
      console.error('[useFileAutoReload] File watch error:', error);
    }
  );
}
