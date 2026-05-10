const { test, expect } = require("./fixtures");

test.describe("이미지 편집 화면", () => {
  test.beforeEach(async ({ page }) => {
    // 이미지 편집 탭으로 이동
    await page.locator('.nav-item[data-screen="image"]').click();
    await expect(page.locator("#screen-image")).toBeVisible();
  });

  test.describe("툴 버튼", () => {
    test("툴 버튼이 5개 존재한다 (blur/box/crop/resize/pan)", async ({ page }) => {
      const count = await page.locator(".tool-btn").count();
      expect(count).toBe(5);
    });

    test("blur 툴이 초기에 active 상태", async ({ page }) => {
      const blurBtn = page.locator('.tool-btn[data-tool="blur"]');
      await expect(blurBtn).toHaveClass(/active/);
    });

    test("box 툴 클릭 시 box가 active, blur는 비활성", async ({ page }) => {
      await page.locator('.tool-btn[data-tool="box"]').click();
      await expect(page.locator('.tool-btn[data-tool="box"]')).toHaveClass(/active/);
      await expect(page.locator('.tool-btn[data-tool="blur"]')).not.toHaveClass(/active/);
    });

    test("crop 툴 버튼이 클릭 가능하다", async ({ page }) => {
      await expect(page.locator('.tool-btn[data-tool="crop"]')).toBeEnabled();
    });

    test("resize 툴 버튼이 클릭 가능하다", async ({ page }) => {
      await expect(page.locator('.tool-btn[data-tool="resize"]')).toBeEnabled();
    });

    test("pan(이동) 툴 버튼이 클릭 가능하다", async ({ page }) => {
      await expect(page.locator('.tool-btn[data-tool="pan"]')).toBeEnabled();
    });
  });

  test.describe("Undo / Redo 버튼", () => {
    test("#btn-undo가 초기에 비활성화", async ({ page }) => {
      await expect(page.locator("#btn-undo")).toBeDisabled();
    });

    test("#btn-redo가 초기에 비활성화", async ({ page }) => {
      await expect(page.locator("#btn-redo")).toBeDisabled();
    });
  });

  test.describe("줌 컨트롤", () => {
    test("#zoom-level 요소가 화면에 표시된다", async ({ page }) => {
      await expect(page.locator("#zoom-level")).toBeVisible();
    });

    test("줌 레벨 텍스트가 '%'를 포함한다", async ({ page }) => {
      const text = await page.locator("#zoom-level").textContent();
      expect(text).toContain("%");
    });
  });

  test.describe("PNG 저장 버튼", () => {
    test("'PNG 저장' 버튼이 존재하고 표시된다", async ({ page }) => {
      await expect(page.locator("#btn-save-image-as")).toBeVisible();
      const text = await page.locator("#btn-save-image-as").textContent();
      expect(text).toContain("PNG 저장");
    });
  });
});
