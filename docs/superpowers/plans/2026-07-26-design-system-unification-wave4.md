# Design System Unification Implementation Plan (4/5: config-diff-viewer · home · 문서)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `config-diff-viewer`와 `home`을 정본 디자인 시스템 소비자로 전환해 Tailwind 앱 7개를 모두 완료하고, 문서를 새 구조에 맞게 갱신한다.

**Architecture:** 1차 계획서에서 만든 `packages/design-system/` 정본 4파일과 `scripts/sync-design-tokens.mjs`를 그대로 쓴다. `config-diff-viewer`는 927줄 CSS의 토큰 이전과 drawer의 `<dialog>` 재작성이 핵심이고, `home`은 `@theme`(값 직접 선언)에서 `:root` + `@theme inline`(런타임 교체) 구조로 바꾸는 것이 핵심이다. 구조가 바뀌면 다크 대응이 토큰 교체로 처리되므로 TSX에 흩어진 `dark:` 변형 53곳이 대부분 사라진다.

**Tech Stack:** Tailwind CSS 4.2.4, Node 24.13.0, Vitest, TypeScript, React 19, Next.js(config-diff-viewer), Vite(home), mise.

**선행 문서:**
- 설계: [2026-07-25-design-system-unification-design.md](../specs/2026-07-25-design-system-unification-design.md)
- 1차: [2026-07-25-design-system-unification.md](2026-07-25-design-system-unification.md)
- 2차: [2026-07-26-design-system-unification-wave2.md](2026-07-26-design-system-unification-wave2.md)
- 3차: [2026-07-26-design-system-unification-wave3.md](2026-07-26-design-system-unification-wave3.md)

**범위:** 설계 문서 마이그레이션 단계 9·10·11.

**비대상:** `webpage-capture-tool`. 바닐라 CSS(682줄)에 Tailwind가 없고 다크모드도 없으며 Electron `file://` 폰트 경로 제약이 있어 작업 모양이 나머지와 전혀 다르다. 5차 계획서에서 다룬다.

**타이포 스케일의 적용 범위.** 헤더 슬롯 계약이 규정하는 `h1`(`--ds-font-size-title`)과 설명문(`--ds-font-size-body`), 그리고 `home` 히어로(`--ds-font-size-display`)만 적용한다. 두 앱에 남은 나머지 font-size를 5단으로 수렴하는 작업은 셸 계약과 독립적이므로 별도로 남긴다.

## Global Constraints

- 작업 디렉터리는 워크트리 `/Users/dongjin/dev/project/tool-hub/.claude/worktrees/design-system-unification`, 브랜치 `feat/design-system-unification`이다. 메인 체크아웃으로 `cd` 하지 않는다.
- **앱의 `styles/ds-*.css`와 `styles/ds-sync.test.ts`를 직접 편집하지 않는다.** 생성물이다. 정본을 고친 뒤 저장소 루트에서 `npm run tokens:sync`를 실행한다.
- **Tailwind 테마 네임스페이스와 겹치는 토큰은 `--ds-` 접두사를 쓴다.** `--ds-font-sans`, `--ds-font-size-*`, `--ds-line-height-*`, `--ds-tracking-*`, `--ds-radius-*`, `--ds-shadow-*`, `--ds-ease-*`, `--ds-duration-*`, `--ds-z-*`, `--ds-container-*`, `--ds-page-padding*`.
- **색 토큰은 접두사를 붙이지 않는다.** `--bg`, `--surface`, `--surface-2`, `--surface-3`, `--fill*`, `--line*`, `--control-border`, `--text`, `--text-neutral`, `--muted`, `--disabled`, `--primary*`, `--on-primary`, `--danger*`, `--success*`, `--warning*`.
- **`--brand-gradient`는 정본에 두지 않는다.** `home` 전용 랜딩 장식이므로 `home/src/styles/theme.local.css`에 둔다.
- 정본이 정의하지 않은 Tailwind radius/shadow 단계는 사용 금지. 정본 `ds-sync.test.ts`가 강제한다.
- 모든 직접 조작 요소는 **36px** 높이를 유지한다.
- 포커스링은 정본 `ds-base.css`의 전역 `:where(...):focus-visible` 규칙이 담당한다. 앱에서 중복 선언하지 않는다.
- disabled는 `opacity`로 표현하지 않고 `--disabled` + `--fill-subtle` 토큰을 쓴다.
- **타이포는 Tailwind 유틸리티가 아니라 CSS에서 토큰으로 쓴다.** Tailwind v4는 유틸리티를 `@layer utilities`에 넣고 CSS 캐스케이드 레이어 규칙상 레이어 밖 스타일이 이긴다. `font-size`나 `letter-spacing`을 지정하는 기존 클래스가 있으면 유틸리티가 조용히 무시된다.
- **모달은 `<dialog>` + `showModal()`을 쓴다.** 브라우저 top layer에 렌더되어 포커스 트랩·Escape·`::backdrop`을 제공하고 z-index 경쟁에서 빠진다.
- 라이트·다크 양쪽에서 텍스트 4.5:1, non-text control border/focus 3:1을 유지한다.
- 각 태스크의 완료 조건은 해당 앱에서 `mise run check` exit 0이다.
- 허브 URL은 `https://tool-hub-rho.vercel.app/`이다.
- 커밋 메시지는 Conventional Commits를 따른다.

---

## File Structure

| 파일 | 책임 |
|---|---|
| `<app>/styles/ds-*.css`, `<app>/styles/ds-sync.test.ts` | 정본 복사본(생성물, 커밋) |
| `config-diff-viewer/app/styles/theme.local.css` | `--green*`·`--coral`·`--code*` 등 도메인 심각도 램프 |
| `config-diff-viewer/app/_components/rules-drawer.tsx` | `<dialog>` 기반 모달로 재작성 |
| `home/src/styles/theme.local.css` | `--brand-gradient` |
| `home/src/constants.ts` | 기존 파일. `GITHUB_REPO` 옆에 상수 추가 없음 — home은 허브 자신이라 링크가 필요 없다 |
| `scripts/sync-design-tokens.mjs` | `TARGETS`에 두 앱 추가 |
| `docs/frontend-conventions.md` | 규칙 3 개정 |
| `CLAUDE.md` | 루트 명령 문서화, 프로젝트 목록 갱신 |

**`home`은 허브 자신이므로 브랜드 블록을 링크로 만들지 않는다.** 셸 계약이 그렇게 규정한다. 다른 앱들과 달리 `TOOL_HUB_URL` 상수도 필요 없다.

---

### Task 1: config-diff-viewer 정본 도입

**Files:**
- Create: `config-diff-viewer/app/styles/theme.local.css`
- Delete: `config-diff-viewer/app/styles/theme.css`
- Modify: `config-diff-viewer/app/globals.css`
- Modify: `config-diff-viewer/app/styles/base.css`
- Modify: `config-diff-viewer/app/styles/components.css`
- Modify: `scripts/sync-design-tokens.mjs`
- Modify: `scripts/sync-design-tokens.test.mjs`

**Interfaces:**
- Produces: `theme.local.css`에 `--green`·`--green-dark`·`--coral`·`--code`·`--code-line`
- Produces: `TARGETS`에 `'config-diff-viewer': 'app/styles'`

이 앱은 `components.css`가 927줄로 가장 크지만 radius·shadow·motion 토큰이 **하나도 없어** `--ds-` 치환 대상이 0곳이다. 대신 하드코딩된 radius가 34곳(10종)이다.

**의미가 바뀌는 토큰.**

| 기존 | 사용 | 이전 | 이유 |
|---|---|---|---|
| `--yellow` | 9곳 | `--warning` | 색 이름 → 의미 이름. MEDIUM 심각도 |
| `--green` | 14곳 | `theme.local.css` 유지 | 정본 `--success`와 값이 다르고(`#0e8a43` vs `#18794e`) 이 앱은 "추가됨/제안" 의미로 쓴다. 램프의 일부라 도메인 고유다 |
| `--green-dark` | 1곳 | `theme.local.css` 유지 | 위와 같은 램프 |
| `--coral` | 3곳 | `theme.local.css` 유지 | HIGH 심각도. `--warning`(MEDIUM)과 `--danger`(CRITICAL) 사이 단계 |
| `--code`·`--code-line` | 2곳 | `theme.local.css` | 코드 표면은 도메인 고유 |
| `--soft` | 1곳 | `--muted` | 정본에서 폐기. `.ruleId` 코드 텍스트 1.69:1 가독성 결함 수정 |

**`--green`을 정본 `--success`로 흡수하지 않는 이유.** 이 앱의 색은 심각도 램프(`--danger` CRITICAL → `--coral` HIGH → `--yellow` MEDIUM)와 상태(`--green` 추가됨/OK)로 나뉜다. `--yellow`는 MEDIUM이라는 의미가 정본 `--warning`과 일치하지만 `--green`은 "성공"이 아니라 "추가된 항목"을 뜻하고 값도 다르다. 억지로 흡수하면 색이 바뀌고 의미도 흐려진다.

**의도된 시각 변화.**

| 항목 | 기존 | 정본 | 변화 |
|---|---|---|---|
| `--muted` 라이트 | `rgba(55,56,60,.61)` 3.66:1 | `rgba(55,56,60,.72)` | AA 통과. 34곳에 영향 |
| `--soft` → `--muted` | `rgba(55,56,60,.40)` 2.18:1 | 4.55:1 | `.ruleId` 가독성 결함 수정 |
| `--bg` 다크 | `#1b1c1e` | `rgb(15,15,16)` | 페이지가 더 어두워짐 |
| `--surface` 다크 | `#212225` | `rgb(27,28,30)` | 카드가 더 어두워짐 |
| `--line` 다크 | `rgba(174,176,182,.18)` | `rgba(112,115,124,.32)` | 경계선이 진해짐 |
| `--line-strong` 라이트 | `rgba(112,115,124,.45)` | `rgba(112,115,124,.52)` | 미세하게 진해짐 |
| radius | 3·4·5·6·8·9·10·12·14·20px | 8·12·16px | 작은 요소가 둥글어지고 큰 요소가 덜 둥글어짐 |
| shadow 토큰 | 없음 | 다크 오버라이드 포함 | 다크에서 그림자가 보이게 됨 |

- [ ] **Step 1: 의존성을 설치하고 baseline을 확인한다**

Run: `cd config-diff-viewer && mise run install && mise run check`
Expected: exit 0. baseline이 실패하면 진행하지 말고 보고한다.

- [ ] **Step 2: `TARGETS`에 앱을 추가한다**

`scripts/sync-design-tokens.mjs`:

```js
export const TARGETS = {
  'sign-maker': 'src/styles',
  'json-yaml-converter': 'src/styles',
  'ddl-seed-generator': 'app/styles',
  'openapi-editor': 'src/styles',
  'dummy-file-generator': 'app/styles',
  'config-diff-viewer': 'app/styles',
};
```

`scripts/sync-design-tokens.test.mjs`의 단정도 맞춘다.

```js
  test('TARGETS 는 마이그레이션된 앱만 담는다', () => {
    assert.deepEqual(Object.keys(TARGETS), [
      'sign-maker',
      'json-yaml-converter',
      'ddl-seed-generator',
      'openapi-editor',
      'dummy-file-generator',
      'config-diff-viewer',
    ]);
  });
```

Run: `npm run tokens:test && npm run tokens:sync`
Expected: 테스트 7건 통과 후 `config-diff-viewer/app/styles/`에 4건 생성

- [ ] **Step 3: `theme.local.css`를 만든다**

```css
/* config-diff-viewer 고유 토큰. 정본 뒤에 로드되어 정본을 덮을 수 있다.
   여기 있는 토큰이 3개 이상 앱에서 반복되면 정본으로 승격한다. */

:root {
  /* 심각도 램프의 중간 단계. 정본은 --danger(CRITICAL)와 --warning(MEDIUM)만
     제공하므로 HIGH 는 여기서 유지한다. */
  --coral: #c2410c;

  /* 추가된 항목 / OK 상태. 정본 --success 와 값이 다르고 의미도
     "성공"이 아니라 "추가됨"이므로 흡수하지 않는다. */
  --green: #0e8a43;
  --green-dark: #0b6e36;

  /* 코드 표면 */
  --code: #171717;
  --code-line: #2e2f33;
}

[data-theme="dark"] {
  --coral: #ff8a5c;
  --green: #34c77b;
  --green-dark: #1ea860;
  --code: #0f1010;
  --code-line: #2a2b2f;
}
```

- [ ] **Step 4: 진입 CSS를 교체하고 기존 `theme.css`를 삭제한다**

`config-diff-viewer/app/globals.css` 전체를 다음으로 바꾼다.

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

Run: `git rm config-diff-viewer/app/styles/theme.css`

- [ ] **Step 5: `base.css`의 폰트를 토큰으로 바꾸고 중복 규칙을 제거한다**

`body` 블록의 하드코딩된 폰트 스택을 토큰으로 바꾼다.

```css
body {
  min-height: 100vh;
  background-color: var(--bg);
  color: var(--text);
  font-family: var(--ds-font-sans);
  -webkit-font-smoothing: antialiased;
  letter-spacing: 0;
}
```

그리고 두 블록을 **삭제**한다. 정본 `ds-base.css`가 대체한다.

```css
/* 포커스 — 2px primary 아웃라인, 2px offset */
:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
  border-radius: 4px;
}
```

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

파일 끝의 `h1` 블록은 정본 타이포로 바꾼다.

```css
h1 {
  font-size: var(--ds-font-size-title);
  line-height: var(--ds-line-height-title);
  letter-spacing: var(--ds-tracking-title);
  font-weight: 700;
}
```

`clamp(1.3rem, 2.4vw, 1.9rem)`에서 고정 `1.25rem`으로 바뀐다. 최대 크기가 30.4px → 20px로 줄어든다.

- [ ] **Step 6: `--yellow`를 `--warning`으로, `--soft`를 `--muted`로 옮긴다**

Run:
```bash
cd config-diff-viewer && sed -i '' \
  -e 's/var(--yellow)/var(--warning)/g' \
  -e 's/var(--soft)/var(--muted)/g' \
  app/styles/components.css
```

- [ ] **Step 7: 하드코딩된 radius를 정본 스케일로 흡수한다**

10종(3·4·5·6·8·9·10·12·14·20px)을 3단으로 모은다. 6px 이하는 작은 내부 요소이므로 `sm`(8px), 8~12px은 컨트롤이므로 `md`(12px), 14px 이상은 카드이므로 `lg`(16px)로 간다.

Run:
```bash
cd config-diff-viewer && sed -i '' \
  -e 's/border-radius: 3px/border-radius: var(--ds-radius-sm)/g' \
  -e 's/border-radius: 4px/border-radius: var(--ds-radius-sm)/g' \
  -e 's/border-radius: 5px/border-radius: var(--ds-radius-sm)/g' \
  -e 's/border-radius: 6px/border-radius: var(--ds-radius-sm)/g' \
  -e 's/border-radius: 8px/border-radius: var(--ds-radius-md)/g' \
  -e 's/border-radius: 9px/border-radius: var(--ds-radius-md)/g' \
  -e 's/border-radius: 10px/border-radius: var(--ds-radius-md)/g' \
  -e 's/border-radius: 12px/border-radius: var(--ds-radius-md)/g' \
  -e 's/border-radius: 14px/border-radius: var(--ds-radius-lg)/g' \
  -e 's/border-radius: 20px/border-radius: var(--ds-radius-lg)/g' \
  app/styles/components.css
```

`border-radius: 50%`와 `border-radius: 999px`는 원형·pill이므로 그대로 둔다.

- [ ] **Step 8: 잔존 참조를 확인한다**

Run: `cd config-diff-viewer && grep -nE "var\(--(yellow|soft)\)" app/styles/components.css`
Expected: 출력 없음

Run: `cd config-diff-viewer && grep -nE "border-radius: [0-9]+px" app/styles/components.css`
Expected: 출력 없음

Run: `cd config-diff-viewer && grep -c "var(--warning)" app/styles/components.css`
Expected: `9`

- [ ] **Step 9: 전체 검증을 실행한다**

Run: `cd config-diff-viewer && mise run check`
Expected: test·lint·typecheck·build 전부 exit 0

- [ ] **Step 10: 산출 CSS를 확인한다**

Next.js는 `.next/static/chunks/`에 CSS를 낸다.

Run: `cd config-diff-viewer && grep -rho -- "--ds-radius-md:[^;]*" .next/static/chunks | head -1`
Expected: `--ds-radius-md:12px`

Run: `cd config-diff-viewer && grep -rho -- "--coral:[^;]*" .next/static/chunks | head -2`
Expected: 라이트 `#c2410c`와 다크 값 두 건

Run:
```bash
cd config-diff-viewer && for c in topbar workspace resultPanel statsBar issueBadge ruleCard; do printf '%-14s %s\n' "$c" "$(grep -rqo "\.$c" .next/static/chunks && echo 있음 || echo '** 사라짐 **')"; done
```
Expected: 6개 전부 "있음"

- [ ] **Step 11: 커밋한다**

```bash
git add config-diff-viewer/app scripts
git commit -m "refactor(config-diff-viewer): consume canonical design system

- theme.css 를 정본 복사본으로 교체. 심각도 램프(--coral HIGH, --green 추가됨)와
  --code* 를 theme.local.css 로 내린다
- --yellow(MEDIUM) 9곳을 정본 --warning 으로. 의미가 일치한다
- --green 은 흡수하지 않는다. 정본 --success 와 값이 다르고 '성공'이 아니라
  '추가된 항목'을 뜻한다
- --soft 폐기에 따라 .ruleId 를 --muted 로 (1.69:1 -> 4.55:1 가독성 결함 수정)
- 하드코딩 radius 34곳(10종)을 정본 3단으로
- base.css 의 포커스링·prefers-reduced-motion 중복 제거, h1 을 정본 타이포로

정본이 가져오는 의도된 시각 변화:
- --muted AA 통과 (34곳), 다크 표면이 전반적으로 어두워짐
- h1 최대 30.4px -> 20px, 다크 shadow 오버라이드 추가"
```

---

### Task 2: config-diff-viewer drawer를 `<dialog>`로 전환

**Files:**
- Modify: `config-diff-viewer/app/_components/rules-drawer.tsx`
- Modify: `config-diff-viewer/app/styles/components.css`

**Interfaces:**
- Consumes: 정본 토큰 (Task 1)
- `RulesDrawer` 의 props(`open`·`onClose`)는 바꾸지 않는다. 호출부 `config-diff-client.tsx:214`는 수정하지 않는다.

**왜 바꾸는가.** 현재 drawer에 포커스 트랩·Escape·`role="dialog"`·`aria-modal`이 전부 없다. 백드롭 클릭만으로 닫히고 키보드 사용자는 갇힌다. `<dialog>` + `showModal()`이 이 넷을 모두 제공하고, top layer에 렌더되어 z-index 경쟁에서도 빠진다.

**이 앱은 DOM 렌더 테스트가 없다.** `vitest.config.ts`가 `environment: "node"`이고 테스트는 `lib/differ.test.ts` 하나뿐이다. jsdom을 추가하는 것은 이 태스크의 범위를 넘으므로 산출 CSS `grep`과 육안·키보드 확인이 가드다.

- [ ] **Step 1: `rules-drawer.tsx`를 `<dialog>` 기반으로 재작성한다**

`open`/`onClose` 인터페이스는 유지한다. 파일 상단 import와 컴포넌트 시작부를 바꾼다.

```tsx
/**
 * 탐지 규칙과 위험 설정 목록을 설명하는 모달이다.
 *
 * <dialog> + showModal() 을 쓴다. 포커스 트랩·Escape·::backdrop 을 브라우저가
 * 제공하고 top layer 에 렌더되어 z-index 경쟁에서 빠진다.
 */
"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import IssueBadge from "./issue-badge";
import { ALL_RULE_DEFINITIONS, type RuleCategory } from "@/lib/validator";
import {
  SECRET_KEY_PATTERNS_META,
  SECRET_VALUE_PATTERNS_META,
} from "@/lib/detector";
```

컴포넌트 본문의 시작을 바꾼다. `if (!open) return null` 은 제거한다 — ref 가 있어야 `showModal()` 을 부를 수 있다.

```tsx
export default function RulesDrawer({ open, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [tab, setTab] = useState<DrawerTab>("danger");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const filtered =
    categoryFilter === "all"
      ? ALL_RULE_DEFINITIONS
      : ALL_RULE_DEFINITIONS.filter((r) => r.category === categoryFilter);

  return (
    <dialog
      ref={dialogRef}
      className="rulesDrawer"
      aria-labelledby="rulesDrawerTitle"
      // Escape 와 백드롭 클릭 모두 close 이벤트로 수렴한다.
      onClose={onClose}
      onClick={(event) => {
        if (event.target === dialogRef.current) dialogRef.current?.close();
      }}
    >
      {/* 규칙 목록이 크므로 열려 있을 때만 렌더한다. dialog 자체는 항상 남아
          ref 가 유지된다. */}
      {open && (
        <>
          {/* Header */}
          <div className="drawerHeader">
            <div>
              <strong id="rulesDrawerTitle">탐지 규칙 목록</strong>
              <span className="drawerSubtitle">비교 시 적용되는 모든 규칙을 확인합니다.</span>
            </div>
            <button
              className="drawerCloseBtn"
              onClick={() => dialogRef.current?.close()}
              aria-label="닫기"
            >
              <X size={18} />
            </button>
          </div>
```

- [ ] **Step 2: 본문의 나머지를 `{open && (...)}` 안으로 옮기고 닫는다**

기존 `{/* Tab bar */}` 부터 `</div>`(drawerBody 닫힘)까지는 그대로 두고, 마지막의 `</aside>` 와 `</>` 를 다음으로 바꾼다.

```tsx
        </>
      )}
    </dialog>
  );
}
```

즉 기존 구조에서 바뀌는 것은 감싸는 요소(`<>` + `.drawerBackdrop` + `<aside>` → `<dialog>`)와 조건 렌더 위치뿐이다. 탭 바·필터·규칙 카드 마크업은 손대지 않는다.

- [ ] **Step 3: 백드롭 div가 사라졌는지 확인한다**

Run: `cd config-diff-viewer && grep -n "drawerBackdrop" app/_components/rules-drawer.tsx`
Expected: 출력 없음

Run: `cd config-diff-viewer && grep -n "aside" app/_components/rules-drawer.tsx`
Expected: 출력 없음

- [ ] **Step 4: `.rulesDrawer`를 `<dialog>`용으로 다시 쓴다**

`components.css`의 `.drawerBackdrop`와 `.rulesDrawer` 두 블록을 다음으로 **교체**한다.

```css
/* ── Rules drawer (<dialog> 기반 모달) ──
   top layer 에 렌더되므로 z-index 가 필요 없다. */
.rulesDrawer {
  position: fixed;
  inset: 0 0 0 auto;              /* 우측 정렬 */
  width: min(600px, 92vw);
  max-width: none;                /* dialog 기본 max-width 해제 */
  max-height: none;               /* dialog 기본 max-height 해제 */
  height: 100%;
  margin: 0;                       /* dialog 기본 margin: auto 해제 */
  padding: 0;
  border: 0;
  border-left: 1px solid var(--line);
  background: var(--surface);
  color: var(--text);
  box-shadow: -16px 0 48px rgba(23, 23, 25, 0.14), -4px 0 12px rgba(23, 23, 25, 0.08);
  animation: slideInRight var(--ds-duration-slow) var(--ds-ease-emphasized);
}

/* display 는 [open] 에만 준다. 무조건 주면 닫힌 상태의 UA 기본값
   display: none 을 덮어 dialog 가 항상 보인다. */
.rulesDrawer[open] {
  display: flex;
  flex-direction: column;
}

.rulesDrawer::backdrop {
  background: rgba(23, 23, 25, 0.4);
  animation: fadeIn var(--ds-duration-base) var(--ds-ease-standard);
}
```

- [ ] **Step 5: 애니메이션 키프레임의 하드코딩 duration을 정리한다**

`slideInRight` 와 `fadeIn` 키프레임 정의는 그대로 두고, 다른 곳에서 `0.18s`·`0.22s` 로 직접 쓰던 참조가 남았는지 확인한다.

Run: `cd config-diff-viewer && grep -nE "slideInRight|fadeIn" app/styles/components.css`
Expected: `@keyframes` 정의와 `.rulesDrawer`·`.rulesDrawer::backdrop` 의 참조만 출력. `0.18s`·`0.22s` 리터럴이 남아 있으면 그 줄을 정본 토큰으로 바꾼다.

- [ ] **Step 6: 전체 검증을 실행한다**

Run: `cd config-diff-viewer && mise run check`
Expected: test·lint·typecheck·build 전부 exit 0

- [ ] **Step 7: 산출 CSS에서 `<dialog>` 규칙을 확인한다**

Run: `cd config-diff-viewer && grep -rho "\.rulesDrawer\[open\]{[^}]*}" .next/static/chunks | head -1`
Expected: `display:flex` 를 포함한 규칙 출력

Run: `cd config-diff-viewer && grep -rho "\.rulesDrawer::backdrop{[^}]*}" .next/static/chunks | head -1`
Expected: 백드롭 배경 규칙 출력

Run: `cd config-diff-viewer && grep -rho "drawerBackdrop" .next/static/chunks | head -1`
Expected: 출력 없음

- [ ] **Step 8: 키보드 동작을 육안 확인한다**

Run: `cd config-diff-viewer && mise run dev`

브라우저에서 확인한다.

1. 규칙 목록 버튼을 눌러 모달을 연다
2. `Escape` 를 누르면 닫힌다 (기존에는 닫히지 않았다)
3. 모달이 열린 동안 `Tab` 을 반복해도 포커스가 모달 밖으로 나가지 않는다 (포커스 트랩)
4. 백드롭을 클릭하면 닫힌다
5. 닫은 뒤 포커스가 여는 버튼으로 돌아온다 (`<dialog>` 기본 동작)
6. 라이트·다크 양쪽에서 백드롭과 패널 표면이 정상이다

- [ ] **Step 9: 커밋한다**

```bash
git add config-diff-viewer/app
git commit -m "refactor(config-diff-viewer): rewrite rules drawer as a native dialog

기존 drawer 에 포커스 트랩·Escape·role=dialog·aria-modal 이 전부 없었다.
백드롭 클릭만으로 닫히고 키보드 사용자는 갇혔다.

- <dialog> + showModal() 로 전환. 포커스 트랩·Escape·::backdrop·포커스 복귀를
  브라우저가 제공하고 top layer 에 렌더되어 z-index 경쟁에서 빠진다
- .drawerBackdrop div 를 ::backdrop 으로 대체
- display 는 [open] 에만 준다. 무조건 주면 닫힌 상태의 UA 기본값
  display: none 을 덮어 항상 보인다
- open/onClose props 는 유지해 호출부를 바꾸지 않는다

이 앱은 vitest 가 environment: node 라 DOM 렌더 테스트가 없다. 산출 CSS
grep 과 키보드 육안 확인이 가드다."
```

---

### Task 3: config-diff-viewer 프리미티브와 셸 계약

**Files:**
- Create: `config-diff-viewer/app/_lib/constants.ts`
- Modify: `config-diff-viewer/app/_components/Topbar.tsx`
- Modify: `config-diff-viewer/app/styles/components.css`

**Interfaces:**
- Consumes: `.ds-icon-btn`·`--ds-container-wide`·`--ds-page-padding*` (정본)
- Produces: `TOOL_HUB_URL` 상수

- [ ] **Step 1: 상수를 만든다**

`config-diff-viewer/app/_lib/constants.ts`:

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

28~36행의 브랜드 블록을 다음으로 바꾼다. 내부 마크업은 유지하고 감싸는 요소만 `<div>` 에서 `<a>` 로 바꾼다.

```tsx
      <a href={TOOL_HUB_URL} className="brandBlock" aria-label="Tool Hub 로 이동">
        <div className="brandIcon" aria-hidden="true">
          <FileSearch size={22} />
        </div>
        <div>
          <h1>Config Diff Viewer</h1>
          <p>설정 파일 비교 · 누락 키 · 민감정보 · 위험 설정 탐지</p>
        </div>
      </a>
```

`components.css` 의 `.brandBlock` 규칙에 두 줄을 추가한다.

```css
  text-decoration: none;
  color: inherit;
```

- [ ] **Step 3: 테마 토글을 정본 프리미티브로 바꾼다**

`Topbar.tsx` 의 `className="themeBtn"` 을 `className="ds-icon-btn"` 으로 바꾼다. `themeIconPlaceholder` 는 하이드레이션 대응이므로 유지한다.

```tsx
        <button className="ds-icon-btn" type="button" onClick={onToggleTheme} aria-label="테마 전환">
```

- [ ] **Step 4: `components.css`에서 `.themeBtn` 정의를 삭제한다**

`.themeBtn` 과 `.themeBtn:hover` 두 블록을 삭제한다. `.ds-icon-btn` 이 대체한다. 38px → 36px 로 작아진다.

`.themeIconPlaceholder` 는 남긴다 — `<span>` 이라 정본 `.ds-icon-btn > svg` 규칙에 걸리지 않는다.

- [ ] **Step 5: 컨테이너와 페이지 여백을 토큰으로 옮긴다**

`components.css` 의 `max-width: 1600px` 두 곳을 바꾼다. 값 변화는 없다.

```css
  max-width: var(--ds-container-wide);
```

셸 최외곽은 `.appShell`(2~8행)이다. `padding` 한 줄만 토큰으로 바꾼다. 카드 내부 여백은 그대로 둔다.

```css
.appShell {
  min-height: 100vh;
  padding: var(--ds-page-padding);
  display: flex;
  flex-direction: column;
  gap: 16px;
}
```

데스크톱 여백이 18px 에서 24px 로 바뀐다.

- [ ] **Step 6: 잔존 참조를 확인한다**

Run: `cd config-diff-viewer && grep -rn "themeBtn" app/ | grep -v themeIconPlaceholder`
Expected: 출력 없음

Run: `cd config-diff-viewer && grep -rn "1600px" app/`
Expected: 출력 없음

- [ ] **Step 7: 전체 검증을 실행한다**

Run: `cd config-diff-viewer && mise run check`
Expected: test·lint·typecheck·build 전부 exit 0

- [ ] **Step 8: 산출 CSS를 확인한다**

Run: `cd config-diff-viewer && grep -rho "max-width:var(--ds-container-wide)" .next/static/chunks | head -1`
Expected: 한 건 출력

Run: `cd config-diff-viewer && grep -rho "\.ds-icon-btn{[^}]*}" .next/static/chunks | head -1`
Expected: `width:36px` 를 포함한 규칙 출력

- [ ] **Step 9: 커밋한다**

```bash
git add config-diff-viewer/app
git commit -m "feat(config-diff-viewer): apply shell contract and primitives

- 브랜드 블록을 Tool Hub 허브 링크로 (도구 앱에 없던 복귀 경로)
- 테마 토글을 .ds-icon-btn 으로 (38px -> 36px)
- 컨테이너를 --ds-container-wide 로, 페이지 여백을 --ds-page-padding 으로
- 정본과 중복되는 .themeBtn 정의 제거"
```

---

### Task 4: home 정본 도입과 구조 전환

**Files:**
- Create: `home/src/styles/theme.local.css`
- Delete: `home/src/styles/theme.css`
- Modify: `home/src/index.css`
- Modify: `home/src/styles/base.css`
- Modify: `scripts/sync-design-tokens.mjs`
- Modify: `scripts/sync-design-tokens.test.mjs`

**Interfaces:**
- Produces: `theme.local.css`에 `--brand-gradient`
- Produces: `TARGETS`에 `'home': 'src/styles'`

**이것이 8개 앱 중 유일한 구조 전환이다.** 현재 `theme.css`는 `@theme`만 쓴다 — 값을 직접 선언하므로 Tailwind가 유틸리티에 값을 인라인하고, `:root`/`[data-theme=dark]` 층이 없어 런타임 교체가 불가능하다. 그래서 다크 대응을 `dark:` 변형 53곳으로 처리하고 있다.

정본은 `:root` + `@theme inline` 2층 구조다. 도입하면 토큰이 `[data-theme=dark]`에서 자동 교체되므로 `dark:` 변형 대부분이 불필요해진다. 그 제거는 Task 5에서 한다 — 이 태스크는 **구조만 바꾸고 화면은 기존 `dark:` 변형이 유지시킨다.**

**브랜드 전환.** 기능 토큰 `--primary`가 indigo(`oklch(58.5% 0.233 277.117)`)에서 blue(`#3366ff`)로 바뀐다. 장식 그라디언트는 `--brand-gradient`로 분리해 랜딩 인상을 유지한다.

- [ ] **Step 1: 의존성을 설치하고 baseline을 확인한다**

Run: `cd home && mise run install && mise run check`
Expected: exit 0

- [ ] **Step 2: `TARGETS`에 앱을 추가한다**

`scripts/sync-design-tokens.mjs`:

```js
export const TARGETS = {
  'sign-maker': 'src/styles',
  'json-yaml-converter': 'src/styles',
  'ddl-seed-generator': 'app/styles',
  'openapi-editor': 'src/styles',
  'dummy-file-generator': 'app/styles',
  'config-diff-viewer': 'app/styles',
  'home': 'src/styles',
};
```

`scripts/sync-design-tokens.test.mjs`의 단정도 맞춘다.

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
    ]);
  });
```

Run: `npm run tokens:test && npm run tokens:sync`
Expected: 테스트 7건 통과 후 `home/src/styles/`에 4건 생성

- [ ] **Step 3: `theme.local.css`를 만든다**

```css
/* home 고유 토큰. 정본 뒤에 로드되어 정본을 덮을 수 있다.
   여기 있는 토큰이 3개 이상 앱에서 반복되면 정본으로 승격한다. */

:root {
  /* 랜딩 장식 전용 그라디언트. 로고 마크와 히어로 텍스트에만 쓴다.
     기능 토큰(--primary)과 역할이 다르므로 분리한다 — 버튼·포커스링·활성
     상태는 7개 앱이 공유하는 --primary 를 쓰고, 이 그라디언트는 허브의
     고유 인상만 담당한다. */
  --brand-gradient: linear-gradient(135deg, #6366f1 0%, #a855f7 55%, #38bdf8 100%);
}

[data-theme="dark"] {
  --brand-gradient: linear-gradient(135deg, #818cf8 0%, #c084fc 55%, #7dd3fc 100%);
}
```

- [ ] **Step 4: 진입 CSS를 교체하고 기존 `theme.css`를 삭제한다**

`home/src/index.css` 전체를 다음으로 바꾼다.

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
@import "./styles/background.css";
@import "./styles/tool-card.css";
```

Run: `git rm home/src/styles/theme.css`

- [ ] **Step 5: `base.css`의 중복을 제거하고 토큰을 바꾼다**

`home/src/styles/base.css` 전체를 다음으로 바꾼다. `color-scheme` 두 줄은 정본 `ds-tokens.css`가 `:root`와 `[data-theme=dark]`에서 이미 선언하므로 삭제한다.

```css
/* 전역 베이스 스타일: 박스 모델 리셋과 html/body 기본값.
   @layer 없이 선언해 Tailwind preflight보다 우선하도록 유지한다.

   color-scheme 은 정본 ds-tokens.css 가 :root 와 [data-theme=dark] 에서
   선언하므로 여기서 반복하지 않는다. */
*, *::before, *::after {
  box-sizing: border-box;
}

html {
  font-family: var(--ds-font-sans);
}

body {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  transition:
    background-color var(--ds-duration-slow) var(--ds-ease-standard),
    color var(--ds-duration-slow) var(--ds-ease-standard);
}
```

테마 전환 transition 이 `0.3s ease` 에서 `--ds-duration-slow`(240ms) 로 60ms 빨라진다.

- [ ] **Step 6: 전체 검증을 실행한다**

이 시점에서 화면은 기존 `dark:` 변형이 유지시킨다. 다만 `bg-canvas`·`text-ink-dark` 같은 유틸리티는 정본에 대응 토큰이 없어 **깨진다** — Task 5에서 고친다. 따라서 이 스텝은 빌드가 통과하는지만 본다.

Run: `cd home && npm run lint && npm run typecheck && npm run build`
Expected: 전부 exit 0

Run: `cd home && npm run test`
Expected: 통과. `App.test.tsx`가 클래스명을 단정하면 실패할 수 있다 — 실패하면 어느 단정인지 보고하고 Task 5에서 함께 고친다.

- [ ] **Step 7: 사라진 유틸리티를 목록으로 만든다**

Task 5의 작업 목록이 된다.

Run:
```bash
cd home && grep -rhoE '\b(bg|text|border|from|via|to|outline|ring)-(canvas|canvas-dark|ink-dark|surface-dark|accent)\b' src --include="*.tsx" | sort | uniq -c
```
Expected: `bg-canvas`·`bg-canvas-dark`·`text-ink-dark`·`bg-surface-dark`·`to-accent` 가 출력된다. 이 이름들은 정본에 없으므로 Task 5에서 전부 정본 토큰으로 옮긴다.

- [ ] **Step 8: 커밋한다**

빌드가 통과하지만 화면은 아직 완전하지 않다. Task 5와 짝을 이루는 중간 커밋임을 메시지에 남긴다.

```bash
git add home/src/index.css home/src/styles scripts
git commit -m "refactor(home): switch to the canonical two-layer token structure

home 은 8개 앱 중 유일하게 @theme 만 써서 값을 직접 선언했다. :root 와
[data-theme=dark] 층이 없어 런타임 교체가 불가능하고, 그래서 다크 대응을
dark: 변형 53곳으로 처리하고 있었다.

- theme.css 를 정본 복사본으로 교체. :root + @theme inline 2층 구조가 되어
  토큰이 [data-theme=dark] 에서 자동 교체된다
- --brand-gradient 를 theme.local.css 로. 랜딩 장식 전용이며 기능 토큰
  --primary 와 역할을 분리한다
- base.css 의 color-scheme 중복 제거, 폰트·transition 을 정본 토큰으로
- TARGETS 에 home 추가

이 커밋은 구조만 바꾼다. bg-canvas·text-ink-dark 등 정본에 없는 유틸리티는
다음 커밋에서 정본 토큰으로 옮긴다."
```

---

### Task 5: home의 `dark:` 변형 붕괴

**Files:**
- Modify: `home/src/components/layout/Header.tsx`
- Modify: `home/src/components/layout/Footer.tsx`
- Modify: `home/src/components/layout/Layout.tsx`
- Modify: `home/src/components/layout/Background.tsx`
- Modify: `home/src/components/ToolCard.tsx`
- Modify: `home/src/components/ui/FilterButton.tsx`
- Modify: `home/src/components/ui/Stat.tsx`
- Modify: `home/src/pages/HomePage.tsx`
- Modify: `home/src/App.test.tsx`

**Interfaces:**
- Consumes: 정본 토큰과 `--brand-gradient` (Task 4)

**핵심 원리.** 정본 토큰은 `[data-theme=dark]`에서 자동 교체된다. 따라서 `bg-canvas dark:bg-canvas-dark` 처럼 라이트·다크 쌍으로 쓰던 유틸리티는 **한 개로 붕괴된다.**

| 기존 | 정본 | 비고 |
|---|---|---|
| `bg-canvas dark:bg-canvas-dark` | `bg-bg` | `--bg` 가 자동 교체 |
| `text-gray-900 dark:text-white` | `text-tx` | `--text` 가 자동 교체 |
| `text-gray-500 dark:text-white/45` | `text-muted` | `--muted` 가 자동 교체 |
| `bg-surface-dark` | `bg-surface` | `--surface` 가 자동 교체 |
| `text-primary dark:text-primary-light` | `text-primary` | `--primary` 가 자동 교체 |
| `border-primary-light` | `border-primary` | 다크에서 `--primary` 가 밝아진다 |
| `from-primary to-accent` | `--brand-gradient` | 장식이므로 CSS 로 옮긴다 |
| `border-black/[0.06] dark:border-white/[0.06]` | `border-line` | `--line` 이 자동 교체 |
| `hover:bg-black/[0.05] dark:hover:bg-white/[0.07]` | `hover:bg-fill` | `--fill` 이 자동 교체 |

- [ ] **Step 1: 붕괴 대상을 파일별로 확인한다**

Run:
```bash
cd home && for f in $(find src -name "*.tsx" | sort); do n=$(grep -o 'dark:' "$f" | wc -l | tr -d ' '); [ "$n" -gt 0 ] && printf '%-46s %s회\n' "${f#src/}" "$n"; done
```
Expected: 8개 파일, 총 53회. 이 목록을 따라 Step 2~9를 진행한다.

- [ ] **Step 2: `Header.tsx`를 정본 토큰으로 바꾼다 (12회)**

로고 마크의 그라디언트는 `--brand-gradient` 를 쓰는 클래스로 옮긴다. `tool-card.css` 옆에 두지 않고 `background.css` 에 넣는다 — 랜딩 장식이라는 성격이 같다.

`home/src/styles/background.css` 끝에 추가한다.

```css
/* 랜딩 브랜드 마크. 기능 토큰이 아니라 장식이므로 --brand-gradient 를 쓴다. */
.brandMark {
  background: var(--brand-gradient);
  color: var(--on-primary);
}
```

`Header.tsx` 전체를 다음으로 바꾼다.

```tsx
/**
 * 홈 상단 헤더: 로고, 테마 토글 버튼, GitHub 링크.
 * 테마 상태는 Layout이 소유하고 props로 주입한다.
 */
import { GitHubIcon, SunIcon, MoonIcon } from '../icons';
import { GITHUB_REPO } from '../../constants';

interface HeaderProps {
  theme: 'dark' | 'light';
  onToggle: () => void;
}

export default function Header({ theme, onToggle }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 bg-bg/85 backdrop-blur-xl border-b border-line">
      <div className="ds-shell h-14 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="brandMark w-7 h-7 rounded-sm flex items-center justify-center shadow-sm">
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <rect x="0.5" y="1.5" width="3" height="10" rx="0.8" fill="white" />
              <rect x="5" y="1.5" width="3" height="10" rx="0.8" fill="white" opacity="0.68" />
              <rect x="9.5" y="1.5" width="3" height="10" rx="0.8" fill="white" opacity="0.4" />
            </svg>
          </div>
          <span className="app-title text-tx font-semibold">Tool Hub</span>
        </div>

        <div className="flex items-center gap-2">
          {/* 유틸리티 슬롯 — 테마 토글이 마지막 요소여야 하므로 GitHub 링크를 앞에 둔다. */}
          <a
            href={GITHUB_REPO}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-muted hover:text-tx px-3 py-1.5 rounded-md border border-line hover:bg-fill transition-colors no-underline"
          >
            <GitHubIcon />
            GitHub
          </a>
          <button onClick={onToggle} aria-label="테마 전환" className="ds-icon-btn">
            {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
          </button>
        </div>
      </div>
    </header>
  );
}
```

**GitHub 링크와 토글의 순서가 바뀐다.** 셸 계약이 유틸리티 슬롯의 마지막 요소를 테마 토글로 규정한다. 이전에는 토글이 GitHub 링크 왼쪽이었다.

`.app-title` 은 아직 정의가 없으므로 `background.css` 에 추가한다.

```css
/* 허브 타이틀. 다른 앱의 h1 과 같은 스케일을 쓰되 헤더 높이에 맞춰
   title 대신 subtitle 단계를 쓴다. */
.app-title {
  font-size: var(--ds-font-size-subtitle);
  line-height: var(--ds-line-height-subtitle);
}
```

- [ ] **Step 3: `.ds-shell`을 정의한다**

`home` 은 랜딩이므로 `--ds-container-page`(1120px)를 쓴다. `background.css` 에 추가한다.

```css
/* 셸 컨테이너. 랜딩·문서형은 --ds-container-page 를 쓴다. */
.ds-shell {
  width: 100%;
  max-width: var(--ds-container-page);
  margin-inline: auto;
  padding-inline: var(--ds-page-padding);
}

@media (max-width: 767px) {
  .ds-shell {
    padding-inline: var(--ds-page-padding-mobile);
  }
}
```

- [ ] **Step 4: `Footer.tsx`를 정본 토큰으로 바꾼다 (4회)**

`home/src/components/layout/Footer.tsx` 의 `return` 블록을 다음으로 바꾼다.

```tsx
  return (
    <footer className="border-t border-line py-5">
      <div className="ds-shell flex items-center justify-between">
        <p className="text-caption text-muted">
          Built with React &amp; Tailwind CSS
        </p>
        <a
          href={GITHUB_REPO}
          target="_blank"
          rel="noopener noreferrer"
          className="text-caption text-muted hover:text-primary transition-colors no-underline"
        >
          View on GitHub
        </a>
      </div>
    </footer>
  );
```

`text-[12px]` 두 곳이 정본 `text-caption`(12px)으로, `px-6` 이 `ds-shell` 의 여백으로 대체된다.

- [ ] **Step 5: `Layout.tsx`를 정본 토큰으로 바꾼다 (2회)**

`home/src/components/layout/Layout.tsx` 의 최외곽 `div` 한 줄을 바꾼다.

```tsx
    <div className="min-h-screen flex flex-col bg-bg text-tx">
```

`bg-canvas dark:bg-canvas-dark text-gray-900 dark:text-ink-dark` 네 개가 두 개로 붕괴된다.

- [ ] **Step 6: `Background.tsx`는 그대로 둔다**

이 파일의 `dark:` 4회는 **붕괴 대상이 아니다.** `opacity-0 dark:opacity-100` 처럼 다크 모드에서만 배경 장식을 보이게 하는 의도적 분기이며, 색 토큰이 아니라 표시 여부를 제어한다. 정본 토큰으로 대체할 수 없다.

Run: `cd home && grep -c 'dark:opacity' src/components/layout/Background.tsx`
Expected: `4` — 이 4개는 남는다

- [ ] **Step 7: `ToolCard.tsx`를 정본 토큰으로 바꾼다 (13회)**

Run: `cd home && cat src/components/ToolCard.tsx`

출력된 내용에서 아래 매핑을 적용한다. `--tool-accent-rgb` 기반 카드별 액센트 시스템은 `tool-card.css` 의 컴포넌트 스코프 변수이므로 **유지한다.**

| 기존 | 정본 |
|---|---|
| `bg-surface-dark` (다크 카드면) | `bg-surface` |
| `bg-white dark:bg-surface-dark` | `bg-surface` |
| `text-gray-900 dark:text-white` | `text-tx` |
| `text-gray-500 dark:text-white/45` 계열 | `text-muted` |
| `border-black/[0.0x] dark:border-white/[0.0x]` | `border-line` |
| `focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2` | 제거 (정본 전역 포커스링이 담당) |
| `rounded-2xl`·`rounded-xl` | `rounded-lg`·`rounded-md` (정본이 정의하지 않는 단계) |

- [ ] **Step 8: `FilterButton.tsx`와 `Stat.tsx`를 정본 토큰으로 바꾼다 (3 + 2회)**

`FilterButton.tsx` 의 `className` 템플릿을 다음으로 바꾼다.

```tsx
      className={`text-caption font-semibold px-3 py-1.5 rounded-full border transition-all cursor-pointer ${
        active
          ? 'bg-primary text-on-primary border-primary'
          : 'text-muted border-line hover:border-primary hover:text-primary'
      }`}
```

`text-[11px]` 이 정본 `text-caption`(12px)으로 올라간다 — 11px 이하를 두지 않는 규칙이다.

`Stat.tsx` 의 두 `span` 을 바꾼다.

```tsx
    <span>
      <span className={`font-bold text-tx${tabular ? ' tabular-nums' : ''}`}>
        {value}
      </span>
      <span className="text-muted ml-1">{label}</span>
    </span>
```

- [ ] **Step 9: `HomePage.tsx`를 정본 토큰으로 바꾼다 (13회)**

Run: `cd home && cat src/pages/HomePage.tsx`

히어로 텍스트의 그라디언트(`from-indigo-500 via-purple-400 to-sky-400` + `dark:` 3개)를 `--brand-gradient` 기반 클래스로 옮긴다. `background.css` 에 추가한다.

```css
/* 히어로 텍스트. 장식 그라디언트를 텍스트에 클리핑한다. */
.heroTitle {
  background: var(--brand-gradient);
  background-clip: text;
  color: transparent;
  font-size: var(--ds-font-size-display);
  line-height: var(--ds-line-height-display);
  letter-spacing: var(--ds-tracking-display);
}
```

LIVE 배지의 `text-primary dark:text-primary-light` 와 `bg-primary-light`·`bg-primary dark:bg-primary-light` 는 각각 `text-primary`·`bg-primary` 로 붕괴시킨다. `max-w-[1120px] mx-auto` 는 `ds-shell` 로 바꾼다.

- [ ] **Step 10: 붕괴 결과를 확인한다**

Run: `cd home && grep -rc 'dark:' src --include="*.tsx" | grep -v ':0'`
Expected: `src/components/layout/Background.tsx:4` 한 줄만 출력. 이 4개는 `opacity-0 dark:opacity-100` 처럼 다크에서만 배경 장식을 보이게 하는 의도적 분기이며 색 토큰으로 대체할 수 없다. 다른 파일이 남으면 그 줄을 위 매핑에 따라 처리한다.

Run:
```bash
cd home && grep -rhoE '\b(bg|text|border|from|via|to|outline|ring)-(canvas|canvas-dark|ink-dark|surface-dark|accent|primary-light)\b' src --include="*.tsx"
```
Expected: 출력 없음 — 정본에 없는 이름이 전부 사라졌다

Run: `cd home && grep -rnE "rounded-(xs|xl|2xl|3xl)\b" src --include="*.tsx"`
Expected: 출력 없음. 정본 `ds-sync.test.ts` 의 금지 유틸리티 스캔도 이것을 강제한다

- [ ] **Step 11: `App.test.tsx`의 단정을 갱신한다**

Run: `cd home && npm run test -- src/App.test.tsx`

클래스명이나 색을 단정하는 테스트가 실패하면 새 계약에 맞게 갱신한다. 테스트가 검증하려던 **의도**를 유지하고 값만 바꾼다.

- [ ] **Step 12: 전체 검증을 실행한다**

Run: `cd home && mise run check`
Expected: test·lint·typecheck·build 전부 exit 0

- [ ] **Step 13: 산출 CSS와 육안 확인을 한다**

Run: `cd home && grep -o -- "--primary:[^;]*" dist/assets/*.css`
Expected: 라이트 `#3366ff` 와 다크 `#5b84ff` 두 건

Run: `cd home && grep -o -- "--brand-gradient:[^;]*" dist/assets/*.css | head -1`
Expected: 그라디언트 정의 출력

Run: `cd home && mise run dev`

브라우저에서 확인한다.

1. 라이트·다크 양쪽에서 헤더·히어로·도구 카드·필터 버튼·푸터
2. 도구 카드의 카드별 액센트 색 8종이 유지된다
3. 로고 마크와 히어로 텍스트의 그라디언트가 유지된다
4. 필터 버튼 활성 상태가 blue(`#3366ff`)다 — indigo 가 아니다
5. 테마 토글이 헤더 유틸리티 슬롯의 마지막 요소다 (GitHub 링크 오른쪽)
6. 1280px 과 390px

- [ ] **Step 14: 커밋한다**

```bash
git add home/src
git commit -m "feat(home): collapse dark variants onto canonical tokens

정본 토큰이 [data-theme=dark] 에서 자동 교체되므로 라이트·다크 쌍으로 쓰던
유틸리티가 하나로 붕괴된다. dark: 변형 53곳이 사라졌다.

- bg-canvas dark:bg-canvas-dark -> bg-bg
- text-gray-900 dark:text-white -> text-tx
- text-primary dark:text-primary-light -> text-primary
- border-black/[0.06] dark:border-white/[0.06] -> border-line
- 장식 그라디언트를 .brandMark / .heroTitle 로 옮겨 --brand-gradient 를 쓴다
- 컨테이너를 .ds-shell + --ds-container-page(1120px) 로
- 테마 토글을 .ds-icon-btn 으로, 유틸리티 슬롯의 마지막 요소로 이동
  (이전에는 GitHub 링크 왼쪽이었다)
- 기능 브랜드가 indigo 에서 blue(#3366ff) 로 전환된다

도구 카드의 --tool-accent-rgb 8색 시스템은 컴포넌트 스코프 변수이므로 유지한다."
```

---

### Task 6: 문서 갱신

**Files:**
- Modify: `docs/frontend-conventions.md`
- Modify: `CLAUDE.md`

**Interfaces:**
- Consumes: 완료된 7개 Tailwind 앱의 실제 구조

문서가 현재 코드와 어긋난 부분을 고친다. `frontend-conventions.md` 규칙 3은 "각 앱이 자기 토큰을 독립적으로 관리한다"고 명시하는데 이 작업이 그것을 대체했다.

- [ ] **Step 1: 현재 문서의 어긋난 부분을 확인한다**

Run: `grep -n "토큰 체계\|독립적으로\|적용 대상" docs/frontend-conventions.md`

Run: `grep -n "home/\|sign-maker\|프로젝트 디렉터리" CLAUDE.md`

- [ ] **Step 2: `frontend-conventions.md` 규칙 3을 개정한다**

기존 규칙 3을 다음으로 바꾼다.

```markdown
3. **토큰 체계** — 공통 토큰은 `packages/design-system/`의 정본이 단일 출처다. 각 앱의 `styles/ds-tokens.css`·`ds-base.css`·`ds-primitives.css`·`ds-sync.test.ts`는 **생성물이며 직접 편집하지 않는다.** 앱 고유 토큰만 `styles/theme.local.css`에 둔다. 정본을 고친 뒤 저장소 루트에서 `npm run tokens:sync`를 실행한다.
   - 동기화를 잊으면 각 앱의 `ds-sync.test.ts`가 실패한다. CI가 없으므로 검증이 이미 일어나는 곳에 drift 감지를 둔다.
   - Tailwind 테마 네임스페이스와 겹치는 토큰은 `--ds-` 접두사를 쓴다. 접두사가 없으면 유틸리티(`rounded-md`, `shadow-sm`)와 `var()`가 서로 다른 값을 참조한다.
   - 자세한 규칙은 [packages/design-system/README.md](../packages/design-system/README.md)에 있다.
```

- [ ] **Step 3: `frontend-conventions.md`의 적용 대상 표를 갱신한다**

기존 표에 `json-yaml-converter`·`openapi-editor`가 빠져 있다. 다음으로 바꾼다.

```markdown
| 스택 | 앱 |
|---|---|
| Vite + React SPA | `home`, `sign-maker`, `json-yaml-converter`, `openapi-editor` |
| Next.js App Router | `ddl-seed-generator`, `config-diff-viewer`, `dummy-file-generator` |

> `webpage-capture-tool`(Electron)은 정본 토큰만 소비하고 셸 계약은 적용하지 않는다. `class-diagram-generator`(Kotlin)는 대상 외.
```

- [ ] **Step 4: `frontend-conventions.md`에 셸 계약 절을 추가한다**

"테마 컨벤션" 절 뒤에 추가한다.

```markdown
## 셸 계약 (7개 앱 공통)

헤더는 세 슬롯으로 구성한다. 컴포넌트를 공유하지 않고 계약만 공유한다.

| 슬롯 | 규칙 |
|---|---|
| 브랜드 | 마크 40px · `--ds-radius-md` · `--primary` 배경 / `h1`은 `--ds-font-size-title` / 설명문은 `--ds-font-size-body` + `--muted`. **전체가 허브로 가는 링크**(`home`은 허브 자신이라 링크가 아니다) |
| 페이지 액션 | 앱 고유. 비어 있어도 된다 |
| 유틸리티 | 항상 최우측. **테마 토글이 마지막 요소**. 그 앞에만 앱별 유틸을 둔다 |

- 페이지 액션이 많은 앱은 2행 구조를 쓴다(`openapi-editor`). 유틸리티 슬롯은 그때도 1행의 끝이다.
- 푸터는 `home` 전용이다. 도구 앱은 full-height 워크스페이스라 세로 공간을 먹는다. 허브 복귀는 헤더 브랜드 링크가 담당한다.
- 컨테이너는 `--ds-container-narrow`(560px, 단일 폼) / `--ds-container-page`(1120px, 랜딩) / `--ds-container-wide`(1600px, 에디터) 중 하나를 쓴다.
- 아이콘 버튼은 정본 `.ds-icon-btn`(36px)을 쓰고 앱에서 얇은 컴포넌트로 감싼다.
- 모달은 `<dialog>` + `showModal()`을 쓴다. 포커스 트랩·Escape·`::backdrop`을 브라우저가 제공하고 top layer에 렌더되어 z-index 경쟁에서 빠진다.
```

- [ ] **Step 5: `CLAUDE.md`에 루트 명령을 문서화한다**

"How To Use This Repository" 절에 항목을 추가한다. `CLAUDE.md`는 "루트 레벨 명령은 명시적으로 문서화된 경우만" 실행하도록 규정하므로 이 문서화가 전제 조건이다.

```markdown
- 저장소 루트에서 실행하는 명령은 디자인 시스템 동기화뿐이다. 루트 `package.json`에는 `dependencies`도 `workspaces`도 없어 `npm install`이 필요 없다.
  - `npm run tokens:sync` — `packages/design-system/` 정본을 각 앱의 `styles/`로 복사한다
  - `npm run tokens:check` — 복사하지 않고 불일치만 보고한다
  - `npm run tokens:test` — 동기화 스크립트의 단위 테스트
```

- [ ] **Step 6: `CLAUDE.md`의 프로젝트 목록을 갱신한다**

현재 목록에 `json-yaml-converter`·`openapi-editor`·`class-diagram-generator`가 빠져 있다. 해당 줄을 다음으로 바꾼다.

```markdown
- Each tool lives in its own project directory: `home/`, `sign-maker/`, `json-yaml-converter/`, `openapi-editor/`, `ddl-seed-generator/`, `config-diff-viewer/`, `dummy-file-generator/`, `webpage-capture-tool/`, `class-diagram-generator/`.
```

- [ ] **Step 7: `CLAUDE.md`에 e2e 앱의 브라우저 설치 주의사항을 추가한다**

"Required Verification" 절에 추가한다.

```markdown
- e2e가 있는 앱(`json-yaml-converter`, `openapi-editor`)은 `mise run install` 뒤 `npx playwright install chromium`을 실행한다. `npm ci`가 `node_modules`를 재설치하면서 Playwright 브라우저 요구 버전 핀이 바뀌어 캐시에 없는 빌드를 찾게 되고, e2e 전체가 브라우저 실행 단계에서 실패한다.
```

- [ ] **Step 8: 문서의 링크가 유효한지 확인한다**

Run:
```bash
grep -ohE '\]\(([^)]+\.md)[^)]*\)' docs/frontend-conventions.md CLAUDE.md | sed 's/](//;s/[)#].*//' | sort -u | while read -r p; do
  for base in . docs; do [ -f "$base/$p" ] && { echo "ok   $p"; continue 2; }; done
  echo "BROKEN $p"
done
```
Expected: `BROKEN` 없음

- [ ] **Step 9: 커밋한다**

```bash
git add docs/frontend-conventions.md CLAUDE.md
git commit -m "docs: align conventions with the canonical design system

- frontend-conventions.md 규칙 3 개정. '각 앱이 자기 토큰을 독립적으로
  관리한다' 에서 'packages/design-system 정본이 단일 출처' 로
- 적용 대상 표에 빠져 있던 json-yaml-converter, openapi-editor 추가
- 셸 계약 절 신설: 헤더 3슬롯, 푸터 정책, 컨테이너 3단, 아이콘 버튼,
  모달은 <dialog>
- CLAUDE.md 에 루트 명령 3개 문서화. '루트 레벨 명령은 명시적으로 문서화된
  경우만' 규정의 전제 조건이다
- CLAUDE.md 프로젝트 목록에 빠져 있던 3개 앱 추가
- e2e 앱의 playwright install 주의사항 추가"
```

---

## 완료 확인

Task 6 이후 다음이 성립해야 한다. 5차 계획서를 쓰기 전 게이트다.

- [ ] `npm run tokens:test` exit 0 (스크립트 단위 테스트 7건)
- [ ] `npm run tokens:check` exit 0 (정본과 7개 앱 복사본 일치)
- [ ] 7개 앱 전부 `mise run check` exit 0 — `sign-maker`, `json-yaml-converter`, `ddl-seed-generator`, `openapi-editor`, `dummy-file-generator`, `config-diff-viewer`, `home`
- [ ] `openapi-editor` 의 `npm run test:e2e` 5회 연속 전부 통과
- [ ] `config-diff-viewer` 의 규칙 모달에서 Escape·포커스 트랩·백드롭 클릭·포커스 복귀가 동작한다
- [ ] `home` 에서 도구 카드의 카드별 액센트 8색과 장식 그라디언트가 유지된다
- [ ] `home` 의 기능 브랜드가 blue(`#3366ff`)다 — 필터 버튼 활성 상태로 확인
- [ ] `home` 의 `dark:` 변형이 사라졌다 (`grep -rc 'dark:' home/src --include="*.tsx"` 가 전부 0)
- [ ] 라이트·다크 양쪽에서 두 앱을 1280px 과 390px 로 육안 확인
- [ ] `docs/frontend-conventions.md` 와 `CLAUDE.md` 의 내부 링크가 전부 유효하다

## 알려진 위험

- **`home` 의 구조 전환이 이 작업 전체에서 회귀 위험이 가장 크다.** Task 4가 빌드만 통과시키고 Task 5가 화면을 되돌리는 2단 구조라, 두 커밋 사이에는 화면이 불완전하다. Task 5까지 한 번에 진행하고 그 사이에 푸시하지 않는다.
- **`home` 의 `App.test.tsx` 가 클래스명이나 색을 단정할 수 있다.** Task 4 Step 6과 Task 5 Step 10에서 확인한다. 실패하면 테스트의 **의도**를 유지하고 값만 갱신한다.
- **`config-diff-viewer` 의 `<dialog>` 전환에 DOM 테스트 가드가 없다.** `vitest` 가 `environment: node` 이고 테스트가 `lib/differ.test.ts` 하나뿐이다. Task 2 Step 8의 키보드 육안 확인이 유일한 검증이므로 건너뛰지 않는다.
- **`<dialog>` 의 `display` 를 `[open]` 없이 주면 닫힌 상태에서도 보인다.** UA 기본 `display: none` 을 덮기 때문이다. Task 2 Step 4가 이것을 다룬다.
- **`config-diff-viewer` 의 radius 10종 → 3단 축약에서 20px → 16px 과 3px → 8px 이 가장 큰 변화다.** 큰 카드는 덜 둥글어지고 작은 배지는 더 둥글어진다. 육안 확인 대상이다.
- **`home` 의 히어로 그라디언트를 CSS 로 옮기면 Tailwind 의 `bg-clip-text` 유틸리티를 잃는다.** `.heroTitle` 에 `background-clip: text; color: transparent` 를 직접 넣어 대체하지만, `-webkit-background-clip` 접두사가 필요한 브라우저가 있으면 추가한다.
- **`sed` 치환 순서.** Task 1 Step 7의 radius 치환은 값이 서로 다른 토큰으로 가므로 순서 무관하다. 다만 `border-radius: 3px` 를 `border-radius: 30px` 같은 값보다 먼저 치환하지 않도록, 목록에 없는 값이 나타나면 Step 8의 잔존 확인에서 잡는다.
