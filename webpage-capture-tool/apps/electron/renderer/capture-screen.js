/**
 * 캡처 화면 초기화와 이벤트 바인딩을 담당한다.
 */

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
      document.getElementById("custom-viewport-group").classList.toggle("hidden", preset !== "custom");
      document.getElementById("viewport-width").value = vp.width;
      document.getElementById("viewport-height").value = vp.height;
      updateCapturePanel();
    });
  });

  // 사용자 정의 뷰포트
  document.getElementById("viewport-width").addEventListener("input", (e) => {
    AppState.project.capturePreset.viewport.width = parseInt(e.target.value, 10) || 1280;
    updateCapturePanel();
  });
  document.getElementById("viewport-height").addEventListener("input", (e) => {
    AppState.project.capturePreset.viewport.height = parseInt(e.target.value, 10) || 800;
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
  const { viewport, captureScope, waitMs } = AppState.project.capturePreset;
  const vEl = document.getElementById("info-viewport");
  const sEl = document.getElementById("info-scope");
  const wEl = document.getElementById("info-wait");
  if (vEl) vEl.textContent = `${viewport.width}x${viewport.height}`;
  if (sEl) sEl.textContent = captureScope;
  if (wEl) wEl.textContent = `${waitMs}ms`;
}

/** 캡처 화면 진입 시 상태를 폼에 반영 */
function syncCaptureFormFromState() {
  const preset = AppState.project.capturePreset;
  const singleUrlInput = document.getElementById("single-url");
  const filePathsInput = document.getElementById("file-paths");
  const waitMsInput = document.getElementById("wait-ms");
  const headlessInput = document.getElementById("headless");
  const dedupeInput = document.getElementById("dedupe");
  const outDirInput = document.getElementById("out-dir");

  if (singleUrlInput) singleUrlInput.value = preset.singleUrl || "";
  if (filePathsInput) filePathsInput.value = (preset.filePaths || []).join(", ");
  if (waitMsInput) waitMsInput.value = preset.waitMs;
  if (headlessInput) headlessInput.checked = preset.headless;
  if (dedupeInput) dedupeInput.checked = preset.dedupe;
  if (outDirInput) outDirInput.value = preset.outDir || "";

  document.querySelectorAll(".btn-preset").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.preset === preset.viewportPreset);
  });
  document.getElementById("custom-viewport-group").classList.toggle("hidden", preset.viewportPreset !== "custom");
  document.getElementById("viewport-width").value = preset.viewport.width;
  document.getElementById("viewport-height").value = preset.viewport.height;

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
