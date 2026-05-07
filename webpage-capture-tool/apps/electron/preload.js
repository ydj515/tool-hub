/**
 * 렌더러가 사용할 IPC 브리지를 안전하게 노출한다.
 */
const { contextBridge, ipcRenderer, webUtils } = require("electron");

contextBridge.exposeInMainWorld("captureApi", {
  selectFiles: () => ipcRenderer.invoke("select-files"),
  selectOutDir: () => ipcRenderer.invoke("select-out-dir"),
  run: (args) => ipcRenderer.invoke("run-cli", args),
  cancel: () => ipcRenderer.invoke("cancel-cli"),
  // Electron 32+에서 File.path가 제거됨 — webUtils.getPathForFile로 대체
  getFilePath: webUtils.getPathForFile,
  onLog: (callback) => {
    const handler = (_event, payload) => callback(payload);
    ipcRenderer.on("cli-log", handler);
    return () => ipcRenderer.removeListener("cli-log", handler);
  }
});
