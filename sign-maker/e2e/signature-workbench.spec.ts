import { expect, test } from '@playwright/test';

test('keeps the real signature preview synchronized with drawing, extraction and reset', async ({ page }) => {
  await page.goto('/');
  const canvas = page.getByLabel('서명 그리기 캔버스');
  const box = await canvas.boundingBox();
  if (!box) throw new Error('Signature canvas is missing');
  await page.mouse.move(box.x + 40, box.y + 80);
  await page.mouse.down();
  await page.mouse.move(box.x + 100, box.y + 120, { steps: 12 });
  await page.mouse.move(box.x + 180, box.y + 60, { steps: 12 });
  await page.mouse.up();
  const preview = page.getByAltText('현재 서명 미리보기');
  await expect(preview).toBeVisible();
  await expect(preview).toHaveAttribute('src', /^data:image\/png;base64,/);
  await page.getByRole('button', { name: '그리기', exact: true }).click();
  await expect(preview).toBeVisible();
  const downloadEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: '내려받기', exact: true }).click();
  const download = await downloadEvent;
  expect(download.suggestedFilename()).toMatch(/^signature_.*\.png$/);
  const path = await download.path();
  if (!path) throw new Error('Exported signature is missing');
  await page.getByRole('button', { name: '지우기', exact: true }).click();
  await expect(preview).toHaveCount(0);
  await page.getByRole('button', { name: '업로드', exact: true }).click();
  await page.locator('input[type="file"]').setInputFiles(path);
  await expect(preview).toBeVisible();
  await page.getByRole('slider').fill('180');
  await expect(page.getByText('180', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: '초기화', exact: true }).click();
  await expect(preview).toHaveCount(0);
});

for (const width of [375, 768, 1488]) {
  test(`keeps the workbench inside the ${width}px viewport`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
    await expect(page.getByLabel('서명 그리기 캔버스')).toBeVisible();
    await page.getByRole('button', { name: '업로드', exact: true }).click();
    await expect(page.getByRole('slider')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
  });
}
