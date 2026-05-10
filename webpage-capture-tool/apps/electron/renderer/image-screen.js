/**
 * 이미지 편집 화면 초기화와 Canvas 기반 편집 인터랙션을 담당한다.
 *
 * 좌표계: 캔버스에서의 드래그 좌표는 displayPx 기준이며,
 * 저장 시 rawImagePx로 변환해 editRules에 기록한다.
 *
 * 줌/패닝:
 *  - 기본 displayScale = 1.0 (원본 크기), .canvas-area overflow:auto 로 스크롤
 *  - Ctrl+휠 또는 트랙패드 핀치 → 마우스 위치 기준 줌
 *  - "이동" 도구 선택 후 드래그 → 컨테이너 스크롤(패닝)
 *  - 두 손가락 스크롤 → 컨테이너 자연 스크롤(패닝)
 */

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 5.0;
const ZOOM_STEP = 0.15;
const CROP_ASPECTS = {
  free: null,
  "16:9": 16 / 9,
  "4:3": 4 / 3
};

let canvas, ctx, displayScale;
let isDragging = false;
let dragStartX, dragStartY;

// 패닝 상태
let isPanning = false;
let panStartX, panStartY, panScrollLeft, panScrollTop;

let currentImageEl = null;

// undo/redo 히스토리 (pendingRules 스냅샷 배열)
let undoStack = [];
let redoStack = [];

function initImageScreen() {
  canvas = document.getElementById("edit-canvas");
  ctx = canvas ? canvas.getContext("2d") : null;

  // 도구 버튼 전환
  document.querySelectorAll(".tool-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tool-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      AppState.imageEdit.currentTool = btn.dataset.tool;
      updateToolProps();
      updateCanvasCursor();
    });
  });

  // 편집 초기화
  const btnClear = document.getElementById("btn-clear-edit");
  if (btnClear) {
    btnClear.addEventListener("click", () => {
      if (AppState.imageEdit.pendingRules.length === 0) return;
      pushHistory();
      AppState.imageEdit.pendingRules = [];
      AppState.imageEdit.selectionRect = null;
      renderEditRuleList();
      redrawCanvas();
    });
  }

  // undo / redo 버튼
  const btnUndo = document.getElementById("btn-undo");
  const btnRedo = document.getElementById("btn-redo");
  if (btnUndo) btnUndo.addEventListener("click", undoEdit);
  if (btnRedo) btnRedo.addEventListener("click", redoEdit);

  // 키보드 단축키: ⌘Z / ⌘⇧Z (Mac) or Ctrl+Z / Ctrl+Shift+Z (Windows/Linux)
  document.addEventListener("keydown", (e) => {
    if (AppState.currentScreen !== "image") return;
    const mod = navigator.platform.toUpperCase().includes("MAC") ? e.metaKey : e.ctrlKey;
    if (!mod) return;
    if (e.key === "z" && !e.shiftKey) { e.preventDefault(); undoEdit(); }
    else if (e.key === "z" && e.shiftKey) { e.preventDefault(); redoEdit(); }
    else if (e.key === "y") { e.preventDefault(); redoEdit(); }
  });

  // 편집 적용
  const btnApply = document.getElementById("btn-apply-edit");
  if (btnApply) btnApply.addEventListener("click", applyImageEdits);

  document.querySelectorAll(".btn-crop-aspect").forEach((btn) => {
    btn.addEventListener("click", () => {
      AppState.imageEdit.cropAspectMode = btn.dataset.cropAspect;
      updateCropAspectButtons();
    });
  });

  // PNG 저장 (다른 이름으로 저장)
  const btnSaveImageAs = document.getElementById("btn-save-image-as");
  if (btnSaveImageAs) btnSaveImageAs.addEventListener("click", saveImageAs);

  // 줌 버튼
  const btnZoomIn = document.getElementById("btn-zoom-in");
  const btnZoomOut = document.getElementById("btn-zoom-out");
  const btnZoomFit = document.getElementById("btn-zoom-fit");

  if (btnZoomIn) {
    btnZoomIn.addEventListener("click", () => {
      displayScale = Math.min(MAX_ZOOM, (displayScale || 1) + ZOOM_STEP);
      applyZoom();
    });
  }
  if (btnZoomOut) {
    btnZoomOut.addEventListener("click", () => {
      displayScale = Math.max(MIN_ZOOM, (displayScale || 1) - ZOOM_STEP);
      applyZoom();
    });
  }
  if (btnZoomFit) {
    btnZoomFit.addEventListener("click", fitToWindow);
  }

  // Canvas 드래그 이벤트
  if (canvas) {
    canvas.addEventListener("mousedown", onCanvasMouseDown);
    canvas.addEventListener("mousemove", onCanvasMouseMove);
    canvas.addEventListener("mouseup", onCanvasMouseUp);
    canvas.addEventListener("mouseleave", onCanvasMouseUp);
  }

  // Ctrl+휠 줌 (트랙패드 핀치 포함) — canvas-area 전체에서 감지
  const canvasArea = document.querySelector(".canvas-area");
  if (canvasArea) {
    canvasArea.addEventListener("wheel", (e) => {
      if (!e.ctrlKey) return;
      e.preventDefault();

      const areaRect = canvasArea.getBoundingClientRect();
      const pivot = {
        x: e.clientX - areaRect.left,
        y: e.clientY - areaRect.top
      };

      const delta = e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP;
      displayScale = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, (displayScale || 1) + delta));
      applyZoom(pivot);
    }, { passive: false });
  }

  updateCropAspectButtons();
}

// ============================================================
// Undo / Redo
// ============================================================
//
// 히스토리 엔트리: { rules: [...], fileOp: boolean }
//   rules   — 이 시점의 pendingRules 스냅샷
//   fileOp  — true이면 undo/redo 시 파일도 함께 복원
//
// 파일 버퍼 자체는 main 프로세스(image:snapshot-for-undo 등)에서 관리한다.
// renderer는 스택의 fileOp 플래그만 보고 IPC를 호출한다.

function pushHistory(fileOp = false) {
  undoStack.push({
    rules: JSON.parse(JSON.stringify(AppState.imageEdit.pendingRules)),
    fileOp
  });
  redoStack = [];
  updateHistoryButtons();
}

function getCurrentFilePath() {
  const idx = AppState.imageEdit.currentIndex;
  return AppState.captureResults[idx]?.filePath || null;
}

async function undoEdit() {
  if (undoStack.length === 0) return;
  const entry = undoStack.pop();

  // 현재 상태를 redo 스택에 보관
  redoStack.push({
    rules: JSON.parse(JSON.stringify(AppState.imageEdit.pendingRules)),
    fileOp: entry.fileOp
  });

  AppState.imageEdit.pendingRules = entry.rules;
  AppState.imageEdit.selectionRect = null;

  if (entry.fileOp) {
    const fp = getCurrentFilePath();
    if (fp) {
      await window.workbenchApi.undoFile(fp);
      loadImageIntoCanvas(fp, false); // 히스토리 유지하며 리로드
      updateHistoryButtons();
      return; // loadImageIntoCanvas 내부에서 renderEditRuleList 호출 안 하므로 별도 호출
    }
  }

  renderEditRuleList();
  redrawCanvas();
  updateHistoryButtons();
}

async function redoEdit() {
  if (redoStack.length === 0) return;
  const entry = redoStack.pop();

  // 현재 상태를 undo 스택에 보관
  undoStack.push({
    rules: JSON.parse(JSON.stringify(AppState.imageEdit.pendingRules)),
    fileOp: entry.fileOp
  });

  AppState.imageEdit.pendingRules = entry.rules;
  AppState.imageEdit.selectionRect = null;

  if (entry.fileOp) {
    const fp = getCurrentFilePath();
    if (fp) {
      await window.workbenchApi.redoFile(fp);
      loadImageIntoCanvas(fp, false);
      updateHistoryButtons();
      return;
    }
  }

  renderEditRuleList();
  redrawCanvas();
  updateHistoryButtons();
}

function updateHistoryButtons() {
  const btnUndo = document.getElementById("btn-undo");
  const btnRedo = document.getElementById("btn-redo");
  if (btnUndo) btnUndo.disabled = undoStack.length === 0;
  if (btnRedo) btnRedo.disabled = redoStack.length === 0;
}

function updateCanvasCursor() {
  if (!canvas) return;
  const tool = AppState.imageEdit.currentTool;
  canvas.style.cursor = tool === "pan" ? "grab" : "crosshair";
}

function updateToolProps() {
  const tool = AppState.imageEdit.currentTool;
  document.querySelectorAll(".tool-props").forEach((el) => el.classList.add("hidden"));
  const targetEl = document.getElementById(`tool-props-${tool}`);
  if (targetEl) targetEl.classList.remove("hidden");
}

function updateCropAspectButtons() {
  const mode = AppState.imageEdit.cropAspectMode || "free";
  document.querySelectorAll(".btn-crop-aspect").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.cropAspect === mode);
  });
}

function getCropAspectRatio() {
  const mode = AppState.imageEdit.cropAspectMode || "free";
  if (mode === "original") {
    if (!currentImageEl || !currentImageEl.naturalWidth || !currentImageEl.naturalHeight) return null;
    return currentImageEl.naturalWidth / currentImageEl.naturalHeight;
  }
  return CROP_ASPECTS[mode] || null;
}

// ============================================================
// 줌
// ============================================================

/**
 * displayScale 기준으로 캔버스를 리사이즈하고 다시 그린다.
 * pivot이 있으면 그 화면 좌표가 줌 전후에 같은 자리를 유지하도록 스크롤을 보정한다.
 */
function applyZoom(pivot) {
  const img = currentImageEl;
  if (!img || !canvas) return;

  const canvasArea = document.querySelector(".canvas-area");
  let ratioX = 0.5, ratioY = 0.5;

  if (pivot && canvasArea && canvas.width > 0) {
    ratioX = (canvasArea.scrollLeft + pivot.x) / canvas.width;
    ratioY = (canvasArea.scrollTop + pivot.y) / canvas.height;
  }

  canvas.width = Math.round(img.naturalWidth * displayScale);
  canvas.height = Math.round(img.naturalHeight * displayScale);

  if (pivot && canvasArea) {
    canvasArea.scrollLeft = ratioX * canvas.width - pivot.x;
    canvasArea.scrollTop = ratioY * canvas.height - pivot.y;
  }

  redrawCanvas();
  updateZoomLabel();
}

function updateZoomLabel() {
  const el = document.getElementById("zoom-level");
  if (el) el.textContent = `${Math.round((displayScale || 1) * 100)}%`;
}

function fitToWindow() {
  const img = currentImageEl;
  if (!img) return;
  const canvasArea = document.querySelector(".canvas-area");
  const maxW = (canvasArea ? canvasArea.clientWidth : 800) - 40;
  const maxH = (canvasArea ? canvasArea.clientHeight : 600) - 40;
  displayScale = Math.min(maxW / img.naturalWidth, maxH / img.naturalHeight);
  applyZoom();
  // 맞춤 후 중앙 정렬
  if (canvasArea) {
    canvasArea.scrollLeft = Math.max(0, (canvas.width - canvasArea.clientWidth) / 2);
    canvasArea.scrollTop = 0;
  }
}

// ============================================================
// 마우스 이벤트
// ============================================================

function onCanvasMouseDown(e) {
  if (!ctx) return;
  const tool = AppState.imageEdit.currentTool;

  if (tool === "pan") {
    isPanning = true;
    panStartX = e.clientX;
    panStartY = e.clientY;
    const canvasArea = document.querySelector(".canvas-area");
    panScrollLeft = canvasArea ? canvasArea.scrollLeft : 0;
    panScrollTop = canvasArea ? canvasArea.scrollTop : 0;
    canvas.style.cursor = "grabbing";
    return;
  }

  isDragging = true;
  const rect = canvas.getBoundingClientRect();
  dragStartX = e.clientX - rect.left;
  dragStartY = e.clientY - rect.top;
  AppState.imageEdit.startX = dragStartX;
  AppState.imageEdit.startY = dragStartY;
  AppState.imageEdit.selectionRect = null;
}

function onCanvasMouseMove(e) {
  if (isPanning) {
    const canvasArea = document.querySelector(".canvas-area");
    if (!canvasArea) return;
    canvasArea.scrollLeft = panScrollLeft - (e.clientX - panStartX);
    canvasArea.scrollTop = panScrollTop - (e.clientY - panStartY);
    return;
  }

  if (!isDragging || !ctx) return;
  const rect = canvas.getBoundingClientRect();
  let currentX = e.clientX - rect.left;
  let currentY = e.clientY - rect.top;

  if (AppState.imageEdit.currentTool === "crop") {
    const ratio = getCropAspectRatio();
    if (ratio) {
      const dx = currentX - dragStartX;
      const dy = currentY - dragStartY;
      const signX = dx >= 0 ? 1 : -1;
      const signY = dy >= 0 ? 1 : -1;
      let absDx = Math.abs(dx);
      let absDy = Math.abs(dy);

      if (absDy === 0) {
        absDy = Math.max(1, Math.round(absDx / ratio));
      } else if (absDx / ratio > absDy) {
        absDy = Math.max(1, Math.round(absDx / ratio));
      } else {
        absDx = Math.max(1, Math.round(absDy * ratio));
      }

      currentX = dragStartX + signX * absDx;
      currentY = dragStartY + signY * absDy;
    }
  }

  const x = Math.min(dragStartX, currentX);
  const y = Math.min(dragStartY, currentY);
  const w = Math.abs(currentX - dragStartX);
  const h = Math.abs(currentY - dragStartY);

  AppState.imageEdit.selectionRect = { x, y, width: w, height: h };
  redrawCanvas();

  ctx.strokeStyle = "#2563eb";
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 3]);
  ctx.strokeRect(x, y, w, h);
  ctx.fillStyle = "rgba(37,99,235,0.1)";
  ctx.fillRect(x, y, w, h);
  ctx.setLineDash([]);
}

function onCanvasMouseUp() {
  if (isPanning) {
    isPanning = false;
    canvas.style.cursor = "grab";
    return;
  }

  if (!isDragging) return;
  isDragging = false;

  const sel = AppState.imageEdit.selectionRect;
  if (!sel || sel.width < 5 || sel.height < 5) {
    AppState.imageEdit.selectionRect = null;
    return;
  }

  const scale = displayScale || 1;
  const rawRule = {
    id: generateRuleId(),
    type: AppState.imageEdit.currentTool,
    x: Math.round(sel.x / scale),
    y: Math.round(sel.y / scale),
    width: Math.round(sel.width / scale),
    height: Math.round(sel.height / scale)
  };

  const tool = AppState.imageEdit.currentTool;
  if (tool === "blur") {
    rawRule.sigma = parseInt(document.getElementById("blur-sigma").value, 10) || 10;
  } else if (tool === "box") {
    rawRule.color = document.getElementById("box-color").value || "#000000";
  } else if (tool === "crop") {
    AppState.imageEdit.pendingRules = AppState.imageEdit.pendingRules.filter((r) => r.type !== "crop");
  } else if (tool === "resize") {
    return;
  }

  pushHistory();
  AppState.imageEdit.pendingRules.push(rawRule);
  renderEditRuleList();
  redrawCanvas();
}

// ============================================================
// 캔버스 드로잉
// ============================================================

function redrawCanvas() {
  if (!ctx || !canvas) return;
  const img = getCurrentImage();
  if (!img) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  const scale = displayScale || 1;
  AppState.imageEdit.pendingRules.forEach((rule) => {
    const x = rule.x * scale;
    const y = rule.y * scale;
    const w = rule.width * scale;
    const h = rule.height * scale;

    if (rule.type === "blur") {
      ctx.fillStyle = "rgba(37,99,235,0.25)";
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = "#2563eb";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x, y, w, h);
      ctx.fillStyle = "#2563eb";
      ctx.font = "11px sans-serif";
      ctx.fillText(`blur(${rule.sigma})`, x + 4, y + 14);
    } else if (rule.type === "box") {
      ctx.fillStyle = rule.color || "#000000";
      ctx.fillRect(x, y, w, h);
    } else if (rule.type === "crop") {
      ctx.strokeStyle = "#22c55e";
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 4]);
      ctx.strokeRect(x, y, w, h);
      ctx.setLineDash([]);
    }
  });
}

// ============================================================
// 이미지 로드
// ============================================================

/**
 * @param {string} filePath
 * @param {boolean} [resetHistory=true] - false이면 undo/redo 스택을 유지한다
 */
function loadImageIntoCanvas(filePath, resetHistory = true) {
  if (!canvas || !ctx) return;

  const img = new Image();
  img.onload = () => {
    currentImageEl = img;
    displayScale = 1.0;
    if (resetHistory) {
      undoStack = [];
      redoStack = [];
      if (filePath) window.workbenchApi.clearFileHistory(filePath).catch(() => {});
    }
    updateHistoryButtons();
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    document.getElementById("canvas-placeholder").style.display = "none";
    canvas.style.display = "block";
    redrawCanvas();
    renderEditRuleList();
    updateZoomLabel();

    const canvasArea = document.querySelector(".canvas-area");
    if (canvasArea) {
      canvasArea.scrollLeft = Math.max(0, (canvas.width - canvasArea.clientWidth) / 2);
      canvasArea.scrollTop = 0;
    }
  };
  // Electron file:// URL 캐시 방지
  img.src = `file://${filePath}?t=${Date.now()}`;
}

function getCurrentImage() {
  return currentImageEl;
}

// ============================================================
// 편집 규칙 목록
// ============================================================

function renderEditRuleList() {
  const container = document.getElementById("edit-rule-list");
  if (!container) return;
  container.innerHTML = "";

  AppState.imageEdit.pendingRules.forEach((rule) => {
    const item = document.createElement("div");
    item.className = "edit-rule-mini-item";
    item.innerHTML = `
      <span>${rule.type} (${rule.x},${rule.y} ${rule.width}x${rule.height})</span>
      <button class="btn-icon" data-id="${rule.id}">삭제</button>
    `;
    item.querySelector(".btn-icon").addEventListener("click", () => {
      pushHistory();
      AppState.imageEdit.pendingRules = AppState.imageEdit.pendingRules.filter((r) => r.id !== rule.id);
      renderEditRuleList();
      redrawCanvas();
    });
    container.appendChild(item);
  });
}

// ============================================================
// 편집 적용
// ============================================================

async function applyImageEdits() {
  const idx = AppState.imageEdit.currentIndex;
  const result = AppState.captureResults[idx];
  if (!result || !result.filePath) {
    appendLog("warn", "편집할 이미지가 선택되지 않았습니다.");
    return;
  }

  const rules = AppState.imageEdit.pendingRules.map((rule) => ({ ...rule }));

  const resizeWidth = parseInt(document.getElementById("resize-width").value, 10);
  if (AppState.imageEdit.currentTool === "resize" && resizeWidth) {
    for (let i = rules.length - 1; i >= 0; i--) {
      if (rules[i].type === "resize") rules.splice(i, 1);
    }
    rules.push({ id: generateRuleId(), type: "resize", width: resizeWidth });
  }

  if (rules.length === 0) {
    appendLog("warn", "적용할 편집 규칙이 없습니다.");
    return;
  }

  try {
    appendLog("app", `이미지 편집 적용 중: ${result.filePath}`);

    // 적용 전 파일 상태를 main 프로세스에 스냅샷으로 저장 (fileOp undo용)
    const prevRules = JSON.parse(JSON.stringify(AppState.imageEdit.pendingRules));
    await window.workbenchApi.snapshotFileForUndo(result.filePath);

    const res = await window.workbenchApi.processImage({
      inputPath: result.filePath,
      outputPath: result.filePath,
      rules
    });

    if (res && res.error) {
      appendLog("error", res.error);
    } else {
      // 적용 성공 → 적용 직전 상태(rules + file)를 undo 스택에 push
      undoStack.push({ rules: prevRules, fileOp: true });
      redoStack = [];

      const reusableRules = rules.map((rule) => ({ ...rule }));
      AppState.project.editRules = reusableRules;
      result.appliedRules = reusableRules;
      AppState.imageEdit.pendingRules = [];
      loadImageIntoCanvas(result.filePath, false); // 히스토리 유지
      appendLog("app", `이미지 편집 완료: ${res.width}x${res.height}`);
      updateHistoryButtons();
      renderRecipeSummary();
    }
  } catch (e) {
    appendLog("error", e.message || String(e));
  }
}

// ============================================================
// PNG 저장 (Save As)
// ============================================================

async function saveImageAs() {
  const idx = AppState.imageEdit.currentIndex;
  const result = AppState.captureResults[idx];
  if (!result?.filePath) {
    appendLog("warn", "저장할 이미지가 선택되지 않았습니다.");
    return;
  }

  if (AppState.imageEdit.pendingRules.length > 0) {
    appendLog("warn", "미적용 편집 규칙이 있습니다. 편집 적용 후 저장하면 최신 편집이 반영됩니다.");
  }

  try {
    const savedPath = await window.workbenchApi.saveImageAs(result.filePath);
    if (!savedPath) return; // 취소
    if (savedPath.error) {
      appendLog("error", savedPath.error);
    } else {
      appendLog("app", `PNG 저장 완료: ${savedPath}`);
    }
  } catch (e) {
    appendLog("error", e.message || String(e));
  }
}

// ============================================================
// 썸네일 스트립
// ============================================================

function renderThumbStrip() {
  const strip = document.getElementById("thumb-strip");
  const emptyEl = document.getElementById("thumb-empty");
  if (!strip) return;

  strip.querySelectorAll(".thumb-item").forEach((el) => el.remove());

  if (!AppState.captureResults || AppState.captureResults.length === 0) {
    if (emptyEl) emptyEl.classList.remove("hidden");
    return;
  }
  if (emptyEl) emptyEl.classList.add("hidden");

  AppState.captureResults.forEach((result, idx) => {
    if (!result.filePath) return;
    const img = document.createElement("img");
    img.className = "thumb-item";
    img.src = `file://${result.filePath}?t=${Date.now()}`;
    img.title = result.baseName || `이미지 ${idx + 1}`;
    if (idx === AppState.imageEdit.currentIndex) img.classList.add("active");

    img.addEventListener("click", () => {
      AppState.imageEdit.currentIndex = idx;
      AppState.imageEdit.pendingRules = [];
      document.querySelectorAll(".thumb-item").forEach((t) => t.classList.remove("active"));
      img.classList.add("active");
      loadImageIntoCanvas(result.filePath);
      renderEditRuleList();
    });

    strip.appendChild(img);
  });

  if (AppState.imageEdit.currentIndex === -1 && AppState.captureResults.length > 0) {
    AppState.imageEdit.currentIndex = 0;
    const first = AppState.captureResults[0];
    if (first && first.filePath) loadImageIntoCanvas(first.filePath);
  }
}

window.initImageScreen = initImageScreen;
window.renderThumbStrip = renderThumbStrip;
window.updateToolProps = updateToolProps;
