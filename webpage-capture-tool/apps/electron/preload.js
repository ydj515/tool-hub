const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("captureApi", {
  selectFiles: () => ipcRenderer.invoke("select-files"),
  selectOutDir: () => ipcRenderer.invoke("select-out-dir"),
  run: (args) => ipcRenderer.invoke("run-cli", args),
  cancel: () => ipcRenderer.invoke("cancel-cli"),
  onLog: (callback) => {
    const handler = (_event, payload) => callback(payload);
    ipcRenderer.on("cli-log", handler);
    return () => ipcRenderer.removeListener("cli-log", handler);
  }
});
