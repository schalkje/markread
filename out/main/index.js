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
const fs = require("fs/promises");
const zod = require("zod");
const axios = require("axios");
const crypto = require("crypto");
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
const fs__namespace = /* @__PURE__ */ _interopNamespaceDefault(fs);
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
    const content = await fs.readFile(filePath, "utf-8");
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
        await fs.mkdir(dir, { recursive: true });
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
        await fs.writeFile(filePath, JSON.stringify(mergedState, null, 2), "utf-8");
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
    await fs.mkdir(dir, { recursive: true });
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
    await fs.writeFile(filePath, JSON.stringify(mergedState, null, 2), "utf-8");
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
const byteToHex = [];
for (let i = 0; i < 256; ++i) {
  byteToHex.push((i + 256).toString(16).slice(1));
}
function unsafeStringify(arr, offset = 0) {
  return (byteToHex[arr[offset + 0]] + byteToHex[arr[offset + 1]] + byteToHex[arr[offset + 2]] + byteToHex[arr[offset + 3]] + "-" + byteToHex[arr[offset + 4]] + byteToHex[arr[offset + 5]] + "-" + byteToHex[arr[offset + 6]] + byteToHex[arr[offset + 7]] + "-" + byteToHex[arr[offset + 8]] + byteToHex[arr[offset + 9]] + "-" + byteToHex[arr[offset + 10]] + byteToHex[arr[offset + 11]] + byteToHex[arr[offset + 12]] + byteToHex[arr[offset + 13]] + byteToHex[arr[offset + 14]] + byteToHex[arr[offset + 15]]).toLowerCase();
}
const rnds8Pool = new Uint8Array(256);
let poolPtr = rnds8Pool.length;
function rng() {
  if (poolPtr > rnds8Pool.length - 16) {
    crypto.randomFillSync(rnds8Pool);
    poolPtr = 0;
  }
  return rnds8Pool.slice(poolPtr, poolPtr += 16);
}
const native = { randomUUID: crypto.randomUUID };
function v4(options, buf, offset) {
  if (native.randomUUID && true && !options) {
    return native.randomUUID();
  }
  options = options || {};
  const rnds = options.random ?? options.rng?.() ?? rng();
  if (rnds.length < 16) {
    throw new Error("Random bytes length must be >= 16");
  }
  rnds[6] = rnds[6] & 15 | 64;
  rnds[8] = rnds[8] & 63 | 128;
  return unsafeStringify(rnds);
}
class RateLimiter {
  constructor() {
    this.limits = /* @__PURE__ */ new Map();
    this.MAX_RETRIES = 5;
    this.BASE_RETRY_MS = 1e3;
  }
  /**
   * Execute a function with rate limiting and retry logic
   *
   * @param repositoryId - Repository identifier for rate limit tracking
   * @param fn - Async function to execute
   * @returns Result of the function
   * @throws {Error} If all retries are exhausted or non-rate-limit error occurs
   */
  async withRateLimit(repositoryId, fn) {
    const limit = this.limits.get(repositoryId) || this.createLimit();
    if (limit.remaining === 0) {
      const waitMs = limit.resetTime - Date.now();
      if (waitMs > 0) {
        throw {
          code: "RATE_LIMIT",
          retryAfterSeconds: Math.ceil(waitMs / 1e3),
          message: `Rate limited. Retry after ${Math.ceil(waitMs / 1e3)}s`
        };
      }
    }
    let lastError;
    for (let attempt = 0; attempt < this.MAX_RETRIES; attempt++) {
      try {
        const result = await fn();
        this.limits.set(repositoryId, limit);
        return result;
      } catch (error) {
        lastError = error;
        const isRateLimit = error.code === "RATE_LIMIT" || error.status === 429 || error.response?.status === 429;
        if (isRateLimit) {
          const retryAfter = error.retryAfterSeconds || error.response?.headers?.["retry-after"];
          const backoffMs = retryAfter ? retryAfter * 1e3 : this.BASE_RETRY_MS * Math.pow(2, attempt);
          console.warn(
            `[GitRateLimit] Attempt ${attempt + 1}/${this.MAX_RETRIES} failed. Retrying in ${backoffMs}ms`
          );
          await new Promise((resolve) => setTimeout(resolve, backoffMs));
          if (retryAfter) {
            limit.resetTime = Date.now() + retryAfter * 1e3;
            limit.remaining = 0;
          }
        } else {
          throw error;
        }
      }
    }
    throw lastError;
  }
  /**
   * Update rate limit info from API response headers
   *
   * @param repositoryId - Repository identifier
   * @param headers - Response headers from API
   */
  updateFromHeaders(repositoryId, headers) {
    const remaining = parseInt(headers["x-ratelimit-remaining"] || headers["x-rate-limit-remaining"], 10);
    const reset = parseInt(headers["x-ratelimit-reset"] || headers["x-rate-limit-reset"], 10);
    if (!isNaN(remaining) && !isNaN(reset)) {
      this.limits.set(repositoryId, {
        remaining,
        resetTime: reset * 1e3
        // Convert to milliseconds
      });
    }
  }
  /**
   * Get current rate limit status for a repository
   *
   * @param repositoryId - Repository identifier
   * @returns Current rate limit info
   */
  getLimit(repositoryId) {
    return this.limits.get(repositoryId) || this.createLimit();
  }
  /**
   * Create default rate limit for new repository
   */
  createLimit() {
    return {
      remaining: 5e3,
      // GitHub authenticated limit
      resetTime: Date.now() + 36e5
      // 1 hour
    };
  }
}
const rateLimiter = new RateLimiter();
class GitHttpClient {
  constructor() {
    this.client = axios.create({
      timeout: 3e4,
      // 30s per performance requirements (SC-001)
      headers: {
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "MarkRead-Git-Client"
      }
    });
    this.client.interceptors.request.use(async (config) => {
      if (this.tokenProvider && config.url) {
        const token = await this.tokenProvider(config.url);
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }
      return config;
    });
    this.client.interceptors.response.use(
      (response) => {
        if (response.headers) {
          const repositoryId = response.config.repositoryId;
          if (repositoryId) {
            rateLimiter.updateFromHeaders(repositoryId, response.headers);
          }
        }
        return response;
      },
      async (error) => {
        if (error.response?.status === 401) {
          throw {
            code: "AUTH_FAILED",
            message: "Authentication failed. Please check your credentials.",
            statusCode: 401,
            retryable: false
          };
        }
        if (error.response?.status === 403) {
          const rateLimitRemaining = error.response.headers["x-ratelimit-remaining"];
          const rateLimitReset = error.response.headers["x-ratelimit-reset"];
          if (rateLimitRemaining === "0" || rateLimitRemaining === 0) {
            const resetTime = rateLimitReset ? parseInt(rateLimitReset, 10) : Date.now() / 1e3 + 3600;
            const secondsUntilReset = Math.max(0, resetTime - Date.now() / 1e3);
            throw {
              code: "RATE_LIMIT",
              message: "GitHub API rate limit exceeded. Please wait or authenticate to increase limits.",
              statusCode: 403,
              retryable: true,
              retryAfterSeconds: Math.ceil(secondsUntilReset),
              details: "Unauthenticated requests are limited to 60 per hour. Consider authenticating with a Personal Access Token."
            };
          }
          throw {
            code: "PERMISSION_DENIED",
            message: "You do not have permission to access this resource.",
            statusCode: 403,
            retryable: false
          };
        }
        if (error.response?.status === 404) {
          throw {
            code: "REPOSITORY_NOT_FOUND",
            message: "Repository not found. Please check the URL and your access permissions.",
            statusCode: 404,
            retryable: false
          };
        }
        if (error.response?.status === 429) {
          const retryAfter = parseInt(error.response.headers["retry-after"] || "60", 10);
          throw {
            code: "RATE_LIMIT",
            message: "Rate limit exceeded. Please wait before trying again.",
            statusCode: 429,
            retryable: true,
            retryAfterSeconds: retryAfter
          };
        }
        if (error.code === "ECONNABORTED") {
          throw {
            code: "TIMEOUT",
            message: "The operation timed out. Please try again.",
            retryable: true
          };
        }
        if (error.code === "ENOTFOUND" || error.code === "ECONNREFUSED") {
          throw {
            code: "NETWORK_ERROR",
            message: "Network error. Please check your internet connection and try again.",
            retryable: true
          };
        }
        throw {
          code: "UNKNOWN",
          message: error.message || "An unexpected error occurred. Please try again.",
          retryable: false
        };
      }
    );
  }
  /**
   * Set the token provider function
   * This function is called to retrieve the auth token for each request
   *
   * @param provider - Async function that returns a token given a URL
   */
  setTokenProvider(provider) {
    this.tokenProvider = provider;
  }
  /**
   * Execute GET request
   *
   * @param url - Request URL
   * @param config - Axios request config
   * @returns Response data
   */
  async get(url, config) {
    const response = await this.client.get(url, config);
    return response.data;
  }
  /**
   * Execute POST request
   *
   * @param url - Request URL
   * @param data - Request body
   * @param config - Axios request config
   * @returns Response data
   */
  async post(url, data, config) {
    const response = await this.client.post(url, data, config);
    return response.data;
  }
  /**
   * Execute PUT request
   *
   * @param url - Request URL
   * @param data - Request body
   * @param config - Axios request config
   * @returns Response data
   */
  async put(url, data, config) {
    const response = await this.client.put(url, data, config);
    return response.data;
  }
  /**
   * Execute DELETE request
   *
   * @param url - Request URL
   * @param config - Axios request config
   * @returns Response data
   */
  async delete(url, config) {
    const response = await this.client.delete(url, config);
    return response.data;
  }
  /**
   * Get the underlying axios instance for advanced usage
   */
  getAxiosInstance() {
    return this.client;
  }
}
const gitHttpClient = new GitHttpClient();
class GitHubClient {
  constructor() {
    this.BASE_URL = "https://api.github.com";
  }
  /**
   * List all branches in a repository
   *
   * @param owner - Repository owner/organization
   * @param repo - Repository name
   * @returns Array of branch information
   */
  async listBranches(owner, repo) {
    const url = `${this.BASE_URL}/repos/${owner}/${repo}/branches`;
    const response = await gitHttpClient.get(url);
    return response.map((b) => ({
      name: b.name,
      sha: b.commit.sha,
      isDefault: false
      // Will be set by caller based on repository default branch
    }));
  }
  /**
   * Get default branch for a repository
   *
   * @param owner - Repository owner/organization
   * @param repo - Repository name
   * @returns Default branch name
   */
  async getDefaultBranch(owner, repo) {
    const url = `${this.BASE_URL}/repos/${owner}/${repo}`;
    const response = await gitHttpClient.get(url);
    return response.default_branch;
  }
  /**
   * Get file content from repository
   *
   * @param owner - Repository owner/organization
   * @param repo - Repository name
   * @param path - File path relative to repository root
   * @param ref - Branch or commit SHA (optional, defaults to default branch)
   * @returns Decoded file content
   */
  async getFileContent(owner, repo, path2, ref) {
    const url = `${this.BASE_URL}/repos/${owner}/${repo}/contents/${path2}`;
    const params = ref ? { ref } : {};
    const response = await gitHttpClient.get(url, { params });
    if (response.encoding === "base64") {
      const content = Buffer.from(response.content, "base64").toString("utf-8");
      return {
        content,
        sha: response.sha,
        size: response.size
      };
    }
    return {
      content: response.content,
      sha: response.sha,
      size: response.size
    };
  }
  /**
   * Get repository file tree (recursive)
   *
   * @param owner - Repository owner/organization
   * @param repo - Repository name
   * @param branch - Branch name (defaults to 'main')
   * @param markdownOnly - Filter to only include markdown files
   * @returns Tree structure with all files
   */
  async getRepositoryTree(owner, repo, branch = "main", markdownOnly = false) {
    const url = `${this.BASE_URL}/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`;
    const response = await gitHttpClient.get(url);
    const nodes = [];
    const pathMap = /* @__PURE__ */ new Map();
    for (const item of response.tree) {
      const isMarkdown = item.path.match(/\.(md|markdown|mdown)$/i) !== null;
      if (markdownOnly && item.type === "blob" && !isMarkdown) {
        continue;
      }
      const node = {
        path: item.path,
        type: item.type === "blob" ? "file" : "directory",
        size: item.size || 0,
        sha: item.sha,
        isMarkdown,
        children: item.type === "tree" ? [] : void 0
      };
      pathMap.set(item.path, node);
      const parentPath = item.path.substring(0, item.path.lastIndexOf("/"));
      if (parentPath) {
        const parent = pathMap.get(parentPath);
        if (parent && parent.children) {
          parent.children.push(node);
        }
      } else {
        nodes.push(node);
      }
    }
    return nodes;
  }
  /**
   * Check if a file exists at a specific path and branch
   *
   * @param owner - Repository owner/organization
   * @param repo - Repository name
   * @param path - File path
   * @param branch - Branch name
   * @returns True if file exists
   */
  async fileExists(owner, repo, path2, branch) {
    try {
      const url = `${this.BASE_URL}/repos/${owner}/${repo}/contents/${path2}`;
      await gitHttpClient.get(url, { params: { ref: branch } });
      return true;
    } catch (error) {
      if (error.statusCode === 404) {
        return false;
      }
      throw error;
    }
  }
}
const githubClient = new GitHubClient();
class CredentialStore {
  constructor() {
    this.store = null;
    this.storePromise = null;
  }
  /**
   * Initialize the store (lazy loading with dynamic import)
   */
  async getStore() {
    if (this.store) {
      return this.store;
    }
    if (!this.storePromise) {
      this.storePromise = (async () => {
        const { default: ElectronStore } = await import("electron-store");
        this.store = new ElectronStore({
          name: "git-credentials",
          encryptionKey: "obfuscation-only"
          // Not for security - actual encryption is via safeStorage
        });
        return this.store;
      })();
    }
    return this.storePromise;
  }
  /**
   * Save a credential for a repository
   *
   * @param repositoryId - Repository identifier
   * @param authMethod - Authentication method (oauth or pat)
   * @param token - Plain text token (will be encrypted)
   * @param expiresAt - Optional expiration timestamp
   * @throws {Error} If OS credential encryption is not available
   */
  async saveCredential(repositoryId, authMethod, token, expiresAt) {
    if (!electron.safeStorage.isEncryptionAvailable()) {
      throw new Error("OS credential encryption not available");
    }
    const store = await this.getStore();
    const encryptedBuffer = electron.safeStorage.encryptString(token);
    const encryptedToken = encryptedBuffer.toString("base64");
    const credentials = store.get("credentials", []);
    const existing = credentials.findIndex(
      (c) => c.repositoryId === repositoryId && c.authMethod === authMethod
    );
    const entry = {
      repositoryId,
      authMethod,
      encryptedToken,
      expiresAt
    };
    if (existing >= 0) {
      credentials[existing] = entry;
    } else {
      credentials.push(entry);
    }
    store.set("credentials", credentials);
  }
  /**
   * Retrieve a credential for a repository
   *
   * @param repositoryId - Repository identifier
   * @param authMethod - Authentication method (oauth or pat)
   * @returns Decrypted token, or null if not found or expired
   */
  async getCredential(repositoryId, authMethod) {
    const store = await this.getStore();
    const credentials = store.get("credentials", []);
    const entry = credentials.find(
      (c) => c.repositoryId === repositoryId && c.authMethod === authMethod
    );
    if (!entry) return null;
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      await this.deleteCredential(repositoryId, authMethod);
      return null;
    }
    const encryptedBuffer = Buffer.from(entry.encryptedToken, "base64");
    const decrypted = electron.safeStorage.decryptString(encryptedBuffer);
    return decrypted;
  }
  /**
   * Delete credentials for a repository
   *
   * @param repositoryId - Repository identifier
   * @param authMethod - Optional specific auth method to delete (deletes all if not specified)
   */
  async deleteCredential(repositoryId, authMethod) {
    const store = await this.getStore();
    const credentials = store.get("credentials", []);
    const filtered = credentials.filter(
      (c) => !(c.repositoryId === repositoryId && (!authMethod || c.authMethod === authMethod))
    );
    store.set("credentials", filtered);
  }
  /**
   * Check if a credential exists for a repository
   *
   * @param repositoryId - Repository identifier
   * @param authMethod - Authentication method
   * @returns True if credential exists and is not expired
   */
  async hasCredential(repositoryId, authMethod) {
    const store = await this.getStore();
    const credentials = store.get("credentials", []);
    const entry = credentials.find(
      (c) => c.repositoryId === repositoryId && c.authMethod === authMethod
    );
    if (!entry) return false;
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      await this.deleteCredential(repositoryId, authMethod);
      return false;
    }
    return true;
  }
  /**
   * Store a token for a provider (not repository-specific)
   * Used for OAuth tokens that work across all repositories
   *
   * @param provider - Git provider (github or azure)
   * @param token - Plain text token (will be encrypted)
   */
  async storeToken(provider, token) {
    if (!electron.safeStorage.isEncryptionAvailable()) {
      throw new Error("OS credential encryption not available");
    }
    const store = await this.getStore();
    const encryptedBuffer = electron.safeStorage.encryptString(token);
    const encryptedToken = encryptedBuffer.toString("base64");
    store.set(`provider-token-${provider}`, encryptedToken);
  }
  /**
   * Retrieve a token for a provider
   *
   * @param provider - Git provider (github or azure)
   * @returns Decrypted token, or null if not found
   */
  async getToken(provider) {
    const store = await this.getStore();
    const encryptedToken = store.get(`provider-token-${provider}`);
    if (!encryptedToken) return null;
    try {
      const encryptedBuffer = Buffer.from(encryptedToken, "base64");
      const decrypted = electron.safeStorage.decryptString(encryptedBuffer);
      return decrypted;
    } catch (error) {
      store.delete(`provider-token-${provider}`);
      return null;
    }
  }
  /**
   * Delete a token for a provider
   *
   * @param provider - Git provider (github or azure)
   */
  async deleteToken(provider) {
    const store = await this.getStore();
    store.delete(`provider-token-${provider}`);
  }
  /**
   * Check if a token exists for a provider
   *
   * @param provider - Git provider (github or azure)
   * @returns True if token exists
   */
  async hasToken(provider) {
    const store = await this.getStore();
    return store.has(`provider-token-${provider}`);
  }
}
const credentialStore = new CredentialStore();
class CacheManager {
  constructor() {
    this.MAX_TOTAL_SIZE = 5 * 1024 * 1024 * 1024;
    this.MAX_REPO_SIZE = 100 * 1024 * 1024;
    this.CACHE_DIR = path__namespace.join(electron.app.getPath("userData"), "git-cache");
    this.metadata = {
      entries: /* @__PURE__ */ new Map(),
      totalSize: 0,
      repositorySizes: /* @__PURE__ */ new Map()
    };
  }
  /**
   * Initialize cache directory and load metadata
   */
  async initialize() {
    await fs__namespace.mkdir(this.CACHE_DIR, { recursive: true });
    await this.loadMetadata();
  }
  /**
   * Get cached file content
   *
   * @param repositoryId - Repository identifier
   * @param filePath - File path relative to repository root
   * @param branch - Branch name
   * @returns File content, or null if not cached
   */
  async get(repositoryId, filePath, branch) {
    const key = this.generateKey(repositoryId, filePath, branch);
    const entry = this.metadata.entries.get(key);
    if (!entry) return null;
    entry.lastAccessedAt = Date.now();
    this.metadata.entries.set(key, entry);
    await this.saveMetadata();
    const cacheFilePath = this.getCacheFilePath(key);
    try {
      const content = await fs__namespace.readFile(cacheFilePath, "utf-8");
      return content;
    } catch (error) {
      this.metadata.entries.delete(key);
      return null;
    }
  }
  /**
   * Store file content in cache
   *
   * @param repositoryId - Repository identifier
   * @param filePath - File path relative to repository root
   * @param branch - Branch name
   * @param content - File content to cache
   */
  async set(repositoryId, filePath, branch, content) {
    const key = this.generateKey(repositoryId, filePath, branch);
    const size = Buffer.byteLength(content, "utf-8");
    await this.ensureSpace(repositoryId, size);
    const cacheFilePath = this.getCacheFilePath(key);
    await fs__namespace.mkdir(path__namespace.dirname(cacheFilePath), { recursive: true });
    await fs__namespace.writeFile(cacheFilePath, content, "utf-8");
    const existingEntry = this.metadata.entries.get(key);
    const oldSize = existingEntry?.size || 0;
    const entry = {
      key,
      repositoryId,
      filePath,
      branch,
      size,
      fetchedAt: existingEntry?.fetchedAt || Date.now(),
      lastAccessedAt: Date.now(),
      diskPath: cacheFilePath
    };
    this.metadata.entries.set(key, entry);
    this.metadata.totalSize += size - oldSize;
    const repoSize = this.metadata.repositorySizes.get(repositoryId) || 0;
    this.metadata.repositorySizes.set(repositoryId, repoSize + (size - oldSize));
    await this.saveMetadata();
  }
  /**
   * Clear cache for a repository or specific branch
   *
   * @param repositoryId - Repository identifier
   * @param branch - Optional branch name (clears all branches if not specified)
   */
  async clear(repositoryId, branch) {
    const entriesToDelete = Array.from(this.metadata.entries.entries()).filter(([_, entry]) => {
      if (entry.repositoryId !== repositoryId) return false;
      if (branch && entry.branch !== branch) return false;
      return true;
    });
    for (const [key, entry] of entriesToDelete) {
      const cacheFilePath = this.getCacheFilePath(key);
      await fs__namespace.unlink(cacheFilePath).catch(() => {
      });
      this.metadata.entries.delete(key);
      this.metadata.totalSize -= entry.size;
      const repoSize = this.metadata.repositorySizes.get(entry.repositoryId) || 0;
      this.metadata.repositorySizes.set(entry.repositoryId, repoSize - entry.size);
    }
    await this.saveMetadata();
  }
  /**
   * Get cached tree structure
   *
   * @param repositoryId - Repository identifier
   * @param branch - Branch name
   * @returns Cached tree structure, or null if not cached
   */
  async getTree(repositoryId, branch) {
    const key = this.generateTreeKey(repositoryId, branch);
    const entry = this.metadata.entries.get(key);
    if (!entry) return null;
    entry.lastAccessedAt = Date.now();
    this.metadata.entries.set(key, entry);
    await this.saveMetadata();
    const cacheFilePath = this.getCacheFilePath(key);
    try {
      const content = await fs__namespace.readFile(cacheFilePath, "utf-8");
      return JSON.parse(content);
    } catch (error) {
      this.metadata.entries.delete(key);
      return null;
    }
  }
  /**
   * Store tree structure in cache
   *
   * @param repositoryId - Repository identifier
   * @param branch - Branch name
   * @param tree - Tree structure to cache
   */
  async setTree(repositoryId, branch, tree) {
    const key = this.generateTreeKey(repositoryId, branch);
    const content = JSON.stringify(tree);
    const size = Buffer.byteLength(content, "utf-8");
    await this.ensureSpace(repositoryId, size);
    const cacheFilePath = this.getCacheFilePath(key);
    await fs__namespace.mkdir(path__namespace.dirname(cacheFilePath), { recursive: true });
    await fs__namespace.writeFile(cacheFilePath, content, "utf-8");
    const existingEntry = this.metadata.entries.get(key);
    const oldSize = existingEntry?.size || 0;
    const entry = {
      key,
      repositoryId,
      filePath: "__TREE__",
      branch,
      size,
      fetchedAt: existingEntry?.fetchedAt || Date.now(),
      lastAccessedAt: Date.now(),
      diskPath: cacheFilePath
    };
    this.metadata.entries.set(key, entry);
    this.metadata.totalSize += size - oldSize;
    const repoSize = this.metadata.repositorySizes.get(repositoryId) || 0;
    this.metadata.repositorySizes.set(repositoryId, repoSize + (size - oldSize));
    await this.saveMetadata();
  }
  /**
   * Get cache statistics
   */
  getStats() {
    return {
      totalSize: this.metadata.totalSize,
      totalEntries: this.metadata.entries.size,
      repositorySizes: Object.fromEntries(this.metadata.repositorySizes)
    };
  }
  /**
   * Ensure sufficient space for new cache entry
   * Evicts LRU entries if needed
   */
  async ensureSpace(repositoryId, neededSize) {
    const repoSize = this.metadata.repositorySizes.get(repositoryId) || 0;
    if (repoSize + neededSize > this.MAX_REPO_SIZE) {
      await this.evictLRU(repositoryId, repoSize + neededSize - this.MAX_REPO_SIZE);
    }
    if (this.metadata.totalSize + neededSize > this.MAX_TOTAL_SIZE) {
      await this.evictLRU(null, this.metadata.totalSize + neededSize - this.MAX_TOTAL_SIZE);
    }
  }
  /**
   * Evict least recently used entries
   *
   * @param repositoryId - Optional repository to evict from (evicts from all if null)
   * @param bytesToFree - Number of bytes to free
   */
  async evictLRU(repositoryId, bytesToFree) {
    const entries = Array.from(this.metadata.entries.entries()).filter(([_, entry]) => !repositoryId || entry.repositoryId === repositoryId).sort((a, b) => a[1].lastAccessedAt - b[1].lastAccessedAt);
    let freedBytes = 0;
    for (const [key, entry] of entries) {
      if (freedBytes >= bytesToFree) break;
      const cacheFilePath = this.getCacheFilePath(key);
      await fs__namespace.unlink(cacheFilePath).catch(() => {
      });
      this.metadata.entries.delete(key);
      this.metadata.totalSize -= entry.size;
      const repoSize = this.metadata.repositorySizes.get(entry.repositoryId) || 0;
      this.metadata.repositorySizes.set(entry.repositoryId, repoSize - entry.size);
      freedBytes += entry.size;
    }
    await this.saveMetadata();
  }
  /**
   * Generate cache key from repository, file path, and branch
   */
  generateKey(repositoryId, filePath, branch) {
    return `${repositoryId}/${branch}/${filePath}`;
  }
  /**
   * Generate cache key for tree structure
   */
  generateTreeKey(repositoryId, branch) {
    return `${repositoryId}/${branch}/__TREE__`;
  }
  /**
   * Get safe file path for cache entry
   * Sanitizes key to prevent path traversal
   */
  getCacheFilePath(key) {
    const safeKey = key.replace(/[^a-zA-Z0-9\-_\/]/g, "_");
    return path__namespace.join(this.CACHE_DIR, safeKey);
  }
  /**
   * Load metadata from disk
   */
  async loadMetadata() {
    const metadataPath = path__namespace.join(this.CACHE_DIR, "metadata.json");
    try {
      const data = await fs__namespace.readFile(metadataPath, "utf-8");
      const parsed = JSON.parse(data);
      this.metadata = {
        entries: new Map(parsed.entries),
        totalSize: parsed.totalSize,
        repositorySizes: new Map(parsed.repositorySizes)
      };
    } catch (error) {
      this.metadata = {
        entries: /* @__PURE__ */ new Map(),
        totalSize: 0,
        repositorySizes: /* @__PURE__ */ new Map()
      };
    }
  }
  /**
   * Save metadata to disk
   */
  async saveMetadata() {
    const metadataPath = path__namespace.join(this.CACHE_DIR, "metadata.json");
    const data = JSON.stringify({
      entries: Array.from(this.metadata.entries.entries()),
      totalSize: this.metadata.totalSize,
      repositorySizes: Array.from(this.metadata.repositorySizes.entries())
    });
    await fs__namespace.writeFile(metadataPath, data, "utf-8");
  }
}
const cacheManager = new CacheManager();
function normalizeRepositoryUrl(rawUrl) {
  let normalized = rawUrl.trim();
  if (normalized.startsWith("http://")) {
    normalized = normalized.replace("http://", "https://");
  }
  normalized = normalized.replace(/\/+$/, "");
  if (normalized.endsWith(".git")) {
    normalized = normalized.slice(0, -4);
  }
  return normalized;
}
function parseRepositoryUrl(url) {
  const normalized = normalizeRepositoryUrl(url);
  const urlObj = new URL(normalized);
  if (urlObj.hostname === "github.com") {
    const parts = urlObj.pathname.split("/").filter(Boolean);
    if (parts.length < 2) {
      throw new Error("Invalid GitHub URL");
    }
    return {
      provider: "github",
      owner: parts[0],
      name: parts[1]
    };
  }
  if (urlObj.hostname === "dev.azure.com") {
    const parts = urlObj.pathname.split("/").filter(Boolean);
    if (parts.length < 4 || parts[2] !== "_git") {
      throw new Error("Invalid Azure DevOps URL");
    }
    return {
      provider: "azure",
      organization: parts[0],
      project: parts[1],
      repositoryId: parts[3]
    };
  }
  throw new Error("Unsupported Git provider");
}
class RepositoryService {
  constructor() {
    this.repositories = /* @__PURE__ */ new Map();
    this.tokenProviderInitialized = false;
    this.initializeTokenProvider();
  }
  /**
   * Initialize the token provider for the HTTP client
   * This provides authentication tokens for all GitHub API requests
   */
  initializeTokenProvider() {
    if (this.tokenProviderInitialized) return;
    gitHttpClient.setTokenProvider(async (url) => {
      try {
        const urlObj = new URL(url);
        let provider = null;
        if (urlObj.hostname.includes("github")) {
          provider = "github";
        } else if (urlObj.hostname.includes("azure")) {
          provider = "azure";
        }
        if (!provider) return null;
        const token = await credentialStore.getToken(provider);
        return token;
      } catch (error) {
        return null;
      }
    });
    this.tokenProviderInitialized = true;
  }
  /**
   * Connect to a Git repository
   *
   * @param request - Connection request
   * @returns Repository information with branches
   */
  async connect(request) {
    const normalizedUrl = normalizeRepositoryUrl(request.url);
    const parsed = parseRepositoryUrl(normalizedUrl);
    if (parsed.provider !== "github") {
      throw {
        code: "INVALID_URL",
        message: "Only GitHub repositories are supported in this phase",
        retryable: false
      };
    }
    const repositoryId = v4();
    const defaultBranch = await githubClient.getDefaultBranch(parsed.owner, parsed.name);
    const allBranches = await githubClient.listBranches(parsed.owner, parsed.name);
    const branches = allBranches.map((b) => ({
      ...b,
      isDefault: b.name === defaultBranch
    }));
    const currentBranch = request.initialBranch || defaultBranch;
    const repository = {
      id: repositoryId,
      provider: "github",
      url: normalizedUrl,
      rawUrl: request.url,
      displayName: `${parsed.owner}/${parsed.name}`,
      owner: parsed.owner,
      name: parsed.name,
      defaultBranch,
      currentBranch,
      authMethod: request.authMethod,
      lastAccessed: Date.now(),
      createdAt: Date.now(),
      isOnline: true
    };
    this.repositories.set(repositoryId, repository);
    return {
      repositoryId,
      url: normalizedUrl,
      displayName: repository.displayName,
      defaultBranch,
      currentBranch,
      branches,
      provider: "github"
    };
  }
  /**
   * Fetch a file from repository
   *
   * @param request - File fetch request
   * @returns File content and metadata
   */
  async fetchFile(request) {
    const repository = this.repositories.get(request.repositoryId);
    if (!repository) {
      throw {
        code: "REPOSITORY_NOT_FOUND",
        message: "Repository not found. Please connect first.",
        retryable: false
      };
    }
    const branch = request.branch || repository.currentBranch;
    if (!request.forceRefresh) {
      const cachedContent = await cacheManager.get(
        request.repositoryId,
        request.filePath,
        branch
      );
      if (cachedContent) {
        const isMarkdown = request.filePath.match(/\.(md|markdown|mdown)$/i) !== null;
        return {
          filePath: request.filePath,
          content: cachedContent,
          size: Buffer.byteLength(cachedContent, "utf-8"),
          sha: "",
          // SHA not stored in cache metadata for now
          isMarkdown,
          cached: true,
          fetchedAt: Date.now(),
          branch
        };
      }
    }
    if (!repository.owner || !repository.name) {
      throw {
        code: "INVALID_URL",
        message: "Repository missing owner or name",
        retryable: false
      };
    }
    try {
      const fileData = await githubClient.getFileContent(
        repository.owner,
        repository.name,
        request.filePath,
        branch
      );
      const isMarkdown = request.filePath.match(/\.(md|markdown|mdown)$/i) !== null;
      await cacheManager.set(
        request.repositoryId,
        request.filePath,
        branch,
        fileData.content
      );
      return {
        filePath: request.filePath,
        content: fileData.content,
        size: fileData.size,
        sha: fileData.sha,
        isMarkdown,
        cached: false,
        fetchedAt: Date.now(),
        branch
      };
    } catch (error) {
      if (error.statusCode === 404) {
        throw {
          code: "FILE_NOT_FOUND",
          message: `File not found: ${request.filePath}`,
          details: "This file may have been moved, renamed, or deleted. Please refresh the file tree to see the latest files.",
          statusCode: 404,
          retryable: false
        };
      }
      throw error;
    }
  }
  /**
   * Fetch repository file tree
   *
   * @param request - Tree fetch request
   * @returns File tree structure (from cache if available, then fresh from GitHub)
   */
  async fetchTree(request) {
    const repository = this.repositories.get(request.repositoryId);
    if (!repository) {
      throw {
        code: "REPOSITORY_NOT_FOUND",
        message: "Repository not found. Please connect first.",
        retryable: false
      };
    }
    const branch = request.branch || repository.currentBranch;
    if (!repository.owner || !repository.name) {
      throw {
        code: "INVALID_URL",
        message: "Repository missing owner or name",
        retryable: false
      };
    }
    await cacheManager.getTree(request.repositoryId, branch);
    const tree = await githubClient.getRepositoryTree(
      repository.owner,
      repository.name,
      branch,
      request.markdownOnly
    );
    let fileCount = 0;
    let markdownFileCount = 0;
    const countFiles = (nodes) => {
      for (const node of nodes) {
        if (node.type === "file") {
          fileCount++;
          if (node.isMarkdown) {
            markdownFileCount++;
          }
        }
        if (node.children) {
          countFiles(node.children);
        }
      }
    };
    countFiles(tree);
    const response = {
      tree,
      fileCount,
      markdownFileCount,
      branch,
      fetchedAt: Date.now(),
      fromCache: false
    };
    cacheManager.setTree(request.repositoryId, branch, response).catch(() => {
    });
    return response;
  }
  /**
   * Get cached repository file tree if available
   *
   * @param request - Tree fetch request
   * @returns Cached file tree structure, or null if not cached
   */
  async getCachedTree(request) {
    const repository = this.repositories.get(request.repositoryId);
    if (!repository) {
      return null;
    }
    const branch = request.branch || repository.currentBranch;
    const cachedTree = await cacheManager.getTree(request.repositoryId, branch);
    if (cachedTree) {
      return {
        ...cachedTree,
        fromCache: true
      };
    }
    return null;
  }
  /**
   * Get repository by ID
   *
   * @param repositoryId - Repository identifier
   * @returns Repository or undefined
   */
  getRepository(repositoryId) {
    return this.repositories.get(repositoryId);
  }
  /**
   * List all connected repositories
   *
   * @returns Array of repositories
   */
  listRepositories() {
    return Array.from(this.repositories.values());
  }
}
const repositoryService = new RepositoryService();
class ConnectivityService {
  constructor() {
    this.TIMEOUT_MS = 5e3;
  }
  /**
   * Check connectivity to GitHub
   *
   * Uses the GitHub Zen API endpoint (no auth required)
   *
   * @returns True if GitHub is reachable
   */
  async checkGitHub() {
    const startTime = Date.now();
    try {
      const response = await axios.get("https://api.github.com/zen", {
        timeout: this.TIMEOUT_MS
      });
      const responseTimeMs = Date.now() - startTime;
      return {
        provider: "github",
        isReachable: response.status === 200,
        responseTimeMs
      };
    } catch (error) {
      return {
        provider: "github",
        isReachable: false,
        error: error.message || "Connection failed"
      };
    }
  }
  /**
   * Check connectivity to Azure DevOps
   *
   * @returns True if Azure DevOps is reachable
   */
  async checkAzureDevOps() {
    const startTime = Date.now();
    try {
      const response = await axios.get("https://dev.azure.com", {
        timeout: this.TIMEOUT_MS
      });
      const responseTimeMs = Date.now() - startTime;
      return {
        provider: "azure",
        isReachable: response.status === 200,
        responseTimeMs
      };
    } catch (error) {
      return {
        provider: "azure",
        isReachable: false,
        error: error.message || "Connection failed"
      };
    }
  }
  /**
   * Check connectivity to a specific provider
   *
   * @param provider - Git provider to check
   * @returns Connectivity check result
   */
  async check(provider) {
    if (provider === "github") {
      return this.checkGitHub();
    } else {
      return this.checkAzureDevOps();
    }
  }
  /**
   * Check connectivity to all supported providers
   *
   * @returns Array of connectivity check results
   */
  async checkAll() {
    const [githubResult, azureResult] = await Promise.all([
      this.checkGitHub(),
      this.checkAzureDevOps()
    ]);
    return [githubResult, azureResult];
  }
}
const connectivityService = new ConnectivityService();
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID || "Ov23liWG79zW29xRrTPN";
class OAuthService {
  constructor() {
    this.sessions = /* @__PURE__ */ new Map();
  }
  /**
   * Initiate Device Flow authentication
   *
   * @param request - Device Flow initiation request
   * @returns Session info, user code, and verification URL
   */
  async initiateDeviceFlow(request) {
    const { provider, scopes } = request;
    if (provider !== "github") {
      throw {
        code: "INVALID_URL",
        message: "Only GitHub authentication is currently supported",
        retryable: false
      };
    }
    const defaultScopes = scopes || ["repo", "user:email"];
    try {
      const deviceCodeResponse = await axios.post(
        "https://github.com/login/device/code",
        {
          client_id: GITHUB_CLIENT_ID,
          scope: defaultScopes.join(" ")
        },
        {
          headers: {
            Accept: "application/json"
          }
        }
      );
      const {
        device_code,
        user_code,
        verification_uri,
        expires_in,
        interval
      } = deviceCodeResponse.data;
      const sessionId = v4();
      const session = {
        sessionId,
        provider,
        scopes: defaultScopes,
        deviceCode: device_code,
        userCode: user_code,
        verificationUri: verification_uri,
        expiresIn: expires_in,
        interval: interval || 5,
        startedAt: Date.now(),
        isComplete: false,
        isSuccess: false
      };
      this.sessions.set(sessionId, session);
      let browserOpened = false;
      try {
        await electron.shell.openExternal(verification_uri);
        browserOpened = true;
      } catch (error) {
        console.error("Failed to open browser:", error);
      }
      setTimeout(() => {
        const currentSession = this.sessions.get(sessionId);
        if (currentSession && !currentSession.isComplete) {
          this.completeSession(currentSession, false, "Device code expired");
        }
      }, expires_in * 1e3);
      return {
        sessionId,
        userCode: user_code,
        verificationUri: verification_uri,
        expiresIn: expires_in,
        interval: interval || 5,
        browserOpened
      };
    } catch (error) {
      throw {
        code: "NETWORK_ERROR",
        message: `Failed to initiate Device Flow: ${error.message}`,
        retryable: true
      };
    }
  }
  /**
   * Check Device Flow session status
   * This is called by the UI to poll for completion
   *
   * @param sessionId - Session identifier
   * @returns Session status
   */
  async checkDeviceFlowStatus(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return {
        isComplete: true,
        isSuccess: false,
        error: "Session not found or expired"
      };
    }
    if (session.isComplete) {
      return {
        isComplete: session.isComplete,
        isSuccess: session.isSuccess,
        user: session.user,
        error: session.error
      };
    }
    const elapsed = (Date.now() - session.startedAt) / 1e3;
    if (elapsed > session.expiresIn) {
      this.completeSession(session, false, "Device code expired");
      return {
        isComplete: true,
        isSuccess: false,
        error: "Device code expired"
      };
    }
    try {
      await this.pollForAccessToken(session);
    } catch (error) {
      console.log("Polling status:", error.message);
    }
    return {
      isComplete: session.isComplete,
      isSuccess: session.isSuccess,
      interval: session.interval,
      // Return current interval (may have increased)
      user: session.user,
      error: session.error
    };
  }
  /**
   * Poll GitHub for access token
   *
   * @param session - Device Flow session
   */
  async pollForAccessToken(session) {
    try {
      const response = await axios.post(
        "https://github.com/login/oauth/access_token",
        {
          client_id: GITHUB_CLIENT_ID,
          device_code: session.deviceCode,
          grant_type: "urn:ietf:params:oauth:grant-type:device_code"
        },
        {
          headers: {
            Accept: "application/json"
          }
        }
      );
      const { access_token, error, error_description } = response.data;
      if (error) {
        if (error === "authorization_pending") {
          throw new Error("Authorization pending");
        } else if (error === "slow_down") {
          session.interval += 5;
          console.log(`[Device Flow] Slowing down polling - new interval: ${session.interval}s`);
          throw new Error("Polling too fast - interval increased");
        } else if (error === "expired_token") {
          this.completeSession(session, false, "Device code expired");
          throw new Error("Device code expired");
        } else if (error === "access_denied") {
          this.completeSession(session, false, "Access denied by user");
          throw new Error("Access denied");
        } else {
          this.completeSession(session, false, error_description || error);
          throw new Error(error_description || error);
        }
      }
      if (access_token) {
        await this.completeAuthentication(session, access_token);
      }
    } catch (error) {
      throw error;
    }
  }
  /**
   * Complete authentication by getting user info and storing token
   *
   * @param session - Device Flow session
   * @param accessToken - GitHub access token
   */
  async completeAuthentication(session, accessToken) {
    try {
      const userInfo = await this.getUserInfo(accessToken);
      await credentialStore.storeToken(session.provider, accessToken);
      session.accessToken = accessToken;
      session.user = userInfo;
      this.completeSession(session, true);
    } catch (error) {
      this.completeSession(session, false, `Failed to complete authentication: ${error.message}`);
    }
  }
  /**
   * Get user information from GitHub
   *
   * @param accessToken - GitHub access token
   * @returns User information
   */
  async getUserInfo(accessToken) {
    try {
      const response = await axios.get("https://api.github.com/user", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/vnd.github.v3+json"
        }
      });
      return {
        username: response.data.login,
        email: response.data.email,
        avatarUrl: response.data.avatar_url
      };
    } catch (error) {
      throw new Error(`Failed to get user info: ${error.message}`);
    }
  }
  /**
   * Complete Device Flow session
   *
   * @param session - Device Flow session
   * @param success - Whether authentication was successful
   * @param error - Error message (if failed)
   */
  completeSession(session, success, error) {
    session.isComplete = true;
    session.isSuccess = success;
    session.error = error;
    setTimeout(() => {
      this.sessions.delete(session.sessionId);
    }, 5 * 60 * 1e3);
  }
  /**
   * Cancel Device Flow session
   *
   * @param sessionId - Session identifier
   */
  cancelDeviceFlow(sessionId) {
    const session = this.sessions.get(sessionId);
    if (session) {
      this.completeSession(session, false, "Cancelled by user");
    }
  }
}
const oauthService = new OAuthService();
function createSuccessResponse(data) {
  return { success: true, data };
}
function createErrorResponse(error) {
  return { success: false, error };
}
const ConnectRepositoryRequestSchema = zod.z.object({
  url: zod.z.string().url("Must be a valid URL").startsWith("https://", "Only HTTPS URLs are supported").refine(
    (url) => {
      const hostname = new URL(url).hostname;
      return hostname === "github.com" || hostname === "dev.azure.com";
    },
    { message: "Only GitHub and Azure DevOps repositories are supported" }
  ),
  authMethod: zod.z.enum(["oauth", "pat"]),
  initialBranch: zod.z.string().regex(/^[a-zA-Z0-9\-_./]+$/).optional()
});
zod.z.object({
  repositoryId: zod.z.string().uuid()
});
zod.z.object({
  repositoryId: zod.z.string().uuid(),
  branchName: zod.z.string().min(1).regex(/^[a-zA-Z0-9\-_./]+$/),
  preserveFilePath: zod.z.boolean().optional()
});
const FetchFileRequestSchema = zod.z.object({
  repositoryId: zod.z.string().uuid(),
  filePath: zod.z.string().min(1).max(1024).regex(/^[a-zA-Z0-9\-_./]+$/).refine((path2) => !path2.includes(".."), "Path traversal not allowed"),
  branch: zod.z.string().regex(/^[a-zA-Z0-9\-_./]+$/).optional(),
  forceRefresh: zod.z.boolean().optional()
});
const FetchRepositoryTreeRequestSchema = zod.z.object({
  repositoryId: zod.z.string().uuid(),
  branch: zod.z.string().regex(/^[a-zA-Z0-9\-_./]+$/).optional(),
  markdownOnly: zod.z.boolean().optional(),
  maxDepth: zod.z.number().positive().int().optional()
});
zod.z.object({
  repositoryId: zod.z.string().uuid(),
  filePath: zod.z.string().min(1).max(1024).regex(/^[a-zA-Z0-9\-_./]+$/).refine((path2) => !path2.includes("..")),
  branch: zod.z.string().regex(/^[a-zA-Z0-9\-_./]+$/).optional()
});
const CheckConnectivityRequestSchema = zod.z.object({
  provider: zod.z.enum(["github", "azure"]).optional(),
  timeoutMs: zod.z.number().positive().int().max(3e4).optional()
});
zod.z.object({});
zod.z.object({
  provider: zod.z.enum(["github", "azure"]),
  token: zod.z.string().min(1, "Token cannot be empty").max(500, "Token too long"),
  testRepository: zod.z.string().url().startsWith("https://").optional()
});
const InitiateDeviceFlowRequestSchema = zod.z.object({
  provider: zod.z.enum(["github", "azure"]),
  scopes: zod.z.array(zod.z.string()).optional()
});
const CheckDeviceFlowStatusRequestSchema = zod.z.object({
  sessionId: zod.z.string().uuid()
});
function registerGitHandlers() {
  electron.ipcMain.handle("git:connect", async (_event, payload) => {
    try {
      const request = ConnectRepositoryRequestSchema.parse(payload);
      const response = await repositoryService.connect(request);
      return createSuccessResponse(response);
    } catch (error) {
      return createErrorResponse({
        code: error.code || "UNKNOWN",
        message: error.message || "An unexpected error occurred",
        retryable: error.retryable ?? false,
        retryAfterSeconds: error.retryAfterSeconds,
        statusCode: error.statusCode
      });
    }
  });
  electron.ipcMain.handle("git:fetchFile", async (_event, payload) => {
    try {
      const request = FetchFileRequestSchema.parse(payload);
      const response = await repositoryService.fetchFile(request);
      return createSuccessResponse(response);
    } catch (error) {
      return createErrorResponse({
        code: error.code || "UNKNOWN",
        message: error.message || "An unexpected error occurred",
        retryable: error.retryable ?? false,
        retryAfterSeconds: error.retryAfterSeconds,
        statusCode: error.statusCode
      });
    }
  });
  electron.ipcMain.handle("git:fetchTree", async (_event, payload) => {
    try {
      const request = FetchRepositoryTreeRequestSchema.parse(payload);
      const response = await repositoryService.fetchTree(request);
      return createSuccessResponse(response);
    } catch (error) {
      return createErrorResponse({
        code: error.code || "UNKNOWN",
        message: error.message || "An unexpected error occurred",
        retryable: error.retryable ?? false,
        retryAfterSeconds: error.retryAfterSeconds,
        statusCode: error.statusCode
      });
    }
  });
  electron.ipcMain.handle("git:getCachedTree", async (_event, payload) => {
    try {
      const request = FetchRepositoryTreeRequestSchema.parse(payload);
      const response = await repositoryService.getCachedTree(request);
      if (response) {
        return createSuccessResponse(response);
      } else {
        return createErrorResponse({
          code: "NOT_CACHED",
          message: "Tree not found in cache",
          retryable: false
        });
      }
    } catch (error) {
      return createErrorResponse({
        code: error.code || "UNKNOWN",
        message: error.message || "An unexpected error occurred",
        retryable: error.retryable ?? false
      });
    }
  });
  electron.ipcMain.handle("git:connectivity:check", async (_event, payload) => {
    try {
      const request = CheckConnectivityRequestSchema.parse(payload);
      const results = request.provider ? [await connectivityService.check(request.provider)] : await connectivityService.checkAll();
      const isOnline = results.some((r) => r.isReachable);
      const response = {
        isOnline,
        navigatorOnline: true,
        // This would be checked in renderer
        providers: results,
        checkedAt: Date.now()
      };
      return createSuccessResponse(response);
    } catch (error) {
      return createErrorResponse({
        code: error.code || "UNKNOWN",
        message: error.message || "An unexpected error occurred",
        retryable: error.retryable ?? false,
        retryAfterSeconds: error.retryAfterSeconds,
        statusCode: error.statusCode
      });
    }
  });
  electron.ipcMain.handle("git:auth:deviceflow:initiate", async (_event, payload) => {
    try {
      const request = InitiateDeviceFlowRequestSchema.parse(payload);
      const response = await oauthService.initiateDeviceFlow(request);
      return createSuccessResponse(response);
    } catch (error) {
      return createErrorResponse({
        code: error.code || "UNKNOWN",
        message: error.message || "An unexpected error occurred",
        retryable: error.retryable ?? false,
        details: error.details
      });
    }
  });
  electron.ipcMain.handle("git:auth:deviceflow:status", async (_event, payload) => {
    try {
      const request = CheckDeviceFlowStatusRequestSchema.parse(payload);
      const response = await oauthService.checkDeviceFlowStatus(request.sessionId);
      return createSuccessResponse(response);
    } catch (error) {
      return createErrorResponse({
        code: error.code || "UNKNOWN",
        message: error.message || "An unexpected error occurred",
        retryable: false
      });
    }
  });
  electron.ipcMain.handle("git:auth:deviceflow:cancel", async (_event, sessionId) => {
    try {
      oauthService.cancelDeviceFlow(sessionId);
      return createSuccessResponse({ cancelled: true });
    } catch (error) {
      return createErrorResponse({
        code: error.code || "UNKNOWN",
        message: error.message || "An unexpected error occurred",
        retryable: false
      });
    }
  });
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
      const content = await fs.readFile(filePath, "utf-8");
      const stats = await fs.stat(filePath);
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
      const fs2 = await import("fs/promises");
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
        const stats = await fs2.stat(normalizedAbsolute);
        exists = true;
        isDirectory = stats.isDirectory();
      } catch {
        exists = false;
      }
      console.log("[resolvePath] Path info:", { exists, isDirectory });
      if (exists && isDirectory) {
        const readmePath = path2.join(normalizedAbsolute, "README.md");
        try {
          await fs2.access(readmePath);
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
      const fs2 = await import("fs/promises");
      const path2 = await import("path");
      const stats = await fs2.stat(filePath);
      if (stats.isDirectory()) {
        return {
          success: false,
          error: "Path is a directory, not a file"
        };
      }
      const buffer = await fs2.readFile(filePath);
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
      const fs2 = await import("fs/promises");
      const extractFirstHeading = async (filePath) => {
        try {
          const content = await fs2.readFile(filePath, "utf-8");
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
      const entries = await fs2.readdir(directoryPath, { withFileTypes: true });
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
        const stats = await fs.stat(folderPath);
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
          const entries = await fs.readdir(dirPath, { withFileTypes: true });
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
              const stats = await fs.stat(fullPath);
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
      const fs2 = await import("fs/promises");
      await fs2.writeFile(filePath, pdfData);
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
  registerGitHandlers();
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
