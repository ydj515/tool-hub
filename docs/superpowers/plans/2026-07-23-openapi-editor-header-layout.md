# openapi-editor Header Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** openapi-editor의 데스크톱 헤더에서 문서 상태, 핵심 변환, 보조 도구를 의도적인 두 줄 구조로 분리한다.

**Architecture:** `Topbar`는 문서 컨텍스트와 핵심 변환 흐름을 첫 줄에 두고, 형식·다운로드·샘플·복원·테마 도구를 두 번째 줄의 보조 도구 막대로 이동한다. CSS Grid가 두 줄의 공통 열을 관리하며, 767px 이하의 기존 모바일 단일 열 동작은 유지한다.

**Tech Stack:** React 19, TypeScript, CSS, Vitest, Playwright.

## Global Constraints

- 모든 직접 조작 요소는 36px 높이를 유지한다.
- 기존 접근성 이름과 키보드 조작은 바꾸지 않는다.
- 768px 이상에서는 보조 도구 막대가 핵심 변환 흐름과 분리되어야 한다.
- 767px 이하에서는 기존 모바일 헤더의 줄바꿈 동작을 유지한다.

---

### Task 1: 두 줄 헤더의 접근성 구조와 스타일 적용

**Files:**
- Modify: `openapi-editor/src/components/layout/Topbar.tsx`
- Modify: `openapi-editor/src/styles/components.css`
- Test: `openapi-editor/src/App.test.tsx`

**Interfaces:**
- Consumes: 기존 `TopbarProps` 콜백과 각 버튼의 `aria-label`.
- Produces: `topbar-main-row`, `topbar-secondary-row`, `primary-actions`, `secondary-actions` 구조와 36px 제어 높이.

- [x] **Step 1: 두 헤더 행을 식별하는 실패 테스트를 작성한다.**

```tsx
expect(screen.getByLabelText('핵심 작업')).toBeInTheDocument();
expect(screen.getByLabelText('보조 작업')).toBeInTheDocument();
```

- [x] **Step 2: 실패를 확인한다.**

Run: `npm run test -- src/App.test.tsx`
Expected: `핵심 작업` 또는 `보조 작업`을 찾지 못해 FAIL.

- [x] **Step 3: 문서 상태·핵심 조작·보조 조작을 두 행으로 재배치한다.**

```tsx
<div className="topbar-main-row">
  <div className="document-context">...</div>
  <div className="primary-actions" aria-label="핵심 작업">...</div>
</div>
<div className="topbar-secondary-row" aria-label="보조 작업">...</div>
```

- [x] **Step 4: Grid와 반응형 규칙을 적용한다.**

```css
.topbar { display: grid; grid-template-columns: minmax(0, 1fr); }
.topbar-main-row { display: flex; justify-content: space-between; gap: 16px; }
.topbar-secondary-row { display: flex; justify-content: flex-end; gap: 8px; }
@media (max-width: 767px) { .topbar-main-row { flex-direction: column; } }
```

- [x] **Step 5: 컴포넌트 테스트 통과를 확인한다.**

Run: `npm run test -- src/App.test.tsx`
Expected: PASS.

### Task 2: 데스크톱 레이아웃 회귀 검증

**Files:**
- Modify: `openapi-editor/e2e/openapi-editor.spec.ts`

**Interfaces:**
- Consumes: `핵심 작업`, `보조 작업`의 접근성 이름과 기존 control label.
- Produces: 주요 행과 보조 행의 수직 분리 및 모든 제어 요소 36px 높이 회귀 방지.

- [x] **Step 1: 데스크톱 헤더 행 분리를 검증하는 E2E를 작성한다.**

```ts
const primary = await page.getByLabel('핵심 작업').boundingBox();
const secondary = await page.getByLabel('보조 작업').boundingBox();
expect(secondary!.y).toBeGreaterThan(primary!.y);
```

- [x] **Step 2: 핵심 행과 보조 행의 수직 배치를 확인한다.**

Run: `npm run test:e2e -- --grep "separates desktop topbar actions"`
Expected: PASS.

- [x] **Step 3: 기존 36px 제어 높이 테스트에 두 행을 포함한다.**

```ts
expect(await page.getByLabel('핵심 작업').locator('button').first().boundingBox()).toMatchObject({ height: 36 });
```

- [x] **Step 4: E2E 통과를 확인한다.**

Run: `npm run test:e2e`
Expected: PASS.

### Task 3: 전체 검증

**Files:**
- Verify only.

- [x] **Step 1: 전체 검증을 실행한다.**

Run: `mise run check`
Expected: unit test, lint, typecheck, build, E2E 모두 exit 0.

- [x] **Step 2: 변경 공백을 확인한다.**

Run: `git diff --check`
Expected: exit 0.
