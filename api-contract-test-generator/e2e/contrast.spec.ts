import { expect, test, type Page } from '@playwright/test';
import {
  collectSamples,
  composite,
  contrastBetween,
  contrastOf,
  parseColor,
} from '../src/styles/ds-contrast-e2e';

/**
 * 정본 팔레트로 넘어가면서 색 대비가 깨지지 않는지 계산값으로 확인한다.
 *
 * 두 층으로 본다.
 * 1. 토큰 층 — 역할 쌍(danger/warning/success/muted)을 예제 명세의 HTTP 메서드와
 *    무관하게 결정적으로 검사한다.
 * 2. 요소 층 — 실제 렌더된 요소로 검사해 배경 합성이나 레이어 실수를 잡는다.
 */

async function openReview(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'OpenAPI 3.1 예제' }).click();
  await page.getByRole('button', { name: '테스트 생성' }).click();
  await expect(page.getByRole('heading', { name: '테스트 검토' })).toBeVisible();
}

/** 역할 색 / 역할 표면 쌍. --surface 위에 표면을 합성한 뒤 전경을 본다. */
const ROLE_PAIRS = [
  ['--danger', '--danger-surface'],
  ['--warning', '--warning-surface'],
  ['--success', '--success-surface'],
  ['--text-neutral', '--primary-surface'],
] as const;

for (const theme of ['light', 'dark'] as const) {
  test(`${theme} 테마의 역할 색이 자기 표면 위에서 WCAG AA 를 충족한다`, async ({ page }) => {
    await page.goto('/');
    if (theme === 'dark') {
      await page.getByRole('button', { name: '다크 테마로 전환' }).click();
    }
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);

    const tokens = await page.evaluate(() => {
      // 토큰 원문은 hex 일 수도 rgba() 일 수도 있다. 브라우저에 색으로
      // 해석시켜 항상 rgb()/rgba() 로 정규화해 받는다.
      const probe = document.createElement('span');
      probe.style.display = 'none';
      document.body.append(probe);
      const read = (name: string) => {
        probe.style.color = '';
        probe.style.color = `var(${name})`;
        const value = getComputedStyle(probe).color;
        if (!value || value === 'rgba(0, 0, 0, 0)') {
          throw new Error(`토큰 ${name} 을 색으로 해석할 수 없다`);
        }
        return value;
      };

      try {
        return {
          surface: read('--surface'),
          bg: read('--bg'),
        surface2: read('--surface-2'),
        surface3: read('--surface-3'),
          muted: read('--muted'),
        accent: read('--primary-text'),
          pairs: [
            ['--danger', '--danger-surface'],
            ['--warning', '--warning-surface'],
            ['--success', '--success-surface'],
            ['--text-neutral', '--primary-surface'],
          ].map(([fg, bgToken]) => ({ fg: read(fg), bg: read(bgToken), name: fg })),
        };
      } finally {
        probe.remove();
      }
    });

    const surface = parseColor(tokens.surface);
    for (const pair of tokens.pairs) {
      const background = composite(parseColor(pair.bg), surface);
      const ratio = contrastBetween(parseColor(pair.fg), background);
      expect(ratio, `${pair.name} 이 자기 표면 위에서 4.5:1 미달`).toBeGreaterThanOrEqual(4.5);
    }

    // 보조 텍스트와 강조 텍스트는 두 평면 표면 모두에서 읽혀야 한다.
    for (const base of [tokens.bg, tokens.surface, tokens.surface2, tokens.surface3]) {
      const background = parseColor(base);
      for (const [name, value] of [['--muted', tokens.muted], ['--primary-text', tokens.accent]] as const) {
        const ratio = contrastBetween(parseColor(value), background);
        expect(ratio, `${name} 이 ${base} 위에서 4.5:1 미달`).toBeGreaterThanOrEqual(4.5);
      }
    }

    expect(ROLE_PAIRS.length).toBe(tokens.pairs.length);
  });

  test(`${theme} 테마의 렌더된 배지와 보조 텍스트가 WCAG AA 를 충족한다`, async ({ page }) => {
    await page.goto('/');
    if (theme === 'dark') {
      await page.getByRole('button', { name: '다크 테마로 전환' }).click();
    }
    await openReview(page);

    // 대상마다 evaluate 를 돌리면 왕복이 대상 수에 비례해 늘어나고 병렬
    // 부하에서 테스트 타임아웃을 넘긴다. 한 번에 모아 온다.
    const samples = await collectSamples(page, [
      '.privacy-note',
      '.eyebrow',
      '.request-preview pre',
      '.method',
      '[data-ds-badge]',
    ]);

    // 헤더의 보조/강조 텍스트와 배지가 모두 잡혀야 한다. 토큰 층 검사만
    // 두면 앱이 다른 토큰을 쓰고 있어도 통과하므로 실제 요소로 못박는다.
    const selectorsFound = samples.map((s) => s.label.split(' "')[0]);
    for (const selector of ['.privacy-note', '.eyebrow', '.request-preview pre']) {
      expect(selectorsFound, `${selector} 가 렌더되지 않았다`).toContain(selector);
    }
    // 예제 명세가 어떤 메서드를 담든 배지는 최소 하나 렌더된다.
    expect(selectorsFound.filter((v) => v === '.method' || v === '[data-ds-badge]').length)
      .toBeGreaterThan(0);

    // 다중 스톱 gradient 위의 글자는 위치마다 배경색이 달라 단일 값으로
    // 환원할 수 없다. 건너뛰되 전부 건너뛰어 빈 검사가 되는 것은 막는다.
    const measurable = samples.filter((s) => !s.unmeasurable);
    expect(measurable.length, '측정 가능한 대상이 없다').toBeGreaterThan(0);

    for (const sample of measurable) {
      expect(contrastOf(sample), `${sample.label} 대비 미달`).toBeGreaterThanOrEqual(4.5);
    }
  });
}

test.describe('셸 계약', () => {
  test('첫 Tab 이 허브 브랜드 링크에 닿고 테마 토글이 마지막 유틸리티다', async ({ page }) => {
    await page.goto('/');

    // 브랜드 블록 전체가 허브 링크다.
    const brand = page.getByRole('link', { name: /Tool Hub/ });
    await expect(brand).toHaveAttribute('href', 'https://tool-hub-rho.vercel.app/');

    await page.keyboard.press('Tab');
    await expect(brand).toBeFocused();

    // 테마 토글은 정본 프리미티브를 쓰고 36px 를 유지한다.
    const toggle = page.getByRole('button', { name: /테마로 전환/ });
    await expect(toggle).toHaveAttribute('data-ds-theme-toggle', 'true');
    await expect(toggle).toHaveClass(/\bds-button--icon\b/);
    await expect(toggle).toHaveCSS('width', '36px');
    await expect(toggle).toHaveCSS('height', '36px');
    await expect(page.locator('[data-ds-tool-utilities] > :last-child')).toHaveAttribute('data-ds-theme-toggle', 'true');
  });
});
