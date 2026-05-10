/**
 * DOM 편집 화면 초기화와 규칙 목록 렌더링을 담당한다.
 */

function initDomScreen() {
  const btnAddRule = document.getElementById("btn-add-dom-rule");
  const btnAddConfirm = document.getElementById("btn-add-rule-confirm");
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

  // Enter 키로도 추가
  document.getElementById("new-rule-value").addEventListener("keydown", (e) => {
    if (e.key === "Enter") addDomRule();
  });
  document.getElementById("new-rule-selector").addEventListener("keydown", (e) => {
    if (e.key === "Enter" && ruleTypeSelect.value === "hide") addDomRule();
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
window.addDomRule = addDomRule;
window.deleteDomRule = deleteDomRule;
