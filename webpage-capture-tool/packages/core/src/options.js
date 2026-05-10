/**
 * CLI 인자를 내부 옵션 객체로 해석하는 파서를 제공한다.
 */
const path = require("path");
const { VIEWPORT_PRESETS } = require("./export-profile");

const SUPPORTED_CSV_ENCODINGS = ["utf8", "utf-8", "cp949", "euc-kr", "euckr"];

const DEFAULTS = {
  sheetName: "page-list",
  columns: {
    id: "id",
    subjectKey: "subject",
    urlKey: "detailPage"
  },
  waitMs: 2000,
  headless: true,
  dedupe: true,
  viewport: { width: 1280, height: 720 },
  viewportPreset: "custom",
  captureScope: "fullPage",
  outDir: path.join(process.cwd(), "screenshots")
};

// Simple argv parser that understands "--key value" pairs.
function parseArgPairs(argv) {
  const pairs = {};

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith("--")) continue;

    const key = arg.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith("--")) {
      pairs[key] = "true";
    } else {
      pairs[key] = next;
      i++;
    }
  }

  return pairs;
}

function toBoolean(value, defaultValue) {
  if (value === undefined) return defaultValue;
  if (value === "false" || value === "0" || value === false) return false;
  return true;
}

function parseCsvList(value) {
  return (value || "")
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function normalizeEncoding(value) {
  return (value || "").trim().toLowerCase();
}

function resolveCsvEncoding(rawValue) {
  if (!rawValue) {
    return { encoding: undefined, warning: null };
  }

  const normalized = normalizeEncoding(rawValue);
  if (SUPPORTED_CSV_ENCODINGS.includes(normalized)) {
    return { encoding: normalized, warning: null };
  }

  const warning = `지원하지 않는 CSV 인코딩입니다: '${rawValue}'. (지원: ${SUPPORTED_CSV_ENCODINGS.join(
    ", "
  )}) → 기본값 utf8 사용`;
  return { encoding: undefined, warning };
}

/**
 * CLI 인자를 기본값과 함께 정규화된 옵션 객체로 변환한다.
 */
function parseCliOptions(argv) {
  const raw = parseArgPairs(argv);
  const fileArg = raw.file || raw.files;
  const singleUrl = raw.singleUrl || (!fileArg ? raw.url : null);

  if (raw.help) {
    return { help: true };
  }

  // singleUrl 또는 fileArg 중 하나 필요
  if (!fileArg && !singleUrl) {
    throw new Error("사용법: webpage-capture --file datalist.xlsx[,...] [--옵션들...] 또는 --singleUrl https://...");
  }

  let filePaths = [];
  let sources = [];

  if (singleUrl && !fileArg) {
    // 단일 URL 모드: sources 배열로 통일
    sources = [{ type: "url", url: singleUrl.trim() }];
  } else {
    filePaths = fileArg
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (filePaths.length === 0) {
      throw new Error("file 인자가 비어있습니다.");
    }
    sources = filePaths.map((fp) => ({ type: "file", path: fp }));
  }

  const columns = {
    id: raw.id || DEFAULTS.columns.id,
    subjectKey: raw.subject || DEFAULTS.columns.subjectKey,
    urlKey: raw.colUrl || raw.colurl || raw.url || DEFAULTS.columns.urlKey
  };

  const waitMs = raw.wait
    ? parseInt(raw.wait, 10) || DEFAULTS.waitMs
    : DEFAULTS.waitMs;
  const outDir = raw.out || raw.outDir || DEFAULTS.outDir;
  const { encoding: csvEncoding, warning: csvEncodingWarning } =
    resolveCsvEncoding(raw.csvEncoding);
  const onlyUrls = parseCsvList(raw.onlyUrls || raw.onlyurls);

  // 뷰포트 프리셋 처리
  const viewportPreset = raw.viewportPreset || DEFAULTS.viewportPreset;
  const presetViewport = VIEWPORT_PRESETS[viewportPreset] || VIEWPORT_PRESETS.custom;
  const viewport = raw.viewportWidth
    ? { width: parseInt(raw.viewportWidth, 10), height: parseInt(raw.viewportHeight || presetViewport.height, 10) }
    : { width: presetViewport.width, height: presetViewport.height };

  const captureScope = raw.captureScope || DEFAULTS.captureScope;
  const captureSelector = raw.captureSelector || null;

  return {
    filePaths,
    sources,
    singleUrl: singleUrl ? singleUrl.trim() : null,
    columns,
    sheetName: raw.sheet || DEFAULTS.sheetName,
    csvEncoding,
    csvEncodingWarning,
    waitMs,
    outDir: path.resolve(outDir),
    headless: toBoolean(raw.headless, DEFAULTS.headless),
    dedupe: toBoolean(raw.dedupe, DEFAULTS.dedupe),
    viewport,
    viewportPreset,
    captureScope,
    captureSelector,
    domRules: [],
    editRules: [],
    onlyUrls
  };
}

module.exports = {
  parseCliOptions,
  DEFAULTS
};
