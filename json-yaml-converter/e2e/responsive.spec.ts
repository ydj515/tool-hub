import { expect, test } from '@playwright/test';

async function fillMonaco(page: import('@playwright/test').Page, label: string, value: string) {
  const editor = page.getByLabel(label)
    .locator('xpath=ancestor::div[contains(@class, "monaco-editor")]')
    .locator('.view-lines');
  await editor.click();
  await page.evaluate(async (source) => (globalThis as typeof globalThis & {
    navigator: { clipboard: { writeText(text: string): Promise<void> } };
  }).navigator.clipboard.writeText(source), value);
  await page.keyboard.press('ControlOrMeta+V');
}

type Rgb = { red: number; green: number; blue: number; alpha: number };
type BrowserElement = { parentElement: BrowserElement | null };
type BrowserStyles = {
  color: string;
  backgroundColor: string;
  borderTopColor: string;
  outlineColor: string;
  outlineStyle: string;
  outlineWidth: string;
  backgroundImage: string;
};
type BrowserWindow = { getComputedStyle(element: BrowserElement): BrowserStyles };

function parseColor(color: string): Rgb {
  const match = color.match(/^rgba?\(([^)]+)\)$/);
  if (!match) throw new Error(`지원하지 않는 계산 색상: ${color}`);
  const [red, green, blue, alpha = '1'] = match[1].split(',').map((value) => value.trim());
  return { red: Number(red), green: Number(green), blue: Number(blue), alpha: Number(alpha) };
}

function composite(foreground: Rgb, background: Rgb): Rgb {
  const alpha = foreground.alpha + background.alpha * (1 - foreground.alpha);
  if (alpha === 0) return { red: 0, green: 0, blue: 0, alpha: 0 };
  return {
    red: (foreground.red * foreground.alpha + background.red * background.alpha * (1 - foreground.alpha)) / alpha,
    green: (foreground.green * foreground.alpha + background.green * background.alpha * (1 - foreground.alpha)) / alpha,
    blue: (foreground.blue * foreground.alpha + background.blue * background.alpha * (1 - foreground.alpha)) / alpha,
    alpha,
  };
}

function relativeLuminance(color: Rgb) {
  const linear = (channel: number) => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * linear(color.red) + 0.7152 * linear(color.green) + 0.0722 * linear(color.blue);
}

function contrast(foreground: Rgb, background: Rgb) {
  const foregroundLuminance = relativeLuminance(foreground);
  const backgroundLuminance = relativeLuminance(background);
  return (Math.max(foregroundLuminance, backgroundLuminance) + 0.05)
    / (Math.min(foregroundLuminance, backgroundLuminance) + 0.05);
}

async function computedColors(locator: import('@playwright/test').Locator) {
  return locator.evaluate((element) => {
    const browserElement = element as unknown as BrowserElement;
    const browserWindow = globalThis as typeof globalThis & BrowserWindow;
    const styles = browserWindow.getComputedStyle(browserElement);
    const backgrounds: string[] = [];
    let current: BrowserElement | null = browserElement;
    while (current) {
      backgrounds.push(browserWindow.getComputedStyle(current).backgroundColor);
      current = current.parentElement;
    }
    return {
      color: styles.color,
      background: styles.backgroundColor,
      border: styles.borderTopColor,
      outline: {
        color: styles.outlineColor,
        style: styles.outlineStyle,
        width: styles.outlineWidth,
      },
      backgroundImage: styles.backgroundImage,
      backgrounds,
    };
  });
}

function firstGradientStop(backgroundImage: string) {
  const colors = backgroundImage.match(/rgba?\([^)]+\)/g) ?? [];
  const first = colors.at(0);
  if (!first) throw new Error(`gradient 색상을 찾지 못했습니다: ${backgroundImage}`);
  return parseColor(first);
}

function compositeBackground(backgrounds: string[]) {
  return [...backgrounds].reverse().reduce(
    (composited, background) => composite(parseColor(background), composited),
    { red: 0, green: 0, blue: 0, alpha: 0 },
  );
}

async function enterInvalidJson(page: import('@playwright/test').Page) {
  const editor = page.getByLabel('JSON 원본')
    .locator('xpath=ancestor::div[contains(@class, "monaco-editor")]')
    .locator('.view-lines');
  await editor.click();
  await page.keyboard.type('{"enabled" true}');
  await expect(page.getByTestId('diagnostic-banner')).toBeVisible();
}

test('데스크톱에서 원본과 결과를 동시에 표시한다', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');
  await expect(page.getByRole('region', { name: '원본 편집기' })).toBeVisible();
  await expect(page.getByRole('region', { name: '결과 편집기' })).toBeVisible();
  await expect(page.getByRole('tablist')).toBeHidden();
});

test('768px에서 데스크톱 레이아웃을 유지한다', async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 800 });
  await page.goto('/');
  await expect(page.getByRole('tablist')).toBeHidden();
  await expect(page.getByRole('region', { name: '결과 편집기' })).toBeVisible();
});

test('767px에서 모바일 탭 레이아웃으로 전환한다', async ({ page }) => {
  await page.setViewportSize({ width: 767, height: 800 });
  await page.goto('/');
  await expect(page.getByRole('tablist')).toBeVisible();
  await expect(page.getByRole('tabpanel', { name: '원본' })).toBeVisible();
});

test('768px 미만에서 원본과 결과를 탭으로 전환하고 입력 뒤에도 원본 탭을 보존한다', async ({ context, page }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: 'http://127.0.0.1:4173' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.getByRole('tablist')).toBeVisible();
  await expect(page.getByRole('tab', { name: /원본/ })).toHaveAttribute('aria-selected', 'true');

  await fillMonaco(page, 'JSON 원본', '{"mobile":true}');
  await expect(page.getByLabel('JSON 원본')
    .locator('xpath=ancestor::div[contains(@class, "monaco-editor")]')
    .locator('.view-lines')).toContainText('"mobile":true');
  await expect(page.getByRole('tab', { name: /원본/ })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('tab', { name: /결과/ })).toContainText('변환 완료');

  await page.getByRole('tab', { name: /결과/ }).click();
  await expect(page.getByRole('tabpanel', { name: '결과' })).toBeVisible();
});

test('테마 버튼이 data-theme을 전환한다', async ({ page }) => {
  await page.goto('/');
  const before = await page.locator('html').getAttribute('data-theme');
  await page.getByRole('button', { name: '테마 전환' }).click();
  await expect(page.locator('html')).not.toHaveAttribute('data-theme', before ?? 'light');
});

for (const theme of ['light', 'dark'] as const) {
  test(`${theme} 테마의 진단과 활성 control은 WCAG 대비를 충족한다`, async ({ page }) => {
    await page.goto('/');
    if (theme === 'dark') await page.getByRole('button', { name: '테마 전환' }).click();
    const selectedDirection = await computedColors(page.getByRole('radio', { name: 'JSON → YAML', exact: true }));
    const unselectedDirection = await computedColors(page.getByRole('radio', { name: 'YAML → JSON', exact: true }));
    const selectedDirectionBackground = compositeBackground(selectedDirection.backgrounds);
    const unselectedDirectionBackground = compositeBackground(unselectedDirection.backgrounds);
    expect(contrast(parseColor(selectedDirection.color), selectedDirectionBackground)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(selectedDirectionBackground, unselectedDirectionBackground)).toBeGreaterThanOrEqual(3);

    if (theme === 'light') await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    const selectedRadio = page.getByRole('radio', { name: 'JSON → YAML', exact: true });
    await expect(selectedRadio).toBeFocused();
    const focusedDirection = await computedColors(selectedRadio);
    expect(focusedDirection.outline.style).toBe('solid');
    expect(Number.parseFloat(focusedDirection.outline.width)).toBeGreaterThanOrEqual(2);
    expect(contrast(parseColor(focusedDirection.outline.color), unselectedDirectionBackground)).toBeGreaterThanOrEqual(3);

    await enterInvalidJson(page);

    const diagnostic = await computedColors(page.getByTestId('diagnostic-banner'));
    const diagnosticBackground = compositeBackground(diagnostic.backgrounds);
    expect(contrast(parseColor(diagnostic.color), diagnosticBackground)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(composite(parseColor(diagnostic.border), diagnosticBackground), diagnosticBackground)).toBeGreaterThanOrEqual(3);

    const secondary = await computedColors(page.getByRole('button', { name: '예제 불러오기', exact: true }));
    const secondaryBackground = compositeBackground(secondary.backgrounds);
    expect(contrast(parseColor(secondary.color), secondaryBackground)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(composite(parseColor(secondary.border), secondaryBackground), secondaryBackground)).toBeGreaterThanOrEqual(3);

    const sourceEditor = page.getByLabel('JSON 원본')
      .locator('xpath=ancestor::div[contains(@class, "monaco-editor")]');
    const gutterGlyph = sourceEditor.locator('.glyph-margin-widgets .json-yaml-converter-glyph-error');
    await expect(gutterGlyph).toHaveCount(1);
    const glyph = await computedColors(gutterGlyph);
    const glyphMargin = await computedColors(sourceEditor.locator('.glyph-margin'));
    const glyphMarginBackground = compositeBackground(glyphMargin.backgrounds);
    const glyphSolidStop = firstGradientStop(glyph.backgroundImage);
    expect(glyphSolidStop.alpha).toBeCloseTo(1, 10);
    expect(contrast(glyphSolidStop, glyphMarginBackground)).toBeGreaterThanOrEqual(3);
  });
}
