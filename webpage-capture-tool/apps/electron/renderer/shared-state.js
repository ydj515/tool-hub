/**
 * 워크벤치 전역 상태와 상태 업데이트 유틸리티를 제공한다.
 *
 * 설계 원칙:
 *   - 렌더러에서 Node API에 직접 접근하지 않는다.
 *   - 모든 IPC 호출은 window.workbenchApi를 통한다.
 *   - 상태 변경 후 renderXxx() 함수를 명시적으로 호출한다.
 */

const VIEWPORT_PRESETS = {
  word:     { width: 1440, height: 1024, label: "Word 기본 (1440x1024)" },
  ppt:      { width: 1920, height: 1080, label: "PPT 16:9 (1920x1080)" },
  markdown: { width: 1280, height: 800,  label: "Markdown (1280x800)" },
  custom:   { width: 1280, height: 720,  label: "사용자 정의" }
};

// 앱 전역 상태
const AppState = {
  currentScreen: "project",
  isRunning: false,

  // 프로젝트
  project: {
    id: null,
    name: "새 프로젝트",
    filePath: null,
    capturePreset: {
      viewportPreset: "word",
      viewport: { width: 1440, height: 1024 },
      captureScope: "fullPage",
      captureSelector: null,
      waitMs: 2000,
      headless: true,
      dedupe: true,
      sourceType: "single",
      singleUrl: "",
      filePaths: [],
      sheet: "",
      colUrl: ""
    },
    domRules: [],
    editRules: [],
    exportProfiles: [],
    sources: []
  },

  // 캡처 결과
  captureResults: [],
  failedUrls: [],

  // 이미지 편집 상태
  imageEdit: {
    currentIndex: -1,
    currentTool: "blur",
    pendingRules: [],
    isDrawing: false,
    startX: 0,
    startY: 0,
    selectionRect: null
  },

  // 내보내기 설정
  exportConfig: {
    channels: { markdown: true, word: false, ppt: false },
    outputDir: "",
    namingPattern: "{index}_{safeTitle}"
  },

  // 최근 프로젝트 목록
  recentProjects: []
};

/** 상태 부분 업데이트 헬퍼 */
function patchState(path, value) {
  const keys = path.split(".");
  let target = AppState;
  for (let i = 0; i < keys.length - 1; i++) {
    target = target[keys[i]];
  }
  target[keys[keys.length - 1]] = value;
}

function getViewportByPreset(preset) {
  return VIEWPORT_PRESETS[preset] || VIEWPORT_PRESETS.custom;
}

function generateRuleId() {
  return "rule_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

// 전역 노출
window.AppState = AppState;
window.patchState = patchState;
window.getViewportByPreset = getViewportByPreset;
window.generateRuleId = generateRuleId;
window.VIEWPORT_PRESETS = VIEWPORT_PRESETS;
