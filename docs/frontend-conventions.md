# 프론트엔드 컨벤션 (웹 앱)

웹 도구들이 공통으로 따르는 코드 구조 규칙이다. **코드를 공유하지는 않지만**(각 앱은 독립 패키지), 모든 앱이 같은 규칙으로 작성된다.

## 적용 대상

| 스택 | 앱 |
|---|---|
| Vite + React SPA | `home`, `sign-maker` |
| Next.js App Router | `ddl-seed-generator`, `config-diff-viewer`, `dummy-file-generator` |

> `webpage-capture-tool`(Electron), `class-diagram-generator`(Kotlin)는 대상 외.

## 5대 규칙

1. **셸/콘텐츠 분리** — 진입점은 얇게 두고, 반복되는 chrome과 페이지 콘텐츠를 컴포넌트로 분리한다.
   - Vite: `App` → `Layout` → `pages/*`
   - Next.js: `app/layout.tsx`(서버 루트, html/body/FOUC/메타데이터)는 그대로 두고, **셸은 클라이언트 오케스트레이터가 렌더**한다. 상단 바(Topbar)가 Generate·비교 같은 **페이지 액션을 품기** 때문에 서버 `layout.tsx`에 넣지 않는다.
2. **CSS 주제별 분리** — `styles/`에 토픽 파일을 두고 진입 CSS는 `@import`만 담는다.
   - 진입 파일은 `@import "tailwindcss";` + 하위 파일 import만. CSS 스펙상 `@import`는 최상단에만 올 수 있다.
   - import 순서 = 캐스케이드 순서이므로 `theme → base → components` 순.
   - 콤마 그룹(`.a, .b { ... }`)이 컴포넌트 경계를 넘나들면 무리하게 쪼개지 말고 `theme / base / components` 3토픽으로 둔다.
3. **토큰 체계** — 흩어진 값(특히 브랜드 컬러)을 의미 토큰으로 중앙화한다. **각 앱이 자기 토큰을 독립적으로** 관리한다(`@theme` / `@theme inline`).
4. **반복 UI는 React 컴포넌트** — 재사용 단위는 외워야 하는 전역 CSS 클래스가 아니라 타입이 있는 컴포넌트다. 단, **1회용은 컴포넌트로 빼지 않는다**(죽은 추상화 금지).
5. **유틸리티 우선** — 레이아웃은 Tailwind 유틸리티로. 토큰·데이터 구동 복잡 상태(hover/active, `data-*` 셀렉터)만 의미 클래스로 둔다. 의미 클래스를 쓸 땐 React 컴포넌트로 감싸 재사용 단위를 컴포넌트로 만든다.

## 테마 컨벤션 (5개 앱 공통)

- **메커니즘: `[data-theme]` 속성** (`.dark` 클래스 아님). `@custom-variant dark (&:where([data-theme=dark], [data-theme=dark] *))`.
- **`theme.ts`**: `resolveInitialTheme()` — `matchMedia` + `localStorage`로 초기 테마 결정(순수 함수, 테스트 가능).
- **`useTheme` 훅**: 테마 상태 + `data-theme` 동기화 effect + `toggle`. Next.js는 SSR 하이드레이션 불일치를 피하려 `mounted`(rAF 한 프레임)를 추가로 반환한다.
- **FOUC 인라인 스크립트**: `index.html`(Vite) 또는 `app/layout.tsx`(Next.js)에서 페인트 전에 실행. 5개 앱 모두 동일:
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

## 디렉터리 구조

**Vite (`src/`)**
```
theme.ts                  resolveInitialTheme
hooks/useTheme.ts
pages/*.tsx               페이지 콘텐츠
components/layout/*       Layout, Header, Footer, Background
components/ui/*           재사용 프리미티브 (Button 등)
components/icons/         인라인 SVG 모음 (있을 경우)
styles/theme.css·base.css·…
index.css                @import 진입점
```

**Next.js (`app/`)**
```
theme.ts                  resolveInitialTheme
_hooks/use-theme.ts
_lib/*                    상수·도메인 헬퍼 (samples, report 등)
_components/*-client.tsx  클라이언트 오케스트레이터 (상태·핸들러 소유)
_components/*             Topbar, 패널 등 구조 컴포넌트
_components/ui/*          재사용 프리미티브
styles/theme.css·base.css·components.css
globals.css              @import 진입점
```

## 검증: 동작 보존 리팩토링

구조만 바꾸고 동작은 보존한다. 완료 기준은 `test`·`lint`·`typecheck`·`build` 전부 통과.

- **className·구조·텍스트를 바꾸지 않고 위치만 옮긴다** → 렌더 결과가 같아 회귀가 없다.
- 큰 CSS/데이터 블록은 손으로 옮기지 말고 `sed -n '시작,끝p'`로 **byte-exact 추출**한다(전사 오타 방지).
- UI 테스트가 없는 앱은 가드가 약하므로 **빌드 산출 CSS에 컴포넌트 클래스가 보존됐는지**를 `grep`으로 확인한다.
- 토큰을 도입할 땐 기존 값과 동일한 값으로 정의해 색상 회귀를 막는다(예: 브랜드 토큰을 Tailwind 팔레트의 컴파일 값과 동일하게).

## 새 도구에 적용하는 체크리스트

1. green baseline 확인 (`test`/`lint`/`typecheck`/`build`).
2. `theme.ts` + `useTheme` 추출, 다크모드 `data-theme`로 통일.
3. `styles/` 주제별 CSS 분리 (`@import` 진입점).
4. 셸(Layout/Topbar)과 페이지 콘텐츠 분리.
5. 반복 UI를 컴포넌트로 (1회용 제외).
6. 검증 + 클래스 보존 확인.
