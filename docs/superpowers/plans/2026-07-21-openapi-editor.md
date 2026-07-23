# OpenAPI Studio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tool Hub에 YAML·JSON 자동 감지, Swagger/OpenAPI 전 버전 방향 변환, 손실 경고, 3분할 편집기와 읽기 전용 미리보기를 제공하는 OpenAPI Studio를 추가한다.

**Architecture:** `openapi-editor/`는 Vite + React + TypeScript 독립 SPA다. React 메인 스레드는 3분할 UI와 사용자 상태를 소유하고, YAML/JSON 파싱·OpenAPI 검증·버전 변환·보정은 revision 기반 Web Worker에서 실행한다. 변환 라이브러리는 어댑터 뒤에 격리하고 모든 결과를 의미 비교와 대상 버전 재검증으로 확인한다.

**Tech Stack:** Node.js 22.12 이상, npm 10.9 이상, Vite 8, React 19, TypeScript 6, Tailwind CSS 4, Monaco Editor, `yaml`, `jsonc-parser`, `@scalar/openapi-parser`, `swagger2openapi`, `@apiture/openapi-down-convert`, `swagger-ui-react`, Vitest, Testing Library, Playwright.

**관련 스펙:** `docs/superpowers/specs/2026-07-21-openapi-editor-design.md`

## Global Constraints

- 작업 디렉터리는 각 명령에 별도 표기가 없으면 `openapi-editor/`다.
- 입력은 Swagger `2.0`, OpenAPI `3.0.0`~`3.0.4`, OpenAPI `3.1.0`~`3.1.2`, OpenAPI `3.2.x`를 허용한다.
- 변환 출력은 Swagger `2.0`, OpenAPI `3.0.4`, OpenAPI `3.1.2`, OpenAPI `3.2.0`으로 정규화한다.
- AsyncAPI, 다중 파일, 외부 `$ref` 해석, 실제 API 호출은 구현하지 않는다.
- 외부 URL·파일 `$ref`는 보존하고 `EXTERNAL_REF_NOT_RESOLVED` 경고를 생성하며 네트워크 요청은 하지 않는다.
- Swagger UI의 `Try it out`은 비활성화하고 API 명세 본문은 브라우저 영구 저장소에 기록하지 않는다.
- 5MB 초과 파일에는 경고를 표시하고 20MB 초과 파일은 열지 않는다.
- 편집 분석은 400ms 디바운스하고 stale Worker 응답은 revision 비교로 폐기한다.
- 구현은 테스트 우선으로 진행하고 각 Task 끝에 관련 테스트, lint, typecheck를 실행한다.
- 최종 완료 전 `openapi-editor/`와 `home/`에서 `test`, `lint`, `typecheck`, `build`를 모두 실행하고 OpenAPI Studio에서 `test:e2e`를 실행한다.
- 기존 `.superpowers/` 미추적 파일은 수정·스테이징하지 않는다.

### 2026-07-23 범위 확장

- Topbar의 모든 직접 조작 요소는 36px 높이로 통일한다.
- 사용자는 Swagger 2.0, OpenAPI 3.0.4, 3.1.2, 3.2.0 중 하나를 선택해 대응하는 YAML 예시 명세를 내려받을 수 있다.
- OpenAPI 3.2를 3.1 이하로 하향 변환할 때는 `query`, `additionalOperations`, 확장 태그, 스트리밍 미디어 필드, OAuth Device Authorization Flow 등 지원 불가한 필드를 확장 필드와 `lossy: true` 진단으로 보존한다.
- 아래 기존 계획의 OpenAPI 3.2 거부, 여섯 변환 방향 언급, 3.0/3.1 전용 완료 조건은 이 범위 확장으로 대체한다.

---

## 복잡도 예산

- `n`을 문서 노드·문자 수, `r`을 `$ref` 수, `h`를 JSON Pointer 최대 깊이로 둔다.
- 형식 감지, 파싱, 직렬화, 의미 인벤토리, 각 변환 pass는 각각 시간 `O(n)`, 추가 공간 `O(n)`을 목표로 한다. 고정된 수의 변환·보정 pass이므로 전체도 `O(n)`이다.
- 내부 `$ref` 검증은 문서 순회 `O(n)`에 Pointer 해석 `O(rh)`가 더해져 시간 `O(n + rh)`, visited set과 안전 복제본 때문에 공간 `O(n)`이다.
- JSON Pointer 위치 인덱스는 line offset 이진 탐색 때문에 시간 `O(n log n)`, 공간 `O(n)`이고, 탐색기 모델은 시간·공간 `O(n)`이다.
- 메인 스레드는 원문, 마지막 유효 문서, 변환 후보, 1회 복원 snapshot을 동시에 가질 수 있으므로 정상 peak는 문서 크기의 상수 배인 `O(n)`이다. 20MB hard limit는 이 복제 비용과 Swagger UI 렌더 비용의 상한을 둔다.
- Monaco와 Swagger UI의 내부 모델 비용은 라이브러리 구현에 좌우되므로 E2E에서 5MB 경고 경로를 확인하고, 20MB 초과 문서는 Worker·Monaco에 전달하기 전에 차단한다.

---

## 파일 구조와 책임

| 경로 | 책임 |
|---|---|
| `openapi-editor/src/domain/document.ts` | 문서 형식·버전·진단·분석 결과 타입 |
| `openapi-editor/src/lib/parser/*` | YAML/JSON 파싱, 형식 감지, Pointer 위치 |
| `openapi-editor/src/lib/validation/*` | 버전 검증, 내부·외부 `$ref`, 안전한 미리보기 문서 |
| `openapi-editor/src/lib/navigation/*` | OpenAPI 구조 트리와 Pointer 이동 인덱스 |
| `openapi-editor/src/lib/conversion/core/*` | 라우터, 어댑터 계약, 의미 인벤토리, 공통 경고 |
| `openapi-editor/src/lib/conversion/up/*` | Swagger 2.0 → 3.0, OpenAPI 3.0 → 3.1 |
| `openapi-editor/src/lib/conversion/down/*` | OpenAPI 3.1 → 3.0, OpenAPI 3.x → Swagger 2.0 |
| `openapi-editor/src/workers/*` | 분석·변환 Worker 프로토콜과 실행기 |
| `openapi-editor/src/hooks/*` | Worker 연결, workspace, conversion, panel 상태 |
| `openapi-editor/src/components/navigator/*` | 구조·진단 탐색기 |
| `openapi-editor/src/components/editor/*` | Monaco 편집기와 원본·후보 탭 |
| `openapi-editor/src/components/preview/*` | 읽기 전용 Swagger UI와 오류 경계 |
| `openapi-editor/src/components/conversion/*` | 대상 선택, 후보 검토, 경고, 적용·취소 |
| `openapi-editor/src/components/layout/*` | Topbar, 3분할, 반응형 shell |
| `openapi-editor/src/lib/files/*` | 업로드 검증, 파일명, Blob 다운로드 |
| `openapi-editor/test/fixtures/*` | 버전·변환 방향별 고정 fixture |
| `openapi-editor/e2e/*` | Playwright 핵심 사용자 흐름 |

---

## 스펙 대응표

| 설계 명세 범위 | 구현 Task |
|---|---|
| 지원 버전·정규 출력·여섯 변환 방향 | 3~10 |
| React SPA·Web Worker 경계와 revision 경쟁 제어 | 1, 5, 10, 11 |
| YAML·JSON 고정형 자동 감지와 편집 포맷 변환 | 2, 11, 12, 14 |
| 내부 Pointer·anchor `$ref`, 외부 참조 경고·무네트워크 | 3, 10, 13, 14 |
| 기존 라이브러리 어댑터와 자체 보정·손실 경고 | 4~10 |
| 3분할 Monaco·구조/진단 탐색기·읽기 전용 Swagger UI | 12~14 |
| 변환 후보 검토·적용·취소·1회 복원·stale preview | 11, 13, 14 |
| 업로드·YAML/JSON 다운로드·5MB/20MB 제한 | 11, 12, 14 |
| 반응형 UI·CSP·API 실행 차단·개인정보 경계 | 13, 14 |
| 단위·골든·컴포넌트·E2E 및 필수 검증 | 모든 Task, 최종 완료 조건 |
| README·기여 문서·Tool Hub 홈 등록 | 15 |

---

### Task 1: Vite React 앱 셸과 필수 검증 기반

**Files:**
- Create: `openapi-editor/AGENTS.md`
- Create: `openapi-editor/package.json`
- Create: `openapi-editor/package-lock.json`
- Create: `openapi-editor/index.html`
- Create: `openapi-editor/eslint.config.js`
- Create: `openapi-editor/tsconfig.json`
- Create: `openapi-editor/tsconfig.app.json`
- Create: `openapi-editor/tsconfig.node.json`
- Create: `openapi-editor/vite.config.ts`
- Create: `openapi-editor/vitest.config.ts`
- Create: `openapi-editor/src/main.tsx`
- Create: `openapi-editor/src/App.tsx`
- Create: `openapi-editor/src/App.test.tsx`
- Create: `openapi-editor/src/test/setup.ts`
- Create: `openapi-editor/src/theme.ts`
- Create: `openapi-editor/src/theme.test.ts`
- Create: `openapi-editor/src/hooks/useTheme.ts`
- Create: `openapi-editor/src/components/layout/AppShell.tsx`
- Create: `openapi-editor/src/components/layout/Topbar.tsx`
- Create: `openapi-editor/src/styles/theme.css`
- Create: `openapi-editor/src/styles/base.css`
- Create: `openapi-editor/src/styles/components.css`
- Create: `openapi-editor/src/index.css`
- Create: `openapi-editor/.gitignore`

**Interfaces:**
- Consumes: 저장소 `docs/frontend-conventions.md`의 Vite shell·테마·CSS 규칙.
- Produces: `resolveInitialTheme(): Theme`, `useTheme(): { theme, toggle }`, 기본 `AppShell`과 검증 스크립트.

- [ ] **Step 1: Vite React TypeScript 프로젝트와 의존성 생성**

저장소 루트에서 실행한다.

```bash
npm create vite@latest openapi-editor -- --template react-ts
cd openapi-editor
npm install react@^19.2.5 react-dom@^19.2.5 @monaco-editor/react@^4.7.0 monaco-editor@^0.55 yaml@^2 jsonc-parser@^3 @scalar/openapi-parser swagger2openapi@7.0.8 @apiture/openapi-down-convert swagger-ui-react
npm install -D @eslint/js@^9 @tailwindcss/vite@^4 @testing-library/jest-dom@^6 @testing-library/react@^16 @testing-library/user-event@^14 @types/node@^22 @types/react@^19 @types/react-dom@^19 @vitejs/plugin-react@^6 eslint@^9 eslint-plugin-react-hooks@^7 eslint-plugin-react-refresh@^0.4 globals@^16 jsdom@^29 tailwindcss@^4 typescript@~6.0.3 typescript-eslint@^8 vite@^8 vitest@^4
npm pkg set scripts.test="vitest run" scripts.test:watch="vitest" scripts.lint="eslint ." scripts.typecheck="tsc -b --pretty false" scripts.build="tsc -b && vite build" scripts.preview="vite preview"
```

Expected: `package-lock.json`이 생기고 `npm ls --depth=0`이 exit 0이다.

프로젝트 생성 직후 `openapi-editor/AGENTS.md`를 다음 내용으로 만들어 이후 Task가 로컬 규칙을 읽고 실행되게 한다.

```markdown
# Repository Guidelines

## Purpose
OpenAPI Studio 기여자와 에이전트를 위한 짧은 인덱스다.

## Required Verification
- `npm run test`, `npm run lint`, `npm run typecheck`, `npm run build`, `npm run test:e2e`를 실행한다.
- 변환 규칙 변경에는 여섯 방향 중 영향받는 골든 fixture와 손실 경고 테스트를 추가한다.

## Detailed Reference
- [Contributor guide](docs/contributor-guide.md)
```

- [ ] **Step 2: 실패하는 앱 셸 테스트 작성**

`src/App.test.tsx`를 다음 내용으로 만든다.

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import App from './App';

describe('OpenAPI Studio App', () => {
  it('renders the editor workspace shell', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'OpenAPI Studio' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '파일 업로드' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '변환' })).toBeDisabled();
    expect(screen.getByLabelText('문서 탐색기')).toBeInTheDocument();
    expect(screen.getByLabelText('문서 편집기')).toBeInTheDocument();
    expect(screen.getByLabelText('API 미리보기')).toBeInTheDocument();
  });

  it('toggles the document theme', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: '테마 전환' }));
    expect(document.documentElement).toHaveAttribute('data-theme', 'light');
  });
});
```

- [ ] **Step 3: 테스트가 셸 부재로 실패하는지 확인**

```bash
npm run test -- src/App.test.tsx
```

Expected: `OpenAPI Studio` heading 또는 `문서 탐색기`를 찾지 못해 FAIL.

- [ ] **Step 4: 테마와 최소 셸 구현**

`src/theme.ts`:

```ts
export type Theme = 'light' | 'dark';

export function resolveInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'light';
  try {
    const saved = localStorage.getItem('theme');
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}
```

`src/hooks/useTheme.ts`:

```ts
import { useEffect, useState } from 'react';
import { resolveInitialTheme, type Theme } from '../theme';

export function useTheme(): { theme: Theme; toggle: () => void } {
  const [theme, setTheme] = useState<Theme>(resolveInitialTheme);
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try { localStorage.setItem('theme', theme); } catch { /* 테마 저장 실패 무시 */ }
  }, [theme]);
  return { theme, toggle: () => setTheme((current) => (current === 'dark' ? 'light' : 'dark')) };
}
```

`src/components/layout/Topbar.tsx`:

```tsx
import type { Theme } from '../../theme';

interface TopbarProps { theme: Theme; onToggleTheme: () => void }

export default function Topbar({ theme, onToggleTheme }: TopbarProps) {
  return (
    <header className="topbar">
      <h1>OpenAPI Studio</h1>
      <div className="topbar-actions">
        <button type="button" aria-label="파일 업로드">파일 업로드</button>
        <button type="button" aria-label="변환" disabled>변환</button>
        <button type="button" aria-label="다운로드" disabled>다운로드</button>
        <button type="button" aria-label="테마 전환" onClick={onToggleTheme}>
          {theme === 'dark' ? '라이트 테마' : '다크 테마'}
        </button>
      </div>
    </header>
  );
}
```

`src/components/layout/AppShell.tsx`:

```tsx
import Topbar from './Topbar';
import { useTheme } from '../../hooks/useTheme';

export default function AppShell() {
  const { theme, toggle } = useTheme();
  return (
    <div className="app-shell">
      <Topbar theme={theme} onToggleTheme={toggle} />
      <main className="workspace-shell">
        <aside aria-label="문서 탐색기" className="workspace-panel">문서 탐색기</aside>
        <section aria-label="문서 편집기" className="workspace-panel">문서 편집기</section>
        <section aria-label="API 미리보기" className="workspace-panel">API 미리보기</section>
      </main>
    </div>
  );
}
```

`src/App.tsx`:

```tsx
import AppShell from './components/layout/AppShell';
export default function App() { return <AppShell />; }
```

- [ ] **Step 5: 테스트 설정과 CSS 진입점 구성**

`vite.config.ts`:

```ts
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  worker: { format: 'es' },
});
```

`vitest.config.ts`:

```ts
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: true,
  },
});
```

`src/main.tsx`:

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode><App /></StrictMode>,
);
```

`src/theme.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { resolveInitialTheme } from './theme';

describe('resolveInitialTheme', () => {
  it('prefers a stored theme', () => {
    localStorage.setItem('theme', 'light');
    expect(resolveInitialTheme()).toBe('light');
  });

  it('falls back to the system preference', () => {
    expect(resolveInitialTheme()).toBe('dark');
  });
});
```

`src/test/setup.ts`:

```ts
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

afterEach(() => {
  cleanup();
  document.documentElement.removeAttribute('data-theme');
  localStorage.clear();
});

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: query.includes('dark'), media: query, onchange: null,
    addListener: vi.fn(), removeListener: vi.fn(),
    addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn(),
  })),
});
```

`src/index.css`:

```css
@import "tailwindcss";
@import "./styles/theme.css";
@import "./styles/base.css";
@import "./styles/components.css";
```

`src/styles/theme.css`:

```css
@custom-variant dark (&:where([data-theme=dark], [data-theme=dark] *));
@theme {
  --color-canvas: #f5f7fb; --color-canvas-dark: #0b1020;
  --color-surface: #ffffff; --color-surface-dark: #111827;
  --color-border: #dbe2ea; --color-border-dark: #334155;
  --color-primary: #4f46e5;
  --font-sans: system-ui, -apple-system, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif;
}
```

`src/styles/base.css`:

```css
*, *::before, *::after { box-sizing: border-box; }
html { color-scheme: light; font-family: var(--font-sans); }
html[data-theme="dark"] { color-scheme: dark; }
body { margin: 0; min-width: 320px; min-height: 100vh; background: var(--color-canvas); }
html[data-theme="dark"] body { background: var(--color-canvas-dark); }
button, select, input { font: inherit; }
```

`src/styles/components.css`:

```css
.app-shell { min-height: 100vh; color: #0f172a; }
[data-theme="dark"] .app-shell { color: #e2e8f0; }
.topbar { min-height: 56px; display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 8px 16px; border-bottom: 1px solid var(--color-border); background: var(--color-surface); }
[data-theme="dark"] .topbar { border-color: var(--color-border-dark); background: var(--color-surface-dark); }
.topbar h1 { margin: 0; font-size: 18px; }
.topbar-actions { display: flex; align-items: center; gap: 8px; }
.workspace-shell { min-height: calc(100vh - 56px); display: grid; grid-template-columns: 22% 39% 39%; }
.workspace-panel { min-width: 0; padding: 16px; border-right: 1px solid var(--color-border); background: var(--color-surface); }
[data-theme="dark"] .workspace-panel { border-color: var(--color-border-dark); background: var(--color-surface-dark); }
```

- [ ] **Step 6: 앱 셸 검증**

```bash
npm run test -- src/App.test.tsx src/theme.test.ts
npm run lint
npm run typecheck
npm run build
```

Expected: 모든 명령 exit 0. Vite build 결과에 `dist/index.html`이 생성됨.

- [ ] **Step 7: 커밋**

```bash
git add openapi-editor
git commit -m "feat(openapi-editor): scaffold React workspace"
```

---

### Task 2: YAML·JSON 파싱, 고정형 자동 감지, 직렬화

**Files:**
- Create: `openapi-editor/src/domain/document.ts`
- Create: `openapi-editor/src/lib/parser/format-detector.ts`
- Create: `openapi-editor/src/lib/parser/format-detector.test.ts`
- Create: `openapi-editor/src/lib/parser/parse-source.ts`
- Create: `openapi-editor/src/lib/parser/parse-source.test.ts`
- Create: `openapi-editor/src/lib/parser/serialize-document.ts`
- Create: `openapi-editor/src/lib/parser/serialize-document.test.ts`

**Interfaces:**
- Consumes: 없음.
- Produces: `detectDocumentFormat(input): FormatDetection`, `parseSource(raw, format): ParseResult`, `serializeDocument(value, format): string`, 공통 `Diagnostic` 타입.

- [ ] **Step 1: 도메인 타입과 실패 테스트 작성**

`src/domain/document.ts`:

```ts
export type DocumentFormat = 'yaml' | 'json';
export type SpecFamily = 'swagger-2.0' | 'openapi-3.0' | 'openapi-3.1';
export type DiagnosticSeverity = 'info' | 'warning' | 'error';
export interface SourceLocation { startLine: number; startColumn: number; endLine: number; endColumn: number }
export interface Diagnostic {
  id: string; code: string; severity: DiagnosticSeverity;
  stage: 'parse' | 'validate' | 'convert' | 'reconcile' | 'render';
  message: string; sourcePointer: string; targetPointer?: string;
  location?: SourceLocation; action?: string; lossy: boolean;
}
export type OpenApiDocument = Record<string, unknown>;
export interface ParseSuccess { ok: true; value: OpenApiDocument; diagnostics: Diagnostic[] }
export interface ParseFailure { ok: false; diagnostics: Diagnostic[] }
export type ParseResult = ParseSuccess | ParseFailure;
```

`src/lib/parser/format-detector.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { detectDocumentFormat } from './format-detector';

describe('detectDocumentFormat', () => {
  it.each([
    ['openapi.yaml', 'openapi: 3.1.2', 'yaml'],
    ['openapi.yml', 'swagger: "2.0"', 'yaml'],
    ['openapi.json', '{"openapi":"3.0.4"}', 'json'],
  ] as const)('uses a matching extension for %s', (filename, raw, expected) => {
    expect(detectDocumentFormat({ filename, raw })).toMatchObject({ format: expected, locked: true });
  });

  it('falls back to content and warns when extension is wrong', () => {
    const result = detectDocumentFormat({ filename: 'openapi.json', raw: 'openapi: 3.1.2' });
    expect(result.format).toBe('yaml');
    expect(result.diagnostics.map((item) => item.code)).toContain('FILE_EXTENSION_MISMATCH');
  });

  it('prefers JSON for extensionless content valid in both parsers', () => {
    expect(detectDocumentFormat({ raw: '{"openapi":"3.1.2"}' }).format).toBe('json');
  });

  it('keeps an existing lock while the user types invalid content', () => {
    expect(detectDocumentFormat({ raw: '{', lockedFormat: 'json' })).toMatchObject({ format: 'json', locked: true });
  });

  it('locks an extension even when the uploaded content is temporarily invalid', () => {
    expect(detectDocumentFormat({ filename: 'openapi.json', raw: '{' })).toMatchObject({ format: 'json', locked: true });
  });
});
```

`src/lib/parser/parse-source.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { parseSource } from './parse-source';

describe('parseSource', () => {
  it('parses a YAML object', () => {
    expect(parseSource('openapi: 3.1.2\ninfo:\n  title: API\n  version: 1.0.0\npaths: {}\n', 'yaml')).toMatchObject({ ok: true });
  });
  it('rejects JSON comments and trailing commas', () => {
    const result = parseSource('{"openapi":"3.1.2",}', 'json');
    expect(result.ok).toBe(false);
    expect(result.diagnostics[0]?.code).toBe('JSON_SYNTAX_ERROR');
  });
  it('rejects a non-object root', () => {
    const result = parseSource('- one\n- two\n', 'yaml');
    expect(result.ok).toBe(false);
    expect(result.diagnostics[0]?.code).toBe('DOCUMENT_ROOT_NOT_OBJECT');
  });
});
```

- [ ] **Step 2: 실패 확인**

```bash
npm run test -- src/lib/parser/format-detector.test.ts src/lib/parser/parse-source.test.ts
```

Expected: 모듈 부재로 FAIL.

- [ ] **Step 3: 파서와 감지기 구현**

`src/lib/parser/parse-source.ts`:

```ts
import { parse, printParseErrorCode, type ParseError } from 'jsonc-parser';
import { parseDocument } from 'yaml';
import type { Diagnostic, DocumentFormat, OpenApiDocument, ParseResult } from '../../domain/document';

function parseError(code: string, message: string): Diagnostic {
  return { id: `${code}:root`, code, severity: 'error', stage: 'parse', message, sourcePointer: '', lossy: false };
}
function isRecord(value: unknown): value is OpenApiDocument {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
export function parseSource(raw: string, format: DocumentFormat): ParseResult {
  if (format === 'json') {
    const errors: ParseError[] = [];
    const value = parse(raw, errors, { allowTrailingComma: false, disallowComments: true }) as unknown;
    if (errors.length > 0) {
      return { ok: false, diagnostics: [parseError('JSON_SYNTAX_ERROR', errors.map((error) => printParseErrorCode(error.error)).join(', '))] };
    }
    if (!isRecord(value)) return { ok: false, diagnostics: [parseError('DOCUMENT_ROOT_NOT_OBJECT', '루트는 객체여야 합니다.')] };
    return { ok: true, value, diagnostics: [] };
  }
  const document = parseDocument(raw, { maxAliasCount: 100, prettyErrors: true });
  if (document.errors.length > 0) {
    return { ok: false, diagnostics: [parseError('YAML_SYNTAX_ERROR', document.errors[0]?.message ?? 'YAML 문법 오류')] };
  }
  const value = document.toJS({ maxAliasCount: 100 }) as unknown;
  if (!isRecord(value)) return { ok: false, diagnostics: [parseError('DOCUMENT_ROOT_NOT_OBJECT', '루트는 객체여야 합니다.')] };
  return { ok: true, value, diagnostics: [] };
}
```

`src/lib/parser/format-detector.ts`:

```ts
import type { Diagnostic, DocumentFormat } from '../../domain/document';
import { parseSource } from './parse-source';

interface DetectInput { raw: string; filename?: string; lockedFormat?: DocumentFormat }
export interface FormatDetection { format: DocumentFormat; locked: boolean; diagnostics: Diagnostic[] }

function extensionFormat(filename?: string): DocumentFormat | undefined {
  const lower = filename?.toLowerCase();
  if (lower?.endsWith('.json')) return 'json';
  if (lower?.endsWith('.yaml') || lower?.endsWith('.yml')) return 'yaml';
  return undefined;
}
export function detectDocumentFormat(input: DetectInput): FormatDetection {
  if (input.lockedFormat) return { format: input.lockedFormat, locked: true, diagnostics: [] };
  const fromExtension = extensionFormat(input.filename);
  const order: DocumentFormat[] = fromExtension ? [fromExtension, fromExtension === 'json' ? 'yaml' : 'json'] : ['json', 'yaml'];
  const successful = order.find((format) => parseSource(input.raw, format).ok);
  const format = successful ?? fromExtension ?? 'yaml';
  const mismatch = fromExtension !== undefined && successful !== undefined && fromExtension !== successful;
  return {
    format,
    locked: fromExtension !== undefined || successful !== undefined,
    diagnostics: mismatch ? [{
      id: 'FILE_EXTENSION_MISMATCH:root', code: 'FILE_EXTENSION_MISMATCH', severity: 'warning', stage: 'parse',
      message: `파일 확장자와 내용이 달라 ${format.toUpperCase()}로 열었습니다.`, sourcePointer: '', lossy: false,
    }] : [],
  };
}
```

- [ ] **Step 4: 직렬화 테스트와 구현**

`src/lib/parser/serialize-document.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { serializeDocument } from './serialize-document';

describe('serializeDocument', () => {
  const document = { openapi: '3.1.2', info: { title: 'API', version: '1.0.0' }, paths: {} };
  it('serializes two-space JSON with a final newline', () => {
    expect(serializeDocument(document, 'json')).toBe(`${JSON.stringify(document, null, 2)}\n`);
  });
  it('serializes parseable YAML', () => {
    expect(serializeDocument(document, 'yaml')).toContain('openapi: 3.1.2');
  });
});
```

`src/lib/parser/serialize-document.ts`:

```ts
import { stringify } from 'yaml';
import type { DocumentFormat, OpenApiDocument } from '../../domain/document';
export function serializeDocument(document: OpenApiDocument, format: DocumentFormat): string {
  if (format === 'json') return `${JSON.stringify(document, null, 2)}\n`;
  const output = stringify(document, { indent: 2, lineWidth: 0 });
  return output.endsWith('\n') ? output : `${output}\n`;
}
```

- [ ] **Step 5: 검증과 커밋**

```bash
npm run test -- src/lib/parser
npm run lint
npm run typecheck
git add src/domain src/lib/parser
git commit -m "feat(openapi-editor): add YAML and JSON parsing"
```

Expected: 모든 명령 exit 0.

---

### Task 3: 버전 감지, JSON Pointer, `$ref` 검증, 탐색기 모델

**Files:**
- Create: `openapi-editor/src/lib/validation/version-detector.ts`
- Create: `openapi-editor/src/lib/validation/version-detector.test.ts`
- Create: `openapi-editor/src/lib/validation/ref-validator.ts`
- Create: `openapi-editor/src/lib/validation/ref-validator.test.ts`
- Create: `openapi-editor/src/lib/validation/safe-document.ts`
- Create: `openapi-editor/src/lib/validation/safe-document.test.ts`
- Create: `openapi-editor/src/lib/navigation/json-pointer.ts`
- Create: `openapi-editor/src/lib/navigation/document-tree.ts`
- Create: `openapi-editor/src/lib/navigation/document-tree.test.ts`
- Create: `openapi-editor/src/lib/parser/pointer-locations.ts`
- Modify: `openapi-editor/src/lib/parser/parse-source.ts`
- Modify: `openapi-editor/src/domain/document.ts`

**Interfaces:**
- Consumes: Task 2의 `OpenApiDocument`, `Diagnostic`, `parseSource`.
- Produces: `detectSpecVersion`, `validateReferences`, `buildDocumentTree`, `buildPointerLocations`.

- [ ] **Step 1: 버전·참조 실패 테스트 작성**

`src/lib/validation/version-detector.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { detectSpecVersion } from './version-detector';

describe('detectSpecVersion', () => {
  it.each([
    [{ swagger: '2.0' }, 'swagger-2.0'],
    [{ openapi: '3.0.4' }, 'openapi-3.0'],
    [{ openapi: '3.1.2' }, 'openapi-3.1'],
  ] as const)('detects supported documents', (document, family) => {
    expect(detectSpecVersion(document)).toMatchObject({ ok: true, family });
  });
  it('rejects OpenAPI 3.2', () => {
    expect(detectSpecVersion({ openapi: '3.2.0' })).toMatchObject({ ok: false, diagnostic: { code: 'UNSUPPORTED_SPEC_VERSION' } });
  });
  it('rejects conflicting root fields', () => {
    expect(detectSpecVersion({ swagger: '2.0', openapi: '3.0.4' })).toMatchObject({ ok: false, diagnostic: { code: 'CONFLICTING_SPEC_VERSION' } });
  });
});
```

`src/lib/validation/ref-validator.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { validateReferences } from './ref-validator';

describe('validateReferences', () => {
  it('accepts a resolved internal reference', () => {
    const document = { components: { schemas: { Pet: { type: 'object' } } }, paths: { '/pets': { get: { responses: { 200: { $ref: '#/components/schemas/Pet' } } } } } };
    expect(validateReferences(document)).toEqual([]);
  });
  it('reports an unresolved internal reference', () => {
    expect(validateReferences({ paths: { '/pets': { $ref: '#/components/pathItems/Missing' } } })[0]).toMatchObject({ code: 'UNRESOLVED_INTERNAL_REF', severity: 'error' });
  });
  it('warns for an external reference', () => {
    expect(validateReferences({ components: { schemas: { Pet: { $ref: './common.yaml#/Pet' } } } })[0]).toMatchObject({ code: 'EXTERNAL_REF_NOT_RESOLVED', severity: 'warning' });
  });
  it('resolves a local OpenAPI 3.1 anchor without network access', () => {
    const document = { components: { schemas: { Pet: { $anchor: 'Pet', type: 'object' }, PetList: { items: { $ref: '#Pet' } } } } };
    expect(validateReferences(document)).toEqual([]);
  });
});
```

- [ ] **Step 2: 실패 확인**

```bash
npm run test -- src/lib/validation
```

Expected: 모듈 부재로 FAIL.

- [ ] **Step 3: 버전 감지 구현**

`src/lib/validation/version-detector.ts`:

```ts
import type { Diagnostic, OpenApiDocument, SpecFamily } from '../../domain/document';
type VersionResult = { ok: true; family: SpecFamily; rawVersion: string } | { ok: false; diagnostic: Diagnostic };
function invalid(code: string, message: string): VersionResult {
  return { ok: false, diagnostic: { id: `${code}:root`, code, severity: 'error', stage: 'validate', message, sourcePointer: '', lossy: false } };
}
export function detectSpecVersion(document: OpenApiDocument): VersionResult {
  const swagger = document.swagger;
  const openapi = document.openapi;
  if (typeof swagger === 'string' && typeof openapi === 'string') return invalid('CONFLICTING_SPEC_VERSION', 'swagger와 openapi를 동시에 선언할 수 없습니다.');
  if (swagger === '2.0') return { ok: true, family: 'swagger-2.0', rawVersion: swagger };
  if (typeof openapi === 'string' && /^3\.0\.[0-4]$/.test(openapi)) return { ok: true, family: 'openapi-3.0', rawVersion: openapi };
  if (typeof openapi === 'string' && /^3\.1\.[0-2]$/.test(openapi)) return { ok: true, family: 'openapi-3.1', rawVersion: openapi };
  if (swagger === undefined && openapi === undefined) return invalid('MISSING_SPEC_VERSION', 'swagger 또는 openapi 버전 필드가 필요합니다.');
  return invalid('UNSUPPORTED_SPEC_VERSION', `지원하지 않는 명세 버전입니다: ${String(swagger ?? openapi)}`);
}
```

- [ ] **Step 4: JSON Pointer와 `$ref` 검사 구현**

`src/lib/navigation/json-pointer.ts`:

```ts
export function escapePointerToken(token: string): string { return token.replaceAll('~', '~0').replaceAll('/', '~1'); }
export function unescapePointerToken(token: string): string { return token.replaceAll('~1', '/').replaceAll('~0', '~'); }
export function resolvePointer(root: unknown, pointer: string): unknown {
  if (pointer === '') return root;
  if (!pointer.startsWith('#/')) return undefined;
  return pointer.slice(2).split('/').map(unescapePointerToken).reduce<unknown>((value, token) => {
    if (typeof value !== 'object' || value === null) return undefined;
    return (value as Record<string, unknown>)[token];
  }, root);
}
```

`src/lib/validation/ref-validator.ts`:

```ts
import type { Diagnostic, OpenApiDocument } from '../../domain/document';
import { escapePointerToken, resolvePointer } from '../navigation/json-pointer';

function resolveLocalReference(document: OpenApiDocument, reference: string): unknown {
  if (reference === '#') return document;
  if (reference.startsWith('#/')) return resolvePointer(document, reference);
  if (!reference.startsWith('#')) return undefined;
  let anchor: string;
  try { anchor = decodeURIComponent(reference.slice(1)); }
  catch { return undefined; }
  const visited = new Set<object>();
  const find = (value: unknown): unknown => {
    if (typeof value !== 'object' || value === null || visited.has(value)) return undefined;
    visited.add(value);
    if (!Array.isArray(value) && (value as Record<string, unknown>).$anchor === anchor) return value;
    for (const child of Object.values(value)) {
      const found = find(child);
      if (found !== undefined) return found;
    }
    return undefined;
  };
  return find(document);
}

export function validateReferences(document: OpenApiDocument): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const visited = new Set<object>();
  function visit(value: unknown, pointer: string): void {
    if (typeof value !== 'object' || value === null || visited.has(value)) return;
    visited.add(value);
    if (!Array.isArray(value)) {
      const reference = (value as Record<string, unknown>).$ref;
      if (typeof reference === 'string') {
        if (reference.startsWith('#')) {
          if (resolveLocalReference(document, reference) === undefined) diagnostics.push({ id: `UNRESOLVED_INTERNAL_REF:${pointer}`, code: 'UNRESOLVED_INTERNAL_REF', severity: 'error', stage: 'validate', message: `내부 참조를 찾을 수 없습니다: ${reference}`, sourcePointer: pointer, lossy: false });
        } else {
          diagnostics.push({ id: `EXTERNAL_REF_NOT_RESOLVED:${pointer}`, code: 'EXTERNAL_REF_NOT_RESOLVED', severity: 'warning', stage: 'validate', message: `외부 참조는 가져오지 않습니다: ${reference}`, sourcePointer: pointer, lossy: false });
        }
      }
    }
    Object.entries(value).forEach(([key, child]) => visit(child, `${pointer}/${escapePointerToken(key)}`));
  }
  visit(document, '');
  return diagnostics;
}
```

`safe-document.ts`는 외부 validator와 Swagger UI에 전달할 복제본에서만 외부 `$ref`를 제거한다. 원문과 변환 문서에는 외부 참조 문자열을 그대로 보존한다.

```ts
import type { OpenApiDocument } from '../../domain/document';

export function buildSafeDocument(document: OpenApiDocument): OpenApiDocument {
  const output = structuredClone(document);
  const visited = new Set<object>();
  const visit = (value: unknown): void => {
    if (typeof value !== 'object' || value === null || visited.has(value)) return;
    visited.add(value);
    if (!Array.isArray(value)) {
      const record = value as Record<string, unknown>;
      if (typeof record.$ref === 'string' && !record.$ref.startsWith('#')) {
        record['x-toolhub-unresolved-external-ref'] = record.$ref;
        delete record.$ref;
      }
    }
    Object.values(value).forEach(visit);
  };
  visit(output);
  return output;
}
```

`safe-document.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { buildSafeDocument } from './safe-document';

describe('buildSafeDocument', () => {
  it('keeps local refs and removes URL or file refs only in the clone', () => {
    const source = { components: { schemas: {
      Local: { $ref: '#/components/schemas/Pet' }, Anchor: { $ref: '#Pet' },
      Url: { $ref: 'https://example.com/pet.yaml#/Pet' }, File: { $ref: './common.yaml#/Pet' },
    } } };
    const safe = buildSafeDocument(source);
    expect(safe).toHaveProperty('components.schemas.Local.$ref', '#/components/schemas/Pet');
    expect(safe).toHaveProperty('components.schemas.Anchor.$ref', '#Pet');
    expect(safe).not.toHaveProperty('components.schemas.Url.$ref');
    expect(safe).toHaveProperty('components.schemas.Url.x-toolhub-unresolved-external-ref', 'https://example.com/pet.yaml#/Pet');
    expect(safe).not.toHaveProperty('components.schemas.File.$ref');
    expect(source).toHaveProperty('components.schemas.Url.$ref', 'https://example.com/pet.yaml#/Pet');
  });
});
```

- [ ] **Step 5: 탐색기 모델 구현과 테스트**

`src/lib/navigation/document-tree.ts`:

```ts
import type { OpenApiDocument, SpecFamily } from '../../domain/document';
import { escapePointerToken } from './json-pointer';
export interface DocumentTreeNode { id: string; label: string; pointer: string; children: DocumentTreeNode[] }
const HTTP_METHODS = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'];
export function buildDocumentTree(document: OpenApiDocument, family: SpecFamily): DocumentTreeNode[] {
  const nodes: DocumentTreeNode[] = [];
  if (document.info) nodes.push({ id: 'info', label: 'Info', pointer: '/info', children: [] });
  const paths = typeof document.paths === 'object' && document.paths !== null ? document.paths as Record<string, unknown> : {};
  const pathChildren = Object.entries(paths).map(([path, pathItem]) => {
    const operations = typeof pathItem === 'object' && pathItem !== null ? Object.keys(pathItem).filter((key) => HTTP_METHODS.includes(key)) : [];
    const pointer = `/paths/${escapePointerToken(path)}`;
    return { id: `path:${path}`, label: path, pointer, children: operations.map((method) => ({ id: `operation:${method}:${path}`, label: method.toUpperCase(), pointer: `${pointer}/${method}`, children: [] })) };
  });
  nodes.push({ id: 'paths', label: 'Paths', pointer: '/paths', children: pathChildren });
  const componentKey = family === 'swagger-2.0' ? 'definitions' : 'components';
  if (document[componentKey]) nodes.push({ id: componentKey, label: family === 'swagger-2.0' ? 'Definitions' : 'Components', pointer: `/${componentKey}`, children: [] });
  return nodes;
}
```

`src/lib/navigation/document-tree.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { buildDocumentTree } from './document-tree';
describe('buildDocumentTree', () => {
  it('indexes operations by JSON Pointer', () => {
    const tree = buildDocumentTree({ openapi: '3.1.2', info: {}, paths: { '/pets': { get: {}, post: {} } }, components: {} }, 'openapi-3.1');
    expect(tree.find((node) => node.id === 'paths')?.children[0]?.children.map((node) => node.pointer)).toEqual(['/paths/~1pets/get', '/paths/~1pets/post']);
  });
});
```

- [ ] **Step 6: Pointer 위치 인덱스 구현**

`src/lib/parser/pointer-locations.ts`는 `jsonc-parser.parseTree`와 YAML node range를 순회한다.

```ts
import type { DocumentFormat, SourceLocation } from '../../domain/document';
import { parseTree, type Node as JsonNode } from 'jsonc-parser';
import { isMap, isSeq, parseDocument, type Node as YamlNode } from 'yaml';
import { escapePointerToken } from '../navigation/json-pointer';

function createLocator(raw: string): (start: number, end: number) => SourceLocation {
  const lineStarts = [0];
  for (let index = 0; index < raw.length; index += 1) if (raw[index] === '\n') lineStarts.push(index + 1);
  const point = (offset: number): readonly [number, number] => {
    let low = 0;
    let high = lineStarts.length;
    while (low + 1 < high) {
      const middle = Math.floor((low + high) / 2);
      if (lineStarts[middle]! <= offset) low = middle; else high = middle;
    }
    return [low + 1, offset - lineStarts[low]! + 1];
  };
  return (start, end) => {
    const [startLine, startColumn] = point(start);
    const [endLine, endColumn] = point(end);
    return { startLine, startColumn, endLine, endColumn };
  };
}

function jsonLocations(raw: string): Map<string, SourceLocation> {
  const result = new Map<string, SourceLocation>();
  const locate = createLocator(raw);
  const root = parseTree(raw);
  if (!root) return result;
  result.set('', locate(root.offset, root.offset + root.length));
  const visit = (node: JsonNode, pointer: string): void => {
    if (node.type === 'object') {
      for (const property of node.children ?? []) {
        const [key, value] = property.children ?? [];
        if (!key || !value || typeof key.value !== 'string') continue;
        const childPointer = `${pointer}/${escapePointerToken(key.value)}`;
        result.set(childPointer, locate(value.offset, value.offset + value.length));
        visit(value, childPointer);
      }
    } else if (node.type === 'array') {
      (node.children ?? []).forEach((child, index) => {
        const childPointer = `${pointer}/${index}`;
        result.set(childPointer, locate(child.offset, child.offset + child.length));
        visit(child, childPointer);
      });
    }
  };
  visit(root, '');
  return result;
}

function yamlLocations(raw: string): Map<string, SourceLocation> {
  const result = new Map<string, SourceLocation>();
  const locate = createLocator(raw);
  const document = parseDocument(raw);
  const root = document.contents;
  if (!root) return result;
  const range = (node: YamlNode | null | undefined): readonly [number, number] | undefined =>
    node?.range ? [node.range[0], node.range[1]] : undefined;
  const record = (node: YamlNode, pointer: string): void => {
    const nodeRange = range(node);
    if (nodeRange) result.set(pointer, locate(nodeRange[0], nodeRange[1]));
    if (isMap(node)) {
      for (const pair of node.items) {
        const key = String(pair.key && 'value' in pair.key ? pair.key.value : pair.key ?? '');
        if (!pair.value) continue;
        record(pair.value, `${pointer}/${escapePointerToken(key)}`);
      }
    } else if (isSeq(node)) {
      node.items.forEach((child, index) => { if (child) record(child, `${pointer}/${index}`); });
    }
  };
  record(root, '');
  return result;
}

export function buildPointerLocations(raw: string, format: DocumentFormat): Map<string, SourceLocation> {
  return format === 'json' ? jsonLocations(raw) : yamlLocations(raw);
}
```

`ParseSuccess`와 `parseSource.ts`를 다음처럼 변경한다.

```ts
export interface ParseSuccess {
  ok: true;
  value: OpenApiDocument;
  diagnostics: Diagnostic[];
  pointerLocations: Map<string, SourceLocation>;
}
```

```ts
import { buildPointerLocations } from './pointer-locations';
return { ok: true, value, diagnostics: [], pointerLocations: buildPointerLocations(raw, format) };
```

기존 두 성공 return을 위 공통 형태로 바꾸고 `parse-source.test.ts`에 다음 테스트를 추가한다. 실패 결과에는 위치 Map을 만들지 않는다.

```ts
it.each([
  ['yaml', 'openapi: 3.1.2\npaths:\n  /pets:\n    get: {}\n', 4],
  ['json', '{\n  "openapi": "3.1.2",\n  "paths": {\n    "/pets": {\n      "get": {}\n    }\n  }\n}', 5],
] as const)('indexes an operation location in %s', (format, raw, line) => {
  const result = parseSource(raw, format);
  expect(result.ok).toBe(true);
  if (result.ok) expect(result.pointerLocations.get('/paths/~1pets/get')?.startLine).toBe(line);
});
```

- [ ] **Step 7: 검증과 커밋**

```bash
npm run test -- src/lib/validation src/lib/navigation src/lib/parser
npm run lint
npm run typecheck
git add src/domain src/lib/parser src/lib/validation src/lib/navigation
git commit -m "feat(openapi-editor): validate versions and references"
```

Expected: 모든 명령 exit 0.

---

### Task 4: 변환 라우터, 어댑터 계약, 의미 인벤토리

**Files:**
- Create: `openapi-editor/src/lib/conversion/core/types.ts`
- Create: `openapi-editor/src/lib/conversion/core/router.ts`
- Create: `openapi-editor/src/lib/conversion/core/router.test.ts`
- Create: `openapi-editor/src/lib/conversion/core/inventory.ts`
- Create: `openapi-editor/src/lib/conversion/core/inventory.test.ts`
- Create: `openapi-editor/src/lib/conversion/core/reconcile.ts`
- Create: `openapi-editor/src/lib/conversion/core/reconcile.test.ts`

**Interfaces:**
- Consumes: Task 2의 문서 타입과 Task 3의 버전 타입.
- Produces: `ConverterAdapter`, `routeConversion`, `extractInventory`, `reconcileInventories`.

- [ ] **Step 1: 라우터 실패 테스트 작성**

```ts
import { describe, expect, it } from 'vitest';
import { routeConversion } from './router';
describe('routeConversion', () => {
  it.each([
    ['swagger-2.0', 'openapi-3.0', ['swagger-2-to-openapi-3.0']],
    ['swagger-2.0', 'openapi-3.1', ['swagger-2-to-openapi-3.0', 'openapi-3.0-to-3.1']],
    ['openapi-3.0', 'swagger-2.0', ['openapi-3-to-swagger-2']],
    ['openapi-3.0', 'openapi-3.1', ['openapi-3.0-to-3.1']],
    ['openapi-3.1', 'openapi-3.0', ['openapi-3.1-to-3.0']],
    ['openapi-3.1', 'swagger-2.0', ['openapi-3.1-to-3.0', 'openapi-3-to-swagger-2']],
  ] as const)('routes %s to %s', (source, target, expected) => {
    expect(routeConversion(source, target).map((step) => step.id)).toEqual(expected);
  });
});
```

- [ ] **Step 2: 실패 확인**

```bash
npm run test -- src/lib/conversion/core/router.test.ts
```

Expected: 모듈 부재로 FAIL.

- [ ] **Step 3: 계약과 라우터 구현**

`src/lib/conversion/core/types.ts`:

```ts
import type { Diagnostic, OpenApiDocument, SpecFamily } from '../../../domain/document';
export type ConversionStepId = 'swagger-2-to-openapi-3.0' | 'openapi-3.0-to-3.1' | 'openapi-3.1-to-3.0' | 'openapi-3-to-swagger-2';
export interface ConversionStep { id: ConversionStepId; source: SpecFamily; target: SpecFamily }
export interface AdapterResult { document: OpenApiDocument; diagnostics: Diagnostic[] }
export interface ConverterAdapter { readonly id: ConversionStepId; convert(document: OpenApiDocument): Promise<AdapterResult> }
```

`src/lib/conversion/core/router.ts`:

```ts
import type { SpecFamily } from '../../../domain/document';
import type { ConversionStep } from './types';
const STEP = {
  up20: { id: 'swagger-2-to-openapi-3.0', source: 'swagger-2.0', target: 'openapi-3.0' },
  up31: { id: 'openapi-3.0-to-3.1', source: 'openapi-3.0', target: 'openapi-3.1' },
  down30: { id: 'openapi-3.1-to-3.0', source: 'openapi-3.1', target: 'openapi-3.0' },
  down20: { id: 'openapi-3-to-swagger-2', source: 'openapi-3.0', target: 'swagger-2.0' },
} as const satisfies Record<string, ConversionStep>;
export function routeConversion(source: SpecFamily, target: SpecFamily): ConversionStep[] {
  if (source === target) return [];
  if (source === 'swagger-2.0' && target === 'openapi-3.0') return [STEP.up20];
  if (source === 'swagger-2.0' && target === 'openapi-3.1') return [STEP.up20, STEP.up31];
  if (source === 'openapi-3.0' && target === 'openapi-3.1') return [STEP.up31];
  if (source === 'openapi-3.1' && target === 'openapi-3.0') return [STEP.down30];
  if (source === 'openapi-3.0' && target === 'swagger-2.0') return [STEP.down20];
  if (source === 'openapi-3.1' && target === 'swagger-2.0') return [STEP.down30, STEP.down20];
  throw new Error(`지원하지 않는 변환 경로: ${source} -> ${target}`);
}
```

- [ ] **Step 4: 의미 인벤토리와 조정 구현**

`src/lib/conversion/core/inventory.ts`는 의미 key와 원본 Pointer를 함께 수집한다.

```ts
import type { OpenApiDocument, SpecFamily } from '../../../domain/document';
import { escapePointerToken } from '../../navigation/json-pointer';

const METHODS = new Set(['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace']);
export interface InventoryEntry { key: string; pointer: string }
export interface DocumentInventory {
  operations: Map<string, InventoryEntry>;
  schemas: Map<string, InventoryEntry>;
  securitySchemes: Map<string, InventoryEntry>;
  servers: Map<string, InventoryEntry>;
  features: Map<string, InventoryEntry>;
}

function record(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function add(map: Map<string, InventoryEntry>, key: string, pointer: string): void {
  map.set(key, { key, pointer });
}

export function extractInventory(document: OpenApiDocument, family: SpecFamily): DocumentInventory {
  const inventory: DocumentInventory = {
    operations: new Map(), schemas: new Map(), securitySchemes: new Map(), servers: new Map(), features: new Map(),
  };
  for (const [path, pathItemValue] of Object.entries(record(document.paths))) {
    const pathItem = record(pathItemValue);
    for (const method of Object.keys(pathItem).filter((key) => METHODS.has(key))) {
      add(inventory.operations, `${method.toUpperCase()} ${path}`, `/paths/${escapePointerToken(path)}/${method}`);
    }
  }
  const schemaRoot = family === 'swagger-2.0' ? record(document.definitions) : record(record(document.components).schemas);
  const schemaBase = family === 'swagger-2.0' ? '/definitions' : '/components/schemas';
  for (const name of Object.keys(schemaRoot)) add(inventory.schemas, name, `${schemaBase}/${escapePointerToken(name)}`);
  const securityRoot = family === 'swagger-2.0' ? record(document.securityDefinitions) : record(record(document.components).securitySchemes);
  const securityBase = family === 'swagger-2.0' ? '/securityDefinitions' : '/components/securitySchemes';
  for (const name of Object.keys(securityRoot)) add(inventory.securitySchemes, name, `${securityBase}/${escapePointerToken(name)}`);
  if (family === 'swagger-2.0') {
    const host = typeof document.host === 'string' ? document.host : undefined;
    const basePath = typeof document.basePath === 'string' ? document.basePath : '';
    const schemes = Array.isArray(document.schemes) ? document.schemes.filter((item): item is string => typeof item === 'string') : [];
    schemes.forEach((scheme) => { if (host) add(inventory.servers, `${scheme}://${host}${basePath}`, '/host'); });
  } else {
    const servers = Array.isArray(document.servers) ? document.servers : [];
    servers.forEach((server, index) => {
      const url = record(server).url;
      if (typeof url === 'string') add(inventory.servers, url, `/servers/${index}`);
    });
  }
  const visited = new Set<object>();
  const visitFeatures = (value: unknown, pointer: string): void => {
    if (typeof value !== 'object' || value === null || visited.has(value)) return;
    visited.add(value);
    if (!Array.isArray(value)) {
      const object = value as Record<string, unknown>;
      const featureKeys = [
        ['callbacks', 'callbacks'], ['x-toolhub-original-callbacks', 'callbacks'],
        ['links', 'links'], ['x-toolhub-original-links', 'links'],
        ['webhooks', 'webhooks'], ['x-toolhub-original-webhooks', 'webhooks'],
      ] as const;
      for (const [field, semantic] of featureKeys) if (field in object) add(inventory.features, `${semantic}:${pointer}`, `${pointer}/${escapePointerToken(field)}`);
    }
    Object.entries(value).forEach(([key, child]) => visitFeatures(child, `${pointer}/${escapePointerToken(key)}`));
  };
  visitFeatures(document, '');
  return inventory;
}
```

`src/lib/conversion/core/reconcile.ts`는 대상에서 사라진 항목이 기존 `lossy: true` 진단으로 설명되지 않을 때 오류를 추가한다.

```ts
import type { Diagnostic } from '../../../domain/document';
import type { DocumentInventory, InventoryEntry } from './inventory';

function pointerRelated(left: string, right: string): boolean {
  return left === right || left.startsWith(`${right}/`) || right.startsWith(`${left}/`);
}

export function reconcileInventories(source: DocumentInventory, target: DocumentInventory, diagnostics: Diagnostic[]): Diagnostic[] {
  const missing: InventoryEntry[] = [];
  for (const category of ['operations', 'schemas', 'securitySchemes', 'servers', 'features'] as const) {
    for (const entry of source[category].values()) if (!target[category].has(entry.key)) missing.push(entry);
  }
  const unexplained = missing.filter((entry) => !diagnostics.some((diagnostic) =>
    diagnostic.lossy && pointerRelated(diagnostic.sourcePointer, entry.pointer),
  ));
  return [
    ...diagnostics,
    ...unexplained.map((entry): Diagnostic => ({
      id: `UNEXPLAINED_CONVERSION_CHANGE:${entry.pointer}`,
      code: 'UNEXPLAINED_CONVERSION_CHANGE',
      severity: 'error',
      stage: 'reconcile',
      message: `변환 결과에서 설명 없이 항목이 사라졌습니다: ${entry.key}`,
      sourcePointer: entry.pointer,
      lossy: true,
    })),
  ];
}
```

`inventory.test.ts`:

```ts
import { expect, it } from 'vitest';
import { extractInventory } from './inventory';

it('collects stable semantic keys and source pointers', () => {
  const inventory = extractInventory({
    openapi: '3.1.2', servers: [{ url: 'https://api.example.com/v1' }],
    paths: { '/pets': { get: { callbacks: { event: {} } } } },
    components: { schemas: { Pet: {} }, securitySchemes: { bearer: {} } },
  }, 'openapi-3.1');
  expect(inventory.operations.get('GET /pets')?.pointer).toBe('/paths/~1pets/get');
  expect(inventory.schemas.has('Pet')).toBe(true);
  expect(inventory.securitySchemes.has('bearer')).toBe(true);
  expect(inventory.servers.has('https://api.example.com/v1')).toBe(true);
  expect(inventory.features.has('callbacks:/paths/~1pets/get')).toBe(true);
});
```

`reconcile.test.ts`:

```ts
import { expect, it } from 'vitest';
import type { Diagnostic } from '../../../domain/document';
import { extractInventory } from './inventory';
import { reconcileInventories } from './reconcile';

const source = extractInventory({ openapi: '3.0.4', paths: { '/pets': { get: {} } }, components: { schemas: { Pet: {} } }, servers: [] }, 'openapi-3.0');

it('matches schemas by name across version-specific pointers', () => {
  const target = extractInventory({ swagger: '2.0', paths: { '/pets': { get: {} } }, definitions: { Pet: {} } }, 'swagger-2.0');
  expect(reconcileInventories(source, target, [])).toEqual([]);
});

it('accepts an explicitly explained loss and rejects an unexplained loss', () => {
  const target = extractInventory({ swagger: '2.0', paths: {}, definitions: { Pet: {} } }, 'swagger-2.0');
  const explanation: Diagnostic = { id: 'loss', code: 'OPERATION_NOT_SUPPORTED', severity: 'warning', stage: 'convert', message: 'operation 보존 불가', sourcePointer: '/paths/~1pets/get', lossy: true };
  expect(reconcileInventories(source, target, [explanation]).some(({ code }) => code === 'UNEXPLAINED_CONVERSION_CHANGE')).toBe(false);
  expect(reconcileInventories(source, target, []).some(({ code }) => code === 'UNEXPLAINED_CONVERSION_CHANGE')).toBe(true);
});
```

- [ ] **Step 5: 검증과 커밋**

```bash
npm run test -- src/lib/conversion/core
npm run lint
npm run typecheck
git add src/lib/conversion/core
git commit -m "feat(openapi-editor): define conversion routing and reconciliation"
```

Expected: 모든 명령 exit 0.

### Task 5: 브라우저 의존성 게이트와 Swagger 2.0 → OpenAPI 3.0

**Files:**
- Create: `openapi-editor/src/types/swagger2openapi.d.ts`
- Create: `openapi-editor/src/lib/conversion/up/swagger2-to-openapi30.ts`
- Create: `openapi-editor/src/lib/conversion/up/swagger2-to-openapi30.test.ts`
- Create: `openapi-editor/src/workers/dependency-smoke.ts`
- Create: `openapi-editor/vite.smoke.config.ts`
- Modify: `openapi-editor/.gitignore`
- Create: `openapi-editor/test/fixtures/swagger2/minimal.json`

**Interfaces:**
- Consumes: Task 4의 `ConverterAdapter`, `AdapterResult`.
- Produces: `swagger2ToOpenApi30Adapter`와 Vite Worker dependency build gate.

- [ ] **Step 1: 브라우저 번들 smoke entry 작성**

`src/workers/dependency-smoke.ts`:

```ts
import { validate } from '@scalar/openapi-parser';
import { Converter } from '@apiture/openapi-down-convert';
import swagger2openapi from 'swagger2openapi';

export const dependencySmoke = {
  validate,
  downConverter: Converter,
  swaggerConverter: swagger2openapi.convertObj,
};
```

`vite.smoke.config.ts`는 실제 Worker에 들어갈 세 라이브러리를 브라우저 ESM으로 번들하는 독립 gate다.

```ts
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: {
      entry: 'src/workers/dependency-smoke.ts',
      formats: ['es'],
      fileName: 'dependency-smoke',
    },
    outDir: 'dist-smoke',
    emptyOutDir: true,
  },
});
```

`.gitignore`에 `dist-smoke/`를 추가한다. gate를 통과한 뒤 Task 10에서 smoke entry와 전용 Vite 설정을 삭제하고 실제 Worker build로 같은 조건을 재검증한다.

- [ ] **Step 2: 변환 실패 테스트 작성**

`src/lib/conversion/up/swagger2-to-openapi30.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { swagger2ToOpenApi30Adapter } from './swagger2-to-openapi30';

describe('swagger2ToOpenApi30Adapter', () => {
  it('moves definitions and body parameters to OpenAPI 3', async () => {
    const source = {
      swagger: '2.0', info: { title: 'Pets', version: '1.0.0' }, host: 'api.example.com', basePath: '/v1', schemes: ['https'],
      paths: { '/pets': { post: { parameters: [{ in: 'body', name: 'pet', schema: { $ref: '#/definitions/Pet' } }], responses: { 201: { description: 'Created' } } } } },
      definitions: { Pet: { type: 'object', properties: { name: { type: 'string' } } } },
    };
    const result = await swagger2ToOpenApi30Adapter.convert(source);
    expect(result.document.openapi).toBe('3.0.4');
    expect(result.document).toHaveProperty('components.schemas.Pet');
    expect(result.document).toHaveProperty('paths./pets.post.requestBody');
    expect(source).toHaveProperty('swagger', '2.0');
  });
});
```

- [ ] **Step 3: 실패 확인**

```bash
npm run test -- src/lib/conversion/up/swagger2-to-openapi30.test.ts
```

Expected: adapter 부재로 FAIL.

- [ ] **Step 4: 타입 경계와 어댑터 구현**

`src/types/swagger2openapi.d.ts`:

```ts
declare module 'swagger2openapi' {
  interface ConvertOptions {
    openapi?: Record<string, unknown>;
    patch?: boolean;
    warnOnly?: boolean;
    warnProperty?: string;
    targetVersion?: string;
  }
  interface Swagger2OpenApi {
    convertObj(document: Record<string, unknown>, options: ConvertOptions): Promise<ConvertOptions>;
  }
  const converter: Swagger2OpenApi;
  export default converter;
}
```

`src/lib/conversion/up/swagger2-to-openapi30.ts`:

```ts
import swagger2openapi from 'swagger2openapi';
import type { Diagnostic, OpenApiDocument } from '../../../domain/document';
import type { ConverterAdapter } from '../core/types';

function collectWarnings(value: unknown, pointer = ''): Diagnostic[] {
  if (typeof value !== 'object' || value === null) return [];
  const record = value as Record<string, unknown>;
  const own = typeof record['x-toolhub-conversion-warning'] === 'string' ? [{
    id: `SWAGGER2OPENAPI_WARNING:${pointer}`, code: 'SWAGGER2OPENAPI_WARNING', severity: 'warning' as const,
    stage: 'convert' as const, message: record['x-toolhub-conversion-warning'], sourcePointer: pointer, lossy: false,
  }] : [];
  const nested = Object.entries(record).flatMap(([key, child]) => collectWarnings(child, `${pointer}/${key.replaceAll('~', '~0').replaceAll('/', '~1')}`));
  return [...own, ...nested];
}

export const swagger2ToOpenApi30Adapter: ConverterAdapter = {
  id: 'swagger-2-to-openapi-3.0',
  async convert(document: OpenApiDocument) {
    const options = await swagger2openapi.convertObj(structuredClone(document), {
      patch: false, warnOnly: true, warnProperty: 'x-toolhub-conversion-warning', targetVersion: '3.0.4',
    });
    if (!options.openapi) throw new Error('Swagger 2.0 변환 결과가 없습니다.');
    options.openapi.openapi = '3.0.4';
    return { document: options.openapi, diagnostics: collectWarnings(options.openapi) };
  },
};
```

- [ ] **Step 5: dependency gate와 테스트 실행**

```bash
npm run test -- src/lib/conversion/up/swagger2-to-openapi30.test.ts
npm run typecheck
npx vite build --config vite.smoke.config.ts
npm audit --audit-level=high
```

Expected: 변환 테스트, typecheck, `dist-smoke/dependency-smoke.js` 생성이 모두 성공하고 high 이상 취약점이 없음. Node 내장 모듈, `eval`, 동적 require 또는 Worker 비호환 오류가 나오면 해당 패키지 통합을 중단한다. 실패 로그·패키지 트리를 설계 문서의 의존성 게이트 결과로 기록하고, 실패한 라이브러리 어댑터만 자체 변환기로 교체하는 계획 변경을 사용자에게 보고한다.

- [ ] **Step 6: 커밋**

```bash
git add src/types src/lib/conversion/up src/workers/dependency-smoke.ts test/fixtures/swagger2 vite.smoke.config.ts .gitignore package.json package-lock.json
git commit -m "feat(openapi-editor): convert Swagger 2 to OpenAPI 3"
```

---

### Task 6: OpenAPI 3.0 → OpenAPI 3.1 승격

**Files:**
- Create: `openapi-editor/src/lib/conversion/core/schema-walker.ts`
- Create: `openapi-editor/src/lib/conversion/core/schema-walker.test.ts`
- Create: `openapi-editor/src/lib/conversion/up/openapi30-to-openapi31.ts`
- Create: `openapi-editor/src/lib/conversion/up/openapi30-to-openapi31.test.ts`

**Interfaces:**
- Consumes: Task 4의 어댑터 계약.
- Produces: `visitSchemaObjects(document, visitor)`와 `openApi30To31Adapter`.

- [ ] **Step 1: nullable·exclusive bound 실패 테스트 작성**

```ts
import { describe, expect, it } from 'vitest';
import { openApi30To31Adapter } from './openapi30-to-openapi31';

describe('openApi30To31Adapter', () => {
  it('upgrades nullable and exclusive bounds without touching source', async () => {
    const source = { openapi: '3.0.4', info: { title: 'API', version: '1' }, paths: {}, components: { schemas: { Score: { type: 'number', nullable: true, minimum: 0, exclusiveMinimum: true } } } };
    const result = await openApi30To31Adapter.convert(source);
    expect(result.document.openapi).toBe('3.1.2');
    expect(result.document).toHaveProperty('components.schemas.Score.type', ['number', 'null']);
    expect(result.document).toHaveProperty('components.schemas.Score.exclusiveMinimum', 0);
    expect(result.document).not.toHaveProperty('components.schemas.Score.nullable');
    expect(source).toHaveProperty('components.schemas.Score.nullable', true);
  });
});
```

- [ ] **Step 2: 실패 확인**

```bash
npm run test -- src/lib/conversion/up/openapi30-to-openapi31.test.ts
```

Expected: adapter 부재로 FAIL.

- [ ] **Step 3: Schema Object walker 구현**

`schema-walker.ts`는 root `components.schemas`, parameter/header `schema`, request/response `content.*.schema`에서 시작해 중첩 Schema Object를 재귀 순회한다.

```ts
import type { OpenApiDocument } from '../../../domain/document';
import { escapePointerToken } from '../../navigation/json-pointer';

export type SchemaVisitor = (schema: Record<string, unknown>, pointer: string) => void;
function object(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
}

export function visitSchemaObjects(document: OpenApiDocument, visitor: SchemaVisitor): void {
  const visitedSchemas = new Set<object>();
  const walkSchema = (value: unknown, pointer: string): void => {
    const schema = object(value);
    if (!schema || visitedSchemas.has(schema)) return;
    visitedSchemas.add(schema);
    visitor(schema, pointer);
    for (const keyword of ['properties', 'patternProperties', 'dependentSchemas', '$defs', 'definitions'] as const) {
      for (const [name, child] of Object.entries(object(schema[keyword]) ?? {})) {
        walkSchema(child, `${pointer}/${escapePointerToken(keyword)}/${escapePointerToken(name)}`);
      }
    }
    for (const keyword of ['items', 'additionalProperties', 'not', 'contains', 'propertyNames', 'if', 'then', 'else'] as const) {
      walkSchema(schema[keyword], `${pointer}/${escapePointerToken(keyword)}`);
    }
    for (const keyword of ['allOf', 'anyOf', 'oneOf', 'prefixItems'] as const) {
      const children = Array.isArray(schema[keyword]) ? schema[keyword] : [];
      children.forEach((child, index) => walkSchema(child, `${pointer}/${escapePointerToken(keyword)}/${index}`));
    }
  };

  for (const [name, schema] of Object.entries(object(object(document.components)?.schemas) ?? {})) {
    walkSchema(schema, `/components/schemas/${escapePointerToken(name)}`);
  }

  const visitedDocument = new Set<object>();
  const findInlineSchemas = (value: unknown, pointer: string): void => {
    if (typeof value !== 'object' || value === null || visitedDocument.has(value)) return;
    visitedDocument.add(value);
    if (!Array.isArray(value)) {
      for (const [key, child] of Object.entries(value)) {
        const childPointer = `${pointer}/${escapePointerToken(key)}`;
        if (key === 'schema') walkSchema(child, childPointer);
        else findInlineSchemas(child, childPointer);
      }
    } else {
      value.forEach((child, index) => findInlineSchemas(child, `${pointer}/${index}`));
    }
  };
  findInlineSchemas(document, '');
}
```

`schema-walker.test.ts`:

```ts
import { expect, it } from 'vitest';
import { visitSchemaObjects } from './schema-walker';

it('visits component, inline request, and nested array schemas once', () => {
  const pointers: string[] = [];
  visitSchemaObjects({
    openapi: '3.0.4',
    components: { schemas: { PetList: { type: 'array', items: { type: 'string' } } } },
    paths: { '/pets': { post: { requestBody: { content: { 'application/json': { schema: { type: 'object' } } } } } } },
  }, (_schema, pointer) => pointers.push(pointer));
  expect(pointers).toEqual(expect.arrayContaining([
    '/components/schemas/PetList', '/components/schemas/PetList/items',
    '/paths/~1pets/post/requestBody/content/application~1json/schema',
  ]));
  expect(new Set(pointers).size).toBe(pointers.length);
});
```

- [ ] **Step 4: 승격 어댑터 구현**

`src/lib/conversion/up/openapi30-to-openapi31.ts`:

```ts
import type { OpenApiDocument } from '../../../domain/document';
import type { ConverterAdapter } from '../core/types';
import { visitSchemaObjects } from '../core/schema-walker';

function addNull(type: unknown): unknown {
  if (typeof type === 'string') return type === 'null' ? type : [type, 'null'];
  if (Array.isArray(type)) return type.includes('null') ? type : [...type, 'null'];
  return type;
}

export const openApi30To31Adapter: ConverterAdapter = {
  id: 'openapi-3.0-to-3.1',
  async convert(document: OpenApiDocument) {
    const output = structuredClone(document);
    output.openapi = '3.1.2';
    visitSchemaObjects(output, (schema) => {
      if (schema.nullable === true) { schema.type = addNull(schema.type); delete schema.nullable; }
      if (schema.exclusiveMinimum === true && typeof schema.minimum === 'number') { schema.exclusiveMinimum = schema.minimum; delete schema.minimum; }
      else if (schema.exclusiveMinimum === false) delete schema.exclusiveMinimum;
      if (schema.exclusiveMaximum === true && typeof schema.maximum === 'number') { schema.exclusiveMaximum = schema.maximum; delete schema.maximum; }
      else if (schema.exclusiveMaximum === false) delete schema.exclusiveMaximum;
    });
    return { document: output, diagnostics: [] };
  },
};
```

- [ ] **Step 5: 검증과 커밋**

```bash
npm run test -- src/lib/conversion/core/schema-walker.test.ts src/lib/conversion/up/openapi30-to-openapi31.test.ts
npm run lint
npm run typecheck
git add src/lib/conversion/core/schema-walker.ts src/lib/conversion/core/schema-walker.test.ts src/lib/conversion/up/openapi30-to-openapi31.ts src/lib/conversion/up/openapi30-to-openapi31.test.ts
git commit -m "feat(openapi-editor): upgrade OpenAPI 3.0 schemas"
```

---

### Task 7: OpenAPI 3.1 → OpenAPI 3.0 하향 변환과 손실 보존

**Files:**
- Create: `openapi-editor/src/types/openapi-down-convert.d.ts`
- Create: `openapi-editor/src/lib/conversion/down/openapi31-to-openapi30.ts`
- Create: `openapi-editor/src/lib/conversion/down/openapi31-to-openapi30.test.ts`
- Create: `openapi-editor/test/fixtures/openapi31/lossy.yaml`

**Interfaces:**
- Consumes: Task 6의 schema walker.
- Produces: `openApi31To30Adapter`, `x-toolhub-original-<keyword>` 보존 규칙.

- [ ] **Step 1: 손실 경고 실패 테스트 작성**

```ts
import { describe, expect, it } from 'vitest';
import { openApi31To30Adapter } from './openapi31-to-openapi30';

describe('openApi31To30Adapter', () => {
  it('down-converts nullable unions and preserves unsupported keywords', async () => {
    const source = { openapi: '3.1.2', info: { title: 'API', version: '1' }, paths: {}, webhooks: { event: {} }, components: { schemas: { Pet: { type: ['string', 'null'], const: 'cat', unevaluatedProperties: false } } } };
    const result = await openApi31To30Adapter.convert(source);
    expect(result.document.openapi).toBe('3.0.4');
    expect(result.document).toHaveProperty('components.schemas.Pet.type', 'string');
    expect(result.document).toHaveProperty('components.schemas.Pet.nullable', true);
    expect(result.document).toHaveProperty('components.schemas.Pet.enum', ['cat']);
    expect(result.document).toHaveProperty('components.schemas.Pet.x-toolhub-original-unevaluatedProperties', false);
    expect(result.document).toHaveProperty('x-toolhub-original-webhooks');
    expect(result.diagnostics.every((item) => item.lossy)).toBe(true);
  });
});
```

- [ ] **Step 2: 실패 확인**

```bash
npm run test -- src/lib/conversion/down/openapi31-to-openapi30.test.ts
```

Expected: adapter 부재로 FAIL.

- [ ] **Step 3: 패키지 타입 경계와 어댑터 구현**

`src/types/openapi-down-convert.d.ts`:

```ts
declare module '@apiture/openapi-down-convert' {
  export class Converter {
    constructor(document: Record<string, unknown>, options?: { verbose?: boolean; deleteExampleWithId?: boolean; allOfTransform?: boolean });
    convert(): Record<string, unknown>;
  }
}
```

`openapi31-to-openapi30.ts`는 라이브러리 호출 전에 손실 가능 keyword를 extension으로 보존한다.

```ts
import { Converter } from '@apiture/openapi-down-convert';
import type { Diagnostic, OpenApiDocument } from '../../../domain/document';
import { visitSchemaObjects } from '../core/schema-walker';
import type { ConverterAdapter } from '../core/types';

const UNSUPPORTED_SCHEMA_KEYS = ['$schema', '$id', '$anchor', 'unevaluatedProperties', 'unevaluatedItems', 'contentEncoding', 'contentMediaType', 'prefixItems'] as const;

function warning(code: string, pointer: string, message: string): Diagnostic {
  return { id: `${code}:${pointer}`, code, severity: 'warning', stage: 'convert', message, sourcePointer: pointer, lossy: true };
}

export const openApi31To30Adapter: ConverterAdapter = {
  id: 'openapi-3.1-to-3.0',
  async convert(document: OpenApiDocument) {
    const prepared = structuredClone(document);
    const diagnostics: Diagnostic[] = [];
    visitSchemaObjects(prepared, (schema, pointer) => {
      if (Array.isArray(schema.type)) {
        const nonNull = schema.type.filter((type) => type !== 'null');
        if (nonNull.length === 1) {
          schema.type = nonNull[0];
          if (nonNull.length !== schema.type.length) schema.nullable = true;
        } else {
          schema['x-toolhub-original-type'] = schema.type;
          delete schema.type;
          diagnostics.push(warning('UNREPRESENTABLE_TYPE_UNION', `${pointer}/type`, 'OpenAPI 3.0에서 여러 비-null type union을 표현할 수 없어 확장에 보존했습니다.'));
        }
      }
      if ('const' in schema) {
        schema.enum = [schema.const];
        delete schema.const;
      }
      if (typeof schema.exclusiveMinimum === 'number') {
        schema.minimum = schema.exclusiveMinimum;
        schema.exclusiveMinimum = true;
      }
      if (typeof schema.exclusiveMaximum === 'number') {
        schema.maximum = schema.exclusiveMaximum;
        schema.exclusiveMaximum = true;
      }
      for (const key of UNSUPPORTED_SCHEMA_KEYS) {
        if (!(key in schema)) continue;
        const extension = `x-toolhub-original-${key.replace(/^\$/, '')}`;
        schema[extension] = schema[key];
        delete schema[key];
        diagnostics.push(warning('OAS31_KEYWORD_PRESERVED_AS_EXTENSION', `${pointer}/${key}`, `${key}를 OpenAPI 3.0 extension으로 보존했습니다.`));
      }
    });
    if ('webhooks' in prepared) {
      prepared['x-toolhub-original-webhooks'] = prepared.webhooks;
      delete prepared.webhooks;
      diagnostics.push(warning('WEBHOOKS_NOT_SUPPORTED_IN_OAS30', '/webhooks', 'webhooks를 OpenAPI 3.0 extension으로 보존했습니다.'));
    }
    const output = new Converter(prepared, { verbose: false, deleteExampleWithId: false, allOfTransform: false }).convert();
    output.openapi = '3.0.4';
    return { document: output, diagnostics };
  },
};
```

같은 테스트 파일에 다음 경계 테스트를 추가한다.

```ts
it('preserves unions, schema dialect, numeric bounds, and webhooks with exact pointers', async () => {
  const result = await openApi31To30Adapter.convert({
    openapi: '3.1.2', info: { title: 'API', version: '1' }, paths: {}, webhooks: { event: {} },
    components: { schemas: { Value: { type: ['string', 'number', 'null'], $schema: 'https://json-schema.org/draft/2020-12/schema', exclusiveMinimum: 0 } } },
  });
  expect(result.document).toHaveProperty('components.schemas.Value.x-toolhub-original-type');
  expect(result.document).toHaveProperty('components.schemas.Value.x-toolhub-original-schema');
  expect(result.document).toHaveProperty('components.schemas.Value.minimum', 0);
  expect(result.document).toHaveProperty('components.schemas.Value.exclusiveMinimum', true);
  expect(result.document).toHaveProperty('x-toolhub-original-webhooks');
  expect(result.diagnostics).toEqual(expect.arrayContaining([
    expect.objectContaining({ code: 'UNREPRESENTABLE_TYPE_UNION', sourcePointer: '/components/schemas/Value/type', lossy: true }),
    expect.objectContaining({ code: 'OAS31_KEYWORD_PRESERVED_AS_EXTENSION', sourcePointer: '/components/schemas/Value/$schema', lossy: true }),
    expect.objectContaining({ code: 'WEBHOOKS_NOT_SUPPORTED_IN_OAS30', sourcePointer: '/webhooks', lossy: true }),
  ]));
});
```

- [ ] **Step 4: 검증과 커밋**

```bash
npm run test -- src/lib/conversion/down/openapi31-to-openapi30.test.ts
npm run lint
npm run typecheck
npm run build
git add src/types/openapi-down-convert.d.ts src/lib/conversion/down/openapi31-to-openapi30.ts src/lib/conversion/down/openapi31-to-openapi30.test.ts test/fixtures/openapi31/lossy.yaml
git commit -m "feat(openapi-editor): down-convert OpenAPI 3.1 schemas"
```

Expected: 모든 명령 exit 0.

---

### Task 8: OpenAPI 3.x → Swagger 2.0 서버·컴포넌트·스키마 변환

**Files:**
- Create: `openapi-editor/src/lib/conversion/down/swagger2/server.ts`
- Create: `openapi-editor/src/lib/conversion/down/swagger2/server.test.ts`
- Create: `openapi-editor/src/lib/conversion/down/swagger2/schema.ts`
- Create: `openapi-editor/src/lib/conversion/down/swagger2/schema.test.ts`
- Create: `openapi-editor/src/lib/conversion/down/swagger2/components.ts`
- Create: `openapi-editor/src/lib/conversion/down/swagger2/components.test.ts`
- Create: `openapi-editor/src/lib/conversion/down/swagger2/warning.ts`

**Interfaces:**
- Consumes: Task 4의 Diagnostic·inventory 규칙.
- Produces: `convertServers`, `convertSchema`, `convertComponents`, 공통 `lossWarning`.

- [ ] **Step 1: 서버·스키마 실패 테스트 작성**

```ts
import { describe, expect, it } from 'vitest';
import { convertServers } from './server';
import { convertSchema } from './schema';

describe('Swagger 2 helpers', () => {
  it('maps the first server and warns for additional servers', () => {
    const result = convertServers([{ url: 'https://api.example.com/v1' }, { url: 'https://backup.example.com/v1' }]);
    expect(result.value).toMatchObject({ schemes: ['https'], host: 'api.example.com', basePath: '/v1' });
    expect(result.extensions).toHaveProperty('x-toolhub-original-servers');
    expect(result.diagnostics[0]?.code).toBe('MULTIPLE_SERVERS_COLLAPSED');
  });
  it('preserves oneOf as an extension', () => {
    const result = convertSchema({ oneOf: [{ type: 'string' }, { type: 'number' }], nullable: true }, '/components/schemas/Value');
    expect(result.value).toHaveProperty('x-toolhub-original-oneOf');
    expect(result.value).toHaveProperty('x-nullable', true);
  });
});
```

- [ ] **Step 2: 실패 확인**

```bash
npm run test -- src/lib/conversion/down/swagger2
```

Expected: helper 모듈 부재로 FAIL.

- [ ] **Step 3: 공통 손실 경고와 서버 변환 구현**

`warning.ts`:

```ts
import type { Diagnostic } from '../../../../domain/document';
export function lossWarning(code: string, pointer: string, message: string, action: string): Diagnostic {
  return { id: `${code}:${pointer}`, code, severity: 'warning', stage: 'convert', message, sourcePointer: pointer, action, lossy: true };
}
```

`server.ts`는 다음 계약을 구현한다.

```ts
import type { Diagnostic, OpenApiDocument } from '../../../../domain/document';
import { lossWarning } from './warning';

export interface ServerConversion {
  value: { schemes?: string[]; host?: string; basePath?: string };
  extensions: OpenApiDocument;
  diagnostics: Diagnostic[];
}
export function convertServers(servers: unknown): ServerConversion {
  const list = Array.isArray(servers) ? servers : [];
  if (list.length === 0) return { value: {}, extensions: {}, diagnostics: [] };
  const first = typeof list[0] === 'object' && list[0] !== null ? list[0] as OpenApiDocument : {};
  const url = typeof first.url === 'string' ? first.url : '';
  const extensions: OpenApiDocument = {};
  const diagnostics: Diagnostic[] = [];
  if (list.length > 1) {
    extensions['x-toolhub-original-servers'] = structuredClone(list);
    diagnostics.push(lossWarning('MULTIPLE_SERVERS_COLLAPSED', '/servers/1', 'Swagger 2.0은 operation별 다중 server를 표현하지 못합니다.', '첫 server를 사용하고 전체 목록을 extension으로 보존'));
  }
  if (!url || url.includes('{')) {
    extensions['x-toolhub-original-servers'] = structuredClone(list);
    diagnostics.push(lossWarning('SERVER_URL_NOT_REPRESENTABLE', '/servers/0/url', '상대 URL 또는 server variable을 Swagger 2.0 host로 변환할 수 없습니다.', 'server 목록을 extension으로 보존'));
    return { value: {}, extensions, diagnostics };
  }
  try {
    const parsed = new URL(url);
    if (parsed.search || parsed.hash) {
      extensions['x-toolhub-original-servers'] = structuredClone(list);
      diagnostics.push(lossWarning('SERVER_URL_NOT_REPRESENTABLE', '/servers/0/url', 'query 또는 fragment가 있는 server URL은 Swagger 2.0에서 손실됩니다.', 'server 목록을 extension으로 보존'));
    }
    return {
      value: { schemes: [parsed.protocol.slice(0, -1)], host: parsed.host, basePath: parsed.pathname || '/' },
      extensions,
      diagnostics,
    };
  } catch {
    extensions['x-toolhub-original-servers'] = structuredClone(list);
    diagnostics.push(lossWarning('SERVER_URL_NOT_REPRESENTABLE', '/servers/0/url', '절대 server URL이 아닙니다.', 'server 목록을 extension으로 보존'));
    return { value: {}, extensions, diagnostics };
  }
}
```

- [ ] **Step 4: 스키마와 컴포넌트 변환 구현**

`schema.ts` 계약:

```ts
import type { Diagnostic, OpenApiDocument } from '../../../../domain/document';
import { escapePointerToken } from '../../../navigation/json-pointer';
import { lossWarning } from './warning';

export interface NodeConversion<T> { value: T; diagnostics: Diagnostic[]; extensions: OpenApiDocument }
const UNSUPPORTED = ['oneOf', 'anyOf', 'not', 'const', '$schema', '$id', '$anchor', 'unevaluatedProperties', 'unevaluatedItems', 'prefixItems'] as const;

function object(value: unknown): OpenApiDocument | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? value as OpenApiDocument : undefined;
}

export function convertSchema(schema: OpenApiDocument, pointer: string): NodeConversion<OpenApiDocument> {
  const value = structuredClone(schema);
  const diagnostics: Diagnostic[] = [];
  const visit = (node: OpenApiDocument, currentPointer: string): void => {
    if (typeof node.$ref === 'string' && node.$ref.startsWith('#/components/schemas/')) {
      node.$ref = node.$ref.replace('#/components/schemas/', '#/definitions/');
    }
    if (node.nullable === true) node['x-nullable'] = true;
    delete node.nullable;
    if (Array.isArray(node.type)) {
      node['x-toolhub-original-type'] = node.type;
      delete node.type;
      diagnostics.push(lossWarning('TYPE_UNION_NOT_SUPPORTED_IN_SWAGGER2', `${currentPointer}/type`, 'Swagger 2.0은 type 배열을 표현하지 못합니다.', '원본 type을 extension으로 보존'));
    }
    for (const key of UNSUPPORTED) {
      if (!(key in node)) continue;
      node[`x-toolhub-original-${key.replace(/^\$/, '')}`] = node[key];
      delete node[key];
      diagnostics.push(lossWarning('SCHEMA_KEYWORD_NOT_SUPPORTED_IN_SWAGGER2', `${currentPointer}/${escapePointerToken(key)}`, `${key}를 Swagger 2.0 extension으로 보존했습니다.`, '원본 keyword를 extension으로 보존'));
    }
    for (const [name, child] of Object.entries(object(node.properties) ?? {})) {
      const childObject = object(child);
      if (childObject) visit(childObject, `${currentPointer}/properties/${escapePointerToken(name)}`);
    }
    const items = object(node.items);
    if (items) visit(items, `${currentPointer}/items`);
    const additional = object(node.additionalProperties);
    if (additional) visit(additional, `${currentPointer}/additionalProperties`);
    const allOf = Array.isArray(node.allOf) ? node.allOf : [];
    allOf.forEach((child, index) => { const childObject = object(child); if (childObject) visit(childObject, `${currentPointer}/allOf/${index}`); });
  };
  visit(value, pointer);
  return { value, diagnostics, extensions: {} };
}
```

`components.ts`는 다음 계약을 구현한다.

```ts
import type { Diagnostic, OpenApiDocument } from '../../../../domain/document';
import { escapePointerToken } from '../../../navigation/json-pointer';
import { convertSchema } from './schema';
import { lossWarning } from './warning';

export interface ComponentsConversion { value: OpenApiDocument; diagnostics: Diagnostic[] }
function object(value: unknown): OpenApiDocument {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? value as OpenApiDocument : {};
}

function convertContainer(value: unknown, basePointer: string): { value: OpenApiDocument; diagnostics: Diagnostic[] } {
  const output: OpenApiDocument = {};
  const diagnostics: Diagnostic[] = [];
  for (const [name, item] of Object.entries(object(value))) {
    const clone = structuredClone(object(item));
    const schema = object(clone.schema);
    if (Object.keys(schema).length > 0) {
      const converted = convertSchema(schema, `${basePointer}/${escapePointerToken(name)}/schema`);
      clone.schema = converted.value;
      diagnostics.push(...converted.diagnostics);
    }
    output[name] = clone;
  }
  return { value: output, diagnostics };
}

function convertSecurityScheme(schemeValue: unknown, pointer: string): { value: OpenApiDocument; diagnostics: Diagnostic[] } {
  const scheme = structuredClone(object(schemeValue));
  if (scheme.type === 'http' && scheme.scheme === 'basic') return { value: { type: 'basic' }, diagnostics: [] };
  if (scheme.type === 'http' && scheme.scheme === 'bearer') {
    return {
      value: { type: 'apiKey', name: 'Authorization', in: 'header', 'x-toolhub-original-http-scheme': 'bearer', 'x-toolhub-original-security-scheme': scheme },
      diagnostics: [lossWarning('BEARER_AUTH_NOT_SUPPORTED_IN_SWAGGER2', pointer, 'bearer 인증을 Swagger 2.0 apiKey 형태로 근사했습니다.', '원본 security scheme을 extension으로 보존')],
    };
  }
  if (scheme.type === 'apiKey') return { value: scheme, diagnostics: [] };
  if (scheme.type === 'oauth2') {
    const flows = object(scheme.flows);
    const candidates = [
      ['implicit', 'implicit'], ['authorizationCode', 'accessCode'], ['password', 'password'], ['clientCredentials', 'application'],
    ] as const;
    const selected = candidates.find(([name]) => name in flows);
    if (selected) {
      const flow = object(flows[selected[0]]);
      const diagnostics = candidates.filter(([name]) => name in flows).length > 1
        ? [lossWarning('MULTIPLE_OAUTH_FLOWS_COLLAPSED', `${pointer}/flows`, 'Swagger 2.0은 한 security scheme에서 하나의 OAuth flow만 표현합니다.', `첫 flow ${selected[0]} 사용`)]
        : [];
      return { value: { type: 'oauth2', flow: selected[1], authorizationUrl: flow.authorizationUrl, tokenUrl: flow.tokenUrl, scopes: flow.scopes ?? {} }, diagnostics };
    }
  }
  return {
    value: { type: 'apiKey', name: 'Authorization', in: 'header', 'x-toolhub-original-security-scheme': scheme },
    diagnostics: [lossWarning('SECURITY_SCHEME_NOT_SUPPORTED_IN_SWAGGER2', pointer, 'security scheme을 Swagger 2.0에서 직접 표현할 수 없습니다.', '원본 security scheme을 extension으로 보존')],
  };
}

export function convertComponents(components: unknown): ComponentsConversion {
  const source = object(components);
  const value: OpenApiDocument = {};
  const diagnostics: Diagnostic[] = [];
  const definitions: OpenApiDocument = {};
  for (const [name, schema] of Object.entries(object(source.schemas))) {
    const converted = convertSchema(object(schema), `/components/schemas/${escapePointerToken(name)}`);
    definitions[name] = converted.value;
    diagnostics.push(...converted.diagnostics);
  }
  if (Object.keys(definitions).length > 0) value.definitions = definitions;
  for (const [sourceKey, targetKey] of [['parameters', 'parameters'], ['responses', 'responses']] as const) {
    const converted = convertContainer(source[sourceKey], `/components/${sourceKey}`);
    if (Object.keys(converted.value).length > 0) value[targetKey] = converted.value;
    diagnostics.push(...converted.diagnostics);
  }
  const securityDefinitions: OpenApiDocument = {};
  for (const [name, scheme] of Object.entries(object(source.securitySchemes))) {
    const converted = convertSecurityScheme(scheme, `/components/securitySchemes/${escapePointerToken(name)}`);
    securityDefinitions[name] = converted.value;
    diagnostics.push(...converted.diagnostics);
  }
  if (Object.keys(securityDefinitions).length > 0) value.securityDefinitions = securityDefinitions;
  return { value, diagnostics };
}
```

`components.test.ts`:

```ts
import { expect, it } from 'vitest';
import { convertComponents } from './components';

it('moves reusable components and maps security schemes with warnings', () => {
  const result = convertComponents({
    schemas: { Pet: { type: 'object' } },
    parameters: { Limit: { in: 'query', name: 'limit', schema: { type: 'integer' } } },
    responses: { NotFound: { description: 'Not found' } },
    securitySchemes: {
      basic: { type: 'http', scheme: 'basic' },
      bearer: { type: 'http', scheme: 'bearer' },
      oauth: { type: 'oauth2', flows: { implicit: { authorizationUrl: 'https://auth.example.com', scopes: {} }, clientCredentials: { tokenUrl: 'https://auth.example.com/token', scopes: {} } } },
      oidc: { type: 'openIdConnect', openIdConnectUrl: 'https://auth.example.com/.well-known/openid-configuration' },
    },
  });
  expect(result.value).toHaveProperty('definitions.Pet');
  expect(result.value).toHaveProperty('parameters.Limit');
  expect(result.value).toHaveProperty('responses.NotFound');
  expect(result.value).toHaveProperty('securityDefinitions.basic.type', 'basic');
  expect(result.value).toHaveProperty('securityDefinitions.bearer.type', 'apiKey');
  expect(result.value).toHaveProperty('securityDefinitions.oauth.flow', 'implicit');
  expect(result.value).toHaveProperty('securityDefinitions.oidc.x-toolhub-original-security-scheme');
  expect(result.diagnostics.map(({ code }) => code)).toEqual(expect.arrayContaining([
    'BEARER_AUTH_NOT_SUPPORTED_IN_SWAGGER2', 'MULTIPLE_OAUTH_FLOWS_COLLAPSED', 'SECURITY_SCHEME_NOT_SUPPORTED_IN_SWAGGER2',
  ]));
});
```

- [ ] **Step 5: 검증과 커밋**

```bash
npm run test -- src/lib/conversion/down/swagger2
npm run lint
npm run typecheck
git add src/lib/conversion/down/swagger2
git commit -m "feat(openapi-editor): map OpenAPI schemas to Swagger 2"
```

Expected: 모든 명령 exit 0.

---

### Task 9: OpenAPI 3.x → Swagger 2.0 operation 변환과 전체 어댑터

**Files:**
- Create: `openapi-editor/src/lib/conversion/down/swagger2/operation.ts`
- Create: `openapi-editor/src/lib/conversion/down/swagger2/operation.test.ts`
- Create: `openapi-editor/src/lib/conversion/down/openapi3-to-swagger2.ts`
- Create: `openapi-editor/src/lib/conversion/down/openapi3-to-swagger2.test.ts`
- Create: `openapi-editor/test/fixtures/conversions/openapi30-to-swagger2/input.yaml`
- Create: `openapi-editor/test/fixtures/conversions/openapi30-to-swagger2/expected.json`
- Create: `openapi-editor/test/fixtures/conversions/openapi30-to-swagger2/diagnostics.json`

**Interfaces:**
- Consumes: Task 8의 server/schema/components helper.
- Produces: `convertOperation`, `openApi3ToSwagger2Adapter`.

- [ ] **Step 1: request·response 손실 실패 테스트 작성**

```ts
import { describe, expect, it } from 'vitest';
import { convertOperation } from './operation';

describe('convertOperation', () => {
  it('maps requestBody and chooses the first media type with a warning', () => {
    const operation = {
      requestBody: { required: true, content: {
        'application/json': { schema: { type: 'object' } },
        'application/xml': { schema: { type: 'object' } },
      } },
      responses: { 200: { description: 'OK', content: { 'application/json': { schema: { type: 'object' } } } } },
    };
    const result = convertOperation(operation, '/paths/~1pets/post');
    expect(result.value.parameters).toEqual([expect.objectContaining({ in: 'body', required: true })]);
    expect(result.value.consumes).toEqual(['application/json']);
    expect(result.value.produces).toEqual(['application/json']);
    expect(result.diagnostics.map((item) => item.code)).toContain('MULTIPLE_MEDIA_TYPES_COLLAPSED');
  });

  it('preserves callbacks and links as extensions', () => {
    const result = convertOperation({ callbacks: { event: {} }, responses: { 200: { description: 'OK', links: { next: {} } } } }, '/paths/~1pets/get');
    expect(result.value).toHaveProperty('x-toolhub-original-callbacks');
    expect(result.value).toHaveProperty('responses.200.x-toolhub-original-links');
  });
});
```

- [ ] **Step 2: 실패 확인**

```bash
npm run test -- src/lib/conversion/down/swagger2/operation.test.ts
```

Expected: operation converter 부재로 FAIL.

- [ ] **Step 3: operation converter 구현**

`operation.ts` 계약:

```ts
import type { Diagnostic, OpenApiDocument } from '../../../../domain/document';
import { escapePointerToken } from '../../../navigation/json-pointer';
import { convertSchema } from './schema';
import { lossWarning } from './warning';

export interface OperationConversion { value: OpenApiDocument; diagnostics: Diagnostic[] }
function object(value: unknown): OpenApiDocument {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? value as OpenApiDocument : {};
}

function rewriteComponentRef(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(rewriteComponentRef);
  if (typeof value !== 'object' || value === null) return value;
  const result = Object.fromEntries(Object.entries(value).map(([key, child]) => [key, rewriteComponentRef(child)]));
  if (typeof result.$ref === 'string') {
    result.$ref = result.$ref
      .replace('#/components/parameters/', '#/parameters/')
      .replace('#/components/responses/', '#/responses/')
      .replace('#/components/schemas/', '#/definitions/');
  }
  return result;
}

export function convertOperation(operation: OpenApiDocument, pointer: string): OperationConversion {
  const value = rewriteComponentRef(structuredClone(operation)) as OpenApiDocument;
  const diagnostics: Diagnostic[] = [];
  const parameters = Array.isArray(value.parameters) ? value.parameters : [];
  const supportedParameters: unknown[] = [];
  const cookieParameters: unknown[] = [];
  for (const [index, parameter] of parameters.entries()) {
    const parameterObject = object(parameter);
    if (parameterObject.in === 'cookie') {
      cookieParameters.push(parameter);
    } else if (Object.keys(object(parameterObject.schema)).length > 0) {
      const converted = convertSchema(object(parameterObject.schema), `${pointer}/parameters/${index}/schema`);
      const { schema: _schema, ...rest } = parameterObject;
      supportedParameters.push({ ...rest, ...converted.value });
      diagnostics.push(...converted.diagnostics);
    } else {
      supportedParameters.push(parameter);
    }
  }
  if (cookieParameters.length > 0) {
    value['x-toolhub-original-cookie-parameters'] = cookieParameters;
    diagnostics.push(lossWarning('COOKIE_PARAMETER_NOT_SUPPORTED', `${pointer}/parameters`, 'Swagger 2.0은 cookie parameter를 지원하지 않습니다.', '원본 parameter를 extension으로 보존'));
  }
  const requestBody = object(value.requestBody);
  const requestContent = object(requestBody.content);
  const requestMedia = Object.entries(requestContent);
  if (requestMedia.length > 0) {
    const [mediaType, media] = requestMedia[0]!;
    const converted = convertSchema(object(object(media).schema), `${pointer}/requestBody/content/${escapePointerToken(mediaType)}/schema`);
    supportedParameters.push({ in: 'body', name: 'body', required: requestBody.required === true, schema: converted.value });
    value.consumes = [mediaType];
    diagnostics.push(...converted.diagnostics);
    if (requestMedia.length > 1) {
      value['x-toolhub-original-request-content'] = requestContent;
      diagnostics.push(lossWarning('MULTIPLE_MEDIA_TYPES_COLLAPSED', `${pointer}/requestBody/content`, 'Swagger 2.0 operation은 request media type별 schema를 분리해 표현하지 못합니다.', `첫 media type ${mediaType} 사용`));
    }
  }
  if (supportedParameters.length > 0) value.parameters = supportedParameters; else delete value.parameters;
  delete value.requestBody;

  const responses: OpenApiDocument = {};
  const produces = new Set<string>();
  for (const [status, responseValue] of Object.entries(object(value.responses))) {
    const response = object(responseValue);
    const convertedResponse: OpenApiDocument = Object.fromEntries(Object.entries(response).filter(([key]) => key !== 'content' && key !== 'links'));
    const media = Object.entries(object(response.content));
    if (media.length > 0) {
      const [mediaType, mediaValue] = media[0]!;
      produces.add(mediaType);
      const mediaObject = object(mediaValue);
      const converted = convertSchema(object(mediaObject.schema), `${pointer}/responses/${escapePointerToken(status)}/content/${escapePointerToken(mediaType)}/schema`);
      if (Object.keys(converted.value).length > 0) convertedResponse.schema = converted.value;
      if ('example' in mediaObject) convertedResponse.examples = { [mediaType]: mediaObject.example };
      diagnostics.push(...converted.diagnostics);
      if (media.length > 1) diagnostics.push(lossWarning('MULTIPLE_MEDIA_TYPES_COLLAPSED', `${pointer}/responses/${escapePointerToken(status)}/content`, 'Swagger 2.0 response는 media type별 schema를 분리해 표현하지 못합니다.', `첫 media type ${mediaType} 사용`));
    }
    if ('links' in response) {
      convertedResponse['x-toolhub-original-links'] = response.links;
      diagnostics.push(lossWarning('LINKS_NOT_SUPPORTED', `${pointer}/responses/${escapePointerToken(status)}/links`, 'Swagger 2.0은 response links를 지원하지 않습니다.', '원본 links를 extension으로 보존'));
    }
    responses[status] = convertedResponse;
  }
  value.responses = responses;
  if (produces.size > 0) value.produces = [...produces];
  if ('callbacks' in value) {
    value['x-toolhub-original-callbacks'] = value.callbacks;
    delete value.callbacks;
    diagnostics.push(lossWarning('CALLBACKS_NOT_SUPPORTED', `${pointer}/callbacks`, 'Swagger 2.0은 callbacks를 지원하지 않습니다.', '원본 callbacks를 extension으로 보존'));
  }
  return { value, diagnostics };
}
```

같은 테스트 파일에 다음 경계 테스트를 추가한다.

```ts
it('keeps supported parameters, preserves cookies, examples, and rewrites refs', () => {
  const result = convertOperation({
    parameters: [
      { in: 'query', name: 'q', schema: { type: 'string' } },
      { in: 'cookie', name: 'session', schema: { type: 'string' } },
    ],
    requestBody: { content: { 'application/json': { schema: { $ref: '#/components/schemas/Pet' } } } },
    responses: { 200: { description: 'OK', content: { 'application/json': { schema: { $ref: '#/components/schemas/Pet' }, example: { name: 'Milo' } } } } },
  }, '/paths/~1pets/post');
  expect(result.value).toHaveProperty('parameters.0.name', 'q');
  expect(result.value).toHaveProperty('parameters.1.schema.$ref', '#/definitions/Pet');
  expect(result.value).toHaveProperty('x-toolhub-original-cookie-parameters.0.name', 'session');
  expect(result.value).toHaveProperty('responses.200.schema.$ref', '#/definitions/Pet');
  expect(result.value).toHaveProperty('responses.200.examples.application/json.name', 'Milo');
  expect(result.diagnostics).toContainEqual(expect.objectContaining({ code: 'COOKIE_PARAMETER_NOT_SUPPORTED' }));
});
```

- [ ] **Step 4: 전체 어댑터 실패 테스트와 구현**

`openapi3-to-swagger2.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { openApi3ToSwagger2Adapter } from './openapi3-to-swagger2';

describe('openApi3ToSwagger2Adapter', () => {
  it('creates a Swagger 2 document and preserves source operations', async () => {
    const source = { openapi: '3.0.4', info: { title: 'Pets', version: '1' }, servers: [{ url: 'https://api.example.com/v1' }], paths: { '/pets': { get: { responses: { 200: { description: 'OK' } } } } }, components: { schemas: { Pet: { type: 'object' } } } };
    const result = await openApi3ToSwagger2Adapter.convert(source);
    expect(result.document).toMatchObject({ swagger: '2.0', host: 'api.example.com', basePath: '/v1' });
    expect(result.document).toHaveProperty('paths./pets.get');
    expect(result.document).toHaveProperty('definitions.Pet');
  });
});
```

`openapi3-to-swagger2.ts`는 `swagger`, `info`, 변환된 server, paths, components, tags, externalDocs, security와 원본 `x-*`를 조립한다. HTTP method만 `convertOperation`에 전달하고 path-level parameters도 변환한다. 출력 루트에 `openapi`, `components`, `servers`를 남기지 않는다.

```ts
import type { Diagnostic, OpenApiDocument } from '../../../domain/document';
import type { ConverterAdapter } from '../core/types';
import { convertComponents } from './swagger2/components';
import { convertOperation } from './swagger2/operation';
import { convertServers } from './swagger2/server';

function object(value: unknown): OpenApiDocument {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? value as OpenApiDocument : {};
}

function copyVendorExtensions(document: OpenApiDocument): OpenApiDocument {
  return Object.fromEntries(Object.entries(document).filter(([key]) => key.startsWith('x-')));
}

function convertPaths(pathsValue: unknown) {
  const value: OpenApiDocument = {};
  const diagnostics: Diagnostic[] = [];
  const methods = new Set(['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace']);
  for (const [path, pathItemValue] of Object.entries(object(pathsValue))) {
    const pathItem = object(pathItemValue);
    const convertedPath: OpenApiDocument = {};
    if (Array.isArray(pathItem.parameters)) {
      const converted = convertOperation({ parameters: pathItem.parameters, responses: {} }, `/paths/${path.replaceAll('~', '~0').replaceAll('/', '~1')}`);
      if (converted.value.parameters) convertedPath.parameters = converted.value.parameters;
      if (converted.value['x-toolhub-original-cookie-parameters']) convertedPath['x-toolhub-original-cookie-parameters'] = converted.value['x-toolhub-original-cookie-parameters'];
      diagnostics.push(...converted.diagnostics);
    }
    for (const [key, child] of Object.entries(pathItem)) {
      if (methods.has(key)) {
        const converted = convertOperation(object(child), `/paths/${path.replaceAll('~', '~0').replaceAll('/', '~1')}/${key}`);
        convertedPath[key] = converted.value;
        diagnostics.push(...converted.diagnostics);
      } else if (key !== 'parameters' && key.startsWith('x-')) convertedPath[key] = child;
      else if (key !== 'parameters' && !methods.has(key)) convertedPath['x-toolhub-original-path-item'] = { ...object(convertedPath['x-toolhub-original-path-item']), [key]: child };
    }
    value[path] = convertedPath;
  }
  return { value, diagnostics };
}

async function buildSwagger2Document(document: Record<string, unknown>) {
  const server = convertServers(document.servers);
  const components = convertComponents(document.components);
  const paths = convertPaths(document.paths);
  return {
    document: {
      swagger: '2.0',
      info: document.info,
      ...server.value,
      ...server.extensions,
      paths: paths.value,
      ...components.value,
      ...(document.tags ? { tags: document.tags } : {}),
      ...(document.externalDocs ? { externalDocs: document.externalDocs } : {}),
      ...(document.security ? { security: document.security } : {}),
      ...copyVendorExtensions(document),
    },
    diagnostics: [...server.diagnostics, ...components.diagnostics, ...paths.diagnostics],
  };
}

export const openApi3ToSwagger2Adapter: ConverterAdapter = {
  id: 'openapi-3-to-swagger-2',
  convert: buildSwagger2Document,
};
```

위 코드의 `convertServers`, `convertComponents`, `convertPaths`, `copyVendorExtensions`는 Task 8 helper를 조합하는 같은 파일의 비공개 함수다. 각 함수는 `{ value, diagnostics }`를 반환하며 입력 객체를 변경하지 않는다. `convertPaths`는 HTTP method와 path-level parameters만 순회하고 알 수 없는 path item 필드는 `x-toolhub-original-path-item`에 보존한다.

- [ ] **Step 5: 골든 fixture와 변환 검증**

fixture input에는 multiple servers, JSON/XML request content, cookie parameter, callback, response link, nullable schema를 모두 넣는다. expected JSON에는 첫 server/media type 결과와 `x-toolhub-original-*`를, diagnostics JSON에는 다음 code를 순서와 무관하게 기록한다.

```json
[
  "MULTIPLE_SERVERS_COLLAPSED",
  "MULTIPLE_MEDIA_TYPES_COLLAPSED",
  "COOKIE_PARAMETER_NOT_SUPPORTED",
  "CALLBACKS_NOT_SUPPORTED",
  "LINKS_NOT_SUPPORTED"
]
```

- [ ] **Step 6: 검증과 커밋**

```bash
npm run test -- src/lib/conversion/down
npm run lint
npm run typecheck
git add src/lib/conversion/down test/fixtures/conversions/openapi30-to-swagger2
git commit -m "feat(openapi-editor): convert OpenAPI 3 operations to Swagger 2"
```

Expected: 모든 명령 exit 0.

---

### Task 10: OpenAPI 검증, 변환 오케스트레이션, Web Worker

**Files:**
- Create: `openapi-editor/src/lib/validation/openapi-validator.ts`
- Create: `openapi-editor/src/lib/validation/openapi-validator.test.ts`
- Create: `openapi-editor/src/lib/conversion/conversion-service.ts`
- Create: `openapi-editor/src/lib/conversion/conversion-service.test.ts`
- Create: `openapi-editor/src/lib/conversion/conversion-golden.test.ts`
- Create: `openapi-editor/src/workers/protocol.ts`
- Create: `openapi-editor/src/workers/handler.ts`
- Create: `openapi-editor/src/workers/handler.test.ts`
- Create: `openapi-editor/src/workers/openapi.worker.ts`
- Delete: `openapi-editor/src/workers/dependency-smoke.ts`
- Delete: `openapi-editor/vite.smoke.config.ts`
- Create: `openapi-editor/test/fixtures/conversions/swagger2-to-openapi30/input.yaml`
- Create: `openapi-editor/test/fixtures/conversions/swagger2-to-openapi30/expected.json`
- Create: `openapi-editor/test/fixtures/conversions/swagger2-to-openapi30/diagnostics.json`
- Create: `openapi-editor/test/fixtures/conversions/swagger2-to-openapi31/input.yaml`
- Create: `openapi-editor/test/fixtures/conversions/swagger2-to-openapi31/expected.json`
- Create: `openapi-editor/test/fixtures/conversions/swagger2-to-openapi31/diagnostics.json`
- Create: `openapi-editor/test/fixtures/conversions/openapi30-to-openapi31/input.yaml`
- Create: `openapi-editor/test/fixtures/conversions/openapi30-to-openapi31/expected.json`
- Create: `openapi-editor/test/fixtures/conversions/openapi30-to-openapi31/diagnostics.json`
- Create: `openapi-editor/test/fixtures/conversions/openapi31-to-openapi30/input.yaml`
- Create: `openapi-editor/test/fixtures/conversions/openapi31-to-openapi30/expected.json`
- Create: `openapi-editor/test/fixtures/conversions/openapi31-to-openapi30/diagnostics.json`
- Create: `openapi-editor/test/fixtures/conversions/openapi31-to-swagger2/input.yaml`
- Create: `openapi-editor/test/fixtures/conversions/openapi31-to-swagger2/expected.json`
- Create: `openapi-editor/test/fixtures/conversions/openapi31-to-swagger2/diagnostics.json`

**Interfaces:**
- Consumes: Tasks 2~9의 parser, validator, adapters, inventory, serializer.
- Produces: `validateOpenApi`, `convertDocument`, `WorkerRequest`, `WorkerResponse`, `handleWorkerRequest`.

- [ ] **Step 1: 검증과 연쇄 변환 실패 테스트 작성**

`conversion-service.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { convertDocument } from './conversion-service';

describe('convertDocument', () => {
  it('runs 2.0 -> 3.0 -> 3.1 and returns canonical 3.1.2', async () => {
    const source = { swagger: '2.0', info: { title: 'Pets', version: '1' }, paths: {} };
    const result = await convertDocument(source, 'swagger-2.0', 'openapi-3.1');
    expect(result.document.openapi).toBe('3.1.2');
    expect(result.steps).toEqual(['swagger-2-to-openapi-3.0', 'openapi-3.0-to-3.1']);
    expect(result.targetValid).toBe(true);
  });

  it('blocks unexplained operation loss', async () => {
    const source = { openapi: '3.0.4', info: { title: 'Pets', version: '1' }, paths: { '/pets': { get: { responses: { 200: { description: 'OK' } } } } } };
    const result = await convertDocument(source, 'openapi-3.0', 'swagger-2.0');
    expect(result.diagnostics.filter((item) => item.code === 'UNEXPLAINED_CONVERSION_CHANGE')).toEqual([]);
  });
});
```

`handler.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { handleWorkerRequest } from './handler';

describe('handleWorkerRequest', () => {
  it('echoes the request revision in an analysis result', async () => {
    const response = await handleWorkerRequest({ type: 'analyze', revision: 7, raw: '{"openapi":"3.1.2","info":{"title":"API","version":"1"},"paths":{}}', filename: 'openapi.json' });
    expect(response).toMatchObject({ type: 'analysis-result', revision: 7, result: { format: 'json', version: 'openapi-3.1' } });
  });
});
```

- [ ] **Step 2: 실패 확인**

```bash
npm run test -- src/lib/conversion/conversion-service.test.ts src/workers/handler.test.ts
```

Expected: service와 handler 부재로 FAIL.

- [ ] **Step 3: OpenAPI 검증 wrapper 구현**

`openapi-validator.ts`:

```ts
import { validate } from '@scalar/openapi-parser';
import type { Diagnostic, OpenApiDocument } from '../../domain/document';
import { buildSafeDocument } from './safe-document';
import { validateReferences } from './ref-validator';

export async function validateOpenApi(document: OpenApiDocument): Promise<Diagnostic[]> {
  const result = await validate(JSON.stringify(buildSafeDocument(document)));
  const structure = result.valid ? [] : result.errors.map((error, index) => ({
    id: `OPENAPI_SCHEMA_ERROR:${index}`, code: 'OPENAPI_SCHEMA_ERROR', severity: 'error' as const,
    stage: 'validate' as const, message: String(error.message ?? error), sourcePointer: String(error.path ?? ''), lossy: false,
  }));
  return [...structure, ...validateReferences(document)];
}
```

`openapi-validator.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { validateOpenApi } from './openapi-validator';

describe('validateOpenApi', () => {
  it.each([
    { swagger: '2.0', info: { title: 'API', version: '1' }, paths: {} },
    { openapi: '3.0.4', info: { title: 'API', version: '1' }, paths: {} },
    { openapi: '3.1.2', info: { title: 'API', version: '1' }, paths: {} },
  ])('accepts a minimal supported document', async (document) => {
    expect((await validateOpenApi(document)).filter(({ severity }) => severity === 'error')).toEqual([]);
  });

  it('reports a structural error and keeps external ref handling local', async () => {
    const result = await validateOpenApi({ openapi: '3.1.2', info: { title: 'API' }, paths: {}, components: { schemas: { Pet: { $ref: 'https://example.com/Pet' } } } });
    expect(result).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'OPENAPI_SCHEMA_ERROR', severity: 'error' }),
      expect.objectContaining({ code: 'EXTERNAL_REF_NOT_RESOLVED', severity: 'warning' }),
    ]));
  });
});
```

- [ ] **Step 4: 변환 service 구현**

`conversion-service.ts`는 adapter registry를 다음으로 고정하고 각 step 뒤에 버전·구조 검증을 실행한다.

```ts
import type { Diagnostic, OpenApiDocument, SpecFamily } from '../../domain/document';
import { detectSpecVersion } from '../validation/version-detector';
import { validateOpenApi } from '../validation/openapi-validator';
import { extractInventory } from './core/inventory';
import { reconcileInventories } from './core/reconcile';
import { routeConversion } from './core/router';
import type { ConversionStepId, ConverterAdapter } from './core/types';
import { openApi31To30Adapter } from './down/openapi31-to-openapi30';
import { openApi3ToSwagger2Adapter } from './down/openapi3-to-swagger2';
import { openApi30To31Adapter } from './up/openapi30-to-openapi31';
import { swagger2ToOpenApi30Adapter } from './up/swagger2-to-openapi30';

const adapters = new Map<ConversionStepId, ConverterAdapter>([
  ['swagger-2-to-openapi-3.0', swagger2ToOpenApi30Adapter],
  ['openapi-3.0-to-3.1', openApi30To31Adapter],
  ['openapi-3.1-to-3.0', openApi31To30Adapter],
  ['openapi-3-to-swagger-2', openApi3ToSwagger2Adapter],
]);

function dedupeDiagnostics(diagnostics: Diagnostic[]): Diagnostic[] {
  return [...new Map(diagnostics.map((diagnostic) => [`${diagnostic.id}:${diagnostic.targetPointer ?? ''}`, diagnostic])).values()];
}

export interface ConversionRunResult {
  document: OpenApiDocument;
  diagnostics: Diagnostic[];
  steps: ConversionStepId[];
  targetValid: boolean;
}

export async function convertDocument(document: OpenApiDocument, source: SpecFamily, target: SpecFamily): Promise<ConversionRunResult> {
  const sourceInventory = extractInventory(document, source);
  let current = structuredClone(document);
  const diagnostics: Diagnostic[] = [];
  const executed: ConversionStepId[] = [];
  for (const step of routeConversion(source, target)) {
    const adapter = adapters.get(step.id);
    if (!adapter) throw new Error(`변환 adapter가 없습니다: ${step.id}`);
    const result = await adapter.convert(current);
    current = result.document;
    diagnostics.push(...result.diagnostics);
    executed.push(step.id);
    const detected = detectSpecVersion(current);
    if (!detected.ok) {
      diagnostics.push(detected.diagnostic);
      break;
    }
    if (detected.family !== step.target) {
      diagnostics.push({ id: `TARGET_VERSION_MISMATCH:${step.id}`, code: 'TARGET_VERSION_MISMATCH', severity: 'error', stage: 'validate', message: `${step.id} 결과 버전이 ${step.target}이 아닙니다.`, sourcePointer: '', lossy: false });
      break;
    }
    const validation = await validateOpenApi(current);
    diagnostics.push(...validation);
    if (validation.some(({ severity }) => severity === 'error')) break;
  }
  const detectedTarget = detectSpecVersion(current);
  const reconciled = reconcileInventories(sourceInventory, extractInventory(current, detectedTarget.ok ? detectedTarget.family : target), dedupeDiagnostics(diagnostics));
  const targetValid = detectedTarget.ok && detectedTarget.family === target && !reconciled.some(({ severity }) => severity === 'error');
  return { document: current, diagnostics: reconciled, steps: executed, targetValid };
}
```

- [ ] **Step 5: Worker 프로토콜과 handler 구현**

`protocol.ts`:

```ts
import type { Diagnostic, DocumentFormat, OpenApiDocument, SourceLocation, SpecFamily } from '../domain/document';
import type { ConversionRunResult } from '../lib/conversion/conversion-service';

export interface AnalysisResult {
  raw: string; format: DocumentFormat; version?: SpecFamily; document?: OpenApiDocument;
  pointerLocations: Map<string, SourceLocation>; diagnostics: Diagnostic[];
}
export type WorkerRequest =
  | { type: 'analyze'; revision: number; raw: string; filename?: string; lockedFormat?: DocumentFormat }
  | { type: 'convert'; revision: number; document: OpenApiDocument; source: SpecFamily; target: SpecFamily; outputFormat: DocumentFormat };
export type WorkerResponse =
  | { type: 'analysis-result'; revision: number; result: AnalysisResult }
  | { type: 'conversion-result'; revision: number; result: ConversionRunResult; targetText: string }
  | { type: 'worker-error'; revision: number; message: string };
```

`handler.ts`의 analyze branch는 detect → parse → version → validate 순서로 실행하고, convert branch는 `convertDocument` 후 `serializeDocument`를 실행한다.

```ts
import { convertDocument } from '../lib/conversion/conversion-service';
import { detectDocumentFormat } from '../lib/parser/format-detector';
import { parseSource } from '../lib/parser/parse-source';
import { serializeDocument } from '../lib/parser/serialize-document';
import { validateOpenApi } from '../lib/validation/openapi-validator';
import { detectSpecVersion } from '../lib/validation/version-detector';
import type { WorkerRequest, WorkerResponse } from './protocol';

export async function handleWorkerRequest(request: WorkerRequest): Promise<WorkerResponse> {
  try {
    if (request.type === 'analyze') {
      const detection = detectDocumentFormat({ raw: request.raw, filename: request.filename, lockedFormat: request.lockedFormat });
      const parsed = parseSource(request.raw, detection.format);
      if (!parsed.ok) {
        return { type: 'analysis-result', revision: request.revision, result: { raw: request.raw, format: detection.format, pointerLocations: new Map(), diagnostics: [...detection.diagnostics, ...parsed.diagnostics] } };
      }
      const version = detectSpecVersion(parsed.value);
      if (!version.ok) {
        return { type: 'analysis-result', revision: request.revision, result: { raw: request.raw, format: detection.format, document: parsed.value, pointerLocations: parsed.pointerLocations, diagnostics: [...detection.diagnostics, ...parsed.diagnostics, version.diagnostic] } };
      }
      const diagnostics = await validateOpenApi(parsed.value);
      return { type: 'analysis-result', revision: request.revision, result: { raw: request.raw, format: detection.format, version: version.family, document: parsed.value, pointerLocations: parsed.pointerLocations, diagnostics: [...detection.diagnostics, ...parsed.diagnostics, ...diagnostics] } };
    }
    const result = await convertDocument(request.document, request.source, request.target);
    return { type: 'conversion-result', revision: request.revision, result, targetText: serializeDocument(result.document, request.outputFormat) };
  } catch {
    return { type: 'worker-error', revision: request.revision, message: '문서를 처리하지 못했습니다. 원문은 변경되지 않았습니다.' };
  }
}
```

`openapi.worker.ts`:

```ts
/// <reference lib="webworker" />
import { handleWorkerRequest } from './handler';
import type { WorkerRequest } from './protocol';

self.addEventListener('message', async (event: MessageEvent<WorkerRequest>) => {
  self.postMessage(await handleWorkerRequest(event.data));
});
```

- [ ] **Step 6: 전체 변환 matrix와 Worker build 검증**

`conversion-service.test.ts`에 여섯 방향을 `it.each`로 추가하고 target root가 각각 `2.0`, `3.0.4`, `3.1.2`인지 확인한다.

`conversion-golden.test.ts`는 여섯 디렉터리의 `input.yaml`, `expected.json`, `diagnostics.json`을 같은 방식으로 검증한다.

```ts
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { SpecFamily } from '../../domain/document';
import { parseSource } from '../parser/parse-source';
import { convertDocument } from './conversion-service';

const cases = [
  ['swagger2-to-openapi30', 'swagger-2.0', 'openapi-3.0'],
  ['swagger2-to-openapi31', 'swagger-2.0', 'openapi-3.1'],
  ['openapi30-to-openapi31', 'openapi-3.0', 'openapi-3.1'],
  ['openapi30-to-swagger2', 'openapi-3.0', 'swagger-2.0'],
  ['openapi31-to-openapi30', 'openapi-3.1', 'openapi-3.0'],
  ['openapi31-to-swagger2', 'openapi-3.1', 'swagger-2.0'],
] as const satisfies ReadonlyArray<readonly [string, SpecFamily, SpecFamily]>;

describe('conversion golden fixtures', () => {
  it.each(cases)('%s', async (directory, source, target) => {
    const fixture = resolve(process.cwd(), 'test/fixtures/conversions', directory);
    const input = parseSource(await readFile(resolve(fixture, 'input.yaml'), 'utf8'), 'yaml');
    if (!input.ok) throw new Error(`fixture parse failed: ${directory}`);
    const expected = JSON.parse(await readFile(resolve(fixture, 'expected.json'), 'utf8'));
    const expectedCodes = JSON.parse(await readFile(resolve(fixture, 'diagnostics.json'), 'utf8'));
    const result = await convertDocument(input.value, source, target);
    expect(result.document).toEqual(expected);
    expect(result.diagnostics.map(({ code }) => code).sort()).toEqual([...expectedCodes].sort());
  });
});
```

모든 fixture는 최소한 operation, schema, 내부 `$ref`를 포함한다. 하향 fixture에는 다중 server/media type, nullable, callback, link, webhook을 추가하고 `diagnostics.json`에 발생해야 하는 손실 code를 명시한다. `openapi30-to-swagger2` fixture는 Task 9에서 만든 파일을 그대로 사용한다.

gate 전용 `src/workers/dependency-smoke.ts`와 `vite.smoke.config.ts`를 삭제하고 `.gitignore`의 `dist-smoke/` 항목도 제거한다. 실제 `openapi.worker.ts`가 생성된 상태에서 production build를 실행한다.

```bash
npm run test -- src/lib/validation src/lib/conversion src/workers
npm run lint
npm run typecheck
npm run build
```

Expected: 여섯 방향과 Worker handler 테스트가 PASS하고 Vite production build exit 0.

- [ ] **Step 7: 커밋**

```bash
git add src/lib/validation src/lib/conversion src/workers test/fixtures/conversions .gitignore
git commit -m "feat(openapi-editor): run validation and conversion in a worker"
```

---

### Task 11: Worker client, workspace reducer, 업로드·다운로드

**Files:**
- Create: `openapi-editor/src/hooks/useWorkerClient.ts`
- Create: `openapi-editor/src/hooks/useWorkerClient.test.tsx`
- Create: `openapi-editor/src/hooks/workspace-reducer.ts`
- Create: `openapi-editor/src/hooks/workspace-reducer.test.ts`
- Create: `openapi-editor/src/hooks/useWorkspace.ts`
- Create: `openapi-editor/src/lib/files/read-upload.ts`
- Create: `openapi-editor/src/lib/files/read-upload.test.ts`
- Create: `openapi-editor/src/lib/files/download.ts`
- Create: `openapi-editor/src/lib/files/download.test.ts`
- Create: `openapi-editor/src/lib/sample.ts`

**Interfaces:**
- Consumes: Task 10의 Worker protocol.
- Produces: `useWorkerClient`, `workspaceReducer`, `useWorkspace`, `readUpload`, `downloadDocument`.

- [ ] **Step 1: stale 응답과 reducer 실패 테스트 작성**

`workspace-reducer.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { initialWorkspaceState, workspaceReducer } from './workspace-reducer';

describe('workspaceReducer', () => {
  it('ignores stale analysis results', () => {
    const requested = workspaceReducer(initialWorkspaceState, { type: 'analysis-requested', revision: 4 });
    const stale = workspaceReducer(requested, { type: 'analysis-received', revision: 3, result: { raw: '', format: 'yaml', pointerLocations: new Map(), diagnostics: [] } });
    expect(stale).toBe(requested);
  });
  it('keeps one restore snapshot when applying a candidate', () => {
    const state = { ...initialWorkspaceState, raw: 'openapi: 3.0.4', candidate: { targetText: 'openapi: 3.1.2', targetValid: true } };
    const applied = workspaceReducer(state, { type: 'candidate-applied' });
    expect(applied.raw).toBe('openapi: 3.1.2');
    expect(applied.restoreSnapshot).toBe('openapi: 3.0.4');
    expect(applied.candidate).toBeNull();
  });
});
```

`useWorkerClient.test.tsx`:

```tsx
import { act, renderHook } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import type { WorkerResponse } from '../workers/protocol';
import { useWorkerClient } from './useWorkerClient';

class FakeWorker {
  onmessage: ((event: MessageEvent<WorkerResponse>) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  postMessage = vi.fn();
  terminate = vi.fn();
  emit(response: WorkerResponse): void { this.onmessage?.({ data: response } as MessageEvent<WorkerResponse>); }
  fail(): void { this.onerror?.({} as ErrorEvent); }
}

it('drops stale revisions and restarts only once', () => {
  const workers: FakeWorker[] = [];
  const factory = vi.fn(() => {
    const worker = new FakeWorker();
    workers.push(worker);
    return worker as unknown as Worker;
  });
  const onResponse = vi.fn();
  const { result } = renderHook(() => useWorkerClient(onResponse, factory));
  act(() => result.current({ type: 'analyze', revision: 1, raw: '{}'}));
  act(() => result.current({ type: 'analyze', revision: 2, raw: '{}'}));
  act(() => workers[0]!.emit({ type: 'worker-error', revision: 1, message: 'stale' }));
  act(() => workers[0]!.emit({ type: 'worker-error', revision: 2, message: 'current' }));
  expect(onResponse).toHaveBeenCalledTimes(1);
  act(() => workers[0]!.fail());
  expect(factory).toHaveBeenCalledTimes(2);
  act(() => workers[1]!.fail());
  expect(factory).toHaveBeenCalledTimes(2);
  expect(onResponse).toHaveBeenLastCalledWith(expect.objectContaining({ type: 'worker-error', revision: 2 }));
});
```

- [ ] **Step 2: 실패 확인**

```bash
npm run test -- src/hooks
```

Expected: reducer와 hook 부재로 FAIL.

- [ ] **Step 3: workspace 상태와 reducer 구현**

`workspace-reducer.ts`의 상태를 다음으로 고정한다.

```ts
import type { DocumentFormat, OpenApiDocument, SpecFamily } from '../domain/document';
import type { AnalysisResult } from '../workers/protocol';

export type WorkspaceStatus = 'idle' | 'analyzing' | 'valid' | 'invalid' | 'converting' | 'reviewing' | 'worker-error';
export interface WorkspaceCandidate { targetText: string; targetDocument?: OpenApiDocument; diagnostics?: AnalysisResult['diagnostics']; targetValid?: boolean }
export interface WorkspaceState {
  status: WorkspaceStatus; raw: string; filename: string; format: DocumentFormat; formatLocked: boolean;
  version?: SpecFamily; latestRevision: number; analysis?: AnalysisResult; lastValid?: AnalysisResult;
  candidate: WorkspaceCandidate | null; restoreSnapshot: string | null; dirty: boolean; workerRestarts: number;
  fileDiagnostics: AnalysisResult['diagnostics'];
  notifications: AnalysisResult['diagnostics'];
}
export const initialWorkspaceState: WorkspaceState = {
  status: 'idle', raw: '', filename: 'openapi.yaml', format: 'yaml', formatLocked: false,
  latestRevision: 0, candidate: null, restoreSnapshot: null, dirty: false, workerRestarts: 0, fileDiagnostics: [], notifications: [],
};
```

action union은 edit, file-opened, analysis-requested, analysis-received, conversion-requested, conversion-received, candidate-applied, candidate-cancelled, restore, worker-failed를 포함한다. `analysis-received`는 revision이 다르면 동일 state 객체를 반환하고, error 진단이 없으면 `lastValid`를 갱신한다.

```ts
import type { ConversionRunResult } from '../lib/conversion/conversion-service';

export type WorkspaceAction =
  | { type: 'edit'; raw: string }
  | { type: 'file-opened'; raw: string; filename: string; format: DocumentFormat; diagnostics: AnalysisResult['diagnostics'] }
  | { type: 'file-rejected'; diagnostics: AnalysisResult['diagnostics'] }
  | { type: 'document-format-changed'; raw: string; filename: string; format: DocumentFormat }
  | { type: 'format-forced'; format: DocumentFormat }
  | { type: 'format-unlocked' }
  | { type: 'analysis-requested'; revision: number }
  | { type: 'analysis-received'; revision: number; result: AnalysisResult }
  | { type: 'conversion-requested'; revision: number }
  | { type: 'conversion-received'; revision: number; result: ConversionRunResult; targetText: string }
  | { type: 'candidate-applied' }
  | { type: 'candidate-cancelled' }
  | { type: 'restore' }
  | { type: 'worker-failed' };

export function workspaceReducer(state: WorkspaceState, action: WorkspaceAction): WorkspaceState {
  switch (action.type) {
    case 'edit': return { ...state, raw: action.raw, dirty: true, notifications: [] };
    case 'file-opened': return { ...initialWorkspaceState, raw: action.raw, filename: action.filename, format: action.format, formatLocked: false, fileDiagnostics: action.diagnostics };
    case 'file-rejected': return { ...state, notifications: action.diagnostics };
    case 'document-format-changed': return { ...state, raw: action.raw, filename: action.filename, format: action.format, formatLocked: true, dirty: true, fileDiagnostics: [] };
    case 'format-forced': return { ...state, format: action.format, formatLocked: true, dirty: true };
    case 'format-unlocked': return { ...state, formatLocked: false };
    case 'analysis-requested': return { ...state, status: 'analyzing', latestRevision: action.revision };
    case 'analysis-received': {
      if (action.revision !== state.latestRevision) return state;
      const result = { ...action.result, diagnostics: [...state.fileDiagnostics, ...action.result.diagnostics] };
      const valid = Boolean(result.document && result.version) && !result.diagnostics.some(({ severity }) => severity === 'error');
      return {
        ...state, status: valid ? 'valid' : 'invalid', analysis: result,
        lastValid: valid ? result : state.lastValid, format: result.format,
        version: result.version, formatLocked: true,
      };
    }
    case 'conversion-requested': return { ...state, status: 'converting', latestRevision: action.revision };
    case 'conversion-received': {
      if (action.revision !== state.latestRevision) return state;
      return { ...state, status: 'reviewing', candidate: { targetText: action.targetText, targetDocument: action.result.document, diagnostics: action.result.diagnostics, targetValid: action.result.targetValid } };
    }
    case 'candidate-applied':
      if (!state.candidate || state.candidate.targetValid !== true || state.candidate.diagnostics?.some(({ severity }) => severity === 'error')) return state;
      return { ...state, status: 'analyzing', raw: state.candidate.targetText, restoreSnapshot: state.raw, candidate: null, dirty: true };
    case 'candidate-cancelled': return { ...state, status: state.analysis?.diagnostics.some(({ severity }) => severity === 'error') ? 'invalid' : 'valid', candidate: null };
    case 'restore': return state.restoreSnapshot === null ? state : { ...state, status: 'analyzing', raw: state.restoreSnapshot, restoreSnapshot: null, candidate: null, dirty: true };
    case 'worker-failed': return { ...state, status: 'worker-error', workerRestarts: state.workerRestarts + 1 };
  }
}
```

- [ ] **Step 4: Worker client 구현**

```ts
import { useCallback, useEffect, useRef } from 'react';
import type { WorkerRequest, WorkerResponse } from '../workers/protocol';

type WorkerFactory = () => Worker;
const defaultWorkerFactory: WorkerFactory = () => new Worker(new URL('../workers/openapi.worker.ts', import.meta.url), { type: 'module' });

export function useWorkerClient(onResponse: (response: WorkerResponse) => void, factory: WorkerFactory = defaultWorkerFactory) {
  const workerRef = useRef<Worker | null>(null);
  const latestRevision = useRef(0);
  const restarts = useRef(0);

  useEffect(() => {
    let disposed = false;
    const start = (): void => {
      const worker = factory();
      workerRef.current = worker;
      worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
        if (!disposed && event.data.revision === latestRevision.current) onResponse(event.data);
      };
      worker.onerror = () => {
        worker.terminate();
        if (disposed) return;
        if (restarts.current < 1) {
          restarts.current += 1;
          start();
          return;
        }
        onResponse({ type: 'worker-error', revision: latestRevision.current, message: '문서 처리 Worker가 연속으로 종료되었습니다.' });
      };
    };
    start();
    return () => {
      disposed = true;
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, [factory, onResponse]);

  return useCallback((request: WorkerRequest) => {
    latestRevision.current = request.revision;
    workerRef.current?.postMessage(request);
  }, []);
}
```

- [ ] **Step 5: 업로드·다운로드 테스트와 구현**

`read-upload.test.ts`는 다음 경계를 먼저 고정한다.

```ts
import { describe, expect, it, vi } from 'vitest';
import { HARD_FILE_LIMIT, readUpload, SOFT_FILE_LIMIT } from './read-upload';

function file(name: string, size: number): File {
  const value = new File(['openapi: 3.1.2'], name, { type: 'text/plain' });
  Object.defineProperty(value, 'size', { value: size });
  return value;
}

describe('readUpload', () => {
  it('warns above 5MB and still reads the file', async () => {
    expect(await readUpload(file('openapi.yaml', SOFT_FILE_LIMIT + 1))).toMatchObject({ ok: true, diagnostics: [{ code: 'FILE_SIZE_WARNING' }] });
  });
  it('blocks above 20MB before reading content', async () => {
    const value = file('openapi.json', HARD_FILE_LIMIT + 1);
    const text = vi.spyOn(value, 'text');
    expect(await readUpload(value)).toMatchObject({ ok: false, diagnostics: [{ code: 'FILE_TOO_LARGE' }] });
    expect(text).not.toHaveBeenCalled();
  });
  it('rejects unsupported extensions', async () => {
    expect(await readUpload(file('openapi.txt', 10))).toMatchObject({ ok: false, diagnostics: [{ code: 'UNSUPPORTED_FILE_EXTENSION' }] });
  });
});
```

`read-upload.ts`의 계약은 다음과 같다. hard limit와 확장자를 먼저 검사한 뒤에만 `file.text()`를 호출하며, soft limit는 열기를 허용하되 `FILE_SIZE_WARNING`을 반환한다.

```ts
import type { Diagnostic } from '../../domain/document';

export const SOFT_FILE_LIMIT = 5 * 1024 * 1024;
export const HARD_FILE_LIMIT = 20 * 1024 * 1024;

export type UploadResult =
  | { ok: true; filename: string; raw: string; diagnostics: Diagnostic[] }
  | { ok: false; diagnostics: Diagnostic[] };

function error(code: string, message: string): Diagnostic {
  return { id: `${code}:file`, code, severity: 'error', stage: 'parse', message, sourcePointer: '', lossy: false };
}

export async function readUpload(file: File): Promise<UploadResult> {
  if (!/\.(?:ya?ml|json)$/i.test(file.name)) return { ok: false, diagnostics: [error('UNSUPPORTED_FILE_EXTENSION', 'YAML 또는 JSON 파일만 열 수 있습니다.')] };
  if (file.size > HARD_FILE_LIMIT) return { ok: false, diagnostics: [error('FILE_TOO_LARGE', '20MB를 초과한 파일은 열 수 없습니다.')] };
  const diagnostics: Diagnostic[] = file.size > SOFT_FILE_LIMIT ? [{
    id: 'FILE_SIZE_WARNING:file', code: 'FILE_SIZE_WARNING', severity: 'warning', stage: 'parse',
    message: '5MB를 초과해 편집기와 미리보기 반응이 느릴 수 있습니다.', sourcePointer: '', lossy: false,
  }] : [];
  return { ok: true, filename: file.name, raw: await file.text(), diagnostics };
}
```

허용 확장자는 대소문자를 무시한 `.yaml`, `.yml`, `.json`만이다. 20MB 초과는 `FILE_TOO_LARGE`, 잘못된 확장자는 `UNSUPPORTED_FILE_EXTENSION` error 진단을 반환하고 파일 내용을 읽지 않는다.

`download.ts`는 다음 계약을 구현한다.

```ts
import type { DocumentFormat, OpenApiDocument } from '../../domain/document';
import { serializeDocument } from '../parser/serialize-document';

export interface PreparedDownload { filename: string; blob: Blob }
export function normalizeDownloadName(filename: string | undefined, format: DocumentFormat): string {
  const base = (filename?.trim() || 'openapi').replace(/\.(?:ya?ml|json)$/i, '');
  return `${base}.${format === 'yaml' ? 'yaml' : 'json'}`;
}
export function createDownload(document: OpenApiDocument, filename: string | undefined, format: DocumentFormat): PreparedDownload {
  return {
    filename: normalizeDownloadName(filename, format),
    blob: new Blob([serializeDocument(document, format)], { type: format === 'json' ? 'application/json;charset=utf-8' : 'application/yaml;charset=utf-8' }),
  };
}
export function createRawDownload(raw: string, filename: string | undefined, format: DocumentFormat): PreparedDownload {
  return { filename: normalizeDownloadName(filename, format), blob: new Blob([raw], { type: 'text/plain;charset=utf-8' }) };
}
export function triggerDownload(download: PreparedDownload): void {
  const url = URL.createObjectURL(download.blob);
  try {
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = download.filename;
    anchor.hidden = true;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
  } finally {
    URL.revokeObjectURL(url);
  }
}
```

`download.test.ts`:

```ts
import { expect, it, vi } from 'vitest';
import { createDownload, createRawDownload, normalizeDownloadName, triggerDownload } from './download';

it('normalizes names and serializes UTF-8 YAML or JSON', async () => {
  expect(normalizeDownloadName('pets.yml', 'json')).toBe('pets.json');
  expect(normalizeDownloadName('pets', 'yaml')).toBe('pets.yaml');
  const prepared = createDownload({ openapi: '3.1.2', info: { title: '동물', version: '1' }, paths: {} }, 'pets.yml', 'json');
  expect(await prepared.blob.text()).toContain('동물');
  expect(createRawDownload('openapi: [', 'broken.yaml', 'yaml').filename).toBe('broken.yaml');
});

it('clicks a temporary link and revokes the Blob URL', () => {
  const create = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test');
  const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
  const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
  triggerDownload(createRawDownload('{}', 'openapi.json', 'json'));
  expect(create).toHaveBeenCalledOnce();
  expect(click).toHaveBeenCalledOnce();
  expect(revoke).toHaveBeenCalledWith('blob:test');
});
```

- [ ] **Step 6: useWorkspace orchestration 구현**

`useWorkspace.ts`는 reducer와 Worker client를 결합하고 다음 public API만 UI에 노출한다.

```ts
export interface WorkspaceActions {
  edit(raw: string): void;
  openFile(file: File): Promise<void>;
  redetectFormat(): void;
  forceFormat(format: DocumentFormat): void;
  changeDocumentFormat(format: DocumentFormat): void;
  convert(target: SpecFamily): void;
  applyCandidate(): void;
  cancelCandidate(): void;
  restore(): void;
  download(format: DocumentFormat): void;
}
```

구현 본문은 다음 흐름으로 고정한다.

```ts
import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import type { DocumentFormat, SpecFamily } from '../domain/document';
import { createDownload, createRawDownload, normalizeDownloadName, triggerDownload } from '../lib/files/download';
import { readUpload } from '../lib/files/read-upload';
import { serializeDocument } from '../lib/parser/serialize-document';
import type { WorkerResponse } from '../workers/protocol';
import { useWorkerClient } from './useWorkerClient';
import { initialWorkspaceState, workspaceReducer, type WorkspaceState } from './workspace-reducer';

function extensionFormat(filename: string): DocumentFormat {
  return filename.toLowerCase().endsWith('.json') ? 'json' : 'yaml';
}

export function useWorkspace(): { state: WorkspaceState; actions: WorkspaceActions } {
  const [state, dispatch] = useReducer(workspaceReducer, initialWorkspaceState);
  const revision = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onResponse = useCallback((response: WorkerResponse) => {
    if (response.type === 'analysis-result') dispatch({ type: 'analysis-received', revision: response.revision, result: response.result });
    else if (response.type === 'conversion-result') dispatch({ type: 'conversion-received', revision: response.revision, result: response.result, targetText: response.targetText });
    else dispatch({ type: 'worker-failed' });
  }, []);
  const send = useWorkerClient(onResponse);
  const analyze = useCallback((raw: string, filename: string, lockedFormat: DocumentFormat | undefined, delay = 400): void => {
    if (timer.current) clearTimeout(timer.current);
    const next = revision.current + 1;
    revision.current = next;
    dispatch({ type: 'analysis-requested', revision: next });
    timer.current = setTimeout(() => {
      send({ type: 'analyze', revision: next, raw, filename, lockedFormat });
    }, delay);
  }, [send]);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  useEffect(() => {
    if (!state.dirty) return;
    const prevent = (event: BeforeUnloadEvent): void => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', prevent);
    return () => window.removeEventListener('beforeunload', prevent);
  }, [state.dirty]);

  const actions = useMemo<WorkspaceActions>(() => ({
    edit(raw) {
      dispatch({ type: 'edit', raw });
      analyze(raw, state.filename, state.formatLocked ? state.format : undefined);
    },
    async openFile(file) {
      const upload = await readUpload(file);
      if (!upload.ok) { dispatch({ type: 'file-rejected', diagnostics: upload.diagnostics }); return; }
      const format = extensionFormat(upload.filename);
      dispatch({ type: 'file-opened', raw: upload.raw, filename: upload.filename, format, diagnostics: upload.diagnostics });
      analyze(upload.raw, upload.filename, undefined, 0);
    },
    redetectFormat() {
      dispatch({ type: 'format-unlocked' });
      analyze(state.raw, state.filename, undefined, 0);
    },
    forceFormat(format) {
      dispatch({ type: 'format-forced', format });
      analyze(state.raw, state.filename, format, 0);
    },
    changeDocumentFormat(format) {
      const analysis = state.analysis;
      if (!analysis?.document || analysis.diagnostics.some(({ severity }) => severity === 'error')) return;
      const raw = serializeDocument(analysis.document, format);
      const filename = normalizeDownloadName(state.filename, format);
      dispatch({ type: 'document-format-changed', raw, filename, format });
      analyze(raw, filename, format, 0);
    },
    convert(target: SpecFamily) {
      const analysis = state.analysis;
      if (state.status !== 'valid' || !analysis?.document || !analysis.version || analysis.version === target) return;
      const next = revision.current + 1;
      revision.current = next;
      dispatch({ type: 'conversion-requested', revision: next });
      send({ type: 'convert', revision: next, document: analysis.document, source: analysis.version, target, outputFormat: state.format });
    },
    applyCandidate() {
      const candidate = state.candidate;
      if (!candidate || candidate.targetValid !== true || candidate.diagnostics?.some(({ severity }) => severity === 'error')) return;
      dispatch({ type: 'candidate-applied' });
      analyze(candidate.targetText, state.filename, state.format, 0);
    },
    cancelCandidate() { dispatch({ type: 'candidate-cancelled' }); },
    restore() {
      const raw = state.restoreSnapshot;
      if (raw === null) return;
      dispatch({ type: 'restore' });
      analyze(raw, state.filename, state.format, 0);
    },
    download(format) {
      const analysis = state.analysis;
      const valid = Boolean(analysis?.document) && !analysis!.diagnostics.some(({ severity }) => severity === 'error');
      if (valid) triggerDownload(createDownload(analysis!.document!, state.filename, format));
      else if (format === state.format) triggerDownload(createRawDownload(state.raw, state.filename, format));
    },
  }), [analyze, send, state]);
  return { state, actions };
}
```

`edit`만 400ms debounce를 사용하고 upload, format change, apply, restore는 지연 0으로 재분석한다. invalid 원문에서는 `changeDocumentFormat`을 거부하고 `forceFormat`만 명시적 parser override로 사용한다. `beforeunload`는 `dirty`일 때만 등록하며 API 명세 원문은 localStorage에 쓰지 않는다.

- [ ] **Step 7: 검증과 커밋**

```bash
npm run test -- src/hooks src/lib/files
npm run lint
npm run typecheck
git add src/hooks src/lib/files src/lib/sample.ts
git commit -m "feat(openapi-editor): manage workspace and file actions"
```

Expected: 모든 명령 exit 0.

---

### Task 12: 3분할 탐색기와 Monaco 편집기

**Files:**
- Create: `openapi-editor/src/components/layout/Workspace.tsx`
- Create: `openapi-editor/src/components/layout/ResizablePanels.tsx`
- Create: `openapi-editor/src/components/layout/ResizablePanels.test.tsx`
- Create: `openapi-editor/src/components/navigator/DocumentNavigator.tsx`
- Create: `openapi-editor/src/components/navigator/DocumentNavigator.test.tsx`
- Create: `openapi-editor/src/components/editor/DocumentEditor.tsx`
- Create: `openapi-editor/src/components/editor/DocumentEditor.test.tsx`
- Modify: `openapi-editor/src/components/layout/AppShell.tsx`
- Modify: `openapi-editor/src/components/layout/Topbar.tsx`
- Modify: `openapi-editor/src/App.test.tsx`
- Modify: `openapi-editor/src/styles/components.css`

**Interfaces:**
- Consumes: Task 11의 `useWorkspace`, Task 3의 tree·Pointer 위치.
- Produces: 조절 가능한 22/39/39 패널, 구조·진단 탐색기, YAML·JSON Monaco 편집기.

- [ ] **Step 1: 탐색기와 편집기 실패 테스트 작성**

`DocumentNavigator.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import DocumentNavigator from './DocumentNavigator';

it('selects an operation pointer', async () => {
  const onSelect = vi.fn();
  render(<DocumentNavigator tree={[{ id: 'paths', label: 'Paths', pointer: '/paths', children: [{ id: 'get', label: 'GET', pointer: '/paths/~1pets/get', children: [] }] }]} diagnostics={[]} onSelect={onSelect} />);
  await userEvent.click(screen.getByRole('button', { name: 'GET' }));
  expect(onSelect).toHaveBeenCalledWith('/paths/~1pets/get');
});
```

`DocumentEditor.test.tsx`는 `@monaco-editor/react`를 textarea로 mock하고 `language="yaml"`, edit callback, `readOnly` 후보 탭, marker·selection API 호출을 검증한다.

- [ ] **Step 2: 실패 확인**

```bash
npm run test -- src/components/navigator src/components/editor
```

Expected: 컴포넌트 부재로 FAIL.

- [ ] **Step 3: DocumentNavigator 구현**

```tsx
import { useState } from 'react';
import type { Diagnostic } from '../../domain/document';
import type { DocumentTreeNode } from '../../lib/navigation/document-tree';

interface Props {
  tree: DocumentTreeNode[]; diagnostics: Diagnostic[]; onSelect: (pointer: string) => void;
  activeTab?: 'structure' | 'diagnostics'; onTabChange?: (tab: 'structure' | 'diagnostics') => void;
}
export default function DocumentNavigator({ tree, diagnostics, onSelect, activeTab, onTabChange }: Props) {
  const [internalTab, setInternalTab] = useState<'structure' | 'diagnostics'>('structure');
  const tab = activeTab ?? internalTab;
  const changeTab = (next: 'structure' | 'diagnostics'): void => { setInternalTab(next); onTabChange?.(next); };
  return (
    <aside aria-label="문서 탐색기" className="navigator-panel">
      <div role="tablist" aria-label="탐색기 보기">
        <button type="button" role="tab" aria-selected={tab === 'structure'} onClick={() => changeTab('structure')}>구조</button>
        <button type="button" role="tab" aria-selected={tab === 'diagnostics'} onClick={() => changeTab('diagnostics')}>진단 {diagnostics.length}</button>
      </div>
      {tab === 'structure' ? (
        <nav aria-label="OpenAPI 구조">{tree.map((node) => <TreeNode key={node.id} node={node} onSelect={onSelect} />)}</nav>
      ) : (
        <ul className="diagnostic-list">
          {diagnostics.map((diagnostic) => (
            <li key={diagnostic.id}>
              <button type="button" onClick={() => onSelect(diagnostic.sourcePointer)}>
                <strong>{diagnostic.severity.toUpperCase()} {diagnostic.code}</strong>
                <span>{diagnostic.message}</span>
                <code>{diagnostic.sourcePointer || '/'}</code>
              </button>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}

function TreeNode({ node, onSelect }: { node: DocumentTreeNode; onSelect: (pointer: string) => void }) {
  return <div><button type="button" onClick={() => onSelect(node.pointer)}>{node.label}</button><div className="tree-children">{node.children.map((child) => <TreeNode key={child.id} node={child} onSelect={onSelect} />)}</div></div>;
}
```

- [ ] **Step 4: Monaco DocumentEditor 구현**

`DocumentEditor` props를 다음으로 고정한다.

```tsx
import Editor, { useMonaco, type OnMount } from '@monaco-editor/react';
import { useEffect, useRef } from 'react';
import type { editor } from 'monaco-editor';
import type { Diagnostic, SourceLocation } from '../../domain/document';
import type { Theme } from '../../theme';

interface DocumentEditorProps {
  value: string; format: 'yaml' | 'json'; readOnly: boolean;
  diagnostics: Diagnostic[]; selectedLocation?: SourceLocation; theme: Theme;
  onChange: (value: string) => void;
}

export default function DocumentEditor({ value, format, readOnly, diagnostics, selectedLocation, theme, onChange }: DocumentEditorProps) {
  const monaco = useMonaco();
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const handleMount: OnMount = (instance) => { editorRef.current = instance; };

  useEffect(() => {
    const instance = editorRef.current;
    const model = instance?.getModel();
    if (!instance || !model || !monaco) return;
    monaco.editor.setModelMarkers(model, 'openapi-studio', diagnostics.flatMap((diagnostic) => diagnostic.location ? [{
      startLineNumber: diagnostic.location.startLine,
      startColumn: diagnostic.location.startColumn,
      endLineNumber: diagnostic.location.endLine,
      endColumn: diagnostic.location.endColumn,
      message: `[${diagnostic.code}] ${diagnostic.message}`,
      severity: diagnostic.severity === 'error' ? monaco.MarkerSeverity.Error : diagnostic.severity === 'warning' ? monaco.MarkerSeverity.Warning : monaco.MarkerSeverity.Info,
      code: diagnostic.code,
    }] : []));
  }, [diagnostics, monaco]);

  useEffect(() => {
    const instance = editorRef.current;
    if (!instance || !selectedLocation) return;
    instance.setSelection({
      startLineNumber: selectedLocation.startLine,
      startColumn: selectedLocation.startColumn,
      endLineNumber: selectedLocation.endLine,
      endColumn: selectedLocation.endColumn,
    });
    instance.revealLineInCenter(selectedLocation.startLine);
    instance.focus();
  }, [selectedLocation]);

  return (
    <section aria-label="문서 편집기" className="editor-panel workspace-panel">
      <Editor
        height="100%"
        language={format}
        theme={theme === 'dark' ? 'vs-dark' : 'light'}
        value={value}
        onChange={(next) => onChange(next ?? '')}
        onMount={handleMount}
        options={{ readOnly, minimap: { enabled: false }, automaticLayout: true, scrollBeyondLastLine: false }}
      />
    </section>
  );
}
```

- [ ] **Step 5: 조절 가능한 패널과 Workspace 구현**

`ResizablePanels.tsx`:

```tsx
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';

const DEFAULT_WIDTHS: readonly [number, number, number] = [22, 39, 39];
function restoreWidths(): [number, number, number] {
  try {
    const value = JSON.parse(localStorage.getItem('openapi-studio:panels') ?? 'null');
    if (Array.isArray(value) && value.length === 3 && value.every((item) => typeof item === 'number') && value[0] >= 15 && value[1] >= 30 && value[2] >= 30) return value;
  } catch { return [...DEFAULT_WIDTHS]; }
  return [...DEFAULT_WIDTHS];
}

export default function ResizablePanels({ children }: { children: readonly [ReactNode, ReactNode, ReactNode] }) {
  const root = useRef<HTMLDivElement>(null);
  const [widths, setWidths] = useState<[number, number, number]>(restoreWidths);
  const [dragging, setDragging] = useState<0 | 1 | null>(null);
  const move = (index: 0 | 1, delta: number): void => setWidths((current) => {
    const next: [number, number, number] = [...current];
    if (index === 0) {
      const total = current[0] + current[1];
      next[0] = Math.min(total - 30, Math.max(15, current[0] + delta));
      next[1] = total - next[0];
    } else {
      const total = current[1] + current[2];
      next[1] = Math.min(total - 30, Math.max(30, current[1] + delta));
      next[2] = total - next[1];
    }
    return next;
  });
  useEffect(() => {
    if (dragging === null) return;
    const onMove = (event: PointerEvent): void => {
      const bounds = root.current?.getBoundingClientRect();
      if (!bounds) return;
      const cursor = ((event.clientX - bounds.left) / bounds.width) * 100;
      const divider = dragging === 0 ? widths[0] : widths[0] + widths[1];
      move(dragging, cursor - divider);
    };
    const stop = (): void => setDragging(null);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', stop, { once: true });
    return () => { window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', stop); };
  }, [dragging, widths]);
  useEffect(() => { try { localStorage.setItem('openapi-studio:panels', JSON.stringify(widths)); } catch {} }, [widths]);
  const style = { '--panel-left': `${widths[0]}%`, '--panel-center': `${widths[1]}%`, '--panel-right': `${widths[2]}%` } as CSSProperties;
  return (
    <div ref={root} className="resizable-panels" style={style}>
      {children[0]}
      <div role="separator" aria-label="탐색기와 편집기 크기 조절" aria-orientation="vertical" tabIndex={0} onPointerDown={() => setDragging(0)} onKeyDown={(event) => { if (event.key === 'ArrowLeft') move(0, -2); if (event.key === 'ArrowRight') move(0, 2); }} />
      {children[1]}
      <div role="separator" aria-label="편집기와 미리보기 크기 조절" aria-orientation="vertical" tabIndex={0} onPointerDown={() => setDragging(1)} onKeyDown={(event) => { if (event.key === 'ArrowLeft') move(1, -2); if (event.key === 'ArrowRight') move(1, 2); }} />
      {children[2]}
    </div>
  );
}
```

`Workspace.tsx`는 다음과 같이 tree, editor, preview placeholder를 조립한다. Task 13에서 placeholder를 실제 preview와 review로 교체한다.

```tsx
import { useEffect, useMemo, useState } from 'react';
import { useWorkspace } from '../../hooks/useWorkspace';
import { buildDocumentTree } from '../../lib/navigation/document-tree';
import type { SourceLocation, SpecFamily } from '../../domain/document';
import type { Theme } from '../../theme';
import DocumentEditor from '../editor/DocumentEditor';
import DocumentNavigator from '../navigator/DocumentNavigator';
import ResizablePanels from './ResizablePanels';
import Topbar from './Topbar';

const TARGETS: SpecFamily[] = ['swagger-2.0', 'openapi-3.0', 'openapi-3.1'];
export default function Workspace({ theme, onToggleTheme }: { theme: Theme; onToggleTheme: () => void }) {
  const { state, actions } = useWorkspace();
  const [target, setTarget] = useState<SpecFamily>('openapi-3.1');
  const [selectedLocation, setSelectedLocation] = useState<SourceLocation>();
  const analysisDiagnostics = state.analysis?.diagnostics ?? [];
  const diagnostics = [...state.notifications, ...analysisDiagnostics];
  const hasErrors = analysisDiagnostics.some(({ severity }) => severity === 'error');
  const currentValid = state.analysis?.document && state.analysis.version ? state.analysis : undefined;
  const active = hasErrors ? state.lastValid : currentValid ?? state.lastValid;
  const tree = useMemo(() => active?.document && active.version ? buildDocumentTree(active.document, active.version) : [], [active]);
  useEffect(() => {
    if (state.version === target) setTarget(TARGETS.find((candidate) => candidate !== state.version) ?? 'openapi-3.1');
  }, [state.version, target]);
  const selectPointer = (pointer: string): void => setSelectedLocation(state.analysis?.pointerLocations.get(pointer) ?? state.lastValid?.pointerLocations.get(pointer));
  return (
    <div className="workspace-root">
      <Topbar
        filename={state.filename} format={state.format} sourceVersion={state.version} targetVersion={target}
        canConvert={state.status === 'valid' && state.version !== target} canChangeFormat={state.status === 'valid'}
        canDownload={hasErrors ? { yaml: state.format === 'yaml', json: state.format === 'json' } : { yaml: Boolean(active?.document), json: Boolean(active?.document) }} theme={theme}
        onUpload={(file) => { void actions.openFile(file); }} onFormatChange={actions.changeDocumentFormat}
        onTargetChange={setTarget} onConvert={() => actions.convert(target)} onDownload={actions.download} onToggleTheme={onToggleTheme}
      />
      <main className="workspace-shell">
        <ResizablePanels>
          <DocumentNavigator tree={tree} diagnostics={diagnostics} onSelect={selectPointer} />
          <DocumentEditor value={state.raw} format={state.format} readOnly={false} diagnostics={diagnostics} selectedLocation={selectedLocation} theme={theme} onChange={actions.edit} />
          <section aria-label="API 미리보기" className="workspace-panel preview-panel">
            {active?.document ? <p>{hasErrors ? '현재 편집 내용과 다름' : 'API 미리보기 준비됨'}</p> : <p>유효한 문서를 입력하면 미리보기가 표시됩니다.</p>}
          </section>
        </ResizablePanels>
      </main>
    </div>
  );
}
```

`AppShell.tsx`의 panel placeholder를 제거하고 `<Workspace theme={theme} onToggleTheme={toggle} />`만 렌더링한다. filename과 canonical version label은 Topbar에, error·warning 수는 탐색기 tab label에 표시한다.

`components.css`의 3분할 규칙을 다음으로 바꾼다.

```css
.workspace-shell { min-height: calc(100vh - 56px); }
.resizable-panels {
  height: calc(100vh - 56px);
  display: grid;
  grid-template-columns: minmax(0, var(--panel-left)) 6px minmax(0, var(--panel-center)) 6px minmax(0, var(--panel-right));
  overflow: hidden;
}
.resizable-panels > [role="separator"] { cursor: col-resize; background: var(--color-border); }
.resizable-panels > [role="separator"]:focus-visible { outline: 2px solid var(--color-primary); outline-offset: -2px; }
.workspace-panel, .navigator-panel { min-width: 0; min-height: 0; overflow: auto; }
.editor-panel { padding: 0; }
```

- [ ] **Step 6: Topbar 액션 연결**

`Topbar.tsx`를 다음으로 교체한다.

```tsx
import { useRef } from 'react';
import type { DocumentFormat, SpecFamily } from '../../domain/document';
import type { Theme } from '../../theme';

interface TopbarProps {
  filename: string; format: DocumentFormat; sourceVersion?: SpecFamily; targetVersion: SpecFamily;
  canConvert: boolean; canChangeFormat: boolean; canDownload: Record<DocumentFormat, boolean>; theme: Theme;
  onUpload: (file: File) => void; onFormatChange: (format: DocumentFormat) => void; onTargetChange: (target: SpecFamily) => void;
  onConvert: () => void; onDownload: (format: DocumentFormat) => void; onToggleTheme: () => void;
}

const VERSION_LABEL: Record<SpecFamily, string> = {
  'swagger-2.0': 'Swagger 2.0', 'openapi-3.0': 'OpenAPI 3.0.4', 'openapi-3.1': 'OpenAPI 3.1.2',
};

export default function Topbar(props: TopbarProps) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <header className="topbar">
      <div><h1>OpenAPI Studio</h1><span>{props.filename} · {props.sourceVersion ? VERSION_LABEL[props.sourceVersion] : '버전 미감지'}</span></div>
      <div className="topbar-actions">
        <input ref={input} hidden type="file" accept=".yaml,.yml,.json" aria-label="파일 선택" onChange={(event) => { const file = event.currentTarget.files?.[0]; if (file) props.onUpload(file); event.currentTarget.value = ''; }} />
        <button type="button" aria-label="파일 업로드" onClick={() => input.current?.click()}>파일 업로드</button>
        <label>편집 포맷<select aria-label="편집 포맷" value={props.format} disabled={!props.canChangeFormat} onChange={(event) => props.onFormatChange(event.target.value as DocumentFormat)}><option value="yaml">YAML</option><option value="json">JSON</option></select></label>
        <label>대상 버전<select aria-label="대상 버전" value={props.targetVersion} onChange={(event) => props.onTargetChange(event.target.value as SpecFamily)}>{Object.entries(VERSION_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <button type="button" aria-label="변환" disabled={!props.canConvert} onClick={props.onConvert}>변환</button>
        <button type="button" aria-label="YAML 다운로드" disabled={!props.canDownload.yaml} onClick={() => props.onDownload('yaml')}>YAML 다운로드</button>
        <button type="button" aria-label="JSON 다운로드" disabled={!props.canDownload.json} onClick={() => props.onDownload('json')}>JSON 다운로드</button>
        <button type="button" aria-label="테마 전환" onClick={props.onToggleTheme}>{props.theme === 'dark' ? '라이트 테마' : '다크 테마'}</button>
      </div>
    </header>
  );
}
```

invalid 상태에서는 `canDownload`가 현재 형식만 true이므로 원문 다운로드만 가능하고 다른 형식 버튼은 disabled다. `App.test.tsx`의 다운로드 assertion은 개별 YAML·JSON 버튼으로 바꾸고, Playwright의 file input selector는 `파일 선택` label을 사용한다.

- [ ] **Step 7: 검증과 커밋**

```bash
npm run test -- src/components src/App.test.tsx
npm run lint
npm run typecheck
git add src/components src/styles/components.css src/App.tsx
git commit -m "feat(openapi-editor): add resizable editor workspace"
```

Expected: 모든 명령 exit 0.

---

### Task 13: 읽기 전용 Swagger UI, stale 상태, 변환 후보 검토

**Files:**
- Create: `openapi-editor/src/components/preview/PreviewErrorBoundary.tsx`
- Create: `openapi-editor/src/components/preview/SwaggerPreview.tsx`
- Create: `openapi-editor/src/components/preview/SwaggerPreview.test.tsx`
- Create: `openapi-editor/src/components/conversion/ConversionReview.tsx`
- Create: `openapi-editor/src/components/conversion/ConversionReview.test.tsx`
- Modify: `openapi-editor/src/components/layout/Workspace.tsx`
- Modify: `openapi-editor/src/components/layout/Topbar.tsx`
- Modify: `openapi-editor/src/styles/components.css`

**Interfaces:**
- Consumes: Task 11 workspace candidate와 Task 12 UI shell.
- Produces: 네트워크 차단 읽기 전용 preview, 원본·후보 검토, 적용·취소·복원 UI.

- [ ] **Step 1: preview 보안 실패 테스트 작성**

```tsx
import { render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import SwaggerPreview from './SwaggerPreview';

vi.mock('swagger-ui-react', () => ({ default: (props: Record<string, unknown>) => <div data-testid="swagger" data-props={JSON.stringify({ supportedSubmitMethods: props.supportedSubmitMethods })} /> }));

it('renders a read-only preview and marks stale content', () => {
  render(<SwaggerPreview document={{ openapi: '3.1.2', info: { title: 'API', version: '1' }, paths: {} }} stale />);
  expect(screen.getByText('현재 편집 내용과 다름')).toBeInTheDocument();
  expect(screen.getByTestId('swagger').dataset.props).toContain('supportedSubmitMethods');
});
```

- [ ] **Step 2: SwaggerPreview 구현**

```tsx
import { useMemo } from 'react';
import SwaggerUI from 'swagger-ui-react';
import 'swagger-ui-react/swagger-ui.css';
import type { OpenApiDocument } from '../../domain/document';
import { buildSafeDocument } from '../../lib/validation/safe-document';
import PreviewErrorBoundary from './PreviewErrorBoundary';

export default function SwaggerPreview({ document, stale }: { document?: OpenApiDocument; stale: boolean }) {
  const safeDocument = useMemo(() => document ? buildSafeDocument(document) : undefined, [document]);
  if (!safeDocument) return <section aria-label="API 미리보기"><p>유효한 문서를 입력하면 미리보기가 표시됩니다.</p></section>;
  return (
    <section aria-label="API 미리보기" className="preview-panel">
      {stale && <div role="status" className="stale-banner">현재 편집 내용과 다름</div>}
      <PreviewErrorBoundary>
        <SwaggerUI
          spec={safeDocument}
          supportedSubmitMethods={[]}
          requestInterceptor={() => Promise.reject(new Error('OpenAPI Studio는 외부 요청을 허용하지 않습니다.'))}
        />
      </PreviewErrorBoundary>
    </section>
  );
}
```

`PreviewErrorBoundary.tsx`:

```tsx
import { Component, type ReactNode } from 'react';

export default class PreviewErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError(): { failed: boolean } { return { failed: true }; }
  render(): ReactNode {
    return this.state.failed ? <p role="alert">미리보기를 렌더링하지 못했습니다.</p> : this.props.children;
  }
}
```

- [ ] **Step 3: 변환 검토 실패 테스트 작성**

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import ConversionReview from './ConversionReview';

it('shows loss warnings and applies only valid candidates', async () => {
  const apply = vi.fn();
  render(<ConversionReview candidate={{ targetText: 'swagger: 2.0', targetValid: true, diagnostics: [{ id: 'w', code: 'WEBHOOKS_NOT_SUPPORTED', severity: 'warning', stage: 'convert', message: 'webhooks 제거', sourcePointer: '/webhooks', lossy: true }] }} onApply={apply} onCancel={() => undefined} onSelectPointer={() => undefined} />);
  expect(screen.getByText('/webhooks')).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: '편집기에 적용' }));
  expect(apply).toHaveBeenCalledOnce();
});
```

- [ ] **Step 4: ConversionReview와 Workspace 상태 전환 구현**

`ConversionReview.tsx`:

```tsx
import type { WorkspaceCandidate } from '../../hooks/workspace-reducer';

interface Props {
  candidate: WorkspaceCandidate;
  onApply: () => void;
  onCancel: () => void;
  onSelectPointer: (pointer: string) => void;
}

export default function ConversionReview({ candidate, onApply, onCancel, onSelectPointer }: Props) {
  const diagnostics = candidate.diagnostics ?? [];
  const blocked = candidate.targetValid !== true || diagnostics.some(({ severity }) => severity === 'error');
  return (
    <section aria-label="변환 결과 검토" className="conversion-review">
      <h2>변환 결과 검토</h2>
      <p>{blocked ? '오류를 해결하기 전에는 결과를 적용할 수 없습니다.' : '경고와 변경 위치를 확인한 뒤 적용하세요.'}</p>
      <ul>{diagnostics.map((diagnostic) => (
        <li key={diagnostic.id}>
          <strong>{diagnostic.code}</strong>
          <button type="button" onClick={() => onSelectPointer(diagnostic.sourcePointer)}>{diagnostic.sourcePointer || '/'}</button>
          <span>{diagnostic.message}</span>
          {diagnostic.action && <span>{diagnostic.action}</span>}
        </li>
      ))}</ul>
      <div>
        <button type="button" onClick={onCancel}>취소</button>
        <button type="button" disabled={blocked} onClick={onApply}>편집기에 적용</button>
      </div>
    </section>
  );
}
```

Workspace에 `reviewTab` state를 추가하고 가운데·오른쪽 panel을 다음 값으로 교체한다.

```tsx
const [reviewTab, setReviewTab] = useState<'source' | 'target'>('target');
const reviewing = state.status === 'reviewing' && state.candidate !== null;
const editorValue = reviewing && reviewTab === 'target' ? state.candidate.targetText : state.raw;
const editorDiagnostics = reviewing ? state.candidate.diagnostics ?? [] : diagnostics;
const previewDocument = reviewing ? state.candidate.targetDocument : active?.document;

const centerPanel = (
  <div className="editor-stack">
    {reviewing && <div role="tablist" aria-label="변환 문서"><button type="button" role="tab" aria-selected={reviewTab === 'source'} onClick={() => setReviewTab('source')}>원본</button><button type="button" role="tab" aria-selected={reviewTab === 'target'} onClick={() => setReviewTab('target')}>변환 결과</button></div>}
    <DocumentEditor value={editorValue} format={state.format} readOnly={reviewing} diagnostics={editorDiagnostics} selectedLocation={selectedLocation} theme={theme} onChange={actions.edit} />
  </div>
);

const rightPanel = (
  <div className="preview-stack">
    {reviewing && <ConversionReview candidate={state.candidate} onApply={actions.applyCandidate} onCancel={actions.cancelCandidate} onSelectPointer={(pointer) => { setReviewTab('source'); selectPointer(pointer); }} />}
    <SwaggerPreview document={previewDocument} stale={!reviewing && hasErrors && Boolean(state.lastValid)} />
  </div>
);
```

`ResizablePanels`의 두 번째·세 번째 child를 `centerPanel`, `rightPanel`로 바꾼다. `TopbarProps`에 `canRestore: boolean`, `onRestore(): void`를 추가하고 `state.restoreSnapshot !== null`일 때 다음 버튼을 표시한다.

```tsx
{props.canRestore && <button type="button" onClick={props.onRestore}>원본 복원</button>}
```

Workspace는 `canRestore={state.restoreSnapshot !== null}`, `onRestore={actions.restore}`를 전달한다. 적용은 candidate가 valid일 때만 가능하고 reducer가 적용 직전 원문 하나만 `restoreSnapshot`에 저장한다. 취소는 candidate만 폐기하며 원문과 snapshot을 변경하지 않는다.

- [ ] **Step 5: 검증과 커밋**

```bash
npm run test -- src/components/preview src/components/conversion src/components/layout
npm run lint
npm run typecheck
npm run build
git add src/components/preview src/components/conversion src/components/layout src/styles/components.css
git commit -m "feat(openapi-editor): review conversions with safe previews"
```

Expected: 모든 명령 exit 0.

---

### Task 14: 반응형 UI, 보안 경계, Playwright 핵심 흐름

**Files:**
- Create: `openapi-editor/playwright.config.ts`
- Create: `openapi-editor/e2e/editing.spec.ts`
- Create: `openapi-editor/e2e/conversion.spec.ts`
- Create: `openapi-editor/e2e/security.spec.ts`
- Create: `openapi-editor/e2e/fixtures/swagger2.yaml`
- Create: `openapi-editor/e2e/fixtures/openapi31.json`
- Modify: `openapi-editor/package.json`
- Modify: `openapi-editor/src/components/layout/Workspace.tsx`
- Modify: `openapi-editor/src/styles/components.css`
- Modify: `openapi-editor/index.html`

**Interfaces:**
- Consumes: 완성된 workspace UI.
- Produces: desktop 3분할, tablet 2분할, mobile 탭 UI와 실제 브라우저 회귀 테스트.

- [ ] **Step 1: Playwright 설치와 설정**

```bash
npm install -D @playwright/test
npm pkg set scripts.test:e2e="playwright test"
npx playwright install chromium
```

`playwright.config.ts`:

```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  retries: 0,
  use: { baseURL: 'http://127.0.0.1:4173', trace: 'retain-on-failure' },
  webServer: { command: 'npm run dev -- --host 127.0.0.1 --port 4173', url: 'http://127.0.0.1:4173', reuseExistingServer: false },
  projects: [
    { name: 'desktop-chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile-chromium', use: { ...devices['Pixel 7'] } },
  ],
});
```

- [ ] **Step 2: 편집 E2E 실패 테스트 작성**

`e2e/editing.spec.ts`:

```ts
import { expect, test } from '@playwright/test';

test('auto-detects YAML and keeps the last valid preview on syntax errors', async ({ page, isMobile }) => {
  await page.goto('/');
  await page.getByLabel('파일 선택').setInputFiles('e2e/fixtures/swagger2.yaml');
  await expect(page.getByLabel('편집 포맷')).toHaveValue('yaml');
  await expect(page.getByText('Pets API')).toBeVisible();
  await page.getByLabel('문서 편집기').click();
  await page.keyboard.press('ControlOrMeta+A');
  await page.keyboard.type('swagger: [');
  if (isMobile) await page.getByRole('tablist', { name: '모바일 작업 영역' }).getByRole('tab', { name: '미리보기' }).click();
  await expect(page.getByText('현재 편집 내용과 다름')).toBeVisible();
  await expect(page.getByRole('button', { name: '변환' })).toBeDisabled();
});

test('converts the editor format and downloads the other format', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('파일 선택').setInputFiles('e2e/fixtures/openapi31.json');
  await expect(page.getByLabel('편집 포맷')).toHaveValue('json');
  await page.getByLabel('편집 포맷').selectOption('yaml');
  await expect(page.getByLabel('편집 포맷')).toHaveValue('yaml');
  const json = page.waitForEvent('download');
  await page.getByRole('button', { name: 'JSON 다운로드' }).click();
  expect((await json).suggestedFilename()).toBe('openapi31.json');
});
```

- [ ] **Step 3: 변환 E2E 실패 테스트 작성**

`e2e/conversion.spec.ts`는 다음 두 흐름을 구현한다.

```ts
import { expect, test } from '@playwright/test';

test('reviews and applies Swagger 2 to OpenAPI 3.1', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('파일 선택').setInputFiles('e2e/fixtures/swagger2.yaml');
  await page.getByLabel('대상 버전').selectOption('openapi-3.1');
  await page.getByRole('button', { name: '변환' }).click();
  await expect(page.getByRole('heading', { name: '변환 결과 검토' })).toBeVisible();
  await page.getByRole('button', { name: '편집기에 적용' }).click();
  await expect(page.getByText('OpenAPI 3.1.2')).toBeVisible();
});

test('shows lossy warnings before OpenAPI 3.1 to Swagger 2', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('파일 선택').setInputFiles('e2e/fixtures/openapi31.json');
  await page.getByLabel('대상 버전').selectOption('swagger-2.0');
  await page.getByRole('button', { name: '변환' }).click();
  await expect(page.getByText('WEBHOOKS_NOT_SUPPORTED_IN_OAS30')).toBeVisible();
  await page.getByRole('button', { name: '취소' }).click();
  await expect(page.getByText('OpenAPI 3.1.2')).toBeVisible();
});
```

- [ ] **Step 4: 외부 네트워크 차단 테스트**

`e2e/security.spec.ts`:

```ts
import { expect, test } from '@playwright/test';

test('does not request external refs or enable API submission', async ({ page, isMobile }) => {
  const external: string[] = [];
  page.on('request', (request) => {
    const url = new URL(request.url());
    if ((url.protocol === 'http:' || url.protocol === 'https:') && url.origin !== 'http://127.0.0.1:4173') external.push(request.url());
  });
  await page.goto('/');
  await page.getByLabel('문서 편집기').click();
  await page.keyboard.press('ControlOrMeta+A');
  await page.keyboard.insertText('openapi: 3.1.2\ninfo: { title: API, version: "1" }\npaths: {}\ncomponents:\n  schemas:\n    Pet:\n      $ref: https://example.com/pet.yaml#/Pet\n');
  if (isMobile) await page.getByRole('tablist', { name: '모바일 작업 영역' }).getByRole('tab', { name: /진단/ }).click();
  else await page.getByRole('tablist', { name: '탐색기 보기' }).getByRole('tab', { name: /진단/ }).click();
  await expect(page.getByText('EXTERNAL_REF_NOT_RESOLVED')).toBeVisible();
  await page.getByLabel('대상 버전').selectOption('openapi-3.0');
  await page.getByRole('button', { name: '변환' }).click();
  await expect(page.getByRole('heading', { name: '변환 결과 검토' })).toBeVisible();
  expect(external).toEqual([]);
  await expect(page.getByRole('button', { name: 'Try it out' })).toHaveCount(0);
});
```

- [ ] **Step 5: 반응형 탭과 CSP·FOUC 설정**

Workspace에 mobile tab state와 tablist를 추가하고 `ResizablePanels`의 세 child wrapper에 `data-mobile-visible`을 전달한다.

```tsx
type MobileTab = 'structure' | 'editor' | 'preview' | 'diagnostics';
const [mobileTab, setMobileTab] = useState<MobileTab>('editor');
useEffect(() => { if (reviewing) setMobileTab('preview'); }, [reviewing]);

<div className="mobile-workspace-tabs" role="tablist" aria-label="모바일 작업 영역">
  {(['structure', 'editor', 'preview', 'diagnostics'] as const).map((tab) => (
    <button key={tab} type="button" role="tab" aria-selected={mobileTab === tab} onClick={() => setMobileTab(tab)}>
      {{ structure: '구조', editor: '편집기', preview: '미리보기', diagnostics: `진단 ${diagnostics.length}` }[tab]}
    </button>
  ))}
</div>

<ResizablePanels>
  <div className="mobile-panel" data-mobile-visible={mobileTab === 'structure' || mobileTab === 'diagnostics'}>
    <DocumentNavigator tree={tree} diagnostics={diagnostics} onSelect={selectPointer} activeTab={mobileTab === 'diagnostics' ? 'diagnostics' : 'structure'} onTabChange={(tab) => setMobileTab(tab)} />
  </div>
  <div className="mobile-panel" data-mobile-visible={mobileTab === 'editor'}>{centerPanel}</div>
  <div className="mobile-panel" data-mobile-visible={mobileTab === 'preview'}>{rightPanel}</div>
</ResizablePanels>
```

`components.css`의 breakpoint를 다음으로 완성한다.

```css
.mobile-workspace-tabs { display: none; }
@media (max-width: 1023px) {
  .resizable-panels { grid-template-columns: 1fr 1fr; }
  .resizable-panels > [role="separator"] { display: none; }
  .resizable-panels > .mobile-panel:first-of-type { display: none; }
}
@media (max-width: 767px) {
  .mobile-workspace-tabs { display: flex; overflow-x: auto; }
  .resizable-panels { display: block; height: calc(100vh - 96px); }
  .resizable-panels > .mobile-panel { display: none; height: 100%; }
  .resizable-panels > .mobile-panel[data-mobile-visible="true"] { display: block; }
}
```

기존 Task 12의 중복 breakpoint는 위 블록으로 교체한다. `index.html`의 `<head>` 첫 부분에는 저장된 테마만 읽는 FOUC 방지 스크립트와 다음 CSP meta를 추가한다. CSP의 `'unsafe-inline'`은 이 짧은 초기 테마 스크립트에만 필요하며 API 명세 원문을 읽거나 기록하지 않는다.

```html
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' ws://127.0.0.1:*; worker-src 'self' blob:; object-src 'none'; base-uri 'self'">
<script>
  try {
    const theme = localStorage.getItem('theme');
    if (theme === 'light' || theme === 'dark') document.documentElement.dataset.theme = theme;
  } catch {}
</script>
```

- [ ] **Step 6: 브라우저·보안·크기 검증**

```bash
npm run test
npm run test:e2e
npm run lint
npm run typecheck
npm run build
```

Expected: desktop/mobile Chromium 프로젝트가 모두 PASS하고 외부 request 배열이 비어 있음.

- [ ] **Step 7: 커밋**

```bash
git add package.json package-lock.json playwright.config.ts e2e src/components/layout/Workspace.tsx src/styles/components.css index.html
git commit -m "test(openapi-editor): cover browser editing and conversion flows"
```

---

### Task 15: 문서·Tool Hub 홈 통합과 최종 검증

**Files:**
- Modify: `openapi-editor/AGENTS.md`
- Create: `openapi-editor/README.md`
- Create: `openapi-editor/docs/contributor-guide.md`
- Create: `openapi-editor/public/fonts/toolhub-sans.woff2`
- Create: `openapi-editor/public/fonts/toolhub-sans.LICENSE.txt`
- Modify: `openapi-editor/src/styles/theme.css`
- Modify: `README.md`
- Modify: `docs/contributor-guide.md`
- Modify: `home/src/data/tools.ts`
- Modify: `home/src/data/tools.test.ts`
- Modify: `docs/superpowers/specs/2026-07-21-openapi-editor-design.md`

**Interfaces:**
- Consumes: 완료된 OpenAPI Studio 동작과 검증 결과.
- Produces: 저장소에서 발견 가능한 도구 카드, 실제 구현과 일치하는 문서, 최종 green verification.

- [ ] **Step 1: 홈 metadata 실패 테스트 추가**

`home/src/data/tools.test.ts`에 추가한다.

```ts
it('publishes OpenAPI Studio as coming soon until deployment', () => {
  const tool = tools.find((item) => item.id === 'openapi-editor');
  expect(tool).toMatchObject({ name: 'OpenAPI Studio', status: 'coming-soon', url: null });
  expect(tool?.tags).toEqual(expect.arrayContaining(['OpenAPI', 'Swagger', 'YAML', 'JSON']));
});
```

- [ ] **Step 2: 실패 확인**

```bash
cd home
npm run test -- src/data/tools.test.ts
```

Expected: `openapi-editor` metadata가 없어 FAIL.

- [ ] **Step 3: 홈 카드와 저장소 목록 갱신**

`home/src/data/tools.ts`에 다음 항목을 추가한다.

```ts
{
  id: 'openapi-editor',
  name: 'OpenAPI Studio',
  longDescription: 'YAML·JSON OpenAPI 문서를 편집·검증하고 Swagger 2.0과 OpenAPI 3.0·3.1 사이를 손실 경고와 함께 변환합니다.',
  tags: ['OpenAPI', 'Swagger', 'YAML', 'JSON'],
  url: null,
  github: 'https://github.com/ydj515/tool-hub/tree/main/openapi-editor',
  status: 'coming-soon',
},
```

루트 `README.md` 도구 목록에 같은 범위의 한 줄을 추가하고 `docs/contributor-guide.md` Project-Specific References에 `openapi-editor/docs/contributor-guide.md` 링크를 추가한다.

- [ ] **Step 4: 앱 문서와 로컬 AGENTS 갱신**

Task 1에서 만든 `openapi-editor/AGENTS.md`가 index 역할만 유지하는지 확인하고 다음 최종 내용을 사용한다.

```markdown
# Repository Guidelines

## Purpose
OpenAPI Studio 기여자와 에이전트를 위한 짧은 인덱스다.

## Required Verification
- `npm run test`, `npm run lint`, `npm run typecheck`, `npm run build`, `npm run test:e2e`를 실행한다.
- 변환 규칙 변경에는 여섯 방향 중 영향받는 골든 fixture와 손실 경고 테스트를 추가한다.

## Detailed Reference
- [Contributor guide](docs/contributor-guide.md)
```

`README.md`에는 지원 입력·정규 출력 버전, YAML/JSON 자동 감지, 여섯 변환 방향, 외부 `$ref` 제한, `Try it out` 비활성화, 5MB/20MB 제한, 실행·검증 명령을 적는다. `docs/contributor-guide.md`에는 디렉터리 책임, adapter 계약, fixture 3종(input/expected/diagnostics), 경고 code 작성법, 전체 수동 점검을 적는다.

- [ ] **Step 5: 공통 폰트 자산 재사용**

저장소 루트에서 실행한다.

```bash
mkdir -p openapi-editor/public/fonts
cp home/public/fonts/toolhub-sans.woff2 openapi-editor/public/fonts/toolhub-sans.woff2
cp home/public/fonts/toolhub-sans.LICENSE.txt openapi-editor/public/fonts/toolhub-sans.LICENSE.txt
```

`theme.css`에 `@font-face`를 추가하고 `--font-sans` 첫 값을 `"ToolHub Sans"`로 바꾼다.

- [ ] **Step 6: 설계 문서 상태 동기화**

`docs/superpowers/specs/2026-07-21-openapi-editor-design.md`의 상태를 `구현 완료`로 바꾸고, 완료 기준 아래에 실행한 검증 명령과 결과를 기록한다. 실제로 통과하지 않은 명령은 완료로 기록하지 않는다.

- [ ] **Step 7: OpenAPI Studio 전체 검증**

```bash
cd openapi-editor
npm run test
npm run lint
npm run typecheck
npm run build
npm run test:e2e
```

Expected: 모든 명령 exit 0. 여섯 변환 방향과 desktop/mobile E2E가 PASS.

- [ ] **Step 8: Home 전체 검증**

```bash
cd home
npm run test
npm run lint
npm run typecheck
npm run build
```

Expected: 모든 명령 exit 0. OpenAPI Studio 카드는 coming-soon이고 live URL 요구 테스트를 위반하지 않음.

- [ ] **Step 9: 문서·보안 최종 점검**

저장소 루트에서 실행한다.

```bash
rg -n "OpenAPI Studio|openapi-editor" README.md docs/contributor-guide.md home/src/data/tools.ts openapi-editor/README.md openapi-editor/docs/contributor-guide.md
rg -n "Try it out|외부.*ref|3.0.4|3.1.2|20MB" openapi-editor/README.md docs/superpowers/specs/2026-07-21-openapi-editor-design.md
git diff --check
git status --short
```

Expected: 문서와 metadata 경로가 모두 검색되고 whitespace 오류가 없으며 `.superpowers/` 외 예상하지 못한 파일이 없음.

- [ ] **Step 10: 최종 커밋**

```bash
git add README.md docs/contributor-guide.md docs/superpowers/specs/2026-07-21-openapi-editor-design.md home/src/data/tools.ts home/src/data/tools.test.ts openapi-editor/AGENTS.md openapi-editor/README.md openapi-editor/docs openapi-editor/public/fonts openapi-editor/src/styles/theme.css
git commit -m "docs(openapi-editor): document and register OpenAPI Studio"
```

---


## 최종 완료 조건

- Task 1~15의 체크박스가 모두 완료되어 있다.
- OpenAPI Studio의 `test`, `lint`, `typecheck`, `build`, `test:e2e`가 마지막 실행에서 모두 통과했다.
- Home의 `test`, `lint`, `typecheck`, `build`가 마지막 실행에서 모두 통과했다.
- Swagger 2.0, OpenAPI 3.0.x, 3.1.x 여섯 변환 방향의 골든 fixture가 존재한다.
- YAML·JSON 자동 감지가 파일 업로드와 빈 편집기 붙여넣기에서 동작한다.
- 외부 `$ref` 요청과 Swagger UI API submit이 브라우저 테스트에서 발생하지 않는다.
- 손실 경고가 JSON Pointer와 함께 표시되고 설명되지 않은 변환 변경은 적용을 차단한다.
- README, 홈 카드, contributor guide, 설계 문서의 상태가 실제 구현과 일치한다.

---
