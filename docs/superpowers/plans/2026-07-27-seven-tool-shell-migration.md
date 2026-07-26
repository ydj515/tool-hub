# 7개 웹 도구 카드형 셸 마이그레이션 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 생성된 ToolHeader·ThemeToggle·BrandMark·Button·Segmented Control·Empty State·Badge를 7개 도구가 실제로 사용하게 하고 제품명, 한국어 UI, 파비콘, 표준 breakpoint를 함께 통일한다.

**Architecture:** 각 앱은 기존 상태·이벤트·도메인 adapter를 유지하고 `components/design-system/` 생성물에 props만 주입한다. 앱 고유 CSS는 workspace와 도메인 패널만 소유하며 헤더·기본 컨트롤·빈 상태·배지의 시각 규격은 `ds-primitives.css`가 소유한다.

**Tech Stack:** React 19 · Vite 8 · Next.js 16 · TypeScript · Vitest · Playwright · lucide-react 1.14.0 · CSS design tokens

## Global Constraints

- 이 계획은 [`2026-07-27-generated-design-system-foundation.md`](./2026-07-27-generated-design-system-foundation.md)의 Completion Gate를 통과한 상태에서 시작한다.
- `src/components/design-system/*`, `app/_components/design-system/*`, `styles/ds-*`, `public/favicon*`, `site.webmanifest`는 생성물이며 직접 편집하지 않는다.
- 제품명은 `Sign Maker`, `JSON/YAML Converter`, `OpenAPI Editor`, `API Contract Test Generator`, `DDL Seed Generator`, `Config Diff Viewer`, `Dummy File Generator`만 사용한다.
- 화면 제목, 설명, 버튼, 도움말, Empty State, 오류, 접근성 라벨은 한국어로 쓴다.
- JSON, YAML, OpenAPI, DDL, SQL, API, HTTP method와 `B`·`KiB`·`MiB`는 번역하지 않는다.
- 카드형 헤더는 768px 이상 1행, 768px 미만 브랜드+테마 첫째 줄과 actions 둘째 줄이다.
- 허용 CSS 경계는 768/1024/1280뿐이며 닫힌 max 구간 767/1023/1279는 허용한다.
- 공통 disabled control에 opacity를 적용하지 않는다.
- 공통 UI의 Lucide 아이콘은 `size={16}`과 `strokeWidth={2}`를 명시하거나 생성 컴포넌트가 강제한다.
- `home` 헤더와 각 앱의 도메인 로직은 변경하지 않는다.
- 각 Task는 해당 앱의 local `AGENTS.md`가 요구하는 test, lint, typecheck, build, e2e를 모두 통과해야 한다.

---

## File Structure

### Vite 공통 변경

- Modify: `<app>/index.html` — 제품 title과 전체 favicon link set
- Modify: `<app>/src/components/layout/{Header|Topbar}.tsx` — 생성 ToolHeader 조합
- Modify: `<app>/src/{App|components/layout/Layout}.tsx` — `data-ds-page-shell`
- Modify: `<app>/src/styles/components.css` — 앱 고유 action/workspace와 표준 breakpoint만 유지
- Delete: 앱별 중복 `components/ui/Button.tsx`, `SegmentedTabs.tsx` 중 대체 완료 파일

### Next.js 공통 변경

- Modify: `<app>/app/layout.tsx` — title, icons, manifest metadata
- Modify: `<app>/app/_components/{Topbar|*-client}.tsx` — 생성 셸 조합과 `data-ds-page-shell`
- Modify: `<app>/app/styles/components.css` — 중복 프리미티브 제거와 표준 breakpoint
- Delete: `<app>/app/favicon.ico` — `public/` 생성 세트로 대체

### 공통 import 원칙

```tsx
// Vite layout/component
import { ToolHeader } from '../design-system/ToolHeader';
import { PRODUCT, ProductIcon } from '../design-system/product.generated';

// Next topbar/component
import { ToolHeader } from './design-system/ToolHeader';
import { PRODUCT, ProductIcon } from './design-system/product.generated';
```

ToolHeader에는 항상 `product={{ ...PRODUCT, icon: ProductIcon }}`를 전달한다.

---

### Task 1: Sign Maker를 카드형 셸과 공통 Button·Segmented Control로 전환한다

**Files:**
- Create: `sign-maker/src/components/layout/Header.test.tsx`
- Modify: `sign-maker/src/components/layout/Header.tsx`
- Modify: `sign-maker/src/components/layout/Layout.tsx`
- Modify: `sign-maker/src/components/DrawControls.tsx`
- Modify: `sign-maker/src/components/ImageControls.tsx`
- Modify: `sign-maker/src/components/ImageUploader.tsx`
- Modify: `sign-maker/src/App.test.ts`, `sign-maker/src/App.ui.test.tsx`
- Modify: `sign-maker/src/styles/components.css`
- Modify: `sign-maker/index.html`
- Delete: `sign-maker/src/components/ui/Button.tsx`
- Delete: `sign-maker/src/components/ui/SegmentedTabs.tsx`

**Interfaces:**
- `Header`의 기존 props `theme`, `onToggleTheme`, `activeTab`, `onTabChange`는 유지한다.
- `Layout`은 최상위 `.ds-page`에 `data-ds-page-shell`을 추가한다.

- [ ] **Step 1: 승인된 이름·슬롯·한국어 세그먼트의 실패 테스트를 작성한다**

```tsx
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import Header from './Header';

describe('Sign Maker Header', () => {
  it('공통 카드 셸과 한국어 모드명을 쓴다', () => {
    const html = renderToStaticMarkup(<Header theme="light" onToggleTheme={() => {}} activeTab="draw" onTabChange={() => {}} />);
    expect(html).toContain('data-ds-tool-header="true"');
    expect(html).toContain('Sign Maker');
    expect(html).toContain('그리기');
    expect(html).toContain('업로드');
    expect(html).not.toContain('Signature &amp; Trace Studio');
    expect(html.indexOf('data-ds-segmented')).toBeLessThan(html.indexOf('data-ds-theme-toggle'));
  });
});
```

- [ ] **Step 2: 테스트가 기존 제품명과 영문 탭 때문에 실패하는지 확인한다**

Run: `cd sign-maker && npm run test -- src/components/layout/Header.test.tsx`

Expected: FAIL because `data-ds-tool-header` and `Sign Maker` are absent.

- [ ] **Step 3: Header를 생성 컴포넌트 조합으로 교체한다**

```tsx
import { Image, PenLine } from 'lucide-react';
import { TOOL_HUB_URL } from '../../constants';
import { SegmentedControl } from '../design-system/SegmentedControl';
import { ToolHeader } from '../design-system/ToolHeader';
import { PRODUCT, ProductIcon } from '../design-system/product.generated';

export default function Header({ theme, onToggleTheme, activeTab, onTabChange }: HeaderProps) {
  return <ToolHeader
    product={{ ...PRODUCT, icon: ProductIcon }}
    homeHref={TOOL_HUB_URL}
    theme={theme}
    onThemeToggle={onToggleTheme}
    actions={<SegmentedControl value={activeTab} onValueChange={onTabChange} ariaLabel="서명 입력 방식"
      options={[
        { value: 'draw', label: '그리기', icon: <PenLine size={16} strokeWidth={2} /> },
        { value: 'upload', label: '업로드', icon: <Image size={16} strokeWidth={2} /> },
      ]} />}
  />;
}
```

- [ ] **Step 4: 앱의 기본 버튼 import와 페이지 셸을 전환한다**

- `DrawControls.tsx`, `ImageControls.tsx`, `ImageUploader.tsx`: `./ui/Button`을 `./design-system/Button`으로 변경한다.
- variant는 기존 `primary|secondary`를 그대로 전달한다.
- `DrawControls.tsx`와 `ImageControls.tsx`의 `h-10` class를 제거해 정본 36px 높이를 덮지 않게 한다.
- `Layout.tsx`: `<div className="ds-page" data-ds-page-shell>`로 변경한다.
- 기존 앱 테스트의 heading 기대값을 `Sign Maker`로 바꾼다.

- [ ] **Step 5: 중복 CSS와 제품 metadata를 정리한다**

- `components.css`에서 `.btn-primary`, `.btn-secondary`, `.app-mark`, `.seg`, `.seg-btn` 블록을 제거한다.
- header 여백은 `.ds-tool-header { margin-bottom: 20px; }` 한 줄만 앱 CSS에 둔다.
- `index.html` title을 `Sign Maker`로 바꾸고 다음 favicon 선언을 사용한다.

```html
<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
<link rel="manifest" href="/site.webmanifest" />
<title>Sign Maker</title>
```

- [ ] **Step 6: Header 테스트와 앱 전체 검증을 실행한다**

Run: `cd sign-maker && npm run test -- src/components/layout/Header.test.tsx`

Run: `cd sign-maker && mise run check`

Expected: Header test PASS; test, lint, typecheck, build, e2e all exit 0.

- [ ] **Step 7: 커밋한다**

```bash
git add sign-maker
git commit -m "feat(sign-maker): adopt the canonical product shell"
```

---

### Task 2: JSON/YAML Converter를 정본 casing과 Segmented Control로 전환한다

**Files:**
- Create: `json-yaml-converter/src/components/layout/Header.test.tsx`
- Modify: `json-yaml-converter/src/components/layout/Header.tsx`
- Modify: `json-yaml-converter/src/components/layout/Layout.tsx`
- Modify: `json-yaml-converter/src/components/converter/ConverterToolbar.tsx`
- Modify: `json-yaml-converter/src/components/converter/ConverterWorkspace.tsx`
- Modify: `json-yaml-converter/src/components/converter/EditorPanel.tsx`
- Modify: `json-yaml-converter/src/App.test.tsx`
- Modify: `json-yaml-converter/src/styles/components.css`
- Modify: `json-yaml-converter/index.html`
- Delete: `json-yaml-converter/src/components/ui/Button.tsx`
- Delete: `json-yaml-converter/src/components/ui/Button.test.tsx`

**Interfaces:**
- `HeaderProps`의 direction 상태와 callback은 유지한다.
- 기존 keyboard 전용 로직은 제거하고 공통 `aria-pressed` group semantics를 쓴다.

- [ ] **Step 1: casing과 공통 selector의 실패 테스트를 작성한다**

```tsx
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Header } from './Header';

it('JSON/YAML casing과 공통 셸을 사용한다', () => {
  const html = renderToStaticMarkup(<Header theme="light" direction="json-to-yaml" onDirectionChange={() => {}} onToggleTheme={() => {}} />);
  expect(html).toContain('JSON/YAML Converter');
  expect(html).toContain('data-ds-segmented="true"');
  expect(html).toContain('JSON → YAML');
  expect(html).toContain('data-ds-theme-toggle="true"');
});
```

- [ ] **Step 2: 테스트가 기존 `JSON YAML Converter` 때문에 실패하는지 확인한다**

Run: `cd json-yaml-converter && npm run test -- src/components/layout/Header.test.tsx`

Expected: FAIL on `JSON/YAML Converter`.

- [ ] **Step 3: Header를 ToolHeader와 SegmentedControl로 교체한다**

```tsx
export function Header({ theme, direction, onDirectionChange, onToggleTheme }: HeaderProps) {
  return <ToolHeader
    product={{ ...PRODUCT, icon: ProductIcon }}
    homeHref={TOOL_HUB_URL}
    theme={theme}
    onThemeToggle={onToggleTheme}
    actions={<SegmentedControl value={direction} onValueChange={onDirectionChange} ariaLabel="변환 방향"
      options={[{ value: 'json-to-yaml', label: 'JSON → YAML' }, { value: 'yaml-to-json', label: 'YAML → JSON' }]} />}
  />;
}
```

`Layout.tsx`의 최상위 `.app-shell`에 `data-ds-page-shell`을 추가한다.

- [ ] **Step 4: 모든 기본 Button import를 생성 경로로 옮긴다**

`ConverterToolbar.tsx`, `ConverterWorkspace.tsx`, `EditorPanel.tsx`에서 `../ui/Button` 또는 `../../ui/Button` import를 `../design-system/Button` 또는 `../../design-system/Button`의 named `Button`으로 바꾼다. old wrapper와 그 테스트는 삭제한다.

- [ ] **Step 5: 로컬 중복 스타일과 문서 title을 정리한다**

- `.studio-topbar`, `.studio-brand*`, `.direction-selector*`, `.btn*`, `.theme-button` 시각 선언을 제거한다.
- 앱 action의 폭만 `.ds-tool-header__actions .ds-segmented { min-width: 244px; }`로 둔다.
- 767px media 안의 옛 header selector를 제거한다. workspace mobile 탭 규칙은 보존한다.
- `App.test.tsx` heading을 `JSON/YAML Converter`로 갱신한다.
- `index.html`에 Task 1과 같은 5개 favicon link를 넣고 title을 `JSON/YAML Converter`로 바꾼다.

- [ ] **Step 6: 전체 검증을 실행한다**

Run: `cd json-yaml-converter && mise run check`

Expected: unit/component, lint, typecheck, build, responsive/contrast e2e all PASS.

- [ ] **Step 7: 커밋한다**

```bash
git add json-yaml-converter
git commit -m "feat(json-yaml-converter): adopt the canonical product shell"
```

---

### Task 3: API Contract Test Generator의 랜딩형 헤더와 Badge·Empty State를 교체한다

**Files:**
- Create: `api-contract-test-generator/src/components/layout/Header.test.tsx`
- Modify: `api-contract-test-generator/src/components/layout/Header.tsx`
- Modify: `api-contract-test-generator/src/components/layout/AppShell.tsx`
- Modify: `api-contract-test-generator/src/components/review/EndpointNavigator.tsx`
- Modify: `api-contract-test-generator/src/components/ui/StatusBadge.tsx`
- Modify: `api-contract-test-generator/src/components/input/SpecInputStep.tsx`
- Modify: `api-contract-test-generator/src/components/review/TestCaseDetail.tsx`
- Modify: `api-contract-test-generator/src/components/review/TestCaseList.tsx`
- Modify: `api-contract-test-generator/src/components/review/ReviewStep.tsx`
- Modify: `api-contract-test-generator/src/components/export/ExportStep.tsx`
- Modify: `api-contract-test-generator/src/styles/components.css`
- Modify: `api-contract-test-generator/index.html`
- Delete: `api-contract-test-generator/src/components/ui/Button.tsx`

**Interfaces:**
- `StatusBadge`는 domain status를 공통 `BadgeVariant`로 매핑하는 얇은 adapter로 유지한다.
- `HeaderProps`는 변경하지 않는다.

- [ ] **Step 1: AC 이니셜 제거와 공통 셸의 실패 테스트를 작성한다**

```tsx
it('기능 glyph와 공통 카드 셸을 렌더한다', () => {
  const html = renderToStaticMarkup(<Header theme="light" onToggleTheme={() => {}} />);
  expect(html).toContain('data-ds-tool-header="true"');
  expect(html).toContain('API Contract Test Generator');
  expect(html).toContain('OpenAPI 계약에서 테스트를 생성합니다.');
  expect(html).not.toContain('>AC<');
  expect(html).toContain('다크 테마로 전환');
});
```

- [ ] **Step 2: 테스트가 기존 AC 마크 때문에 실패하는지 확인한다**

Run: `cd api-contract-test-generator && npm run test -- src/components/layout/Header.test.tsx`

Expected: FAIL because old header has no `data-ds-tool-header`.

- [ ] **Step 3: Header와 page shell을 교체한다**

```tsx
export function Header({ theme, onToggleTheme }: HeaderProps) {
  return <ToolHeader product={{ ...PRODUCT, icon: ProductIcon }} homeHref={TOOL_HUB_URL}
    theme={theme} onThemeToggle={onToggleTheme}
    actions={<p className="privacy-note"><ShieldCheck size={16} strokeWidth={2} aria-hidden="true" />명세와 결과는 브라우저 밖으로 전송하지 않습니다.</p>} />;
}
```

`AppShell.tsx`는 `<div className="app-shell" data-ds-page-shell>`을 반환한다.

- [ ] **Step 4: Button·Badge·EmptyState를 정본 primitive로 전환한다**

- 5개 소비 파일의 `../ui/Button` import를 `../design-system/Button`에 맞는 상대 경로로 바꾼다.
- `StatusBadge.tsx`는 다음 map을 사용한다.

```tsx
const variants: Record<Status, BadgeVariant> = {
  explicit: 'success', derived: 'neutral', 'review-required': 'warning',
  valid: 'success', validation: 'danger', boundary: 'warning', authentication: 'danger',
  included: 'primary', excluded: 'neutral',
};
export function StatusBadge({ status }: { status: Status }) {
  return <Badge variant={variants[status]}>{labels[status]}</Badge>;
}
```

- `TestCaseDetail`의 미선택 상태와 `TestCaseList`의 결과 없음 상태를 `EmptyState title="테스트를 선택해 주세요."` 및 `EmptyState title="조건에 맞는 테스트가 없습니다."`로 바꾼다.
- `SpecInputStep.tsx`의 `${n} bytes`를 `${n.toLocaleString()} B`로 바꾼다.
- `SpecInputStep.tsx`, `ReviewStep.tsx`, `ExportStep.tsx`의 `Step 1/2/3`을 `1단계/2단계/3단계`로 바꾼다.
- `EndpointNavigator.tsx`의 `Endpoints`를 `엔드포인트`, `TestCaseDetail.tsx`의 `Selected test`를 `선택한 테스트`로 바꾼다.
- 이 Task에서 수정하는 Button·Badge·EmptyState 내부 Lucide는 모두 `size={16}`과 `strokeWidth={2}`로 맞춘다. export format glyph도 선택 컨트롤 아이콘이므로 16px 대상이다.

- [ ] **Step 5: 로컬 primitive CSS와 favicon entry를 정리한다**

- `.app-header`, `.brand-block`, `.brand-mark`, `.header-actions`, `.button*`, `.status-badge*`, `.empty-state`의 시각 선언을 제거한다.
- `.privacy-note`의 typography/layout만 남긴다.
- 768~1199 query는 768~1279로 바꾼다. mobile max 767은 유지한다.
- `index.html`에 5개 favicon link를 추가한다. 이 앱에 없던 favicon이 이 단계에서 처음 연결된다.

- [ ] **Step 6: 전체 검증을 실행한다**

Run: `cd api-contract-test-generator && mise run check`

Expected: test, lint, typecheck, build, generator/responsive/contrast e2e all PASS.

- [ ] **Step 7: 커밋한다**

```bash
git add api-contract-test-generator
git commit -m "feat(api-contract-test-generator): unify the product shell and primitives"
```

---

### Task 4: OpenAPI Editor를 1행 카드형 헤더로 단순화한다

**Files:**
- Create: `openapi-editor/src/components/layout/Topbar.test.tsx`
- Modify: `openapi-editor/src/components/layout/Topbar.tsx`
- Modify: `openapi-editor/src/components/common/UtilityMenu.tsx`
- Modify: `openapi-editor/src/components/editor/DocumentEditor.tsx`
- Modify: `openapi-editor/src/components/conversion/ConversionReview.tsx`
- Modify: `openapi-editor/src/App.tsx`, `openapi-editor/src/App.test.tsx`
- Modify: `openapi-editor/src/styles/components.css`
- Modify: `openapi-editor/index.html`

**Interfaces:**
- `TopbarProps`의 파일, 변환, 다운로드, 복원 callback은 유지한다.
- 기존 `export`·`sample` 두 메뉴는 하나의 `더보기` 메뉴로 합친다.
- ThemeToggle은 ToolHeader가 utilities의 마지막 요소로 렌더한다.

- [ ] **Step 1: Title Case와 단일 header row의 실패 테스트를 작성한다**

`Topbar.test.tsx`에서 최소 props fixture를 만들고 다음을 단정한다.

```tsx
const html = renderToStaticMarkup(<Topbar filename={undefined} format="yaml" target="openapi-3.1"
  conversionEnabled={false} reviewing={false} theme="light" onFile={() => {}} onTarget={() => {}}
  onDownloadSample={() => {}} onConvert={() => {}} onDownload={() => {}} canDownloadYaml={false}
  canDownloadJson={false} onRestore={() => {}} canRestore={false} onToggleTheme={() => {}} />);
expect(html).toContain('OpenAPI Editor');
expect(html).toContain('data-ds-tool-header="true"');
expect(html).toContain('더보기');
expect(html).not.toContain('topbar-secondary-row');
```

- [ ] **Step 2: 테스트가 kebab-case 제품명과 2행 markup 때문에 실패하는지 확인한다**

Run: `cd openapi-editor && npm run test -- src/components/layout/Topbar.test.tsx`

Expected: FAIL on `OpenAPI Editor` or absence of common selector.

- [ ] **Step 3: Topbar actions를 한 슬롯으로 재구성한다**

ToolHeader의 `actions`에는 다음 순서만 둔다.

```tsx
<div className="openapi-header-actions">
  <label className="select-label">대상 버전
    <select aria-label="대상 버전" value={target} onChange={(event) => onTarget(event.target.value as SpecFamily)} disabled={reviewing}>
      <option value="swagger-2.0">Swagger 2.0</option>
      <option value="openapi-3.0">OpenAPI 3.0.4</option>
      <option value="openapi-3.1">OpenAPI 3.1.2</option>
      <option value="openapi-3.2">OpenAPI 3.2.0</option>
    </select>
  </label>
  <input ref={inputRef} className="hidden-file-input" type="file" accept=".yaml,.yml,.json" onChange={chooseFile} />
  <Button variant="secondary" className="openapi-upload" aria-label="파일 업로드" onClick={() => inputRef.current?.click()} disabled={reviewing}>
    <FileUp size={16} strokeWidth={2} /><span className="openapi-action-label">업로드</span>
  </Button>
  <Button variant="primary" aria-label="문서 변환" onClick={onConvert} disabled={!conversionEnabled || reviewing}>
    <WandSparkles size={16} strokeWidth={2} />변환
  </Button>
  <UtilityMenu label="더보기" isOpen={openMenu === 'more'} onOpen={() => setOpenMenu('more')} onClose={() => closeMenu('more')}>
    <Button variant="secondary" role="menuitem" onClick={() => runMenuAction(() => onDownload('yaml'))} disabled={!canDownloadYaml}>YAML 다운로드</Button>
    <Button variant="secondary" role="menuitem" onClick={() => runMenuAction(() => onDownload('json'))} disabled={!canDownloadJson}>JSON 다운로드</Button>
    {sampleVersions.map((version) => <Button key={version} variant="secondary" role="menuitem" onClick={() => runMenuAction(() => onDownloadSample(version))} disabled={reviewing}>{sampleLabel[version]} 샘플</Button>)}
    <Button variant="secondary" role="menuitem" onClick={() => runMenuAction(onRestore)} disabled={!canRestore || reviewing}><RotateCcw size={16} strokeWidth={2} />원본 복원</Button>
  </UtilityMenu>
</div>
```

이 actions를 다음 ToolHeader에 전달한다.

```tsx
<ToolHeader product={{ ...PRODUCT, icon: ProductIcon }} homeHref={TOOL_HUB_URL}
  theme={theme} onThemeToggle={onToggleTheme} actions={actions} />
```

menu state type은 `type UtilityMenuName = 'more'`로 줄이고 `openMenu`은 `UtilityMenuName | null`을 유지한다.

- [ ] **Step 4: UtilityMenu와 나머지 기본 버튼을 공통 Button으로 바꾼다**

- `UtilityMenu.tsx` trigger를 `Button variant="secondary"`로 바꾼다.
- `DocumentEditor.tsx` menu item 5개를 `Button variant="secondary"`로 바꾼다.
- `ConversionReview.tsx`의 취소/적용을 secondary/primary Button으로 바꾼다.
- 모든 공통 UI icon은 size 16, stroke 2로 맞춘다.
- `App.tsx`의 최상위 `.app-shell`에 `data-ds-page-shell`을 추가한다.

- [ ] **Step 5: 1190·375 분기와 2행 CSS를 제거한다**

- `.topbar`, `.topbar-main-row`, `.topbar-secondary-row`, `.brand-*`, `.primary-btn`, `.secondary-btn`, `.topbar-theme-btn` 시각 선언을 제거한다.
- `@media (max-width: 1190px)`와 `@media (max-width: 375px)`를 삭제한다.
- `@media (max-width: 1279px)`에서 설명문과 `.openapi-action-label`을 숨기고 select 폭을 124px로 둔다.
- 1023/767 workspace 분기는 유지한다. 767 header 부분은 `.openapi-header-actions { width:100%; display:grid; grid-template-columns:minmax(0,1fr) 36px auto auto; }`만 남긴다.
- `App.test.tsx` heading을 `OpenAPI Editor`로 바꾼다.
- `index.html` title과 favicon links를 표준 세트로 바꾼다.

- [ ] **Step 6: 전체 검증을 실행한다**

Run: `cd openapi-editor && mise run check`

Expected: unit, lint, typecheck, build, OpenAPI conversion/editor e2e all PASS.

- [ ] **Step 7: 커밋한다**

```bash
git add openapi-editor
git commit -m "feat(openapi-editor): adopt the single-row product shell"
```

---

### Task 5: DDL Seed Generator의 헤더·버튼·빈 상태와 UI 언어를 통일한다

**Files:**
- Create: `ddl-seed-generator/app/_components/Topbar.test.tsx`
- Modify: `ddl-seed-generator/app/_components/Topbar.tsx`
- Modify: `ddl-seed-generator/app/_components/generator-client.tsx`
- Modify: `ddl-seed-generator/app/_components/ControlPanel.tsx`
- Modify: `ddl-seed-generator/app/_components/ResultPanel.tsx`
- Modify: `ddl-seed-generator/app/layout.tsx`
- Modify: `ddl-seed-generator/app/styles/components.css`
- Delete: `ddl-seed-generator/app/favicon.ico`

**Interfaces:**
- `TopbarProps`는 유지한다.
- ResultPanel의 INSERT/ROLLBACK은 실제 panel 선택이므로 앱 소유 tab semantics를 유지하고 공통 SegmentedControl로 위장하지 않는다.

- [ ] **Step 1: 한국어 header actions와 disabled opacity 계약의 실패 테스트를 작성한다**

```tsx
it('공통 셸과 한국어 액션을 렌더한다', () => {
  const html = renderToStaticMarkup(<Topbar canGenerate={false} onGenerate={() => {}} onLoadPreset={() => {}}
    theme="light" mounted onToggleTheme={() => {}} />);
  expect(html).toContain('data-ds-tool-header="true"');
  expect(html).toContain('샘플');
  expect(html).toContain('생성');
  expect(html).not.toContain('realistic');
  expect(html).not.toContain('>Generate<');
});
```

- [ ] **Step 2: 테스트가 Sample/Generate/realistic 때문에 실패하는지 확인한다**

Run: `cd ddl-seed-generator && npm run test -- app/_components/Topbar.test.tsx`

Expected: FAIL on Korean action assertions.

- [ ] **Step 3: Topbar를 ToolHeader와 Button으로 교체한다**

```tsx
const actions = <div className="ddl-header-actions">
  <select className="sampleSelect" defaultValue="" aria-label="샘플 DDL 불러오기"
    onChange={(event) => { onLoadPreset(event.target.value); event.target.value = ''; }}>
    <option value="" disabled>샘플</option>
    <option value="basic">기본 — PostgreSQL</option>
    <option value="schema">스키마 + ALTER TABLE — PostgreSQL</option>
    <option value="advanced">GENERATED ALWAYS AS IDENTITY — PostgreSQL</option>
    <option value="mysql">AUTO_INCREMENT + ENUM — MySQL</option>
    <option value="h2">IDENTITY 타입 — H2</option>
  </select>
  <Button variant="primary" disabled={!canGenerate} onClick={onGenerate}><Sparkles size={16} strokeWidth={2} />생성</Button>
</div>;
return <ToolHeader product={{ ...PRODUCT, icon: ProductIcon }} homeHref={TOOL_HUB_URL}
  theme={theme} mounted={mounted} onThemeToggle={onToggleTheme} actions={actions} />;
```

- [ ] **Step 4: ResultPanel의 기본 컨트롤과 Empty State를 전환한다**

- 복사, 다운로드 main, 다운로드 chevron, menu item에 생성 `Button`을 사용한다.
- Empty State는 다음으로 바꾼다.

```tsx
<EmptyState icon={<Database size={16} strokeWidth={2} />} title="DDL을 분석하면 테이블 순서와 SQL 미리보기가 표시됩니다." />
```

- INSERT/ROLLBACK tab에는 `role="tablist"`, `role="tab"`, `aria-selected`, 연결된 `role="tabpanel"`을 추가한다.
- disabled button에서 opacity class를 제거한다.

tab과 panel 연결은 다음 ID를 사용한다.

```tsx
<div className="tabs" role="tablist" aria-label="SQL 출력 종류">
  <button id="insert-tab" role="tab" aria-selected={activeTab === 'insert'} aria-controls="sql-output-panel">INSERT</button>
  <button id="rollback-tab" role="tab" aria-selected={activeTab === 'rollback'} aria-controls="sql-output-panel">ROLLBACK</button>
</div>
<pre id="sql-output-panel" role="tabpanel" aria-labelledby={`${activeTab}-tab`} className="sqlPreview">{activeSql?.slice(0, 16000)}</pre>
```

- [ ] **Step 5: 화면 문구를 한국어 정책에 맞춘다**

`ControlPanel.tsx`: `Input DDL→입력 DDL`, `Output DB→출력 DB`, `Rows / table→테이블당 행 수`, `Seed→시드`, `Data Locale→데이터 언어`, `Tables→테이블`, `Total rows→총 행`, `Insert order→삽입 순서`.

언어 option은 `English→영어`로 바꾸되 실제 value `en`은 유지한다.

`ResultPanel.tsx`: `Output→출력`, `SQL ready→SQL 준비 완료`, `FK cycle→FK 순환`, `Insert SQL→INSERT SQL`, `Rollback SQL→ROLLBACK SQL`, `Copy/Copied→복사/복사됨`, `Download→다운로드`, `Insert order→삽입 순서`.

제품 설명의 `realistic seed SQL`은 metadata의 `DDL을 분석해 시드 데이터를 생성합니다.`로 대체된다.

- [ ] **Step 6: breakpoint와 Next metadata를 정리한다**

- `@media (max-width: 1180px)`를 `@media (max-width: 1279px)`로 바꾼다.
- `@media (max-width: 760px)`를 `@media (max-width: 767px)`로 바꾼다.
- `.topbar`, `.brandBlock`, `.brandIcon`, `.primaryBtn`, `.secondaryBtn`, dead `.segmented`, `.emptyState` 시각 선언을 제거한다.
- `generator-client.tsx` 최상위 `.appShell`에 `data-ds-page-shell`을 추가한다.
- `layout.tsx` metadata에 `manifest: '/site.webmanifest'`와 SVG/32/16/apple icons를 선언하고 `app/favicon.ico`를 삭제한다.

```tsx
export const metadata: Metadata = {
  title: 'DDL Seed Generator',
  description: 'DDL을 분석해 시드 데이터를 생성합니다.',
  manifest: '/site.webmanifest',
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
};
```

- [ ] **Step 7: 전체 검증을 실행한다**

Run: `cd ddl-seed-generator && mise run check`

Expected: test, lint, typecheck, build, production-server e2e all PASS.

- [ ] **Step 8: 커밋한다**

```bash
git add ddl-seed-generator
git commit -m "feat(ddl-seed-generator): unify the shell controls and Korean copy"
```

---

### Task 6: Config Diff Viewer의 헤더·Badge·Empty State와 901px 분기를 통일한다

**Files:**
- Create: `config-diff-viewer/app/_components/Topbar.test.tsx`
- Modify: `config-diff-viewer/app/_components/Topbar.tsx`
- Modify: `config-diff-viewer/app/_components/config-diff-client.tsx`
- Modify: `config-diff-viewer/app/_components/analysis-options.tsx`
- Modify: `config-diff-viewer/app/_components/issue-badge.tsx`
- Modify: `config-diff-viewer/app/_components/stats-bar.tsx`
- Modify: `config-diff-viewer/app/_components/result-table.tsx`
- Modify: `config-diff-viewer/app/layout.tsx`
- Modify: `config-diff-viewer/app/styles/components.css`
- Delete: `config-diff-viewer/app/favicon.ico`

**Interfaces:**
- `IssueBadge`는 `Severity`를 한국어 label과 공통 Badge variant로 매핑한다.
- 분석 옵션의 ON/OFF는 domain boolean을 유지하고 표시만 `켬/끔`으로 바꾼다.

- [ ] **Step 1: 공통 header와 translated badge의 실패 테스트를 작성한다**

```tsx
it('공통 셸과 36px controls를 사용한다', () => {
  const html = renderToStaticMarkup(<Topbar isComparing={false} hasParseError={false} onReset={() => {}}
    onCompare={() => {}} theme="light" mounted onToggleTheme={() => {}} />);
  expect(html).toContain('data-ds-tool-header="true"');
  expect(html).toContain('Config Diff Viewer');
  expect(html).toContain('data-ds-button="true"');
  expect(html).toContain('다크 테마로 전환');
});
```

- [ ] **Step 2: 테스트가 기존 local buttons 때문에 실패하는지 확인한다**

Run: `cd config-diff-viewer && npm run test -- app/_components/Topbar.test.tsx`

Expected: FAIL on `data-ds-button`.

- [ ] **Step 3: Topbar와 page shell을 생성 primitive로 교체한다**

```tsx
const actions = <div className="config-header-actions">
  <Button variant="secondary" onClick={onReset}><RotateCcw size={16} strokeWidth={2} />초기화</Button>
  <Button variant="primary" onClick={onCompare} disabled={isComparing || hasParseError}
    title={hasParseError ? '파싱 오류를 먼저 수정하세요.' : undefined}>
    {isComparing ? <Loader2 size={16} strokeWidth={2} className="spinning" /> : <ArrowLeftRight size={16} strokeWidth={2} />}비교
  </Button>
</div>;
return <ToolHeader product={{ ...PRODUCT, icon: ProductIcon }} homeHref={TOOL_HUB_URL}
  theme={theme} mounted={mounted} onThemeToggle={onToggleTheme} actions={actions} />;
```

`config-diff-client.tsx` 최상위 `.appShell`에 `data-ds-page-shell`을 추가한다.

- [ ] **Step 4: Badge adapter와 EmptyState를 공통 visual primitive로 바꾼다**

```tsx
const BADGE: Record<Severity, { label: string; variant: BadgeVariant }> = {
  CRITICAL: { label: '치명', variant: 'danger' },
  HIGH: { label: '높음', variant: 'danger' },
  MEDIUM: { label: '중간', variant: 'warning' },
  LOW: { label: '낮음', variant: 'neutral' },
};
export default function IssueBadge({ severity }: { severity: Severity }) {
  const badge = BADGE[severity];
  return <Badge variant={badge.variant}>{badge.label}</Badge>;
}
```

- `stats-bar.tsx`의 PASSED/FAILED를 `Badge success`의 `통과`와 `Badge danger`의 `실패`로 바꾼다.
- `analysis-options.tsx`의 `ON/OFF` chip을 `Badge primary/neutral`의 `켬/끔`으로 바꾼다.
- `config-diff-client.tsx`와 `result-table.tsx` 5곳의 `.emptyState` markup을 `EmptyState title`과 선택적 description으로 바꾼다.

- [ ] **Step 5: 로컬 CSS와 breakpoint를 정리한다**

- `.topbar`, `.brandBlock`, `.brandIcon`, `.primaryBtn`, `.secondaryBtn`, `.badge`, `.statusBadge`, `.toggleStatusBadge`, `.emptyState`의 시각 선언을 제거한다.
- `@media (min-width: 901px)`를 `@media (min-width: 1024px)`로 바꾼다.
- mobile에서 `.config-header-actions { width:100%; display:grid; grid-template-columns:1fr 1fr; }`만 앱 CSS로 둔다.
- `layout.tsx`에 표준 icons/manifest metadata를 넣고 `app/favicon.ico`를 삭제한다.

```tsx
export const metadata: Metadata = {
  title: 'Config Diff Viewer',
  description: '설정 파일의 차이를 비교합니다.',
  manifest: '/site.webmanifest',
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
};
```

- [ ] **Step 6: 전체 검증을 실행한다**

Run: `cd config-diff-viewer && mise run check`

Expected: test, lint, typecheck, build, production-server contrast e2e all PASS.

- [ ] **Step 7: 커밋한다**

```bash
git add config-diff-viewer
git commit -m "feat(config-diff-viewer): adopt canonical shell badges and empty states"
```

---

### Task 7: Dummy File Generator의 커스텀 SVG와 혼용 문구를 제거한다

**Files:**
- Create: `dummy-file-generator/app/_components/generator-client.test.tsx`
- Modify: `dummy-file-generator/app/_components/generator-client.tsx`
- Modify: `dummy-file-generator/app/_components/GeneratorForm.tsx`
- Modify: `dummy-file-generator/app/_components/icons.tsx`
- Modify: `dummy-file-generator/app/layout.tsx`
- Modify: `dummy-file-generator/app/styles/components.css`
- Delete: `dummy-file-generator/app/favicon.ico`

**Interfaces:**
- `GeneratorForm`의 request payload와 download 동작은 바꾸지 않는다.
- `FormatIcon({ type })` API는 유지하되 내부를 Lucide component map으로 교체한다.

- [ ] **Step 1: 공통 header와 한국어 폼 문구의 실패 테스트를 작성한다**

```tsx
vi.mock('@/app/_hooks/use-theme', () => ({ useTheme: () => ({ theme: 'light', mounted: true, toggle: vi.fn() }) }));
it('공통 셸과 한국어 생성 폼을 렌더한다', () => {
  const html = renderToStaticMarkup(<GeneratorClient />);
  expect(html).toContain('data-ds-tool-header="true"');
  expect(html).toContain('파일 형식');
  expect(html).toContain('목표 크기 (MiB)');
  expect(html).toContain('파일 생성');
  expect(html).not.toContain('Generate File');
});
```

- [ ] **Step 2: 테스트가 영문 폼 label 때문에 실패하는지 확인한다**

Run: `cd dummy-file-generator && npm run test -- app/_components/generator-client.test.tsx`

Expected: FAIL on `파일 형식`.

- [ ] **Step 3: GeneratorClient를 ToolHeader와 page shell로 전환한다**

```tsx
return <main className="pageShell" data-ds-page-shell>
  <ToolHeader product={{ ...PRODUCT, icon: ProductIcon }} homeHref={TOOL_HUB_URL}
    theme={theme} mounted={mounted} onThemeToggle={toggleTheme} />
  <section className="card"><GeneratorForm /></section>
</main>;
```

헤더가 더 이상 narrow 카드 내부에 있지 않게 하며, `.pageShell`의 헤더와 본문 카드가 같은 max-width와 좌우 정렬을 사용하게 한다.

- [ ] **Step 4: 커스텀 SVG를 Lucide map으로 교체한다**

```tsx
import { Braces, Download, File, FileArchive, FileText, Table2, type LucideIcon } from 'lucide-react';
const FORMAT_ICONS = { pdf: FileText, docx: FileText, txt: FileText, xlsx: Table2, csv: Table2, zip: FileArchive, json: Braces, bin: File } satisfies Record<FileType, LucideIcon>;
export function FormatIcon({ type }: { type: FileType }) {
  const Icon = FORMAT_ICONS[type];
  return <Icon size={16} strokeWidth={2} aria-hidden="true" />;
}
export const DownloadIcon = () => <Download size={16} strokeWidth={2} aria-hidden="true" />;
```

`BrandIcon`, `MoonIcon`, `SunIcon` exports와 사용처를 삭제한다.

- [ ] **Step 5: ZIP 선택과 생성 버튼을 공통 primitive로 바꾼다**

- ZIP 구조: `SegmentedControl value={zipStructure}` options `평면/계층`.
- 확장자 조합: `SegmentedControl value={zipExtensionProfile}` options `혼합/텍스트/바이너리`.
- 생성 submit: `<Button type="submit" variant="primary" disabled={!canSubmit || loading}>`.
- 파일 형식 grid는 다중 카드 선택 UI라 공통 SegmentedControl로 바꾸지 않고 `aria-pressed` button을 유지한다.

- [ ] **Step 6: UI 문구를 한국어로 통일한다**

`File Format→파일 형식`, `ZIP Structure→ZIP 구조`, `Extension Profile→확장자 조합`, `Target Size (MiB)→목표 크기 (MiB)`, `1 MiB = 1,048,576 Bytes→1 MiB = 1,048,576 B`, `Generate File→파일 생성`.

API error의 JSON field 이름과 `targetBytes`, `maxTargetBytes`는 기술 식별자이므로 바꾸지 않는다.

- [ ] **Step 7: 600px 분기와 metadata를 정리한다**

- `@media (max-width: 600px)`를 `@media (max-width: 767px)`로 바꾼다.
- `.topbar`, `.brandBlock`, `.brandIcon`, `.generateBtn`, `.zipStructureGrid`, `.zipStructureBtn` 중 공통 primitive와 겹치는 선언을 제거한다.
- `.typeBtn svg`는 16px/stroke 2 계약만 유지한다.
- `layout.tsx`에 표준 icons/manifest metadata를 넣고 `app/favicon.ico`를 삭제한다.

```tsx
export const metadata: Metadata = {
  title: 'Dummy File Generator',
  description: '원하는 형식과 크기의 더미 파일을 생성합니다.',
  manifest: '/site.webmanifest',
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
};
```

- [ ] **Step 8: 전체 검증을 실행한다**

Run: `cd dummy-file-generator && mise run check`

Expected: test, lint, typecheck, build, production-server contrast e2e all PASS.

- [ ] **Step 9: 커밋한다**

```bash
git add dummy-file-generator
git commit -m "feat(dummy-file-generator): unify the shell icons and Korean form copy"
```

---

## Plan 2 Completion Gate

- [ ] `npm run design-system:check` reports no generated drift.
- [ ] 7개 앱의 헤더에 `data-ds-tool-header`, 40px BrandMark, 마지막 ThemeToggle이 있다.
- [ ] 7개 제품명이 approved Title Case와 정확히 일치한다.
- [ ] `rg -n '@media[^\n]*(375|600|760|901|1180|1190|1199)px'`가 7개 앱 CSS에서 결과 0건이다.
- [ ] `rg -n 'Signature & Trace Studio|<h1>openapi-editor|JSON YAML Converter|>Draw<|>Upload<|>Generate<|Generate File|File Format|Target Size|realistic seed|>Sample<|>English<|\} bytes<| Bytes\.|Step [123]|>Endpoints<|Selected test'`가 UI source에서 결과 0건이다.
- [ ] 모든 7개 앱의 `mise run check`가 통과한다.
- [ ] `git status --short`가 비어 있다.

다음 실행 문서: [`2026-07-27-shell-contract-visual-regression.md`](./2026-07-27-shell-contract-visual-regression.md)
