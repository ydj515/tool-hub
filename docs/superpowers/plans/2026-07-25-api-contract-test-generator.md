# API Contract Test Generator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** OpenAPI 3.0·3.1 명세에서 결정론적인 API 테스트 계획을 생성하고 Markdown, JSON, Postman Collection 2.1로 내보내는 독립 브라우저 도구를 Tool Hub에 추가한다.

**Architecture:** `api-contract-test-generator/`는 Vite + React + TypeScript SPA다. React 메인 스레드는 3단계 UI와 사용자 선택만 소유하고, 파싱·내부 참조 해석·정규화·테스트 생성·내보내기는 revision 기반 Web Worker와 UI 독립 순수 모듈에서 수행한다. 입력과 결과는 영구 저장하거나 네트워크로 전송하지 않는다.

**Tech Stack:** Node.js 24.13.0, npm, Vite 8.1.5, React 19.2.7, TypeScript 5.9.3, Tailwind CSS 4.2.4, Monaco Editor 0.56, `yaml` 2.9, `jsonc-parser` 3.3, Lucide React, Vitest 4.1, Testing Library, Playwright 1.61.

## Global Constraints

- 관련 설계: `docs/superpowers/specs/2026-07-25-api-contract-test-generator-design.md`
- 실행 방식: 사용자가 Inline Execution을 선택했으므로 이 세션에서 `superpowers:executing-plans`로 순서대로 구현한다.
- 새 프로젝트 디렉터리는 `api-contract-test-generator/`이며 다른 서비스 코드를 런타임으로 import하지 않는다.
- OpenAPI 3.0.x와 3.1.x, YAML 단일 문서, JSON 객체 문서만 지원한다.
- Swagger 2.0, OpenAPI 3.2, YAML 다중 문서는 명확한 차단 진단을 반환한다.
- 파일과 직접 입력은 UTF-8 기준 5MB 초과 경고, 20MB 초과 차단 규칙을 공유한다.
- 외부 `$ref`는 가져오지 않고 영향받는 범위만 불완전 상태로 격리한다.
- 테스트는 유효한 기준 요청에서 제약 하나만 바꾸며 엔드포인트당 200개, 전체 2,000개로 제한한다.
- 실제 API 호출, 서버 프록시, 계정, AI 생성, 입력·결과 영구 저장을 구현하지 않는다.
- `localStorage`에는 `theme` 값만 저장한다.
- Tool Hub 디자인 토큰은 `#3366FF`, `#F7F7F8`, `#FFFFFF`, `#171717`, `rgba(112,115,124,.22)`, 4px 간격, 8·12·16px 반경을 사용한다.
- `public/fonts/toolhub-sans.woff2`와 라이선스 파일을 현재 서비스에서 복사해 자체 호스팅한다.
- `[data-theme]`, `resolveInitialTheme()`, `useTheme`, FOUC 방지 스크립트를 현재 Vite 서비스와 동일한 방식으로 사용한다.
- 데스크톱 상세 패널은 별도 그리드 열을 차지하며 목록 위에 겹치지 않는다.
- 모바일은 엔드포인트, 테스트 목록, 상세를 별도 화면으로 전환하고 고정 액션으로 콘텐츠를 덮지 않는다.
- 코드 주석, UI 문구, 문서는 한국어로 작성한다.
- 각 기능 변경은 실패 테스트 확인 후 최소 구현으로 통과시키고 관련 테스트를 다시 실행한다.
- 완료 전 새 앱에서 `test`, `lint`, `typecheck`, `build`, `test:e2e`를 모두 실행하고 `home/`에서 `test`, `lint`, `typecheck`, `build`를 실행한다.

---

## File Map

### Project and documentation

- `api-contract-test-generator/package.json`: 스크립트와 고정된 앱 의존성
- `api-contract-test-generator/package-lock.json`: 재현 가능한 npm 설치
- `api-contract-test-generator/AGENTS.md`: 필수 검증 명령 인덱스
- `api-contract-test-generator/README.md`: 사용자 기능, 제한, 실행법
- `api-contract-test-generator/docs/contributor-guide.md`: 규칙 추가와 fixture 작성 방법
- `api-contract-test-generator/mise.toml`: Node 24.13.0과 공통 작업
- `api-contract-test-generator/index.html`: 메타데이터, FOUC 방지, 앱 마운트
- `api-contract-test-generator/vite.config.ts`: React와 Tailwind 플러그인
- `api-contract-test-generator/vitest.config.ts`: jsdom 단위·컴포넌트 테스트
- `api-contract-test-generator/playwright.config.ts`: Chromium E2E 서버
- `api-contract-test-generator/eslint.config.js`: React·TypeScript lint
- `api-contract-test-generator/tsconfig*.json`: 앱과 도구 설정 분리

### Domain and analysis

- `src/domain/diagnostic.ts`: 진단과 위치 타입
- `src/domain/contract.ts`: 정규화된 계약 타입
- `src/domain/test-case.ts`: 생성 테스트, 선택, 계획 타입
- `src/lib/parser/parse-openapi.ts`: YAML·JSON 파싱, 버전·필수 구조 검사
- `src/lib/parser/pointer-locations.ts`: JSON Pointer별 소스 위치
- `src/lib/references/local-ref-resolver.ts`: 내부 참조와 순환 검사
- `src/lib/normalization/normalize-contract.ts`: 엔드포인트·스키마·보안 공통 모델
- `src/lib/generation/baseline-builder.ts`: 제약을 만족하는 기준 요청
- `src/lib/generation/rules.ts`: 단일 변이 규칙
- `src/lib/generation/test-plan-builder.ts`: ID, 중복 제거, 우선순위, 상한
- `src/lib/hash/sha256.ts`: 문서와 테스트의 안정적인 SHA-256

### Export and files

- `src/lib/export/markdown.ts`: Markdown 계획
- `src/lib/export/json-plan.ts`: `toolhub.api-contract-test-plan/v1`
- `src/lib/export/postman.ts`: Collection 2.1
- `src/lib/export/export-plan.ts`: 형식 라우터와 파일명
- `src/lib/files/spec-file.ts`: 입력 파일 크기·확장자 검사
- `src/lib/files/download.ts`: Blob 다운로드

### Worker and state

- `src/workers/protocol.ts`: 직렬화 가능한 요청·응답
- `src/workers/api-contract.worker.ts`: 분석·생성·내보내기 실행
- `src/hooks/useTestWorkspace.ts`: revision, 단계, stale, 선택, Worker 오류
- `src/hooks/useTheme.ts`: 테마 상태
- `src/theme.ts`: 초기 테마 순수 함수

### UI

- `src/App.tsx`: 앱 셸과 lazy page
- `src/pages/GeneratorPage.tsx`: 단계별 오케스트레이션
- `src/components/layout/AppShell.tsx`: 1400px 셸
- `src/components/layout/Header.tsx`: 브랜드, 개인정보 문구, 테마
- `src/components/layout/StepNavigator.tsx`: 3단계 표시
- `src/components/input/SpecInputStep.tsx`: 업로드, 편집기, 분석 액션
- `src/components/input/SpecEditor.tsx`: Monaco와 진단 마커
- `src/components/input/FileDropzone.tsx`: 파일 선택·드롭
- `src/components/review/ReviewStep.tsx`: 반응형 검토 작업 공간
- `src/components/review/EndpointNavigator.tsx`: 엔드포인트 선택
- `src/components/review/TestCaseList.tsx`: 검색·필터·카드
- `src/components/review/TestCaseDetail.tsx`: 근거·요청·예상 상태
- `src/components/export/ExportStep.tsx`: 형식 선택과 경고 확인
- `src/components/ui/Button.tsx`: 공통 버튼
- `src/components/ui/StatusBadge.tsx`: 신뢰 수준·진단 상태
- `src/data/samples.ts`: OpenAPI 3.0·3.1 예제
- `src/styles/theme.css`, `base.css`, `components.css`, `src/index.css`: 토큰과 반응형 스타일

### Tests and integration

- `src/**/*.test.ts(x)`: 도메인·컴포넌트 회귀 테스트
- `src/test/factories.ts`: 도메인·UI 테스트가 공유하는 명시적 픽스처 팩토리
- `src/test/match-media.ts`: 반응형 컴포넌트 테스트용 `matchMedia` 설치 함수
- `test/fixtures/*.yaml`: 버전, 참조, 인증, 조합, 상한 fixture
- `e2e/generator.spec.ts`: 입력부터 다운로드까지
- `e2e/responsive.spec.ts`: 320·375·768·1024·1440px 겹침 검증
- `home/src/data/tools.ts`: 독립 도구 카드
- `home/src/data/tools.test.ts`: 카드 메타데이터 회귀 테스트
- `home/src/styles/tool-card.css`: 새 카드 액센트 토큰

---

### Task 1: Vite 프로젝트와 Tool Hub 디자인 셸

**Files:**
- Create: `api-contract-test-generator/package.json`
- Create: `api-contract-test-generator/package-lock.json`
- Create: `api-contract-test-generator/index.html`
- Create: `api-contract-test-generator/vite.config.ts`
- Create: `api-contract-test-generator/vitest.config.ts`
- Create: `api-contract-test-generator/playwright.config.ts`
- Create: `api-contract-test-generator/eslint.config.js`
- Create: `api-contract-test-generator/tsconfig.json`
- Create: `api-contract-test-generator/tsconfig.app.json`
- Create: `api-contract-test-generator/tsconfig.node.json`
- Create: `api-contract-test-generator/mise.toml`
- Create: `api-contract-test-generator/src/main.tsx`
- Create: `api-contract-test-generator/src/App.tsx`
- Create: `api-contract-test-generator/src/App.test.tsx`
- Create: `api-contract-test-generator/src/test/setup.ts`
- Create: `api-contract-test-generator/src/theme.ts`
- Create: `api-contract-test-generator/src/theme.test.ts`
- Create: `api-contract-test-generator/src/hooks/useTheme.ts`
- Create: `api-contract-test-generator/src/components/layout/AppShell.tsx`
- Create: `api-contract-test-generator/src/components/layout/Header.tsx`
- Create: `api-contract-test-generator/src/components/layout/StepNavigator.tsx`
- Create: `api-contract-test-generator/src/components/ui/Button.tsx`
- Create: `api-contract-test-generator/src/styles/theme.css`
- Create: `api-contract-test-generator/src/styles/base.css`
- Create: `api-contract-test-generator/src/styles/components.css`
- Create: `api-contract-test-generator/src/index.css`
- Create: `api-contract-test-generator/public/fonts/toolhub-sans.woff2`
- Create: `api-contract-test-generator/public/fonts/toolhub-sans.LICENSE.txt`

**Interfaces:**
- Produces: `Theme = 'light' | 'dark'`, `resolveInitialTheme(): Theme`, `useTheme(): { theme: Theme; toggle(): void }`
- Produces: `AppShell`, `Header`, `StepNavigator`, `Button`

- [ ] **Step 1: Create package and tool configuration**

Use the dependency versions in the plan header and these scripts:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "lint": "eslint .",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc -b --pretty false",
    "test:e2e": "playwright test",
    "preview": "vite preview"
  }
}
```

Run: `npm install`

Expected: `package-lock.json` is created without audit errors that block installation.

- [ ] **Step 2: Write failing theme and shell tests**

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from './App';

describe('App', () => {
  it('renders the generator identity and three steps', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'API Contract Test Generator' })).toBeInTheDocument();
    expect(screen.getByText('명세 입력')).toBeInTheDocument();
    expect(screen.getByText('테스트 검토')).toBeInTheDocument();
    expect(screen.getByText('내보내기')).toBeInTheDocument();
  });
});
```

```typescript
import { describe, expect, it, vi } from 'vitest';
import { resolveInitialTheme } from './theme';

describe('resolveInitialTheme', () => {
  it('prefers a saved theme', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockReturnValue('dark');
    expect(resolveInitialTheme()).toBe('dark');
  });
});
```

- [ ] **Step 3: Run the tests and verify failure**

Run: `npm run test -- src/App.test.tsx src/theme.test.ts`

Expected: FAIL because `App`, `theme`, and layout components do not exist.

- [ ] **Step 4: Implement the minimal shell and theme**

```typescript
export type Theme = 'light' | 'dark';

export function resolveInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'light';
  try {
    const saved = localStorage.getItem('theme');
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {
    // 저장소 접근 실패 시 시스템 테마를 사용한다.
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}
```

Implement the header with a 40px blue mark, title, privacy copy, and 36px theme button. Implement `StepNavigator` with semantic ordered-list markup and `aria-current="step"`.

Set exact root tokens in `theme.css`:

```css
:root {
  --bg: #f7f7f8;
  --surface: #fff;
  --text: #171717;
  --muted: rgba(55, 56, 60, .61);
  --line: rgba(112, 115, 124, .22);
  --primary: #3366ff;
  --primary-strong: #005eeb;
  --primary-surface: #eaf2fe;
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --shadow-sm: 0 1px 2px rgba(23,23,25,.06), 0 1px 3px rgba(23,23,25,.07);
}
```

Copy the self-hosted font and license from `json-yaml-converter/public/fonts/`. Do not link external fonts.

- [ ] **Step 5: Run the shell verification**

Run: `npm run test -- src/App.test.tsx src/theme.test.ts && npm run lint && npm run typecheck && npm run build`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add api-contract-test-generator
git commit -m "feat(api-contract-test-generator): scaffold browser app"
```

---

### Task 2: Parser, diagnostics, size limits, and file input

**Files:**
- Create: `api-contract-test-generator/src/domain/diagnostic.ts`
- Create: `api-contract-test-generator/src/domain/contract.ts`
- Create: `api-contract-test-generator/src/lib/parser/parse-openapi.ts`
- Create: `api-contract-test-generator/src/lib/parser/parse-openapi.test.ts`
- Create: `api-contract-test-generator/src/lib/parser/pointer-locations.ts`
- Create: `api-contract-test-generator/src/lib/files/spec-file.ts`
- Create: `api-contract-test-generator/src/lib/files/spec-file.test.ts`
- Create: `api-contract-test-generator/test/fixtures/minimal-30.yaml`
- Create: `api-contract-test-generator/test/fixtures/minimal-31.json`

**Interfaces:**
- Produces: `parseOpenApi(raw: string, filename?: string): ParseResult`
- Produces: `readSpecFile(file: File): Promise<SpecFileResult>`
- Produces: `Diagnostic`, `SourceLocation`, `OpenApiDocument`, `SpecVersion`, `ParseResult`

- [ ] **Step 1: Define diagnostics and parser result types**

```typescript
export interface SourceLocation {
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
}

export interface Diagnostic {
  id: string;
  code: string;
  severity: 'info' | 'warning' | 'error';
  stage: 'parse' | 'validate' | 'reference' | 'normalize' | 'generate' | 'export';
  message: string;
  sourcePointer: string;
  location?: SourceLocation;
  action?: string;
  blocking: boolean;
}
```

```typescript
export type SpecVersion = 'openapi-3.0' | 'openapi-3.1';
export type OpenApiDocument = Record<string, unknown>;
export type ParseResult =
  | { ok: true; format: 'yaml' | 'json'; version: SpecVersion; document: OpenApiDocument; pointerLocations: Record<string, SourceLocation>; diagnostics: Diagnostic[] }
  | { ok: false; format: 'yaml' | 'json'; diagnostics: Diagnostic[] };
```

- [ ] **Step 2: Write failing parser and file tests**

```typescript
import { describe, expect, it } from 'vitest';
import { parseOpenApi } from './parse-openapi';

describe('parseOpenApi', () => {
  it('accepts OpenAPI 3.1 YAML', () => {
    const result = parseOpenApi('openapi: 3.1.1\ninfo:\n  title: Pets\n  version: "1"\npaths: {}\n', 'pets.yaml');
    expect(result).toMatchObject({ ok: true, format: 'yaml', version: 'openapi-3.1' });
  });

  it('rejects OpenAPI 3.2 with a blocking diagnostic', () => {
    const result = parseOpenApi('{"openapi":"3.2.0","info":{"title":"Pets","version":"1"},"paths":{}}', 'pets.json');
    expect(result.diagnostics).toContainEqual(expect.objectContaining({ code: 'UNSUPPORTED_SPEC_VERSION', blocking: true }));
  });

  it('reports the YAML syntax location', () => {
    const result = parseOpenApi('openapi: 3.1.0\ninfo: [\n', 'broken.yaml');
    expect(result.diagnostics[0]).toEqual(expect.objectContaining({ code: 'YAML_SYNTAX_ERROR', location: expect.objectContaining({ startLine: 2 }) }));
  });
});
```

```typescript
import { describe, expect, it } from 'vitest';
import { readSpecFile } from './spec-file';

describe('readSpecFile', () => {
  it('blocks files larger than 20MB', async () => {
    const file = new File([new Uint8Array(20 * 1024 * 1024 + 1)], 'large.yaml');
    await expect(readSpecFile(file)).resolves.toMatchObject({ ok: false, error: { code: 'FILE_TOO_LARGE' } });
  });
});
```

- [ ] **Step 3: Run parser tests and verify failure**

Run: `npm run test -- src/lib/parser/parse-openapi.test.ts src/lib/files/spec-file.test.ts`

Expected: FAIL because parser and file functions do not exist.

- [ ] **Step 4: Implement strict parsing and limits**

Implement format detection from extension and first non-whitespace character. Use `jsonc-parser` with comments and trailing commas disallowed; use `yaml.parseDocument` with duplicate keys rejected and exactly one document. Validate `info.title`, `info.version`, and `paths`.

Return these exact blocking codes: `INPUT_TOO_LARGE`, `JSON_SYNTAX_ERROR`, `YAML_SYNTAX_ERROR`, `MULTIPLE_YAML_DOCUMENTS`, `MISSING_SPEC_VERSION`, `UNSUPPORTED_SPEC_VERSION`, `INVALID_INFO`, `INVALID_PATHS`.

For 5MB through 20MB, return `LARGE_INPUT_WARNING` with `blocking: false`. Apply the byte check to both direct input and files.

- [ ] **Step 5: Run parser verification**

Run: `npm run test -- src/lib/parser/parse-openapi.test.ts src/lib/files/spec-file.test.ts && npm run typecheck`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add api-contract-test-generator/src/domain api-contract-test-generator/src/lib/parser api-contract-test-generator/src/lib/files api-contract-test-generator/test/fixtures
git commit -m "feat(api-contract-test-generator): parse OpenAPI input"
```

---

### Task 3: Internal references and normalized contract

**Files:**
- Create: `api-contract-test-generator/src/lib/references/local-ref-resolver.ts`
- Create: `api-contract-test-generator/src/lib/references/local-ref-resolver.test.ts`
- Create: `api-contract-test-generator/src/lib/normalization/normalize-contract.ts`
- Create: `api-contract-test-generator/src/lib/normalization/normalize-contract.test.ts`
- Modify: `api-contract-test-generator/src/domain/contract.ts`
- Create: `api-contract-test-generator/test/fixtures/parameters-and-auth.yaml`
- Create: `api-contract-test-generator/test/fixtures/external-ref.yaml`
- Create: `api-contract-test-generator/test/fixtures/circular-ref.yaml`

**Interfaces:**
- Consumes: `OpenApiDocument`, `SpecVersion`, `Diagnostic`
- Produces: `resolveLocalReference(document: OpenApiDocument, ref: string, trail?: string[]): ReferenceResult`
- Produces: `normalizeContract(document: OpenApiDocument, version: SpecVersion): NormalizationResult`
- Produces: `NormalizedContract`, `NormalizedEndpoint`, `NormalizedParameter`, `NormalizedSchema`, `SecurityAlternative`

- [ ] **Step 1: Define normalized types**

```typescript
export interface NormalizedSchema {
  pointer: string;
  type?: 'string' | 'number' | 'integer' | 'boolean' | 'object' | 'array' | 'null';
  nullable: boolean;
  required: string[];
  properties: Record<string, NormalizedSchema>;
  items?: NormalizedSchema;
  enum?: unknown[];
  constValue?: unknown;
  example?: unknown;
  defaultValue?: unknown;
  minimum?: number;
  maximum?: number;
  exclusiveMinimum?: number;
  exclusiveMaximum?: number;
  multipleOf?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  format?: string;
  minItems?: number;
  maxItems?: number;
  uniqueItems: boolean;
}

export interface NormalizedParameter {
  name: string;
  location: 'path' | 'query' | 'header' | 'cookie';
  required: boolean;
  style: 'simple' | 'form';
  explode: boolean;
  schema: NormalizedSchema;
  sourcePointer: string;
}

export interface NormalizedSecurityScheme {
  name: string;
  type: 'http-bearer' | 'http-basic' | 'api-key-header' | 'api-key-query' | 'api-key-cookie';
  parameterName?: string;
  sourcePointer: string;
}

export type SecurityAlternative = NormalizedSecurityScheme[];

export interface NormalizedEndpoint {
  id: string;
  method: string;
  path: string;
  tags: string[];
  parameters: NormalizedParameter[];
  requestBody?: NormalizedSchema;
  responses: string[];
  security: SecurityAlternative[];
  incomplete: boolean;
}

export interface NormalizedContract {
  title: string;
  apiVersion: string;
  specVersion: SpecVersion;
  serverUrl?: string;
  endpoints: NormalizedEndpoint[];
  diagnostics: Diagnostic[];
}
```

- [ ] **Step 2: Write failing reference and normalization tests**

```typescript
it('resolves an escaped local JSON Pointer', () => {
  const document = { components: { schemas: { 'A/B': { type: 'string' } } } };
  expect(resolveLocalReference(document, '#/components/schemas/A~1B')).toMatchObject({ ok: true, value: { type: 'string' } });
});

it('reports external references without fetching them', () => {
  expect(resolveLocalReference({}, 'https://example.com/schema.yaml')).toMatchObject({
    ok: false,
    diagnostic: { code: 'EXTERNAL_REFERENCE_UNSUPPORTED', blocking: false },
  });
});
```

```typescript
it('normalizes parameters, JSON body, responses, and security alternatives', () => {
  const parsed = parseOpenApi(parametersAndAuthFixture, 'api.yaml');
  if (!parsed.ok) throw new Error('fixture parse failed');
  const result = normalizeContract(parsed.document, parsed.version);
  expect(result.contract.endpoints[0]).toMatchObject({
    method: 'POST',
    path: '/users/{id}',
    requestBody: { type: 'object' },
    responses: ['201', '400', '401'],
    security: [[expect.objectContaining({ type: 'http-bearer' })]],
  });
});
```

- [ ] **Step 3: Run normalization tests and verify failure**

Run: `npm run test -- src/lib/references/local-ref-resolver.test.ts src/lib/normalization/normalize-contract.test.ts`

Expected: FAIL because reference resolution and normalization do not exist.

- [ ] **Step 4: Implement resolution and normalization**

Decode `~1` and `~0`, reject non-fragment references, track the current reference trail, and stop cyclic traversal with `CIRCULAR_REFERENCE` diagnostics. Normalize path-level and operation-level parameters, with operation-level values overriding matching path parameters.

Support only path `simple`, query `form`, header `simple`, cookie `form`. Mark unsupported serialization with `UNSUPPORTED_PARAMETER_SERIALIZATION` and set the endpoint incomplete only when no safe request can be formed.

Normalize OpenAPI 3.0 boolean exclusive bounds and 3.1 numeric exclusive bounds into numeric fields. Merge compatible `allOf`; emit `CONFLICTING_ALLOF` when types or bounds conflict. Preserve each supported security array alternative and all schemes within an alternative.

- [ ] **Step 5: Run normalization verification**

Run: `npm run test -- src/lib/references src/lib/normalization && npm run typecheck`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add api-contract-test-generator/src/domain/contract.ts api-contract-test-generator/src/lib/references api-contract-test-generator/src/lib/normalization api-contract-test-generator/test/fixtures
git commit -m "feat(api-contract-test-generator): normalize API contracts"
```

---

### Task 4: Baseline values and single-mutation rules

**Files:**
- Create: `api-contract-test-generator/src/domain/test-case.ts`
- Create: `api-contract-test-generator/src/lib/generation/baseline-builder.ts`
- Create: `api-contract-test-generator/src/lib/generation/baseline-builder.test.ts`
- Create: `api-contract-test-generator/src/lib/generation/rules.ts`
- Create: `api-contract-test-generator/src/lib/generation/rules.test.ts`
- Create: `api-contract-test-generator/src/test/factories.ts`
- Create: `api-contract-test-generator/test/fixtures/schema-rules.yaml`

**Interfaces:**
- Consumes: `NormalizedSchema`, `NormalizedEndpoint`
- Produces: `buildValidValue(schema: NormalizedSchema, seed: string, context?: BuildContext): BuildValueResult`
- Produces: `buildBaselineRequest(endpoint: NormalizedEndpoint, seed: string): BaselineResult`
- Produces: `generateRuleCandidates(endpoint: NormalizedEndpoint, baseline: GeneratedRequest, seed: string): TestCandidate[]`
- Produces: `GeneratedRequest`, `TestCandidate`, `TestCategory`, `Confidence`

- [ ] **Step 1: Define generated request and candidate types**

```typescript
export interface GeneratedRequest {
  pathParameters: Record<string, unknown>;
  queryParameters: Record<string, unknown>;
  headers: Record<string, string>;
  cookies: Record<string, string>;
  body?: unknown;
}

export interface TestCandidate {
  endpointId: string;
  title: string;
  category: TestCategory;
  confidence: Confidence;
  sourcePointer: string;
  rationale: string;
  request: GeneratedRequest;
  expected: ExpectedOutcome;
  ruleId: string;
  variantId: string;
  priority: number;
}
```

- [ ] **Step 2: Write failing baseline and mutation tests**

Create `src/test/factories.ts` first. Export `schema(overrides)`, `recursiveSchemaFixture`, `endpointFixture`, `baselineFixture`, `contractFixture`, `planFixture`, and `selectionFixture`; construct each from the public domain interfaces with no casts to `any`. Reuse these factories in Tasks 4–10 so every referenced fixture has one typed definition.

```typescript
it('prefers example, default, enum, then generated values', () => {
  expect(buildValidValue(schema({ example: 'shown', defaultValue: 'fallback' }), 'seed')).toMatchObject({ ok: true, value: 'shown' });
  expect(buildValidValue(schema({ defaultValue: 'fallback' }), 'seed')).toMatchObject({ ok: true, value: 'fallback' });
  expect(buildValidValue(schema({ enum: ['member', 'admin'] }), 'seed')).toMatchObject({ ok: true, value: 'member' });
});

it('stops recursive schemas at the first repeated reference', () => {
  const result = buildValidValue(recursiveSchemaFixture, 'seed');
  expect(result).toMatchObject({ ok: true });
  expect(JSON.stringify(result.value).length).toBeLessThan(1000);
});
```

```typescript
it('creates one mutation per required field', () => {
  const candidates = generateRuleCandidates(endpointFixture, baselineFixture, 'seed');
  expect(candidates).toContainEqual(expect.objectContaining({
    ruleId: 'required-body-property',
    sourcePointer: '/components/schemas/CreateUser/required',
    request: expect.objectContaining({ body: { name: '홍길동' } }),
  }));
});

it('creates integer and enum boundary violations', () => {
  const candidates = generateRuleCandidates(endpointFixture, baselineFixture, 'seed');
  expect(candidates.map((item) => item.ruleId)).toEqual(expect.arrayContaining(['minimum-below', 'maximum-above', 'enum-outside']));
});
```

- [ ] **Step 3: Run generation tests and verify failure**

Run: `npm run test -- src/lib/generation/baseline-builder.test.ts src/lib/generation/rules.test.ts`

Expected: FAIL because baseline and rules are undefined.

- [ ] **Step 4: Implement deterministic baseline values**

Use this exact order: `example`, first `examples`, `default`, first `enum`, deterministic generated value. Generate stable strings from the schema pointer and seed. Use ISO values for supported formats. Stop at depth 32 and repeated schema identities. Cap generated arrays at 100 items and emit diagnostics rather than allocate larger values.

- [ ] **Step 5: Implement rule candidates**

Add explicit functions for required omission, type mismatch, string length, verified pattern mismatch, supported formats, numeric bounds, `multipleOf`, array bounds, `uniqueItems`, enum, const, and supported authentication omissions. Clone only the branch being mutated so each candidate differs from the baseline in one constraint.

Map validation errors to declared `400`, then `422`, then `4XX`; authentication omission to `401`, then `4XX`; otherwise set `needsReview: true` with no invented numeric status.

- [ ] **Step 6: Run generation verification**

Run: `npm run test -- src/lib/generation && npm run typecheck`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add api-contract-test-generator/src/domain/test-case.ts api-contract-test-generator/src/lib/generation api-contract-test-generator/test/fixtures/schema-rules.yaml
git commit -m "feat(api-contract-test-generator): generate contract test candidates"
```

---

### Task 5: Stable IDs, limits, and final test plans

**Files:**
- Create: `api-contract-test-generator/src/lib/hash/sha256.ts`
- Create: `api-contract-test-generator/src/lib/hash/sha256.test.ts`
- Create: `api-contract-test-generator/src/lib/generation/test-plan-builder.ts`
- Create: `api-contract-test-generator/src/lib/generation/test-plan-builder.test.ts`
- Modify: `api-contract-test-generator/src/domain/test-case.ts`
- Create: `api-contract-test-generator/test/fixtures/large-plan.yaml`

**Interfaces:**
- Consumes: `NormalizedContract`, `TestCandidate`
- Produces: `sha256(value: string): Promise<string>`
- Produces: `generateTestPlan(contract: NormalizedContract, seed: string, limits?: GenerationLimits): Promise<GenerationResult>`
- Produces: `GeneratedTestCase`, `TestPlan`, `GenerationSummary`, `GenerationLimits`

- [ ] **Step 1: Write failing ID and plan tests**

```typescript
it('returns the same SHA-256 for the same text', async () => {
  await expect(sha256('POST|/users|required|email')).resolves.toBe(
    '8487661e9b44397dd55521c5d7397a8b5dc3b65a85978bf5359f20e7e8cfe6d4',
  );
});
```

Before locking the literal digest, verify it once with `printf 'POST|/users|required|email' | shasum -a 256`; keep the test and implementation on the standard UTF-8 SHA-256 result.

```typescript
it('keeps IDs and ordering stable for the same contract and seed', async () => {
  const first = await generateTestPlan(contractFixture, 'toolhub');
  const second = await generateTestPlan(contractFixture, 'toolhub');
  expect(second.plan.testCases.map((item) => item.id)).toEqual(first.plan.testCases.map((item) => item.id));
});

it('applies endpoint and total limits with diagnostics', async () => {
  const result = await generateTestPlan(contractFixture, 'toolhub', { maxPerEndpoint: 2, maxTotal: 3 });
  expect(result.plan.testCases).toHaveLength(3);
  expect(result.plan.diagnostics).toContainEqual(expect.objectContaining({ code: 'TEST_LIMIT_REACHED' }));
});
```

- [ ] **Step 2: Run plan tests and verify failure**

Run: `npm run test -- src/lib/hash/sha256.test.ts src/lib/generation/test-plan-builder.test.ts`

Expected: FAIL because hashing and plan construction do not exist.

- [ ] **Step 3: Implement SHA-256 and plan construction**

Use `crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))` and lowercase hex. Build the test ID from uppercase method, normalized path, source pointer, rule ID, and variant ID.

Sort by endpoint source order, priority, then ID. Deduplicate by full test ID. Apply default limits `{ maxPerEndpoint: 200, maxTotal: 2000 }`. Include all generated tests by default in a separate selection map.

```typescript
export interface GenerationResult {
  plan: TestPlan;
  selections: Record<string, TestCaseSelection>;
}
```

- [ ] **Step 4: Run plan verification**

Run: `npm run test -- src/lib/hash src/lib/generation && npm run typecheck`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add api-contract-test-generator/src/lib/hash api-contract-test-generator/src/lib/generation api-contract-test-generator/src/domain/test-case.ts api-contract-test-generator/test/fixtures/large-plan.yaml
git commit -m "feat(api-contract-test-generator): build stable test plans"
```

---

### Task 6: Markdown, JSON, and Postman exporters

**Files:**
- Create: `api-contract-test-generator/src/lib/export/markdown.ts`
- Create: `api-contract-test-generator/src/lib/export/markdown.test.ts`
- Create: `api-contract-test-generator/src/lib/export/json-plan.ts`
- Create: `api-contract-test-generator/src/lib/export/json-plan.test.ts`
- Create: `api-contract-test-generator/src/lib/export/postman.ts`
- Create: `api-contract-test-generator/src/lib/export/postman.test.ts`
- Create: `api-contract-test-generator/src/lib/export/export-plan.ts`
- Create: `api-contract-test-generator/src/lib/export/export-plan.test.ts`
- Create: `api-contract-test-generator/src/lib/files/download.ts`
- Create: `api-contract-test-generator/src/lib/files/download.test.ts`
- Modify: `api-contract-test-generator/src/test/factories.ts`

**Interfaces:**
- Consumes: `TestPlan`, `Record<string, TestCaseSelection>`
- Produces: `exportMarkdown(plan, selections): string`
- Produces: `exportJsonPlan(plan, selections): string`
- Produces: `exportPostman(plan, selections): string`
- Produces: `exportPlan(plan, selections, format): ExportArtifact`
- Produces: `downloadArtifact(artifact: ExportArtifact): void`

- [ ] **Step 1: Write failing exporter tests**

```typescript
it('renders evidence and review warnings in Markdown', () => {
  const output = exportMarkdown(planFixture, selectionFixture);
  expect(output).toContain('# User API 테스트 계획');
  expect(output).toContain('검토 필요');
  expect(output).toContain('/components/schemas/CreateUser/required');
});

it('emits the versioned JSON schema and selected tests only', () => {
  const output = JSON.parse(exportJsonPlan(planFixture, selectionFixture));
  expect(output.schemaVersion).toBe('toolhub.api-contract-test-plan/v1');
  expect(output.testCases.every((item: { id: string }) => selectionFixture[item.id].included)).toBe(true);
});

it('uses tag folders, baseUrl, and reviewed status assertions in Postman', () => {
  const output = JSON.parse(exportPostman(planFixture, selectionFixture));
  expect(output.info.schema).toContain('v2.1.0');
  expect(output.variable).toContainEqual(expect.objectContaining({ key: 'baseUrl' }));
  expect(JSON.stringify(output)).toContain('pm.response.to.have.status(400)');
  expect(JSON.stringify(output)).not.toContain('Bearer real-secret');
});
```

- [ ] **Step 2: Run exporter tests and verify failure**

Run: `npm run test -- src/lib/export src/lib/files/download.test.ts`

Expected: FAIL because exporters do not exist.

- [ ] **Step 3: Implement exporters and filenames**

Normalize API titles to lowercase ASCII-safe slugs with `api` fallback. Use `<slug>-test-plan.md`, `<slug>-test-plan.json`, and `<slug>-postman-collection.json`.

Postman folders use the first tag or `기타`; preserve endpoint order; sort tests by priority then ID. Use `{{baseUrl}}`, `{{API_TOKEN}}`, `{{API_KEY}}`. Emit a status assertion only when `needsReview` is false or the user marked the selection reviewed with exact numeric statuses.

Return this exact artifact type:

```typescript
export interface ExportArtifact {
  filename: string;
  mimeType: 'text/markdown' | 'application/json';
  content: string;
}
```

- [ ] **Step 4: Run exporter verification**

Run: `npm run test -- src/lib/export src/lib/files/download.test.ts && npm run typecheck`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add api-contract-test-generator/src/lib/export api-contract-test-generator/src/lib/files/download.ts api-contract-test-generator/src/lib/files/download.test.ts
git commit -m "feat(api-contract-test-generator): export generated test plans"
```

---

### Task 7: Worker protocol and stale-safe workspace state

**Files:**
- Create: `api-contract-test-generator/src/workers/protocol.ts`
- Create: `api-contract-test-generator/src/workers/protocol.test.ts`
- Create: `api-contract-test-generator/src/workers/api-contract.worker.ts`
- Create: `api-contract-test-generator/src/hooks/useTestWorkspace.ts`
- Create: `api-contract-test-generator/src/hooks/useTestWorkspace.test.tsx`
- Create: `api-contract-test-generator/src/test/fake-worker.ts`

**Interfaces:**
- Consumes: parser, normalizer, plan builder, exporters
- Produces: `acceptsRevision(responseRevision: number, latestRevision: number): boolean`
- Produces: `useTestWorkspace(): TestWorkspaceController`

- [ ] **Step 1: Define worker messages and workspace states**

```typescript
export type WorkspaceStatus =
  | 'idle' | 'reading-file' | 'analyzing' | 'invalid' | 'partially-valid'
  | 'generating' | 'ready' | 'stale' | 'generation-failed' | 'exporting';

export type WorkerRequest =
  | { type: 'analyze'; revision: number; raw: string; filename?: string }
  | { type: 'generate'; revision: number; contract: NormalizedContract; seed: string }
  | { type: 'export'; revision: number; plan: TestPlan; selections: Record<string, TestCaseSelection>; format: ExportFormat };

export function acceptsRevision(responseRevision: number, latestRevision: number): boolean {
  return responseRevision === latestRevision;
}
```

- [ ] **Step 2: Write failing protocol and hook tests**

```typescript
it('rejects stale worker responses', () => {
  expect(acceptsRevision(2, 3)).toBe(false);
  expect(acceptsRevision(3, 3)).toBe(true);
});
```

```tsx
it('marks ready results stale when the source changes', async () => {
  const worker = new FakeWorker();
  const { result } = renderHook(() => useTestWorkspace({ createWorker: () => worker }));
  act(() => result.current.setSource(validSource));
  const pending = act(() => result.current.analyzeAndGenerate());
  worker.respondWithReadyPlan(planFixture, selectionFixture);
  await pending;
  expect(result.current.state.status).toBe('ready');
  act(() => result.current.setSource(`${validSource}\n# change`));
  expect(result.current.state.status).toBe('stale');
  expect(result.current.canExport).toBe(false);
});

it('restores selections only for IDs that still exist', async () => {
  const worker = new FakeWorker();
  const { result } = renderHook(() => useTestWorkspace({ createWorker: () => worker }));
  await analyzeWith(worker, result, planWithIds('stable-id', 'removed-id'));
  act(() => result.current.updateSelection('stable-id', { included: false }));
  act(() => result.current.setSource(`${validSource}\n# regenerated`));
  await analyzeWith(worker, result, planWithIds('stable-id', 'new-id'));
  expect(result.current.state.selections['stable-id'].included).toBe(false);
  expect(result.current.state.selections['removed-id']).toBeUndefined();
});
```

`src/test/fake-worker.ts` defines the minimal `WorkerLike` implementation used above, including `postMessage`, `terminate`, `onmessage`, `onerror`, and the deterministic `respondWithReadyPlan` helper. `analyzeWith` and `planWithIds` live in the hook test file and use the shared typed factories.

- [ ] **Step 3: Run state tests and verify failure**

Run: `npm run test -- src/workers/protocol.test.ts src/hooks/useTestWorkspace.test.tsx`

Expected: FAIL because protocol and hook are undefined.

- [ ] **Step 4: Implement worker and workspace controller**

Create one module Worker on mount. Increment revision on every source mutation. Keep raw source in React memory only. On source mutation after `ready`, retain the old plan for reference but set status `stale`, disable selection edits, and disable export.

On Worker error, terminate and recreate the Worker, preserve source, clear current plan, and expose a retry action. Do not log source or generated requests.

The controller must expose:

```typescript
interface TestWorkspaceOptions {
  createWorker?: () => WorkerLike;
}

interface TestWorkspaceController {
  state: TestWorkspaceState;
  canAnalyze: boolean;
  canExport: boolean;
  setSource(value: string): void;
  loadFile(file: File): Promise<void>;
  loadSample(version: SpecVersion): void;
  analyzeAndGenerate(): Promise<void>;
  selectEndpoint(id: string): void;
  selectTestCase(id: string): void;
  updateSelection(id: string, patch: Partial<TestCaseSelection>): void;
  exportSelected(format: ExportFormat): Promise<void>;
  goToStep(step: 'input' | 'review' | 'export'): void;
  retryWorker(): void;
}
```

`useTestWorkspace(options?: TestWorkspaceOptions)` uses the real module Worker by default and accepts the injected factory only as an execution boundary for tests.

- [ ] **Step 5: Run state verification**

Run: `npm run test -- src/workers src/hooks/useTestWorkspace.test.tsx && npm run typecheck`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add api-contract-test-generator/src/workers api-contract-test-generator/src/hooks/useTestWorkspace.ts api-contract-test-generator/src/hooks/useTestWorkspace.test.tsx
git commit -m "feat(api-contract-test-generator): orchestrate analysis worker"
```

---

### Task 8: Input step with Monaco, file drop, and samples

**Files:**
- Create: `api-contract-test-generator/src/editor/setupMonaco.ts`
- Create: `api-contract-test-generator/src/components/input/SpecEditor.tsx`
- Create: `api-contract-test-generator/src/components/input/SpecEditor.test.tsx`
- Create: `api-contract-test-generator/src/components/input/FileDropzone.tsx`
- Create: `api-contract-test-generator/src/components/input/FileDropzone.test.tsx`
- Create: `api-contract-test-generator/src/components/input/SpecInputStep.tsx`
- Create: `api-contract-test-generator/src/components/input/SpecInputStep.test.tsx`
- Create: `api-contract-test-generator/src/data/samples.ts`
- Create: `api-contract-test-generator/src/data/samples.test.ts`
- Modify: `api-contract-test-generator/src/test/factories.ts`

**Interfaces:**
- Consumes: `Theme`, `Diagnostic`, `SpecVersion`, workspace controller actions
- Produces: `SpecInputStep`, `SpecEditor`, `FileDropzone`, `sampleDocumentFor(version)`

- [ ] **Step 1: Write failing input component tests**

Add `specInputProps()` to `src/test/factories.ts`; it returns source, diagnostics, loading state, and no-op handlers that satisfy `SpecInputStepProps`. Override only the callback under test.

```tsx
it('loads the OpenAPI 3.1 sample and starts analysis', async () => {
  const user = userEvent.setup();
  const onSourceChange = vi.fn();
  const onAnalyze = vi.fn();
  render(<SpecInputStep {...specInputProps()} onSourceChange={onSourceChange} onAnalyze={onAnalyze} />);
  await user.click(screen.getByRole('button', { name: 'OpenAPI 3.1 예제' }));
  expect(onSourceChange).toHaveBeenCalledWith(expect.stringContaining('openapi: 3.1'));
  await user.click(screen.getByRole('button', { name: '테스트 생성' }));
  expect(onAnalyze).toHaveBeenCalledTimes(1);
});

it('announces a dropped invalid extension', async () => {
  const onFile = vi.fn();
  render(<FileDropzone onFile={onFile} disabled={false} />);
  fireEvent.drop(screen.getByRole('button', { name: 'OpenAPI 파일 선택' }), {
    dataTransfer: { files: [new File(['text'], 'notes.txt')] },
  });
  expect(await screen.findByRole('alert')).toHaveTextContent('yaml, yml, json 파일만 열 수 있습니다.');
  expect(onFile).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Run input tests and verify failure**

Run: `npm run test -- src/components/input src/data/samples.test.ts`

Expected: FAIL because the input components and samples do not exist.

- [ ] **Step 3: Implement Monaco and input workflow**

Use an accessible Monaco label `OpenAPI 명세 편집기`, disable minimap, enable word wrap, and apply markers for the first blocking diagnostic. Support file input and drag-and-drop through the same `readSpecFile` function. Provide exact OpenAPI 3.0 and 3.1 YAML samples with one POST endpoint, required fields, enum, numeric bounds, and bearer auth.

Do not auto-analyze on every keystroke. The user explicitly activates `테스트 생성`, keeping large input work predictable.

- [ ] **Step 4: Run input verification**

Run: `npm run test -- src/components/input src/data && npm run typecheck`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add api-contract-test-generator/src/editor api-contract-test-generator/src/components/input api-contract-test-generator/src/data
git commit -m "feat(api-contract-test-generator): add specification input flow"
```

---

### Task 9: Responsive review workspace without overlap

**Files:**
- Create: `api-contract-test-generator/src/components/review/ReviewStep.tsx`
- Create: `api-contract-test-generator/src/components/review/ReviewStep.test.tsx`
- Create: `api-contract-test-generator/src/components/review/EndpointNavigator.tsx`
- Create: `api-contract-test-generator/src/components/review/EndpointNavigator.test.tsx`
- Create: `api-contract-test-generator/src/components/review/TestCaseList.tsx`
- Create: `api-contract-test-generator/src/components/review/TestCaseList.test.tsx`
- Create: `api-contract-test-generator/src/components/review/TestCaseDetail.tsx`
- Create: `api-contract-test-generator/src/components/review/TestCaseDetail.test.tsx`
- Create: `api-contract-test-generator/src/components/ui/StatusBadge.tsx`
- Modify: `api-contract-test-generator/src/styles/components.css`
- Create: `api-contract-test-generator/src/test/match-media.ts`
- Modify: `api-contract-test-generator/src/test/factories.ts`
- Create: `api-contract-test-generator/e2e/responsive.spec.ts`

**Interfaces:**
- Consumes: `TestPlan`, selection map, selected endpoint and test IDs
- Produces: `ReviewStep` with `view: 'endpoints' | 'tests' | 'detail'` on mobile

- [ ] **Step 1: Write failing review interaction tests**

Add `reviewStepProps()` to the shared factories and `installMatchMedia(matches: boolean)` to `src/test/match-media.ts`. `installMatchMedia(true)` represents the `(max-width: 767px)` branch and is restored after each test.

```tsx
it('filters tests and updates inclusion', async () => {
  const user = userEvent.setup();
  const onSelectionChange = vi.fn();
  render(<ReviewStep {...reviewStepProps()} onSelectionChange={onSelectionChange} />);
  await user.type(screen.getByRole('searchbox', { name: '테스트 검색' }), 'email');
  expect(screen.getByText('필수 email 필드 누락')).toBeInTheDocument();
  expect(screen.queryByText('인증 토큰 누락')).not.toBeInTheDocument();
  await user.click(screen.getByRole('checkbox', { name: '필수 email 필드 누락 포함' }));
  expect(onSelectionChange).toHaveBeenCalledWith('required-email-id', { included: false });
});

it('uses a separate mobile detail view and restores the list', async () => {
  const user = userEvent.setup();
  installMatchMedia(true);
  render(<ReviewStep {...reviewStepProps()} />);
  await user.click(screen.getByRole('button', { name: '필수 email 필드 누락 상세' }));
  expect(screen.getByRole('region', { name: '테스트 상세' })).toBeVisible();
  expect(screen.queryByRole('region', { name: '테스트 목록' })).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: '테스트 목록으로 돌아가기' }));
  expect(screen.getByRole('region', { name: '테스트 목록' })).toBeVisible();
});
```

- [ ] **Step 2: Run review tests and verify failure**

Run: `npm run test -- src/components/review`

Expected: FAIL because review components do not exist.

- [ ] **Step 3: Implement the desktop, tablet, and mobile structures**

Use these exact layout rules:

```css
.review-workspace {
  display: grid;
  grid-template-columns: 200px minmax(0, 1fr) 340px;
}

@media (min-width: 768px) and (max-width: 1199px) {
  .review-workspace { grid-template-columns: minmax(0, 1fr) 340px; }
  .endpoint-selector-row { grid-column: 1 / -1; }
}

@media (max-width: 767px) {
  .review-workspace { display: block; }
  .mobile-view[hidden] { display: none; }
}
```

Every grid child must set `min-width: 0`. Do not position the detail panel, action bar, or navigation with fixed or absolute coordinates. Preserve selected IDs and scroll offsets in React refs when changing mobile views.

Render confidence labels as `명시적`, `파생`, `검토 필요`; render summary counts and category/confidence filters. Expected status editing accepts comma-separated numeric values and marks the selection reviewed only after successful validation.

- [ ] **Step 4: Add failing responsive E2E geometry tests**

```typescript
for (const width of [320, 375, 768, 1024, 1440]) {
  test(`${width}px에서 콘텐츠가 겹치거나 넘치지 않는다`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    await page.getByRole('button', { name: 'OpenAPI 3.1 예제' }).click();
    await page.getByRole('button', { name: '테스트 생성' }).click();
    await expect(page.getByText('테스트 검토')).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
}
```

At 1440px, additionally assert the endpoint, list, and detail bounding boxes do not overlap. At 375px, assert only one of endpoints, tests, detail is visible at a time and the last card is not covered by actions.

- [ ] **Step 5: Run review and responsive tests**

Run: `npm run test -- src/components/review && npm run test:e2e -- e2e/responsive.spec.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add api-contract-test-generator/src/components/review api-contract-test-generator/src/components/ui/StatusBadge.tsx api-contract-test-generator/src/styles/components.css api-contract-test-generator/e2e/responsive.spec.ts
git commit -m "feat(api-contract-test-generator): add responsive test review"
```

---

### Task 10: Export step and end-to-end page orchestration

**Files:**
- Create: `api-contract-test-generator/src/components/export/ExportStep.tsx`
- Create: `api-contract-test-generator/src/components/export/ExportStep.test.tsx`
- Create: `api-contract-test-generator/src/pages/GeneratorPage.tsx`
- Create: `api-contract-test-generator/src/pages/GeneratorPage.test.tsx`
- Modify: `api-contract-test-generator/src/App.tsx`
- Modify: `api-contract-test-generator/src/styles/components.css`
- Modify: `api-contract-test-generator/src/test/factories.ts`
- Create: `api-contract-test-generator/e2e/generator.spec.ts`

**Interfaces:**
- Consumes: complete `TestWorkspaceController`
- Produces: three-step user flow and downloadable artifacts

- [ ] **Step 1: Write failing export and page tests**

Add `exportStepProps()` and `readyWorkspaceController()` to the shared factories. The latter exposes a real `TestWorkspaceController` shape with a stable excluded selection; no component receives a test-only rendering prop.

```tsx
it('warns before exporting unreviewed tests', async () => {
  const user = userEvent.setup();
  const onExport = vi.fn();
  render(<ExportStep {...exportStepProps()} unreviewedCount={2} onExport={onExport} />);
  await user.click(screen.getByRole('radio', { name: 'Postman Collection 2.1' }));
  await user.click(screen.getByRole('button', { name: '선택한 형식으로 다운로드' }));
  expect(screen.getByRole('alert')).toHaveTextContent('검토하지 않은 테스트 2개');
  expect(onExport).not.toHaveBeenCalled();
  await user.click(screen.getByRole('checkbox', { name: '미검토 테스트 포함을 확인했습니다' }));
  await user.click(screen.getByRole('button', { name: '선택한 형식으로 다운로드' }));
  expect(onExport).toHaveBeenCalledWith('postman');
});
```

```tsx
it('moves through input, review, and export without losing selections', async () => {
  const user = userEvent.setup();
  render(<GeneratorPage controller={readyWorkspaceController()} theme="light" onToggleTheme={vi.fn()} />);
  await user.click(screen.getByRole('button', { name: '내보내기 단계로' }));
  expect(screen.getByRole('heading', { name: '테스트 계획 내보내기' })).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: '테스트 검토로 돌아가기' }));
  expect(screen.getByRole('checkbox', { name: /포함/ })).toHaveProperty('checked', false);
});
```

- [ ] **Step 2: Run export tests and verify failure**

Run: `npm run test -- src/components/export src/pages/GeneratorPage.test.tsx`

Expected: FAIL because export and page components do not exist.

- [ ] **Step 3: Implement export step and page orchestration**

Use an accessible radio group for `markdown`, `json`, `postman`. Show included, unreviewed, skipped counts. Reset the confirmation checkbox whenever the unreviewed count or selected format changes.

Lazy-load `GeneratorPage` from `App`. Keep the shared `Header` and `StepNavigator` outside step content. Render action errors in `role="status"` or `role="alert"` without exposing source text.

- [ ] **Step 4: Write and run the core E2E flow**

```typescript
test('OpenAPI 예제에서 Markdown 계획을 다운로드한다', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'OpenAPI 3.1 예제' }).click();
  await page.getByRole('button', { name: '테스트 생성' }).click();
  await page.getByRole('button', { name: '내보내기 단계로' }).click();
  await page.getByRole('radio', { name: 'Markdown 테스트 계획' }).check();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: '선택한 형식으로 다운로드' }).click();
  expect((await download).suggestedFilename()).toMatch(/-test-plan\.md$/);
});
```

Run: `npm run test -- src/components/export src/pages && npm run test:e2e -- e2e/generator.spec.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add api-contract-test-generator/src/components/export api-contract-test-generator/src/pages api-contract-test-generator/src/App.tsx api-contract-test-generator/src/styles/components.css api-contract-test-generator/e2e/generator.spec.ts
git commit -m "feat(api-contract-test-generator): complete guided workflow"
```

---

### Task 11: Project documentation and Tool Hub registration

**Files:**
- Create: `api-contract-test-generator/AGENTS.md`
- Create: `api-contract-test-generator/README.md`
- Create: `api-contract-test-generator/docs/contributor-guide.md`
- Modify: `home/src/data/tools.ts`
- Modify: `home/src/data/tools.test.ts`
- Modify: `home/src/styles/tool-card.css`

**Interfaces:**
- Produces: independent Tool Hub card with `coming-soon` status until a deployment URL exists

- [ ] **Step 1: Write the failing home metadata test**

```typescript
it('registers the API contract test generator independently', () => {
  expect(tools).toContainEqual(expect.objectContaining({
    id: 'api-contract-test-generator',
    name: 'API Contract Test Generator',
    status: 'coming-soon',
    url: null,
    tags: expect.arrayContaining(['OpenAPI', 'API', 'Testing']),
  }));
});
```

- [ ] **Step 2: Run the home test and verify failure**

Run from `home/`: `npm run test -- src/data/tools.test.ts`

Expected: FAIL because the card is absent.

- [ ] **Step 3: Add the card and accent token**

Add this metadata without changing existing entries:

```typescript
{
  id: 'api-contract-test-generator',
  name: 'API Contract Test Generator',
  longDescription: 'OpenAPI 3.0·3.1 명세를 분석해 정상·경계값·오류·인증 테스트 계획을 만들고 Markdown, JSON, Postman Collection으로 내보냅니다.',
  tags: ['OpenAPI', 'API', 'Testing', 'Postman'],
  url: null,
  github: 'https://github.com/ydj515/tool-hub/tree/main/api-contract-test-generator',
  status: 'coming-soon',
}
```

Add a distinct blue-cyan accent under `[data-tool-id="api-contract-test-generator"]` while keeping the same card token interface. Do not introduce gradients if the current card base can use a solid background; if the existing component requires `--tool-gradient`, set both stops to the same semantic blue.

- [ ] **Step 4: Write project documentation**

`AGENTS.md` must remain a short index containing the five verification commands. `README.md` must describe supported versions, browser-only privacy, generation rules, export formats, limits, commands, and known unsupported features. `docs/contributor-guide.md` must explain rule IDs, fixture requirements, deterministic ID inputs, and responsive E2E widths.

- [ ] **Step 5: Run documentation and home verification**

Run from `home/`: `npm run test && npm run lint && npm run typecheck && npm run build`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add api-contract-test-generator/AGENTS.md api-contract-test-generator/README.md api-contract-test-generator/docs/contributor-guide.md home/src/data/tools.ts home/src/data/tools.test.ts home/src/styles/tool-card.css
git commit -m "feat(home): register API contract test generator"
```

---

### Task 12: Full verification and completion audit

**Files:**
- Modify only files required by verification failures attributable to this feature.

**Interfaces:**
- Consumes: all preceding tasks
- Produces: verified independent app and home integration

- [ ] **Step 1: Run the complete app suite**

Run from `api-contract-test-generator/`:

```bash
npm run test
npm run lint
npm run typecheck
npm run build
npm run test:e2e
```

Expected: all commands exit 0.

- [ ] **Step 2: Run the complete home suite**

Run from `home/`:

```bash
npm run test
npm run lint
npm run typecheck
npm run build
```

Expected: all commands exit 0.

- [ ] **Step 3: Audit privacy and persistence**

Run:

```bash
rg -n "fetch\(|axios|XMLHttpRequest|localStorage|indexedDB" api-contract-test-generator/src
```

Expected: no network calls; `localStorage` appears only in theme files; no `indexedDB` usage.

- [ ] **Step 4: Audit responsive overlap and source scope**

Run:

```bash
git diff --check
git status --short
```

Expected: no whitespace errors; only feature, home integration, plan, and documentation files are changed or committed. Confirm Playwright geometry tests cover 320, 375, 768, 1024, and 1440px.

- [ ] **Step 5: Commit verification-only fixes if any**

```bash
git add api-contract-test-generator home/src/data/tools.ts home/src/data/tools.test.ts home/src/styles/tool-card.css
git commit -m "test(api-contract-test-generator): complete verification coverage"
```

Skip this commit when verification required no code changes.

---

## Execution Notes

- Execute tasks in numerical order because later interfaces depend on earlier types.
- Keep each implementation file focused; split a file if it exceeds a single clear responsibility while preserving the public interfaces in this plan.
- Do not reuse or modify existing service implementation files except the three explicitly listed `home/` integration files.
- Do not copy source code from ignored `design-system/`; copy only the approved semantic token values into the new app.
- Do not change or remove the existing `openapi-editor` home metadata entry.
- When an expected digest or browser-computed CSS value differs, verify the standard value and update the test and implementation together only when the design contract remains intact.
