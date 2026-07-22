# JSON/YAML Converter UI 통일화 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** JSON/YAML Converter를 Tool Hub의 Converter Studio 시각 체계로 통일하면서 변환·진단·모바일 상태 동작을 그대로 보존한다.

**Architecture:** 기존 `App → Layout → Header → ConverterPage` 구조와 `useConverter` 상태 소유권은 유지한다. 표현 계층은 `Button` variant, topbar, toolbar/workspace semantic anchor, CSS token/component style로 나누며, 기존 accessible name·role·state transition은 회귀 테스트로 고정한다.

**Tech Stack:** Vite 8, React 19, TypeScript 5.9, Tailwind CSS 4, Monaco Editor, Vitest, Testing Library, Playwright Chromium, mise.

## Global Constraints

- JSON/YAML parser, YAML writer, Web Worker setup, source/result state machine, file/clipboard race 방지는 변경하지 않는다.
- `aria-label="테마 전환"`, 변환 방향 radio, 모바일 tab/tablist/tabpanel, editor aria label, copy/download/swap disabled 조건을 보존한다.
- desktop은 768px 이상에서 두 편집기를 동시에 표시하고, mobile은 767px 이하에서 하나의 tabpanel만 표시한다.
- mobile에서 swap은 보이고 keyboard로 실행 가능해야 하며, swap/방향 전환 뒤 source tab을 선택해야 한다.
- theme은 `[data-theme]`와 `theme.ts`/`useTheme`을 계속 사용한다.
- light/dark diagnostic text는 4.5:1 이상, non-text border/focus/gutter는 3:1 이상을 유지한다.
- 새 패키지를 추가하지 않는다. 아이콘은 이미 설치된 `lucide-react`만 사용한다.
- 완료 전 `npm run test`, `npm run lint`, `npm run typecheck`, `npm run build`, `npm run test:e2e`를 모두 실행한다.

---

## 파일 구조

| 파일 | 책임 |
| --- | --- |
| `json-yaml-converter/src/components/ui/Button.tsx` | secondary, ghost, icon을 포함한 공통 버튼 variant class mapping |
| `json-yaml-converter/src/components/ui/Button.test.tsx` | 버튼 variant class·disabled semantic 회귀 |
| `json-yaml-converter/src/components/layout/Header.tsx` | app mark, title/subtitle, icon theme toggle의 Studio topbar 표현 |
| `json-yaml-converter/src/App.test.tsx` | topbar accessible name와 브랜드 anchor 회귀 |
| `json-yaml-converter/src/components/converter/ConverterToolbar.tsx` | direction segment와 source action group의 Studio toolbar 표현 |
| `json-yaml-converter/src/components/converter/ConverterWorkspace.tsx` | common workspace surface, mobile tabs, central swap anchor |
| `json-yaml-converter/src/components/converter/EditorPanel.tsx` | source/result panel action hierarchy와 kind anchor |
| `json-yaml-converter/src/pages/ConverterPage.tsx` | toolbar, status/diagnostic, workspace를 Studio container 안에 조립 |
| `json-yaml-converter/src/pages/ConverterPage.test.tsx` | Studio semantic anchor와 기존 interaction regression |
| `json-yaml-converter/src/styles/theme.css` | cool-neutral/primary token 확장과 light/dark surface mapping |
| `json-yaml-converter/src/styles/base.css` | page canvas와 shell spacing |
| `json-yaml-converter/src/styles/components.css` | Studio topbar, segmented control, workspace, panel, mobile tab CSS |
| `json-yaml-converter/e2e/responsive.spec.ts` | desktop/mobile Studio hierarchy와 existing interaction/contrast regression |
| `json-yaml-converter/README.md` | mise 기반 실행·검증 명령 안내 |

---

### Task 1: 공통 버튼 variant와 Studio token 기반 만들기

**Files:**
- Create: `json-yaml-converter/src/components/ui/Button.test.tsx`
- Modify: `json-yaml-converter/src/components/ui/Button.tsx`
- Modify: `json-yaml-converter/src/styles/theme.css`
- Modify: `json-yaml-converter/src/styles/components.css`

**Interfaces:**
- Consumes: `ButtonHTMLAttributes<HTMLButtonElement>`와 기존 `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-icon` class contract
- Produces: `Button`의 `variant?: 'primary' | 'secondary' | 'ghost' | 'icon'`와 `.btn-ghost` CSS contract

- [ ] **Step 1: Button variant의 failing test를 작성한다.**

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Button } from './Button';

describe('Button', () => {
  it('semantic variant class와 disabled 상태를 보존한다', () => {
    render(<>
      <Button>보조</Button>
      <Button variant="ghost">고스트</Button>
      <Button variant="icon" aria-label="아이콘" disabled>◐</Button>
    </>);

    expect(screen.getByRole('button', { name: '보조' })).toHaveClass('btn', 'btn-secondary');
    expect(screen.getByRole('button', { name: '고스트' })).toHaveClass('btn', 'btn-ghost');
    expect(screen.getByRole('button', { name: '아이콘' })).toHaveClass('btn', 'btn-icon');
    expect(screen.getByRole('button', { name: '아이콘' })).toBeDisabled();
  });
});
```

- [ ] **Step 2: failing test를 실행한다.**

Run: `npm run test -- src/components/ui/Button.test.tsx`

Expected: `variant="ghost"`가 `ButtonProps`에 없거나 `.btn-ghost` assertion에서 실패한다.

- [ ] **Step 3: Button variant와 semantic token을 최소 변경으로 추가한다.**

```tsx
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'icon';
}

export function Button({ children, className = '', variant = 'secondary', ...props }: ButtonProps) {
  return <button {...props} className={`btn btn-${variant} ${className}`.trim()}>{children}</button>;
}
```

`theme.css`에는 `--surface-3`, `--line-strong`, `--fill`, `--radius-sm`, `--shadow-md`를 light/dark 값으로 선언한다. `components.css`에는 아래 interaction contract를 추가한다.

```css
.btn-ghost { color: var(--muted); background: transparent; border-color: transparent; }
.btn-ghost:hover { color: var(--text); background: var(--fill); border-color: var(--line); }
.btn-icon { width: 38px; min-width: 38px; padding: 0; place-items: center; }
.btn:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; }
```

- [ ] **Step 4: focused test와 static check를 실행한다.**

Run:

```bash
npm run test -- src/components/ui/Button.test.tsx
npm run lint
npm run typecheck
```

Expected: Button test 1개 이상 PASS, lint/typecheck exit 0.

- [ ] **Step 5: Task 1 변경만 커밋한다.**

```bash
git add json-yaml-converter/src/components/ui/Button.tsx \
  json-yaml-converter/src/components/ui/Button.test.tsx \
  json-yaml-converter/src/styles/theme.css \
  json-yaml-converter/src/styles/components.css
git commit -m "feat(json-yaml-converter): add studio button variants"
```

### Task 2: 브랜드 topbar와 app shell을 Tool Hub Studio로 정렬하기

**Files:**
- Modify: `json-yaml-converter/src/components/layout/Header.tsx`
- Modify: `json-yaml-converter/src/components/layout/Layout.tsx`
- Modify: `json-yaml-converter/src/App.test.tsx`
- Modify: `json-yaml-converter/src/styles/base.css`
- Modify: `json-yaml-converter/src/styles/components.css`

**Interfaces:**
- Consumes: `HeaderProps { theme: Theme; onToggleTheme(): void }`와 `LayoutProps { header: ReactNode; children: ReactNode }`
- Produces: implicit `banner` header, `data-testid="converter-app-mark"`, `data-testid="converter-studio-shell"`, unchanged `aria-label="테마 전환"`

- [ ] **Step 1: app shell failing test를 확장한다.**

```tsx
expect(screen.getByRole('banner')).toHaveClass('studio-topbar');
expect(screen.getByTestId('converter-app-mark')).toHaveTextContent('{ }');
expect(screen.getByRole('button', { name: '테마 전환' })).toHaveClass('btn-icon');
expect(screen.getByTestId('converter-studio-shell')).toBeInTheDocument();
```

`App.test.tsx`의 기존 제목·privacy note·theme toggle assertion은 삭제하지 않는다.

- [ ] **Step 2: failing test를 실행한다.**

Run: `npm run test -- src/App.test.tsx`

Expected: Studio class와 test id가 아직 없어 실패한다.

- [ ] **Step 3: Header와 Layout의 Studio markup을 구현한다.**

```tsx
import { Braces, Moon, Sun } from 'lucide-react';

<header className="studio-topbar">
  <div className="studio-brand">
    <span className="studio-brand__mark" data-testid="converter-app-mark" aria-hidden="true"><Braces size={18} /></span>
    <div><h1 className="app-title">JSON YAML Converter</h1><p className="privacy-note">입력 내용은 브라우저에서만 처리됩니다.</p></div>
  </div>
  <button className="btn btn-icon theme-button" type="button" aria-label="테마 전환" onClick={onToggleTheme}>
    {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
  </button>
</header>
```

`Layout`은 root div에 `data-testid="converter-studio-shell"`을 붙인다. `base.css`는 `.app-shell`에 `padding: 18px`, `.app-main`에 `max-width: 1440px; margin: 0 auto; width: 100%`를 적용하고, 767px 이하에서 shell padding을 12px로 낮춘다.

- [ ] **Step 4: topbar style을 추가하고 test를 통과시킨다.**

```css
.studio-topbar { display:flex; align-items:center; justify-content:space-between; gap:16px; padding:14px 16px; background:var(--surface); border:1px solid var(--line); border-radius:var(--radius-lg); box-shadow:var(--shadow-sm); }
.studio-brand { display:flex; align-items:center; gap:12px; min-width:0; }
.studio-brand__mark { width:42px; height:42px; display:grid; place-items:center; flex:0 0 auto; color:var(--on-primary); background:var(--primary); border-radius:var(--radius-md); }
```

Run:

```bash
npm run test -- src/App.test.tsx
npm run lint
npm run typecheck
```

Expected: App shell test PASS, existing theme behavior remains green.

- [ ] **Step 5: Task 2 변경만 커밋한다.**

```bash
git add json-yaml-converter/src/components/layout/Header.tsx \
  json-yaml-converter/src/components/layout/Layout.tsx \
  json-yaml-converter/src/App.test.tsx \
  json-yaml-converter/src/styles/base.css \
  json-yaml-converter/src/styles/components.css
git commit -m "feat(json-yaml-converter): add studio topbar"
```

### Task 3: toolbar, workspace, editor panel의 시각적 위계를 재구성하기

**Files:**
- Modify: `json-yaml-converter/src/components/converter/ConverterToolbar.tsx`
- Modify: `json-yaml-converter/src/components/converter/ConverterWorkspace.tsx`
- Modify: `json-yaml-converter/src/components/converter/EditorPanel.tsx`
- Modify: `json-yaml-converter/src/pages/ConverterPage.tsx`
- Modify: `json-yaml-converter/src/pages/ConverterPage.test.tsx`
- Modify: `json-yaml-converter/src/styles/components.css`

**Interfaces:**
- Consumes: existing `ConverterToolbarProps`, `ConverterWorkspaceProps`, `EditorPanelProps`, `ConverterPage` mutation handlers
- Produces: `data-testid="converter-studio"`, `data-testid="converter-workspace"`, `data-kind="source" | "result"`; 모든 기존 button/radio/tab accessible name 유지

- [ ] **Step 1: Studio hierarchy와 state preservation failing test를 추가한다.**

```tsx
render(<ConverterPage theme="light" />);

expect(screen.getByTestId('converter-studio')).toContainElement(screen.getByRole('region', { name: '변환 도구 모음' }));
expect(screen.getByTestId('converter-workspace')).toContainElement(screen.getByRole('region', { name: '원본 편집기' }));
expect(screen.getByTestId('converter-workspace')).toContainElement(screen.getByRole('region', { name: '결과 편집기' }));
expect(screen.getByRole('button', { name: '변환 방향 전환' })).toHaveClass('btn-icon');
```

기존 `결과 탭에서 방향 선택기를 바꾸면 원본 탭으로 돌아간다`, stale action disable, diagnostic focus, keyboard navigation test는 유지한다.

- [ ] **Step 2: failing test를 실행한다.**

Run: `npm run test -- src/pages/ConverterPage.test.tsx`

Expected: `converter-studio`와 `converter-workspace` test id가 없어 실패한다.

- [ ] **Step 3: toolbar와 workspace markup을 최소 변경으로 구현한다.**

`ConverterPage`는 기존 handler 순서와 상태 hook을 그대로 두고 render tree만 다음처럼 묶는다.

```tsx
return <main className="converter-page" aria-label="변환기 작업 공간" data-testid="converter-studio">
  <section className="studio-control-card">
    <ConverterToolbar {...toolbarProps} />
    <StatusBar state={state} />
  </section>
  {message ? <p className="action-message" role="status">{message}</p> : null}
  {state.diagnostic ? <DiagnosticBanner diagnostic={state.diagnostic} onFocus={handleDiagnosticFocus} /> : null}
  <ConverterWorkspace {...workspaceProps} />
</main>;
```

`ConverterToolbar`는 radio group을 `converter-toolbar__direction`, 예제·파일·지우기 버튼을 `converter-toolbar__actions` wrapper로 분리하되, radio/button/input element와 keyboard handler는 옮기지 않는다. `ConverterWorkspace`는 fragment 대신 다음 wrapper를 반환한다.

```tsx
return <section className="converter-workspace" data-testid="converter-workspace">
  <div className="mobile-tabs" {...mobileTablistProps}>{tabButtons}</div>
  <div className="converter-grid">{sourcePanel}{swapControl}{resultPanel}</div>
</section>;
```

`EditorPanel`의 outer section에 `data-kind={kind}`를 추가한다. source Pretty에는 `variant="ghost"`, result copy/download에는 `variant="ghost"`, central swap에는 `className="converter-grid__swap-button"`을 추가한다. `disabled`, `onClick`, tabpanel props, editor props는 변경하지 않는다.

- [ ] **Step 4: workspace style과 focused regression을 통과시킨다.**

```css
.studio-control-card, .converter-workspace { background:var(--surface); border:1px solid var(--line); border-radius:var(--radius-lg); box-shadow:var(--shadow-sm); }
.converter-toolbar { display:flex; justify-content:space-between; gap:12px; padding:12px; margin:0; }
.converter-toolbar__direction, .converter-toolbar__actions { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
.converter-workspace { overflow:hidden; }
.editor-panel { border:0; border-radius:0; box-shadow:none; }
.editor-panel[data-kind="source"] { border-right:1px solid var(--line); }
```

Run:

```bash
npm run test -- src/pages/ConverterPage.test.tsx
npm run lint
npm run typecheck
```

Expected: page tests PASS; pretty/copy/download/swap availability and mobile source-tab transitions remain unchanged.

- [ ] **Step 5: Task 3 변경만 커밋한다.**

```bash
git add json-yaml-converter/src/components/converter/ConverterToolbar.tsx \
  json-yaml-converter/src/components/converter/ConverterWorkspace.tsx \
  json-yaml-converter/src/components/converter/EditorPanel.tsx \
  json-yaml-converter/src/pages/ConverterPage.tsx \
  json-yaml-converter/src/pages/ConverterPage.test.tsx \
  json-yaml-converter/src/styles/components.css
git commit -m "feat(json-yaml-converter): organize converter studio workspace"
```

### Task 4: responsive Studio CSS와 real-browser 시각 회귀를 고정하기

**Files:**
- Modify: `json-yaml-converter/src/styles/theme.css`
- Modify: `json-yaml-converter/src/styles/base.css`
- Modify: `json-yaml-converter/src/styles/components.css`
- Modify: `json-yaml-converter/e2e/responsive.spec.ts`

**Interfaces:**
- Consumes: `data-testid="converter-studio"`, `data-testid="converter-workspace"`, `.studio-topbar`, `.converter-workspace`, existing `tablist`/`tabpanel` roles
- Produces: 1280px desktop Studio card hierarchy, 768px desktop two-panel boundary, 767px/390px mobile tab hierarchy and visible swap

- [ ] **Step 1: browser hierarchy failing test를 작성한다.**

```ts
test('Converter Studio가 desktop에서 topbar와 공통 workspace를 표시한다', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');
  await expect(page.getByTestId('converter-studio')).toBeVisible();
  await expect(page.getByRole('banner')).toHaveClass(/studio-topbar/);
  await expect(page.getByTestId('converter-workspace')).toBeVisible();
  await expect(page.getByRole('region', { name: '원본 편집기' })).toBeVisible();
  await expect(page.getByRole('region', { name: '결과 편집기' })).toBeVisible();
});

test('mobile Studio에서 swap을 유지한다', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.getByRole('tablist')).toBeVisible();
  await expect(page.getByRole('button', { name: '변환 방향 전환' })).toBeVisible();
});
```

- [ ] **Step 2: browser test가 현재 markup에서 실패하는지 확인한다.**

Run: `npm run test:e2e -- --grep "Converter Studio|mobile Studio"`

Expected: Studio test id 또는 topbar class가 없어 실패한다.

- [ ] **Step 3: desktop/mobile CSS를 구현한다.**

```css
.converter-page { display:grid; gap:16px; width:100%; padding:0; }
.converter-grid { grid-template-columns:minmax(0, 1fr) 56px minmax(0, 1fr); gap:0; }
.converter-grid__swap { background:var(--surface-2); border-inline:1px solid var(--line-subtle); }
.converter-grid__swap-button { border-color:var(--line); background:var(--surface); }
.editor-panel__header { min-height:52px; padding:10px 14px; background:var(--surface); }
.status-bar { display:flex; align-items:center; gap:10px; margin:0; padding:0 12px 12px; }
@media (max-width: 767px) {
  .converter-page { gap:12px; }
  .converter-workspace { padding:8px; }
  .converter-grid { display:flex; flex-direction:column; }
  .converter-grid__swap { order:-1; justify-content:flex-end; border:0; background:transparent; }
  .editor-panel[data-kind="source"] { border-right:0; }
}
```

light/dark token 값은 design spec의 canvas/surface/primary/radius를 따르되, existing contrast E2E의 `control-border`, diagnostic, status, glyph gradient token 값을 제거하지 않는다.

- [ ] **Step 4: focused E2E와 contrast suite를 실행한다.**

Run: `npm run test:e2e -- --grep "Converter Studio|mobile Studio|데스크톱|768px|767px|모바일 결과 탭|테마의 진단"`

Expected: desktop/mobile Studio hierarchy, keyboard swap, stale disable, light/dark contrast tests PASS.

- [ ] **Step 5: Task 4 변경만 커밋한다.**

```bash
git add json-yaml-converter/src/styles/theme.css \
  json-yaml-converter/src/styles/base.css \
  json-yaml-converter/src/styles/components.css \
  json-yaml-converter/e2e/responsive.spec.ts
git commit -m "feat(json-yaml-converter): align responsive studio styling"
```

### Task 5: mise/README 안내와 전체 검증으로 handoff 마무리하기

**Files:**
- Modify: `json-yaml-converter/README.md`
- Verify: `json-yaml-converter/mise.toml`
- Verify: `home/src/data/tools.ts`
- Verify: `home/src/data/tools.test.ts`

**Interfaces:**
- Consumes: existing `mise` tasks `setup`, `dev`, `test`, `test-e2e`, `lint`, `typecheck`, `build`, `check`
- Produces: UI 변경 후에도 동일한 local setup/verification instructions와 Tool Hub catalog entry

- [ ] **Step 1: README command coverage failing check를 작성한다.**

`README.md`의 실행·검증 섹션에 아래 exact command block이 없음을 확인한다.

```text
mise run setup
mise run dev
mise run check
```

Run: `rg -n "mise run (setup|dev|check)" json-yaml-converter/README.md`

Expected: 출력 없음 또는 세 명령 중 하나 이상 누락.

- [ ] **Step 2: README에 mise 사용법을 추가한다.**

~~~~markdown
## mise 사용

```bash
mise run setup
mise run dev
mise run check
```

`mise run check`는 unit test, lint, typecheck, build, Chromium E2E를 실행한다.
~~~~

기존 npm 실행·검증 블록은 유지한다.

- [ ] **Step 3: README check와 full suite를 실행한다.**

Run:

```bash
rg -n "mise run (setup|dev|check)" json-yaml-converter/README.md
cd json-yaml-converter
npm run test
npm run lint
npm run typecheck
npm run build
npm run test:e2e
cd ../home
npm run test
npm run lint
npm run typecheck
npm run build
cd ..
git diff --check
git status --short --branch
```

Expected: converter unit/E2E와 home unit 모두 PASS, lint/typecheck/build exit 0, diff check 출력 없음, intended documentation change만 남음.

- [ ] **Step 4: 실제 Chromium 수용 확인을 수행한다.**

1280px에서 card topbar, compact toolbar, unified two-editor workspace, disabled stale swap, diagnostic banner/gutter, light/dark를 확인한다. 390px에서 원본/결과 tab, completion badge, visible swap, keyboard swap 뒤 source tab 복귀를 확인한다.

- [ ] **Step 5: Task 5 변경만 커밋하고 PR을 갱신한다.**

```bash
git add json-yaml-converter/README.md
git commit -m "docs(json-yaml-converter): document mise workflow"
```

Expected: UI 통일화 구현과 mise 안내 커밋이 로컬 branch에 포함되고, publication은 PR workflow에서 수행한다.

---

## Plan Self-Review

- Spec coverage: topbar, toolbar/status, workspace/panels, 768/767 responsive transition, mobile swap, token consistency, contrast, accessibility, existing state preservation, mise documentation을 Task 1~5에 각각 배정했다.
- Placeholder scan: 미결정 표식이나 추상적인 후속 작업 지시를 사용하지 않았고, 모든 code step에는 concrete markup/CSS/test snippet과 exact command를 넣었다.
- Type consistency: Button의 `ghost` variant는 Task 1에서 정의하고 Task 3에서 사용한다. Studio test id는 Task 2/3에서 정의하고 Task 4 E2E에서 사용한다. 기존 `ConverterWorkspaceProps`와 `ConverterPage` handler signature는 변경하지 않는다.
