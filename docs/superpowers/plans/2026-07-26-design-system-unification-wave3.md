# Design System Unification Implementation Plan (3/4: openapi-editor · dummy-file-generator)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `openapi-editor` 의 간헐적 E2E 실패를 결정적으로 만든 뒤 이 앱과 `dummy-file-generator` 를 정본 디자인 시스템 소비자로 전환한다.

**Architecture:** 1차 계획서에서 만든 `packages/design-system/` 정본 4파일과 `scripts/sync-design-tokens.mjs` 를 그대로 쓴다. 각 앱은 `styles/theme.css` 를 정본 복사본으로 교체하고, 앱 고유 토큰을 `theme.local.css` 로 내리고, `--ds-` 접두사로 토큰 이름을 치환한 뒤 `.ds-icon-btn`·`.ds-card`·`.ds-shell`·`.ds-page` 를 적용한다. `openapi-editor` 는 정본 도입 전에 E2E 를 결정적으로 만드는 선행 태스크가 필요하다 — 이 앱은 폰트를 새로 로드하므로 Monaco 초기화 타이밍이 바뀔 수 있고, 불안정한 baseline 에서는 회귀를 판별할 수 없다.

**Tech Stack:** Tailwind CSS 4.2.4, Node 24.13.0, Vitest, Playwright(openapi-editor), TypeScript, React 19, Next.js(dummy-file-generator), mise.

**선행 문서:**
- 설계: [2026-07-25-design-system-unification-design.md](../specs/2026-07-25-design-system-unification-design.md)
- 1차 계획서: [2026-07-25-design-system-unification.md](2026-07-25-design-system-unification.md)
- 2차 계획서: [2026-07-26-design-system-unification-wave2.md](2026-07-26-design-system-unification-wave2.md) — 특히 「openapi-editor 이관 메모」

**범위:** 설계 문서 마이그레이션 단계 7·8. 구조 재작성이나 신규 기능이 없는 두 앱.

**비대상:** `config-diff-viewer`(927줄 + `<dialog>` 재작성), `home`(`@theme`→`:root` 구조 전환), `webpage-capture-tool`(682줄 값 전환 + 다크모드 부재), 문서 갱신. 4차 계획서에서 다룬다.

**타이포 스케일의 적용 범위.** 헤더 슬롯 계약이 규정하는 `h1`(`--ds-font-size-title`)과 설명문(`--ds-font-size-body`)만 적용한다. 두 앱에 남은 나머지 font-size 를 5단으로 수렴하는 작업은 셸 계약과 독립적이므로 별도로 남긴다.

## Global Constraints

- 작업 디렉터리는 워크트리 `/Users/dongjin/dev/project/tool-hub/.claude/worktrees/design-system-unification`, 브랜치 `feat/design-system-unification`이다. 메인 체크아웃으로 `cd` 하지 않는다.
- **앱의 `styles/ds-*.css` 와 `styles/ds-sync.test.ts` 를 직접 편집하지 않는다.** 생성물이다. 정본을 고친 뒤 저장소 루트에서 `npm run tokens:sync` 를 실행한다.
- **Tailwind 테마 네임스페이스와 겹치는 토큰은 `--ds-` 접두사를 쓴다.** `--ds-font-sans`, `--ds-font-size-*`, `--ds-line-height-*`, `--ds-tracking-*`, `--ds-radius-*`, `--ds-shadow-*`, `--ds-ease-*`, `--ds-duration-*`, `--ds-z-*`, `--ds-container-*`, `--ds-page-padding*`.
- **색 토큰은 접두사를 붙이지 않는다.** `--bg`, `--surface`, `--surface-2`, `--surface-3`, `--fill*`, `--line*`, `--control-border`, `--text`, `--text-neutral`, `--muted`, `--disabled`, `--primary*`, `--on-primary`, `--danger*`, `--success*`, `--warning*`.
- 정본이 정의하지 않은 Tailwind radius/shadow 단계는 사용 금지. 정본 `ds-sync.test.ts` 가 강제한다.
- 모든 직접 조작 요소는 **36px** 높이를 유지한다.
- 포커스링은 정본 `ds-base.css` 의 전역 `:where(...):focus-visible` 규칙이 담당한다. 앱에서 중복 선언하지 않는다.
- disabled 는 `opacity` 로 표현하지 않고 `--disabled` + `--fill-subtle` 토큰을 쓴다.
- **타이포는 Tailwind 유틸리티가 아니라 CSS 에서 토큰으로 쓴다.** Tailwind v4 는 유틸리티를 `@layer utilities` 에 넣고 CSS 캐스케이드 레이어 규칙상 레이어 밖 스타일이 이긴다. `font-size` 나 `letter-spacing` 을 지정하는 기존 클래스가 있으면 유틸리티가 조용히 무시된다.
- 라이트·다크 양쪽에서 텍스트 4.5:1, non-text control border/focus 3:1 을 유지한다.
- 각 태스크의 완료 조건은 해당 앱에서 `mise run check` exit 0 이다.
- **`mise run install` 뒤 e2e 가 있는 앱은 `npx playwright install chromium` 을 실행한다.** `npm ci` 가 `node_modules` 를 지우고 재설치하면서 Playwright 브라우저 요구 버전 핀이 바뀌어 캐시에 없는 빌드를 찾게 되고, E2E 전체가 브라우저 실행 단계에서 실패한다.
- 허브 URL은 `https://tool-hub-rho.vercel.app/`이다.
- 커밋 메시지는 Conventional Commits 를 따른다.

---

## File Structure

| 파일 | 책임 |
|---|---|
| `openapi-editor/e2e/openapi-editor.spec.ts` | flake 수정. Monaco 키보드 입력 대신 파일 업로드로 유효 문서 주입 |
| `openapi-editor/public/fonts/toolhub-sans.woff2` | 신규 자산. 이 앱만 폰트 파일이 없었다 |
| `<app>/styles/ds-*.css`, `<app>/styles/ds-sync.test.ts` | 정본 복사본(생성물, 커밋) |
| `<app>/styles/theme.local.css` | 앱 고유 토큰 |
| `openapi-editor/src/constants.ts`, `dummy-file-generator/app/_lib/constants.ts` | `TOOL_HUB_URL` |
| `scripts/sync-design-tokens.mjs` | `TARGETS` 에 두 앱 추가 |

---

### Task 1: openapi-editor E2E 를 결정적으로 만든다

**Files:**
- Modify: `openapi-editor/e2e/openapi-editor.spec.ts`

**Interfaces:**
- Produces: `loadValidYaml(page)` — 파일 업로드로 유효 문서를 주입하고 `검증 완료` 를 기다린다. `enterValidYaml` 을 대체한다.
- Produces: `focusEditor(page)` — 뷰가 렌더된 뒤 에디터를 포커스한다. 편집을 검증하는 테스트만 쓴다.

**왜 선행 태스크인가.** 이 앱의 E2E 3건이 정본 도입 이전부터 5회 중 3회 실패한다. Task 2 가 폰트를 새로 로드해 Monaco 초기화 타이밍에 영향을 줄 수 있으므로, 먼저 결정적으로 만들지 않으면 회귀를 판별할 수 없다.

**근본 원인 (2차에서 실측 확인).** 헬퍼가 Enter·Tab 을 눌러 한 줄씩 입력하는데 Monaco 의 자동 들여쓰기와 경합한다. 실패한 실행에서 캡처한 실제 내용이다.

```
openapi: 3.1.2
info:
    title: Pets      ← 2칸이어야 하는데 4칸
    version: 1.0.0
  paths: {}          ← 0칸이어야 하는데 2칸
```

`info:` 다음 Enter 에서 Monaco 가 2칸을 넣는데, 그게 적용되기 전에 명시적 `Tab` 이 도착하면 4칸이 되고 이어지는 `Shift+Tab` 이 2칸만 빼서 `paths` 가 `info` 의 자식이 된다.

**2차에서 실패한 시도 — 반복하지 말 것.**

| 시도 | 결과 |
|---|---|
| Monaco 입력 textarea 포커스 대기 | 불가능. 이 Monaco 버전은 EditContext API 를 쓰므로 입력용 textarea 도 contenteditable 도 없다. 유일한 textarea 는 IME 보조 요소(`ime-text-area`, `tabindex=-1`, `readonly`)다 |
| 문서 전체를 한 번의 여러 줄 `insertText` 로 삽입 | 6/6 실패. `검증 완료` 가 아예 뜨지 않는다 |

**이번 접근.** 키보드로 여러 줄 YAML 을 만들지 않는다. `Topbar` 의 파일 업로드가 `<input type="file">` 이므로 Playwright `setInputFiles()` 로 결정적으로 주입한다. 편집 자체를 검증하는 테스트만 에디터를 쓰고, 그때는 **한 줄 flow 매핑**을 넣어 자동 들여쓰기가 개입할 여지를 없앤다. 한 줄 `insertText` 는 2차 실측에서 항상 정확히 입력됐다.

- [ ] **Step 1: 의존성을 설치하고 브라우저를 확보한 뒤 baseline 을 측정한다**

Run:
```bash
cd openapi-editor && mise run install && npx playwright install chromium
```

Run:
```bash
cd openapi-editor && for i in 1 2 3 4 5; do npm run --silent test:e2e > /dev/null 2>&1 && echo "pass" || echo "fail"; done
```
Expected: 5회 중 2~3회 `fail`. 전부 `pass` 로 나오면 flake 가 이미 사라진 것이므로 Step 2~6 을 건너뛰고 Task 2 로 간다. 전부 `fail` 이면 브라우저 문제이므로 `npx playwright install chromium` 을 다시 확인한다.

- [ ] **Step 2: 유효 문서 상수와 업로드 헬퍼를 추가한다**

`e2e/openapi-editor.spec.ts` 의 `downloadSample` 아래에 넣는다. 기존 `enterValidYaml` 은 아직 지우지 않는다.

```ts
const VALID_YAML = ['openapi: 3.1.2', 'info:', '  title: Pets', '  version: 1.0.0', 'paths: {}'].join('\n');

/**
 * 파일 업로드로 유효 문서를 주입한다.
 *
 * Monaco 에 키보드로 여러 줄을 입력하면 자동 들여쓰기와 경합해 들여쓰기가
 * 어긋나고 문서가 무효해진다. Topbar 의 파일 입력은 hidden 이지만
 * setInputFiles 는 hidden 입력에도 동작하므로 결정적이다.
 */
async function loadValidYaml(page: Page): Promise<void> {
  await page.locator('input[type="file"]').setInputFiles({
    name: 'openapi.yaml',
    mimeType: 'application/yaml',
    buffer: Buffer.from(VALID_YAML, 'utf8'),
  });
  await expect(page.getByText('검증 완료')).toBeVisible();
}
```

- [ ] **Step 3: 편집 검증용 포커스 헬퍼를 추가한다**

같은 위치에 이어서 넣는다.

```ts
/**
 * 뷰가 렌더된 뒤 에디터를 포커스한다.
 *
 * 포커스 대상을 DOM 요소로 잡지 않는다. 이 Monaco 버전은 EditContext API 를
 * 쓰므로 입력용 textarea 도 contenteditable 도 없고, 에디터 안의 유일한
 * textarea 는 IME 보조 요소(ime-text-area, tabindex=-1, readonly)라 절대
 * 포커스되지 않는다. 대신 Monaco 가 루트에 붙이는 focused 클래스를 본다.
 */
async function focusEditor(page: Page): Promise<void> {
  const editor = page.locator('.monaco-editor').first();
  await editor.locator('.view-lines').waitFor();
  await editor.click();
  await expect(editor).toHaveClass(/\bfocused\b/);
}
```

- [ ] **Step 4: 편집을 검증하는 테스트를 한 줄 flow 매핑으로 바꾼다**

`edits a YAML OpenAPI document and keeps the browser-only workspace visible` 의 본문 전체를 바꾼다. YAML flow 매핑은 들여쓰기가 없는 한 줄이므로 자동 들여쓰기가 개입할 수 없다.

```ts
test('edits a YAML OpenAPI document and keeps the browser-only workspace visible', async ({ page }) => {
  await page.goto('/');
  await focusEditor(page);
  await page.keyboard.press('ControlOrMeta+A');
  // flow 매핑은 한 줄이라 Monaco 의 자동 들여쓰기가 개입할 여지가 없다.
  await page.keyboard.insertText('{openapi: 3.1.2, info: {title: Pets, version: 1.0.0}, paths: {}}');
  await expect(page.getByText('검증 완료')).toBeVisible();
  await expect(page.getByText('문서는 브라우저 밖으로 전송되지 않습니다.')).toBeVisible();
});
```

- [ ] **Step 5: 나머지 두 테스트를 업로드 경로로 바꾸고 옛 헬퍼를 지운다**

`enterValidYaml(page)` 호출 2곳을 `loadValidYaml(page)` 로 바꾼다.

- `opens the export menu on hover and downloads YAML directly` (`await enterValidYaml(page);`)
- `converts a valid document to JSON from the format menu` (`await enterValidYaml(page);`)

그리고 `enterValidYaml` 함수 정의를 삭제한다.

Run: `cd openapi-editor && grep -n "enterValidYaml" e2e/openapi-editor.spec.ts`
Expected: 출력 없음

- [ ] **Step 6: 5회 연속 실행해 결정적인지 확인한다**

1회 통과로는 flake 해소를 확인할 수 없다.

Run:
```bash
cd openapi-editor && for i in 1 2 3 4 5; do npm run --silent test:e2e > /dev/null 2>&1 && echo "pass" || echo "fail"; done
```
Expected: 5회 전부 `pass`

한 번이라도 `fail` 이면 그 실행의 출력을 확인해 어느 테스트가 왜 깨지는지 보고한다. 추측으로 다음 수정을 시도하지 않는다.

- [ ] **Step 7: 전체 검증을 실행한다**

Run: `cd openapi-editor && mise run check`
Expected: test·lint·typecheck·build·e2e 전부 exit 0

- [ ] **Step 8: 커밋한다**

```bash
git add openapi-editor/e2e/openapi-editor.spec.ts
git commit -m "test(openapi-editor): make Monaco e2e deterministic

E2E 3건이 5회 중 2~3회 실패했다. Enter·Tab 으로 한 줄씩 입력하면 Monaco 의
자동 들여쓰기와 경합해 info: 다음 줄이 4칸이 되고 Shift+Tab 이 2칸만 빼서
paths 가 info 의 자식이 된다. 문서가 무효해져 검증 완료가 뜨지 않았다.

- loadValidYaml: 파일 업로드로 유효 문서를 결정적으로 주입한다.
  setInputFiles 는 hidden 입력에도 동작한다
- 편집을 검증하는 테스트만 에디터를 쓰고, 한 줄 flow 매핑을 넣어 자동
  들여쓰기가 개입할 여지를 없앤다
- focusEditor: EditContext API 를 쓰는 이 Monaco 버전은 입력용 DOM 요소가
  없으므로 루트의 focused 클래스로 포커스를 확인한다"
```

---

### Task 2: openapi-editor 폰트 자산과 정본 도입

**Files:**
- Create: `openapi-editor/public/fonts/toolhub-sans.woff2` (복사)
- Create: `openapi-editor/src/styles/theme.local.css`
- Delete: `openapi-editor/src/styles/theme.css`
- Modify: `openapi-editor/src/index.css`
- Modify: `openapi-editor/src/styles/base.css`
- Modify: `openapi-editor/src/styles/components.css`
- Modify: `scripts/sync-design-tokens.mjs`
- Modify: `scripts/sync-design-tokens.test.mjs`

**Interfaces:**
- Consumes: 결정적 E2E (Task 1)
- Produces: `theme.local.css` 에 `--code`·`--caution`
- Produces: `TARGETS` 에 `'openapi-editor': 'src/styles'`

이 앱은 **`@font-face` 가 없고 폰트 파일도 없다.** `base.css` 가 `"ToolHub Sans"` 를 이름으로 참조하지만 로드되지 않아 시스템 폰트로 폴백하고 있었다. 정본이 `@font-face` 를 제공하므로 자산만 넣으면 나머지 앱과 같은 폰트가 적용된다 — 이 앱에서 가장 눈에 띄는 변화다.

radius·shadow·motion 토큰이 전혀 없어 하드코딩된 값 19곳(radius 8종)과 `.16s` 3곳을 흡수해야 한다.

**의미가 바뀌는 토큰.**

| 기존 | 사용 | 이전 | 이유 |
|---|---|---|---|
| `--green` | 1곳 | `--success` | 색 이름 → 의미 이름 |
| `--yellow` | 4곳 | `--warning` | 색 이름 → 의미 이름 |
| `--coral` | 4곳 | `theme.local.css` 의 `--caution` | `--yellow` 가 이미 `--warning` 을 차지한다. 이 앱은 경고 단계가 둘이다 |
| `--code` | 1곳 | `theme.local.css` | 코드 표면은 도메인 고유 |
| `--soft` | 2곳 | `--muted` | 정본에서 폐기 |

**의도된 시각 변화.**

| 항목 | 기존 | 정본 | 변화 |
|---|---|---|---|
| 본문 폰트 | 시스템 폰트(폴백) | ToolHub Sans | **가장 눈에 띄는 변화** |
| `--muted` 라이트 | `rgba(55,56,60,.61)` 3.66:1 | `rgba(55,56,60,.72)` | AA 통과 |
| `--soft` 라이트 | `rgba(55,56,60,.40)` 2.18:1 | `--muted` | 리사이저·상태점이 진해짐 |
| 다크 `--bg` | `#1b1c1e` | `rgb(15,15,16)` | 페이지가 더 어두워짐 |
| 다크 `--surface` | `#212225` | `rgb(27,28,30)` | 카드가 더 어두워짐 |
| `--line` 다크 | `rgba(174,176,182,.18)` | `rgba(112,115,124,.32)` | 경계선이 진해짐 |
| radius | 4·6·7·9·10·11·12·14px | 8·12·16px | 작은 요소가 둥글어짐 |
| 팝오버 그림자 | `rgb(15 23 42 / 14%)` slate | `--ds-shadow-xl` 중립 | 파란 색조 제거 |
| shadow 토큰 | 없음 | 다크 오버라이드 포함 | 다크에서 그림자가 보이게 됨 |

- [ ] **Step 1: `TARGETS` 에 앱을 추가한다**

`scripts/sync-design-tokens.mjs`:

```js
export const TARGETS = {
  'sign-maker': 'src/styles',
  'json-yaml-converter': 'src/styles',
  'ddl-seed-generator': 'app/styles',
  'openapi-editor': 'src/styles',
};
```

`scripts/sync-design-tokens.test.mjs` 의 단정도 맞춘다.

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

- [ ] **Step 2: 스크립트 테스트가 통과하는지 확인하고 동기화한다**

Run: `npm run tokens:test`
Expected: PASS — 7개 테스트

Run: `npm run tokens:sync`
Expected: `openapi-editor/src/styles/` 에 `ds-tokens.css`·`ds-base.css`·`ds-primitives.css`·`ds-sync.test.ts` 4건 생성 보고

- [ ] **Step 3: 폰트 자산을 복사한다**

다른 앱과 동일한 파일을 쓴다.

Run:
```bash
mkdir -p openapi-editor/public/fonts && cp sign-maker/public/fonts/toolhub-sans.woff2 openapi-editor/public/fonts/
```

Run: `cmp sign-maker/public/fonts/toolhub-sans.woff2 openapi-editor/public/fonts/toolhub-sans.woff2 && echo 동일`
Expected: `동일`

- [ ] **Step 4: `theme.local.css` 를 만든다**

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

- [ ] **Step 5: 진입 CSS 를 교체하고 기존 `theme.css` 를 삭제한다**

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

- [ ] **Step 6: `base.css` 의 폰트를 토큰으로 바꾸고 중복 규칙을 제거한다**

`body` 줄을 바꾼다. 이제 실제로 ToolHub Sans 가 로드된다.

```css
body { min-width: 320px; min-height: 100vh; background: var(--bg); color: var(--text); font-family: var(--ds-font-sans); -webkit-font-smoothing: antialiased; }
```

그리고 두 줄을 **삭제**한다. 정본 `ds-base.css` 가 대체한다.

```css
:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; border-radius: 4px; }
@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; } }
```

정본 규칙에는 `border-radius` 가 없어 포커스 아웃라인 모서리가 각지게 바뀐다. 의도된 변화다 — 4px 고정은 12px radius 컨트롤과 어긋났다.

- [ ] **Step 7: 의미가 바뀌는 토큰을 옮긴다**

Run:
```bash
cd openapi-editor && sed -i '' \
  -e 's/var(--green)/var(--success)/g' \
  -e 's/var(--yellow)/var(--warning)/g' \
  -e 's/var(--coral)/var(--caution)/g' \
  -e 's/var(--soft)/var(--muted)/g' \
  src/styles/components.css
```

- [ ] **Step 8: 하드코딩된 radius 를 정본 스케일로 흡수한다**

8종(4·6·7·9·10·11·12·14px)을 3단으로 모은다. 6px 이하는 작은 내부 요소이므로 `sm`(8px), 9~12px 은 컨트롤이므로 `md`(12px), 14px 이상은 카드이므로 `lg`(16px) 로 간다.

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

- [ ] **Step 9: 하드코딩된 transition 과 shadow 를 토큰으로 흡수한다**

Run:
```bash
cd openapi-editor && sed -i '' \
  -e 's/transition: background \.16s, border-color \.16s, color \.16s/transition: background var(--ds-duration-fast) var(--ds-ease-standard), border-color var(--ds-duration-fast) var(--ds-ease-standard), color var(--ds-duration-fast) var(--ds-ease-standard)/g' \
  -e 's|box-shadow: 0 12px 28px rgb(15 23 42 / 14%)|box-shadow: var(--ds-shadow-xl)|g' \
  -e 's|box-shadow: 0 1px 2px rgb(0 0 0 / 8%)|box-shadow: var(--ds-shadow-sm)|g' \
  src/styles/components.css
```

- [ ] **Step 10: 잔존 참조를 확인한다**

Run: `cd openapi-editor && grep -nE "var\(--(green|yellow|coral|soft)\)" src/styles/components.css`
Expected: 출력 없음

Run: `cd openapi-editor && grep -nE "border-radius: [0-9]+px" src/styles/components.css`
Expected: 출력 없음

Run: `cd openapi-editor && grep -n "\.16s\|rgb(15 23 42" src/styles/components.css`
Expected: 출력 없음

- [ ] **Step 11: 전체 검증을 실행한다**

E2E 가 2행 헤더의 수직 분리와 36px 컨트롤 높이를 단정한다. 폰트 변경이 높이에 영향을 주는지 여기서 드러난다.

Run: `cd openapi-editor && mise run check`
Expected: test·lint·typecheck·build·e2e 전부 exit 0

36px 단정이 깨지면 컨트롤 높이가 폰트 메트릭에 의존한다는 뜻이다. `.primary-btn, .secondary-btn` 에 이미 `line-height: 1` 이 있는지 확인하고 없으면 추가해 높이를 폰트에서 분리한다.

- [ ] **Step 12: 폰트가 실제로 로드되는지 확인한다**

Run: `cd openapi-editor && grep -o "toolhub-sans[^)\"]*" dist/assets/*.css | head -1`
Expected: 폰트 URL 출력

Run: `cd openapi-editor && ls dist/assets/*.woff2`
Expected: 빌드 산출물에 폰트 파일 존재

- [ ] **Step 13: 커밋한다**

```bash
git add openapi-editor/public openapi-editor/src scripts
git commit -m "refactor(openapi-editor): consume canonical design system

- 폰트 자산 추가. base.css 가 ToolHub Sans 를 이름으로만 참조하고 @font-face
  도 파일도 없어 시스템 폰트로 폴백하고 있었다
- theme.css 를 정본 복사본으로 교체, --code 와 --caution 을 theme.local.css 로
- --green -> --success, --yellow -> --warning, --coral -> --caution (경고 2단계)
- --soft 폐기에 따라 2곳을 --muted 로
- 하드코딩 radius 19곳(8종)을 정본 3단으로, .16s transition 과 팝오버 그림자를
  토큰으로. 팝오버 그림자의 slate 색조를 중립으로 교정
- base.css 의 포커스링과 prefers-reduced-motion 중복 제거
- TARGETS 에 openapi-editor 추가"
```

---

### Task 3: openapi-editor 프리미티브와 셸 계약

**Files:**
- Create: `openapi-editor/src/constants.ts`
- Modify: `openapi-editor/src/components/layout/Topbar.tsx`
- Modify: `openapi-editor/src/components/common/UtilityMenu.tsx`
- Modify: `openapi-editor/src/styles/components.css`
- Modify: `openapi-editor/src/App.test.tsx`

**Interfaces:**
- Consumes: `.ds-icon-btn`·`--ds-container-wide`·`--ds-z-dropdown`·`--ds-shadow-xl` (정본)
- Produces: `TOOL_HUB_URL` 상수

**2행 헤더 구조를 보존한다.** `2026-07-23-openapi-editor-header-layout.md` 가 정의하고 E2E 가 강제한다 — `aria-label="핵심 작업"` 과 `"보조 작업"` 의 수직 분리, 모든 컨트롤 36px. 정본 계약에서 유틸리티 슬롯은 1행의 끝이며 2행은 페이지 액션의 연장이다. 현재 구조가 이미 그렇다.

- [ ] **Step 1: 허브 링크를 단정하는 실패 테스트를 작성한다**

`openapi-editor/src/App.test.tsx` 의 최상위 `describe` 안에 추가한다.

```tsx
  it('브랜드 블록이 Tool Hub 로 돌아가는 링크다', async () => {
    render(<App />);

    const hubLink = await screen.findByRole('link', { name: /Tool Hub/ }, { timeout: 5000 });
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

- [ ] **Step 4: 브랜드 블록을 허브 링크로 감싸고 타이포를 정본 토큰으로 바꾼다**

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

`components.css` 9행의 `.brand-block` 에 `text-decoration: none; color: inherit;` 을 추가하고, 11·12행을 정본 토큰으로 바꾼다.

```css
.brand-block { display: flex; align-items: center; gap: 12px; min-width: 0; text-decoration: none; color: inherit; }
```

```css
.brand-block h1 { font-size: var(--ds-font-size-title); line-height: var(--ds-line-height-title); letter-spacing: var(--ds-tracking-title); font-weight: 750; }
.brand-block p { margin-top: 4px; color: var(--muted); font-size: var(--ds-font-size-body); line-height: var(--ds-line-height-body); }
```

`h1` 이 `clamp(1.2rem, 2vw, 1.55rem)` 에서 고정 `1.25rem` 으로 바뀐다. 최대 크기가 24.8px → 20px 로 줄어 데스크톱에서 타이틀이 작아진다. 47행 모바일 블록의 `.brand-block p { display: none; }` 은 그대로 둔다.

- [ ] **Step 5: 테스트가 통과하는 것을 확인한다**

Run: `cd openapi-editor && npm run test -- src/App.test.tsx`
Expected: PASS

- [ ] **Step 6: 아이콘 버튼들을 정본 프리미티브로 바꾼다**

`Topbar.tsx` 의 테마 토글과 원본 복원 버튼이 대상이다.

```tsx
        <button className="ds-icon-btn topbar-theme-btn" type="button" aria-label="테마 전환" onClick={onToggleTheme}>{theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}</button>
```

```tsx
      <button className="ds-icon-btn" type="button" aria-label="원본 복원" title="원본 복원" onClick={onRestore} disabled={!canRestore || reviewing}><RotateCcw size={16} /></button>
```

- [ ] **Step 7: `components.css` 에서 `.theme-btn`·`.icon-btn` 정의를 제거한다**

24행과 25행의 두 줄을 **삭제**한다. `.ds-icon-btn` 이 대체한다.

```css
.icon-btn, .theme-btn { width: 34px; padding: 0; color: var(--muted); border: 1px solid var(--line); background: var(--surface-2); }
.theme-btn { width: 36px; height: 36px; }.icon-btn { font-size: .72rem; }
```

18행·22행·27행에서 `.theme-btn`·`.icon-btn` 을 선택자 목록에서 제거한다.

```css
.primary-btn, .secondary-btn { min-height: 36px; display: inline-flex; align-items: center; justify-content: center; gap: 6px; border-radius: var(--ds-radius-md); cursor: pointer; font-weight: 700; line-height: 1; transition: background var(--ds-duration-fast) var(--ds-ease-standard), border-color var(--ds-duration-fast) var(--ds-ease-standard), color var(--ds-duration-fast) var(--ds-ease-standard); }
```

```css
.secondary-btn:hover { border-color: var(--line-strong); background: var(--surface-3); }
```

```css
.primary-actions .primary-btn, .primary-actions .secondary-btn, .primary-actions .ds-icon-btn, .topbar-secondary-row .secondary-btn, .topbar-secondary-row .ds-icon-btn { height: 36px; min-height: 36px; }
```

- [ ] **Step 8: disabled 의 opacity 를 토큰으로 바꾼다**

29행을 바꾼다. 정본 계약이 `opacity` 를 금지한다. `select` 는 정본 프리미티브가 없으므로 토큰으로 명시한다.

```css
button:disabled { cursor: not-allowed; }
select:disabled { cursor: not-allowed; color: var(--disabled); background: var(--fill-subtle); }
```

- [ ] **Step 9: 팝오버를 정본 층위·고도 토큰으로 바꾼다**

30행의 `.utility-menu-popover` 를 바꾼다. `z-index: 10` 은 drawer 나 토스트와 경쟁할 때 예측 불가능하다.

```css
.utility-menu-popover { position: absolute; z-index: var(--ds-z-dropdown); top: calc(100% + 6px); right: 0; min-width: var(--utility-menu-popover-width); padding: 7px; display: grid; gap: 5px; background: var(--surface); border: 1px solid var(--line-strong); border-radius: var(--ds-radius-md); box-shadow: var(--ds-shadow-xl); }
```

- [ ] **Step 10: 커스텀 이벤트 이름에서 앱 이름을 뺀다**

`UtilityMenu.tsx` 4행을 바꾼다. 공용 프리미티브로 승격될 때 앱 이름이 박혀 있으면 안 된다.

```tsx
const MENU_OPEN_EVENT = 'toolhub:popover-open';
```

hover-open 동작과 240ms 닫기 타이머, mutual exclusion 은 `2026-07-23-openapi-editor-hover-utility-menus-design.md` 가 명세한 기능이므로 **변경하지 않는다**.

- [ ] **Step 11: 컨테이너와 페이지 여백을 토큰으로 옮긴다**

`components.css` 1행의 `.app-shell` 을 바꾼다. 최대폭은 이미 1600px 이므로 값 변화가 없다.

```css
.app-shell { min-height: 100vh; max-width: var(--ds-container-wide); margin: 0 auto; padding: var(--ds-page-padding); display: flex; flex-direction: column; gap: 16px; }
```

47행 모바일 블록의 `.app-shell { padding: 10px; gap: 10px; }` 를 바꾼다.

```css
.app-shell { padding: var(--ds-page-padding-mobile); gap: 10px; }
```

데스크톱 여백이 18px → 24px, 모바일이 10px → 12px 로 바뀐다.

- [ ] **Step 12: 잔존 참조를 확인한다**

Run: `cd openapi-editor && grep -rn "theme-btn\|icon-btn" src/ | grep -v "ds-icon-btn"`
Expected: 출력 없음

Run: `cd openapi-editor && grep -rn "openapi-studio:" src/`
Expected: 출력 없음

Run: `cd openapi-editor && grep -n "opacity: .48" src/styles/components.css`
Expected: 출력 없음

- [ ] **Step 13: 전체 검증을 실행하고 E2E 안정성을 재확인한다**

Run: `cd openapi-editor && mise run check`
Expected: test·lint·typecheck·build·e2e 전부 exit 0. E2E 의 `separates desktop topbar actions` 와 36px 높이 단정이 통과해야 한다.

Task 1 에서 확보한 결정성이 유지되는지 확인한다.

Run:
```bash
cd openapi-editor && for i in 1 2 3; do npm run --silent test:e2e > /dev/null 2>&1 && echo "pass" || echo "fail"; done
```
Expected: 3회 전부 `pass`

- [ ] **Step 14: 산출 CSS 를 확인한다**

Run: `cd openapi-editor && grep -o "z-index:var(--ds-z-dropdown)" dist/assets/*.css | head -1`
Expected: 한 건 출력

Run: `cd openapi-editor && grep -o -- "--ds-z-dropdown:200" dist/assets/*.css | head -1`
Expected: `--ds-z-dropdown:200`

- [ ] **Step 15: 커밋한다**

```bash
git add openapi-editor/src
git commit -m "feat(openapi-editor): apply shell contract and primitives

- 브랜드 블록을 Tool Hub 허브 링크로 (도구 앱에 없던 복귀 경로)
- 브랜드 타이포를 정본 토큰으로. h1 이 clamp 에서 고정 1.25rem 으로
- 테마 토글과 원본 복원을 .ds-icon-btn 으로 (34/36px 혼재 -> 36px)
- 팝오버를 --ds-z-dropdown 과 --ds-shadow-xl 로 (z-index 10 -> 200)
- disabled 의 opacity .48 을 --disabled/--fill-subtle 토큰으로
- UtilityMenu 커스텀 이벤트를 toolhub:popover-open 으로 (앱 이름 제거)
- 페이지 여백을 토큰으로 (데스크톱 18px -> 24px, 모바일 10px -> 12px)

2행 헤더 구조와 UtilityMenu 의 hover-open 동작은 각각 선행 계획서와 스펙이
정의한 기능이므로 보존한다. E2E 가 수직 분리와 36px 높이를 강제한다."
```

---

### Task 4: dummy-file-generator 정본 도입

**Files:**
- Create: `dummy-file-generator/app/styles/theme.local.css`
- Delete: `dummy-file-generator/app/styles/theme.css`
- Modify: `dummy-file-generator/app/globals.css`
- Modify: `dummy-file-generator/app/styles/base.css`
- Modify: `dummy-file-generator/app/styles/components.css`
- Modify: `scripts/sync-design-tokens.mjs`
- Modify: `scripts/sync-design-tokens.test.mjs`

**Interfaces:**
- Produces: `theme.local.css` 에 `--paper` 없음 — 이 앱은 고유 토큰이 `--danger-bg` 하나뿐이고 그것도 정본 `--danger-surface` 로 흡수되므로 `theme.local.css` 를 만들지 않는다.
- Produces: `TARGETS` 에 `'dummy-file-generator': 'app/styles'`

이 앱은 **브랜드 토큰에 `--color-` 접두사를 쓰는 유일한 앱**이다(20곳). 그리고 텍스트를 5단으로 나눈 유일한 앱이다(13곳). 둘 다 정본 이름으로 흡수한다.

**`@theme inline` 매핑이 사라져도 안전하다.** 기존 `theme.css` 는 `--color-surface-alt` 를 매핑하는데 정본에는 그 이름이 없다(정본은 `--color-bg`·`--color-surface-2`·`--color-surface-3` 를 제공한다). 하지만 이 앱의 TSX 에는 **Tailwind 색 유틸리티 사용이 0건**이다 — 모든 스타일이 의미 클래스를 경유한다. 따라서 소비자가 없어 무해하다. 확인 명령이다.

```bash
cd dummy-file-generator && grep -rhoE '\b(bg|text|border|ring|fill|stroke)-[a-z0-9-]+' app/ --include="*.tsx" | sort -u
```
출력이 비어 있어야 한다.

**이름이 바뀌는 토큰.**

| 기존 | 사용 | 정본 | 비고 |
|---|---|---|---|
| `--color-primary` | 14곳 | `--primary` | `--color-` 접두사 제거 |
| `--color-primary-strong` | 1곳 | `--primary-strong` | |
| `--color-primary-heavy` | 1곳 | `--primary-heavy` | |
| `--color-primary-surface` | 2곳 | `--primary-surface` | |
| `--color-on-primary` | 2곳 | `--on-primary` | |
| `--text-normal` | 4곳 | `--text` | |
| `--text-neutral` | 2곳 | `--text-neutral` | 정본에 있음. 변화 없음 |
| `--text-alternative` | 5곳 | `--muted` | |
| `--text-assistive` | 1곳 | `--muted` | `.sizeInput::placeholder` — 2.18:1 가독성 결함 수정 |
| `--text-disable` | 1곳 | `--disabled` | |
| `--surface-alt` | base.css 1곳 | `--bg` | 페이지 배경 |
| `--danger-bg` | 1곳 | `--danger-surface` | |
| `--radius-*`·`--shadow-*`·`--ease-standard`·`--duration-*` | 32곳 | `--ds-` 접두사 | 값 변화 없음 |

**의도된 시각 변화.**

| 항목 | 기존 | 정본 | 변화 |
|---|---|---|---|
| `--muted` 라이트 | `rgba(55,56,60,.61)` 3.66:1 | `rgba(55,56,60,.72)` | AA 통과 |
| placeholder | `rgba(55,56,60,.28)` 1.69:1 | `--muted` 4.55:1 | **가독성 결함 수정** |
| `--surface` 다크 | `rgb(33,34,37)` | `rgb(27,28,30)` | 카드가 더 어두워짐 |
| 페이지 배경 다크 | `rgb(27,28,30)` | `rgb(15,15,16)` | 페이지가 더 어두워짐 |
| `--danger` 라이트 | `rgb(255,66,66)` **3.44:1** | `#d11f2e` 5.32:1 | 진해짐. 기존 값은 텍스트로 쓸 수 없었다 |
| `--line-subtle` 다크 | `rgba(112,115,124,.22)` | `rgba(112,115,124,.16)` | 옅어짐 |

- [ ] **Step 1: 의존성을 설치하고 baseline 을 확인한다**

Run: `cd dummy-file-generator && mise run install && mise run check`
Expected: exit 0. baseline 이 실패하면 진행하지 말고 보고한다.

- [ ] **Step 2: `TARGETS` 에 앱을 추가하고 동기화한다**

`scripts/sync-design-tokens.mjs`:

```js
export const TARGETS = {
  'sign-maker': 'src/styles',
  'json-yaml-converter': 'src/styles',
  'ddl-seed-generator': 'app/styles',
  'openapi-editor': 'src/styles',
  'dummy-file-generator': 'app/styles',
};
```

`scripts/sync-design-tokens.test.mjs` 의 단정도 맞춘다.

```js
  test('TARGETS 는 마이그레이션된 앱만 담는다', () => {
    assert.deepEqual(Object.keys(TARGETS), [
      'sign-maker',
      'json-yaml-converter',
      'ddl-seed-generator',
      'openapi-editor',
      'dummy-file-generator',
    ]);
  });
```

Run: `npm run tokens:test && npm run tokens:sync`
Expected: 테스트 7건 통과 후 `dummy-file-generator/app/styles/` 에 4건 생성

- [ ] **Step 3: 진입 CSS 를 교체하고 기존 `theme.css` 를 삭제한다**

`dummy-file-generator/app/globals.css` 전체를 다음으로 바꾼다. `theme.local.css` 는 만들지 않으므로 import 하지 않는다.

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
@import "./styles/base.css";
@import "./styles/components.css";
```

Run: `git rm dummy-file-generator/app/styles/theme.css`

- [ ] **Step 4: `base.css` 의 폰트와 표면 토큰을 바꾼다**

`body` 블록 전체를 바꾼다. 하드코딩된 폰트 스택을 토큰으로, 페이지 배경을 `--surface-alt` 에서 `--bg` 로, 본문색을 `--text-normal` 에서 `--text` 로 옮긴다.

```css
body {
  min-height: 100vh;
  font-family: var(--ds-font-sans);
  /* 코어 UI는 평평한 표면 — 그라데이션·텍스처 없음 */
  background-color: var(--bg);
  color: var(--text);
  -webkit-font-smoothing: antialiased;
}
```

- [ ] **Step 5: 브랜드 토큰의 `--color-` 접두사를 제거한다**

긴 이름을 먼저 치환해야 짧은 이름이 접두사를 잘라먹지 않는다.

Run:
```bash
cd dummy-file-generator && sed -i '' \
  -e 's/var(--color-primary-surface)/var(--primary-surface)/g' \
  -e 's/var(--color-primary-strong)/var(--primary-strong)/g' \
  -e 's/var(--color-primary-heavy)/var(--primary-heavy)/g' \
  -e 's/var(--color-on-primary)/var(--on-primary)/g' \
  -e 's/var(--color-primary)/var(--primary)/g' \
  app/styles/components.css
```

- [ ] **Step 6: 5단 텍스트 토큰을 정본 4단으로 흡수한다**

`--text-neutral` 은 정본에 있으므로 건드리지 않는다. 긴 이름을 먼저 치환한다.

Run:
```bash
cd dummy-file-generator && sed -i '' \
  -e 's/var(--text-alternative)/var(--muted)/g' \
  -e 's/var(--text-assistive)/var(--muted)/g' \
  -e 's/var(--text-disable)/var(--disabled)/g' \
  -e 's/var(--text-normal)/var(--text)/g' \
  app/styles/components.css
```

`--text-assistive` 는 `.sizeInput::placeholder` 에 쓰였고 1.69:1 이었다. `--muted`(4.55:1)로 올라간다.

- [ ] **Step 7: 나머지 토큰 이름을 `--ds-` 접두사로 치환한다**

Run:
```bash
cd dummy-file-generator && sed -i '' \
  -e 's/var(--radius-/var(--ds-radius-/g' \
  -e 's/var(--shadow-/var(--ds-shadow-/g' \
  -e 's/var(--ease-standard)/var(--ds-ease-standard)/g' \
  -e 's/var(--duration-fast)/var(--ds-duration-fast)/g' \
  -e 's/var(--duration-base)/var(--ds-duration-base)/g' \
  -e 's/var(--danger-bg)/var(--danger-surface)/g' \
  app/styles/components.css
```

- [ ] **Step 8: 잔존 참조를 확인한다**

Run:
```bash
cd dummy-file-generator && grep -nE "var\(--(color-|text-normal|text-alternative|text-assistive|text-disable|surface-alt|danger-bg|radius-|shadow-|ease-standard|duration-)" app/styles/components.css app/styles/base.css
```
Expected: 출력 없음

Run: `cd dummy-file-generator && grep -c "var(--ds-" app/styles/components.css`
Expected: `32` 이상

- [ ] **Step 9: 전체 검증을 실행한다**

Run: `cd dummy-file-generator && mise run check`
Expected: test·lint·typecheck·build 전부 exit 0

- [ ] **Step 10: 산출 CSS 를 확인한다**

Next.js 는 `.next/static/chunks/` 에 CSS 를 낸다.

Run: `cd dummy-file-generator && grep -rho -- "--ds-radius-md:[^;]*" .next/static/chunks | head -1`
Expected: `--ds-radius-md:12px`

Run: `cd dummy-file-generator && grep -rho -- "--muted:[^;]*" .next/static/chunks | head -2`
Expected: 라이트 `#37383cb8` 와 다크 값 두 건

Run:
```bash
cd dummy-file-generator && for c in pageShell card topbar brandIcon typeGrid generateBtn; do printf '%-14s %s\n' "$c" "$(grep -rqo "\.$c" .next/static/chunks && echo 있음 || echo '** 사라짐 **')"; done
```
Expected: 6개 전부 "있음"

- [ ] **Step 11: 커밋한다**

```bash
git add dummy-file-generator/app scripts
git commit -m "refactor(dummy-file-generator): consume canonical design system

- theme.css 를 정본 복사본으로 교체. 고유 토큰이 없어 theme.local.css 를
  만들지 않는다 (--danger-bg 는 정본 --danger-surface 로 흡수)
- 브랜드 토큰의 --color- 접두사 제거 20곳. 이 앱만 쓰던 방식이었다
- 5단 텍스트 토큰을 정본 4단으로 흡수 13곳
- 나머지 토큰 이름을 --ds- 접두사로 32곳

정본이 가져오는 의도된 시각 변화:
- placeholder 1.69:1 -> 4.55:1 (--text-assistive 폐기, 가독성 결함 수정)
- --danger 3.44:1 -> 5.32:1 (기존 값은 텍스트로 쓸 수 없었다)
- --muted AA 통과, 다크 표면이 전반적으로 어두워짐"
```

---

### Task 5: dummy-file-generator 프리미티브와 셸 계약

**Files:**
- Create: `dummy-file-generator/app/_lib/constants.ts`
- Modify: `dummy-file-generator/app/_components/generator-client.tsx`
- Modify: `dummy-file-generator/app/styles/components.css`
- Modify: `dummy-file-generator/app/__tests__/layout-classnames.test.ts`

**Interfaces:**
- Consumes: `.ds-icon-btn`·`--ds-container-narrow`·`--ds-page-padding*` (정본)
- Produces: `TOOL_HUB_URL` 상수

**이 앱은 DOM 렌더 테스트를 쓸 수 없다.** `vitest.config.ts` 가 `environment: "node"` 이고 jsdom 이 없다. 기존 `layout-classnames.test.ts` 가 소스 텍스트를 읽어 단정하는 방식이므로 그 관례를 따른다. jsdom 을 추가하는 것은 이 태스크의 범위를 넘는다.

**셸 변경 지점.** 테마 토글이 `position: fixed` 로 화면 우상단에 떠 있다. 정본 헤더 슬롯 계약은 유틸리티 슬롯이 헤더의 마지막 요소여야 한다고 규정하므로 `header.topbar` 안으로 옮긴다.

- [ ] **Step 1: 허브 링크와 토글 위치를 단정하는 실패 테스트를 작성한다**

`dummy-file-generator/app/__tests__/layout-classnames.test.ts` 에 `describe` 를 추가한다. 상단의 `generatorClientPath`·`cssSource` 상수를 재사용한다.

```ts
const constantsPath = path.join(projectRoot, "app/_lib/constants.ts");

describe("shell contract", () => {
  it("브랜드 블록이 Tool Hub 로 돌아가는 링크다", () => {
    const constantsSource = fs.readFileSync(constantsPath, "utf8");
    const componentSource = fs.readFileSync(generatorClientPath, "utf8");

    expect(constantsSource).toContain('"https://tool-hub-rho.vercel.app/"');
    expect(componentSource).toContain("href={TOOL_HUB_URL}");
  });

  it("테마 토글이 헤더 안에 있고 정본 프리미티브를 쓴다", () => {
    const componentSource = fs.readFileSync(generatorClientPath, "utf8");
    const cssSource = fs.readFileSync(layoutCssPath, "utf8");

    expect(componentSource).toContain('className="ds-icon-btn"');
    // 화면에 떠 있던 고정 위치 토글은 헤더 유틸리티 슬롯으로 이동했다
    expect(componentSource).not.toContain("globalThemeBtn");
    expect(cssSource).not.toContain(".globalThemeBtn");
  });
});
```

- [ ] **Step 2: 테스트가 실패하는 것을 확인한다**

Run: `cd dummy-file-generator && npm run test -- app/__tests__/layout-classnames.test.ts`
Expected: FAIL — `ENOENT` (`app/_lib/constants.ts` 가 없음)

- [ ] **Step 3: 상수를 만든다**

`dummy-file-generator/app/_lib/constants.ts`:

```ts
/**
 * Tool Hub 랜딩. 모든 도구의 헤더 브랜드 블록이 여기로 돌아간다.
 * 도구들이 각각 다른 Vercel 도메인에 배포되므로 절대 URL 이어야 한다.
 */
export const TOOL_HUB_URL = "https://tool-hub-rho.vercel.app/";
```

- [ ] **Step 4: 토글을 헤더로 옮기고 브랜드를 허브 링크로 감싼다**

`generator-client.tsx` 전체를 다음으로 바꾼다.

```tsx
/**
 * 더미 파일 생성기 진입점: 셸과 테마를 소유하고 폼을 조립한다.
 */
"use client";

import { useTheme } from "@/app/_hooks/use-theme";
import { TOOL_HUB_URL } from "@/app/_lib/constants";
import { BrandIcon, MoonIcon, SunIcon } from "./icons";
import GeneratorForm from "./GeneratorForm";

export default function GeneratorClient() {
  const { theme, toggle: toggleTheme, mounted } = useTheme();

  return (
    <main className="pageShell">
      <section className="card">
        <header className="topbar">
          {/* 브랜드 슬롯 — 전체가 허브로 돌아가는 링크다. */}
          <a href={TOOL_HUB_URL} className="brandBlock" aria-label="Tool Hub 로 이동">
            <div className="brandIcon" aria-hidden="true">
              <BrandIcon />
            </div>
            <div>
              <h1>Dummy File Generator</h1>
              <p>테스트 업로드용 더미 파일을 생성합니다.</p>
            </div>
          </a>

          {/* 유틸리티 슬롯 — 테마 토글이 헤더의 마지막 요소다. */}
          <button
            className="ds-icon-btn"
            type="button"
            onClick={toggleTheme}
            aria-label="테마 전환"
            aria-pressed={mounted && theme === "dark"}
          >
            {mounted ? (theme === "dark" ? <SunIcon /> : <MoonIcon />) : <span className="themeIconPlaceholder" />}
          </button>
        </header>

        <GeneratorForm />
      </section>
    </main>
  );
}
```

- [ ] **Step 5: `components.css` 의 셸 규칙을 정본 계약에 맞춘다**

`.topbar` 는 이제 브랜드 슬롯과 유틸리티 슬롯 두 자식을 가지므로 사이를 벌린다. 2행 아래에 `.brandBlock` 을 새로 추가한다.

```css
/* ── Header ── */
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--line-subtle);
  margin-bottom: 22px;
}

/* 브랜드 슬롯. 전체가 링크이므로 밑줄과 색을 상속으로 되돌린다. */
.brandBlock {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  text-decoration: none;
  color: inherit;
}
```

- [ ] **Step 6: `.globalThemeBtn` 정의를 삭제한다**

62~93행의 `.globalThemeBtn`, `.globalThemeBtn:hover`, `.globalThemeBtn:focus-visible`, `.globalThemeBtn svg` 네 블록을 **삭제**한다. `.ds-icon-btn` 이 전부 대체한다. `.themeIconPlaceholder` 는 하이드레이션 대응이므로 남긴다 — `<span>` 이라 정본 `.ds-icon-btn > svg` 규칙에 걸리지 않는다.

- [ ] **Step 7: 브랜드 타이포와 셸 컨테이너를 정본 토큰으로 바꾼다**

`h1` 과 `.topbar p` 를 정본 스케일로 바꾼다.

```css
h1 {
  font-size: var(--ds-font-size-title);
  line-height: var(--ds-line-height-title);
  letter-spacing: var(--ds-tracking-title);
  font-weight: 700;
  color: var(--text);
}

.topbar p {
  margin-top: 3px;
  color: var(--muted);
  font-size: var(--ds-font-size-body);
  line-height: var(--ds-line-height-body);
}
```

`h1` 이 `1.375rem`(22px)에서 `1.25rem`(20px)으로 줄고 자간 `-0.01em` 이 붙는다.

`.pageShell` 과 `.card` 를 정본 여백·컨테이너 토큰으로 바꾼다.

```css
.pageShell {
  min-height: 100vh;
  width: 100%;
  display: grid;
  place-items: center;
  padding: var(--ds-page-padding-mobile);
}

@media (min-width: 768px) {
  .pageShell {
    padding: var(--ds-page-padding);
  }
}

.card {
  width: min(var(--ds-container-narrow), 100%);
  border-radius: var(--ds-radius-lg);
  background: var(--surface);
  border: 1px solid var(--line-subtle);
  box-shadow: var(--ds-shadow-md);
  padding: 28px;
}
```

카드 폭 560px 은 그대로다(`--ds-container-narrow` = 560px). 페이지 여백이 `24px 16px` 에서 모바일 12px / 데스크톱 24px 로 바뀐다.

- [ ] **Step 8: 테스트가 통과하는 것을 확인한다**

Run: `cd dummy-file-generator && npm run test -- app/__tests__/layout-classnames.test.ts`
Expected: PASS — 3개 테스트

- [ ] **Step 9: 잔존 참조를 확인한다**

Run: `cd dummy-file-generator && grep -rn "globalThemeBtn" app/`
Expected: 출력 없음

Run: `cd dummy-file-generator && grep -rn "1.375rem\|min(560px" app/styles/components.css`
Expected: 출력 없음

- [ ] **Step 10: 전체 검증을 실행한다**

Run: `cd dummy-file-generator && mise run check`
Expected: test·lint·typecheck·build 전부 exit 0

- [ ] **Step 11: 산출 CSS 를 확인한다**

Run: `cd dummy-file-generator && grep -rho "width:min(var(--ds-container-narrow),100%)" .next/static/chunks | head -1`
Expected: 한 건 출력

Run: `cd dummy-file-generator && grep -rho -- "--ds-container-narrow:560px" .next/static/chunks | head -1`
Expected: `--ds-container-narrow:560px`

Run: `cd dummy-file-generator && grep -rho "globalThemeBtn" .next/static/chunks | head -1`
Expected: 출력 없음

- [ ] **Step 12: 커밋한다**

```bash
git add dummy-file-generator/app
git commit -m "feat(dummy-file-generator): apply shell contract and primitives

- 브랜드 블록을 Tool Hub 허브 링크로 (도구 앱에 없던 복귀 경로)
- 화면 우상단에 position:fixed 로 떠 있던 테마 토글을 헤더 유틸리티 슬롯으로
  옮기고 .ds-icon-btn 으로 교체 (40px -> 36px)
- 브랜드 타이포를 정본 토큰으로 (h1 22px -> 20px, 자간 -0.01em)
- .pageShell 여백과 .card 폭을 정본 토큰으로 (카드 560px 유지)
- 정본과 중복되는 .globalThemeBtn 네 블록 제거

이 앱은 vitest 가 environment: node 라 DOM 렌더 테스트를 쓸 수 없어
기존 layout-classnames.test.ts 의 소스 텍스트 단정 관례를 따른다."
```

---

## 완료 확인

Task 5 이후 다음이 성립해야 한다. 4차 계획서를 쓰기 전 게이트다.

- [ ] `npm run tokens:test` exit 0 (스크립트 단위 테스트 7건)
- [ ] `npm run tokens:check` exit 0 (정본과 5개 앱 복사본 일치)
- [ ] `cd sign-maker && mise run check` exit 0
- [ ] `cd json-yaml-converter && mise run check` exit 0
- [ ] `cd ddl-seed-generator && mise run check` exit 0
- [ ] `cd openapi-editor && mise run check` exit 0, 그리고 `npm run test:e2e` 5회 연속 전부 통과
- [ ] `cd dummy-file-generator && mise run check` exit 0
- [ ] `openapi-editor` 에서 ToolHub Sans 가 실제로 로드된다(빌드 산출물에 woff2 존재)
- [ ] 두 앱의 산출 CSS 에서 정본 토큰이 참조된다
- [ ] 라이트·다크 양쪽에서 두 앱을 1280px 과 390px 로 육안 확인. `mise run dev` 후 헤더·패널·버튼·입력·팝오버
- [ ] 두 앱에서 브랜드 블록 클릭으로 Tool Hub 로 이동한다
- [ ] `dummy-file-generator` 의 테마 토글이 헤더 안에 있고 화면에 떠 있지 않다

## 알려진 위험

- **`openapi-editor` 의 폰트 변경이 E2E 의 36px 높이 단정을 깰 수 있다.** 컨트롤 높이가 폰트 메트릭에 의존하면 ToolHub Sans 적용으로 달라진다. Task 2 Step 11 에서 확인하고, 깨지면 `line-height: 1` 을 명시해 높이를 폰트에서 분리한다.
- **`openapi-editor` 의 radius 4·6·7px → 8px 상향은 8종을 3단으로 줄이는 과정의 손실이다.** 작은 내부 요소가 다소 둥글어진다. 육안 확인 대상이다.
- **Task 1 의 flow 매핑 입력이 실패할 수 있다.** 한 줄 `insertText` 는 2차 실측에서 항상 정확히 입력됐지만 flow 매핑의 `{` 가 Monaco 의 괄호 자동완성을 타는지는 확인하지 않았다. Step 6 의 5회 검증에서 드러난다. 실패하면 추측으로 다음 수정을 시도하지 말고 그 실행의 출력을 보고한다.
- **`sed` 치환 순서가 중요한 곳이 두 곳 있다.** Task 4 Step 5 의 `--color-primary-*` 는 `--color-primary` 보다 **먼저** 치환해야 한다. Step 6 의 `--text-alternative`·`--text-assistive`·`--text-disable` 도 `--text-normal` 보다 먼저다. 짧은 이름을 먼저 치환하면 긴 이름의 접두사만 바뀌어 깨진다.
- **`dummy-file-generator` 는 DOM 렌더 테스트가 없다.** 소스 텍스트 단정과 산출 CSS `grep`, 육안 확인이 유일한 가드다.
- **`mise run install` 후 Playwright 브라우저가 사라질 수 있다.** `openapi-editor` 는 Task 1 Step 1 에서 `npx playwright install chromium` 을 함께 실행한다.
