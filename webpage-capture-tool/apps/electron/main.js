const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const fs = require("fs");
const os = require("os");
const { spawn } = require("child_process");

let mainWindow;
let currentChild = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 780,
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

  const local = path.join(
    __dirname,
    "node_modules",
    "playwright",
    ".local-browsers"
  );
  if (fs.existsSync(local)) return local;

  const homeDir = os.homedir() || process.env.HOME || process.env.USERPROFILE || "";
  const cache = (() => {
    switch (process.platform) {
      case "win32":
        return path.join(homeDir, "AppData", "Local", "ms-playwright");
      case "linux":
        return path.join(homeDir, ".cache", "ms-playwright");
      default:
        return path.join(homeDir, "Library", "Caches", "ms-playwright");
    }
  })();
  if (fs.existsSync(cache)) return cache;

  return null;
}

function sendLog(payload) {
  if (mainWindow && mainWindow.webContents) {
    mainWindow.webContents.send("cli-log", payload);
  }
}

function runCli(args) {
  if (currentChild) {
    return { error: "이미 실행 중입니다." };
  }

  const scriptPath = getScriptPath();
  if (!scriptPath) {
    return {
      error:
        "CLI 스크립트를 찾지 못했습니다. 의존성(@webpage-capture/cli) 설치를 확인하세요."
    };
  }
  const browsersPath = getPlaywrightBrowsersPath();
  const nodeCmd = process.execPath;
  const child = spawn(nodeCmd, [scriptPath, ...args], {
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

  child.stdout.on("data", (data) =>
    sendLog({ type: "stdout", message: data.toString() })
  );
  child.stderr.on("data", (data) =>
    sendLog({ type: "stderr", message: data.toString() })
  );

  child.on("exit", (code, signal) => {
    sendLog({
      type: "status",
      message: `종료 (code=${code}, signal=${signal || "none"})`
    });
    currentChild = null;
  });

  child.on("error", (err) => {
    sendLog({ type: "stderr", message: err.message });
  });

  return { ok: true };
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

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
  if (res.canceled || !res.filePaths[0]) return null;
  return res.filePaths[0];
});

ipcMain.handle("run-cli", async (_event, args) => {
  return runCli(args);
});

ipcMain.handle("cancel-cli", async () => {
  if (currentChild) {
    currentChild.kill();
    sendLog({ type: "status", message: "실행을 종료 요청했습니다." });
    return { ok: true };
  }
  return { ok: false, message: "실행 중인 프로세스가 없습니다." };
});
