import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * 허브 URL 은 앱마다 독립 패키지라 상수를 공유할 수단이 없다. 각 앱의
 * constants 파일이 이미 단일 지점이므로 구조는 정리돼 있고, 값이 갈리는
 * 것만 막는다.
 *
 * 정본 동기화로 옮기지 않는 이유는 webpage-capture-tool 이 plain JS 라
 * .ts 상수를 받을 수 없어 예외가 생기고, 도메인 변경이 드물기 때문이다.
 */
const HOLDERS = [
  'sign-maker/src/constants.ts',
  'json-yaml-converter/src/constants.ts',
  'openapi-editor/src/constants.ts',
  'api-contract-test-generator/src/constants.ts',
  'ddl-seed-generator/app/_lib/constants.ts',
  'config-diff-viewer/app/_lib/constants.ts',
  'dummy-file-generator/app/_lib/constants.ts',
];

const PATTERN = /TOOL_HUB_URL\s*=\s*['"]([^'"]+)['"]/;

describe('허브 URL', () => {
  test('모든 앱에서 값이 같다', () => {
    const found = new Map();

    for (const path of HOLDERS) {
      assert.ok(existsSync(path), `${path} 가 없다. 앱 구조가 바뀌었으면 HOLDERS 를 고친다`);
      const match = readFileSync(path, 'utf8').match(PATTERN);
      assert.ok(match, `${path} 에서 TOOL_HUB_URL 을 찾지 못했다`);
      found.set(path, match[1]);
    }

    const values = [...new Set(found.values())];
    assert.equal(values.length, 1, `허브 URL 이 갈렸다: ${JSON.stringify([...found], null, 2)}`);
    assert.match(values[0], /^https:\/\//, 'https 여야 한다');
  });

  test('셸 계약을 쓰는 앱이 HOLDERS 에 빠지지 않는다', () => {
    // 새 앱이 상수를 두고도 이 테스트에 등록되지 않으면 드리프트를 놓친다.
    const apps = readdirSync('.', { withFileTypes: true })
      .filter((e) => e.isDirectory() && !e.name.startsWith('.') && e.name !== 'node_modules')
      .map((e) => e.name);

    const missing = [];
    for (const app of apps) {
      for (const rel of ['src/constants.ts', 'app/_lib/constants.ts']) {
        const path = join(app, rel);
        if (!existsSync(path)) continue;
        if (!PATTERN.test(readFileSync(path, 'utf8'))) continue;
        if (!HOLDERS.includes(path)) missing.push(path);
      }
    }

    assert.deepEqual(missing, [], `HOLDERS 에 등록되지 않은 상수 파일이 있다`);
  });
});
