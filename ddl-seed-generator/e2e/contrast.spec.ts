import { expect, test } from '@playwright/test';
import { collectSamples, contrastOf } from '../app/styles/ds-contrast-e2e';

/**
 * 렌더된 요소의 대비를 정본 헬퍼로 검사한다.
 *
 * 토큰 층은 ds-contrast.test.ts 가 브라우저 없이 본다. 여기서는 그쪽이 못
 * 보는 것을 본다 — 부모 틴트 위에 겹친 알파 표면, background-image 로 칠한
 * 틴트처럼 렌더 시점에만 드러나는 합성이다.
 */
const SELECTORS = [
  '.panelHead',
  '.emptyState',
  '.validationList li',
  '.warningList li',
  '.downloadNotice',
  '.sqlPreview',
];

for (const theme of ['light', 'dark'] as const) {
  test(`${theme} 테마의 렌더된 역할색 요소가 WCAG AA 를 충족한다`, async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('button', { name: '테마 전환' })).toBeVisible();

    if (theme === 'dark') {
      await page.getByRole('button', { name: '테마 전환' }).click();
    }
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);

    const samples = await collectSamples(page, SELECTORS);

    // 셀렉터가 바뀌면 조용히 0건으로 통과하는 것을 막는다.
    expect(samples.length, '검사 대상이 하나도 렌더되지 않았다').toBeGreaterThan(0);

    for (const sample of samples) {
      expect(contrastOf(sample), `${sample.label} 대비 미달`).toBeGreaterThanOrEqual(4.5);
    }
  });
}
