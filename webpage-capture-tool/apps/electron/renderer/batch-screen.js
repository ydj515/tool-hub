/**
 * 배치 작업 화면 초기화와 캡처 결과 목록 렌더링을 담당한다.
 */

function initBatchScreen() {
  const btnSelectAll = document.getElementById("batch-select-all");
  const btnSelectFailed = document.getElementById("btn-select-failed");
  const btnApplyBatch = document.getElementById("btn-apply-batch");
  const btnSaveRecipe = document.getElementById("btn-save-recipe");
  const btnLoadRecipe = document.getElementById("btn-load-recipe");

  if (btnSelectAll) {
    btnSelectAll.addEventListener("change", (e) => {
      document.querySelectorAll(".result-check").forEach((cb) => {
        cb.checked = e.target.checked;
      });
    });
  }

  if (btnSelectFailed) {
    btnSelectFailed.addEventListener("click", () => {
      document.querySelectorAll(".result-check").forEach((cb) => {
        const item = cb.closest(".result-item");
        cb.checked = item && item.classList.contains("failed");
      });
      if (btnSelectAll) btnSelectAll.checked = false;
    });
  }

  if (btnApplyBatch) {
    btnApplyBatch.addEventListener("click", applyBatchRules);
  }

  if (btnSaveRecipe) {
    btnSaveRecipe.addEventListener("click", () => {
      document.getElementById("modal-save-recipe").classList.remove("hidden");
    });
  }

  if (btnLoadRecipe) {
    btnLoadRecipe.addEventListener("click", async () => {
      const filePath = await window.workbenchApi.selectRecipeFile();
      if (!filePath) return;
      const res = await window.workbenchApi.loadRecipe(filePath);
      if (res && res.error) {
        appendLog("error", res.error);
      } else if (res) {
        // 레시피 병합
        const incoming = res;
        if (Array.isArray(incoming.domRules)) {
          incoming.domRules.forEach((r) => {
            if (!AppState.project.domRules.find((x) => x.id === r.id)) {
              AppState.project.domRules.push(r);
            }
          });
        }
        if (Array.isArray(incoming.editRules)) {
          AppState.project.editRules = incoming.editRules.map((r) => ({ ...r }));
        }
        if (Array.isArray(incoming.exportProfiles) && incoming.exportProfiles.length > 0) {
          AppState.project.exportProfiles = incoming.exportProfiles;
          applyProjectExportProfiles(incoming.exportProfiles);
        }
        renderDomRuleList();
        renderRecipeSummary();
        updateExportPreview();
        appendLog("app", `레시피 불러오기 완료: ${incoming.name || "레시피"}`);
      }
    });
  }
}

async function applyBatchRules() {
  const checked = Array.from(document.querySelectorAll(".result-check"))
    .filter((cb) => cb.checked)
    .map((cb) => parseInt(cb.dataset.idx, 10));

  if (checked.length === 0) {
    appendLog("warn", "적용할 항목을 선택하세요.");
    return;
  }

  const rules = AppState.project.editRules;
  if (!rules || rules.length === 0) {
    appendLog("warn", "적용할 이미지 편집 규칙이 없습니다. 이미지 편집 화면에서 먼저 편집을 적용하세요.");
    return;
  }

  for (const idx of checked) {
    const result = AppState.captureResults[idx];
    if (!result || !result.filePath) continue;
    try {
      const recipeRules = rules.map((rule) => {
        const next = { ...rule };
        delete next.sourceIndex;
        return next;
      });

      await window.workbenchApi.processImage({
        inputPath: result.filePath,
        outputPath: result.filePath,
        rules: recipeRules
      });
      result.appliedRules = recipeRules;
      appendLog("app", `[${idx + 1}] 배치 적용 완료: ${result.baseName}`);
    } catch (e) {
      appendLog("error", `[${idx + 1}] 배치 적용 실패: ${e.message || e}`);
    }
  }
}

function renderCaptureResultList() {
  const container = document.getElementById("capture-result-list");
  if (!container) return;
  container.innerHTML = "";

  if (!AppState.captureResults || AppState.captureResults.length === 0) {
    container.innerHTML = '<p class="empty-hint">캡처 결과가 없습니다. 먼저 캡처를 실행하세요.</p>';
    return;
  }

  AppState.captureResults.forEach((result, idx) => {
    const item = document.createElement("div");
    item.className = `result-item${result.status === "failed" ? " failed" : ""}`;
    const categoryLabel = result.errorCategory === "navigation"
      ? "네비게이션 실패"
      : result.errorCategory === "capture"
        ? "캡처 실패"
        : "실패";

    item.innerHTML = `
      <input type="checkbox" class="result-check" data-idx="${idx}" />
      <span class="result-status ${result.status === "ok" ? "ok" : "failed"}">${result.status === "ok" ? "OK" : "!"}</span>
      <span class="result-name" title="${result.url || ""}">${result.baseName || result.url || `항목 ${idx + 1}`}</span>
      ${result.status === "failed" ? `<span class="hint" style="color:var(--danger);font-size:11px;">${categoryLabel}: ${result.error || "실패"}</span>` : ""}
    `;

    container.appendChild(item);
  });

  renderRecipeSummary();
}

function renderRecipeSummary() {
  const container = document.getElementById("recipe-summary");
  if (!container) return;
  const domRules = AppState.project.domRules;
  const editRules = AppState.project.editRules;

  if (domRules.length === 0 && editRules.length === 0) {
    container.innerHTML = '<p class="empty-hint">적용할 레시피가 없습니다.</p>';
    return;
  }

  const blurCount = editRules.filter((r) => r.type === "blur").length;
  const boxCount = editRules.filter((r) => r.type === "box").length;
  const cropCount = editRules.filter((r) => r.type === "crop").length;
  const resizeCount = editRules.filter((r) => r.type === "resize").length;

  container.innerHTML = `
    <div class="recipe-summary-item"><span>replace:</span><span>${domRules.filter((r) => r.type === "replaceText").length}개</span></div>
    <div class="recipe-summary-item"><span>hide:</span><span>${domRules.filter((r) => r.type === "hide").length}개</span></div>
    <div class="recipe-summary-item"><span>blur:</span><span>${blurCount}개</span></div>
    <div class="recipe-summary-item"><span>box:</span><span>${boxCount}개</span></div>
    <div class="recipe-summary-item"><span>crop:</span><span>${cropCount}개</span></div>
    <div class="recipe-summary-item"><span>resize:</span><span>${resizeCount}개</span></div>
  `;
}

window.initBatchScreen = initBatchScreen;
window.renderCaptureResultList = renderCaptureResultList;
window.renderRecipeSummary = renderRecipeSummary;
