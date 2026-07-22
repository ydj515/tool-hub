import { expect, test } from '@playwright/test';

async function fillMonaco(page: import('@playwright/test').Page, label: string, value: string, replace = false) {
  const editor = page.getByLabel(label)
    .locator('xpath=ancestor::div[contains(@class, "monaco-editor")]')
    .locator('.view-lines');
  await editor.click();
  if (replace) await page.keyboard.press('ControlOrMeta+A');
  await page.evaluate(async (source) => (globalThis as typeof globalThis & {
    navigator: { clipboard: { writeText(text: string): Promise<void> } };
  }).navigator.clipboard.writeText(source), value);
  await page.keyboard.press('ControlOrMeta+V');
}

function trackBrowserFailures(page: import('@playwright/test').Page) {
  const failures: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') failures.push(`console: ${message.text()}`);
  });
  page.on('pageerror', (error) => failures.push(`pageerror: ${error.message}`));
  return failures;
}

async function observeScheduledCopyState(page: import('@playwright/test').Page) {
  await page.evaluate(() => {
    type BrowserElement = { textContent: string | null };
    type BrowserButton = BrowserElement & { disabled: boolean };
    const browserGlobal = globalThis as typeof globalThis & {
      __scheduledCopyDisabled?: Promise<boolean>;
      document: {
        body: object;
        querySelector(selector: string): BrowserButton | null;
      };
      MutationObserver: new (callback: () => void) => {
        disconnect(): void;
        observe(target: object, options: { childList: boolean; characterData: boolean; subtree: boolean }): void;
      };
    };
    browserGlobal.__scheduledCopyDisabled = new Promise((resolve) => {
      const observer = new browserGlobal.MutationObserver(() => {
        const status = browserGlobal.document.querySelector('.status-bar');
        if (!status?.textContent?.includes('변환 준비 중')) return;
        const copyButton = browserGlobal.document.querySelector('button[aria-label="결과 복사"]');
        if (!copyButton) return;
        resolve(copyButton.disabled);
        observer.disconnect();
      });
      observer.observe(browserGlobal.document.body, { childList: true, characterData: true, subtree: true });
    });
  });
}

async function readScheduledCopyState(page: import('@playwright/test').Page): Promise<boolean> {
  return page.evaluate(() => {
    const browserGlobal = globalThis as typeof globalThis & { __scheduledCopyDisabled?: Promise<boolean> };
    if (!browserGlobal.__scheduledCopyDisabled) throw new Error('scheduled copy observer가 설치되지 않았습니다.');
    return browserGlobal.__scheduledCopyDisabled;
  });
}

test.beforeEach(async ({ context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: 'http://127.0.0.1:4173' });
});

test('JSON과 YAML을 양방향 변환하고 형식별 Pretty를 제공한다', async ({ page }) => {
  const failures = trackBrowserFailures(page);
  await page.goto('/');
  await fillMonaco(page, 'JSON 원본', '{"name":"tool-hub"}');
  await expect(page.getByRole('region', { name: '결과 편집기' }).locator('.view-lines')).toContainText('name: tool-hub');
  await expect(page.getByRole('button', { name: 'JSON Pretty' })).toBeVisible();

  await page.getByRole('button', { name: '변환 방향 전환' }).click();
  await expect(page.getByRole('button', { name: 'YAML Pretty' })).toBeVisible();
  await expect(page.getByRole('region', { name: '결과 편집기' }).locator('.view-lines')).toContainText('"name": "tool-hub"');
  expect(failures).toEqual([]);
});

test('첨부 AsyncAPI 예제를 현재 방향에 맞게 불러온다', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '예제 불러오기' }).click();
  await expect(page.getByRole('region', { name: '원본 편집기' }).locator('.view-lines'))
    .toContainText('"title": "Streetlights Kafka API"');
  await expect(page.getByRole('region', { name: '결과 편집기' }).locator('.view-lines'))
    .toContainText('title: Streetlights Kafka API');

  await page.getByRole('radio', { name: 'YAML → JSON' }).click();
  await page.getByRole('button', { name: '예제 불러오기' }).click();
  await expect(page.getByRole('region', { name: '원본 편집기' }).locator('.view-lines'))
    .toContainText('title: Streetlights Kafka API');
  await expect(page.getByRole('region', { name: '결과 편집기' }).locator('.view-lines'))
    .toContainText('"title": "Streetlights Kafka API"');
});

test('편집기 액션을 접근 가능한 36px 아이콘 버튼으로 표시한다', async ({ page }) => {
  await page.goto('/');

  for (const name of ['JSON Pretty', '결과 복사', '결과 다운로드']) {
    const action = page.getByRole('button', { name, exact: true });
    await expect(action).toHaveAttribute('title', name);
    await expect(action).toHaveCSS('width', '36px');
    await expect(action).toHaveCSS('height', '36px');
    await expect(action.locator('svg')).toHaveCount(1);
  }
});

test('빈 화면에서 YAML → JSON 방향을 직접 선택하고 scheduled 상태를 거쳐 변환한다', async ({ page }) => {
  const failures = trackBrowserFailures(page);
  await page.goto('/');
  await page.getByRole('radio', { name: 'YAML → JSON' }).click();
  await observeScheduledCopyState(page);
  await fillMonaco(page, 'YAML 원본', 'name: tool-hub');
  expect(await readScheduledCopyState(page)).toBe(true);
  await expect(page.getByRole('region', { name: '결과 편집기' }).locator('.view-lines')).toContainText('"name": "tool-hub"');
  await expect(page.getByRole('button', { name: '결과 복사' })).toBeEnabled();
  expect(failures).toEqual([]);
});

test('첫 문법 오류를 marker와 행·열 메시지로 표시하고 진단에 포커스한다', async ({ page }) => {
  const failures = trackBrowserFailures(page);
  await page.goto('/');
  await fillMonaco(page, 'JSON 원본', '{\n  "enabled" true\n}');
  await expect(page.getByTestId('diagnostic-banner')).toContainText('2행 13열');
  await expect(page.locator('.monaco-editor .squiggly-error')).toHaveCount(1);
  const sourceEditor = page.getByLabel('JSON 원본')
    .locator('xpath=ancestor::div[contains(@class, "monaco-editor")]');
  const gutterGlyph = sourceEditor.locator('.glyph-margin-widgets .json-yaml-converter-glyph-error');
  const invalidLine = sourceEditor.locator('.view-line').filter({ hasText: '"enabled" true' });
  await expect(gutterGlyph).toHaveCount(1);
  await expect(invalidLine).toHaveCount(1);
  await expect.poll(async () => {
    const glyphBox = await gutterGlyph.boundingBox();
    const lineBox = await invalidLine.boundingBox();
    return glyphBox && lineBox
      ? Math.abs((glyphBox.y + glyphBox.height / 2) - (lineBox.y + lineBox.height / 2))
      : Number.POSITIVE_INFINITY;
  }).toBeLessThanOrEqual(1);
  await page.getByTestId('diagnostic-banner').getByRole('button').click();
  await expect(page.getByLabel('JSON 원본')).toBeFocused();
  expect(failures).toEqual([]);
});

test('오류 입력은 stale 결과와 위험한 결과 작업을 차단한다', async ({ page }) => {
  const failures = trackBrowserFailures(page);
  await page.goto('/');
  await fillMonaco(page, 'JSON 원본', '{"a":1}');
  await expect(page.getByRole('button', { name: '결과 복사' })).toBeEnabled();

  await fillMonaco(page, 'JSON 원본', '{\n  "enabled" true\n}', true);
  await expect(page.getByText('현재 입력과 동기화되지 않은 결과')).toBeVisible();
  await expect(page.getByRole('button', { name: '결과 복사' })).toBeDisabled();
  await expect(page.getByRole('button', { name: '결과 다운로드' })).toBeDisabled();
  await expect(page.getByRole('button', { name: '변환 방향 전환' })).toBeDisabled();
  expect(failures).toEqual([]);
});

test('YAML 파일을 열고 JSON 결과를 다운로드한다', async ({ page }) => {
  const failures = trackBrowserFailures(page);
  await page.goto('/');
  await page.getByLabel('JSON 또는 YAML 파일 열기').setInputFiles({
    name: 'config.yaml',
    mimeType: 'application/yaml',
    buffer: Buffer.from('name: tool-hub\n'),
  });
  await expect(page.getByRole('button', { name: 'YAML Pretty' })).toBeVisible();
  await expect(page.getByRole('button', { name: '결과 다운로드' })).toBeEnabled();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: '결과 다운로드' }).click();
  expect((await downloadPromise).suggestedFilename()).toBe('converted.json');
  expect(failures).toEqual([]);
});

test('최신 결과만 클립보드에 복사하고 로컬 Monaco worker를 사용한다', async ({ context, page }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: 'http://127.0.0.1:4173' });
  const failures = trackBrowserFailures(page);
  await page.goto('/');
  await expect.poll(() => page.evaluate(() => Boolean((globalThis as typeof globalThis & {
    MonacoEnvironment?: { getWorker?: unknown };
  }).MonacoEnvironment?.getWorker))).toBe(true);
  await fillMonaco(page, 'JSON 원본', '{"copy":true}');
  await expect(page.getByRole('button', { name: '결과 복사' })).toBeEnabled();
  await page.getByRole('button', { name: '결과 복사' }).click();
  await expect.poll(() => page.evaluate(() => (globalThis as typeof globalThis & {
    navigator: { clipboard: { readText(): Promise<string> } };
  }).navigator.clipboard.readText())).toBe('copy: true\n');
  expect(failures).toEqual([]);
});
