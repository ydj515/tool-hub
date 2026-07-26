# 프론트엔드 컨벤션 (웹 앱)

웹 도구들이 공통으로 따르는 코드 구조 규칙이다. **코드를 공유하지는 않지만**(각 앱은 독립 패키지), 모든 앱이 같은 규칙으로 작성된다.

## 적용 대상

| 스택 | 앱 | 정본 토큰 | 셸 계약 |
|---|---|---|---|
| Vite + React SPA | `home`, `sign-maker`, `json-yaml-converter`, `openapi-editor`, `api-contract-test-generator` | 적용 | 적용 |
| Next.js App Router | `ddl-seed-generator`, `config-diff-viewer`, `dummy-file-generator` | 적용 | 적용 |
| Electron + 바닐라 CSS | `webpage-capture-tool` | 적용 | 미적용 |

> `webpage-capture-tool` 은 데스크톱 워크벤치라 헤더 3슬롯·브랜드 허브 링크·컨테이너 폭 규칙이 맞지 않는다. 토큰과 `<dialog>` 규칙만 따른다. `class-diagram-generator`(Kotlin)는 대상 외.

## 5대 규칙

1. **셸/콘텐츠 분리** — 진입점은 얇게 두고, 반복되는 chrome과 페이지 콘텐츠를 컴포넌트로 분리한다.
   - Vite: `App` → `Layout` → `pages/*`
   - Next.js: `app/layout.tsx`(서버 루트, html/body/FOUC/메타데이터)는 그대로 두고, **셸은 클라이언트 오케스트레이터가 렌더**한다. 상단 바(Topbar)가 Generate·비교 같은 **페이지 액션을 품기** 때문에 서버 `layout.tsx`에 넣지 않는다.
2. **CSS 주제별 분리** — `styles/`에 토픽 파일을 두고 진입 CSS는 `@import`만 담는다.
   - 진입 파일은 `@import "tailwindcss";` + 하위 파일 import만. CSS 스펙상 `@import`는 최상단에만 올 수 있다.
   - import 순서 = 캐스케이드 순서이므로 `ds-tokens → ds-base → ds-primitives → theme.local → base → components` 순.
   - 콤마 그룹(`.a, .b { ... }`)이 컴포넌트 경계를 넘나들면 무리하게 쪼개지 말고 `theme / base / components` 3토픽으로 둔다.
3. **토큰 체계** — 공통 토큰은 `packages/design-system/`의 정본이 단일 출처다. 각 앱의 `styles/ds-tokens.css`·`ds-base.css`·`ds-primitives.css`·`ds-sync.test.ts`는 **생성물이며 직접 편집하지 않는다.** 앱 고유 토큰만 `styles/theme.local.css`에 둔다. 정본을 고친 뒤 저장소 루트에서 `npm run tokens:sync`를 실행한다.
   - 동기화를 잊으면 각 앱의 `ds-sync.test.ts`가 실패한다. CI가 없으므로 검증이 이미 일어나는 곳에 drift 감지를 둔다.
   - Tailwind 테마 네임스페이스와 겹치는 토큰은 `--ds-` 접두사를 쓴다. 접두사가 없으면 유틸리티(`rounded-md`, `shadow-sm`)와 `var()`가 서로 다른 값을 참조한다.
   - `theme.local.css`에 같은 토큰이 3개 이상 앱에서 반복되면 정본으로 승격한다.
   - 자세한 규칙은 [packages/design-system/README.md](../packages/design-system/README.md)에 있다.
4. **반복 UI는 React 컴포넌트** — 재사용 단위는 외워야 하는 전역 CSS 클래스가 아니라 타입이 있는 컴포넌트다. 단, **1회용은 컴포넌트로 빼지 않는다**(죽은 추상화 금지).
5. **유틸리티 우선** — 레이아웃은 Tailwind 유틸리티로. 토큰·데이터 구동 복잡 상태(hover/active, `data-*` 셀렉터)만 의미 클래스로 둔다. 의미 클래스를 쓸 땐 React 컴포넌트로 감싸 재사용 단위를 컴포넌트로 만든다.

## 테마 컨벤션 (7개 앱 공통)

- **메커니즘: `[data-theme]` 속성** (`.dark` 클래스 아님). `@custom-variant dark (&:where([data-theme=dark], [data-theme=dark] *))`.
- **`theme.ts`**: `resolveInitialTheme()` — `matchMedia` + `localStorage`로 초기 테마 결정(순수 함수, 테스트 가능).
- **`useTheme` 훅**: 테마 상태 + `data-theme` 동기화 effect + `toggle`. Next.js는 SSR 하이드레이션 불일치를 피하려 `mounted`(rAF 한 프레임)를 추가로 반환한다.
- **FOUC 인라인 스크립트**: `index.html`(Vite) 또는 `app/layout.tsx`(Next.js)에서 페인트 전에 실행. 7개 앱 모두 동일:
  ```js
  (function () {
    try {
      var t = localStorage.getItem('theme');
      if (t !== 'light' && t !== 'dark') {
        t = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }
      document.documentElement.setAttribute('data-theme', t);
    } catch (e) {}
  })();
  ```

## 셸 계약 (7개 앱 공통)

헤더는 세 슬롯으로 구성한다. 컴포넌트를 공유하지 않고 계약만 공유한다.

| 슬롯 | 규칙 |
|---|---|
| 브랜드 | 마크 40px · `--ds-radius-md` · `--primary` 배경 / `h1`은 `--ds-font-size-title` / 설명문은 `--ds-font-size-body` + `--muted`. **전체가 허브로 가는 링크**(`home`은 허브 자신이라 링크가 아니다) |
| 페이지 액션 | 앱 고유. 비어 있어도 된다 |
| 유틸리티 | 항상 최우측. **테마 토글이 마지막 요소**. 그 앞에만 앱별 유틸을 둔다 |

- 페이지 액션이 많은 앱은 2행 구조를 쓴다(`openapi-editor`). 유틸리티 슬롯은 그때도 1행의 끝이다.
- 푸터는 `home` 전용이다. 도구 앱은 full-height 워크스페이스라 세로 공간을 먹는다. 허브 복귀는 헤더 브랜드 링크가 담당한다.
- 컨테이너는 `--ds-container-narrow`(560px, 단일 폼) / `--ds-container-page`(1120px, 랜딩) / `--ds-container-wide`(1600px, 에디터) 중 하나를 쓴다.
- 아이콘 버튼은 정본 `.ds-icon-btn`(36px)을 쓰고 앱에서 얇은 컴포넌트로 감싼다. 모든 직접 조작 요소는 36px 높이를 유지한다.
- disabled는 `opacity`로 표현하지 않고 `--disabled` + `--fill-subtle` 토큰을 쓴다. `opacity`는 중첩되어 대비를 예측할 수 없게 만든다.
- 포커스링은 정본 `ds-base.css`의 전역 `:where(...):focus-visible`이 담당한다. 컴포넌트별로 반복 선언하지 않는다.
- 모달은 `<dialog>` + `showModal()`을 쓴다. 포커스 트랩·Escape·`::backdrop`·포커스 복귀를 브라우저가 제공하고 top layer에 렌더되어 z-index 경쟁에서 빠진다. `display`는 `[open]`에만 준다 — 무조건 주면 닫힌 상태의 UA 기본값 `display: none`을 덮어 항상 보인다.
- **타이포는 Tailwind 유틸리티가 아니라 CSS에서 토큰으로 쓴다.** Tailwind v4는 유틸리티를 `@layer utilities`에 넣고 CSS 캐스케이드 레이어 규칙상 레이어 밖 스타일이 이긴다. `font-size`나 `letter-spacing`을 지정하는 기존 클래스가 있으면 유틸리티가 조용히 무시된다.
- **전역 `* { margin: 0 }` 리셋이 있으면 `<dialog>` 에 `margin: auto` 를 되살린다.** `<dialog>` 는 UA 스타일시트의 `margin: auto` 로 중앙 정렬되는데 리셋이 그걸 지워 모달이 좌상단에 붙는다.
- **`file://` 로 로드되는 앱은 폰트를 상대 경로로 다시 선언한다.** 정본의 `@font-face` 는 `url("/fonts/...")` 절대 경로라 파일시스템 루트로 해석되어 실패한다. `theme.local.css` 에서 같은 family 를 상대 경로로 재선언하면 나중 `@font-face` 가 매칭에서 이기고 정본 쪽 절대 경로는 요청조차 발생하지 않는다.
- **라이트 테마 안의 상시 다크 영역은 자체 토큰을 둔다.** 사이드바·로그 패널·코드 블록처럼 늘 어두운 영역에 정본의 `--text`(거의 검정)를 그대로 쓰면 대비가 1:1 에 수렴한다. `--log-*` · `--code-*` 처럼 영역별 토큰을 두고 계산값으로 대비를 검증한다.
- **강조 텍스트는 `--primary` 가 아니라 `--primary-text` 를 쓴다.** `--primary` 는 버튼 배경·테두리·활성 표시용이고 라이트에서 `--bg` 위 4.37:1 · `--surface-2` 위 4.26:1 로 AA 에 못 미친다. `--primary-strong`/`-heavy` 는 라이트에서는 통과하지만 다크에서 어두워져 역전된다(3.29:1 · 2.84:1). `--primary-text` 만 테마별로 맞는 방향을 갖는다.
- **알파 기반 역할 표면(`--*-surface`)은 `--surface` 위를 전제한다.** 다른 틴트 위에 겹치면 대비가 떨어진다. 배지처럼 틴트된 부모 안에 놓이는 요소는 `background-color: var(--surface)` + `background-image: linear-gradient(<표면>, <표면>)` 으로 합성 기준을 고정한다.
- **`--primary-surface` 위의 글자는 `--text-neutral` 을 쓴다.** `--primary` 계열 중 두 테마 모두에서 이 표면 위 AA 를 넘는 토큰이 없다.
- **번들러가 없는 앱은 산출 CSS 대신 런타임 계산값으로 검증한다.** `getComputedStyle` 로 토큰이 실제 해석되는지 보는 쪽이 grep 보다 강한 가드다.

## 디렉터리 구조

**Vite (`src/`)**
```
theme.ts                  resolveInitialTheme
hooks/useTheme.ts
pages/*.tsx               페이지 콘텐츠
components/layout/*       Layout, Header, Footer, Background
components/ui/*           재사용 프리미티브 (Button 등)
components/icons/         인라인 SVG 모음 (있을 경우)
styles/ds-tokens.css      정본 복사본 (생성물, 편집 금지)
styles/ds-base.css        정본 복사본
styles/ds-primitives.css  정본 복사본
styles/ds-sync.test.ts    정본 복사본 (drift 검증)
styles/theme.local.css    앱 고유 토큰
styles/base.css·…         앱 고유 스타일
index.css                 @import 진입점
```

**Next.js (`app/`)**
```
theme.ts                  resolveInitialTheme
_hooks/use-theme.ts
_lib/*                    상수·도메인 헬퍼 (samples, report 등)
_components/*-client.tsx  클라이언트 오케스트레이터 (상태·핸들러 소유)
_components/*             Topbar, 패널 등 구조 컴포넌트
_components/ui/*          재사용 프리미티브
styles/ds-tokens.css      정본 복사본 (생성물, 편집 금지)
styles/ds-base.css        정본 복사본
styles/ds-primitives.css  정본 복사본
styles/ds-sync.test.ts    정본 복사본 (drift 검증)
styles/theme.local.css    앱 고유 토큰
styles/base.css·components.css   앱 고유 스타일
globals.css               @import 진입점
```

**Electron (`apps/electron/renderer/`)**
```
index.html                진입 HTML (file:// 로 로드된다)
style.css                 @import 4줄 + 앱 전체 스타일
*-screen.js               화면별 스크립트
fonts/toolhub-sans.woff2  로컬 폰트 자산
styles/ds-tokens.css      정본 복사본 (생성물, 편집 금지)
styles/ds-base.css        정본 복사본
styles/ds-primitives.css  정본 복사본
styles/ds-sync.test.ts    정본 복사본 (drift 검증)
styles/theme.local.css    앱 고유 토큰 + 로컬 @font-face
```

번들러가 없어 `style.css` 를 토픽 파일로 쪼개지 않는다. `@import` 는 런타임 요청이라 개수를 늘리면 첫 페인트가 늦어진다.

## 검증: 동작 보존 리팩토링

구조만 바꾸고 동작은 보존한다. 완료 기준은 `test`·`lint`·`typecheck`·`build` 전부 통과.

- **className·구조·텍스트를 바꾸지 않고 위치만 옮긴다** → 렌더 결과가 같아 회귀가 없다.
- 큰 CSS/데이터 블록은 손으로 옮기지 말고 `sed -n '시작,끝p'`로 **byte-exact 추출**한다(전사 오타 방지).
- UI 테스트가 없는 앱은 가드가 약하므로 **빌드 산출 CSS에 컴포넌트 클래스가 보존됐는지**를 `grep`으로 확인한다.
- 토큰을 도입할 땐 기존 값과 동일한 값으로 정의해 색상 회귀를 막는다. 값 변경은 이름 치환과 별도 커밋으로 분리해 되돌리기 쉽게 둔다.
- 산출 CSS 에서 유틸리티가 정본 토큰을 참조하는지 확인한다. `rounded-md` 가 `var(--ds-radius-md)` 를 참조해야 하며, Tailwind 기본 리터럴이 나오면 `--ds-` 매핑이 빠진 것이다.

## 새 도구에 적용하는 체크리스트

1. green baseline 확인 (`mise run check`).
2. `scripts/sync-design-tokens.mjs` 의 `TARGETS` 에 앱을 추가하고 `npm run tokens:sync`.
3. 진입 CSS 를 정본 import 순서로 교체하고 앱 고유 토큰만 `theme.local.css` 로.
4. `theme.ts` + `useTheme` 추출, 다크모드 `data-theme`로 통일.
5. 셸(Layout/Topbar)을 헤더 슬롯 계약에 맞추고 페이지 콘텐츠 분리.
6. 반복 UI를 컴포넌트로 (1회용 제외). 아이콘 버튼은 정본 `.ds-icon-btn` 을 감싼다.
7. `mise run check` + 산출 CSS 확인.
