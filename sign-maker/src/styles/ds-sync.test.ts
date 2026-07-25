/// <reference types="node" />
// tsconfig.app.json 은 types 를 ["vite/client"] 로 제한한다. 이 테스트만 파일
// 국소적으로 Node 타입을 끌어온다 — types 배열에 "node" 를 넣으면 앱 코드
// 전체가 Node API 를 참조할 수 있게 되어 브라우저 번들의 가드가 느슨해진다.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * 정본과 복사본의 일치를 단정한다.
 * 실패하면 저장소 루트에서 `npm run tokens:sync` 를 실행한다.
 *
 * CI 가 없으므로 검증이 이미 일어나는 곳(각 앱의 vitest)에 drift 감지를 둔다.
 */
const CASES = [
  ['tokens.css', 'ds-tokens.css'],
  ['base.css', 'ds-base.css'],
  ['primitives.css', 'ds-primitives.css'],
] as const;

describe('디자인 시스템 정본 동기화', () => {
  it.each(CASES)('%s 가 %s 와 일치한다', (source, target) => {
    const canonical = readFileSync(
      resolve(process.cwd(), '../packages/design-system', source),
      'utf8',
    );
    const copy = readFileSync(resolve(process.cwd(), 'src/styles', target), 'utf8');

    // 복사본은 배너 + 정본 본문이다. 본문이 손대어졌는지만 본다.
    expect(copy.endsWith(canonical)).toBe(true);
  });
});
