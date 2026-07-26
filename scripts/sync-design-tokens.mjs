#!/usr/bin/env node
/**
 * 디자인 시스템 정본 CSS 를 각 앱의 styles 디렉터리로 복사한다.
 *
 *   node scripts/sync-design-tokens.mjs           복사 실행
 *   node scripts/sync-design-tokens.mjs --check    파일을 쓰지 않고 불일치만 보고
 *
 * 의존성 없이 Node 내장 모듈만 사용한다. 루트 package.json 에 dependencies 를
 * 두지 않기 위한 제약이며, 그 덕에 앱들의 lockfile 을 건드리지 않는다.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const DEFAULT_ROOT = join(SCRIPT_DIR, '..');
const CANONICAL_DIR = 'packages/design-system';

/** 정본 파일명 → 앱에 복사될 파일명. ds- 접두사로 생성물임을 드러낸다. */
export const FILES = {
  'tokens.css': 'ds-tokens.css',
  'base.css': 'ds-base.css',
  'primitives.css': 'ds-primitives.css',
  'ds-sync.test.ts': 'ds-sync.test.ts',
};

/**
 * 앱 디렉터리 → styles 디렉터리 상대 경로.
 * 마이그레이션이 완료된 앱만 담는다. 새 앱을 마이그레이션할 때 여기에 추가한다.
 */
export const TARGETS = {
  'sign-maker': 'src/styles',
  'json-yaml-converter': 'src/styles',
  'ddl-seed-generator': 'app/styles',
};

/** 복사본 맨 앞에 붙는 경고 배너. */
function banner(sourceName) {
  return [
    `/* 이 파일은 ${CANONICAL_DIR}/${sourceName} 에서 생성되었다.`,
    '   직접 편집하지 말고 정본을 고친 뒤 저장소 루트에서',
    '   `npm run tokens:sync` 를 실행한다. */',
    '',
  ].join('\n');
}

/** 정본 본문 앞에 배너를 붙여 복사본 내용을 만든다. */
export function render(sourceName, root = DEFAULT_ROOT) {
  const body = readFileSync(join(root, CANONICAL_DIR, sourceName), 'utf8');
  return banner(sourceName) + body;
}

/**
 * 정본을 대상 앱들로 복사한다.
 * @returns {string[]} 정본과 달랐던 복사본의 저장소 상대 경로
 */
export function sync({ check = false, root = DEFAULT_ROOT } = {}) {
  const drifted = [];

  for (const [app, stylesDir] of Object.entries(TARGETS)) {
    for (const [sourceName, targetName] of Object.entries(FILES)) {
      const expected = render(sourceName, root);
      const relativePath = `${app}/${stylesDir}/${targetName}`;
      const targetPath = join(root, app, stylesDir, targetName);
      const actual = existsSync(targetPath) ? readFileSync(targetPath, 'utf8') : null;

      if (actual === expected) continue;

      drifted.push(relativePath);
      if (check) continue;

      mkdirSync(dirname(targetPath), { recursive: true });
      writeFileSync(targetPath, expected);
    }
  }

  return drifted;
}

/** CLI 로 직접 실행됐을 때만 동작한다. import 시에는 실행되지 않는다. */
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const check = process.argv.includes('--check');
  const drifted = sync({ check });

  if (drifted.length === 0) {
    console.log('디자인 시스템 정본과 모든 복사본이 일치합니다.');
    process.exit(0);
  }

  if (check) {
    console.error('정본과 다른 복사본이 있습니다:');
    for (const path of drifted) console.error(`  ${path}`);
    console.error('\n`npm run tokens:sync` 를 실행하세요.');
    process.exit(1);
  }

  console.log('동기화했습니다:');
  for (const path of drifted) console.log(`  ${path}`);
}
