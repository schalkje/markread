"use strict";
const electron = require("electron");
const exposeGitAPI = () => {
  electron.contextBridge.exposeInMainWorld("git", {
    // Repository operations (Phase 3 - US1)
    repo: {
      /**
       * Connect to a Git repository
       * T042
       */
      connect: (request) => {
        return electron.ipcRenderer.invoke("git:connect", request);
      },
      /**
       * Fetch a file from repository
       * T043
       */
      fetchFile: (request) => {
        return electron.ipcRenderer.invoke("git:fetchFile", request);
      },
      /**
       * Fetch repository file tree
       * T044
       */
      fetchTree: (request) => {
        return electron.ipcRenderer.invoke("git:fetchTree", request);
      },
      /**
       * Get cached repository file tree
       * Returns cached tree if available, otherwise returns error
       */
      getCachedTree: (request) => {
        return electron.ipcRenderer.invoke("git:getCachedTree", request);
      }
      // TODO: T069 - Implement git.repo.switchBranch() and listBranches() (Phase 5 - US3)
      // TODO: T084 - Implement git.repo.openBranchInNewTab() (Phase 7 - US5)
    },
    // Authentication operations (Phase 4 - US2)
    auth: {
      /**
       * Initiate Device Flow authentication
       * Opens browser for GitHub authorization using Device Flow (no client secret required)
       */
      initiateDeviceFlow: (request) => {
        return electron.ipcRenderer.invoke("git:auth:deviceflow:initiate", request);
      },
      /**
       * Check Device Flow authentication status
       * Poll this to determine when Device Flow is complete
       */
      checkDeviceFlowStatus: (request) => {
        return electron.ipcRenderer.invoke("git:auth:deviceflow:status", request);
      },
      /**
       * Cancel Device Flow authentication
       */
      cancelDeviceFlow: (sessionId) => {
        return electron.ipcRenderer.invoke("git:auth:deviceflow:cancel", sessionId);
      }
    },
    // Connectivity operations (Phase 3 - US1)
    connectivity: {
      /**
       * Check connectivity to Git providers
       * T045
       */
      check: (request) => {
        return electron.ipcRenderer.invoke("git:connectivity:check", request || {});
      }
      // TODO: Implement git.connectivity.onChanged() event listener
    },
    // Recent items (Phase 6 - US4)
    recent: {
      // TODO: T078 - Implement git.recent.list()
    }
  });
};
electron.contextBridge.exposeInMainWorld("electronAPI", {
  file: {
    read: (payload) => electron.ipcRenderer.invoke("file:read", payload),
    openFileDialog: (payload) => electron.ipcRenderer.invoke("file:openFileDialog", payload),
    openFolderDialog: (payload) => electron.ipcRenderer.invoke("file:openFolderDialog", payload),
    getFolderTree: (payload) => electron.ipcRenderer.invoke("file:getFolderTree", payload),
    watchFolder: (payload) => electron.ipcRenderer.invoke("file:watchFolder", payload),
    stopWatching: (payload) => electron.ipcRenderer.invoke("file:stopWatching", payload),
    resolvePath: (payload) => electron.ipcRenderer.invoke("file:resolvePath", payload),
    getImageData: (payload) => electron.ipcRenderer.invoke("file:getImageData", payload),
    getDirectoryListing: (payload) => electron.ipcRenderer.invoke("file:getDirectoryListing", payload),
    exportToPDF: (payload) => electron.ipcRenderer.invoke("file:exportToPDF", payload)
  },
  settings: {
    load: (payload) => electron.ipcRenderer.invoke("settings:load", payload),
    save: (payload) => electron.ipcRenderer.invoke("settings:save", payload),
    reset: (payload) => electron.ipcRenderer.invoke("settings:reset", payload)
  },
  shell: {
    openExternal: (url) => electron.ipcRenderer.invoke("shell:openExternal", { url })
  },
  window: {
    minimize: () => electron.ipcRenderer.invoke("window:minimize"),
    maximize: () => electron.ipcRenderer.invoke("window:maximize"),
    close: () => electron.ipcRenderer.invoke("window:close"),
    isMaximized: () => electron.ipcRenderer.invoke("window:isMaximized"),
    createNew: (payload) => electron.ipcRenderer.invoke("window:createNew", payload),
    setGlobalZoom: (payload) => electron.ipcRenderer.invoke("window:setGlobalZoom", payload),
    // T051b
    getGlobalZoom: () => electron.ipcRenderer.invoke("window:getGlobalZoom")
    // T051b
  },
  uiState: {
    load: () => electron.ipcRenderer.invoke("uiState:load"),
    save: (payload) => electron.ipcRenderer.invoke("uiState:save", payload)
  },
  on: (channel, callback) => {
    const validChannels = [
      "file:changed",
      "file:watchError",
      "folder:changed",
      "menu:open-file",
      "menu:open-folder",
      "menu:close-current",
      "menu:close-folder",
      "menu:close-all",
      "window:initialState",
      "app:initialState",
      // T051k-view: Content zoom menu events
      "menu:content-zoom-in",
      "menu:content-zoom-out",
      "menu:content-zoom-reset",
      "menu:content-zoom-preset",
      // T051k-view: Global zoom menu events
      "menu:global-zoom-in",
      "menu:global-zoom-out",
      "menu:global-zoom-reset",
      "menu:global-zoom-preset"
    ];
    if (validChannels.includes(channel)) {
      electron.ipcRenderer.on(channel, callback);
    }
  }
});
exposeGitAPI();
