import { app, BrowserWindow, protocol, net, session } from 'electron';
import { extname } from 'path';

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

// Register custom protocol for serving local files
// This must be done before app.ready (at module level)
// CRITICAL: This can only be called ONCE - if called again it silently overwrites!
console.log('[Main] About to register protocol schemes...');
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'mdfile',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      stream: true, // Required for loading media (images, videos, etc.)
      corsEnabled: true,
      bypassCSP: true,
    },
  },
]);
console.log('[Main] Custom protocol "mdfile" registered with privileges');

// MIME type mapping for common image formats
const getMimeType = (filepath: string): string => {
  const ext = extname(filepath).toLowerCase();
  const mimeTypes: Record<string, string> = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.webp': 'image/webp',
    '.bmp': 'image/bmp',
    '.ico': 'image/x-icon',
  };
  return mimeTypes[ext] || 'application/octet-stream';
};

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
    console.log('[Main] App ready, registering protocol handler...');

    // Register protocol handler for mdfile:// URLs on the default session
    // CRITICAL: Must register on the session object, not the global protocol object
    session.defaultSession.protocol.handle('mdfile', async (request) => {
    // protocol.handle('mdfile', async (request) => {
      console.log('[Protocol] ===== HANDLER CALLED =====');
      try {
        // Extract URL-encoded path from mdfile:///encoded-path
        const url = request.url;
        console.log('[Protocol] Received URL:', url);

        const encodedPath = url.replace(/^mdfile:\/\/\/?/, '');
        console.log('[Protocol] Encoded path:', encodedPath);

        // Decode the URL-encoded file path
        const filePath = decodeURIComponent(encodedPath);
        console.log('[Protocol] Decoded file path:', filePath);

        // Security check: Ensure we're only serving files (not a web request)
        if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
          console.error('[Protocol] Blocked attempt to access web URL via mdfile protocol:', filePath);
          return new Response('Forbidden', { status: 403 });
        }

        console.log('[Protocol] Serving file:', filePath);

        // Use net.fetch to load the file - this is the recommended way in Electron
        // net.fetch can handle file:// URLs internally
        return await net.fetch('file://' + filePath);
      } catch (error) {
        console.error('[Protocol] Error serving local file:', error);
        return new Response('File not found', { status: 404 });
      }
    });
    console.log('[Main] Protocol handler registered successfully');

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

    // Initialize cache manager (must be done after app is ready)
    const { cacheManager } = await import('./services/storage/cache-manager');
    await cacheManager.initialize();

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
