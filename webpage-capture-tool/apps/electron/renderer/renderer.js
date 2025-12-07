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
const runBtn = document.getElementById("run");
const cancelBtn = document.getElementById("cancel");
const dropzone = document.getElementById("dropzone");

let isRunning = false;

function setRunning(next) {
  isRunning = next;
  runBtn.disabled = next;
  cancelBtn.disabled = !next;
  statusEl.textContent = next ? "실행 중..." : "대기 중";
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

document.getElementById("pick-out").addEventListener("click", async () => {
  const dir = await window.captureApi.selectOutDir();
  if (dir) {
    outDirInput.value = dir;
  }
});

runBtn.addEventListener("click", async () => {
  try {
    const args = buildArgs();
    setRunning(true);
    logsEl.textContent = "";
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
  if (message && message.includes("종료")) {
    setRunning(false);
  }
});

setRunning(false);

function handleDropFiles(fileList) {
  const allowed = [".xlsx", ".xls", ".csv", ".txt"];

  const files = Array.from(fileList || []);
  console.log("[renderer] drop files:", files.length, files);

  const paths = files
    .map((file) => {
      console.log("[renderer] file:", file.name, file.path);
      return file.path; // 👈 Electron에서 제공하는 절대 경로
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

// 🔹 dropzone 위로 올라왔을 때
["dragenter", "dragover"].forEach((evt) => {
  dropzone.addEventListener(evt, (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropzone.classList.add("dragover");
  });
});

// 🔹 dropzone 밖으로 나가거나 실제 드롭 됐을 때
["dragleave", "drop"].forEach((evt) => {
  dropzone.addEventListener(evt, (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropzone.classList.remove("dragover");
  });
});

// 🔹 실제 드롭 처리
dropzone.addEventListener("drop", (e) => {
  e.preventDefault();
  e.stopPropagation();
  dropzone.classList.remove("dragover");
  handleDropFiles(e.dataTransfer.files);
});

// 🔹 클릭 시 파일 선택
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

["dragenter", "dragover", "dragleave", "drop"].forEach((evt) => {
  window.addEventListener(evt, (e) => {
    console.log("[window]", evt, e.dataTransfer?.files?.length);
  });
});

["dragenter", "dragover", "dragleave", "drop"].forEach((evt) => {
  dropzone.addEventListener(evt, (e) => {
    console.log("[dropzone]", evt, e.dataTransfer?.files?.length);
  });
});
