import assert from 'node:assert/strict';
import {
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, test } from 'node:test';

import { PRODUCTS } from '../packages/design-system/products.mjs';
import * as syncModule from './sync-design-system.mjs';

const {
  COMPONENT_FILES,
  E2E_FILES,
  FILES,
  TARGETS,
  buildOperations,
  render,
  runCli,
  sync,
  validateOperations,
} = syncModule;

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

const E2E_FILES_EXPECTED = [
  'ds-shell-contract-e2e.ts',
  'shell-contract.spec.ts',
  'product.generated.ts',
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

const REQUIRED_LUCIDE_VERSION = '1.14.0';
const FIRST_TARGET = 'sign-maker/src/styles/ds-tokens.css';

function manifestFor(product) {
  return {
    name: product.name,
    short_name: product.name,
    icons: [
      { src: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { src: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    theme_color: '#3366ff',
    background_color: '#f7f7f8',
    display: 'standalone',
  };
}

function packageJsonFor(product) {
  return {
    name: product.id,
    private: true,
    dependencies: { 'lucide-react': REQUIRED_LUCIDE_VERSION },
  };
}

function packageLockFor(product) {
  return {
    name: product.id,
    lockfileVersion: 3,
    requires: true,
    packages: {
      '': { dependencies: { 'lucide-react': REQUIRED_LUCIDE_VERSION } },
      'node_modules/lucide-react': { version: REQUIRED_LUCIDE_VERSION },
    },
  };
}

function writeJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

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
  for (const name of Object.keys(E2E_FILES)) {
    writeFileSync(join(canonical, name), `// ${name} 본문\n`);
  }
  for (const product of FAVICON_TARGETS_EXPECTED) {
    const dir = join(canonical, 'favicons', product);
    mkdirSync(dir, { recursive: true });
    for (const name of FAVICON_FILES_EXPECTED) {
      if (name === 'site.webmanifest') {
        const metadata = PRODUCTS.find(({ id }) => id === product);
        writeJson(join(dir, name), manifestFor(metadata));
      } else {
        writeFileSync(join(dir, name), Buffer.from(`${product}:${name}\0`));
      }
    }
  }
  writeFileSync(join(canonical, 'products.mjs'), '// 제품 메타데이터 정본\n');

  for (const app of APP_PATHS) mkdirSync(join(root, app), { recursive: true });
  for (const [app, stylesDir] of TOKEN_TARGETS_EXPECTED) {
    mkdirSync(join(root, app, stylesDir), { recursive: true });
  }
  for (const product of PRODUCTS) {
    mkdirSync(join(root, product.id, product.publicDir), { recursive: true });
    if (product.header === 'card') {
      mkdirSync(join(root, product.id, product.componentDir), { recursive: true });
      mkdirSync(join(root, product.id, 'e2e'), { recursive: true });
      writeJson(join(root, product.id, 'package.json'), packageJsonFor(product));
      writeJson(join(root, product.id, 'package-lock.json'), packageLockFor(product));
    }
  }
  return root;
}

function assertFirstTargetWasNotWritten(root) {
  assert.equal(existsSync(join(root, FIRST_TARGET)), false);
}

describe('validatePreflight', () => {
  test('현실적인 repository fixture 전체를 write와 check 전에 검증한다', () => {
    const root = makeRepo();

    assert.equal(typeof syncModule.validatePreflight, 'function');
    assert.doesNotThrow(() => syncModule.validatePreflight({ root }));
    assertFirstTargetWasNotWritten(root);
  });

  test('마지막 card 제품의 미지원 Lucide icon을 첫 write 전에 거부한다', () => {
    const root = makeRepo();
    const products = PRODUCTS.map((product) =>
      product.id === 'dummy-file-generator'
        ? { ...product, icon: 'UnsupportedFixtureIcon' }
        : product,
    );

    assert.throws(
      () => sync({ root, products }),
      /dummy-file-generator[\s\S]*icon[\s\S]*UnsupportedFixtureIcon[\s\S]*lucide-react/,
    );
    assertFirstTargetWasNotWritten(root);
  });

  test('이름만 존재하고 값이 없는 Lucide export를 첫 write 전에 거부한다', () => {
    const root = makeRepo();
    const lucideExports = Object.fromEntries(
      PRODUCTS.filter(({ header }) => header === 'card').map(({ icon }) => [icon, {}]),
    );
    lucideExports.FilePlus2 = undefined;

    assert.throws(
      () => sync({ root, lucideExports }),
      /dummy-file-generator[\s\S]*icon[\s\S]*FilePlus2[\s\S]*lucide-react/,
    );
    assertFirstTargetWasNotWritten(root);
  });

  for (const check of [false, true]) {
    test(`마지막 web tool의 package semver range를 ${check ? 'check' : 'write'} 전에 거부한다`, () => {
      const root = makeRepo();
      const path = join(root, 'dummy-file-generator/package.json');
      const packageJson = JSON.parse(readFileSync(path, 'utf8'));
      packageJson.dependencies['lucide-react'] = '^1.14.0';
      writeJson(path, packageJson);

      assert.throws(
        () => sync({ root, check }),
        /dummy-file-generator[\s\S]*package\.json[\s\S]*lucide-react[\s\S]*\^1\.14\.0/,
      );
      assertFirstTargetWasNotWritten(root);
    });
  }

  test('마지막 web tool의 lock resolved version 불일치를 첫 write 전에 거부한다', () => {
    const root = makeRepo();
    const path = join(root, 'dummy-file-generator/package-lock.json');
    const lock = JSON.parse(readFileSync(path, 'utf8'));
    lock.packages['node_modules/lucide-react'].version = '1.13.0';
    writeJson(path, lock);

    assert.throws(
      () => sync({ root }),
      /dummy-file-generator[\s\S]*package-lock\.json[\s\S]*node_modules\/lucide-react[\s\S]*1\.13\.0/,
    );
    assertFirstTargetWasNotWritten(root);
  });

  test('lock root declaration 누락을 fallback 위치로 보완하지 않는다', () => {
    const root = makeRepo();
    const path = join(root, 'dummy-file-generator/package-lock.json');
    const lock = JSON.parse(readFileSync(path, 'utf8'));
    delete lock.packages[''].dependencies['lucide-react'];
    lock.packages['node_modules/some-package/node_modules/lucide-react'] = {
      version: REQUIRED_LUCIDE_VERSION,
    };
    writeJson(path, lock);

    assert.throws(
      () => sync({ root }),
      /dummy-file-generator[\s\S]*package-lock\.json[\s\S]*root[\s\S]*lucide-react/,
    );
    assertFirstTargetWasNotWritten(root);
  });

  test('마지막 manifest의 malformed JSON을 첫 write 전에 거부한다', () => {
    const root = makeRepo();
    const path = join(
      root,
      'packages/design-system/favicons/dummy-file-generator/site.webmanifest',
    );
    writeFileSync(path, '{ "name": ');

    assert.throws(
      () => sync({ root }),
      /dummy-file-generator[\s\S]*site\.webmanifest[\s\S]*JSON/,
    );
    assertFirstTargetWasNotWritten(root);
  });

  test('마지막 manifest의 중복·부분 icon과 잘못된 display를 첫 write 전에 거부한다', () => {
    const invalidManifests = [
      {
        name: '중복 32x32 icon',
        change(manifest) {
          manifest.icons.push({ ...manifest.icons[0] });
        },
      },
      {
        name: 'type이 빠진 180x180 icon',
        change(manifest) {
          manifest.icons[1] = { src: '/apple-touch-icon.png', sizes: '180x180' };
        },
      },
      {
        name: '잘못된 display',
        change(manifest) {
          manifest.display = 'browser';
        },
      },
    ];

    for (const fixture of invalidManifests) {
      const root = makeRepo();
      const product = PRODUCTS.at(-1);
      const path = join(root, `packages/design-system/favicons/${product.id}/site.webmanifest`);
      const manifest = manifestFor(product);
      fixture.change(manifest);
      writeJson(path, manifest);

      assert.throws(
        () => sync({ root }),
        new RegExp(`${product.id}[\\s\\S]*site\\.webmanifest[\\s\\S]*(icons|display)`),
        fixture.name,
      );
      assertFirstTargetWasNotWritten(root);
    }
  });

  test('마지막 제품의 누락된 표준 E2E directory를 첫 write 전에 거부한다', () => {
    const root = makeRepo();
    rmSync(join(root, 'dummy-file-generator/e2e'), { recursive: true });

    assert.throws(
      () => sync({ root }),
      /dummy-file-generator[\s\S]*e2e[\s\S]*디렉터리/,
    );
    assertFirstTargetWasNotWritten(root);
  });

  test('표준 component directory의 app 밖 symlink를 첫 write 전에 거부한다', () => {
    const root = makeRepo();
    const componentDir = join(root, 'dummy-file-generator/app/_components/design-system');
    const outside = mkdtempSync(join(tmpdir(), 'ds-preflight-outside-'));
    rmSync(componentDir, { recursive: true });
    symlinkSync(outside, componentDir, 'dir');

    assert.throws(
      () => sync({ root }),
      /dummy-file-generator[\s\S]*componentDir[\s\S]*앱 밖/,
    );
    assertFirstTargetWasNotWritten(root);
  });

  test('마지막 canonical favicon이 일반 파일이 아니면 첫 write 전에 거부한다', () => {
    const root = makeRepo();
    const favicon = join(
      root,
      'packages/design-system/favicons/dummy-file-generator/site.webmanifest',
    );
    rmSync(favicon);
    mkdirSync(favicon);

    assert.throws(
      () => sync({ root }),
      /dummy-file-generator[\s\S]*site\.webmanifest[\s\S]*일반 파일/,
    );
    assertFirstTargetWasNotWritten(root);
  });
});

describe('buildOperations', () => {
  test('9개 토큰, 7개 React·E2E, 8개 favicon 대상의 생성 operation을 모두 메모리에서 만든다', () => {
    const root = makeRepo();
    const operations = buildOperations({ root });
    const expectedTargets = [
      ...TOKEN_TARGETS_EXPECTED.flatMap(([app, stylesDir]) =>
        TOKEN_FILES_EXPECTED.map((name) => `${app}/${stylesDir}/${name}`),
      ),
      ...COMPONENT_TARGETS_EXPECTED.flatMap(([app, componentDir]) =>
        COMPONENT_FILES_EXPECTED.map((name) => `${app}/${componentDir}/${name}`),
      ),
      ...COMPONENT_TARGETS_EXPECTED.flatMap(([app]) =>
        E2E_FILES_EXPECTED.map((name) => `${app}/e2e/${name}`),
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

    const testProduct = operations.find(
      ({ targetPath }) => targetPath === 'sign-maker/e2e/product.generated.ts',
    );
    assert.ok(testProduct);
    assert.match(String(testProduct.content), /"id": "sign-maker"/);
    assert.match(String(testProduct.content), /"name": "Sign Maker"/);
    assert.doesNotMatch(String(testProduct.content), /description|ProductIcon|lucide-react/);
  });
});

describe('sync', () => {
  test('대상 앱에 정본 파일을 전부 복사하고 복사한 경로를 반환한다', () => {
    const root = makeRepo();
    const drifted = sync({ root });

    assert.equal(drifted.length, 186);
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
      readFileSync(join(root, 'sign-maker/e2e/ds-shell-contract-e2e.ts'), 'utf8')
        .endsWith('// shell-contract-e2e.ts 본문\n'),
    );
    assert.ok(existsSync(join(root, 'sign-maker/e2e/shell-contract.spec.ts')));
    assert.ok(existsSync(join(root, 'sign-maker/e2e/product.generated.ts')));
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

    assert.equal(drifted.length, 186);
    assert.equal(existsSync(join(root, 'sign-maker/src/styles/ds-tokens.css')), false);
    assert.equal(
      existsSync(join(root, 'sign-maker/src/components/design-system/Button.tsx')),
      false,
    );
    assert.equal(existsSync(join(root, 'sign-maker/e2e/shell-contract.spec.ts')), false);
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

  test('E2E 생성물이 수정되면 check가 해당 파일만 불일치로 감지한다', () => {
    const root = makeRepo();
    sync({ root });
    const path = join(root, 'sign-maker/e2e/shell-contract.spec.ts');
    writeFileSync(path, readFileSync(path, 'utf8') + '// 손으로 고친 흔적\n');

    assert.deepEqual(sync({ root, check: true }), [
      'sign-maker/e2e/shell-contract.spec.ts',
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
    rmSync(join(root, 'dummy-file-generator/app'), { recursive: true });
    writeFileSync(join(root, 'dummy-file-generator/app'), '생성 디렉터리가 아님');

    assert.throws(() => sync({ root }), /dummy-file-generator[\s\S]*디렉터리/);
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

  for (const check of [false, true]) {
    test(`앱 내부 target file의 외부 symlink를 ${check ? 'check' : 'write'} 전에 거부한다`, () => {
      const root = makeRepo();
      const targetPath = 'sign-maker/src/styles/ds-tokens.css';
      const target = join(root, targetPath);
      const outside = mkdtempSync(join(tmpdir(), 'ds-target-file-outside-'));
      const outsideFile = join(outside, 'external.css');
      const outsideContent = check ? render('tokens.css', root) : '외부 파일 원본\n';
      writeFileSync(outsideFile, outsideContent);
      symlinkSync(outsideFile, target, 'file');

      let error;
      try {
        sync({ root, check });
      } catch (caught) {
        error = caught;
      }

      assert.equal(readFileSync(outsideFile, 'utf8'), outsideContent);
      assert.ok(error, `${check ? 'check' : 'write'} mode가 target file symlink를 거부해야 한다`);
      assert.match(error.message, /sign-maker\/src\/styles\/ds-tokens\.css/);
      assert.match(error.message, /symlink/);
      assert.equal(lstatSync(target).isSymbolicLink(), true);
    });
  }

  test('두 번째 원자 교체 실패가 written과 remaining drift를 보고하고 임시 파일을 지운다', () => {
    const root = makeRepo();
    const writtenTarget = 'sign-maker/src/styles/ds-tokens.css';
    const failedTarget = 'sign-maker/src/styles/ds-base.css';
    const untouchedTarget = 'sign-maker/src/styles/ds-primitives.css';
    let writeCount = 0;
    const diskError = new Error('fixture replace ENOSPC');
    const writeTarget = (path, content) => {
      writeCount += 1;
      return syncModule.atomicWrite(path, content, {
        replace(source, target) {
          if (writeCount === 2) throw diskError;
          renameSync(source, target);
        },
      });
    };

    let error;
    assert.throws(() => sync({ root, writeTarget }), (caught) => {
      error = caught;
      return true;
    });

    assert.equal(error.failedTarget, failedTarget);
    assert.equal(error.cause, diskError);
    assert.deepEqual(error.writtenTargets, [writtenTarget]);
    assert.equal(error.remainingDrift[0], failedTarget);
    assert.ok(error.remainingDrift.includes(untouchedTarget));
    assert.match(error.message, new RegExp(failedTarget.replaceAll('.', '\\.')));
    assert.match(error.message, /fixture replace ENOSPC/);
    assert.match(error.message, new RegExp(writtenTarget.replaceAll('.', '\\.')));
    assert.match(error.message, new RegExp(untouchedTarget.replaceAll('.', '\\.')));
    assert.equal(existsSync(join(root, writtenTarget)), true);
    assert.equal(existsSync(join(root, failedTarget)), false);
    assert.equal(existsSync(join(root, untouchedTarget)), false);
    assert.deepEqual(
      readdirSync(join(root, 'sign-maker/src/styles')).filter((name) => name.startsWith('.ds-tokens.css.tmp-')),
      [],
    );
    assert.deepEqual(
      readdirSync(join(root, 'sign-maker/src/styles')).filter((name) => name.startsWith('.ds-base.css.tmp-')),
      [],
    );

    const remaining = sync({ root, check: true });
    assert.equal(remaining.length, 185);
    assert.equal(remaining.includes(writtenTarget), false);
    assert.equal(remaining[0], failedTarget);
  });
});

describe('validateOperations', () => {
  test('앱 내부의 기존 regular target file은 허용한다', () => {
    const root = makeRepo();
    const targetPath = 'sign-maker/src/styles/ds-tokens.css';
    writeFileSync(join(root, targetPath), '기존 regular file\n');

    assert.doesNotThrow(() => validateOperations([
      { sourcePath: 'packages/design-system/tokens.css', targetPath, content: '새 내용\n' },
    ], { root }));
  });

  test('존재하지 않는 파일을 가리키는 dangling target symlink도 거부한다', () => {
    const root = makeRepo();
    const targetPath = 'sign-maker/src/styles/ds-tokens.css';
    const target = join(root, targetPath);
    symlinkSync('missing-external.css', target, 'file');

    assert.throws(
      () => validateOperations([
        { sourcePath: 'packages/design-system/tokens.css', targetPath, content: '새 내용\n' },
      ], { root }),
      /ds-tokens\.css[\s\S]*symlink|symlink[\s\S]*ds-tokens\.css/,
    );
    assert.equal(lstatSync(target).isSymbolicLink(), true);
  });

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
