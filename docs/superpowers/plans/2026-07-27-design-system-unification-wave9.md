# 디자인 시스템 통일 9차: 요소 층 대비 가드 확대와 프리미티브 채택

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 토큰 층 대비 가드(8차)가 못 보는 **렌더 시점 합성 문제**를 7개 앱에서 잡고, 그동안 "가치 불확실"로 미뤄 둔 `.ds-card` 채택·`--scrim` 승격·허브 URL 드리프트 방지를 마무리한다.

**Architecture:** 대비 계산 헬퍼를 정본에 두고 9개 앱에 동기화한다(브라우저 없는 `ds-contrast.test.ts` 와 달리 Playwright 스펙에서 import 하는 모듈이다). 각 앱의 스펙은 **자기 셀렉터만** 넘긴다. Playwright 하네스가 없는 5개 앱에는 설정·의존성·mise 태스크를 신설하고 포트를 4176~4180 으로 분리한다 — 8차에서 4173 충돌이 여러 차례 "플레이크"로 오진된 전례가 있다.

**Tech Stack:** Playwright 1.5x · Vite 2앱 / Next.js 3앱 · vitest · 정본 동기화 스크립트

## Global Constraints

- 작업 브랜치는 `feat/design-system-wave9` 이며 `main` 에서 분기한다.
- `styles/ds-*.css` · `ds-sync.test.ts` · `ds-contrast.test.ts` · `ds-contrast-e2e.ts` 는 **생성물이다.** 정본을 고친 뒤 `npm run tokens:sync` 를 실행한다.
- **포트는 앱마다 달라야 한다.** `reuseExistingServer` 가 켜져 있어 같은 포트를 쓰면 먼저 뜬 다른 앱의 서버를 재사용해 엉뚱한 앱을 테스트한다. 기존: json-yaml-converter 4173 · openapi-editor 4174 · api-contract-test-generator 4175. 신설: **config-diff-viewer 4176 · ddl-seed-generator 4177 · dummy-file-generator 4178 · home 4179 · sign-maker 4180**.
- 정본 토큰 추가는 **순수 추가**여야 한다. 기존 값을 바꾸지 않는다.
- 검증은 앱마다 `mise run check`, 루트에서 `npm run tokens:check` · `npm run tokens:test`.
- E2E 를 새로 붙인 앱은 `mise run install` 뒤 `npx playwright install chromium` 이 필요하다. `npm ci` 가 `node_modules` 를 재설치하면서 브라우저 버전 핀이 바뀐다.

## 사전 실측

`main`(09f9c67)에서 확인했다. 실행자는 다시 증명할 필요가 없다.

### 요소 층 가드가 잡는 것

8차의 `ds-contrast.test.ts` 는 **토큰 값만** 계산한다. 잡지 못하는 것은 렌더 시점 합성이다 — 6차에서 실제로 겪었다.

- 알파 기반 역할 표면이 **부모 틴트 위에 겹치면** 대비가 떨어진다(POST 배지 4.71 → 4.21).
- `background-image` 로 칠한 틴트를 `backgroundColor` 만 읽으면 **불투명 밑판과 비교**해 통과한다(실제 4.73 을 11.71 로 읽었다).

### 앱별 역할색 사용 실태

| 앱 | 역할색 요소 | 현재 가드 |
|---|---|---|
| `config-diff-viewer` | 20종 (`.badge` · `.statusBadge` · `.valuePill` · `.filterChip` 등) | 없음 |
| `ddl-seed-generator` | 7종 (`.validationList` · `.warningList` · `.downloadNotice` 등) | 없음 |
| `dummy-file-generator` | `--danger` 1 · `--muted` 5 | 없음 |
| `sign-maker` | `--muted` 3 · `--primary-text` 1 | 없음 |
| `home` | `text-muted` 11 · `text-primary-text` 3 (Tailwind 유틸) | 없음 |
| `json-yaml-converter` | 다수 | **있음** (`responsive.spec.ts` 안, 자체 헬퍼) |
| `api-contract-test-generator` | 다수 | **있음** (`contrast.spec.ts`, 자체 헬퍼) |

`home` · `sign-maker` 는 danger/warning/success 를 쓰지 않아 검사 대상이 보조·강조 텍스트뿐이다. 그래도 7개 앱 전부에 두기로 결정했다 — 규약이 앱마다 있어야 새 컴포넌트를 추가할 때 가드가 자동으로 따라붙는다.

**헬퍼가 두 앱에 중복 구현돼 있다**(`json-yaml-converter/e2e/responsive.spec.ts`, `api-contract-test-generator/e2e/contrast.spec.ts`). 정본으로 올려 7개 앱이 같은 코드를 쓴다.

### `.ds-card` — 6곳이 선언까지 완전 일치

정본 `.ds-card` 는 선언 4개다.

```css
.ds-card {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--ds-radius-lg);
  box-shadow: var(--ds-shadow-sm);
}
```

앱의 카드류 18곳을 대조한 결과 **6곳이 완전 일치**(3개 이상 선언이 값까지 같음)해 시각 변화 없이 채택된다.

| 앱 | 클래스 |
|---|---|
| `api-contract-test-generator` | `.welcome-panel` · `.step-panel` |
| `config-diff-viewer` | `.editorCard` · `.resultCard` · `.diffViewCard` |
| `ddl-seed-generator` | `.resultPanel` |

나머지 9곳 부분 일치·3곳 불일치는 에디터 패널(테두리·radius 없음), 히어로, accent ring 이라 성격이 다르다. **건드리지 않는다.**

### `--scrim` — 2개 앱, 라이트 값이 이미 같다

| 앱 | 라이트 | 다크 |
|---|---|---|
| `config-diff-viewer` | `rgba(23, 23, 25, 0.4)` | `rgba(0, 0, 0, 0.56)` |
| `webpage-capture-tool` | `rgba(23, 23, 25, 0.4)` | 없음(앱에 다크 모드 없음) |

승격 기준은 3개 앱이지만 **예외로 승격**하기로 결정했다. 오버레이 배경막은 정의가 명확하고 라이트 값이 이미 일치한다. README 에 예외 근거를 남긴다.

### 허브 URL — 이미 앱당 1곳

12곳이 아니라 **상수 6곳 + 그 값을 검증하는 테스트 6곳**이다. 앱마다 독립 패키지라 상수 공유 수단이 없고 구조적으로는 이미 단일 지점이다. **값이 갈리는 것만 막는다** — 루트 테스트를 추가한다.

### api-contract-test-generator 정합성

리터럴 색상·radius·shadow·font-size 전부 0, `opacity` 기반 disabled 0, 자체 focus-visible 0. 남은 차이는 하나다.

- `.export-step { max-width: 980px }` — 정본 컨테이너 단계(560/1120/1600)에 맞지 않는 위저드 폭이다. 앱 고유 토큰으로 내린다.

`json-yaml-converter` 는 완전 정합이다(`.app-main` 이 이미 `--ds-container-wide`). 스펙 정규화 외에 고칠 것이 없다.

### 신설 대상의 현재 상태

5개 앱 모두 `mise run check` 가 `["test","lint","typecheck","build"]` 이고 `@playwright/test` 의존성이 없다. dev 명령은 Vite 2개(`vite`), Next.js 3개(`next dev`)로 둘 다 `-- --port N` 을 받는다. 포트 4176~4180 은 비어 있다.

---

### Task 1: `--scrim` 을 정본으로 승격

**Files:**
- Modify: `packages/design-system/tokens.css`
- Modify: `packages/design-system/README.md`
- Modify: `config-diff-viewer/app/styles/theme.local.css`
- Modify: `webpage-capture-tool/apps/electron/renderer/styles/theme.local.css`

- [ ] **Step 1: 정본에 추가한다**

`tokens.css` 라이트 `:root` 의 `--inverse-line` 줄 뒤에 추가한다.

```css

  /* 모달·드로어 배경막. 승격 기준은 3개 앱이지만 오버레이는 정의가 명확하고
     두 앱의 라이트 값이 이미 같아 예외로 올린다. */
  --scrim: rgba(23, 23, 25, 0.4);
```

다크 블록의 `--inverse-line` 줄 뒤에 추가한다.

```css
  --scrim: rgba(0, 0, 0, 0.56);
```

- [ ] **Step 2: `@theme inline` 매핑을 추가한다**

`--color-inverse-line` 줄 뒤에 넣는다.

```css
  --color-scrim: var(--scrim);
```

- [ ] **Step 3: README 에 예외 근거를 남긴다**

"앱 고유 토큰" 절의 승격 기준 문단 뒤에 추가한다.

```markdown
**예외** — 개념이 명확하고 값이 이미 일치하는 토큰은 2개 앱에서도 승격한다. `--scrim`(오버레이 배경막)이 그 사례다. 이름이 갈릴 여지가 없고 세 번째 앱을 기다리는 동안 값만 어긋난다.
```

- [ ] **Step 4: 동기화하고 로컬 정의를 지운다**

```bash
npm run tokens:sync
```

- `config-diff-viewer/app/styles/theme.local.css`: `--scrim` 두 줄(라이트·다크)과 그 위 주석
- `webpage-capture-tool/apps/electron/renderer/styles/theme.local.css`: `--scrim` 한 줄과 그 위 주석

참조부(`var(--scrim)`)는 이름이 같아 **바꿀 것이 없다.**

- [ ] **Step 5: 검증**

```bash
(cd config-diff-viewer && mise run check) && (cd webpage-capture-tool && mise run check)
```

`webpage-capture-tool` 은 다크 오버라이드가 없었으므로 이제 다크 값을 갖게 되지만, 이 앱은 `data-theme` 을 설정하지 않아 활성화되지 않는다.

- [ ] **Step 6: 커밋**

```bash
git add packages/design-system/ '*/styles/*' && git commit -m "feat(design-system): promote --scrim to the canonical as a documented exception"
```

---

### Task 2: 정본에 E2E 대비 헬퍼를 두고 기존 2개 앱을 정규화

**Files:**
- Create: `packages/design-system/ds-contrast-e2e.ts`
- Modify: `scripts/sync-design-tokens.mjs` · `scripts/sync-design-tokens.test.mjs`
- Modify: `packages/design-system/ds-sync.test.ts`
- Modify: `api-contract-test-generator/e2e/contrast.spec.ts`
- Modify: `json-yaml-converter/e2e/responsive.spec.ts`

**Interfaces:**
- Produces: `collectSamples(page, selectors)` → `Sample[]`, `contrastOf(sample)` → number, `assertContrast(samples, min)` 를 쓰는 각 앱 스펙

- [ ] **Step 1: 헬퍼를 만든다**

`packages/design-system/ds-contrast-e2e.ts`:

```ts
/// <reference types="node" />
// 앱마다 tsconfig 의 types 설정이 다르므로 명시한다.

/**
 * 이 파일은 packages/design-system/ds-contrast-e2e.ts 의 생성물이다.
 * 직접 편집하지 말고 정본을 고친 뒤 저장소 루트에서
 * `npm run tokens:sync` 를 실행한다.
 *
 * 렌더된 요소의 대비를 재는 Playwright 헬퍼다. 브라우저 없는
 * ds-contrast.test.ts 는 토큰 값만 보므로 부모 틴트 위 알파 표면 합성이나
 * background-image 로 칠한 틴트를 잡지 못한다. 그 층을 여기서 덮는다.
 *
 * Playwright 타입에 의존하지 않는다 — evaluate 를 가진 객체면 무엇이든 받는다.
 */

export interface Rgba {
  r: number;
  g: number;
  b: number;
  a: number;
}

export interface Sample {
  label: string;
  color: string;
  backgrounds: string[];
}

interface Evaluatable {
  evaluate<T, A>(fn: (arg: A) => T, arg: A): Promise<T>;
}

export function parseColor(value: string): Rgba {
  const text = value.trim();
  if (text.startsWith('#')) {
    const hex = text.slice(1);
    const full = hex.length === 3 ? [...hex].map((c) => c + c).join('') : hex;
    return {
      r: Number.parseInt(full.slice(0, 2), 16),
      g: Number.parseInt(full.slice(2, 4), 16),
      b: Number.parseInt(full.slice(4, 6), 16),
      a: 1,
    };
  }
  const parts = text.match(/[\d.]+/g);
  if (!parts || parts.length < 3) throw new Error(`색을 해석할 수 없다: ${value}`);
  const [r, g, b, a = '1'] = parts;
  return { r: Number(r), g: Number(g), b: Number(b), a: Number(a) };
}

export function composite(top: Rgba, bottom: Rgba): Rgba {
  const alpha = top.a + bottom.a * (1 - top.a);
  if (alpha === 0) return { r: 0, g: 0, b: 0, a: 0 };
  const mix = (t: number, b: number) => (t * top.a + b * bottom.a * (1 - top.a)) / alpha;
  return { r: mix(top.r, bottom.r), g: mix(top.g, bottom.g), b: mix(top.b, bottom.b), a: alpha };
}

function luminance({ r, g, b }: Rgba): number {
  const channel = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** 조상 체인에서 모은 배경 레이어를 불투명해질 때까지 합성한다. */
export function flatten(layers: string[]): Rgba {
  let result: Rgba = { r: 0, g: 0, b: 0, a: 0 };
  for (const layer of layers) {
    result = composite(result, parseColor(layer));
    if (result.a >= 1) return result;
  }
  return composite(result, { r: 255, g: 255, b: 255, a: 1 });
}

/** 전경을 배경 위에 합성한 뒤 비율을 낸다. */
export function contrastOf(sample: Sample): number {
  const background = flatten(sample.backgrounds);
  const foreground = composite(parseColor(sample.color), background);
  const a = luminance(foreground);
  const b = luminance(background);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

/**
 * 셀렉터마다 보이는 요소를 모아 색과 배경 레이어를 한 번의 evaluate 로 가져온다.
 *
 * 대상마다 evaluate 를 돌리면 왕복이 대상 수에 비례해 늘어나 병렬 부하에서
 * 테스트 타임아웃을 넘긴다 — 6차에서 실제로 30초를 넘겼다.
 *
 * background-image 도 읽는다. 배지는 눈에 보이는 틴트를 단색 gradient 로
 * 칠하고 background-color 에는 불투명 밑판만 두므로, backgroundColor 만
 * 보면 틴트를 건너뛰고 밑판과 비교하게 된다.
 */
export async function collectSamples(page: Evaluatable, selectors: string[]): Promise<Sample[]> {
  return page.evaluate((list: string[]) => {
    const collect = (el: Element) => {
      const backgrounds: string[] = [];
      let node: Element | null = el;
      while (node) {
        const style = getComputedStyle(node);
        const stops = style.backgroundImage.match(
          /^linear-gradient\((rgba?\([^)]*\)),\s*(rgba?\([^)]*\))\)$/,
        );
        if (stops && stops[1] === stops[2]) backgrounds.push(stops[1]);
        backgrounds.push(style.backgroundColor);
        node = node.parentElement;
      }
      return { color: getComputedStyle(el).color, backgrounds };
    };

    const out: { label: string; color: string; backgrounds: string[] }[] = [];
    for (const selector of list) {
      for (const el of document.querySelectorAll(selector)) {
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) continue;
        const text = (el.textContent ?? '').trim().slice(0, 20);
        out.push({ label: text ? `${selector} "${text}"` : selector, ...collect(el) });
      }
    }
    return out;
  }, selectors);
}
```

- [ ] **Step 2: 동기화 대상에 등록한다**

`scripts/sync-design-tokens.mjs` 의 `FILES` 에 추가한다.

```js
  'ds-contrast.test.ts': 'ds-contrast.test.ts',
  'ds-contrast-e2e.ts': 'ds-contrast-e2e.ts',
};
```

`packages/design-system/ds-sync.test.ts` 의 `CASES` 에도 추가한다.

```ts
  ['ds-contrast.test.ts', 'ds-contrast.test.ts'],
  ['ds-contrast-e2e.ts', 'ds-contrast-e2e.ts'],
] as const;
```

- [ ] **Step 3: 동기화하고 루트 테스트를 확인한다**

```bash
npm run tokens:sync && npm run tokens:test
```

Expected: 7 tests 통과. `FILES` 가 6개가 되어 sync 기대 개수가 6×9=54 로 자동 계산된다.

- [ ] **Step 4: api-contract-test-generator 스펙을 헬퍼로 정규화한다**

`e2e/contrast.spec.ts` 상단의 중복 구현(`parseColor` · `composite` · `luminance` · `contrast` · `flatten`)을 지우고 import 로 바꾼다.

```ts
import { expect, test, type Page } from '@playwright/test';
import { collectSamples, contrastOf, parseColor, composite } from '../src/styles/ds-contrast-e2e';
```

요소 층 테스트의 본문을 헬퍼 호출로 바꾼다.

```ts
    const samples = await collectSamples(page, [
      '.privacy-note',
      '.eyebrow',
      '.request-preview pre',
      '.method',
      '.status-badge',
    ]);

    for (const selector of ['.privacy-note', '.eyebrow', '.request-preview pre']) {
      expect(samples.map((s) => s.label.split(' "')[0])).toContain(selector);
    }
    expect(samples.filter((s) => s.label.startsWith('.method')).length).toBeGreaterThan(0);

    for (const sample of samples) {
      expect(contrastOf(sample), `${sample.label} 대비 미달`).toBeGreaterThanOrEqual(4.5);
    }
```

토큰 층 테스트(`역할 색이 자기 표면 위에서`)는 `parseColor` · `composite` 만 쓰므로 그대로 둔다.

- [ ] **Step 5: json-yaml-converter 스펙을 정규화한다**

`e2e/responsive.spec.ts` 의 WCAG 테스트가 쓰는 자체 헬퍼를 정본 import 로 바꾼다. 이 스펙은 Monaco 글리프·포커스 아웃라인처럼 앱 고유 검사가 많으므로 **헬퍼 함수만 교체하고 단정은 유지한다.**

```ts
import { collectSamples, contrastOf, parseColor, composite } from '../src/styles/ds-contrast-e2e';
```

기존 `computedColors` · `compositeBackground` 를 쓰는 곳은 `collectSamples` 로 옮길 수 있는 것만 옮기고, `outline` · `backgroundImage` gradient stop 을 보는 앱 고유 로직은 남긴다.

- [ ] **Step 6: 두 앱 검증**

```bash
(cd api-contract-test-generator && mise run check) && (cd json-yaml-converter && mise run check)
```

- [ ] **Step 7: 가드가 실제로 동작하는지 변이로 확인한다**

헬퍼 교체가 검사를 약화시키지 않았는지 본다. `api-contract-test-generator` 의 `.method--post` 틴트를 일부러 진하게 만든다.

```bash
cd api-contract-test-generator && cp src/styles/components.css /tmp/cc.bak
sed -i '' 's/.method--post { --badge-surface: var(--success-surface);/.method--post { --badge-surface: rgba(24, 121, 78, 0.92);/' src/styles/components.css
npm run test:e2e -- e2e/contrast.spec.ts -g "렌더된 배지"
cp /tmp/cc.bak src/styles/components.css
```

Expected: 실패한다. 통과하면 헬퍼가 `background-image` 를 못 읽는 것이므로 고친다.

- [ ] **Step 8: 커밋**

```bash
git add packages/design-system/ scripts/ '*/styles/ds-*' api-contract-test-generator/ json-yaml-converter/ && git commit -m "refactor(design-system): share the element-level contrast helper across apps"
```

---

### Task 3: 역할색이 많은 3개 앱에 하네스 신설

`config-diff-viewer`(20종) · `ddl-seed-generator`(7종) · `dummy-file-generator` 순으로 한다. 세 앱 모두 Next.js 다.

**Files (앱마다):**
- Modify: `<app>/package.json` (`@playwright/test` devDependency, `test:e2e` 스크립트)
- Create: `<app>/playwright.config.ts`
- Create: `<app>/e2e/contrast.spec.ts`
- Modify: `<app>/mise.toml` (`e2e` 태스크, `check` 의존성)
- Modify: `<app>/.gitignore` (`test-results/`)

- [ ] **Step 1: 의존성과 스크립트를 넣는다**

세 앱 모두 같다. 버전은 기존 앱과 맞춘다.

```bash
for app in config-diff-viewer ddl-seed-generator dummy-file-generator; do
  (cd "$app" && npm install --save-dev --save-exact "@playwright/test@$(node -p "require('../json-yaml-converter/package.json').devDependencies['@playwright/test'].replace(/^[\^~]/,'')")")
done
```

각 `package.json` 의 `scripts` 에 추가한다.

```json
    "test:e2e": "playwright test",
```

- [ ] **Step 2: playwright.config.ts 를 만든다**

포트만 다르고 나머지는 같다. `config-diff-viewer` 는 4176, `ddl-seed-generator` 는 4177, `dummy-file-generator` 는 4178 이다.

```ts
import { defineConfig, devices } from '@playwright/test';

// 포트는 앱마다 달라야 한다. reuseExistingServer 가 켜져 있어 같은 포트를
// 쓰면 먼저 뜬 다른 앱의 서버를 재사용해 엉뚱한 앱을 테스트한다.
// 4173 json-yaml-converter / 4174 openapi-editor / 4175 api-contract-test-generator
// 4176 config-diff-viewer / 4177 ddl-seed-generator / 4178 dummy-file-generator
const PORT = 4176;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  reporter: 'list',
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `npm run dev -- --port ${PORT}`,
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: !process.env.CI,
  },
});
```

- [ ] **Step 3: mise 태스크를 넣는다**

각 `mise.toml` 에 추가하고 `check` 의존성을 늘린다.

```toml
[tasks.test-e2e]
description = "Run Playwright end-to-end tests"
run = "npm run test:e2e"
```

```toml
depends = ["test", "lint", "typecheck", "build", "test-e2e"]
```

- [ ] **Step 4: `.gitignore` 에 산출물을 넣는다**

```
test-results/
playwright-report/
```

- [ ] **Step 5: config-diff-viewer 스펙을 쓴다**

`e2e/contrast.spec.ts`:

```ts
import { expect, test } from '@playwright/test';
import { collectSamples, contrastOf } from '../app/styles/ds-contrast-e2e';

/**
 * 렌더된 요소의 대비를 검사한다. 토큰 층은 ds-contrast.test.ts 가 보고,
 * 여기서는 부모 틴트 위 합성처럼 렌더 시점에만 드러나는 것을 본다.
 */
const SELECTORS = [
  '.badge',
  '.statusBadge',
  '.toggleStatusBadge',
  '.valuePill',
  '.filterChip',
  '.statLabel',
  '.optionsHint',
  '.diffViewLabel',
];

for (const theme of ['light', 'dark'] as const) {
  test(`${theme} 테마의 렌더된 역할색 요소가 WCAG AA 를 충족한다`, async ({ page }) => {
    await page.goto('/');
    if (theme === 'dark') {
      await page.getByRole('button', { name: '테마 전환' }).click();
    }
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);

    // 비교를 실행해야 배지·상태 요소가 렌더된다.
    await page.getByRole('button', { name: '비교' }).click();
    await expect(page.locator('.statLabel').first()).toBeVisible();

    const samples = await collectSamples(page, SELECTORS);
    expect(samples.length).toBeGreaterThan(0);

    for (const sample of samples) {
      expect(contrastOf(sample), `${sample.label} 대비 미달`).toBeGreaterThanOrEqual(4.5);
    }
  });
}
```

셀렉터·버튼 이름은 실제 DOM 과 다를 수 있다. 스펙을 처음 돌릴 때 `expect(samples.length).toBeGreaterThan(0)` 이 실패하면 앱을 띄워 실제 클래스명을 확인해 고친다.

- [ ] **Step 6: ddl-seed-generator 스펙을 쓴다**

같은 구조에 셀렉터만 바꾼다.

```ts
const SELECTORS = [
  '.validationList li',
  '.warningList li',
  '.downloadNotice',
  '.emptyState',
  '.panelHead',
];
```

DDL 을 생성해야 검증 목록이 나오므로 진입 흐름을 앱에 맞춘다.

- [ ] **Step 7: dummy-file-generator 스펙을 쓴다**

```ts
const SELECTORS = ['.sizeInput', '.hint', '.fieldLabel'];
```

역할색 요소가 적으므로 보조 텍스트 위주다.

- [ ] **Step 8: 브라우저를 설치하고 세 앱을 검증한다**

```bash
for app in config-diff-viewer ddl-seed-generator dummy-file-generator; do
  (cd "$app" && npx playwright install chromium && mise run check) || echo "FAILED: $app"
done
```

- [ ] **Step 9: 커밋**

```bash
git add config-diff-viewer/ ddl-seed-generator/ dummy-file-generator/ && git commit -m "test(design-system): add element-level contrast guards to the Next.js apps"
```

---

### Task 4: home · sign-maker 에 얇은 하네스 신설

두 앱은 danger/warning/success 를 쓰지 않아 보조·강조 텍스트만 검사한다. Vite 앱이다.

**Files (앱마다):** Task 3 과 같은 5종

- [ ] **Step 1: Task 3 Step 1~4 를 두 앱에 적용한다**

포트는 `home` 4179, `sign-maker` 4180 이다.

- [ ] **Step 2: home 스펙을 쓴다**

`e2e/contrast.spec.ts`:

```ts
import { expect, test } from '@playwright/test';
import { collectSamples, contrastOf } from '../src/styles/ds-contrast-e2e';

/**
 * home 은 역할색(danger/warning/success)을 쓰지 않는다. 보조 텍스트와
 * 강조 텍스트가 카드·배경 그라디언트 위에서 읽히는지만 본다 —
 * 토큰 층은 평면 표면만 보므로 그라디언트 위 합성은 여기서만 잡힌다.
 */
const SELECTORS = ['.text-muted', '.text-primary-text', '.toolCard p', '.app-title'];

for (const theme of ['light', 'dark'] as const) {
  test(`${theme} 테마의 보조·강조 텍스트가 WCAG AA 를 충족한다`, async ({ page }) => {
    await page.goto('/');
    if (theme === 'dark') {
      await page.getByRole('button', { name: '테마 전환' }).click();
    }
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);

    const samples = await collectSamples(page, SELECTORS);
    expect(samples.length).toBeGreaterThan(0);

    for (const sample of samples) {
      expect(contrastOf(sample), `${sample.label} 대비 미달`).toBeGreaterThanOrEqual(4.5);
    }
  });
}
```

`home` 은 Tailwind 유틸을 쓰므로 셀렉터가 클래스명 그대로다(`.text-muted`). 도구 카드는 `--tool-accent-rgb` 그라디언트 위에 텍스트가 놓이므로 **여기서 처음 검사된다.**

- [ ] **Step 3: sign-maker 스펙을 쓴다**

```ts
const SELECTORS = ['.panel-title', '.hint', '.seg-btn'];
```

- [ ] **Step 4: 검증**

```bash
for app in home sign-maker; do
  (cd "$app" && npx playwright install chromium && mise run check) || echo "FAILED: $app"
done
```

`home` 의 도구 카드 그라디언트에서 미달이 나올 수 있다. 나오면 **값을 바꾸기 전에 어느 카드의 어느 텍스트가 몇 대 몇인지 기록**하고, 그라디언트가 장식이라 텍스트가 그 위에 놓이지 않아야 하는지 검토한다.

- [ ] **Step 5: 커밋**

```bash
git add home/ sign-maker/ && git commit -m "test(design-system): add element-level contrast guards to the Vite apps"
```

---

### Task 5: `.ds-card` 채택 6곳

**Files:**
- Modify: `api-contract-test-generator/src/components/**` · `src/styles/components.css`
- Modify: `config-diff-viewer/app/_components/**` · `app/styles/components.css`
- Modify: `ddl-seed-generator/app/_components/**` · `app/styles/components.css`

- [ ] **Step 1: 각 클래스의 선언이 정본과 같은지 다시 확인한다**

```bash
for f in api-contract-test-generator/src/styles/components.css config-diff-viewer/app/styles/components.css ddl-seed-generator/app/styles/components.css; do
  echo "── $f"
  grep -A6 -E "^\.(welcome-panel|step-panel|editorCard|resultCard|diffViewCard|resultPanel) \{" "$f"
done
```

`background: var(--surface)` · `border: 1px solid var(--line)` · `border-radius: var(--ds-radius-lg)` · `box-shadow: var(--ds-shadow-sm)` 네 개 중 있는 것이 전부 일치해야 한다.

- [ ] **Step 2: JSX 에 `ds-card` 를 붙인다**

각 컴포넌트에서 해당 클래스가 붙은 엘리먼트에 `ds-card` 를 앞에 추가한다. Next.js 앱은 CSS Modules 를 쓰므로 형태가 다르다.

```tsx
<section className={`ds-card ${styles.editorCard}`}>
```

Vite 앱(`api-contract-test-generator`)은 전역 클래스다.

```tsx
<section className="ds-card welcome-panel">
```

- [ ] **Step 3: CSS 에서 중복 선언을 지운다**

`.ds-card` 가 제공하는 네 선언만 지우고 나머지(패딩·레이아웃)는 남긴다.

- [ ] **Step 4: 산출 CSS 와 렌더 결과를 확인한다**

```bash
for app in api-contract-test-generator config-diff-viewer ddl-seed-generator; do
  (cd "$app" && mise run check) || echo "FAILED: $app"
done
```

시각 변화가 없어야 한다. `config-diff-viewer` 는 Task 3 에서 만든 대비 스펙이 카드 위 텍스트를 이미 검사한다.

- [ ] **Step 5: 커밋**

```bash
git add api-contract-test-generator/ config-diff-viewer/ ddl-seed-generator/ && git commit -m "refactor(design-system): adopt the .ds-card primitive where declarations already match"
```

---

### Task 6: 허브 URL 드리프트 방지와 위저드 폭 토큰화

**Files:**
- Create: `scripts/hub-url.test.mjs`
- Modify: `api-contract-test-generator/src/styles/theme.local.css` · `src/styles/components.css`

- [ ] **Step 1: 루트 테스트를 만든다**

`scripts/hub-url.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

/**
 * 허브 URL 은 앱마다 독립 패키지라 상수를 공유할 수단이 없다. 각 앱의
 * constants 파일이 단일 지점이므로 구조는 이미 정리돼 있고, 값이 갈리는
 * 것만 막는다.
 */
const HOLDERS = [
  'sign-maker/src/constants.ts',
  'json-yaml-converter/src/constants.ts',
  'openapi-editor/src/constants.ts',
  'api-contract-test-generator/src/constants.ts',
  'ddl-seed-generator/app/_lib/constants.ts',
  'config-diff-viewer/app/_lib/constants.ts',
  'dummy-file-generator/app/_lib/constants.ts',
];

test('허브 URL 이 모든 앱에서 같다', () => {
  const found = new Map();
  for (const path of HOLDERS) {
    assert.ok(existsSync(path), `${path} 가 없다. 앱 구조가 바뀌었으면 HOLDERS 를 고친다`);
    const match = readFileSync(path, 'utf8').match(/TOOL_HUB_URL\s*=\s*['"]([^'"]+)['"]/);
    assert.ok(match, `${path} 에서 TOOL_HUB_URL 을 찾지 못했다`);
    found.set(path, match[1]);
  }

  const values = [...new Set(found.values())];
  assert.equal(values.length, 1, `허브 URL 이 갈렸다: ${JSON.stringify([...found])}`);
  assert.match(values[0], /^https:\/\//, 'https 여야 한다');
});
```

- [ ] **Step 2: 실제 파일 목록을 확인한다**

```bash
grep -rln "TOOL_HUB_URL" --include="constants.ts" . | grep -v node_modules
```

`HOLDERS` 와 다르면 테스트를 실제 목록에 맞춘다.

- [ ] **Step 3: 통과를 확인한다**

```bash
npm run tokens:test
```

`tokens:test` 는 `node --test 'scripts/**/*.test.mjs'` 라 새 파일이 자동으로 잡힌다.

- [ ] **Step 4: 위저드 폭을 앱 고유 토큰으로 내린다**

`api-contract-test-generator/src/styles/theme.local.css` 의 `:root` 에 추가한다.

```css
  /* 단계형 위저드의 본문 폭. 정본 컨테이너 단계(560/1120/1600)는 랜딩·폼·
     에디터를 위한 것이라 이 레이아웃에 맞지 않는다. */
  --wizard-width: 980px;
```

`components.css` 의 `.export-step` 을 바꾼다.

```css
.export-step { max-width: var(--wizard-width); margin-inline: auto; }
```

- [ ] **Step 5: 검증과 커밋**

```bash
npm run tokens:test && (cd api-contract-test-generator && mise run check)
git add scripts/ api-contract-test-generator/ && git commit -m "test(design-system): guard hub URL drift and tokenize the wizard width"
```

---

### Task 7: 문서 갱신과 9개 앱 최종 검증

**Files:**
- Modify: `docs/frontend-conventions.md`
- Modify: `CLAUDE.md`

- [ ] **Step 1: 컨벤션에 규칙을 추가한다**

"번들러가 없는 앱은…" 줄 뒤에 넣는다.

```markdown
- **대비는 두 층으로 검사한다.** 정본 `ds-contrast.test.ts` 가 토큰 값을 브라우저 없이 계산하고(9개 앱), 각 앱의 `e2e/contrast.spec.ts` 가 정본 `ds-contrast-e2e.ts` 헬퍼로 렌더된 요소를 본다(7개 앱). 토큰 층만으로는 부모 틴트 위 알파 표면 합성이나 `background-image` 로 칠한 틴트를 잡지 못한다.
- **E2E 포트는 앱마다 다르게 잡는다.** `reuseExistingServer` 때문에 같은 포트를 쓰면 먼저 뜬 다른 앱의 서버를 재사용해 엉뚱한 앱을 테스트하고, 그 증상이 플레이크로 오진된다. 4173부터 순서대로 배정한다.
- **선언이 정본 `.ds-card` 와 일치하는 카드는 프리미티브를 쓴다.** 패딩·레이아웃만 앱에서 더한다. 테두리·radius 규약이 다른 에디터 패널류는 대상이 아니다.
```

- [ ] **Step 2: CLAUDE.md 의 E2E 안내를 갱신한다**

현재 "e2e가 있는 앱(`json-yaml-converter`, `openapi-editor`)" 로 적혀 있다. 8개 앱으로 고친다.

```markdown
- e2e가 있는 앱(`json-yaml-converter`, `openapi-editor`, `api-contract-test-generator`, `config-diff-viewer`, `ddl-seed-generator`, `dummy-file-generator`, `home`, `sign-maker`)은 `mise run install` 뒤 `npx playwright install chromium`을 실행한다.
```

- [ ] **Step 3: 9개 앱 최종 검증**

```bash
for app in sign-maker json-yaml-converter ddl-seed-generator openapi-editor dummy-file-generator config-diff-viewer home webpage-capture-tool api-contract-test-generator; do printf "%-30s " "$app"; (cd "$app" && mise run check >/tmp/w9-$app.log 2>&1) && echo PASS || echo FAIL; done
```

E2E 앱이 8개로 늘어 시간이 크게 는다. 실패하면 **포트 충돌부터 의심한다** — 각 앱의 `playwright.config.ts` 포트가 서로 다른지 먼저 확인한다.

- [ ] **Step 4: 루트 검증**

```bash
npm run tokens:check && npm run tokens:test
```

- [ ] **Step 5: 커밋**

```bash
git add docs/ CLAUDE.md && git commit -m "docs(design-system): record the two-layer contrast guard and port rule"
```

---

## 완료 기준

- [ ] 9개 앱 전부 `mise run check` 통과
- [ ] 루트 `tokens:check` drift 0건, `tokens:test` 통과(허브 URL 테스트 포함)
- [ ] 7개 앱에 `e2e/contrast.spec.ts` 가 있고 전부 정본 `ds-contrast-e2e.ts` 를 쓴다
- [ ] E2E 포트가 앱마다 다르다 (4173~4180)
- [ ] `.ds-card` 가 6곳에서 쓰이고 시각 변화가 없다
- [ ] `--scrim` 이 정본에 있고 두 앱의 로컬 정의가 없다
- [ ] 변이 테스트로 요소 층 가드가 실제로 잡는 것을 확인했다

## 이번 파도에서 하지 않는 것

- **호버 규약.** 10차로 미룬다. 보조 버튼 호버 채움이 4가지 토큰(`--surface-2` 7 · `--surface-3` 5 · `--fill` 3 · `--fill-subtle` 3)으로 갈려 있고, lift 애니메이션 적용 여부는 취향 결정이 필요하다.
- **부분 일치 카드 9곳의 `.ds-card` 채택.** 테두리·radius 규약이 달라 값을 바꿔야 하므로 시각 변화가 생긴다. 별건이다.
- **허브 URL 을 정본 동기화로 이관.** 앱당 이미 1곳이고 Electron 은 plain JS 라 예외가 생긴다. 드리프트만 막는다.
- **`webpage-capture-tool` 의 요소 층 가드 정규화.** Electron 하네스라 `page` 인터페이스는 같지만 스펙이 `.js` 다. 기존 `design-tokens.spec.js` 가 이미 다크 영역 대비를 검사하므로 그대로 둔다.
