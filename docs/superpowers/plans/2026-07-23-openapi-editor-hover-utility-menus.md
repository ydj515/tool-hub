# OpenAPI Studio Hover Utility Menus Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 상단 보조 메뉴를 호버·포커스·터치 친화적인 직접 실행 메뉴로 바꾸고, 샘플과 형식 작업의 의미를 명확하게 한다.

**Architecture:** `Topbar`는 열린 메뉴 식별자를 로컬 상태로 관리하는 접근성 있는 팝오버 메뉴를 제공한다. `useWorkspace`는 대상 문서 형식을 받아 직렬화하며, `App`은 샘플 선택 상태 없이 버전별 다운로드 콜백을 `Topbar`에 전달한다.

**Tech Stack:** React 19, TypeScript, CSS, Vitest, Playwright.

---

## File Structure

- `openapi-editor/src/hooks/useWorkspace.ts` — 목표 형식 기반 직렬화 API를 제공한다.
- `openapi-editor/src/App.tsx` — 제거된 샘플 선택 상태를 정리하고 변경된 변환 콜백을 연결한다.
- `openapi-editor/src/components/layout/Topbar.tsx` — 호버·포커스·터치 메뉴와 직접 실행 항목을 렌더링한다.
- `openapi-editor/src/styles/components.css` — 트리거, 팝오버, 메뉴 항목, 좁은 화면 정렬을 담당한다.
- `openapi-editor/src/App.test.tsx` — 샘플 메뉴의 직접 다운로드 항목과 접근성 표면을 검증한다.
- `openapi-editor/e2e/openapi-editor.spec.ts` — 호버, 직접 다운로드, 목표 형식 변환을 브라우저에서 검증한다.

### Task 1: 목표 형식 변환 API와 앱 연결

**Files:**
- Modify: `openapi-editor/src/hooks/useWorkspace.ts:27-38,139-146`
- Modify: `openapi-editor/src/App.tsx:1-63`
- Create: `openapi-editor/src/hooks/useWorkspace.test.tsx`

- [x] **Step 1: 현재 형식과 같은 목표를 요청해도 문서를 다시 변환하지 않는 실패 테스트를 작성한다.**

```tsx
import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useWorkspace } from './useWorkspace';

describe('useWorkspace', () => {
  afterEach(() => vi.useRealTimers());

  it('keeps a valid JSON document unchanged when JSON is requested', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useWorkspace());

    act(() => result.current.forceFormat('json'));
    act(() => result.current.setSource('{"openapi":"3.1.2","info":{"title":"Pets","version":"1.0.0"},"paths":{}}'));
    act(() => vi.advanceTimersByTime(400));
    const source = result.current.state.source;
    act(() => result.current.convertFormat('json'));

    expect(result.current.state.format).toBe('json');
    expect(result.current.state.source).toBe(source);
  });
});
```

- [x] **Step 2: 실패를 확인한다.**

Run: `npm run test -- src/hooks/useWorkspace.test.tsx`

Expected: 기존 토글 구현은 JSON을 YAML로 바꾸므로 형식 또는 원본 일치 assertion에서 FAIL한다.

- [x] **Step 3: `convertFormat`이 목표 형식을 받도록 최소 구현을 한다.**

```ts
convertFormat: (format: DocumentFormat) => void;

const convertFormat = (format: DocumentFormat) => {
  const current = stateRef.current;
  if (current.format === format || !current.analysis?.parsed.value || hasError(current.analysis)) return;
  const source = serializeDocument(current.analysis.parsed.value, format);
  replace((previous) => ({ ...previous, restoreSnapshot: previous.source, format }));
  analyze(source, current.filename, format);
};
```

- [x] **Step 4: `App`에서 선택된 샘플 상태와 콜백을 제거하고 새 변환 콜백을 전달한다.**

```tsx
export default function App() {
  const { theme, toggle } = useTheme();
  const workspace = useWorkspace();
  const [target, setTarget] = useState<SpecFamily>('openapi-3.1');
  const { state } = workspace;
  const valid = canUseParsedDocument(state);
  const conversionEnabled = valid && state.analysis?.version !== undefined && state.status !== 'converting';
  const download = (format: DocumentFormat) => {
    const text = state.analysis?.parsed.value
      ? serializeDocument(state.analysis.parsed.value, format)
      : format === state.format ? state.source : undefined;
    if (!text) return;
    downloadText(text, normalizeDownloadFilename(state.filename, format), format);
  };
  const downloadSample = (version: SpecFamily) => {
    downloadText(serializeDocument(sampleDocumentFor(version), 'yaml'), sampleDownloadFilename(version), 'yaml');
  };

  return <Topbar
    filename={state.filename}
    format={state.format}
    sourceVersion={state.analysis?.version}
    target={target}
    conversionEnabled={conversionEnabled}
    formatConversionEnabled={valid}
    reviewing={state.status === 'reviewing'}
    theme={theme}
    onFile={(file) => { void workspace.loadFile(file); }}
    onTarget={setTarget}
    onDownloadSample={downloadSample}
    onConvert={() => workspace.requestConversion(target)}
    onConvertFormat={workspace.convertFormat}
    onRedetect={workspace.redetectFormat}
    onForceFormat={workspace.forceFormat}
    onDownload={download}
    canDownloadYaml={valid || (state.source.trim() !== '' && state.format === 'yaml')}
    canDownloadJson={valid || (state.source.trim() !== '' && state.format === 'json')}
    onRestore={workspace.restoreSource}
    canRestore={state.restoreSnapshot !== undefined}
    onToggleTheme={toggle}
  />;
}
```

- [x] **Step 5: 훅 테스트를 통과시키고 기존 앱 테스트를 실행한다.**

Run: `npm run test -- src/hooks/useWorkspace.test.tsx src/App.test.tsx`

Expected: PASS.

### Task 2: 직접 실행 유틸리티 메뉴 구현

**Files:**
- Modify: `openapi-editor/src/components/layout/Topbar.tsx:1-94`
- Modify: `openapi-editor/src/styles/components.css:18-30,47`
- Modify: `openapi-editor/src/App.test.tsx:15-33`

- [x] **Step 1: 샘플 선택 상자 제거와 버전별 직접 다운로드 항목을 요구하는 실패 테스트를 작성한다.**

```tsx
it('renders direct sample downloads without a sample selector', async () => {
  const user = userEvent.setup();
  render(<App />);

  expect(screen.queryByLabelText('샘플 버전')).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: '샘플 다운로드' })).not.toBeInTheDocument();
  await user.click(screen.getByLabelText('샘플 메뉴'));
  expect(screen.getByRole('button', { name: 'Swagger 2.0 샘플 다운로드' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'OpenAPI 3.2.0 샘플 다운로드' })).toBeInTheDocument();
});
```

- [x] **Step 2: 실패를 확인한다.**

Run: `npm run test -- src/App.test.tsx`

Expected: 기존 샘플 선택 상자와 버튼이 남아 있어 FAIL한다.

- [x] **Step 3: 단일 활성 메뉴 상태를 가진 `UtilityMenu`를 구현한다.**

```tsx
type UtilityMenuName = 'format' | 'export' | 'sample';

function UtilityMenu({ name, label, openMenu, onOpen, onClose, children }: {
  name: UtilityMenuName;
  label: string;
  openMenu: UtilityMenuName | null;
  onOpen(name: UtilityMenuName): void;
  onClose(): void;
  children: ReactNode;
}) {
  const isOpen = openMenu === name;
  return <div className="utility-menu" onMouseEnter={() => onOpen(name)} onMouseLeave={onClose}
    onFocusCapture={() => onOpen(name)} onBlurCapture={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget)) onClose();
    }}>
    <button className="secondary-btn compact" type="button" aria-label={`${label} 메뉴`}
      aria-haspopup="menu" aria-expanded={isOpen} onClick={() => onOpen(name)}>
      {label}<ChevronDown size={14} />
    </button>
    {isOpen && <div className="utility-menu-popover" role="menu" aria-label={`${label} 작업`}>{children}</div>}
  </div>;
}
```

- [x] **Step 4: 메뉴 밖 클릭과 Escape에서 활성 메뉴를 닫는다.**

```tsx
const [openMenu, setOpenMenu] = useState<UtilityMenuName | null>(null);
const menuAreaRef = useRef<HTMLDivElement>(null);

useEffect(() => {
  const closeOutside = (event: PointerEvent) => {
    if (!menuAreaRef.current?.contains(event.target as Node)) setOpenMenu(null);
  };
  const closeEscape = (event: KeyboardEvent) => {
    if (event.key === 'Escape') setOpenMenu(null);
  };
  document.addEventListener('pointerdown', closeOutside);
  document.addEventListener('keydown', closeEscape);
  return () => {
    document.removeEventListener('pointerdown', closeOutside);
    document.removeEventListener('keydown', closeEscape);
  };
}, []);
```

- [x] **Step 5: 형식·내보내기·샘플 메뉴 항목을 직접 실행으로 교체한다.**

```tsx
const sampleLabel: Record<SpecFamily, string> = {
  'swagger-2.0': 'Swagger 2.0',
  'openapi-3.0': 'OpenAPI 3.0.4',
  'openapi-3.1': 'OpenAPI 3.1.2',
  'openapi-3.2': 'OpenAPI 3.2.0',
};

interface TopbarProps {
  filename?: string;
  format: DocumentFormat;
  sourceVersion?: SpecFamily;
  target: SpecFamily;
  conversionEnabled: boolean;
  formatConversionEnabled: boolean;
  reviewing: boolean;
  theme: Theme;
  onFile(file: File): void;
  onTarget(target: SpecFamily): void;
  onConvertFormat(format: DocumentFormat): void;
  onDownloadSample(version: SpecFamily): void;
  onConvert(): void;
  onRedetect(): void;
  onForceFormat(format: DocumentFormat): void;
  onDownload(format: DocumentFormat): void;
  canDownloadYaml: boolean;
  canDownloadJson: boolean;
  onRestore(): void;
  canRestore: boolean;
  onToggleTheme(): void;
}

<UtilityMenu name="format" label="형식" openMenu={openMenu} onOpen={setOpenMenu} onClose={() => setOpenMenu(null)}>
  <button type="button" role="menuitem" aria-label="YAML로 변환" disabled={!formatConversionEnabled || format === 'yaml'} onClick={() => { onConvertFormat('yaml'); setOpenMenu(null); }}>YAML로 변환</button>
  <button type="button" role="menuitem" aria-label="JSON으로 변환" disabled={!formatConversionEnabled || format === 'json'} onClick={() => { onConvertFormat('json'); setOpenMenu(null); }}>JSON으로 변환</button>
  <button type="button" role="menuitem" aria-label="형식 다시 감지" onClick={() => { onRedetect(); setOpenMenu(null); }}>형식 다시 감지</button>
  <button type="button" role="menuitem" aria-label="YAML로 읽기" onClick={() => { onForceFormat('yaml'); setOpenMenu(null); }}>YAML로 읽기</button>
  <button type="button" role="menuitem" aria-label="JSON으로 읽기" onClick={() => { onForceFormat('json'); setOpenMenu(null); }}>JSON으로 읽기</button>
</UtilityMenu>

<UtilityMenu name="sample" label="샘플" openMenu={openMenu} onOpen={setOpenMenu} onClose={() => setOpenMenu(null)}>
  {(['swagger-2.0', 'openapi-3.0', 'openapi-3.1', 'openapi-3.2'] as const).map((version) => (
    <button key={version} type="button" role="menuitem" aria-label={`${sampleLabel[version]} 샘플 다운로드`} onClick={() => { onDownloadSample(version); setOpenMenu(null); }}>
      <Download size={15} />{sampleLabel[version]}
    </button>
  ))}
</UtilityMenu>
```

- [x] **Step 6: 팝오버와 터치 화면 스타일을 적용한다.**

```css
.utility-menu { position: relative; }
.utility-menu-popover { position: absolute; z-index: 10; top: calc(100% + 6px); right: 0; min-width: 194px; padding: 7px; display: grid; gap: 5px; }
.utility-menu-popover [role="menuitem"] { width: 100%; height: 36px; justify-content: flex-start; }
@media (max-width: 767px) {
  .utility-menu-popover { right: auto; left: 0; }
}
```

- [x] **Step 7: 앱 테스트를 통과시킨다.**

Run: `npm run test -- src/App.test.tsx`

Expected: PASS.

### Task 3: 브라우저 메뉴·다운로드 회귀 테스트

**Files:**
- Modify: `openapi-editor/e2e/openapi-editor.spec.ts:1-108`

- [x] **Step 1: 호버로 연 메뉴 항목이 보이는 실패 E2E를 작성한다.**

```ts
async function replaceSource(page: Page, source: string): Promise<void> {
  await page.locator('.monaco-editor').click();
  await page.keyboard.press('ControlOrMeta+A');
  await page.keyboard.insertText(source);
  await expect(page.getByText('검증 완료')).toBeVisible();
}

test('opens the export menu on hover and downloads YAML directly', async ({ page }) => {
  await page.goto('/');
  await replaceSource(page, 'openapi: 3.1.2\ninfo:\n  title: Pets\n  version: 1.0.0\npaths: {}');
  await page.getByLabel('내보내기 메뉴', { exact: true }).hover();
  await expect(page.getByRole('menu', { name: '내보내기 작업' })).toBeVisible();

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('menuitem', { name: 'YAML 다운로드' }).click();
  expect((await downloadPromise).suggestedFilename()).toBe('openapi.yaml');
});
```

- [x] **Step 2: 실패를 확인한다.**

Run: `npm run test:e2e -- --grep "opens the export menu on hover"`

Expected: 기존 `details` 메뉴가 호버로 열리지 않아 FAIL한다.

- [x] **Step 3: 샘플 테스트를 버전별 직접 다운로드로 교체한다.**

```ts
async function downloadSample(page: Page, label: string): Promise<{ filename: string; document: Record<string, unknown> }> {
  await page.getByLabel('샘플 메뉴', { exact: true }).hover();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('menuitem', { name: `${label} 샘플 다운로드` }).click();
  const download = await downloadPromise;
  const stream = await download.createReadStream();
  if (!stream) throw new Error('샘플 다운로드 스트림을 만들 수 없습니다.');
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  return { filename: download.suggestedFilename(), document: parse(Buffer.concat(chunks).toString('utf8')) as Record<string, unknown> };
}

const sampleVersions = [
  ['Swagger 2.0', 'swagger-2.0-sample.yaml', 'swagger', '2.0'],
  ['OpenAPI 3.0.4', 'openapi-3.0-sample.yaml', 'openapi', '3.0.4'],
  ['OpenAPI 3.1.2', 'openapi-3.1-sample.yaml', 'openapi', '3.1.2'],
  ['OpenAPI 3.2.0', 'openapi-3.2-sample.yaml', 'openapi', '3.2.0'],
] as const;

for (const [label, filename, versionKey, expectedVersion] of sampleVersions) {
  test(`downloads the ${label} sample as valid YAML`, async ({ page }) => {
    await page.goto('/');
    const sample = await downloadSample(page, label);
    expect(sample.filename).toBe(filename);
    expect(sample.document).toMatchObject({ [versionKey]: expectedVersion, info: { title: 'Task API' }, paths: expect.any(Object) });
  });
}
```

- [x] **Step 4: 목표 형식 변환과 모바일 탭 메뉴를 검증한다.**

```ts
test('converts a valid document to JSON from the format menu', async ({ page }) => {
  await page.goto('/');
  await replaceSource(page, 'openapi: 3.1.2\ninfo:\n  title: Pets\n  version: 1.0.0\npaths: {}');
  await page.getByLabel('형식 메뉴').hover();
  await page.getByRole('menuitem', { name: 'JSON으로 변환' }).click();
  await expect(page.locator('.format-badge')).toHaveText('JSON');
});

test('opens a utility menu by tap on a narrow viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByLabel('샘플 메뉴').click();
  await expect(page.getByRole('menuitem', { name: 'OpenAPI 3.2.0 샘플 다운로드' })).toBeVisible();
});
```

- [x] **Step 5: E2E를 통과시킨다.**

Run: `npm run test:e2e`

Expected: PASS.

### Task 4: 시각 검증과 전체 품질 확인

**Files:**
- Modify: `docs/superpowers/plans/2026-07-23-openapi-editor-hover-utility-menus.md`

- [x] **Step 1: 데스크톱에서 내보내기와 샘플 메뉴의 호버 상태를 캡처해 확인한다.**

Run: `npm run dev -- --host 127.0.0.1`

Expected: 트리거 위 포인터에서 팝오버가 열리고, 샘플 메뉴에 선택 상자나 중복 라벨 없이 네 버전 항목이 표시된다.

- [x] **Step 2: 좁은 화면에서 메뉴 팝오버가 화면 바깥으로 벗어나지 않는지 확인한다.**

Run: Playwright CLI로 390px 너비를 설정한 뒤 `샘플 메뉴`를 클릭한다.

Expected: 왼쪽 기준으로 열린 메뉴와 모든 항목이 뷰포트 안에 표시된다.

- [x] **Step 3: 전체 검증을 실행한다.**

Run: `mise run check`

Expected: unit test, lint, typecheck, build, E2E 모두 exit 0.

- [x] **Step 4: 공백 오류를 확인하고 계획 체크박스를 완료로 갱신한다.**

Run: `git diff --check`

Expected: 출력 없이 exit 0.
