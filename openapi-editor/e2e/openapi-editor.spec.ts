import { expect, test, type Page } from '@playwright/test';
import { parse } from 'yaml';

async function downloadSample(page: Page, label: string): Promise<{ filename: string; document: Record<string, unknown> }> {
  await page.getByLabel('샘플 메뉴', { exact: true }).hover();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('menuitem', { name: `${label} 샘플 다운로드` }).click();
  const download = await downloadPromise;
  const stream = await download.createReadStream();
  if (!stream) throw new Error('샘플 다운로드 스트림을 만들 수 없습니다.');
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  return { filename: download.suggestedFilename(), document: parse(Buffer.concat(chunks).toString('utf8')) as Record<string, unknown> };
}

async function enterValidYaml(page: Page): Promise<void> {
  await page.locator('.monaco-editor').click();
  await page.keyboard.press('ControlOrMeta+A');
  await page.keyboard.insertText('openapi: 3.1.2');
  await page.keyboard.press('Enter');
  await page.keyboard.insertText('info:');
  await page.keyboard.press('Enter');
  await page.keyboard.press('Tab');
  await page.keyboard.insertText('title: Pets');
  await page.keyboard.press('Enter');
  await page.keyboard.insertText('version: 1.0.0');
  await page.keyboard.press('Enter');
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.insertText('paths: {}');
  await expect(page.getByText('검증 완료')).toBeVisible();
}

test('edits a YAML OpenAPI document and keeps the browser-only workspace visible', async ({ page }) => {
  await page.goto('/');
  await page.locator('.monaco-editor').click();
  await page.keyboard.press('ControlOrMeta+A');
  await page.keyboard.insertText('openapi: 3.1.2');
  await page.keyboard.press('Enter');
  await page.keyboard.insertText('info:');
  await page.keyboard.press('Enter');
  await page.keyboard.press('Tab');
  await page.keyboard.insertText('title: Pets');
  await page.keyboard.press('Enter');
  await page.keyboard.insertText('version: 1.0.0');
  await page.keyboard.press('Enter');
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.insertText('paths: {}');
  await expect(page.getByText('검증 완료')).toBeVisible();
  await expect(page.getByText('문서는 브라우저 밖으로 전송되지 않습니다.')).toBeVisible();
});

test('uses mobile workspace tabs', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('tab', { name: '미리보기' }).click();
  await expect(page.getByLabel('API 미리보기')).toBeVisible();
});

test('keeps mobile header controls on intentional rows', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const theme = page.getByLabel('테마 전환', { exact: true });
  const target = page.getByLabel('대상 버전', { exact: true });
  const upload = page.getByLabel('파일 업로드', { exact: true });
  const convert = page.getByRole('button', { name: '변환', exact: true });
  const exportMenu = page.getByLabel('내보내기 메뉴', { exact: true });
  const [themeBox, targetBox, uploadBox, convertBox, exportBox] = await Promise.all([
    theme.boundingBox(), target.boundingBox(), upload.boundingBox(), convert.boundingBox(), exportMenu.boundingBox(),
  ]);
  if (!themeBox || !targetBox || !uploadBox || !convertBox || !exportBox) throw new Error('모바일 헤더의 위치를 읽을 수 없습니다.');

  expect(themeBox.y).toBeLessThan(targetBox.y);
  expect(uploadBox.y).toBe(targetBox.y);
  expect(convertBox.y).toBe(targetBox.y);
  expect(uploadBox.height).toBe(36);
  expect(exportBox.y).toBeGreaterThan(targetBox.y + targetBox.height);
});

test('moves the target selector above action buttons on narrow mobile screens', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 844 });
  await page.goto('/');
  const target = page.getByLabel('대상 버전', { exact: true });
  const upload = page.getByLabel('파일 업로드', { exact: true });
  const convert = page.getByRole('button', { name: '변환', exact: true });
  const [targetBox, uploadBox, convertBox] = await Promise.all([target.boundingBox(), upload.boundingBox(), convert.boundingBox()]);
  if (!targetBox || !uploadBox || !convertBox) throw new Error('좁은 모바일 헤더의 위치를 읽을 수 없습니다.');

  expect(targetBox.y).toBeLessThan(uploadBox.y);
  expect(uploadBox.y).toBe(convertBox.y);
});

test('keeps the editor format menu inside the mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByLabel('형식 메뉴', { exact: true }).click();
  const menuBox = await page.getByRole('menu', { name: '형식 작업' }).boundingBox();
  if (!menuBox) throw new Error('형식 메뉴의 위치를 읽을 수 없습니다.');

  expect(menuBox.x).toBeGreaterThanOrEqual(0);
  expect(menuBox.x + menuBox.width).toBeLessThanOrEqual(390);
});

test('opens the export menu on hover and downloads YAML directly', async ({ page }) => {
  await page.goto('/');
  await enterValidYaml(page);

  await page.getByLabel('내보내기 메뉴', { exact: true }).hover();
  await expect(page.getByRole('menu', { name: '내보내기 작업' })).toBeVisible();

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('menuitem', { name: 'YAML 다운로드' }).click();
  expect((await downloadPromise).suggestedFilename()).toBe('openapi.yaml');
});

const sampleVersions = [
  ['Swagger 2.0', 'swagger-2.0-sample.yaml', 'swagger', '2.0'],
  ['OpenAPI 3.0.4', 'openapi-3.0-sample.yaml', 'openapi', '3.0.4'],
  ['OpenAPI 3.1.2', 'openapi-3.1-sample.yaml', 'openapi', '3.1.2'],
  ['OpenAPI 3.2.0', 'openapi-3.2-sample.yaml', 'openapi', '3.2.0'],
];

for (const [label, filename, versionKey, expectedVersion] of sampleVersions) {
  test(`downloads the ${label} sample as valid YAML`, async ({ page }) => {
    await page.goto('/');

    const sample = await downloadSample(page, label);

    expect(sample.filename).toBe(filename);
    expect(sample.document).toMatchObject({ [versionKey]: expectedVersion, info: { title: 'Task API' }, paths: expect.any(Object) });
  });
}

test('separates desktop topbar actions into primary and secondary rows', async ({ page }) => {
  await page.goto('/');
  const primaryActions = page.getByLabel('핵심 작업');
  const secondaryActions = page.getByLabel('보조 작업');
  const primaryBox = await primaryActions.boundingBox();
  const secondaryBox = await secondaryActions.boundingBox();

  expect(primaryBox).not.toBeNull();
  expect(secondaryBox).not.toBeNull();
  expect(secondaryBox!.y).toBeGreaterThan(primaryBox!.y + primaryBox!.height);

  const controls = [
    page.locator('.document-meta .file-chip'),
    page.locator('.document-meta .version-chip'),
    page.getByLabel('대상 버전', { exact: true }),
    page.getByLabel('파일 업로드', { exact: true }),
    page.getByRole('button', { name: '변환', exact: true }),
    page.getByLabel('테마 전환', { exact: true }),
    page.getByLabel('내보내기 메뉴', { exact: true }),
    page.getByLabel('샘플 메뉴', { exact: true }),
    page.getByLabel('원본 복원', { exact: true }),
  ];

  for (const control of controls) {
    const box = await control.boundingBox();
    expect(box?.height).toBe(36);
  }

  await expect(page.getByLabel('테마 전환', { exact: true })).toBeVisible();
  expect(await primaryActions.getByLabel('테마 전환', { exact: true }).count()).toBe(0);
  await expect(page.getByLabel('형식 메뉴', { exact: true }).locator('xpath=ancestor::header[contains(@class, "editor-header")]')).toBeVisible();
});

test('reveals utility actions from the format, export, and sample menus', async ({ page }) => {
  await page.goto('/');

  await page.getByLabel('형식 메뉴', { exact: true }).hover();
  await expect(page.getByRole('menuitem', { name: 'YAML로 변환', exact: true })).toBeVisible();
  await expect(page.getByRole('menuitem', { name: 'YAML로 읽기', exact: true })).toBeVisible();

  await page.getByLabel('내보내기 메뉴', { exact: true }).hover();
  await expect(page.getByRole('menuitem', { name: 'YAML로 변환', exact: true })).not.toBeVisible();
  await expect(page.getByRole('menuitem', { name: 'YAML 다운로드', exact: true })).toBeVisible();
  await expect(page.getByRole('menuitem', { name: 'JSON 다운로드', exact: true })).toBeVisible();

  await page.getByLabel('샘플 메뉴', { exact: true }).hover();
  await expect(page.getByRole('menuitem', { name: 'YAML 다운로드', exact: true })).not.toBeVisible();
  await expect(page.getByRole('menuitem', { name: 'Swagger 2.0 샘플 다운로드', exact: true })).toBeVisible();
  await expect(page.getByRole('menuitem', { name: 'OpenAPI 3.2.0 샘플 다운로드', exact: true })).toBeVisible();
});

test('keeps the sample menu open while moving the pointer to its items', async ({ page }) => {
  await page.goto('/');
  const trigger = page.getByLabel('샘플 메뉴', { exact: true });
  const menu = page.getByRole('menu', { name: '샘플 작업' });

  await trigger.hover();
  await expect(menu).toBeVisible();
  const triggerBox = await trigger.boundingBox();
  const menuBox = await menu.boundingBox();
  if (!triggerBox || !menuBox) throw new Error('샘플 메뉴 위치를 읽을 수 없습니다.');

  await page.mouse.move(triggerBox.x + triggerBox.width / 2, triggerBox.y + triggerBox.height / 2);
  await page.mouse.move(menuBox.x + menuBox.width / 2, menuBox.y + 8, { steps: 12 });

  await expect(menu).toBeVisible();
  await expect(page.getByRole('menuitem', { name: 'Swagger 2.0 샘플 다운로드' })).toBeVisible();
});

test('converts a valid document to JSON from the format menu', async ({ page }) => {
  await page.goto('/');
  await enterValidYaml(page);

  await page.getByLabel('형식 메뉴', { exact: true }).hover();
  await page.getByRole('menuitem', { name: 'JSON으로 변환', exact: true }).click();

  await expect(page.locator('.format-badge')).toHaveText('JSON');
});

test('resizes the preview panel from its divider', async ({ page }) => {
  await page.goto('/');
  const previewPanel = page.locator('.preview-panel');
  const resizer = page.getByLabel('미리보기 폭 조절');
  const before = await previewPanel.boundingBox();
  const resizerBox = await resizer.boundingBox();
  if (!before || !resizerBox) throw new Error('미리보기 리사이저의 위치를 읽을 수 없습니다.');

  await page.mouse.move(resizerBox.x + resizerBox.width / 2, resizerBox.y + resizerBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(resizerBox.x - 120, resizerBox.y + resizerBox.height / 2);
  await page.mouse.up();

  await expect.poll(async () => (await previewPanel.boundingBox())?.width).toBeGreaterThan(before.width + 80);
});

test('opens a utility menu by tap on a narrow viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByLabel('샘플 메뉴', { exact: true }).click();

  await expect(page.getByRole('menuitem', { name: 'OpenAPI 3.2.0 샘플 다운로드', exact: true })).toBeVisible();
});

for (const [closeLabel, openLabel] of [['탐색기 접기', '탐색기 열기'], ['미리보기 접기', '미리보기 열기']]) {
  test(`reopens the ${closeLabel.replace(' 접기', '')} panel after collapse`, async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: closeLabel }).click();

    const reopenButton = page.getByRole('button', { name: openLabel });
    await expect(reopenButton).toBeVisible();
    expect((await reopenButton.boundingBox())?.width).toBeGreaterThan(0);

    await reopenButton.click();
    await expect(page.getByRole('button', { name: closeLabel })).toBeVisible();
  });
}
