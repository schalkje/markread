"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("electronAPI", {
  file: {
    read: (payload) => electron.ipcRenderer.invoke("file:read", payload),
    openFileDialog: (payload) => electron.ipcRenderer.invoke("file:openFileDialog", payload),
    openFolderDialog: (payload) => electron.ipcRenderer.invoke("file:openFolderDialog", payload),
    getFolderTree: (payload) => electron.ipcRenderer.invoke("file:getFolderTree", payload),
    watchFolder: (payload) => electron.ipcRenderer.invoke("file:watchFolder", payload),
    stopWatching: (payload) => electron.ipcRenderer.invoke("file:stopWatching", payload),
    resolvePath: (payload) => electron.ipcRenderer.invoke("file:resolvePath", payload),
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
