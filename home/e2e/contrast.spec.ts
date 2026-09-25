import { expect, test } from '@playwright/test';
import { collectSamples, contrastOf } from '../src/styles/ds-contrast-e2e';

/**
 * home 은 역할색(danger/warning/success)을 쓰지 않는다. 보조 텍스트와 강조
 * 텍스트가 실제 배경 위에서 읽히는지만 본다.
 *
 * 미리보기 이미지는 장식이며 카드의 제목·설명과 분류 버튼·링크의
 * 실제 표면 대비를 검사한다.
 */
const SELECTORS = ['.text-muted', '.toolCard p', '.toolCard h2', '.toolSource', '.toolOpen', '.categoryButton', '.landingFooter p'];

for (const theme of ['light', 'dark'] as const) {
  test(`${theme} 테마의 보조·강조 텍스트가 WCAG AA 를 충족한다`, async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('button', { name: '테마 전환' })).toBeVisible();

    if (theme === 'dark') {
      await page.getByRole('button', { name: '테마 전환' }).click();
    }
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);

    const samples = await collectSamples(page, SELECTORS);

    // 셀렉터가 바뀌면 조용히 0건으로 통과하는 것을 막는다.
    expect(samples.length, '검사 대상이 하나도 렌더되지 않았다').toBeGreaterThan(0);

    // 다중 스톱 gradient 위의 글자는 위치마다 배경색이 달라 단일 값으로
    // 환원할 수 없다. 건너뛰되 전부 건너뛰어 빈 검사가 되는 것은 막는다.
    const measurable = samples.filter((s) => !s.unmeasurable);
    expect(measurable.length, '측정 가능한 대상이 없다').toBeGreaterThan(0);

    for (const sample of measurable) {
      expect(contrastOf(sample), `${sample.label} 대비 미달`).toBeGreaterThanOrEqual(4.5);
    }
  });
}
