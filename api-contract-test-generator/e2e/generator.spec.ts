import { expect, test } from '@playwright/test';

for (const format of [
  { name: 'Markdown 테스트 계획', filename: /-test-plan\.md$/ },
  { name: 'JSON 테스트 계획', filename: /-test-plan\.json$/ },
  { name: 'Postman Collection 2.1', filename: /-postman-collection\.json$/ },
]) {
  test(`OpenAPI 예제에서 ${format.name}을 다운로드한다`, async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'OpenAPI 3.1 예제' }).click();
    await page.getByRole('button', { name: '테스트 생성' }).click();
    await expect(page.getByRole('heading', { name: '테스트 검토' })).toBeVisible();
    await page.getByRole('button', { name: '내보내기 단계로' }).click();
    await page.getByRole('radio', { name: format.name }).check();

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: '선택한 형식으로 다운로드' }).click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(format.filename);
  });
}

test('문법 오류가 있는 JSON의 위치 진단을 표시한다', async ({ page }) => {
  await page.goto('/');
  await page.locator('input[type="file"]').setInputFiles({
    name: 'broken.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{"openapi":"3.1.0","info":'),
  });
  await page.getByRole('button', { name: '테스트 생성' }).click();

  await expect(page.getByText('JSON_SYNTAX_ERROR').first()).toBeVisible();
  await expect(page.getByRole('heading', { name: 'OpenAPI 명세 입력' })).toBeVisible();
});

test('외부 ref 엔드포인트를 격리하고 정상 엔드포인트 테스트를 생성한다', async ({ page }) => {
  await page.goto('/');
  await page.locator('input[type="file"]').setInputFiles({
    name: 'partial.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify({
      openapi: '3.1.0', info: { title: 'Partial API', version: '1' },
      paths: {
        '/users': { post: { requestBody: { required: true, content: { 'application/json': { schema: { $ref: 'https://example.com/user.yaml' } } } }, responses: { 201: { description: 'created' } } } },
        '/health': { get: { responses: { 204: { description: 'ok' } } } },
      },
    })),
  });
  await page.getByRole('button', { name: '테스트 생성' }).click();

  await expect(page.getByText(/외부 \$ref는 가져오지 않습니다/)).toBeVisible();
  await page.getByRole('button', { name: 'GET /health 테스트 보기' }).click();
  await expect(page.getByRole('region', { name: '테스트 목록' }).locator('.test-card')).toHaveCount(1);
});

test('키보드로 예제 생성과 내보내기 단계까지 이동한다', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'OpenAPI 3.1 예제' }).focus();
  await page.keyboard.press('Enter');
  await page.getByRole('button', { name: '테스트 생성' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: '테스트 검토' })).toBeVisible();
  await page.getByRole('button', { name: '내보내기 단계로' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: '테스트 계획 내보내기' })).toBeVisible();
});
