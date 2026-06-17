/**
 * CLI 옵션 해석부터 행 필터링, 스크린샷 실행까지 전체 흐름을 조율한다.
 * singleUrl 모드와 DOM 규칙 직렬화 인자를 지원한다.
 */
const {
  parseCliOptions,
  loadRowsFromFiles,
  dedupeByUrl,
  takeScreenshots,
  takeSingleScreenshot
} = require("@webpage-capture/core");

function logHelp() {
  console.log(`웹페이지 캡처 CLI

필수 (둘 중 하나):
  --file, --files   xlsx/csv/txt 파일 경로 (콤마 구분 가능)
  --singleUrl       단일 URL 직접 입력

옵션:
  --sheet           시트명 (기본: page-list)
  --id              id 컬럼명 (기본: id)
  --subject         subject 컬럼명 (기본: subject)
  --colUrl          URL 컬럼명 (기본: detailPage)
  --csvEncoding     csv 인코딩 (utf8, cp949, euc-kr)
  --out             출력 폴더 (기본: ./screenshots)
  --wait            페이지 대기 시간(ms), 기본 2000
  --viewportPreset  word | ppt | markdown | custom
  --viewportWidth   뷰포트 너비 (px)
  --viewportHeight  뷰포트 높이 (px)
  --captureScope    fullPage | viewport | selector
  --captureSelector selector 범위 캡처용 CSS selector
  --depth           링크 탐색 깊이 0 | 1 | 2 (기본: 0)
  --headless false  브라우저 표시
  --dedupe false    URL 중복 제거 끄기
  --onlyUrls        지정한 URL만 실행 (콤마 또는 줄바꿈 구분)
  --domRules        DOM 규칙 JSON 배열 (문자열)
`);
}

function logOptions(opts) {
  const { singleUrl, filePaths, columns, sheetName, outDir, dedupe, waitMs, headless, csvEncoding, viewportPreset, captureScope, depth = 0 } = opts;

  if (singleUrl) {
    console.log(`단일 URL: ${singleUrl}`);
  } else {
    console.log(`입력 파일: ${filePaths.join(", ")}`);
    console.log(`컬럼 매핑: id='${columns.id}', subject='${columns.subjectKey}', url='${columns.urlKey}'`);
  }
  console.log(`옵션: sheet='${sheetName}', out='${outDir}', dedupe=${dedupe}, waitMs=${waitMs}, headless=${headless}`);
  console.log(`뷰포트: preset=${viewportPreset}, scope=${captureScope}, depth=${depth}`);
  if (csvEncoding) console.log(`CSV 인코딩: ${csvEncoding}`);
  if (opts.onlyUrls && opts.onlyUrls.length > 0) {
    console.log(`대상 URL 필터: ${opts.onlyUrls.length}개`);
  }
  if (opts.domRules && opts.domRules.length > 0) {
    console.log(`DOM 규칙: ${opts.domRules.length}개`);
  }
}

function filterRowsByUrl(rows, urlKey, onlyUrls = []) {
  if (!onlyUrls.length) return rows;
  const allowSet = new Set(onlyUrls.map((u) => (u || "").trim()).filter(Boolean));
  if (allowSet.size === 0) return rows;
  return rows.filter((row) => allowSet.has((row[urlKey] || "").trim()));
}

/**
 * 입력 로딩, 중복 제거, URL 필터링, 스크린샷 실행을 순서대로 수행한다.
 */
async function runCapture(opts) {
  if (opts.help) {
    logHelp();
    return;
  }

  if (opts.csvEncodingWarning) {
    console.warn(opts.csvEncodingWarning);
  }

  logOptions(opts);

  // 단일 URL 모드
  if (opts.singleUrl) {
    const { saved, total, failed } = await takeSingleScreenshot(opts.singleUrl, {
      outDir: opts.outDir,
      waitMs: opts.waitMs,
      headless: opts.headless,
      viewport: opts.viewport,
      captureScope: opts.captureScope,
      captureSelector: opts.captureSelector,
      domRules: opts.domRules || [],
      depth: opts.depth,
      baseName: "001_capture"
    });
    console.log(`DONE (saved ${saved}/${total})`);
    if (failed && failed.length > 0) {
      console.log(JSON.stringify({ type: "failed-summary", failed }));
    }
    return;
  }

  // 파일 목록 모드
  const allRows = loadRowsFromFiles(opts.filePaths, opts);
  if (allRows.length === 0) {
    console.log("처리할 행이 없습니다.");
    return;
  }

  let rows = opts.dedupe ? dedupeByUrl(allRows, opts.columns.urlKey) : allRows;

  if (opts.onlyUrls && opts.onlyUrls.length > 0) {
    const filtered = filterRowsByUrl(rows, opts.columns.urlKey, opts.onlyUrls);
    console.log(`지정 URL 필터 적용: ${filtered.length}/${rows.length} (지정 ${opts.onlyUrls.length}개)`);
    rows = filtered;
  }

  if (rows.length === 0) {
    console.log("필터 결과 실행할 대상이 없습니다.");
    return;
  }

  console.log(`총 행: ${allRows.length}, 스샷 대상(중복 URL ${opts.dedupe ? "제거" : "유지"}): ${rows.length}`);

  const { saved, total, failed } = await takeScreenshots(rows, opts);
  console.log(`DONE (saved ${saved}/${total})`);
  if (failed && failed.length > 0) {
    console.log(JSON.stringify({ type: "failed-summary", failed }));
    console.log(`FAILED_URLS: ${failed.map((f) => f.url).filter(Boolean).join(",")}`);
  }
}

/**
 * argv를 옵션으로 변환한 뒤 캡처 실행 흐름을 시작한다.
 */
async function runCli(argv) {
  let opts = parseCliOptions(argv);

  // --domRules JSON 문자열 파싱
  const rawArgPairs = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--domRules" && argv[i + 1]) {
      try {
        rawArgPairs.domRules = JSON.parse(argv[i + 1]);
      } catch (e) {
        console.warn("--domRules 파싱 실패:", e.message);
      }
      i++;
    }
  }
  if (rawArgPairs.domRules) {
    opts.domRules = rawArgPairs.domRules;
  }

  await runCapture(opts);
}

module.exports = {
  runCli,
  runCapture
};
