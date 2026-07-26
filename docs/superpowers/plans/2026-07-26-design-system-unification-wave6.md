# 디자인 시스템 통일 6차: api-contract-test-generator

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 1~5차와 병행 개발되어 정본을 소비하지 않는 마지막 앱 `api-contract-test-generator`를 정본 디자인 시스템으로 옮기고, 저장소의 모든 대상 앱을 단일 출처로 수렴시킨다.

**Architecture:** 이 앱은 이미 컨벤션 문서를 보고 만들어져 정본과 **구조가 같다** — `[data-theme]` 다크모드, `theme.ts` + `useTheme`, FOUC 스크립트, `dark:` 변형 0건, `text-*`/`rounded-*` 유틸리티 0건, 폰트 자산 보유. 그래서 작업은 구조 전환이 아니라 **토큰 출처 교체**다. 자체 `theme.css`의 선언을 정본 3파일로 갈아끼우고, 이름이 다른 토큰(`--radius-*` → `--ds-radius-*` 등)의 참조부를 개명한 뒤, 값 차이를 별도 커밋으로 정렬한다.

**Tech Stack:** Vite + React 19 SPA · Tailwind 4 · vitest 4 · Playwright (chromium) · TypeScript

## Global Constraints

- 작업 디렉터리는 워크트리 `/Users/dongjin/dev/project/tool-hub/.claude/worktrees/ds-wave6`, 브랜치는 `feat/design-system-api-contract` 다. 원본 체크아웃으로 `cd` 하지 않는다.
- `git stash` 를 맨몸으로 쓰지 않는다. 작업을 미뤄야 하면 WIP 커밋을 만든다.
- `styles/ds-tokens.css` · `ds-base.css` · `ds-primitives.css` · `ds-sync.test.ts` 는 **생성물이다.** 직접 편집하지 말고 `packages/design-system/` 정본을 고친 뒤 저장소 루트에서 `npm run tokens:sync` 를 실행한다.
- **이름 치환과 값 변경을 같은 커밋에 섞지 않는다.** Task 1 은 값을 보존하고(현재 값을 `theme.local.css` 에 임시로 유지), Task 2 가 값 변경만 담는다.
- Tailwind 테마 네임스페이스와 겹치는 토큰은 `--ds-` 접두사를 쓴다. 접두사가 없으면 `rounded-md` 유틸리티와 `var(--radius-md)` 가 서로 다른 값을 참조한다.
- **타이포는 Tailwind 유틸리티가 아니라 CSS 에서 토큰으로 쓴다.** 이 앱은 이미 그렇게 되어 있으므로 유지한다.
- 검증 명령은 `mise run check`(= `test` + `lint` + `typecheck` + `build` + `e2e`) 다.
- 허브 URL 은 `https://tool-hub-rho.vercel.app/` 다. 다른 7개 앱과 같은 상수 패턴을 쓴다.

## 사전 실측

`main`(7881673)에서 확인한 사실이다. 실행자는 다시 증명할 필요가 없다.

**이미 컨벤션에 맞는 것 — 건드리지 않는다**

| 항목 | 상태 |
|---|---|
| 다크모드 메커니즘 | `[data-theme='dark']` CSS. `dark:` 변형 **0건** |
| FOUC 인라인 스크립트 | `index.html` 에 있음. `documentElement.dataset.theme` 설정 |
| 테마 모듈 | `src/theme.ts` + `src/hooks/useTheme.ts` (+ `theme.test.ts`) |
| 타이포 지정 방식 | 전부 CSS. `text-*` 유틸리티 **0건** — 레이어 우선순위 함정에 안 걸린다 |
| radius/shadow 유틸리티 | `rounded-*`·`shadow-*` **0건** — 접두사 충돌이 잠재 상태 |
| 폰트 자산 | `public/fonts/toolhub-sans.woff2` + LICENSE 보유 |
| 아이콘 버튼 크기 | `.icon-button` 이 이미 36px |
| E2E 가드 | `responsive.spec.ts` 에 5개 뷰포트 넘침 검사 + **light/dark WCAG 대비 검사** |

**값이 이미 정본과 정확히 같은 토큰**

`--bg: #f7f7f8` · `--surface: #ffffff` · `--text: #171717`(정본 `rgb(23,23,23)` 과 동일) · `--line: rgba(112, 115, 124, 0.22)` · `--primary: #3366ff` · `--primary-strong: #005eeb` · `--primary-surface: #eaf2fe` · `--radius-sm/md/lg: 8/12/16px`

**이름이 다른 토큰 — 참조부 개명 필요 (Task 1)**

| 현재 이름 | 사용 횟수 | 정본 이름 |
|---|---|---|
| `--radius-sm` | 10 | `--ds-radius-sm` |
| `--radius-md` | 8 | `--ds-radius-md` |
| `--radius-lg` | 2 | `--ds-radius-lg` |
| `--shadow-sm` | 4 | `--ds-shadow-sm` |
| `--surface-muted` | 6 | `--surface-2` |

**값이 다른 토큰 — Task 2 에서 정렬**

| 토큰 | 이 앱 (light) | 정본 (light) | 방향 |
|---|---|---|---|
| `--muted` | `rgba(55, 56, 60, 0.61)` | `rgba(55, 56, 60, 0.72)` | 대비 상승 (4.55:1 AA) |
| `--surface-2` | `#f1f3f6` | `#f4f4f5` | 중성으로 |
| `--danger` | `#d92d20` | `#d11f2e` | — |
| `--warning` | `#b54708` | `#a15c00` | — |
| `--success` | `#067647` | `#18794e` | — |
| `--danger-surface` | `#fef3f2` | `rgba(209, 31, 46, 0.08)` | 알파로 |
| `--warning-surface` | `#fffaeb` | `rgba(161, 92, 0, 0.10)` | 알파로 |
| `--success-surface` | `#ecfdf3` | `rgba(24, 121, 78, 0.10)` | 알파로 |
| `--shadow-sm` | `0 1px 2px rgba(23,23,25,.06), 0 1px 3px rgba(23,23,25,.07)` | 정본 값 | — |

다크 팔레트도 전부 다르다(`--bg: #111318` vs 정본 `rgb(15,15,16)` 등). Task 2 에서 정본 값으로 넘어간다.

**정본에만 있어 새로 쓸 수 있게 되는 것**: `--surface-3` · `--fill-subtle/-fill/-fill-bold` · `--line-subtle/-strong` · `--control-border` · `--text-neutral` · `--disabled` · `--on-primary` · `--primary-heavy` · 타이포 5단계 · 모션 · z-index · 컨테이너 · `--ds-radius-pill` · `--ds-shadow-md/-lg/-xl` · 프리미티브 `.ds-card`/`.ds-icon-btn`

**타이포 인벤토리** — `components.css` 32곳

| 현재 | 개수 | → | 비고 |
|---|---|---|---|
| `10px`, `11px`, `12px` | 14 | `--ds-font-size-caption` (12px) | |
| `13px`, `14px` | 13 | `--ds-font-size-body` (14px) | |
| `20px` | 1 | `--ds-font-size-title` (20px) | `.detail-heading h3` — 값 동일 |
| `24px` | 1 | `--ds-font-size-display` (28px) | `.export-summary strong` — 저장소 첫 display 소비처 |
| `clamp(18px, 2vw, 22px)` | 1 | `--ds-font-size-title` (20px) | `.app-header h1` — 셸 계약이 title 을 요구 |
| `clamp(28px, 5vw, 52px)` | 1 | **유지** | `.welcome-panel h2` 랜딩 히어로 |
| `clamp(24px, 3vw, 34px)` | 1 | **유지** | `.section-heading h2` 섹션 히어로 |

두 clamp 를 유지하는 근거는 4차에서 `home` 의 `.heroTitle` 에 적용한 것과 같다 — 정본 display 28px 는 랜딩 히어로의 **하한**이라 축소가 된다. 장식 타이포는 앱 고유로 둔다.

**셸 계약 격차 2건**

1. **브랜드 블록이 허브 링크가 아니다.** 계약은 "전체가 허브로 가는 링크"를 요구한다. 허브 URL 상수도 없다.
2. **`.icon-button` 이 정본 `.ds-icon-btn` 이 아니다.** 크기(36px)는 같지만 hover/disabled/테두리 규약이 정본과 다르다.

푸터는 없다(계약대로 `home` 전용). 유틸리티 슬롯의 마지막 요소는 이미 테마 토글이다(`.privacy-note` 가 그 앞).

---

### Task 1: 정본 도입과 토큰 개명 (값 보존)

`theme.css` 의 선언을 정본으로 교체하고 참조부를 개명한다. **이 태스크에서 화면은 바뀌지 않는다** — 값이 다른 토큰은 `theme.local.css` 에 현재 값을 임시로 유지한다.

**Files:**
- Modify: `scripts/sync-design-tokens.mjs` (`TARGETS`)
- Modify: `scripts/sync-design-tokens.test.mjs` (기대 목록)
- Create: `api-contract-test-generator/src/styles/theme.local.css`
- Delete: `api-contract-test-generator/src/styles/theme.css`
- Modify: `api-contract-test-generator/src/index.css`
- Modify: `api-contract-test-generator/src/styles/base.css`
- Modify: `api-contract-test-generator/src/styles/components.css` (토큰 개명 30곳)
- 생성됨(스크립트가): `api-contract-test-generator/src/styles/ds-{tokens,base,primitives}.css`, `ds-sync.test.ts`

**Interfaces:**
- Produces: `TARGETS['api-contract-test-generator'] === 'src/styles'`. 이후 태스크가 `--ds-radius-*` · `--surface-2` · `--on-primary` 를 쓸 수 있다.

- [ ] **Step 1: 루트 동기화 테스트의 기대 목록을 먼저 깨뜨린다**

`scripts/sync-design-tokens.test.mjs` 의 `TARGETS 는 마이그레이션된 앱만 담는다` 배열 마지막에 추가한다.

```js
      'webpage-capture-tool',
      'api-contract-test-generator',
    ]);
```

- [ ] **Step 2: 실패를 확인한다**

```bash
npm run tokens:test
```

Expected: FAIL — 8개 vs 9개 불일치.

- [ ] **Step 3: TARGETS 에 앱을 추가한다**

`scripts/sync-design-tokens.mjs` 의 `TARGETS` 마지막 항목 뒤에 추가한다.

```js
  // Electron 앱은 렌더러가 워크스페이스 안쪽에 있어 경로가 깊다.
  'webpage-capture-tool': 'apps/electron/renderer/styles',
  'api-contract-test-generator': 'src/styles',
};
```

- [ ] **Step 4: 통과와 동기화를 확인한다**

```bash
npm run tokens:test && npm run tokens:sync
```

Expected: 7 tests 통과. 동기화 출력에 `api-contract-test-generator/src/styles/` 4개 파일이 나온다.

- [ ] **Step 5: `theme.local.css` 를 만든다**

`api-contract-test-generator/src/styles/theme.local.css`:

```css
/* api-contract-test-generator 고유 토큰. 정본 뒤에 로드되어 정본을 덮을 수 있다.
   여기 있는 토큰이 3개 이상 앱에서 반복되면 정본으로 승격한다. */

:root {
  /* 랜딩 히어로 타이포. 정본 display(28px)는 이 자리에서 하한이라
     그대로 쓰면 축소가 된다. 장식 타이포는 앱 고유로 둔다. */
  --hero-size: clamp(28px, 5vw, 52px);
  --section-hero-size: clamp(24px, 3vw, 34px);

  /* TODO(Task 2 에서 제거): 값 변경을 이름 치환과 분리하기 위해
     현재 값을 그대로 유지한다. Task 2 가 이 블록을 지우면 정본 값으로
     넘어간다. */
  --muted: rgba(55, 56, 60, 0.61);
  --surface-2: #f1f3f6;
  --danger: #d92d20;
  --danger-surface: #fef3f2;
  --warning: #b54708;
  --warning-surface: #fffaeb;
  --success: #067647;
  --success-surface: #ecfdf3;
  --ds-shadow-sm: 0 1px 2px rgba(23, 23, 25, 0.06), 0 1px 3px rgba(23, 23, 25, 0.07);
}

[data-theme='dark'] {
  /* TODO(Task 2 에서 제거): 위와 같은 이유. */
  --bg: #111318;
  --surface: #1a1d24;
  --surface-2: #222631;
  --text: #f5f6f8;
  --muted: rgba(226, 229, 237, 0.62);
  --line: rgba(214, 219, 232, 0.17);
  --primary: #7092ff;
  --primary-strong: #8eacff;
  --primary-surface: #202c50;
  --danger: #ff8a80;
  --danger-surface: #442422;
  --warning: #fdb022;
  --warning-surface: #3b2f19;
  --success: #47cd89;
  --success-surface: #173a2b;
  --ds-shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.32);
}
```

`color-scheme` 는 정본 `tokens.css` 가 담당하지 않는다. Step 7 에서 `base.css` 로 옮긴다.

- [ ] **Step 6: 진입 CSS 를 정본 순서로 바꾼다**

`api-contract-test-generator/src/index.css` 전체를 아래로 바꾼다.

```css
/* 스타일 진입점.
   CSS 스펙상 @import 는 최상단에만 올 수 있으므로 이 파일은 import 만 담는다.
   import 순서 = 캐스케이드 순서다.

   ds-*.css 는 packages/design-system 의 생성물이다. 직접 편집하지 말고
   정본을 고친 뒤 저장소 루트에서 `npm run tokens:sync` 를 실행한다. */
@import 'tailwindcss';
@import './styles/ds-tokens.css';
@import './styles/ds-base.css';
@import './styles/ds-primitives.css';
@import './styles/theme.local.css';
@import './styles/base.css';
@import './styles/components.css';
```

- [ ] **Step 7: `theme.css` 를 지우고 `base.css` 를 정리한다**

```bash
rm api-contract-test-generator/src/styles/theme.css
```

`base.css` 에서 세 가지를 고친다.

첫째, `color-scheme` 를 `theme.css` 에서 잃었으므로 되살린다. 파일 맨 앞에 추가한다.

```css
/* 정본 tokens.css 는 color-scheme 를 다루지 않는다. 폼 컨트롤과
   스크롤바의 네이티브 렌더링에 필요하므로 여기서 선언한다. */
:root, [data-theme='light'] { color-scheme: light; }
[data-theme='dark'] { color-scheme: dark; }
```

둘째, `body` 의 폰트 스택을 정본 토큰으로 바꾼다.

```css
  font-family: var(--ds-font-sans);
```

셋째, 포커스링 블록을 **삭제한다**. 정본 `ds-base.css` 의 전역 `:where(...):focus-visible` 이 담당한다. 아래 5줄을 지운다.

```css
button:focus-visible,
input:focus-visible,
select:focus-visible,
textarea:focus-visible {
  outline: 3px solid color-mix(in srgb, var(--primary) 34%, transparent);
  outline-offset: 2px;
}
```

정본의 `@font-face` 가 같은 family 와 같은 절대 경로(`/fonts/toolhub-sans.woff2`)를 선언하므로 앱 쪽 선언은 `theme.css` 와 함께 사라지면 된다. 이 앱은 Vite 가 `public/` 을 루트로 서빙하므로 절대 경로가 그대로 맞는다.

- [ ] **Step 8: 토큰 참조부를 개명한다**

```bash
cd api-contract-test-generator && sed -i '' \
  -e 's/var(--radius-sm)/var(--ds-radius-sm)/g' \
  -e 's/var(--radius-md)/var(--ds-radius-md)/g' \
  -e 's/var(--radius-lg)/var(--ds-radius-lg)/g' \
  -e 's/var(--shadow-sm)/var(--ds-shadow-sm)/g' \
  -e 's/var(--surface-muted)/var(--surface-2)/g' \
  src/styles/components.css src/styles/base.css
```

- [ ] **Step 9: 남은 구 참조가 없는지 확인한다**

```bash
cd api-contract-test-generator && grep -rn "var(--radius-\|var(--shadow-\|var(--surface-muted)" src/ || echo "남은 참조 없음"
```

Expected: `남은 참조 없음`

`src/` 전체를 보는 이유는 tsx 인라인 스타일에 남아 있을 수 있기 때문이다. 발견되면 같은 규칙으로 고친다.

- [ ] **Step 10: 검증**

```bash
cd api-contract-test-generator && mise run check
```

Expected: 전부 통과. drift 테스트 4건과 금지 유틸리티 1건이 새로 붙는다. **E2E 의 WCAG 대비 검사가 여기서 통과해야 한다** — 값을 보존했으므로 대비도 그대로여야 한다.

- [ ] **Step 11: 다른 8개 앱이 깨지지 않았는지 확인한다**

`TARGETS` 가 바뀌었으니 루트 검사를 돌린다.

```bash
npm run tokens:check && npm run tokens:test
```

Expected: drift 0건, 7 tests 통과.

- [ ] **Step 12: 커밋**

```bash
git add scripts/ api-contract-test-generator/ && git commit -m "feat(api-contract-test-generator): consume the canonical design tokens"
```

---

### Task 2: 색·그림자 값을 정본으로 정렬

Task 1 이 유지한 임시 값을 걷어내 정본 팔레트로 넘어간다. **이 태스크가 유일한 시각 변화**이므로 되돌리기 쉽게 분리한다.

가장 강한 가드는 이 앱이 이미 갖고 있는 `e2e/responsive.spec.ts` 의 light/dark WCAG 대비 검사다.

**Files:**
- Modify: `api-contract-test-generator/src/styles/theme.local.css` (임시 블록 제거)

- [ ] **Step 1: 변경 전 대비를 기록한다**

```bash
cd api-contract-test-generator && npx playwright test e2e/responsive.spec.ts -g "WCAG" --reporter=list
```

Expected: 2 passed (light, dark). 이 둘이 변경 후에도 통과해야 한다.

- [ ] **Step 2: 임시 값 블록을 제거한다**

`theme.local.css` 에서 `TODO(Task 2 에서 제거)` 주석이 붙은 두 블록의 내용을 지운다. 결과는 아래와 같아야 한다 — 랜딩 히어로 토큰만 남는다.

```css
/* api-contract-test-generator 고유 토큰. 정본 뒤에 로드되어 정본을 덮을 수 있다.
   여기 있는 토큰이 3개 이상 앱에서 반복되면 정본으로 승격한다. */

:root {
  /* 랜딩 히어로 타이포. 정본 display(28px)는 이 자리에서 하한이라
     그대로 쓰면 축소가 된다. 장식 타이포는 앱 고유로 둔다. */
  --hero-size: clamp(28px, 5vw, 52px);
  --section-hero-size: clamp(24px, 3vw, 34px);
}
```

- [ ] **Step 3: 대비 검사가 여전히 통과하는지 확인한다**

```bash
cd api-contract-test-generator && npx playwright test e2e/responsive.spec.ts --reporter=list
```

Expected: 전부 통과. `--muted` 는 알파가 0.61 → 0.72 로 올라 대비가 **좋아지는** 방향이다. 실패하면 어떤 쌍이 몇 대 몇인지 기록하고, 정본 값을 바꾸는 것이 아니라 그 쌍의 사용처를 정본의 다른 역할 토큰으로 바꾼다.

- [ ] **Step 4: 전체 검증**

```bash
cd api-contract-test-generator && mise run check
```

- [ ] **Step 5: 눈으로 확인한다**

```bash
cd api-contract-test-generator && npx playwright test e2e/responsive.spec.ts -g "1440px"
```

로 화면이 깨지지 않는지 본 뒤, 스크린샷으로 light/dark 를 직접 확인한다. 확인 대상은 상태 배지(`.status-badge`), 진단 목록(`.diagnostic-list`), 인라인 경고(`.inline-alert`), 포맷 카드(`.format-card`) — `--danger`/`--warning`/`--success` 계열이 쓰인 곳이다.

- [ ] **Step 6: 커밋**

```bash
git add api-contract-test-generator/ && git commit -m "refactor(api-contract-test-generator): align colors with the canonical palette"
```

---

### Task 3: 셸 계약 적용

격차 2건을 메운다 — 브랜드 블록을 허브 링크로, 아이콘 버튼을 정본 프리미티브로.

**Files:**
- Create: `api-contract-test-generator/src/constants.ts`
- Modify: `api-contract-test-generator/src/components/layout/Header.tsx`
- Modify: `api-contract-test-generator/src/components/ui/Button.tsx`
- Modify: `api-contract-test-generator/src/styles/components.css`
- Modify: `api-contract-test-generator/e2e/generator.spec.ts` (탭 순서가 바뀌면)

**Interfaces:**
- Produces: `TOOL_HUB_URL` 상수. 헤더 브랜드가 `<a>` 가 된다.

- [ ] **Step 1: 허브 URL 상수를 만든다**

`api-contract-test-generator/src/constants.ts`:

```ts
/** 도구 앱은 헤더 브랜드 링크로 허브에 복귀한다. 푸터는 home 전용이다. */
export const TOOL_HUB_URL = 'https://tool-hub-rho.vercel.app/';
```

- [ ] **Step 2: 헤더 브랜드를 링크로 바꾼다**

`Header.tsx` 의 `<div className="brand-block">` 블록을 아래로 바꾼다. `import` 두 줄도 추가한다.

```tsx
import { Moon, ShieldCheck, Sun } from 'lucide-react';
import type { Theme } from '../../theme';
import { TOOL_HUB_URL } from '../../constants';
import { Button } from '../ui/Button';

interface HeaderProps {
  theme: Theme;
  onToggleTheme: () => void;
}

export function Header({ theme, onToggleTheme }: HeaderProps) {
  const nextTheme = theme === 'light' ? '다크' : '라이트';

  return (
    <header className="app-header">
      {/* 셸 계약: 브랜드 블록 전체가 허브로 가는 링크다. */}
      <a className="brand-block" href={TOOL_HUB_URL}>
        <span className="brand-mark" aria-hidden="true">AC</span>
        <div>
          <p className="eyebrow">Tool Hub</p>
          <h1>API Contract Test Generator</h1>
        </div>
      </a>
      <div className="header-actions">
        <p className="privacy-note"><ShieldCheck size={16} aria-hidden="true" /> 명세와 결과는 브라우저 밖으로 전송하지 않습니다.</p>
        <Button variant="ghost" className="icon-button" aria-label={`${nextTheme} 테마로 전환`} onClick={onToggleTheme}>
          {theme === 'light' ? <Moon size={18} aria-hidden="true" /> : <Sun size={18} aria-hidden="true" />}
        </Button>
      </div>
    </header>
  );
}
```

`target="_blank"` 를 쓰지 않는다 — 허브는 같은 도구 모음이므로 같은 탭에서 이동하는 것이 다른 7개 앱과 같다.

- [ ] **Step 3: 브랜드 링크 CSS 를 추가하고 brand-mark 를 토큰화한다**

`components.css` 의 `.brand-block { gap: 12px; }` 를 아래로 바꾼다.

```css
/* 브랜드 블록 전체가 허브 링크다. 링크 기본 장식을 지우고 색은 물려받는다. */
.brand-block {
  gap: 12px;
  color: inherit;
  text-decoration: none;
}
.brand-block:hover h1 { color: var(--primary); }
```

그리고 `.brand-mark` 의 리터럴 두 개를 토큰으로 바꾼다.

```css
  border-radius: var(--ds-radius-md);
  background: var(--primary);
  color: var(--on-primary);
```

- [ ] **Step 4: 아이콘 버튼을 정본 프리미티브로 바꾼다**

2차에서 `json-yaml-converter` 에 쓴 방식과 같다 — `Button` 이 `icon` variant 를 받으면 `.button button--*` 대신 `ds-icon-btn` 만 내보낸다. 두 클래스를 겹치면 `.button` 의 `border`/`padding`/`min-height` 가 프리미티브와 충돌한다.

`Button.tsx` 전체를 아래로 바꾼다.

```tsx
import type { ButtonHTMLAttributes, ReactNode } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'icon';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: ButtonVariant;
}

export function Button({ children, className = '', variant = 'secondary', type = 'button', ...props }: ButtonProps) {
  // icon 은 정본 프리미티브 하나로만 스타일한다. .button 과 겹치면
  // border·padding·min-height 가 .ds-icon-btn 과 충돌한다.
  const base = variant === 'icon' ? 'ds-icon-btn' : `button button--${variant}`;

  return (
    <button className={`${base} ${className}`.trim()} type={type} {...props}>
      {children}
    </button>
  );
}
```

`Header.tsx` 의 호출부를 아래로 바꾼다 — `className="icon-button"` 을 없앤다.

```tsx
        <Button variant="icon" aria-label={`${nextTheme} 테마로 전환`} onClick={onToggleTheme}>
```

그다음 `components.css` 에서 `.icon-button` 규칙 한 줄을 삭제한다.

```css
.icon-button { width: 36px; padding: 0; display: grid; place-items: center; }
```

다른 곳에서 `icon-button` 또는 `variant="ghost"` 를 쓰는지 확인한다. `ghost` 는 남겨두되 `icon-button` 이 다른 사용처에 있으면 그쪽도 `variant="icon"` 으로 바꾼다.

```bash
cd api-contract-test-generator && grep -rn "icon-button\|variant=\"ghost\"" src/
```

- [ ] **Step 5: 탭 순서 회귀를 확인한다**

브랜드가 링크가 되어 포커스 가능한 첫 요소가 바뀐다. 키보드 E2E 가 있다.

```bash
cd api-contract-test-generator && npx playwright test e2e/generator.spec.ts -g "키보드"
```

실패하면 테스트를 고친다 — 첫 Tab 이 허브 링크에 닿는다는 단정을 앞에 추가하는 방식이 5차에서 쓴 방법이다. 링크가 실제로 첫 tabbable 인지는 아래로 확인한다.

```bash
cd api-contract-test-generator && npx playwright test e2e/generator.spec.ts --reporter=list
```

- [ ] **Step 6: 전체 검증**

```bash
cd api-contract-test-generator && mise run check
```

- [ ] **Step 7: 커밋**

```bash
git add api-contract-test-generator/ && git commit -m "refactor(api-contract-test-generator): apply the shared header shell contract"
```

---

### Task 4: 타이포를 정본 5단계로 수렴

`components.css` 의 32곳을 정본 척도로 옮긴다. 랜딩 히어로 2곳만 앱 고유 토큰을 쓴다.

**Files:**
- Modify: `api-contract-test-generator/src/styles/components.css`

- [ ] **Step 1: 고정 크기를 정본 단계로 바꾼다**

```bash
cd api-contract-test-generator && sed -i '' \
  -e 's/font-size: 1[012]px/font-size: var(--ds-font-size-caption)/g' \
  -e 's/font-size: 1[34]px/font-size: var(--ds-font-size-body)/g' \
  -e 's/font-size: 20px/font-size: var(--ds-font-size-title)/g' \
  -e 's/font-size: 24px;/font-size: var(--ds-font-size-display);/g' \
  src/styles/components.css
```

`24px` 뒤에 세미콜론을 붙이는 이유는 `clamp(24px, 3vw, 34px)` 안의 `24px` 를 건드리지 않기 위해서다. macOS 는 BSD sed 라 `\|` 대체 표현을 쓸 수 없으므로 문자 클래스와 리터럴로만 쓴다.

- [ ] **Step 2: clamp 두 개를 앱 고유 토큰으로 바꾼다**

`.welcome-panel h2` 와 `.section-heading h2` 를 아래로 바꾼다.

```css
  font-size: var(--hero-size);
```

```css
  font-size: var(--section-hero-size);
```

- [ ] **Step 3: 헤더 h1 을 셸 계약대로 title 로 바꾼다**

`.app-header h1` 의 `font-size: clamp(18px, 2vw, 22px)` 를 아래로 바꾼다.

```css
.app-header h1 { margin-top: 3px; font-size: var(--ds-font-size-title); letter-spacing: -0.04em; }
```

`letter-spacing: -0.04em` 은 정본 `--ds-tracking-title`(-0.01em)보다 촘촘하다. 이 앱 제목이 길어서 좁은 폭에서 줄바꿈을 막는 값이므로 유지한다. Step 5 의 320px 넘침 검사가 이를 지킨다.

- [ ] **Step 4: 리터럴이 남지 않았는지 확인한다**

```bash
cd api-contract-test-generator && grep -rn "font-size: [0-9]\|font-size: clamp" src/ || echo "리터럴 font-size 없음"
```

Expected: `리터럴 font-size 없음`

- [ ] **Step 5: 반응형 넘침 검사**

이 앱은 320px 부터 1440px 까지 5개 뷰포트의 넘침·겹침을 E2E 로 검사한다. 글자가 커지는 변화이므로 이 검사가 핵심 가드다.

```bash
cd api-contract-test-generator && npx playwright test e2e/responsive.spec.ts --reporter=list
```

Expected: 전부 통과. 실패하면 어느 뷰포트의 어느 요소인지 기록하고, 그 요소만 `theme.local.css` 에 앱 고유 단계를 두어 예외 처리한다.

- [ ] **Step 6: 전체 검증**

```bash
cd api-contract-test-generator && mise run check
```

- [ ] **Step 7: 커밋**

```bash
git add api-contract-test-generator/ && git commit -m "refactor(api-contract-test-generator): converge typography onto the canonical five-step scale"
```

---

### Task 5: 문서 갱신과 9개 앱 최종 검증

**Files:**
- Modify: `docs/frontend-conventions.md` (적용 대상 표)
- Modify: `CLAUDE.md` (프로젝트 목록에 앱 누락)

- [ ] **Step 1: 적용 대상 표를 갱신한다**

`docs/frontend-conventions.md` 의 표에서 `api-contract-test-generator` 행을 없애고 Vite 행에 합친다. 미적용 각주도 지운다.

```markdown
| 스택 | 앱 | 정본 토큰 | 셸 계약 |
|---|---|---|---|
| Vite + React SPA | `home`, `sign-maker`, `json-yaml-converter`, `openapi-editor`, `api-contract-test-generator` | 적용 | 적용 |
| Next.js App Router | `ddl-seed-generator`, `config-diff-viewer`, `dummy-file-generator` | 적용 | 적용 |
| Electron + 바닐라 CSS | `webpage-capture-tool` | 적용 | 미적용 |

> `webpage-capture-tool` 은 데스크톱 워크벤치라 헤더 3슬롯·브랜드 허브 링크·컨테이너 폭 규칙이 맞지 않는다. 토큰과 `<dialog>` 규칙만 따른다. `class-diagram-generator`(Kotlin)는 대상 외.
```

- [ ] **Step 2: 루트 CLAUDE.md 의 프로젝트 목록을 고친다**

`api-contract-test-generator/` 가 빠져 있다. `openapi-editor/` 뒤에 넣는다.

```markdown
- Each tool lives in its own project directory: `home/`, `sign-maker/`, `json-yaml-converter/`, `openapi-editor/`, `api-contract-test-generator/`, `ddl-seed-generator/`, `config-diff-viewer/`, `dummy-file-generator/`, `webpage-capture-tool/`, `class-diagram-generator/`.
```

- [ ] **Step 3: 9개 앱 전체 검증**

```bash
for app in sign-maker json-yaml-converter ddl-seed-generator openapi-editor dummy-file-generator config-diff-viewer home webpage-capture-tool api-contract-test-generator; do printf "%-30s " "$app"; (cd "$app" && mise run check >/tmp/w6-$app.log 2>&1) && echo PASS || echo FAIL; done
```

Expected: 9개 전부 PASS.

`json-yaml-converter` 의 36px 아이콘 버튼 E2E 는 부하 상황에서 간헐적으로 깨지는 것이 5차에서 확인됐다(단독·전체 스위트 6/6 통과). 이 앱만 실패하면 단독으로 재실행해 판별한다.

- [ ] **Step 4: 루트 검증**

```bash
npm run tokens:check && npm run tokens:test
```

- [ ] **Step 5: 커밋**

```bash
git add docs/ CLAUDE.md && git commit -m "docs(design-system): mark api-contract-test-generator as migrated"
```

---

## 완료 기준

- [ ] 9개 앱 전부 `mise run check` 통과
- [ ] 루트 `tokens:check` drift 0건, `tokens:test` 7/7
- [ ] `api-contract-test-generator/src/styles/` 에 `theme.css` 가 없고 정본 4파일 + `theme.local.css` 만 있음
- [ ] `components.css` 에 색·radius·shadow·font-size 리터럴이 남지 않음 (히어로 clamp 는 `theme.local.css` 의 토큰으로 이동)
- [ ] `theme.local.css` 에 랜딩 히어로 토큰 2개만 남음
- [ ] 헤더 브랜드가 허브 링크이고 테마 토글이 유틸리티 슬롯 마지막

## 이번 파도에서 하지 않는 것

- **`.ds-card` 도입.** 이 앱의 카드류(`.step-navigator`, `.format-card`, `.test-card` 등)는 각자 다른 패딩·테두리 규약을 갖고 있다. 값은 토큰으로 쓰되 클래스 통합은 별건이다.
- **컨테이너 토큰(`--ds-container-*`) 적용.** 이 앱은 단계형 위저드라 다른 앱의 3종 폭 규약에 바로 대응되지 않는다. 현재 레이아웃을 유지한다.
- **모달.** 이 앱에는 오버레이가 없다. 없는 것을 만들지 않는다.
- **`--ds-tracking-title` 적용.** `.app-header h1` 의 `-0.04em` 은 긴 제목의 줄바꿈을 막는 값이라 유지한다.
