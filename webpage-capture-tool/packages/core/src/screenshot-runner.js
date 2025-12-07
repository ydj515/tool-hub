const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

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

async function takeScreenshots(rows, options) {
  const { columns, outDir, waitMs, headless, viewport } = options;
  const { urlKey } = columns;

  ensureOutputDir(outDir);

  const browser = await chromium.launch({ headless, timeout: 30000 });

  try {
    const page = await browser.newPage();
    await page.setViewportSize(viewport);

    let saved = 0;
    const failed = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const url = (row[urlKey] || "").trim();

      if (!url) {
        console.log(`(${i + 1}/${rows.length}) URL 없음, 스킵`);
        continue;
      }

      const baseName = buildBaseName(i + 1, row, columns);
      const filePath = path.join(outDir, `${baseName}.png`);

      console.log(`[${i + 1}/${rows.length}] ${url}`);
      try {
        await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
        await page.waitForTimeout(waitMs);

        await page.screenshot({ path: filePath, fullPage: true });
        saved++;
        console.log(` -> saved: ${filePath}`);
      } catch (e) {
        const errorMsg = e && e.message ? e.message : `${e}`;
        failed.push({ url, error: errorMsg });
        // Emit structured error for consumers that parse logs.
        console.log(JSON.stringify({ type: "error", url, message: errorMsg }));
        console.error(` -> failed: ${url}`, errorMsg);
      }
    }

    return { saved, total: rows.length, failed };
  } finally {
    await browser.close();
  }
}

module.exports = {
  takeScreenshots
};
