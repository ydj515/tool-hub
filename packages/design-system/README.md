# Tool Hub Design System

Tool Hub 웹 도구들이 공유하는 디자인 토큰·전역 규칙·프리미티브의 **정본**이다.

## 파일

| 정본 | 앱에 복사되는 이름 | 내용 |
|---|---|---|
| `tokens.css` | `ds-tokens.css` | 색·타이포·radius·shadow·motion·z-index·레이아웃 토큰 |
| `base.css` | `ds-base.css` | 전역 포커스링, `prefers-reduced-motion` |
| `primitives.css` | `ds-primitives.css` | `.ds-card`, `.ds-icon-btn` |
| `ds-sync.test.ts` | `ds-sync.test.ts` | drift 감지 + 금지 Tailwind 단계 스캔 |
| `ds-contrast.test.ts` | `ds-contrast.test.ts` | 팔레트 대비 계약 검증 (브라우저 불필요) |

## 사용법

앱의 `styles/ds-*.css` 는 **생성물이다. 직접 편집하지 않는다.** 정본을 고친 뒤 저장소 루트에서 동기화한다.

```bash
npm run tokens:sync
```

동기화를 잊으면 각 앱의 `ds-sync.test.ts` 가 실패한다. 차이만 확인하려면 다음을 쓴다.

```bash
npm run tokens:check
```

`ds-sync.test.ts` 는 자기 위치(`dirname(__filename)`)를 검사 경로로 쓴다. 스타일 디렉터리가 앱마다 `src/styles` · `app/styles` · `apps/electron/renderer/styles` 로 달라 경로를 추론하지 않는다. 새 앱을 추가할 때 `scripts/sync-design-tokens.mjs` 의 `TARGETS` 에 경로만 적으면 된다.

금지 Tailwind 단계 스캔은 `src` 또는 `app` 이 있을 때만 돈다. Tailwind 를 쓰지 않는 앱(`webpage-capture-tool`)은 스캔 대상이 0건이고 그게 정상이다.

앱의 진입 CSS 는 다음 순서로 import 한다. import 순서가 캐스케이드 순서다.

```css
@import "tailwindcss";
@import "./styles/ds-tokens.css";      /* 정본 */
@import "./styles/ds-base.css";        /* 정본 */
@import "./styles/ds-primitives.css";  /* 정본 */
@import "./styles/theme.local.css";    /* 앱 고유 — 정본을 덮을 수 있다 */
@import "./styles/base.css";           /* 앱 고유 */
@import "./styles/components.css";     /* 앱 고유 */
```

## 네임스페이스 규칙

**Tailwind 테마 네임스페이스와 이름이 겹치는 토큰은 `:root` 에서 `--ds-` 접두사를 쓰고 `@theme inline` 으로 Tailwind 이름에 매핑한다.**

접두사를 생략하면 유틸리티와 `var()` 가 갈라진다. Tailwind 4.2.4 에서 확인한 동작이다.

- `--radius-md`: Tailwind 가 `rounded-md` 사용 시 자기 기본값을 `:root` 로 emit 한다. 정본 정의가 캐스케이드 순서로 이기지만 암묵적 의존이다.
- `--shadow-sm`: Tailwind 는 shadow 값을 유틸리티에 인라인하고 `:root` 를 읽지 않는다. `shadow-sm` 클래스와 `var(--shadow-sm)` 이 같은 이름의 서로 다른 그림자가 된다.

| 구분 | 토큰 |
|---|---|
| 접두사 사용 | `--ds-font-sans`, `--ds-font-mono`, `--ds-font-size-*`, `--ds-line-height-*`, `--ds-tracking-*`, `--ds-radius-*`, `--ds-shadow-*`, `--ds-ease-*`, `--ds-duration-*`, `--ds-z-*`, `--ds-container-*`, `--ds-page-padding*` |
| 접두사 없음 | `--bg`, `--surface`, `--surface-2`, `--surface-3`, `--fill*`, `--line*`, `--control-border`, `--text`, `--text-neutral`, `--muted`, `--disabled`, `--primary*`, `--on-primary`, `--danger*`, `--success*`, `--warning*`, `--inverse-*` |

정본이 정의하지 않은 Tailwind 단계(`rounded-xl`, `rounded-2xl`, `shadow-2xl` 등)는 **사용하지 않는다.** 부분 오버라이드는 순서 역전을 만든다 — `rounded-xl`(Tailwind 기본 12px)이 `rounded-lg`(정본 16px)보다 작아진다.

## 규칙

### 4px 그리드

`--space-*` 토큰을 두지 않는다. Tailwind 기본 spacing 스케일이 이미 4px 그리드다(`gap-2`=8px, `gap-3`=12px). 바닐라 CSS 앱만 필요한 값을 `theme.local.css` 에 둔다.

### 브레이크포인트

CSS 커스텀 프로퍼티는 미디어 쿼리 조건에서 동작하지 않는다(`@media (max-width: var(--bp-md))` 는 조용히 무시된다). 따라서 토큰이 아니라 규칙으로 관리한다.

```
768 / 1024 / 1280 만 사용 (= Tailwind md / lg / xl)
Tailwind 앱: max-md: · lg: 변형 사용. 임의 픽셀 미디어 쿼리 금지
바닐라 CSS 앱: 같은 세 값을 직접 사용
```

### 대비

라이트·다크 양쪽에서 텍스트 **4.5:1**, non-text control border/focus **3:1** 을 유지한다. 토큰 값 옆 주석의 수치는 `--bg`/`--surface`/`--surface-2`/`--surface-3` 네 표면 전부에서 측정한 최악값이다.

`--line*` 는 장식용 헤어라인이므로 3:1 을 요구하지 않는다. 경계선이 컴포넌트를 식별하는 입력·셀렉트·체크박스에는 `--control-border` 를 쓴다.

`--disabled` 는 WCAG 1.4.3 이 비활성 컨트롤을 면제하므로 낮은 대비를 의도적으로 허용한다. 비활성이 아닌 텍스트에 쓰지 않는다.

#### 강조 텍스트는 `--primary-text`

`--primary` 는 버튼 배경·테두리·활성 표시용이다. **텍스트로 쓰지 않는다** — 라이트에서 `--bg` 위 4.37:1, `--surface-2` 위 4.26:1 로 AA 에 못 미친다.

`--primary-strong`(hover)·`--primary-heavy`(pressed)는 라이트에서는 통과하지만 다크에서 더 어두워져 역전된다.

네 표면(`--bg` / `--surface` / `--surface-2` / `--surface-3`) 전부에서 측정한 값이다. **4.5 미달을 굵게 표시한다.**

| 표면 | `--primary` | `--primary-strong` | `--primary-heavy` | `--primary-text` |
|---|---|---|---|---|
| light | 4.37 / 4.68 / **4.26** / **3.97** | 5.16 / 5.53 / 5.03 / 4.68 | 6.15 / 6.59 / 5.99 / 5.58 | 5.16 / 5.53 / 5.03 / 4.68 |
| dark | 5.65 / 5.03 / 4.69 / **3.94** | 4.59 / **4.09** / **3.81** / **3.20** | **3.96** / **3.53** / **3.29** / **2.77** | 7.38 / 6.57 / 6.13 / 5.15 |

방향이 테마별로 반대이므로 `--primary-text` 를 따로 둔다. 라이트는 `--primary-strong` 과 같은 `#005eeb`, 다크는 `--primary` 보다 한 단계 밝은 `#7a9dff` 다 — `--primary`(`#5b84ff`)를 그대로 쓰면 `--surface-3` 위에서 3.94:1 로 계약을 못 지킨다.

#### 대비 계약은 테스트가 지킨다

`ds-contrast.test.ts` 가 `ds-tokens.css` 를 파싱해 값을 직접 계산한다. E2E 하네스가 있는 앱은 4개뿐이라 브라우저 기반 검사로는 나머지를 덮을 수 없어, 토큰이 전부 리터럴인 점을 이용해 단위 테스트로 만들었다. 9개 앱의 vitest 에서 모두 돈다.

검사 항목은 다음과 같다.

- `--text` · `--text-neutral` · `--muted` · `--primary-text` 가 네 표면 전부에서 4.5:1
- `--danger` · `--success` · `--warning` 이 각자의 `-surface` 위에서, `--text-neutral` 이 `--primary-surface` 위에서 4.5:1
- `--on-primary` 가 `--primary` 위에서 4.5:1
- `--control-border` 가 네 표면 전부에서 3:1, `--primary` 가 `--surface`/`--bg` 위에서 3:1
- `--disabled` 은 거꾸로 4.5 **미만**임을 못박는다. 활성 텍스트에 잘못 쓰이는 것을 막는다

렌더된 요소의 합성(부모 틴트 위에 겹치는 알파 표면 등)은 이 테스트가 볼 수 없다. E2E 가 있는 앱에서 따로 본다.

#### 역할 표면 위의 텍스트

`--danger`/`--warning`/`--success` 는 각자의 `-surface` 위에서 AA 를 만족한다. 단 `-surface` 는 다크에서 **알파 기반**이라 `--surface` 위를 전제한다. 다른 틴트 위에 겹치면 대비가 떨어지므로, 틴트된 부모 안의 배지는 합성 기준을 고정한다.

```css
.badge {
  background-color: var(--surface);
  background-image: linear-gradient(var(--badge-surface), var(--badge-surface));
}
```

`--primary-surface` 위의 텍스트는 예외다. `--primary` 계열 중 두 테마 모두에서 이 표면 위 AA 를 넘는 토큰이 없으므로 `--text-neutral` 을 쓴다.

#### 반전 표면

`--inverse-bg` · `--inverse-text` · `--inverse-line` 은 **밝은 페이지 안의 어두운 영역**용이다 — 코드 블록, 다크 툴팁, 두 테마 모두 어두운 에디터 프레임. 라이트에서도 어두운 배경을 쓰고, 페이지가 다크일 때 한 단계 더 내려 영역 경계를 유지한다.

값은 다크 팔레트에서 파생했다. 라이트 배경은 다크 `--surface`, 다크 배경은 다크 `--bg` 와 `--surface` 사이다. 대비는 라이트 14.05:1, 다크 14.62:1 로 `ds-contrast.test.ts` 가 검사한다.

`--inverse-line` 은 `--line*` 과 같은 장식용 헤어라인이라 3:1 을 요구하지 않는다. 영역을 식별하는 것은 어두운 배경 자체다.

**테마를 따라가는** 서드파티 에디터 배경은 이 토큰을 쓰지 않는다. 라이트에서 흰색이 되어야 하므로 앱 고유 토큰으로 둔다.

### 등폭 글꼴

`var(--ds-font-mono)` 를 쓴다. `--font-mono` 는 Tailwind 네임스페이스라 `:root` 에서는 `--ds-` 접두사를 쓰고 `@theme inline` 에서만 Tailwind 이름으로 매핑한다.

### 모달과 층위

`--ds-z-*` 는 비모달 오버레이용이다. 모달은 `<dialog>` + `showModal()` 로 만들어 브라우저 top layer 를 쓴다 — 포커스 트랩·Escape·`role="dialog"`·백드롭을 모두 제공하고 z-index 경쟁에서 빠진다.

모달 위에 토스트를 띄워야 하면 `--ds-z-toast` 만으로는 모달 뒤에 깔린다. 토스트를 모달 내부에 렌더하거나 `popover` 속성으로 top layer 에 올린다.

## 앱 고유 토큰

정본에는 **여러 앱이 공유하는 토큰만** 둔다. 한 앱만 쓰는 것은 `theme.local.css` 로 내린다.

`theme.local.css` 에 같은 토큰이 **3개 이상 앱에서 반복되면 정본으로 승격**한다. 승격 절차는 다음과 같다.

1. `tokens.css` 에 토큰을 추가하고 대비를 측정해 주석에 기록한다.
2. `npm run tokens:sync` 를 실행한다.
3. 각 앱의 `theme.local.css` 에서 중복 정의를 제거한다.
4. 각 앱에서 `mise run check` 를 실행한다.

## 폰트

`@font-face` 가 `/fonts/toolhub-sans.woff2` 를 참조한다. 각 앱의 `public/fonts/` 에 파일이 있어야 한다.

**Electron 등 `file://` 프로토콜에서는 이 경로가 파일시스템 루트로 해석되어 깨진다.** 해당 앱은 폰트를 렌더러 옆에 복사해 상대 경로로 바꾸거나 `system-ui` 폴백을 수용한다.

## 바닐라 CSS 앱

`@font-face` 외의 Tailwind at-rule(`@custom-variant`, `@theme inline`)은 브라우저가 미지의 at-rule 블록을 건너뛰므로 무해하게 무시되고 `:root` 커스텀 프로퍼티는 정상 적용된다. 별도 분기 없이 같은 파일을 쓴다. 단 Tailwind 유틸리티(`text-body`, `bg-surface`)는 생성되지 않으므로 `var()` 를 직접 쓴다.
