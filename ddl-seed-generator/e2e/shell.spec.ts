import { expect, test } from "@playwright/test";
import type { Locator } from "@playwright/test";

async function expectActiveSqlTab(
  activeTab: Locator,
  inactiveTab: Locator,
  panel: Locator,
  labelledBy: string,
  sqlText: string,
) {
  await expect(activeTab).toBeFocused();
  await expect(activeTab).toHaveAttribute("aria-selected", "true");
  await expect(activeTab).toHaveAttribute("tabindex", "0");
  await expect(inactiveTab).toHaveAttribute("aria-selected", "false");
  await expect(inactiveTab).toHaveAttribute("tabindex", "-1");
  await expect(panel).toHaveAttribute("aria-labelledby", labelledBy);
  await expect(panel).toContainText(sqlText);
}

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

test("SQL 출력 탭은 활성 탭만 Tab 순서에 포함한다", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("테이블당 행 수").fill("2");
  await page.getByRole("button", { name: "생성" }).click();

  const insertTab = page.getByRole("tab", { name: "INSERT" });
  const rollbackTab = page.getByRole("tab", { name: "ROLLBACK" });

  await expect(insertTab).toHaveAttribute("tabindex", "0");
  await expect(rollbackTab).toHaveAttribute("tabindex", "-1");
});

test("SQL 출력 탭은 방향키와 Home/End로 선택과 포커스를 함께 이동한다", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("테이블당 행 수").fill("2");
  await page.getByRole("button", { name: "생성" }).click();

  const insertTab = page.getByRole("tab", { name: "INSERT" });
  const rollbackTab = page.getByRole("tab", { name: "ROLLBACK" });
  const panel = page.getByRole("tabpanel");

  await insertTab.focus();
  await page.keyboard.press("ArrowLeft");
  await expectActiveSqlTab(
    rollbackTab,
    insertTab,
    panel,
    "rollback-tab",
    "DELETE FROM",
  );

  await page.keyboard.press("ArrowRight");
  await expectActiveSqlTab(insertTab, rollbackTab, panel, "insert-tab", "INSERT INTO");

  await page.keyboard.press("End");
  await expectActiveSqlTab(
    rollbackTab,
    insertTab,
    panel,
    "rollback-tab",
    "DELETE FROM",
  );

  await page.keyboard.press("Home");
  await expectActiveSqlTab(insertTab, rollbackTab, panel, "insert-tab", "INSERT INTO");
});

test("DDL 편집기의 접근성 이름과 자동완성 보조 문구를 한국어로 표시한다", async ({ page }) => {
  await page.goto("/");

  const editor = page.getByRole("textbox", { name: "DDL 편집기" });
  await expect(editor).toHaveAttribute("aria-label", "DDL 편집기");
  await page.locator(".monaco-editor").click();
  await page.keyboard.press("Control+End");
  await page.keyboard.press("Enter");
  await page.keyboard.type("use");

  await expect(
    page.getByRole("button", { name: /34행, 1열 지원하지 않는 SQL 문입니다/ }),
  ).toBeVisible();
  await page.locator(".monaco-editor").click();
  await page.keyboard.press("Control+End");
  await page.keyboard.press("Control+Space");

  const suggestions = page.locator(".suggest-widget");
  await expect(suggestions).toBeVisible();
  await expect(suggestions).toContainText("users");
  await expect(suggestions).toContainText("테이블");
  await expect(suggestions).not.toContainText("table");
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
