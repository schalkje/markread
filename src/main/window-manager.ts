import { BrowserWindow, session } from 'electron';
import { join } from 'path';
import { saveUIState } from './ui-state-manager';

// T009: Create BrowserWindow with security configuration (research.md Section 6)
// T012: Implement Content Security Policy
// T159k: Configure for custom title bar
// T163a: Support for multiple BrowserWindow instances

// Track all windows
const windows = new Map<number, BrowserWindow>();

// T051c: Track zoom levels per window (50%-300% = 0.5-3.0 zoom factor)
const windowZoomLevels = new Map<number, number>();

// T166: Debounce helper for window bounds saving
let saveWindowBoundsTimeout: NodeJS.Timeout | null = null;
const SAVE_WINDOW_BOUNDS_DEBOUNCE_MS = 500;

// T167: Window creation with optional bounds restoration
export interface WindowOptions {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  isMaximized?: boolean;
}

export function createWindow(options?: WindowOptions): BrowserWindow {
  const win = new BrowserWindow({
    x: options?.x,
    y: options?.y,
    width: options?.width || 1200,
    height: options?.height || 800,
    minWidth: 800,
    minHeight: 600,
    frame: false, // T159k: Remove default frame for custom title bar
    titleBarStyle: 'hidden', // T159k: Hide title bar
    webPreferences: {
      // Security best practices from research.md Section 6
      nodeIntegration: false, // Prevent direct Node.js access in renderer
      contextIsolation: true, // Isolate preload scripts from renderer
      sandbox: true, // Enable OS-level sandboxing
      webSecurity: true, // Enforce same-origin policy
      allowRunningInsecureContent: false,
      preload: join(__dirname, '../preload/index.js'),
    },
    show: false, // Don't show until ready-to-show
  });

  // T012: Configure Content Security Policy (CSP) from research.md Section 6
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'none';",
          "script-src 'self' 'unsafe-inline';", // Mermaid requires inline scripts
          "style-src 'self' 'unsafe-inline';", // Syntax highlighting styles
          "img-src 'self' file: data:;", // Local images
          "font-src 'self' data:;",
          "connect-src 'none';",
        ].join(' '),
      },
    });
  });

  // Load renderer
  if (process.env.NODE_ENV === 'development') {
    win.loadURL('http://localhost:5173'); // electron-vite dev server
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'));
  }

  // Show window when ready
  win.once('ready-to-show', () => {
    // T167: Restore maximized state if needed
    if (options?.isMaximized) {
      win.maximize();
    }
    win.show();
  });

  // T163a: Track this window
  windows.set(win.id, win);

  // T163a: Clean up when window is closed
  win.on('closed', () => {
    windows.delete(win.id);
  });

  // T166: Save window bounds on resize/move with 500ms debounce
  const saveWindowBounds = () => {
    if (saveWindowBoundsTimeout) {
      clearTimeout(saveWindowBoundsTimeout);
    }

    saveWindowBoundsTimeout = setTimeout(() => {
      const bounds = win.getBounds();
      const isMaximized = win.isMaximized();

      saveUIState({
        windowBounds: {
          x: bounds.x,
          y: bounds.y,
          width: bounds.width,
          height: bounds.height,
          isMaximized,
        },
      }).catch((error) => {
        console.error('Failed to save window bounds:', error);
      });
    }, SAVE_WINDOW_BOUNDS_DEBOUNCE_MS);
  };

  win.on('resize', saveWindowBounds);
  win.on('move', saveWindowBounds);

  return win;
}

// T163a: Get all windows
export function getAllWindows(): BrowserWindow[] {
  return Array.from(windows.values());
}

// T163a: Get window by ID
export function getWindowById(id: number): BrowserWindow | undefined {
  return windows.get(id);
}

// T163a: Get main window (first created window)
export function getMainWindow(): BrowserWindow | undefined {
  const allWindows = Array.from(windows.values());
  return allWindows.length > 0 ? allWindows[0] : undefined;
}

// T163a: Close all windows
export function closeAllWindows(): void {
  windows.forEach((win) => {
    if (!win.isDestroyed()) {
      win.close();
    }
  });
}

// ============================================================================
// T051c: Global Zoom Management
// ============================================================================

/**
 * Set global zoom level for a window
 * @param windowId - The BrowserWindow ID
 * @param zoomFactor - Zoom factor (0.5-3.0 for 50%-300%)
 * @returns The applied zoom factor
 */
export function setGlobalZoom(windowId: number, zoomFactor: number): number {
  const window = windows.get(windowId);
  if (!window || window.isDestroyed()) {
    console.warn(`Window ${windowId} not found or destroyed`);
    return 1.0;
  }

  // Clamp to valid range (0.5-3.0)
  const clampedZoom = Math.max(0.5, Math.min(3.0, zoomFactor));

  // Apply zoom to window's web contents
  window.webContents.setZoomFactor(clampedZoom);

  // Store zoom level for this window
  windowZoomLevels.set(windowId, clampedZoom);

  console.log(`Set global zoom for window ${windowId}: ${Math.round(clampedZoom * 100)}%`);

  return clampedZoom;
}

/**
 * Get global zoom level for a window
 * @param windowId - The BrowserWindow ID
 * @returns The current zoom factor (defaults to 1.0)
 */
export function getGlobalZoom(windowId: number): number {
  return windowZoomLevels.get(windowId) || 1.0;
}

/**
 * Restore global zoom for a window from saved state
 * @param windowId - The BrowserWindow ID
 * @param zoomFactor - Saved zoom factor
 */
export function restoreGlobalZoom(windowId: number, zoomFactor: number): void {
  setGlobalZoom(windowId, zoomFactor);
}
