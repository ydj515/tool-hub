# 디자인 시스템 구조와 유지보수

## 배포 경계

각 도구는 독립 package와 lockfile로 빌드한다. 공통 UI는 [정본 디렉터리](../packages/design-system/)에서 각 앱 내부로 생성하여 커밋한다. 앱이 런타임에 루트 정본을 import하지 않으므로 앱 디렉터리만 배포하는 구조를 유지할 수 있다. 복사본이 늘어나는 비용은 자동 drift 검사로 관리한다.

| 대상 | 받는 내용 |
|---|---|
| `home`과 7개 웹 도구 | 토큰, 기본 CSS, 제품별 파비콘 |
| 7개 웹 도구 | React 프리미티브, 제품 metadata, 공통 셸 E2E |
| `webpage-capture-tool` | 토큰·CSS와 테스트; Electron 워크벤치 유지 |
| `class-diagram-generator` | `ds-tokens.css`, `ds-base.css`; Thymeleaf 화면 유지 |

`home`은 평면형 sticky 헤더와 Tool Hub 마스터 마크를 사용한다. 도구용 카드형 헤더 대상이 아니다. Kotlin 앱의 토큰 CSS 동기화는 과거의 전면 제외 방침을 대체한다.

## 정본과 생성 경로

- [products.mjs](../packages/design-system/products.mjs): 제품 ID, English Title Case 표시명, 한국어 설명, 아이콘, E2E 포트와 생성 대상
- [components](../packages/design-system/components/): `ToolHeader`, `BrandMark`, `ThemeToggle`, `Button`, `SegmentedControl`, `EmptyState`, `Badge`
- [tokens.css](../packages/design-system/tokens.css), [base.css](../packages/design-system/base.css), [primitives.css](../packages/design-system/primitives.css): 값·기본 스타일·컴포넌트 표현
- [동기화 스크립트](../scripts/sync-design-system.mjs): 대상 검증, 예상 생성물 계산, 기록과 비교
- [파비콘 생성기](../scripts/build-favicons.mjs): 제품별 SVG·PNG·ICO 자산 생성

Vite의 컴포넌트 생성 위치는 `src/components/design-system/`, Next.js는 `app/_components/design-system/`이다. `product.generated.ts`와 E2E helper도 앱 내부에 둔다. 정확한 파일 대응표는 [정본 README](../packages/design-system/README.md)에 있다.

동기화는 제품·경로·아이콘·의존성·파비콘 입력을 검증한 뒤 예상 파일을 만든다. 입력 검증 실패 시 쓰지 않는다. 파일은 임시 파일과 rename으로 교체하지만 저장소 전체가 하나의 트랜잭션은 아니므로 디스크 장애 뒤에는 다시 drift 검사를 수행한다. `--check`는 생성물을 쓰지 않고 예상 바이트와 실제 파일을 비교한다.

## 토큰과 테마

공통 색·타이포·간격·반경·그림자·모션·층위는 정본에 둔다. 앱 고유 값은 `theme.local.css`에 둔다. 같은 토큰이 3개 이상 앱에 반복되면 정본 승격을 검토한다. `--scrim`처럼 의미와 값이 명확하게 같은 경우에는 2개 앱에서도 공유한다.

- 테마는 `[data-theme]`로 선택한다. `theme.ts`의 초기값 해석, `useTheme`, 페인트 전 스크립트가 같은 저장값/시스템 설정 계약을 따른다.
- Tailwind 이름과 충돌하는 값은 `--ds-*` 이름을 쓰고 `@theme inline`에서 연결한다. `--ds-font-mono`도 이 규칙을 따른다.
- import 순서는 토큰 → 기본 CSS → 프리미티브 → 앱 테마 → 앱 기본/컴포넌트다.
- 밝은 페이지 안의 어두운 코드 영역에는 `--inverse-bg`, `--inverse-text`, `--inverse-line`을 쓴다. 테마에 따라 흰색으로 바뀌는 Monaco 배경은 앱 고유 토큰이다.
- Electron의 상태와 탭을 가진 로그 콘솔은 자체 토큰을 유지한다. 반전 표면이라는 이유만으로 도메인 상태색을 공통 색으로 바꾸지 않는다.
- `--primary`는 액션 배경·경계에 사용하고 강조 텍스트는 `--primary-text`를 사용한다. 입력 경계는 장식선 `--line` 대신 `--control-border`를 사용한다.
- disabled는 opacity를 겹쳐 낮추지 않고 `--disabled`와 표면 토큰으로 표현한다.

Electron은 `file://`에서 절대 폰트 URL이 파일시스템 루트로 해석되므로 로컬 상대 경로의 `@font-face`를 사용한다. Kotlin 앱은 `static/css/mmu/tokens.css`에서 기존 `--mmu-*` 이름을 정본 토큰에 연결한다.

## 공통 셸과 프리미티브

`ToolHeader`는 브랜드, 페이지 액션, 유틸리티를 배치하며 도메인 상태를 소유하지 않는다. 앱이 이벤트·상태를 props로 전달한다. 브랜드 전체는 허브 링크이고 테마 토글은 유틸리티의 마지막 요소다.

| 요소 | 계약 |
|---|---|
| 브랜드 | 40×40px 프레임, 12px 반경, 제품별 Lucide 아이콘 |
| 카드 헤더 | 표면·경계·그림자와 16px 반경 |
| 아이콘 | 16px, stroke 2, currentColor |
| Button | 높이 36px; primary/secondary/ghost/danger/icon; 기본 type=button |
| icon Button | 36×36px, 접근성 이름 필요 |
| SegmentedControl | 외곽 36px, 단일 선택, group/aria-pressed; 실제 탭 의미는 앱이 관리 |
| EmptyState | 아이콘·제목·설명·선택 액션; 동적 알림은 앱이 관리 |
| Badge | neutral/primary/success/warning/danger; 색 외에 상태 텍스트 제공 |

768px 이상은 한 줄 헤더, 그 미만은 브랜드/테마와 액션을 두 줄로 배치한다. OpenAPI Editor도 이 규칙을 따른다. CSS 분기는 768/1024/1280px이며 375px은 검증 폭이다. 컨테이너 폭은 정본 narrow/page/wide 토큰을 사용한다.

7개 도구의 Lucide 버전은 현재 정본 검사에서 `1.14.0`으로 고정한다. 파비콘은 SVG, ICO, 16/32px PNG, 180px Apple 아이콘과 manifest를 묶어 동기화한다. 표시명은 metadata를 따르고 UI는 한국어, 기술 식별자·HTTP method·코드·단위는 원문을 유지한다.

## 유지보수 절차

1. 변경 전 관련 앱의 검증 상태를 확인한다.
2. 정본을 수정한다. 토큰 이름 변경과 시각 값 변경은 구분해 검토한다.
3. 루트에서 아래 명령을 실행하고 생성물 차이를 함께 검토한다.
4. 영향받는 앱의 test/lint/typecheck/build/E2E를 실행한다.

```bash
npm run design-system:sync
npm run design-system:check
npm run design-system:test
```

공통 모달은 `<dialog>`와 `showModal()`을 사용한다. 전역 margin reset이 있으면 `margin: auto`를 복구하고, display는 `[open]`에만 지정한다. 모달 위 알림은 일반 z-index만으로 top layer를 넘을 수 없다. 자세한 CSS·폴더 규칙은 [프론트엔드 컨벤션](frontend-conventions.md), 검증 범위는 [UI 검증](ui-verification.md)을 따른다.
