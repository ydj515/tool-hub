const { parseCliOptions } = require("./src/options");
const { loadRowsFromFiles, dedupeByUrl } = require("./src/data-loader");
const { takeScreenshots } = require("./src/screenshot-runner");

function logOptions(opts) {
  const { filePaths, columns, sheetName, outDir, dedupe, waitMs, headless, csvEncoding } = opts;

  console.log(`입력 파일: ${filePaths.join(", ")}`);
  console.log(
    `컬럼 매핑: pk='${columns.pkKey}', subject='${columns.subjectKey}', url='${columns.urlKey}'`
  );
  console.log(
    `옵션: sheet='${sheetName}', out='${outDir}', dedupe=${dedupe}, waitMs=${waitMs}, headless=${headless}`
  );
  if (csvEncoding) {
    console.log(`CSV 인코딩: ${csvEncoding}`);
  }
}

async function run() {
  const opts = parseCliOptions(process.argv.slice(2));
  logOptions(opts);

  const allRows = loadRowsFromFiles(opts.filePaths, opts);
  if (allRows.length === 0) {
    console.log("처리할 행이 없습니다.");
    return;
  }

  const rows = opts.dedupe ? dedupeByUrl(allRows, opts.columns.urlKey) : allRows;
  console.log(
    `총 행: ${allRows.length}, 스샷 대상(중복 URL ${opts.dedupe ? "제거" : "유지"}): ${
      rows.length
    }`
  );

  const { saved, total } = await takeScreenshots(rows, opts);
  console.log(`DONE (saved ${saved}/${total})`);
}

run().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
