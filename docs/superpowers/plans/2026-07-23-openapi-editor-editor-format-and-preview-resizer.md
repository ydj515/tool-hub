# OpenAPI Editor Format Menu and Preview Resizer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move format controls into the source editor header and make the editor-preview divider resize both panels predictably.

**Architecture:** Extract the controlled hover/focus utility-menu shell so the top bar and editor header share identical pointer, keyboard, and touch behavior. Pass format commands from `App` through `Workspace` to `DocumentEditor`. Store panel proportions as a three-part total and render all three values as CSS Grid `fr` tracks; calculate the second divider relative to the navigator width.

**Tech Stack:** React 19, TypeScript, Vitest, Playwright, CSS Grid.

---

### Task 1: Pin down the format-menu location

**Files:**
- Create: `openapi-editor/src/components/common/UtilityMenu.tsx`
- Modify: `openapi-editor/src/components/layout/Topbar.tsx`
- Modify: `openapi-editor/src/components/editor/DocumentEditor.tsx`
- Modify: `openapi-editor/src/components/layout/Workspace.tsx`
- Modify: `openapi-editor/src/App.tsx`
- Modify: `openapi-editor/src/App.test.tsx`
- Modify: `openapi-editor/e2e/openapi-editor.spec.ts`

- [x] **Step 1: Write failing location and interaction tests**

```ts
expect(screen.getByLabelText('형식 메뉴').closest('.editor-header')).not.toBeNull();
expect(screen.getByLabelText('형식 메뉴').closest('.topbar-secondary-row')).toBeNull();
```

```ts
await page.getByLabel('형식 메뉴', { exact: true }).hover();
await page.getByRole('menuitem', { name: 'JSON으로 변환', exact: true }).click();
await expect(page.locator('.format-badge')).toHaveText('JSON');
```

- [x] **Step 2: Run the focused tests and verify the old top-bar placement fails**

Run: `npm run test -- src/App.test.tsx` and `npm run test:e2e -- --grep "format"`

Expected: the location assertion fails because `형식 메뉴` is currently in `.topbar-secondary-row`.

- [x] **Step 3: Extract and relocate the menu**

```ts
export function UtilityMenu({ label, isOpen, onOpen, onClose, children }: UtilityMenuProps) {
  // Existing delayed pointer-close and focus behavior moves here unchanged.
}
```

`Topbar` keeps `내보내기` and `샘플`, while `DocumentEditor` receives the five existing format actions and exposes them from `editor-header`. `App` forwards format command callbacks through `Workspace`; format actions remain disabled while a conversion is under review.

- [x] **Step 4: Re-run the focused tests**

Run: `npm run test -- src/App.test.tsx` and `npm run test:e2e -- --grep "format"`

Expected: format menu is in the editor header and JSON conversion remains functional.

### Task 2: Make the editor-preview divider control real panel widths

**Files:**
- Modify: `openapi-editor/src/hooks/usePanelLayout.ts`
- Create: `openapi-editor/src/hooks/usePanelLayout.test.tsx`
- Modify: `openapi-editor/src/components/layout/Workspace.tsx`
- Modify: `openapi-editor/src/styles/components.css`
- Modify: `openapi-editor/e2e/openapi-editor.spec.ts`

- [x] **Step 1: Write failing ratio and browser-drag tests**

```ts
act(() => result.current.resize('editor', 61));
expect(result.current.layout).toMatchObject({ navigator: 22, editor: 39, preview: 39 });
```

```ts
const before = await page.locator('.preview-panel').boundingBox();
await page.getByLabel('미리보기 폭 조절').dragTo(/* 120px left of current divider */);
await expect.poll(async () => (await page.locator('.preview-panel').boundingBox())?.width).toBeLessThan(before!.width);
```

- [x] **Step 2: Run the focused tests and verify the current implementation fails**

Run: `npm run test -- src/hooks/usePanelLayout.test.tsx` and `npm run test:e2e -- --grep "미리보기.*폭"`

Expected: the current right-divider math treats `61` as the editor width rather than the divider position, and the browser assertion does not show the expected proportional resize.

- [x] **Step 3: Implement consistent three-panel sizing**

```ts
if (left === 'editor') {
  const editor = clamp(percent - navigator, MIN_EDITOR, 100 - navigator - MIN_PREVIEW);
  return { ...current, editor, preview: 100 - navigator - editor };
}
```

Render `navigator`, `editor`, and `preview` as `fr` grid-track custom properties so all persisted layout values affect CSS. Keep the 44px collapsed tracks and add `pointercancel` cleanup to the drag listener.

- [x] **Step 4: Re-run the focused tests**

Run: `npm run test -- src/hooks/usePanelLayout.test.tsx` and `npm run test:e2e -- --grep "미리보기.*폭"`

Expected: the right divider changes preview width and preserves the three-panel total.

### Task 3: Verify the integrated UI

**Files:**
- Verify: `openapi-editor/src/App.test.tsx`
- Verify: `openapi-editor/src/hooks/usePanelLayout.test.tsx`
- Verify: `openapi-editor/e2e/openapi-editor.spec.ts`

- [x] **Step 1: Run project verification**

Run: `mise run check`

Expected: unit tests, lint, typecheck, production build, and Playwright tests pass.

- [x] **Step 2: Check patch whitespace**

Run: `git diff --check`

Expected: no whitespace errors.

- [x] **Step 3: Leave the workspace unstaged**

Do not stage or commit because the user has not requested a commit and the workspace contains unrelated in-progress changes.
