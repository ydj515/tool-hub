# JSON YAML Converter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** React 기반 독립 웹 앱에서 JSON과 YAML을 양방향으로 자동 변환하고, 두 형식의 Pretty와 정확한 문법 오류 위치 안내를 제공한다.

**Architecture:** Vite SPA의 `useConverter`가 300ms debounce와 결과 freshness를 관리하고, React와 무관한 JSON/YAML 도메인 함수가 순서 보존 `DataNode`를 파싱·검증·직렬화한다. Monaco는 편집, marker, 실행 취소만 담당하며 파일과 클립보드 작업은 별도 브라우저 어댑터로 격리한다.

**Tech Stack:** Node.js 24.13.0, React 19.2.x, TypeScript 5.9.x, Vite 8.1.x, Tailwind CSS 4.2.x, Monaco Editor 0.55.x, `@monaco-editor/react` 4.7.x, `jsonc-parser` 3.3.x, `yaml` 2.9.x, Vitest 4.1.x, React Testing Library 16.3.x, Playwright 1.61.x.

## Global Constraints

- 새 앱 경로는 `json-yaml-converter/`이며 기존 도구와 코드를 공유하지 않는 독립 패키지로 유지한다.
- JSON과 YAML 변환, JSON Pretty, YAML Pretty는 모두 브라우저 안에서만 실행한다.
- 입력과 변환 결과를 서버나 `localStorage`에 저장하지 않는다. `localStorage`에는 `theme` 값만 저장할 수 있다.
- 자동 변환 debounce는 정확히 300ms다.
- UTF-8 기준 500KB부터 성능 안내를 표시하고 1MB를 초과하면 변환과 Pretty를 중단한다.
- YAML은 1.2 단일 문서만 허용하고 다중 문서, 비문자열 키, 중복 키, 사용자 정의 tag, 순환 alias를 거부한다.
- JSON은 주석과 trailing comma를 허용하지 않고 중복 키를 거부한다.
- JSON과 YAML 출력은 mapping 순서 유지, 2칸 들여쓰기, 마지막 줄바꿈 하나를 적용한다.
- 첫 번째 차단 오류만 Monaco marker와 `행/열` 한국어 메시지로 표시한다.
- 데스크톱 768px 이상은 양쪽 편집기, 768px 미만은 원본/결과 탭을 사용한다.
- 결과가 오래됐거나 없으면 복사, 다운로드, 방향 전환을 비활성화한다.
- 툴바의 방향 선택기는 항상 활성화하고 현재 원본을 유지한 채 JSON/YAML 해석 방향만 바꾼다.
- 구현 완료 전 새 앱과 `home/`의 `test`, `lint`, `typecheck`, `build`를 모두 통과하고 새 앱의 Playwright E2E도 통과한다.
- 로컬 커밋까지만 수행하며 `git push`와 배포를 실행하지 않는다.

**관련 설계:** `docs/superpowers/specs/2026-07-21-json-yaml-converter-design.md`

---

## 파일 구조와 책임

| 경로 | 책임 |
|---|---|
| `json-yaml-converter/src/lib/data-node.ts` | 순서 보존 JSON 호환 데이터 모델과 공통 결과 타입 |
| `json-yaml-converter/src/lib/diagnostics.ts` | offset/행/열 계산과 공통 진단 생성 |
| `json-yaml-converter/src/lib/size.ts` | UTF-8 바이트 계산과 500KB/1MB 경계 판정 |
| `json-yaml-converter/src/lib/json.ts` | 엄격한 JSON 파싱, 중복 키 탐지, Pretty, 직렬화 |
| `json-yaml-converter/src/lib/yaml.ts` | YAML 1.2 단일 문서 파싱, alias 안전성, Pretty, 직렬화 |
| `json-yaml-converter/src/lib/converter.ts` | 방향별 파서와 직렬화 조합, 예제 데이터 |
| `json-yaml-converter/src/lib/file.ts` | 파일 확장자, 크기, 텍스트 읽기와 다운로드 |
| `json-yaml-converter/src/hooks/useConverter.ts` | debounce, revision, freshness, 상태 전이 |
| `json-yaml-converter/src/editor/setupMonaco.ts` | 로컬 Monaco worker와 YAML tokenizer 등록 |
| `json-yaml-converter/src/components/editor/CodeEditor.tsx` | Monaco 래퍼, marker, 진단 포커스, Pretty 편집 |
| `json-yaml-converter/src/components/converter/*` | 툴바, 패널, 상태 표시, 반응형 workspace |
| `json-yaml-converter/src/pages/ConverterPage.tsx` | 훅과 컴포넌트 조합, 파일·클립보드 이벤트 |
| `json-yaml-converter/src/styles/*` | 테마, 기본 규칙, 반응형 converter UI |
| `json-yaml-converter/e2e/*` | 실제 Monaco와 데스크톱·모바일 흐름 검증 |
| `home/src/data/tools.ts` | Tool Hub 카드 등록 |

## 복잡도 목표

- 입력 크기를 `n`, 생성 출력 크기를 `m`, 최대 중첩 깊이를 `d`라고 할 때 파싱과 검증은 시간 `O(n)`, 직렬화와 Pretty는 시간 `O(n + m)`을 사용한다. 출력 이스케이프와 들여쓰기로 `m`이 `n`보다 커질 수 있으므로 입력만 기준으로 직렬화/Pretty를 `O(n)`이라고 보장할 수 없다.
- 파싱 트리와 결과 문자열을 포함한 전체 공간은 `O(n + m)`이며, 재귀 보조 공간은 `O(d)`이다.
- 줄 시작 offset 생성은 시간 `O(n)`, 줄 수를 `m`이라고 할 때 공간 `O(m)`을 사용한다.
- offset의 행·열 조회는 정렬된 줄 시작 배열에서 이진 탐색해 `O(log m)`으로 처리한다.
- React 상태 전이는 `O(1)`이며 실제 파싱·검증은 300ms debounce 뒤에만 `O(n)`으로, 직렬화·Pretty는 `O(n + m)`으로 실행한다.
- 테스트 fixture 전체 크기의 합을 `N`이라고 할 때 도메인 테스트의 총 파싱 작업은 `O(N)`이다.

> 주의사항: Monaco는 일반 textarea보다 초기 번들 비용이 크므로 로컬 worker chunk로 분리하고, 1MB 제한을 넘은 입력은 편집만 허용한다. YAML 값 정규화는 주석과 anchor 표현을 의도적으로 제거하며, JavaScript `number` 정밀도를 넘어서는 수치의 완전 보존은 초기 범위에 포함하지 않는다.

모든 명령은 별도 표기가 없으면 저장소 루트 `/Users/dongjin/dev/project/tool-hub`에서 실행한다.

---

### Task 1: Vite React 프로젝트와 테마 셸 구축

**Files:**
- Create: `json-yaml-converter/.gitignore`
- Create: `json-yaml-converter/package.json`
- Create: `json-yaml-converter/package-lock.json` (`npm install` 생성)
- Create: `json-yaml-converter/mise.toml`
- Create: `json-yaml-converter/index.html`
- Create: `json-yaml-converter/tsconfig.json`
- Create: `json-yaml-converter/tsconfig.app.json`
- Create: `json-yaml-converter/tsconfig.node.json`
- Create: `json-yaml-converter/eslint.config.js`
- Create: `json-yaml-converter/vite.config.ts`
- Create: `json-yaml-converter/vitest.config.ts`
- Create: `json-yaml-converter/playwright.config.ts`
- Create: `json-yaml-converter/src/main.tsx`
- Create: `json-yaml-converter/src/App.tsx`
- Create: `json-yaml-converter/src/App.test.tsx`
- Create: `json-yaml-converter/src/theme.ts`
- Create: `json-yaml-converter/src/theme.test.ts`
- Create: `json-yaml-converter/src/hooks/useTheme.ts`
- Create: `json-yaml-converter/src/components/layout/Header.tsx`
- Create: `json-yaml-converter/src/components/layout/Layout.tsx`
- Create: `json-yaml-converter/src/test/setup.ts`
- Create: `json-yaml-converter/src/index.css`
- Create: `json-yaml-converter/src/styles/theme.css`
- Create: `json-yaml-converter/src/styles/base.css`
- Create: `json-yaml-converter/src/styles/components.css`
- Create: `json-yaml-converter/public/fonts/toolhub-sans.woff2`
- Create: `json-yaml-converter/public/fonts/toolhub-sans.LICENSE.txt`
- Modify: `.gitignore`

**Interfaces:**
- Consumes: 저장소의 Vite 앱 구조와 `data-theme` 규칙.
- Produces: `resolveInitialTheme(): Theme`, `useTheme(): { theme: Theme; toggle(): void }`, 실행 가능한 React 앱과 공통 검증 스크립트.

- [ ] **Step 1: 프로젝트 메타데이터와 의존성을 고정한다**

`json-yaml-converter/package.json`을 다음 내용으로 생성한다.

```json
{
  "name": "json-yaml-converter",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "lint": "eslint .",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc -b --pretty false",
    "test:e2e": "playwright test",
    "preview": "vite preview"
  },
  "dependencies": {
    "@monaco-editor/react": "^4.7.0",
    "@tailwindcss/vite": "^4.2.4",
    "jsonc-parser": "^3.3.1",
    "lucide-react": "^0.575.0",
    "monaco-editor": "^0.55.1",
    "react": "^19.2.7",
    "react-dom": "^19.2.7",
    "tailwindcss": "^4.2.4",
    "yaml": "^2.9.0"
  },
  "devDependencies": {
    "@eslint/js": "^9.39.1",
    "@playwright/test": "^1.61.1",
    "@testing-library/jest-dom": "^6.9.1",
    "@testing-library/react": "^16.3.2",
    "@testing-library/user-event": "^14.6.1",
    "@types/node": "^24.10.1",
    "@types/react": "^19.2.7",
    "@types/react-dom": "^19.2.3",
    "@vitejs/plugin-react": "^6.0.1",
    "eslint": "^9.39.1",
    "eslint-plugin-react-hooks": "^7.0.1",
    "eslint-plugin-react-refresh": "^0.4.24",
    "globals": "^16.5.0",
    "jsdom": "^29.1.1",
    "typescript": "~5.9.3",
    "typescript-eslint": "^8.48.0",
    "vite": "^8.1.5",
    "vitest": "^4.1.5"
  }
}
```

`json-yaml-converter/`에서 다음을 실행한다.

```bash
npm install
```

기대: `package-lock.json`이 생성되고 `npm ls --depth=0`이 exit code 0을 반환한다.

`mise.toml`은 다음 내용으로 생성한다.

```toml
[tools]
node = "24.13.0"
```

- [ ] **Step 2: TypeScript, Vite, Vitest, ESLint, Playwright 설정을 생성한다**

`tsconfig.json`:

```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" }
  ]
}
```

`tsconfig.app.json`:

```json
{
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.app.tsbuildinfo",
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "types": ["vite/client"],
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "erasableSyntaxOnly": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedSideEffectImports": true
  },
  "include": ["src"]
}
```

`tsconfig.node.json`:

```json
{
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.node.tsbuildinfo",
    "target": "ES2023",
    "lib": ["ES2023"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "moduleDetection": "force",
    "noEmit": true,
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "erasableSyntaxOnly": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedSideEffectImports": true
  },
  "include": ["vite.config.ts", "vitest.config.ts", "playwright.config.ts", "e2e/**/*.ts"]
}
```

`vite.config.ts`:

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
});
```

`vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
});
```

`eslint.config.js`:

```js
import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import { defineConfig, globalIgnores } from 'eslint/config';

export default defineConfig([
  globalIgnores(['dist', 'playwright-report', 'test-results']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2022,
      globals: { ...globals.browser, ...globals.node },
    },
  },
]);
```

`playwright.config.ts`를 다음 내용으로 생성한다.

```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 4173',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
  },
});
```

`json-yaml-converter/.gitignore`는 다음 내용으로 생성한다.

```gitignore
logs
*.log
node_modules
dist
*.local
test-results
playwright-report
.vite
.DS_Store
```

루트 `.gitignore`에는 `.superpowers/` 한 줄을 추가해 브레인스토밍 목업이 커밋에 섞이지 않게 한다.

ToolHub Sans 자산은 저장소에 이미 검증된 파일을 그대로 재사용한다.

```bash
mkdir -p json-yaml-converter/public/fonts
cp sign-maker/public/fonts/toolhub-sans.woff2 json-yaml-converter/public/fonts/toolhub-sans.woff2
cp sign-maker/public/fonts/toolhub-sans.LICENSE.txt json-yaml-converter/public/fonts/toolhub-sans.LICENSE.txt
```

- [ ] **Step 3: 실패하는 테마와 앱 셸 테스트를 작성한다**

`src/theme.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resolveInitialTheme } from './theme';

describe('resolveInitialTheme', () => {
  beforeEach(() => localStorage.clear());

  it('저장된 테마를 시스템 테마보다 우선한다', () => {
    localStorage.setItem('theme', 'light');
    expect(resolveInitialTheme()).toBe('light');
  });

  it('저장값이 없으면 시스템 다크 테마를 따른다', () => {
    vi.mocked(window.matchMedia).mockReturnValueOnce({
      matches: true,
    } as MediaQueryList);
    expect(resolveInitialTheme()).toBe('dark');
  });
});
```

`src/App.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import App from './App';

describe('App shell', () => {
  it('도구 이름과 개인정보 안내를 표시하고 테마를 전환한다', async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(screen.getByRole('heading', { name: 'JSON YAML Converter' })).toBeInTheDocument();
    expect(screen.getByText('입력 내용은 브라우저에서만 처리됩니다.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '테마 전환' }));
    expect(document.documentElement).toHaveAttribute('data-theme', 'light');
  });
});
```

- [ ] **Step 4: 테스트가 실패하는지 확인한다**

```bash
cd json-yaml-converter
npm run test -- src/theme.test.ts src/App.test.tsx
```

기대: `theme.ts`와 `App.tsx` 또는 해당 export가 없어 FAIL.

- [ ] **Step 5: 테마와 최소 앱 셸을 구현한다**

`src/theme.ts`:

```ts
export type Theme = 'light' | 'dark';

export function resolveInitialTheme(): Theme {
  let theme: Theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  try {
    const saved = localStorage.getItem('theme');
    if (saved === 'light' || saved === 'dark') theme = saved;
  } catch {
    return theme;
  }
  return theme;
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
    try { localStorage.setItem('theme', theme); } catch { /* 테마 저장 불가 */ }
  }, [theme]);
  return { theme, toggle: () => setTheme((value) => value === 'light' ? 'dark' : 'light') };
}
```

`src/components/layout/Header.tsx`:

```tsx
import type { Theme } from '../../theme';

interface HeaderProps {
  theme: Theme;
  onToggleTheme(): void;
}

export function Header({ theme, onToggleTheme }: HeaderProps) {
  return (
    <header className="app-header">
      <div>
        <h1 className="app-title">JSON YAML Converter</h1>
        <p className="privacy-note">입력 내용은 브라우저에서만 처리됩니다.</p>
      </div>
      <button className="theme-button" type="button" aria-label="테마 전환" onClick={onToggleTheme}>
        {theme === 'light' ? '다크 테마' : '라이트 테마'}
      </button>
    </header>
  );
}
```

`src/components/layout/Layout.tsx`:

```tsx
import type { ReactNode } from 'react';

export function Layout({ header, children }: { header: ReactNode; children: ReactNode }) {
  return <div className="app-shell">{header}{children}</div>;
}
```

`src/App.tsx`:

```tsx
import { Header } from './components/layout/Header';
import { Layout } from './components/layout/Layout';
import { useTheme } from './hooks/useTheme';

export default function App() {
  const { theme, toggle } = useTheme();
  return (
    <Layout header={<Header theme={theme} onToggleTheme={toggle} />}>
      <main className="app-main" aria-label="변환기 작업 공간" />
    </Layout>
  );
}
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

`index.html`:

```html
<!doctype html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="JSON과 YAML을 양방향으로 변환하고 문법 오류 위치를 확인합니다." />
    <title>JSON YAML Converter</title>
    <script>
      (function () {
        try {
          var t = localStorage.getItem('theme');
          if (t !== 'light' && t !== 'dark') {
            t = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
          }
          document.documentElement.setAttribute('data-theme', t);
        } catch (e) {}
      })();
    </script>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`src/test/setup.ts`는 다음 내용으로 생성한다.

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
  value: vi.fn((query: string) => ({
    matches: query.includes('dark'), media: query, onchange: null,
    addListener: vi.fn(), removeListener: vi.fn(),
    addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn(),
  })),
});
```

`src/index.css`는 아래 import만 포함한다.

```css
@import "tailwindcss";
@import "./styles/theme.css";
@import "./styles/base.css";
@import "./styles/components.css";
```

`src/styles/theme.css`:

```css
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
  --font-sans: "ToolHub Sans", system-ui, sans-serif;
  --bg: #f7f7f8;
  --surface: #ffffff;
  --surface-2: #f1f3f5;
  --line: rgba(112, 115, 124, 0.24);
  --line-subtle: rgba(112, 115, 124, 0.10);
  --text: #171717;
  --muted: rgba(55, 56, 60, 0.66);
  --primary: #3366ff;
  --primary-strong: #005eeb;
  --on-primary: #ffffff;
  --success: #18794e;
  --warning: #a15c00;
  --danger: #d92d3a;
  --danger-surface: rgba(217, 45, 58, 0.08);
  --editor-bg: #ffffff;
  --radius-md: 12px;
  --radius-lg: 16px;
  --shadow-sm: 0 1px 3px rgba(23, 23, 25, 0.08);
}
[data-theme="dark"] {
  color-scheme: dark;
  --bg: #0f0f10;
  --surface: #1b1c1e;
  --surface-2: #212225;
  --line: rgba(174, 176, 182, 0.28);
  --line-subtle: rgba(174, 176, 182, 0.14);
  --text: #f7f7f7;
  --muted: rgba(194, 196, 200, 0.72);
  --primary: #5b84ff;
  --primary-strong: #1a75ff;
  --success: #57c68a;
  --warning: #f0a44b;
  --danger: #e55c6c;
  --danger-surface: rgba(229, 92, 108, 0.12);
  --editor-bg: #1e1e1e;
}
```

`src/styles/base.css`:

```css
*, *::before, *::after { box-sizing: border-box; }
html, body, #root { min-height: 100%; }
html, body { margin: 0; }
body { min-height: 100vh; font-family: var(--font-sans); background: var(--bg); color: var(--text); }
button, input { font: inherit; }
button:disabled { cursor: not-allowed; opacity: 0.5; }
```

`src/styles/components.css`의 초기 내용:

```css
.app-shell { min-height: 100vh; }
.app-header { min-height: 72px; display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 14px 24px; background: var(--surface); border-bottom: 1px solid var(--line-subtle); }
.app-title { margin: 0; font-size: 20px; line-height: 1.2; }
.privacy-note { margin: 4px 0 0; color: var(--muted); font-size: 13px; }
.theme-button { padding: 8px 12px; color: var(--text); background: var(--surface-2); border: 1px solid var(--line); border-radius: var(--radius-md); }
.theme-button:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; }
.app-main { min-height: calc(100vh - 72px); }
```

- [ ] **Step 6: 프로젝트 기반 검증을 실행한다**

```bash
cd json-yaml-converter
npm run test -- src/theme.test.ts src/App.test.tsx
npm run lint
npm run typecheck
npm run build
```

기대: 모든 명령 PASS, Vite가 `dist/`를 생성한다.

- [ ] **Step 7: 기반 작업을 커밋한다**

```bash
git add .gitignore json-yaml-converter
git commit -m "chore(json-yaml-converter): scaffold React app"
```

---

### Task 2: 공통 데이터 모델, 진단 위치, 크기 경계 구현

**Files:**
- Create: `json-yaml-converter/src/lib/data-node.ts`
- Create: `json-yaml-converter/src/lib/diagnostics.ts`
- Create: `json-yaml-converter/src/lib/size.ts`
- Create: `json-yaml-converter/src/lib/diagnostics.test.ts`
- Create: `json-yaml-converter/src/lib/size.test.ts`

**Interfaces:**
- Consumes: 없음.
- Produces: `DataNode`, `OperationResult<T>`, `Diagnostic`, `buildLineStarts`, `positionAt`, `diagnosticAt`, `utf8ByteLength`, `classifySize`, `SIZE_WARNING_BYTES`, `SIZE_LIMIT_BYTES`.

- [ ] **Step 1: 실패하는 위치·크기 테스트를 작성한다**

`src/lib/diagnostics.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { buildLineStarts, diagnosticAt, positionAt } from './diagnostics';

describe('diagnostics', () => {
  it('CRLF와 LF가 섞인 offset을 1-based 행/열로 변환한다', () => {
    const starts = buildLineStarts('a\r\nbc\nd');
    expect(starts).toEqual([0, 3, 6]);
    expect(positionAt(starts, 4)).toEqual({ line: 2, column: 2 });
  });

  it('길이가 0인 오류도 최소 한 글자 범위를 만든다', () => {
    expect(diagnosticAt('json', 'CLOSE_BRACE', '닫는 중괄호가 필요합니다.', '{}', 2, 0))
      .toMatchObject({ startOffset: 2, endOffset: 3, line: 1, column: 3 });
  });
});
```

`src/lib/size.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { classifySize, SIZE_LIMIT_BYTES, SIZE_WARNING_BYTES, utf8ByteLength } from './size';

describe('input size', () => {
  it('한글을 UTF-8 바이트로 계산한다', () => {
    expect(utf8ByteLength('가')).toBe(3);
  });

  it('500KB와 1MB 경계를 분류한다', () => {
    expect(classifySize(SIZE_WARNING_BYTES - 1)).toBe('normal');
    expect(classifySize(SIZE_WARNING_BYTES)).toBe('warning');
    expect(classifySize(SIZE_LIMIT_BYTES)).toBe('warning');
    expect(classifySize(SIZE_LIMIT_BYTES + 1)).toBe('oversized');
  });
});
```

- [ ] **Step 2: 테스트 실패를 확인한다**

```bash
cd json-yaml-converter
npm run test -- src/lib/diagnostics.test.ts src/lib/size.test.ts
```

기대: 대상 모듈이 없어 FAIL.

- [ ] **Step 3: 순서 보존 모델과 공통 결과 타입을 구현한다**

`src/lib/data-node.ts`:

```ts
import type { Diagnostic } from './diagnostics';

export type DataNode =
  | { kind: 'null' }
  | { kind: 'boolean'; value: boolean }
  | { kind: 'number'; value: number }
  | { kind: 'string'; value: string }
  | { kind: 'sequence'; items: DataNode[] }
  | { kind: 'mapping'; entries: Array<{ key: string; value: DataNode }> };

export type OperationResult<T> =
  | { ok: true; value: T }
  | { ok: false; diagnostic: Diagnostic };
```

`src/lib/diagnostics.ts`:

```ts
export type DataFormat = 'json' | 'yaml';

export interface Diagnostic {
  format: DataFormat;
  code: string;
  message: string;
  startOffset: number;
  endOffset: number;
  line: number;
  column: number;
}

export function buildLineStarts(source: string): number[] {
  const starts = [0];
  for (let index = 0; index < source.length; index += 1) {
    if (source[index] === '\n') starts.push(index + 1);
  }
  return starts;
}

export function positionAt(starts: number[], offset: number): { line: number; column: number } {
  let low = 0;
  let high = starts.length - 1;
  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    if (starts[middle] <= offset) low = middle + 1;
    else high = middle - 1;
  }
  const lineIndex = Math.max(0, high);
  return { line: lineIndex + 1, column: offset - starts[lineIndex] + 1 };
}

export function diagnosticAt(
  format: DataFormat,
  code: string,
  message: string,
  source: string,
  offset: number,
  length: number,
): Diagnostic {
  const safeOffset = Math.max(0, Math.min(offset, source.length));
  const { line, column } = positionAt(buildLineStarts(source), safeOffset);
  return {
    format,
    code,
    message,
    startOffset: safeOffset,
    endOffset: safeOffset + Math.max(1, length),
    line,
    column,
  };
}
```

`src/lib/size.ts`:

```ts
export const SIZE_WARNING_BYTES = 500 * 1024;
export const SIZE_LIMIT_BYTES = 1024 * 1024;
export type SizeLevel = 'normal' | 'warning' | 'oversized';

const encoder = new TextEncoder();

export function utf8ByteLength(source: string): number {
  return encoder.encode(source).byteLength;
}

export function classifySize(bytes: number): SizeLevel {
  if (bytes > SIZE_LIMIT_BYTES) return 'oversized';
  if (bytes >= SIZE_WARNING_BYTES) return 'warning';
  return 'normal';
}
```

- [ ] **Step 4: 테스트와 타입 검사를 통과시킨다**

```bash
cd json-yaml-converter
npm run test -- src/lib/diagnostics.test.ts src/lib/size.test.ts
npm run typecheck
```

기대: 모든 테스트 PASS, 타입 오류 없음.

- [ ] **Step 5: 공통 모델을 커밋한다**

```bash
git add json-yaml-converter/src/lib/data-node.ts \
  json-yaml-converter/src/lib/diagnostics.ts \
  json-yaml-converter/src/lib/size.ts \
  json-yaml-converter/src/lib/diagnostics.test.ts \
  json-yaml-converter/src/lib/size.test.ts
git commit -m "feat(json-yaml-converter): add conversion primitives"
```

---

### Task 3: 엄격한 JSON 파싱, 진단, Pretty, 직렬화 구현

**Files:**
- Create: `json-yaml-converter/src/lib/json.ts`
- Create: `json-yaml-converter/src/lib/json.test.ts`

**Interfaces:**
- Consumes: `DataNode`, `OperationResult<T>`, `diagnosticAt`.
- Produces: `parseJson(source): OperationResult<DataNode>`, `stringifyJson(node): string`, `prettyJson(source): OperationResult<string>`.

- [ ] **Step 1: JSON 요구사항을 고정하는 실패 테스트를 작성한다**

`src/lib/json.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { parseJson, prettyJson, stringifyJson } from './json';

describe('JSON domain', () => {
  it.each(['null', 'true', '"text"', '3', '[1,2]'])('루트 값 %s를 허용한다', (source) => {
    expect(parseJson(source).ok).toBe(true);
  });

  it('객체, 배열, 스칼라와 키 순서를 보존한다', () => {
    const parsed = parseJson('{"10":"ten","2":"two","value":[true,null,3]}');
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(stringifyJson(parsed.value)).toBe(
      '{\n  "10": "ten",\n  "2": "two",\n  "value": [\n    true,\n    null,\n    3\n  ]\n}\n',
    );
  });

  it.each([
    ['{"a":1,}', 'PropertyNameExpected'],
    ['{/*x*/"a":1}', 'InvalidCommentToken'],
    ['{"a":1,"a":2}', 'DUPLICATE_KEY'],
  ])('엄격하지 않은 JSON %s를 거부한다', (source, code) => {
    const result = parseJson(source);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.diagnostic.code).toBe(code);
  });

  it('첫 오류의 행과 열을 계산한다', () => {
    const result = parseJson('{\n  "enabled" true\n}');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.diagnostic).toMatchObject({ line: 2, column: 13 });
  });

  it('JSON Pretty를 2칸 들여쓰기와 마지막 줄바꿈으로 만든다', () => {
    expect(prettyJson('{"b":2,"a":1}')).toEqual({
      ok: true,
      value: '{\n  "b": 2,\n  "a": 1\n}\n',
    });
  });
});
```

- [ ] **Step 2: JSON 테스트 실패를 확인한다**

```bash
cd json-yaml-converter
npm run test -- src/lib/json.test.ts
```

기대: `./json` 모듈이 없어 FAIL.

- [ ] **Step 3: JSON parser tree를 `DataNode`로 변환한다**

`src/lib/json.ts`에서 `jsonc-parser`의 `parseTree`, `printParseErrorCode`, `format`, `applyEdits`를 사용한다. parser 옵션은 정확히 다음으로 둔다.

```ts
const JSON_OPTIONS = {
  disallowComments: true,
  allowTrailingComma: false,
  allowEmptyContent: false,
} as const;
```

오류 배열의 첫 항목은 다음 매핑으로 한국어 진단을 만든다.

```ts
const JSON_MESSAGES: Record<string, string> = {
  InvalidSymbol: '사용할 수 없는 문자가 있습니다.',
  InvalidNumberFormat: '숫자 형식이 올바르지 않습니다.',
  PropertyNameExpected: '속성 이름이 필요합니다.',
  ValueExpected: '값이 필요합니다.',
  ColonExpected: '속성 이름 뒤에 콜론이 필요합니다.',
  CommaExpected: '항목 사이에 쉼표가 필요합니다.',
  CloseBraceExpected: '닫는 중괄호가 필요합니다.',
  CloseBracketExpected: '닫는 대괄호가 필요합니다.',
  EndOfFileExpected: '문서 끝에 예상하지 못한 내용이 있습니다.',
  InvalidCommentToken: 'JSON에서는 주석을 사용할 수 없습니다.',
  UnexpectedEndOfComment: '주석이 끝나지 않았습니다.',
  UnexpectedEndOfString: '문자열이 끝나지 않았습니다.',
  UnexpectedEndOfNumber: '숫자가 끝나지 않았습니다.',
  InvalidUnicode: '유니코드 이스케이프가 올바르지 않습니다.',
  InvalidEscapeCharacter: '이스케이프 문자가 올바르지 않습니다.',
  InvalidCharacter: '문자열에 사용할 수 없는 문자가 있습니다.',
};
```

object node의 property 자식을 입력 순서대로 순회하고 `Set<string>`으로 중복 키를 찾는다. 중복이면 property key node의 offset과 length로 `DUPLICATE_KEY` 진단을 반환한다. number node는 `Number.isFinite(node.value)`가 거짓이면 `NON_FINITE_NUMBER`로 거부한다. array와 root scalar도 같은 재귀 함수에서 처리한다.

- [ ] **Step 4: JSON 직렬화와 Pretty를 구현한다**

`stringifyJson`은 `DataNode`를 직접 순회해 mapping entry 순서를 유지하고, 깊이마다 `'  '.repeat(depth)`를 사용한다. 빈 mapping은 `{}`, 빈 sequence는 `[]`로 출력하며 최상위 반환값 끝에는 `\n` 하나를 붙인다.

`prettyJson`은 먼저 `parseJson`으로 검증하고 실패 시 같은 진단을 반환한다. 성공 시 아래 formatting edit을 적용하고 마지막 줄바꿈을 하나로 정규화한다.

```ts
const edits = format(source, undefined, {
  insertSpaces: true,
  tabSize: 2,
  eol: '\n',
});
const formatted = applyEdits(source, edits).replace(/\s*$/, '') + '\n';
return { ok: true, value: formatted };
```

- [ ] **Step 5: JSON 테스트와 회귀 검증을 통과시킨다**

```bash
cd json-yaml-converter
npm run test -- src/lib/json.test.ts src/lib/diagnostics.test.ts
npm run lint
npm run typecheck
```

기대: 모든 명령 PASS.

- [ ] **Step 6: JSON 도메인을 커밋한다**

```bash
git add json-yaml-converter/src/lib/json.ts json-yaml-converter/src/lib/json.test.ts
git commit -m "feat(json-yaml-converter): add strict JSON conversion"
```

---

### Task 4: YAML 1.2 단일 문서 파싱, 안전성, Pretty, 직렬화 구현

**Files:**
- Create: `json-yaml-converter/src/lib/yaml.ts`
- Create: `json-yaml-converter/src/lib/yaml.test.ts`

**Interfaces:**
- Consumes: `DataNode`, `OperationResult<T>`, `diagnosticAt`.
- Produces: `parseYaml(source): OperationResult<DataNode>`, `stringifyYaml(node): string`, `prettyYaml(source): OperationResult<string>`.

- [ ] **Step 1: YAML 요구사항을 고정하는 실패 테스트를 작성한다**

`src/lib/yaml.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { parseYaml, prettyYaml, stringifyYaml } from './yaml';

describe('YAML domain', () => {
  it.each(['null\n', 'true\n', 'text\n', '3\n', '- 1\n- 2\n'])('루트 값 %s를 허용한다', (source) => {
    expect(parseYaml(source).ok).toBe(true);
  });

  it('객체, 배열, 스칼라 루트와 mapping 순서를 보존한다', () => {
    const parsed = parseYaml('"10": ten\n"2": two\nvalue:\n  - true\n  - null\n');
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(stringifyYaml(parsed.value)).toBe('"10": ten\n"2": two\nvalue:\n  - true\n  - null\n');
  });

  it('anchor와 alias를 실제 값으로 확장한다', () => {
    const parsed = parseYaml('base: &base\n  enabled: true\ncopy: *base\n');
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(stringifyYaml(parsed.value)).toContain('copy:\n  enabled: true');
  });

  it.each([
    ['---\na: 1\n---\nb: 2\n', 'MULTIPLE_DOCS'],
    ['? [a, b]\n: value\n', 'NON_STRING_KEY'],
    ['a: 1\na: 2\n', 'DUPLICATE_KEY'],
    ['value: !custom data\n', 'TAG_RESOLVE_FAILED'],
    ['root: &root\n  self: *root\n', 'CYCLIC_ALIAS'],
  ])('%s를 차단 오류로 처리한다', (source, code) => {
    const result = parseYaml(source);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.diagnostic.code).toBe(code);
  });

  it('잘못된 들여쓰기의 첫 행과 열을 반환한다', () => {
    const result = parseYaml('service:\n  name: converter\n enabled: true\n');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.diagnostic.line).toBe(3);
  });

  it('YAML Pretty에서 주석과 anchor 표현을 제거한다', () => {
    const result = prettyYaml('# comment\nbase: &base { enabled: true }\ncopy: *base\n');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).not.toContain('# comment');
    expect(result.value).not.toContain('&base');
    expect(result.value).toContain('copy:\n  enabled: true');
  });

  it('100회를 초과하는 alias 확장을 거부한다', () => {
    const aliases = Array.from({ length: 101 }, () => '  - *base').join('\n');
    const result = parseYaml(`base: &base { enabled: true }\nitems:\n${aliases}\n`);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.diagnostic.code).toBe('ALIAS_LIMIT');
  });

  it.each(['value: .nan\n', 'value: .inf\n', 'value: -.inf\n'])('비유한 숫자 %s를 거부한다', (source) => {
    const result = parseYaml(source);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.diagnostic.code).toBe('NON_FINITE_NUMBER');
  });
});
```

- [ ] **Step 2: YAML 테스트 실패를 확인한다**

```bash
cd json-yaml-converter
npm run test -- src/lib/yaml.test.ts
```

기대: `./yaml` 모듈이 없어 FAIL.

- [ ] **Step 3: YAML 문서 오류를 공통 진단으로 정규화한다**

`parseYaml`은 `LineCounter`와 `parseDocument`를 다음 옵션으로 호출한다.

```ts
const lineCounter = new LineCounter();
const document = parseDocument(source, {
  version: '1.2',
  strict: true,
  uniqueKeys: true,
  stringKeys: true,
  prettyErrors: true,
  logLevel: 'error',
  lineCounter,
});
```

`document.errors[0]`이 있으면 `error.code`, `error.message`, `error.pos[0]`, `error.pos[1] - error.pos[0]`으로 진단을 만든다. 사용자 메시지는 다음 매핑을 우선한다.

```ts
const YAML_MESSAGES: Record<string, string> = {
  BAD_INDENT: '이 위치의 들여쓰기가 올바르지 않습니다.',
  MULTIPLE_DOCS: 'YAML 다중 문서는 지원하지 않습니다.',
  NON_STRING_KEY: 'YAML mapping 키는 문자열이어야 합니다.',
  DUPLICATE_KEY: '같은 mapping 키를 두 번 사용할 수 없습니다.',
  TAG_RESOLVE_FAILED: '지원하지 않는 YAML tag입니다.',
  BAD_ALIAS: 'YAML alias가 올바르지 않습니다.',
  UNEXPECTED_TOKEN: '예상하지 못한 YAML 토큰이 있습니다.',
};
```

매핑되지 않은 메시지는 `error.message.split('\n')[0]`을 사용한다.

- [ ] **Step 4: YAML 값을 순서 보존 `DataNode`로 정규화한다**

오류가 없으면 다음 호출로 alias 제한과 mapping 순서를 유지한다.

```ts
const value = document.toJS({ mapAsMap: true, maxAliasCount: 100 });
```

`unknown` 값을 다음 규칙의 재귀 함수로 변환한다.

```ts
function fromYamlValue(value: unknown, active: WeakSet<object>): OperationResult<DataNode> {
  if (value === null) return { ok: true, value: { kind: 'null' } };
  if (typeof value === 'string') return { ok: true, value: { kind: 'string', value } };
  if (typeof value === 'boolean') return { ok: true, value: { kind: 'boolean', value } };
  if (typeof value === 'number') {
    return Number.isFinite(value)
      ? { ok: true, value: { kind: 'number', value } }
      : failure('NON_FINITE_NUMBER', 'JSON으로 표현할 수 없는 숫자입니다.');
  }
  if (typeof value !== 'object') {
    return failure('UNSUPPORTED_VALUE', 'JSON으로 표현할 수 없는 YAML 값입니다.');
  }
  if (active.has(value)) return failure('CYCLIC_ALIAS', '순환 YAML alias는 지원하지 않습니다.');
  active.add(value);
  try {
    if (Array.isArray(value)) return sequenceFrom(value, active);
    if (value instanceof Map) return mappingFrom(value, active);
    return failure('UNSUPPORTED_VALUE', '지원하지 않는 YAML collection입니다.');
  } finally {
    active.delete(value);
  }
}
```

`mappingFrom`은 key가 문자열인지 검사하고 `Set<string>`으로 중복을 방어한 뒤 Map iteration 순서대로 entry를 만든다. `document.toJS`가 alias 제한 예외를 던지면 `ALIAS_LIMIT` 진단을 문서 시작 위치에 만든다. `failure`는 source와 offset 0을 캡처해 `diagnosticAt('yaml', ...)`을 호출하는 내부 함수다.

- [ ] **Step 5: YAML 직렬화와 Pretty를 구현한다**

`DataNode` mapping은 `Map<string, unknown>`으로 되돌리고 다음 옵션으로 직렬화한다.

```ts
const output = stringify(toYamlValue(node), {
  indent: 2,
  lineWidth: 0,
  sortMapEntries: false,
});
return output.replace(/\s*$/, '') + '\n';
```

`prettyYaml`은 `parseYaml` 성공값을 `stringifyYaml`에 전달한다. 이 경로는 새 값을 직렬화하므로 주석, anchor 이름, alias 표현을 제거한다.

- [ ] **Step 6: YAML 테스트와 전체 도메인 회귀를 통과시킨다**

```bash
cd json-yaml-converter
npm run test -- src/lib/yaml.test.ts src/lib/json.test.ts src/lib/diagnostics.test.ts
npm run lint
npm run typecheck
```

기대: 모든 명령 PASS.

- [ ] **Step 7: YAML 도메인을 커밋한다**

```bash
git add json-yaml-converter/src/lib/yaml.ts json-yaml-converter/src/lib/yaml.test.ts
git commit -m "feat(json-yaml-converter): add YAML conversion"
```

---

### Task 5: 방향별 변환 조합과 파일 어댑터 구현

**Files:**
- Create: `json-yaml-converter/src/lib/converter.ts`
- Create: `json-yaml-converter/src/lib/converter.test.ts`
- Create: `json-yaml-converter/src/lib/file.ts`
- Create: `json-yaml-converter/src/lib/file.test.ts`

**Interfaces:**
- Consumes: `parseJson`, `stringifyJson`, `prettyJson`, `parseYaml`, `stringifyYaml`, `prettyYaml`, `SIZE_LIMIT_BYTES`.
- Produces: `ConverterDirection`, `convertSource`, `prettySource`, `sampleFor`, `FileProblem`, `FileResult<T>`, `directionForFileName`, `readSourceFile`, `downloadResult`.

- [ ] **Step 1: 양방향 변환과 파일 경계의 실패 테스트를 작성한다**

`src/lib/converter.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { convertSource, prettySource, sampleFor } from './converter';

describe('converter', () => {
  it('JSON을 YAML로 변환한다', () => {
    expect(convertSource('{"name":"tool-hub"}', 'json-to-yaml')).toEqual({
      ok: true,
      value: 'name: tool-hub\n',
    });
  });

  it('YAML을 JSON으로 변환한다', () => {
    expect(convertSource('name: tool-hub\n', 'yaml-to-json')).toEqual({
      ok: true,
      value: '{\n  "name": "tool-hub"\n}\n',
    });
  });

  it('현재 방향에 맞는 Pretty와 예제를 제공한다', () => {
    expect(prettySource('{"a":1}', 'json-to-yaml').ok).toBe(true);
    expect(prettySource('a: 1', 'yaml-to-json').ok).toBe(true);
    expect(sampleFor('json-to-yaml')).toContain('"name"');
    expect(sampleFor('yaml-to-json')).toContain('name:');
  });
});
```

`src/lib/file.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { directionForFileName, downloadResult, readSourceFile } from './file';
import { SIZE_LIMIT_BYTES } from './size';

describe('file adapter', () => {
  beforeEach(() => {
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => 'blob:test'),
      revokeObjectURL: vi.fn(),
    });
  });

  it.each([
    ['config.json', 'json-to-yaml'],
    ['config.yaml', 'yaml-to-json'],
    ['config.yml', 'yaml-to-json'],
  ] as const)('%s의 방향을 결정한다', (name, direction) => {
    expect(directionForFileName(name)).toEqual({ ok: true, value: direction });
  });

  it('지원하지 않는 확장자와 1MB 초과 파일을 거부한다', async () => {
    expect(directionForFileName('config.txt').ok).toBe(false);
    const file = new File(['x'], 'large.json');
    Object.defineProperty(file, 'size', { value: SIZE_LIMIT_BYTES + 1 });
    expect((await readSourceFile(file)).ok).toBe(false);
  });

  it('1MB 이하 YAML 파일을 읽고 방향과 원문을 반환한다', async () => {
    const result = await readSourceFile(new File(['name: tool-hub\n'], 'config.yaml'));
    expect(result).toEqual({
      ok: true,
      value: { source: 'name: tool-hub\n', direction: 'yaml-to-json' },
    });
  });

  it('최신 결과를 올바른 이름으로 다운로드한다', () => {
    const click = vi.fn();
    vi.spyOn(document, 'createElement').mockReturnValue({ click } as unknown as HTMLAnchorElement);
    downloadResult('a: 1\n', 'json-to-yaml');
    expect(click).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: 테스트 실패를 확인한다**

```bash
cd json-yaml-converter
npm run test -- src/lib/converter.test.ts src/lib/file.test.ts
```

기대: 대상 모듈이 없어 FAIL.

- [ ] **Step 3: 방향별 변환과 Pretty 조합을 구현한다**

`src/lib/converter.ts`의 공개 API는 다음과 같다.

```ts
import type { OperationResult } from './data-node';
import { parseJson, prettyJson, stringifyJson } from './json';
import { parseYaml, prettyYaml, stringifyYaml } from './yaml';

export type ConverterDirection = 'json-to-yaml' | 'yaml-to-json';

export function convertSource(source: string, direction: ConverterDirection): OperationResult<string> {
  const parsed = direction === 'json-to-yaml' ? parseJson(source) : parseYaml(source);
  if (!parsed.ok) return parsed;
  return {
    ok: true,
    value: direction === 'json-to-yaml' ? stringifyYaml(parsed.value) : stringifyJson(parsed.value),
  };
}

export function prettySource(source: string, direction: ConverterDirection): OperationResult<string> {
  return direction === 'json-to-yaml' ? prettyJson(source) : prettyYaml(source);
}

export function oppositeDirection(direction: ConverterDirection): ConverterDirection {
  return direction === 'json-to-yaml' ? 'yaml-to-json' : 'json-to-yaml';
}

export function sampleFor(direction: ConverterDirection): string {
  return direction === 'json-to-yaml'
    ? '{\n  "name": "tool-hub",\n  "enabled": true\n}\n'
    : 'name: tool-hub\nenabled: true\n';
}
```

- [ ] **Step 4: 파일 읽기와 다운로드를 구현한다**

`src/lib/file.ts`는 확장자를 소문자로 비교한다. 문법 위치가 없는 파일 오류를 Monaco 진단과 섞지 않도록 다음 별도 결과 타입을 사용한다.

```ts
export interface FileProblem {
  code: 'FILE_EXTENSION' | 'FILE_TOO_LARGE' | 'FILE_READ_FAILED';
  message: string;
}

export type FileResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: FileProblem };
```

`directionForFileName(name): FileResult<ConverterDirection>`은 `.json`, `.yaml`, `.yml`만 허용한다.

```ts
export async function readSourceFile(
  file: File,
): Promise<FileResult<{ source: string; direction: ConverterDirection }>> {
  const direction = directionForFileName(file.name);
  if (!direction.ok) return direction;
  if (file.size > SIZE_LIMIT_BYTES) {
    return { ok: false, error: { code: 'FILE_TOO_LARGE', message: '1MB 이하 파일만 열 수 있습니다.' } };
  }
  try {
    return { ok: true, value: { source: await file.text(), direction: direction.value } };
  } catch {
    return { ok: false, error: { code: 'FILE_READ_FAILED', message: '파일을 읽을 수 없습니다.' } };
  }
}
```

`downloadResult`는 direction의 출력 형식을 기준으로 `converted.yaml`/`application/yaml` 또는 `converted.json`/`application/json`을 선택하고 `Blob`, `URL.createObjectURL`, 숨은 anchor click, `URL.revokeObjectURL` 순서로 실행한다.

- [ ] **Step 5: 변환·파일 테스트를 통과시킨다**

```bash
cd json-yaml-converter
npm run test -- src/lib/converter.test.ts src/lib/file.test.ts
npm run lint
npm run typecheck
```

기대: 모든 명령 PASS.

- [ ] **Step 6: 변환 조합과 파일 어댑터를 커밋한다**

```bash
git add json-yaml-converter/src/lib/converter.ts \
  json-yaml-converter/src/lib/converter.test.ts \
  json-yaml-converter/src/lib/file.ts \
  json-yaml-converter/src/lib/file.test.ts
git commit -m "feat(json-yaml-converter): add conversion and file adapters"
```

---

### Task 6: debounce와 오래된 결과를 관리하는 `useConverter` 구현

**Files:**
- Create: `json-yaml-converter/src/hooks/useConverter.ts`
- Create: `json-yaml-converter/src/hooks/useConverter.test.tsx`

**Interfaces:**
- Consumes: `ConverterDirection`, `convertSource`, `oppositeDirection`, `sampleFor`, `classifySize`, `utf8ByteLength`.
- Produces: `ConverterStatus`, `ConverterState`, `useConverter()` actions `setSource`, `selectDirection`, `setDirectionAndSource`, `loadSample`, `clear`, `swap`.

- [ ] **Step 1: 상태 전이의 실패 테스트를 작성한다**

`src/hooks/useConverter.test.tsx`:

```tsx
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SIZE_LIMIT_BYTES } from '../lib/size';
import { useConverter } from './useConverter';

describe('useConverter', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('300ms 뒤 최신 JSON만 YAML로 변환한다', () => {
    const { result } = renderHook(() => useConverter());
    act(() => result.current.setSource('{"a":1}'));
    act(() => result.current.setSource('{"a":2}'));
    expect(result.current.state.status).toBe('scheduled');

    act(() => vi.advanceTimersByTime(299));
    expect(result.current.state.result).toBe('');
    act(() => vi.advanceTimersByTime(1));
    expect(result.current.state).toMatchObject({ status: 'valid', result: 'a: 2\n', resultFresh: true });
  });

  it('오류 시 마지막 성공 결과를 stale로 유지하고 수정 후 복구한다', () => {
    const { result } = renderHook(() => useConverter());
    act(() => result.current.setSource('{"a":1}'));
    act(() => vi.advanceTimersByTime(300));
    act(() => result.current.setSource('{"a" 1}'));
    expect(result.current.state).toMatchObject({ status: 'scheduled', result: 'a: 1\n', resultFresh: false });
    act(() => vi.advanceTimersByTime(300));
    expect(result.current.state).toMatchObject({ status: 'invalid', result: 'a: 1\n', resultFresh: false });
    expect(result.current.state.diagnostic?.line).toBe(1);
  });

  it('빈 입력과 1MB 초과 입력은 변환하지 않는다', () => {
    const { result } = renderHook(() => useConverter());
    act(() => result.current.setSource('   '));
    expect(result.current.state.status).toBe('empty');
    act(() => result.current.setSource('x'.repeat(SIZE_LIMIT_BYTES + 1)));
    expect(result.current.state.status).toBe('oversized');
  });

  it('500KB 입력을 warning으로 분류하면서 변환을 예약한다', () => {
    const { result } = renderHook(() => useConverter());
    act(() => result.current.setSource(' '.repeat(500 * 1024) + 'null'));
    expect(result.current.state).toMatchObject({ status: 'scheduled', sizeLevel: 'warning' });
  });

  it('fresh 결과만 방향 전환하고 새 원본으로 사용한다', () => {
    const { result } = renderHook(() => useConverter());
    act(() => result.current.setSource('{"a":1}'));
    act(() => vi.advanceTimersByTime(300));
    act(() => result.current.swap());
    expect(result.current.state).toMatchObject({ direction: 'yaml-to-json', source: 'a: 1\n' });
  });

  it('결과가 없어도 방향 선택기로 YAML 입력 모드를 선택한다', () => {
    const { result } = renderHook(() => useConverter());
    act(() => result.current.selectDirection('yaml-to-json'));
    expect(result.current.state).toMatchObject({ direction: 'yaml-to-json', source: '', status: 'empty' });
  });
});
```

- [ ] **Step 2: hook 테스트 실패를 확인한다**

```bash
cd json-yaml-converter
npm run test -- src/hooks/useConverter.test.tsx
```

기대: hook 모듈이 없어 FAIL.

- [ ] **Step 3: 상태 타입과 즉시 전이를 구현한다**

공개 상태 타입은 다음과 같다.

```ts
export type ConverterStatus = 'empty' | 'scheduled' | 'valid' | 'invalid' | 'oversized';

export interface ConverterState {
  direction: ConverterDirection;
  source: string;
  result: string;
  status: ConverterStatus;
  diagnostic: Diagnostic | null;
  bytes: number;
  sizeLevel: SizeLevel;
  resultFresh: boolean;
}
```

`setSource`는 revision ref를 증가시키고 UTF-8 크기를 계산한다. 공백만 있으면 result와 diagnostic을 지운 `empty`, 1MB 초과면 기존 result를 유지한 `oversized`, 나머지는 기존 result를 유지한 `scheduled`로 즉시 바꾼다.

- [ ] **Step 4: 300ms 변환 effect와 action을 구현한다**

`useEffect`는 `status !== 'scheduled'`이면 timer를 만들지 않는다. scheduled이면 현재 revision과 direction을 캡처하고 300ms timer에서 `convertSource`를 실행한다. 완료 시 revision이 달라졌으면 아무 상태도 반영하지 않는다. 성공은 `valid`, 실패는 마지막 result를 유지한 `invalid`로 만든다.

action 규칙은 다음과 같다.

```ts
const loadSample = () => setSource(sampleFor(state.direction));
const clear = () => replaceState(initialState(state.direction));
const selectDirection = (direction: ConverterDirection) => {
  setDirectionAndSource(direction, state.source);
};
const setDirectionAndSource = (direction: ConverterDirection, source: string) => {
  directionRef.current = direction;
  replaceSource(direction, source);
};
const swap = () => {
  if (!state.resultFresh || state.result.length === 0) return;
  setDirectionAndSource(oppositeDirection(state.direction), state.result);
};
```

`replaceSource`는 `setSource`와 같은 empty/oversized/scheduled 계산을 수행하되 direction을 인자로 받는다. action callback은 최신 상태를 놓치지 않도록 functional state update와 ref를 함께 사용한다.

- [ ] **Step 5: hook과 전체 도메인 테스트를 통과시킨다**

```bash
cd json-yaml-converter
npm run test -- src/hooks/useConverter.test.tsx src/lib
npm run lint
npm run typecheck
```

기대: 모든 명령 PASS.

- [ ] **Step 6: converter 상태 훅을 커밋한다**

```bash
git add json-yaml-converter/src/hooks/useConverter.ts \
  json-yaml-converter/src/hooks/useConverter.test.tsx
git commit -m "feat(json-yaml-converter): add debounced converter state"
```

---

### Task 7: Monaco 로컬 worker, YAML 강조, 오류 marker 구현

**Files:**
- Create: `json-yaml-converter/src/editor/setupMonaco.ts`
- Create: `json-yaml-converter/src/components/editor/CodeEditor.tsx`
- Create: `json-yaml-converter/src/components/editor/CodeEditor.test.tsx`

**Interfaces:**
- Consumes: `DataFormat`, `Diagnostic`, `Theme`.
- Produces: `setupMonaco()`, `CodeEditor`, `CodeEditorHandle.focusDiagnostic()`, `CodeEditorHandle.replaceAll(value)`.

- [ ] **Step 1: Monaco marker와 imperative action의 실패 테스트를 작성한다**

`src/components/editor/CodeEditor.test.tsx`에서 `@monaco-editor/react`를 textarea로 mock하고 mount callback에 아래 fake editor와 Monaco API를 전달한다.

```tsx
import { createRef } from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CodeEditor, type CodeEditorHandle } from './CodeEditor';

const setModelMarkers = vi.fn();
const revealPositionInCenter = vi.fn();
const setPosition = vi.fn();
const focus = vi.fn();
const executeEdits = vi.fn();
const pushUndoStop = vi.fn();
const model = {
  getPositionAt: (offset: number) => ({ lineNumber: 1, column: offset + 1 }),
  getFullModelRange: () => ({ startLineNumber: 1, startColumn: 1, endLineNumber: 1, endColumn: 3 }),
};

vi.mock('@monaco-editor/react', () => ({
  loader: { config: vi.fn() },
  Editor: ({ onMount }: { onMount?: (editor: unknown, monaco: unknown) => void }) => {
    onMount?.(
      { getModel: () => model, revealPositionInCenter, setPosition, focus, executeEdits, pushUndoStop },
      { editor: { setModelMarkers }, MarkerSeverity: { Error: 8 } },
    );
    return <div data-testid="monaco-editor" />;
  },
}));

describe('CodeEditor', () => {
  it('진단 범위를 Monaco marker로 등록하고 위치에 포커스한다', () => {
    const ref = createRef<CodeEditorHandle>();
    render(
      <CodeEditor
        ref={ref}
        ariaLabel="JSON 원본"
        value={'{}'}
        format="json"
        theme="light"
        readOnly={false}
        diagnostic={{
          format: 'json', code: 'X', message: '오류', startOffset: 1, endOffset: 2, line: 1, column: 2,
        }}
        onChange={vi.fn()}
      />,
    );
    expect(setModelMarkers).toHaveBeenCalledWith(model, 'json-yaml-converter', [
      expect.objectContaining({ startLineNumber: 1, startColumn: 2, message: '오류' }),
    ]);
    ref.current?.focusDiagnostic();
    expect(setPosition).toHaveBeenCalledWith({ lineNumber: 1, column: 2 });
    expect(focus).toHaveBeenCalled();
  });

  it('Pretty 결과를 undo 가능한 전체 문서 edit로 적용한다', () => {
    const ref = createRef<CodeEditorHandle>();
    render(<CodeEditor ref={ref} ariaLabel="원본" value="{}" format="json" theme="light" readOnly={false} diagnostic={null} onChange={vi.fn()} />);
    ref.current?.replaceAll('{\n}\n');
    expect(pushUndoStop).toHaveBeenCalledTimes(2);
    expect(executeEdits).toHaveBeenCalledWith('pretty', [expect.objectContaining({ text: '{\n}\n' })]);
  });
});
```

- [ ] **Step 2: Monaco 테스트 실패를 확인한다**

```bash
cd json-yaml-converter
npm run test -- src/components/editor/CodeEditor.test.tsx
```

기대: `CodeEditor`가 없어 FAIL.

- [ ] **Step 3: Monaco를 CDN 없이 로컬 worker로 구성한다**

`src/editor/setupMonaco.ts`:

```ts
import { loader } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import JsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';

let configured = false;

export function setupMonaco(): void {
  if (configured) return;
  configured = true;
  window.MonacoEnvironment = {
    getWorker(_moduleId: string, label: string) {
      return label === 'json' ? new JsonWorker() : new EditorWorker();
    },
  };
  loader.config({ monaco });
  if (!monaco.languages.getLanguages().some(({ id }) => id === 'yaml')) {
    monaco.languages.register({ id: 'yaml', extensions: ['.yaml', '.yml'] });
    monaco.languages.setMonarchTokensProvider('yaml', {
      tokenizer: {
        root: [
          [/#.*$/, 'comment'],
          [/^\s*[-?](?=\s)/, 'delimiter'],
          [/[&*][\w-]+/, 'tag'],
          [/![\w!:/.-]+/, 'tag'],
          [/(^|\s)(true|false|null|~)(?=\s|$)/, 'keyword'],
          [/(^|\s)[-+]?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?(?=\s|$)/i, 'number'],
          [/"(?:[^"\\]|\\.)*"/, 'string'],
          [/'(?:[^']|'')*'/, 'string'],
          [/[^\s:#][^:#]*?(?=\s*:)/, 'type.identifier'],
        ],
      },
    });
  }
}
```

같은 파일에 다음 전역 타입 선언을 항상 추가한다.

```ts
declare global {
  interface Window {
    MonacoEnvironment?: { getWorker(moduleId: string, label: string): Worker };
  }
}
```

- [ ] **Step 4: `CodeEditor`를 구현한다**

컴포넌트 props와 handle은 다음 계약을 사용한다.

```ts
export interface CodeEditorHandle {
  focusDiagnostic(): void;
  replaceAll(value: string): void;
}

interface CodeEditorProps {
  ariaLabel: string;
  value: string;
  format: DataFormat;
  theme: Theme;
  readOnly: boolean;
  diagnostic: Diagnostic | null;
  onChange(value: string): void;
}
```

mount 시 editor와 Monaco API를 ref에 저장한다. `useEffect`에서 model의 `getPositionAt(startOffset/endOffset)`으로 marker 위치를 만들고 `monaco.editor.setModelMarkers(model, 'json-yaml-converter', markers)`를 호출한다. 시작과 끝 위치가 같으면 `endColumn`을 `startColumn + 1`로 설정해 EOF 오류에도 보이는 범위를 만든다. diagnostic이 없으면 빈 배열을 전달한다.

`focusDiagnostic`은 start offset 위치를 `setPosition`, `revealPositionInCenter`, `focus` 순으로 적용한다. `replaceAll`은 `pushUndoStop`, `executeEdits('pretty', [{ range: getFullModelRange(), text: value, forceMoveMarkers: true }])`, `pushUndoStop` 순으로 적용한다.

`Editor` 옵션은 다음을 사용한다.

```tsx
<Editor
  path={`${ariaLabel}.${format}`}
  value={value}
  language={format}
  theme={theme === 'dark' ? 'vs-dark' : 'vs'}
  onChange={(next) => onChange(next ?? '')}
  onMount={handleMount}
  loading={<div role="status">편집기를 불러오는 중입니다.</div>}
  options={{
    readOnly,
    minimap: { enabled: false },
    automaticLayout: true,
    scrollBeyondLastLine: false,
    wordWrap: 'off',
    fontSize: 13,
    lineHeight: 20,
    padding: { top: 12, bottom: 12 },
    renderValidationDecorations: 'on',
    ariaLabel,
  }}
/>
```

모듈 로딩 시 `setupMonaco()`를 한 번 호출한다.

- [ ] **Step 5: Monaco 단위 테스트와 빌드를 통과시킨다**

```bash
cd json-yaml-converter
npm run test -- src/components/editor/CodeEditor.test.tsx
npm run lint
npm run typecheck
npm run build
```

기대: 모든 명령 PASS하고 build 산출물에 Monaco worker chunk가 생성된다.

- [ ] **Step 6: Monaco 통합을 커밋한다**

```bash
git add json-yaml-converter/src/editor/setupMonaco.ts \
  json-yaml-converter/src/components/editor/CodeEditor.tsx \
  json-yaml-converter/src/components/editor/CodeEditor.test.tsx
git commit -m "feat(json-yaml-converter): integrate Monaco diagnostics"
```

---

### Task 8: 반응형 변환기 UI와 브라우저 action 구현

**Files:**
- Create: `json-yaml-converter/src/components/ui/Button.tsx`
- Create: `json-yaml-converter/src/components/converter/ConverterToolbar.tsx`
- Create: `json-yaml-converter/src/components/converter/EditorPanel.tsx`
- Create: `json-yaml-converter/src/components/converter/DiagnosticBanner.tsx`
- Create: `json-yaml-converter/src/components/converter/StatusBar.tsx`
- Create: `json-yaml-converter/src/components/converter/ConverterWorkspace.tsx`
- Create: `json-yaml-converter/src/pages/ConverterPage.tsx`
- Create: `json-yaml-converter/src/pages/ConverterPage.test.tsx`
- Modify: `json-yaml-converter/src/App.tsx`
- Modify: `json-yaml-converter/src/styles/theme.css`
- Modify: `json-yaml-converter/src/styles/base.css`
- Modify: `json-yaml-converter/src/styles/components.css`

**Interfaces:**
- Consumes: `useConverter`, `prettySource`, `readSourceFile`, `downloadResult`, `CodeEditorHandle`.
- Produces: 완성된 데스크톱 양쪽 편집기와 모바일 원본/결과 탭, 파일·예제·지우기·Pretty·복사·다운로드·방향 전환 UI.

- [ ] **Step 1: Monaco를 mock한 사용자 흐름 실패 테스트를 작성한다**

`src/pages/ConverterPage.test.tsx` 상단에서 `CodeEditor`를 textarea로 mock한다.

```tsx
import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ConverterPage } from './ConverterPage';

vi.mock('../components/editor/CodeEditor', async () => {
  const React = await import('react');
  return {
    CodeEditor: React.forwardRef(function MockEditor(
      props: { ariaLabel: string; value: string; readOnly: boolean; onChange(value: string): void },
      ref: React.ForwardedRef<{ replaceAll(value: string): void; focusDiagnostic(): void }>,
    ) {
      React.useImperativeHandle(ref, () => ({
        replaceAll: props.onChange,
        focusDiagnostic: vi.fn(),
      }));
      return <textarea aria-label={props.ariaLabel} value={props.value} readOnly={props.readOnly} onChange={(event) => props.onChange(event.target.value)} />;
    }),
  };
});
```

다음 테스트를 작성한다.

```tsx
describe('ConverterPage', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('JSON 입력을 자동 변환하고 JSON Pretty를 제공한다', async () => {
    render(<ConverterPage theme="light" />);
    fireEvent.change(screen.getByLabelText('JSON 원본'), { target: { value: '{"a":1}' } });
    act(() => vi.advanceTimersByTime(300));
    expect(screen.getByLabelText('YAML 결과')).toHaveValue('a: 1\n');
    expect(screen.getByRole('button', { name: 'JSON Pretty' })).toBeEnabled();
  });

  it('방향 전환 후 YAML Pretty와 JSON 결과를 표시한다', () => {
    render(<ConverterPage theme="light" />);
    fireEvent.change(screen.getByLabelText('JSON 원본'), { target: { value: '{"a":1}' } });
    act(() => vi.advanceTimersByTime(300));
    fireEvent.click(screen.getByRole('button', { name: '변환 방향 전환' }));
    act(() => vi.advanceTimersByTime(300));
    expect(screen.getByRole('button', { name: 'YAML Pretty' })).toBeInTheDocument();
    expect(screen.getByLabelText('JSON 결과')).toHaveValue('{\n  "a": 1\n}\n');
  });

  it('빈 화면에서 YAML → JSON 방향을 직접 선택한다', () => {
    render(<ConverterPage theme="light" />);
    fireEvent.click(screen.getByRole('radio', { name: 'YAML → JSON' }));
    fireEvent.change(screen.getByLabelText('YAML 원본'), { target: { value: 'a: 1' } });
    act(() => vi.advanceTimersByTime(300));
    expect(screen.getByLabelText('JSON 결과')).toHaveValue('{\n  "a": 1\n}\n');
  });

  it('오류 위치와 stale 결과를 표시하고 내보내기를 막는다', () => {
    render(<ConverterPage theme="light" />);
    fireEvent.change(screen.getByLabelText('JSON 원본'), { target: { value: '{"a":1}' } });
    act(() => vi.advanceTimersByTime(300));
    fireEvent.change(screen.getByLabelText('JSON 원본'), { target: { value: '{"a" 1}' } });
    act(() => vi.advanceTimersByTime(300));
    expect(screen.getByText(/1행 6열/)).toBeInTheDocument();
    expect(screen.getByText('현재 입력과 동기화되지 않은 결과')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '결과 복사' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '결과 다운로드' })).toBeDisabled();
  });

  it('파일 확장자에 맞춰 방향을 바꾼다', async () => {
    render(<ConverterPage theme="light" />);
    const input = screen.getByLabelText('JSON 또는 YAML 파일 열기');
    await userEvent.upload(input, new File(['name: tool-hub\n'], 'config.yaml', { type: 'application/yaml' }));
    expect(screen.getByRole('button', { name: 'YAML Pretty' })).toBeInTheDocument();
  });

  it('클립보드 권한 거부를 비파괴적인 메시지로 표시한다', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
    });
    render(<ConverterPage theme="light" />);
    fireEvent.change(screen.getByLabelText('JSON 원본'), { target: { value: '{"a":1}' } });
    act(() => vi.advanceTimersByTime(300));
    fireEvent.click(screen.getByRole('button', { name: '결과 복사' }));
    await act(async () => Promise.resolve());
    expect(screen.getByText('결과를 클립보드에 복사하지 못했습니다.')).toBeInTheDocument();
    expect(screen.getByLabelText('JSON 원본')).toHaveValue('{"a":1}');
  });
});
```

- [ ] **Step 2: UI 테스트 실패를 확인한다**

```bash
cd json-yaml-converter
npm run test -- src/pages/ConverterPage.test.tsx
```

기대: 페이지와 컴포넌트가 없어 FAIL.

- [ ] **Step 3: 툴바와 편집기 패널을 구현한다**

`ConverterToolbar`는 숨은 file input과 다음 버튼을 렌더링한다.

- 항상 활성화된 `JSON → YAML` / `YAML → JSON` 방향 선택기
- `예제 불러오기`
- `파일 열기`
- `원본 지우기`
- `변환 방향 전환`

file input은 `accept=".json,.yaml,.yml,application/json,application/yaml,text/yaml"`, `aria-label="JSON 또는 YAML 파일 열기"`를 사용한다.

방향 선택기는 `role="radiogroup"`, `aria-label="변환 방향"`을 사용한다. 각 선택지는 `role="radio"`, `aria-checked={selected}`와 보이는 `JSON → YAML`/`YAML → JSON` 텍스트를 가진다. 이 선택기는 empty, invalid, oversized 상태에서도 비활성화하지 않는다.

`EditorPanel`은 제목, 현재 형식, action 영역, 360px 높이 `CodeEditor`를 렌더링한다. 원본은 현재 방향에 따라 `JSON Pretty`/`YAML Pretty`, 결과는 `결과 복사`/`결과 다운로드`를 렌더링한다.

`DiagnosticBanner`는 `role="alert"`, `data-testid="diagnostic-banner"`를 사용하고 다음 버튼 문구를 렌더링한다.

```tsx
<button type="button" onClick={onFocus}>
  {diagnostic.line}행 {diagnostic.column}열: {diagnostic.message}
</button>
```

`StatusBar`는 정상, scheduled, warning, oversized 문구와 `${bytes.toLocaleString('ko-KR')} B`를 표시한다.

- [ ] **Step 4: 반응형 workspace를 구현한다**

`ConverterWorkspace`는 두 panel을 DOM에 유지한다. 768px 이상에서는 `.converter-grid`로 양쪽을 표시하고 모바일에서는 `role="tablist"`의 `원본`/`결과` 탭으로 하나만 보이게 한다. 새 변환 성공은 결과 탭에 `변환 완료` badge만 추가하고 active tab은 바꾸지 않는다. 방향 전환 후 active tab을 `source`로 바꾼다.

결과가 stale이면 결과 panel 위에 다음 문구를 표시한다.

```tsx
<p className="stale-result" role="status">현재 입력과 동기화되지 않은 결과</p>
```

- [ ] **Step 5: `ConverterPage`에서 상태와 브라우저 action을 연결한다**

`ConverterPage`는 source editor ref를 보유한다. 방향 선택기는 `selectDirection(direction)`을 호출해 현재 원본을 유지한 채 다시 해석한다. 가운데 `변환 방향 전환` 버튼은 fresh 결과를 새 원본으로 사용하는 `swap()`을 호출한다.

- Pretty: `state.status === 'valid'`일 때만 `prettySource(state.source, state.direction)`를 호출하고 성공값을 `sourceEditorRef.current?.replaceAll(value)`로 적용한다.
- 오류 이동: `sourceEditorRef.current?.focusDiagnostic()`.
- 파일: `readSourceFile` 성공 시 `setDirectionAndSource`, 실패 시 페이지 수준 file banner.
- 복사: `navigator.clipboard.writeText(state.result)`; 거부되면 `결과를 클립보드에 복사하지 못했습니다.` toast.
- 다운로드: `downloadResult(state.result, state.direction)`; 예외 시 `결과 파일을 만들지 못했습니다.` toast.
- 내보내기와 swap disabled: `!state.resultFresh || state.result.length === 0`.

Pretty 버튼은 `state.status !== 'valid'`이면 비활성화한다. 따라서 오류·scheduled·oversized 상태에서 Pretty가 원문을 변경하지 않는다.

`ConverterPage.tsx`는 named export와 default export를 모두 제공한다. `App.tsx`는 페이지와 그 하위 Monaco·parser 모듈이 초기 셸과 별도 chunk가 되도록 lazy loading한다.

```tsx
import { lazy, Suspense } from 'react';
import { Header } from './components/layout/Header';
import { Layout } from './components/layout/Layout';
import { useTheme } from './hooks/useTheme';

const ConverterPage = lazy(() => import('./pages/ConverterPage'));

export default function App() {
  const { theme, toggle } = useTheme();
  return (
    <Layout header={<Header theme={theme} onToggleTheme={toggle} />}>
      <Suspense fallback={<main className="app-main" role="status">변환기를 불러오는 중입니다.</main>}>
        <ConverterPage theme={theme} />
      </Suspense>
    </Layout>
  );
}
```

- [ ] **Step 6: converter 전용 스타일을 구현한다**

`components.css`에 다음 핵심 규칙을 구현한다.

```css
.converter-page { width: min(1440px, 100%); margin: 0 auto; padding: 24px; }
.converter-toolbar { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-bottom: 16px; }
.converter-grid { display: grid; grid-template-columns: minmax(0, 1fr) 48px minmax(0, 1fr); gap: 12px; }
.editor-panel { min-width: 0; overflow: hidden; background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius-lg); }
.editor-panel__header { min-height: 48px; display: flex; justify-content: space-between; align-items: center; gap: 8px; padding: 8px 12px; border-bottom: 1px solid var(--line-subtle); }
.editor-frame { height: 360px; background: var(--editor-bg); }
.diagnostic-banner { margin-top: 8px; color: var(--danger); background: var(--danger-surface); border: 1px solid var(--danger); border-radius: var(--radius-md); padding: 10px 12px; }
.stale-result { color: var(--warning); font-weight: 600; }
.mobile-tabs { display: none; }
@media (max-width: 767px) {
  .converter-page { padding: 12px; }
  .converter-grid { display: block; }
  .converter-grid__swap { display: none; }
  .mobile-tabs { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; margin-bottom: 8px; }
  .editor-panel[data-mobile-hidden="true"] { display: none; }
  .editor-frame { height: 52vh; min-height: 320px; }
}
```

버튼은 공통 `.btn-primary`, `.btn-secondary`, `.btn-icon`과 `:focus-visible`을 사용한다. status는 색상과 텍스트를 함께 표시한다. `theme.css` 라이트·다크 양쪽에 `--success`, `--warning`, `--danger-surface`, `--editor-bg`를 정의한다.

- [ ] **Step 7: UI 테스트와 앱 전체 단위 검증을 통과시킨다**

```bash
cd json-yaml-converter
npm run test
npm run lint
npm run typecheck
npm run build
```

기대: 모든 명령 PASS.

- [ ] **Step 8: 반응형 UI를 커밋한다**

```bash
git add json-yaml-converter/src/App.tsx \
  json-yaml-converter/src/components \
  json-yaml-converter/src/pages \
  json-yaml-converter/src/styles
git commit -m "feat(json-yaml-converter): build responsive converter UI"
```

---

### Task 9: 실제 브라우저에서 Monaco와 반응형 흐름 검증

**Files:**
- Create: `json-yaml-converter/e2e/converter.spec.ts`
- Create: `json-yaml-converter/e2e/responsive.spec.ts`

**Interfaces:**
- Consumes: 완성된 React UI와 Playwright 설정.
- Produces: 실제 Monaco marker, 파일, 다운로드, 데스크톱·모바일 회귀 테스트.

- [ ] **Step 1: Chromium 런타임을 준비한다**

```bash
cd json-yaml-converter
npx playwright install chromium
```

기대: Chromium 설치가 exit code 0으로 끝난다.

- [ ] **Step 2: 양방향 변환과 오류 marker E2E를 작성한다**

`e2e/converter.spec.ts`:

```ts
import { expect, test } from '@playwright/test';

const selectAll = process.platform === 'darwin' ? 'Meta+A' : 'Control+A';

async function fillMonaco(page: import('@playwright/test').Page, label: string, value: string) {
  const editor = page.getByLabel(label);
  await editor.click();
  await page.keyboard.press(selectAll);
  await page.keyboard.type(value);
}

test('JSON과 YAML을 양방향 변환하고 형식별 Pretty를 제공한다', async ({ page }) => {
  await page.goto('/');
  await fillMonaco(page, 'JSON 원본', '{"name":"tool-hub"}');
  await expect(page.getByRole('region', { name: '결과 편집기' }).locator('.view-lines'))
    .toContainText('name: tool-hub');
  await expect(page.getByRole('button', { name: 'JSON Pretty' })).toBeVisible();

  await page.getByRole('button', { name: '변환 방향 전환' }).click();
  await expect(page.getByRole('button', { name: 'YAML Pretty' })).toBeVisible();
  await expect(page.getByRole('region', { name: '결과 편집기' }).locator('.view-lines'))
    .toContainText('"name": "tool-hub"');
});

test('빈 화면에서 YAML → JSON 방향을 직접 선택한다', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('radio', { name: 'YAML → JSON' }).click();
  await fillMonaco(page, 'YAML 원본', 'name: tool-hub');
  await expect(page.getByRole('region', { name: '결과 편집기' }).locator('.view-lines'))
    .toContainText('"name": "tool-hub"');
});

test('첫 문법 오류를 marker와 행/열 메시지로 표시하고 stale 결과를 차단한다', async ({ page }) => {
  await page.goto('/');
  await fillMonaco(page, 'JSON 원본', '{"a":1}');
  await expect(page.getByRole('button', { name: '결과 복사' })).toBeEnabled();

  await fillMonaco(page, 'JSON 원본', '{\n  "enabled" true\n}');
  await expect(page.getByTestId('diagnostic-banner')).toContainText('2행 13열');
  await expect(page.locator('.monaco-editor .squiggly-error')).toHaveCount(1);
  await expect(page.getByText('현재 입력과 동기화되지 않은 결과')).toBeVisible();
  await expect(page.getByRole('button', { name: '결과 복사' })).toBeDisabled();
  await expect(page.getByRole('button', { name: '결과 다운로드' })).toBeDisabled();
  await expect(page.getByRole('button', { name: '변환 방향 전환' })).toBeDisabled();
});

test('YAML 파일을 열고 JSON 결과를 다운로드한다', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('JSON 또는 YAML 파일 열기').setInputFiles({
    name: 'config.yaml',
    mimeType: 'application/yaml',
    buffer: Buffer.from('name: tool-hub\n'),
  });
  await expect(page.getByRole('button', { name: 'YAML Pretty' })).toBeVisible();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: '결과 다운로드' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('converted.json');
});

test('최신 결과만 클립보드에 복사한다', async ({ context, page }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'], {
    origin: 'http://127.0.0.1:4173',
  });
  await page.goto('/');
  await fillMonaco(page, 'JSON 원본', '{"copy":true}');
  await page.getByRole('button', { name: '결과 복사' }).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('copy: true\n');
});
```

- [ ] **Step 3: 모바일 탭과 데스크톱 양쪽 패널 E2E를 작성한다**

`e2e/responsive.spec.ts`:

```ts
import { expect, test } from '@playwright/test';

test('데스크톱에서 원본과 결과를 동시에 표시한다', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');
  await expect(page.getByRole('region', { name: '원본 편집기' })).toBeVisible();
  await expect(page.getByRole('region', { name: '결과 편집기' })).toBeVisible();
  await expect(page.getByRole('tablist')).toBeHidden();
});

test('모바일에서 원본과 결과를 탭으로 전환하고 자동 이동하지 않는다', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.getByRole('tablist')).toBeVisible();
  await expect(page.getByRole('tab', { name: /원본/ })).toHaveAttribute('aria-selected', 'true');

  await page.getByLabel('JSON 원본').click();
  await page.keyboard.type('{"mobile":true}');
  await expect(page.getByRole('tab', { name: /원본/ })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('tab', { name: /결과/ })).toContainText('변환 완료');

  await page.getByRole('tab', { name: /결과/ }).click();
  await expect(page.getByRole('region', { name: '결과 편집기' })).toBeVisible();
});

test('테마 버튼이 data-theme을 전환한다', async ({ page }) => {
  await page.goto('/');
  const before = await page.locator('html').getAttribute('data-theme');
  await page.getByRole('button', { name: '테마 전환' }).click();
  await expect(page.locator('html')).not.toHaveAttribute('data-theme', before ?? 'light');
});
```

- [ ] **Step 4: E2E를 실행하고 실제 DOM 차이를 수정한다**

```bash
cd json-yaml-converter
npm run test:e2e
```

기대: Chromium 프로젝트의 모든 테스트 PASS. Monaco 내부 class가 버전 차이로 다르면 marker 존재 검증을 public 진단 banner와 `aria-label` 기반 상태로 보강하되 marker 생성 자체를 제거하지 않는다.

- [ ] **Step 5: E2E와 전체 검증을 함께 실행한다**

```bash
cd json-yaml-converter
npm run test
npm run lint
npm run typecheck
npm run build
npm run test:e2e
```

기대: 모든 명령 PASS.

- [ ] **Step 6: 브라우저 회귀 테스트를 커밋한다**

```bash
git add json-yaml-converter/e2e json-yaml-converter/playwright.config.ts
git commit -m "test(json-yaml-converter): cover browser workflows"
```

---

### Task 10: 프로젝트 문서와 Tool Hub 홈 동기화

**Files:**
- Create: `json-yaml-converter/AGENTS.md`
- Create: `json-yaml-converter/README.md`
- Create: `json-yaml-converter/docs/contributor-guide.md`
- Modify: `README.md`
- Modify: `home/src/data/tools.ts`
- Modify: `home/src/data/tools.test.ts`

**Interfaces:**
- Consumes: 완료된 기능, 스크립트, 파일 구조.
- Produces: 구현과 일치하는 사용자·기여자 문서, `coming-soon` Tool Hub 카드.

- [ ] **Step 1: 홈 메타데이터의 실패 테스트를 추가한다**

`home/src/data/tools.test.ts`에 다음 테스트를 추가한다.

```ts
it('registers the JSON YAML converter as coming soon until deployment', () => {
  expect(tools).toContainEqual(expect.objectContaining({
    id: 'json-yaml-converter',
    status: 'coming-soon',
    url: null,
    tags: expect.arrayContaining(['JSON', 'YAML', 'Converter']),
  }));
});
```

- [ ] **Step 2: 홈 테스트 실패를 확인한다**

```bash
cd home
npm run test -- src/data/tools.test.ts
```

기대: converter entry가 없어 FAIL.

- [ ] **Step 3: Tool Hub 카드와 루트 README를 갱신한다**

`home/src/data/tools.ts`에 다음 항목을 추가한다.

```ts
{
  id: 'json-yaml-converter',
  name: 'JSON YAML Converter',
  longDescription:
    'JSON과 YAML을 양방향으로 변환하고, 두 형식을 보기 좋게 정리하며 문법 오류의 정확한 위치를 알려줍니다.',
  tags: ['JSON', 'YAML', 'Converter', 'Formatter'],
  url: null,
  github: 'https://github.com/ydj515/tool-hub/tree/main/json-yaml-converter',
  status: 'coming-soon',
},
```

루트 `README.md` 도구 목록에 다음 줄을 추가한다.

```markdown
- json-yaml-converter : JSON과 YAML을 양방향으로 변환하고 Pretty formatting과 문법 오류 위치를 제공하는 도구입니다.
```

- [ ] **Step 4: 프로젝트 README와 기여자 문서를 작성한다**

`json-yaml-converter/README.md`는 다음 섹션을 정확히 포함한다.

````markdown
# JSON YAML Converter

브라우저 안에서 JSON과 YAML을 양방향으로 변환하고 정리하는 Tool Hub 도구입니다.

## 기능

- JSON → YAML, YAML → JSON 실시간 자동 변환
- JSON Pretty와 YAML Pretty
- 첫 문법 오류의 범위, 행, 열 표시
- 파일 열기, 예제, 지우기, 복사, 다운로드
- 데스크톱 양쪽 편집기와 모바일 탭
- 입력 데이터 서버 전송 및 저장 없음

## 제한

- YAML 1.2 단일 문서만 지원합니다.
- YAML 주석, anchor 이름, alias 표현과 원래 서식은 보존하지 않습니다.
- 500KB부터 성능 안내를 표시하고 1MB를 초과하면 변환과 Pretty를 중단합니다.

## 실행

```bash
npm install
npm run dev
```

## 검증

```bash
npm run test
npm run lint
npm run typecheck
npm run build
npm run test:e2e
```
````

`json-yaml-converter/AGENTS.md`:

```markdown
# JSON YAML Converter Repository Guidelines

## Purpose
`json-yaml-converter/` is a Vite + React + TypeScript app for converting and formatting JSON and YAML in the browser.

## Required Verification
- Run `npm run test`, `npm run lint`, `npm run typecheck`, `npm run build`, and `npm run test:e2e` after relevant changes.
- Treat successful verification as mandatory before considering the work complete.

## Detailed Reference
- Project guide: [docs/contributor-guide.md](docs/contributor-guide.md)
```

`json-yaml-converter/docs/contributor-guide.md`:

```markdown
# JSON YAML Converter Contributor Guide

## Project Overview

`json-yaml-converter/` is a Vite + React + TypeScript SPA. UI components live under `src/components/`, page orchestration under `src/pages/`, conversion state under `src/hooks/`, and React-independent parsing and serialization under `src/lib/`.

## Project Commands

- `npm install`
- `npm run dev`
- `npm run test`
- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `npm run test:e2e`

## Conversion Rules

- Keep JSON strict: reject comments, trailing commas, and duplicate keys.
- Keep YAML limited to one YAML 1.2 document with string mapping keys.
- Reject custom tags, duplicate mapping keys, circular aliases, and non-finite numbers.
- Preserve mapping entry order and use two-space indentation.
- Do not store source or converted content in localStorage or send it to a server.

## Project Structure

- `src/lib/`: ordered data model, parsers, serializers, diagnostics, size, and file adapters
- `src/hooks/`: debounced conversion state and theme state
- `src/components/editor/`: Monaco setup, workers, markers, and editor wrapper
- `src/components/converter/`: toolbar, panels, diagnostics, status, and responsive workspace
- `src/pages/`: page-level event orchestration
- `e2e/`: real-browser Monaco and responsive-flow tests

## Manual Verification

- Confirm JSON → YAML and YAML → JSON on desktop and mobile.
- Confirm JSON Pretty and YAML Pretty preserve key order and support undo.
- Confirm syntax markers and line/column messages point to the same source location.
- Confirm stale results cannot be copied, downloaded, or swapped.
- Confirm 500KB warning and 1MB blocking behavior.
- Confirm light and dark themes remain readable.

## Documentation Sync

When behavior changes, update tests, this guide, the project README, and the root tool list in the same change.
```

- [ ] **Step 5: 새 앱과 홈 검증을 통과시킨다**

```bash
cd json-yaml-converter
npm run test
npm run lint
npm run typecheck
npm run build
cd ../home
npm run test
npm run lint
npm run typecheck
npm run build
```

기대: 두 프로젝트의 모든 명령 PASS.

- [ ] **Step 6: 문서와 홈 동기화를 커밋한다**

```bash
git add README.md home/src/data/tools.ts home/src/data/tools.test.ts \
  json-yaml-converter/AGENTS.md \
  json-yaml-converter/README.md \
  json-yaml-converter/docs/contributor-guide.md
git commit -m "docs(json-yaml-converter): document and register tool"
```

---

### Task 11: 전체 검증과 수동 수용 기준 확인

**Files:**
- No planned file changes. Verification defects return execution to the owning Task 1~10 before this task resumes.

**Interfaces:**
- Consumes: Tasks 1~10 전체 결과.
- Produces: 검증 증거와 푸시하지 않은 로컬 커밋 상태.

- [ ] **Step 1: 새 앱 자동 검증을 한 번에 실행한다**

```bash
cd json-yaml-converter
npm run test
npm run lint
npm run typecheck
npm run build
npm run test:e2e
```

기대: 모든 명령 exit code 0. 테스트 개수와 Playwright scenario 개수를 완료 보고에 기록한다.

- [ ] **Step 2: 홈 자동 검증을 실행한다**

```bash
cd home
npm run test
npm run lint
npm run typecheck
npm run build
```

기대: 모든 명령 exit code 0.

- [ ] **Step 3: 정적 변경 무결성을 확인한다**

```bash
git diff --check
git status --short
```

기대: `git diff --check` 출력 없음. `git status --short`에는 의도한 구현 파일 외 변경이 없어야 한다.

- [ ] **Step 4: 데스크톱 수동 수용 기준을 확인한다**

```bash
cd json-yaml-converter
npm run dev -- --host 127.0.0.1 --port 4173
```

브라우저 폭 1280px에서 다음을 확인한다.

1. JSON 입력과 YAML 결과가 동시에 보인다.
2. 방향 전환 후 YAML 입력과 JSON 결과가 동시에 보인다.
3. `JSON Pretty`와 `YAML Pretty`가 각각 표시되고 Monaco 실행 취소가 동작한다.
4. 오류 marker, gutter, 행·열 메시지가 같은 위치를 가리킨다.
5. stale 결과의 복사, 다운로드, 방향 전환이 비활성화된다.
6. 500KB 안내와 1MB 초과 차단이 나타난다.
7. 라이트·다크 테마에서 텍스트와 오류 대비가 충분하다.

- [ ] **Step 5: 모바일 수동 수용 기준을 확인한다**

브라우저 폭 390px에서 다음을 확인한다.

1. 원본/결과 탭 중 하나만 보인다.
2. 변환 성공 후 원본 탭을 유지하고 결과 탭에 `변환 완료` badge가 나타난다.
3. 결과 탭을 눌렀을 때 읽기 전용 결과가 보인다.
4. 방향 전환 후 원본 탭으로 돌아간다.
5. 파일, Pretty, 지우기, 방향 전환 버튼을 키보드로 사용할 수 있다.

- [ ] **Step 6: 검증 실패가 있으면 소유 Task로 돌아간다**

검증 실패를 발견하면 Task 11을 계속 진행하지 않는다. 실패 영역에 따라 Task 1~10 중 파일을 처음 만든 Task로 돌아가 그 Task에 적힌 focused test, 전체 검증, 명시적 `git add`와 commit 절차를 다시 수행한다. 수정 커밋 후 Task 11 Step 1부터 재시작한다. 검증 수정이 없으면 빈 커밋을 만들지 않는다.

- [ ] **Step 7: 로컬 상태를 보고하고 종료한다**

```bash
git log --oneline --decorate -12
git status --short --branch
```

완료 보고에는 다음을 포함한다.

- 새 앱과 홈의 test/lint/typecheck/build 결과
- Playwright 결과
- 수동 데스크톱·모바일 확인 결과
- 마지막 로컬 커밋 hash
- 원격 푸시를 수행하지 않았다는 사실

`git push`, 배포 명령, 홈 카드의 `live` 전환은 실행하지 않는다.
