import { app, BrowserWindow } from 'electron';

import { createWindow } from './window-manager';
import { registerIpcHandlers } from './ipc-handlers';
import { initLogger } from './logger';
import { stopAllWatchers } from './file-watcher';
import { loadUIState, saveUIStateImmediate } from './ui-state-manager';

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

  app.whenReady().then(async () => {
    // T167: Load UI state to restore window bounds and folders
    const uiState = await loadUIState();

    // T009: Create main window with security config
    // T167: Restore window bounds from saved state
    mainWindow = createWindow({
      x: uiState.windowBounds.x,
      y: uiState.windowBounds.y,
      width: uiState.windowBounds.width,
      height: uiState.windowBounds.height,
      isMaximized: uiState.windowBounds.isMaximized,
    });

    // T167: Send initial state to renderer for folders/tabs restoration
    mainWindow.webContents.once('did-finish-load', () => {
      mainWindow?.webContents.send('app:initialState', {
        folders: uiState.folders,
        activeFolder: uiState.activeFolder,
        recentItems: uiState.recentItems,
        splitLayouts: uiState.splitLayouts,
      });
    });

    // T011: Register all IPC handlers (must be done after window is created)
    registerIpcHandlers(mainWindow);

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

// T107: Cleanup file watchers on app quit
// T167: Save UI state immediately before quitting
app.on('before-quit', async () => {
  await stopAllWatchers();

  // Save window bounds immediately before quit
  if (mainWindow && !mainWindow.isDestroyed()) {
    const bounds = mainWindow.getBounds();
    const isMaximized = mainWindow.isMaximized();

    await saveUIStateImmediate({
      windowBounds: {
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height,
        isMaximized,
      },
    });
  }
});
