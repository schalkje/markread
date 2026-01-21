/**
 * File Watcher Service
 * Task: T107
 *
 * Implements file watching with chokidar v5 for monitoring markdown files
 * Sends events to renderer when files change
 */

import { BrowserWindow } from 'electron';
import * as path from 'path';

// Dynamic import for chokidar (ES Module)
let chokidar: any = null;
async function getChokidar() {
  if (!chokidar) {
    chokidar = await import('chokidar');
  }
  return chokidar;
}

type FSWatcher = any; // Will be from chokidar.FSWatcher

export interface FileWatcherConfig {
  watcherId: string;
  folderPath: string;
  filePatterns: string[];
  ignorePatterns: string[];
  debounceMs: number;
}

interface ActiveWatcher {
  watcher: FSWatcher;
  config: FileWatcherConfig;
}

// Map of watcher ID to active watcher instances
const activeWatchers = new Map<string, ActiveWatcher>();

/**
 * T107: Start watching a folder for file changes
 */
export async function startWatching(
  config: FileWatcherConfig,
  window: BrowserWindow
): Promise<void> {
  // Stop existing watcher if already watching this ID
  if (activeWatchers.has(config.watcherId)) {
    await stopWatching(config.watcherId);
  }

  try {
    // Get chokidar with dynamic import
    const { watch } = await getChokidar();

    // Configure chokidar watcher
    // Watch the entire folder, filter by extension in event handlers
    // Use native path separators (don't normalize to forward slashes on Windows)
    console.log('[file-watcher] Creating watcher with config:', {
      folderPath: config.folderPath,
      watchingEntireFolder: true,
      ignorePatterns: config.ignorePatterns,
    });

    const watcher = watch(config.folderPath, {
      // Use function for more precise ignore control
      ignored: (path: string, stats?: any) => {
        const pathPart = path.split(/[\\/]/).pop() || '';

        // Block specific directories
        if (['node_modules', '.git', 'dist', 'out', '.vscode', '.idea'].includes(pathPart)) {
          return true; // Ignore these directories
        }

        // If we have stats, check if it's a directory
        if (stats) {
          if (stats.isDirectory()) {
            return false; // Allow all other directories
          }
          // It's a file - only watch markdown files
          return !/\.(md|markdown)$/i.test(path);
        }

        // No stats provided - allow it to be scanned (chokidar will call again with stats)
        return false;
      },
      persistent: true,
      ignoreInitial: false, // MUST be false so chokidar scans and adds files to watch list
      awaitWriteFinish: {
        stabilityThreshold: config.debounceMs,
        pollInterval: 100,
      },
    });

    // Track when watcher is ready to avoid sending events for initial scan
    let isReady = false;

    // Log when watcher is ready
    watcher.on('ready', () => {
      isReady = true;
      const watched = watcher.getWatched();
      // Count total markdown files being watched
      let totalFiles = 0;
      Object.values(watched).forEach((files: any) => {
        totalFiles += files.length;
      });
      console.log(`[file-watcher] Watcher ready, watching ${totalFiles} markdown files in ${Object.keys(watched).length} directories`);
    });

    // Debounce helper
    const debounceTimers = new Map<string, NodeJS.Timeout>();

    const sendEvent = (eventType: 'add' | 'change' | 'unlink', filePath: string) => {
      // T109: Send file:changed events to renderer
      // filePath from chokidar is now absolute since we're not using cwd
      const absolutePath = path.isAbsolute(filePath) ? filePath : path.resolve(config.folderPath, filePath);

      console.log(`[file-watcher] Sending ${eventType} event:`, {
        watcherId: config.watcherId,
        receivedPath: filePath,
        absolutePath: absolutePath,
        folderPath: config.folderPath
      });

      window.webContents.send('file:changed', {
        watcherId: config.watcherId,
        filePath: absolutePath,
        eventType,
        modificationTime: Date.now(),
      });
    };

    const debouncedSend = (eventType: 'add' | 'change' | 'unlink', filePath: string) => {
      // Don't send events during initial scan
      if (!isReady) {
        console.log(`[file-watcher] Ignoring ${eventType} event during initial scan: ${filePath}`);
        return;
      }

      const key = `${eventType}:${filePath}`;

      // Clear existing timer
      if (debounceTimers.has(key)) {
        clearTimeout(debounceTimers.get(key)!);
      }

      // Set new timer
      const timer = setTimeout(() => {
        sendEvent(eventType, filePath);
        debounceTimers.delete(key);
      }, config.debounceMs);

      debounceTimers.set(key, timer);
    };

    // Helper to check if file is markdown (redundant now, but kept for event handlers)
    const isMarkdownFile = (filePath: string): boolean => {
      return /\.(md|markdown)$/i.test(filePath);
    };

    // Watch for file changes (only markdown files due to ignored function)
    watcher
      .on('add', (filePath) => {
        // Double-check file extension (should already be filtered by ignored function)
        if (!isMarkdownFile(filePath)) return;
        console.log(`[file-watcher] File added: ${filePath}`);
        debouncedSend('add', filePath);
      })
      .on('change', (filePath) => {
        // Double-check file extension (should already be filtered by ignored function)
        if (!isMarkdownFile(filePath)) return;
        console.log(`[file-watcher] File changed: ${filePath}`);
        debouncedSend('change', filePath);
      })
      .on('unlink', (filePath) => {
        // Double-check file extension (should already be filtered by ignored function)
        if (!isMarkdownFile(filePath)) return;
        console.log(`[file-watcher] File removed: ${filePath}`);
        debouncedSend('unlink', filePath);
      })
      .on('error', (error) => {
        console.error(`[file-watcher] Watcher error for ${config.watcherId}:`, error);
        window.webContents.send('file:watchError', {
          watcherId: config.watcherId,
          error: error.message,
        });
      });

    // Store active watcher
    activeWatchers.set(config.watcherId, {
      watcher,
      config,
    });

    console.log(`[file-watcher] Started watching folder:`, {
      watcherId: config.watcherId,
      folderPath: config.folderPath,
      filePatterns: config.filePatterns,
      ignorePatterns: config.ignorePatterns,
      debounceMs: config.debounceMs
    });
  } catch (error: any) {
    console.error(`Failed to start watcher ${config.watcherId}:`, error);
    throw error;
  }
}

/**
 * T107: Stop watching a folder
 */
export async function stopWatching(watcherId: string): Promise<void> {
  const activeWatcher = activeWatchers.get(watcherId);

  if (!activeWatcher) {
    console.warn(`Watcher ${watcherId} not found`);
    return;
  }

  try {
    await activeWatcher.watcher.close();
    activeWatchers.delete(watcherId);
    console.log(`Stopped watching: ${watcherId}`);
  } catch (error: any) {
    console.error(`Error stopping watcher ${watcherId}:`, error);
    throw error;
  }
}

/**
 * Stop all active watchers (called on app quit)
 */
export async function stopAllWatchers(): Promise<void> {
  const watcherIds = Array.from(activeWatchers.keys());

  await Promise.all(
    watcherIds.map((id) => stopWatching(id))
  );
}

/**
 * Get list of active watcher IDs
 */
export function getActiveWatchers(): string[] {
  return Array.from(activeWatchers.keys());
}
