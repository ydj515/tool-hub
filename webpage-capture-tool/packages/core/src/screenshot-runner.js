/**
 * Playwright를 사용해 대상 URL 목록의 스크린샷을 저장한다.
 * DOM 규칙 적용과 캡처 범위(fullPage/viewport/selector)를 지원한다.
 */
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");
const { applyDomRules, formatDomRuleLog } = require("./dom-rule-runner");

function ensureOutputDir(outDir) {
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }
}

function buildBaseName(index, row, columns) {
  const { id, subjectKey } = columns;
  const idValue = row[id] || "";
  const subject = row[subjectKey] || "";

  const namePart = subject || idValue || "no-subject";
  return `${String(index).padStart(3, "0")}_${namePart}`
    .replace(/[\\/:*?"<>|]/g, "_")
    .slice(0, 150);
}

async function waitForRender(page, waitMs) {
  if (waitMs > 0) {
    await page.waitForTimeout(waitMs);
  }
}

/**
 * 캡처 범위에 따라 스크린샷 옵션을 결정한다.
 * @param {'fullPage'|'viewport'|'selector'} captureScope
 * @param {string|null} captureSelector
 * @param {string} filePath
 */
function buildScreenshotOptions(captureScope, captureSelector, filePath) {
  if (captureScope === "viewport") {
    return { path: filePath, fullPage: false };
  }
  if (captureScope === "selector" && captureSelector) {
    return { path: filePath, _selector: captureSelector };
  }
  return { path: filePath, fullPage: true };
}

/**
 * 단일 URL 캡처 (DOM 규칙 포함).
 * @param {import('playwright').Page} page
 * @param {{ url: string, baseName: string, outDir: string, waitMs: number, captureScope: string, captureSelector?: string, domRules?: any[] }} opts
 */
async function captureUrl(page, opts) {
  const { url, baseName, outDir, waitMs, captureScope, captureSelector, domRules } = opts;
  const filePath = path.join(outDir, `${baseName}.png`);

  await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
  await waitForRender(page, waitMs);

  // DOM 규칙 적용
  const domResults = [];
  if (domRules && domRules.length > 0) {
    const enabledRules = domRules.filter((r) => r.enabled !== false);
    const results = await applyDomRules(page, enabledRules);
    const logs = formatDomRuleLog(results, url);
    logs.forEach((log) => console.log(JSON.stringify(log)));
    domResults.push(...results);
  }

  // 캡처 범위에 따라 스크린샷
  if (captureScope === "selector" && captureSelector) {
    const el = await page.$(captureSelector);
    if (el) {
      await el.screenshot({ path: filePath });
    } else {
      // selector를 찾지 못하면 fullPage로 폴백
      console.log(JSON.stringify({ type: "dom-rule-warn", url, selector: captureSelector, message: "캡처 selector를 찾지 못했습니다. fullPage로 전환합니다." }));
      await page.screenshot({ path: filePath, fullPage: true });
    }
  } else if (captureScope === "viewport") {
    await page.screenshot({ path: filePath, fullPage: false });
  } else {
    await page.screenshot({ path: filePath, fullPage: true });
  }

  return { filePath, domResults };
}

/**
 * 대상 URL 목록을 순회하며 스크린샷을 저장하고 실패 목록을 수집한다.
 */
async function takeScreenshots(rows, options) {
  const {
    columns,
    outDir,
    waitMs,
    headless,
    viewport,
    captureScope = "fullPage",
    captureSelector = null,
    domRules = []
  } = options;
  const { urlKey } = columns;

  ensureOutputDir(outDir);

  const browser = await chromium.launch({ headless, timeout: 30000 });

  try {
    const page = await browser.newPage();
    await page.setViewportSize(viewport);

    let saved = 0;
    const failed = [];
    const results = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const url = (row[urlKey] || "").trim();

      if (!url) {
        console.log(`(${i + 1}/${rows.length}) URL 없음, 스킵`);
        continue;
      }

      const baseName = buildBaseName(i + 1, row, columns);
      console.log(`[${i + 1}/${rows.length}] ${url}`);

      try {
        const { filePath, domResults } = await captureUrl(page, {
          url,
          baseName,
          outDir,
          waitMs,
          captureScope,
          captureSelector,
          domRules
        });

        saved++;
        console.log(` -> saved: ${filePath}`);
        results.push({
          index: i + 1,
          url,
          baseName,
          filePath,
          domResults,
          status: "ok"
        });
      } catch (e) {
        const errorMsg = e && e.message ? e.message : `${e}`;
        failed.push({ url, error: errorMsg });
        console.log(JSON.stringify({ type: "error", url, message: errorMsg }));
        console.error(` -> failed: ${url}`, errorMsg);
        results.push({ index: i + 1, url, baseName, status: "failed", error: errorMsg });
      }
    }

    // 캡처 완료 후 summary 출력
    if (failed.length > 0) {
      console.log(JSON.stringify({ type: "failed-summary", failed }));
    }

    return { saved, total: rows.length, failed, results };
  } finally {
    await browser.close();
  }
}

/**
 * 단일 URL 캡처 (파일 목록 없이 직접 URL 지정).
 */
async function takeSingleScreenshot(url, options) {
  const {
    outDir,
    waitMs = 2000,
    headless = true,
    viewport = { width: 1440, height: 1024 },
    captureScope = "fullPage",
    captureSelector = null,
    domRules = [],
    baseName = "001_capture"
  } = options;

  ensureOutputDir(outDir);

  const browser = await chromium.launch({ headless, timeout: 30000 });
  try {
    const page = await browser.newPage();
    await page.setViewportSize(viewport);

    const { filePath, domResults } = await captureUrl(page, {
      url,
      baseName,
      outDir,
      waitMs,
      captureScope,
      captureSelector,
      domRules
    });

    console.log(` -> saved: ${filePath}`);
    return { saved: 1, total: 1, failed: [], results: [{ index: 1, url, baseName, filePath, domResults, status: "ok" }] };
  } catch (e) {
    const errorMsg = e && e.message ? e.message : `${e}`;
    console.log(JSON.stringify({ type: "error", url, message: errorMsg }));
    return { saved: 0, total: 1, failed: [{ url, error: errorMsg }], results: [{ index: 1, url, baseName, status: "failed", error: errorMsg }] };
  } finally {
    await browser.close();
  }
}

module.exports = {
  takeScreenshots,
  takeSingleScreenshot,
  waitForRender
};
