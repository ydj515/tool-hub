import { expect, test, type Locator, type Page } from '@playwright/test';

/**
 * 정본 팔레트로 넘어가면서 색 대비가 깨지지 않는지 계산값으로 확인한다.
 *
 * 두 층으로 본다.
 * 1. 토큰 층 — 역할 쌍(danger/warning/success/muted)을 예제 명세의 HTTP 메서드와
 *    무관하게 결정적으로 검사한다.
 * 2. 요소 층 — 실제 렌더된 요소로 검사해 배경 합성이나 레이어 실수를 잡는다.
 */

interface Rgba {
  r: number;
  g: number;
  b: number;
  a: number;
}

function parseColor(value: string): Rgba {
  const parts = value.match(/[\d.]+/g);
  if (!parts) throw new Error(`색을 해석할 수 없다: ${value}`);
  const [r, g, b, a = '1'] = parts;
  return { r: Number(r), g: Number(g), b: Number(b), a: Number(a) };
}

/** 반투명 전경/배경을 불투명 배경 위에 합성한다. */
function composite(top: Rgba, bottom: Rgba): Rgba {
  const a = top.a + bottom.a * (1 - top.a);
  if (a === 0) return { r: 0, g: 0, b: 0, a: 0 };
  const mix = (t: number, b: number) => (t * top.a + b * bottom.a * (1 - top.a)) / a;
  return { r: mix(top.r, bottom.r), g: mix(top.g, bottom.g), b: mix(top.b, bottom.b), a };
}

function luminance({ r, g, b }: Rgba): number {
  const channel = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrast(foreground: Rgba, background: Rgba): number {
  const a = luminance(foreground);
  const b = luminance(background);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

/** 조상 체인을 올라가며 불투명해질 때까지 배경을 합성한다. */
async function effectiveBackground(target: Locator): Promise<Rgba> {
  const stack = await target.evaluate((el) => {
    const backgrounds: string[] = [];
    let node: Element | null = el;
    while (node) {
      backgrounds.push(getComputedStyle(node).backgroundColor);
      node = node.parentElement;
    }
    return backgrounds;
  });

  let result: Rgba = { r: 0, g: 0, b: 0, a: 0 };
  for (const layer of stack) {
    result = composite(result, parseColor(layer));
    if (result.a >= 1) break;
  }
  // 최종 폴백은 캔버스 흰색이 아니라 --bg 다. 위 루프가 불투명에 닿지 못하면
  // html 배경이 투명이라는 뜻이므로 그 경우만 흰색으로 본다.
  return result.a >= 1 ? result : composite(result, { r: 255, g: 255, b: 255, a: 1 });
}

async function textContrast(target: Locator): Promise<number> {
  const color = parseColor(await target.evaluate((el) => getComputedStyle(el).color));
  const background = await effectiveBackground(target);
  return contrast(composite(color, background), background);
}

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
      const ratio = contrast(composite(parseColor(pair.fg), background), background);
      expect(ratio, `${pair.name} 이 자기 표면 위에서 4.5:1 미달`).toBeGreaterThanOrEqual(4.5);
    }

    // 보조 텍스트와 강조 텍스트는 두 평면 표면 모두에서 읽혀야 한다.
    for (const base of [tokens.surface, tokens.bg, tokens.surface2]) {
      const background = parseColor(base);
      for (const [name, value] of [['--muted', tokens.muted], ['--primary-text', tokens.accent]] as const) {
        const ratio = contrast(composite(parseColor(value), background), background);
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

    // 헤더의 보조 텍스트와 강조 텍스트는 --bg 위에 있다. 토큰 층 검사만
    // 두면 앱이 다른 토큰을 쓰고 있어도 통과하므로 실제 요소로 못박는다.
    for (const selector of ['.privacy-note', '.eyebrow']) {
      const ratio = await textContrast(page.locator(selector).first());
      expect(ratio, `${selector} 대비 미달`).toBeGreaterThanOrEqual(4.5);
    }

    // 메서드 배지와 상태 배지는 역할 표면 위에 있다. 예제 명세가 어떤
    // 메서드를 담든 최소 하나는 렌더된다.
    const badges = page.locator('.method, .status-badge');
    const count = await badges.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < count; i += 1) {
      const badge = badges.nth(i);
      if (!(await badge.isVisible())) continue;
      const label = (await badge.textContent())?.trim() ?? `#${i}`;
      expect(await textContrast(badge), `배지 "${label}" 대비 미달`).toBeGreaterThanOrEqual(4.5);
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
    await expect(toggle).toHaveClass(/\bds-icon-btn\b/);
    await expect(toggle).toHaveCSS('width', '36px');
    await expect(toggle).toHaveCSS('height', '36px');
  });
});
