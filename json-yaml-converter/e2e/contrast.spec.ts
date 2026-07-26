import { expect, test } from '@playwright/test';
import { collectSamples, contrastOf } from '../src/styles/ds-contrast-e2e';

/**
 * 렌더된 요소의 대비를 정본 헬퍼로 검사한다. 9개 앱이 같은 계산을 쓴다.
 *
 * responsive.spec.ts 에도 대비 검사가 있지만 그쪽은 Monaco 글리프·포커스
 * 아웃라인·gradient stop 처럼 이 앱에만 있는 것을 본다. 자체 헬퍼는 합성
 * 시점과 휘도 임계값이 정본과 달라 그대로 둔다 — 여기서는 디자인 시스템
 * 층위(역할색·보조 텍스트)만 정본 규격으로 검사한다.
 */
const SELECTORS = [
  '.privacy-note',
  '.format-label',
  '.direction-selector__option',
  '.status-bar--valid',
  '.diagnostic-banner',
  '.completion-badge',
];

for (const theme of ['light', 'dark'] as const) {
  test(`${theme} 테마의 렌더된 역할색 요소가 WCAG AA 를 충족한다`, async ({ page }) => {
    await page.goto('/');
    // 조회 전에 앱이 마운트되기를 기다린다. 기다리지 않으면 라이트 테마는
    // 토글 클릭이 없어 더 빨리 실행되고 0건을 수집한다.
    await expect(page.locator('.privacy-note').first()).toBeVisible();

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
