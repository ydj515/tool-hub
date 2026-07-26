const { test, expect } = require("./fixtures");

test.describe("모달 — dialog 전환", () => {
  test("새 프로젝트 모달이 열리고 닫힌다", async ({ page }) => {
    const dialog = page.locator("#modal-new-project");
    await expect(dialog).not.toBeVisible();

    await page.locator("#btn-new-project").click();
    await expect(dialog).toBeVisible();

    await page.locator("#modal-cancel-project").click();
    await expect(dialog).not.toBeVisible();
  });

  test("Escape 로 닫힌다", async ({ page }) => {
    const dialog = page.locator("#modal-new-project");
    await page.locator("#btn-new-project").click();
    await expect(dialog).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
  });

  test("열린 동안 바깥 요소가 inert 가 된다", async ({ page }) => {
    await page.locator("#btn-new-project").click();

    // :modal 은 포커스 트랩이 실제로 걸렸는지를 재는 의사 클래스다.
    const trapped = await page.evaluate(() =>
      document.getElementById("modal-new-project").matches(":modal"),
    );
    expect(trapped).toBe(true);
  });

  test("열린 모달이 화면 중앙에 놓인다", async ({ page }) => {
    // <dialog> 는 UA 기본값 margin: auto 로 중앙 정렬된다. 전역
    // * { margin: 0 } 리셋이 그걸 지워 좌상단에 붙은 적이 있다.
    await page.locator("#btn-new-project").click();

    const offset = await page.evaluate(() => {
      const r = document.getElementById("modal-new-project").getBoundingClientRect();
      return {
        dx: Math.abs(r.left + r.width / 2 - window.innerWidth / 2),
        dy: Math.abs(r.top + r.height / 2 - window.innerHeight / 2),
      };
    });

    expect(offset.dx).toBeLessThanOrEqual(1);
    expect(offset.dy).toBeLessThanOrEqual(1);
  });

  test("닫힌 모달은 화면을 가리지 않는다", async ({ page }) => {
    // display 를 [open] 에만 주지 않으면 UA 기본값 display:none 을 덮어
    // 닫힌 모달이 항상 보인다. 그 회귀를 잡는다.
    const box = await page.evaluate(() => {
      const el = document.getElementById("modal-new-project");
      const r = el.getBoundingClientRect();
      return { w: r.width, h: r.height, display: getComputedStyle(el).display };
    });

    expect(box.display).toBe("none");
    expect(box.w).toBe(0);
    expect(box.h).toBe(0);
  });
});
