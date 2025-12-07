const {
  parseCliOptions,
  loadRowsFromFiles,
  dedupeByUrl,
  takeScreenshots
} = require("@webpage-capture/core");

function logHelp() {
  console.log(`웹페이지 캡처 CLI

필수:
  --file, --files   xlsx/csv/txt 파일 경로 (콤마 구분 가능)

옵션:
  --sheet           시트명 (기본: page-list)
  --id              id 컬럼명 (기본: id)
  --subject         subject 컬럼명 (기본: subject)
  --url             URL 컬럼명 (기본: detailPage)
  --csvEncoding     csv 인코딩 (utf8, cp949, euc-kr)
  --out             출력 폴더 (기본: ./screenshots)
  --wait            페이지 대기 시간(ms), 기본 2000
  --headless false  브라우저 표시
  --dedupe false    URL 중복 제거 끄기
`);
}

function logOptions(opts) {
  const {
    filePaths,
    columns,
    sheetName,
    outDir,
    dedupe,
    waitMs,
    headless,
    csvEncoding
  } = opts;

  console.log(`입력 파일: ${filePaths.join(", ")}`);
  console.log(
    `컬럼 매핑: id='${columns.id}', subject='${columns.subjectKey}', url='${columns.urlKey}'`
  );
  console.log(
    `옵션: sheet='${sheetName}', out='${outDir}', dedupe=${dedupe}, waitMs=${waitMs}, headless=${headless}`
  );
  if (csvEncoding) {
    console.log(`CSV 인코딩: ${csvEncoding}`);
  }
}

async function runCapture(opts) {
  if (opts.help) {
    logHelp();
    return;
  }

  if (opts.csvEncodingWarning) {
    console.warn(opts.csvEncodingWarning);
  }

  logOptions(opts);

  const allRows = loadRowsFromFiles(opts.filePaths, opts);
  if (allRows.length === 0) {
    console.log("처리할 행이 없습니다.");
    return;
  }

  const rows = opts.dedupe
    ? dedupeByUrl(allRows, opts.columns.urlKey)
    : allRows;
  console.log(
    `총 행: ${allRows.length}, 스샷 대상(중복 URL ${
      opts.dedupe ? "제거" : "유지"
    }): ${rows.length}`
  );

  const { saved, total } = await takeScreenshots(rows, opts);
  console.log(`DONE (saved ${saved}/${total})`);
}

async function runCli(argv) {
  const opts = parseCliOptions(argv);
  await runCapture(opts);
}

module.exports = {
  runCli,
  runCapture
};
