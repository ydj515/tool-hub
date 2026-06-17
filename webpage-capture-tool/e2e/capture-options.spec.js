const { test, expect } = require("./fixtures");

test.describe("캡처 옵션", () => {
  test("탐색 깊이를 2로 설정하면 실행 인자에 --depth 2가 포함된다", async ({ page }) => {
    await page.locator('.nav-item[data-screen="capture"]').click();
    await page.locator("#single-url").fill("https://example.com");
    await page.locator("#depth").fill("2");

    const args = await page.evaluate(() => window.buildCaptureArgs());

    expect(args).toContain("--depth");
    expect(args[args.indexOf("--depth") + 1]).toBe("2");
  });
});
