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
    const watcher = watch(config.filePatterns, {
      cwd: config.folderPath,
      ignored: [
        ...config.ignorePatterns,
        '**/node_modules/**',
        '**/.git/**',
        '**/dist/**',
        '**/out/**',
        '**/.DS_Store',
      ],
      persistent: true,
      ignoreInitial: true, // Don't emit events for existing files
      awaitWriteFinish: {
        stabilityThreshold: config.debounceMs,
        pollInterval: 100,
      },
    });

    // Debounce helper
    const debounceTimers = new Map<string, NodeJS.Timeout>();

    const sendEvent = (eventType: 'add' | 'change' | 'unlink', filePath: string) => {
      // T109: Send file:changed events to renderer
      const absolutePath = path.resolve(config.folderPath, filePath);

      window.webContents.send('file:changed', {
        watcherId: config.watcherId,
        filePath: absolutePath,
        eventType,
        modificationTime: Date.now(),
      });
    };

    const debouncedSend = (eventType: 'add' | 'change' | 'unlink', filePath: string) => {
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
      .on('add', (filePath) => {
        console.log(`File added: ${filePath}`);
        debouncedSend('add', filePath);
      })
      .on('change', (filePath) => {
        console.log(`File changed: ${filePath}`);
        debouncedSend('change', filePath);
      })
      .on('unlink', (filePath) => {
        console.log(`File removed: ${filePath}`);
        debouncedSend('unlink', filePath);
      })
      .on('error', (error) => {
        console.error(`Watcher error for ${config.watcherId}:`, error);
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

    console.log(`Started watching folder: ${config.folderPath} (ID: ${config.watcherId})`);
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
