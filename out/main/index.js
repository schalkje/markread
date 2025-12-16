"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
const electron = require("electron");
const path = require("path");
const promises = require("fs/promises");
const zod = require("zod");
function _interopNamespaceDefault(e) {
  const n = Object.create(null, { [Symbol.toStringTag]: { value: "Module" } });
  if (e) {
    for (const k in e) {
      if (k !== "default") {
        const d = Object.getOwnPropertyDescriptor(e, k);
        Object.defineProperty(n, k, d.get ? d : {
          enumerable: true,
          get: () => e[k]
        });
      }
    }
  }
  n.default = e;
  return Object.freeze(n);
}
const path__namespace = /* @__PURE__ */ _interopNamespaceDefault(path);
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
let chokidar = null;
async function getChokidar() {
  if (!chokidar) {
    chokidar = await import("chokidar");
  }
  return chokidar;
}
const activeWatchers = /* @__PURE__ */ new Map();
async function startWatching(config, window) {
  if (activeWatchers.has(config.watcherId)) {
    await stopWatching(config.watcherId);
  }
  try {
    const { watch } = await getChokidar();
    const watcher = watch(config.filePatterns, {
      cwd: config.folderPath,
      ignored: [
        ...config.ignorePatterns,
        "**/node_modules/**",
        "**/.git/**",
        "**/dist/**",
        "**/out/**",
        "**/.DS_Store"
      ],
      persistent: true,
      ignoreInitial: true,
      // Don't emit events for existing files
      awaitWriteFinish: {
        stabilityThreshold: config.debounceMs,
        pollInterval: 100
      }
    });
    const debounceTimers = /* @__PURE__ */ new Map();
    const sendEvent = (eventType, filePath) => {
      const absolutePath = path__namespace.resolve(config.folderPath, filePath);
      window.webContents.send("file:changed", {
        watcherId: config.watcherId,
        filePath: absolutePath,
        eventType,
        modificationTime: Date.now()
      });
    };
    const debouncedSend = (eventType, filePath) => {
      const key = `${eventType}:${filePath}`;
      if (debounceTimers.has(key)) {
        clearTimeout(debounceTimers.get(key));
      }
      const timer = setTimeout(() => {
        sendEvent(eventType, filePath);
        debounceTimers.delete(key);
      }, config.debounceMs);
      debounceTimers.set(key, timer);
    };
    watcher.on("add", (filePath) => {
      console.log(`File added: ${filePath}`);
      debouncedSend("add", filePath);
    }).on("change", (filePath) => {
      console.log(`File changed: ${filePath}`);
      debouncedSend("change", filePath);
    }).on("unlink", (filePath) => {
      console.log(`File removed: ${filePath}`);
      debouncedSend("unlink", filePath);
    }).on("error", (error) => {
      console.error(`Watcher error for ${config.watcherId}:`, error);
      window.webContents.send("file:watchError", {
        watcherId: config.watcherId,
        error: error.message
      });
    });
    activeWatchers.set(config.watcherId, {
      watcher,
      config
    });
    console.log(`Started watching folder: ${config.folderPath} (ID: ${config.watcherId})`);
  } catch (error) {
    console.error(`Failed to start watcher ${config.watcherId}:`, error);
    throw error;
  }
}
async function stopWatching(watcherId) {
  const activeWatcher = activeWatchers.get(watcherId);
  if (!activeWatcher) {
    console.warn(`Watcher ${watcherId} not found`);
    return;
  }
  try {
    await activeWatcher.watcher.close();
    activeWatchers.delete(watcherId);
    console.log(`Stopped watching: ${watcherId}`);
  } catch (error) {
    console.error(`Error stopping watcher ${watcherId}:`, error);
    throw error;
  }
}
async function stopAllWatchers() {
  const watcherIds = Array.from(activeWatchers.keys());
  await Promise.all(
    watcherIds.map((id) => stopWatching(id))
  );
}
function validatePayload(schema, payload) {
  return schema.parse(payload);
}
const ReadFilePayloadSchema = zod.z.object({
  filePath: zod.z.string().min(1)
});
function registerIpcHandlers(mainWindow2) {
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
  electron.ipcMain.handle("file:openFolderDialog", async (_event, payload) => {
    try {
      const OpenFolderPayloadSchema = zod.z.object({
        defaultPath: zod.z.string().optional()
      });
      const { defaultPath } = validatePayload(OpenFolderPayloadSchema, payload);
      const result = await electron.dialog.showOpenDialog({
        properties: ["openDirectory"],
        defaultPath
      });
      if (result.canceled || result.filePaths.length === 0) {
        return {
          success: true,
          folderPath: void 0
        };
      }
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
  electron.ipcMain.handle("file:resolvePath", async (_event, payload) => {
    try {
      const ResolvePathSchema = zod.z.object({
        basePath: zod.z.string().min(1),
        relativePath: zod.z.string().min(1)
      });
      const { basePath, relativePath } = validatePayload(ResolvePathSchema, payload);
      const path2 = await import("path");
      const fs = await import("fs/promises");
      const baseDir = path2.dirname(basePath);
      const absolutePath = path2.resolve(baseDir, relativePath);
      const normalizedAbsolute = path2.normalize(absolutePath);
      if (normalizedAbsolute.includes("..")) {
        return {
          success: false,
          error: 'Path traversal detected - relative paths with ".." are not allowed'
        };
      }
      let exists = false;
      try {
        await fs.access(normalizedAbsolute);
        exists = true;
      } catch {
        exists = false;
      }
      return {
        success: true,
        absolutePath: normalizedAbsolute,
        exists
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  });
  electron.ipcMain.handle("file:getFolderTree", async (_event, payload) => {
    try {
      let isMarkdownFile = function(fileName) {
        const ext = path__namespace.extname(fileName).toLowerCase();
        return ext === ".md" || ext === ".markdown";
      };
      const GetFolderTreeSchema = zod.z.object({
        folderPath: zod.z.string().min(1),
        includeHidden: zod.z.boolean(),
        maxDepth: zod.z.number().optional()
      });
      const { folderPath, includeHidden, maxDepth } = validatePayload(
        GetFolderTreeSchema,
        payload
      );
      try {
        const stats = await promises.stat(folderPath);
        if (!stats.isDirectory()) {
          return {
            success: false,
            error: "Path is not a directory"
          };
        }
      } catch (error) {
        return {
          success: false,
          error: `Folder not found: ${error.message}`
        };
      }
      let totalFiles = 0;
      async function buildTree(dirPath, currentDepth = 0) {
        const name = path__namespace.basename(dirPath);
        const node = {
          name,
          path: dirPath,
          type: "directory",
          children: []
        };
        if (maxDepth !== void 0 && currentDepth >= maxDepth) {
          return node;
        }
        try {
          const entries = await promises.readdir(dirPath, { withFileTypes: true });
          for (const entry of entries) {
            if (!includeHidden && entry.name.startsWith(".")) {
              continue;
            }
            const fullPath = path__namespace.join(dirPath, entry.name);
            if (entry.isDirectory()) {
              const childNode = await buildTree(fullPath, currentDepth + 1);
              if (childNode.children && childNode.children.length > 0) {
                node.children.push(childNode);
              }
            } else if (entry.isFile() && isMarkdownFile(entry.name)) {
              totalFiles++;
              const stats = await promises.stat(fullPath);
              node.children.push({
                name: entry.name,
                path: fullPath,
                type: "file",
                size: stats.size,
                modificationTime: stats.mtimeMs
              });
            }
          }
          node.children.sort((a, b) => {
            if (a.type === b.type) {
              return a.name.localeCompare(b.name, void 0, {
                numeric: true,
                sensitivity: "base"
              });
            }
            return a.type === "directory" ? -1 : 1;
          });
        } catch (error) {
          console.error(`Error reading directory ${dirPath}:`, error.message);
        }
        return node;
      }
      const tree = await buildTree(folderPath);
      return {
        success: true,
        tree,
        totalFiles
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  });
  electron.ipcMain.handle("file:watchFolder", async (_event, payload) => {
    try {
      const WatchFolderSchema = zod.z.object({
        folderPath: zod.z.string().min(1),
        filePatterns: zod.z.array(zod.z.string()),
        ignorePatterns: zod.z.array(zod.z.string()),
        debounceMs: zod.z.number().min(100).max(2e3)
      });
      const { folderPath, filePatterns, ignorePatterns, debounceMs } = validatePayload(
        WatchFolderSchema,
        payload
      );
      const watcherId = `watcher-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
      await startWatching(
        {
          watcherId,
          folderPath,
          filePatterns,
          ignorePatterns,
          debounceMs
        },
        mainWindow2
      );
      return {
        success: true,
        watcherId
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  });
  electron.ipcMain.handle("file:stopWatching", async (_event, payload) => {
    try {
      const StopWatchingSchema = zod.z.object({
        watcherId: zod.z.string().min(1)
      });
      const { watcherId } = validatePayload(StopWatchingSchema, payload);
      await stopWatching(watcherId);
      return {
        success: true
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
function createApplicationMenu(mainWindow2) {
  const isMac = process.platform === "darwin";
  const template = [
    // App menu (macOS only)
    ...isMac ? [
      {
        label: "MarkRead",
        submenu: [
          { role: "about" },
          { type: "separator" },
          { role: "services" },
          { type: "separator" },
          { role: "hide" },
          { role: "hideOthers" },
          { role: "unhide" },
          { type: "separator" },
          { role: "quit" }
        ]
      }
    ] : [],
    // File menu
    {
      label: "File",
      submenu: [
        {
          label: "Open File...",
          accelerator: "CmdOrCtrl+O",
          click: () => {
            mainWindow2.webContents.send("menu:open-file");
          }
        },
        {
          label: "Open Folder...",
          accelerator: "CmdOrCtrl+Shift+O",
          click: () => {
            mainWindow2.webContents.send("menu:open-folder");
          }
        },
        { type: "separator" },
        {
          label: "Close Current",
          accelerator: "CmdOrCtrl+W",
          click: () => {
            mainWindow2.webContents.send("menu:close-current");
          }
        },
        {
          label: "Close Folder",
          accelerator: "CmdOrCtrl+Shift+W",
          click: () => {
            mainWindow2.webContents.send("menu:close-folder");
          }
        },
        {
          label: "Close All",
          accelerator: "CmdOrCtrl+Shift+Alt+W",
          click: () => {
            mainWindow2.webContents.send("menu:close-all");
          }
        },
        { type: "separator" },
        ...isMac ? [{ role: "close" }] : [{ role: "quit" }]
      ]
    },
    // Edit menu
    {
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        ...isMac ? [
          { role: "pasteAndMatchStyle" },
          { role: "delete" },
          { role: "selectAll" },
          { type: "separator" },
          {
            label: "Speech",
            submenu: [
              { role: "startSpeaking" },
              { role: "stopSpeaking" }
            ]
          }
        ] : [
          { role: "delete" },
          { type: "separator" },
          { role: "selectAll" }
        ]
      ]
    },
    // View menu
    {
      label: "View",
      submenu: [
        { role: "reload" },
        { role: "forceReload" },
        { role: "toggleDevTools" },
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" }
      ]
    },
    // Window menu
    {
      label: "Window",
      submenu: [
        { role: "minimize" },
        { role: "zoom" },
        ...isMac ? [
          { type: "separator" },
          { role: "front" },
          { type: "separator" },
          { role: "window" }
        ] : [{ role: "close" }]
      ]
    },
    // Help menu
    {
      role: "help",
      submenu: [
        {
          label: "Learn More",
          click: async () => {
            const { shell } = await import("electron");
            await shell.openExternal("https://github.com/yourusername/markread");
          }
        }
      ]
    }
  ];
  const menu = electron.Menu.buildFromTemplate(template);
  electron.Menu.setApplicationMenu(menu);
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
    mainWindow = createWindow();
    registerIpcHandlers(mainWindow);
    createApplicationMenu(mainWindow);
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
electron.app.on("before-quit", async () => {
  await stopAllWatchers();
});
