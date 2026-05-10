/**
 * Electron 메인 프로세스.
 * 창 생성, CLI 실행, 프로젝트/레시피 저장, 이미지 편집, 내보내기 IPC를 담당한다.
 *
 * IPC 채널 네이밍: {기능}:{동작}
 */
const { app, BrowserWindow, ipcMain, dialog, shell } = require("electron");
const path = require("path");
const fs = require("fs");
const os = require("os");
const { spawn } = require("child_process");
const { saveProject, loadProject, saveRecipe, loadRecipe } = require("@webpage-capture/core");
const { processImage } = require("@webpage-capture/core");
const { exportMarkdown } = require("@webpage-capture/core");
const { exportWordAssets } = require("@webpage-capture/core");
const { exportPptAssets } = require("@webpage-capture/core");

let mainWindow;
let currentChild = null;

// 이미지 편집 파일 히스토리 (경로별 Buffer 스택)
const imageFileUndoStacks = new Map(); // filePath → Buffer[]
const imageFileRedoStacks = new Map(); // filePath → Buffer[]

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, "renderer", "index.html"));
}

function getScriptPath() {
  try {
    return require.resolve("@webpage-capture/cli/bin/screenshot.js");
  } catch (err) {
    return null;
  }
}

function getPlaywrightBrowsersPath() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, "playwright-browsers");
  }

  const bundled = path.join(__dirname, "playwright-browsers");
  if (fs.existsSync(bundled)) return bundled;

  const local = path.join(__dirname, "node_modules", "playwright", ".local-browsers");
  if (fs.existsSync(local)) return local;

  const homeDir = os.homedir() || process.env.HOME || process.env.USERPROFILE || "";
  const cache = (() => {
    switch (process.platform) {
      case "win32": return path.join(homeDir, "AppData", "Local", "ms-playwright");
      case "linux": return path.join(homeDir, ".cache", "ms-playwright");
      default: return path.join(homeDir, "Library", "Caches", "ms-playwright");
    }
  })();
  if (fs.existsSync(cache)) return cache;
  return null;
}

function sendLog(payload) {
  if (mainWindow && mainWindow.webContents) {
    mainWindow.webContents.send("workbench:log", payload);
    mainWindow.webContents.send("cli-log", payload); // 레거시 captureApi 호환
  }
}

function runCaptureCli(args) {
  if (currentChild) {
    return { error: "이미 실행 중입니다." };
  }

  const scriptPath = getScriptPath();
  if (!scriptPath) {
    return { error: "CLI 스크립트를 찾지 못했습니다. 의존성(@webpage-capture/cli) 설치를 확인하세요." };
  }

  const browsersPath = getPlaywrightBrowsersPath();
  const child = spawn(process.execPath, [scriptPath, ...args], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: "1",
      ...(browsersPath ? { PLAYWRIGHT_BROWSERS_PATH: browsersPath } : {})
    }
  });

  currentChild = child;
  sendLog({ type: "status", message: "실행 시작" });

  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");

  child.stdout.on("data", (data) => sendLog({ type: "stdout", message: data.toString() }));
  child.stderr.on("data", (data) => sendLog({ type: "stderr", message: data.toString() }));

  child.on("exit", (code, signal) => {
    sendLog({ type: "status", message: `종료 (code=${code}, signal=${signal || "none"})` });
    currentChild = null;
  });

  child.on("error", (err) => sendLog({ type: "stderr", message: err.message }));

  return { ok: true };
}

// ============================================================
// 앱 생명주기
// ============================================================
app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

// ============================================================
// IPC 핸들러 — 파일 선택
// ============================================================
ipcMain.handle("file:select-files", async () => {
  const res = await dialog.showOpenDialog(mainWindow, {
    properties: ["openFile", "multiSelections"],
    filters: [
      { name: "List files", extensions: ["xlsx", "xls", "csv", "txt"] },
      { name: "All Files", extensions: ["*"] }
    ]
  });
  return res.canceled ? [] : res.filePaths;
});

ipcMain.handle("file:select-out-dir", async () => {
  const res = await dialog.showOpenDialog(mainWindow, {
    properties: ["openDirectory", "createDirectory"]
  });
  return res.canceled || !res.filePaths[0] ? null : res.filePaths[0];
});

ipcMain.handle("file:select-project", async () => {
  const res = await dialog.showOpenDialog(mainWindow, {
    filters: [{ name: "Manual Capture Project", extensions: ["mcw.json", "json"] }],
    properties: ["openFile"]
  });
  return res.canceled ? null : res.filePaths[0];
});

ipcMain.handle("file:select-recipe", async () => {
  const res = await dialog.showOpenDialog(mainWindow, {
    filters: [{ name: "Recipe", extensions: ["recipe.json", "json"] }],
    properties: ["openFile"]
  });
  return res.canceled ? null : res.filePaths[0];
});

ipcMain.handle("file:open-folder", async (_event, dirPath) => {
  if (dirPath && fs.existsSync(dirPath)) {
    shell.openPath(dirPath);
  }
});

// ============================================================
// IPC 핸들러 — 캡처
// ============================================================
ipcMain.handle("capture:run", async (_event, args) => {
  return runCaptureCli(args);
});

ipcMain.handle("capture:cancel", async () => {
  if (currentChild) {
    currentChild.kill();
    sendLog({ type: "status", message: "종료 요청됨" });
    return { ok: true };
  }
  return { ok: false, message: "실행 중인 프로세스가 없습니다." };
});

// ============================================================
// IPC 핸들러 — 프로젝트
// ============================================================
ipcMain.handle("project:save", async (_event, projectData, filePath) => {
  try {
    let savePath = filePath;
    if (!savePath) {
      const res = await dialog.showSaveDialog(mainWindow, {
        defaultPath: `${projectData.name || "project"}.mcw.json`,
        filters: [{ name: "Manual Capture Project", extensions: ["mcw.json", "json"] }]
      });
      if (res.canceled || !res.filePath) return null;
      savePath = res.filePath;
    }
    saveProject(savePath, projectData);
    return savePath;
  } catch (e) {
    return { error: e.message };
  }
});

ipcMain.handle("project:load", async (_event, filePath) => {
  try {
    return loadProject(filePath);
  } catch (e) {
    return { error: e.message };
  }
});

// ============================================================
// IPC 핸들러 — 레시피
// ============================================================
ipcMain.handle("recipe:save-dialog", async (_event, recipeData) => {
  try {
    const res = await dialog.showSaveDialog(mainWindow, {
      defaultPath: `${recipeData.name || "recipe"}.recipe.json`,
      filters: [{ name: "Recipe", extensions: ["recipe.json", "json"] }]
    });
    if (res.canceled || !res.filePath) return null;
    saveRecipe(res.filePath, recipeData);
    return res.filePath;
  } catch (e) {
    return { error: e.message };
  }
});

ipcMain.handle("recipe:load", async (_event, filePath) => {
  try {
    return loadRecipe(filePath);
  } catch (e) {
    return { error: e.message };
  }
});

// ============================================================
// IPC 핸들러 — 이미지 편집
// ============================================================
ipcMain.handle("image:process", async (_event, { inputPath, outputPath, rules }) => {
  try {
    const result = await processImage(inputPath, outputPath, rules);
    return result;
  } catch (e) {
    return { error: e.message };
  }
});

// 편집 적용 전 현재 파일을 undo 버퍼에 저장
ipcMain.handle("image:snapshot-for-undo", (_event, filePath) => {
  try {
    if (!fs.existsSync(filePath)) return { error: "파일 없음" };
    const buf = fs.readFileSync(filePath);
    if (!imageFileUndoStacks.has(filePath)) imageFileUndoStacks.set(filePath, []);
    imageFileUndoStacks.get(filePath).push(buf);
    // 새 액션이 생기면 redo 스택 무효화
    imageFileRedoStacks.set(filePath, []);
    return { ok: true };
  } catch (e) {
    return { error: e.message };
  }
});

// 파일을 이전 상태로 복원
ipcMain.handle("image:undo-file", (_event, filePath) => {
  try {
    const undoStack = imageFileUndoStacks.get(filePath) || [];
    if (undoStack.length === 0) return { ok: false };
    const prevBuf = undoStack.pop();
    if (!imageFileRedoStacks.has(filePath)) imageFileRedoStacks.set(filePath, []);
    if (fs.existsSync(filePath)) {
      imageFileRedoStacks.get(filePath).push(fs.readFileSync(filePath));
    }
    fs.writeFileSync(filePath, prevBuf);
    return { ok: true };
  } catch (e) {
    return { error: e.message };
  }
});

// 파일을 다음 상태로 복원
ipcMain.handle("image:redo-file", (_event, filePath) => {
  try {
    const redoStack = imageFileRedoStacks.get(filePath) || [];
    if (redoStack.length === 0) return { ok: false };
    const nextBuf = redoStack.pop();
    if (!imageFileUndoStacks.has(filePath)) imageFileUndoStacks.set(filePath, []);
    if (fs.existsSync(filePath)) {
      imageFileUndoStacks.get(filePath).push(fs.readFileSync(filePath));
    }
    fs.writeFileSync(filePath, nextBuf);
    return { ok: true };
  } catch (e) {
    return { error: e.message };
  }
});

// 이미지 전환 시 파일 히스토리 초기화
ipcMain.handle("image:clear-file-history", (_event, filePath) => {
  imageFileUndoStacks.delete(filePath);
  imageFileRedoStacks.delete(filePath);
  return { ok: true };
});

// 편집된 이미지를 PNG로 다른 경로에 저장
ipcMain.handle("image:save-as", async (_event, sourcePath) => {
  try {
    const baseName = path.basename(sourcePath, ".png");
    const res = await dialog.showSaveDialog(mainWindow, {
      defaultPath: `${baseName}_edited.png`,
      filters: [{ name: "PNG Image", extensions: ["png"] }]
    });
    if (res.canceled || !res.filePath) return null;
    fs.copyFileSync(sourcePath, res.filePath);
    return res.filePath;
  } catch (e) {
    return { error: e.message };
  }
});

// ============================================================
// IPC 핸들러 — 내보내기
// ============================================================
ipcMain.handle("export:run", async (_event, { items, outputDir, channels, namingPattern }) => {
  try {
    const profileOverride = namingPattern ? { namingPattern } : {};
    const results = {};

    if (channels.markdown) {
      const mdDir = path.join(outputDir, "markdown-export");
      results.markdown = await exportMarkdown(items, mdDir, profileOverride);
    }
    if (channels.word) {
      const wordDir = path.join(outputDir, "word-assets");
      results.word = await exportWordAssets(items, wordDir, profileOverride);
    }
    if (channels.ppt) {
      const pptDir = path.join(outputDir, "ppt-assets");
      results.ppt = await exportPptAssets(items, pptDir, profileOverride);
    }

    return results;
  } catch (e) {
    return { error: e.message };
  }
});

// ============================================================
// 레거시 호환 — 기존 captureApi 채널 유지
// ============================================================
ipcMain.handle("select-files", async () => {
  const res = await dialog.showOpenDialog(mainWindow, {
    properties: ["openFile", "multiSelections"],
    filters: [
      { name: "List files", extensions: ["xlsx", "xls", "csv", "txt"] },
      { name: "All Files", extensions: ["*"] }
    ]
  });
  return res.canceled ? [] : res.filePaths;
});

ipcMain.handle("select-out-dir", async () => {
  const res = await dialog.showOpenDialog(mainWindow, {
    properties: ["openDirectory", "createDirectory"]
  });
  return res.canceled || !res.filePaths[0] ? null : res.filePaths[0];
});

ipcMain.handle("run-cli", async (_event, args) => runCaptureCli(args));

ipcMain.handle("cancel-cli", async () => {
  if (currentChild) {
    currentChild.kill();
    sendLog({ type: "status", message: "종료 요청됨" });
    return { ok: true };
  }
  return { ok: false, message: "실행 중인 프로세스가 없습니다." };
});
