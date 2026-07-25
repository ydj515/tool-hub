/* 이 파일은 packages/design-system/ds-sync.test.ts 에서 생성되었다.
   직접 편집하지 말고 정본을 고친 뒤 저장소 루트에서
   `npm run tokens:sync` 를 실행한다. */
/// <reference types="node" />
// 앱마다 tsconfig 의 types 설정이 다르므로(sign-maker 는 ["vite/client"] 로
// 제한한다) 이 파일을 8개 앱에서 동일하게 유지하기 위해 명시한다.
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * 이 파일은 packages/design-system/ds-sync.test.ts 의 생성물이다.
 * 직접 편집하지 말고 정본을 고친 뒤 저장소 루트에서
 * `npm run tokens:sync` 를 실행한다.
 *
 * CI 가 없으므로 검증이 이미 일어나는 곳(각 앱의 vitest)에 감지를 둔다.
 */

/** 앱마다 소스 루트가 src(Vite) 또는 app(Next.js)이다. */
const SOURCE_ROOT = existsSync(resolve(process.cwd(), 'src')) ? 'src' : 'app';
const STYLES_DIR = resolve(process.cwd(), SOURCE_ROOT, 'styles');
const CANONICAL_DIR = resolve(process.cwd(), '../packages/design-system');

const CASES = [
  ['tokens.css', 'ds-tokens.css'],
  ['base.css', 'ds-base.css'],
  ['primitives.css', 'ds-primitives.css'],
  ['ds-sync.test.ts', 'ds-sync.test.ts'],
] as const;

describe('디자인 시스템 정본 동기화', () => {
  it.each(CASES)('%s 가 %s 와 일치한다', (source, target) => {
    const canonical = readFileSync(join(CANONICAL_DIR, source), 'utf8');
    const copy = readFileSync(join(STYLES_DIR, target), 'utf8');

    // 복사본은 배너 + 정본 본문이다. 본문이 손대어졌는지만 본다.
    expect(copy.endsWith(canonical)).toBe(true);
  });
});

/**
 * 정본이 정의하지 않는 Tailwind radius/shadow 단계는 쓰지 않는다.
 *
 * 정본은 @theme inline 으로 --radius-sm/md/lg 와 --shadow-sm/md/lg/xl 만 덮는다.
 * 덮지 않은 단계는 Tailwind 기본값이 그대로 남아 조용히 다른 값이 적용되고,
 * 이름 순서가 값 순서와 역전된다 — rounded-xl 은 Tailwind 기본 12px 인데
 * 정본 rounded-lg 는 16px 이므로 xl < lg 가 된다.
 *
 * 1회 grep 은 이후 새로 추가되는 코드를 못 잡으므로 테스트로 상주시킨다.
 */
const FORBIDDEN = /\b(?:rounded-(?:xs|xl|2xl|3xl|4xl)|shadow-(?:xs|2xl|inner))\b/;

function collectSourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return collectSourceFiles(path);
    return /\.tsx?$/.test(entry.name) ? [path] : [];
  });
}

describe('금지된 Tailwind 단계', () => {
  it('정본이 정의하지 않는 radius/shadow 유틸리티를 쓰지 않는다', () => {
    const root = resolve(process.cwd(), SOURCE_ROOT);
    const offenders = collectSourceFiles(root)
      .map((path) => ({ path, source: readFileSync(path, 'utf8') }))
      .filter(({ path, source }) => path !== __filename && FORBIDDEN.test(source))
      .map(({ path }) => path.slice(root.length + 1));

    expect(offenders).toEqual([]);
  });
});
