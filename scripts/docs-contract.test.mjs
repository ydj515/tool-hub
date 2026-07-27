import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { PRODUCTS, WEB_TOOLS } from '../packages/design-system/products.mjs';
import {
  COMPONENT_FILES,
  CSS_ONLY_TARGETS,
  E2E_FILES,
  FAVICON_FILES,
  FILES,
  TOKEN_TARGETS,
  WEB_TOOL_TARGETS,
} from './sync-design-system.mjs';

const REPOSITORY_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ROOT_AGENTS = 'AGENTS.md';
const CONTRIBUTOR_GUIDE = 'docs/contributor-guide.md';
const FRONTEND_CONVENTIONS = 'docs/frontend-conventions.md';
const DESIGN_SYSTEM_README = 'packages/design-system/README.md';

const WEB_PROJECTS = PRODUCTS.map(({ id }) => id);
const DESKTOP_PROJECTS = ['webpage-capture-tool'];
const KOTLIN_PROJECTS = ['class-diagram-generator'];
const ALL_PROJECTS = [...WEB_PROJECTS, ...DESKTOP_PROJECTS, ...KOTLIN_PROJECTS];

const PROJECT_REFERENCES = [
  ['home', '../home/AGENTS.md', '../home/docs/contributor-guide.md'],
  ['sign-maker', '../sign-maker/AGENTS.md', '../sign-maker/docs/contributor-guide.md'],
  [
    'json-yaml-converter',
    '../json-yaml-converter/AGENTS.md',
    '../json-yaml-converter/docs/contributor-guide.md',
  ],
  ['openapi-editor', '../openapi-editor/AGENTS.md', '../openapi-editor/docs/contributor-guide.md'],
  [
    'api-contract-test-generator',
    '../api-contract-test-generator/AGENTS.md',
    '../api-contract-test-generator/docs/contributor-guide.md',
  ],
  [
    'ddl-seed-generator',
    '../ddl-seed-generator/AGENTS.md',
    '../ddl-seed-generator/docs/contributor-guide.md',
  ],
  [
    'config-diff-viewer',
    '../config-diff-viewer/AGENTS.md',
    '../config-diff-viewer/docs/contributor-guide.md',
  ],
  [
    'dummy-file-generator',
    '../dummy-file-generator/AGENTS.md',
    '../dummy-file-generator/docs/contributor-guide.md',
  ],
  [
    'webpage-capture-tool',
    '../webpage-capture-tool/AGENTS.md',
    '../webpage-capture-tool/docs/contributor-guide.md',
  ],
  ['class-diagram-generator', null, '../class-diagram-generator/README.md'],
];

function read(path) {
  return readFileSync(resolve(REPOSITORY_ROOT, path), 'utf8');
}

function section(markdown, heading) {
  const lines = markdown.split('\n');
  const marker = `## ${heading}`;
  const start = lines.findIndex((line) => line.trim() === marker);
  assert.notEqual(start, -1, `문서 섹션이 없다: ${marker}`);
  const next = lines.findIndex((line, index) => index > start && /^##\s/.test(line));
  return lines.slice(start + 1, next === -1 ? undefined : next).join('\n');
}

function codeSpans(source) {
  return Array.from(source.matchAll(/`([^`]+)`/g), (match) => match[1]);
}

function linkTarget(source) {
  return source.match(/\[[^\]]+\]\(([^)]+)\)/)?.[1] ?? null;
}

function bulletLine(markdownSection, label) {
  const line = markdownSection
    .split('\n')
    .find((candidate) => candidate.startsWith(`- ${label}:`));
  assert.ok(line, `목록 항목이 없다: ${label}`);
  return line;
}

function tableRows(markdownSection, expectedHeader) {
  const rows = markdownSection
    .split('\n')
    .filter((line) => line.trim().startsWith('|'))
    .map((line) => line.split('|').slice(1, -1).map((cell) => cell.trim()));
  assert.ok(rows.length >= 2, `표가 없거나 불완전하다: ${expectedHeader.join(', ')}`);
  assert.deepEqual(rows[0], expectedHeader);
  assert.ok(rows[1].every((cell) => /^:?-+:?$/.test(cell)), 'Markdown 표 구분선이 없다');
  return rows.slice(2);
}

function sorted(values) {
  return [...values].sort();
}

function mappings(entries) {
  return entries.map(([source, target]) => `${source} → ${target}`);
}

test('루트 index와 contributor guide가 실제 10개 프로젝트를 구조적으로 열거한다', () => {
  for (const project of ALL_PROJECTS) {
    assert.ok(existsSync(resolve(REPOSITORY_ROOT, project)), `프로젝트가 없다: ${project}`);
  }

  const projects = section(read(ROOT_AGENTS), 'Projects');
  assert.deepEqual(
    codeSpans(bulletLine(projects, 'Web apps (8)')),
    WEB_PROJECTS.map((project) => `${project}/`),
  );
  assert.deepEqual(
    codeSpans(bulletLine(projects, 'Desktop app (1)')),
    DESKTOP_PROJECTS.map((project) => `${project}/`),
  );
  assert.deepEqual(
    codeSpans(bulletLine(projects, 'Server-rendered Kotlin app (1)')),
    KOTLIN_PROJECTS.map((project) => `${project}/`),
  );

  const references = tableRows(section(read(CONTRIBUTOR_GUIDE), 'Project-Specific References'), [
    'Project',
    'Local index',
    'Detailed guide',
  ]);
  assert.equal(references.length, PROJECT_REFERENCES.length);

  for (const [row, [project, agentTarget, guideTarget]] of references.map((row, index) => [
    row,
    PROJECT_REFERENCES[index],
  ])) {
    assert.deepEqual(codeSpans(row[0]), [`${project}/`]);
    assert.equal(linkTarget(row[1]), agentTarget);
    assert.equal(linkTarget(row[2]), guideTarget);
    assert.equal(existsSync(resolve(REPOSITORY_ROOT, project, 'AGENTS.md')), Boolean(agentTarget));
    if (agentTarget) assert.ok(existsSync(resolve(REPOSITORY_ROOT, 'docs', agentTarget)));
    assert.ok(existsSync(resolve(REPOSITORY_ROOT, 'docs', guideTarget)));
  }
});

test('frontend conventions가 8 theme·7 card shell·9 token·1 css-only target과 생성 경로를 고정한다', () => {
  assert.equal(PRODUCTS.length, 8);
  assert.equal(WEB_TOOLS.length, 7);
  assert.equal(Object.keys(TOKEN_TARGETS).length, 9);
  assert.equal(Object.keys(CSS_ONLY_TARGETS).length, 1);

  const conventions = read(FRONTEND_CONVENTIONS);
  const scopeRows = tableRows(section(conventions, '적용 대상'), ['계약', '프로젝트']);
  const scope = new Map(scopeRows.map(([contract, projects]) => [contract, codeSpans(projects)]));
  assert.deepEqual(sorted(scope.get('테마 (8개 웹 앱)')), sorted(PRODUCTS.map(({ id }) => id)));
  assert.deepEqual(
    sorted(scope.get('카드형 셸 (7개 웹 도구)')),
    sorted(WEB_TOOLS.map(({ id }) => id)),
  );
  assert.deepEqual(sorted(scope.get('토큰 (9개 대상)')), sorted(Object.keys(TOKEN_TARGETS)));
  assert.deepEqual(sorted(scope.get('토큰 CSS (1개 대상)')), sorted(Object.keys(CSS_ONLY_TARGETS)));
  assert.deepEqual(Object.keys(CSS_ONLY_TARGETS), KOTLIN_PROJECTS);

  const generatedRows = tableRows(section(conventions, '생성 컴포넌트 경로 (7개 웹 도구)'), [
    '도구',
    'generated component directory',
  ]);
  assert.deepEqual(
    Object.fromEntries(generatedRows.map(([project, path]) => [codeSpans(project)[0], codeSpans(path)[0]])),
    WEB_TOOL_TARGETS,
  );
  const generatedSection = section(conventions, '생성 컴포넌트 경로 (7개 웹 도구)');
  assert.match(generatedSection, /직접 편집하지 않는다/);
  assert.match(generatedSection, /npm run design-system:sync/);
});

test('frontend conventions가 Home·제품명·UI 언어·반응형 정책을 구분한다', () => {
  const conventions = read(FRONTEND_CONVENTIONS);
  const shell = section(conventions, '카드형 도구 셸 (7개 웹 도구)');
  assert.match(shell, /`home`.*카드형.*대상이 아니다/s);
  assert.match(shell, /평면형.*sticky.*master mark/s);

  const language = section(conventions, '제품명과 UI 언어');
  assert.match(bulletLine(language, '제품명'), /English Title Case/);
  assert.match(bulletLine(language, '기본 UI'), /한국어/);
  assert.match(bulletLine(language, '예외'), /기술 식별자.*표준 단위/);

  const responsive = section(conventions, '반응형 계약');
  assert.deepEqual(codeSpans(bulletLine(responsive, 'CSS breakpoint')), [
    '767px',
    '768px',
    '1023px',
    '1024px',
    '1279px',
    '1280px',
  ]);
  assert.deepEqual(codeSpans(bulletLine(responsive, '검증 viewport')), [
    '375×812',
    '768×900',
    '1440×900',
  ]);
  assert.doesNotMatch(conventions, /7개 앱 공통|2행 구조/);
  assert.doesNotMatch(conventions, /8개 웹 앱 모두 동일/);
});

test('design-system README가 정본 생성물과 독립 Vercel 배포 계약을 설명한다', () => {
  const readme = read(DESIGN_SYSTEM_README);
  const fileRows = tableRows(section(readme, '파일'), ['정본', '앱 내부 생성물', '내용']);
  const canonical = new Map(fileRows.map((row) => [codeSpans(row[0])[0], row]));
  for (const name of [
    'components/*.tsx',
    'products.mjs',
    'favicons/<product>/*',
    'shell-contract-e2e.ts',
    'shell-contract.spec.ts',
  ]) {
    assert.ok(canonical.has(name), `README 정본 표에 누락됨: ${name}`);
  }
  assert.ok(codeSpans(canonical.get('components/*.tsx').join(' ')).includes('ToolHeader.tsx'));
  assert.ok(codeSpans(canonical.get('components/*.tsx').join(' ')).includes('SegmentedControl.tsx'));
  assert.ok(codeSpans(canonical.get('products.mjs').join(' ')).includes('product.generated.ts'));
  assert.ok(
    codeSpans(canonical.get('shell-contract-e2e.ts').join(' ')).includes(
      'e2e/ds-shell-contract-e2e.ts',
    ),
  );

  const usage = section(readme, '사용법');
  assert.match(usage, /npm run design-system:sync/);
  assert.match(usage, /npm run design-system:check/);

  const deployment = section(readme, '독립 배포');
  assert.match(bulletLine(deployment, 'Runtime'), /런타임 패키지를 공유하지 않는다/);
  assert.match(
    bulletLine(deployment, 'Generated sync'),
    /저장소 루트.*packages\/design-system\/.*import하지 않는다/,
  );
  assert.match(bulletLine(deployment, 'Vercel'), /Root Directory.*독립.*install.*build/);
  assert.deepEqual(
    codeSpans(bulletLine(deployment, 'Vercel Root Directories')),
    WEB_PROJECTS,
  );

  const generation = section(readme, '생성 매핑 계약');
  assert.deepEqual(
    codeSpans(bulletLine(generation, 'Token files')),
    mappings(Object.entries(FILES)),
  );
  assert.deepEqual(
    codeSpans(bulletLine(generation, 'React components')),
    [...COMPONENT_FILES, '<tool>/<componentDir>/<source-name>'],
  );
  assert.deepEqual(codeSpans(bulletLine(generation, 'Product metadata')), [
    '<tool>/<componentDir>/product.generated.ts',
    '<tool>/e2e/product.generated.ts',
  ]);
  assert.deepEqual(
    codeSpans(bulletLine(generation, 'Shell E2E')),
    [...mappings(Object.entries(E2E_FILES)), '<tool>/e2e/<target-name>'],
  );
  assert.deepEqual(
    codeSpans(bulletLine(generation, 'Favicons')),
    [...FAVICON_FILES, '<product>/<publicDir>/<source-name>'],
  );
});
