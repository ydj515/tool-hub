# Design System Unification Implementation Plan (2/3: 기계적 마이그레이션 3개 앱)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** drift 테스트를 정본으로 승격하고, `json-yaml-converter`·`ddl-seed-generator`·`openapi-editor` 세 앱을 정본 디자인 시스템 소비자로 전환한다.

**Architecture:** 1차 계획서에서 만든 `packages/design-system/` 정본과 `scripts/sync-design-tokens.mjs`를 그대로 쓴다. 각 앱은 `styles/theme.css`를 정본 복사본으로 교체하고, 앱 고유 토큰을 `theme.local.css`로 내리고, `--ds-` 접두사로 토큰 이름을 치환한 뒤 `.ds-icon-btn`·`.ds-card`·`.ds-shell`·`.ds-page`를 적용한다. 값 변화는 대부분 접근성 수정이며 태스크마다 예상 diff를 표로 명시한다.

**Tech Stack:** Tailwind CSS 4.2.4, Node 24.13.0, Vitest, Playwright(json-yaml-converter·openapi-editor), TypeScript, React 19, Next.js(ddl-seed-generator), mise.

**선행 문서:**
- 설계: [2026-07-25-design-system-unification-design.md](../specs/2026-07-25-design-system-unification-design.md)
- 1차 계획서: [2026-07-25-design-system-unification.md](2026-07-25-design-system-unification.md)

**범위:** 설계 문서 마이그레이션 단계 4·6·7. 구조 재작성이 없는 세 앱만 다룬다.

**비대상:** `webpage-capture-tool`(682줄 CSS, 겹치는 이름의 값 전환 100곳 + 하드코딩 색상 39곳), `dummy-file-generator`(텍스트 5단 토큰 전환), `config-diff-viewer`(927줄 + `<dialog>` 재작성), `home`(`@theme`→`:root` 구조 전환), 문서 갱신. 3차 계획서에서 다룬다.

**타이포 스케일의 적용 범위.** 헤더 슬롯 계약이 규정하는 것은 `h1`(`--ds-font-size-title`)과 설명문(`--ds-font-size-body`) 두 가지다. 이 계획서는 그 둘만 적용한다. 세 앱에 남은 나머지 font-size(패널 제목·칩·상태바 등 20종 이상)를 5단으로 수렴하는 작업은 셸 계약과 독립적이므로 별도 작업으로 남긴다 — 한 태스크에 섞으면 리뷰어가 "계약 위반"과 "본문 크기 조정"을 구분할 수 없다.

## Global Constraints

- 작업 디렉터리는 워크트리 `/Users/dongjin/dev/project/tool-hub/.claude/worktrees/design-system-unification`, 브랜치 `feat/design-system-unification`이다. 메인 체크아웃으로 `cd` 하지 않는다.
- **앱의 `styles/ds-*.css`와 `styles/ds-sync.test.ts`를 직접 편집하지 않는다.** 생성물이다. 정본을 고친 뒤 저장소 루트에서 `npm run tokens:sync`를 실행한다.
- **Tailwind 테마 네임스페이스와 겹치는 토큰은 `--ds-` 접두사를 쓴다.** `--ds-font-sans`, `--ds-font-size-*`, `--ds-line-height-*`, `--ds-tracking-*`, `--ds-radius-*`, `--ds-shadow-*`, `--ds-ease-*`, `--ds-duration-*`, `--ds-z-*`, `--ds-container-*`, `--ds-page-padding*`.
- **색 토큰은 접두사를 붙이지 않는다.** `--bg`, `--surface`, `--surface-2`, `--surface-3`, `--fill*`, `--line*`, `--control-border`, `--text`, `--text-neutral`, `--muted`, `--disabled`, `--primary*`, `--on-primary`, `--danger*`, `--success*`, `--warning*`.
- 정본이 정의하지 않은 Tailwind radius/shadow 단계(`rounded-xl`, `rounded-2xl`, `shadow-2xl` 등)는 사용 금지. 정본 `ds-sync.test.ts`가 강제한다.
- 모든 직접 조작 요소는 **36px** 높이를 유지한다.
- 포커스링은 정본 `ds-base.css`의 전역 `:where(...):focus-visible` 규칙이 담당한다. 앱에서 중복 선언하지 않는다.
- disabled는 `opacity`로 표현하지 않고 `--disabled` + `--fill-subtle` 토큰을 쓴다.
- 라이트·다크 양쪽에서 텍스트 4.5:1, non-text control border/focus 3:1을 유지한다.
- 각 태스크의 완료 조건은 해당 앱에서 `mise run check` exit 0이다. `json-yaml-converter`·`openapi-editor`는 `check`가 e2e까지 돌린다.
- 허브 URL은 `https://tool-hub-rho.vercel.app/`이다.
- 커밋 메시지는 Conventional Commits를 따른다.

---

## File Structure

| 파일 | 책임 |
|---|---|
| `packages/design-system/ds-sync.test.ts` | 신규 정본. drift 검증 + 금지 유틸리티 스캔. 앱으로 동기화된다 |
| `scripts/sync-design-tokens.mjs` | `FILES`에 테스트 추가, `TARGETS`에 3개 앱 추가 |
| `<app>/styles/ds-*.css`, `<app>/styles/ds-sync.test.ts` | 정본 복사본(생성물, 커밋) |
| `<app>/styles/theme.local.css` | 앱 고유 토큰 |
| `<app>/src/constants.ts` 또는 `<app>/app/_lib/constants.ts` | `TOOL_HUB_URL` |

앱별 디렉터리 규약이 다르다. `json-yaml-converter`·`openapi-editor`는 `src/styles`, `ddl-seed-generator`는 `app/styles`다.

---

### Task 1: drift 테스트를 정본으로 승격

**Files:**
- Create: `packages/design-system/ds-sync.test.ts`
- Modify: `scripts/sync-design-tokens.mjs`
- Modify: `scripts/sync-design-tokens.test.mjs`
- Delete: `sign-maker/src/styles/ds-sync.test.ts` (동기화로 재생성된다)

**Interfaces:**
- Consumes: `FILES`·`TARGETS`·`sync()`·`render()` (1차 계획서 Task 2)
- Produces: `FILES`에 `'ds-sync.test.ts': 'ds-sync.test.ts'` 항목. 이후 모든 앱이 동기화만으로 drift 테스트를 얻는다.

테스트를 앱마다 손으로 쓰면 세 곳에 같은 코드가 복제되고 테스트 자체가 갈라질 수 있다. 정본으로 올리면 동기화 대상이 되어 그 문제가 사라진다. `src`/`app` 디렉터리 차이는 런타임에 판별한다.

- [ ] **Step 1: `FILES` 확장을 단정하는 실패 테스트를 작성한다**

`scripts/sync-design-tokens.test.mjs`의 `makeRepo` 아래 `describe('sync', ...)` 안에 추가한다.

```js
  test('drift 테스트 파일도 동기화 대상이다', () => {
    const root = makeRepo();
    sync({ root });

    const path = join(root, 'sign-maker/src/styles/ds-sync.test.ts');
    assert.ok(existsSync(path), 'ds-sync.test.ts 가 복사되어야 한다');
    assert.equal(readFileSync(path, 'utf8'), render('ds-sync.test.ts', root));
  });
```

`makeRepo`는 `Object.keys(FILES)`를 돌며 정본 파일을 만들므로 새 항목이 자동으로 포함된다. 수정할 필요가 없다.

- [ ] **Step 2: 테스트가 실패하는 것을 확인한다**

Run: `npm run tokens:test`
Expected: FAIL — `ds-sync.test.ts 가 복사되어야 한다`. 그리고 기존 `대상 앱에 정본 3파일을 복사하고 복사한 경로를 반환한다` 테스트도 `drifted.length` 가 3이 아니라 4가 되어 실패한다.

- [ ] **Step 3: 기존 테스트의 기대 개수를 파일 수에서 derive 하도록 고친다**

하드코딩된 `3`을 `Object.keys(FILES).length`로 바꿔 파일이 늘어도 깨지지 않게 한다. `scripts/sync-design-tokens.test.mjs`에서 세 곳을 고친다.

```js
    assert.equal(drifted.length, Object.keys(FILES).length, '모든 정본 파일이 새로 쓰여야 한다');
```

```js
    assert.equal(drifted.length, Object.keys(FILES).length, '모든 정본 파일의 불일치를 보고해야 한다');
```

세 번째는 `TARGETS` 단정이다. 이 계획서에서 앱이 세 개 늘어나므로 이름 목록을 직접 적지 않고 순서만 확인한다.

```js
  test('TARGETS 는 마이그레이션된 앱만 담는다', () => {
    assert.deepEqual(Object.keys(TARGETS), [
      'sign-maker',
      'json-yaml-converter',
      'ddl-seed-generator',
      'openapi-editor',
    ]);
  });
```

- [ ] **Step 4: `FILES` 와 `TARGETS` 를 확장한다**

`scripts/sync-design-tokens.mjs`에서 두 상수를 바꾼다.

```js
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
  'openapi-editor': 'src/styles',
};
```

- [ ] **Step 5: 정본 drift 테스트를 작성한다**

`packages/design-system/ds-sync.test.ts`. 배너가 CSS 주석(`/* */`)이므로 TypeScript 에서도 유효하다.

```ts
/// <reference types="node" />
// 앱마다 tsconfig 의 types 설정이 다르므로(sign-maker 는 ["vite/client"] 로
// 제한한다) 이 파일을 8개 앱에서 동일하게 유지하기 위해 명시한다.
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * 이 파일은 packages/design-system/ds-sync.test.ts 의 생성물이다.
 * 직접 편집하지 말고 정본을 고친 뒤 저장소 루트에서
 * `npm run tokens:sync` 를 실행한다.
 *
 * CI 가 없으므로 검증이 이미 일어나는 곳(각 앱의 vitest)에 감지를 둔다.
 */

/** 앱마다 소스 루트가 src(Vite) 또는 app(Next.js)이다. */
const SOURCE_ROOT = existsSync(resolve(process.cwd(), 'src')) ? 'src' : 'app';
const STYLES_DIR = resolve(process.cwd(), SOURCE_ROOT, 'styles');
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
 * 정본은 @theme inline 으로 --radius-sm/md/lg 와 --shadow-sm/md/lg/xl 만 덮는다.
 * 덮지 않은 단계는 Tailwind 기본값이 그대로 남아 조용히 다른 값이 적용되고,
 * 이름 순서가 값 순서와 역전된다 — rounded-xl 은 Tailwind 기본 12px 인데
 * 정본 rounded-lg 는 16px 이므로 xl < lg 가 된다.
 *
 * 1회 grep 은 이후 새로 추가되는 코드를 못 잡으므로 테스트로 상주시킨다.
 */
const FORBIDDEN = /\b(?:rounded-(?:xs|xl|2xl|3xl|4xl)|shadow-(?:xs|2xl|inner))\b/;

function collectSourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return collectSourceFiles(path);
    return /\.tsx?$/.test(entry.name) ? [path] : [];
  });
}

describe('금지된 Tailwind 단계', () => {
  it('정본이 정의하지 않는 radius/shadow 유틸리티를 쓰지 않는다', () => {
    const root = resolve(process.cwd(), SOURCE_ROOT);
    const offenders = collectSourceFiles(root)
      .map((path) => ({ path, source: readFileSync(path, 'utf8') }))
      .filter(({ path, source }) => path !== __filename && FORBIDDEN.test(source))
      .map(({ path }) => path.slice(root.length + 1));

    expect(offenders).toEqual([]);
  });
});
```

- [ ] **Step 6: sign-maker 의 손으로 쓴 테스트를 삭제하고 동기화한다**

Run:
```bash
rm sign-maker/src/styles/ds-sync.test.ts && npm run tokens:sync
```
Expected: `sign-maker/src/styles/ds-sync.test.ts` 를 포함해 4건 이상 동기화 보고. 아직 마이그레이션되지 않은 세 앱의 `styles` 디렉터리에도 파일이 생성된다 — 다음 태스크에서 진입 CSS 를 연결한다.

- [ ] **Step 7: 스크립트 테스트가 통과하는 것을 확인한다**

Run: `npm run tokens:test`
Expected: PASS — 7개 테스트 통과

- [ ] **Step 8: sign-maker 가 여전히 green 인지 확인한다**

Run: `cd sign-maker && mise run check`
Expected: exit 0. 테스트 9건 유지(정본 테스트가 손으로 쓴 것과 동등하다).

- [ ] **Step 9: 커밋한다**

```bash
git add packages/design-system scripts sign-maker/src/styles \
  json-yaml-converter/src/styles ddl-seed-generator/app/styles openapi-editor/src/styles
git commit -m "refactor(design-system): promote drift test to the canonical

앱마다 손으로 쓰면 같은 코드가 복제되고 테스트 자체가 갈라진다. 정본의 네
번째 파일로 올려 동기화 대상으로 만든다.

- src(Vite) / app(Next.js) 소스 루트를 런타임에 판별해 한 파일로 양쪽을 덮는다
- 기대 개수를 Object.keys(FILES).length 로 derive 해 파일 추가에 깨지지 않게 한다
- TARGETS 에 json-yaml-converter, ddl-seed-generator, openapi-editor 추가"
```

---

### Task 2: json-yaml-converter 정본 도입

**Files:**
- Create: `json-yaml-converter/src/styles/theme.local.css`
- Delete: `json-yaml-converter/src/styles/theme.css`
- Modify: `json-yaml-converter/src/index.css`
- Modify: `json-yaml-converter/src/styles/base.css`
- Modify: `json-yaml-converter/src/styles/components.css`

**Interfaces:**
- Consumes: 정본 복사본 4개 (Task 1 Step 6 에서 이미 생성됨)
- Produces: `theme.local.css` 에 `--editor-bg`

`--control-border` 는 이 앱에서 정본으로 **승격**된 토큰이므로 이름을 바꾸지 않는다. 다크값만 `#747984` → `#8a8f99` 로 올라간다(최저 3.06:1 → 4.12:1).

**의도된 시각 변화.**

| 토큰 | 기존 | 정본 | 변화 |
|---|---|---|---|
| `--muted` 라이트 | `rgba(55,56,60,.61)` 3.66:1 | `rgba(55,56,60,.72)` | 보조 텍스트가 진해짐 (AA 통과) |
| `--muted` 다크 | `rgba(174,176,182,.61)` 3.94:1 | `rgba(174,176,182,.82)` | 진해짐 (AA 통과) |
| `--danger` 라이트 | `rgb(180,35,24)` 6.57:1 | `#d11f2e` 5.32:1 | 덜 어두운 정통 빨강으로 |
| `--danger` 다크 | `rgb(229,92,108)` | `#ff6464` | 밝아짐 |
| `--success` 라이트 | `rgb(24,121,78)` | `#18794e` | 동일(표기만) |
| `--warning` 라이트 | `rgb(161,92,0)` | `#a15c00` | 동일(표기만) |
| `--surface-2` 라이트 | `#f7f7f8` | `#f4f4f5` | 미세하게 진해짐 |
| `--control-border` 다크 | `#747984` | `#8a8f99` | 입력 테두리가 밝아짐 (3:1 여유 확보) |
| `--soft` | `.btn-ghost:disabled` 1곳 | `--disabled` | 비활성 버튼 색 변경 |
| `--dur` | `160ms` | `--ds-duration-fast` `120ms` | transition 40ms 빨라짐 |
| shadow 다크 | 오버라이드 없음 | 검정 기반 | **다크에서 그림자가 보이게 됨** |
| `--radius-lg` | `16px` | `--ds-radius-lg` `16px` | 이름만 |

- [ ] **Step 1: 의존성을 설치하고 baseline 을 확인한다**

Run: `cd json-yaml-converter && mise run install && mise run check`
Expected: exit 0. baseline 이 실패하면 진행하지 말고 보고한다.

- [ ] **Step 2: drift 테스트가 실패하는 것을 확인한다**

정본 복사본은 있지만 진입 CSS 가 아직 연결되지 않았다. 테스트는 파일 일치만 보므로 통과하고, 금지 유틸리티 스캔도 통과할 것이다. 실제 실패는 다음 스텝의 `theme.css` 삭제로 발생한다.

Run: `cd json-yaml-converter && npm run test -- src/styles/ds-sync.test.ts`
Expected: PASS — 5개 케이스 통과(정본 4파일 일치 + 금지 유틸리티 없음)

- [ ] **Step 3: `theme.local.css` 를 만든다**

Monaco 에디터 표면은 에디터 자체 테마와 맞춰야 하므로 도메인 토큰으로 남긴다.

```css
/* json-yaml-converter 고유 토큰. 정본 뒤에 로드되어 정본을 덮을 수 있다.
   여기 있는 토큰이 3개 이상 앱에서 반복되면 정본으로 승격한다. */

:root {
  /* Monaco 에디터 표면. 에디터 내부 테마와 맞춰야 하므로 --surface 와 분리한다. */
  --editor-bg: #ffffff;
}

[data-theme="dark"] {
  --editor-bg: #1e1e1e;   /* Monaco vs-dark 기본 배경 */
}
```

- [ ] **Step 4: 진입 CSS 를 교체하고 기존 `theme.css` 를 삭제한다**

`json-yaml-converter/src/index.css` 전체를 다음으로 바꾼다.

```css
/* 스타일 진입점.
   CSS 스펙상 @import 는 최상단에만 올 수 있으므로 이 파일은 import 만 담는다.
   import 순서 = 캐스케이드 순서다.

   ds-*.css 는 packages/design-system 의 생성물이다. 직접 편집하지 말고
   정본을 고친 뒤 저장소 루트에서 `npm run tokens:sync` 를 실행한다. */
@import "tailwindcss";
@import "./styles/ds-tokens.css";
@import "./styles/ds-base.css";
@import "./styles/ds-primitives.css";
@import "./styles/theme.local.css";
@import "./styles/base.css";
@import "./styles/components.css";
```

Run: `git rm json-yaml-converter/src/styles/theme.css`

- [ ] **Step 5: `base.css` 의 폰트·셸 토큰을 바꾼다**

`json-yaml-converter/src/styles/base.css`의 `body` 와 `.app-shell`·`.app-main` 세 곳을 고친다. 나머지 줄은 그대로 둔다.

```css
body { min-height: 100vh; font-family: var(--ds-font-sans); background: var(--bg); color: var(--text); }
```

`.app-shell` 은 페이지 여백을, `.app-main` 은 최대폭을 갖는다. 정본 토큰으로 옮기면 미디어 쿼리가 필요 없어진다.

```css
.app-shell { min-height: 100vh; padding: var(--ds-page-padding-mobile); }
.app-main { display: grid; gap: 20px; width: 100%; max-width: var(--ds-container-wide); margin: 0 auto; }
@media (min-width: 768px) { .app-shell { padding: var(--ds-page-padding); } }
```

모바일 여백이 16px → 12px, 최대폭이 1400px → 1600px 로 바뀐다.

- [ ] **Step 6: `components.css` 의 토큰 이름을 기계적으로 치환한다**

값이 바뀌지 않는 순수 이름 치환이다.

Run:
```bash
cd json-yaml-converter && sed -i '' \
  -e 's/var(--radius-/var(--ds-radius-/g' \
  -e 's/var(--shadow-/var(--ds-shadow-/g' \
  -e 's/var(--dur)/var(--ds-duration-fast)/g' \
  -e 's/var(--ease)/var(--ds-ease-standard)/g' \
  src/styles/components.css
```

- [ ] **Step 7: 치환 결과를 확인한다**

Run: `cd json-yaml-converter && grep -nE "var\(--(radius|shadow|dur|ease)[-)]" src/styles/components.css`
Expected: 출력 없음

Run: `cd json-yaml-converter && grep -c "var(--ds-" src/styles/components.css`
Expected: `17` 이상

- [ ] **Step 8: `--soft` 사용처를 `--disabled` 로 옮긴다**

`--soft` 는 정본에서 폐기됐다. `components.css` 29행의 고스트 버튼 비활성 색을 고친다.

```css
.btn-ghost:disabled, .btn-ghost:disabled:hover { color: var(--disabled); background: transparent; border-color: transparent; }
```

- [ ] **Step 9: 전체 검증을 실행한다**

Run: `cd json-yaml-converter && mise run check`
Expected: test·lint·typecheck·build·e2e 전부 exit 0

- [ ] **Step 10: 산출 CSS 에 토큰과 클래스가 살아 있는지 확인한다**

Run: `cd json-yaml-converter && grep -o -- "--ds-radius-md:[^;]*" dist/assets/*.css | head -1`
Expected: `--ds-radius-md:12px`

Run:
```bash
cd json-yaml-converter && for c in studio-topbar converter-workspace editor-panel direction-selector copy-success-toast btn; do printf '%-22s %s\n' "$c" "$(grep -qo "\.$c" dist/assets/*.css && echo 있음 || echo '** 사라짐 **')"; done
```
Expected: 6개 전부 "있음"

Run: `cd json-yaml-converter && grep -o -- "--editor-bg:[^;]*" dist/assets/*.css`
Expected: 라이트 `#ffffff` 와 다크 `#1e1e1e` 두 건

- [ ] **Step 11: 커밋한다**

```bash
git add json-yaml-converter/src
git commit -m "refactor(json-yaml-converter): consume canonical design system

- theme.css 를 정본 복사본으로 교체, --editor-bg 만 theme.local.css 로
- 토큰 이름을 --ds- 접두사로 치환 (값 변화 없음)
- --soft 폐기에 따라 .btn-ghost:disabled 를 --disabled 로
- .app-shell/.app-main 을 정본 여백·컨테이너 토큰으로

정본이 가져오는 의도된 시각 변화:
- --muted 3.66:1 -> AA 통과, --control-border 다크 3.06:1 -> 4.12:1
- 다크 shadow 오버라이드 추가, transition 160ms -> 120ms
- 모바일 여백 16px -> 12px, 최대폭 1400px -> 1600px"
```

---

### Task 3: json-yaml-converter 프리미티브와 셸 계약

**Files:**
- Create: `json-yaml-converter/src/constants.ts`
- Modify: `json-yaml-converter/src/components/layout/Header.tsx`
- Modify: `json-yaml-converter/src/components/ui/Button.tsx`
- Modify: `json-yaml-converter/src/styles/components.css`
- Modify: `json-yaml-converter/src/App.test.tsx`

**Interfaces:**
- Consumes: `.ds-icon-btn`·`.ds-card` (정본), `TOOL_HUB_URL`
- Produces: `TOOL_HUB_URL` 상수. Task 5·7 이 같은 값을 쓴다.

이 앱의 `Button.tsx` 는 이미 `btn btn-${variant}` 를 감싸는 얇은 컴포넌트다(정본 규칙 5 패턴). `variant="icon"` 만 정본 프리미티브로 바꾼다.

- [ ] **Step 1: 허브 링크를 단정하는 실패 테스트를 작성한다**

`json-yaml-converter/src/App.test.tsx` 의 최상위 `describe` 안에 추가한다.

```tsx
  it('브랜드 블록이 Tool Hub 로 돌아가는 링크다', () => {
    render(<App />);

    const hubLink = screen.getByRole('link', { name: /Tool Hub/ });
    expect(hubLink).toHaveAttribute('href', 'https://tool-hub-rho.vercel.app/');
  });
```

- [ ] **Step 2: 테스트가 실패하는 것을 확인한다**

Run: `cd json-yaml-converter && npm run test -- src/App.test.tsx`
Expected: FAIL — `Unable to find an accessible element with the role "link"`

- [ ] **Step 3: 상수를 만든다**

`json-yaml-converter/src/constants.ts`:

```ts
/**
 * Tool Hub 랜딩. 모든 도구의 헤더 브랜드 블록이 여기로 돌아간다.
 * 도구들이 각각 다른 Vercel 도메인에 배포되므로 절대 URL 이어야 한다.
 */
export const TOOL_HUB_URL = 'https://tool-hub-rho.vercel.app/';
```

- [ ] **Step 4: 브랜드 블록을 허브 링크로 감싸고 타이포를 정본 유틸리티로 바꾼다**

`Header.tsx` 의 `import` 에 상수를 추가한다.

```tsx
import { TOOL_HUB_URL } from '../../constants';
```

`.studio-brand` 블록을 링크로 감싼다. 마크와 텍스트의 마크업은 유지한다.

```tsx
      <a href={TOOL_HUB_URL} className="studio-brand" aria-label="Tool Hub 로 이동">
        <span className="studio-brand__mark" data-testid="converter-app-mark" aria-hidden="true">
          <Braces size={18} />
        </span>
        <div>
          <h1 className="app-title">JSON YAML Converter</h1>
          <p className="privacy-note">입력 내용은 브라우저에서만 처리됩니다.</p>
        </div>
      </a>
```

기존 `<div className="studio-brand">` 를 `<a>` 로 바꾸는 것이므로 `.studio-brand` 의 기존 스타일이 그대로 적용된다. `components.css` 의 `.studio-brand` 규칙(2행)에 `text-decoration: none;` 과 `color: inherit;` 을 추가한다.

**타이포에 Tailwind 유틸리티(`text-title`·`text-caption`)를 쓰지 않는다.** `.app-title` 이 `font-size` 를 직접 지정하고 있고, Tailwind v4 는 유틸리티를 `@layer utilities` 에 넣는다. CSS 캐스케이드 레이어 규칙상 **레이어 밖 스타일이 레이어된 스타일을 이기므로** 유틸리티가 조용히 무시된다. 세 앱 모두 CSS 에서 토큰을 직접 쓴다.

- [ ] **Step 4b: 브랜드 타이포를 정본 스케일로 바꾼다**

`components.css` 4행과 5행을 정본 토큰으로 바꾼다.

```css
.app-title { margin: 0; color: var(--text); font-size: var(--ds-font-size-title); line-height: var(--ds-line-height-title); letter-spacing: var(--ds-tracking-title); font-weight: 700; }
.privacy-note { margin: 3px 0 0; color: var(--muted); font-size: var(--ds-font-size-caption); line-height: var(--ds-line-height-caption); }
```

`h1` 은 20px 그대로이고 자간만 `-0.01em` 이 붙는다. 설명문은 13px → 12px 로 줄어든다 — 정본 스케일에 13px 단계가 없고 이 문구는 보조 안내이므로 caption 이 맞다.

- [ ] **Step 5: 테마 토글을 정본 프리미티브로 바꾼다**

`Header.tsx` 의 토글에서 `Button` 컴포넌트 대신 정본 클래스를 직접 쓴다. `variant="icon"` 은 이 앱의 `.btn-icon` 을 참조하는데 정본 `.ds-icon-btn` 이 대체한다.

```tsx
      <button className="ds-icon-btn theme-button" type="button" aria-label="테마 전환" onClick={onToggleTheme}>
        {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
      </button>
```

- [ ] **Step 6: `components.css` 에서 정본과 중복되는 정의를 제거한다**

`.btn-icon` 은 `.ds-icon-btn` 이 대체한다. `components.css` 26행과 30행에서 `.btn-icon` 관련 선언을 삭제한다.

삭제 1 — 26행:

```css
.btn-icon { display: inline-grid; place-items: center; width: 36px; min-width: 36px; height: 36px; padding: 0; }
```

삭제 2 — 30행의 `[data-copied]` 선택자는 복사 버튼 상태이므로 `.ds-icon-btn` 으로 바꿔 유지한다.

```css
.ds-icon-btn[data-copied="true"], .ds-icon-btn[data-copied="true"]:hover { color: var(--success); background: var(--success-surface); border-color: var(--success); }
```

삭제 3 — 31행의 포커스링에서 `.btn:focus-visible` 을 제거한다. 정본 `ds-base.css` 의 전역 규칙이 담당한다. 나머지 선택자는 `button` 이 아닌 요소를 포함하므로 남긴다.

```css
.direction-selector__option:focus-visible, .mobile-tabs button:focus-visible, .diagnostic-banner button:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; }
```

- [ ] **Step 7: `theme-button` 의 중복 선언을 정리한다**

`components.css` 6행의 `.theme-button` 은 배경·테두리를 직접 지정해 정본과 충돌한다. 위치 지정만 남긴다.

```css
.theme-button { flex: 0 0 auto; }
```

- [ ] **Step 8: 잔존 참조를 확인한다**

Run: `cd json-yaml-converter && grep -rn "btn-icon" src/ | grep -v "ds-icon-btn"`
Expected: 출력 없음

Run: `cd json-yaml-converter && grep -rnE "variant=\"icon\"" src/`
Expected: 출력 없음

`Button.tsx` 의 `variant` 유니온에서 `'icon'` 을 제거한다.

```tsx
  variant?: 'primary' | 'secondary' | 'ghost';
```

- [ ] **Step 9: 전체 검증을 실행한다**

Run: `cd json-yaml-converter && mise run check`
Expected: test·lint·typecheck·build·e2e 전부 exit 0

- [ ] **Step 10: 커밋한다**

```bash
git add json-yaml-converter/src
git commit -m "feat(json-yaml-converter): apply shell contract and primitives

- 브랜드 블록을 Tool Hub 허브 링크로 (도구 앱에 없던 복귀 경로)
- 테마 토글과 복사 버튼을 .ds-icon-btn 으로
- 타이포를 정본 유틸리티로: text-title / text-caption
- 정본과 중복되는 .btn-icon, .btn:focus-visible, .theme-button 배경 제거
- Button 의 variant 유니온에서 icon 제거 (정본 클래스가 대체)"
```

---

### Task 4: ddl-seed-generator 정본 도입

**Files:**
- Create: `ddl-seed-generator/app/styles/theme.local.css`
- Delete: `ddl-seed-generator/app/styles/theme.css`
- Modify: `ddl-seed-generator/app/globals.css`
- Modify: `ddl-seed-generator/app/styles/base.css`
- Modify: `ddl-seed-generator/app/styles/components.css`

**Interfaces:**
- Consumes: 정본 복사본 4개 (Task 1 Step 6)
- Produces: `theme.local.css` 에 `--code`·`--code-line`·`--code-text`

이 앱은 `components.css` 가 469줄로 가장 크지만 토큰이 대부분 이미 있어 치환량은 적다(`--ease-standard` 12곳, `--ease-emphasized` 1곳, `--shadow-lg` 1곳). 대신 하드코딩된 값이 많다 — radius 18곳(4종), transition duration 13곳(4종).

**의미가 바뀌는 토큰 3개.** 단순 이름 치환이 아니므로 개별 스텝으로 다룬다.

| 기존 | 사용 | 이전 | 이유 |
|---|---|---|---|
| `--surface-3` | 3곳 | `--primary-surface` | ddl 의 `--surface-3` 은 값이 `rgb(234,242,254)` 로 `--primary-surface` 와 **완전히 동일**했다. 정본 `--surface-3` 은 중립 `#ececee` 이므로 그대로 두면 파란 틴트가 회색으로 바뀐다 |
| `--positive` | 1곳 | `--success` | 색 이름 → 의미 이름 |
| `--warn` / `--warn-fg` | 8곳 | `--warning` / `--warning-surface` | `--warn` 은 밝은 앰버 틴트용, `--warn-fg` 는 텍스트용으로 분리돼 있었다. 정본은 텍스트용 `--warning`(5.19:1)과 틴트용 `--warning-surface` 를 함께 제공한다 |

**의도된 시각 변화.**

| 토큰 | 기존 | 정본 | 변화 |
|---|---|---|---|
| `--muted` 라이트 | `rgba(55,56,60,.61)` 3.66:1 | `rgba(55,56,60,.72)` | 보조 텍스트가 진해짐 (AA 통과) |
| `--danger` 라이트 | `rgb(255,66,66)` **3.44:1** | `#d11f2e` 5.32:1 | 진해짐. 기존 값은 텍스트로 쓸 수 없었다 |
| `--warn` 틴트 | `rgb(255,146,0)` 밝은 앰버 | `--warning-surface` | 경고 배경이 차분한 톤으로 |
| `--surface-2` 라이트 | `#ffffff` | `#f4f4f5` | **입력 배경이 흰색에서 회색으로** |
| `--soft` | `.emptyState svg` 1곳 | `--muted` | 빈 상태 아이콘이 진해짐 |
| 하드코딩 radius | 8·10·12·16px | 8·12·12·16px | 10px → 12px |
| 하드코딩 duration | 0.12·0.14·0.16·0.7s | 토큰 3단 | 0.14s·0.16s → 120ms 또는 180ms |

`--surface-2` 변화가 가장 눈에 띈다. 흰 카드 위 흰 입력이 회색 함몰 표면으로 바뀐다. 정본은 `--control-border`(3:1)를 함께 제공하므로 흰 입력을 유지하려면 `theme.local.css` 에서 `--surface-2: #ffffff` 로 덮고 테두리를 `--control-border` 로 두는 선택도 가능하다. 이 태스크에서는 **정본 값을 따르고**, 육안 확인에서 어색하면 별도로 판단한다.

- [ ] **Step 1: 의존성을 설치하고 baseline 을 확인한다**

Run: `cd ddl-seed-generator && mise run install && mise run check`
Expected: exit 0

- [ ] **Step 2: `theme.local.css` 를 만든다**

코드 표면은 인버스 뉴트럴이며 라이트·다크 양쪽에서 어둡게 유지되어야 하므로 도메인 토큰이다.

```css
/* ddl-seed-generator 고유 토큰. 정본 뒤에 로드되어 정본을 덮을 수 있다.
   여기 있는 토큰이 3개 이상 앱에서 반복되면 정본으로 승격한다. */

:root {
  /* 생성된 SQL 코드 표면. 라이트에서도 어두운 인버스 뉴트럴을 유지한다. */
  --code: rgb(27, 28, 30);
  --code-line: rgb(55, 56, 60);
  --code-text: rgb(232, 233, 236);
}

[data-theme="dark"] {
  --code: rgb(20, 20, 21);
  --code-line: rgb(46, 47, 51);
  --code-text: rgb(228, 229, 232);
}
```

- [ ] **Step 3: 진입 CSS 를 교체하고 기존 `theme.css` 를 삭제한다**

`ddl-seed-generator/app/globals.css` 전체를 다음으로 바꾼다.

```css
/* 스타일 진입점.
   CSS 스펙상 @import 는 최상단에만 올 수 있으므로 이 파일은 import 만 담는다.
   import 순서 = 캐스케이드 순서다.

   ds-*.css 는 packages/design-system 의 생성물이다. 직접 편집하지 말고
   정본을 고친 뒤 저장소 루트에서 `npm run tokens:sync` 를 실행한다. */
@import "tailwindcss";
@import "./styles/ds-tokens.css";
@import "./styles/ds-base.css";
@import "./styles/ds-primitives.css";
@import "./styles/theme.local.css";
@import "./styles/base.css";
@import "./styles/components.css";
```

Run: `git rm ddl-seed-generator/app/styles/theme.css`

- [ ] **Step 4: `base.css` 의 폰트를 토큰으로 바꾸고 중복 규칙을 제거한다**

`body` 의 하드코딩된 폰트 스택을 토큰으로 바꾼다.

```css
body {
  min-height: 100vh;
  background-color: var(--bg);
  color: var(--text);
  font-family: var(--ds-font-sans);
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}
```

그리고 파일 끝의 포커스링 블록을 **삭제**한다. 정본 `ds-base.css` 의 전역 규칙이 대체한다.

```css
/* 포커스 — 2px primary 아웃라인 + 2px 오프셋 */
:where(button, a, input, textarea, select, [tabindex]):focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
  border-radius: 8px;
}
```

정본 규칙에는 `border-radius` 가 없어 포커스 아웃라인 모서리가 각지게 바뀐다. 의도된 변화다 — 아웃라인 모서리는 요소의 radius 를 따르는 게 자연스럽고, 8px 고정은 12px radius 컨트롤과 어긋났다.

- [ ] **Step 5: `components.css` 의 `prefers-reduced-motion` 중복을 제거한다**

정본 `ds-base.css` 가 더 강한 규칙(`--ds-duration-*` 토큰까지 0으로 덮음)을 제공한다. `components.css` 463~469행의 블록을 **삭제**한다.

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.001ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.001ms !important;
  }
}
```

이 블록의 `0.001ms` 는 Step 10 의 duration 치환 대상이 아니다. 블록 자체가 사라지므로 순서 문제도 없다.

- [ ] **Step 6: 이름만 바뀌는 토큰을 기계적으로 치환한다**

Run:
```bash
cd ddl-seed-generator && sed -i '' \
  -e 's/var(--shadow-/var(--ds-shadow-/g' \
  -e 's/var(--ease-standard)/var(--ds-ease-standard)/g' \
  -e 's/var(--ease-emphasized)/var(--ds-ease-emphasized)/g' \
  app/styles/components.css
```

- [ ] **Step 7: 의미가 바뀌는 토큰 3개를 옮긴다**

`--surface-3` 3곳을 `--primary-surface` 로 바꾼다. 기존 값이 primary 틴트와 동일했으므로 이 이전이 외관을 보존한다.

Run:
```bash
cd ddl-seed-generator && sed -i '' 's/var(--surface-3)/var(--primary-surface)/g' app/styles/components.css
```

`--positive` 를 `--success` 로 바꾼다.

Run:
```bash
cd ddl-seed-generator && sed -i '' 's/var(--positive)/var(--success)/g' app/styles/components.css
```

`--warn-fg` 는 텍스트용이므로 `--warning` 으로, `color-mix(in srgb, var(--warn), transparent 90%)` 배경은 `--warning-surface` 로, `color-mix(... transparent 72%)` 테두리는 `--warning` 으로 바꾼다.

Run:
```bash
cd ddl-seed-generator && sed -i '' \
  -e 's/var(--warn-fg)/var(--warning)/g' \
  -e 's/color-mix(in srgb, var(--warn), transparent 90%)/var(--warning-surface)/g' \
  -e 's/color-mix(in srgb, var(--warn), transparent 72%)/color-mix(in srgb, var(--warning), transparent 72%)/g' \
  -e 's/var(--warn)/var(--warning)/g' \
  app/styles/components.css
```

마지막 `--warn` → `--warning` 치환은 `.warningList svg` 의 아이콘 색을 덮는다. 앞선 세 치환이 먼저 적용되므로 순서가 중요하다.

- [ ] **Step 8: 폐기된 `--soft` 를 옮긴다**

`components.css` 441행의 빈 상태 아이콘 색을 고친다.

```css
.emptyState svg { color: var(--muted); }
```

- [ ] **Step 9: 하드코딩된 radius 를 정본 스케일로 흡수한다**

Run:
```bash
cd ddl-seed-generator && sed -i '' \
  -e 's/border-radius: 8px/border-radius: var(--ds-radius-sm)/g' \
  -e 's/border-radius: 10px/border-radius: var(--ds-radius-md)/g' \
  -e 's/border-radius: 12px/border-radius: var(--ds-radius-md)/g' \
  -e 's/border-radius: 16px/border-radius: var(--ds-radius-lg)/g' \
  app/styles/components.css
```

10px 이 12px 로 올라가는 유일한 값 변화다.

- [ ] **Step 10: 하드코딩된 transition duration 을 토큰으로 흡수한다**

Run:
```bash
cd ddl-seed-generator && sed -i '' \
  -e 's/0\.12s/var(--ds-duration-fast)/g' \
  -e 's/0\.14s/var(--ds-duration-fast)/g' \
  -e 's/0\.16s/var(--ds-duration-fast)/g' \
  app/styles/components.css
```

`0.7s` 는 애니메이션 keyframe 재생 시간이라 transition 토큰과 성격이 다르므로 그대로 둔다.

- [ ] **Step 11: 잔존 참조를 확인한다**

Run:
```bash
cd ddl-seed-generator && grep -nE "var\(--(shadow|ease|surface-3|positive|warn|soft)[-)]" app/styles/components.css
```
Expected: 출력 없음

Run:
```bash
cd ddl-seed-generator && grep -nE "border-radius: [0-9]+px|[0-9]+\.1[246]s" app/styles/components.css
```
Expected: 출력 없음

- [ ] **Step 12: 전체 검증을 실행한다**

Run: `cd ddl-seed-generator && mise run check`
Expected: test·lint·typecheck·build 전부 exit 0

- [ ] **Step 13: 커밋한다**

```bash
git add ddl-seed-generator/app
git commit -m "refactor(ddl-seed-generator): consume canonical design system

- theme.css 를 정본 복사본으로 교체, --code* 만 theme.local.css 로
- --surface-3 3곳을 --primary-surface 로 (기존 값이 primary 틴트와 동일했다)
- --positive -> --success, --warn/--warn-fg -> --warning/--warning-surface
- --soft 폐기에 따라 .emptyState svg 를 --muted 로
- 하드코딩 radius 18곳과 transition duration 12곳을 정본 토큰으로
- base.css 의 포커스링과 components.css 의 prefers-reduced-motion 중복 제거

정본이 가져오는 의도된 시각 변화:
- --danger 3.44:1 -> 5.32:1 (기존 값은 텍스트로 쓸 수 없었다)
- --muted AA 통과, --surface-2 흰색 -> 회색 함몰, radius 10px -> 12px"
```

---

### Task 5: ddl-seed-generator 프리미티브와 셸 계약

**Files:**
- Create: `ddl-seed-generator/app/_lib/constants.ts`
- Modify: `ddl-seed-generator/app/_components/Topbar.tsx`
- Modify: `ddl-seed-generator/app/styles/components.css`

**Interfaces:**
- Consumes: `.ds-icon-btn`·`.ds-card`·`--ds-container-wide` (정본)
- Produces: `TOOL_HUB_URL` 상수

이 앱은 Next.js 이므로 상수를 `app/_lib/` 에 둔다(`docs/frontend-conventions.md` 의 Next.js 디렉터리 구조).

- [ ] **Step 1: 상수를 만든다**

`ddl-seed-generator/app/_lib/constants.ts`:

```ts
/**
 * Tool Hub 랜딩. 모든 도구의 헤더 브랜드 블록이 여기로 돌아간다.
 * 도구들이 각각 다른 Vercel 도메인에 배포되므로 절대 URL 이어야 한다.
 */
export const TOOL_HUB_URL = "https://tool-hub-rho.vercel.app/";
```

- [ ] **Step 2: 브랜드 블록을 허브 링크로 감싼다**

`Topbar.tsx` 의 `import` 에 추가한다.

```tsx
import { TOOL_HUB_URL } from "@/app/_lib/constants";
```

`.brandBlock` 을 링크로 바꾼다. 마크업 구조는 유지한다.

```tsx
      <a href={TOOL_HUB_URL} className="brandBlock" aria-label="Tool Hub 로 이동">
        <div className="brandIcon" aria-hidden="true">
          <Database size={22} />
        </div>
        <div>
          <h1>DDL Seed Generator</h1>
          <p>DDL에서 관계를 읽고 realistic seed SQL을 생성합니다.</p>
        </div>
      </a>
```

`components.css` 의 `.brandBlock` 규칙에 `text-decoration: none; color: inherit;` 을 추가한다.

- [ ] **Step 2b: 브랜드 타이포를 정본 스케일로 바꾼다**

`components.css` 36~41행의 `h1` 과 44~49행의 설명문을 정본 토큰으로 바꾼다. 유동 크기(`clamp`)를 고정 20px 로 바꾸는 것이 헤더 슬롯 계약이다.

```css
h1 {
  font-size: var(--ds-font-size-title);
  line-height: var(--ds-line-height-title);
  letter-spacing: var(--ds-tracking-title);
  font-weight: 700;
}
```

```css
.brandBlock p, .panelHead p {
  margin-top: 4px;
  color: var(--muted);
  font-size: var(--ds-font-size-body);
  line-height: var(--ds-line-height-body);
}
```

`h1` 최대 크기가 `1.85rem`(29.6px)에서 `1.25rem`(20px)으로 줄고, 설명문이 `0.9rem`(14.4px)에서 `0.875rem`(14px)으로 미세하게 줄어든다. `h2`(1.0625rem)는 패널 제목이므로 이 계획서 범위 밖이다.

- [ ] **Step 3: 테마 토글을 정본 프리미티브로 바꾼다**

`Topbar.tsx` 의 `className="themeBtn"` 을 `className="ds-icon-btn"` 으로 바꾼다. `themeIconPlaceholder` 는 하이드레이션 대응이므로 유지한다.

```tsx
        <button className="ds-icon-btn" type="button" onClick={onToggleTheme} aria-label="테마 전환">
```

- [ ] **Step 4: `components.css` 에서 `.themeBtn` 정의를 삭제한다**

95~107행의 `.themeBtn` 과 `.themeBtn:hover` 블록을 삭제한다. `.ds-icon-btn` 이 대체한다. 40px → 36px 로 작아진다.

`.themeIconPlaceholder` 는 남긴다 — 정본 `.ds-icon-btn > svg` 가 SVG 만 다루고 이 요소는 `<span>` 이다.

- [ ] **Step 5: 컨테이너 폭을 토큰으로 옮긴다**

`components.css` 8행과 116행의 `max-width: 1480px` 두 곳을 바꾼다.

```css
  max-width: var(--ds-container-wide);
```

1480px → 1600px 로 넓어진다.

- [ ] **Step 6: 잔존 참조를 확인한다**

Run: `cd ddl-seed-generator && grep -rn "themeBtn" app/ | grep -v themeIconPlaceholder`
Expected: 출력 없음

Run: `cd ddl-seed-generator && grep -rn "1480px" app/`
Expected: 출력 없음

- [ ] **Step 7: 전체 검증을 실행한다**

Run: `cd ddl-seed-generator && mise run check`
Expected: test·lint·typecheck·build 전부 exit 0

- [ ] **Step 8: 산출 CSS 에 컨테이너 토큰이 반영됐는지 확인한다**

Next.js 는 `.next/static/css/` 에 CSS 를 낸다.

Run: `cd ddl-seed-generator && grep -ro "max-width:var(--ds-container-wide)" .next/static/css/ | head -1`
Expected: 한 건 이상 출력

Run: `cd ddl-seed-generator && grep -ro -- "--ds-container-wide:1600px" .next/static/css/ | head -1`
Expected: 한 건 출력

- [ ] **Step 9: 커밋한다**

```bash
git add ddl-seed-generator/app
git commit -m "feat(ddl-seed-generator): apply shell contract and primitives

- 브랜드 블록을 Tool Hub 허브 링크로 (도구 앱에 없던 복귀 경로)
- 테마 토글을 .ds-icon-btn 으로 (40px -> 36px)
- 컨테이너를 --ds-container-wide 로 (1480px -> 1600px)
- 정본과 중복되는 .themeBtn 정의 제거"
```

---

### Task 6: openapi-editor 폰트 자산과 정본 도입

**Files:**
- Create: `openapi-editor/public/fonts/toolhub-sans.woff2` (복사)
- Create: `openapi-editor/src/styles/theme.local.css`
- Delete: `openapi-editor/src/styles/theme.css`
- Modify: `openapi-editor/src/index.css`
- Modify: `openapi-editor/src/styles/base.css`
- Modify: `openapi-editor/src/styles/components.css`

**Interfaces:**
- Consumes: 정본 복사본 4개 (Task 1 Step 6)
- Produces: `theme.local.css` 에 `--code`·`--caution`

이 앱은 **`@font-face` 가 없고 폰트 파일도 없다**. `base.css` 가 `"ToolHub Sans"` 를 이름으로 참조하지만 로드되지 않아 시스템 폰트로 폴백하고 있었다. 정본이 `@font-face` 를 제공하므로 자산만 넣으면 나머지 7개 앱과 같은 폰트가 적용된다 — **이 앱에서 가장 눈에 띄는 변화다.**

radius·shadow·motion 토큰도 전혀 없어 하드코딩된 값 19곳(radius 8종)과 `.16s`(3곳)을 흡수해야 한다.

**의미가 바뀌는 토큰.**

| 기존 | 사용 | 이전 | 이유 |
|---|---|---|---|
| `--green` | 1곳 | `--success` | 색 이름 → 의미 이름 |
| `--yellow` | 4곳 | `--warning` | 색 이름 → 의미 이름 |
| `--coral` | 4곳 | `theme.local.css` 의 `--caution` | `--yellow` 가 이미 `--warning` 을 차지한다. 이 앱은 경고 단계가 둘이다 |
| `--code` | 1곳 | `theme.local.css` | 코드 표면은 도메인 고유 |
| `--soft` | 2곳 | `--muted` | 정본에서 폐기 |

- [ ] **Step 1: 의존성을 설치하고 baseline 을 확인한다**

Run: `cd openapi-editor && mise run install && mise run check`
Expected: exit 0

- [ ] **Step 2: 폰트 자산을 복사한다**

다른 앱과 동일한 파일을 쓴다.

Run:
```bash
mkdir -p openapi-editor/public/fonts && cp sign-maker/public/fonts/toolhub-sans.woff2 openapi-editor/public/fonts/
```

Run: `cmp sign-maker/public/fonts/toolhub-sans.woff2 openapi-editor/public/fonts/toolhub-sans.woff2 && echo 동일`
Expected: `동일`

- [ ] **Step 3: `theme.local.css` 를 만든다**

```css
/* openapi-editor 고유 토큰. 정본 뒤에 로드되어 정본을 덮을 수 있다.
   여기 있는 토큰이 3개 이상 앱에서 반복되면 정본으로 승격한다. */

:root {
  /* 코드 표면 */
  --code: #171717;

  /* 경고 2단계. 정본 --warning 은 변환 검토 배너에 쓰이므로
     진단 목록과 stale 배지의 중간 심각도는 별도 색을 유지한다. */
  --caution: #c2410c;
}

[data-theme="dark"] {
  --code: #0f1010;
  --caution: #ff8a5c;
}
```

- [ ] **Step 4: 진입 CSS 를 교체하고 기존 `theme.css` 를 삭제한다**

`openapi-editor/src/index.css` 전체를 다음으로 바꾼다.

```css
/* 스타일 진입점.
   CSS 스펙상 @import 는 최상단에만 올 수 있으므로 이 파일은 import 만 담는다.
   import 순서 = 캐스케이드 순서다.

   ds-*.css 는 packages/design-system 의 생성물이다. 직접 편집하지 말고
   정본을 고친 뒤 저장소 루트에서 `npm run tokens:sync` 를 실행한다. */
@import "tailwindcss";
@import "./styles/ds-tokens.css";
@import "./styles/ds-base.css";
@import "./styles/ds-primitives.css";
@import "./styles/theme.local.css";
@import "./styles/base.css";
@import "./styles/components.css";
```

Run: `git rm openapi-editor/src/styles/theme.css`

- [ ] **Step 5: `base.css` 의 폰트를 토큰으로 바꾸고 중복 규칙을 제거한다**

`body` 의 하드코딩된 폰트 스택을 토큰으로 바꾼다. 이제 실제로 ToolHub Sans 가 로드된다.

```css
body { min-width: 320px; min-height: 100vh; background: var(--bg); color: var(--text); font-family: var(--ds-font-sans); -webkit-font-smoothing: antialiased; }
```

그리고 두 줄을 **삭제**한다. 정본 `ds-base.css` 가 대체한다.

```css
:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; border-radius: 4px; }
@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; } }
```

- [ ] **Step 6: 의미가 바뀌는 토큰을 옮긴다**

Run:
```bash
cd openapi-editor && sed -i '' \
  -e 's/var(--green)/var(--success)/g' \
  -e 's/var(--yellow)/var(--warning)/g' \
  -e 's/var(--coral)/var(--caution)/g' \
  -e 's/var(--soft)/var(--muted)/g' \
  src/styles/components.css
```

- [ ] **Step 7: 하드코딩된 radius 를 정본 스케일로 흡수한다**

8종(4·6·7·9·10·11·12·14px)을 3단으로 모은다. 6px 이하는 작은 내부 요소이므로 `--ds-radius-sm`(8px), 9~12px 은 컨트롤이므로 `--ds-radius-md`(12px), 14px 이상은 카드이므로 `--ds-radius-lg`(16px) 로 간다.

Run:
```bash
cd openapi-editor && sed -i '' \
  -e 's/border-radius: 4px/border-radius: var(--ds-radius-sm)/g' \
  -e 's/border-radius: 6px/border-radius: var(--ds-radius-sm)/g' \
  -e 's/border-radius: 7px/border-radius: var(--ds-radius-sm)/g' \
  -e 's/border-radius: 9px/border-radius: var(--ds-radius-md)/g' \
  -e 's/border-radius: 10px/border-radius: var(--ds-radius-md)/g' \
  -e 's/border-radius: 11px/border-radius: var(--ds-radius-md)/g' \
  -e 's/border-radius: 12px/border-radius: var(--ds-radius-md)/g' \
  -e 's/border-radius: 14px/border-radius: var(--ds-radius-lg)/g' \
  src/styles/components.css
```

`border-radius: 50%` 는 원형 상태 점이므로 그대로 둔다.

- [ ] **Step 8: 하드코딩된 transition 과 shadow 를 토큰으로 흡수한다**

Run:
```bash
cd openapi-editor && sed -i '' \
  -e 's/transition: background \.16s, border-color \.16s, color \.16s/transition: background var(--ds-duration-fast) var(--ds-ease-standard), border-color var(--ds-duration-fast) var(--ds-ease-standard), color var(--ds-duration-fast) var(--ds-ease-standard)/g' \
  -e 's/box-shadow: 0 12px 28px rgb(15 23 42 \/ 14%)/box-shadow: var(--ds-shadow-xl)/g' \
  -e 's/box-shadow: 0 1px 2px rgb(0 0 0 \/ 8%)/box-shadow: var(--ds-shadow-sm)/g' \
  src/styles/components.css
```

팝오버 그림자가 slate 색조(`rgb(15 23 42)`)에서 중립으로 교정된다.

- [ ] **Step 9: 잔존 참조를 확인한다**

Run:
```bash
cd openapi-editor && grep -nE "var\(--(green|yellow|coral|soft)\)" src/styles/components.css
```
Expected: 출력 없음

Run:
```bash
cd openapi-editor && grep -nE "border-radius: [0-9]+px" src/styles/components.css
```
Expected: 출력 없음

Run:
```bash
cd openapi-editor && grep -n "\.16s\|rgb(15 23 42" src/styles/components.css
```
Expected: 출력 없음

- [ ] **Step 10: 전체 검증을 실행한다**

E2E 가 2행 헤더의 수직 분리와 36px 컨트롤 높이를 단정한다. radius·폰트 변경이 높이에 영향을 주지 않는지 여기서 드러난다.

Run: `cd openapi-editor && mise run check`
Expected: test·lint·typecheck·build·e2e 전부 exit 0

E2E 의 36px 단정이 깨지면 폰트 변경으로 라인 높이가 바뀐 것이다. 컨트롤에 `line-height: 1` 이 있는지 확인하고, 없으면 추가한다 — 높이를 폰트에 의존시키지 않는 게 정본 계약(36px 고정)에 맞다.

- [ ] **Step 11: 폰트가 실제로 로드되는지 확인한다**

Run: `cd openapi-editor && grep -o "toolhub-sans[^)\"]*" dist/assets/*.css | head -1`
Expected: 폰트 URL 출력

Run: `cd openapi-editor && ls dist/fonts/toolhub-sans.woff2 || ls dist/assets/*.woff2`
Expected: 빌드 산출물에 폰트 파일 존재

- [ ] **Step 12: 커밋한다**

```bash
git add openapi-editor/public openapi-editor/src
git commit -m "refactor(openapi-editor): consume canonical design system

- 폰트 자산 추가. base.css 가 ToolHub Sans 를 이름으로만 참조하고 @font-face
  도 파일도 없어 시스템 폰트로 폴백하고 있었다
- theme.css 를 정본 복사본으로 교체, --code 와 --caution 을 theme.local.css 로
- --green -> --success, --yellow -> --warning, --coral -> --caution (경고 2단계)
- --soft 폐기에 따라 2곳을 --muted 로
- 하드코딩 radius 19곳(8종)을 정본 3단으로, .16s transition 과 팝오버 그림자를
  토큰으로. 팝오버 그림자의 slate 색조를 중립으로 교정
- base.css 의 포커스링과 prefers-reduced-motion 중복 제거"
```

---

### Task 7: openapi-editor 프리미티브와 셸 계약

**Files:**
- Create: `openapi-editor/src/constants.ts`
- Modify: `openapi-editor/src/components/layout/Topbar.tsx`
- Modify: `openapi-editor/src/components/common/UtilityMenu.tsx`
- Modify: `openapi-editor/src/styles/components.css`
- Modify: `openapi-editor/src/App.test.tsx`

**Interfaces:**
- Consumes: `.ds-icon-btn`·`--ds-container-wide`·`--ds-z-dropdown`·`--ds-shadow-xl` (정본)
- Produces: `TOOL_HUB_URL` 상수

**2행 헤더 구조를 보존한다.** `docs/superpowers/plans/2026-07-23-openapi-editor-header-layout.md` 가 정의하고 E2E 가 강제한다 — `aria-label="핵심 작업"` 과 `"보조 작업"` 의 수직 분리, 모든 컨트롤 36px. 정본 계약에서 **유틸리티 슬롯은 1행의 끝**이며 2행은 페이지 액션의 연장이다. 현재 구조가 이미 그렇다.

- [ ] **Step 1: 허브 링크를 단정하는 실패 테스트를 작성한다**

`openapi-editor/src/App.test.tsx` 의 최상위 `describe` 안에 추가한다.

```tsx
  it('브랜드 블록이 Tool Hub 로 돌아가는 링크다', () => {
    render(<App />);

    const hubLink = screen.getByRole('link', { name: /Tool Hub/ });
    expect(hubLink).toHaveAttribute('href', 'https://tool-hub-rho.vercel.app/');
  });
```

- [ ] **Step 2: 테스트가 실패하는 것을 확인한다**

Run: `cd openapi-editor && npm run test -- src/App.test.tsx`
Expected: FAIL — `Unable to find an accessible element with the role "link"`

- [ ] **Step 3: 상수를 만든다**

`openapi-editor/src/constants.ts`:

```ts
/**
 * Tool Hub 랜딩. 모든 도구의 헤더 브랜드 블록이 여기로 돌아간다.
 * 도구들이 각각 다른 Vercel 도메인에 배포되므로 절대 URL 이어야 한다.
 */
export const TOOL_HUB_URL = 'https://tool-hub-rho.vercel.app/';
```

- [ ] **Step 4: 브랜드 블록을 허브 링크로 감싼다**

`Topbar.tsx` 의 `import` 에 추가한다.

```tsx
import { TOOL_HUB_URL } from '../../constants';
```

`.brand-block` 을 링크로 바꾼다.

```tsx
        <a href={TOOL_HUB_URL} className="brand-block" aria-label="Tool Hub 로 이동">
          <div className="brand-icon"><WandSparkles size={21} /></div>
          <div><h1>openapi-editor</h1><p>브라우저 안에서 편집 · 검증 · 변환합니다.</p></div>
        </a>
```

`components.css` 의 `.brand-block` 규칙(9행)에 `text-decoration: none; color: inherit;` 을 추가한다.

- [ ] **Step 4b: 브랜드 타이포를 정본 스케일로 바꾼다**

`components.css` 11행과 12행을 정본 토큰으로 바꾼다.

```css
.brand-block h1 { font-size: var(--ds-font-size-title); line-height: var(--ds-line-height-title); letter-spacing: var(--ds-tracking-title); font-weight: 750; }
.brand-block p { margin-top: 4px; color: var(--muted); font-size: var(--ds-font-size-body); line-height: var(--ds-line-height-body); }
```

`h1` 이 `clamp(1.2rem, 2vw, 1.55rem)` 에서 고정 `1.25rem` 으로 바뀐다. 최대 크기가 24.8px → 20px 로 줄어 데스크톱에서 타이틀이 작아진다. 47행 모바일 블록의 `.brand-block p { display: none; }` 은 그대로 둔다.

- [ ] **Step 5: 아이콘 버튼들을 정본 프리미티브로 바꾼다**

`Topbar.tsx` 의 테마 토글과 원본 복원 버튼이 대상이다.

```tsx
        <button className="ds-icon-btn topbar-theme-btn" type="button" aria-label="테마 전환" onClick={onToggleTheme}>{theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}</button>
```

```tsx
      <button className="ds-icon-btn" type="button" aria-label="원본 복원" title="원본 복원" onClick={onRestore} disabled={!canRestore || reviewing}><RotateCcw size={16} /></button>
```

- [ ] **Step 6: `components.css` 에서 `.theme-btn`·`.icon-btn` 정의를 제거한다**

24행과 25행에서 두 선택자를 삭제한다. `.ds-icon-btn` 이 대체한다.

```css
.icon-btn, .theme-btn { width: 34px; padding: 0; color: var(--muted); border: 1px solid var(--line); background: var(--surface-2); }
.theme-btn { width: 36px; height: 36px; }.icon-btn { font-size: .72rem; }
```

18행·22행·27행에서 `.theme-btn`·`.icon-btn` 을 선택자 목록에서 제거한다. 다른 선택자는 남긴다.

```css
.primary-btn, .secondary-btn { min-height: 36px; display: inline-flex; align-items: center; justify-content: center; gap: 6px; border-radius: var(--ds-radius-md); cursor: pointer; font-weight: 700; line-height: 1; transition: background var(--ds-duration-fast) var(--ds-ease-standard), border-color var(--ds-duration-fast) var(--ds-ease-standard), color var(--ds-duration-fast) var(--ds-ease-standard); }
```

```css
.secondary-btn:hover { border-color: var(--line-strong); background: var(--surface-3); }
```

```css
.primary-actions .primary-btn, .primary-actions .secondary-btn, .primary-actions .ds-icon-btn, .topbar-secondary-row .secondary-btn, .topbar-secondary-row .ds-icon-btn { height: 36px; min-height: 36px; }
```

29행의 `button:disabled, select:disabled { cursor: not-allowed; opacity: .48; }` 에서 `opacity` 를 제거한다. 정본 계약이 opacity 를 금지한다. `select` 는 정본 프리미티브가 없으므로 토큰으로 명시한다.

```css
button:disabled { cursor: not-allowed; }
select:disabled { cursor: not-allowed; color: var(--disabled); background: var(--fill-subtle); }
```

- [ ] **Step 7: 팝오버를 정본 층위 토큰으로 바꾼다**

30행의 `.utility-menu-popover` 에서 `z-index: 10` 을 정본 토큰으로 바꾼다.

```css
.utility-menu-popover { position: absolute; z-index: var(--ds-z-dropdown); top: calc(100% + 6px); right: 0; min-width: var(--utility-menu-popover-width); padding: 7px; display: grid; gap: 5px; background: var(--surface); border: 1px solid var(--line-strong); border-radius: var(--ds-radius-md); box-shadow: var(--ds-shadow-xl); }
```

- [ ] **Step 8: 커스텀 이벤트 이름에서 앱 이름을 뺀다**

`UtilityMenu.tsx` 4행을 바꾼다. 공용 프리미티브로 승격될 때 앱 이름이 박혀 있으면 안 된다.

```tsx
const MENU_OPEN_EVENT = 'toolhub:popover-open';
```

hover-open 동작과 240ms 닫기 타이머, mutual exclusion 은 `2026-07-23-openapi-editor-hover-utility-menus-design.md` 가 명세한 기능이므로 **변경하지 않는다**.

- [ ] **Step 9: 컨테이너 폭을 토큰으로 옮기고 페이지 여백을 토큰화한다**

`components.css` 1행의 `.app-shell` 을 바꾼다. 이미 1600px 이므로 값 변화가 없다.

```css
.app-shell { min-height: 100vh; max-width: var(--ds-container-wide); margin: 0 auto; padding: var(--ds-page-padding); display: flex; flex-direction: column; gap: 16px; }
```

47행 모바일 블록의 `.app-shell { padding: 10px; gap: 10px; }` 를 바꾼다.

```css
.app-shell { padding: var(--ds-page-padding-mobile); gap: 10px; }
```

데스크톱 여백이 18px → 24px, 모바일이 10px → 12px 로 바뀐다.

- [ ] **Step 10: 잔존 참조를 확인한다**

Run: `cd openapi-editor && grep -rn "theme-btn\|icon-btn" src/ | grep -v "ds-icon-btn"`
Expected: 출력 없음

Run: `cd openapi-editor && grep -rn "openapi-studio:" src/`
Expected: 출력 없음

Run: `cd openapi-editor && grep -n "opacity: .48" src/styles/components.css`
Expected: 출력 없음

- [ ] **Step 11: 전체 검증을 실행한다**

Run: `cd openapi-editor && mise run check`
Expected: test·lint·typecheck·build·e2e 전부 exit 0

E2E 의 `separates desktop topbar actions` 와 36px 높이 단정이 통과해야 한다.

- [ ] **Step 12: 산출 CSS 를 확인한다**

Run: `cd openapi-editor && grep -o "z-index:var(--ds-z-dropdown)" dist/assets/*.css | head -1`
Expected: 한 건 출력

Run: `cd openapi-editor && grep -o -- "--ds-z-dropdown:200" dist/assets/*.css | head -1`
Expected: `--ds-z-dropdown:200`

- [ ] **Step 13: 커밋한다**

```bash
git add openapi-editor/src
git commit -m "feat(openapi-editor): apply shell contract and primitives

- 브랜드 블록을 Tool Hub 허브 링크로 (도구 앱에 없던 복귀 경로)
- 테마 토글과 원본 복원을 .ds-icon-btn 으로 (34/36px 혼재 -> 36px)
- 팝오버를 --ds-z-dropdown 과 --ds-shadow-xl 로 (z-index 10 -> 200)
- disabled 의 opacity .48 을 --disabled/--fill-subtle 토큰으로
- UtilityMenu 커스텀 이벤트를 toolhub:popover-open 으로 (앱 이름 제거)
- 페이지 여백을 토큰으로 (데스크톱 18px -> 24px, 모바일 10px -> 12px)

2행 헤더 구조와 UtilityMenu 의 hover-open 동작은 각각 선행 계획서와 스펙이
정의한 기능이므로 보존한다. E2E 가 수직 분리와 36px 높이를 강제한다."
```

---

## 완료 확인

Task 7 이후 다음이 성립해야 한다. 3차 계획서를 쓰기 전 게이트다.

- [ ] `npm run tokens:test` exit 0 (스크립트 단위 테스트 7건)
- [ ] `npm run tokens:check` exit 0 (정본과 4개 앱 복사본 일치)
- [ ] `cd sign-maker && mise run check` exit 0 (Task 1 의 테스트 승격이 회귀를 만들지 않았다)
- [ ] `cd json-yaml-converter && mise run check` exit 0 (e2e 포함)
- [ ] `cd ddl-seed-generator && mise run check` exit 0
- [ ] `cd openapi-editor && mise run check` exit 0 (e2e 포함, 2행 헤더·36px 단정 통과)
- [ ] 네 앱의 산출 CSS 에서 `rounded-md`·`rounded-lg` 유틸리티가 `var(--ds-radius-*)` 를 참조
- [ ] `openapi-editor` 에서 ToolHub Sans 가 실제로 로드된다(빌드 산출물에 woff2 존재)
- [ ] 라이트·다크 양쪽에서 네 앱을 1280px 과 390px 로 육안 확인. `mise run dev` 후 헤더·패널·버튼·입력·팝오버·토스트
- [ ] 각 앱에서 브랜드 블록 클릭으로 Tool Hub 로 이동한다
- [ ] 다크 모드에서 카드 그림자가 보인다

## 알려진 위험

- **`ddl-seed-generator` 의 `--surface-2` 가 흰색에서 회색으로 바뀐다.** 흰 카드 위 흰 입력이 회색 함몰 표면이 된다. 정본 값을 따르되 육안 확인에서 어색하면 `theme.local.css` 에서 `--surface-2: #ffffff` 로 덮고 테두리를 `--control-border` 로 두는 선택을 별도로 판단한다. 이 계획서에서는 정본을 따른다.
- **`openapi-editor` 의 폰트 변경이 E2E 의 36px 높이 단정을 깰 수 있다.** 컨트롤 높이가 폰트 메트릭에 의존하면 ToolHub Sans 적용으로 달라진다. Task 6 Step 10 에서 확인하고, 깨지면 `line-height: 1` 을 명시해 높이를 폰트에서 분리한다.
- **`openapi-editor` 의 radius 4·6·7px → 8px 상향은 8종을 3단으로 줄이는 과정의 손실이다.** 작은 내부 요소가 다소 둥글어진다. 육안 확인 대상이다.
- **`sed` 치환 순서가 중요한 곳이 두 곳 있다.** Task 4 Step 7 의 `--warn-fg` → `--warning` 은 `--warn` → `--warning` 보다 **먼저** 실행되어야 한다. Task 4 Step 9 의 radius 치환은 `8px` 을 먼저 처리해도 무해하지만 `10px`·`12px` 이 같은 결과로 가므로 순서 무관하다.
- **`ddl-seed-generator` 의 테스트가 `lib/graph.test.ts` 하나뿐이다.** 시각 회귀 가드가 가장 약한 앱이므로 산출 CSS `grep` 과 육안 확인에 의존한다.
- **`json-yaml-converter` 의 `Button` variant 유니온 변경이 타입 오류를 낼 수 있다.** `variant="icon"` 사용처가 남아 있으면 Task 3 Step 8 의 grep 이 잡는다.
