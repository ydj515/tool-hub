import { expect, test } from "@playwright/test";

test("공통 셸과 한국어 액션이 렌더되고 disabled 시각 계약을 유지한다", async ({ page }) => {
  await page.goto("/");

  const shell = page.locator("[data-ds-page-shell]");
  const header = page.locator("[data-ds-tool-header]");
  await expect(shell).toBeVisible();
  await expect(header).toBeVisible();
  await expect(page.getByLabel("샘플 DDL 불러오기")).toHaveValue("");
  await expect(page.getByRole("button", { name: "생성" })).toHaveAttribute(
    "data-ds-button",
    "true",
  );
  await expect(page.getByRole("button", { name: "다크 테마로 전환" })).toBeVisible();
  await expect(header).not.toContainText("realistic");
  await expect(header).not.toContainText("Generate");

  await page.getByLabel("샘플 DDL 불러오기").selectOption("mysql");
  await expect(page.getByLabel("샘플 DDL 불러오기")).toHaveValue("");
  await expect(page.getByLabel("입력 DDL")).toHaveValue("mysql");

  const brandMark = page.locator("[data-ds-brand-mark]");
  const generateButton = page.getByRole("button", { name: "생성" });
  const themeToggle = page.getByRole("button", { name: "다크 테마로 전환" });
  await expect(brandMark).toHaveCSS("width", "40px");
  await expect(brandMark).toHaveCSS("height", "40px");
  await expect(generateButton).toHaveCSS("height", "36px");
  await expect(themeToggle).toHaveCSS("width", "36px");
  await expect(themeToggle).toHaveCSS("height", "36px");

  await page.getByLabel("테이블당 행 수").fill("0");
  await expect(generateButton).toBeDisabled();
  expect(await generateButton.evaluate((element) => getComputedStyle(element).opacity)).toBe("1");
});

test("SQL 생성 후 INSERT와 ROLLBACK panel을 실제로 전환한다", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("테이블당 행 수").fill("2");
  await page.getByRole("button", { name: "생성" }).click();

  const tablist = page.getByRole("tablist", { name: "SQL 출력 종류" });
  const insertTab = page.getByRole("tab", { name: "INSERT" });
  const rollbackTab = page.getByRole("tab", { name: "ROLLBACK" });
  const panel = page.getByRole("tabpanel");
  await expect(tablist).toBeVisible();
  await expect(insertTab).toHaveAttribute("aria-selected", "true");
  await expect(panel).toHaveAttribute("aria-labelledby", "insert-tab");
  await expect(panel).toContainText("INSERT INTO");

  await rollbackTab.click();
  await expect(rollbackTab).toHaveAttribute("aria-selected", "true");
  await expect(insertTab).toHaveAttribute("aria-selected", "false");
  await expect(panel).toHaveAttribute("aria-labelledby", "rollback-tab");
  await expect(panel).toContainText("DELETE FROM");

  await expect(page.getByRole("button", { name: "복사" })).toHaveAttribute(
    "data-ds-button",
    "true",
  );
  await expect(page.getByRole("button", { name: "다운로드", exact: true })).toHaveAttribute(
    "data-ds-button",
    "true",
  );
});

test("767px에서 헤더 action이 브랜드와 테마 다음 행에 배치된다", async ({ page }) => {
  await page.setViewportSize({ width: 767, height: 900 });
  await page.goto("/");

  const brand = page.locator("[data-ds-tool-brand]");
  const actions = page.locator("[data-ds-tool-actions]");
  const theme = page.locator("[data-ds-theme-toggle]");
  const [brandBox, actionsBox, themeBox] = await Promise.all([
    brand.boundingBox(),
    actions.boundingBox(),
    theme.boundingBox(),
  ]);

  expect(brandBox).not.toBeNull();
  expect(actionsBox).not.toBeNull();
  expect(themeBox).not.toBeNull();
  expect(Math.abs(brandBox!.y - themeBox!.y)).toBeLessThan(12);
  expect(actionsBox!.y).toBeGreaterThan(brandBox!.y + brandBox!.height);
});
