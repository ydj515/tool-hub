# Tool Hub 디자인 시스템 통일 설계

**Date:** 2026-07-25

## 목적

Tool Hub의 8개 웹 도구가 같은 제품군으로 보이게 한다. 지금까지의 통일 작업(`2026-07-22-json-yaml-converter-ui-unification-design.md` 등)은 **한 앱을 다른 앱을 참조해 정리하는** 방식이었고, 그 결과 값이 눈대중으로 수렴했을 뿐 갈라진 채 남았다. 이 작업은 **단일 정본을 만들고 모든 앱이 그것을 소비**하도록 구조를 바꾼다.

각 도구의 고유 레이아웃과 도메인 UI는 유지한다. 통일 대상은 디자인 토큰, 타이포 스케일, 셸 골격(헤더·푸터), 상호작용 상태, 오버레이 계약이다.

## 현재 상태 진단

같은 개념을 앱마다 다른 이름·값으로 정의하고 있다.

| 개념 | 갈라진 정도 |
|---|---|
| 페이지 배경(다크) | 4개 값 — `#080810` / `rgb(15,15,16)` / `#1b1c1e` / `rgb(27,28,30)` |
| 텍스트 계층 | 4개 체계 — `--color-ink-dark` / `--text`+`--text-neutral`+`--muted`+`--soft` / `--text`+`--muted`+`--soft` / `--text-normal`…`--text-disable` |
| 표면 | 4개 체계 — `--color-canvas` / `--bg`+`--surface`+`--surface-2` / `+--surface-3` / `--surface`+`--surface-alt` |
| 브랜드 | 2개 계열 — indigo→purple 그라디언트(home) vs `#3366ff`(나머지) |
| danger | 4개 값 — `rgb(229,52,58)` / `rgb(180,35,24)` / `#d11f2e` / `rgb(255,66,66)` |
| 상태 컬러 이름 | `success/warning/danger` vs `green/coral/yellow` vs `positive/warn/danger` |
| radius | 3개 앱만 토큰 보유, 하드코딩 9·10·11·14px 산재 |
| shadow | 4개 앱만 정의, 2개 앱은 다크 오버라이드 누락 |
| motion | 3개 체계, 3개 앱은 토큰 없음 |
| 폰트 | ToolHub Sans 6개 앱, `openapi-editor`는 `@font-face` 자체가 없음 |
| font-size | **36개 고유값**, 그중 20개가 10.5~15.2px 구간에 밀집 |
| 컨테이너 최대폭 | 5개 값 — 560 / 1120 / 1400 / 1480 / 1600px |
| 브레이크포인트 | 375 / 760 / 767 / 1023 / 1180 / 1190 |
| 셸 | `Header`+`Footer`+`Background` / `Header` / `Topbar` / 없음. 푸터는 home에만 존재 |
| 테마 토글 | 크기 4종(32/36/38/40px), radius 4종(8/9/10/12), hover 반응 4종, 배치 3종 |
| 아이콘 라이브러리 | lucide `0.575.0` / `1.11.0` / `1.14.0`(메이저 경계 초과), home·dummy는 커스텀 SVG |
| `check` task | 3개 앱만 보유 |

### 접근성 결함 (실측)

WCAG 2.1 대비를 계산해 확인한 문제다. 프로젝트는 이미 "진단 텍스트 4.5:1 이상, non-text control border/focus 3:1 이상"을 기준으로 문서화해 두었으나(`2026-07-22` 스펙), 토큰 값이 그 기준을 만족하지 않는다.

| 항목 | 현재 | 실측 대비 | 판정 |
|---|---|---|---|
| `--muted` (라이트, α0.61) | 7개 앱 보조 텍스트 76곳 | 3.66:1 | 본문 AA 미달 |
| `--muted` (다크, α0.61) | 동일 | 3.94:1 | 본문 AA 미달 |
| `--soft` (α0.28) | 7곳 | 1.69:1 | 미달 |
| `--soft` (α0.40, openapi·config-diff) | — | 2.18:1 | 미달 |
| `--danger: rgb(255,66,66)` (ddl·dummy) | — | 3.44:1 | 텍스트 사용 불가 |
| `--positive: rgb(0,191,64)` (ddl) | — | 2.46:1 | 텍스트 사용 불가 |
| `--warn: rgb(255,146,0)` (ddl) | — | 2.24:1 | 텍스트 사용 불가 |
| `prefers-reduced-motion` | 5개 앱 미처리 (openapi-editor·ddl-seed-generator·config-diff-viewer만 처리) | — | 결함 |
| drawer a11y (config-diff) | `role="dialog"`·`aria-modal`·Escape·포커스 트랩 없음 | — | 결함 |
| z-index 체계 | 토스트 `z-10`, drawer `z-401` | — | drawer 위에 토스트 표시 불가 |

`ddl-seed-generator`가 `--warn-fg: #8a5300`(6.33:1)을 별도로 둔 것과 `json-yaml-converter`가 `--control-border`를 둔 것은, 두 앱이 이 문제를 이미 국소적으로 우회한 흔적이다. 정본은 이 지식을 흡수한다.

## 범위

### 대상

| 앱 | 스택 | 토큰 | 셸 계약 |
|---|---|---|---|
| `home` | Vite + React | O | O |
| `sign-maker` | Vite + React | O | O |
| `json-yaml-converter` | Vite + React | O | O |
| `openapi-editor` | Vite + React | O | O (2행 변형) |
| `ddl-seed-generator` | Next.js | O | O |
| `config-diff-viewer` | Next.js | O | O |
| `dummy-file-generator` | Next.js | O | O |
| `webpage-capture-tool` | Electron + 바닐라 CSS | O | **제외** |

`webpage-capture-tool`은 바닐라 CSS라 정본 파일을 분기 없이 그대로 링크할 수 있다. 데스크톱 앱이므로 허브 링크·푸터·헤더 슬롯은 적용하지 않는다.

**다크모드는 생기지 않는다.** 정본은 `[data-theme="dark"]` 속성 셀렉터를 쓰므로 그 속성을 설정하는 주체가 있어야 활성화된다. 이 앱에는 테마 토글도 `data-theme` 배선도 FOUC 스크립트도 없다. 다크모드는 토큰 마이그레이션이 아니라 **기능 추가**이므로 이 작업 범위에서 제외한다.

그리고 이 앱은 드롭인이 아니다. 기존 `style.css`(682줄)가 정본과 **이름이 겹치면서 값이 다른** 토큰을 쓴다.

| 기존 | 사용 | 이전 대상 | 값 변화 |
|---|---|---|---|
| `--border` | 26회 | `--line` | 불투명 `#e5e7eb` → 반투명 헤어라인 |
| `--accent` | 22회 | `--primary` | `#2563eb` → `#3366ff` |
| `--muted` | 16회 | `--muted` | `#6b7280` → `rgba(55,56,60,.72)` |
| `--danger` | 9회 | `--danger` | `#ef4444` → `#d11f2e` |
| `--panel` | 7회 | `--surface` | 동일(`#ffffff`) |
| `--text` | 7회 | `--text` | `#1f2937` → `rgb(23,23,23)` |
| `--bg` | 3회 | `--bg` | `#f0f2f7` → `#f7f7f8` |
| `--sidebar-*`·`--topbar-h`·`--panel-w`·`--log-h` | 각 1회 | `theme.local.css` | 앱 고유 |

여기에 토큰을 우회한 하드코딩 색상이 39회(고유 19개) 있다. 본문 `font-size: 13px`과 `"Helvetica Neue"` 폰트 스택도 정본과 어긋난다. 규모가 `dummy-file-generator`(282줄)보다 크므로 별도 단계로 다룬다.

`class-diagram-generator`(Kotlin/Spring)는 전면 제외한다. 자체 `--mmu-*` 토큰 체계를 가진 서버 렌더 앱이다.

### 비대상

- 공용 Modal/Dialog 프리미티브 신설 — 현재 8개 앱에 모달 사용처가 0곳이다. 죽은 추상화를 만들지 않는다.
- `--space-*` 토큰 — Tailwind 기본 spacing이 이미 4px 그리드이고 7개 앱 중 6개가 Tailwind를 쓴다. 병렬 체계를 만들지 않는다.
- npm workspace 도입 및 React 컴포넌트 공유 — 배포 파이프라인 8개를 건드리게 된다.
- 각 도구의 도메인 로직, 파서, 워커 프로토콜, 레이아웃 구조 변경
- `home`의 도구별 accent 색 시스템(`--tool-accent-rgb` 8색) — 의도된 설계이므로 유지한다.

## 아키텍처

### 정본과 동기화

```
packages/design-system/tokens.css      토큰
packages/design-system/base.css        전역 규칙: 포커스링, reduced-motion, 폰트 적용
packages/design-system/primitives.css  .ds-icon-btn, .ds-btn, 오버레이 3종
packages/design-system/README.md       사용 규칙, 토큰 추가·승격 절차
scripts/sync-design-tokens.mjs         정본 → 각 앱 복사. Node 내장 모듈만, 의존성 0
package.json                           신규. private, scripts만. workspaces·dependencies 없음
```

루트 `package.json`이 없으므로 신설한다. `workspaces`와 `dependencies`를 두지 않으면 어떤 앱의 lockfile도 건드리지 않고 `npm install`도 필요 없다. `CLAUDE.md`가 루트 레벨 명령의 명시적 문서화를 요구하므로 `tokens:sync`·`tokens:check`를 거기에 기록한다.

### 앱마다 2층 구조

```
<app>/styles/tokens.css        정본 복사본. 생성물이며 편집 금지(헤더 주석으로 명시)
<app>/styles/base.css          정본 복사본
<app>/styles/primitives.css    정본 복사본
<app>/styles/theme.local.css   신규. 이 앱만 쓰는 토큰
<app>/styles/components.css    기존. 앱 고유 컴포넌트 스타일
```

정본에 모든 앱의 토큰을 몰아넣으면 `--editor-bg`(json-yaml), `--tool-accent-rgb` 8색(home), `--code`·`--code-line`(ddl·config-diff), CRITICAL/HIGH/MEDIUM 심각도 램프(config-diff)가 쌓여 잡동사니 서랍이 된다. 정본에는 **여러 앱이 공유하는 토큰만** 두고 나머지는 `theme.local.css`로 내린다.

`theme.local.css`에 같은 토큰이 3개 이상 앱에서 반복되면 정본으로 승격하는 신호다. README에 이 절차를 적는다.

진입 CSS의 `@import` 순서는 캐스케이드 순서다.

```css
@import "tailwindcss";
@import "./styles/tokens.css";        /* 정본 */
@import "./styles/base.css";          /* 정본 */
@import "./styles/primitives.css";    /* 정본 */
@import "./styles/theme.local.css";   /* 앱 고유 — 정본 오버라이드 가능 */
@import "./styles/components.css";    /* 앱 고유 */
```

### 바닐라 CSS 호환

정본의 `@theme` / `@theme inline` / `@custom-variant`는 Tailwind 전용 at-rule이다. 브라우저는 미지의 at-rule 블록을 CSS 오류 처리 규칙에 따라 건너뛰므로, 바닐라 CSS인 Electron 렌더러에서 무해하게 무시되고 `:root` 커스텀 프로퍼티는 정상 적용된다. 분기 없이 같은 파일을 쓴다.

**단, `@font-face`의 `/fonts/toolhub-sans.woff2`는 `file://` 프로토콜에서 파일시스템 루트로 해석되어 깨진다.** `webpage-capture-tool`은 폰트를 렌더러 옆에 복사해 상대 경로로 바꾸거나 `system-ui` 폴백을 수용한다.

### drift 검증

CI가 없다(`.github/workflows`에 Slack 알림 워크플로 하나뿐). 대신 **검증이 이미 일어나는 곳**에 넣는다.

각 앱의 vitest에 테스트 하나를 추가해 정본 3파일과 자기 복사본의 바이트 일치를 단정한다. 정본을 고치고 동기화를 잊으면 앱들의 테스트가 동시에 깨지고 `npm run tokens:sync`로 해결된다. 새 워크플로도 루트 의존성도 필요 없다.

`webpage-capture-tool`은 vitest가 있으므로 같은 방식을 쓴다.

### 배포 영향 없음

토큰이 각 앱에 복사되어 커밋되므로 빌드 시점에 앱은 자기 완결적이다. Vercel이 앱 디렉터리를 rootDir로 빌드해도 `../packages/`를 참조할 필요가 없다. `render.yaml`은 `class-diagram-generator`만 다루므로 무관하다.

생성 파일을 gitignore하지 않고 커밋한다. ignore하면 clone 직후나 Vercel 빌드에서 파일이 없어 깨진다.

## 토큰 스펙

네이밍은 **다수 채택 원칙**을 따른다. 5~6개 앱이 이미 쓰는 이름을 정본으로 삼고 1개 앱만의 이름은 흡수한다. 단, **소수 의견이 접근성 근거를 가질 때는 그쪽을 승격한다**(`--control-border`, `--warn-fg`).

### 네임스페이스 규칙: `--ds-` 접두사

**Tailwind 테마 네임스페이스와 이름이 겹치는 토큰은 `:root`에서 `--ds-` 접두사를 쓰고 `@theme inline`으로 Tailwind 이름에 매핑한다.**

접두사 없이 쓰면 유틸리티와 `var()`가 갈라진다. Tailwind 4.2.4에서 실측한 동작이다.

| 토큰 | 접두사 없을 때의 실제 동작 |
|---|---|
| `--radius-md` | Tailwind가 `rounded-md` 사용 시 자기 기본값 `0.375rem`을 `:root`에 emit한다. 정본 정의가 나중에 와서 캐스케이드 순서로 이기지만 암묵적 의존이다 |
| `--shadow-sm` | Tailwind는 shadow 값을 유틸리티에 인라인하고 `:root`를 읽지 않는다. `shadow-sm` 클래스와 `var(--shadow-sm)`이 **같은 이름의 서로 다른 그림자**가 된다 |

부분 오버라이드는 **순서 역전**도 만든다. sm/md/lg만 정의하면 `rounded-xl`은 Tailwind 기본 `0.75rem`(12px)으로 남아 정본 `rounded-lg`(16px)보다 작아진다.

접두사 방식의 실측 결과다.

```css
:root             { --ds-radius-md: 12px; --ds-shadow-sm: <라이트>; }
[data-theme=dark] { --ds-shadow-sm: <다크>; }
@theme inline     { --radius-md: var(--ds-radius-md); --shadow-sm: var(--ds-shadow-sm); }
```

```css
/* 생성 결과 */
.rounded-md { border-radius: var(--ds-radius-md); }
.shadow-sm  { --tw-shadow: var(--ds-shadow-sm); }
/* Tailwind 기본 --radius-md 는 emit 되지 않는다 */
```

유틸리티와 `var()`가 같은 값을 참조하고 Tailwind 기본값이 억제된다. 부수 효과로 **`shadow-sm` 유틸리티가 테마에 반응하게 된다** — 현재 Tailwind shadow 유틸리티는 라이트 그림자가 하드코딩되어 `home`의 `shadow-sm`이 다크에서 보이지 않는데, 이 패턴이 함께 고친다.

| 구분 | 토큰 |
|---|---|
| **접두사 사용** (Tailwind 네임스페이스 충돌) | `--ds-font-sans`, `--ds-font-size-*`, `--ds-line-height-*`, `--ds-tracking-*`, `--ds-radius-*`, `--ds-shadow-*`, `--ds-ease-*`, `--ds-duration-*`, `--ds-z-*`, `--ds-container-*`, `--ds-page-padding*` |
| **접두사 없음** (충돌 없고 기존 앱이 사용) | `--bg`, `--surface`, `--surface-2`, `--surface-3`, `--fill*`, `--line*`, `--control-border`, `--text`, `--text-neutral`, `--muted`, `--disabled`, `--primary*`, `--on-primary`, `--danger*`, `--success*`, `--warning*` |

색 토큰까지 접두사를 붙이면 7개 앱의 사용처 200곳 가까이를 기계적으로 고쳐야 하고 얻는 것이 없다. 규칙은 "겹치는 것만 접두사"다.

정의하지 않은 Tailwind radius/shadow 단계(`rounded-xl`·`rounded-2xl`·`shadow-md` 등)는 **사용을 금지**한다. `home`이 현재 `rounded-xl` 3곳, `rounded-2xl` 4곳을 쓰므로 마이그레이션 시 정본 스케일로 옮긴다.

아래 토큰 표는 `--ds-` 접두사를 생략한 논리 이름으로 적는다. 실제 파일에서는 위 규칙을 적용한다.

값은 전부 WCAG 2.1 대비를 실측해 확정했다. "최저 대비"는 `--bg`·`--surface`·`--surface-2`·`--surface-3` 네 표면 전부에서 측정한 최악값이다.

### 표면

| 토큰 | 라이트 | 다크 | 역할 |
|---|---|---|---|
| `--bg` | `#f7f7f8` | `rgb(15,15,16)` | 페이지 그룹 배경 |
| `--surface` | `#ffffff` | `rgb(27,28,30)` | 카드·패널 |
| `--surface-2` | `#f4f4f5` | `rgb(33,34,37)` | 함몰 표면(입력·트랙·고스트) |
| `--surface-3` | `#ececee` | `rgb(46,47,51)` | 중립 hover·칩 |

다크 배경은 `rgb(15,15,16)` 계열(3개 앱)을 채택한다. `#1b1c1e` 계열(2개 앱)은 페이지→카드 간격이 6단계인데 이 계열은 12단계다. 다크에서 그림자가 거의 보이지 않으므로 표면 밝기 차이가 유일한 깊이 신호이며, 넓은 쪽이 유리하다.

`ddl-seed-generator`의 `--surface-3`은 삭제한다. 값이 라이트 `rgb(234,242,254)` / 다크 `rgba(91,132,255,0.16)`으로 `--primary-surface`와 완전히 동일하다 — 중립 표면 슬롯에 브랜드 틴트가 들어간 이름 오용이다. 사용처는 `--primary-surface`로 옮긴다.

### 텍스트

| 토큰 | 라이트 | 최저 대비 | 다크 | 최저 대비 | 역할 |
|---|---|---|---|---|---|
| `--text` | `rgb(23,23,23)` | 17.93:1 | `rgb(247,247,247)` | 15.92:1 | 본문 기본 |
| `--text-neutral` | `rgba(46,47,51,.88)` | 9.14:1 | `rgba(194,196,200,.88)` | 7.84:1 | 2차 |
| `--muted` | `rgba(55,56,60,.72)` | 4.55:1 | `rgba(174,176,182,.82)` | 4.68:1 | 보조 텍스트 |
| `--disabled` | `rgba(55,56,60,.38)` | 2.09:1 | `rgba(174,176,182,.38)` | 2.26:1 | 비활성 전용 |

`--muted`의 알파를 0.61에서 라이트 0.72 / 다크 0.82로 올린다. 76곳에서 쓰이지만 **정본의 값 하나만 바꾸면 코드 수정 없이 전부 AA를 통과**한다. 보조 텍스트가 다소 진해지는 시각적 변화가 있다.

`--disabled`는 WCAG 1.4.3이 비활성 컨트롤을 대비 요구에서 면제하므로 낮은 값을 의도적으로 허용한다.

`--soft`를 폐기한다. α0.28은 1.69:1이고 3:1에 도달하려면 α0.53이 필요해 `--muted`와 실질적으로 겹친다. 총 7곳이며 용도별로 갈라진다.

| 현재 | 위치 | 이전 |
|---|---|---|
| `.ruleId` 코드 텍스트 | `config-diff-viewer/app/styles/components.css:802` | `--muted` — 가독성 결함 수정 |
| `.sizeInput::placeholder` | `dummy-file-generator/app/styles/components.css:219` | `--muted` — 가독성 결함 수정 |
| `.emptyState svg` | `ddl-seed-generator/app/styles/components.css:441` | `--muted` |
| `.panel-resizer` 핸들 | `openapi-editor/src/styles/components.css:37` | `--muted` |
| `.status-dot` 기본 | `openapi-editor/src/styles/components.css:43` | `--muted` |
| `.btn-ghost:disabled` | `json-yaml-converter/src/styles/components.css:29` | `--disabled` |
| `--text-disable` 사용처 | `dummy-file-generator/app/styles/components.css:263` | `--disabled` |

`dummy-file-generator`의 5단 이름(`--text-normal`·`-neutral`·`-alternative`·`-assistive`·`-disable`)은 위 4개 토큰으로 흡수한다.

### 선

실측 결과 `--line` 계열은 3:1을 만족하지 않는다(라이트 `--line` 1.32:1, `--line-strong` 2.02:1, 다크 `--line` 1.45:1). 이는 결함이 아니라 **역할 분리가 필요하다는 신호**다.

WCAG 1.4.11은 "UI 컴포넌트를 식별하는 데 필요한 시각 정보"에만 3:1을 요구한다. 카드 경계선은 표면 밝기 차이로도 식별되므로 헤어라인이어도 무방하지만, 입력 필드의 테두리는 그것이 입력임을 알려주는 유일한 신호이므로 3:1이 필요하다.

| 토큰 | 라이트 | 다크 | 역할 | 3:1 요구 |
|---|---|---|---|---|
| `--line-subtle` | `rgba(112,115,124,.08)` | `rgba(112,115,124,.16)` | 내부 구분선 | 없음 |
| `--line` | `rgba(112,115,124,.22)` | `rgba(112,115,124,.32)` | 카드·패널 경계 | 없음 |
| `--line-strong` | `rgba(112,115,124,.52)` | `rgba(194,196,200,.52)` | hover 강조 | 없음 |
| `--control-border` | `#767b85` (최저 3.60:1) | `#8a8f99` (최저 4.12:1) | 입력·셀렉트·체크박스 경계 | **충족** |

`--control-border`는 신설이 아니라 `json-yaml-converter`에서 **승격**한 것이다. 다크값만 `#747984`(최저 3.06:1, surface-3 위 여유 없음)에서 `#8a8f99`로 올렸다.

### 브랜드

```
--primary          #3366ff  →  #5b84ff (다크)
--primary-strong   #005eeb  →  #1a75ff      hover
--primary-heavy    #0054d1  →  #0066ff      pressed
--primary-surface  #eaf2fe  →  rgba(91,132,255,.16)
--on-primary       #ffffff  (양쪽 동일)
```

`--brand-gradient`는 **정본에 두지 않는다.** `home` 로고 마크와 히어로 텍스트에만 쓰이는 랜딩 장식이므로 2층 원칙("정본에는 여러 앱이 공유하는 토큰만 둔다")에 따라 `home/src/styles/theme.local.css`에 둔다.

`--primary` 위 흰 글자는 4.68:1로 AA를 통과한다. `--primary` 자체를 텍스트로 쓸 때도 라이트 4.68:1 / 다크 5.03:1로 통과한다. 포커스링은 `--primary`를 쓰며 3:1을 넉넉히 넘는다.

다크의 hover/pressed 단계는 `5b84ff→1a75ff→0066ff` 계열(3개 앱)을 채택한다. 대안 계열은 `5b84ff→3366ff→1a75ff`로 pressed가 라이트 기본색과 같아져 단계가 뭉갠다.

`home`의 기능적 브랜드 사용처(FilterButton 활성·포커스링·푸터 링크 hover·LIVE 배지)는 `--primary`로 전환한다. 로고 마크와 히어로 텍스트의 그라디언트는 `--brand-gradient`로 이름을 바꿔 랜딩 장식으로 한정한다.

### 상태

색 이름이 아니라 의미 이름으로 통일한다. `--green`·`--coral`·`--yellow`(openapi·config-diff)와 `--positive`·`--warn`(ddl)을 흡수한다.

| 토큰 | 라이트 | 대비 | 다크 | 대비 |
|---|---|---|---|---|
| `--danger` | `#d11f2e` | 5.32:1 | `#ff6464` | 5.89:1 |
| `--success` | `#18794e` | 5.41:1 | `#34c77b` | 7.80:1 |
| `--warning` | `#a15c00` | 5.19:1 | `#e0a93a` | 8.04:1 |

각각 `-surface` 틴트 변형을 함께 둔다. 탈락한 값은 모두 텍스트로 쓸 수 없는 것들이다.

`config-diff-viewer`의 CRITICAL/HIGH/MEDIUM 심각도 램프(`--coral`)는 도메인 고유이므로 `theme.local.css`로 내린다.

### 타이포

36개 고유 font-size 중 20개가 10.5~15.2px 구간에 밀집해 있다. 5단으로 수렴한다.

| 토큰 | 크기 | 행간 | 자간 | 역할 |
|---|---|---|---|---|
| `--font-size-caption` | 12px (0.75rem) | 1.4 | — | 배지·칩·힌트·상태바 |
| `--font-size-body` | 14px (0.875rem) | 1.55 | — | **기본**. 본문·버튼·입력·라벨 |
| `--font-size-subtitle` | 16px (1rem) | 1.5 | — | 패널 제목·섹션 헤딩 |
| `--font-size-title` | 20px (1.25rem) | 1.35 | -0.01em | 앱 타이틀(`h1`) |
| `--font-size-display` | 28px (1.75rem) | 1.2 | -0.02em | home 히어로 전용 |

11px 이하는 두지 않는다. 현재 `text-[10px]`·`text-[11px]`·`0.66rem`(10.5px) 사용처는 12px로 올린다. 한글은 같은 px에서 라틴 문자보다 작아 보이고, 11px 이하 본문은 실무적으로 읽기 어렵다.

노출 방식은 Tailwind 4.2.4에서 실측 검증했다.

```css
:root {
  --font-size-body: 0.875rem;
  --line-height-body: 1.55;
}
@theme inline {
  --text-body: var(--font-size-body);
  --text-body--line-height: var(--line-height-body);
}
```

생성 결과는 다음과 같다.

```css
.text-body {
  font-size: var(--font-size-body);
  line-height: var(--tw-leading, var(--line-height-body));
}
```

`--font-size-body`·`--line-height-body`는 `:root`에 남아 바닐라 Electron이 직접 쓸 수 있고, Tailwind 앱은 `text-body` 유틸리티 하나로 크기·행간·자간을 함께 받는다. `var(--tw-leading, …)` 폴백이 붙어 `leading-*`로 개별 재정의도 가능하다. 값 중복이 없다.

### radius

하드코딩된 9·10·11·14px을 4단으로 흡수한다.

```
--radius-sm    8px    칩·배지·내부 요소
--radius-md   12px    컨트롤(버튼·아이콘 버튼·입력)·팝오버
--radius-lg   16px    카드·패널·워크스페이스
--radius-pill 999px   배지 (20곳 사용)
```

컨트롤에 `--radius-md`(12px)를 쓰는 것은 `2026-07-22` 스펙의 "10px control, 14~16px card" 방향을 이 스케일에서 가장 가깝게 구현한 것이다. `sign-maker`·`dummy-file-generator`가 이미 컨트롤에 12px을 쓰고 있다.

`sign-maker`의 `--radius-xl: 20px`은 정의만 있고 사용처가 0곳이므로 삭제한다.

### shadow

4단. 라이트는 4개 앱이 합의한 중립 저확산 값을 쓰고, **다크 오버라이드를 정본에 포함**한다.

```
--shadow-sm / --shadow-md / --shadow-lg / --shadow-xl
```

`sign-maker`와 `json-yaml-converter`는 현재 다크에서 그림자를 재정의하지 않아 `rgba(23,23,25,…)` 그림자가 어두운 배경에서 사실상 보이지 않는다. 정본이 다크값을 함께 담아 이를 고친다.

`--shadow-xl`은 오버레이 고도이며, `openapi-editor` 팝오버의 slate 색조(`rgb(15 23 42 / 14%)`)를 중립으로 교정한 값이다.

### motion

`--ease`·`--dur`(2개 앱)와 `--ease-standard`·`--duration-*`(2개 앱)를 후자로 통일하고, 하드코딩된 `.16s`·`0.18s`·`0.22s`를 흡수한다.

```
--ease-standard    cubic-bezier(0.4, 0, 0.2, 1)
--ease-emphasized  cubic-bezier(0.2, 0, 0, 1)
--duration-fast    120ms   hover·focus 색 변화
--duration-base    180ms   팝오버 진입·토스트
--duration-slow    240ms   drawer 슬라이드
```

정본 `base.css`에 `prefers-reduced-motion` 대응을 넣어 duration을 0으로 덮는다. 현재 `openapi-editor`·`ddl-seed-generator`·`config-diff-viewer` 3개 앱만 자체 처리하고 있고 나머지 5개는 미처리다. 정본이 담으면 5개가 새로 대응되고, 3개는 자체 선언이 중복이 되므로 마이그레이션 시 제거한다.

정본 규칙이 기존 3개 앱보다 강하다. 기존 선언은 `animation-duration`·`transition-duration`만 덮지만 정본은 `--ds-duration-*` 토큰까지 0으로 덮어 토큰 기반 transition도 함께 끈다.

### z-index

신규. 현재 토스트 `z-10`, drawer `z-401`, home 헤더 `z-50`이 체계 없이 흩어져 있어 drawer가 열린 동안 토스트를 띄울 수 없다.

```
--z-sticky    100   sticky 헤더
--z-dropdown  200   팝오버·메뉴 (비모달)
--z-toast     300   z-index 층위의 최상위
```

**모달 오버레이는 이 스케일에 속하지 않는다.** `<dialog>` + `showModal()`은 브라우저 top layer에 렌더되어 z-index 값과 무관하게 모든 일반 콘텐츠 위에 온다(`::backdrop`도 동일). 따라서 drawer용 z-index 토큰은 두지 않는다.

이 구조의 귀결을 명시한다. **모달이 열린 동안 그 위에 토스트를 띄워야 한다면 토스트도 top layer에 있어야 한다.** `--z-toast: 300`만으로는 모달 뒤에 깔린다. 해결책은 토스트를 모달 내부에 렌더하거나 `popover` 속성을 부여해 top layer로 올리는 것이다.

현재는 토스트가 `json-yaml-converter`에만, drawer가 `config-diff-viewer`에만 있어 한 앱에서 두 오버레이가 동시에 뜨는 조합이 없다. 따라서 이번 범위에서는 구현하지 않고, 두 오버레이를 같은 앱에서 쓰게 될 때 위 방법을 적용한다는 규칙만 README에 남긴다.

### 컨테이너

| 토큰 | 값 | 대상 |
|---|---|---|
| `--container-narrow` | 560px | 단일 폼 카드 — dummy-file-generator |
| `--container-page` | 1120px | 랜딩·문서형 — home |
| `--container-wide` | 1600px | 에디터 워크스페이스 — openapi, config-diff, ddl, json-yaml, sign-maker |

`sign-maker` 1400 / `json-yaml-converter` 1400 / `ddl-seed-generator` 1480이 1600px로 넓어진다. 세 앱 모두 좌우 분할 패널이나 캔버스를 쓰므로 넓은 쪽이 유리하다. `json-yaml-converter`는 `2026-07-22` 스펙이 1440px을 규정했으나(구현은 1400px로 드리프트) 이 결정이 그것을 대체한다.

페이지 바깥 여백도 토큰으로 둔다. `2026-07-22` 스펙의 "desktop 18~24px, mobile 12px"에서 상단값을 채택했다.

```
--page-padding         24px   데스크톱
--page-padding-mobile  12px   768px 미만
```

미디어 쿼리 조건이 아니라 선언 값에 쓰이므로 커스텀 프로퍼티로 관리할 수 있다. 브레이크포인트와 달리 토큰화가 가능한 경우다.

### 브레이크포인트

CSS 커스텀 프로퍼티는 미디어 쿼리 조건에서 동작하지 않는다(`@media (max-width: var(--bp-md))`는 조용히 무시된다). 따라서 토큰이 아니라 **규칙**으로 정본 README에 둔다.

```
768 / 1024 / 1280 만 사용 (= Tailwind md / lg / xl)
Tailwind 앱: max-md: · lg: 변형 사용. 임의 픽셀 미디어 쿼리 금지
바닐라 Electron: 같은 세 값을 직접 사용
```

현재 767과 1023은 768·1024를 `max-width`로 표현한 것이라 이미 정합하다. 375·760·1180·1190만 가장 가까운 표준값으로 흡수한다.

### spacing

`--space-*` 토큰을 두지 않는다. Tailwind 기본 spacing이 이미 4px 그리드이고 7개 앱 중 6개가 Tailwind를 쓴다. README에 "4px 그리드 = Tailwind 기본 스케일"을 규칙으로 적고, 바닐라 Electron만 필요한 값을 `theme.local.css`에 둔다.

## 셸 계약

### 정본이 클래스를 공급하고 앱이 컴포넌트로 감싼다

`primitives.css`가 전역 CSS 클래스를 공급하는 것은 `docs/frontend-conventions.md` 규칙 4("재사용 단위는 외워야 하는 전역 CSS 클래스가 아니라 타입이 있는 컴포넌트다")와 충돌하는 것처럼 보인다. 규칙 5가 답을 갖고 있다 — "의미 클래스를 쓸 땐 React 컴포넌트로 감싸 재사용 단위를 컴포넌트로 만든다."

정본은 클래스를 공급하고 각 앱은 그것을 얇은 컴포넌트로 감싼다. 값은 동기화되어 갈라지지 않고, 앱 개발자가 보는 인터페이스는 타입이 있는 `<IconButton>`이다. 바닐라 Electron은 클래스를 직접 쓴다. `json-yaml-converter`의 `Button.tsx`가 이미 이 패턴이다(`btn btn-${variant}`를 감싸는 10줄).

### 헤더 슬롯

```
┌─ 브랜드 ──────────┐  ┌─ 페이지 액션 ─┐   ┌─ 유틸리티 ────┐
│ [마크] 앱 이름     │  │ 앱마다 자유   │   │ …앱별  [토글] │
│  40px  설명문      │  │ (없어도 됨)   │   │        ↑ 항상 끝│
└───────────────────┘  └──────────────┘   └───────────────┘
```

| 슬롯 | 규칙 |
|---|---|
| 브랜드 | 마크 40px · `--radius-md` · `--primary` 배경 · 아이콘 20px `--on-primary` / `h1`은 `--font-size-title` / 설명문은 `--font-size-body` + `--muted`. **전체가 허브로 가는 링크**(`home`에서만 링크 아님) |
| 페이지 액션 | 앱 고유. 비어 있어도 됨 |
| 유틸리티 | 항상 최우측. **테마 토글이 마지막 요소**. 그 앞에만 앱별 유틸 배치 |

**2행 변형:** `openapi-editor`는 페이지 액션이 많아 의도적으로 2행 구조를 쓴다(`aria-label="핵심 작업"` / `"보조 작업"`, `2026-07-23-openapi-editor-header-layout.md`). E2E가 두 행의 수직 분리와 36px 컨트롤 높이를 단정하므로 이 구조를 보존한다. 계약은 다음과 같이 확장된다.

- 1행: 브랜드 슬롯 + 핵심 페이지 액션 + 유틸리티 슬롯(테마 토글 포함)
- 2행: 보조 페이지 액션
- 즉 **유틸리티 슬롯은 항상 1행의 끝**이며, 2행은 페이지 액션의 연장이다.

**변경 지점:** `home`은 토글 오른쪽에 GitHub 링크가 있어 순서를 바꾼다. `dummy-file-generator`는 `position:fixed`로 떠 있는 토글을 헤더 유틸리티 슬롯으로 옮긴다. 나머지 5개 앱은 이미 토글이 마지막이다.

허브 링크는 6개 도구 앱에 새로 생기는 경로다. `home` 외 어느 앱에도 허브로 돌아갈 방법이 없던 문제가 해결된다.

### 푸터

`home` 전용으로 유지한다. 도구 앱은 대부분 full-height 워크스페이스이고(`openapi-editor`는 `min-height: calc(100vh - 182px)` 그리드, `ddl`·`config-diff`도 에디터 패널) 푸터를 붙이면 세로 공간을 먹고 새 스크롤이 생긴다. 허브 복귀 경로는 헤더 브랜드 링크가 담당한다.

### 상호작용 상태

`.ds-icon-btn`을 정본에 정의한다. 현재 7개 앱이 같은 버튼을 7가지로 만들고 있다.

```
기본            36×36px · --radius-md · 배경 --surface-2 · 테두리 1px --line
                색 --muted · 아이콘 16px currentColor
:hover          배경 --surface-3 · 색 --text          ← 테두리 유지, 색만 변경
:focus-visible  outline 2px --primary · offset 2px
:active         배경 --fill-bold
:disabled       색 --disabled · 배경 --fill-subtle · cursor not-allowed
```

36px은 `openapi-editor-header-layout.md`의 Global Constraint("모든 직접 조작 요소는 36px 높이를 유지한다")이며 E2E가 강제한다. 3개 앱이 이미 36px이다.

hover에서 테두리를 유지하는 것은 의도적이다. `home`은 현재 `border-transparent → border-black/[0.07]`로 테두리를 없다가 생기게 해서 hover 시 버튼이 1px 커진 것처럼 보인다.

**포커스링을 전역 규칙으로 올린다.** 현재 openapi·config-diff·ddl은 전역 `:focus-visible`을 쓰고, sign-maker·json-yaml·dummy는 컴포넌트별로 4개씩 선언하고, `home`은 `ToolCard`의 버튼 1곳에만 있다. 정본 `base.css`의 전역 선언으로 새 컴포넌트가 자동 커버된다.

**disabled에 opacity를 쓰지 않는다.** 현재 `0.45`·`0.48`·`0.5`·`0.55` 4종으로 갈라져 있는데, 원인은 "얼마나 흐리게?"에 정답이 없다는 것이다. opacity는 중첩되어 이미 `--muted`인 텍스트에 `opacity:0.48`을 걸면 실효 대비가 2:1대로 떨어지고 같은 opacity를 받은 아이콘은 과도하게 사라진다. `2026-07-22` 스펙 67행이 이미 "disabled 상태는 opacity만으로 구분하지 않고 contrast가 유지되는 border/text 토큰을 사용한다"고 규정했으므로, 그 방식을 전 앱으로 확장한다.

**아이콘 계약:** 16px · `currentColor` · stroke 기반. lucide 버전이 `0.575.0`·`1.11.0`·`1.14.0`으로 메이저 경계를 넘어 갈라져 있어 5개 앱을 하나로 맞춘다. `home`·`dummy-file-generator`는 커스텀 SVG를 쓰는데 위 계약만 지키면 되므로 lucide 도입을 강제하지 않는다(불필요한 의존성).

### 오버레이

| | `.ds-popover` | drawer | `.ds-toast` |
|---|---|---|---|
| 층위 | `--z-dropdown` | top layer | `--z-toast` |
| 표면 | `--surface` + `--line-strong` | `--surface` | `--surface` + `--line` |
| radius | `--radius-md` | 0 | `--radius-md` |
| elevation | `--shadow-xl` | 방향성 로컬 | `--shadow-md` |
| 진입 | `--duration-base` `--ease-emphasized` | `--duration-slow` | `--duration-base` |
| a11y | `role="menu"` + 트리거 `aria-haspopup="menu"`·`aria-expanded` | `<dialog>` 암묵 역할 | `role="status"` `aria-live="polite"` |
| 닫기 | Escape · 외부 pointerdown · 포커스 이탈 | Escape · 백드롭 · 닫기 버튼 | 자동 |

**drawer를 네이티브 `<dialog>` + `showModal()`로 전환한다.** `config-diff-viewer`의 drawer에 없는 네 가지 — 포커스 트랩, Escape, `role="dialog"`/`aria-modal`, z-index 충돌 — 를 `<dialog>`가 전부 제공한다. top layer에 렌더되므로 z-index 경쟁에서 빠진다. 수동 포커스 트랩 구현보다 코드가 적고 대상은 한 앱의 한 컴포넌트다.

**`UtilityMenu`의 hover-open 동작은 명세된 기능이므로 보존한다**(`2026-07-23-openapi-editor-hover-utility-menus-design.md`). 포인터 진입 시 열기, 이탈 시 240ms 후 닫기, 키보드 포커스가 컨테이너 안에 있는 동안 유지, 한 번에 하나만 열림, 작업 실행 후 닫기 — 모두 유지한다. 커스텀 이벤트 이름 `openapi-studio:utility-menu-open`만 `toolhub:popover-open`으로 바꾼다.

## 검증

### 표준 진입점 정비

`mise run check`가 표준 검증 명령이지만 3개 앱에만 있다.

| `check` task | 앱 |
|---|---|
| 있음 | json-yaml-converter, openapi-editor, class-diagram-generator |
| 없음 | home, sign-maker, ddl-seed-generator, config-diff-viewer, dummy-file-generator, webpage-capture-tool |

`CLAUDE.md`가 "합당히 존재해야 할 검증 스크립트가 없으면 추가하라"고 규정하므로 없는 6개 앱에 `check`를 추가한다. 구성은 각 앱이 실제로 가진 task로 정한다.

| 앱 | 추가할 `check` 구성 |
|---|---|
| `home` · `sign-maker` · `dummy-file-generator` | test + lint + typecheck + build |
| `ddl-seed-generator` · `config-diff-viewer` | test + lint + typecheck + build |
| `webpage-capture-tool` | test + lint (TypeScript가 아니라 typecheck 없음, build는 플랫폼별 패키징이라 제외) |

`ddl-seed-generator`·`config-diff-viewer`의 `typecheck` alias가 `t`이고 나머지는 `tc`이므로 `tc`로 통일한다.

### 앱별 완료 조건

각 마이그레이션 단계의 완료 조건은 `mise run check` exit 0이다. 여기에 drift 테스트가 포함된다. e2e가 있는 앱(json-yaml-converter, openapi-editor)은 `check`가 e2e까지 돌린다.

### 회귀 방지

- className·구조·텍스트를 바꾸지 않고 값만 토큰으로 치환한다. 토큰 도입 시 **기존 값과 동일한 값으로 먼저 정의**해 색상 회귀를 막고, 값 변경(`--muted` 알파 등)은 별도 커밋으로 분리한다.
- 큰 CSS 블록은 손으로 옮기지 않고 `sed -n '시작,끝p'`로 byte-exact 추출한다.
- UI 테스트가 약한 앱은 빌드 산출 CSS에 컴포넌트 클래스가 보존됐는지 `grep`으로 확인한다.
- `openapi-editor`의 2행 헤더 E2E와 36px 높이 단정, `json-yaml-converter`의 768/767px 전환과 390px 모바일 흐름을 회귀 대상으로 명시한다.
- 라이트·다크 양쪽에서 텍스트 4.5:1, non-text control border/focus 3:1을 유지한다.

## 마이그레이션 순서

정본을 먼저 만들고, 정본과 가장 가까운 앱으로 계약을 검증한 뒤 먼 앱으로 간다.

| 단계 | 대상 | 작업 | 규모 |
|---|---|---|---|
| 1 | `packages/design-system/` | 정본 3파일 + README + 동기화 스크립트 + 루트 package.json | — |
| 2 | 전 앱 `mise.toml` | `check` task 추가, `typecheck` alias 통일 | 작음 |
| 3 | `sign-maker` | 정본과 최근접. 파일럿으로 계약 검증 | 작음 |
| 4 | `json-yaml-converter` | `--control-border`·`--editor-bg` → local, `--soft` 1곳 | 작음 |
| 5 | `webpage-capture-tool` | 682줄 CSS, 겹치는 이름의 값 전환 100곳 + 하드코딩 색상 39곳, 폰트 경로 | 큼 |
| 6 | `ddl-seed-generator` | `--surface-3` 중복 제거, 상태색 이름 전환, 토글 40→36px | 중간 |
| 7 | `openapi-editor` | 폰트 신규, shadow·radius·motion 토큰 도입, 하드코딩 radius 4종 흡수, 2행 헤더 보존 | 중간 |
| 8 | `dummy-file-generator` | 텍스트 5단 이름 전환(282줄 전반), 토글 fixed → 헤더 | 중간~큼 |
| 9 | `config-diff-viewer` | 927줄 CSS, `--muted` 34곳, drawer를 `<dialog>`로 전환 | 큼 |
| 10 | `home` | `@theme` → `:root`+`@theme inline` 구조 전환, indigo → blue, 그라디언트 분리, 유틸리티 클래스명 영향 | 가장 큼 |
| 11 | 문서 | `frontend-conventions.md` 규칙 3 개정, `CLAUDE.md`에 루트 명령 추가 | — |

`home`을 마지막에 두는 이유는 구조 전환이라 회귀 위험이 가장 크고, 그때쯤 정본이 다른 앱에서 검증돼 있기 때문이다.

각 단계는 `mise run install`로 의존성을 설치하고 `mise run check`로 baseline을 확인한 뒤 시작한다.

## 문서 갱신

`docs/frontend-conventions.md` 규칙 3이 현재 "각 앱이 자기 토큰을 독립적으로 관리한다"고 명시하고 있다. 이 작업이 그 규칙을 대체하므로 다음으로 개정한다.

> **토큰 체계** — 공통 토큰은 `packages/design-system/`의 정본이 단일 출처다. 각 앱의 `styles/tokens.css`·`base.css`·`primitives.css`는 생성물이며 직접 편집하지 않는다. 앱 고유 토큰만 `styles/theme.local.css`에 둔다. 정본 변경 후 `npm run tokens:sync`를 실행한다.

`CLAUDE.md`의 "How To Use This Repository"에 루트 레벨 명령 두 개를 문서화한다. 현재 프로젝트 목록에 `json-yaml-converter`·`openapi-editor`·`class-diagram-generator`가 빠져 있으므로 함께 갱신한다.

## 주의사항

- **`home`은 복사가 아니라 구조 전환이다.** 현재 `@theme`(값 직접 선언)만 쓰고 `:root`/`[data-theme]` 층이 없어 다크 대응을 `dark:` 변형으로 한다. 정본을 받으려면 이 구조를 바꿔야 하고 `bg-canvas`·`text-ink-dark`·`bg-surface-dark` 같은 기존 유틸리티 클래스명이 전부 영향받는다.
- **Electron의 폰트 경로가 깨진다.** `file://`에서 `/fonts/…`는 파일시스템 루트로 해석된다.
- **`--muted` 알파 변경은 8개 앱의 보조 텍스트를 동시에 진하게 만든다.** 의도된 접근성 개선이지만 시각적 변화이므로 값 변경 커밋을 분리해 되돌리기 쉽게 둔다.
- **컨테이너 1600px 확대는 3개 앱의 레이아웃을 넓힌다.** 좌우 패널 비율과 최소 폭 제약을 각 앱에서 확인해야 한다.
- **브레이크포인트는 토큰화할 수 없다.** 미디어 쿼리에서 커스텀 프로퍼티는 조용히 무시되므로 규칙으로만 관리한다.
- 정본 파일은 생성물이지만 **커밋한다**. gitignore하면 clone 직후와 Vercel 빌드에서 깨진다.
- **`--ds-` 접두사 도입으로 기존 사용처를 기계적으로 치환해야 한다.** `var(--radius-*)` 24곳, `var(--shadow-*)` 13곳, `var(--font-sans)`(앱별 `base.css`), `var(--dur)`·`var(--ease)`(sign-maker·json-yaml-converter)가 대상이다. 값이 바뀌지 않는 순수 이름 치환이므로 `sed`로 처리하고, 값 변경과 별도 커밋으로 분리한다.
- **`sign-maker`가 Tailwind 유틸리티와 `var()`를 혼용하는 유일한 앱이다**(유틸리티 5곳 + `var()` 9곳). 파일럿으로 적합한 이유이기도 하다 — 두 경로가 같은 값을 참조하는지 여기서 검증된다.
