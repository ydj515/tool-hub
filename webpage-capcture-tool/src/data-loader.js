const fs = require("fs");
const path = require("path");
const xlsx = require("xlsx");
const iconv = require("iconv-lite");

function readRowsFromFile(filePath, { sheetName, columns, csvEncoding }) {
  const { id, subjectKey, urlKey } = columns;
  const ext = path.extname(filePath).toLowerCase();

  if (!fs.existsSync(filePath)) {
    throw new Error(`파일을 찾을 수 없습니다: ${filePath}`);
  }

  if ([".xlsx", ".xls"].includes(ext)) {
    const workbook = xlsx.readFile(filePath);
    const targetName = sheetName || workbook.SheetNames[0];
    const sheet = workbook.Sheets[targetName];

    if (!sheet) {
      throw new Error(
        `시트 '${targetName}' 을(를) 찾을 수 없습니다. (파일: ${filePath})`
      );
    }

    return xlsx.utils.sheet_to_json(sheet, { defval: "" });
  }

  if (ext === ".csv") {
    const enc = csvEncoding || "utf8";
    const buf = fs.readFileSync(filePath);
    const text = iconv.decode(buf, enc);
    const workbook = xlsx.read(text, { type: "string" });
    const first = workbook.SheetNames[0];
    const sheet = workbook.Sheets[first];
    return xlsx.utils.sheet_to_json(sheet, { defval: "" });
  }

  if (ext === ".txt") {
    const content = fs.readFileSync(filePath, "utf8");
    const lines = content
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith("#"));

    let idx = 1;
    return lines.map((line) => {
      const row = {
        [id]: "",
        [subjectKey]: `${path.basename(filePath)}_${idx}`,
        [urlKey]: line
      };
      idx++;
      return row;
    });
  }

  throw new Error(`지원하지 않는 파일 확장자입니다: ${ext}`);
}

function loadRowsFromFiles(filePaths, opts) {
  const { columns, sheetName, csvEncoding } = opts;
  const allRows = [];

  for (const fp of filePaths) {
    const rows = readRowsFromFile(fp, { columns, sheetName, csvEncoding });
    console.log(`파일 '${fp}' → ${rows.length} 행 로드`);
    allRows.push(...rows);
  }

  return allRows;
}

function dedupeByUrl(rows, urlKey) {
  const uniqueByUrl = new Map();

  for (const row of rows) {
    const url = (row[urlKey] || "").trim();
    if (!url) continue;

    if (!uniqueByUrl.has(url)) {
      uniqueByUrl.set(url, row);
    }
  }

  return Array.from(uniqueByUrl.values());
}

module.exports = {
  loadRowsFromFiles,
  dedupeByUrl
};
