import { expect, test, type Page } from '@playwright/test';
import { parse } from 'yaml';

async function downloadSample(page: Page, label: string): Promise<{ filename: string; document: Record<string, unknown> }> {
  await page.getByLabel('더보기 메뉴', { exact: true }).hover();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('menuitem', { name: `${label} 샘플` }).click();
  const download = await downloadPromise;
  const stream = await download.createReadStream();
  if (!stream) throw new Error('샘플 다운로드 스트림을 만들 수 없습니다.');
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  return { filename: download.suggestedFilename(), document: parse(Buffer.concat(chunks).toString('utf8')) as Record<string, unknown> };
}

const VALID_YAML = ['openapi: 3.1.2', 'info:', '  title: Pets', '  version: 1.0.0', 'paths: {}'].join('\n');

/**
 * 파일 업로드로 유효 문서를 주입한다.
 *
 * Monaco 에 키보드로 여러 줄을 입력하면 자동 들여쓰기와 경합해 들여쓰기가
 * 어긋나고 문서가 무효해진다. Topbar 의 파일 입력은 hidden 이지만
 * setInputFiles 는 hidden 입력에도 동작하므로 결정적이다.
 */
async function loadValidYaml(page: Page): Promise<void> {
  await page.locator('input[type="file"]').setInputFiles({
    name: 'openapi.yaml',
    mimeType: 'application/yaml',
    buffer: Buffer.from(VALID_YAML, 'utf8'),
  });
  await expect(page.getByText('검증 완료')).toBeVisible();
}

/**
 * 뷰가 렌더된 뒤 에디터를 포커스한다.
 *
 * 포커스 대상을 DOM 요소로 잡지 않는다. 이 Monaco 버전은 EditContext API 를
 * 쓰므로 입력용 textarea 도 contenteditable 도 없고, 에디터 안의 유일한
 * textarea 는 IME 보조 요소(ime-text-area, tabindex=-1, readonly)라 절대
 * 포커스되지 않는다. 대신 Monaco 가 루트에 붙이는 focused 클래스를 본다.
 */
async function focusEditor(page: Page): Promise<void> {
  const editor = page.locator('.monaco-editor').first();
  await editor.locator('.view-lines').waitFor();
  await editor.click();
  await expect(editor).toHaveClass(/\bfocused\b/);
}

test('edits a YAML OpenAPI document and keeps the browser-only workspace visible', async ({ page }) => {
  await page.goto('/');
  await focusEditor(page);
  await page.keyboard.press('ControlOrMeta+A');
  // flow 매핑은 한 줄이라 Monaco 의 자동 들여쓰기가 개입할 여지가 없다.
  await page.keyboard.insertText('{openapi: 3.1.2, info: {title: Pets, version: 1.0.0}, paths: {}}');
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
  const theme = page.getByRole('button', { name: /테마로 전환/ });
  const target = page.getByLabel('대상 버전', { exact: true });
  const upload = page.getByLabel('파일 업로드', { exact: true });
  const convert = page.getByRole('button', { name: '문서 변환', exact: true });
  const moreMenu = page.getByLabel('더보기 메뉴', { exact: true });
  const [themeBox, targetBox, uploadBox, convertBox, moreBox] = await Promise.all([
    theme.boundingBox(), target.boundingBox(), upload.boundingBox(), convert.boundingBox(), moreMenu.boundingBox(),
  ]);
  if (!themeBox || !targetBox || !uploadBox || !convertBox || !moreBox) throw new Error('모바일 헤더의 위치를 읽을 수 없습니다.');

  expect(themeBox.y).toBeLessThan(targetBox.y);
  expect(uploadBox.y).toBe(targetBox.y);
  expect(convertBox.y).toBe(targetBox.y);
  expect(moreBox.y).toBe(targetBox.y);
  expect(uploadBox.height).toBe(36);
});

for (const viewportWidth of [360, 375, 390]) {
  test(`keeps the ${viewportWidth}px mobile action grid inside the header without overlap`, async ({ page }) => {
    await page.setViewportSize({ width: viewportWidth, height: 844 });
    await page.goto('/');
    const header = page.locator('[data-ds-tool-header]');
    const actionRow = page.locator('.openapi-header-actions');
    const target = page.getByLabel('대상 버전', { exact: true });
    const upload = page.getByLabel('파일 업로드', { exact: true });
    const convert = page.getByRole('button', { name: '문서 변환', exact: true });
    const moreMenu = page.getByLabel('더보기 메뉴', { exact: true });
    const [headerBox, targetBox, uploadBox, convertBox, moreBox] = await Promise.all([
      header.boundingBox(), target.boundingBox(), upload.boundingBox(), convert.boundingBox(), moreMenu.boundingBox(),
    ]);
    if (!headerBox || !targetBox || !uploadBox || !convertBox || !moreBox) throw new Error('좁은 모바일 헤더의 위치를 읽을 수 없습니다.');

    const controls = [
      ['대상 버전', targetBox],
      ['파일 업로드', uploadBox],
      ['문서 변환', convertBox],
      ['더보기', moreBox],
    ] as const;
    for (const [[leftLabel, left], [rightLabel, right]] of controls.slice(0, -1).map((control, index) => [control, controls[index + 1]] as const)) {
      expect(left.x + left.width, `${viewportWidth}px에서 ${leftLabel}과 ${rightLabel}이 겹치지 않아야 합니다.`).toBeLessThanOrEqual(right.x);
    }
    for (const [label, box] of controls) {
      expect(box.x, `${viewportWidth}px에서 ${label}의 왼쪽 경계가 header 안에 있어야 합니다.`).toBeGreaterThanOrEqual(headerBox.x);
      expect(box.x + box.width, `${viewportWidth}px에서 ${label}의 오른쪽 경계가 header 안에 있어야 합니다.`).toBeLessThanOrEqual(headerBox.x + headerBox.width);
      expect(box.height).toBe(36);
      expect(box.y).toBe(targetBox.y);
    }

    for (const region of [header, actionRow]) {
      const { clientWidth, scrollWidth } = await region.evaluate((element) => ({ clientWidth: element.clientWidth, scrollWidth: element.scrollWidth }));
      expect(scrollWidth, `${viewportWidth}px header에 가로 overflow가 없어야 합니다.`).toBeLessThanOrEqual(clientWidth);
    }
  });
}

test('keeps the editor format menu inside the mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByLabel('형식 메뉴', { exact: true }).click();
  const menuBox = await page.getByRole('menu', { name: '형식 작업' }).boundingBox();
  if (!menuBox) throw new Error('형식 메뉴의 위치를 읽을 수 없습니다.');

  expect(menuBox.x).toBeGreaterThanOrEqual(0);
  expect(menuBox.x + menuBox.width).toBeLessThanOrEqual(390);
});

test('opens the more menu on hover and downloads YAML directly', async ({ page }) => {
  await page.goto('/');
  await loadValidYaml(page);

  await page.getByLabel('더보기 메뉴', { exact: true }).hover();
  await expect(page.getByRole('menu', { name: '더보기 작업' })).toBeVisible();

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

test('keeps desktop header controls in the common single-row shell', async ({ page }) => {
  await page.goto('/');
  const header = page.locator('[data-ds-tool-header]');
  const actions = header.locator('[data-ds-tool-actions]');
  const utilities = header.locator('[data-ds-tool-utilities]');
  await expect(header).toBeVisible();
  await expect(page.getByRole('heading', { name: 'OpenAPI Editor' })).toBeVisible();

  const controls = [
    page.getByLabel('대상 버전', { exact: true }),
    page.getByLabel('파일 업로드', { exact: true }),
    page.getByRole('button', { name: '문서 변환', exact: true }),
    page.getByLabel('더보기 메뉴', { exact: true }),
    page.getByRole('button', { name: /테마로 전환/ }),
  ];

  for (const control of controls) {
    const box = await control.boundingBox();
    expect(box?.height).toBe(36);
  }

  await expect(page.getByRole('button', { name: /테마로 전환/ })).toBeVisible();
  expect(await actions.getByRole('button', { name: /테마로 전환/ }).count()).toBe(0);
  expect(await utilities.getByRole('button', { name: /테마로 전환/ }).count()).toBe(1);
  await expect(page.getByLabel('형식 메뉴', { exact: true }).locator('xpath=ancestor::header[contains(@class, "editor-header")]')).toBeVisible();
});

test('reveals utility actions from the format and combined more menus', async ({ page }) => {
  await page.goto('/');

  await page.getByLabel('형식 메뉴', { exact: true }).hover();
  await expect(page.getByRole('menuitem', { name: 'YAML로 변환', exact: true })).toBeVisible();
  await expect(page.getByRole('menuitem', { name: 'YAML로 읽기', exact: true })).toBeVisible();

  await page.getByLabel('더보기 메뉴', { exact: true }).hover();
  await expect(page.getByRole('menuitem', { name: 'YAML로 변환', exact: true })).not.toBeVisible();
  await expect(page.getByRole('menuitem', { name: 'YAML 다운로드', exact: true })).toBeVisible();
  await expect(page.getByRole('menuitem', { name: 'JSON 다운로드', exact: true })).toBeVisible();
  await expect(page.getByRole('menuitem', { name: 'Swagger 2.0 샘플', exact: true })).toBeVisible();
  await expect(page.getByRole('menuitem', { name: 'OpenAPI 3.2.0 샘플', exact: true })).toBeVisible();
});

test('keeps the more menu open while moving the pointer to its items', async ({ page }) => {
  await page.goto('/');
  const trigger = page.getByLabel('더보기 메뉴', { exact: true });
  const menu = page.getByRole('menu', { name: '더보기 작업' });

  await trigger.hover();
  await expect(menu).toBeVisible();
  const triggerBox = await trigger.boundingBox();
  const menuBox = await menu.boundingBox();
  if (!triggerBox || !menuBox) throw new Error('더보기 메뉴 위치를 읽을 수 없습니다.');

  await page.mouse.move(triggerBox.x + triggerBox.width / 2, triggerBox.y + triggerBox.height / 2);
  await page.mouse.move(menuBox.x + menuBox.width / 2, menuBox.y + 8, { steps: 12 });

  await expect(menu).toBeVisible();
  await expect(page.getByRole('menuitem', { name: 'Swagger 2.0 샘플' })).toBeVisible();
});

test('converts a valid document to JSON from the format menu', async ({ page }) => {
  await page.goto('/');
  await loadValidYaml(page);

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
  await page.getByLabel('더보기 메뉴', { exact: true }).click();

  await expect(page.getByRole('menuitem', { name: 'OpenAPI 3.2.0 샘플', exact: true })).toBeVisible();
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
