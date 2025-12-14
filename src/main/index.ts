import { app, BrowserWindow } from 'electron';
import { join } from 'path';
import { createWindow } from './window-manager';
import { registerIpcHandlers } from './ipc-handlers';
import { initLogger } from './logger';

// T019: Global error handler
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  // Log to file via logger
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason);
});

let mainWindow: BrowserWindow | null = null;

// T020: Initialize logging
initLogger();

// T011: Register all IPC handlers
registerIpcHandlers();

// Single instance lock (FR-028)
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    // Someone tried to run a second instance, focus our window
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    // T009: Create main window with security config
    mainWindow = createWindow();

    app.on('activate', () => {
      // On macOS re-create window when dock icon is clicked
      if (BrowserWindow.getAllWindows().length === 0) {
        mainWindow = createWindow();
      }
    });
  });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
