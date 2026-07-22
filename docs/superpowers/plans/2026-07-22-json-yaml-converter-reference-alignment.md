# JSON/YAML Converter Reference Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `json-yaml-converter`를 `sign-maker`의 셸·토큰·카드 비례와 `config-diff-viewer`의 통합 2열 편집 카드 구조에 맞추면서 변환 동작과 모바일 탭을 보존한다.

**Architecture:** `App`은 theme만 소유하고 `Layout`은 1400px 화면 셸을 제공한다. 변환 상태를 소유한 `ConverterPage`가 `Header`에 direction handler를 전달하며, 제어 카드와 두 편집기가 직접 맞닿은 단일 workspace 카드를 조립한다. 파서, serializer, `useConverter`, Monaco 설정과 파일·클립보드 race 방지는 변경하지 않는다.

**Tech Stack:** Vite 8, React 19, TypeScript 5.9, Tailwind CSS 4, Monaco Editor, Vitest, Testing Library, Playwright Chromium

## Global Constraints

- 기준 설계는 `docs/superpowers/specs/2026-07-22-json-yaml-converter-reference-alignment-design.md`다.
- 기존 `docs/superpowers/plans/2026-07-22-json-yaml-converter-ui-unification.md`의 1440px 셸과 56px swap 열 지시는 이 계획으로 대체한다.
- 셸 최대 폭은 1400px, 화면 패딩은 모바일 16px와 768px 이상 24px다.
- 카드 반경은 16px, 컨트롤 반경은 12px, 앱 마크는 40×40px, 기본 버튼과 swap·theme 버튼 높이는 36px다.
- 데스크톱 편집 본문 높이는 최소 400px다.
- desktop은 768px 이상에서 두 편집기를 동시에 표시하고 mobile은 767px 이하에서 하나의 tabpanel만 표시한다.
- `aria-label="테마 전환"`, `aria-label="변환 방향 전환"`, 방향 radio, 모바일 tab/tablist/tabpanel과 editor accessible name을 보존한다.
- 방향 전환과 swap 뒤 source tab을 선택하는 현재 상태 전이를 보존한다.
- 새 package를 추가하지 않는다. 아이콘은 설치된 `lucide-react`만 사용한다.
- parser, serializer, size limit, conversion debounce, stale result, file/clipboard request revision 로직은 변경하지 않는다.
- 완료 전 `npm run test`, `npm run lint`, `npm run typecheck`, `npm run build`, `npm run test:e2e`를 모두 실행한다.

---

## 파일 구조

| 파일 | 책임 |
| --- | --- |
| `json-yaml-converter/src/App.tsx` | theme 상태와 lazy page 조립 |
| `json-yaml-converter/src/components/layout/Layout.tsx` | 화면 패딩과 1400px 콘텐츠 셸 |
| `json-yaml-converter/src/components/layout/Header.tsx` | 브랜드, direction radio, theme toggle |
| `json-yaml-converter/src/components/converter/ConverterToolbar.tsx` | 예제·파일·지우기 source action |
| `json-yaml-converter/src/components/converter/StatusBar.tsx` | 변환 상태와 입력 크기 |
| `json-yaml-converter/src/components/converter/ConverterWorkspace.tsx` | 모바일 탭, 통합 2열 editor, swap anchor |
| `json-yaml-converter/src/components/converter/EditorPanel.tsx` | editor header, format, ghost action, Monaco frame |
| `json-yaml-converter/src/pages/ConverterPage.tsx` | converter state와 전체 UI 조립 |
| `json-yaml-converter/src/styles/theme.css` | `sign-maker` 기준 light/dark token과 converter status token |
| `json-yaml-converter/src/styles/base.css` | body, shell, width와 responsive page padding |
| `json-yaml-converter/src/styles/components.css` | topbar, controls, unified editor, mobile layout |
| `json-yaml-converter/src/App.test.tsx` | app shell, theme, topbar direction 구조 회귀 |
| `json-yaml-converter/src/pages/ConverterPage.test.tsx` | 기존 기능과 새 component hierarchy 회귀 |
| `json-yaml-converter/e2e/responsive.spec.ts` | 실제 크기, 2열, mobile tab, contrast 회귀 |

### Task 1: Direction selector를 상태 소유자인 페이지의 Header로 이동하기

**Files:**
- Modify: `json-yaml-converter/src/App.tsx:1-17`
- Modify: `json-yaml-converter/src/components/layout/Layout.tsx:1-5`
- Modify: `json-yaml-converter/src/components/layout/Header.tsx:1-27`
- Modify: `json-yaml-converter/src/components/converter/ConverterToolbar.tsx:1-67`
- Modify: `json-yaml-converter/src/pages/ConverterPage.tsx:1-122`
- Test: `json-yaml-converter/src/App.test.tsx:1-24`
- Test: `json-yaml-converter/src/pages/ConverterPage.test.tsx:1-끝`

**Interfaces:**
- Consumes: `ConverterDirection = 'json-to-yaml' | 'yaml-to-json'`, `Theme = 'light' | 'dark'`
- Produces: `HeaderProps { theme: Theme; direction: ConverterDirection; onDirectionChange(direction): void; onToggleTheme(): void }`
- Produces: `ConverterPageProps { theme: Theme; onToggleTheme(): void }`
- Produces: `ConverterToolbarProps { onLoadSample(): void; onOpenFile(file: File): void; onClear(): void }`

- [ ] **Step 1: topbar ownership을 고정하는 failing test를 작성한다.**

`App.test.tsx`의 기존 app shell test에 다음 assertion을 추가한다.

```tsx
const banner = screen.getByRole('banner');
const directionGroup = screen.getByRole('radiogroup', { name: '변환 방향' });
expect(banner).toContainElement(directionGroup);
expect(screen.getByRole('radio', { name: 'JSON → YAML' })).toHaveAttribute('aria-checked', 'true');
```

`ConverterPage.test.tsx`에는 `onToggleTheme`을 전달하는 helper를 추가하고 기존 `render(<ConverterPage theme="light" />)` 호출을 `renderPage()`로 바꾼다.

```tsx
const toggleTheme = vi.fn();

function renderPage() {
  return render(<ConverterPage theme="light" onToggleTheme={toggleTheme} />);
}
```

첫 번째 hierarchy test에 다음 assertion을 추가한다.

```tsx
const banner = screen.getByRole('banner');
const toolbar = screen.getByRole('region', { name: '변환 도구 모음' });
const directionGroup = screen.getByRole('radiogroup', { name: '변환 방향' });

expect(banner).toContainElement(directionGroup);
expect(toolbar).not.toContainElement(directionGroup);
```

기존 `모바일 탭과 방향 선택기에 keyboard roving 패턴을 제공한다` test는 삭제하지 않는다.

- [ ] **Step 2: focused tests가 현재 ownership에서 실패하는지 확인한다.**

Run:

```bash
cd json-yaml-converter
npm run test -- src/App.test.tsx src/pages/ConverterPage.test.tsx
```

Expected: `ConverterPageProps`에 `onToggleTheme`이 없거나 direction radiogroup이 banner 밖에 있어 FAIL한다.

- [ ] **Step 3: `App`과 `Layout`을 theme-only shell로 바꾼다.**

`src/App.tsx`를 다음으로 교체한다.

```tsx
import { lazy, Suspense } from 'react';
import { Layout } from './components/layout/Layout';
import { useTheme } from './hooks/useTheme';

const ConverterPage = lazy(() => import('./pages/ConverterPage'));

export default function App() {
  const { theme, toggle } = useTheme();
  return (
    <Layout>
      <Suspense fallback={<main role="status">변환기를 불러오는 중입니다.</main>}>
        <ConverterPage theme={theme} onToggleTheme={toggle} />
      </Suspense>
    </Layout>
  );
}
```

`src/components/layout/Layout.tsx`를 다음으로 교체한다.

```tsx
import type { ReactNode } from 'react';

export function Layout({ children }: { children: ReactNode }) {
  return <div className="app-shell" data-testid="converter-studio-shell"><div className="app-main">{children}</div></div>;
}
```

- [ ] **Step 4: direction roving logic을 포함한 `Header`를 구현한다.**

`src/components/layout/Header.tsx`를 다음으로 교체한다.

```tsx
import { useRef } from 'react';
import type { KeyboardEvent } from 'react';
import { Braces, Moon, Sun } from 'lucide-react';
import type { ConverterDirection } from '../../lib/converter';
import type { Theme } from '../../theme';
import { Button } from '../ui/Button';

interface HeaderProps {
  theme: Theme;
  direction: ConverterDirection;
  onDirectionChange(direction: ConverterDirection): void;
  onToggleTheme(): void;
}

export function Header({ theme, direction, onDirectionChange, onToggleTheme }: HeaderProps) {
  const jsonDirectionRef = useRef<HTMLButtonElement>(null);
  const yamlDirectionRef = useRef<HTMLButtonElement>(null);
  const handleDirectionKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const current = event.currentTarget.dataset.direction as ConverterDirection;
    const next = event.key === 'Home' ? 'json-to-yaml'
      : event.key === 'End' ? 'yaml-to-json'
        : event.key === 'ArrowRight' || event.key === 'ArrowDown'
          ? current === 'json-to-yaml' ? 'yaml-to-json' : 'json-to-yaml'
          : event.key === 'ArrowLeft' || event.key === 'ArrowUp'
            ? current === 'json-to-yaml' ? 'yaml-to-json' : 'json-to-yaml'
            : null;
    if (!next) return;
    event.preventDefault();
    if (next !== current) onDirectionChange(next);
    (next === 'json-to-yaml' ? jsonDirectionRef : yamlDirectionRef).current?.focus();
  };

  return (
    <header className="studio-topbar">
      <div className="studio-brand">
        <span className="studio-brand__mark" data-testid="converter-app-mark" aria-hidden="true"><Braces size={18} /></span>
        <div>
          <h1 className="app-title">JSON YAML Converter</h1>
          <p className="privacy-note">입력 내용은 브라우저에서만 처리됩니다.</p>
        </div>
      </div>
      <div role="radiogroup" aria-label="변환 방향" className="direction-selector">
        {([
          ['json-to-yaml', 'JSON → YAML'],
          ['yaml-to-json', 'YAML → JSON'],
        ] as const).map(([value, label]) => <button
          key={value}
          ref={value === 'json-to-yaml' ? jsonDirectionRef : yamlDirectionRef}
          type="button"
          role="radio"
          aria-checked={direction === value}
          data-direction={value}
          tabIndex={direction === value ? 0 : -1}
          className="direction-selector__option"
          onClick={() => onDirectionChange(value)}
          onKeyDown={handleDirectionKeyDown}
        >{label}</button>)}
      </div>
      <Button className="theme-button" type="button" variant="icon" aria-label="테마 전환" onClick={onToggleTheme}>
        {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
      </Button>
    </header>
  );
}
```

- [ ] **Step 5: `ConverterToolbar`에서 direction 책임을 제거한다.**

`src/components/converter/ConverterToolbar.tsx`를 다음으로 교체한다.

```tsx
import { useRef } from 'react';
import type { ChangeEvent } from 'react';
import { Button } from '../ui/Button';

interface ConverterToolbarProps {
  onLoadSample(): void;
  onOpenFile(file: File): void;
  onClear(): void;
}

export function ConverterToolbar({ onLoadSample, onOpenFile, onClear }: ConverterToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) onOpenFile(file);
    event.target.value = '';
  };

  return <section className="converter-toolbar" aria-label="변환 도구 모음">
    <Button type="button" variant="primary" onClick={onLoadSample}>예제 불러오기</Button>
    <Button type="button" onClick={() => fileInputRef.current?.click()}>파일 열기</Button>
    <input ref={fileInputRef} id="source-file" className="visually-hidden" tabIndex={-1} type="file" aria-label="JSON 또는 YAML 파일 열기" accept=".json,.yaml,.yml,application/json,application/yaml,text/yaml" onChange={handleFileChange} />
    <Button type="button" onClick={onClear}>원본 지우기</Button>
  </section>;
}
```

- [ ] **Step 6: `ConverterPage`가 `Header`를 상태와 함께 조립하게 한다.**

`src/pages/ConverterPage.tsx`에 `Header` import와 props type을 추가한다.

```tsx
import { Header } from '../components/layout/Header';

interface ConverterPageProps {
  theme: Theme;
  onToggleTheme(): void;
}

export function ConverterPage({ theme, onToggleTheme }: ConverterPageProps) {
```

기존 hook과 handler 본문은 그대로 두고 반환부를 다음으로 교체한다.

```tsx
return <>
  <Header theme={theme} direction={state.direction} onDirectionChange={handleDirectionChange} onToggleTheme={onToggleTheme} />
  <main className="converter-page" aria-label="변환기 작업 공간" data-testid="converter-studio">
    <section className="studio-control-card">
      <ConverterToolbar onLoadSample={handleLoadSample} onOpenFile={handleFile} onClear={handleClear} />
      <StatusBar state={state} />
    </section>
    {message ? <p className="action-message" role="status">{message}</p> : null}
    {state.diagnostic ? <DiagnosticBanner diagnostic={state.diagnostic} onFocus={handleDiagnosticFocus} /> : null}
    <ConverterWorkspace state={state} theme={theme} sourceEditorRef={sourceEditorRef} activeTab={activeTab} filePending={filePending} onTabChange={handleTabChange} onSourceChange={handleSourceChange} onPretty={handlePretty} onCopy={handleCopy} onDownload={handleDownload} onSwap={handleSwap} />
  </main>
</>;
```

- [ ] **Step 7: focused tests를 통과시킨다.**

Run:

```bash
npm run test -- src/App.test.tsx src/pages/ConverterPage.test.tsx
npm run lint
npm run typecheck
```

Expected: App/Page tests PASS, lint와 typecheck exit 0.

- [ ] **Step 8: Task 1을 커밋한다.**

```bash
git add json-yaml-converter/src/App.tsx \
  json-yaml-converter/src/components/layout/Layout.tsx \
  json-yaml-converter/src/components/layout/Header.tsx \
  json-yaml-converter/src/components/converter/ConverterToolbar.tsx \
  json-yaml-converter/src/pages/ConverterPage.tsx \
  json-yaml-converter/src/App.test.tsx \
  json-yaml-converter/src/pages/ConverterPage.test.tsx
git commit -m "refactor(json-yaml-converter): move direction controls into header"
```

### Task 2: `sign-maker` 기준 셸과 token·control 크기 적용하기

**Files:**
- Modify: `json-yaml-converter/src/styles/theme.css:1-58`
- Modify: `json-yaml-converter/src/styles/base.css:1-10`
- Modify: `json-yaml-converter/src/styles/components.css:1-21`
- Test: `json-yaml-converter/e2e/responsive.spec.ts:150-193`

**Interfaces:**
- Consumes: `.app-shell`, `.app-main`, `.studio-topbar`, `.studio-brand__mark`, `.direction-selector`, `.btn`, `.theme-button`
- Produces: `--bg`, `--surface`, `--surface-2`, `--line`, `--text`, `--muted`, `--primary`, `--radius-md`, `--radius-lg`, `--shadow-sm`

- [ ] **Step 1: 기준 앱과 같은 치수를 요구하는 failing E2E를 추가한다.**

`responsive.spec.ts`에 다음 test를 추가한다.

```ts
test('Sign Maker 기준 셸과 control 크기를 사용한다', async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 900 });
  await page.goto('/');

  await expect(page.locator('.app-main')).toHaveCSS('max-width', '1400px');
  await expect(page.getByRole('banner')).toHaveCSS('padding', '16px 20px');
  await expect(page.getByTestId('converter-app-mark')).toHaveCSS('width', '40px');
  await expect(page.getByTestId('converter-app-mark')).toHaveCSS('height', '40px');
  await expect(page.getByRole('button', { name: '테마 전환' })).toHaveCSS('width', '36px');
  await expect(page.getByRole('button', { name: '테마 전환' })).toHaveCSS('height', '36px');
  await expect(page.locator('.studio-control-card')).toHaveCSS('border-radius', '16px');
});
```

- [ ] **Step 2: focused E2E가 현재 1440px/42px/38px 값에서 실패하는지 확인한다.**

Run: `npm run test:e2e -- --grep "Sign Maker 기준"`

Expected: `max-width: 1440px`, mark `42px`, theme button `38px` 중 하나 이상으로 FAIL한다.

- [ ] **Step 3: `theme.css`의 core token을 `sign-maker` 값으로 교체한다.**

기존 font-face와 custom variant는 유지하고 `:root`와 dark block을 다음 값으로 교체한다. converter status와 Monaco 배경 token도 함께 유지한다.

```css
:root {
  color-scheme: light;
  --font-sans: "ToolHub Sans", -apple-system, BlinkMacSystemFont, system-ui, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif;
  --bg: #f7f7f8;
  --surface: #ffffff;
  --surface-2: #f7f7f8;
  --surface-3: rgba(112, 115, 124, 0.05);
  --fill: rgba(112, 115, 124, 0.08);
  --fill-subtle: rgba(112, 115, 124, 0.05);
  --fill-bold: rgba(112, 115, 124, 0.16);
  --line: rgba(112, 115, 124, 0.22);
  --line-subtle: rgba(112, 115, 124, 0.08);
  --line-strong: rgba(112, 115, 124, 0.52);
  --control-border: rgba(112, 115, 124, 0.52);
  --text: rgb(23, 23, 23);
  --text-neutral: rgba(46, 47, 51, 0.88);
  --muted: rgba(55, 56, 60, 0.61);
  --soft: rgba(55, 56, 60, 0.28);
  --primary: rgb(51, 102, 255);
  --primary-strong: rgb(0, 94, 235);
  --primary-heavy: rgb(0, 84, 209);
  --primary-surface: rgb(234, 242, 254);
  --on-primary: #ffffff;
  --success: rgb(24, 121, 78);
  --warning: rgb(161, 92, 0);
  --danger: rgb(180, 35, 24);
  --danger-surface: rgba(180, 35, 24, 0.08);
  --editor-bg: #ffffff;
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --shadow-sm: 0 1px 2px rgba(23, 23, 25, 0.06), 0 1px 3px rgba(23, 23, 25, 0.07);
  --shadow-md: 0 2px 8px rgba(23, 23, 25, 0.08), 0 1px 2px rgba(23, 23, 25, 0.06);
  --ease: cubic-bezier(0.4, 0, 0.2, 1);
  --dur: 160ms;
}

[data-theme="dark"] {
  color-scheme: dark;
  --bg: rgb(15, 15, 16);
  --surface: rgb(27, 28, 30);
  --surface-2: rgb(33, 34, 37);
  --surface-3: rgba(112, 115, 124, 0.12);
  --fill: rgba(112, 115, 124, 0.22);
  --fill-subtle: rgba(112, 115, 124, 0.12);
  --fill-bold: rgba(112, 115, 124, 0.28);
  --line: rgba(112, 115, 124, 0.32);
  --line-subtle: rgba(112, 115, 124, 0.16);
  --line-strong: rgba(194, 196, 200, 0.52);
  --control-border: rgba(194, 196, 200, 0.52);
  --text: rgb(247, 247, 247);
  --text-neutral: rgba(194, 196, 200, 0.88);
  --muted: rgba(174, 176, 182, 0.61);
  --soft: rgba(174, 176, 182, 0.28);
  --primary: rgb(91, 132, 255);
  --primary-strong: rgb(26, 117, 255);
  --primary-heavy: rgb(0, 102, 255);
  --primary-surface: rgba(91, 132, 255, 0.16);
  --success: rgb(87, 198, 138);
  --warning: rgb(240, 164, 75);
  --danger: rgb(229, 92, 108);
  --danger-surface: rgba(229, 92, 108, 0.12);
  --editor-bg: #1e1e1e;
}
```

- [ ] **Step 4: `base.css`에서 셸 폭과 화면 패딩을 정확히 적용한다.**

기존 reset은 유지하고 shell selector를 다음으로 교체한다.

```css
.app-shell { min-height: 100vh; padding: 16px; }
.app-main { display: grid; gap: 20px; width: min(1400px, 100%); margin: 0 auto; }
@media (min-width: 768px) { .app-shell { padding: 24px; } }
```

- [ ] **Step 5: topbar, direction, button primitive 치수를 교체한다.**

`components.css`의 topbar부터 focus selector까지를 다음 block으로 교체한다.

```css
.studio-topbar { display: flex; align-items: center; gap: 12px; padding: 16px 20px; background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius-lg); box-shadow: var(--shadow-sm); }
.studio-brand { display: flex; align-items: center; gap: 12px; min-width: 0; }
.studio-brand__mark { width: 40px; height: 40px; display: grid; place-items: center; flex: 0 0 auto; color: var(--on-primary); background: var(--primary); border-radius: var(--radius-md); }
.app-title { margin: 0; color: var(--text); font-size: 20px; font-weight: 700; line-height: 1.2; }
.privacy-note { margin: 3px 0 0; color: var(--muted); font-size: 13px; }
.direction-selector { display: flex; gap: 4px; margin-left: auto; padding: 4px; background: var(--fill); border: 1px solid var(--line-subtle); border-radius: var(--radius-md); }
.direction-selector__option { height: 32px; padding: 0 12px; color: var(--muted); background: transparent; border: 0; border-radius: var(--radius-sm); font-weight: 600; }
.direction-selector__option:hover { color: var(--text); }
.direction-selector__option[aria-checked="true"] { color: var(--primary); background: var(--surface); box-shadow: var(--shadow-sm); }
.btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; min-height: 36px; padding: 0 12px; color: var(--text); background: var(--surface); border: 1px solid var(--control-border); border-radius: var(--radius-md); font-weight: 600; cursor: pointer; transition: background var(--dur) var(--ease), border-color var(--dur) var(--ease), color var(--dur) var(--ease); }
.btn:hover { background: var(--fill); }
.btn-primary { color: var(--on-primary); background: var(--primary); border-color: var(--primary); box-shadow: var(--shadow-sm); }
.btn-primary:hover { background: var(--primary-strong); border-color: var(--primary-strong); }
.btn-primary:active { background: var(--primary-heavy); border-color: var(--primary-heavy); }
.btn-ghost { color: var(--muted); background: transparent; border-color: transparent; }
.btn-ghost:hover { color: var(--text); background: var(--fill); border-color: var(--line); }
.btn-icon { display: inline-grid; place-items: center; width: 36px; min-width: 36px; height: 36px; padding: 0; }
.theme-button { flex: 0 0 auto; color: var(--muted); background: var(--surface); border-color: var(--control-border); }
.btn:focus-visible, .direction-selector__option:focus-visible, .mobile-tabs button:focus-visible, .diagnostic-banner button:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; }
```

- [ ] **Step 6: token과 shell E2E를 통과시킨다.**

Run:

```bash
npm run test:e2e -- --grep "Sign Maker 기준|테마 버튼"
npm run lint
npm run typecheck
```

Expected: focused E2E PASS, lint와 typecheck exit 0.

- [ ] **Step 7: Task 2를 커밋한다.**

```bash
git add json-yaml-converter/src/styles/theme.css \
  json-yaml-converter/src/styles/base.css \
  json-yaml-converter/src/styles/components.css \
  json-yaml-converter/e2e/responsive.spec.ts
git commit -m "style(json-yaml-converter): align shell and visual tokens"
```

### Task 3: 제어 카드와 직접 맞닿은 2열 편집 카드 구현하기

**Files:**
- Modify: `json-yaml-converter/src/pages/ConverterPage.tsx:111-119`
- Modify: `json-yaml-converter/src/components/converter/ConverterWorkspace.tsx:55-65`
- Modify: `json-yaml-converter/src/styles/components.css:7-44`
- Test: `json-yaml-converter/src/pages/ConverterPage.test.tsx:32-45`
- Test: `json-yaml-converter/e2e/responsive.spec.ts:150-169`

**Interfaces:**
- Consumes: existing `StatusBar`, `DiagnosticBanner`, `EditorPanel`, `Button variant="icon"`
- Produces: `.studio-control-card__main`, `.control-card__privacy`, two-column `.converter-grid`, absolute `.converter-grid__swap`
- Preserves: `disabled = filePending || !state.resultFresh || state.result.length === 0`

- [ ] **Step 1: 제어 카드와 unified editor 구조를 고정하는 failing component test를 작성한다.**

첫 hierarchy test에 다음 assertion을 추가한다.

```tsx
const controlCard = screen.getByTestId('converter-control-card');
const workspace = screen.getByTestId('converter-workspace');

expect(controlCard).toContainElement(screen.getByRole('region', { name: '변환 도구 모음' }));
expect(controlCard).toContainElement(screen.getByText(/모든 처리는 브라우저 안에서 완료됩니다/));
expect(workspace).toContainElement(screen.getByRole('region', { name: '원본 편집기' }));
expect(workspace).toContainElement(screen.getByRole('region', { name: '결과 편집기' }));
expect(workspace.querySelector('.converter-grid')?.children).toHaveLength(3);
```

- [ ] **Step 2: 2열과 400px editor를 요구하는 failing browser test로 기존 56px 열을 교체한다.**

기존 `Converter Studio가 desktop에서 topbar와 공통 workspace를 표시한다` test의 마지막 assertion을 다음으로 교체한다.

```ts
const grid = page.locator('.converter-grid');
const columns = await grid.evaluate((element) => getComputedStyle(element).gridTemplateColumns.split(' '));
expect(columns).toHaveLength(2);
await expect(page.locator('.converter-grid__swap')).toHaveCSS('position', 'absolute');
await expect(page.locator('.editor-frame').first()).toHaveCSS('height', '400px');
```

- [ ] **Step 3: component와 E2E의 RED 상태를 확인한다.**

Run:

```bash
npm run test -- src/pages/ConverterPage.test.tsx
npm run test:e2e -- --grep "Converter Studio가 desktop"
```

Expected: `converter-control-card`가 없고 grid column이 3개이며 editor height가 360px라 FAIL한다.

- [ ] **Step 4: `ConverterPage`의 제어 카드를 action/status 2단으로 조립한다.**

반환부의 `studio-control-card`를 다음으로 교체한다.

```tsx
<section className="studio-control-card" data-testid="converter-control-card">
  <div className="studio-control-card__main">
    <ConverterToolbar onLoadSample={handleLoadSample} onOpenFile={handleFile} onClear={handleClear} />
    <StatusBar state={state} />
  </div>
  <p className="control-card__privacy">자동 변환 · 모든 처리는 브라우저 안에서 완료됩니다.</p>
</section>
```

message, diagnostic, workspace의 렌더 순서는 제어 카드 다음으로 유지한다.

- [ ] **Step 5: `ConverterWorkspace`의 DOM order를 유지하면서 swap을 layout flow에서 제거한다.**

반환부는 source → swap → result 순서를 그대로 유지한다.

```tsx
return <section className="converter-workspace" data-testid="converter-workspace">
  <div className="mobile-tabs" {...(isMobile ? { role: 'tablist', 'aria-label': '편집기 보기' } : {})}>
    <button ref={sourceTabRef} type="button" {...(isMobile ? { role: 'tab', id: 'converter-source-tab', 'aria-controls': 'converter-source-panel', 'aria-selected': activeTab === 'source', tabIndex: activeTab === 'source' ? 0 : -1 } : {})} onClick={() => selectTab('source')} onKeyDown={isMobile ? handleTabKeyDown : undefined}>원본</button>
    <button ref={resultTabRef} type="button" {...(isMobile ? { role: 'tab', id: 'converter-result-tab', 'aria-controls': 'converter-result-panel', 'aria-selected': activeTab === 'result', tabIndex: activeTab === 'result' ? 0 : -1 } : {})} onClick={() => selectTab('result')} onKeyDown={isMobile ? handleTabKeyDown : undefined}>결과{state.resultFresh ? <span className="completion-badge">변환 완료</span> : null}</button>
  </div>
  <div className="converter-grid">
    <EditorPanel kind="source" format={sourceFormat} value={state.source} theme={theme} diagnostic={state.diagnostic} editorRef={sourceEditorRef} onChange={onSourceChange} onPretty={onPretty} prettyDisabled={state.status !== 'valid'} mobileHidden={activeTab !== 'source'} panelId="converter-source-panel" tabId="converter-source-tab" isMobile={isMobile} />
    <div className="converter-grid__swap"><Button type="button" className="converter-grid__swap-button" variant="icon" aria-label="변환 방향 전환" disabled={disabled} onClick={switchAndSwap}>⇄</Button></div>
    <EditorPanel kind="result" format={resultFormat} value={state.result} theme={theme} diagnostic={null} onCopy={onCopy} onDownload={onDownload} resultDisabled={disabled} mobileHidden={activeTab !== 'result'} panelId="converter-result-panel" tabId="converter-result-tab" isMobile={isMobile}>{!state.resultFresh && state.result.length > 0 ? <p className="stale-result" role="status">현재 입력과 동기화되지 않은 결과</p> : null}</EditorPanel>
  </div>
</section>;
```

- [ ] **Step 6: 제어 카드와 desktop unified editor CSS를 구현한다.**

기존 `.converter-page`부터 `.mobile-tabs` 전까지에서 중복 selector를 제거하고 다음 block을 적용한다.

```css
.converter-page { display: grid; gap: 12px; width: 100%; margin: 0; }
.studio-control-card, .converter-workspace { background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius-lg); box-shadow: var(--shadow-sm); }
.studio-control-card { overflow: hidden; }
.studio-control-card__main { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 14px 8px; }
.converter-toolbar { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin: 0; padding: 0; }
.status-bar { display: flex; align-items: center; justify-content: flex-end; gap: 10px; margin: 0; padding: 0; color: var(--text-neutral); font-size: 13px; }
.status-bar p { margin: 0; }
.control-card__privacy { margin: 0; padding: 0 14px 12px; color: var(--muted); font-size: 12px; }
.action-message { margin: 0; padding: 10px 12px; color: var(--muted); background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius-md); font-size: 13px; }
.diagnostic-banner { margin: 0; color: var(--danger); background: var(--danger-surface); border: 1px solid var(--danger); border-radius: var(--radius-md); padding: 10px 12px; }
.converter-workspace { overflow: hidden; }
.converter-grid { position: relative; display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 0; }
.converter-grid__swap { position: absolute; z-index: 2; top: 50px; left: 50%; transform: translate(-50%, -50%); display: grid; place-items: center; }
.converter-grid__swap-button { border-color: var(--line); background: var(--surface); color: var(--primary); box-shadow: var(--shadow-sm); }
.editor-panel { min-width: 0; overflow: hidden; background: var(--surface); border: 0; border-radius: 0; box-shadow: none; }
.editor-panel[data-kind="source"] { border-right: 1px solid var(--line); }
.editor-panel__header { height: 50px; display: flex; justify-content: space-between; align-items: center; gap: 8px; padding: 0 14px; background: var(--surface); border-bottom: 1px solid var(--line-subtle); }
.editor-panel__header > div { display: flex; align-items: center; gap: 8px; }
.editor-panel__actions { flex-wrap: wrap; justify-content: flex-end; }
.format-label { color: var(--muted); font-size: 12px; }
.editor-frame { height: 400px; background: var(--editor-bg); }
.status-bar--valid { color: var(--success); }
.status-bar--oversized, .status-bar--invalid { color: var(--danger); }
.mobile-tabs { display: none; }
```

기존 `.diagnostic-banner button`, Monaco glyph, stale result, completion badge selector는 이 block 아래에 그대로 유지한다.

- [ ] **Step 7: component와 desktop E2E를 통과시킨다.**

Run:

```bash
npm run test -- src/pages/ConverterPage.test.tsx
npm run test:e2e -- --grep "데스크톱|Converter Studio가 desktop|Sign Maker 기준"
npm run lint
npm run typecheck
```

Expected: focused unit/E2E PASS, lint와 typecheck exit 0.

- [ ] **Step 8: Task 3을 커밋한다.**

```bash
git add json-yaml-converter/src/pages/ConverterPage.tsx \
  json-yaml-converter/src/components/converter/ConverterWorkspace.tsx \
  json-yaml-converter/src/styles/components.css \
  json-yaml-converter/src/pages/ConverterPage.test.tsx \
  json-yaml-converter/e2e/responsive.spec.ts
git commit -m "feat(json-yaml-converter): unify the editor workspace"
```

### Task 4: 승인된 모바일 탭 배치와 접근성 회귀 고정하기

**Files:**
- Modify: `json-yaml-converter/src/styles/components.css:mobile media block`
- Modify: `json-yaml-converter/e2e/responsive.spec.ts:171-301`

**Interfaces:**
- Consumes: direct-child `.studio-brand`, `.direction-selector`, `.theme-button`, `.mobile-tabs`, `.converter-grid__swap`
- Produces: 767px 이하 header 2행, full-width direction segment, 한 개의 visible tabpanel, static mobile swap row

- [ ] **Step 1: 모바일의 실제 배치와 visible panel 수를 고정하는 failing E2E를 작성한다.**

기존 `mobile Studio에서 swap을 유지한다` test를 다음으로 확장한다.

```ts
const bannerBox = await page.getByRole('banner').boundingBox();
const directionBox = await page.getByRole('radiogroup', { name: '변환 방향' }).boundingBox();
if (!bannerBox || !directionBox) throw new Error('모바일 topbar 크기를 계산할 수 없습니다.');

expect(directionBox.width).toBeGreaterThan(bannerBox.width - 42);
await expect(page.locator('.converter-grid__swap')).toHaveCSS('position', 'static');
await expect(page.getByRole('tabpanel', { includeHidden: true })).toHaveCount(2);
await expect(page.getByRole('tabpanel', { name: '원본' })).toBeVisible();
await expect(page.getByRole('tabpanel', { name: /결과/, includeHidden: true })).toBeHidden();
await expect(page.locator('.editor-frame').first()).toHaveCSS('min-height', '320px');
```

- [ ] **Step 2: mobile E2E가 absolute swap과 좁은 direction selector에서 실패하는지 확인한다.**

Run: `npm run test:e2e -- --grep "mobile Studio"`

Expected: swap position이 `absolute`이거나 direction width assertion에서 FAIL한다.

- [ ] **Step 3: 767px 이하 topbar와 workspace CSS를 정확히 적용한다.**

기존 mobile media block을 다음으로 교체한다.

```css
@media (max-width: 767px) {
  .app-main { gap: 12px; }
  .studio-topbar { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 10px 8px; padding: 12px; }
  .studio-brand { grid-column: 1; grid-row: 1; }
  .privacy-note { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .theme-button { grid-column: 2; grid-row: 1; }
  .direction-selector { grid-column: 1 / -1; grid-row: 2; width: 100%; margin: 0; }
  .direction-selector__option { flex: 1; white-space: nowrap; }
  .converter-page { gap: 12px; }
  .studio-control-card__main { align-items: flex-start; flex-direction: column; }
  .converter-toolbar { width: 100%; }
  .status-bar { width: 100%; justify-content: flex-start; flex-wrap: wrap; }
  .converter-workspace { padding: 8px; }
  .mobile-tabs { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; margin-bottom: 8px; padding: 4px; background: var(--fill); border: 1px solid var(--line-subtle); border-radius: var(--radius-md); }
  .mobile-tabs button { min-height: 32px; padding: 0 8px; color: var(--muted); background: transparent; border: 0; border-radius: var(--radius-sm); font-weight: 600; }
  .mobile-tabs button[aria-selected="true"] { color: var(--primary); background: var(--surface); box-shadow: var(--shadow-sm); }
  .converter-grid { display: flex; flex-direction: column; }
  .converter-grid__swap { position: static; order: -1; transform: none; display: flex; justify-content: flex-end; margin-bottom: 8px; }
  .editor-panel[data-kind="source"] { border-right: 0; }
  .editor-panel[data-mobile-hidden="true"] { display: none; }
  .editor-frame { height: 52vh; min-height: 320px; }
}
```

- [ ] **Step 4: Header DOM 순서에 맞춰 contrast test의 keyboard focus 이동을 갱신한다.**

`테마의 진단과 활성 control은 WCAG 대비를 충족한다` test에서 기존 두 번의 `Tab` 입력을 다음 code로 교체한다. direction radio가 theme 버튼보다 먼저 오므로 light에서는 첫 `Tab`, theme 버튼을 클릭한 dark에서는 `Shift+Tab`으로 radio에 도달한다.

```ts
if (theme === 'dark') await page.keyboard.press('Shift+Tab');
else await page.keyboard.press('Tab');
const selectedRadio = page.getByRole('radio', { name: 'JSON → YAML', exact: true });
await expect(selectedRadio).toBeFocused();
```

같은 test의 active/inactive 배경 간 3:1 assertion은 제거한다. 선택 상태는 `aria-checked`, primary 텍스트와 surface 배경으로 전달되므로 다음 text contrast assertion만 유지한다.

```ts
expect(contrast(parseColor(selectedDirection.color), selectedDirectionBackground)).toBeGreaterThanOrEqual(4.5);
```

outline control contrast는 primary인 `예제 불러오기`가 아니라 secondary인 `파일 열기`로 측정하도록 locator를 교체한다.

```ts
const secondary = await computedColors(page.getByRole('button', { name: '파일 열기', exact: true }));
```

- [ ] **Step 5: mobile keyboard, breakpoint와 contrast 회귀를 통과시킨다.**

Run:

```bash
npm run test:e2e -- --grep "768px|767px|mobile Studio|모바일 결과 탭|테마의 진단"
npm run test -- src/App.test.tsx src/pages/ConverterPage.test.tsx
npm run lint
npm run typecheck
```

Expected: 768px desktop, 767px mobile, keyboard swap, light/dark contrast, focused unit tests 모두 PASS.

- [ ] **Step 6: Task 4를 커밋한다.**

```bash
git add json-yaml-converter/src/styles/components.css \
  json-yaml-converter/e2e/responsive.spec.ts
git commit -m "feat(json-yaml-converter): align the mobile converter layout"
```

### Task 5: 전체 기능·문서 동기화와 완료 검증

**Files:**
- Verify: `json-yaml-converter/README.md`
- Verify: `json-yaml-converter/docs/contributor-guide.md`
- Verify: `docs/superpowers/specs/2026-07-22-json-yaml-converter-reference-alignment-design.md`
- Verify: all modified source and test files

**Interfaces:**
- Consumes: Tasks 1-4의 committed UI와 기존 npm scripts
- Produces: 필수 검증 결과와 clean diff

- [ ] **Step 1: 문서가 변경된 동작을 주장하지 않는지 확인한다.**

Run:

```bash
rg -n "1440|56px|360px|변환 방향|모바일 탭" json-yaml-converter/README.md json-yaml-converter/docs/contributor-guide.md
```

Expected: README/contributor guide에 제거된 1440px·56px·360px 레이아웃 계약이 없다. 변환 방향과 모바일 탭 설명이 있으면 새 구조와 모순되지 않는다.

- [ ] **Step 2: 전체 unit test를 실행한다.**

Run: `npm run test`

Expected: 모든 Vitest file PASS, failure 0.

- [ ] **Step 3: lint와 typecheck를 실행한다.**

Run:

```bash
npm run lint
npm run typecheck
```

Expected: 두 명령 모두 exit 0.

- [ ] **Step 4: production build를 실행한다.**

Run: `npm run build`

Expected: `tsc -b`와 `vite build` exit 0, `dist/index.html` 생성.

- [ ] **Step 5: 전체 Chromium E2E를 실행한다.**

Run: `npm run test:e2e`

Expected: 전체 Playwright test PASS, failure 0.

- [ ] **Step 6: 변경 범위와 whitespace를 확인한다.**

Run:

```bash
git diff --check
git status --short
git diff --stat
```

Expected: `git diff --check` 출력 없음. 변경 파일은 계획의 source/test 범위와 필요 시 동기화한 README/contributor guide에 한정된다.

- [ ] **Step 7: 검증 과정에서 문서를 수정한 경우에만 별도 커밋한다.**

문서 수정이 없으면 이 단계에서 commit을 만들지 않는다. 문서가 실제 UI와 달라 수정한 경우 다음 명령을 실행한다.

```bash
git add json-yaml-converter/README.md json-yaml-converter/docs/contributor-guide.md
git commit -m "docs(json-yaml-converter): sync reference-aligned layout guidance"
```
