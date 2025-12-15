"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("electronAPI", {
  file: {
    read: (payload) => electron.ipcRenderer.invoke("file:read", payload),
    openFileDialog: (payload) => electron.ipcRenderer.invoke("file:openFileDialog", payload),
    openFolderDialog: (payload) => electron.ipcRenderer.invoke("file:openFolderDialog", payload),
    getFolderTree: (payload) => electron.ipcRenderer.invoke("file:getFolderTree", payload),
    watchFolder: (payload) => electron.ipcRenderer.invoke("file:watchFolder", payload),
    stopWatching: (payload) => electron.ipcRenderer.invoke("file:stopWatching", payload)
  },
  settings: {
    load: (payload) => electron.ipcRenderer.invoke("settings:load", payload),
    save: (payload) => electron.ipcRenderer.invoke("settings:save", payload),
    reset: (payload) => electron.ipcRenderer.invoke("settings:reset", payload)
  },
  on: (channel, callback) => {
    const validChannels = ["file:changed", "file:watchError", "folder:changed"];
    if (validChannels.includes(channel)) {
      electron.ipcRenderer.on(channel, callback);
    }
  }
});
