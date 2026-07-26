/* 이 파일은 packages/design-system/ds-contrast.test.ts 에서 생성되었다.
   직접 편집하지 말고 정본을 고친 뒤 저장소 루트에서
   `npm run tokens:sync` 를 실행한다. */
/// <reference types="node" />
// 앱마다 tsconfig 의 types 설정이 다르므로(sign-maker 는 ["vite/client"] 로
// 제한한다) 이 파일을 9개 앱에서 동일하게 유지하기 위해 명시한다.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * 이 파일은 packages/design-system/ds-contrast.test.ts 의 생성물이다.
 * 직접 편집하지 말고 정본을 고친 뒤 저장소 루트에서
 * `npm run tokens:sync` 를 실행한다.
 *
 * 정본 팔레트의 대비 계약을 브라우저 없이 검증한다. E2E 하네스가 있는 앱은
 * 4개뿐이라 Playwright 로는 나머지를 덮을 수 없다. 토큰 값이 전부 리터럴이므로
 * ds-tokens.css 를 파싱해 계산하면 9개 앱의 vitest 에서 모두 돈다.
 *
 * 렌더된 요소의 합성(부모 틴트 위에 겹치는 알파 표면 등)은 이 테스트가 볼 수
 * 없다. 그쪽은 E2E 가 있는 앱에서 따로 검증한다.
 */

interface Rgba {
  r: number;
  g: number;
  b: number;
  a: number;
}

/** `#rgb` · `#rrggbb` · `rgb()` · `rgba()` 를 해석한다. */
function parseColor(value: string): Rgba {
  const text = value.trim();

  if (text.startsWith('#')) {
    const hex = text.slice(1);
    const expand = hex.length === 3 ? [...hex].map((c) => c + c).join('') : hex;
    return {
      r: Number.parseInt(expand.slice(0, 2), 16),
      g: Number.parseInt(expand.slice(2, 4), 16),
      b: Number.parseInt(expand.slice(4, 6), 16),
      a: 1,
    };
  }

  const parts = text.match(/[\d.]+/g);
  if (!parts || parts.length < 3) throw new Error(`색을 해석할 수 없다: ${value}`);
  const [r, g, b, a = '1'] = parts;
  return { r: Number(r), g: Number(g), b: Number(b), a: Number(a) };
}

/** 반투명 전경을 불투명 배경 위에 합성한다. */
function composite(top: Rgba, bottom: Rgba): Rgba {
  const alpha = top.a + bottom.a * (1 - top.a);
  if (alpha === 0) return { r: 0, g: 0, b: 0, a: 0 };
  const mix = (t: number, b: number) => (t * top.a + b * bottom.a * (1 - top.a)) / alpha;
  return { r: mix(top.r, bottom.r), g: mix(top.g, bottom.g), b: mix(top.b, bottom.b), a: alpha };
}

function luminance({ r, g, b }: Rgba): number {
  const channel = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** 전경이 반투명하면 배경 위에 합성한 뒤 비율을 낸다. */
function contrast(foreground: Rgba, background: Rgba): number {
  const flat = composite(foreground, background);
  const a = luminance(flat);
  const b = luminance(background);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

/**
 * `:root` 와 `[data-theme="dark"]` 블록에서 커스텀 프로퍼티를 뽑는다.
 * 다크는 라이트를 덮으므로 병합해서 돌려준다.
 */
function readTokens(css: string): { light: Map<string, string>; dark: Map<string, string> } {
  const block = (selector: string) => {
    const start = css.indexOf(selector);
    if (start === -1) throw new Error(`${selector} 블록을 찾을 수 없다`);
    const open = css.indexOf('{', start);
    const close = css.indexOf('\n}', open);
    return css.slice(open + 1, close);
  };

  const parse = (body: string) => {
    const map = new Map<string, string>();
    // 주석을 먼저 지운다. 값 뒤에 대비 수치 주석이 붙어 있다.
    for (const line of body.replace(/\/\*[\s\S]*?\*\//g, '').split('\n')) {
      const match = line.match(/^\s*(--[a-z0-9-]+)\s*:\s*([^;]+);/);
      if (match) map.set(match[1], match[2].trim());
    }
    return map;
  };

  const light = parse(block(':root'));
  const dark = new Map(light);
  for (const [name, value] of parse(block('[data-theme="dark"]'))) dark.set(name, value);
  return { light, dark };
}

const CANONICAL = readFileSync(join(dirname(__filename), 'ds-tokens.css'), 'utf8');
const THEMES = [['light', readTokens(CANONICAL).light], ['dark', readTokens(CANONICAL).dark]] as const;

/** 평면 표면. 알파 토큰은 이 위에 합성된다. */
const SURFACES = ['--bg', '--surface', '--surface-2', '--surface-3'] as const;

/** 네 표면 전부에서 본문 대비 4.5:1 을 지켜야 하는 텍스트 토큰. */
const BODY_TEXT = ['--text', '--text-neutral', '--muted', '--primary-text'] as const;

/**
 * 역할 색과 그 표면 쌍. 표면은 `--surface` 위에 합성한 값을 배경으로 본다.
 * `--primary-surface` 위의 글자는 `--primary` 계열이 두 테마 모두에서 AA 를
 * 넘기지 못해 `--text-neutral` 을 쓴다.
 */
const ROLE_PAIRS = [
  ['--danger', '--danger-surface'],
  ['--success', '--success-surface'],
  ['--warning', '--warning-surface'],
  ['--text-neutral', '--primary-surface'],
] as const;

describe.each(THEMES)('%s 테마의 정본 대비 계약', (_theme, tokens) => {
  const read = (name: string) => {
    const value = tokens.get(name);
    if (!value) throw new Error(`토큰 ${name} 이 없다`);
    return parseColor(value);
  };

  it.each(BODY_TEXT)('%s 가 네 표면 전부에서 4.5:1 이상이다', (token) => {
    const foreground = read(token);
    for (const surface of SURFACES) {
      const ratio = contrast(foreground, read(surface));
      expect(ratio, `${token} on ${surface}`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it.each(ROLE_PAIRS)('%s 가 %s 위에서 4.5:1 이상이다', (token, roleSurface) => {
    const background = composite(read(roleSurface), read('--surface'));
    expect(contrast(read(token), background)).toBeGreaterThanOrEqual(4.5);
  });

  it('--on-primary 가 --primary 위에서 4.5:1 이상이다', () => {
    expect(contrast(read('--on-primary'), read('--primary'))).toBeGreaterThanOrEqual(4.5);
  });

  it('--control-border 가 네 표면 전부에서 3:1 이상이다', () => {
    // WCAG 1.4.11 — 경계선이 컴포넌트를 식별하는 입력·셀렉트·체크박스용.
    for (const surface of SURFACES) {
      const ratio = contrast(read('--control-border'), read(surface));
      expect(ratio, `--control-border on ${surface}`).toBeGreaterThanOrEqual(3);
    }
  });

  it('--primary 가 --surface 와 --bg 위에서 3:1 이상이다', () => {
    // --primary 는 버튼 배경·테두리·활성 표시용이다. 텍스트로 쓰지 않으므로
    // 4.5 가 아니라 비텍스트 기준 3:1 을 지킨다. 강조 텍스트는 --primary-text.
    for (const surface of ['--surface', '--bg'] as const) {
      expect(contrast(read('--primary'), read(surface))).toBeGreaterThanOrEqual(3);
    }
  });

  it('--disabled 는 비활성 면제를 의도적으로 쓴다', () => {
    // WCAG 1.4.3 이 비활성 컨트롤을 면제한다. 낮은 대비가 의도이므로
    // 4.5 를 넘지 않는지 거꾸로 못박아 활성 텍스트에 잘못 쓰이는 것을 막는다.
    expect(contrast(read('--disabled'), read('--surface'))).toBeLessThan(4.5);
  });
});
