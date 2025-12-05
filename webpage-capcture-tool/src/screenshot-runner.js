const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

function ensureOutputDir(outDir) {
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }
}

function buildBaseName(index, row, columns) {
  const { pkKey, subjectKey } = columns;
  const pk = row[pkKey] || "";
  const subject = row[subjectKey] || "";

  const namePart = subject || pk || "no-subject";
  return `${String(index).padStart(3, "0")}_${namePart}`
    .replace(/[\\/:*?"<>|]/g, "_")
    .slice(0, 150);
}

async function takeScreenshots(rows, options) {
  const { columns, outDir, waitMs, headless, viewport } = options;
  const { urlKey } = columns;

  ensureOutputDir(outDir);

  const browser = await chromium.launch({ headless });

  try {
    const page = await browser.newPage();
    await page.setViewportSize(viewport);

    let saved = 0;

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
        await page.goto(url, { waitUntil: "networkidle" });
        await page.waitForTimeout(waitMs);

        await page.screenshot({ path: filePath, fullPage: true });
        saved++;
        console.log(` -> saved: ${filePath}`);
      } catch (e) {
        console.error(` -> failed: ${url}`, e.message);
      }
    }

    return { saved, total: rows.length };
  } finally {
    await browser.close();
  }
}

module.exports = {
  takeScreenshots
};
