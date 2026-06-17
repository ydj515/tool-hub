const { test, expect } = require("./fixtures");

test.describe("DOM 미리보기", () => {
  test("DOM 후보를 클릭하면 selector 입력칸에 자동 입력된다", async ({ page }) => {
    await page.locator('.nav-item[data-screen="dom"]').click();
    await page.evaluate(() => {
      AppState.domPreview = {
        url: "https://example.com",
        candidates: [
          {
            index: 1,
            selector: "#main-title",
            tagName: "h1",
            label: "h1#main-title",
            text: "메인 타이틀",
            role: "",
            ariaLabel: "",
          },
        ],
        selectedSelector: "",
        isLoading: false,
      };
      renderDomPreview();
    });

    await page.locator(".dom-candidate-item").click();

    await expect(page.locator("#new-rule-selector")).toHaveValue("#main-title");
  });
});
