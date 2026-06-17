/**
 * 캡처 화면 초기화와 이벤트 바인딩을 담당한다.
 */

const CAPTURE_ASPECTS = {
  free: null,
  "16:9": 16 / 9,
  "4:3": 4 / 3
};

function getCaptureAspectRatio() {
  const preset = AppState.project.capturePreset;
  if (preset.aspectMode === "original") {
    return preset.aspectRatioValue || (preset.viewport.width / Math.max(1, preset.viewport.height));
  }
  return CAPTURE_ASPECTS[preset.aspectMode] || null;
}

function syncCaptureAspectByWidth() {
  const ratio = getCaptureAspectRatio();
  if (!ratio) return;
  AppState.project.capturePreset.viewport.height = Math.max(
    240,
    Math.round(AppState.project.capturePreset.viewport.width / ratio)
  );
}

function syncCaptureAspectByHeight() {
  const ratio = getCaptureAspectRatio();
  if (!ratio) return;
  AppState.project.capturePreset.viewport.width = Math.max(
    320,
    Math.round(AppState.project.capturePreset.viewport.height * ratio)
  );
}

function updateCaptureAspectButtons() {
  const mode = AppState.project.capturePreset.aspectMode || "free";
  document.querySelectorAll(".btn-aspect").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.aspect === mode);
  });
}

function parseCaptureDepth(value) {
  const parsed = parseInt(value, 10);
  if (!Number.isFinite(parsed)) return 0;
  return Math.min(2, Math.max(0, parsed));
}

function initCaptureScreen() {
  const srcSingle = document.getElementById("src-single");
  const srcFile = document.getElementById("src-file");
  const singleUrlGroup = document.getElementById("single-url-group");
  const fileGroup = document.getElementById("file-group");
  const singleUrlInput = document.getElementById("single-url");
  const filePathsInput = document.getElementById("file-paths");
  const btnPickFile = document.getElementById("btn-pick-file");
  const btnPickOut = document.getElementById("btn-pick-out");
  const outDirInput = document.getElementById("out-dir");
  const waitMsInput = document.getElementById("wait-ms");
  const depthInput = document.getElementById("depth");
  const headlessInput = document.getElementById("headless");
  const dedupeInput = document.getElementById("dedupe");
  const dropzone = document.getElementById("dropzone");
  const sheetInput = document.getElementById("sheet");
  const colUrlInput = document.getElementById("col-url");

  // 소스 유형 전환
  function toggleSourceType() {
    const isSingle = srcSingle.checked;
    singleUrlGroup.classList.toggle("hidden", !isSingle);
    fileGroup.classList.toggle("hidden", isSingle);
    AppState.project.capturePreset.sourceType = isSingle ? "single" : "file";
  }

  srcSingle.addEventListener("change", toggleSourceType);
  srcFile.addEventListener("change", toggleSourceType);

  // 뷰포트 프리셋
  document.querySelectorAll(".btn-preset").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".btn-preset").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      const preset = btn.dataset.preset;
      AppState.project.capturePreset.viewportPreset = preset;
      const vp = getViewportByPreset(preset);
      AppState.project.capturePreset.viewport = { width: vp.width, height: vp.height };
      if (AppState.project.capturePreset.aspectMode === "original") {
        AppState.project.capturePreset.aspectRatioValue = vp.width / vp.height;
      } else {
        syncCaptureAspectByWidth();
      }
      document.getElementById("custom-viewport-group").classList.toggle("hidden", preset !== "custom");
      document.getElementById("viewport-width").value = vp.width;
      document.getElementById("viewport-height").value = AppState.project.capturePreset.viewport.height;
      updateCapturePanel();
    });
  });

  document.querySelectorAll(".btn-aspect").forEach((btn) => {
    btn.addEventListener("click", () => {
      const mode = btn.dataset.aspect;
      AppState.project.capturePreset.aspectMode = mode;
      if (mode === "original") {
        const { width, height } = AppState.project.capturePreset.viewport;
        AppState.project.capturePreset.aspectRatioValue = width / Math.max(1, height);
      }
      syncCaptureAspectByWidth();
      document.getElementById("viewport-width").value = AppState.project.capturePreset.viewport.width;
      document.getElementById("viewport-height").value = AppState.project.capturePreset.viewport.height;
      updateCaptureAspectButtons();
      updateCapturePanel();
    });
  });

  // 사용자 정의 뷰포트
  document.getElementById("viewport-width").addEventListener("input", (e) => {
    AppState.project.capturePreset.viewport.width = parseInt(e.target.value, 10) || 1280;
    syncCaptureAspectByWidth();
    document.getElementById("viewport-height").value = AppState.project.capturePreset.viewport.height;
    updateCapturePanel();
  });
  document.getElementById("viewport-height").addEventListener("input", (e) => {
    AppState.project.capturePreset.viewport.height = parseInt(e.target.value, 10) || 800;
    syncCaptureAspectByHeight();
    document.getElementById("viewport-width").value = AppState.project.capturePreset.viewport.width;
    updateCapturePanel();
  });

  // 캡처 범위
  document.querySelectorAll("[name='capture-scope']").forEach((radio) => {
    radio.addEventListener("change", () => {
      const val = radio.value;
      AppState.project.capturePreset.captureScope = val;
      document.getElementById("capture-selector-group").classList.toggle("hidden", val !== "selector");
      updateCapturePanel();
    });
  });

  document.getElementById("capture-selector").addEventListener("input", (e) => {
    AppState.project.capturePreset.captureSelector = e.target.value.trim();
  });

  // 단일 URL 입력
  singleUrlInput.addEventListener("input", (e) => {
    AppState.project.capturePreset.singleUrl = e.target.value.trim();
  });

  // 파일 선택
  btnPickFile.addEventListener("click", async () => {
    const files = await window.workbenchApi.selectFiles();
    if (files && files.length > 0) {
      filePathsInput.value = files.join(", ");
      AppState.project.capturePreset.filePaths = files;
    }
  });

  // 출력 폴더 선택
  btnPickOut.addEventListener("click", async () => {
    const dir = await window.workbenchApi.selectOutDir();
    if (dir) {
      outDirInput.value = dir;
      AppState.project.capturePreset.outDir = dir;
    }
  });

  // 옵션 동기화
  waitMsInput.addEventListener("input", (e) => {
    AppState.project.capturePreset.waitMs = parseInt(e.target.value, 10) || 2000;
    updateCapturePanel();
  });
  depthInput.addEventListener("input", (e) => {
    const depth = parseCaptureDepth(e.target.value);
    AppState.project.capturePreset.depth = depth;
    e.target.value = depth;
    updateCapturePanel();
  });
  headlessInput.addEventListener("change", (e) => {
    AppState.project.capturePreset.headless = e.target.checked;
  });
  dedupeInput.addEventListener("change", (e) => {
    AppState.project.capturePreset.dedupe = e.target.checked;
  });
  sheetInput.addEventListener("input", (e) => {
    AppState.project.capturePreset.sheet = e.target.value.trim();
  });
  colUrlInput.addEventListener("input", (e) => {
    AppState.project.capturePreset.colUrl = e.target.value.trim();
  });

  // 드롭존
  ["dragenter", "dragover", "dragleave", "drop"].forEach((evt) => {
    dropzone.addEventListener(evt, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.toggle("dragover", evt === "dragenter" || evt === "dragover");
    });
  });
  dropzone.addEventListener("drop", async (e) => {
    e.preventDefault();
    dropzone.classList.remove("dragover");
    const files = Array.from(e.dataTransfer.files)
      .map((f) => window.workbenchApi.getFilePath(f))
      .filter(Boolean);
    if (files.length > 0) {
      filePathsInput.value = files.join(", ");
      AppState.project.capturePreset.filePaths = files;
    }
  });
}

function updateCapturePanel() {
  const { viewport, captureScope, waitMs, aspectMode, depth } = AppState.project.capturePreset;
  const vEl = document.getElementById("info-viewport");
  const sEl = document.getElementById("info-scope");
  const wEl = document.getElementById("info-wait");
  const aEl = document.getElementById("info-aspect");
  const dEl = document.getElementById("info-depth");
  if (vEl) vEl.textContent = `${viewport.width}x${viewport.height}`;
  if (sEl) sEl.textContent = captureScope;
  if (wEl) wEl.textContent = `${waitMs}ms`;
  if (aEl) aEl.textContent = aspectMode;
  if (dEl) dEl.textContent = String(parseCaptureDepth(depth));
}

/** 캡처 화면 진입 시 상태를 폼에 반영 */
function syncCaptureFormFromState() {
  const preset = AppState.project.capturePreset;
  preset.depth = parseCaptureDepth(preset.depth);
  const singleUrlInput = document.getElementById("single-url");
  const filePathsInput = document.getElementById("file-paths");
  const waitMsInput = document.getElementById("wait-ms");
  const depthInput = document.getElementById("depth");
  const headlessInput = document.getElementById("headless");
  const dedupeInput = document.getElementById("dedupe");
  const outDirInput = document.getElementById("out-dir");
  const sheetInput = document.getElementById("sheet");
  const colUrlInput = document.getElementById("col-url");
  const selectorInput = document.getElementById("capture-selector");

  if (singleUrlInput) singleUrlInput.value = preset.singleUrl || "";
  if (filePathsInput) filePathsInput.value = (preset.filePaths || []).join(", ");
  if (waitMsInput) waitMsInput.value = preset.waitMs;
  if (depthInput) depthInput.value = parseCaptureDepth(preset.depth);
  if (headlessInput) headlessInput.checked = preset.headless;
  if (dedupeInput) dedupeInput.checked = preset.dedupe;
  if (outDirInput) outDirInput.value = preset.outDir || "";
  if (sheetInput) sheetInput.value = preset.sheet || "";
  if (colUrlInput) colUrlInput.value = preset.colUrl || "";
  if (selectorInput) selectorInput.value = preset.captureSelector || "";

  document.querySelectorAll(".btn-preset").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.preset === preset.viewportPreset);
  });
  document.getElementById("custom-viewport-group").classList.toggle("hidden", preset.viewportPreset !== "custom");
  document.getElementById("viewport-width").value = preset.viewport.width;
  document.getElementById("viewport-height").value = preset.viewport.height;
  updateCaptureAspectButtons();

  const scopeRadio = document.querySelector(`[name='capture-scope'][value='${preset.captureScope}']`);
  if (scopeRadio) scopeRadio.checked = true;
  document.getElementById("capture-selector-group").classList.toggle("hidden", preset.captureScope !== "selector");

  const srcSingle = document.getElementById("src-single");
  const srcFile = document.getElementById("src-file");
  if (preset.sourceType === "file") {
    if (srcFile) srcFile.checked = true;
    document.getElementById("single-url-group").classList.add("hidden");
    document.getElementById("file-group").classList.remove("hidden");
  } else {
    if (srcSingle) srcSingle.checked = true;
    document.getElementById("single-url-group").classList.remove("hidden");
    document.getElementById("file-group").classList.add("hidden");
  }

  updateCapturePanel();
}

/** 현재 캡처 설정으로 실행 인자 배열을 생성 */
function buildCaptureArgs() {
  const preset = AppState.project.capturePreset;
  const args = [];

  if (preset.sourceType === "single") {
    if (!preset.singleUrl) throw new Error("URL을 입력해주세요.");
    args.push("--singleUrl", preset.singleUrl);
  } else {
    if (!preset.filePaths || preset.filePaths.length === 0) throw new Error("파일을 선택해주세요.");
    args.push("--files", preset.filePaths.join(","));
    if (preset.sheet) args.push("--sheet", preset.sheet);
    if (preset.colUrl) args.push("--colUrl", preset.colUrl);
  }

  if (preset.outDir) args.push("--out", preset.outDir);
  args.push("--wait", String(preset.waitMs));
  args.push("--depth", String(parseCaptureDepth(preset.depth)));
  args.push("--viewportPreset", preset.viewportPreset);
  args.push("--viewportWidth", String(preset.viewport.width));
  args.push("--viewportHeight", String(preset.viewport.height));
  args.push("--captureScope", preset.captureScope);
  if (preset.captureScope === "selector" && preset.captureSelector) {
    args.push("--captureSelector", preset.captureSelector);
  }
  if (!preset.headless) args.push("--headless", "false");
  if (!preset.dedupe) args.push("--dedupe", "false");

  return args;
}

window.initCaptureScreen = initCaptureScreen;
window.syncCaptureFormFromState = syncCaptureFormFromState;
window.buildCaptureArgs = buildCaptureArgs;
window.updateCapturePanel = updateCapturePanel;
window.parseCaptureDepth = parseCaptureDepth;
