import assert from 'node:assert/strict';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, test } from 'node:test';

import {
  COMPONENT_FILES,
  FILES,
  TARGETS,
  buildOperations,
  render,
  runCli,
  sync,
  validateOperations,
} from './sync-design-system.mjs';

const TOKEN_SOURCES = [
  'tokens.css',
  'base.css',
  'primitives.css',
  'ds-sync.test.ts',
  'ds-contrast.test.ts',
  'ds-contrast-e2e.ts',
];

const TOKEN_FILES_EXPECTED = [
  'ds-tokens.css',
  'ds-base.css',
  'ds-primitives.css',
  'ds-sync.test.ts',
  'ds-contrast.test.ts',
  'ds-contrast-e2e.ts',
];

const TOKEN_TARGETS_EXPECTED = [
  ['sign-maker', 'src/styles'],
  ['json-yaml-converter', 'src/styles'],
  ['ddl-seed-generator', 'app/styles'],
  ['openapi-editor', 'src/styles'],
  ['dummy-file-generator', 'app/styles'],
  ['config-diff-viewer', 'app/styles'],
  ['home', 'src/styles'],
  ['webpage-capture-tool', 'apps/electron/renderer/styles'],
  ['api-contract-test-generator', 'src/styles'],
];

const COMPONENT_FILES_EXPECTED = [
  'BrandMark.tsx',
  'ThemeToggle.tsx',
  'Button.tsx',
  'SegmentedControl.tsx',
  'EmptyState.tsx',
  'Badge.tsx',
  'ToolHeader.tsx',
  'components.test.tsx',
  'product.generated.ts',
];

const COMPONENT_TARGETS_EXPECTED = [
  ['sign-maker', 'src/components/design-system'],
  ['json-yaml-converter', 'src/components/design-system'],
  ['openapi-editor', 'src/components/design-system'],
  ['api-contract-test-generator', 'src/components/design-system'],
  ['ddl-seed-generator', 'app/_components/design-system'],
  ['config-diff-viewer', 'app/_components/design-system'],
  ['dummy-file-generator', 'app/_components/design-system'],
];

const FAVICON_FILES_EXPECTED = [
  'favicon.svg',
  'favicon.ico',
  'favicon-16x16.png',
  'favicon-32x32.png',
  'apple-touch-icon.png',
  'site.webmanifest',
];

const FAVICON_TARGETS_EXPECTED = [
  'home',
  'sign-maker',
  'json-yaml-converter',
  'openapi-editor',
  'api-contract-test-generator',
  'ddl-seed-generator',
  'config-diff-viewer',
  'dummy-file-generator',
];

const APP_PATHS = [
  'sign-maker',
  'json-yaml-converter',
  'ddl-seed-generator',
  'openapi-editor',
  'dummy-file-generator',
  'config-diff-viewer',
  'home',
  'webpage-capture-tool',
  'api-contract-test-generator',
];

function makeRepo() {
  const root = mkdtempSync(join(tmpdir(), 'ds-sync-'));
  const canonical = join(root, 'packages/design-system');
  mkdirSync(join(canonical, 'components'), { recursive: true });

  for (const name of TOKEN_SOURCES) {
    writeFileSync(join(canonical, name), `/* ${name} 본문 */\n`);
  }
  for (const name of COMPONENT_FILES) {
    writeFileSync(join(canonical, 'components', name), `// ${name} 본문\n`);
  }
  for (const product of FAVICON_TARGETS_EXPECTED) {
    const dir = join(canonical, 'favicons', product);
    mkdirSync(dir, { recursive: true });
    for (const name of FAVICON_FILES_EXPECTED) {
      writeFileSync(join(dir, name), Buffer.from(`${product}:${name}\0`));
    }
  }
  writeFileSync(join(canonical, 'products.mjs'), '// 제품 메타데이터 정본\n');

  for (const app of APP_PATHS) mkdirSync(join(root, app), { recursive: true });
  return root;
}

describe('buildOperations', () => {
  test('9개 토큰, 7개 React, 8개 favicon 대상의 생성 operation을 모두 메모리에서 만든다', () => {
    const root = makeRepo();
    const operations = buildOperations({ root });
    const expectedTargets = [
      ...TOKEN_TARGETS_EXPECTED.flatMap(([app, stylesDir]) =>
        TOKEN_FILES_EXPECTED.map((name) => `${app}/${stylesDir}/${name}`),
      ),
      ...COMPONENT_TARGETS_EXPECTED.flatMap(([app, componentDir]) =>
        COMPONENT_FILES_EXPECTED.map((name) => `${app}/${componentDir}/${name}`),
      ),
      ...FAVICON_TARGETS_EXPECTED.flatMap((app) =>
        FAVICON_FILES_EXPECTED.map((name) => `${app}/public/${name}`),
      ),
    ].sort();

    assert.deepEqual(
      operations.map(({ targetPath }) => targetPath).sort(),
      expectedTargets,
    );

    const product = operations.find(
      ({ targetPath }) =>
        targetPath === 'sign-maker/src/components/design-system/product.generated.ts',
    );
    assert.ok(product);
    assert.match(String(product.content), /import \{ PenLine \} from 'lucide-react';/);
    assert.match(String(product.content), /"name": "Sign Maker"/);
    assert.match(String(product.content), /export const ProductIcon = PenLine;/);
  });
});

describe('sync', () => {
  test('대상 앱에 정본 파일을 전부 복사하고 복사한 경로를 반환한다', () => {
    const root = makeRepo();
    const drifted = sync({ root });

    assert.equal(drifted.length, 165);
    assert.equal(
      readFileSync(join(root, 'sign-maker/src/styles/ds-tokens.css'), 'utf8'),
      render('tokens.css', root),
    );
    assert.ok(
      readFileSync(
        join(root, 'sign-maker/src/components/design-system/Button.tsx'),
        'utf8',
      ).endsWith('// Button.tsx 본문\n'),
    );
    assert.ok(
      existsSync(join(root, 'sign-maker/src/components/design-system/product.generated.ts')),
    );
    assert.ok(
      readFileSync(join(root, 'sign-maker/public/favicon.ico')).equals(
        readFileSync(
          join(root, 'packages/design-system/favicons/sign-maker/favicon.ico'),
        ),
      ),
    );
  });

  test('이미 일치하면 아무것도 보고하지 않는다', () => {
    const root = makeRepo();
    sync({ root });

    assert.deepEqual(sync({ root }), []);
  });

  test('check 모드는 파일을 쓰지 않고 불일치만 보고한다', () => {
    const root = makeRepo();
    const drifted = sync({ root, check: true });

    assert.equal(drifted.length, 165);
    assert.equal(existsSync(join(root, 'sign-maker/src/styles/ds-tokens.css')), false);
    assert.equal(
      existsSync(join(root, 'sign-maker/src/components/design-system/Button.tsx')),
      false,
    );
  });

  test('복사본이 수정되면 해당 파일만 불일치로 감지한다', () => {
    const root = makeRepo();
    sync({ root });
    const path = join(root, 'sign-maker/src/styles/ds-tokens.css');
    writeFileSync(path, readFileSync(path, 'utf8') + '/* 손으로 고친 흔적 */\n');

    assert.deepEqual(sync({ root, check: true }), [
      'sign-maker/src/styles/ds-tokens.css',
    ]);
  });

  test('검증 오류가 있으면 어떤 대상도 쓰지 않는다', () => {
    const root = makeRepo();
    rmSync(join(root, 'packages/design-system/components/Button.tsx'));

    assert.throws(() => sync({ root }), /Button\.tsx/);
    assert.equal(existsSync(join(root, 'sign-maker/src/styles/ds-tokens.css')), false);
  });

  test('대상 앱이 누락되면 어떤 대상도 쓰지 않는다', () => {
    const root = makeRepo();
    rmSync(join(root, 'dummy-file-generator'), { recursive: true });

    assert.throws(() => sync({ root }), /대상 앱이 없다: dummy-file-generator/);
    assert.equal(existsSync(join(root, 'sign-maker/src/styles/ds-tokens.css')), false);
  });

  test('대상 앱 경로가 파일이면 어떤 대상도 쓰지 않는다', () => {
    const root = makeRepo();
    const appRoot = join(root, 'dummy-file-generator');
    rmSync(appRoot, { recursive: true });
    writeFileSync(appRoot, '앱 디렉터리가 아님');

    assert.throws(() => sync({ root }), /대상 앱이 디렉터리가 아니다/);
    assert.equal(existsSync(join(root, 'sign-maker/src/styles/ds-tokens.css')), false);
  });

  test('대상의 기존 중간 경로가 파일이면 어떤 대상도 쓰지 않는다', () => {
    const root = makeRepo();
    writeFileSync(join(root, 'dummy-file-generator/app'), '생성 디렉터리가 아님');

    assert.throws(() => sync({ root }), /대상 부모가 디렉터리가 아니다/);
    assert.equal(existsSync(join(root, 'sign-maker/src/styles/ds-tokens.css')), false);
  });

  test('후반의 기존 대상이 디렉터리면 어떤 대상도 쓰지 않는다', () => {
    const root = makeRepo();
    mkdirSync(
      join(root, 'dummy-file-generator/app/styles/ds-tokens.css'),
      { recursive: true },
    );

    assert.throws(() => sync({ root }), /생성 대상이 일반 파일이 아니다/);
    assert.equal(existsSync(join(root, 'sign-maker/src/styles/ds-tokens.css')), false);
  });

  test('원자 교체가 실패하면 임시 파일을 남기지 않는다', () => {
    const root = makeRepo();
    const target = join(root, 'sign-maker/src/styles/ds-tokens.css');
    mkdirSync(target, { recursive: true });
    writeFileSync(join(target, 'keep'), '기존 대상');

    assert.throws(() => sync({ root }));
    assert.deepEqual(
      readdirSync(join(root, 'sign-maker/src/styles')).filter((name) => name.startsWith('.ds-tokens.css.tmp-')),
      [],
    );
    assert.equal(readFileSync(join(target, 'keep'), 'utf8'), '기존 대상');
  });
});

describe('validateOperations', () => {
  test('대상 경로가 앱 밖이면 쓰기 전에 거부한다', () => {
    const root = makeRepo();
    const operations = [
      { sourcePath: 'x', targetPath: 'sign-maker/../escape.ts', content: 'x' },
    ];

    assert.throws(() => validateOperations(operations, { root }), /앱 밖/);
  });

  test('대상 경로가 상위 디렉터리에서 시작하면 쓰기 전에 거부한다', () => {
    const root = makeRepo();
    const operations = [
      { sourcePath: 'x', targetPath: '../escape.ts', content: 'x' },
    ];

    assert.throws(() => validateOperations(operations, { root }), /앱 밖/);
  });

  test('대상 디렉터리의 symlink가 앱 밖을 가리키면 쓰기 전에 거부한다', () => {
    const root = makeRepo();
    const outside = mkdtempSync(join(tmpdir(), 'ds-sync-outside-'));
    symlinkSync(outside, join(root, 'sign-maker/generated'), 'dir');
    const operations = [
      { sourcePath: 'x', targetPath: 'sign-maker/generated/escape.ts', content: 'x' },
    ];

    assert.throws(() => validateOperations(operations, { root }), /앱 밖/);
    assert.equal(existsSync(join(outside, 'escape.ts')), false);
  });

  test('중복 대상 경로를 쓰기 전에 거부한다', () => {
    const root = makeRepo();
    const operation = {
      sourcePath: 'packages/design-system/tokens.css',
      targetPath: 'sign-maker/src/styles/ds-tokens.css',
      content: 'x',
    };

    assert.throws(
      () => validateOperations([operation, { ...operation }], { root }),
      /중복 생성 대상/,
    );
    assert.equal(existsSync(join(root, operation.targetPath)), false);
  });

  test('symlink alias로 표현한 같은 물리 대상을 중복으로 거부한다', () => {
    const root = makeRepo();
    mkdirSync(join(root, 'sign-maker/real'), { recursive: true });
    symlinkSync('real', join(root, 'sign-maker/alias'), 'dir');
    const operations = [
      {
        sourcePath: 'packages/design-system/tokens.css',
        targetPath: 'sign-maker/real/x.ts',
        content: 'a',
      },
      {
        sourcePath: 'packages/design-system/tokens.css',
        targetPath: 'sign-maker/alias/x.ts',
        content: 'b',
      },
    ];

    assert.throws(() => validateOperations(operations, { root }), /중복 생성 대상/);
    assert.equal(existsSync(join(root, 'sign-maker/real/x.ts')), false);
  });
});

describe('호환성과 CLI', () => {
  test('기존 토큰 export는 새 엔진과 같은 계약을 유지한다', async () => {
    const legacy = await import('./sync-design-tokens.mjs');

    assert.deepEqual(legacy.FILES, FILES);
    assert.deepEqual(legacy.TARGETS, TARGETS);
    assert.equal(legacy.sync, sync);
    assert.equal(legacy.render, render);
  });

  test('알 수 없는 CLI 옵션을 거부한다', async () => {
    await assert.rejects(() => runCli(['--write-anyway']), /알 수 없는 옵션/);
  });
});
