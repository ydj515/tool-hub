const fs = require("fs");
const os = require("os");
const path = require("path");
const { test, expect } = require("./fixtures");

test.describe("내보내기 화면", () => {
  test("Word/PPT export 후 열기 버튼과 결과 카드가 활성화된다", async ({ page }) => {
    const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), "mcw-e2e-export-"));
    const sampleItems = [
      {
        baseName: "001_회원 관리 대시보드",
        filePath: path.resolve(__dirname, "../docs/sample-screenshots/001_네이버.png")
      },
      {
        baseName: "002_회원 검수 이력",
        filePath: path.resolve(__dirname, "../docs/sample-screenshots/002_다음.png")
      }
    ];

    try {
      await page.locator('.nav-item[data-screen="export"]').click();
      await page.evaluate(({ outputDir, sampleItems }) => {
        AppState.captureResults = sampleItems.map((item) => ({
          status: "ok",
          baseName: item.baseName,
          filePath: item.filePath
        }));
        AppState.exportConfig.channels = { markdown: true, word: true, ppt: true };
        AppState.exportConfig.outputDir = outputDir;
        AppState.exportConfig.namingPattern = "{index}_{safeTitle}";
        syncProjectExportProfiles();
        syncExportFormFromState();
        updateExportPreview();
      }, { outputDir, sampleItems });

      await expect(page.locator("#btn-open-word-export")).toBeDisabled();
      await expect(page.locator("#btn-open-ppt-export")).toBeDisabled();

      await page.locator("#btn-run-export").click();

      await expect(page.locator("#btn-open-word-export")).toBeEnabled({ timeout: 30_000 });
      await expect(page.locator("#btn-open-ppt-export")).toBeEnabled();
      await expect(page.locator("#btn-open-export-folder")).toBeEnabled();
      await expect(page.locator("#export-result-card")).toContainText("manual.docx");
      await expect(page.locator("#export-result-card")).toContainText("slides.pptx");
      await expect(page.locator("#log-export")).toContainText("내보내기 완료");

      expect(fs.existsSync(path.join(outputDir, "markdown-export", "manual.md"))).toBe(true);
      expect(fs.existsSync(path.join(outputDir, "word-export", "manual.docx"))).toBe(true);
      expect(fs.existsSync(path.join(outputDir, "ppt-export", "slides.pptx"))).toBe(true);
    } finally {
      fs.rmSync(outputDir, { recursive: true, force: true });
    }
  });
});
