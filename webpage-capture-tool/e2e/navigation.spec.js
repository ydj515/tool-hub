const { test, expect } = require("./fixtures");

const SCREENS = [
  { key: "project", title: "프로젝트", screenId: "screen-project" },
  { key: "capture", title: "캡처", screenId: "screen-capture" },
  { key: "dom", title: "DOM", screenId: "screen-dom" },
  { key: "image", title: "이미지", screenId: "screen-image" },
  { key: "batch", title: "일괄", screenId: "screen-batch" },
  { key: "export", title: "내보내기", screenId: "screen-export" },
];

test.describe("네비게이션 — 화면 전환", () => {
  for (const { key, screenId } of SCREENS) {
    test(`nav-item[data-screen="${key}"] 클릭 → #${screenId} 표시`, async ({ page }) => {
      await page.locator(`.nav-item[data-screen="${key}"]`).click();
      await expect(page.locator(`#${screenId}`)).toBeVisible();
    });
  }

  test("다른 화면 선택 시 이전 화면이 숨겨진다", async ({ page }) => {
    // capture로 이동
    await page.locator('.nav-item[data-screen="capture"]').click();
    await expect(page.locator("#screen-capture")).toBeVisible();
    await expect(page.locator("#screen-project")).not.toBeVisible();

    // project로 복귀
    await page.locator('.nav-item[data-screen="project"]').click();
    await expect(page.locator("#screen-project")).toBeVisible();
    await expect(page.locator("#screen-capture")).not.toBeVisible();
  });

  test("nav-item 클릭 시 active 클래스가 클릭한 항목으로 이동한다", async ({ page }) => {
    await page.locator('.nav-item[data-screen="dom"]').click();
    const active = await page.locator(".nav-item.active").getAttribute("data-screen");
    expect(active).toBe("dom");
  });
});
