/**
 * 프로젝트 홈 화면과 모달 처리를 담당한다.
 */

function initProjectScreen() {
  const btnNewProject = document.getElementById("btn-new-project");
  const btnOpenProject = document.getElementById("btn-open-project");
  const btnSaveProject = document.getElementById("btn-save-project");

  // 새 프로젝트 모달 열기
  if (btnNewProject) {
    btnNewProject.addEventListener("click", () => {
      document.getElementById("modal-new-project").classList.remove("hidden");
      document.getElementById("modal-project-name").focus();
    });
  }

  // 프로젝트 열기
  if (btnOpenProject) {
    btnOpenProject.addEventListener("click", async () => {
      const filePath = await window.workbenchApi.selectProjectFile();
      if (!filePath) return;
      const res = await window.workbenchApi.loadProject(filePath);
      if (res && res.error) {
        appendLog("error", res.error);
      } else if (res) {
        applyProjectToState(res, filePath);
        appendLog("app", `프로젝트 열기: ${res.name}`);
      }
    });
  }

  // 프로젝트 저장
  if (btnSaveProject) {
    btnSaveProject.addEventListener("click", saveCurrentProject);
  }

  // 새 프로젝트 모달
  document.getElementById("modal-cancel-project").addEventListener("click", () => {
    document.getElementById("modal-new-project").classList.add("hidden");
  });

  document.getElementById("modal-create-project").addEventListener("click", async () => {
    const name = (document.getElementById("modal-project-name").value || "").trim() || "새 프로젝트";
    const outDir = (document.getElementById("modal-project-out").value || "").trim();
    const viewportPreset = document.getElementById("modal-viewport-preset").value;

    AppState.project.id = null;
    AppState.project.name = name;
    AppState.project.filePath = null;
    AppState.project.capturePreset.viewportPreset = viewportPreset;
    const vp = getViewportByPreset(viewportPreset);
    AppState.project.capturePreset.viewport = { width: vp.width, height: vp.height };
    if (outDir) AppState.project.capturePreset.outDir = outDir;
    AppState.project.domRules = [];
    AppState.project.editRules = [];
    AppState.project.exportProfiles = [];
    AppState.project.sources = [];
    AppState.captureResults = [];

    document.getElementById("modal-new-project").classList.add("hidden");
    document.getElementById("project-name").textContent = name;
    document.getElementById("project-name-input").value = name;

    renderDomRuleList();
    renderCaptureResultList();
    renderThumbStrip();
    appendLog("app", `새 프로젝트 생성: ${name}`);
  });

  // 레시피 저장 모달
  document.getElementById("modal-cancel-recipe").addEventListener("click", () => {
    document.getElementById("modal-save-recipe").classList.add("hidden");
  });

  document.getElementById("modal-save-recipe-confirm").addEventListener("click", async () => {
    const name = (document.getElementById("modal-recipe-name").value || "").trim() || "레시피";
    const includeDom = document.getElementById("recipe-include-dom").checked;
    const includeEdit = document.getElementById("recipe-include-edit").checked;
    const includeExport = document.getElementById("recipe-include-export").checked;

    const recipe = {
      name,
      domRules: includeDom ? AppState.project.domRules : [],
      editRules: includeEdit ? AppState.project.editRules : [],
      exportProfiles: includeExport ? AppState.project.exportProfiles : []
    };

    const filePath = await window.workbenchApi.saveRecipeDialog(recipe);
    if (filePath) {
      appendLog("app", `레시피 저장 완료: ${filePath}`);
    }
    document.getElementById("modal-save-recipe").classList.add("hidden");
  });

  // 프로젝트 이름 입력 실시간 반영
  const nameInput = document.getElementById("project-name-input");
  if (nameInput) {
    nameInput.addEventListener("input", (e) => {
      AppState.project.name = e.target.value || "새 프로젝트";
      document.getElementById("project-name").textContent = AppState.project.name;
    });
  }

  // 모달 피커 버튼
  document.getElementById("modal-pick-out").addEventListener("click", async () => {
    const dir = await window.workbenchApi.selectOutDir();
    if (dir) document.getElementById("modal-project-out").value = dir;
  });

  renderRecentProjects();
}

async function saveCurrentProject() {
  const project = buildProjectPayload();
  const filePath = await window.workbenchApi.saveProject(project, AppState.project.filePath);
  if (filePath) {
    AppState.project.filePath = filePath;
    appendLog("app", `프로젝트 저장 완료: ${filePath}`);
  }
}

function buildProjectPayload() {
  return {
    id: AppState.project.id,
    name: AppState.project.name,
    capturePreset: AppState.project.capturePreset,
    domRules: AppState.project.domRules,
    editRules: AppState.project.editRules,
    exportProfiles: AppState.project.exportProfiles,
    sources: AppState.project.sources,
    captureResults: AppState.captureResults
  };
}

function applyProjectToState(data, filePath) {
  AppState.project.id = data.id;
  AppState.project.name = data.name || "프로젝트";
  AppState.project.filePath = filePath;
  AppState.project.domRules = data.domRules || [];
  AppState.project.editRules = data.editRules || [];
  AppState.project.exportProfiles = data.exportProfiles || [];
  AppState.project.sources = data.sources || [];

  if (data.capturePreset) {
    Object.assign(AppState.project.capturePreset, data.capturePreset);
  }

  AppState.captureResults = data.captureResults || [];

  document.getElementById("project-name").textContent = AppState.project.name;
  document.getElementById("project-name-input").value = AppState.project.name;

  renderDomRuleList();
  renderCaptureResultList();
  renderThumbStrip();
  syncCaptureFormFromState();
}

function renderRecentProjects() {
  const container = document.getElementById("recent-list");
  if (!container) return;
  const recents = AppState.recentProjects || [];

  if (recents.length === 0) {
    container.innerHTML = '<p class="empty-hint">최근 열었던 프로젝트가 없습니다.</p>';
    return;
  }

  container.innerHTML = "";
  recents.slice(0, 8).forEach((item) => {
    const card = document.createElement("div");
    card.className = "recent-card";
    card.innerHTML = `
      <div class="recent-card-name">${item.name}</div>
      <div class="recent-card-meta">${item.filePath} · ${item.updatedAt ? item.updatedAt.slice(0, 10) : ""}</div>
    `;
    card.addEventListener("click", async () => {
      const res = await window.workbenchApi.loadProject(item.filePath);
      if (res && !res.error) applyProjectToState(res, item.filePath);
    });
    container.appendChild(card);
  });
}

window.initProjectScreen = initProjectScreen;
window.saveCurrentProject = saveCurrentProject;
window.applyProjectToState = applyProjectToState;
window.renderRecentProjects = renderRecentProjects;
