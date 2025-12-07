["dragenter", "dragover", "dragleave", "drop"].forEach((evt) => {
  window.addEventListener(evt, (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (evt === "dragover" && e.dataTransfer) {
      e.dataTransfer.dropEffect = "copy";
    }
  });
  document.addEventListener(evt, (e) => {
    e.preventDefault();
    e.stopPropagation();
  });
});

const filesInput = document.getElementById("files");
const outDirInput = document.getElementById("outDir");
const sheetInput = document.getElementById("sheet");
const csvEncodingInput = document.getElementById("csvEncoding");
const colIdInput = document.getElementById("colId");
const colSubjectInput = document.getElementById("colSubject");
const colUrlInput = document.getElementById("colUrl");
const waitInput = document.getElementById("wait");
const dedupeInput = document.getElementById("dedupe");
const headlessInput = document.getElementById("headless");
const logsEl = document.getElementById("logs");
const statusEl = document.getElementById("status");
const failedListEl = document.getElementById("failed-urls");
const failedCountEl = document.getElementById("failed-count");
const copyFailedBtn = document.getElementById("copy-failed");
const rerunFailedBtn = document.getElementById("rerun-failed");
const runBtn = document.getElementById("run");
const cancelBtn = document.getElementById("cancel");
const dropzone = document.getElementById("dropzone");

let isRunning = false;
let failedUrls = [];
let lastArgs = null;

function setRunning(next) {
  isRunning = next;
  runBtn.disabled = next;
  cancelBtn.disabled = !next;
  statusEl.textContent = next ? "실행 중..." : "대기 중";
  rerunFailedBtn.disabled = next || failedUrls.length === 0;
}

function appendLog(prefix, message) {
  const text = `[${prefix}] ${message}`.trim();
  logsEl.textContent += `${text}\n`;
  logsEl.scrollTop = logsEl.scrollHeight;
}

function buildArgs() {
  const files = (filesInput.value || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (files.length === 0) {
    throw new Error("파일을 선택하거나 경로를 입력해주세요.");
  }

  const args = ["--files", files.join(",")];

  if (sheetInput.value) args.push("--sheet", sheetInput.value.trim());
  if (csvEncodingInput.value)
    args.push("--csvEncoding", csvEncodingInput.value.trim());
  if (colIdInput.value) args.push("--id", colIdInput.value.trim());
  if (colSubjectInput.value)
    args.push("--subject", colSubjectInput.value.trim());
  if (colUrlInput.value) args.push("--url", colUrlInput.value.trim());
  if (outDirInput.value) args.push("--out", outDirInput.value.trim());
  if (waitInput.value) args.push("--wait", waitInput.value.trim());

  if (!dedupeInput.checked) args.push("--dedupe", "false");
  if (!headlessInput.checked) args.push("--headless", "false");

  return args;
}

function resetFailedList() {
  failedUrls = [];
  renderFailedList();
}

function renderFailedList() {
  failedCountEl.textContent = `${failedUrls.length}개`;
  failedListEl.textContent = failedUrls.join("\n");
  copyFailedBtn.disabled = failedUrls.length === 0;
  rerunFailedBtn.disabled = isRunning || failedUrls.length === 0;
}

function addFailedUrl(url) {
  const clean = (url || "").trim();
  if (!clean || failedUrls.includes(clean)) return;
  failedUrls.push(clean);
  renderFailedList();
}

function parseFailedFromMessage(message) {
  if (!message) return;
  message
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .forEach((line) => {
      const summary = line.match(/FAILED_URLS:\s*(.+)/);
      if (summary && summary[1]) {
        summary[1]
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
          .forEach(addFailedUrl);
        return;
      }

      const m = line.match(/-> failed:\s*([^\s]+)/i);
      if (m && m[1]) {
        addFailedUrl(m[1]);
      }
    });
}

function stripOnlyUrls(args) {
  const next = [];
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--onlyUrls") {
      i++;
      continue;
    }
    next.push(arg);
  }
  return next;
}

document.getElementById("pick-out").addEventListener("click", async () => {
  const dir = await window.captureApi.selectOutDir();
  if (dir) {
    outDirInput.value = dir;
  }
});

runBtn.addEventListener("click", async () => {
  try {
    const args = buildArgs();
    lastArgs = args;
    setRunning(true);
    logsEl.textContent = "";
    resetFailedList();
    appendLog("app", `실행 명령: webpage-capture ${args.join(" ")}`);
    const res = await window.captureApi.run(args);
    if (res && res.error) {
      appendLog("error", res.error);
      setRunning(false);
    }
  } catch (e) {
    appendLog("error", e.message || e);
  }
});

cancelBtn.addEventListener("click", async () => {
  await window.captureApi.cancel();
});

window.captureApi.onLog((payload) => {
  const { type, message } = payload;
  appendLog(type, message);
  parseFailedFromMessage(message);
  if (message && message.includes("종료")) {
    setRunning(false);
  }
});

copyFailedBtn.addEventListener("click", async () => {
  if (!failedUrls.length) return;
  try {
    await navigator.clipboard.writeText(failedUrls.join("\n"));
    appendLog("app", "실패 URL을 클립보드에 복사했습니다.");
  } catch (e) {
    appendLog("error", e.message || "클립보드 복사 실패");
  }
});

rerunFailedBtn.addEventListener("click", async () => {
  if (!failedUrls.length) {
    appendLog("app", "재실행할 실패 URL이 없습니다.");
    return;
  }
  if (!lastArgs) {
    appendLog("app", "먼저 전체 실행을 한번 진행해주세요.");
    return;
  }

  const baseArgs = stripOnlyUrls(lastArgs);
  const retryArgs = [...baseArgs, "--onlyUrls", failedUrls.join(",")];

  try {
    setRunning(true);
    logsEl.textContent = "";
    resetFailedList();
    appendLog(
      "app",
      `실패 URL ${failedUrls.length}개만 재실행: ${failedUrls.join(", ")}`
    );
    const res = await window.captureApi.run(retryArgs);
    if (res && res.error) {
      appendLog("error", res.error);
      setRunning(false);
    }
  } catch (e) {
    appendLog("error", e.message || e);
    setRunning(false);
  }
});

setRunning(false);
renderFailedList();

function handleDropFiles(fileList) {
  const allowed = [".xlsx", ".xls", ".csv", ".txt"];

  const files = Array.from(fileList || []);
  console.log("[renderer] drop files:", files.length, files);

  const paths = files
    .map((file) => {
      console.log("[renderer] file:", file.name, file.path);
      return file.path; // Electron에서 제공하는 절대 경로
    })
    .filter((p) => {
      if (!p) return false;
      const lower = p.toLowerCase();
      return allowed.some((ext) => lower.endsWith(ext));
    });

  console.log("[renderer] paths:", paths);

  if (paths.length > 0) {
    const merged = [
      ...new Set(
        [
          ...(filesInput.value
            ? filesInput.value.split(",").map((s) => s.trim())
            : []),
          ...paths
        ].filter(Boolean)
      )
    ];
    filesInput.value = merged.join(", ");
  }
}

// dropzone 위로 올라왔을 때
["dragenter", "dragover"].forEach((evt) => {
  dropzone.addEventListener(evt, (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropzone.classList.add("dragover");
  });
});

// dropzone 밖으로 나가거나 실제 드롭 됐을 때
["dragleave", "drop"].forEach((evt) => {
  dropzone.addEventListener(evt, (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropzone.classList.remove("dragover");
  });
});

// 실제 드롭 처리
dropzone.addEventListener("drop", (e) => {
  e.preventDefault();
  e.stopPropagation();
  dropzone.classList.remove("dragover");
  handleDropFiles(e.dataTransfer.files);
});

// 클릭 시 파일 선택
dropzone.addEventListener("click", async () => {
  const files = await window.captureApi.selectFiles();
  if (files && files.length > 0) {
    const merged = [
      ...new Set(
        [
          ...(filesInput.value
            ? filesInput.value.split(",").map((s) => s.trim())
            : []),
          ...files
        ].filter(Boolean)
      )
    ];
    filesInput.value = merged.join(", ");
  }
});
