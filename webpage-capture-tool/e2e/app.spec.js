const { test, expect } = require("./fixtures");

test.describe("앱 기본 상태", () => {
  test("앱 타이틀이 'Manual Capture Workbench'", async ({ page }) => {
    const title = await page.title();
    expect(title).toContain("Manual Capture Workbench");
  });

  test(".app-name 텍스트가 'Manual Capture Workbench'", async ({ page }) => {
    const text = await page.locator(".app-name").textContent();
    expect(text).toBe("Manual Capture Workbench");
  });

  test("#project-name이 '새 프로젝트'로 초기화된다", async ({ page }) => {
    const text = await page.locator("#project-name").textContent();
    expect(text).toBe("새 프로젝트");
  });

  test("상태 뱃지가 'Ready'", async ({ page }) => {
    const text = await page.locator("#status-badge").textContent();
    expect(text).toBe("Ready");
  });

  test("네비게이션 항목이 6개", async ({ page }) => {
    const items = await page.locator(".nav-item").count();
    expect(items).toBe(6);
  });

  test("초기 활성 화면이 project", async ({ page }) => {
    const active = await page.locator(".nav-item.active").getAttribute("data-screen");
    expect(active).toBe("project");
  });

  test("#screen-project가 보이고 다른 screen은 hidden", async ({ page }) => {
    await expect(page.locator("#screen-project")).toBeVisible();
    await expect(page.locator("#screen-capture")).not.toBeVisible();
    await expect(page.locator("#screen-image")).not.toBeVisible();
  });

  test("'프로젝트 저장' 버튼이 존재한다", async ({ page }) => {
    await expect(page.locator("#btn-save-project")).toBeVisible();
    const text = await page.locator("#btn-save-project").textContent();
    expect(text).toContain("프로젝트 저장");
  });

  test("'실행' 버튼이 존재하고 활성화 상태", async ({ page }) => {
    await expect(page.locator("#btn-run")).toBeEnabled();
  });

  test("'취소' 버튼이 초기에 비활성화", async ({ page }) => {
    await expect(page.locator("#btn-cancel")).toBeDisabled();
  });
});
