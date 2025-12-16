import { BrowserWindow, session } from 'electron';
import { join } from 'path';

// T009: Create BrowserWindow with security configuration (research.md Section 6)
// T012: Implement Content Security Policy
// T159k: Configure for custom title bar
export function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
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
    win.show();
  });

  // T162: Save window bounds on resize/move (will implement in Phase 10)
  // win.on('resize', debounce(() => saveWindowBounds(win.getBounds()), 500));
  // win.on('move', debounce(() => saveWindowBounds(win.getBounds()), 500));

  return win;
}
