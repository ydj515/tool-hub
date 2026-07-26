import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { render, sync, FILES, TARGETS } from './sync-design-tokens.mjs';

/** 정본 3파일과 대상 앱 하나를 갖춘 임시 저장소를 만든다. */
function makeRepo() {
  const root = mkdtempSync(join(tmpdir(), 'ds-sync-'));
  mkdirSync(join(root, 'packages/design-system'), { recursive: true });
  for (const name of Object.keys(FILES)) {
    writeFileSync(join(root, 'packages/design-system', name), `/* ${name} 본문 */\n`);
  }
  mkdirSync(join(root, 'sign-maker/src/styles'), { recursive: true });
  return root;
}

describe('render', () => {
  test('배너를 앞에 붙이고 정본 본문을 보존한다', () => {
    const root = makeRepo();
    const out = render('tokens.css', root);
    assert.ok(out.includes('packages/design-system/tokens.css'), '배너에 정본 경로가 있어야 한다');
    assert.ok(out.includes('npm run tokens:sync'), '배너에 동기화 명령이 있어야 한다');
    assert.ok(out.endsWith('/* tokens.css 본문 */\n'), '본문이 끝에 그대로 보존되어야 한다');
  });
});

describe('sync', () => {
  test('대상 앱에 정본 파일을 전부 복사하고 복사한 경로를 반환한다', () => {
    const root = makeRepo();
    const drifted = sync({ root });

    // 정본 파일 수 × 대상 앱 수. 임시 저장소는 sign-maker 만 미리 만들지만
    // sync 가 나머지 앱의 styles 디렉터리도 생성한다.
    const expected = Object.keys(FILES).length * Object.keys(TARGETS).length;
    assert.equal(drifted.length, expected, '모든 정본 파일이 모든 대상 앱에 쓰여야 한다');
    for (const [source, target] of Object.entries(FILES)) {
      const path = join(root, 'sign-maker/src/styles', target);
      assert.ok(existsSync(path), `${target} 가 생성되어야 한다`);
      assert.equal(readFileSync(path, 'utf8'), render(source, root));
    }
  });

  test('이미 일치하면 아무것도 보고하지 않는다', () => {
    const root = makeRepo();
    sync({ root });
    assert.deepEqual(sync({ root }), [], '두 번째 실행은 변경이 없어야 한다');
  });

  test('check 모드는 파일을 쓰지 않고 불일치만 보고한다', () => {
    const root = makeRepo();
    const drifted = sync({ root, check: true });

    const expected = Object.keys(FILES).length * Object.keys(TARGETS).length;
    assert.equal(drifted.length, expected, '모든 정본 파일의 불일치를 보고해야 한다');
    assert.equal(
      existsSync(join(root, 'sign-maker/src/styles/ds-tokens.css')),
      false,
      'check 모드는 파일을 쓰지 않아야 한다',
    );
  });

  test('복사본이 수정되면 불일치로 감지한다', () => {
    const root = makeRepo();
    sync({ root });
    const path = join(root, 'sign-maker/src/styles/ds-tokens.css');
    writeFileSync(path, readFileSync(path, 'utf8') + '/* 손으로 고친 흔적 */\n');

    assert.deepEqual(sync({ root, check: true }), ['sign-maker/src/styles/ds-tokens.css']);
  });

  test('drift 테스트 파일도 동기화 대상이다', () => {
    const root = makeRepo();
    sync({ root });

    const path = join(root, 'sign-maker/src/styles/ds-sync.test.ts');
    assert.ok(existsSync(path), 'ds-sync.test.ts 가 복사되어야 한다');
    assert.equal(readFileSync(path, 'utf8'), render('ds-sync.test.ts', root));
  });

  test('TARGETS 는 마이그레이션된 앱만 담는다', () => {
    assert.deepEqual(Object.keys(TARGETS), [
      'sign-maker',
      'json-yaml-converter',
      'ddl-seed-generator',
      'openapi-editor',
      'dummy-file-generator',
      'config-diff-viewer',
      'home',
    ]);
  });
});
