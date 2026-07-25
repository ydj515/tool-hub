# Tool Hub Design System

Tool Hub 웹 도구들이 공유하는 디자인 토큰·전역 규칙·프리미티브의 **정본**이다.

## 파일

| 정본 | 앱에 복사되는 이름 | 내용 |
|---|---|---|
| `tokens.css` | `ds-tokens.css` | 색·타이포·radius·shadow·motion·z-index·레이아웃 토큰 |
| `base.css` | `ds-base.css` | 전역 포커스링, `prefers-reduced-motion` |
| `primitives.css` | `ds-primitives.css` | `.ds-card`, `.ds-icon-btn` |

## 사용법

앱의 `styles/ds-*.css` 는 **생성물이다. 직접 편집하지 않는다.** 정본을 고친 뒤 저장소 루트에서 동기화한다.

```bash
npm run tokens:sync
```

동기화를 잊으면 각 앱의 `ds-sync.test.ts` 가 실패한다. 차이만 확인하려면 다음을 쓴다.

```bash
npm run tokens:check
```

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
| 접두사 사용 | `--ds-font-sans`, `--ds-font-size-*`, `--ds-line-height-*`, `--ds-tracking-*`, `--ds-radius-*`, `--ds-shadow-*`, `--ds-ease-*`, `--ds-duration-*`, `--ds-z-*`, `--ds-container-*`, `--ds-page-padding*` |
| 접두사 없음 | `--bg`, `--surface`, `--surface-2`, `--surface-3`, `--fill*`, `--line*`, `--control-border`, `--text`, `--text-neutral`, `--muted`, `--disabled`, `--primary*`, `--on-primary`, `--danger*`, `--success*`, `--warning*` |

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
