"use strict";
const electron = require("electron");
const path = require("path");
const promises = require("fs/promises");
const zod = require("zod");
function createWindow() {
  const win = new electron.BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      // Security best practices from research.md Section 6
      nodeIntegration: false,
      // Prevent direct Node.js access in renderer
      contextIsolation: true,
      // Isolate preload scripts from renderer
      sandbox: true,
      // Enable OS-level sandboxing
      webSecurity: true,
      // Enforce same-origin policy
      allowRunningInsecureContent: false,
      preload: path.join(__dirname, "../preload/index.js")
    },
    show: false
    // Don't show until ready-to-show
  });
  electron.session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        "Content-Security-Policy": [
          "default-src 'none';",
          "script-src 'self' 'unsafe-inline';",
          // Mermaid requires inline scripts
          "style-src 'self' 'unsafe-inline';",
          // Syntax highlighting styles
          "img-src 'self' file: data:;",
          // Local images
          "font-src 'self' data:;",
          "connect-src 'none';"
        ].join(" ")
      }
    });
  });
  if (process.env.NODE_ENV === "development") {
    win.loadURL("http://localhost:5173");
  } else {
    win.loadFile(path.join(__dirname, "../renderer/index.html"));
  }
  win.once("ready-to-show", () => {
    win.show();
  });
  return win;
}
function validatePayload(schema, payload) {
  return schema.parse(payload);
}
const ReadFilePayloadSchema = zod.z.object({
  filePath: zod.z.string().min(1)
});
function registerIpcHandlers() {
  electron.ipcMain.handle("file:read", async (_event, payload) => {
    try {
      const { filePath } = validatePayload(ReadFilePayloadSchema, payload);
      const content = await promises.readFile(filePath, "utf-8");
      const stats = await promises.stat(filePath);
      return {
        success: true,
        content,
        modificationTime: stats.mtimeMs,
        fileSize: stats.size
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  });
  electron.ipcMain.handle("file:openFileDialog", async (_event, _payload) => {
    try {
      const result = await electron.dialog.showOpenDialog({
        properties: ["openFile"],
        filters: [{ name: "Markdown Files", extensions: ["md", "markdown"] }]
      });
      return {
        success: true,
        filePaths: result.filePaths
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  });
  electron.ipcMain.handle("file:openFolderDialog", async (_event, _payload) => {
    try {
      const result = await electron.dialog.showOpenDialog({
        properties: ["openDirectory"]
      });
      return {
        success: true,
        folderPath: result.filePaths[0]
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  });
  console.log("IPC handlers registered");
}
const defaultConfig = {
  enabled: true,
  level: "Info",
  filePath: "%APPDATA%/MarkRead/logs/app.log"
  // Will expand later
};
let currentConfig = { ...defaultConfig };
function initLogger(config) {
  console.log("Logger initialized:", currentConfig);
}
process.on("uncaughtException", (error) => {
  console.error("Uncaught exception:", error);
});
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled rejection:", reason);
});
let mainWindow = null;
initLogger();
const gotTheLock = electron.app.requestSingleInstanceLock();
if (!gotTheLock) {
  electron.app.quit();
} else {
  electron.app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
  electron.app.whenReady().then(() => {
    registerIpcHandlers();
    mainWindow = createWindow();
    electron.app.on("activate", () => {
      if (electron.BrowserWindow.getAllWindows().length === 0) {
        mainWindow = createWindow();
      }
    });
  });
}
electron.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    electron.app.quit();
  }
});
