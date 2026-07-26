#!/usr/bin/env node
import {
  existsSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  renameSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { basename, dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import { WEB_TOOLS } from '../packages/design-system/products.mjs';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const DEFAULT_ROOT = join(SCRIPT_DIR, '..');
const CANONICAL_DIR = 'packages/design-system';

/** 정본 파일명 → 앱에 복사될 파일명. */
export const FILES = Object.freeze({
  'tokens.css': 'ds-tokens.css',
  'base.css': 'ds-base.css',
  'primitives.css': 'ds-primitives.css',
  'ds-sync.test.ts': 'ds-sync.test.ts',
  'ds-contrast.test.ts': 'ds-contrast.test.ts',
  'ds-contrast-e2e.ts': 'ds-contrast-e2e.ts',
});

/** 기존 토큰 동기화 대상 9개 앱과 styles 디렉터리. */
export const TARGETS = Object.freeze({
  'sign-maker': 'src/styles',
  'json-yaml-converter': 'src/styles',
  'ddl-seed-generator': 'app/styles',
  'openapi-editor': 'src/styles',
  'dummy-file-generator': 'app/styles',
  'config-diff-viewer': 'app/styles',
  home: 'src/styles',
  'webpage-capture-tool': 'apps/electron/renderer/styles',
  'api-contract-test-generator': 'src/styles',
});

export const TOKEN_TARGETS = TARGETS;

export const COMPONENT_FILES = Object.freeze([
  'BrandMark.tsx',
  'ThemeToggle.tsx',
  'Button.tsx',
  'SegmentedControl.tsx',
  'EmptyState.tsx',
  'Badge.tsx',
  'ToolHeader.tsx',
  'components.test.tsx',
]);

export const WEB_TOOL_TARGETS = Object.freeze(
  Object.fromEntries(WEB_TOOLS.map(({ id, componentDir }) => [id, componentDir])),
);

function tokenBanner(sourceName) {
  return [
    `/* 이 파일은 ${CANONICAL_DIR}/${sourceName} 에서 생성되었다.`,
    '   직접 편집하지 말고 정본을 고친 뒤 저장소 루트에서',
    '   `npm run tokens:sync` 를 실행한다. */',
    '',
  ].join('\n');
}

function generatedBanner(sourcePath) {
  return [
    `// 이 파일은 ${sourcePath} 에서 생성되었다.`,
    '// 직접 편집하지 말고 정본을 고친 뒤 저장소 루트에서',
    '// `npm run design-system:sync` 를 실행한다.',
    '',
  ].join('\n');
}

/** 기존 토큰 API 호환용 렌더러. */
export function render(sourceName, root = DEFAULT_ROOT) {
  const body = readFileSync(join(root, CANONICAL_DIR, sourceName), 'utf8');
  return tokenBanner(sourceName) + body;
}

function renderComponent(sourceName, root) {
  const sourcePath = `${CANONICAL_DIR}/components/${sourceName}`;
  return generatedBanner(sourcePath) + readFileSync(resolve(root, sourcePath), 'utf8');
}

function renderProduct(product) {
  return (
    generatedBanner(`${CANONICAL_DIR}/products.mjs`) +
    `import { ${product.icon} } from 'lucide-react';\n` +
    `export const PRODUCT = ${JSON.stringify(
      { id: product.id, name: product.name, description: product.description },
      null,
      2,
    )} as const;\n` +
    `export const ProductIcon = ${product.icon};\n`
  );
}

/**
 * 쓰기 전에 전체 생성 계획과 내용을 메모리에 만든다.
 * @returns {{ sourcePath: string, targetPath: string, content: Buffer | string }[]}
 */
export function buildOperations({ root = DEFAULT_ROOT } = {}) {
  const operations = [];

  for (const [app, stylesDir] of Object.entries(TOKEN_TARGETS)) {
    for (const [sourceName, targetName] of Object.entries(FILES)) {
      operations.push({
        sourcePath: `${CANONICAL_DIR}/${sourceName}`,
        targetPath: `${app}/${stylesDir}/${targetName}`,
        content: render(sourceName, root),
      });
    }
  }

  // 제품 생성물의 내용은 검증된 메타데이터에서 렌더링하지만, 정본 파일 자체가
  // 누락된 저장소에서도 쓰기가 시작되지 않도록 이 단계에서 존재를 확인한다.
  readFileSync(resolve(root, CANONICAL_DIR, 'products.mjs'));

  for (const product of WEB_TOOLS) {
    const componentDir = WEB_TOOL_TARGETS[product.id];
    for (const sourceName of COMPONENT_FILES) {
      operations.push({
        sourcePath: `${CANONICAL_DIR}/components/${sourceName}`,
        targetPath: `${product.id}/${componentDir}/${sourceName}`,
        content: renderComponent(sourceName, root),
      });
    }
    operations.push({
      sourcePath: `${CANONICAL_DIR}/products.mjs`,
      targetPath: `${product.id}/${componentDir}/product.generated.ts`,
      content: renderProduct(product),
    });
  }

  return operations;
}

function nearestExistingAncestor(path) {
  let current = path;
  while (!existsSync(current)) {
    const parent = dirname(current);
    if (parent === current) return current;
    current = parent;
  }
  return current;
}

function isInside(path, directory) {
  return path === directory || path.startsWith(`${directory}${sep}`);
}

/** 전체 operation의 경계·중복·대상 존재를 쓰기 전에 검증한다. */
export function validateOperations(operations, { root = DEFAULT_ROOT } = {}) {
  const targets = new Set();
  const realRoot = realpathSync(root);
  for (const operation of operations) {
    if (
      operation.targetPath.startsWith('/') ||
      operation.targetPath.split('/').includes('..')
    ) {
      throw new Error(`생성 대상이 앱 밖이다: ${operation.targetPath}`);
    }
    const absolute = resolve(root, operation.targetPath);
    const app = operation.targetPath.split('/')[0];
    const appRoot = resolve(root, app);
    if (absolute !== appRoot && !absolute.startsWith(`${appRoot}${sep}`)) {
      throw new Error(`생성 대상이 앱 밖이다: ${operation.targetPath}`);
    }
    if (!existsSync(appRoot)) throw new Error(`대상 앱이 없다: ${app}`);
    if (!statSync(appRoot).isDirectory()) {
      throw new Error(`대상 앱이 디렉터리가 아니다: ${app}`);
    }

    const realAppRoot = realpathSync(appRoot);
    const existingTargetAncestor = nearestExistingAncestor(dirname(absolute));
    if (!statSync(existingTargetAncestor).isDirectory()) {
      throw new Error(`생성 대상 부모가 디렉터리가 아니다: ${operation.targetPath}`);
    }
    const realTarget = resolve(
      realpathSync(existingTargetAncestor),
      relative(existingTargetAncestor, absolute),
    );
    if (!isInside(realAppRoot, realRoot) || !isInside(realTarget, realAppRoot)) {
      throw new Error(`생성 대상이 앱 밖이다: ${operation.targetPath}`);
    }
    if (targets.has(realTarget)) {
      throw new Error(`중복 생성 대상: ${operation.targetPath}`);
    }
    targets.add(realTarget);
  }
}

function sameContent(path, content) {
  if (!existsSync(path)) return false;
  try {
    const actual = readFileSync(path);
    const expected = Buffer.isBuffer(content) ? content : Buffer.from(content);
    return actual.equals(expected);
  } catch {
    return false;
  }
}

function atomicWrite(path, content) {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = join(dirname(path), `.${basename(path)}.tmp-${process.pid}`);
  try {
    writeFileSync(temporary, content);
    renameSync(temporary, path);
  } finally {
    if (existsSync(temporary)) unlinkSync(temporary);
  }
}

/** 정본과 다른 생성물 경로를 반환하고, check가 아니면 원자적으로 교체한다. */
export function sync({ root = DEFAULT_ROOT, check = false } = {}) {
  const operations = buildOperations({ root });
  validateOperations(operations, { root });
  const drifted = operations.filter(
    ({ targetPath, content }) => !sameContent(resolve(root, targetPath), content),
  );
  if (!check) {
    for (const operation of drifted) {
      atomicWrite(resolve(root, operation.targetPath), operation.content);
    }
  }
  return drifted.map(({ targetPath }) => targetPath);
}

export async function runCli(argv) {
  const unknown = argv.filter((argument) => argument !== '--check');
  if (unknown.length > 0) throw new Error(`알 수 없는 옵션: ${unknown.join(', ')}`);

  const check = argv.includes('--check');
  const drifted = sync({ check });
  if (drifted.length === 0) {
    console.log('디자인 시스템 정본과 모든 복사본이 일치합니다.');
    return;
  }

  if (check) {
    console.error('정본과 다른 복사본이 있습니다:');
    for (const path of drifted) console.error(`  ${path}`);
    console.error('\n`npm run design-system:sync` 를 실행하세요.');
    process.exitCode = 1;
    return;
  }

  console.log('동기화했습니다:');
  for (const path of drifted) console.log(`  ${path}`);
}

function reportCliError(error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runCli(process.argv.slice(2)).catch(reportCliError);
}
