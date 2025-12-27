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
function getUIStatePath() {
  const userDataPath = electron.app.getPath("userData");
  return path.join(userDataPath, "ui-state.json");
}
function getDefaultUIState() {
  return {
    version: "1.0.0",
    windowBounds: {
      x: 100,
      y: 100,
      width: 1200,
      height: 800,
      isMaximized: false
    },
    sidebarWidth: 250,
    activeFolder: null,
    folders: [],
    recentItems: [],
    splitLayouts: {}
  };
}
async function loadUIState() {
  try {
    const filePath = getUIStatePath();
    const content = await promises.readFile(filePath, "utf-8");
    const state = JSON.parse(content);
    return {
      ...getDefaultUIState(),
      ...state
    };
  } catch (error) {
    console.log("UI state file not found or corrupted, using defaults:", error.message);
    return getDefaultUIState();
  }
}
let saveTimeout = null;
const SAVE_DEBOUNCE_MS = 500;
async function saveUIState(state) {
  if (saveTimeout) {
    clearTimeout(saveTimeout);
  }
  return new Promise((resolve, reject) => {
    saveTimeout = setTimeout(async () => {
      try {
        const filePath = getUIStatePath();
        const dir = path.dirname(filePath);
        await promises.mkdir(dir, { recursive: true });
        let currentState;
        try {
          currentState = await loadUIState();
        } catch {
          currentState = getDefaultUIState();
        }
        const mergedState = {
          ...currentState,
          ...state
        };
        await promises.writeFile(filePath, JSON.stringify(mergedState, null, 2), "utf-8");
        resolve();
      } catch (error) {
        reject(error);
      }
    }, SAVE_DEBOUNCE_MS);
  });
}
async function saveUIStateImmediate(state) {
  if (saveTimeout) {
    clearTimeout(saveTimeout);
    saveTimeout = null;
  }
  try {
    const filePath = getUIStatePath();
    const dir = path.dirname(filePath);
    await promises.mkdir(dir, { recursive: true });
    let currentState;
    try {
      currentState = await loadUIState();
    } catch {
      currentState = getDefaultUIState();
    }
    const mergedState = {
      ...currentState,
      ...state
    };
    await promises.writeFile(filePath, JSON.stringify(mergedState, null, 2), "utf-8");
  } catch (error) {
    console.error("Failed to save UI state:", error);
  }
}
const windows = /* @__PURE__ */ new Map();
const windowZoomLevels = /* @__PURE__ */ new Map();
let saveWindowBoundsTimeout = null;
const SAVE_WINDOW_BOUNDS_DEBOUNCE_MS = 500;
function createWindow(options) {
  const win = new electron.BrowserWindow({
    x: options?.x,
    y: options?.y,
    width: options?.width || 1200,
    height: options?.height || 800,
    minWidth: 800,
    minHeight: 600,
    frame: false,
    // T159k: Remove default frame for custom title bar
    titleBarStyle: "hidden",
    // T159k: Hide title bar
    webPreferences: {
      // Security best practices from research.md Section 6
      nodeIntegration: false,
      // Prevent direct Node.js access in renderer
      contextIsolation: true,
      // Isolate preload scripts from renderer
      sandbox: false,
      // TEMPORARY: Disabled to test custom protocol handler
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
          "img-src 'self' mdfile: data: https:;",
          // mdfile: protocol for local images + external HTTPS images (badges, etc.)
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
    if (options?.isMaximized) {
      win.maximize();
    }
    win.show();
  });
  windows.set(win.id, win);
  win.on("closed", () => {
    windows.delete(win.id);
  });
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
          isMaximized
        }
      }).catch((error) => {
        console.error("Failed to save window bounds:", error);
      });
    }, SAVE_WINDOW_BOUNDS_DEBOUNCE_MS);
  };
  win.on("resize", saveWindowBounds);
  win.on("move", saveWindowBounds);
  return win;
}
function setGlobalZoom(windowId, zoomFactor) {
  const window = windows.get(windowId);
  if (!window || window.isDestroyed()) {
    console.warn(`Window ${windowId} not found or destroyed`);
    return 1;
  }
  const clampedZoom = Math.max(0.5, Math.min(3, zoomFactor));
  window.webContents.setZoomFactor(clampedZoom);
  windowZoomLevels.set(windowId, clampedZoom);
  console.log(`Set global zoom for window ${windowId}: ${Math.round(clampedZoom * 100)}%`);
  return clampedZoom;
}
function getGlobalZoom(windowId) {
  return windowZoomLevels.get(windowId) || 1;
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
      console.log("[resolvePath] Input:", { basePath, relativePath });
      const path2 = await import("path");
      const fs = await import("fs/promises");
      const baseDir = path2.dirname(basePath);
      console.log("[resolvePath] Base directory:", baseDir);
      const absolutePath = path2.resolve(baseDir, relativePath);
      console.log("[resolvePath] Resolved absolute path:", absolutePath);
      const normalizedAbsolute = path2.normalize(absolutePath);
      console.log("[resolvePath] Normalized path:", normalizedAbsolute);
      if (normalizedAbsolute.includes("..")) {
        return {
          success: false,
          error: 'Path traversal detected - relative paths with ".." are not allowed'
        };
      }
      let exists = false;
      let isDirectory = false;
      try {
        const stats = await fs.stat(normalizedAbsolute);
        exists = true;
        isDirectory = stats.isDirectory();
      } catch {
        exists = false;
      }
      console.log("[resolvePath] Path info:", { exists, isDirectory });
      if (exists && isDirectory) {
        const readmePath = path2.join(normalizedAbsolute, "README.md");
        try {
          await fs.access(readmePath);
          console.log("[resolvePath] Found README.md in directory");
          return {
            success: true,
            absolutePath: readmePath,
            exists: true,
            isDirectory: false
          };
        } catch {
          console.log("[resolvePath] No README.md, returning directory for listing");
          return {
            success: true,
            absolutePath: normalizedAbsolute,
            exists: true,
            isDirectory: true
          };
        }
      }
      console.log("[resolvePath] Returning:", { success: true, absolutePath: normalizedAbsolute, exists, isDirectory });
      return {
        success: true,
        absolutePath: normalizedAbsolute,
        exists,
        isDirectory
      };
    } catch (error) {
      console.error("[resolvePath] Error:", error.message);
      return {
        success: false,
        error: error.message
      };
    }
  });
  electron.ipcMain.handle("file:getImageData", async (_event, payload) => {
    try {
      const GetImageDataSchema = zod.z.object({
        filePath: zod.z.string().min(1)
      });
      const { filePath } = validatePayload(GetImageDataSchema, payload);
      console.log("[getImageData] Reading image:", filePath);
      const fs = await import("fs/promises");
      const path2 = await import("path");
      const stats = await fs.stat(filePath);
      if (stats.isDirectory()) {
        return {
          success: false,
          error: "Path is a directory, not a file"
        };
      }
      const buffer = await fs.readFile(filePath);
      const ext = path2.extname(filePath).toLowerCase();
      const mimeTypes = {
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".gif": "image/gif",
        ".svg": "image/svg+xml",
        ".webp": "image/webp",
        ".bmp": "image/bmp",
        ".ico": "image/x-icon"
      };
      const mimeType = mimeTypes[ext] || "application/octet-stream";
      const base64 = buffer.toString("base64");
      const dataUrl = `data:${mimeType};base64,${base64}`;
      console.log("[getImageData] Success, data URL length:", dataUrl.length);
      return {
        success: true,
        dataUrl
      };
    } catch (error) {
      console.error("[getImageData] Error:", error.message);
      return {
        success: false,
        error: error.message
      };
    }
  });
  electron.ipcMain.handle("file:getDirectoryListing", async (_event, payload) => {
    try {
      const DirectoryListingSchema = zod.z.object({
        directoryPath: zod.z.string().min(1)
      });
      const { directoryPath } = validatePayload(DirectoryListingSchema, payload);
      const path2 = await import("path");
      const fs = await import("fs/promises");
      const extractFirstHeading = async (filePath) => {
        try {
          const content = await fs.readFile(filePath, "utf-8");
          const lines = content.split("\n");
          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith("#")) {
              return trimmed.replace(/^#+\s*/, "").trim();
            }
          }
          return null;
        } catch {
          return null;
        }
      };
      const entries = await fs.readdir(directoryPath, { withFileTypes: true });
      const directories = entries.filter((entry) => entry.isDirectory()).map((entry) => ({
        name: entry.name,
        isDirectory: true,
        title: null
      })).sort((a, b) => a.name.localeCompare(b.name));
      const fileEntries = entries.filter((entry) => entry.isFile() && (entry.name.endsWith(".md") || entry.name.endsWith(".markdown")));
      const files = await Promise.all(
        fileEntries.map(async (entry) => {
          const filePath = path2.join(directoryPath, entry.name);
          const title = await extractFirstHeading(filePath);
          return {
            name: entry.name,
            isDirectory: false,
            title: title || entry.name.replace(/\.(md|markdown)$/i, "")
          };
        })
      );
      files.sort((a, b) => a.name.localeCompare(b.name));
      return {
        success: true,
        items: [...directories, ...files]
      };
    } catch (error) {
      console.error("[getDirectoryListing] Error:", error.message);
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
  electron.ipcMain.handle("shell:openExternal", async (_event, payload) => {
    try {
      const OpenExternalSchema = zod.z.object({
        url: zod.z.string().url()
      });
      const { url } = validatePayload(OpenExternalSchema, payload);
      if (!url.startsWith("http://") && !url.startsWith("https://")) {
        return {
          success: false,
          error: "Only HTTP and HTTPS URLs are allowed"
        };
      }
      await electron.shell.openExternal(url);
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
  electron.ipcMain.handle("window:minimize", async () => {
    try {
      mainWindow2.minimize();
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  });
  electron.ipcMain.handle("window:maximize", async () => {
    try {
      if (mainWindow2.isMaximized()) {
        mainWindow2.unmaximize();
      } else {
        mainWindow2.maximize();
      }
      return {
        success: true,
        isMaximized: mainWindow2.isMaximized()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  });
  electron.ipcMain.handle("window:close", async () => {
    try {
      mainWindow2.close();
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  });
  electron.ipcMain.handle("window:isMaximized", async () => {
    try {
      return {
        success: true,
        isMaximized: mainWindow2.isMaximized()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  });
  electron.ipcMain.handle("window:createNew", async (_event, payload) => {
    try {
      const CreateNewWindowSchema = zod.z.object({
        filePath: zod.z.string().optional(),
        folderPath: zod.z.string().optional(),
        tabState: zod.z.any().optional()
        // Tab state to transfer
      });
      const { filePath, folderPath, tabState } = validatePayload(
        CreateNewWindowSchema,
        payload
      );
      const newWindow = createWindow();
      await new Promise((resolve) => {
        newWindow.once("ready-to-show", () => {
          resolve();
        });
      });
      if (filePath || folderPath || tabState) {
        newWindow.webContents.send("window:initialState", {
          filePath,
          folderPath,
          tabState
        });
      }
      return {
        success: true,
        windowId: newWindow.id
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  });
  electron.ipcMain.handle("window:setGlobalZoom", async (event, payload) => {
    try {
      const SetGlobalZoomSchema = zod.z.object({
        zoomFactor: zod.z.number().min(0.5).max(3)
        // 50%-300%
      });
      const { zoomFactor } = validatePayload(SetGlobalZoomSchema, payload);
      const senderWindow = electron.BrowserWindow.fromWebContents(event.sender);
      if (!senderWindow) {
        return {
          success: false,
          zoomFactor: 1,
          error: "Window not found"
        };
      }
      const appliedZoom = setGlobalZoom(senderWindow.id, zoomFactor);
      return {
        success: true,
        zoomFactor: appliedZoom
      };
    } catch (error) {
      return {
        success: false,
        zoomFactor: 1,
        error: error.message
      };
    }
  });
  electron.ipcMain.handle("window:getGlobalZoom", async (event, _payload) => {
    try {
      const senderWindow = electron.BrowserWindow.fromWebContents(event.sender);
      if (!senderWindow) {
        return {
          success: false,
          zoomFactor: 1,
          error: "Window not found"
        };
      }
      const zoomFactor = getGlobalZoom(senderWindow.id);
      return {
        success: true,
        zoomFactor
      };
    } catch (error) {
      return {
        success: false,
        zoomFactor: 1,
        error: error.message
      };
    }
  });
  electron.ipcMain.handle("uiState:load", async (_event, _payload) => {
    try {
      const uiState = await loadUIState();
      return {
        success: true,
        uiState
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  });
  electron.ipcMain.handle("uiState:save", async (_event, payload) => {
    try {
      const SaveUIStateSchema = zod.z.object({
        uiState: zod.z.any()
        // Partial<UIState>
      });
      const { uiState } = validatePayload(SaveUIStateSchema, payload);
      await saveUIState(uiState);
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
  electron.ipcMain.handle("file:exportToPDF", async (_event, payload) => {
    try {
      const ExportToPDFSchema = zod.z.object({
        filePath: zod.z.string().min(1),
        htmlContent: zod.z.string().min(1)
      });
      const { filePath, htmlContent } = validatePayload(ExportToPDFSchema, payload);
      const pdfWindow = new electron.BrowserWindow({
        show: false,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true
        }
      });
      await pdfWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);
      await new Promise((resolve) => {
        pdfWindow.webContents.once("did-finish-load", () => {
          setTimeout(() => resolve(), 500);
        });
      });
      const pdfData = await pdfWindow.webContents.printToPDF({
        margins: {
          top: 0.5,
          right: 0.5,
          bottom: 0.5,
          left: 0.5
        },
        printBackground: true,
        landscape: false,
        pageSize: "A4"
      });
      const fs = await import("fs/promises");
      await fs.writeFile(filePath, pdfData);
      pdfWindow.close();
      return {
        success: true,
        filePath
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
console.log("[Main] About to register protocol schemes...");
electron.protocol.registerSchemesAsPrivileged([
  {
    scheme: "mdfile",
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      stream: true,
      // Required for loading media (images, videos, etc.)
      corsEnabled: true,
      bypassCSP: true
    }
  }
]);
console.log('[Main] Custom protocol "mdfile" registered with privileges');
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
  electron.app.whenReady().then(async () => {
    console.log("[Main] App ready, registering protocol handler...");
    electron.session.defaultSession.protocol.handle("mdfile", async (request) => {
      console.log("[Protocol] ===== HANDLER CALLED =====");
      try {
        const url = request.url;
        console.log("[Protocol] Received URL:", url);
        const encodedPath = url.replace(/^mdfile:\/\/\/?/, "");
        console.log("[Protocol] Encoded path:", encodedPath);
        const filePath = decodeURIComponent(encodedPath);
        console.log("[Protocol] Decoded file path:", filePath);
        if (filePath.startsWith("http://") || filePath.startsWith("https://")) {
          console.error("[Protocol] Blocked attempt to access web URL via mdfile protocol:", filePath);
          return new Response("Forbidden", { status: 403 });
        }
        console.log("[Protocol] Serving file:", filePath);
        return await electron.net.fetch("file://" + filePath);
      } catch (error) {
        console.error("[Protocol] Error serving local file:", error);
        return new Response("File not found", { status: 404 });
      }
    });
    console.log("[Main] Protocol handler registered successfully");
    const uiState = await loadUIState();
    mainWindow = createWindow({
      x: uiState.windowBounds.x,
      y: uiState.windowBounds.y,
      width: uiState.windowBounds.width,
      height: uiState.windowBounds.height,
      isMaximized: uiState.windowBounds.isMaximized
    });
    mainWindow.webContents.once("did-finish-load", () => {
      mainWindow?.webContents.send("app:initialState", {
        folders: uiState.folders,
        activeFolder: uiState.activeFolder,
        recentItems: uiState.recentItems,
        splitLayouts: uiState.splitLayouts
      });
    });
    registerIpcHandlers(mainWindow);
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
  if (mainWindow && !mainWindow.isDestroyed()) {
    const bounds = mainWindow.getBounds();
    const isMaximized = mainWindow.isMaximized();
    await saveUIStateImmediate({
      windowBounds: {
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height,
        isMaximized
      }
    });
  }
});
