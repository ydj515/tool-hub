/**
 * DOM 편집 화면 초기화와 규칙 목록 렌더링을 담당한다.
 */

function initDomScreen() {
  const btnAddRule = document.getElementById("btn-add-dom-rule");
  const btnAddConfirm = document.getElementById("btn-add-rule-confirm");
  const btnLoadDomPreview = document.getElementById("btn-load-dom-preview");
  const previewUrlInput = document.getElementById("dom-preview-url");
  const ruleTypeSelect = document.getElementById("new-rule-type");
  const ruleValueGroup = document.getElementById("new-rule-value-group");

  // 규칙 유형 변경 시 값 입력 필드 표시/숨김
  if (ruleTypeSelect) {
    ruleTypeSelect.addEventListener("change", () => {
      const isHide = ruleTypeSelect.value === "hide";
      if (ruleValueGroup) ruleValueGroup.classList.toggle("hidden", isHide);
    });
  }

  // 패널 열기 버튼 (규칙 추가 버튼)
  if (btnAddRule) {
    btnAddRule.addEventListener("click", () => {
      document.getElementById("panel-dom").classList.remove("hidden");
      document.getElementById("new-rule-selector").focus();
    });
  }

  // 규칙 추가 확인
  if (btnAddConfirm) {
    btnAddConfirm.addEventListener("click", addDomRule);
  }

  if (btnLoadDomPreview) {
    btnLoadDomPreview.addEventListener("click", loadDomPreview);
  }

  if (previewUrlInput) {
    previewUrlInput.addEventListener("input", (e) => {
      AppState.domPreview.url = e.target.value.trim();
    });
  }

  // Enter 키로도 추가
  document.getElementById("new-rule-value").addEventListener("keydown", (e) => {
    if (e.key === "Enter") addDomRule();
  });
  document.getElementById("new-rule-selector").addEventListener("keydown", (e) => {
    if (e.key === "Enter" && ruleTypeSelect.value === "hide") addDomRule();
  });
}

function getDefaultDomPreviewUrl() {
  const preset = AppState.project.capturePreset || {};
  if (preset.sourceType === "single" && preset.singleUrl) {
    return preset.singleUrl;
  }

  const firstResult = (AppState.captureResults || []).find((result) => result && result.url);
  return firstResult ? firstResult.url : "";
}

function syncDomPreviewUrlFromState() {
  const input = document.getElementById("dom-preview-url");
  if (!AppState.domPreview.url) {
    AppState.domPreview.url = getDefaultDomPreviewUrl();
  }
  if (input) {
    input.value = AppState.domPreview.url || "";
  }
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function loadDomPreview() {
  const input = document.getElementById("dom-preview-url");
  const url = ((input && input.value) || AppState.domPreview.url || "").trim();
  if (!url) {
    appendLog("warn", "DOM을 불러올 URL을 입력해주세요.");
    return;
  }

  AppState.domPreview.url = url;
  AppState.domPreview.isLoading = true;
  AppState.domPreview.candidates = [];
  AppState.domPreview.selectedSelector = "";
  renderDomPreview();

  try {
    const preset = AppState.project.capturePreset || {};
    const res = await window.workbenchApi.inspectDom({
      url,
      waitMs: preset.waitMs || 2000,
      viewport: preset.viewport || { width: 1440, height: 1024 },
      headless: preset.headless !== false,
      limit: 100
    });

    if (res && res.error) {
      appendLog("error", res.error);
      AppState.domPreview.candidates = [];
    } else {
      AppState.domPreview.candidates = (res && res.candidates) || [];
      appendLog("app", `DOM 후보 ${AppState.domPreview.candidates.length}개 로드: ${url}`);
    }
  } catch (e) {
    appendLog("error", e.message || String(e));
    AppState.domPreview.candidates = [];
  } finally {
    AppState.domPreview.isLoading = false;
    renderDomPreview();
  }
}

function selectDomCandidate(candidate) {
  AppState.domPreview.selectedSelector = candidate.selector;
  const selectorInput = document.getElementById("new-rule-selector");
  if (selectorInput) {
    selectorInput.value = candidate.selector;
    selectorInput.focus();
  }
  renderDomPreview();
}

function renderDomPreview() {
  syncDomPreviewUrlFromState();
  const container = document.getElementById("dom-candidate-list");
  if (!container) return;

  if (AppState.domPreview.isLoading) {
    container.innerHTML = '<p class="empty-hint">DOM을 불러오는 중입니다.</p>';
    return;
  }

  const candidates = AppState.domPreview.candidates || [];
  if (candidates.length === 0) {
    container.innerHTML = '<p class="empty-hint">URL을 불러오면 DOM 후보가 표시됩니다.</p>';
    return;
  }

  container.innerHTML = "";
  candidates.forEach((candidate) => {
    const item = document.createElement("button");
    item.type = "button";
    item.className = `dom-candidate-item${candidate.selector === AppState.domPreview.selectedSelector ? " active" : ""}`;
    const label = escapeHtml(candidate.label || candidate.tagName || "element");
    const tagName = escapeHtml(candidate.tagName || "");
    const selector = escapeHtml(candidate.selector);
    const text = escapeHtml(candidate.text || candidate.ariaLabel || "(텍스트 없음)");
    item.innerHTML = `
      <span class="dom-candidate-title">
        <span>${label}</span>
        <span class="dom-candidate-tag">${tagName}</span>
      </span>
      <span class="dom-candidate-selector" title="${selector}">${selector}</span>
      <span class="dom-candidate-text" title="${text}">${text}</span>
    `;
    item.addEventListener("click", () => selectDomCandidate(candidate));
    container.appendChild(item);
  });
}

function addDomRule() {
  const type = document.getElementById("new-rule-type").value;
  const selector = (document.getElementById("new-rule-selector").value || "").trim();
  const value = (document.getElementById("new-rule-value").value || "").trim();

  if (!selector) {
    appendLog("warn", "Selector를 입력해주세요.");
    return;
  }

  const rule = {
    id: generateRuleId(),
    type,
    selector,
    value: type === "hide" ? "" : value,
    enabled: true
  };

  AppState.project.domRules.push(rule);
  renderDomRuleList();

  // 입력 초기화
  document.getElementById("new-rule-selector").value = "";
  document.getElementById("new-rule-value").value = "";
}

function deleteDomRule(ruleId) {
  AppState.project.domRules = AppState.project.domRules.filter((r) => r.id !== ruleId);
  renderDomRuleList();
}

function toggleDomRule(ruleId) {
  const rule = AppState.project.domRules.find((r) => r.id === ruleId);
  if (rule) {
    rule.enabled = !rule.enabled;
    renderDomRuleList();
  }
}

function renderDomRuleList() {
  const container = document.getElementById("dom-rule-list");
  const emptyEl = document.getElementById("dom-rule-empty");
  const rules = AppState.project.domRules;

  // 기존 규칙 행만 제거
  container.querySelectorAll(".rule-row").forEach((el) => el.remove());

  if (rules.length === 0) {
    if (emptyEl) emptyEl.classList.remove("hidden");
    return;
  }
  if (emptyEl) emptyEl.classList.add("hidden");

  rules.forEach((rule) => {
    const row = document.createElement("div");
    row.className = `rule-row${rule.enabled ? "" : " disabled"}`;
    row.dataset.ruleId = rule.id;

    const typeBadgeClass = rule.type === "replaceText" ? "replace" : "hide";
    const typeLabel = rule.type === "replaceText" ? "replaceText" : "hide";

    row.innerHTML = `
      <span>
        <input type="checkbox" class="rule-toggle" ${rule.enabled ? "checked" : ""} />
      </span>
      <span><span class="rule-type-badge ${typeBadgeClass}">${typeLabel}</span></span>
      <span class="rule-selector" title="${rule.selector}">${rule.selector}</span>
      <span class="rule-value">${rule.value || "(없음)"}</span>
      <span class="rule-actions">
        <button class="btn-icon toggle" data-action="toggle" title="활성/비활성">
          ${rule.enabled ? "끄기" : "켜기"}
        </button>
        <button class="btn-icon" data-action="delete" title="삭제">삭제</button>
      </span>
    `;

    row.querySelector("[data-action='toggle']").addEventListener("click", () => toggleDomRule(rule.id));
    row.querySelector("[data-action='delete']").addEventListener("click", () => deleteDomRule(rule.id));
    row.querySelector(".rule-toggle").addEventListener("change", () => toggleDomRule(rule.id));

    container.appendChild(row);
  });
}

window.initDomScreen = initDomScreen;
window.renderDomRuleList = renderDomRuleList;
window.renderDomPreview = renderDomPreview;
window.addDomRule = addDomRule;
window.deleteDomRule = deleteDomRule;
