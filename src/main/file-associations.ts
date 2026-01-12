/**
 * File Association Handlers for MarkRead
 *
 * Handles file open requests from:
 * - Double-clicking .md/.markdown files
 * - Right-click context menu "Open with MarkRead"
 * - Command-line arguments
 * - file:// and markread:// protocols
 *
 * Features:
 * - Single-instance behavior (open in existing window)
 * - Command-line argument processing
 * - Protocol handler registration
 *
 * Tasks: T072-T074
 */

import { app, BrowserWindow } from 'electron';
import { logInfo, logError } from './logger';
import * as path from 'path';

/**
 * T072: Parse command-line arguments to extract file path
 * Handles:
 * - File path as argument: markread.exe "C:\path\to\file.md"
 * - file:// protocol: file:///C:/path/to/file.md
 * - markread:// protocol: markread://path/to/file.md
 */
export function parseFileFromArgs(argv: string[]): string | null {
  // Skip first 2 args (executable and main script)
  const args = argv.slice(2);

  for (const arg of args) {
    // Handle file:// protocol
    if (arg.startsWith('file://')) {
      const filePath = arg.replace('file://', '').replace(/^\/+/, '');
      return decodeURIComponent(filePath);
    }

    // Handle markread:// protocol
    if (arg.startsWith('markread://')) {
      const filePath = arg.replace('markread://', '');
      return decodeURIComponent(filePath);
    }

    // Handle direct file path (check if it's a markdown file)
    if (arg.endsWith('.md') || arg.endsWith('.markdown')) {
      return path.resolve(arg);
    }
  }

  return null;
}

/**
 * T072: Handle file open request
 * Sends file path to renderer process to open the file
 */
export function handleFileOpen(win: BrowserWindow, filePath: string): void {
  if (!win || win.isDestroyed()) {
    logError('[FileAssociations] Cannot open file: window is destroyed');
    return;
  }

  logInfo(`[FileAssociations] Opening file: ${filePath}`);

  // Send file path to renderer
  win.webContents.send('file:open', { filePath });

  // Focus window
  if (win.isMinimized()) {
    win.restore();
  }
  win.focus();
}

/**
 * T073: Set up second-instance handler
 * When user tries to open another file while app is already running,
 * open the file in the existing window instead of creating a new instance
 */
export function setupSecondInstanceHandler(mainWindow: BrowserWindow | null): void {
  // Request single instance lock
  const gotTheLock = app.requestSingleInstanceLock();

  if (!gotTheLock) {
    // Another instance is already running, quit this one
    logInfo('[FileAssociations] Another instance is running, quitting...');
    app.quit();
    return;
  }

  // Handle second-instance event
  app.on('second-instance', (_event, commandLine, _workingDirectory) => {
    logInfo('[FileAssociations] Second instance detected');

    // Parse file path from command line
    const filePath = parseFileFromArgs(commandLine);

    if (mainWindow) {
      // Focus the existing window
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      mainWindow.focus();

      // Open the file if one was specified
      if (filePath) {
        handleFileOpen(mainWindow, filePath);
      }
    }
  });

  logInfo('[FileAssociations] Single instance lock acquired');
}

/**
 * T074: Register file association protocol handler
 * Registers markread:// protocol so files can be opened via custom URLs
 */
export function registerProtocolHandler(): void {
  // Skip in development mode
  if (!app.isPackaged) {
    logInfo('[FileAssociations] Skipping protocol registration (development mode)');
    return;
  }

  // Register markread:// protocol
  if (app.setAsDefaultProtocolClient('markread')) {
    logInfo('[FileAssociations] Registered as default protocol client for markread://');
  } else {
    logError('[FileAssociations] Failed to register as default protocol client');
  }
}

/**
 * Initialize file associations
 * Call this early in app initialization (before app.whenReady())
 */
export function initFileAssociations(mainWindow: BrowserWindow | null): void {
  logInfo('[FileAssociations] Initializing file associations...');

  // T073: Set up single-instance handling
  setupSecondInstanceHandler(mainWindow);

  // T074: Register protocol handler
  registerProtocolHandler();

  logInfo('[FileAssociations] File associations initialized');
}

/**
 * Handle file open on macOS
 * macOS uses 'open-file' event instead of command-line args
 */
export function setupMacOSFileHandler(mainWindow: BrowserWindow | null): void {
  app.on('open-file', (event, filePath) => {
    event.preventDefault();
    logInfo(`[FileAssociations] macOS open-file event: ${filePath}`);

    if (mainWindow && !mainWindow.isDestroyed()) {
      handleFileOpen(mainWindow, filePath);
    }
  });
}
