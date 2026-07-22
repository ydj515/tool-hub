# JSON/YAML Converter Copy Feedback Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 결과 복사 성공을 체크 아이콘과 2초 동안 표시되는 접근 가능한 알림으로 피드백한다.

**Architecture:** `ConverterPage`가 clipboard request의 최신성 검증 뒤 success state와 timer lifecycle을 소유한다. state는 workspace와 결과 panel을 거쳐 버튼의 Copy/Check 렌더링을 결정하고, 별도 `CopySuccessToast`는 같은 state에서만 fixed live notification을 렌더링한다.

**Tech Stack:** Vite 8, React 19, TypeScript 5.9, Lucide React, Vitest, Testing Library, Playwright Chromium

## Global Constraints

- 기준 설계는 `docs/superpowers/specs/2026-07-23-json-yaml-converter-copy-feedback-design.md`다.
- 성공 UI의 표시 시간은 정확히 2,000ms다.
- 결과 복사 버튼의 accessible name/title은 `결과 복사`로 유지한다.
- 성공 상태는 `data-copied="true"`로 노출하고 기본 상태는 `data-copied="false"`다.
- 성공 toast는 `role="status"`와 `aria-live="polite"`를 사용한다.
- 새 source mutation과 unmount는 success timer 및 UI를 즉시 정리한다.
- 파일·clipboard request revision guard와 실패 메시지 동작을 보존한다.
- 새 package를 추가하지 않는다.
- 완료 전 `npm run test`, `npm run lint`, `npm run typecheck`, `npm run build`, `npm run test:e2e`를 모두 실행한다.

---

## 파일 구조

| 파일 | 책임 |
| --- | --- |
| `json-yaml-converter/src/pages/ConverterPage.tsx` | success state/timer와 toast/workspace 조립 |
| `json-yaml-converter/src/components/converter/ConverterWorkspace.tsx` | success prop을 결과 panel로 전달 |
| `json-yaml-converter/src/components/converter/EditorPanel.tsx` | Copy/Check 아이콘과 data state 렌더링 |
| `json-yaml-converter/src/components/feedback/CopySuccessToast.tsx` | live success notification markup |
| `json-yaml-converter/src/styles/theme.css` | success surface token |
| `json-yaml-converter/src/styles/components.css` | success button, toast, motion 스타일 |
| `json-yaml-converter/src/pages/ConverterPage.test.tsx` | timer와 mutation regression |
| `json-yaml-converter/e2e/converter.spec.ts` | clipboard browser flow regression |

### Task 1: 복사 성공 state의 component regression을 먼저 고정한다

**Files:**
- Modify: `json-yaml-converter/src/pages/ConverterPage.test.tsx:135-210`

**Interfaces:**
- Consumes: 결과 복사 button named `결과 복사`, `navigator.clipboard.writeText`
- Produces: `data-copied="true"`, success text `결과를 클립보드에 복사했습니다.`, 2,000ms 자동 초기화

- [ ] **Step 1: success state와 자동 복귀의 failing test를 작성한다.**

```tsx
it('복사 성공을 체크 버튼과 일시 알림으로 표시한 뒤 기본 상태로 돌린다', async () => {
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText: vi.fn().mockResolvedValue(undefined) },
  });
  renderPage();
  fireEvent.change(screen.getByLabelText('JSON 원본'), { target: { value: '{"a":1}' } });
  act(() => vi.advanceTimersByTime(300));
  fireEvent.click(screen.getByRole('button', { name: '결과 복사' }));
  await act(async () => Promise.resolve());

  const copyButton = screen.getByRole('button', { name: '결과 복사' });
  expect(copyButton).toHaveAttribute('data-copied', 'true');
  expect(screen.getByText('결과를 클립보드에 복사했습니다.')).toHaveClass('copy-success-toast');

  act(() => vi.advanceTimersByTime(2_000));
  expect(copyButton).toHaveAttribute('data-copied', 'false');
  expect(screen.queryByText('결과를 클립보드에 복사했습니다.')).not.toBeInTheDocument();
});
```

- [ ] **Step 2: 표시 중 새 입력이 success feedback을 지우는 failing test를 작성한다.**

```tsx
it('새 원본 mutation은 표시 중인 복사 성공 피드백을 즉시 지운다', async () => {
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText: vi.fn().mockResolvedValue(undefined) },
  });
  renderPage();
  fireEvent.change(screen.getByLabelText('JSON 원본'), { target: { value: '{"a":1}' } });
  act(() => vi.advanceTimersByTime(300));
  fireEvent.click(screen.getByRole('button', { name: '결과 복사' }));
  await act(async () => Promise.resolve());
  fireEvent.change(screen.getByLabelText('JSON 원본'), { target: { value: '{"a":2}' } });

  expect(screen.getByRole('button', { name: '결과 복사' })).toHaveAttribute('data-copied', 'false');
  expect(screen.queryByText('결과를 클립보드에 복사했습니다.')).not.toBeInTheDocument();
});
```

- [ ] **Step 3: focused component test가 현재 기능 부재로 실패하는지 확인한다.**

Run:

```bash
cd json-yaml-converter
npm run test -- --run src/pages/ConverterPage.test.tsx
```

Expected: `data-copied` 또는 `copy-success-toast` assertion에서 FAIL한다.

### Task 2: 최소 production code와 browser regression을 추가한다

**Files:**
- Create: `json-yaml-converter/src/components/feedback/CopySuccessToast.tsx`
- Modify: `json-yaml-converter/src/pages/ConverterPage.tsx:1-132`
- Modify: `json-yaml-converter/src/components/converter/ConverterWorkspace.tsx:10-65`
- Modify: `json-yaml-converter/src/components/converter/EditorPanel.tsx:1-65`
- Modify: `json-yaml-converter/src/styles/theme.css:1-70`
- Modify: `json-yaml-converter/src/styles/components.css:25-70`
- Modify: `json-yaml-converter/e2e/converter.spec.ts:1-120`

**Interfaces:**
- Consumes: `copySucceeded: boolean`, `onCopy(): void`
- Produces: `CopySuccessToast`, `EditorPanel` copy `data-copied`, 2,000ms reset

- [ ] **Step 1: page state와 cleanup helper를 추가한다.**

```tsx
const [copySucceeded, setCopySucceeded] = useState(false);
const copyFeedbackTimerRef = useRef<number | null>(null);

const clearCopyFeedback = () => {
  if (copyFeedbackTimerRef.current !== null) window.clearTimeout(copyFeedbackTimerRef.current);
  copyFeedbackTimerRef.current = null;
  setCopySucceeded(false);
};
```

`beginMutation`, unmount cleanup, 그리고 최신 clipboard success branch에서 위 helper를 각각 사용한다. success branch는 `setCopySucceeded(true)` 뒤 `window.setTimeout(clearCopyFeedback, 2_000)`을 저장한다.

- [ ] **Step 2: feedback UI contract를 연결한다.**

```tsx
{copySucceeded ? <CopySuccessToast /> : null}
<ConverterWorkspace
  state={state}
  theme={theme}
  sourceEditorRef={sourceEditorRef}
  activeTab={activeTab}
  filePending={filePending}
  copySucceeded={copySucceeded}
  onTabChange={handleTabChange}
  onSourceChange={handleSourceChange}
  onPretty={handlePretty}
  onCopy={handleCopy}
  onDownload={handleDownload}
  onSwap={handleSwap}
  onDiagnosticFocus={handleDiagnosticFocus}
/>
```

```tsx
export function CopySuccessToast() {
  return <div className="copy-success-toast" role="status" aria-live="polite">
    <Check size={16} aria-hidden="true" />
    <span>결과를 클립보드에 복사했습니다.</span>
  </div>;
}
```

```tsx
<Button
  type="button"
  variant="icon"
  aria-label="결과 복사"
  title="결과 복사"
  data-copied={copySucceeded}
  onClick={onCopy}
  disabled={resultDisabled}
>
  {copySucceeded ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
</Button>
```

- [ ] **Step 3: theme와 component styles를 추가한다.**

```css
--success-surface: rgba(24, 121, 78, 0.10);

.btn-icon[data-copied="true"] {
  color: var(--success);
  background: var(--success-surface);
  border-color: var(--success);
}
.copy-success-toast {
  position: fixed;
  right: 24px;
  bottom: 24px;
  z-index: 10;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 14px;
  color: var(--text-neutral);
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-md);
  animation: copy-feedback-in var(--dur) var(--ease);
}
```

dark token은 `rgba(87, 198, 138, 0.16)`을 사용하고 mobile media query에서 toast 좌우와 하단을 12px로 설정한다.

- [ ] **Step 4: focused component regression이 통과하는지 확인한다.**

Run:

```bash
npm run test -- --run src/pages/ConverterPage.test.tsx
```

Expected: `ConverterPage` test file PASS, 2개 feedback regression이 PASS한다.

- [ ] **Step 5: actual browser flow의 failing E2E를 작성한다.**

```ts
test('결과 복사 성공을 체크와 일시 알림으로 안내한다', async ({ page }) => {
  await page.goto('/');
  await fillMonaco(page, 'JSON 원본', '{"name":"tool-hub"}');
  const copyButton = page.getByRole('button', { name: '결과 복사' });
  await copyButton.click();

  await expect(copyButton).toHaveAttribute('data-copied', 'true');
  await expect(page.getByText('결과를 클립보드에 복사했습니다.')).toBeVisible();
  await expect(page.getByText('결과를 클립보드에 복사했습니다.')).toBeHidden({ timeout: 3_000 });
  await expect(copyButton).toHaveAttribute('data-copied', 'false');
});
```

- [ ] **Step 6: focused E2E와 static checks를 통과시킨다.**

Run:

```bash
npm run test:e2e -- --grep "결과 복사 성공을 체크와 일시 알림"
npm run lint
npm run typecheck
```

Expected: browser test PASS, lint/typecheck exit 0.

- [ ] **Step 7: Task 2를 커밋한다.**

```bash
git add json-yaml-converter/src/pages/ConverterPage.tsx json-yaml-converter/src/components/converter/ConverterWorkspace.tsx json-yaml-converter/src/components/converter/EditorPanel.tsx json-yaml-converter/src/components/feedback/CopySuccessToast.tsx json-yaml-converter/src/styles/theme.css json-yaml-converter/src/styles/components.css json-yaml-converter/src/pages/ConverterPage.test.tsx json-yaml-converter/e2e/converter.spec.ts
git commit -m "feat(json-yaml-converter): add transient copy feedback"
```

### Task 3: 전체 검증

**Files:**
- Verify: all Task 1 and Task 2 files

**Interfaces:**
- Consumes: final implementation and regressions
- Produces: verified feature branch

- [ ] **Step 1: required full verification을 실행한다.**

Run:

```bash
npm run test
npm run lint
npm run typecheck
npm run build
npm run test:e2e
```

Expected: 모든 명령 exit 0. build의 Monaco chunk size 경고 외에는 오류가 없어야 한다.

- [ ] **Step 2: diff와 implementation checklist를 검토한다.**

Run:

```bash
git diff main...HEAD --check
git status --short
```

Expected: whitespace error가 없고, 구현 커밋 뒤 작업 트리가 비어 있다.
