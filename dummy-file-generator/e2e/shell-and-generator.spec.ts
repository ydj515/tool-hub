import { stat } from 'node:fs/promises';
import { expect, test } from '@playwright/test';

test('ZIP 옵션을 한국어 공통 컨트롤로 선택해 불변 payload로 다운로드한다', async ({ page }) => {
  let requestPayload: unknown;

  await page.route('**/api/generate', async (route) => {
    requestPayload = route.request().postDataJSON();
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'test-job',
        fileName: 'dummy_zip_1048576_test.zip',
        downloadUrl: '/api/download/test-job',
        targetBytes: 1_048_576,
        actualBytes: 1_048_576,
        checksumSha256: '0'.repeat(64),
        modeRequested: 'exact',
        modeApplied: 'exact',
        seed: 'test-seed',
        policy: {
          maxTargetBytes: 104_857_600,
          blobRecommendThresholdBytes: 52_428_800,
        },
        delivery: { strategy: 'direct', blobRecommended: false },
      }),
    });
  });
  await page.route('**/api/download/test-job', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/zip',
      headers: { 'content-disposition': 'attachment; filename="dummy_zip_1048576_test.zip"' },
      body: 'zip fixture',
    });
  });

  await page.goto('/');
  const zipButton = page.getByRole('button', { name: 'ZIP', exact: true });
  await zipButton.click();
  await expect(zipButton).toHaveAttribute('aria-pressed', 'true');

  const structure = page.getByRole('group', { name: 'ZIP 구조' });
  await expect(structure.getByRole('button', { name: '평면' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await structure.getByRole('button', { name: '계층' }).click();

  const profile = page.getByRole('group', { name: '확장자 조합' });
  await profile.getByRole('button', { name: '텍스트' }).click();
  await expect(profile.getByRole('button', { name: '텍스트' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: '파일 생성' }).click();
  const download = await downloadPromise;

  expect(requestPayload).toEqual({
    type: 'zip',
    targetSize: 1,
    sizeUnit: 'MiB',
    mode: 'exact',
    zipStructure: 'hierarchy',
    zipExtensionProfile: 'text',
  });
  expect(download.suggestedFilename()).toBe('dummy_zip_1048576_test.zip');
});

test('production API로 기본 PDF 1 MiB를 생성하고 다운로드한다', async ({ page }) => {
  await page.goto('/');

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: '파일 생성' }).click();
  const download = await downloadPromise;
  const path = await download.path();

  expect(download.suggestedFilename()).toMatch(/^dummy_pdf_1048576_\d{14}\.pdf$/);
  expect(path).not.toBeNull();
  expect((await stat(path!)).size).toBe(1_048_576);
});

for (const width of [375, 768, 1440]) {
  test(`${width}px에서 header와 body card가 정렬되고 공통 크기 계약을 지킨다`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');

    const header = page.locator('[data-ds-tool-header]');
    const brand = page.locator('[data-ds-brand-mark]');
    const theme = page.locator('[data-ds-theme-toggle]');
    const typeIcon = page.locator('.typeBtn svg').first();

    await expect(header).toBeVisible();
    const geometry = await page.evaluate(() => {
      const headerRect = document.querySelector('[data-ds-tool-header]')!.getBoundingClientRect();
      const cardRect = document.querySelector('section.card')!.getBoundingClientRect();
      return {
        header: { x: headerRect.x, width: headerRect.width },
        card: { x: cardRect.x, width: cardRect.width },
        viewportWidth: window.innerWidth,
        scrollWidth: document.documentElement.scrollWidth,
      };
    });

    expect(Math.abs(geometry.header.x - geometry.card.x)).toBeLessThanOrEqual(1);
    expect(Math.abs(geometry.header.width - geometry.card.width)).toBeLessThanOrEqual(1);
    expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.viewportWidth);
    await expect(brand).toHaveCSS('width', '40px');
    await expect(brand).toHaveCSS('height', '40px');
    await expect(theme).toHaveCSS('width', '36px');
    await expect(theme).toHaveCSS('height', '36px');
    await expect(typeIcon).toHaveCSS('width', '16px');
    await expect(typeIcon).toHaveCSS('height', '16px');
    await expect(typeIcon).toHaveAttribute('stroke-width', '2');

    const submit = page.getByRole('button', { name: '파일 생성' });
    await page.getByLabel('목표 크기 (MiB)').fill('0');
    await expect(submit).toBeDisabled();
    await expect(submit).toHaveCSS('opacity', '1');
  });
}
