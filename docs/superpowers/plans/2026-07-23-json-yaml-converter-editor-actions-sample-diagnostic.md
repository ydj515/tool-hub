# JSON/YAML Converter Editor Actions, Sample, and Diagnostic Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** 편집기 액션을 접근 가능한 아이콘 버튼으로 바꾸고, 방향별 AsyncAPI 예제를 제공하며, 진단을 통합 편집 카드 하단 footer로 이동한다.

**Architecture:** 사용자가 제공한 YAML과 그로부터 생성한 JSON을 정적 fixture로 보관하고 기존 sampleFor 인터페이스로 노출한다. EditorPanel은 기존 handler와 disabled 조건을 그대로 사용하면서 Lucide 아이콘만 렌더링한다. ConverterWorkspace가 state.diagnostic을 사용해 converter-grid 다음에 DiagnosticBanner를 렌더링하고 ConverterPage는 focus callback만 전달한다.

**Tech Stack:** Vite 8, React 19, TypeScript 5.9, Lucide React, Monaco Editor, Vitest, Testing Library, Playwright Chromium

## Global Constraints

- 기준 설계는 docs/superpowers/specs/2026-07-23-json-yaml-converter-editor-actions-sample-diagnostic-design.md다.
- 사용자가 제공한 AsyncAPI 2.6 Streetlights Kafka API YAML 원문을 변경하지 않는다.
- JSON → YAML에서는 동일 데이터의 JSON fixture, YAML → JSON에서는 YAML 원문을 로드한다.
- 예제 불러오기는 현재 변환 방향을 변경하지 않는다.
- Pretty, 결과 복사, 결과 다운로드는 36×36px 아이콘 버튼으로 표시한다.
- 기존 accessible name과 title인 JSON Pretty, YAML Pretty, 결과 복사, 결과 다운로드를 유지한다.
- 진단은 converter-workspace 안에서 converter-grid의 바로 다음 형제로 렌더링한다.
- role="alert", 진단 클릭 focus, 모바일 원본 탭 선택 동작을 유지한다.
- parser, serializer, debounce, 크기 제한, stale result, 파일·클립보드 revision 로직을 변경하지 않는다.
- 새 package를 추가하지 않는다.
- 완료 전 npm run test, npm run lint, npm run typecheck, npm run build, npm run test:e2e를 모두 실행한다.

---

## 파일 구조

| 파일 | 책임 |
| --- | --- |
| json-yaml-converter/src/data/asyncapiSample.yaml | 사용자가 제공한 AsyncAPI YAML 원문 |
| json-yaml-converter/src/data/asyncapiSample.json | YAML 원문에서 생성한 의미상 동일한 pretty JSON |
| json-yaml-converter/src/data/asyncapiSample.ts | 두 raw fixture를 TypeScript 상수로 노출 |
| json-yaml-converter/src/lib/converter.ts | 현재 방향에 맞는 fixture를 sampleFor로 반환 |
| json-yaml-converter/src/lib/converter.test.ts | fixture 유효성, 의미적 동일성, 방향별 선택 회귀 |
| json-yaml-converter/src/components/converter/EditorPanel.tsx | Pretty, copy, download 아이콘 액션 렌더링 |
| json-yaml-converter/src/components/converter/ConverterWorkspace.tsx | grid 다음 diagnostic footer와 focus callback 조립 |
| json-yaml-converter/src/pages/ConverterPage.tsx | diagnostic focus callback을 workspace에 전달 |
| json-yaml-converter/src/pages/ConverterPage.test.tsx | 아이콘 접근성, diagnostic DOM 계층과 기존 동작 회귀 |
| json-yaml-converter/src/styles/components.css | 아이콘 액션과 desktop/mobile diagnostic footer 스타일 |
| json-yaml-converter/e2e/converter.spec.ts | AsyncAPI 예제, 아이콘, 진단 위치와 focus 브라우저 회귀 |

### Task 1: 방향별 AsyncAPI 예제 fixture

**Files:**
- Create: json-yaml-converter/src/data/asyncapiSample.yaml
- Create: json-yaml-converter/src/data/asyncapiSample.json
- Create: json-yaml-converter/src/data/asyncapiSample.ts
- Modify: json-yaml-converter/src/lib/converter.ts:1-45
- Test: json-yaml-converter/src/lib/converter.test.ts:1-30
- Modify: json-yaml-converter/e2e/converter.spec.ts:65-95

**Interfaces:**
- Consumes: ConverterDirection = 'json-to-yaml' | 'yaml-to-json'
- Produces: ASYNCAPI_YAML_SAMPLE: string, ASYNCAPI_JSON_SAMPLE: string
- Preserves: sampleFor(direction: ConverterDirection): string

- [ ] **Step 1: 방향별 fixture 계약의 failing test를 작성한다.**

converter.test.ts의 현재 예제 test를 다음으로 교체한다.

~~~ts
it('현재 방향에 맞는 동일한 AsyncAPI 예제를 제공한다', () => {
  const jsonSample = sampleFor('json-to-yaml');
  const yamlSample = sampleFor('yaml-to-json');

  expect(jsonSample).toContain('"title": "Streetlights Kafka API"');
  expect(jsonSample).toContain('"smartylighting.streetlights.1.0.event.{streetlightId}.lighting.measured"');
  expect(yamlSample).toContain('title: Streetlights Kafka API');
  expect(yamlSample).toContain('"smartylighting.streetlights.1.0.event.{streetlightId}.lighting.measured":');
  expect(convertSource(yamlSample, 'yaml-to-json')).toEqual({ ok: true, value: jsonSample });
});
~~~

- [ ] **Step 2: 첨부 예제의 양방향 브라우저 흐름을 고정하는 failing E2E를 작성한다.**

converter.spec.ts에 다음 test를 추가한다.

~~~ts
test('첨부 AsyncAPI 예제를 현재 방향에 맞게 불러온다', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '예제 불러오기' }).click();
  await expect(page.getByRole('region', { name: '원본 편집기' }).locator('.view-lines'))
    .toContainText('"title": "Streetlights Kafka API"');
  await expect(page.getByRole('region', { name: '결과 편집기' }).locator('.view-lines'))
    .toContainText('title: Streetlights Kafka API');

  await page.getByRole('radio', { name: 'YAML → JSON' }).click();
  await page.getByRole('button', { name: '예제 불러오기' }).click();
  await expect(page.getByRole('region', { name: '원본 편집기' }).locator('.view-lines'))
    .toContainText('title: Streetlights Kafka API');
  await expect(page.getByRole('region', { name: '결과 편집기' }).locator('.view-lines'))
    .toContainText('"title": "Streetlights Kafka API"');
});
~~~

- [ ] **Step 3: focused test가 기존 tool-hub 예제에서 실패하는지 확인한다.**

Run:

~~~bash
cd json-yaml-converter
npm run test -- --run src/lib/converter.test.ts
npm run test:e2e -- --grep "첨부 AsyncAPI 예제"
~~~

Expected: Streetlights Kafka API assertion이 FAIL한다.

- [ ] **Step 4: 사용자 첨부 원문을 YAML fixture로 추가한다.**

다음 파일을 끝까지 읽는다.

~~~bash
sed -n '1,220p' /Users/dongjin/.codex/attachments/8cbcbd9d-f729-4cb3-b47a-359ca8b82e36/pasted-text.txt
~~~

apply_patch로 출력된 185줄 전체를 변경 없이 json-yaml-converter/src/data/asyncapiSample.yaml에 추가한다. 첫 줄은 asyncapi: "2.6.0", 마지막 줄은 공백 14칸 뒤 - my-app-id여야 한다.

- [ ] **Step 5: YAML에서 정적 JSON fixture를 생성한다.**

Run:

~~~bash
node --input-type=module -e "import fs from 'node:fs'; import YAML from 'yaml'; const source = fs.readFileSync('src/data/asyncapiSample.yaml', 'utf8'); fs.writeFileSync('src/data/asyncapiSample.json', JSON.stringify(YAML.parse(source), null, 2) + '\n');"
~~~

Expected: src/data/asyncapiSample.json이 생성되고 첫 property가 asyncapi, info.title이 Streetlights Kafka API다.

- [ ] **Step 6: raw fixture export를 추가한다.**

src/data/asyncapiSample.ts를 다음으로 작성한다.

~~~ts
import asyncapiJsonSample from './asyncapiSample.json?raw';
import asyncapiYamlSample from './asyncapiSample.yaml?raw';

export const ASYNCAPI_JSON_SAMPLE = asyncapiJsonSample;
export const ASYNCAPI_YAML_SAMPLE = asyncapiYamlSample;
~~~

- [ ] **Step 7: sampleFor가 현재 방향의 fixture를 반환하게 한다.**

converter.ts 상단에 다음 import를 추가한다.

~~~ts
import { ASYNCAPI_JSON_SAMPLE, ASYNCAPI_YAML_SAMPLE } from '../data/asyncapiSample';
~~~

sampleFor를 다음으로 교체한다.

~~~ts
export function sampleFor(direction: ConverterDirection): string {
  return direction === 'json-to-yaml' ? ASYNCAPI_JSON_SAMPLE : ASYNCAPI_YAML_SAMPLE;
}
~~~

- [ ] **Step 8: fixture test와 정적 검증을 통과시킨다.**

Run:

~~~bash
npm run test -- --run src/lib/converter.test.ts
npm run test:e2e -- --grep "첨부 AsyncAPI 예제"
npm run lint
npm run typecheck
~~~

Expected: converter test PASS, lint와 typecheck exit 0.

- [ ] **Step 9: Task 1을 커밋한다.**

~~~bash
git add json-yaml-converter/src/data/asyncapiSample.yaml \
  json-yaml-converter/src/data/asyncapiSample.json \
  json-yaml-converter/src/data/asyncapiSample.ts \
  json-yaml-converter/src/lib/converter.ts \
  json-yaml-converter/src/lib/converter.test.ts \
  json-yaml-converter/e2e/converter.spec.ts
git commit -m "feat(json-yaml-converter): replace bundled sample"
~~~

### Task 2: 편집기 헤더 아이콘 액션

**Files:**
- Modify: json-yaml-converter/src/components/converter/EditorPanel.tsx:1-47
- Modify: json-yaml-converter/src/pages/ConverterPage.test.tsx:40-85
- Modify: json-yaml-converter/e2e/converter.spec.ts:20-65,70-95

**Interfaces:**
- Consumes: Button variant="icon", onPretty, onCopy, onDownload, prettyDisabled, resultDisabled
- Produces: aria-label/title 기반 JSON Pretty, YAML Pretty, 결과 복사, 결과 다운로드 버튼

- [ ] **Step 1: 아이콘 전용 액션의 failing component test를 작성한다.**

ConverterPage의 첫 hierarchy test 끝에 다음 assertion을 추가한다.

~~~tsx
for (const name of ['JSON Pretty', '결과 복사', '결과 다운로드']) {
  const action = screen.getByRole('button', { name });
  expect(action).toHaveClass('btn-icon');
  expect(action).toHaveAttribute('title', name);
  expect(action.querySelector('svg')).not.toBeNull();
  expect(action).toHaveTextContent('');
}
~~~

- [ ] **Step 2: 아이콘 크기와 접근성 이름의 failing E2E를 추가한다.**

converter.spec.ts에 다음 test를 추가한다.

~~~ts
test('편집기 액션을 접근 가능한 36px 아이콘 버튼으로 표시한다', async ({ page }) => {
  await page.goto('/');

  for (const name of ['JSON Pretty', '결과 복사', '결과 다운로드']) {
    const action = page.getByRole('button', { name, exact: true });
    await expect(action).toHaveAttribute('title', name);
    await expect(action).toHaveCSS('width', '36px');
    await expect(action).toHaveCSS('height', '36px');
    await expect(action.locator('svg')).toHaveCount(1);
  }
});
~~~

- [ ] **Step 3: component와 E2E의 RED 상태를 확인한다.**

Run:

~~~bash
npm run test -- --run src/pages/ConverterPage.test.tsx
npm run test:e2e -- --grep "편집기 액션을 접근 가능한"
~~~

Expected: btn-icon, title 또는 svg assertion이 FAIL한다.

- [ ] **Step 4: EditorPanel의 텍스트 액션을 Lucide 아이콘으로 교체한다.**

EditorPanel.tsx에 import를 추가한다.

~~~tsx
import { AlignLeft, Copy, Download } from 'lucide-react';
~~~

기존 editor-panel__actions 분기를 다음으로 교체한다.

~~~tsx
<div className="editor-panel__actions">
  {source ? (
    <Button
      type="button"
      variant="icon"
      aria-label={format.toUpperCase() + ' Pretty'}
      title={format.toUpperCase() + ' Pretty'}
      onClick={onPretty}
      disabled={prettyDisabled}
    >
      <AlignLeft size={16} aria-hidden="true" />
    </Button>
  ) : (
    <>
      <Button
        type="button"
        variant="icon"
        aria-label="결과 복사"
        title="결과 복사"
        onClick={onCopy}
        disabled={resultDisabled}
      >
        <Copy size={16} aria-hidden="true" />
      </Button>
      <Button
        type="button"
        variant="icon"
        aria-label="결과 다운로드"
        title="결과 다운로드"
        onClick={onDownload}
        disabled={resultDisabled}
      >
        <Download size={16} aria-hidden="true" />
      </Button>
    </>
  )}
</div>
~~~

- [ ] **Step 5: scheduled copy observer를 accessible name 기반으로 바꾼다.**

converter.spec.ts의 observeScheduledCopyState 내부 document type에서 기존 querySelector signature를 다음으로 교체한다.

~~~ts
querySelector(selector: string): BrowserButton | null;
~~~

MutationObserver callback의 button textContent 순회를 다음으로 교체한다.

~~~ts
const copyButton = browserGlobal.document.querySelector('button[aria-label="결과 복사"]');
if (!copyButton) return;
resolve(copyButton.disabled);
observer.disconnect();
~~~

querySelectorAll signature와 기존 for loop는 제거한다.

- [ ] **Step 6: focused tests와 정적 검증을 통과시킨다.**

Run:

~~~bash
npm run test -- --run src/pages/ConverterPage.test.tsx
npm run test:e2e -- --grep "편집기 액션을 접근 가능한|scheduled 상태"
npm run lint
npm run typecheck
~~~

Expected: component/E2E PASS, lint와 typecheck exit 0.

- [ ] **Step 7: Task 2를 커밋한다.**

~~~bash
git add json-yaml-converter/src/components/converter/EditorPanel.tsx \
  json-yaml-converter/src/pages/ConverterPage.test.tsx \
  json-yaml-converter/e2e/converter.spec.ts
git commit -m "feat(json-yaml-converter): compact editor actions"
~~~

### Task 3: 편집 카드 하단 diagnostic footer

**Files:**
- Modify: json-yaml-converter/src/components/converter/ConverterWorkspace.tsx:1-66
- Modify: json-yaml-converter/src/pages/ConverterPage.tsx:1-131
- Modify: json-yaml-converter/src/pages/ConverterPage.test.tsx:100-120
- Modify: json-yaml-converter/src/styles/components.css:28-72
- Modify: json-yaml-converter/e2e/converter.spec.ts:95-118

**Interfaces:**
- Consumes: ConverterState.diagnostic, DiagnosticBanner, handleDiagnosticFocus
- Produces: ConverterWorkspaceProps.onDiagnosticFocus(): void
- Preserves: DiagnosticBanner role="alert", data-testid="diagnostic-banner", click focus behavior

- [ ] **Step 1: diagnostic footer DOM 관계의 failing component test를 작성한다.**

ConverterPage의 오류 위치와 stale 결과 test에서 진단 생성 직후 다음 assertion을 추가한다.

~~~tsx
const workspace = screen.getByTestId('converter-workspace');
const grid = workspace.querySelector('.converter-grid');
const diagnostic = screen.getByTestId('diagnostic-banner');

expect(workspace).toContainElement(diagnostic);
expect(grid).not.toContainElement(diagnostic);
expect(grid?.nextElementSibling).toBe(diagnostic);
~~~

- [ ] **Step 2: 실제 브라우저에서 footer 위치를 요구하는 failing assertion을 추가한다.**

converter.spec.ts의 첫 문법 오류 test에서 diagnostic 표시 직후 다음 assertion을 추가한다.

~~~ts
const workspace = page.getByTestId('converter-workspace');
const grid = workspace.locator('.converter-grid');
const diagnostic = page.getByTestId('diagnostic-banner');

await expect(grid.locator('xpath=following-sibling::*[1]')).toHaveAttribute('data-testid', 'diagnostic-banner');
await expect(diagnostic).toHaveCSS('border-top-style', 'solid');
~~~

- [ ] **Step 3: component와 E2E가 기존 페이지 레벨 배치에서 실패하는지 확인한다.**

Run:

~~~bash
npm run test -- --run src/pages/ConverterPage.test.tsx
npm run test:e2e -- --grep "첫 문법 오류"
~~~

Expected: workspace containment 또는 next sibling assertion이 FAIL한다.

- [ ] **Step 4: ConverterWorkspace가 진단 footer를 소유하게 한다.**

ConverterWorkspace.tsx에 import를 추가한다.

~~~tsx
import { DiagnosticBanner } from './DiagnosticBanner';
~~~

ConverterWorkspaceProps에 callback을 추가한다.

~~~ts
onDiagnosticFocus(): void;
~~~

함수 parameter에 onDiagnosticFocus를 추가하고 converter-grid 닫는 tag 다음에 다음 JSX를 렌더링한다.

~~~tsx
{state.diagnostic ? (
  <DiagnosticBanner diagnostic={state.diagnostic} onFocus={onDiagnosticFocus} />
) : null}
~~~

- [ ] **Step 5: ConverterPage의 페이지 레벨 배너를 제거하고 callback을 전달한다.**

ConverterPage.tsx에서 DiagnosticBanner import와 다음 페이지 레벨 JSX를 제거한다.

~~~tsx
{state.diagnostic ? <DiagnosticBanner diagnostic={state.diagnostic} onFocus={handleDiagnosticFocus} /> : null}
~~~

ConverterWorkspace 호출에 다음 prop을 추가한다.

~~~tsx
onDiagnosticFocus={handleDiagnosticFocus}
~~~

- [ ] **Step 6: desktop/mobile footer 스타일을 적용한다.**

components.css의 diagnostic rule을 다음으로 교체한다.

~~~css
.diagnostic-banner { margin: 0; padding: 10px 12px; color: var(--danger); background: var(--danger-surface); border: 0; border-top: 1px solid var(--danger); border-radius: 0; }
.diagnostic-banner button { width: 100%; padding: 0; color: inherit; background: transparent; border: 0; text-align: left; cursor: pointer; }
~~~

767px 이하 media query 안에 다음 rule을 추가한다.

~~~css
.diagnostic-banner { margin: 8px -8px -8px; }
~~~

- [ ] **Step 7: focused behavior, contrast와 정적 검증을 통과시킨다.**

Run:

~~~bash
npm run test -- --run src/pages/ConverterPage.test.tsx
npm run test:e2e -- --grep "첫 문법 오류|WCAG 대비|mobile Studio"
npm run lint
npm run typecheck
~~~

Expected: component/E2E PASS, 진단 텍스트 4.5:1 이상, 상단 border 3:1 이상, lint와 typecheck exit 0.

- [ ] **Step 8: Task 3을 커밋한다.**

~~~bash
git add json-yaml-converter/src/components/converter/ConverterWorkspace.tsx \
  json-yaml-converter/src/pages/ConverterPage.tsx \
  json-yaml-converter/src/pages/ConverterPage.test.tsx \
  json-yaml-converter/src/styles/components.css \
  json-yaml-converter/e2e/converter.spec.ts
git commit -m "feat(json-yaml-converter): place diagnostics below editor grid"
~~~

### Task 4: 전체 기능과 문서 동기화 검증

**Files:**
- Verify: json-yaml-converter/README.md
- Verify: json-yaml-converter/docs/contributor-guide.md
- Verify: docs/superpowers/specs/2026-07-23-json-yaml-converter-editor-actions-sample-diagnostic-design.md
- Verify: all modified source and test files

**Interfaces:**
- Consumes: Tasks 1-3의 fixture, icon action, diagnostic footer
- Produces: 검증 완료된 current branch

- [ ] **Step 1: 문서가 이전 예제·텍스트 액션·진단 배치를 현재 동작으로 주장하지 않는지 확인한다.**

Run:

~~~bash
rg -n "tool-hub|예제|Pretty|결과 복사|결과 다운로드|진단 배너|diagnostic" README.md docs
~~~

Expected: 사용자 문서에 새 구현과 충돌하는 설명이 없거나, 충돌이 있으면 해당 문장만 현재 동작으로 수정한다.

- [ ] **Step 2: 전체 unit test를 실행한다.**

Run:

~~~bash
npm run test
~~~

Expected: 모든 Vitest file과 test PASS.

- [ ] **Step 3: lint와 typecheck를 실행한다.**

Run:

~~~bash
npm run lint
npm run typecheck
~~~

Expected: 두 명령 모두 exit 0.

- [ ] **Step 4: production build를 실행한다.**

Run:

~~~bash
npm run build
~~~

Expected: tsc -b와 Vite production build exit 0. 기존 Monaco large chunk warning은 실패로 처리하지 않는다.

- [ ] **Step 5: 전체 Chromium E2E를 실행한다.**

Run:

~~~bash
npm run test:e2e
~~~

Expected: converter와 responsive spec 전체 PASS.

- [ ] **Step 6: 변경 범위와 whitespace를 확인한다.**

Run:

~~~bash
git diff --check
git status --short
git diff --stat
~~~

Expected: whitespace 오류 없음. 변경은 승인된 fixture, editor action, diagnostic footer, 테스트와 필요한 문서에 한정된다.

- [ ] **Step 7: 검증 과정에서 문서를 수정한 경우에만 별도 커밋한다.**

문서 변경이 있을 때만 실행한다.

~~~bash
git add json-yaml-converter/README.md json-yaml-converter/docs/contributor-guide.md
git commit -m "docs(json-yaml-converter): sync compact editor UI"
~~~
