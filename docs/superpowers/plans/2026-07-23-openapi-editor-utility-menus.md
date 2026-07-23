# OpenAPI Studio Utility Menus Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 테마 전환을 상단 핵심 작업 행으로 옮기고, 보조 행의 형식·내보내기·샘플 작업을 메뉴로 압축한다.

**Architecture:** `Topbar`에 네이티브 `details/summary` 기반 유틸리티 메뉴를 도입한다. 같은 `name`을 공유해 한 메뉴만 열리도록 하며, 브라우저 기본 키보드 동작과 기존 버튼·셀렉트 콜백을 유지한다. 테마 전환은 핵심 작업 그룹의 마지막 제어 요소로 유지한다.

**Tech Stack:** React 19, TypeScript, CSS, Vitest, Playwright.

## Global Constraints

- 핵심 작업은 대상 버전, 업로드, 변환, 테마 전환 순서로 둔다.
- 보조 작업은 형식 메뉴, 내보내기 메뉴, 샘플 메뉴, 원본 복원만 직접 노출한다.
- 모든 메뉴 요약과 내부 직접 조작 요소는 36px 높이를 유지한다.
- 기존 버튼의 `aria-label`, 다운로드와 샘플 선택 동작을 보존한다.
- 767px 이하에서도 팝오버가 화면 밖으로 나가지 않도록 왼쪽 기준으로 연다.

---

### Task 1: 메뉴 구조와 테마 위치 구현

**Files:**
- Modify: `openapi-editor/src/components/layout/Topbar.tsx`
- Modify: `openapi-editor/src/styles/components.css`
- Test: `openapi-editor/src/App.test.tsx`

**Interfaces:**
- Consumes: 기존 `TopbarProps`의 `onConvertFormat`, `onRedetect`, `onForceFormat`, `onDownload`, `onSampleVersion`, `onDownloadSample`, `onToggleTheme`.
- Produces: `형식 메뉴`, `내보내기 메뉴`, `샘플 메뉴` 접근성 이름과 핵심 작업 그룹 내부의 테마 버튼.

- [x] **Step 1: 메뉴와 테마 위치를 요구하는 실패 테스트를 작성한다.**

```tsx
expect(screen.getByLabelText('형식 메뉴')).toBeInTheDocument();
expect(screen.getByLabelText('내보내기 메뉴')).toBeInTheDocument();
expect(screen.getByLabelText('샘플 메뉴')).toBeInTheDocument();
expect(screen.getByRole('button', { name: '테마 전환' }).closest('.primary-actions')).not.toBeNull();
```

- [x] **Step 2: 실패를 확인한다.**

Run: `npm run test -- src/App.test.tsx`
Expected: `형식 메뉴`를 찾지 못해 FAIL.

- [x] **Step 3: 재사용 가능한 네이티브 유틸리티 메뉴를 추가하고 보조 작업을 이동한다.**

```tsx
function UtilityMenu({ label, children }: { label: string; children: ReactNode }) {
  return <details className="utility-menu" name="topbar-utility-menu">
    <summary className="secondary-btn compact" aria-label={`${label} 메뉴`}>{label}<ChevronDown size={14} /></summary>
    <div className="utility-menu-popover" role="group" aria-label={`${label} 작업`}>{children}</div>
  </details>;
}
```

- [x] **Step 4: 메뉴 팝오버와 모바일 정렬 스타일을 추가한다.**

```css
.utility-menu { position: relative; }
.utility-menu-popover { position: absolute; z-index: 10; top: calc(100% + 6px); right: 0; }
@media (max-width: 767px) { .utility-menu-popover { right: auto; left: 0; } }
```

- [x] **Step 5: 컴포넌트 테스트 통과를 확인한다.**

Run: `npm run test -- src/App.test.tsx`
Expected: PASS.

### Task 2: 메뉴 공개와 36px 높이 브라우저 회귀 방지

**Files:**
- Modify: `openapi-editor/e2e/openapi-editor.spec.ts`

**Interfaces:**
- Consumes: `형식 메뉴`, `내보내기 메뉴`, `샘플 메뉴`과 기존 내부 버튼의 접근성 이름.
- Produces: 메뉴를 연 뒤 형식 변환·YAML 다운로드·샘플 버전 선택이 표시되는 E2E 보장.

- [x] **Step 1: 메뉴 열기 시 내부 작업을 검증하는 E2E를 작성한다.**

```ts
await page.getByLabel('형식 메뉴').click();
await expect(page.getByLabel('포맷 변환')).toBeVisible();
await page.getByLabel('내보내기 메뉴').click();
await expect(page.getByLabel('YAML 다운로드')).toBeVisible();
```

- [x] **Step 2: 메뉴의 높이와 테마 위치를 검증한다.**

```ts
expect((await page.getByLabel('형식 메뉴').boundingBox())?.height).toBe(36);
expect(await page.getByLabel('핵심 작업').getByLabel('테마 전환').count()).toBe(1);
```

- [x] **Step 3: E2E 통과를 확인한다.**

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
