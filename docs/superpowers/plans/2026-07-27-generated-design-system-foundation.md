# 디자인 시스템 생성 기반 및 공통 프리미티브 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 7개 웹 도구가 앱 내부 생성물로 소비할 제품 metadata, 공통 React 프리미티브, exact Lucide 의존성, 원자적 동기화, 제품별 파비콘 정본을 구축한다.

**Architecture:** 루트 `packages/design-system/`이 소스 정본이고 `scripts/sync-design-system.mjs`가 토큰 대상 9개, React 대상 7개, 파비콘 대상 8개에 서로 다른 생성물을 기록한다. 앱 빌드는 생성된 앱 내부 파일만 import하며 루트 패키지를 런타임에 참조하지 않는다.

**Tech Stack:** Node.js 24 · React 19 · TypeScript · Vitest · lucide-react 1.14.0 · sharp 0.34.5 · npm lockfile

## Global Constraints

- 카드형 셸·React 프리미티브 대상은 `sign-maker`, `json-yaml-converter`, `openapi-editor`, `api-contract-test-generator`, `ddl-seed-generator`, `config-diff-viewer`, `dummy-file-generator` 7개다.
- `home`은 평면형 sticky 헤더 예외이며 파비콘 카탈로그에만 포함한다.
- `webpage-capture-tool`은 기존 토큰 동기화만 유지하고 React·파비콘 대상에서 제외한다.
- 모든 도구 앱의 `lucide-react` 선언과 lockfile 해결 버전은 정확히 `1.14.0`이어야 한다. `^`와 `~`를 쓰지 않는다.
- 공통 UI 아이콘은 `16px`, `stroke-width="2"`, `currentColor`; 아이콘 버튼은 `36×36px`다.
- Button과 Segmented Control의 외곽 높이는 `36px`이고 disabled 계산 opacity는 `1`이다.
- 생성물은 앱 내부에 커밋하며 생성 파일에서 `packages/design-system`을 런타임 import하지 않는다.
- 앱의 Vercel build, install, dev 명령은 루트 동기화 명령에 의존하지 않는다.
- 구현은 `superpowers:test-driven-development`를 적용하고 각 Task 끝에서 지정한 검증을 통과한 뒤 커밋한다.

---

## File Structure

### 정본

- Create: `packages/design-system/products.mjs` — 제품명, 설명, 아이콘, 스택, 생성 경로, 포트의 단일 출처
- Create: `packages/design-system/components/BrandMark.tsx` — 40px 브랜드 프레임
- Create: `packages/design-system/components/ThemeToggle.tsx` — 36px 테마 전환 버튼
- Create: `packages/design-system/components/Button.tsx` — 5개 Button variant
- Create: `packages/design-system/components/SegmentedControl.tsx` — 단일 선택 그룹
- Create: `packages/design-system/components/EmptyState.tsx` — 빈 상태 표현
- Create: `packages/design-system/components/Badge.tsx` — 5개 의미 variant
- Create: `packages/design-system/components/ToolHeader.tsx` — 브랜드·액션·유틸리티 3슬롯 셸
- Create: `packages/design-system/components/components.test.tsx` — 앱에서 실행되는 생성 컴포넌트 계약 테스트
- Modify: `packages/design-system/primitives.css` — 위 컴포넌트의 정본 스타일
- Modify: `packages/design-system/ds-sync.test.ts` — 컴포넌트·파비콘 drift까지 검사

### 동기화·자산 도구

- Create: `scripts/products.test.mjs` — metadata 불변식 검사
- Create: `scripts/components-source.test.mjs` — 정본 소스와 CSS 계약 검사
- Create: `scripts/lucide-version.test.mjs` — 7개 package/lock exact 버전 검사
- Create: `scripts/sync-design-system.mjs` — validation-first 다중 대상 동기화
- Create: `scripts/sync-design-system.test.mjs` — 쓰기 전 검증, check, 원자적 파일 교체 검사
- Modify: `scripts/sync-design-tokens.mjs` — 이전 명령 호환용 얇은 위임 파일
- Delete: `scripts/sync-design-tokens.test.mjs` — 새 동기화 테스트로 대체
- Create: `scripts/build-favicons.mjs` — SVG·PNG·ICO·manifest 생성
- Create: `scripts/favicon-assets.test.mjs` — 파비콘 파일·헤더·크기 검사
- Modify: `package.json`
- Create: `package-lock.json`

### 생성 대상

- Generate: `<vite-app>/src/components/design-system/*`
- Generate: `<next-app>/app/_components/design-system/*`
- Generate: `<web-app>/public/favicon.svg`, `favicon.ico`, `favicon-16x16.png`, `favicon-32x32.png`, `apple-touch-icon.png`, `site.webmanifest`
- Generate: `packages/design-system/favicons/<product-id>/*`

---

### Task 1: 제품 metadata를 단일 정본으로 만든다

**Files:**
- Create: `packages/design-system/products.mjs`
- Create: `scripts/products.test.mjs`

**Interfaces:**
- Produces: `PRODUCTS: readonly Product[]`
- Produces: `WEB_TOOLS: readonly Product[]`
- Produces: `PRODUCT_BY_ID: ReadonlyMap<string, Product>`
- Produces: `validateProducts(products): void`
- `Product.icon`은 Lucide named export 문자열이고 `Product.header`는 `'flat' | 'card'`다.

- [ ] **Step 1: metadata 불변식의 실패 테스트를 작성한다**

`scripts/products.test.mjs`에 정확한 8개 웹 제품과 7개 카드형 도구를 고정한다.

```js
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { PRODUCTS, WEB_TOOLS, validateProducts } from '../packages/design-system/products.mjs';

const EXPECTED = [
  ['home', 'Tool Hub', null, 4179, 'flat'],
  ['sign-maker', 'Sign Maker', 'PenLine', 4180, 'card'],
  ['json-yaml-converter', 'JSON/YAML Converter', 'Braces', 4173, 'card'],
  ['openapi-editor', 'OpenAPI Editor', 'FileCode2', 4174, 'card'],
  ['api-contract-test-generator', 'API Contract Test Generator', 'FlaskConical', 4175, 'card'],
  ['ddl-seed-generator', 'DDL Seed Generator', 'Database', 4177, 'card'],
  ['config-diff-viewer', 'Config Diff Viewer', 'GitCompareArrows', 4176, 'card'],
  ['dummy-file-generator', 'Dummy File Generator', 'FilePlus2', 4178, 'card'],
];

describe('제품 metadata', () => {
  test('제품명·아이콘·포트·헤더 형태가 승인값과 같다', () => {
    assert.deepEqual(PRODUCTS.map(({ id, name, icon, e2ePort, header }) =>
      [id, name, icon, e2ePort, header]), EXPECTED);
    assert.deepEqual(WEB_TOOLS.map(({ id }) => id), EXPECTED.slice(1).map(([id]) => id));
  });

  test('중복 ID와 앱 밖 생성 경로를 거부한다', () => {
    assert.throws(() => validateProducts([...PRODUCTS, PRODUCTS[1]]), /중복 제품 ID/);
    assert.throws(() => validateProducts([{ ...PRODUCTS[1], componentDir: '../escape' }]), /앱 밖/);
  });
});
```

- [ ] **Step 2: 테스트를 실행해 정본 모듈 부재로 실패하는지 확인한다**

Run: `node --test scripts/products.test.mjs`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `packages/design-system/products.mjs`.

- [ ] **Step 3: 실제 metadata와 검증 함수를 구현한다**

`packages/design-system/products.mjs`의 제품 레코드는 다음 값을 그대로 사용한다.

```js
const products = [
  { id: 'home', name: 'Tool Hub', description: '간단하고 유용한 웹 도구 모음입니다.', icon: null, header: 'flat', stack: 'vite', componentDir: null, stylesDir: 'src/styles', publicDir: 'public', e2ePort: 4179 },
  { id: 'sign-maker', name: 'Sign Maker', description: '손글씨 서명을 만들고 내보냅니다.', icon: 'PenLine', header: 'card', stack: 'vite', componentDir: 'src/components/design-system', stylesDir: 'src/styles', publicDir: 'public', e2ePort: 4180 },
  { id: 'json-yaml-converter', name: 'JSON/YAML Converter', description: 'JSON과 YAML을 변환하고 검증합니다.', icon: 'Braces', header: 'card', stack: 'vite', componentDir: 'src/components/design-system', stylesDir: 'src/styles', publicDir: 'public', e2ePort: 4173 },
  { id: 'openapi-editor', name: 'OpenAPI Editor', description: 'OpenAPI 문서를 작성하고 미리 봅니다.', icon: 'FileCode2', header: 'card', stack: 'vite', componentDir: 'src/components/design-system', stylesDir: 'src/styles', publicDir: 'public', e2ePort: 4174 },
  { id: 'api-contract-test-generator', name: 'API Contract Test Generator', description: 'OpenAPI 계약에서 테스트를 생성합니다.', icon: 'FlaskConical', header: 'card', stack: 'vite', componentDir: 'src/components/design-system', stylesDir: 'src/styles', publicDir: 'public', e2ePort: 4175 },
  { id: 'ddl-seed-generator', name: 'DDL Seed Generator', description: 'DDL을 분석해 시드 데이터를 생성합니다.', icon: 'Database', header: 'card', stack: 'next', componentDir: 'app/_components/design-system', stylesDir: 'app/styles', publicDir: 'public', e2ePort: 4177 },
  { id: 'config-diff-viewer', name: 'Config Diff Viewer', description: '설정 파일의 차이를 비교합니다.', icon: 'GitCompareArrows', header: 'card', stack: 'next', componentDir: 'app/_components/design-system', stylesDir: 'app/styles', publicDir: 'public', e2ePort: 4176 },
  { id: 'dummy-file-generator', name: 'Dummy File Generator', description: '원하는 형식과 크기의 더미 파일을 생성합니다.', icon: 'FilePlus2', header: 'card', stack: 'next', componentDir: 'app/_components/design-system', stylesDir: 'app/styles', publicDir: 'public', e2ePort: 4178 },
];

export function validateProducts(input = products) {
  const ids = new Set();
  const ports = new Set();
  for (const product of input) {
    if (ids.has(product.id)) throw new Error(`중복 제품 ID: ${product.id}`);
    if (ports.has(product.e2ePort)) throw new Error(`중복 E2E 포트: ${product.e2ePort}`);
    for (const path of [product.componentDir, product.stylesDir, product.publicDir].filter(Boolean)) {
      if (path.startsWith('/') || path.split('/').includes('..')) throw new Error(`${product.id} 생성 경로가 앱 밖이다: ${path}`);
    }
    if (product.header === 'card' && !product.icon) throw new Error(`${product.id} 아이콘이 없다`);
    ids.add(product.id);
    ports.add(product.e2ePort);
  }
}

validateProducts(products);
export const PRODUCTS = Object.freeze(products.map(Object.freeze));
export const WEB_TOOLS = Object.freeze(PRODUCTS.filter(({ header }) => header === 'card'));
export const PRODUCT_BY_ID = new Map(PRODUCTS.map((product) => [product.id, product]));
```

- [ ] **Step 4: metadata 테스트를 통과시킨다**

Run: `node --test scripts/products.test.mjs`

Expected: 2 tests PASS.

- [ ] **Step 5: 커밋한다**

```bash
git add packages/design-system/products.mjs scripts/products.test.mjs
git commit -m "feat(design-system): define canonical product metadata"
```

---

### Task 2: 공통 React 프리미티브와 CSS 계약을 작성한다

**Files:**
- Create: `packages/design-system/components/BrandMark.tsx`
- Create: `packages/design-system/components/ThemeToggle.tsx`
- Create: `packages/design-system/components/Button.tsx`
- Create: `packages/design-system/components/SegmentedControl.tsx`
- Create: `packages/design-system/components/EmptyState.tsx`
- Create: `packages/design-system/components/Badge.tsx`
- Create: `packages/design-system/components/ToolHeader.tsx`
- Create: `packages/design-system/components/components.test.tsx`
- Create: `scripts/components-source.test.mjs`
- Modify: `packages/design-system/primitives.css`

**Interfaces:**
- `Button({ variant = 'secondary', type = 'button', ...buttonProps })`
- `SegmentedControl<T>({ value, options, onValueChange, ariaLabel, disabled? })`
- `EmptyState({ icon?, title, description?, action? })`
- `Badge({ variant = 'neutral', children })`
- `ToolHeader({ product, homeHref, theme, mounted?, actions?, utilities?, onThemeToggle })`

- [ ] **Step 1: 정본 소스 계약의 실패 테스트를 작성한다**

`scripts/components-source.test.mjs`는 파일 존재와 핵심 selector를 검사한다.

```js
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const COMPONENTS = ['BrandMark', 'ThemeToggle', 'Button', 'SegmentedControl', 'EmptyState', 'Badge', 'ToolHeader'];

describe('공통 컴포넌트 정본', () => {
  test('7개 컴포넌트와 계약 selector가 존재한다', () => {
    for (const name of COMPONENTS) {
      const path = `packages/design-system/components/${name}.tsx`;
      assert.equal(existsSync(path), true, `${path}가 없다`);
    }
    const source = COMPONENTS.map((name) => readFileSync(`packages/design-system/components/${name}.tsx`, 'utf8')).join('\n');
    for (const selector of ['data-ds-brand-mark', 'data-ds-theme-toggle', 'data-ds-button', 'data-ds-segmented', 'data-ds-empty-state', 'data-ds-badge', 'data-ds-tool-header']) {
      assert.match(source, new RegExp(selector));
    }
  });

  test('CSS가 40px 브랜드·36px 컨트롤·opacity 1을 고정한다', () => {
    const css = readFileSync('packages/design-system/primitives.css', 'utf8');
    assert.match(css, /\[data-ds-brand-mark\][\s\S]*width:\s*40px[\s\S]*height:\s*40px/);
    assert.match(css, /\.ds-button[\s\S]*height:\s*36px/);
    assert.match(css, /\.ds-segmented[\s\S]*height:\s*36px/);
    assert.match(css, /:disabled[\s\S]*opacity:\s*1/);
  });
});
```

- [ ] **Step 2: 테스트가 파일 부재로 실패하는지 확인한다**

Run: `node --test scripts/components-source.test.mjs`

Expected: FAIL listing `packages/design-system/components/BrandMark.tsx`.

- [ ] **Step 3: Button, Badge, EmptyState를 구현한다**

핵심 구현은 다음 API와 markup을 그대로 사용한다.

```tsx
// Button.tsx
import { forwardRef, type ButtonHTMLAttributes } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'icon';
export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', type = 'button', className = '', ...props }, ref,
) {
  if (variant === 'icon' && !props['aria-label'] && !props['aria-labelledby']) {
    throw new Error('icon Button에는 aria-label 또는 aria-labelledby가 필요합니다.');
  }
  return <button ref={ref} type={type} data-ds-button data-ds-control data-variant={variant}
    className={`ds-button ds-button--${variant} ${className}`.trim()} {...props} />;
});
export default Button;
```

```tsx
// Badge.tsx
import type { HTMLAttributes, ReactNode } from 'react';
export type BadgeVariant = 'neutral' | 'primary' | 'success' | 'warning' | 'danger';
export function Badge({ variant = 'neutral', children, className = '', ...props }:
  HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant; children: ReactNode }) {
  return <span data-ds-badge data-variant={variant} className={`ds-badge ds-badge--${variant} ${className}`.trim()} {...props}>{children}</span>;
}
```

```tsx
// EmptyState.tsx
import type { HTMLAttributes, ReactNode } from 'react';
export function EmptyState({ icon, title, description, action, className = '', ...props }:
  HTMLAttributes<HTMLDivElement> & { icon?: ReactNode; title: ReactNode; description?: ReactNode; action?: ReactNode }) {
  return <div data-ds-empty-state className={`ds-empty-state ${className}`.trim()} {...props}>
    {icon ? <span className="ds-empty-state__icon" aria-hidden="true">{icon}</span> : null}
    <strong>{title}</strong>
    {description ? <p>{description}</p> : null}
    {action ? <div className="ds-empty-state__action">{action}</div> : null}
  </div>;
}
```

- [ ] **Step 4: BrandMark, ThemeToggle, SegmentedControl을 구현한다**

```tsx
// BrandMark.tsx
import type { LucideIcon } from 'lucide-react';
export function BrandMark({ icon: Icon }: { icon: LucideIcon }) {
  return <span data-ds-brand-mark aria-hidden="true"><Icon data-ds-icon size={16} strokeWidth={2} /></span>;
}
```

```tsx
// ThemeToggle.tsx
import { Moon, Sun } from 'lucide-react';
import { Button } from './Button';
export function ThemeToggle({ theme, mounted = true, onToggle }:
  { theme: 'light' | 'dark'; mounted?: boolean; onToggle(): void }) {
  const next = theme === 'light' ? '다크' : '라이트';
  return <Button variant="icon" data-ds-theme-toggle aria-label={`${next} 테마로 전환`} onClick={onToggle}>
    {mounted ? (theme === 'light' ? <Moon data-ds-icon size={16} strokeWidth={2} /> : <Sun data-ds-icon size={16} strokeWidth={2} />)
      : <span className="ds-theme-placeholder" aria-hidden="true" />}
  </Button>;
}
```

```tsx
// SegmentedControl.tsx
import type { ReactNode } from 'react';
export interface SegmentOption<T extends string> { value: T; label: ReactNode; icon?: ReactNode }
export function SegmentedControl<T extends string>({ value, options, onValueChange, ariaLabel, disabled = false }:
  { value: T; options: readonly SegmentOption<T>[]; onValueChange(value: T): void; ariaLabel: string; disabled?: boolean }) {
  return <div data-ds-segmented data-ds-control className="ds-segmented" role="group" aria-label={ariaLabel} aria-disabled={disabled || undefined}>
    {options.map((option) => <button key={option.value} type="button" data-ds-control aria-pressed={value === option.value}
      disabled={disabled} onClick={() => onValueChange(option.value)}>
      {option.icon}<span>{option.label}</span>
    </button>)}
  </div>;
}
```

- [ ] **Step 5: ToolHeader를 구현한다**

`ToolHeader.tsx`는 ThemeToggle을 utilities의 마지막 DOM 자식으로 직접 렌더한다.

```tsx
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { BrandMark } from './BrandMark';
import { ThemeToggle } from './ThemeToggle';

interface ProductView { name: string; description: string; icon: LucideIcon }
export function ToolHeader({ product, homeHref, theme, mounted = true, actions, utilities, onThemeToggle }:
  { product: ProductView; homeHref: string; theme: 'light' | 'dark'; mounted?: boolean;
    actions?: ReactNode; utilities?: ReactNode; onThemeToggle(): void }) {
  return <header data-ds-tool-header className="ds-tool-header">
    <a data-ds-tool-brand className="ds-tool-header__brand" href={homeHref} aria-label="Tool Hub로 이동">
      <BrandMark icon={product.icon} />
      <span className="ds-tool-header__copy"><strong>{product.name}</strong><span>{product.description}</span></span>
    </a>
    <div data-ds-tool-actions className="ds-tool-header__actions">{actions}</div>
    <div data-ds-tool-utilities className="ds-tool-header__utilities">{utilities}<ThemeToggle theme={theme} mounted={mounted} onToggle={onThemeToggle} /></div>
  </header>;
}
```

- [ ] **Step 6: 프리미티브 CSS를 추가한다**

`primitives.css`의 기존 `.ds-card`, `.ds-icon-btn` 뒤에 다음 규격을 추가하고 `.ds-icon-btn`은 `.ds-button--icon`과 같은 선언 그룹으로 합친다.

```css
[data-ds-brand-mark] { width: 40px; height: 40px; flex: 0 0 40px; display: grid; place-items: center; color: var(--on-primary); background: var(--primary); border-radius: var(--ds-radius-md); }
[data-ds-brand-mark] svg, [data-ds-icon] { width: 16px; height: 16px; stroke-width: 2; }
.ds-button { height: 36px; min-height: 36px; display: inline-flex; align-items: center; justify-content: center; gap: 6px; padding: 0 12px; border: 1px solid var(--line); border-radius: var(--ds-radius-md); font: inherit; font-weight: 700; cursor: pointer; }
.ds-button--primary { color: var(--on-primary); background: var(--primary); border-color: var(--primary); }
.ds-button--secondary { color: var(--text); background: var(--surface-2); }
.ds-button--ghost { color: var(--muted); background: transparent; border-color: transparent; }
.ds-button--danger { color: var(--danger); background: var(--danger-surface); border-color: var(--danger); }
.ds-button--icon, .ds-icon-btn { width: 36px; min-width: 36px; height: 36px; padding: 0; color: var(--muted); background: var(--surface-2); border: 1px solid var(--line); }
.ds-button:hover:not(:disabled) { background: var(--surface-3); border-color: var(--line-strong); color: var(--text); }
.ds-button--primary:hover:not(:disabled) { color: var(--on-primary); background: var(--primary-strong); border-color: var(--primary-strong); }
.ds-button:disabled, .ds-segmented button:disabled, [data-ds-control][aria-disabled="true"] { opacity: 1; color: var(--disabled); cursor: not-allowed; }
.ds-segmented { height: 36px; display: inline-flex; align-items: center; gap: 2px; padding: 2px; background: var(--surface-2); border: 0; border-radius: var(--ds-radius-md); box-shadow: inset 0 0 0 1px var(--line); }
.ds-segmented button { height: 32px; display: inline-flex; align-items: center; justify-content: center; gap: 6px; padding: 0 10px; color: var(--muted); background: transparent; border: 0; border-radius: var(--ds-radius-sm); font: inherit; font-weight: 700; }
.ds-segmented button[aria-pressed="true"] { color: var(--text); background: var(--surface); box-shadow: var(--ds-shadow-sm); }
.ds-empty-state { display: grid; justify-items: center; gap: 8px; padding: 24px; color: var(--muted); text-align: center; }
.ds-empty-state__icon, .ds-empty-state__icon svg { width: 16px; height: 16px; }
.ds-empty-state p { margin: 0; }
.ds-badge { display: inline-flex; align-items: center; min-height: 22px; padding: 2px 7px; border-radius: var(--ds-radius-pill); font-size: var(--ds-font-size-caption); font-weight: 800; }
.ds-badge--neutral { color: var(--text-neutral); background: var(--surface-2); }
.ds-badge--primary { color: var(--primary-text); background: var(--primary-surface); }
.ds-badge--success { color: var(--success); background: var(--success-surface); }
.ds-badge--warning { color: var(--warning); background: var(--warning-surface); }
.ds-badge--danger { color: var(--danger); background: var(--danger-surface); }
.ds-tool-header { min-width: 0; display: grid; grid-template-columns: minmax(0, 1fr) auto auto; align-items: center; gap: 12px; padding: 16px 20px; background: var(--surface); border: 1px solid var(--line); border-radius: var(--ds-radius-lg); box-shadow: var(--ds-shadow-sm); }
.ds-tool-header__brand { min-width: 0; display: flex; align-items: center; gap: 12px; color: inherit; text-decoration: none; }
.ds-tool-header__copy { min-width: 0; display: grid; gap: 2px; }
.ds-tool-header__copy strong { overflow: hidden; font-size: var(--ds-font-size-title); line-height: var(--ds-line-height-title); text-overflow: ellipsis; white-space: nowrap; }
.ds-tool-header__copy > span { overflow: hidden; color: var(--muted); font-size: var(--ds-font-size-body); text-overflow: ellipsis; white-space: nowrap; }
.ds-tool-header__actions, .ds-tool-header__utilities { min-width: 0; display: flex; align-items: center; gap: 8px; }
@media (max-width: 767px) {
  .ds-tool-header { grid-template-columns: minmax(0, 1fr) 36px; grid-template-areas: "brand utilities" "actions actions"; padding: 12px; }
  .ds-tool-header__brand { grid-area: brand; }
  .ds-tool-header__actions { grid-area: actions; width: 100%; }
  .ds-tool-header__utilities { grid-area: utilities; }
  .ds-tool-header__utilities > :not([data-ds-theme-toggle]) { display: none; }
  .ds-tool-header__copy > span { display: none; }
}
```

- [ ] **Step 7: 생성 컴포넌트 계약 테스트를 작성한다**

`components.test.tsx`는 `renderToStaticMarkup`을 사용해 jsdom 추가 없이 7개 앱에서 실행한다. 최소 assertions는 다음과 같다.

```tsx
import { renderToStaticMarkup } from 'react-dom/server';
import { PenLine } from 'lucide-react';
import { describe, expect, it } from 'vitest';
import { Button } from './Button';
import { SegmentedControl } from './SegmentedControl';
import { ToolHeader } from './ToolHeader';

describe('생성 디자인 시스템 컴포넌트', () => {
  it('Button 기본 type과 계약 selector를 출력한다', () => {
    expect(renderToStaticMarkup(<Button>저장</Button>)).toContain('type="button"');
    expect(renderToStaticMarkup(<Button>저장</Button>)).toContain('data-ds-button="true"');
  });
  it('접근성 이름 없는 icon Button을 거부한다', () => {
    expect(() => renderToStaticMarkup(<Button variant="icon">+</Button>)).toThrow(/aria-label/);
  });
  it('Segmented Control은 단일 선택을 aria-pressed로 표현한다', () => {
    const html = renderToStaticMarkup(<SegmentedControl value="a" ariaLabel="보기" onValueChange={() => {}} options={[{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }]} />);
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain('aria-pressed="false"');
  });
  it('ThemeToggle이 utilities의 마지막 요소다', () => {
    const html = renderToStaticMarkup(<ToolHeader product={{ name: 'Sign Maker', description: '설명', icon: PenLine }} homeHref="https://example.com" theme="light" utilities={<span>도움말</span>} onThemeToggle={() => {}} />);
    expect(html.indexOf('도움말')).toBeLessThan(html.indexOf('data-ds-theme-toggle'));
    expect(html).toContain('다크 테마로 전환');
  });
});
```

- [ ] **Step 8: 정본 소스 테스트를 통과시킨다**

Run: `node --test scripts/components-source.test.mjs`

Expected: 2 tests PASS.

- [ ] **Step 9: 커밋한다**

```bash
git add packages/design-system/components packages/design-system/primitives.css scripts/components-source.test.mjs
git commit -m "feat(design-system): define canonical React primitives"
```

---

### Task 3: Lucide를 7개 앱에서 정확히 1.14.0으로 고정한다

**Files:**
- Create: `scripts/lucide-version.test.mjs`
- Modify: `sign-maker/package.json`, `sign-maker/package-lock.json`
- Modify: `json-yaml-converter/package.json`, `json-yaml-converter/package-lock.json`
- Modify: `openapi-editor/package.json`, `openapi-editor/package-lock.json`
- Modify: `api-contract-test-generator/package.json`, `api-contract-test-generator/package-lock.json`
- Modify: `ddl-seed-generator/package.json`, `ddl-seed-generator/package-lock.json`
- Modify: `config-diff-viewer/package.json`, `config-diff-viewer/package-lock.json`
- Modify: `dummy-file-generator/package.json`, `dummy-file-generator/package-lock.json`

**Interfaces:**
- Produces: 모든 7개 앱에서 `dependencies['lucide-react'] === '1.14.0'`
- Produces: 모든 lockfile에서 `packages['node_modules/lucide-react'].version === '1.14.0'`

- [ ] **Step 1: exact 버전 실패 테스트를 작성한다**

```js
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { WEB_TOOLS } from '../packages/design-system/products.mjs';

describe('Lucide 버전', () => {
  for (const { id } of WEB_TOOLS) test(`${id}가 1.14.0을 정확히 사용한다`, () => {
    const pkg = JSON.parse(readFileSync(`${id}/package.json`, 'utf8'));
    const lock = JSON.parse(readFileSync(`${id}/package-lock.json`, 'utf8'));
    assert.equal(pkg.dependencies['lucide-react'], '1.14.0');
    assert.equal(lock.packages['node_modules/lucide-react'].version, '1.14.0');
    assert.equal(lock.packages[''].dependencies['lucide-react'], '1.14.0');
  });
});
```

- [ ] **Step 2: 테스트가 기존 범위 선언과 dummy 누락으로 실패하는지 확인한다**

Run: `node --test scripts/lucide-version.test.mjs`

Expected: 7개 중 최소 `sign-maker`의 `^0.575.0`과 `dummy-file-generator`의 누락을 보고하며 FAIL.

- [ ] **Step 3: 각 앱에서 exact 버전으로 lockfile을 갱신한다**

각 명령은 해당 앱 디렉터리에서 실행한다.

```bash
npm install --save-exact lucide-react@1.14.0
```

실행 순서: `sign-maker`, `json-yaml-converter`, `openapi-editor`, `api-contract-test-generator`, `ddl-seed-generator`, `config-diff-viewer`, `dummy-file-generator`.

- [ ] **Step 4: exact 버전과 앱 typecheck를 검증한다**

Run: `node --test scripts/lucide-version.test.mjs`

Run in every target app: `npm run typecheck`

Expected: 7 metadata tests PASS and 7 typechecks exit 0.

- [ ] **Step 5: 커밋한다**

```bash
git add scripts/lucide-version.test.mjs */package.json */package-lock.json
git commit -m "build(design-system): pin Lucide 1.14.0 across web tools"
```

---

### Task 4: validation-first 전체 디자인 시스템 동기화를 구현한다

**Files:**
- Create: `scripts/sync-design-system.mjs`
- Create: `scripts/sync-design-system.test.mjs`
- Modify: `scripts/sync-design-tokens.mjs`
- Delete: `scripts/sync-design-tokens.test.mjs`
- Modify: `package.json`
- Modify: `packages/design-system/ds-sync.test.ts`
- Generate: 7개 앱의 `components/design-system/*`
- Generate: 9개 기존 토큰 대상의 `styles/ds-*`

**Interfaces:**
- `buildOperations({ root }): Operation[]`
- `validateOperations(operations, { root }): void`
- `sync({ root, check = false }): string[]`
- `runCli(argv): Promise<void>`
- `Operation = { sourcePath: string; targetPath: string; content: Buffer | string }`

- [ ] **Step 1: 새 동기화 엔진의 실패 테스트를 작성한다**

기존 테스트의 idempotent/check/drift 사례를 옮기고 다음 세 사례를 추가한다.

```js
test('검증 오류가 있으면 어떤 대상도 쓰지 않는다', () => {
  const root = makeRepo();
  rmSync(join(root, 'packages/design-system/components/Button.tsx'));
  assert.throws(() => sync({ root }), /Button\.tsx/);
  assert.equal(existsSync(join(root, 'sign-maker/src/styles/ds-tokens.css')), false);
});

test('대상 경로가 앱 밖이면 쓰기 전에 거부한다', () => {
  const root = makeRepo();
  const operations = [{ sourcePath: 'x', targetPath: 'sign-maker/../escape.ts', content: 'x' }];
  assert.throws(() => validateOperations(operations, { root }), /앱 밖/);
});

test('알 수 없는 CLI 옵션을 거부한다', async () => {
  await assert.rejects(() => runCli(['--write-anyway']), /알 수 없는 옵션/);
});
```

- [ ] **Step 2: 테스트가 새 모듈 부재로 실패하는지 확인한다**

Run: `node --test scripts/sync-design-system.test.mjs`

Expected: FAIL with `ERR_MODULE_NOT_FOUND`.

- [ ] **Step 3: 동기화 operation 생성을 구현한다**

`TOKEN_TARGETS`는 기존 9개 스타일 디렉터리를 그대로 보존한다. `WEB_TOOL_TARGETS`는 `WEB_TOOLS`의 `componentDir`에서 만들고, 다음 정본을 복사한다.

```js
export const COMPONENT_FILES = [
  'BrandMark.tsx', 'ThemeToggle.tsx', 'Button.tsx', 'SegmentedControl.tsx',
  'EmptyState.tsx', 'Badge.tsx', 'ToolHeader.tsx', 'components.test.tsx',
];

function renderProduct(product) {
  return generatedBanner('packages/design-system/products.mjs') +
    `import { ${product.icon} } from 'lucide-react';\n` +
    `export const PRODUCT = ${JSON.stringify({ id: product.id, name: product.name, description: product.description }, null, 2)} as const;\n` +
    `export const ProductIcon = ${product.icon};\n`;
}
```

각 앱의 생성 디렉터리에 `product.generated.ts`를 추가하고, `ToolHeader` 호출 시 `{ ...PRODUCT, icon: ProductIcon }` 형태로 전달한다.

- [ ] **Step 4: validation-first와 파일 단위 원자적 교체를 구현한다**

```js
export function validateOperations(operations, { root = DEFAULT_ROOT } = {}) {
  const targets = new Set();
  for (const operation of operations) {
    const absolute = resolve(root, operation.targetPath);
    const app = operation.targetPath.split('/')[0];
    const appRoot = resolve(root, app);
    if (absolute !== appRoot && !absolute.startsWith(`${appRoot}${sep}`)) throw new Error(`생성 대상이 앱 밖이다: ${operation.targetPath}`);
    if (targets.has(absolute)) throw new Error(`중복 생성 대상: ${operation.targetPath}`);
    if (!existsSync(appRoot)) throw new Error(`대상 앱이 없다: ${app}`);
    targets.add(absolute);
  }
}

function atomicWrite(path, content) {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = join(dirname(path), `.${basename(path)}.tmp-${process.pid}`);
  try { writeFileSync(temporary, content); renameSync(temporary, path); }
  finally { if (existsSync(temporary)) unlinkSync(temporary); }
}

export function sync({ root = DEFAULT_ROOT, check = false } = {}) {
  const operations = buildOperations({ root });
  validateOperations(operations, { root });
  const drifted = operations.filter(({ targetPath, content }) => !sameContent(resolve(root, targetPath), content));
  if (!check) for (const operation of drifted) atomicWrite(resolve(root, operation.targetPath), operation.content);
  return drifted.map(({ targetPath }) => targetPath);
}
```

- [ ] **Step 5: 이전 명령 호환과 package scripts를 추가한다**

`sync-design-tokens.mjs`는 `sync-design-system.mjs`의 exports와 CLI만 위임한다. `package.json`은 다음 scripts를 갖는다.

```json
{
  "design-system:sync": "node scripts/sync-design-system.mjs",
  "design-system:check": "node scripts/sync-design-system.mjs --check",
  "design-system:test": "node --test 'scripts/**/*.test.mjs'",
  "tokens:sync": "npm run design-system:sync",
  "tokens:check": "npm run design-system:check",
  "tokens:test": "npm run design-system:test"
}
```

- [ ] **Step 6: 앱 내부 drift 테스트를 컴포넌트까지 확장한다**

`ds-sync.test.ts`에 Vite/Next 생성 경로 감지와 component suffix 비교를 추가한다.

```ts
const COMPONENT_DIR = ['src/components/design-system', 'app/_components/design-system']
  .map((path) => resolve(process.cwd(), path)).find(existsSync);
const COMPONENTS = ['BrandMark.tsx', 'ThemeToggle.tsx', 'Button.tsx', 'SegmentedControl.tsx', 'EmptyState.tsx', 'Badge.tsx', 'ToolHeader.tsx', 'components.test.tsx'] as const;

if (COMPONENT_DIR) describe('생성 컴포넌트 정본 동기화', () => {
  it.each(COMPONENTS)('%s가 정본과 일치한다', (name) => {
    const canonical = readFileSync(join(CANONICAL_DIR, 'components', name), 'utf8');
    const copy = readFileSync(join(COMPONENT_DIR, name), 'utf8');
    expect(copy.endsWith(canonical)).toBe(true);
  });
});
```

- [ ] **Step 7: 동기화하고 루트·앱 테스트를 실행한다**

Run: `npm run design-system:sync`

Run: `npm run design-system:test && npm run design-system:check`

Run in each 7 web tool app: `npm run test && npm run typecheck`

Expected: 루트 Node tests, 7개 앱 Vitest/component tests, 7개 typechecks 모두 PASS; check는 drift 0건.

- [ ] **Step 8: 앱 빌드가 루트 import를 갖지 않는지 검사한다**

Run:

```bash
rg -n "from ['\"]\.\./.*packages/design-system|from ['\"]/.*packages/design-system" sign-maker/src json-yaml-converter/src openapi-editor/src api-contract-test-generator/src ddl-seed-generator/app config-diff-viewer/app dummy-file-generator/app
```

Expected: exit 1 with no matches.

- [ ] **Step 9: 커밋한다**

```bash
git add scripts package.json packages/design-system/ds-sync.test.ts packages/design-system/primitives.css sign-maker/src json-yaml-converter/src openapi-editor/src api-contract-test-generator/src ddl-seed-generator/app config-diff-viewer/app dummy-file-generator/app home/src webpage-capture-tool/apps/electron/renderer
git commit -m "feat(design-system): sync generated primitives into each app"
```

---

### Task 5: 제품별 파비콘 세트를 생성하고 동기화한다

**Files:**
- Modify: `package.json`
- Create: `package-lock.json`
- Create: `scripts/build-favicons.mjs`
- Create: `scripts/favicon-assets.test.mjs`
- Modify: `scripts/sync-design-system.mjs`
- Modify: `scripts/sync-design-system.test.mjs`
- Modify: `packages/design-system/ds-sync.test.ts`
- Create: `packages/design-system/favicons/home/source.svg`
- Generate: `packages/design-system/favicons/<product-id>/*`
- Generate: 8개 웹 앱의 `public/favicon*`, `apple-touch-icon.png`, `site.webmanifest`

**Interfaces:**
- `renderToolFaviconSvg(product): Promise<string>`
- `encodeIco(images: Array<{ width: number; height: number; png: Buffer }>): Buffer`
- `buildFaviconSet(product, { root }): Promise<string[]>`

- [ ] **Step 1: 파비콘 완전성의 실패 테스트를 작성한다**

```js
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PRODUCTS } from '../packages/design-system/products.mjs';

const REQUIRED = ['favicon.svg', 'favicon.ico', 'favicon-16x16.png', 'favicon-32x32.png', 'apple-touch-icon.png', 'site.webmanifest'];
describe('파비콘 정본', () => {
  for (const product of PRODUCTS) test(`${product.id} 세트가 완전하다`, () => {
    const dir = `packages/design-system/favicons/${product.id}`;
    for (const name of REQUIRED) assert.doesNotThrow(() => readFileSync(`${dir}/${name}`));
    assert.deepEqual([...readFileSync(`${dir}/favicon.ico`).subarray(0, 4)], [0, 0, 1, 0]);
    assert.deepEqual([...readFileSync(`${dir}/favicon-16x16.png`).subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
    assert.equal(JSON.parse(readFileSync(`${dir}/site.webmanifest`, 'utf8')).name, product.name);
  });
});
```

- [ ] **Step 2: 테스트가 정본 자산 부재로 실패하는지 확인한다**

Run: `node --test scripts/favicon-assets.test.mjs`

Expected: FAIL on `packages/design-system/favicons/home/favicon.svg`.

- [ ] **Step 3: 루트 자산 생성 의존성을 exact로 설치한다**

Run from repository root:

```bash
npm install --save-dev --save-exact react@19.2.7 react-dom@19.2.7 lucide-react@1.14.0 sharp@0.34.5
```

`home/public/favicon.svg`를 `packages/design-system/favicons/home/source.svg`의 초기 내용으로 옮기되 원본은 동기화가 끝날 때까지 보존한다.

- [ ] **Step 4: SVG와 raster 생성기를 구현한다**

도구 SVG는 외곽 40px 파란 프레임과 16px Lucide nested SVG를 만든다.

```js
export async function renderToolFaviconSvg(product) {
  const React = await import('react');
  const { renderToStaticMarkup } = await import('react-dom/server');
  const lucide = await import('lucide-react');
  const Icon = lucide[product.icon];
  if (!Icon) throw new Error(`지원하지 않는 Lucide 아이콘: ${product.icon}`);
  const glyph = renderToStaticMarkup(React.createElement(Icon, { x: 12, y: 12, width: 16, height: 16, strokeWidth: 2, color: '#ffffff' }));
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><rect width="40" height="40" rx="12" fill="#3366ff"/>${glyph}</svg>\n`;
}
```

`sharp(Buffer.from(svg)).resize(size, size).png().toBuffer()`로 16, 32, 180 PNG를 만들고, ICO는 16·32 PNG를 ICO directory 뒤에 넣는다.

```js
export function encodeIco(images) {
  const header = Buffer.alloc(6 + images.length * 16);
  header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(images.length, 4);
  let offset = header.length;
  images.forEach(({ width, height, png }, index) => {
    const entry = 6 + index * 16;
    header.writeUInt8(width === 256 ? 0 : width, entry);
    header.writeUInt8(height === 256 ? 0 : height, entry + 1);
    header.writeUInt16LE(1, entry + 4);
    header.writeUInt16LE(32, entry + 6);
    header.writeUInt32LE(png.length, entry + 8);
    header.writeUInt32LE(offset, entry + 12);
    offset += png.length;
  });
  return Buffer.concat([header, ...images.map(({ png }) => png)]);
}
```

manifest는 제품마다 다음 구조를 쓴다.

```json
{
  "name": "Sign Maker",
  "short_name": "Sign Maker",
  "icons": [
    { "src": "/favicon-32x32.png", "sizes": "32x32", "type": "image/png" },
    { "src": "/apple-touch-icon.png", "sizes": "180x180", "type": "image/png" }
  ],
  "theme_color": "#3366ff",
  "background_color": "#f7f7f8",
  "display": "standalone"
}
```

- [ ] **Step 5: 정본 세트를 생성하고 테스트를 통과시킨다**

Run: `node scripts/build-favicons.mjs`

Run: `node --test scripts/favicon-assets.test.mjs`

Expected: 8 product tests PASS.

- [ ] **Step 6: favicon operation과 앱 drift 검사를 추가한다**

`sync-design-system.mjs`가 정본 `favicons/<id>/`의 REQUIRED 파일을 `<id>/public/`로 바이트 복사하도록 operation을 추가한다. `ds-sync.test.ts`는 `basename(process.cwd())`로 제품 ID를 얻어 canonical favicon과 앱 `public/` 파일의 Buffer equality를 검사한다. Electron에서는 canonical 디렉터리가 없으므로 favicon suite를 등록하지 않는다.

- [ ] **Step 7: 동기화와 전체 기반 검증을 실행한다**

Run:

```bash
npm run design-system:sync
npm run design-system:test
npm run design-system:check
```

Run in each 7 web tool app: `npm run test && npm run typecheck`

Expected: root tests PASS, drift 0건, 7개 앱 tests/typechecks PASS.

- [ ] **Step 8: 기반 작업을 커밋한다**

```bash
git add package.json package-lock.json scripts packages/design-system home/public sign-maker/public json-yaml-converter/public openapi-editor/public api-contract-test-generator/public ddl-seed-generator/public config-diff-viewer/public dummy-file-generator/public
git commit -m "feat(design-system): generate product favicon families"
```

---

## Plan 1 Completion Gate

- [ ] `npm run design-system:test` exits 0.
- [ ] `npm run design-system:check` reports no drift.
- [ ] 7개 앱의 `npm run test`와 `npm run typecheck`가 모두 통과한다.
- [ ] 7개 앱의 package/lock에서 `lucide-react`가 정확히 `1.14.0`이다.
- [ ] 8개 웹 앱의 canonical/app-local favicon set이 byte 단위로 일치한다.
- [ ] 생성 TSX가 루트 `packages/design-system`을 import하지 않는다.
- [ ] `git status --short`가 비어 있다.

다음 실행 문서: [`2026-07-27-seven-tool-shell-migration.md`](./2026-07-27-seven-tool-shell-migration.md)
