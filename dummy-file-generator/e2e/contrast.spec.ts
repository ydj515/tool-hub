import { expect, test } from '@playwright/test';
import { collectSamples, contrastOf } from '../app/styles/ds-contrast-e2e';

/**
 * 렌더된 요소의 대비를 정본 헬퍼로 검사한다.
 *
 * 이 앱은 역할색을 거의 쓰지 않는다(`--danger` 1곳, `--muted` 5곳). 토큰 층이
 * 이미 네 표면 전부를 보므로 여기서는 실제 렌더 배경 위의 값만 확인한다.
 */
const SELECTORS = [
  '.sizeInput',
  '.hint',
  '.fieldLabel',
  '.optionLabel',
  '.summaryValue',
];

for (const theme of ['light', 'dark'] as const) {
  test(`${theme} 테마의 렌더된 보조 텍스트가 WCAG AA 를 충족한다`, async ({ page }) => {
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
