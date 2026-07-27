import { expect, test } from "@playwright/test";

interface ElementBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

function expectBoxInside(inner: ElementBox, outer: ElementBox) {
  expect(inner.x).toBeGreaterThanOrEqual(outer.x - 1);
  expect(inner.y).toBeGreaterThanOrEqual(outer.y - 1);
  expect(inner.x + inner.width).toBeLessThanOrEqual(outer.x + outer.width + 1);
  expect(inner.y + inner.height).toBeLessThanOrEqual(outer.y + outer.height + 1);
}

test("공통 셸에서 옵션 boolean과 비교 결과를 실제로 전환한다", async ({ page }) => {
  await page.goto("/");

  const shell = page.locator("[data-ds-page-shell]");
  const header = page.locator("[data-ds-tool-header]");
  const secretToggle = page.getByRole("button", { name: /민감정보 탐지/ });
  const compareButton = page.getByRole("button", { name: "비교" });
  await expect(shell).toBeVisible();
  await expect(header).toContainText("Config Diff Viewer");
  await expect(page).toHaveTitle("Config Diff Viewer");
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute("href", "/site.webmanifest");
  await expect(page.locator('link[rel="icon"][href="/favicon.svg"]')).toHaveCount(1);
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute(
    "href",
    "/apple-touch-icon.png",
  );
  await expect(page.locator("[data-ds-empty-state]")).toContainText(
    "비교 버튼을 눌러 분석을 시작하세요.",
  );

  await expect(secretToggle).toHaveAttribute("aria-pressed", "true");
  await expect(secretToggle.locator("[data-ds-badge]" )).toHaveText("켬");
  await secretToggle.click();
  await expect(secretToggle).toHaveAttribute("aria-pressed", "false");
  await expect(secretToggle.locator("[data-ds-badge]" )).toHaveText("끔");

  await compareButton.click();
  await expect(page.locator("[data-ds-empty-state]")).toHaveCount(0);
  await expect(page.locator("[data-ds-badge]").filter({ hasText: /통과|실패/ })).toBeVisible();
});

test("파싱 오류가 있으면 비교를 비활성화하고 한국어 위치와 이유를 표시한다", async ({ page }) => {
  await page.goto("/");

  const compareButton = page.getByRole("button", { name: "비교" });
  await page.locator(".codeTextarea").first().fill("server: [");

  await expect(page.locator(".parseErrorBanner").first()).toHaveText(
    "2행: unexpected end of the stream within a flow collection (2:1)",
  );
  await expect(compareButton).toBeDisabled();
  await expect(compareButton).toHaveAttribute("title", "파싱 오류를 먼저 수정하세요.");
  await expect(compareButton).toHaveCSS("opacity", "1");
});

for (const width of [375, 768, 1440]) {
  test(`${width}px 셸 geometry가 표준 control 크기와 overflow 계약을 유지한다`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/");

    const header = page.locator("[data-ds-tool-header]");
    const brand = page.locator("[data-ds-tool-brand]");
    const brandMark = page.locator("[data-ds-brand-mark]");
    const actions = page.locator(".config-header-actions");
    const resetButton = page.getByRole("button", { name: "초기화" });
    const compareButton = page.getByRole("button", { name: "비교" });
    const themeButton = page.getByRole("button", { name: "다크 테마로 전환" });
    const [headerBox, brandBox, actionsBox, themeBox] = await Promise.all([
      header.boundingBox(),
      brand.boundingBox(),
      actions.boundingBox(),
      themeButton.boundingBox(),
    ]);

    expect(headerBox).not.toBeNull();
    expect(brandBox).not.toBeNull();
    expect(actionsBox).not.toBeNull();
    expect(themeBox).not.toBeNull();
    await expect(brandMark).toHaveCSS("width", "40px");
    await expect(brandMark).toHaveCSS("height", "40px");
    await expect(resetButton).toHaveCSS("height", "36px");
    await expect(compareButton).toHaveCSS("height", "36px");
    await expect(themeButton).toHaveCSS("width", "36px");
    await expect(themeButton).toHaveCSS("height", "36px");
    expect(await header.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
    expect(await page.locator("body").evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);

    const editorCard = page.locator(".editorCard");
    const inputSides = page.locator(".inputSide");
    const filenameInputs = page.locator(".filenameInput");
    const textareas = page.locator(".codeTextarea");
    const [editorCardBox, inputABox, inputBBox, filenameABox, filenameBBox, textareaABox, textareaBBox] =
      await Promise.all([
        editorCard.boundingBox(),
        inputSides.nth(0).boundingBox(),
        inputSides.nth(1).boundingBox(),
        filenameInputs.nth(0).boundingBox(),
        filenameInputs.nth(1).boundingBox(),
        textareas.nth(0).boundingBox(),
        textareas.nth(1).boundingBox(),
      ]);

    expect(editorCardBox).not.toBeNull();
    expect(inputABox).not.toBeNull();
    expect(inputBBox).not.toBeNull();
    expect(filenameABox).not.toBeNull();
    expect(filenameBBox).not.toBeNull();
    expect(textareaABox).not.toBeNull();
    expect(textareaBBox).not.toBeNull();
    for (const box of [inputABox, inputBBox, filenameABox, filenameBBox, textareaABox, textareaBBox]) {
      expectBoxInside(box!, editorCardBox!);
    }

    if (width === 375) {
      const [resetBox, compareBox] = await Promise.all([
        resetButton.boundingBox(),
        compareButton.boundingBox(),
      ]);
      await expect(actions).toHaveCSS("display", "grid");
      expect(resetBox).not.toBeNull();
      expect(compareBox).not.toBeNull();
      expect(Math.abs(resetBox!.width - compareBox!.width)).toBeLessThan(1);
      expect(compareBox!.x - (resetBox!.x + resetBox!.width)).toBeGreaterThanOrEqual(7);
      expect(actionsBox!.y).toBeGreaterThan(brandBox!.y + brandBox!.height);
      expect(Math.abs(brandBox!.y - themeBox!.y)).toBeLessThan(12);
      expect(inputBBox!.y).toBeGreaterThanOrEqual(inputABox!.y + inputABox!.height - 1);
    } else {
      expect(Math.abs(brandBox!.y - actionsBox!.y)).toBeLessThan(12);
      expect(Math.abs(brandBox!.y - themeBox!.y)).toBeLessThan(12);
      expect(Math.abs(inputABox!.y - inputBBox!.y)).toBeLessThan(1);
      expect(inputBBox!.x).toBeGreaterThanOrEqual(inputABox!.x + inputABox!.width - 1);
    }
  });
}

for (const [width, display] of [
  [901, "flex"],
  [1023, "flex"],
  [1024, "grid"],
] as const) {
  test(`${width}px 입력 헤더가 ${display} 레이아웃 분기를 사용한다`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/");

    await expect(page.locator(".inputSideHeader").first()).toHaveCSS("display", display);
  });
}
