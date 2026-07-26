# 디자인 시스템 통일 5차 (최종): webpage-capture-tool

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 마지막 남은 앱 `webpage-capture-tool`(Electron)이 정본 디자인 토큰을 소비하게 만들고, 8개 앱 전부에 drift 감지를 걸어 통일 작업을 마감한다.

**Architecture:** 정본 drift 테스트가 `src`/`app` 두 레이아웃만 알던 것을 `__filename` 기준으로 바꿔 레이아웃 무관하게 만든 뒤(1), 이 앱을 8번째 동기화 대상으로 등록한다. 그다음 `:root` 20개 토큰과 하드코딩 색상 39곳을 정본 토큰으로 옮기고(2–4), 자체 타이포 척도를 정본 5단계로 수렴시킨다(5). 검증은 다른 앱과 달리 **산출 CSS grep 이 아니라 실제 Electron 렌더러의 `getComputedStyle`** 로 한다 — 이 앱은 Playwright E2E 하네스를 이미 갖고 있다.

**Tech Stack:** Electron 42 (Chromium 140대) · 바닐라 CSS 682줄 · vitest 4.1.5 (CJS 설정) · Playwright 1.59.1 (`_electron`, `headless: false`) · TypeScript 없음

## Global Constraints

- 작업 디렉터리는 워크트리 `/Users/dongjin/dev/project/tool-hub/.claude/worktrees/design-system-unification` 이다. 원본 체크아웃으로 `cd` 하지 않는다.
- `git stash` 를 맨몸으로 쓰지 않는다. 작업을 미뤄야 하면 WIP 커밋을 만든다.
- `styles/ds-tokens.css` · `ds-base.css` · `ds-primitives.css` · `ds-sync.test.ts` 는 **생성물이다.** 직접 편집하지 말고 `packages/design-system/` 정본을 고친 뒤 저장소 루트에서 `npm run tokens:sync` 를 실행한다.
- 토큰을 도입할 때 **기존 값과 다른 값으로 바뀌는 경우를 이름 치환과 같은 커밋에 섞지 않는다.** 값이 바뀌는 것은 의도된 통일이므로 커밋 메시지에 명시한다.
- 이 앱은 **다크 모드가 없다.** `data-theme` 속성을 설정하지 않으므로 정본의 `[data-theme="dark"]` 블록은 절대 활성화되지 않는다. 다크 모드를 추가하지 않는다.
- 이 앱은 **셸 계약(헤더 3슬롯 · 브랜드 허브 링크 · 컨테이너 폭) 적용 대상이 아니다.** 데스크톱 워크벤치라 웹 앱의 헤더/푸터 구조가 없다.
- 검증 명령은 `mise run check`(= `test` + `lint`)와 `npm run test:e2e` 다. 이 앱의 `CLAUDE.md` 는 **최종 검증에 `npm run test:e2e` 를 반드시 포함**하도록 요구한다.
- Electron 바이너리가 없으면 E2E 가 실행되지 않는다. `npm ci` 가 postinstall 을 건너뛴 상태라면 `node node_modules/electron/install.js` 로 내려받는다.

## 사전 실측 (이미 검증됨)

계획 작성 중 실제로 돌려서 확인한 사실이다. 실행자는 다시 증명할 필요가 없다.

| 질문 | 확인된 답 | 방법 |
|---|---|---|
| vitest 가 tsconfig·typescript 없이 `.ts` 테스트를 돌리는가 | **돈다.** esbuild 가 변환하고 `.mjs` import 도 해결한다 | 프로브 테스트 1 passed |
| `include` 에 `apps/**/*.test.ts` 를 넣으면 잡히는가 | **잡힌다.** `vitest list` 에 노출 | `npx vitest list` |
| 테스트 안에서 `__filename` 이 쓸 수 있는가 | **쓸 수 있다.** `dirname(__filename)` 이 정확한 절대 경로 | 프로브 테스트 통과 |
| `process.cwd()/../packages/design-system` 이 정본을 가리키는가 | **가리킨다.** 앱 자체 `packages/` 와 충돌하지 않는다 | `readdirSync` 결과 확인 |
| 정본 CSS 가 Tailwind 없이 브라우저에서 동작하는가 | **동작한다.** 모든 토큰 해석, `.ds-card` 16px, `.ds-icon-btn` 36×36, 콘솔 에러 0 | Electron `getComputedStyle` |
| `@theme inline` · `@custom-variant` 가 문제를 일으키는가 | **아니다.** 미지의 at-rule 이라 브라우저가 통째로 무시한다 | 위와 동일 |
| `file://` 에서 정본의 `url("/fonts/...")` 가 깨지는가 | **깨진다.** `net::ERR_FILE_NOT_FOUND`, monospace 로 폴백 | 렌더 폭 478.6 = 폴백 폭 |
| 같은 family 를 상대 경로로 재선언하면 이기는가 | **이긴다.** 렌더 폭 417.2 = 정상 로드 폭. 게다가 **깨진 절대 경로는 요청조차 되지 않는다** | 폭 비교 + `requestfailed` 0건 |
| `styles/theme.local.css` 의 `url("../fonts/...")` 가 해석되는가 | **된다.** url() 은 자기 스타일시트 위치를 기준으로 풀린다. Task 2 의 `@import` 4줄 체인 그대로 재현해 `fontLoaded: true`, 실패 요청 0건 | Electron `document.fonts` |
| 계산값 비교에 쓸 토큰 문자열 | `--line: rgba(112, 115, 124, 0.22)` · `--muted: rgba(55, 56, 60, 0.72)` · `--disabled: rgba(55, 56, 60, 0.38)` · `--ds-ease-standard: cubic-bezier(0.4, 0, 0.2, 1)`. 커스텀 프로퍼티는 **작성한 공백까지 그대로** 반환된다 | `getPropertyValue` 실측 |
| E2E 베이스라인이 통과하는가 | **통과.** `navigation.spec.js` 8 passed (6.6s) | `npx playwright test` |

## 현황 인벤토리

**`apps/electron/renderer/style.css`** — 682줄, 20개 섹션. 진입 CSS 겸 전체 스타일.

> **행 번호 주의.** 이 문서의 모든 행 번호는 **작업 시작 전 원본** 기준이다. Task 2 가 1–23행(23줄)을 14줄로 줄이므로 그 뒤 태스크에서는 실제 행이 약 9줄 앞으로 밀린다. 표에 인용된 코드 문자열은 파일 안에서 유일하므로 **행 번호가 아니라 인용 문자열로 위치를 찾는다.** `--ds-font-size-caption` 같은 rem 값은 `html` 에 font-size 가 없어 루트 16px 기준으로 풀린다 — `body { font-size: 13px }` 는 rem 에 영향을 주지 않는다.

`:root`(4–23행) 20개 토큰의 운명:

| 현재 | 처리 | 정본 값 | 값 변화 |
|---|---|---|---|
| `--bg: #f0f2f7` | **삭제** (정본이 제공) | `#f7f7f8` | 미세 |
| `--text: #1f2937` | **삭제** | `rgb(23,23,23)` | 더 진해짐 |
| `--muted: #6b7280` | **삭제** | `rgba(55,56,60,.72)` | 대비 4.55:1 확보 |
| `--danger: #ef4444` | **삭제** | `#d11f2e` | 대비 확보 |
| `--success: #22c55e` | **삭제** | `#18794e` | 대비 확보 |
| `--panel: #ffffff` | **개명** → `--surface` | `#ffffff` | 없음 |
| `--accent: #2563eb` | **개명** → `--primary` | `#3366ff` | 브랜드 통일 |
| `--accent-hover: #1d4ed8` | **개명** → `--primary-strong` | `#005eeb` | 브랜드 통일 |
| `--border: #e5e7eb` | **개명** → `--line` | `rgba(112,115,124,.22)` | 통일 |
| `--warn: #f59e0b` | **개명** → `--warning` | `#a15c00` | 대비 확보 |
| `--sidebar-bg/-text/-active/-active-bg` | **로컬 유지** | — | 없음 |
| `--topbar-h/--sidebar-w/--panel-w/--log-h` | **로컬 유지** | — | 없음 |

앞 5개를 삭제하면 이름이 같으므로 **참조부를 하나도 고치지 않아도** 정본 값으로 바뀐다. 뒤 5개는 참조부 개명이 필요하다(`--accent` 22곳, `--border` 26곳, `--panel` 7곳, `--warn` 1곳, `--accent-hover` 1곳).

**상시 다크 영역이 둘 있다.** 라이트 테마 안에 박힌 의도된 어두운 영역이라 정본 팔레트로 바꾸지 않고 로컬 토큰으로 이름만 붙인다.
- 사이드바(85–121행): `--sidebar-*` 4개는 이미 토큰, `rgba(255,255,255,.05)`·`.08`·`#fff` 3곳이 하드코딩.
- 로그 패널(172–213행): `#111827`·`#374151`(2회)·`#9ca3af`·`#1f2937`·`#f9fafb`·`#d1d5db` 7곳 전부 하드코딩.

**타이포**: 47곳이 10/11/12/13/14/15/16px 리터럴. 정본 5단계는 12/14/16/20/28px.

**모달**: `.modal-overlay` + `.modal`(659–677행), `classList.toggle("hidden")` 으로 제어. `project-screen.js`·`batch-screen.js` 6곳. E2E 커버리지 없음.

---

### Task 1: 정본 drift 테스트를 레이아웃 무관하게 만들고 8번째 앱 등록

정본 테스트는 지금 `existsSync('src') ? 'src' : 'app'` 으로 스타일 디렉터리를 추론한다. 이 앱의 스타일은 `apps/electron/renderer/styles` 라 어느 쪽도 아니다. 추론을 없애고 `__filename` 을 쓴다 — 이 파일은 **언제나 검사 대상 디렉터리 안에 복사되므로** 자기 위치가 곧 정답이다.

금지 유틸리티 스캔은 Tailwind 앱에만 의미가 있다. 이 앱은 Tailwind 를 쓰지 않으므로 스캔 대상 0건이 정상이고, 대신 루트 이름이 바뀌어 조용히 0건이 되는 사고를 막는 가드를 넣는다.

**Files:**
- Modify: `packages/design-system/ds-sync.test.ts` (전면)
- Modify: `scripts/sync-design-tokens.mjs:31-39` (`TARGETS` 에 8번째 앱)
- Modify: `scripts/sync-design-tokens.test.mjs:83-93` (기대 목록)
- Modify: `webpage-capture-tool/vitest.config.js:6-11` (`include`)
- 생성됨(스크립트가): `webpage-capture-tool/apps/electron/renderer/styles/ds-{tokens,base,primitives}.css`, `ds-sync.test.ts`

**Interfaces:**
- Consumes: `render`, `sync`, `FILES`, `TARGETS` (기존 `scripts/sync-design-tokens.mjs` 의 export)
- Produces: `TARGETS['webpage-capture-tool'] === 'apps/electron/renderer/styles'` — Task 2 이후 모든 태스크가 이 경로를 전제한다

- [ ] **Step 1: 루트 동기화 테스트의 기대 목록을 먼저 깨뜨린다**

`scripts/sync-design-tokens.test.mjs` 의 83–93행을 8개로 바꾼다.

```js
  test('TARGETS 는 마이그레이션된 앱만 담는다', () => {
    assert.deepEqual(Object.keys(TARGETS), [
      'sign-maker',
      'json-yaml-converter',
      'ddl-seed-generator',
      'openapi-editor',
      'dummy-file-generator',
      'config-diff-viewer',
      'home',
      'webpage-capture-tool',
    ]);
  });
```

- [ ] **Step 2: 실패를 확인한다**

```bash
npm run tokens:test
```

Expected: FAIL — `TARGETS 는 마이그레이션된 앱만 담는다` 가 7개 vs 8개로 불일치.

- [ ] **Step 3: TARGETS 에 앱을 추가한다**

`scripts/sync-design-tokens.mjs` 의 `TARGETS` 마지막 줄 뒤에 추가한다.

```js
export const TARGETS = {
  'sign-maker': 'src/styles',
  'json-yaml-converter': 'src/styles',
  'ddl-seed-generator': 'app/styles',
  'openapi-editor': 'src/styles',
  'dummy-file-generator': 'app/styles',
  'config-diff-viewer': 'app/styles',
  'home': 'src/styles',
  // Electron 앱은 렌더러가 워크스페이스 안쪽에 있어 경로가 깊다.
  'webpage-capture-tool': 'apps/electron/renderer/styles',
};
```

- [ ] **Step 4: 통과를 확인한다**

```bash
npm run tokens:test
```

Expected: PASS — 7 tests. `sync` 테스트의 기대 개수는 `FILES.length × TARGETS.length` 로 계산되므로 자동으로 4×8=32 가 된다.

- [ ] **Step 5: 정본 테스트를 레이아웃 무관하게 고친다**

`packages/design-system/ds-sync.test.ts` 를 아래 내용으로 통째로 바꾼다.

```ts
/// <reference types="node" />
// 앱마다 tsconfig 의 types 설정이 다르므로(sign-maker 는 ["vite/client"] 로
// 제한한다) 이 파일을 8개 앱에서 동일하게 유지하기 위해 명시한다.
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * 이 파일은 packages/design-system/ds-sync.test.ts 의 생성물이다.
 * 직접 편집하지 말고 정본을 고친 뒤 저장소 루트에서
 * `npm run tokens:sync` 를 실행한다.
 *
 * CI 가 없으므로 검증이 이미 일어나는 곳(각 앱의 vitest)에 감지를 둔다.
 */

/**
 * 이 파일은 언제나 복사 대상 styles 디렉터리 안에 놓이므로 자기 위치가 곧
 * 검사 경로다. styles 위치는 앱마다 src(Vite) · app(Next.js) ·
 * apps/electron/renderer(Electron)로 다르므로 경로를 추론하지 않는다.
 */
const STYLES_DIR = dirname(__filename);
const CANONICAL_DIR = resolve(process.cwd(), '../packages/design-system');

const CASES = [
  ['tokens.css', 'ds-tokens.css'],
  ['base.css', 'ds-base.css'],
  ['primitives.css', 'ds-primitives.css'],
  ['ds-sync.test.ts', 'ds-sync.test.ts'],
] as const;

describe('디자인 시스템 정본 동기화', () => {
  it.each(CASES)('%s 가 %s 와 일치한다', (source, target) => {
    const canonical = readFileSync(join(CANONICAL_DIR, source), 'utf8');
    const copy = readFileSync(join(STYLES_DIR, target), 'utf8');

    // 복사본은 배너 + 정본 본문이다. 본문이 손대어졌는지만 본다.
    expect(copy.endsWith(canonical)).toBe(true);
  });
});

/**
 * 정본이 정의하지 않는 Tailwind radius/shadow 단계는 쓰지 않는다.
 *
 * 정본은 @theme inline 으로 radius 의 sm/md/lg 와 shadow 의 sm/md/lg/xl 만
 * 덮는다. 덮지 않은 단계는 Tailwind 기본값이 그대로 남아 조용히 다른 값이
 * 적용되고, 이름 순서가 값 순서와 역전된다 — radius 의 xl 단계는 Tailwind
 * 기본 12px 인데 정본의 lg 는 16px 이므로 xl < lg 가 된다.
 *
 * 1회 grep 은 이후 새로 추가되는 코드를 못 잡으므로 테스트로 상주시킨다.
 *
 * 아래 정규식과 이 주석에는 금지 클래스명을 리터럴로 적지 않는다. Tailwind 는
 * .ts 파일까지 스캔하므로 리터럴이 있으면 그 유틸리티가 실제로 생성되어,
 * 산출 CSS 를 감사할 때 규칙 위반처럼 보이는 죽은 CSS 가 남는다.
 */
const FORBIDDEN = /\b(?:rounded-(?:xs|xl|2xl|3xl|4xl)|shadow-(?:xs|2xl|inner))\b/;

/**
 * Tailwind 를 쓰는 앱의 소스 루트. 바닐라 CSS 앱(webpage-capture-tool)은
 * 둘 다 없어 스캔 대상이 0건이 되고, 유틸리티 자체가 없으므로 그게 정상이다.
 */
const SCAN_ROOTS = ['src', 'app'].filter((dir) => existsSync(resolve(process.cwd(), dir)));

function collectSourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return collectSourceFiles(path);
    return /\.tsx?$/.test(entry.name) ? [path] : [];
  });
}

describe('금지된 Tailwind 단계', () => {
  it('정본이 정의하지 않는 radius/shadow 유틸리티를 쓰지 않는다', () => {
    const files = SCAN_ROOTS.flatMap((root) =>
      collectSourceFiles(resolve(process.cwd(), root)),
    ).filter((path) => path !== __filename);

    // 소스 루트가 있는데 0건이면 루트 이름이 바뀐 것이다. 스캔이 조용히
    // 무력화되는 것을 막는다.
    if (SCAN_ROOTS.length > 0) expect(files.length).toBeGreaterThan(0);

    const offenders = files
      .filter((path) => FORBIDDEN.test(readFileSync(path, 'utf8')))
      .map((path) => relative(process.cwd(), path));

    expect(offenders).toEqual([]);
  });
});
```

- [ ] **Step 6: vitest 가 이 앱에서 `.ts` 를 잡도록 include 를 넓힌다**

`webpage-capture-tool/vitest.config.js` 를 아래로 바꾼다.

```js
const { defineConfig } = require("vitest/config");

module.exports = defineConfig({
  test: {
    environment: "node",
    include: [
      "packages/**/*.test.js",
      "packages/**/*.test.mjs",
      "apps/**/*.test.mjs",
      // 정본 drift 테스트(styles/ds-sync.test.ts)가 .ts 다. 이 앱에는
      // typescript 도 tsconfig 도 없지만 vitest 의 esbuild 가 변환한다.
      "apps/**/*.test.ts",
    ],
  },
});
```

- [ ] **Step 7: 8개 앱에 동기화한다**

```bash
npm run tokens:sync
```

Expected: 32개 경로가 출력된다(정본 4파일 × 8앱). `webpage-capture-tool/apps/electron/renderer/styles/` 디렉터리가 새로 생긴다.

- [ ] **Step 8: 새 앱에서 drift 테스트가 도는지 확인한다**

```bash
cd webpage-capture-tool && npm run test
```

Expected: `Test Files 12 passed` — 기존 11개 + `apps/electron/renderer/styles/ds-sync.test.ts`. 그 안에서 `디자인 시스템 정본 동기화` 4건과 `금지된 Tailwind 단계` 1건이 통과한다.

이 시점에 `style.css` 는 아직 새 파일을 import 하지 않으므로 **앱 화면은 전혀 바뀌지 않는다.**

- [ ] **Step 9: 나머지 7개 앱이 깨지지 않았는지 확인한다**

정본 테스트 본문이 바뀌었으므로 7개 앱 전부 재검증한다.

```bash
for app in sign-maker json-yaml-converter ddl-seed-generator openapi-editor dummy-file-generator config-diff-viewer home; do echo "=== $app ==="; (cd "$app" && mise run check) || echo "FAILED: $app"; done
```

Expected: 7개 전부 통과. 실패하면 `STYLES_DIR` 또는 `SCAN_ROOTS` 변경이 원인이므로 되돌리지 말고 어느 앱의 무엇이 깨졌는지 먼저 출력한다.

- [ ] **Step 10: 커밋**

```bash
git add packages/design-system/ds-sync.test.ts scripts/ webpage-capture-tool/vitest.config.js webpage-capture-tool/apps/electron/renderer/styles/ */src/styles/ds-sync.test.ts */app/styles/ds-sync.test.ts && git commit -m "refactor(design-system): make the drift test layout-agnostic and register the 8th app"
```

---

### Task 2: 폰트 자산과 정본 CSS 도입, `:root` 이관

정본을 실제로 소비하게 만든다. Electron 은 렌더러를 `file://` 로 로드하므로 정본의 `url("/fonts/toolhub-sans.woff2")` 가 파일시스템 루트로 해석되어 실패한다. `theme.local.css` 에서 **같은 family 를 상대 경로로 다시 선언**하면 나중 `@font-face` 가 매칭에서 이기고, 정본의 절대 경로는 요청조차 되지 않는다(실측 확인).

**Files:**
- Create: `webpage-capture-tool/apps/electron/renderer/fonts/toolhub-sans.woff2` (복사)
- Create: `webpage-capture-tool/apps/electron/renderer/fonts/toolhub-sans.LICENSE.txt` (복사)
- Create: `webpage-capture-tool/apps/electron/renderer/styles/theme.local.css`
- Create: `webpage-capture-tool/e2e/design-tokens.spec.js`
- Modify: `webpage-capture-tool/apps/electron/renderer/style.css:1-23` (import 추가 + `:root` 축소)

**Interfaces:**
- Produces: `--surface` · `--primary` · `--primary-strong` · `--line` · `--warning` 가 정본에서, `--sidebar-*` · `--log-*` · 레이아웃 치수가 `theme.local.css` 에서 제공된다. Task 3–5 가 이 이름들을 참조한다.

- [ ] **Step 1: E2E 검증 테스트를 먼저 쓴다 (실패해야 한다)**

`webpage-capture-tool/e2e/design-tokens.spec.js` 를 만든다. 이 앱은 산출 CSS 가 없는 대신 실제 렌더러의 계산값을 볼 수 있다.

```js
const { test, expect } = require("./fixtures");

/**
 * 정본 토큰이 실제 렌더러에 도달했는지 계산값으로 확인한다.
 * 다른 앱은 빌드 산출 CSS 를 grep 하지만 이 앱은 번들러가 없으므로
 * Electron 렌더러에서 직접 getComputedStyle 을 읽는 쪽이 더 강한 가드다.
 */
test.describe("디자인 토큰 — 정본 소비", () => {
  test("정본 색상 토큰이 :root 에서 해석된다", async ({ page }) => {
    const tokens = await page.evaluate(() => {
      const cs = getComputedStyle(document.documentElement);
      const read = (name) => cs.getPropertyValue(name).trim();
      return {
        primary: read("--primary"),
        primaryStrong: read("--primary-strong"),
        surface: read("--surface"),
        line: read("--line"),
        warning: read("--warning"),
        muted: read("--muted"),
      };
    });

    // 커스텀 프로퍼티는 작성한 문자열이 그대로 반환된다. 정본의 공백까지
    // 일치해야 하므로 아래 값은 실제 렌더러에서 읽어 확인한 것이다.
    expect(tokens.primary).toBe("#3366ff");
    expect(tokens.primaryStrong).toBe("#005eeb");
    expect(tokens.surface).toBe("#ffffff");
    expect(tokens.line).toBe("rgba(112, 115, 124, 0.22)");
    expect(tokens.warning).toBe("#a15c00");
    expect(tokens.muted).toBe("rgba(55, 56, 60, 0.72)");
  });

  test("정본 치수 토큰이 해석된다", async ({ page }) => {
    const tokens = await page.evaluate(() => {
      const cs = getComputedStyle(document.documentElement);
      const read = (name) => cs.getPropertyValue(name).trim();
      return {
        radiusMd: read("--ds-radius-md"),
        durationBase: read("--ds-duration-base"),
        easeStandard: read("--ds-ease-standard"),
      };
    });

    expect(tokens.radiusMd).toBe("12px");
    expect(tokens.durationBase).toBe("180ms");
    expect(tokens.easeStandard).toBe("cubic-bezier(0.4, 0, 0.2, 1)");
  });

  test("앱 고유 토큰이 정본을 덮지 않고 공존한다", async ({ page }) => {
    const tokens = await page.evaluate(() => {
      const cs = getComputedStyle(document.documentElement);
      const read = (name) => cs.getPropertyValue(name).trim();
      return {
        sidebarBg: read("--sidebar-bg"),
        logBg: read("--log-bg"),
        topbarH: read("--topbar-h"),
        sidebarW: read("--sidebar-w"),
      };
    });

    expect(tokens.sidebarBg).toBe("#1e2130");
    expect(tokens.logBg).toBe("#111827");
    expect(tokens.topbarH).toBe("52px");
    expect(tokens.sidebarW).toBe("140px");
  });

  test("ToolHub Sans 가 file:// 에서 실제로 로드된다", async ({ page }) => {
    // 실패한 폰트 요청이 하나라도 있으면 경로가 깨진 것이다.
    const failed = [];
    page.on("requestfailed", (r) => {
      if (r.url().includes("woff2")) failed.push(r.url());
    });

    await page.reload();
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(1000);

    expect(failed).toEqual([]);

    // 폰트 스택의 첫 항목이 ToolHub Sans 여야 한다.
    const family = await page.evaluate(() => getComputedStyle(document.body).fontFamily);
    expect(family.startsWith('"ToolHub Sans"')).toBe(true);

    // 폰트 페이스가 실제로 로드 완료 상태여야 한다.
    const loaded = await page.evaluate(async () => {
      await document.fonts.ready;
      return [...document.fonts].some(
        (f) => f.family === "ToolHub Sans" && f.status === "loaded",
      );
    });
    expect(loaded).toBe(true);
  });
});
```

- [ ] **Step 2: 실패를 확인한다**

```bash
cd webpage-capture-tool && npx playwright test e2e/design-tokens.spec.js
```

Expected: 4 failed. `--primary` 등이 빈 문자열이라 `toBe("#3366ff")` 가 깨지고, `fontFamily` 가 `"Helvetica Neue"...` 로 시작한다.

Electron 바이너리가 없어 `launch` 자체가 실패하면 먼저 아래를 실행한다.

```bash
cd webpage-capture-tool && node node_modules/electron/install.js
```

- [ ] **Step 3: 폰트 자산을 복사한다**

```bash
mkdir -p webpage-capture-tool/apps/electron/renderer/fonts && cp home/public/fonts/toolhub-sans.woff2 home/public/fonts/toolhub-sans.LICENSE.txt webpage-capture-tool/apps/electron/renderer/fonts/
```

- [ ] **Step 4: `theme.local.css` 를 만든다**

`webpage-capture-tool/apps/electron/renderer/styles/theme.local.css`:

```css
/* webpage-capture-tool 고유 토큰. 정본 뒤에 로드되어 정본을 덮을 수 있다.
   여기 있는 토큰이 3개 이상 앱에서 반복되면 정본으로 승격한다. */

/* Electron 은 렌더러를 file:// 로 로드하므로 정본의 절대 경로
   url("/fonts/toolhub-sans.woff2") 가 파일시스템 루트로 해석되어 실패한다.
   같은 family 를 상대 경로로 다시 선언하면 나중 @font-face 가 매칭에서
   이기고, 정본 쪽 절대 경로는 요청조차 발생하지 않는다. */
@font-face {
  font-family: "ToolHub Sans";
  src: url("../fonts/toolhub-sans.woff2") format("woff2");
  font-weight: 100 900;
  font-display: swap;
}

:root {
  /* 사이드바 — 라이트 테마 안에 상시 배치되는 다크 영역.
     정본 다크 팔레트는 중성 회색이지만 이쪽은 남색 계열이라
     앱의 인상을 유지하기 위해 기존 값을 그대로 둔다. */
  --sidebar-bg: #1e2130;
  --sidebar-text: #a0aec0;
  --sidebar-active: #ffffff;
  --sidebar-active-bg: #2d3a5e;
  --sidebar-hover-fill: rgba(255, 255, 255, 0.05);
  --sidebar-icon-fill: rgba(255, 255, 255, 0.08);

  /* 로그 패널 — 사이드바와 같은 이유의 상시 다크 영역. */
  --log-bg: #111827;
  --log-line: #374151;
  --log-text: #9ca3af;
  --log-content-text: #d1d5db;
  --log-active-bg: #1f2937;
  --log-active-text: #f9fafb;

  /* 워크벤치 고정 치수. 창 크기와 무관하게 고정되는 구조값이라
     정본의 컨테이너 토큰(--ds-container-*)과 역할이 다르다. */
  --topbar-h: 52px;
  --sidebar-w: 140px;
  --panel-w: 240px;
  --log-h: 180px;
}
```

- [ ] **Step 5: `style.css` 맨 앞에 import 를 넣고 `:root` 를 줄인다**

`style.css` 의 1–23행(파일 시작부터 `:root { ... }` 닫는 중괄호까지)을 아래로 바꾼다. CSS 스펙상 `@import` 는 다른 규칙보다 앞에 와야 하므로 파일 최상단이다.

```css
/* ds-*.css 는 packages/design-system 의 생성물이다. 직접 편집하지 말고
   정본을 고친 뒤 저장소 루트에서 `npm run tokens:sync` 를 실행한다.
   import 순서 = 캐스케이드 순서다. */
@import url("./styles/ds-tokens.css");
@import url("./styles/ds-base.css");
@import url("./styles/ds-primitives.css");
@import url("./styles/theme.local.css");

/* ============================================================
   Variables
   ============================================================ */
/* 색상·타이포·radius·shadow·모션 토큰은 정본(ds-tokens.css)에서 온다.
   앱 고유 토큰은 styles/theme.local.css 에 있다. */
```

`--bg` · `--text` · `--muted` · `--danger` · `--success` 는 이름이 같으므로 삭제만으로 정본 값이 적용된다. 나머지는 Task 3 에서 참조부를 개명한다.

- [ ] **Step 6: 아직 개명하지 않은 토큰을 임시로 살려 둔다**

Task 3 까지 화면이 깨지지 않게 `theme.local.css` 의 `:root` 맨 아래에 임시 블록을 붙인다.

```css
  /* TODO(Task 3 에서 제거): 참조부를 개명하기 전까지만 유지하는 별칭. */
  --panel: var(--surface);
  --accent: var(--primary);
  --accent-hover: var(--primary-strong);
  --border: var(--line);
  --warn: var(--warning);
```

- [ ] **Step 7: E2E 가 통과하는지 확인한다**

```bash
cd webpage-capture-tool && npx playwright test e2e/design-tokens.spec.js
```

Expected: 4 passed.

- [ ] **Step 8: 전체 검증**

```bash
cd webpage-capture-tool && mise run check && npm run test:e2e
```

Expected: vitest 12 files 통과, lint 통과, E2E 전체 통과.

- [ ] **Step 9: 커밋**

```bash
git add webpage-capture-tool/ && git commit -m "feat(webpage-capture-tool): consume the canonical design tokens"
```

---

### Task 3: 색상 참조부 이관

토큰 별칭을 걷어내고 참조부를 정본 이름으로 바꾼다. 하드코딩 색상 39곳도 함께 처리한다.

**Files:**
- Modify: `webpage-capture-tool/apps/electron/renderer/style.css` (전 구간)
- Modify: `webpage-capture-tool/apps/electron/renderer/styles/theme.local.css` (임시 별칭 제거)

**Interfaces:**
- Consumes: Task 2 가 도입한 정본 토큰과 `--sidebar-*` · `--log-*` 로컬 토큰
- Produces: `style.css` 에 색상 리터럴이 남지 않는다 (Task 7 의 회귀 가드가 이를 검사한다)

- [ ] **Step 1: 변수 참조부를 일괄 개명한다**

```bash
cd webpage-capture-tool/apps/electron/renderer && sed -i '' \
  -e 's/var(--accent-hover)/var(--primary-strong)/g' \
  -e 's/var(--accent)/var(--primary)/g' \
  -e 's/var(--panel)/var(--surface)/g' \
  -e 's/var(--border)/var(--line)/g' \
  -e 's/var(--warn)/var(--warning)/g' \
  style.css
```

`--accent-hover` 를 `--accent` 보다 먼저 치환해야 `var(--accent-hover)` 가 `var(--primary-hover)` 로 잘못 바뀌지 않는다.

- [ ] **Step 2: 개명이 끝났는지 확인한다**

```bash
cd webpage-capture-tool/apps/electron/renderer && grep -n "var(--accent\|var(--panel)\|var(--border)\|var(--warn)" style.css || echo "남은 참조 없음"
```

Expected: `남은 참조 없음`

- [ ] **Step 3: 임시 별칭을 제거한다**

`styles/theme.local.css` 에서 Step 6 에서 넣었던 `TODO(Task 3 에서 제거)` 주석과 그 아래 5줄을 지운다.

- [ ] **Step 4: 상시 다크 영역의 하드코딩을 로컬 토큰으로 바꾼다**

사이드바 3곳:

| 행 | 현재 | 변경 |
|---|---|---|
| 107 | `.nav-item:hover { background: rgba(255,255,255,.05); color: #fff; }` | `.nav-item:hover { background: var(--sidebar-hover-fill); color: var(--sidebar-active); }` |
| 116 | `background: rgba(255,255,255,.08);` | `background: var(--sidebar-icon-fill);` |

로그 패널 7곳:

| 행 | 현재 | 변경 |
|---|---|---|
| 174 | `background: #111827;` | `background: var(--log-bg);` |
| 175 | `border-top: 1px solid #374151;` | `border-top: 1px solid var(--log-line);` |
| 183 | `border-bottom: 1px solid #374151;` | `border-bottom: 1px solid var(--log-line);` |
| 190 | `color: #9ca3af;` | `color: var(--log-text);` |
| 193 | `.log-tab.active { background: #1f2937; color: #f9fafb; }` | `.log-tab.active { background: var(--log-active-bg); color: var(--log-active-text); }` |
| 203 | `color: #d1d5db;` | `color: var(--log-content-text);` |

- [ ] **Step 5: 라이트 영역의 하드코딩을 정본 토큰으로 바꾼다**

`#f9fafb` 는 10곳 모두 옅은 표면이다. 로그 패널 193행의 `#f9fafb` 는 앞 단계에서 이미 `--log-active-text` 가 됐으므로 여기서는 대상이 아니다.

| 리터럴 | 해당 행 | 변경 | 근거 |
|---|---|---|---|
| `#f9fafb` | 231, 317, 334, 354, 430, 483, 490, 529, 592, 609 | `var(--surface-2)` | 옅은 표면 |
| `#fff` (버튼 전경) | 211, 284, 293, 306, 307, 521 | `var(--on-primary)` | primary/danger 배경 위 글자 |
| `#e5e7eb` | 476 | `var(--line)` | 캔버스 배경 구분선 |
| `rgba(37,99,235,.12)` | 65 | `var(--primary-surface)` | primary 틴트 |
| `rgba(37,99,235,.1)` | 453 | `var(--primary-surface)` | primary 틴트 |
| `rgba(37,99,235,.08)` | 325, 342 | `var(--fill)` | 선택 상태 채움 |
| `rgba(37,99,235,.06)` | 359, 399 | `var(--fill-subtle)` | 호버 채움 |
| `rgba(34,197,94,.12)` | 59, 583 | `var(--success-surface)` | 성공 틴트 |
| `rgba(239,68,68,.12)` | 69, 584 | `var(--danger-surface)` | 실패 틴트 |
| `rgba(245,158,11,.1)` | 454 | `var(--warning-surface)` | 경고 틴트 |

`.dropzone.dragover`(359) 와 `.dom-candidate-item:hover`(399) 는 원래 accent 틴트였지만 `--fill-subtle` 은 중성 회색이다. 두 곳 모두 `border-color: var(--primary)` 를 함께 갖고 있어 색상 신호는 테두리가 담당하므로 채움은 중성으로 둔다.

- [ ] **Step 6: 남은 리터럴이 없는지 확인한다**

```bash
cd webpage-capture-tool/apps/electron/renderer && grep -nE "#[0-9a-fA-F]{3,8}\b|rgba?\(" style.css
```

Expected: 그림자 4곳(`rgba(0,0,0,...)`)만 남는다 — 50, 285, 479, 674행. Task 4 에서 처리한다.

- [ ] **Step 7: 검증**

```bash
cd webpage-capture-tool && mise run check && npm run test:e2e
```

Expected: 전부 통과.

- [ ] **Step 8: 화면을 눈으로 확인한다**

```bash
cd webpage-capture-tool && npm start
```

6개 화면(프로젝트·캡처·DOM·이미지·일괄·내보내기)을 전부 열어 색상 회귀가 없는지 본다. 특히 사이드바와 로그 패널의 어두운 영역, primary 버튼, 상태 배지를 확인한다. 확인 후 창을 닫는다.

- [ ] **Step 9: 커밋**

```bash
git add webpage-capture-tool/ && git commit -m "refactor(webpage-capture-tool): move colors onto the canonical tokens"
```

---

### Task 4: radius · shadow · 모션 · z-index 이관

**Files:**
- Modify: `webpage-capture-tool/apps/electron/renderer/style.css`
- Modify: `webpage-capture-tool/apps/electron/renderer/styles/theme.local.css`

**Interfaces:**
- Consumes: `--ds-radius-*` · `--ds-shadow-*` · `--ds-duration-*` · `--ds-ease-standard`
- Produces: `--z-modal-fallback` (Task 6 에서 제거된다)

- [ ] **Step 1: radius 를 3단계로 수렴시킨다**

현재 7종(4·5·6·7·8·12·999px)을 정본 4종으로 맞춘다.

| 현재 | 개수 | 변경 |
|---|---|---|
| `4px`, `5px`, `6px`, `7px` | 15 | `var(--ds-radius-sm)` (8px) |
| `8px` | 6 | `var(--ds-radius-sm)` (8px) |
| `12px` | 1 | `var(--ds-radius-md)` (12px) |
| `999px` | 3 | `var(--ds-radius-pill)` |

```bash
cd webpage-capture-tool/apps/electron/renderer && sed -i '' \
  -e 's/border-radius: 999px/border-radius: var(--ds-radius-pill)/g' \
  -e 's/border-radius: 12px/border-radius: var(--ds-radius-md)/g' \
  -e 's/border-radius: [45678]px/border-radius: var(--ds-radius-sm)/g' \
  style.css
```

macOS 는 BSD sed 라 `\|` 대체 표현을 지원하지 않는다. 문자 클래스 `[45678]` 로 쓴다. `border-radius` 는 전부 단일 값이라 `4px 4px 0 0` 같은 다중 값 훼손 위험이 없다.

- [ ] **Step 2: 확인**

```bash
cd webpage-capture-tool/apps/electron/renderer && grep -c "border-radius: var(--ds-radius" style.css && grep -n "border-radius: [0-9]" style.css || echo "리터럴 radius 없음"
```

Expected: 25건이 토큰이고 리터럴은 남지 않는다.

- [ ] **Step 3: 그림자를 정본 4단계로 바꾼다**

| 행 | 현재 | 변경 |
|---|---|---|
| 50 | `box-shadow: 0 1px 4px rgba(0,0,0,.06);` | `box-shadow: var(--ds-shadow-sm);` |
| 285 | `box-shadow: 0 4px 12px rgba(37,99,235,.25);` | 줄 전체 삭제 |
| 479 | `box-shadow: 0 8px 32px rgba(0,0,0,.15);` | `box-shadow: var(--ds-shadow-lg);` |
| 674 | `box-shadow: 0 24px 60px rgba(0,0,0,.2);` | `box-shadow: var(--ds-shadow-xl);` |

285행은 primary 버튼의 파란 그림자다. 정본의 그림자는 전부 중성이고 다른 7개 앱의 primary 버튼도 색 그림자를 쓰지 않으므로 삭제한다. 삭제 후 `.btn.primary, .btn-top.primary` 규칙은 `background` 와 `color` 만 남는다.

- [ ] **Step 4: 모션을 토큰으로 바꾼다**

`.15s`/`.1s` 하드코딩 10곳을 정본 duration·easing 으로 바꾼다.

| 현재 | 변경 |
|---|---|
| `transition: border-color .15s, background .15s;` | `transition: border-color var(--ds-duration-fast) var(--ds-ease-standard), background var(--ds-duration-fast) var(--ds-ease-standard);` |
| `transition: border-color .15s;` | `transition: border-color var(--ds-duration-fast) var(--ds-ease-standard);` |
| `transition: color .15s;` | `transition: color var(--ds-duration-fast) var(--ds-ease-standard);` |
| `transition: background .15s, border-color .15s;` | `transition: background var(--ds-duration-fast) var(--ds-ease-standard), border-color var(--ds-duration-fast) var(--ds-ease-standard);` |
| `transition: background .15s ease, color .15s ease;` | `transition: background var(--ds-duration-fast) var(--ds-ease-standard), color var(--ds-duration-fast) var(--ds-ease-standard);` |
| `transition: transform .1s, opacity .15s;` (275행) | `transition: transform var(--ds-duration-fast) var(--ds-ease-standard);` |

275행에서 `opacity` 전이를 빼는 이유는 Step 6 에서 `opacity` 기반 disabled 를 없애기 때문이다.

- [ ] **Step 5: z-index 를 정리한다**

`theme.local.css` 의 `:root` 에 추가한다.

```css
  /* 이 앱의 모달은 아직 z-index 로 쌓는다. 정본 스케일은 모달 단계를
     두지 않는다 — <dialog> 의 top layer 를 전제하기 때문이다. 전환할
     때까지만 토스트(300) 위에 오도록 앱 고유 단계를 둔다. */
  --z-modal-fallback: 400;
```

661행 근처 `.modal-overlay` 의 `z-index: 100;` 을 `z-index: var(--z-modal-fallback);` 으로 바꾼다. 기존 100 은 정본의 `--ds-z-sticky` 와 값이 겹치므로 그대로 두지 않는다.

- [ ] **Step 6: disabled 를 opacity 에서 토큰으로 바꾼다**

280행:

```css
.btn:disabled, .btn-top:disabled { opacity: .5; cursor: not-allowed; }
```

를 아래로 바꾼다.

```css
/* opacity 는 중첩되어 대비를 예측할 수 없게 만들므로 토큰으로 표현한다. */
.btn:disabled, .btn-top:disabled {
  background: var(--fill-subtle);
  color: var(--disabled);
  border-color: var(--line-subtle);
  cursor: not-allowed;
}
```

445행 `.rule-row.disabled { opacity: .5; }` 은 버튼이 아니라 목록 행의 비활성 표시이고 안쪽에 조작 요소가 없다. 아래로 바꾼다.

```css
.rule-row.disabled { color: var(--disabled); }
```

- [ ] **Step 7: 남은 리터럴이 없는지 확인한다**

```bash
cd webpage-capture-tool/apps/electron/renderer && grep -nE "#[0-9a-fA-F]{3,8}\b|rgba?\(|border-radius: [0-9]|box-shadow: [0-9]|\.1[0-9]?s|z-index: [0-9]" style.css || echo "리터럴 없음"
```

Expected: `리터럴 없음`

- [ ] **Step 8: E2E 에 프리미티브 값 검증을 추가한다**

`e2e/design-tokens.spec.js` 의 `test.describe` 블록 끝에 추가한다.

```js
  test("disabled 버튼이 opacity 가 아니라 토큰으로 표현된다", async ({ page }) => {
    // 취소 버튼은 초기 상태에서 disabled 다.
    const cancel = page.locator("#btn-cancel");
    await expect(cancel).toBeDisabled();

    const style = await cancel.evaluate((el) => {
      const cs = getComputedStyle(el);
      return { opacity: cs.opacity, color: cs.color, background: cs.backgroundColor };
    });

    expect(style.opacity).toBe("1");
    expect(style.color).toBe("rgba(55, 56, 60, 0.38)");
  });

  test("모달 z-index 가 정본 스케일과 겹치지 않는다", async ({ page }) => {
    const z = await page.evaluate(() => {
      const cs = getComputedStyle(document.documentElement);
      return {
        modal: cs.getPropertyValue("--z-modal-fallback").trim(),
        toast: cs.getPropertyValue("--ds-z-toast").trim(),
        sticky: cs.getPropertyValue("--ds-z-sticky").trim(),
      };
    });

    expect(Number(z.modal)).toBeGreaterThan(Number(z.toast));
    expect(z.modal).not.toBe(z.sticky);
  });
```

- [ ] **Step 9: 검증**

```bash
cd webpage-capture-tool && mise run check && npm run test:e2e
```

Expected: 전부 통과. `disabled 버튼` 테스트가 실패하면 `--disabled` 토큰이 `rgba(55,56,60,0.38)` 인지 `packages/design-system/tokens.css` 에서 확인한다.

- [ ] **Step 10: 커밋**

```bash
git add webpage-capture-tool/ && git commit -m "refactor(webpage-capture-tool): move radius, shadow, motion, and z-index onto tokens"
```

---

### Task 5: 타이포를 정본 5단계로 수렴

47곳의 font-size 리터럴(10·11·12·13·14·15·16px)을 정본 5단계(12·14·16·20·28px)로 맞춘다. 27곳은 값이 그대로고 20곳이 1–2px 커진다.

**커지는 것이 위험한 이유:** 이 앱은 `body { height: 100vh; overflow: hidden }` 에 `--sidebar-w: 140px` · `--panel-w: 240px` 같은 고정 치수를 쓴다. 글자가 커지면 좁은 열에서 줄바꿈이 생길 수 있다. 그래서 E2E 로 폭·줄수를 먼저 못박고 옮긴다.

**Files:**
- Modify: `webpage-capture-tool/apps/electron/renderer/style.css` (font-size 47곳)
- Modify: `webpage-capture-tool/e2e/design-tokens.spec.js`

**Interfaces:**
- Consumes: `--ds-font-size-caption|body|subtitle` 와 대응하는 `--ds-line-height-*`

- [ ] **Step 1: 밀집 영역 회귀 가드를 먼저 쓴다**

`e2e/design-tokens.spec.js` 에 추가한다. 이 테스트는 **이관 전에도 통과해야 한다** — 이관 후에도 계속 통과하는지가 관심사다.

```js
test.describe("타이포 — 고정 폭 영역이 넘치지 않는다", () => {
  test("사이드바 항목이 한 줄을 유지한다", async ({ page }) => {
    const overflow = await page.evaluate(() => {
      const sidebar = document.querySelector(".sidebar");
      return [...document.querySelectorAll(".nav-label")].map((el) => ({
        text: el.textContent,
        // 한 줄이면 높이가 line-height 한 배수다. 두 줄이면 두 배가 된다.
        lines: Math.round(el.getBoundingClientRect().height / parseFloat(getComputedStyle(el).lineHeight)),
        overflowsSidebar: el.getBoundingClientRect().right > sidebar.getBoundingClientRect().right,
      }));
    });

    expect(overflow.filter((o) => o.lines > 1)).toEqual([]);
    expect(overflow.filter((o) => o.overflowsSidebar)).toEqual([]);
  });

  test("상단 바가 고정 높이 안에 들어간다", async ({ page }) => {
    const fits = await page.evaluate(() => {
      const bar = document.querySelector(".topbar");
      const h = bar.getBoundingClientRect().height;
      const children = [...bar.querySelectorAll("button, span")];
      return {
        barHeight: h,
        tallest: Math.max(...children.map((c) => c.getBoundingClientRect().height)),
      };
    });

    expect(fits.barHeight).toBe(52);
    expect(fits.tallest).toBeLessThanOrEqual(52);
  });

  test("우측 속성 패널이 가로로 넘치지 않는다", async ({ page }) => {
    await page.locator('.nav-item[data-screen="capture"]').click();
    const overflowing = await page.evaluate(() => {
      // 우측 패널의 클래스는 .properties-panel 이고 그 안의 .panel-content
      // 가 화면별로 hidden 을 토글한다.
      const panel = document.querySelector(".properties-panel");
      return panel.scrollWidth > panel.clientWidth ? ["가로 스크롤 발생"] : [];
    });

    expect(overflowing).toEqual([]);
  });

  test("로그 패널이 고정 높이를 유지한다", async ({ page }) => {
    const h = await page.evaluate(
      () => document.querySelector(".log-panel").getBoundingClientRect().height,
    );
    expect(h).toBe(180);
  });
});
```

- [ ] **Step 2: 가드가 현재 상태에서 통과하는지 확인한다**

```bash
cd webpage-capture-tool && npx playwright test e2e/design-tokens.spec.js -g "타이포"
```

Expected: 4 passed. 쓰인 셀렉터(`.nav-label` · `.topbar` · `.properties-panel` · `.log-panel`)는 모두 실제로 존재하는 것을 확인했다. 그래도 실패하면 이관 전 상태에 이미 넘침이 있다는 뜻이므로, 그 사실을 기록하고 해당 단정만 현재 값에 맞춰 완화한 뒤 진행한다. **이관 전에 green 이어야 이후 실패가 이관 탓임을 알 수 있다.**

- [ ] **Step 3: font-size 를 매핑대로 바꾼다**

| 현재 | 개수 | 변경 | 함께 넣을 line-height |
|---|---|---|---|
| `10px`, `11px`, `12px` | 36 | `var(--ds-font-size-caption)` | 해당 규칙에 line-height 가 없으면 넣지 않는다 |
| `13px`, `14px` | 8 | `var(--ds-font-size-body)` | 〃 |
| `15px`, `16px` | 3 | `var(--ds-font-size-subtitle)` | 〃 |

```bash
cd webpage-capture-tool/apps/electron/renderer && sed -i '' \
  -e 's/font-size: 1[012]px/font-size: var(--ds-font-size-caption)/g' \
  -e 's/font-size: 1[34]px/font-size: var(--ds-font-size-body)/g' \
  -e 's/font-size: 1[56]px/font-size: var(--ds-font-size-subtitle)/g' \
  style.css
```

- [ ] **Step 4: body 의 line-height 를 정본에 맞춘다**

29행 `body` 규칙의 `font-size` 는 이제 `var(--ds-font-size-body)` 다. 바로 아래에 line-height 를 추가한다.

```css
body {
  font-family: var(--ds-font-sans);
  font-size: var(--ds-font-size-body);
  line-height: var(--ds-line-height-body);
  color: var(--text);
  background: var(--bg);
  height: 100vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
```

`font-family` 도 이 단계에서 정본 스택으로 바꾼다. 기존 `"Helvetica Neue", "Segoe UI", "Apple SD Gothic Neo", sans-serif` 를 지우고 `var(--ds-font-sans)` 로 대체한다.

`.log-content`(200행)의 monospace 스택은 **바꾸지 않는다.** 정본에 monospace 토큰이 없고, 로그는 등폭이어야 한다.

- [ ] **Step 5: 리터럴이 남지 않았는지 확인한다**

```bash
cd webpage-capture-tool/apps/electron/renderer && grep -n "font-size: [0-9]" style.css || echo "리터럴 font-size 없음"
```

Expected: `리터럴 font-size 없음`

- [ ] **Step 6: 밀집 영역 가드가 여전히 통과하는지 확인한다**

```bash
cd webpage-capture-tool && npx playwright test e2e/design-tokens.spec.js
```

Expected: 전부 통과. **실패하면 되돌리지 말고 어느 영역이 넘쳤는지 기록한 뒤**, 그 영역만 `theme.local.css` 에 앱 고유 단계를 두어 예외 처리한다. 예를 들어 사이드바 라벨이 두 줄이 되면:

```css
  /* 사이드바 폭 140px 안에서 라벨이 두 줄이 되지 않도록 caption 아래
     단계를 둔다. 정본에 없는 단계이므로 이 앱 안에서만 쓴다. */
  --sidebar-label-size: 11px;
```

- [ ] **Step 7: 전체 검증과 눈 확인**

```bash
cd webpage-capture-tool && mise run check && npm run test:e2e
```

```bash
cd webpage-capture-tool && npm start
```

6개 화면을 전부 열어 글자 크기 변화로 깨진 곳이 없는지 본다. 특히 우측 속성 패널의 폼 라벨과 라디오/체크박스 줄, 이미지 편집기의 단축키 표를 확인한다.

- [ ] **Step 8: 커밋**

```bash
git add webpage-capture-tool/ && git commit -m "refactor(webpage-capture-tool): converge typography onto the canonical five-step scale"
```

---

### Task 6: 모달을 `<dialog>` 로 전환

**범위에 관한 판단:** 사용자는 이 앱을 "토큰만, 셸 계약 제외" 로 정했고 `<dialog>` 규칙은 셸 계약 절에 적혀 있다. 다만 그 제외 결정의 근거는 **헤더 3슬롯·브랜드 허브 링크·컨테이너 폭** 이 데스크톱 워크벤치에 맞지 않는다는 것이었고, 모달은 그 논거와 무관하다. 전환 비용은 JS 6곳·HTML 2곳·CSS 1블록으로 작고, 지금은 없는 Escape 닫기와 포커스 트랩이 생기며, Task 4 에서 만든 `--z-modal-fallback` 이라는 영구 부채가 사라진다. 그래서 포함한다. 범위를 지키는 쪽을 택한다면 이 태스크만 건너뛰어도 나머지는 성립한다.

**Files:**
- Modify: `webpage-capture-tool/apps/electron/renderer/index.html` (모달 2개)
- Modify: `webpage-capture-tool/apps/electron/renderer/project-screen.js:69,101,128,140,164`
- Modify: `webpage-capture-tool/apps/electron/renderer/batch-screen.js:36`
- Modify: `webpage-capture-tool/apps/electron/renderer/style.css:659-677`
- Modify: `webpage-capture-tool/apps/electron/renderer/styles/theme.local.css` (`--z-modal-fallback` 제거)
- Create: `webpage-capture-tool/e2e/modal.spec.js`

**Interfaces:**
- Consumes: 없음
- Produces: `#modal-new-project` 와 `#modal-save-recipe` 가 `<dialog>` 엘리먼트가 된다

- [ ] **Step 1: 모달 E2E 를 먼저 쓴다**

`webpage-capture-tool/e2e/modal.spec.js`:

```js
const { test, expect } = require("./fixtures");

test.describe("모달 — dialog 전환", () => {
  test("새 프로젝트 모달이 열리고 닫힌다", async ({ page }) => {
    const dialog = page.locator("#modal-new-project");
    await expect(dialog).not.toBeVisible();

    await page.locator("#btn-new-project").click();
    await expect(dialog).toBeVisible();

    await page.locator("#modal-cancel-project").click();
    await expect(dialog).not.toBeVisible();
  });

  test("Escape 로 닫힌다", async ({ page }) => {
    const dialog = page.locator("#modal-new-project");
    await page.locator("#btn-new-project").click();
    await expect(dialog).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
  });

  test("열린 동안 바깥 요소가 inert 가 된다", async ({ page }) => {
    await page.locator("#btn-new-project").click();

    // :modal 은 포커스 트랩이 실제로 걸렸는지를 재는 의사 클래스다.
    const trapped = await page.evaluate(
      () => document.getElementById("modal-new-project").matches(":modal"),
    );
    expect(trapped).toBe(true);
  });

  test("닫힌 모달은 화면을 가리지 않는다", async ({ page }) => {
    // display 를 [open] 에만 주지 않으면 UA 기본값 display:none 을 덮어
    // 닫힌 모달이 항상 보인다. 그 회귀를 잡는다.
    const box = await page.evaluate(() => {
      const el = document.getElementById("modal-new-project");
      const r = el.getBoundingClientRect();
      return { w: r.width, h: r.height, display: getComputedStyle(el).display };
    });

    expect(box.display).toBe("none");
    expect(box.w).toBe(0);
    expect(box.h).toBe(0);
  });
});
```

- [ ] **Step 2: 실패를 확인한다**

```bash
cd webpage-capture-tool && npx playwright test e2e/modal.spec.js
```

Expected: 2 failed, 2 passed.

- 실패: `Escape 로 닫힌다`(현재 Escape 핸들러가 없다), `열린 동안 바깥 요소가 inert 가 된다`(`:modal` 은 `<dialog>` 만 매칭한다).
- 통과: 나머지 둘. 여는/닫는 동작은 지금도 되고, 닫힌 모달도 전역 `.hidden { display: none !important }` 때문에 이미 `display: none` 이다. 이 둘은 **전환 후에도 계속 통과해야 하는 회귀 가드**다.

쓰인 id(`#btn-new-project` · `#modal-new-project` · `#modal-cancel-project`)는 모두 `index.html` 에 실제로 존재하는 것을 확인했다.

- [ ] **Step 3: HTML 을 `<dialog>` 로 바꾼다**

`index.html` 에서 두 모달을 찾아 바꾼다. 기존 구조:

```html
<div class="modal-overlay hidden" id="modal-new-project">
  <div class="modal">
    ...내용...
  </div>
</div>
```

바꾼 구조 — 바깥 래퍼를 없애고 `<dialog>` 하나로 만든다. 배경막은 `::backdrop` 이 담당한다.

```html
<dialog class="modal" id="modal-new-project" aria-labelledby="modal-new-project-title">
  ...내용...
</dialog>
```

내용의 `<h3>` 에 `id="modal-new-project-title"` 을 붙인다. `#modal-save-recipe` 도 같은 방식으로 바꾸고 `aria-labelledby="modal-save-recipe-title"` 를 쓴다.

- [ ] **Step 4: CSS 를 바꾼다**

`style.css` 의 Modal 섹션(659–677행)을 아래로 바꾼다.

```css
/* ============================================================
   Modal
   ============================================================ */
/* display 는 [open] 에만 준다. 무조건 주면 닫힌 상태의 UA 기본값
   display: none 을 덮어 모달이 항상 보인다. */
.modal {
  border: none;
  padding: 24px;
  width: 360px;
  background: var(--surface);
  color: var(--text);
  border-radius: var(--ds-radius-md);
  box-shadow: var(--ds-shadow-xl);
}
.modal[open] {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.modal::backdrop {
  background: rgba(23, 23, 25, 0.4);
}
.modal h3 { font-size: var(--ds-font-size-subtitle); font-weight: 700; }
.modal-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 4px; }
```

`<dialog>` 는 top layer 에 렌더되므로 `z-index` 도 `position: fixed` 도 필요 없다.

- [ ] **Step 5: `--z-modal-fallback` 을 제거한다**

`styles/theme.local.css` 에서 Task 4 Step 5 에서 넣은 주석과 `--z-modal-fallback` 줄을 지운다.

`e2e/design-tokens.spec.js` 의 `모달 z-index 가 정본 스케일과 겹치지 않는다` 테스트도 지운다 — 검사 대상이 사라졌다.

- [ ] **Step 6: JS 를 `showModal()`/`close()` 로 바꾼다**

`project-screen.js`:

| 행 | 현재 | 변경 |
|---|---|---|
| 69 | `document.getElementById("modal-new-project").classList.remove("hidden");` | `document.getElementById("modal-new-project").showModal();` |
| 101 | `document.getElementById("modal-new-project").classList.add("hidden");` | `document.getElementById("modal-new-project").close();` |
| 128 | `document.getElementById("modal-new-project").classList.add("hidden");` | `document.getElementById("modal-new-project").close();` |
| 140 | `document.getElementById("modal-save-recipe").classList.add("hidden");` | `document.getElementById("modal-save-recipe").close();` |
| 164 | `document.getElementById("modal-save-recipe").classList.add("hidden");` | `document.getElementById("modal-save-recipe").close();` |

`batch-screen.js`:

| 행 | 현재 | 변경 |
|---|---|---|
| 36 | `document.getElementById("modal-save-recipe").classList.remove("hidden");` | `document.getElementById("modal-save-recipe").showModal();` |

70행의 `document.getElementById("modal-project-name").focus();` 는 그대로 둔다. `showModal()` 뒤에 호출하는 명시적 `focus()` 는 정상 동작한다.

- [ ] **Step 7: 통과를 확인한다**

```bash
cd webpage-capture-tool && npx playwright test e2e/modal.spec.js
```

Expected: 4 passed.

- [ ] **Step 8: 전체 검증**

```bash
cd webpage-capture-tool && mise run check && npm run test:e2e
```

Expected: 전부 통과. `lint` 는 `node --check` 라 문법만 본다.

- [ ] **Step 9: 커밋**

```bash
git add webpage-capture-tool/ && git commit -m "refactor(webpage-capture-tool): convert modals to native dialog"
```

---

### Task 7: 문서 갱신과 최종 검증

**Files:**
- Modify: `docs/frontend-conventions.md:5-12` (적용 대상 표), `:49-66` (셸 계약 절)
- Modify: `packages/design-system/README.md`
- Modify: `webpage-capture-tool/docs/contributor-guide.md`

- [ ] **Step 1: 적용 대상 표를 갱신한다**

`docs/frontend-conventions.md` 의 5–12행을 아래로 바꾼다.

```markdown
## 적용 대상

| 스택 | 앱 | 정본 토큰 | 셸 계약 |
|---|---|---|---|
| Vite + React SPA | `home`, `sign-maker`, `json-yaml-converter`, `openapi-editor` | 적용 | 적용 |
| Next.js App Router | `ddl-seed-generator`, `config-diff-viewer`, `dummy-file-generator` | 적용 | 적용 |
| Electron + 바닐라 CSS | `webpage-capture-tool` | 적용 | 미적용 |

> `webpage-capture-tool` 은 데스크톱 워크벤치라 헤더 3슬롯·브랜드 허브 링크·컨테이너 폭 규칙이 맞지 않는다. 토큰과 `<dialog>` 규칙만 따른다. `class-diagram-generator`(Kotlin)는 대상 외.
```

- [ ] **Step 2: 디렉터리 구조에 Electron 을 추가한다**

`docs/frontend-conventions.md` 의 "디렉터리 구조" 절 끝(102행 뒤)에 추가한다.

````markdown
**Electron (`apps/electron/renderer/`)**
```
index.html                진입 HTML (file:// 로 로드된다)
style.css                 @import 4줄 + 앱 전체 스타일
*-screen.js               화면별 스크립트
fonts/toolhub-sans.woff2  로컬 폰트 자산
styles/ds-tokens.css      정본 복사본 (생성물, 편집 금지)
styles/ds-base.css        정본 복사본
styles/ds-primitives.css  정본 복사본
styles/ds-sync.test.ts    정본 복사본 (drift 검증)
styles/theme.local.css    앱 고유 토큰 + 로컬 @font-face
```

번들러가 없어 `style.css` 를 토픽 파일로 쪼개지 않는다. `@import` 는 런타임 요청이라 개수를 늘리면 첫 페인트가 늦어진다.
````

- [ ] **Step 3: `file://` 폰트 규칙을 셸 계약 절에 적는다**

`docs/frontend-conventions.md` 의 66행(타이포 규칙) 뒤에 추가한다.

```markdown
- **`file://` 로 로드되는 앱은 폰트를 상대 경로로 다시 선언한다.** 정본의 `@font-face` 는 `url("/fonts/...")` 절대 경로라 파일시스템 루트로 해석되어 실패한다. `theme.local.css` 에서 같은 family 를 상대 경로로 재선언하면 나중 `@font-face` 가 매칭에서 이기고 정본 쪽 절대 경로는 요청조차 발생하지 않는다.
- **번들러가 없는 앱은 산출 CSS 대신 런타임 계산값으로 검증한다.** `getComputedStyle` 로 토큰이 실제 해석되는지 보는 쪽이 grep 보다 강한 가드다.
```

- [ ] **Step 4: 정본 README 에 레이아웃 무관 규칙을 적는다**

`packages/design-system/README.md` 의 drift 테스트 설명에 추가한다.

```markdown
`ds-sync.test.ts` 는 자기 위치(`dirname(__filename)`)를 검사 경로로 쓴다. 스타일 디렉터리가 앱마다 `src/styles` · `app/styles` · `apps/electron/renderer/styles` 로 달라 경로를 추론하지 않는다. 새 앱을 추가할 때 `scripts/sync-design-tokens.mjs` 의 `TARGETS` 에 경로만 적으면 된다.

금지 Tailwind 단계 스캔은 `src` 또는 `app` 이 있을 때만 돈다. Tailwind 를 쓰지 않는 앱은 스캔 대상이 0건이고 그게 정상이다.
```

- [ ] **Step 5: 앱 기여 가이드에 생성물 규칙을 적는다**

`webpage-capture-tool/docs/contributor-guide.md` 에 절을 추가한다.

```markdown
## 디자인 토큰

`apps/electron/renderer/styles/` 의 `ds-tokens.css` · `ds-base.css` · `ds-primitives.css` · `ds-sync.test.ts` 는 `packages/design-system/` 정본의 생성물이다. **직접 편집하지 않는다.** 정본을 고친 뒤 저장소 루트에서 `npm run tokens:sync` 를 실행한다. 동기화를 잊으면 `npm run test` 가 실패한다.

앱 고유 토큰(사이드바·로그 패널의 상시 다크 색상, 워크벤치 고정 치수, 로컬 `@font-face`)만 `styles/theme.local.css` 에 둔다.
```

- [ ] **Step 6: 8개 앱 전체 검증**

```bash
for app in sign-maker json-yaml-converter ddl-seed-generator openapi-editor dummy-file-generator config-diff-viewer home webpage-capture-tool; do echo "=== $app ==="; (cd "$app" && mise run check) || echo "FAILED: $app"; done
```

Expected: 8개 전부 통과.

- [ ] **Step 7: 루트 검증**

```bash
npm run tokens:check && npm run tokens:test
```

Expected: drift 0건, 7 tests 통과.

- [ ] **Step 8: 이 앱의 필수 E2E**

```bash
cd webpage-capture-tool && npm run test:e2e
```

Expected: 전부 통과. 앱 `CLAUDE.md` 가 최종 검증에 요구하는 항목이다.

- [ ] **Step 9: 커밋**

```bash
git add docs/ packages/design-system/README.md webpage-capture-tool/docs/ && git commit -m "docs(design-system): record the Electron layout and file:// font rule"
```

---

## 완료 기준

- [ ] 8개 앱 전부 `mise run check` 통과
- [ ] 루트 `npm run tokens:check` drift 0건, `npm run tokens:test` 통과
- [ ] `webpage-capture-tool` 의 `npm run test:e2e` 전부 통과
- [ ] `style.css` 에 색상·radius·shadow·font-size·z-index 리터럴이 남지 않음
- [ ] 6개 화면을 눈으로 확인해 색상·크기 회귀 없음

## 이번 파도에서 하지 않는 것

- **다크 모드 추가.** 이 앱은 `data-theme` 를 설정하지 않는다. 정본의 다크 블록은 비활성 상태로 남는다.
- **`style.css` 토픽 분리.** 번들러가 없어 `@import` 가 런타임 요청이고, 682줄을 쪼갤 만한 검증 가드가 없다.
- **셸 계약(헤더 3슬롯·브랜드 허브 링크·컨테이너 폭).** 데스크톱 워크벤치 구조와 맞지 않는다.
- **`.ds-card` · `.ds-icon-btn` 프리미티브 도입.** 이 앱의 버튼은 `.btn` / `.btn-top` / `.btn-icon` / `.tool-btn` 4계열로 갈라져 있고 크기 규약(36px)도 다르다. 값만 토큰으로 옮기고 클래스 통합은 하지 않는다.
- **`.btn:hover { transform: translateY(-1px) }` 제거.** 다른 7개 앱에는 없는 이 앱 고유의 미세 인터랙션이다. 호버 *값*은 Task 4 에서 정본 duration·easing 으로 옮기지만 동작 자체는 남긴다. 없애면 앱의 촉감이 바뀌는데 그건 토큰 통일과 다른 결정이다.
- **남은 monospace 스택 통일.** 정본에 monospace 토큰이 없다. 승격 여부는 별건이다.
