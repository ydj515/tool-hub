const path = require("path");

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
  outDir: path.join(__dirname, "..", "screenshots")
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

function parseCliOptions(argv) {
  const raw = parseArgPairs(argv);
  const fileArg = raw.file || raw.files;

  if (!fileArg) {
    throw new Error(
      "사용법: node screenshot.js --file datalist.xlsx[,more.csv,...] [--옵션들...]"
    );
  }

  const filePaths = fileArg
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (filePaths.length === 0) {
    throw new Error("file 인자가 비어있습니다.");
  }

  const columns = {
    id: raw.id || DEFAULTS.columns.id,
    subjectKey: raw.subject || DEFAULTS.columns.subjectKey,
    urlKey: raw.url || DEFAULTS.columns.urlKey
  };

  const waitMs = raw.wait ? parseInt(raw.wait, 10) || DEFAULTS.waitMs : DEFAULTS.waitMs;
  const outDir = raw.out || raw.outDir || DEFAULTS.outDir;

  return {
    filePaths,
    columns,
    sheetName: raw.sheet || DEFAULTS.sheetName,
    csvEncoding: raw.csvEncoding, // optional override for CSV
    waitMs,
    outDir: path.resolve(outDir),
    headless: toBoolean(raw.headless, DEFAULTS.headless),
    dedupe: toBoolean(raw.dedupe, DEFAULTS.dedupe),
    viewport: DEFAULTS.viewport
  };
}

module.exports = {
  parseCliOptions,
  DEFAULTS
};
