const { test, expect } = require("./fixtures");

/**
 * 정본 토큰이 실제 렌더러에 도달했는지 계산값으로 확인한다.
 * 다른 앱은 빌드 산출 CSS 를 grep 하지만 이 앱은 번들러가 없으므로
 * Electron 렌더러에서 직접 getComputedStyle 을 읽는 쪽이 더 강한 가드다.
 */
test.describe("디자인 토큰 — 정본 소비", () => {
  test("정본 색상 토큰이 :root 에서 해석된다", async ({ page }) => {
    const tokens = await page.evaluate(() => {
      const cs = getComputedStyle(document.documentElement);
      const read = (name) => cs.getPropertyValue(name).trim();
      return {
        primary: read("--primary"),
        primaryStrong: read("--primary-strong"),
        surface: read("--surface"),
        line: read("--line"),
        warning: read("--warning"),
        muted: read("--muted"),
      };
    });

    // 커스텀 프로퍼티는 작성한 문자열이 그대로 반환된다. 정본의 공백까지
    // 일치해야 하므로 아래 값은 실제 렌더러에서 읽어 확인한 것이다.
    expect(tokens.primary).toBe("#3366ff");
    expect(tokens.primaryStrong).toBe("#005eeb");
    expect(tokens.surface).toBe("#ffffff");
    expect(tokens.line).toBe("rgba(112, 115, 124, 0.22)");
    expect(tokens.warning).toBe("#a15c00");
    expect(tokens.muted).toBe("rgba(55, 56, 60, 0.72)");
  });

  test("정본 치수 토큰이 해석된다", async ({ page }) => {
    const tokens = await page.evaluate(() => {
      const cs = getComputedStyle(document.documentElement);
      const read = (name) => cs.getPropertyValue(name).trim();
      return {
        radiusMd: read("--ds-radius-md"),
        durationBase: read("--ds-duration-base"),
        easeStandard: read("--ds-ease-standard"),
      };
    });

    expect(tokens.radiusMd).toBe("12px");
    expect(tokens.durationBase).toBe("180ms");
    expect(tokens.easeStandard).toBe("cubic-bezier(0.4, 0, 0.2, 1)");
  });

  test("앱 고유 토큰이 정본을 덮지 않고 공존한다", async ({ page }) => {
    const tokens = await page.evaluate(() => {
      const cs = getComputedStyle(document.documentElement);
      const read = (name) => cs.getPropertyValue(name).trim();
      return {
        sidebarBg: read("--sidebar-bg"),
        logBg: read("--log-bg"),
        topbarH: read("--topbar-h"),
        sidebarW: read("--sidebar-w"),
      };
    });

    expect(tokens.sidebarBg).toBe("#1e2130");
    expect(tokens.logBg).toBe("#111827");
    expect(tokens.topbarH).toBe("52px");
    expect(tokens.sidebarW).toBe("140px");
  });

  test("ToolHub Sans 가 file:// 에서 실제로 로드된다", async ({ page }) => {
    // 실패한 폰트 요청이 하나라도 있으면 경로가 깨진 것이다.
    const failed = [];
    page.on("requestfailed", (r) => {
      if (r.url().includes("woff2")) failed.push(r.url());
    });

    await page.reload();
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(1000);

    expect(failed).toEqual([]);

    // 폰트 스택의 첫 항목이 ToolHub Sans 여야 한다.
    const family = await page.evaluate(() => getComputedStyle(document.body).fontFamily);
    expect(family.startsWith('"ToolHub Sans"')).toBe(true);

    // 폰트 페이스가 실제로 로드 완료 상태여야 한다.
    const loaded = await page.evaluate(async () => {
      await document.fonts.ready;
      return [...document.fonts].some(
        (f) => f.family === "ToolHub Sans" && f.status === "loaded",
      );
    });
    expect(loaded).toBe(true);
  });
});
