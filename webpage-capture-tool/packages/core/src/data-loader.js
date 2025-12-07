const fs = require("fs");
const path = require("path");
const xlsx = require("xlsx");
const iconv = require("iconv-lite");

function normalizeKey(key) {
  return (key || "").replace(/[\s_-]/g, "").toLowerCase();
}

function buildHeaderMap(headers, columns) {
  const { id, subjectKey, urlKey } = columns;
  const expected = [
    { target: id, name: "id" },
    { target: subjectKey, name: "subject" },
    { target: urlKey, name: "detailPage" }
  ];

  const map = {};

  headers.forEach((header) => {
    const normalized = normalizeKey(header);
    const matched = expected.find((e) => normalizeKey(e.target) === normalized);
    if (matched) {
      map[header] = matched.target;
    }
  });

  const missing = expected
    .filter((e) => !Object.values(map).includes(e.target))
    .map((e) => e.target);

  if (missing.length > 0) {
    const friendlyNames = expected.map((e) => e.target).join(", ");
    throw new Error(
      `필수 컬럼을 찾지 못했습니다. (필요: ${friendlyNames}, 발견된 헤더: ${
        headers.join(", ") || "없음"
      })`
    );
  }

  return map;
}

function remapRows(rows, headerMap) {
  return rows.map((row) => {
    const next = {};
    Object.entries(headerMap).forEach(([originalKey, targetKey]) => {
      next[targetKey] = row[originalKey] ?? "";
    });
    return next;
  });
}

function parseSheet(sheet) {
  const rows = xlsx.utils.sheet_to_json(sheet, { defval: "" });
  const headerRows = xlsx.utils.sheet_to_json(sheet, { header: 1 });
  const headers =
    (headerRows && headerRows.length > 0
      ? headerRows[0]
          .map((h) => (typeof h === "string" ? h.trim() : `${h}`))
          .filter(Boolean)
      : Object.keys(rows[0] || {})) || [];

  return { rows, headers };
}

function readRowsFromExcel(filePath, sheetName, columns) {
  const workbook = xlsx.readFile(filePath);
  const targetName = sheetName || workbook.SheetNames[0];
  let sheet = workbook.Sheets[targetName];

  if (!sheet && workbook.SheetNames.length > 0) {
    const fallback = workbook.SheetNames[0];
    console.warn(
      `시트 '${targetName}' 을(를) 찾을 수 없습니다. 첫 번째 시트 '${fallback}' 로 대체합니다. (파일: ${filePath})`
    );
    sheet = workbook.Sheets[fallback];
  }

  if (!sheet) {
    throw new Error(`시트 '${targetName}' 을(를) 찾을 수 없습니다. (파일: ${filePath})`);
  }

  const { rows, headers } = parseSheet(sheet);
  const headerMap = buildHeaderMap(headers, columns);

  return remapRows(rows, headerMap);
}

function readRowsFromCsv(filePath, encoding, sheetName, columns) {
  const buf = fs.readFileSync(filePath);
  const text = iconv.decode(buf, encoding || "utf8");
  const workbook = xlsx.read(text, { type: "string" });
  const targetSheet = sheetName || workbook.SheetNames[0];
  let sheet = workbook.Sheets[targetSheet];
  if (!sheet && workbook.SheetNames.length > 0) {
    const fallback = workbook.SheetNames[0];
    console.warn(
      `시트 '${targetSheet}' 을(를) 찾을 수 없습니다. 첫 번째 시트 '${fallback}' 로 대체합니다. (파일: ${filePath})`
    );
    sheet = workbook.Sheets[fallback];
  }
  if (!sheet) {
    throw new Error(`시트 '${targetSheet}' 을(를) 찾을 수 없습니다. (파일: ${filePath})`);
  }

  const { rows, headers } = parseSheet(sheet);
  const headerMap = buildHeaderMap(headers, columns);
  return remapRows(rows, headerMap);
}

function readRowsFromTxt(filePath, columns) {
  const content = fs.readFileSync(filePath, "utf8");
  const lines = content
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"));

  const { id, subjectKey, urlKey } = columns;
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

function readRowsFromFile(filePath, { sheetName, columns, csvEncoding }) {
  const ext = path.extname(filePath).toLowerCase();

  if (!fs.existsSync(filePath)) {
    throw new Error(`파일을 찾을 수 없습니다: ${filePath}`);
  }

  if ([".xlsx", ".xls"].includes(ext)) {
    return readRowsFromExcel(filePath, sheetName, columns);
  }

  if (ext === ".csv") {
    return readRowsFromCsv(filePath, csvEncoding, sheetName, columns);
  }

  if (ext === ".txt") {
    return readRowsFromTxt(filePath, columns);
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
