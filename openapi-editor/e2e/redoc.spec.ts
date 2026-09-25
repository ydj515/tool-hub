import { expect, test, type Page } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import { sampleDocumentFor } from '../src/data/spec-samples';
import type { SpecFamily } from '../src/domain/document';

async function loadDocument(page: Page, version: SpecFamily) {
  await page.goto('/');
  await page.locator('input[type="file"]').setInputFiles({
    name: 'tasks.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(sampleDocumentFor(version))),
  });
  await expect(page.getByText('검증 완료')).toBeVisible();
}

for (const version of ['swagger-2.0', 'openapi-3.0', 'openapi-3.1'] as const) {
  test(`exports ${version} as a working offline ReDoc HTML file`, async ({ page, browser }, testInfo) => {
    await loadDocument(page, version);
    await page.getByLabel('더보기 메뉴', { exact: true }).click();
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('menuitem', { name: 'HTML 명세서 다운로드' }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe('tasks.html');
    const path = testInfo.outputPath('tasks.html');
    await download.saveAs(path);
    const offlineContext = await browser.newContext({ offline: true });
    const offlinePage = await offlineContext.newPage();
    const network: string[] = [];
    offlinePage.on('request', (request) => { if (/^https?:/.test(request.url())) network.push(request.url()); });
    await offlinePage.goto(pathToFileURL(path).href);
    await expect(offlinePage.getByRole('heading', { name: /Task API/ })).toBeVisible();
    await expect(offlinePage.getByRole('heading', { name: '작업 목록 조회' })).toBeVisible();
    await expect(offlinePage.getByRole('alert')).not.toBeVisible();
    expect(network).toEqual([]);
    await offlineContext.close();
  });
}

test('switches previews without changing the source document', async ({ page }) => {
  await loadDocument(page, 'openapi-3.1');
  await page.getByRole('button', { name: 'ReDoc', exact: true }).click();
  await expect(page.getByRole('button', { name: 'ReDoc', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.frameLocator('iframe[title="ReDoc 명세서"]').getByRole('heading', { name: /Task API/ })).toBeVisible();
  await page.getByRole('button', { name: 'Swagger UI', exact: true }).click();
  await expect(page.locator('.swagger-preview .title')).toContainText('Task API');
  await expect(page.getByText('검증 완료')).toBeVisible();
});

test('explains unsupported OpenAPI 3.2 in preview and export without downloading', async ({ page }) => {
  await loadDocument(page, 'openapi-3.2');
  const downloads: string[] = [];
  page.on('download', (download) => downloads.push(download.suggestedFilename()));
  await page.getByRole('button', { name: 'ReDoc', exact: true }).click();
  await expect(page.getByLabel('API 미리보기').getByRole('alert')).toContainText('현재 버전은 지원하지 않습니다.');
  await page.getByRole('button', { name: 'Swagger UI', exact: true }).click();
  await page.getByLabel('더보기 메뉴', { exact: true }).click();
  await page.getByRole('menuitem', { name: 'HTML 명세서 다운로드' }).click();
  await expect(page.getByRole('alert').filter({ hasText: '현재 버전은 지원하지 않습니다.' })).toBeVisible();
  await expect(page.locator('.swagger-preview .title')).toContainText('Task API');
  expect(downloads).toEqual([]);
});

test('keeps full-page file drops working inside the ReDoc frame', async ({ page }) => {
  await loadDocument(page, 'openapi-3.1');
  await page.getByRole('button', { name: 'ReDoc', exact: true }).click();
  const frame = page.frameLocator('iframe[title="ReDoc 명세서"]');
  await expect(frame.getByRole('heading', { name: /Task API/ })).toBeVisible();
  await page.locator('body').evaluate((body) => {
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(new File(['{}'], 'dropped.json'));
    body.dispatchEvent(new DragEvent('dragenter', { bubbles: true, dataTransfer }));
  });
  await expect(page.locator('.file-drop-overlay')).toBeVisible();
  await frame.locator('body').evaluate((body) => {
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(new File(['{"openapi":"3.1.2","info":{"title":"Dropped API","version":"1.0.0"},"paths":{}}'], 'dropped.json', { type: 'application/json' }));
    body.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer }));
  });
  await expect(frame.getByRole('heading', { name: /Dropped API/ })).toBeVisible();
  await expect(page.locator('.file-drop-overlay')).not.toBeVisible();
  await expect(page.getByText('검증 완료')).toBeVisible();
});

test('disables HTML export when the latest source is invalid', async ({ page }) => {
  await loadDocument(page, 'openapi-3.1');
  await page.locator('input[type="file"]').setInputFiles({ name: 'invalid.yaml', mimeType: 'application/yaml', buffer: Buffer.from('openapi: [') });
  await expect(page.getByText('오류 있음')).toBeVisible();
  await page.getByLabel('더보기 메뉴', { exact: true }).click();
  await expect(page.getByRole('menuitem', { name: 'HTML 명세서 다운로드' })).toBeDisabled();
});

test('renders Markdown without executing embedded HTML in the downloaded document', async ({ page, browser }, testInfo) => {
  await page.goto('/');
  const document = sampleDocumentFor('openapi-3.1');
  document.info = { title: 'Safe API', version: '1.0.0', description: '**Markdown 설명**\n\n<img src="data:image/png;base64,AA" onerror="window.compromised=true"><script>window.compromised=true</script>' };
  await page.locator('input[type="file"]').setInputFiles({ name: 'safe.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(document)) });
  await expect(page.getByText('검증 완료')).toBeVisible();
  await page.getByLabel('더보기 메뉴', { exact: true }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('menuitem', { name: 'HTML 명세서 다운로드' }).click();
  const file = testInfo.outputPath('safe.html');
  await (await downloadPromise).saveAs(file);
  const context = await browser.newContext({ offline: true });
  const documentPage = await context.newPage();
  await documentPage.goto(pathToFileURL(file).href);
  await expect(documentPage.locator('strong').filter({ hasText: 'Markdown 설명' })).toBeVisible();
  expect(await documentPage.evaluate(() => Reflect.get(window, 'compromised'))).toBeUndefined();
  await expect(documentPage.locator('#redoc-container [onerror], #redoc-container script')).toHaveCount(0);
  await context.close();
});

for (const width of [375, 768, 1440]) {
  test(`shows the ReDoc switch and document at ${width}px in both themes`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await loadDocument(page, 'openapi-3.1');
    if (width < 768) await page.getByRole('tab', { name: '미리보기', exact: true }).click();
    const mode = page.getByRole('button', { name: 'ReDoc', exact: true });
    await mode.click();
    const frame = page.frameLocator('iframe[title="ReDoc 명세서"]');
    await expect(frame.getByRole('heading', { name: /Task API/ })).toBeVisible();
    expect((await page.locator('iframe[title="ReDoc 명세서"]').boundingBox())!.height).toBeGreaterThanOrEqual(480);
    const bounds = await mode.boundingBox();
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
    await page.screenshot({ path: testInfo.outputPath('redoc-light.png') });
    await page.getByRole('button', { name: '다크 테마로 전환' }).click();
    await expect(frame.getByRole('heading', { name: /Task API/ })).toBeVisible();
    await expect(frame.locator('body')).toHaveCSS('background-color', 'rgb(25, 27, 32)');
    await page.screenshot({ path: testInfo.outputPath('redoc-dark.png') });
  });
}
