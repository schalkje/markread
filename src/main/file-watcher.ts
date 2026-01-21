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
      ignored: [
        ...config.ignorePatterns,
        '**/node_modules/**',
        '**/.git/**',
        '**/dist/**',
        '**/out/**',
        '**/.DS_Store',
      ],
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
      console.log('[file-watcher] Watcher ready, currently watching:', watcher.getWatched());
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

    // Watch for file changes
    watcher
      .on('all', (eventType, filePath) => {
        console.log(`[file-watcher] *** ALL EVENT ***: ${eventType} - ${filePath} (watcher: ${config.watcherId}, ready: ${isReady})`);
      })
      .on('add', (filePath) => {
        console.log(`[file-watcher] File added: ${filePath} (watcher: ${config.watcherId}, ready: ${isReady})`);
        debouncedSend('add', filePath);
      })
      .on('change', (filePath) => {
        console.log(`[file-watcher] File changed: ${filePath} (watcher: ${config.watcherId}, ready: ${isReady})`);
        debouncedSend('change', filePath);
      })
      .on('unlink', (filePath) => {
        console.log(`[file-watcher] File removed: ${filePath} (watcher: ${config.watcherId}, ready: ${isReady})`);
        debouncedSend('unlink', filePath);
      })
      .on('error', (error) => {
        console.error(`[file-watcher] Watcher error for ${config.watcherId}:`, error);
        window.webContents.send('file:watchError', {
          watcherId: config.watcherId,
          error: error.message,
        });
      })
      .on('raw', (event, path, details) => {
        console.log(`[file-watcher] RAW event: ${event}, path: ${path}, details:`, details);
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
