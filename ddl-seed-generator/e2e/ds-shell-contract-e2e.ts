// 이 파일은 packages/design-system/shell-contract-e2e.ts 에서 생성되었다.
// 직접 편집하지 말고 정본을 고친 뒤 저장소 루트에서
// `npm run design-system:sync` 를 실행한다.
import { expect, type Locator, type Page } from '@playwright/test';

export const VIEWPORTS = [
  { name: 'mobile', width: 375, height: 812 },
  { name: 'tablet-boundary', width: 768, height: 900 },
  { name: 'desktop', width: 1440, height: 900 },
] as const;

export const THEMES = ['light', 'dark'] as const;

export type ViewportCase = (typeof VIEWPORTS)[number];
export type TestTheme = (typeof THEMES)[number];

export interface TestProduct {
  id: string;
  name: string;
}

interface ShellElement {
  clientWidth: number;
  scrollWidth: number;
  lastElementChild?: { hasAttribute(name: string): boolean } | null;
  setAttribute(name: string, value: string): void;
}

interface ShellDocument {
  body: ShellElement;
  documentElement: ShellElement;
  fonts: { ready: Promise<unknown> };
  getAnimations(): { cancel(): void }[];
}

interface ShellEnvironment {
  document: ShellDocument;
  getComputedStyle(element: unknown): {
    width: string;
    height: string;
    strokeWidth: string;
  };
  localStorage: { setItem(key: string, value: string): void };
}

async function box(locator: Locator) {
  const value = await locator.boundingBox();
  expect(value).not.toBeNull();
  return value!;
}

/** 폰트와 동작 효과를 고정한 뒤 요청한 테마로 셸을 준비한다. */
export async function prepareShell(page: Page, theme: TestTheme): Promise<void> {
  await page.addInitScript((value: TestTheme) => {
    const env = globalThis as unknown as ShellEnvironment;
    env.localStorage.setItem('theme', value);
    env.document.documentElement.setAttribute('data-theme', value);
  }, theme);
  await page.goto('/');
  await page.locator('[data-ds-tool-header]').waitFor({ state: 'visible' });
  await page.evaluate(async () => {
    const env = globalThis as unknown as ShellEnvironment;
    await env.document.fonts.ready;
  });
  await page.addStyleTag({
    content:
      '*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}',
  });
  await page.evaluate((value: TestTheme) => {
    const env = globalThis as unknown as ShellEnvironment;
    env.document.documentElement.setAttribute('data-theme', value);
    env.document.getAnimations().forEach((animation) => animation.cancel());
  }, theme);
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
}

/** 실제 브라우저 계산값과 배치로 공통 ToolHeader 계약을 검증한다. */
export async function assertShellContract(
  page: Page,
  product: TestProduct,
  viewport: ViewportCase,
): Promise<void> {
  const rootMetrics = await page.evaluate(() => {
    const env = globalThis as unknown as ShellEnvironment;
    return {
      documentScroll: env.document.documentElement.scrollWidth,
      documentClient: env.document.documentElement.clientWidth,
      bodyScroll: env.document.body.scrollWidth,
      bodyClient: env.document.body.clientWidth,
    };
  });
  expect(rootMetrics.documentScroll).toBeLessThanOrEqual(rootMetrics.documentClient);
  expect(rootMetrics.bodyScroll).toBeLessThanOrEqual(rootMetrics.bodyClient);

  const header = page.locator('[data-ds-tool-header]');
  const heading = header.locator('h1');
  await expect(heading).toHaveCount(1);
  await expect(heading).toHaveText(product.name);

  const brandMark = header.locator('[data-ds-brand-mark]');
  await expect(brandMark).toHaveCSS('width', '40px');
  await expect(brandMark).toHaveCSS('height', '40px');

  const themeToggle = header.locator('[data-ds-theme-toggle]');
  await expect(themeToggle).toHaveCount(1);
  await expect(themeToggle).toHaveCSS('width', '36px');
  await expect(themeToggle).toHaveCSS('height', '36px');

  const commonControls = page.locator('[data-ds-button], [data-ds-segmented]');
  expect(await commonControls.count()).toBeGreaterThan(0);
  for (const control of await commonControls.all()) {
    await expect(control).toHaveCSS('height', '36px');
  }

  const disabledControls = page.locator(
    '[data-ds-button]:disabled, [data-ds-segmented] button:disabled, [data-ds-control][aria-disabled="true"]',
  );
  for (const control of await disabledControls.all()) {
    await expect(control).toHaveCSS('opacity', '1');
  }

  const headerIcons = header.locator('svg');
  expect(await headerIcons.count()).toBeGreaterThan(0);
  for (const icon of await headerIcons.all()) {
    const { markup, ...metrics } = await icon.evaluate((svg) => {
      const env = globalThis as unknown as ShellEnvironment;
      const style = env.getComputedStyle(svg);
      return {
        markup: (svg as unknown as { outerHTML: string }).outerHTML,
        width: style.width,
        height: style.height,
        strokeWidth: style.strokeWidth,
      };
    });
    expect(
      {
        width: metrics.width,
        height: metrics.height,
        strokeWidth: Number.parseFloat(metrics.strokeWidth),
      },
      markup,
    ).toEqual({ width: '16px', height: '16px', strokeWidth: 2 });
  }

  const utilities = header.locator('[data-ds-tool-utilities]');
  expect(
    await utilities.evaluate(
      (element) =>
        (element as unknown as ShellElement).lastElementChild?.hasAttribute(
          'data-ds-theme-toggle',
        ) ?? false,
    ),
  ).toBe(true);

  const brand = await box(header.locator('[data-ds-tool-brand]'));
  const actions = await box(header.locator('[data-ds-tool-actions]'));
  const utility = await box(utilities);
  if (viewport.width < 768) {
    expect(actions.y).toBeGreaterThanOrEqual(
      Math.max(brand.y + brand.height, utility.y + utility.height),
    );
  } else {
    const centers = [
      brand.y + brand.height / 2,
      actions.y + actions.height / 2,
      utility.y + utility.height / 2,
    ];
    expect(Math.max(...centers) - Math.min(...centers)).toBeLessThanOrEqual(4);
  }
}
