# Design System Unification Implementation Plan (1/2: 정본 + 파일럿)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 디자인 토큰·전역 규칙·프리미티브의 단일 정본을 만들고 동기화·drift 검증을 세우고, `sign-maker`를 첫 소비자로 마이그레이션해 계약을 검증한다.

**Architecture:** `packages/design-system/`에 정본 CSS 3파일을 두고, 의존성 없는 Node 스크립트가 각 앱의 `styles/` 디렉터리로 `ds-` 접두사 파일명으로 복사한다. 복사본은 커밋하므로 빌드 시점에 앱은 자기 완결적이고 배포 파이프라인이 바뀌지 않는다. 각 앱의 vitest에 정본과 복사본의 바이트 일치를 단정하는 테스트를 두어 CI 없이 drift를 막는다. 앱 고유 토큰은 `theme.local.css`가 정본 뒤에 로드되어 덮는다.

**Tech Stack:** Tailwind CSS 4.2.4, Node 24.13.0 (내장 `node:test`), Vitest, TypeScript, React 19, mise.

**설계 문서:** [2026-07-25-design-system-unification-design.md](../specs/2026-07-25-design-system-unification-design.md)

**범위:** 이 계획서는 설계 문서의 마이그레이션 단계 1~3을 다룬다. 남은 7개 앱(json-yaml-converter, webpage-capture-tool, ddl-seed-generator, openapi-editor, dummy-file-generator, config-diff-viewer, home)은 파일럿에서 계약이 검증된 뒤 2차 계획서로 전개한다.

## Global Constraints

- 작업 디렉터리는 워크트리 `/Users/dongjin/dev/project/tool-hub/.claude/worktrees/design-system-unification`, 브랜치 `feat/design-system-unification`이다. 메인 체크아웃으로 `cd` 하지 않는다.
- **Tailwind 테마 네임스페이스와 겹치는 토큰은 `:root`에서 `--ds-` 접두사를 쓰고 `@theme inline`으로 매핑한다.** 대상: `--ds-font-sans`, `--ds-font-size-*`, `--ds-line-height-*`, `--ds-tracking-*`, `--ds-radius-*`, `--ds-shadow-*`, `--ds-ease-*`, `--ds-duration-*`, `--ds-z-*`, `--ds-container-*`, `--ds-page-padding*`.
- **색 토큰은 접두사를 붙이지 않는다.** `--bg`, `--surface`, `--surface-2`, `--surface-3`, `--fill*`, `--line*`, `--control-border`, `--text`, `--text-neutral`, `--muted`, `--disabled`, `--primary*`, `--on-primary`, `--danger*`, `--success*`, `--warning*`.
- 정본이 정의하지 않은 Tailwind radius/shadow 단계(`rounded-xl`, `rounded-2xl`, `shadow-md` 등)는 사용 금지.
- 모든 직접 조작 요소는 **36px** 높이를 유지한다.
- 포커스링은 `outline: 2px solid var(--primary); outline-offset: 2px`.
- disabled는 `opacity`로 표현하지 않고 `--disabled` + `--fill-subtle` 토큰을 쓴다.
- 라이트·다크 양쪽에서 텍스트 4.5:1, non-text control border/focus 3:1을 유지한다.
- 정본 복사본은 `.gitignore`하지 않고 **커밋한다**.
- 앱의 `styles/ds-*.css`를 직접 편집하지 않는다. 정본을 고친 뒤 `npm run tokens:sync`를 실행한다.
- 커밋 메시지는 Conventional Commits를 따른다(`feat(design-system):`, `refactor(sign-maker):` 등).

---

## File Structure

| 파일 | 책임 |
|---|---|
| `packages/design-system/tokens.css` | 색·타이포·radius·shadow·motion·z-index·레이아웃 토큰과 `@theme inline` 매핑 |
| `packages/design-system/base.css` | 전역 포커스링, `prefers-reduced-motion` |
| `packages/design-system/primitives.css` | `.ds-icon-btn`, `.ds-card` |
| `packages/design-system/README.md` | 사용 규칙, 토큰 추가·승격 절차, 네임스페이스 규칙 |
| `scripts/sync-design-tokens.mjs` | 정본 → 앱 복사 및 `--check` 모드. 의존성 0 |
| `scripts/sync-design-tokens.test.mjs` | 위 스크립트의 단위 테스트(`node:test`) |
| `package.json` | 루트. `private`, scripts만. `workspaces`·`dependencies` 없음 |
| `sign-maker/src/styles/ds-*.css` | 정본 복사본(생성물, 커밋) |
| `sign-maker/src/styles/theme.local.css` | sign-maker 고유 토큰 |
| `sign-maker/src/styles/ds-sync.test.ts` | drift 검증 |

---

### Task 1: 정본 CSS 3파일과 README

**Files:**
- Create: `packages/design-system/tokens.css`
- Create: `packages/design-system/base.css`
- Create: `packages/design-system/primitives.css`
- Create: `packages/design-system/README.md`

**Interfaces:**
- Produces: 위 4개 파일. 이후 모든 태스크가 `packages/design-system/`을 정본 경로로 참조한다.
- Produces: 토큰 이름 집합. Task 4~6과 2차 계획서가 이 이름을 그대로 쓴다.

이 태스크는 CSS 파일 생성이므로 실패 테스트를 먼저 쓰지 않는다. 검증은 Task 2의 스크립트 테스트와 Task 4의 실제 컴파일에서 이뤄진다.

- [ ] **Step 1: `packages/design-system/tokens.css` 를 생성한다**

```css
/* ─────────────────────────────────────────────────────────────────────────
   Tool Hub Design System — 토큰 정본
   변경 후 저장소 루트에서 `npm run tokens:sync` 를 실행한다.

   네임스페이스 규칙
     Tailwind 테마 네임스페이스와 겹치는 토큰은 --ds- 접두사를 쓰고
     @theme inline 으로 Tailwind 이름에 매핑한다. 접두사를 생략하면
     유틸리티(rounded-md, shadow-sm)와 var() 가 서로 다른 값을 참조한다.
     색 토큰은 Tailwind 네임스페이스와 겹치지 않으므로 접두사가 없다.

   대비 수치는 --bg/--surface/--surface-2/--surface-3 네 표면 전부에서
   측정한 최악값이다(WCAG 2.1).
   ───────────────────────────────────────────────────────────────────────── */

@font-face {
  font-family: "ToolHub Sans";
  src: url("/fonts/toolhub-sans.woff2") format("woff2");
  font-weight: 100 900;
  font-style: normal;
  font-display: swap;
}

@custom-variant dark (&:where([data-theme=dark], [data-theme=dark] *));

:root {
  color-scheme: light;

  /* ── 타이포 ── */
  --ds-font-sans: "ToolHub Sans", -apple-system, BlinkMacSystemFont, system-ui,
    "Apple SD Gothic Neo", "Malgun Gothic", sans-serif;

  --ds-font-size-caption: 0.75rem;   /* 12px — 배지·칩·힌트·상태바 */
  --ds-line-height-caption: 1.4;
  --ds-font-size-body: 0.875rem;     /* 14px — 기본. 본문·버튼·입력·라벨 */
  --ds-line-height-body: 1.55;
  --ds-font-size-subtitle: 1rem;     /* 16px — 패널 제목·섹션 헤딩 */
  --ds-line-height-subtitle: 1.5;
  --ds-font-size-title: 1.25rem;     /* 20px — 앱 타이틀 h1 */
  --ds-line-height-title: 1.35;
  --ds-tracking-title: -0.01em;
  --ds-font-size-display: 1.75rem;   /* 28px — 랜딩 히어로 전용 */
  --ds-line-height-display: 1.2;
  --ds-tracking-display: -0.02em;

  /* ── 표면 ── */
  --bg: #f7f7f8;
  --surface: #ffffff;
  --surface-2: #f4f4f5;
  --surface-3: #ececee;

  /* ── 중립 채움 ── */
  --fill-subtle: rgba(112, 115, 124, 0.05);
  --fill: rgba(112, 115, 124, 0.08);
  --fill-bold: rgba(112, 115, 124, 0.16);

  /* ── 선 ──
     --line* 는 장식용 헤어라인이며 3:1 대비를 요구하지 않는다.
     --control-border 는 경계선이 컴포넌트를 식별하므로 3:1 을 충족한다. */
  --line-subtle: rgba(112, 115, 124, 0.08);
  --line: rgba(112, 115, 124, 0.22);
  --line-strong: rgba(112, 115, 124, 0.52);
  --control-border: #767b85;              /* 최저 3.60:1 */

  /* ── 텍스트 ── */
  --text: rgb(23, 23, 23);                /* 17.93:1 AAA */
  --text-neutral: rgba(46, 47, 51, 0.88); /*  9.14:1 AAA */
  --muted: rgba(55, 56, 60, 0.72);        /*  4.55:1 AA  */
  --disabled: rgba(55, 56, 60, 0.38);     /*  2.09:1 — WCAG 1.4.3 비활성 면제 */

  /* ── 브랜드 ── */
  --primary: #3366ff;                     /*  4.68:1 AA. 위의 흰 글자도 4.68:1 */
  --primary-strong: #005eeb;              /* hover */
  --primary-heavy: #0054d1;               /* pressed */
  --primary-surface: #eaf2fe;
  --on-primary: #ffffff;

  /* ── 상태 ── */
  --danger: #d11f2e;                      /*  5.32:1 AA */
  --danger-surface: rgba(209, 31, 46, 0.08);
  --success: #18794e;                     /*  5.41:1 AA */
  --success-surface: rgba(24, 121, 78, 0.10);
  --warning: #a15c00;                     /*  5.19:1 AA */
  --warning-surface: rgba(161, 92, 0, 0.10);

  /* ── 반경 ── */
  --ds-radius-sm: 8px;                    /* 칩·배지·내부 요소 */
  --ds-radius-md: 12px;                   /* 컨트롤·팝오버 */
  --ds-radius-lg: 16px;                   /* 카드·패널·워크스페이스 */
  --ds-radius-pill: 999px;

  /* ── 고도 ── */
  --ds-shadow-sm: 0 1px 2px rgba(23, 23, 25, 0.06), 0 1px 3px rgba(23, 23, 25, 0.07);
  --ds-shadow-md: 0 2px 8px rgba(23, 23, 25, 0.08), 0 1px 2px rgba(23, 23, 25, 0.06);
  --ds-shadow-lg: 0 8px 24px rgba(23, 23, 25, 0.10), 0 2px 6px rgba(23, 23, 25, 0.06);
  --ds-shadow-xl: 0 12px 28px rgba(23, 23, 25, 0.14), 0 2px 8px rgba(23, 23, 25, 0.08);

  /* ── 모션 ── */
  --ds-ease-standard: cubic-bezier(0.4, 0, 0.2, 1);
  --ds-ease-emphasized: cubic-bezier(0.2, 0, 0, 1);
  --ds-duration-fast: 120ms;              /* hover·focus 색 변화 */
  --ds-duration-base: 180ms;              /* 팝오버 진입·토스트 */
  --ds-duration-slow: 240ms;              /* drawer 슬라이드 */

  /* ── 층위 ──
     모달은 이 스케일에 속하지 않는다. <dialog> + showModal() 은 브라우저
     top layer 에 렌더되어 z-index 와 무관하게 위에 온다. 모달 위에 토스트를
     띄워야 하면 토스트도 top layer 여야 한다(모달 내부 렌더 또는 popover 속성). */
  --ds-z-sticky: 100;
  --ds-z-dropdown: 200;
  --ds-z-toast: 300;

  /* ── 레이아웃 ── */
  --ds-container-narrow: 560px;           /* 단일 폼 카드 */
  --ds-container-page: 1120px;            /* 랜딩·문서형 */
  --ds-container-wide: 1600px;            /* 에디터 워크스페이스 */
  --ds-page-padding: 24px;
  --ds-page-padding-mobile: 12px;
}

[data-theme="dark"] {
  color-scheme: dark;

  --bg: rgb(15, 15, 16);
  --surface: rgb(27, 28, 30);
  --surface-2: rgb(33, 34, 37);
  --surface-3: rgb(46, 47, 51);

  --fill-subtle: rgba(112, 115, 124, 0.12);
  --fill: rgba(112, 115, 124, 0.22);
  --fill-bold: rgba(112, 115, 124, 0.28);

  --line-subtle: rgba(112, 115, 124, 0.16);
  --line: rgba(112, 115, 124, 0.32);
  --line-strong: rgba(194, 196, 200, 0.52);
  --control-border: #8a8f99;              /* 최저 4.12:1 */

  --text: rgb(247, 247, 247);             /* 15.92:1 AAA */
  --text-neutral: rgba(194, 196, 200, 0.88); /* 7.84:1 AAA */
  --muted: rgba(174, 176, 182, 0.82);     /*  4.68:1 AA  */
  --disabled: rgba(174, 176, 182, 0.38);

  --primary: #5b84ff;                     /*  5.03:1 AA */
  --primary-strong: #1a75ff;
  --primary-heavy: #0066ff;
  --primary-surface: rgba(91, 132, 255, 0.16);

  --danger: #ff6464;                      /*  5.89:1 AA */
  --danger-surface: rgba(255, 100, 100, 0.14);
  --success: #34c77b;                     /*  7.80:1 AAA */
  --success-surface: rgba(52, 199, 123, 0.16);
  --warning: #e0a93a;                     /*  8.04:1 AAA */
  --warning-surface: rgba(224, 169, 58, 0.16);

  /* 다크에서는 중립 그림자가 보이지 않으므로 검정 기반으로 교체한다 */
  --ds-shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.30), 0 1px 3px rgba(0, 0, 0, 0.36);
  --ds-shadow-md: 0 2px 8px rgba(0, 0, 0, 0.36), 0 1px 2px rgba(0, 0, 0, 0.30);
  --ds-shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.45), 0 2px 6px rgba(0, 0, 0, 0.30);
  --ds-shadow-xl: 0 12px 28px rgba(0, 0, 0, 0.50), 0 2px 8px rgba(0, 0, 0, 0.36);
}

/* Tailwind 유틸리티 매핑.
   @theme inline 은 토큰을 :root 로 emit 하지 않고 선언 값을 유틸리티에
   인라인한다. 따라서 유틸리티가 위의 --ds-*/색 토큰을 var() 로 참조하며
   [data-theme=dark] 오버라이드에 반응한다. */
@theme inline {
  --font-sans: var(--ds-font-sans);

  --text-caption: var(--ds-font-size-caption);
  --text-caption--line-height: var(--ds-line-height-caption);
  --text-body: var(--ds-font-size-body);
  --text-body--line-height: var(--ds-line-height-body);
  --text-subtitle: var(--ds-font-size-subtitle);
  --text-subtitle--line-height: var(--ds-line-height-subtitle);
  --text-title: var(--ds-font-size-title);
  --text-title--line-height: var(--ds-line-height-title);
  --text-title--letter-spacing: var(--ds-tracking-title);
  --text-display: var(--ds-font-size-display);
  --text-display--line-height: var(--ds-line-height-display);
  --text-display--letter-spacing: var(--ds-tracking-display);

  --color-bg: var(--bg);
  --color-surface: var(--surface);
  --color-surface-2: var(--surface-2);
  --color-surface-3: var(--surface-3);
  --color-fill: var(--fill);
  --color-fill-subtle: var(--fill-subtle);
  --color-fill-bold: var(--fill-bold);
  --color-line: var(--line);
  --color-line-subtle: var(--line-subtle);
  --color-line-strong: var(--line-strong);
  --color-control-border: var(--control-border);
  --color-tx: var(--text);
  --color-tx-neutral: var(--text-neutral);
  --color-muted: var(--muted);
  --color-disabled: var(--disabled);
  --color-primary: var(--primary);
  --color-primary-strong: var(--primary-strong);
  --color-primary-heavy: var(--primary-heavy);
  --color-primary-surface: var(--primary-surface);
  --color-on-primary: var(--on-primary);
  --color-danger: var(--danger);
  --color-danger-surface: var(--danger-surface);
  --color-success: var(--success);
  --color-success-surface: var(--success-surface);
  --color-warning: var(--warning);
  --color-warning-surface: var(--warning-surface);

  --radius-sm: var(--ds-radius-sm);
  --radius-md: var(--ds-radius-md);
  --radius-lg: var(--ds-radius-lg);

  --shadow-sm: var(--ds-shadow-sm);
  --shadow-md: var(--ds-shadow-md);
  --shadow-lg: var(--ds-shadow-lg);
  --shadow-xl: var(--ds-shadow-xl);

  --ease-standard: var(--ds-ease-standard);
  --ease-emphasized: var(--ds-ease-emphasized);
}
```

- [ ] **Step 2: `packages/design-system/base.css` 를 생성한다**

`:where()` 로 특성도를 0으로 유지해 앱이 필요할 때 덮을 수 있게 한다.

```css
/* ─────────────────────────────────────────────────────────────────────────
   Tool Hub Design System — 전역 base 규칙 정본
   변경 후 저장소 루트에서 `npm run tokens:sync` 를 실행한다.

   앱의 base.css 를 대체하지 않는다. box-sizing, html/body, 페이지 배경처럼
   앱마다 다른 규칙은 각 앱의 base.css 가 계속 소유한다.
   여기에는 8개 앱이 동일해야 하는 규칙만 둔다.
   ───────────────────────────────────────────────────────────────────────── */

/* 전역 포커스링.
   :where() 로 특성도 0 을 유지하므로 컴포넌트가 필요하면 덮을 수 있다.
   컴포넌트별로 focus-visible 을 반복 선언하지 않는다 — 새로 만드는
   컴포넌트가 자동으로 커버되지 않기 때문이다. */
:where(button, a, input, textarea, select, summary, [tabindex]):focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}

/* 모션 축소 선호.
   토큰을 0 으로 덮어 토큰 기반 transition 을 끄고, 토큰을 쓰지 않는
   애니메이션까지 잡기 위해 전역 규칙을 함께 둔다. */
@media (prefers-reduced-motion: reduce) {
  :root {
    --ds-duration-fast: 0ms;
    --ds-duration-base: 0ms;
    --ds-duration-slow: 0ms;
  }

  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

- [ ] **Step 3: `packages/design-system/primitives.css` 를 생성한다**

파일럿이 실제로 쓰는 두 프리미티브만 둔다. `.ds-btn` 변형과 오버레이 3종은 소비자 앱이 마이그레이션되는 태스크에서 추가한다 — 사용처 없이 만들면 검증되지 않은 코드가 된다.

```css
/* ─────────────────────────────────────────────────────────────────────────
   Tool Hub Design System — 프리미티브 정본
   변경 후 저장소 루트에서 `npm run tokens:sync` 를 실행한다.

   전역 클래스를 공급하지만 각 앱은 이것을 얇은 React 컴포넌트로 감싼다
   (docs/frontend-conventions.md 규칙 4·5). 바닐라 CSS 앱은 직접 쓴다.
   ───────────────────────────────────────────────────────────────────────── */

/* 카드·패널 표면 */
.ds-card {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--ds-radius-lg);
  box-shadow: var(--ds-shadow-sm);
}

/* 아이콘 버튼.
   36px 은 openapi-editor 헤더 계획의 전역 제약이며 E2E 가 강제한다.
   hover 에서 테두리를 없다가 생기게 하지 않는다 — 버튼이 커진 것처럼 보인다. */
.ds-icon-btn {
  width: 36px;
  height: 36px;
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  padding: 0;
  color: var(--muted);
  background: var(--surface-2);
  border: 1px solid var(--line);
  border-radius: var(--ds-radius-md);
  cursor: pointer;
  transition:
    background var(--ds-duration-fast) var(--ds-ease-standard),
    color var(--ds-duration-fast) var(--ds-ease-standard),
    border-color var(--ds-duration-fast) var(--ds-ease-standard);
}

.ds-icon-btn:hover {
  color: var(--text);
  background: var(--surface-3);
}

.ds-icon-btn:active {
  background: var(--fill-bold);
}

/* disabled 는 opacity 로 표현하지 않는다. opacity 는 중첩되어 이미 --muted 인
   텍스트를 2:1 대까지 떨어뜨리고 아이콘을 과도하게 사라지게 한다. */
.ds-icon-btn:disabled,
.ds-icon-btn:disabled:hover {
  color: var(--disabled);
  background: var(--fill-subtle);
  cursor: not-allowed;
}

.ds-icon-btn > svg {
  width: 16px;
  height: 16px;
}
```

- [ ] **Step 4: `packages/design-system/README.md` 를 생성한다**

````markdown
# Tool Hub Design System

Tool Hub 웹 도구들이 공유하는 디자인 토큰·전역 규칙·프리미티브의 **정본**이다.

## 파일

| 정본 | 앱에 복사되는 이름 | 내용 |
|---|---|---|
| `tokens.css` | `ds-tokens.css` | 색·타이포·radius·shadow·motion·z-index·레이아웃 토큰 |
| `base.css` | `ds-base.css` | 전역 포커스링, `prefers-reduced-motion` |
| `primitives.css` | `ds-primitives.css` | `.ds-card`, `.ds-icon-btn` |

## 사용법

앱의 `styles/ds-*.css` 는 **생성물이다. 직접 편집하지 않는다.** 정본을 고친 뒤 저장소 루트에서 동기화한다.

```bash
npm run tokens:sync
```

동기화를 잊으면 각 앱의 `ds-sync.test.ts` 가 실패한다. 차이만 확인하려면 다음을 쓴다.

```bash
npm run tokens:check
```

앱의 진입 CSS 는 다음 순서로 import 한다. import 순서가 캐스케이드 순서다.

```css
@import "tailwindcss";
@import "./styles/ds-tokens.css";      /* 정본 */
@import "./styles/ds-base.css";        /* 정본 */
@import "./styles/ds-primitives.css";  /* 정본 */
@import "./styles/theme.local.css";    /* 앱 고유 — 정본을 덮을 수 있다 */
@import "./styles/base.css";           /* 앱 고유 */
@import "./styles/components.css";     /* 앱 고유 */
```

## 네임스페이스 규칙

**Tailwind 테마 네임스페이스와 이름이 겹치는 토큰은 `:root` 에서 `--ds-` 접두사를 쓰고 `@theme inline` 으로 Tailwind 이름에 매핑한다.**

접두사를 생략하면 유틸리티와 `var()` 가 갈라진다. Tailwind 4.2.4 에서 확인한 동작이다.

- `--radius-md`: Tailwind 가 `rounded-md` 사용 시 자기 기본값을 `:root` 로 emit 한다. 정본 정의가 캐스케이드 순서로 이기지만 암묵적 의존이다.
- `--shadow-sm`: Tailwind 는 shadow 값을 유틸리티에 인라인하고 `:root` 를 읽지 않는다. `shadow-sm` 클래스와 `var(--shadow-sm)` 이 같은 이름의 서로 다른 그림자가 된다.

| 구분 | 토큰 |
|---|---|
| 접두사 사용 | `--ds-font-sans`, `--ds-font-size-*`, `--ds-line-height-*`, `--ds-tracking-*`, `--ds-radius-*`, `--ds-shadow-*`, `--ds-ease-*`, `--ds-duration-*`, `--ds-z-*`, `--ds-container-*`, `--ds-page-padding*` |
| 접두사 없음 | `--bg`, `--surface`, `--surface-2`, `--surface-3`, `--fill*`, `--line*`, `--control-border`, `--text`, `--text-neutral`, `--muted`, `--disabled`, `--primary*`, `--on-primary`, `--danger*`, `--success*`, `--warning*` |

정본이 정의하지 않은 Tailwind 단계(`rounded-xl`, `rounded-2xl`, `shadow-2xl` 등)는 **사용하지 않는다.** 부분 오버라이드는 순서 역전을 만든다 — `rounded-xl`(Tailwind 기본 12px)이 `rounded-lg`(정본 16px)보다 작아진다.

## 규칙

### 4px 그리드

`--space-*` 토큰을 두지 않는다. Tailwind 기본 spacing 스케일이 이미 4px 그리드다(`gap-2`=8px, `gap-3`=12px). 바닐라 CSS 앱만 필요한 값을 `theme.local.css` 에 둔다.

### 브레이크포인트

CSS 커스텀 프로퍼티는 미디어 쿼리 조건에서 동작하지 않는다(`@media (max-width: var(--bp-md))` 는 조용히 무시된다). 따라서 토큰이 아니라 규칙으로 관리한다.

```
768 / 1024 / 1280 만 사용 (= Tailwind md / lg / xl)
Tailwind 앱: max-md: · lg: 변형 사용. 임의 픽셀 미디어 쿼리 금지
바닐라 CSS 앱: 같은 세 값을 직접 사용
```

### 대비

라이트·다크 양쪽에서 텍스트 **4.5:1**, non-text control border/focus **3:1** 을 유지한다. 토큰 값 옆 주석의 수치는 `--bg`/`--surface`/`--surface-2`/`--surface-3` 네 표면 전부에서 측정한 최악값이다.

`--line*` 는 장식용 헤어라인이므로 3:1 을 요구하지 않는다. 경계선이 컴포넌트를 식별하는 입력·셀렉트·체크박스에는 `--control-border` 를 쓴다.

`--disabled` 는 WCAG 1.4.3 이 비활성 컨트롤을 면제하므로 낮은 대비를 의도적으로 허용한다. 비활성이 아닌 텍스트에 쓰지 않는다.

### 모달과 층위

`--ds-z-*` 는 비모달 오버레이용이다. 모달은 `<dialog>` + `showModal()` 로 만들어 브라우저 top layer 를 쓴다 — 포커스 트랩·Escape·`role="dialog"`·백드롭을 모두 제공하고 z-index 경쟁에서 빠진다.

모달 위에 토스트를 띄워야 하면 `--ds-z-toast` 만으로는 모달 뒤에 깔린다. 토스트를 모달 내부에 렌더하거나 `popover` 속성으로 top layer 에 올린다.

## 앱 고유 토큰

정본에는 **여러 앱이 공유하는 토큰만** 둔다. 한 앱만 쓰는 것은 `theme.local.css` 로 내린다.

`theme.local.css` 에 같은 토큰이 **3개 이상 앱에서 반복되면 정본으로 승격**한다. 승격 절차는 다음과 같다.

1. `tokens.css` 에 토큰을 추가하고 대비를 측정해 주석에 기록한다.
2. `npm run tokens:sync` 를 실행한다.
3. 각 앱의 `theme.local.css` 에서 중복 정의를 제거한다.
4. 각 앱에서 `mise run check` 를 실행한다.

## 폰트

`@font-face` 가 `/fonts/toolhub-sans.woff2` 를 참조한다. 각 앱의 `public/fonts/` 에 파일이 있어야 한다.

**Electron 등 `file://` 프로토콜에서는 이 경로가 파일시스템 루트로 해석되어 깨진다.** 해당 앱은 폰트를 렌더러 옆에 복사해 상대 경로로 바꾸거나 `system-ui` 폴백을 수용한다.

## 바닐라 CSS 앱

`@font-face` 외의 Tailwind at-rule(`@custom-variant`, `@theme inline`)은 브라우저가 미지의 at-rule 블록을 건너뛰므로 무해하게 무시되고 `:root` 커스텀 프로퍼티는 정상 적용된다. 별도 분기 없이 같은 파일을 쓴다. 단 Tailwind 유틸리티(`text-body`, `bg-surface`)는 생성되지 않으므로 `var()` 를 직접 쓴다.
````

- [ ] **Step 5: 커밋한다**

```bash
git add packages/design-system
git commit -m "feat(design-system): add canonical tokens, base rules and primitives

- tokens.css: 색·타이포 5단·radius·shadow·motion·z-index·레이아웃 토큰.
  Tailwind 네임스페이스와 겹치는 토큰은 --ds- 접두사 + @theme inline 매핑
- base.css: 전역 포커스링(:where 로 특성도 0), prefers-reduced-motion
- primitives.css: .ds-card, .ds-icon-btn (36px, opacity 미사용 disabled)
- README: 네임스페이스 규칙, 토큰 승격 절차, 브레이크포인트·대비 규칙"
```

---

### Task 2: 동기화 스크립트와 루트 package.json

**Files:**
- Create: `scripts/sync-design-tokens.mjs`
- Create: `scripts/sync-design-tokens.test.mjs`
- Create: `package.json`

**Interfaces:**
- Consumes: `packages/design-system/{tokens,base,primitives}.css` (Task 1)
- Produces: `sync({ check, root })` → 불일치 파일 경로 배열. `render(sourceName, root)` → 배너가 붙은 파일 내용 문자열. `FILES` 매핑, `TARGETS` 매핑.
- Produces: `npm run tokens:sync`, `npm run tokens:check`, `npm run tokens:test`
- `TARGETS` 는 **마이그레이션이 완료된 앱만** 담는다. 각 앱 마이그레이션 태스크가 자기 항목을 추가한다.

- [ ] **Step 1: 실패 테스트를 작성한다**

`scripts/sync-design-tokens.test.mjs`:

```js
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { render, sync, FILES, TARGETS } from './sync-design-tokens.mjs';

/** 정본 3파일과 대상 앱 하나를 갖춘 임시 저장소를 만든다. */
function makeRepo() {
  const root = mkdtempSync(join(tmpdir(), 'ds-sync-'));
  mkdirSync(join(root, 'packages/design-system'), { recursive: true });
  for (const name of Object.keys(FILES)) {
    writeFileSync(join(root, 'packages/design-system', name), `/* ${name} 본문 */\n`);
  }
  mkdirSync(join(root, 'sign-maker/src/styles'), { recursive: true });
  return root;
}

describe('render', () => {
  test('배너를 앞에 붙이고 정본 본문을 보존한다', () => {
    const root = makeRepo();
    const out = render('tokens.css', root);
    assert.ok(out.includes('packages/design-system/tokens.css'), '배너에 정본 경로가 있어야 한다');
    assert.ok(out.includes('npm run tokens:sync'), '배너에 동기화 명령이 있어야 한다');
    assert.ok(out.endsWith('/* tokens.css 본문 */\n'), '본문이 끝에 그대로 보존되어야 한다');
  });
});

describe('sync', () => {
  test('대상 앱에 정본 3파일을 복사하고 복사한 경로를 반환한다', () => {
    const root = makeRepo();
    const drifted = sync({ root });

    assert.equal(drifted.length, 3, '3개 파일이 새로 쓰여야 한다');
    for (const target of Object.values(FILES)) {
      const path = join(root, 'sign-maker/src/styles', target);
      assert.ok(existsSync(path), `${target} 가 생성되어야 한다`);
      assert.equal(readFileSync(path, 'utf8'), render(Object.keys(FILES).find((k) => FILES[k] === target), root));
    }
  });

  test('이미 일치하면 아무것도 보고하지 않는다', () => {
    const root = makeRepo();
    sync({ root });
    assert.deepEqual(sync({ root }), [], '두 번째 실행은 변경이 없어야 한다');
  });

  test('check 모드는 파일을 쓰지 않고 불일치만 보고한다', () => {
    const root = makeRepo();
    const drifted = sync({ root, check: true });

    assert.equal(drifted.length, 3, '불일치 3건을 보고해야 한다');
    assert.equal(
      existsSync(join(root, 'sign-maker/src/styles/ds-tokens.css')),
      false,
      'check 모드는 파일을 쓰지 않아야 한다',
    );
  });

  test('복사본이 수정되면 불일치로 감지한다', () => {
    const root = makeRepo();
    sync({ root });
    const path = join(root, 'sign-maker/src/styles/ds-tokens.css');
    writeFileSync(path, readFileSync(path, 'utf8') + '/* 손으로 고친 흔적 */\n');

    assert.deepEqual(sync({ root, check: true }), ['sign-maker/src/styles/ds-tokens.css']);
  });

  test('TARGETS 는 마이그레이션된 앱만 담는다', () => {
    assert.deepEqual(Object.keys(TARGETS), ['sign-maker']);
  });
});
```

- [ ] **Step 2: 테스트가 실패하는 것을 확인한다**

Run: `node --test scripts/`
Expected: FAIL — `Cannot find module '.../scripts/sync-design-tokens.mjs'`

- [ ] **Step 3: 스크립트를 구현한다**

`scripts/sync-design-tokens.mjs`:

```js
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
};

/**
 * 앱 디렉터리 → styles 디렉터리 상대 경로.
 * 마이그레이션이 완료된 앱만 담는다. 새 앱을 마이그레이션할 때 여기에 추가한다.
 */
export const TARGETS = {
  'sign-maker': 'src/styles',
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
```

- [ ] **Step 4: 루트 `package.json` 을 생성한다**

`workspaces` 와 `dependencies` 를 두지 않는다. 그래야 앱들의 lockfile 이 영향받지 않고 `npm install` 이 필요 없다.

```json
{
  "name": "tool-hub",
  "version": "0.0.0",
  "private": true,
  "description": "Tool Hub 저장소 루트. 각 도구는 독립 패키지이며 여기에는 디자인 시스템 정본 동기화만 둔다.",
  "type": "module",
  "engines": {
    "node": ">=24"
  },
  "scripts": {
    "tokens:sync": "node scripts/sync-design-tokens.mjs",
    "tokens:check": "node scripts/sync-design-tokens.mjs --check",
    "tokens:test": "node --test 'scripts/**/*.test.mjs'"
  }
}
```

`node --test scripts/` 는 쓰지 않는다. Node 24 는 디렉터리 인자를 탐색 대상이 아니라 파일 경로로 취급해 `MODULE_NOT_FOUND` 로 실패한다. 글롭을 따옴표로 넘겨 Node 내장 글롭이 처리하게 한다.

- [ ] **Step 5: 테스트가 통과하는 것을 확인한다**

Run: `npm run tokens:test`
Expected: PASS — 6개 테스트 전부 통과

- [ ] **Step 6: `--check` 가 아직 마이그레이션 전이라 불일치를 보고하는 것을 확인한다**

Run: `npm run tokens:check`
Expected: exit 1, `sign-maker/src/styles/ds-tokens.css` 등 3건 보고

- [ ] **Step 7: 커밋한다**

```bash
git add scripts package.json
git commit -m "feat(design-system): add token sync script and root package.json

- sync-design-tokens.mjs: 정본을 앱 styles 로 복사. --check 는 쓰지 않고 보고만
- Node 내장 모듈만 사용해 루트에 dependencies 를 두지 않는다
- TARGETS 는 마이그레이션 완료된 앱만 담는다 (현재 sign-maker)
- 루트 package.json 은 private, scripts 만. workspaces 없음"
```

---

### Task 3: 전 앱 mise `check` task 정비

**Files:**
- Modify: `home/mise.toml`
- Modify: `sign-maker/mise.toml`
- Modify: `ddl-seed-generator/mise.toml`
- Modify: `config-diff-viewer/mise.toml`
- Modify: `dummy-file-generator/mise.toml`
- Modify: `webpage-capture-tool/mise.toml`

**Interfaces:**
- Produces: 8개 앱 전부에서 `mise run check` 가 동작한다. 이후 모든 마이그레이션 태스크의 완료 조건이 이 명령이다.

`json-yaml-converter`·`openapi-editor` 는 이미 `check` 가 있으므로 건드리지 않는다. `CLAUDE.md` 가 "합당히 존재해야 할 검증 스크립트가 없으면 추가하라"고 규정한다.

- [ ] **Step 1: `check` 가 없는 앱을 확인한다**

Run:
```bash
for d in home sign-maker json-yaml-converter openapi-editor ddl-seed-generator config-diff-viewer dummy-file-generator webpage-capture-tool; do printf '%-24s %s\n' "$d" "$(grep -q 'tasks.check' "$d/mise.toml" && echo 있음 || echo 없음)"; done
```
Expected: `json-yaml-converter`·`openapi-editor` 만 "있음", 나머지 6개 "없음"

- [ ] **Step 2: `home`·`sign-maker`·`dummy-file-generator` 에 `check` 를 추가한다**

세 파일 각각의 맨 끝에 아래를 덧붙인다. `typecheck` alias 는 이미 `tc` 이므로 그대로 둔다.

```toml

[tasks.check]
alias = "c"
description = "Run the full local verification suite"
depends = ["test", "lint", "typecheck", "build"]
```

- [ ] **Step 3: `ddl-seed-generator`·`config-diff-viewer` 의 typecheck alias 를 `tc` 로 바꾸고 `check` 를 추가한다**

두 파일에서 `typecheck` task 의 alias 를 고친다.

```toml
[tasks.typecheck]
alias = "tc"
description = "Run TypeScript type checks"
run = "npm run typecheck"
```

그리고 파일 끝에 덧붙인다.

```toml

[tasks.check]
alias = "c"
description = "Run the full local verification suite"
depends = ["test", "lint", "typecheck", "build"]
```

- [ ] **Step 4: `webpage-capture-tool` 에 `check` 를 추가한다**

TypeScript 가 아니라 `typecheck` 가 없고, `build-mac`/`build-win` 은 플랫폼별 패키징이라 검증 스위트에 넣지 않는다. 파일 끝에 덧붙인다.

```toml

[tasks.check]
alias = "ch"
description = "Run the full local verification suite"
depends = ["test", "lint"]
```

`alias = "ch"` 를 쓰는 이유는 이 파일의 `cli` task 가 이미 `c` 를 점유하고 있기 때문이다.

- [ ] **Step 5: 8개 앱 전부에 `check` 가 생겼는지 확인한다**

Run:
```bash
for d in home sign-maker json-yaml-converter openapi-editor ddl-seed-generator config-diff-viewer dummy-file-generator webpage-capture-tool; do printf '%-24s %s\n' "$d" "$(grep -q 'tasks.check' "$d/mise.toml" && echo 있음 || echo '** 없음 **')"; done
```
Expected: 8개 전부 "있음"

- [ ] **Step 6: alias 충돌이 없는지 확인한다**

Run:
```bash
for d in home sign-maker json-yaml-converter openapi-editor ddl-seed-generator config-diff-viewer dummy-file-generator webpage-capture-tool; do dup=$(grep -oE 'alias = "[a-z]+"' "$d/mise.toml" | sort | uniq -d); [ -n "$dup" ] && echo "$d 중복: $dup" || printf '%-24s ok\n' "$d"; done
```
Expected: 8개 전부 `ok`

- [ ] **Step 7: 커밋한다**

```bash
git add home/mise.toml sign-maker/mise.toml ddl-seed-generator/mise.toml config-diff-viewer/mise.toml dummy-file-generator/mise.toml webpage-capture-tool/mise.toml
git commit -m "chore: add mise check task to remaining apps

CLAUDE.md 가 요구하는 표준 검증 진입점을 8개 앱 전부에 맞춘다.
json-yaml-converter·openapi-editor 에만 있던 check 를 나머지 6개에 추가하고,
ddl-seed-generator·config-diff-viewer 의 typecheck alias 를 tc 로 통일한다.
webpage-capture-tool 은 TypeScript 가 아니라 test+lint 만 묶는다."
```

---

### Task 4: sign-maker 정본 도입

**Files:**
- Create: `sign-maker/src/styles/ds-tokens.css` (생성물)
- Create: `sign-maker/src/styles/ds-base.css` (생성물)
- Create: `sign-maker/src/styles/ds-primitives.css` (생성물)
- Create: `sign-maker/src/styles/theme.local.css`
- Create: `sign-maker/src/styles/ds-sync.test.ts`
- Delete: `sign-maker/src/styles/theme.css`
- Modify: `sign-maker/src/index.css`
- Modify: `sign-maker/src/styles/components.css`
- Modify: `sign-maker/src/styles/base.css`

**Interfaces:**
- Consumes: `packages/design-system/*` (Task 1), `sync()`·`TARGETS` (Task 2), `mise run check` (Task 3)
- `scripts/sync-design-tokens.mjs` 는 수정하지 않는다. `TARGETS` 에 `sign-maker` 가 Task 2 에서 이미 들어 있다.
- Produces: 정본을 소비하는 첫 앱. 이후 앱들이 이 구조를 복제한다.
- Produces: `theme.local.css` 에 `--paper: #ffffff`

**의도된 시각 변화.** 이 태스크는 순수 구조 변경이 아니다. 정본이 sign-maker 의 기존 값과 다른 부분이 있고, 대부분 접근성 수정이다. 리뷰어는 아래를 예상 결과로 본다.

| 토큰 | 기존 | 정본 | 변화 |
|---|---|---|---|
| `--muted` 라이트 | `rgba(55,56,60,0.61)` 3.66:1 | `rgba(55,56,60,0.72)` 4.97:1 | 보조 텍스트가 진해짐 (AA 통과) |
| `--muted` 다크 | `rgba(174,176,182,0.61)` 3.94:1 | `rgba(174,176,182,0.82)` | 보조 텍스트가 진해짐 (AA 통과) |
| `--danger` 라이트 | `rgb(229,52,58)` 4.30:1 | `#d11f2e` 5.32:1 | 진해짐 (AA 통과) |
| `--danger` 다크 | `rgb(229,92,108)` | `#ff6464` | 밝아짐 |
| `--surface-2` 라이트 | `#f7f7f8` | `#f4f4f5` | 미세하게 진해짐 |
| `--line-subtle` 다크 | `rgba(112,115,124,0.12)` | `rgba(112,115,124,0.16)` | 미세하게 진해짐 |
| shadow 다크 | 오버라이드 없음 | 검정 기반 | **다크에서 그림자가 보이게 됨** |
| `--dur` → `--ds-duration-fast` | `160ms` | `120ms` | transition 이 40ms 빨라짐 |
| `--soft` | 정의만 있고 사용처 0곳 | 삭제 | 없음 |
| `--radius-xl` | 정의만 있고 사용처 0곳 | 삭제 | 없음 |

- [ ] **Step 1: 의존성을 설치하고 baseline 을 확인한다**

Run:
```bash
cd sign-maker && mise run install && mise run check
```
Expected: 설치 성공 후 test·lint·typecheck·build 전부 exit 0

baseline 이 실패하면 진행하지 말고 보고한다. 기존 실패와 이번 변경을 구분할 수 없게 된다.

- [ ] **Step 2: drift 검증 실패 테스트를 작성한다**

`sign-maker/src/styles/ds-sync.test.ts`:

```ts
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * 정본과 복사본의 일치를 단정한다.
 * 실패하면 저장소 루트에서 `npm run tokens:sync` 를 실행한다.
 *
 * CI 가 없으므로 검증이 이미 일어나는 곳(각 앱의 vitest)에 drift 감지를 둔다.
 */
const CASES = [
  ['tokens.css', 'ds-tokens.css'],
  ['base.css', 'ds-base.css'],
  ['primitives.css', 'ds-primitives.css'],
] as const;

describe('디자인 시스템 정본 동기화', () => {
  it.each(CASES)('%s 가 %s 와 일치한다', (source, target) => {
    const canonical = readFileSync(
      resolve(process.cwd(), '../packages/design-system', source),
      'utf8',
    );
    const copy = readFileSync(resolve(process.cwd(), 'src/styles', target), 'utf8');

    // 복사본은 배너 + 정본 본문이다. 본문이 손대어졌는지만 본다.
    expect(copy.endsWith(canonical)).toBe(true);
  });
});
```

- [ ] **Step 3: 테스트가 실패하는 것을 확인한다**

Run: `cd sign-maker && npm run test -- src/styles/ds-sync.test.ts`
Expected: FAIL — `ENOENT` (`src/styles/ds-tokens.css` 가 없음)

- [ ] **Step 4: 동기화 스크립트를 실행해 복사본을 만든다**

`scripts/sync-design-tokens.mjs` 의 `TARGETS` 는 Task 2 에서 이미 `sign-maker` 를 담고 있다. 저장소 루트에서 실행한다.

Run: `npm run tokens:sync`
Expected: `sign-maker/src/styles/ds-tokens.css` 등 3건 생성 보고

- [ ] **Step 5: 테스트가 통과하는 것을 확인한다**

Run: `cd sign-maker && npm run test -- src/styles/ds-sync.test.ts`
Expected: PASS — 3개 케이스 통과

- [ ] **Step 6: `theme.local.css` 를 만든다**

서명 캔버스는 테마와 무관하게 흰 종이여야 하므로 도메인 토큰으로 분리한다. 기존 `components.css` 가 `#ffffff` 를 하드코딩하고 있었다.

`sign-maker/src/styles/theme.local.css`:

```css
/* sign-maker 고유 토큰. 정본 뒤에 로드되어 정본을 덮을 수 있다.
   여기 있는 토큰이 3개 이상 앱에서 반복되면 정본으로 승격한다. */

:root {
  /* 서명 캔버스와 업로드 드롭존의 종이면.
     테마와 무관하게 흰색이어야 한다 — 서명은 흰 종이 위에 그린다. */
  --paper: #ffffff;
}
```

- [ ] **Step 7: 기존 `theme.css` 를 삭제하고 `index.css` 의 import 를 교체한다**

`sign-maker/src/index.css` 전체를 다음으로 바꾼다.

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

그리고 기존 정의 파일을 지운다.

Run: `git rm sign-maker/src/styles/theme.css`

- [ ] **Step 8: `base.css` 의 폰트 토큰 이름을 바꾼다**

`sign-maker/src/styles/base.css` 의 `font-family` 한 줄을 고친다. 나머지 줄은 그대로 둔다.

```css
body {
  min-height: 100vh;
  font-family: var(--ds-font-sans);
  background-color: var(--bg);
  color: var(--text);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
```

- [ ] **Step 9: `components.css` 의 토큰 이름을 기계적으로 치환한다**

값이 바뀌지 않는 순수 이름 치환이다.

Run:
```bash
cd sign-maker && sed -i '' \
  -e 's/var(--radius-/var(--ds-radius-/g' \
  -e 's/var(--shadow-/var(--ds-shadow-/g' \
  -e 's/var(--dur)/var(--ds-duration-fast)/g' \
  -e 's/var(--ease)/var(--ds-ease-standard)/g' \
  src/styles/components.css
```

- [ ] **Step 10: 치환 결과를 확인한다**

Run:
```bash
cd sign-maker && grep -nE "var\(--(radius|shadow|dur|ease)[-)]" src/styles/components.css
```
Expected: 출력 없음 (구 이름이 남아 있지 않음)

Run:
```bash
cd sign-maker && grep -c "var(--ds-" src/styles/components.css
```
Expected: `13` 이상 (radius 8곳 + shadow 3곳 + duration/ease)

- [ ] **Step 11: 하드코딩된 흰색을 `--paper` 로 바꾼다**

`sign-maker/src/styles/components.css` 의 해당 규칙을 고친다.

```css
.signature-stage,
.upload-dropzone {
  height: 400px;
  background: var(--paper);
  border: 1px solid var(--line);
}
```

- [ ] **Step 12: 전체 검증을 실행한다**

Run: `cd sign-maker && mise run check`
Expected: test·lint·typecheck·build 전부 exit 0

- [ ] **Step 13: 빌드 산출 CSS 에 토큰과 클래스가 살아 있는지 확인한다**

sign-maker 에는 시각 회귀 테스트가 없으므로 산출물을 직접 확인한다.

Run:
```bash
cd sign-maker && grep -o -- "--ds-radius-md:[^;]*" dist/assets/*.css | head -1
```
Expected: `--ds-radius-md: 12px`

Run:
```bash
cd sign-maker && for c in ds-card ds-icon-btn app-mark seg-btn btn-primary; do printf '%-14s %s\n' "$c" "$(grep -qo "\.$c" dist/assets/*.css && echo 있음 || echo '** 사라짐 **')"; done
```
Expected: 5개 전부 "있음"

- [ ] **Step 14: 유틸리티와 `var()` 가 같은 값을 참조하는지 확인한다**

sign-maker 는 Tailwind 유틸리티와 `var()` 를 혼용하는 유일한 앱이다. `--ds-` 접두사 규칙이 실제로 동작하는지 여기서 검증한다.

Run:
```bash
cd sign-maker && grep -oE "\.(rounded-(sm|md|lg)|shadow-sm)\{[^}]*\}" dist/assets/*.css
```
Expected: 각 유틸리티가 `var(--ds-radius-*)` 또는 `var(--ds-shadow-sm)` 를 참조. Tailwind 기본 리터럴 값(`0.375rem`, `rgb(0 0 0 / 0.1)`)이 나오면 실패다.

- [ ] **Step 15: 커밋한다**

```bash
git add sign-maker/src/index.css sign-maker/src/styles
git commit -m "refactor(sign-maker): consume canonical design system

- theme.css 를 정본 복사본 3개(ds-tokens/ds-base/ds-primitives)로 교체
- theme.local.css 신설: --paper (서명 캔버스는 테마 무관 흰 종이)
- ds-sync.test.ts 로 정본과 복사본의 drift 감지
- 토큰 이름을 --ds- 접두사로 치환 (값 변화 없음)

정본이 가져오는 의도된 시각 변화:
- --muted 3.66:1 -> 4.97:1, --danger 4.30:1 -> 5.32:1 (본문 AA 통과)
- 다크 shadow 오버라이드 추가 (기존에는 다크에서 그림자가 보이지 않았다)
- --surface-2 #f7f7f8 -> #f4f4f5, transition 160ms -> 120ms"
```

---

### Task 5: sign-maker 프리미티브 적용과 중복 제거

**Files:**
- Modify: `sign-maker/src/components/layout/Header.tsx`
- Modify: `sign-maker/src/styles/components.css`

**Interfaces:**
- Consumes: `.ds-icon-btn`, `.ds-card` (Task 1), 정본 base.css 의 전역 포커스링 (Task 4)
- Produces: 앱이 정본 프리미티브를 감싸는 패턴. 이후 앱들이 이 방식을 복제한다.

- [ ] **Step 1: 테마 토글이 `.ds-icon-btn` 을 쓰도록 바꾼다**

`sign-maker/src/components/layout/Header.tsx` 의 테마 토글 버튼에서 앱 로컬 클래스와 Tailwind 크기 지정을 정본 프리미티브로 대체한다. 기존은 `className="btn-icon w-9 h-9 grid place-items-center shrink-0"` 였다. `.ds-icon-btn` 이 36px·grid·`flex: 0 0 auto` 를 이미 포함한다.

```tsx
      {/* Theme toggle */}
      <button
        onClick={onToggleTheme}
        aria-label="테마 전환"
        className="ds-icon-btn"
      >
        {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
      </button>
```

- [ ] **Step 2: 헤더 카드가 정본 `.ds-card` 를 쓰는지 확인한다**

`Header.tsx` 의 `<header className="ds-card flex items-center gap-3 max-w-[1400px] mx-auto mb-5 px-5 py-4">` 는 이미 `.ds-card` 를 쓴다. 이 스텝에서는 바꾸지 않는다 — `max-w-[1400px]` 는 Task 6 에서 컨테이너 토큰으로 옮긴다.

- [ ] **Step 3: `components.css` 에서 정본과 중복되는 정의를 제거한다**

`.ds-card` 와 `.btn-icon` 은 정본으로 옮겨졌고, 컴포넌트별 포커스링은 정본 `base.css` 의 전역 규칙이 대신한다. `sign-maker/src/styles/components.css` 에서 아래 세 블록을 **삭제**한다.

삭제 1 — 정본 `primitives.css` 가 소유한다:

```css
.ds-card {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--ds-radius-lg);
  box-shadow: var(--ds-shadow-sm);
}
```

삭제 2 — `.ds-icon-btn` 이 대체한다:

```css
.btn-icon {
  background: var(--surface);
  color: var(--muted);
  border: 1px solid var(--line);
  border-radius: var(--ds-radius-md);
  transition: background var(--ds-duration-fast) var(--ds-ease-standard), color var(--ds-duration-fast) var(--ds-ease-standard);
}
.btn-icon:hover { background: var(--fill); color: var(--text); }
```

삭제 3 — 정본 `base.css` 의 전역 `:focus-visible` 이 대체한다:

```css
/* Focus ring — 2px primary outline, 2px offset */
.btn-primary:focus-visible,
.btn-secondary:focus-visible,
.btn-icon:focus-visible,
.seg-btn:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}
```

- [ ] **Step 4: 삭제한 클래스의 잔존 참조가 없는지 확인한다**

Run:
```bash
cd sign-maker && grep -rn "btn-icon" src/ || echo "btn-icon 참조 없음"
```
Expected: `btn-icon 참조 없음`

- [ ] **Step 5: 포커스링이 전역 규칙으로 살아 있는지 확인한다**

Run: `cd sign-maker && mise run build && grep -o "outline: 2px solid var(--primary)" dist/assets/*.css | head -1`
Expected: `outline: 2px solid var(--primary)`

- [ ] **Step 6: 전체 검증을 실행한다**

Run: `cd sign-maker && mise run check`
Expected: test·lint·typecheck·build 전부 exit 0

- [ ] **Step 7: 커밋한다**

```bash
git add sign-maker/src/components/layout/Header.tsx sign-maker/src/styles/components.css
git commit -m "refactor(sign-maker): use canonical primitives

- 테마 토글을 .ds-icon-btn 으로 교체 (36px, hover 에서 테두리 유지)
- 정본과 중복되는 .ds-card, .btn-icon 정의 삭제
- 컴포넌트별 focus-visible 4개 선언을 정본 base.css 의 전역 규칙으로 대체"
```

---

### Task 6: sign-maker 셸 계약 적용

**Files:**
- Modify: `sign-maker/src/components/layout/Header.tsx`
- Modify: `sign-maker/src/pages/SignMakerPage.tsx`
- Modify: `sign-maker/src/styles/components.css`
- Modify: `sign-maker/src/components/layout/Layout.tsx`

**Interfaces:**
- Consumes: `--ds-container-wide`, `--ds-font-size-title`, `--ds-page-padding` (Task 1)
- Produces: 헤더 슬롯 계약의 첫 구현. 브랜드 블록이 허브 링크가 되고 컨테이너가 토큰화된다.

sign-maker 는 현재 헤더가 `브랜드 → SegmentedTabs → 테마 토글` 순이라 유틸리티 슬롯 규칙(토글이 마지막)을 이미 만족한다. 남은 것은 허브 링크와 컨테이너·타이포 토큰화다.

- [ ] **Step 1: 허브 링크를 단정하는 실패 테스트를 작성한다**

`sign-maker/src/App.ui.test.tsx` 에 다음 테스트를 추가한다.

```tsx
  it('브랜드 블록이 Tool Hub 로 돌아가는 링크다', () => {
    render(<App />);

    const hubLink = screen.getByRole('link', { name: /Tool Hub/ });
    expect(hubLink).toHaveAttribute('href', 'https://tool-hub-rho.vercel.app/');
  });
```

- [ ] **Step 2: 테스트가 실패하는 것을 확인한다**

Run: `cd sign-maker && npm run test -- src/App.ui.test.tsx`
Expected: FAIL — `Unable to find an accessible element with the role "link"`

- [ ] **Step 3: 허브 URL 상수를 만들고 헤더 브랜드를 링크로 감싼다**

`home` 이 `src/constants.ts` 에 `GITHUB_REPO` 를 두는 패턴을 따른다. `sign-maker/src/constants.ts` 를 새로 만든다.

```ts
/**
 * Tool Hub 랜딩. 모든 도구의 헤더 브랜드 블록이 여기로 돌아간다.
 * 도구들이 각각 다른 Vercel 도메인에 배포되므로 절대 URL 이어야 한다.
 */
export const TOOL_HUB_URL = 'https://tool-hub-rho.vercel.app/';
```

`Header.tsx` 의 브랜드 블록(앱 마크 + 타이틀 + 서브타이틀)을 링크로 감싼다. 마크·타이틀·서브타이틀의 마크업은 유지한다.

```tsx
      <a
        href={TOOL_HUB_URL}
        className="flex items-center gap-3 min-w-0 flex-1 no-underline"
        aria-label="Tool Hub 로 이동"
      >
        <div className="app-mark w-10 h-10 rounded-xl grid place-items-center shrink-0">
          <Pencil size={18} />
        </div>
        <div className="min-w-0">
          <h1 className="app-title text-title font-bold">
            Signature &amp; Trace Studio
          </h1>
          <p className="app-subtitle text-body mt-0.5">
            서명을 직접 그리거나 이미지에서 추출해요.
          </p>
        </div>
      </a>
```

`text-xl`·`text-sm`·`leading-tight` 대신 정본 타이포 유틸리티 `text-title`·`text-body` 를 쓴다. 두 유틸리티가 행간과 자간을 함께 담는다.

`rounded-xl` 은 정본이 정의하지 않는 Tailwind 단계이므로 `rounded-md` 로 바꾼다(12px, `--ds-radius-md`).

```tsx
        <div className="app-mark w-10 h-10 rounded-md grid place-items-center shrink-0">
```

- [ ] **Step 4: 테스트가 통과하는 것을 확인한다**

Run: `cd sign-maker && npm run test -- src/App.ui.test.tsx`
Expected: PASS

- [ ] **Step 5: 컨테이너 폭을 토큰으로 옮긴다**

`Header.tsx` 와 `SignMakerPage.tsx` 의 `max-w-[1400px]` 두 곳을 정본 컨테이너 토큰으로 바꾼다. sign-maker 는 캔버스 도구라 `--ds-container-wide`(1600px) 를 쓴다.

`components.css` 에 컨테이너 클래스를 추가한다.

```css
/* 셸 컨테이너. 에디터·캔버스 도구는 --ds-container-wide 를 쓴다. */
.ds-shell {
  width: 100%;
  max-width: var(--ds-container-wide);
  margin-inline: auto;
  padding-inline: var(--ds-page-padding);
}

@media (max-width: 767px) {
  .ds-shell {
    padding-inline: var(--ds-page-padding-mobile);
  }
}
```

`Header.tsx` 의 `<header>` className 에서 `max-w-[1400px] mx-auto` 를 제거하고 `ds-shell` 을 넣는다.

```tsx
    <header className="ds-card ds-shell flex items-center gap-3 mb-5 py-4">
```

`SignMakerPage.tsx` 의 `max-w-[1400px]` 도 같은 방식으로 `ds-shell` 로 바꾼다. 해당 요소의 기존 `mx-auto` 와 좌우 padding 유틸리티를 함께 제거한다 — `ds-shell` 이 대신한다.

- [ ] **Step 6: 1400px 잔존 참조가 없는지 확인한다**

Run:
```bash
cd sign-maker && grep -rn "1400px" src/ || echo "1400px 참조 없음"
```
Expected: `1400px 참조 없음`

- [ ] **Step 7: 정본이 정의하지 않은 Tailwind radius 단계를 쓰지 않는지 확인한다**

Run:
```bash
cd sign-maker && grep -rnE "rounded-(xs|xl|2xl|3xl)\b" src/ || echo "금지된 radius 단계 없음"
```
Expected: `금지된 radius 단계 없음`

- [ ] **Step 8: 전체 검증을 실행한다**

Run: `cd sign-maker && mise run check`
Expected: test·lint·typecheck·build 전부 exit 0

- [ ] **Step 9: 산출 CSS 에 컨테이너 토큰이 반영됐는지 확인한다**

Run:
```bash
cd sign-maker && grep -o "max-width: *var(--ds-container-wide)" dist/assets/*.css | head -1
```
Expected: `max-width: var(--ds-container-wide)`

Run:
```bash
cd sign-maker && grep -o -- "--ds-container-wide:[^;]*" dist/assets/*.css | head -1
```
Expected: `--ds-container-wide: 1600px`

- [ ] **Step 10: 커밋한다**

```bash
git add sign-maker/src
git commit -m "feat(sign-maker): apply shell contract

- 브랜드 블록을 Tool Hub 허브 링크로 (도구 앱에 없던 복귀 경로)
- 타이포를 정본 유틸리티로: text-xl/text-sm -> text-title/text-body
- 컨테이너를 .ds-shell + --ds-container-wide 로 (1400px -> 1600px)
- rounded-xl -> rounded-md (정본이 정의하지 않는 Tailwind 단계 제거)"
```

---

## 파일럿 완료 확인

Task 6 이후 다음이 성립해야 한다. 2차 계획서를 쓰기 전 게이트다.

- [ ] `npm run tokens:test` exit 0 (스크립트 단위 테스트 6건)
- [ ] `npm run tokens:check` exit 0 (정본과 sign-maker 복사본 일치)
- [ ] `cd sign-maker && mise run check` exit 0
- [ ] `sign-maker/dist/assets/*.css` 에서 `rounded-md`·`shadow-sm` 유틸리티가 `var(--ds-*)` 를 참조 (Tailwind 기본 리터럴이 아님)
- [ ] 라이트·다크 양쪽에서 헤더·패널·버튼·세그먼트 컨트롤·서명 캔버스를 육안 확인. `mise run dev` 후 1280px 데스크톱과 390px 모바일
- [ ] 다크 모드에서 카드 그림자가 보인다 (기존에는 보이지 않았다)
- [ ] 테마 토글이 36px 이고 hover 시 크기가 변하지 않는다
- [ ] 브랜드 블록 클릭으로 Tool Hub 로 이동한다

## 알려진 위험

- **루트 `package.json` 신설이 Vercel 배포에 영향을 줄 수 있다.** 저장소에 `vercel.json` 이 없어 설정이 대시보드에 있고 확인할 수 없다. 각 프로젝트가 Root Directory 를 앱 디렉터리로 지정했다면 영향이 없고, 루트 `package.json` 에는 `build` script 와 `dependencies` 가 없어 읽혀도 설치·빌드할 것이 없다. Task 2 커밋을 푸시한 뒤 첫 프리뷰 배포가 성공하는지 확인한다.
- **`sign-maker` 에는 시각 회귀 테스트가 없다.** Task 4·5·6 의 산출 CSS `grep` 검증과 파일럿 완료 확인의 육안 점검이 유일한 가드다.
- **`--ds-duration-fast` 가 기존 `--dur` 보다 40ms 짧다.** transition 이 미세하게 빨라진다. 육안으로 어색하면 정본의 값을 재검토한다 — sign-maker 만 되돌리지 않는다.
- **허브 URL `https://tool-hub-rho.vercel.app/` 이 8개 앱에 하드코딩된다.** 도메인이 바뀌면 8곳을 고쳐야 한다. 2차 계획서에서 앱 수가 늘어날 때 환경변수 주입으로 바꿀지 재검토한다. 지금은 상수가 단순하고 Vercel 환경변수를 8개 프로젝트에 등록하는 비용이 없다.
