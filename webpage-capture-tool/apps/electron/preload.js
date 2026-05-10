/**
 * 렌더러가 사용할 IPC 브리지를 안전하게 노출한다.
 *
 * 채널 네임스페이스: window.workbenchApi
 * 채널 문자열은 이 파일 내부에만 존재하며, 렌더러는 API 메서드만 호출한다.
 */
const { contextBridge, ipcRenderer, webUtils } = require("electron");

contextBridge.exposeInMainWorld("workbenchApi", {
  // 파일 선택
  selectFiles: () => ipcRenderer.invoke("file:select-files"),
  selectOutDir: () => ipcRenderer.invoke("file:select-out-dir"),
  selectProjectFile: () => ipcRenderer.invoke("file:select-project"),
  selectRecipeFile: () => ipcRenderer.invoke("file:select-recipe"),
  openFolder: (dirPath) => ipcRenderer.invoke("file:open-folder", dirPath),

  // Electron 32+에서 File.path가 제거됨 — webUtils.getPathForFile로 대체
  getFilePath: (file) => webUtils.getPathForFile(file),

  // 캡처
  runCapture: (args) => ipcRenderer.invoke("capture:run", args),
  cancelCapture: () => ipcRenderer.invoke("capture:cancel"),

  // 프로젝트
  saveProject: (data, filePath) => ipcRenderer.invoke("project:save", data, filePath),
  loadProject: (filePath) => ipcRenderer.invoke("project:load", filePath),

  // 레시피
  saveRecipeDialog: (data) => ipcRenderer.invoke("recipe:save-dialog", data),
  loadRecipe: (filePath) => ipcRenderer.invoke("recipe:load", filePath),

  // 이미지 편집
  processImage: (opts) => ipcRenderer.invoke("image:process", opts),
  snapshotFileForUndo: (filePath) => ipcRenderer.invoke("image:snapshot-for-undo", filePath),
  undoFile: (filePath) => ipcRenderer.invoke("image:undo-file", filePath),
  redoFile: (filePath) => ipcRenderer.invoke("image:redo-file", filePath),
  clearFileHistory: (filePath) => ipcRenderer.invoke("image:clear-file-history", filePath),
  saveImageAs: (sourcePath) => ipcRenderer.invoke("image:save-as", sourcePath),

  // 내보내기
  runExport: (opts) => ipcRenderer.invoke("export:run", opts),

  // 로그 수신
  onLog: (callback) => {
    const handler = (_event, payload) => callback(payload);
    ipcRenderer.on("workbench:log", handler);
    return () => ipcRenderer.removeListener("workbench:log", handler);
  }
});

// 레거시 호환: 기존 captureApi도 유지 (기존 테스트/코드와의 호환)
contextBridge.exposeInMainWorld("captureApi", {
  selectFiles: () => ipcRenderer.invoke("select-files"),
  selectOutDir: () => ipcRenderer.invoke("select-out-dir"),
  run: (args) => ipcRenderer.invoke("run-cli", args),
  cancel: () => ipcRenderer.invoke("cancel-cli"),
  getFilePath: (file) => webUtils.getPathForFile(file),
  onLog: (callback) => {
    const handler = (_event, payload) => callback(payload);
    ipcRenderer.on("cli-log", handler);
    return () => ipcRenderer.removeListener("cli-log", handler);
  }
});
