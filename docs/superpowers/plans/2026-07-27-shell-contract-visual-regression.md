# 공통 셸 계약·시각 회귀·문서 동기화 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 7개 웹 도구의 카드형 셸을 375·768·1440px에서 계산값과 스크린샷으로 고정하고, 정적 프리미티브 fixture와 저장소 문서를 실제 8개 웹 앱/7개 카드형 도구 구조에 맞춘다.

**Architecture:** 정본 Playwright helper가 크기·overflow·DOM 순서·반응형 위치를 검사하고 동일한 생성 spec이 앱별 metadata만 주입받는다. 시각 회귀는 앱별 헤더 crop과 첫 화면 viewport를 라이트·다크에서 저장하며, 별도 HTML fixture가 프리미티브 variant를 앱 레이아웃과 분리해 검증한다.

**Tech Stack:** Playwright 1.61/1.62 · Chromium · Node.js 24 test runner · CSSOM/getBoundingClientRect · committed PNG baselines · Markdown docs

## Global Constraints

- 이 계획은 [`2026-07-27-seven-tool-shell-migration.md`](./2026-07-27-seven-tool-shell-migration.md)의 Completion Gate를 통과한 상태에서 시작한다.
- 계약 뷰포트는 정확히 `375×812`, `768×900`, `1440×900`이다.
- 라이트와 다크 두 테마를 모두 검사한다.
- `document.documentElement.scrollWidth <= document.documentElement.clientWidth`를 필수로 검사한다.
- BrandMark는 `40×40px`, ThemeToggle과 Button·Segmented Control은 `36px`, 공통 disabled opacity는 `1`이다.
- ThemeToggle은 utilities의 마지막 DOM 자식이다.
- 375px에서 actions는 둘째 줄, 768·1440px에서 브랜드·actions·utilities는 한 행이다.
- Monaco cursor·명시적 `[data-ds-visual-mask]` 외의 고정 UI를 마스킹하지 않는다.
- 스크린샷은 animation/transition/caret를 비활성화하고 bundled ToolHub Sans 로드 완료 후 촬영한다.
- 기준 이미지는 앱당 12장, 총 84장이고 정적 fixture는 라이트·다크 2장이다.
- `home`은 카드형 셸 E2E에서 제외하지만 8개 웹 앱 파비콘·문서 계약에는 포함한다.
- 각 앱의 기존 contrast, 도메인, responsive E2E를 삭제하거나 약화하지 않는다.

---

## File Structure

### 공통 계약

- Create: `packages/design-system/shell-contract-e2e.ts` — 계산값과 배치 assertion helper
- Create: `packages/design-system/shell-contract.spec.ts` — 6개 theme/viewport 계약 loop
- Create: `scripts/shell-contract-source.test.mjs` — helper 요구사항 source guard
- Modify: `scripts/sync-design-system.mjs`, `scripts/sync-design-system.test.mjs`
- Generate: `<tool>/e2e/ds-shell-contract-e2e.ts`
- Generate: `<tool>/e2e/shell-contract.spec.ts`
- Generate: `<tool>/e2e/product.generated.ts`

### 정적 정책 검사

- Create: `scripts/responsive-contract.test.mjs` — CSS breakpoint parser
- Create: `scripts/ui-policy.test.mjs` — 제품명·UI 문구·favicon entry 검사

### 시각 회귀

- Create: `packages/design-system/fixtures/primitives.html`
- Create: `sign-maker/e2e/primitives-fixture.spec.ts`
- Modify: 7개 `playwright.config.ts` — 공통 snapshot path template
- Modify: 생성 `packages/design-system/shell-contract.spec.ts` — header/shell screenshots
- Generate: 7개 앱 `e2e/__screenshots__/shell-contract.spec.ts/*.png`
- Generate: `sign-maker/e2e/__screenshots__/primitives-fixture.spec.ts/*.png`

### 문서

- Create: `scripts/docs-contract.test.mjs`
- Modify: `AGENTS.md`
- Modify: `docs/contributor-guide.md`
- Modify: `docs/frontend-conventions.md`
- Modify: `packages/design-system/README.md`
- Modify: `home/index.html`

---

### Task 1: 공통 셸 계산값 helper와 7개 앱 계약 spec을 생성한다

**Files:**
- Create: `packages/design-system/shell-contract-e2e.ts`
- Create: `packages/design-system/shell-contract.spec.ts`
- Create: `scripts/shell-contract-source.test.mjs`
- Modify: `scripts/sync-design-system.mjs`
- Modify: `scripts/sync-design-system.test.mjs`
- Generate: 7개 앱 `e2e/ds-shell-contract-e2e.ts`, `e2e/shell-contract.spec.ts`, `e2e/product.generated.ts`

**Interfaces:**
- `VIEWPORTS: readonly ViewportCase[]`
- `THEMES: readonly ('light' | 'dark')[]`
- `prepareShell(page, theme): Promise<void>`
- `assertShellContract(page, product, viewport): Promise<void>`
- `TestProduct = { id: string; name: string }`

- [ ] **Step 1: helper source 요구사항의 실패 테스트를 작성한다**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('셸 helper가 승인된 viewport와 계산값을 검사한다', () => {
  const source = readFileSync('packages/design-system/shell-contract-e2e.ts', 'utf8');
  for (const value of ['375', '768', '1440', 'scrollWidth', 'clientWidth', '40', '36', 'opacity', 'strokeWidth']) {
    assert.match(source, new RegExp(value));
  }
  for (const selector of ['data-ds-brand-mark', 'data-ds-theme-toggle', 'data-ds-button', 'data-ds-segmented', 'data-ds-tool-utilities']) {
    assert.match(source, new RegExp(selector));
  }
});
```

- [ ] **Step 2: 테스트가 helper 부재로 실패하는지 확인한다**

Run: `node --test scripts/shell-contract-source.test.mjs`

Expected: FAIL with missing `packages/design-system/shell-contract-e2e.ts`.

- [ ] **Step 3: viewport와 안정화 helper를 구현한다**

```ts
import { expect, type Locator, type Page } from '@playwright/test';

export const VIEWPORTS = [
  { name: 'mobile', width: 375, height: 812 },
  { name: 'tablet-boundary', width: 768, height: 900 },
  { name: 'desktop', width: 1440, height: 900 },
] as const;
export const THEMES = ['light', 'dark'] as const;
export type ViewportCase = (typeof VIEWPORTS)[number];
export interface TestProduct { id: string; name: string }

export async function prepareShell(page: Page, theme: 'light' | 'dark') {
  await page.addInitScript((value) => {
    localStorage.setItem('theme', value);
    document.documentElement.setAttribute('data-theme', value);
  }, theme);
  await page.goto('/');
  await page.locator('[data-ds-tool-header]').waitFor();
  await page.evaluate(async () => { await document.fonts.ready; });
  await page.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}' });
  await page.evaluate((value) => document.documentElement.setAttribute('data-theme', value), theme);
}

async function box(locator: Locator) {
  const value = await locator.boundingBox();
  expect(value).not.toBeNull();
  return value!;
}
```

- [ ] **Step 4: 크기·overflow·disabled·아이콘 assertions를 구현한다**

```ts
export async function assertShellContract(page: Page, product: TestProduct, viewport: ViewportCase) {
  const rootMetrics = await page.evaluate(() => ({
    documentScroll: document.documentElement.scrollWidth,
    documentClient: document.documentElement.clientWidth,
    bodyScroll: document.body.scrollWidth,
    bodyClient: document.body.clientWidth,
  }));
  expect(rootMetrics.documentScroll).toBeLessThanOrEqual(rootMetrics.documentClient);
  expect(rootMetrics.bodyScroll).toBeLessThanOrEqual(rootMetrics.bodyClient);

  await expect(page.getByRole('heading', { level: 1 })).toHaveText(product.name);
  await expect(page.locator('[data-ds-brand-mark]')).toHaveCSS('width', '40px');
  await expect(page.locator('[data-ds-brand-mark]')).toHaveCSS('height', '40px');
  await expect(page.locator('[data-ds-theme-toggle]')).toHaveCSS('width', '36px');
  await expect(page.locator('[data-ds-theme-toggle]')).toHaveCSS('height', '36px');

  for (const locator of await page.locator('[data-ds-button], [data-ds-segmented]').all()) {
    await expect(locator).toHaveCSS('height', '36px');
  }
  for (const locator of await page.locator('[data-ds-control]:disabled, [data-ds-control][aria-disabled="true"]').all()) {
    await expect(locator).toHaveCSS('opacity', '1');
  }
  for (const locator of await page.locator('[data-ds-tool-header] svg').all()) {
    const metrics = await locator.evaluate((svg) => ({
      width: getComputedStyle(svg).width,
      height: getComputedStyle(svg).height,
      strokeWidth: getComputedStyle(svg).strokeWidth,
    }));
    expect(metrics.width).toBe('16px');
    expect(metrics.height).toBe('16px');
    expect(Number.parseFloat(metrics.strokeWidth)).toBe(2);
  }

  const utilities = page.locator('[data-ds-tool-utilities]');
  await expect(utilities.locator(':scope > :last-child')).toHaveAttribute('data-ds-theme-toggle', 'true');

  const brand = await box(page.locator('[data-ds-tool-brand]'));
  const actions = await box(page.locator('[data-ds-tool-actions]'));
  const utility = await box(utilities);
  if (viewport.width < 768) {
    expect(actions.y).toBeGreaterThanOrEqual(Math.max(brand.y + brand.height, utility.y + utility.height));
  } else {
    const centers = [brand.y + brand.height / 2, actions.y + actions.height / 2, utility.y + utility.height / 2];
    expect(Math.max(...centers) - Math.min(...centers)).toBeLessThanOrEqual(4);
  }
}
```

- [ ] **Step 5: 6개 조합의 공통 spec을 작성한다**

```ts
import { test } from '@playwright/test';
import { assertShellContract, prepareShell, THEMES, VIEWPORTS } from './ds-shell-contract-e2e';
import { TEST_PRODUCT } from './product.generated';

for (const viewport of VIEWPORTS) for (const theme of THEMES) {
  test(`${viewport.name} ${theme} 셸 계약`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await prepareShell(page, theme);
    await assertShellContract(page, TEST_PRODUCT, viewport);
  });
}
```

- [ ] **Step 6: E2E 생성 operation을 추가한다**

- `shell-contract-e2e.ts` → 각 앱 `e2e/ds-shell-contract-e2e.ts`
- `shell-contract.spec.ts` → 각 앱 `e2e/shell-contract.spec.ts`
- `products.mjs`에서 `{ id, name }`만 가진 `export const TEST_PRODUCT = ... as const` → 각 앱 `e2e/product.generated.ts`

세 파일은 `WEB_TOOLS`에만 생성하고 `home`과 Electron에는 생성하지 않는다. sync test는 7×3 operation과 `--check` drift를 단정한다.

- [ ] **Step 7: 동기화하고 7개 앱 계약 테스트를 실행한다**

Run: `npm run design-system:sync && npm run design-system:test && npm run design-system:check`

Run in each app:

```bash
npm run test:e2e -- e2e/shell-contract.spec.ts
```

Expected: 각 앱 6 tests PASS, 합계 42 tests PASS.

- [ ] **Step 8: 커밋한다**

```bash
git add packages/design-system scripts sign-maker/e2e json-yaml-converter/e2e openapi-editor/e2e api-contract-test-generator/e2e ddl-seed-generator/e2e config-diff-viewer/e2e dummy-file-generator/e2e
git commit -m "test(design-system): enforce shared shell metrics across tools"
```

---

### Task 2: breakpoint·제품명·UI 언어 정책을 정적 테스트로 고정한다

**Files:**
- Create: `scripts/responsive-contract.test.mjs`
- Create: `scripts/ui-policy.test.mjs`

**Interfaces:**
- CSS 숫자 breakpoint 허용값: `767, 768, 1023, 1024, 1279, 1280`
- UI source holder는 명시적 파일 목록이며 parser, fixture, API field는 스캔하지 않는다.

- [ ] **Step 1: 모든 source CSS를 파싱하는 breakpoint test를 작성한다**

```js
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { WEB_TOOLS } from '../packages/design-system/products.mjs';

const ALLOWED = new Set([767, 768, 1023, 1024, 1279, 1280]);
function cssFiles(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return cssFiles(path);
    return entry.name.endsWith('.css') && !entry.name.startsWith('ds-') ? [path] : [];
  });
}

describe('반응형 계약', () => {
  for (const product of WEB_TOOLS) test(`${product.id}가 표준 breakpoint만 쓴다`, () => {
    const root = product.stack === 'vite' ? `${product.id}/src` : `${product.id}/app`;
    const offenders = [];
    for (const file of cssFiles(root)) {
      for (const match of readFileSync(file, 'utf8').matchAll(/@media[^{}]*\((?:min|max)-width:\s*(\d+)px\)/g)) {
        if (!ALLOWED.has(Number(match[1]))) offenders.push(`${file}:${match[1]}px`);
      }
    }
    assert.deepEqual(offenders, []);
  });
});
```

- [ ] **Step 2: 제품명·금지 UI copy·favicon entry test를 작성한다**

`ui-policy.test.mjs`는 copy를 실제로 소유하는 파일과 favicon entry 파일을 명시적으로 고정한다.

```js
const HOLDERS = [
  'sign-maker/src/components/layout/Header.tsx',
  'sign-maker/index.html',
  'json-yaml-converter/src/components/layout/Header.tsx',
  'json-yaml-converter/index.html',
  'openapi-editor/src/components/layout/Topbar.tsx',
  'openapi-editor/index.html',
  'api-contract-test-generator/src/components/layout/Header.tsx',
  'api-contract-test-generator/src/components/input/SpecInputStep.tsx',
  'api-contract-test-generator/src/components/review/ReviewStep.tsx',
  'api-contract-test-generator/src/components/export/ExportStep.tsx',
  'api-contract-test-generator/src/components/review/EndpointNavigator.tsx',
  'api-contract-test-generator/src/components/review/TestCaseDetail.tsx',
  'api-contract-test-generator/index.html',
  'ddl-seed-generator/app/_components/Topbar.tsx',
  'ddl-seed-generator/app/_components/ControlPanel.tsx',
  'ddl-seed-generator/app/_components/ResultPanel.tsx',
  'ddl-seed-generator/app/layout.tsx',
  'config-diff-viewer/app/_components/Topbar.tsx',
  'config-diff-viewer/app/_components/analysis-options.tsx',
  'config-diff-viewer/app/_components/issue-badge.tsx',
  'config-diff-viewer/app/_components/stats-bar.tsx',
  'config-diff-viewer/app/layout.tsx',
  'dummy-file-generator/app/_components/GeneratorForm.tsx',
  'dummy-file-generator/app/_components/generator-client.tsx',
  'dummy-file-generator/app/layout.tsx',
];
const FAVICON_HOLDERS = [
  'home/index.html',
  'sign-maker/index.html',
  'json-yaml-converter/index.html',
  'openapi-editor/index.html',
  'api-contract-test-generator/index.html',
  'ddl-seed-generator/app/layout.tsx',
  'config-diff-viewer/app/layout.tsx',
  'dummy-file-generator/app/layout.tsx',
];
const BANNED = /Signature & Trace Studio|JSON YAML Converter|<h1>openapi-editor|>Draw<|>Upload<|>Generate<|Generate File|File Format|Target Size|realistic seed|>Sample<|>English<|\} bytes<| Bytes\.|Step [123]|>Endpoints<|Selected test/;
test('승인되지 않은 제품명과 혼용 UI copy가 없다', () => {
  const offenders = HOLDERS.filter((path) => BANNED.test(readFileSync(path, 'utf8')));
  assert.deepEqual(offenders, []);
});

test('Vite와 Next가 생성된 favicon set을 연결한다', () => {
  for (const holder of FAVICON_HOLDERS) {
    const source = readFileSync(holder, 'utf8');
    for (const name of ['favicon.svg', 'favicon-32x32.png', 'favicon-16x16.png', 'apple-touch-icon.png', 'site.webmanifest']) assert.match(source, new RegExp(name));
  }
});
```

- [ ] **Step 3: 정적 정책 테스트를 실행한다**

Run: `npm run design-system:test`

Expected: breakpoint 7 tests, UI policy 2 tests를 포함한 root suite PASS. 실패하면 Plan 2의 해당 앱에서 남은 selector/string만 수정하고 domain fixture/API key는 변경하지 않는다.

- [ ] **Step 4: 커밋한다**

```bash
git add scripts/responsive-contract.test.mjs scripts/ui-policy.test.mjs sign-maker json-yaml-converter openapi-editor api-contract-test-generator ddl-seed-generator config-diff-viewer dummy-file-generator
git commit -m "test(design-system): guard responsive and UI language policies"
```

---

### Task 3: 84개 앱 스크린샷과 2개 프리미티브 fixture 기준선을 만든다

**Files:**
- Modify: `packages/design-system/shell-contract.spec.ts`
- Create: `packages/design-system/fixtures/primitives.html`
- Create: `sign-maker/e2e/primitives-fixture.spec.ts`
- Modify: `sign-maker/playwright.config.ts`
- Modify: `json-yaml-converter/playwright.config.ts`
- Modify: `openapi-editor/playwright.config.ts`
- Modify: `api-contract-test-generator/playwright.config.ts`
- Modify: `ddl-seed-generator/playwright.config.ts`
- Modify: `config-diff-viewer/playwright.config.ts`
- Modify: `dummy-file-generator/playwright.config.ts`
- Generate: 86 PNG baseline files

**Interfaces:**
- 공통 screenshot mask: `.monaco-editor .cursor`, `.monaco-editor .cursors-layer`, `[data-ds-visual-mask]`
- snapshot path: `{testDir}/__screenshots__/{testFilePath}/{arg}{ext}`
- pixel tolerance: `maxDiffPixelRatio: 0.001`

- [ ] **Step 1: 공통 spec에 header와 first-screen screenshot assertions를 추가한다**

각 6개 test의 계산값 assertion 뒤에 다음을 추가한다.

```ts
const masks = [page.locator('.monaco-editor .cursor, .monaco-editor .cursors-layer, [data-ds-visual-mask]')];
await expect(page.locator('[data-ds-tool-header]')).toHaveScreenshot(
  `${TEST_PRODUCT.id}-${viewport.name}-${theme}-header.png`,
  { animations: 'disabled', caret: 'hide', maxDiffPixelRatio: 0.001 },
);
await expect(page).toHaveScreenshot(
  `${TEST_PRODUCT.id}-${viewport.name}-${theme}-shell.png`,
  { animations: 'disabled', caret: 'hide', mask: masks, fullPage: false, maxDiffPixelRatio: 0.001 },
);
```

- [ ] **Step 2: 7개 Playwright config의 snapshot path를 고정한다**

각 `defineConfig` 최상위에 다음을 추가한다.

```ts
snapshotPathTemplate: '{testDir}/__screenshots__/{testFilePath}/{arg}{ext}',
expect: { toHaveScreenshot: { animations: 'disabled', caret: 'hide', maxDiffPixelRatio: 0.001 } },
```

OS 이름을 경로에서 제외하므로 Mac에서 만든 baseline을 CI도 같은 파일명으로 읽는다. bundled font와 Chromium pin이 실제 픽셀 안정성을 담당한다.

- [ ] **Step 3: 프리미티브 정적 fixture markup을 작성한다**

`primitives.html` body는 다음 variant/state를 모두 포함한다.

```html
<main class="ds-fixture">
  <section><h1>Button</h1><div class="row">
    <button class="ds-button ds-button--primary" data-ds-button data-ds-control>주요</button>
    <button class="ds-button ds-button--secondary" data-ds-button data-ds-control>보조</button>
    <button class="ds-button ds-button--ghost" data-ds-button data-ds-control>고스트</button>
    <button class="ds-button ds-button--danger" data-ds-button data-ds-control>위험</button>
    <button class="ds-button ds-button--icon" data-ds-button data-ds-control aria-label="추가"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5v14" /></svg></button>
    <button class="ds-button ds-button--primary" data-ds-button data-ds-control disabled>비활성</button>
  </div></section>
  <section><h1>Segmented Control</h1><div class="ds-segmented" data-ds-segmented data-ds-control role="group" aria-label="보기">
    <button aria-pressed="true">첫 번째</button><button aria-pressed="false">두 번째</button><button disabled aria-pressed="false">비활성</button>
  </div></section>
  <section><h1>Empty State</h1><div class="ds-empty-state" data-ds-empty-state><span class="ds-empty-state__icon"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" /></svg></span><strong>결과가 없습니다.</strong><p>입력 후 다시 실행해 주세요.</p></div></section>
  <section><h1>Badge</h1><div class="row">
    <span class="ds-badge ds-badge--neutral" data-ds-badge>중립</span><span class="ds-badge ds-badge--primary" data-ds-badge>주요</span><span class="ds-badge ds-badge--success" data-ds-badge>성공</span><span class="ds-badge ds-badge--warning" data-ds-badge>주의</span><span class="ds-badge ds-badge--danger" data-ds-badge>위험</span>
  </div></section>
</main>
```

문서 head에 `color: var(--text)`, `background: var(--bg)`, 4개 section을 2열 grid로 배치하는 fixture 전용 CSS만 넣는다. 컴포넌트 시각 선언을 중복하지 않는다.

- [ ] **Step 4: sign-maker에서 라이트·다크 fixture를 촬영한다**

```ts
import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

for (const theme of ['light', 'dark'] as const) test(`프리미티브 ${theme}`, async ({ page }) => {
  const html = readFileSync(resolve(process.cwd(), '../packages/design-system/fixtures/primitives.html'), 'utf8');
  const css = ['ds-tokens.css', 'ds-base.css', 'ds-primitives.css']
    .map((name) => readFileSync(resolve(process.cwd(), `src/styles/${name}`), 'utf8')).join('\n');
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.setContent(html.replace('</head>', `<style>${css}</style></head>`));
  await page.evaluate((value) => document.documentElement.setAttribute('data-theme', value), theme);
  await page.evaluate(async () => { await document.fonts.ready; });
  await expect(page).toHaveScreenshot(`primitives-${theme}.png`, { maxDiffPixelRatio: 0.001 });
});
```

- [ ] **Step 5: 기준 이미지를 생성한다**

각 앱에서 실행한다.

```bash
npm run test:e2e -- e2e/shell-contract.spec.ts --update-snapshots
```

`sign-maker`에서는 추가로 실행한다.

```bash
npm run test:e2e -- e2e/primitives-fixture.spec.ts --update-snapshots
```

Expected: shell baseline 84개와 fixture baseline 2개가 생성된다.

- [ ] **Step 6: update 없이 재실행해 안정성을 검증한다**

각 앱: `npm run test:e2e -- e2e/shell-contract.spec.ts`

Sign Maker: `npm run test:e2e -- e2e/primitives-fixture.spec.ts`

Expected: 42 shell tests와 2 fixture tests PASS, 새 이미지 생성이나 diff 없음.

- [ ] **Step 7: 파일 수와 마스크 범위를 검사한다**

Run:

```bash
rg --files sign-maker/e2e/__screenshots__ json-yaml-converter/e2e/__screenshots__ openapi-editor/e2e/__screenshots__ api-contract-test-generator/e2e/__screenshots__ ddl-seed-generator/e2e/__screenshots__ config-diff-viewer/e2e/__screenshots__ dummy-file-generator/e2e/__screenshots__ | rg '\.png$' | wc -l
```

Expected: `86`.

Run: `rg -n 'mask:' packages/design-system/shell-contract.spec.ts sign-maker/e2e/primitives-fixture.spec.ts`

Expected: shell spec의 Monaco/`data-ds-visual-mask` 한정 mask만 출력되고 fixture에는 mask가 없다.

- [ ] **Step 8: 커밋한다**

```bash
git add packages/design-system sign-maker/e2e sign-maker/playwright.config.ts json-yaml-converter/e2e json-yaml-converter/playwright.config.ts openapi-editor/e2e openapi-editor/playwright.config.ts api-contract-test-generator/e2e api-contract-test-generator/playwright.config.ts ddl-seed-generator/e2e ddl-seed-generator/playwright.config.ts config-diff-viewer/e2e config-diff-viewer/playwright.config.ts dummy-file-generator/e2e dummy-file-generator/playwright.config.ts
git commit -m "test(design-system): add cross-tool visual regression baselines"
```

---

### Task 4: 앱 목록·셸 수·생성물·UI 정책 문서를 구현과 동기화한다

**Files:**
- Create: `scripts/docs-contract.test.mjs`
- Modify: `AGENTS.md`
- Modify: `docs/contributor-guide.md`
- Modify: `docs/frontend-conventions.md`
- Modify: `packages/design-system/README.md`
- Modify: `home/index.html`

**Interfaces:**
- 테마 대상: `home` 포함 8개 웹 앱
- 카드형 셸 대상: `home` 제외 7개 웹 도구
- 토큰 대상: 위 8개 + Electron, 총 9개

- [ ] **Step 1: 문서 drift의 실패 테스트를 작성한다**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('루트 문서가 실제 앱 목록과 셸 수를 설명한다', () => {
  const agents = readFileSync('AGENTS.md', 'utf8');
  for (const app of ['home', 'sign-maker', 'json-yaml-converter', 'openapi-editor', 'api-contract-test-generator', 'ddl-seed-generator', 'config-diff-viewer', 'dummy-file-generator', 'webpage-capture-tool', 'class-diagram-generator']) assert.match(agents, new RegExp(`\\b${app}\\b`));
  const conventions = readFileSync('docs/frontend-conventions.md', 'utf8');
  assert.match(conventions, /테마 컨벤션 \(8개 웹 앱\)/);
  assert.match(conventions, /카드형 도구 셸 \(7개 웹 도구\)/);
  assert.match(conventions, /정본 구현을 앱 내부 생성물로 동기화/);
});

test('디자인 시스템 README가 독립 배포와 새 생성물을 설명한다', () => {
  const readme = readFileSync('packages/design-system/README.md', 'utf8');
  for (const term of ['ToolHeader.tsx', 'SegmentedControl.tsx', 'products.mjs', 'shell-contract-e2e.ts', 'design-system:sync', 'Vercel']) assert.match(readme, new RegExp(term.replace('.', '\\.')));
});
```

- [ ] **Step 2: 테스트가 누락된 앱 목록과 옛 공유 문구 때문에 실패하는지 확인한다**

Run: `node --test scripts/docs-contract.test.mjs`

Expected: FAIL because root `AGENTS.md` omits new apps and frontend conventions says 7 theme apps/code not shared.

- [ ] **Step 3: 루트 index 문서를 실제 프로젝트 목록으로 고친다**

`AGENTS.md`의 한 줄 목록을 다음 범주로 바꾼다.

```markdown
- Web apps: `home/`, `sign-maker/`, `json-yaml-converter/`, `openapi-editor/`, `api-contract-test-generator/`, `ddl-seed-generator/`, `config-diff-viewer/`, `dummy-file-generator/`
- Desktop app: `webpage-capture-tool/`
- Server-rendered Kotlin app: `class-diagram-generator/`
```

`docs/contributor-guide.md`의 Project-Specific References에 빠진 `json-yaml-converter/` 링크를 추가하고 실제 10개 프로젝트가 모두 있는지 확인한다.

- [ ] **Step 4: frontend conventions를 새 계약으로 바꾼다**

- 머리말의 “코드를 공유하지 않는다”를 “런타임 패키지는 공유하지 않고 정본 구현을 앱 내부 생성물로 동기화한다”로 바꾼다.
- `테마 컨벤션 (8개 웹 앱)`과 `카드형 도구 셸 (7개 웹 도구)`을 별도 절로 나눈다.
- `home`의 평면형 sticky 헤더와 Tool Hub master mark 예외를 명시한다.
- 7개 generated component 경로와 직접 수정 금지 규칙을 디렉터리 구조에 추가한다.
- 제품명 English Title Case, 한국어 UI, 기술 식별자·표준 단위 예외를 추가한다.
- breakpoint 규칙과 375/768/1440 검증 뷰포트를 분리해 설명한다.
- OpenAPI 2행 헤더 허용 문장을 삭제한다.

- [ ] **Step 5: 디자인 시스템 README와 home favicon entry를 갱신한다**

README 파일 표에 components, `products.mjs`, favicon, shell helper를 추가하고 다음 배포 규칙을 넣는다.

```markdown
## 독립 배포

React 컴포넌트·제품 metadata·파비콘·E2E helper는 각 앱 내부 생성물로 커밋한다. 앱의 install/build/dev 명령은 저장소 루트나 `packages/design-system/`을 import하지 않으며 Vercel 프로젝트는 자기 Root Directory만으로 빌드한다. 정본 변경은 배포 전에 저장소 루트에서 `npm run design-system:sync`와 `npm run design-system:check`로 반영한다.
```

`home/index.html`에도 SVG/32/16/apple/manifest 5개 link를 연결한다. home header는 변경하지 않는다.

- [ ] **Step 6: 문서 테스트를 실행한다**

Run: `npm run design-system:test`

Expected: docs contract를 포함한 root suite PASS.

- [ ] **Step 7: 커밋한다**

```bash
git add AGENTS.md docs packages/design-system/README.md home/index.html scripts/docs-contract.test.mjs
git commit -m "docs(design-system): align product shell and deployment guidance"
```

---

### Task 5: 루트와 7개 앱의 최종 회귀를 실행한다

**Files:**
- Verification only; 실패 시 원인을 소유한 앞 Task의 파일만 수정한다.

**Interfaces:**
- Produces: root drift 0, 7개 app full checks green, screenshot baselines stable, clean worktree

- [ ] **Step 1: 루트 정본 검증을 실행한다**

Run:

```bash
npm run design-system:test
npm run design-system:check
```

Expected: 모든 Node tests PASS, generated drift 0건.

- [ ] **Step 2: Vite 4개 앱의 전체 검증을 순서대로 실행한다**

```bash
(cd sign-maker && mise run check)
(cd json-yaml-converter && mise run check)
(cd openapi-editor && mise run check)
(cd api-contract-test-generator && mise run check)
```

각 명령은 독립 subshell에서 실행된다. Expected: test, lint, typecheck, build, e2e exit 0.

- [ ] **Step 3: Next.js 3개 앱의 전체 검증을 순서대로 실행한다**

```bash
(cd ddl-seed-generator && mise run check)
(cd config-diff-viewer && mise run check)
(cd dummy-file-generator && mise run check)
```

병렬 실행하지 않는다. 세 앱의 `test-e2e`가 production `.next` 산출물을 사용하므로 같은 앱에서 build/start 충돌을 피해야 한다. Expected: all exit 0.

- [ ] **Step 4: 스크린샷과 금지 pattern을 최종 확인한다**

Run:

```bash
rg --files sign-maker/e2e/__screenshots__ json-yaml-converter/e2e/__screenshots__ openapi-editor/e2e/__screenshots__ api-contract-test-generator/e2e/__screenshots__ ddl-seed-generator/e2e/__screenshots__ config-diff-viewer/e2e/__screenshots__ dummy-file-generator/e2e/__screenshots__ | rg '\.png$' | wc -l
rg -n '@media[^\n]*(375|600|760|901|1180|1190|1199)px' sign-maker/src json-yaml-converter/src openapi-editor/src api-contract-test-generator/src ddl-seed-generator/app config-diff-viewer/app dummy-file-generator/app
```

Expected: first command `86`; second command exit 1 with no output.

- [ ] **Step 5: Git 상태와 커밋 경계를 확인한다**

Run: `git status --short --branch`

Expected: 작업 트리가 clean이고 현재 branch가 원격 기준 구현 커밋만큼 ahead다. 실패 수정이 있었다면 해당 Task의 검증을 재실행하고 작은 corrective commit을 만든다.

---

## Plan 3 Completion Gate

- [ ] root design-system test/check가 통과한다.
- [ ] 7개 앱의 375·768·1440 라이트·다크 셸 계약 42개가 통과한다.
- [ ] `scrollWidth <= clientWidth`, brand 40, theme 36, Button/Segmented 36, disabled opacity 1이 계산값으로 검사된다.
- [ ] header 42장 + first-shell 42장 + fixture 2장, 총 86개 기준 이미지가 update 없이 재통과한다.
- [ ] 7개 앱의 full `mise run check`가 통과한다.
- [ ] 문서가 8개 웹 앱, 7개 카드형 도구, 9개 토큰 대상을 구분한다.
- [ ] 앱 build source에 루트 design-system runtime import가 없다.
- [ ] `git status --short`가 비어 있다.
