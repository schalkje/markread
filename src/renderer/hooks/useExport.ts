/**
 * useExport Hook
 * Task: T018
 * Provides export functionality to components with progress tracking and error handling
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useExportStore } from '../stores/exportStore';
import type { ExportOptions, FolderExportOptions } from '../../shared/types/export';

interface UseExportResult {
  // State
  isExporting: boolean;
  showProgressDialog: boolean;
  showErrorDialog: boolean;
  currentError: ReturnType<typeof useExportStore.getState>['currentError'];
  progress: { filesProcessed: number; totalFiles: number; percentComplete: number; currentFile?: string };
  status: string;
  destination: string | null;

  // Actions
  exportCurrentPage: (htmlContent: string, defaultFilename?: string, options?: Partial<ExportOptions>) => Promise<void>;
  exportFolder: (folderPath: string, options?: Partial<FolderExportOptions>, defaultFilename?: string) => Promise<void>;
  exportFile: (filePath: string) => Promise<void>;
  cancelExport: () => Promise<void>;
  dismissProgress: () => void;
  dismissError: () => void;
  retryExport: () => Promise<void>;
  viewLogs: () => Promise<void>;
  openExportedFile: () => Promise<void>;
}

export function useExport(): UseExportResult {
  const store = useExportStore();
  const lastExportRef = useRef<{
    htmlContent: string;
    defaultFilename?: string;
    options?: Partial<ExportOptions>;
  } | null>(null);
  const currentJobIdRef = useRef<string | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  // Track progress directly from events (since IPC invoke blocks until complete,
  // the jobId isn't available during the export to match against)
  const [liveProgress, setLiveProgress] = useState<{
    filesProcessed: number;
    totalFiles: number;
    percentComplete: number;
    currentFile?: string;
  }>({ filesProcessed: 0, totalFiles: 1, percentComplete: 0 });
  const [liveStatus, setLiveStatus] = useState<string>('pending');
  const [destination, setDestination] = useState<string | null>(null);

  // Listen for progress events from main process
  useEffect(() => {
    const cleanup = window.exportApi?.onProgress((data) => {
      // Update live progress from any export event (only one export runs at a time)
      if (data.progress) {
        setLiveProgress(data.progress);
      }
      if (data.status) {
        setLiveStatus(data.status);
      }
      if (data.status === 'failed' && data.error) {
        store.setCurrentError({
          code: data.error.code,
          message: data.error.message,
          retryable: data.error.retryable,
        });
      }
    });

    cleanupRef.current = cleanup || null;
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
      }
    };
  }, []);

  const exportCurrentPage = useCallback(async (
    htmlContent: string,
    defaultFilename?: string,
    options?: Partial<ExportOptions>
  ): Promise<void> => {
    // Store for retry
    lastExportRef.current = { htmlContent, defaultFilename, options };

    // Reset progress and show dialog
    setLiveProgress({ filesProcessed: 0, totalFiles: 1, percentComplete: 0 });
    setLiveStatus('pending');
    setDestination(null);
    store.setShowProgressDialog(true);

    try {
      const result = await window.exportApi?.exportToPdf({
        htmlContent,
        defaultFilename,
        options,
      });

      if (!result) {
        throw new Error('Export API not available');
      }

      if (result.cancelled) {
        store.setShowProgressDialog(false);
        return;
      }

      if (!result.success && result.error) {
        store.setCurrentError({
          code: result.error.code,
          message: result.error.message,
          retryable: result.error.retryable,
          details: result.error.details,
        });
        store.setShowProgressDialog(false);
        return;
      }

      if (result.job) {
        currentJobIdRef.current = result.job.id;
        setDestination(result.job.destination);
        // Export completed (the IPC handler blocks until done)
        setLiveProgress({ filesProcessed: 1, totalFiles: 1, percentComplete: 100 });
        setLiveStatus('completed');
      }
    } catch (error) {
      store.setCurrentError({
        code: 'EXPORT_UNKNOWN',
        message: error instanceof Error ? error.message : 'Export failed unexpectedly',
        retryable: true,
      });
      store.setShowProgressDialog(false);
    }
  }, [store]);

  // T072: Export folder to PDF
  const exportFolder = useCallback(async (
    folderPath: string,
    options?: Partial<FolderExportOptions>,
    defaultFilename?: string
  ): Promise<void> => {
    setLiveProgress({ filesProcessed: 0, totalFiles: 0, percentComplete: 0 });
    setLiveStatus('pending');
    setDestination(null);
    store.setShowProgressDialog(true);

    try {
      const folderName = folderPath.split(/[/\\]/).pop() || 'folder';
      const result = await window.exportApi?.exportFolderToPdf({
        folderPath,
        defaultFilename: defaultFilename || `${folderName}-export.pdf`,
        options,
      });

      if (!result) {
        throw new Error('Export API not available');
      }

      if (result.cancelled) {
        store.setShowProgressDialog(false);
        return;
      }

      if (!result.success && result.error) {
        store.setCurrentError({
          code: result.error.code,
          message: result.error.message,
          retryable: result.error.retryable,
          details: result.error.details,
        });
        store.setShowProgressDialog(false);
        return;
      }

      if (result.job) {
        currentJobIdRef.current = result.job.id;
        setDestination(result.job.destination);
        // Export completed (the IPC handler blocks until done)
        setLiveProgress({
          filesProcessed: result.job.filesProcessed || 0,
          totalFiles: result.job.filesProcessed || 0,
          percentComplete: 100,
        });
        setLiveStatus('completed');
      }
    } catch (error) {
      store.setCurrentError({
        code: 'EXPORT_UNKNOWN',
        message: error instanceof Error ? error.message : 'Folder export failed',
        retryable: true,
      });
      store.setShowProgressDialog(false);
    }
  }, [store]);

  // T077-T079: Export single file from file tree (without opening it).
  // Routes through the folder-export pipeline so the resulting PDF has a
  // cover page and the markdown is rendered server-side (fixes empty PDF
  // when the previous CDN-script approach didn't render in time).
  const exportFile = useCallback(async (filePath: string): Promise<void> => {
    setLiveProgress({ filesProcessed: 0, totalFiles: 1, percentComplete: 0 });
    setLiveStatus('pending');
    setDestination(null);
    store.setShowProgressDialog(true);

    try {
      const fileName = filePath.split(/[/\\]/).pop() || 'document';
      const baseName = fileName.replace(/\.(md|markdown|mdown|mkd)$/i, '');

      const result = await window.exportApi?.exportSingleFileToPdf({
        filePath,
        defaultFilename: `${baseName}.pdf`,
      });

      if (!result) {
        throw new Error('Export API not available');
      }

      if (result.cancelled) {
        store.setShowProgressDialog(false);
        return;
      }

      if (!result.success && result.error) {
        store.setCurrentError({
          code: result.error.code,
          message: result.error.message,
          retryable: result.error.retryable,
          details: result.error.details,
        });
        store.setShowProgressDialog(false);
        return;
      }

      if (result.job) {
        currentJobIdRef.current = result.job.id;
        setDestination(result.job.destination);
        setLiveProgress({ filesProcessed: 1, totalFiles: 1, percentComplete: 100 });
        setLiveStatus('completed');
      }
    } catch (error) {
      store.setCurrentError({
        code: 'EXPORT_UNKNOWN',
        message: error instanceof Error ? error.message : 'File export failed',
        retryable: true,
      });
      store.setShowProgressDialog(false);
    }
  }, [store]);

  const cancelExport = useCallback(async (): Promise<void> => {
    if (currentJobIdRef.current) {
      try {
        await window.exportApi?.cancelExport(currentJobIdRef.current);
      } catch (error) {
        console.error('Failed to cancel export:', error);
      }
      store.setShowProgressDialog(false);
    }
  }, [store]);

  const dismissProgress = useCallback((): void => {
    store.setShowProgressDialog(false);
    if (currentJobIdRef.current) {
      store.removeJob(currentJobIdRef.current);
      currentJobIdRef.current = null;
    }
  }, [store]);

  const dismissError = useCallback((): void => {
    store.setShowErrorDialog(false);
  }, [store]);

  const retryExport = useCallback(async (): Promise<void> => {
    store.setShowErrorDialog(false);
    if (lastExportRef.current) {
      const { htmlContent, defaultFilename, options } = lastExportRef.current;
      await exportCurrentPage(htmlContent, defaultFilename, options);
    }
  }, [store, exportCurrentPage]);

  const viewLogs = useCallback(async (): Promise<void> => {
    try {
      await window.exportApi?.openLogsFolder();
    } catch (error) {
      console.error('Failed to open logs folder:', error);
    }
  }, []);

  const openExportedFile = useCallback(async (): Promise<void> => {
    if (destination) {
      try {
        await window.exportApi?.openExportedFile(destination);
      } catch (error) {
        console.error('Failed to open exported file:', error);
      }
    }
  }, [destination]);

  return {
    isExporting: store.showProgressDialog,
    showProgressDialog: store.showProgressDialog,
    showErrorDialog: store.showErrorDialog,
    currentError: store.currentError,
    progress: liveProgress,
    status: liveStatus,
    destination,
    exportCurrentPage,
    exportFolder,
    exportFile,
    cancelExport,
    dismissProgress,
    dismissError,
    retryExport,
    viewLogs,
    openExportedFile,
  };
}

export default useExport;
