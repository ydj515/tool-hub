/// <reference types="node" />
// 앱마다 tsconfig 의 types 설정이 다르므로(sign-maker 는 ["vite/client"] 로
// 제한한다) 이 파일을 8개 앱에서 동일하게 유지하기 위해 명시한다.
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * 이 파일은 packages/design-system/ds-sync.test.ts 의 생성물이다.
 * 직접 편집하지 말고 정본을 고친 뒤 저장소 루트에서
 * `npm run tokens:sync` 를 실행한다.
 *
 * CI 가 없으므로 검증이 이미 일어나는 곳(각 앱의 vitest)에 감지를 둔다.
 */

/**
 * 이 파일은 언제나 복사 대상 styles 디렉터리 안에 놓이므로 자기 위치가 곧
 * 검사 경로다. styles 위치는 앱마다 src(Vite) · app(Next.js) ·
 * apps/electron/renderer(Electron)로 다르므로 경로를 추론하지 않는다.
 */
const STYLES_DIR = dirname(__filename);
const CANONICAL_DIR = resolve(process.cwd(), '../packages/design-system');
const COMPONENT_DIR = ['src/components/design-system', 'app/_components/design-system']
  .map((path) => resolve(process.cwd(), path))
  .find(existsSync);
const PRODUCT_ID = basename(process.cwd());
const FAVICON_DIR = join(CANONICAL_DIR, 'favicons', PRODUCT_ID);

const COMPONENTS = [
  'BrandMark.tsx',
  'ThemeToggle.tsx',
  'Button.tsx',
  'SegmentedControl.tsx',
  'EmptyState.tsx',
  'Badge.tsx',
  'ToolHeader.tsx',
  'components.test.tsx',
] as const;

const CASES = [
  ['tokens.css', 'ds-tokens.css'],
  ['base.css', 'ds-base.css'],
  ['primitives.css', 'ds-primitives.css'],
  ['ds-sync.test.ts', 'ds-sync.test.ts'],
  ['ds-contrast.test.ts', 'ds-contrast.test.ts'],
  ['ds-contrast-e2e.ts', 'ds-contrast-e2e.ts'],
] as const;

const FAVICON_CASES = [
  'favicon.svg',
  'favicon.ico',
  'favicon-16x16.png',
  'favicon-32x32.png',
  'apple-touch-icon.png',
  'site.webmanifest',
] as const;

describe('디자인 시스템 정본 동기화', () => {
  it.each(CASES)('%s 가 %s 와 일치한다', (source, target) => {
    const canonical = readFileSync(join(CANONICAL_DIR, source), 'utf8');
    const copy = readFileSync(join(STYLES_DIR, target), 'utf8');

    // 복사본은 배너 + 정본 본문이다. 본문이 손대어졌는지만 본다.
    expect(copy.endsWith(canonical)).toBe(true);
  });
});

if (COMPONENT_DIR) {
  describe('생성 컴포넌트 정본 동기화', () => {
    it.each(COMPONENTS)('%s가 정본과 일치한다', (name) => {
      const canonical = readFileSync(join(CANONICAL_DIR, 'components', name), 'utf8');
      const copy = readFileSync(join(COMPONENT_DIR, name), 'utf8');

      expect(copy.endsWith(canonical)).toBe(true);
    });
  });
}

if (existsSync(FAVICON_DIR)) {
  describe('제품 파비콘 정본 동기화', () => {
    it.each(FAVICON_CASES)('%s가 정본과 바이트 단위로 일치한다', (name) => {
      const canonical = readFileSync(join(FAVICON_DIR, name));
      const copy = readFileSync(resolve(process.cwd(), 'public', name));

      expect(copy.equals(canonical)).toBe(true);
    });
  });
}

/**
 * 정본이 정의하지 않는 Tailwind radius/shadow 단계는 쓰지 않는다.
 *
 * 정본은 @theme inline 으로 radius 의 sm/md/lg 와 shadow 의 sm/md/lg/xl 만
 * 덮는다. 덮지 않은 단계는 Tailwind 기본값이 그대로 남아 조용히 다른 값이
 * 적용되고, 이름 순서가 값 순서와 역전된다 — radius 의 xl 단계는 Tailwind
 * 기본 12px 인데 정본의 lg 는 16px 이므로 xl < lg 가 된다.
 *
 * 1회 grep 은 이후 새로 추가되는 코드를 못 잡으므로 테스트로 상주시킨다.
 *
 * 아래 정규식과 이 주석에는 금지 클래스명을 리터럴로 적지 않는다. Tailwind 는
 * .ts 파일까지 스캔하므로 리터럴이 있으면 그 유틸리티가 실제로 생성되어,
 * 산출 CSS 를 감사할 때 규칙 위반처럼 보이는 죽은 CSS 가 남는다.
 */
const FORBIDDEN = /\b(?:rounded-(?:xs|xl|2xl|3xl|4xl)|shadow-(?:xs|2xl|inner))\b/;

/**
 * Tailwind 를 쓰는 앱의 소스 루트. 바닐라 CSS 앱(webpage-capture-tool)은
 * 둘 다 없어 스캔 대상이 0건이 되고, 유틸리티 자체가 없으므로 그게 정상이다.
 */
const SCAN_ROOTS = ['src', 'app'].filter((dir) => existsSync(resolve(process.cwd(), dir)));

function collectSourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return collectSourceFiles(path);
    return /\.tsx?$/.test(entry.name) ? [path] : [];
  });
}

describe('금지된 Tailwind 단계', () => {
  it('정본이 정의하지 않는 radius/shadow 유틸리티를 쓰지 않는다', () => {
    const files = SCAN_ROOTS.flatMap((root) =>
      collectSourceFiles(resolve(process.cwd(), root)),
    ).filter((path) => path !== __filename);

    // 소스 루트가 있는데 0건이면 루트 이름이 바뀐 것이다. 스캔이 조용히
    // 무력화되는 것을 막는다.
    if (SCAN_ROOTS.length > 0) expect(files.length).toBeGreaterThan(0);

    const offenders = files
      .filter((path) => FORBIDDEN.test(readFileSync(path, 'utf8')))
      .map((path) => relative(process.cwd(), path));

    expect(offenders).toEqual([]);
  });
});
