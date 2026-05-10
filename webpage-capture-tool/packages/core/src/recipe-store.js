/**
 * 프로젝트/레시피 JSON의 저장, 불러오기, 마이그레이션을 담당한다.
 *
 * 저장 원칙:
 *   - 절대 경로를 직접 저장하지 않고 식별자(assetId, slug)만 기록한다.
 *   - 열기 시 마이그레이션, 저장 시 최신 버전으로 승격한다.
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const CURRENT_VERSION = "1.0.0";

/**
 * @returns {import('./types').Project}
 */
function createEmptyProject(name = "새 프로젝트") {
  return {
    projectVersion: CURRENT_VERSION,
    id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36),
    name,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    sources: [],
    capturePreset: {
      viewportPreset: "word",
      viewport: { width: 1440, height: 1024 },
      captureScope: "fullPage",
      waitMs: 2000,
      headless: true
    },
    domRules: [],
    editRules: [],
    exportProfiles: [],
    captureResults: []
  };
}

/**
 * 구버전 프로젝트 JSON을 현재 스키마로 마이그레이션한다.
 */
function migrateProject(data) {
  if (!data || typeof data !== "object") {
    return createEmptyProject();
  }
  // v1.0.0 미만이거나 버전 없는 경우 기본값으로 보완
  return {
    projectVersion: CURRENT_VERSION,
    id: data.id || (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36)),
    name: data.name || "가져온 프로젝트",
    createdAt: data.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    sources: Array.isArray(data.sources) ? data.sources : [],
    capturePreset: Object.assign(
      {
        viewportPreset: "word",
        viewport: { width: 1440, height: 1024 },
        captureScope: "fullPage",
        waitMs: 2000,
        headless: true
      },
      data.capturePreset || {}
    ),
    domRules: Array.isArray(data.domRules) ? data.domRules : [],
    editRules: Array.isArray(data.editRules) ? data.editRules : [],
    exportProfiles: Array.isArray(data.exportProfiles) ? data.exportProfiles : [],
    captureResults: Array.isArray(data.captureResults) ? data.captureResults : []
  };
}

/**
 * 프로젝트를 JSON 파일로 저장한다.
 * @param {string} filePath - 저장 경로 (.mcw.json)
 * @param {object} project
 */
function saveProject(filePath, project) {
  const data = { ...project, projectVersion: CURRENT_VERSION, updatedAt: new Date().toISOString() };
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
}

/**
 * JSON 파일에서 프로젝트를 불러온다. 버전 마이그레이션을 자동 적용한다.
 * @param {string} filePath
 * @returns {object}
 */
function loadProject(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`프로젝트 파일을 찾을 수 없습니다: ${filePath}`);
  }
  const raw = JSON.parse(fs.readFileSync(filePath, "utf8"));
  return migrateProject(raw);
}

/**
 * DOM/이미지 편집 규칙을 독립 레시피 파일로 내보낸다.
 * @param {string} filePath
 * @param {{ name: string, domRules: any[], editRules: any[], exportProfiles?: any[] }} recipe
 */
function saveRecipe(filePath, recipe) {
  const data = {
    recipeVersion: CURRENT_VERSION,
    name: recipe.name || "레시피",
    createdAt: new Date().toISOString(),
    domRules: recipe.domRules || [],
    editRules: recipe.editRules || [],
    exportProfiles: recipe.exportProfiles || []
  };
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
}

/**
 * 레시피 파일을 불러온다.
 */
function loadRecipe(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`레시피 파일을 찾을 수 없습니다: ${filePath}`);
  }
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

/**
 * 기존 프로젝트에 레시피를 병합한다 (중복 ruleId 감지 포함).
 */
function mergeRecipeIntoProject(project, recipe) {
  const existingDomIds = new Set((project.domRules || []).map((r) => r.id));
  const existingEditIds = new Set((project.editRules || []).map((r) => r.id));

  const newDomRules = (recipe.domRules || []).filter((r) => !existingDomIds.has(r.id));
  const newEditRules = (recipe.editRules || []).filter((r) => !existingEditIds.has(r.id));

  return {
    ...project,
    domRules: [...(project.domRules || []), ...newDomRules],
    editRules: [...(project.editRules || []), ...newEditRules]
  };
}

module.exports = {
  createEmptyProject,
  saveProject,
  loadProject,
  saveRecipe,
  loadRecipe,
  mergeRecipeIntoProject,
  CURRENT_VERSION
};
