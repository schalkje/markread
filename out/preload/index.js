"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("electronAPI", {
  file: {
    read: (payload) => electron.ipcRenderer.invoke("file:read", payload),
    openFileDialog: (payload) => electron.ipcRenderer.invoke("file:openFileDialog", payload),
    openFolderDialog: (payload) => electron.ipcRenderer.invoke("file:openFolderDialog", payload),
    getFolderTree: (payload) => electron.ipcRenderer.invoke("file:getFolderTree", payload)
  },
  settings: {
    load: (payload) => electron.ipcRenderer.invoke("settings:load", payload),
    save: (payload) => electron.ipcRenderer.invoke("settings:save", payload),
    reset: (payload) => electron.ipcRenderer.invoke("settings:reset", payload)
  }
});
