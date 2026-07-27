#!/usr/bin/env node
import {
  existsSync,
  lstatSync,
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
import * as lucideReact from 'lucide-react';

import {
  PRODUCTS,
  WEB_TOOLS,
  validateProducts,
} from '../packages/design-system/products.mjs';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const DEFAULT_ROOT = join(SCRIPT_DIR, '..');
const CANONICAL_DIR = 'packages/design-system';
const REQUIRED_LUCIDE_VERSION = '1.14.0';

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

/** 브라우저 셸 계약 정본 파일명 → 각 웹 도구 E2E 디렉터리의 생성 파일명. */
export const E2E_FILES = Object.freeze({
  'shell-contract-e2e.ts': 'ds-shell-contract-e2e.ts',
  'shell-contract.spec.ts': 'shell-contract.spec.ts',
});

export const FAVICON_FILES = Object.freeze([
  'favicon.svg',
  'favicon.ico',
  'favicon-16x16.png',
  'favicon-32x32.png',
  'apple-touch-icon.png',
  'site.webmanifest',
]);

export const WEB_TOOL_TARGETS = Object.freeze(
  Object.fromEntries(WEB_TOOLS.map(({ id, componentDir }) => [id, componentDir])),
);

function printable(value) {
  return value === undefined ? 'undefined' : JSON.stringify(value);
}

function readJsonFile(path, { owner, field, relativePath }) {
  if (!existsSync(path)) {
    throw new Error(
      `${owner} field "${field}" 파일이 없다: path="${relativePath}", value="missing"`,
    );
  }
  if (!lstatSync(path).isFile()) {
    throw new Error(
      `${owner} field "${field}"가 일반 파일이 아니다: path="${relativePath}", value="not a regular file"`,
    );
  }
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    const cause = error instanceof Error ? error.message : String(error);
    throw new Error(
      `${owner} field "${field}" JSON이 올바르지 않다: path="${relativePath}", value=${printable(cause)}`,
      { cause: error },
    );
  }
}

function validateDirectory(root, app, relativePath, field) {
  const appPath = resolve(root, app);
  const owner = `대상 "${app}"`;
  if (!existsSync(appPath)) throw new Error(`대상 앱이 없다: ${app} (field "appDir", path="${app}")`);
  if (!statSync(appPath).isDirectory()) {
    throw new Error(`대상 앱이 디렉터리가 아니다: ${app} (field "appDir", path="${app}")`);
  }

  const realRoot = realpathSync(root);
  const realApp = realpathSync(appPath);
  if (!isInside(realApp, realRoot)) {
    throw new Error(`${owner} field "appDir" 경로가 저장소 밖이다: path="${app}", value="${realApp}"`);
  }

  if (relativePath === undefined) return;
  const path = resolve(appPath, relativePath);
  const displayPath = `${app}/${relativePath}`;
  if (!existsSync(path)) {
    throw new Error(
      `${owner} field "${field}" 경로가 디렉터리가 아니다: path="${displayPath}", value="missing"`,
    );
  }
  if (!statSync(path).isDirectory()) {
    throw new Error(
      `${owner} field "${field}" 경로가 디렉터리가 아니다: path="${displayPath}", value="not a directory"`,
    );
  }
  const realDirectory = realpathSync(path);
  if (!isInside(realDirectory, realApp)) {
    throw new Error(
      `${owner} field "${field}" 경로가 앱 밖이다: path="${displayPath}", value="${realDirectory}"`,
    );
  }
}

function validateLucideDependency(root, product) {
  const owner = `제품 "${product.id}"`;
  const packagePath = `${product.id}/package.json`;
  const packageJson = readJsonFile(resolve(root, packagePath), {
    owner,
    field: 'package.json',
    relativePath: packagePath,
  });
  const declaration = packageJson.dependencies?.['lucide-react'];
  if (declaration !== REQUIRED_LUCIDE_VERSION) {
    throw new Error(
      `${owner} package.json field "dependencies.lucide-react"가 정확하지 않다: path="${packagePath}", expected="${REQUIRED_LUCIDE_VERSION}", value=${printable(declaration)}`,
    );
  }

  const lockPath = `${product.id}/package-lock.json`;
  const lock = readJsonFile(resolve(root, lockPath), {
    owner,
    field: 'package-lock.json',
    relativePath: lockPath,
  });
  const rootDeclaration = lock.packages?.['']?.dependencies?.['lucide-react'];
  if (rootDeclaration !== REQUIRED_LUCIDE_VERSION) {
    throw new Error(
      `${owner} package-lock.json field "root dependencies.lucide-react"가 정확하지 않다: path="${lockPath}", expected="${REQUIRED_LUCIDE_VERSION}", value=${printable(rootDeclaration)}`,
    );
  }
  const resolvedVersion = lock.packages?.['node_modules/lucide-react']?.version;
  if (resolvedVersion !== REQUIRED_LUCIDE_VERSION) {
    throw new Error(
      `${owner} package-lock.json field "node_modules/lucide-react.version"이 정확하지 않다: path="${lockPath}", expected="${REQUIRED_LUCIDE_VERSION}", value=${printable(resolvedVersion)}`,
    );
  }
}

function validateManifest(root, product) {
  const owner = `제품 "${product.id}"`;
  const relativePath = `${CANONICAL_DIR}/favicons/${product.id}/site.webmanifest`;
  const manifest = readJsonFile(resolve(root, relativePath), {
    owner,
    field: 'site.webmanifest',
    relativePath,
  });
  const invalid = (field, expected, value) => {
    throw new Error(
      `${owner} site.webmanifest field "${field}"가 정확하지 않다: path="${relativePath}", expected=${printable(expected)}, value=${printable(value)}`,
    );
  };

  for (const field of ['name', 'short_name']) {
    if (manifest[field] !== product.name) invalid(field, product.name, manifest[field]);
  }
  for (const [field, expected] of [
    ['theme_color', '#3366ff'],
    ['background_color', '#f7f7f8'],
    ['display', 'standalone'],
  ]) {
    if (manifest[field] !== expected) invalid(field, expected, manifest[field]);
  }
  if (!Array.isArray(manifest.icons)) invalid('icons', 'array', manifest.icons);

  const requiredIcons = [
    { src: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    { src: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
  ];
  for (const required of requiredIcons) {
    const related = manifest.icons.filter(
      (icon) => icon?.src === required.src || icon?.sizes === required.sizes,
    );
    if (
      related.length !== 1 ||
      related[0].src !== required.src ||
      related[0].sizes !== required.sizes ||
      related[0].type !== required.type
    ) {
      invalid('icons', required, related);
    }
  }
}

/** buildOperations 전에 저장소 전체 생성 입력 계약을 검증한다. */
export function validatePreflight({
  root = DEFAULT_ROOT,
  products = PRODUCTS,
  lucideExports = lucideReact,
} = {}) {
  validateProducts(products);
  const webTools = products.filter(({ header }) => header === 'card');

  for (const product of webTools) {
    if (!Object.hasOwn(lucideExports, product.icon) || lucideExports[product.icon] == null) {
      throw new Error(
        `제품 "${product.id}" field "icon" value=${printable(product.icon)}은 설치된 lucide-react named export가 아니다`,
      );
    }
  }

  for (const app of new Set([...Object.keys(TOKEN_TARGETS), ...products.map(({ id }) => id)])) {
    validateDirectory(root, app);
  }
  for (const [app, stylesDir] of Object.entries(TOKEN_TARGETS)) {
    validateDirectory(root, app, stylesDir, 'stylesDir');
  }
  for (const product of products) {
    validateDirectory(root, product.id, product.stylesDir, 'stylesDir');
    validateDirectory(root, product.id, product.publicDir, 'publicDir');
    if (product.header === 'card') {
      validateDirectory(root, product.id, product.componentDir, 'componentDir');
      validateDirectory(root, product.id, 'e2e', 'e2eDir');
    }
  }

  for (const product of webTools) validateLucideDependency(root, product);

  for (const product of products) {
    for (const sourceName of FAVICON_FILES) {
      const relativePath = `${CANONICAL_DIR}/favicons/${product.id}/${sourceName}`;
      const path = resolve(root, relativePath);
      if (!existsSync(path) || !lstatSync(path).isFile()) {
        throw new Error(
          `제품 "${product.id}" field "favicon.${sourceName}"가 일반 파일이 아니다: path="${relativePath}", value=${existsSync(path) ? '"not a regular file"' : '"missing"'}`,
        );
      }
    }
    validateManifest(root, product);
  }
}

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

function renderE2E(sourceName, root) {
  const sourcePath = `${CANONICAL_DIR}/${sourceName}`;
  return generatedBanner(sourcePath) + readFileSync(resolve(root, sourcePath), 'utf8');
}

function renderTestProduct(product) {
  return (
    generatedBanner(`${CANONICAL_DIR}/products.mjs`) +
    `export const TEST_PRODUCT = ${JSON.stringify(
      { id: product.id, name: product.name },
      null,
      2,
    )} as const;\n`
  );
}

/**
 * 쓰기 전에 전체 생성 계획과 내용을 메모리에 만든다.
 * @returns {{ sourcePath: string, targetPath: string, content: Buffer | string }[]}
 */
export function buildOperations({ root = DEFAULT_ROOT, products = PRODUCTS } = {}) {
  const operations = [];
  const webTools = products.filter(({ header }) => header === 'card');

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

  for (const product of webTools) {
    const componentDir = product.componentDir;
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
    for (const [sourceName, targetName] of Object.entries(E2E_FILES)) {
      operations.push({
        sourcePath: `${CANONICAL_DIR}/${sourceName}`,
        targetPath: `${product.id}/e2e/${targetName}`,
        content: renderE2E(sourceName, root),
      });
    }
    operations.push({
      sourcePath: `${CANONICAL_DIR}/products.mjs`,
      targetPath: `${product.id}/e2e/product.generated.ts`,
      content: renderTestProduct(product),
    });
  }

  for (const product of products) {
    for (const sourceName of FAVICON_FILES) {
      const sourcePath = `${CANONICAL_DIR}/favicons/${product.id}/${sourceName}`;
      operations.push({
        sourcePath,
        targetPath: `${product.id}/${product.publicDir}/${sourceName}`,
        content: readFileSync(resolve(root, sourcePath)),
      });
    }
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
    const target = lstatSync(absolute, { throwIfNoEntry: false });
    if (target) {
      if (target.isSymbolicLink()) {
        throw new Error(`생성 대상 file symlink를 허용하지 않는다: ${operation.targetPath}`);
      }
      if (!target.isFile()) {
        throw new Error(`생성 대상이 일반 파일이 아니다: ${operation.targetPath}`);
      }
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

export function atomicWrite(path, content, { replace = renameSync } = {}) {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = join(dirname(path), `.${basename(path)}.tmp-${process.pid}`);
  try {
    writeFileSync(temporary, content);
    replace(temporary, path);
  } finally {
    if (existsSync(temporary)) unlinkSync(temporary);
  }
}

export class SyncWriteError extends Error {
  constructor({ failedTarget, cause, writtenTargets, remainingDrift }) {
    const causeMessage = cause instanceof Error ? cause.message : String(cause);
    const lines = (targets) => targets.length > 0
      ? targets.map((target) => `  ${target}`)
      : ['  (없음)'];
    super([
      `생성물 쓰기에 실패했다: ${failedTarget}`,
      `원인: ${causeMessage}`,
      '이번 실행에서 이미 쓴 대상:',
      ...lines(writtenTargets),
      '남은 drift (실패 대상 포함):',
      ...lines(remainingDrift),
    ].join('\n'), { cause });
    this.name = 'SyncWriteError';
    this.failedTarget = failedTarget;
    this.writtenTargets = Object.freeze([...writtenTargets]);
    this.remainingDrift = Object.freeze([...remainingDrift]);
  }
}

/** 정본과 다른 생성물 경로를 반환하고, check가 아니면 원자적으로 교체한다. */
export function sync({
  root = DEFAULT_ROOT,
  check = false,
  products = PRODUCTS,
  lucideExports = lucideReact,
  writeTarget = atomicWrite,
} = {}) {
  validatePreflight({ root, products, lucideExports });
  const operations = buildOperations({ root, products });
  validateOperations(operations, { root });
  const drifted = operations.filter(
    ({ targetPath, content }) => !sameContent(resolve(root, targetPath), content),
  );
  if (!check) {
    const writtenTargets = [];
    for (const [index, operation] of drifted.entries()) {
      try {
        writeTarget(resolve(root, operation.targetPath), operation.content);
      } catch (cause) {
        throw new SyncWriteError({
          failedTarget: operation.targetPath,
          cause,
          writtenTargets,
          remainingDrift: drifted.slice(index).map(({ targetPath }) => targetPath),
        });
      }
      writtenTargets.push(operation.targetPath);
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
