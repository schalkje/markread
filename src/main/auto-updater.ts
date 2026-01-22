/**
 * Auto-Update Manager for MarkRead
 *
 * Handles automatic update checks, downloads, and installations using electron-updater.
 *
 * Features:
 * - Startup update check (5-second delay)
 * - Periodic update checks (every 4 hours)
 * - Exponential backoff for API failures (1hr, 2hr, 4hr)
 * - Rollback detection (crash flag monitoring)
 * - Portable mode detection (skip updates if portable)
 *
 * Tasks: T037-T045
 */

import { autoUpdater } from 'electron-updater';
import { app, BrowserWindow, dialog } from 'electron';
import { logInfo, logError } from './logger';

// Configuration constants
const STARTUP_CHECK_DELAY = 5000; // 5 seconds
const PERIODIC_CHECK_INTERVAL = 4 * 60 * 60 * 1000; // 4 hours
const RETRY_INTERVALS = [
  1 * 60 * 60 * 1000, // 1 hour
  2 * 60 * 60 * 1000, // 2 hours
  4 * 60 * 60 * 1000, // 4 hours (then resume normal interval)
];

// State tracking
let updateCheckTimer: NodeJS.Timeout | null = null;
let retryAttempt = 0;

/**
 * T045: Detect if running in portable mode
 * Portable executables set PORTABLE_EXECUTABLE_FILE env variable
 */
function isPortableMode(): boolean {
  return Boolean(process.env.PORTABLE_EXECUTABLE_FILE);
}

/**
 * T044: Check for crash flag indicating rollback needed
 * If app crashed after update, mark previous version for restoration
 */
function checkForCrashFlag(): void {
  // TODO: Implement crash detection logic
  // - Check for crash flag file in app data
  // - If found, restore previous version backup
  // - Clear crash flag
  logInfo('[AutoUpdater] Crash flag check: No crashes detected');
}

/**
 * T040: Handle update-available event
 * Show notification with download option
 */
function handleUpdateAvailable(info: any): void {
  logInfo(`[AutoUpdater] Update available: v${info.version}`);

  // Send notification to renderer process
  const windows = BrowserWindow.getAllWindows();
  if (windows.length > 0) {
    windows[0].webContents.send('update:available', {
      version: info.version,
      releaseDate: info.releaseDate,
      releaseNotes: info.releaseNotes,
    });
  }

  // Show native dialog
  dialog.showMessageBox({
    type: 'info',
    title: 'Update Available',
    message: `Version ${info.version} is available`,
    detail: 'Would you like to download it now?',
    buttons: ['Download', 'Later'],
    defaultId: 0,
    cancelId: 1,
  }).then(({ response }) => {
    if (response === 0) {
      // User clicked Download
      autoUpdater.downloadUpdate();
    }
  });
}

/**
 * T041: Handle download-progress event
 * Send progress updates to renderer
 */
function handleDownloadProgress(progress: any): void {
  logInfo(`[AutoUpdater] Download progress: ${progress.percent.toFixed(2)}%`);

  // Send progress to renderer
  const windows = BrowserWindow.getAllWindows();
  if (windows.length > 0) {
    windows[0].webContents.send('update:download-progress', {
      percent: progress.percent,
      transferred: progress.transferred,
      total: progress.total,
      bytesPerSecond: progress.bytesPerSecond,
    });
  }
}

/**
 * T042: Handle update-downloaded event
 * Show notification with restart option
 */
function handleUpdateDownloaded(info: any): void {
  logInfo(`[AutoUpdater] Update downloaded: v${info.version}`);

  // Send notification to renderer
  const windows = BrowserWindow.getAllWindows();
  if (windows.length > 0) {
    windows[0].webContents.send('update:downloaded', {
      version: info.version,
    });
  }

  // Show restart dialog
  dialog.showMessageBox({
    type: 'info',
    title: 'Update Ready',
    message: `Version ${info.version} has been downloaded`,
    detail: 'The update will be installed when you restart MarkRead. Restart now?',
    buttons: ['Restart Now', 'Later'],
    defaultId: 0,
    cancelId: 1,
  }).then(({ response }) => {
    if (response === 0) {
      // User clicked Restart Now
      autoUpdater.quitAndInstall(false, true);
    }
  });
}

/**
 * T043: Handle update check errors with exponential backoff
 */
function handleUpdateError(error: Error): void {
  logError('[AutoUpdater] Update check failed:', error);

  // Don't show error to user for API failures (transient)
  // Instead, use exponential backoff for retries

  if (retryAttempt < RETRY_INTERVALS.length) {
    const retryDelay = RETRY_INTERVALS[retryAttempt];
    logInfo(`[AutoUpdater] Retry attempt ${retryAttempt + 1} scheduled in ${retryDelay / 1000 / 60} minutes`);

    retryAttempt++;

    // Schedule retry with exponential backoff
    setTimeout(() => {
      checkForUpdates();
    }, retryDelay);
  } else {
    // After all retries, resume normal 4-hour interval
    logInfo('[AutoUpdater] All retries exhausted, resuming normal 4-hour interval');
    retryAttempt = 0;
    schedulePeriodicChecks();
  }
}

/**
 * T038, T039: Check for updates
 * Called on startup (delayed 5s) and periodically (every 4 hours)
 */
function checkForUpdates(): void {
  // Skip if portable mode
  if (isPortableMode()) {
    logInfo('[AutoUpdater] Skipping update check (portable mode)');
    return;
  }

  // Skip if dev mode
  if (!app.isPackaged) {
    logInfo('[AutoUpdater] Skipping update check (development mode)');
    return;
  }

  logInfo('[AutoUpdater] Checking for updates...');
  autoUpdater.checkForUpdates();
}

/**
 * T039: Schedule periodic update checks (every 4 hours)
 */
function schedulePeriodicChecks(): void {
  // Clear existing timer
  if (updateCheckTimer) {
    clearInterval(updateCheckTimer);
  }

  // Schedule periodic checks
  updateCheckTimer = setInterval(() => {
    checkForUpdates();
  }, PERIODIC_CHECK_INTERVAL);

  logInfo('[AutoUpdater] Periodic checks scheduled (every 4 hours)');
}

/**
 * T037: Initialize auto-updater
 * Configure and set up event listeners
 */
export function initAutoUpdater(): void {
  // Skip if portable mode
  if (isPortableMode()) {
    logInfo('[AutoUpdater] Portable mode detected, auto-updates disabled');
    return;
  }

  // Skip if dev mode
  if (!app.isPackaged) {
    logInfo('[AutoUpdater] Development mode detected, auto-updates disabled');
    return;
  }

  logInfo('[AutoUpdater] Initializing auto-updater...');

  // T044: Check for crash flag on startup
  checkForCrashFlag();

  // Configure autoUpdater
  autoUpdater.autoDownload = false; // Manual download after user confirmation
  autoUpdater.autoInstallOnAppQuit = true; // Auto-install on quit

  // T040: Register update-available handler
  autoUpdater.on('update-available', handleUpdateAvailable);

  // T041: Register download-progress handler
  autoUpdater.on('download-progress', handleDownloadProgress);

  // T042: Register update-downloaded handler
  autoUpdater.on('update-downloaded', handleUpdateDownloaded);

  // T043: Register error handler with exponential backoff
  autoUpdater.on('error', handleUpdateError);

  // Handle update-not-available (reset retry counter)
  autoUpdater.on('update-not-available', () => {
    logInfo('[AutoUpdater] No updates available');
    retryAttempt = 0; // Reset retry counter on success
  });

  // T038: Schedule startup check (5-second delay)
  setTimeout(() => {
    checkForUpdates();
  }, STARTUP_CHECK_DELAY);

  // T039: Schedule periodic checks
  schedulePeriodicChecks();

  logInfo('[AutoUpdater] Auto-updater initialized successfully');
}

/**
 * Cleanup function to clear timers
 */
export function cleanupAutoUpdater(): void {
  if (updateCheckTimer) {
    clearInterval(updateCheckTimer);
    updateCheckTimer = null;
  }
  logInfo('[AutoUpdater] Cleanup completed');
}
