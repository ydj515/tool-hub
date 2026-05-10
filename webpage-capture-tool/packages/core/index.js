/**
 * 웹페이지 캡처 코어 패키지의 주요 유틸리티를 재노출한다.
 */
const { parseCliOptions, DEFAULTS } = require("./src/options");
const { loadRowsFromFiles, dedupeByUrl } = require("./src/data-loader");
const { takeScreenshots, takeSingleScreenshot } = require("./src/screenshot-runner");
const { applyDomRules, formatDomRuleLog } = require("./src/dom-rule-runner");
const { applyEditRules, processImage } = require("./src/image-edit-runner");
const { createEmptyProject, saveProject, loadProject, saveRecipe, loadRecipe, mergeRecipeIntoProject } = require("./src/recipe-store");
const { BUILTIN_PROFILES, VIEWPORT_PRESETS, resolveFilename, makeSafeTitle } = require("./src/export-profile");
const { exportMarkdown } = require("./src/exporters/markdown");
const { exportWordAssets } = require("./src/exporters/word-assets");
const { exportPptAssets } = require("./src/exporters/ppt-assets");

module.exports = {
  // 옵션 파싱
  parseCliOptions,
  DEFAULTS,
  // 데이터 로더
  loadRowsFromFiles,
  dedupeByUrl,
  // 캡처
  takeScreenshots,
  takeSingleScreenshot,
  // DOM 규칙
  applyDomRules,
  formatDomRuleLog,
  // 이미지 편집
  applyEditRules,
  processImage,
  // 프로젝트/레시피
  createEmptyProject,
  saveProject,
  loadProject,
  saveRecipe,
  loadRecipe,
  mergeRecipeIntoProject,
  // 내보내기 프로필
  BUILTIN_PROFILES,
  VIEWPORT_PRESETS,
  resolveFilename,
  makeSafeTitle,
  // 내보내기
  exportMarkdown,
  exportWordAssets,
  exportPptAssets
};
