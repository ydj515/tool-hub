# Tailwind CSS Guidelines & Standards

Tailwind 코드는 utility class를 임의 값의 모음으로 사용하는 것이 아니라 제한된 theme
token과 variant를 markup에서 조합하는 방식이어야 합니다. 반복은 CSS 추상화보다
component 경계에서 먼저 제거하고 source detection이 정적으로 인식할 class를 사용합니다.

## 1. Tailwind다운 기본 원칙

- spacing, color, typography와 breakpoint는 theme token을 사용합니다. arbitrary value는
  실제로 한 번뿐인 값이나 외부 layout 계약에 한정합니다.
- utility 묶음이 product 의미와 동작을 함께 가지면 framework component로 추출합니다.
  단지 class 문자열을 짧게 만들기 위해 모든 조합을 CSS class로 감추지 않습니다.
- CSS cascade가 더 자연스러운 base typography, third-party content와 복잡한 animation은
  일반 CSS/layer와 역할을 나눕니다.
- formatter가 class 순서를 관리하는 프로젝트에서는 수동 정렬 규칙과 충돌시키지
  않습니다.

## 2. 권장 아키텍처

Tailwind 구조는 `theme token → 공용 UI component → feature component → page` 순으로
구성합니다. utility는 markup 가까이에 유지하고 반복되는 구조와 행위는 사용하는 UI
framework의 component 또는 server template fragment로 올립니다.

```text
src/
├─ styles/
│  └─ app.css                    # Tailwind import, theme token, base style
├─ components/ui/                # Button, Input, Dialog
├─ features/orders/components/   # OrderCard, OrderFilters
└─ pages/                        # feature 화면 조립
```

- 의존 방향은 `pages/features → components/ui → theme token`입니다. 공용 component는
  feature의 status나 API model을 직접 알지 않습니다.
- `app.css`는 token과 전역 base 계약을 소유하고, component별 utility 조합을 다시 중앙
  CSS selector로 옮기지 않습니다.
- 단일 HTML/server-template 프로젝트에서는 `components/ui` 대신 fragment/partial을
  사용해도 같은 소유권을 유지합니다.

```css
@import "tailwindcss";

@theme {
  --color-brand-500: oklch(0.62 0.18 252);
  --radius-control: 0.5rem;
}
```

feature는 `bg-brand-500`, `rounded-control`처럼 공유 token으로 생성된 utility를 사용하고
raw brand 값을 복제하지 않습니다.

## 3. Theme과 variant

- Tailwind major에 맞는 theme 방식으로 design token을 한 곳에서 관리합니다. v4를
  사용하는 경우 CSS theme variable과 공식 migration 계약을 따릅니다.
- `hover`, `focus-visible`, `disabled`, `aria-*`, `data-*`, dark mode variant로 UI state를
  명시합니다.
- 같은 semantic component의 variant는 허용된 전체 class 문자열 map으로 관리합니다.
- 사용자 입력이나 API 값으로 class 이름을 직접 만들지 않습니다.

```tsx
const toneClasses = {
  primary: "bg-blue-600 text-white hover:bg-blue-700",
  danger: "bg-red-600 text-white hover:bg-red-700",
} as const;

function Button({ tone }: { tone: keyof typeof toneClasses }) {
  return <button className={`rounded px-4 py-2 ${toneClasses[tone]}`}>Save</button>;
}
```

## 4. Source detection과 동적 class

- Tailwind는 source를 일반 text로 scan하므로 `bg-${color}-600` 같은 조립된 class를
  생성하지 않습니다.
- monorepo, 외부 package와 비표준 template 경로는 pinned major의 source 등록 방식으로
  명시합니다.
- safelist 또는 강제 source 등록은 실제 dynamic content contract에 한정하고 전체 색상
  체계처럼 광범위하게 열지 않습니다.
- build 후 필요한 state/variant class가 생성됐는지 production CSS에서 검증합니다.

## 5. Responsive layout

- unprefixed utility를 mobile 기본값으로 두고 `sm:`, `md:` 등에서 점진적으로
  확장합니다. `sm:`을 mobile 전용 조건으로 오해하지 않습니다.
- page viewport보다 component container가 기준인 UI는 container query 사용을
  검토합니다.
- breakpoint를 device 이름이 아니라 layout이 깨지는 content 기준으로 선택합니다.
- fixed width와 overflow를 desktop에서만 확인하지 않고 작은 viewport와 확대/긴 text에서
  검증합니다.

## 6. Class composition

- 조건부 class utility를 사용하면 프로젝트에서 하나를 선택하고 여러 helper를 섞지
  않습니다.
- 충돌 가능한 utility를 runtime에서 합칠 필요가 있는지 먼저 확인하고, 무분별한 class
  merge가 설계 token 충돌을 숨기지 않게 합니다.
- 긴 class 목록은 layout, typography, state 순으로 읽을 수 있게 정렬하되 formatter의
  canonical 결과를 우선합니다.
- `@apply`는 third-party markup이나 반복되는 CSS-only abstraction처럼 component 추출이
  불가능한 경계에서 제한적으로 사용합니다.

## 7. 접근성과 테스트

- semantic HTML과 accessible name을 utility class보다 먼저 확보합니다.
- `hidden`, opacity, transform으로 상태를 바꿀 때 focusability와 screen reader 노출을
  함께 확인합니다.
- light/dark, hover/focus/disabled/error, reduced motion과 forced colors를 지원 범위에
  맞게 검증합니다.
- production build에서 source detection 누락과 CSS 크기 변화를 확인합니다.

## 8. Tailwind 안티패턴

- 임의 값과 raw hex color를 화면마다 반복
- runtime 문자열 조합으로 class 이름 생성
- mobile-first 의미를 반대로 사용하거나 desktop 한 폭에서만 검증
- 모든 utility 묶음을 `@apply`로 숨겨 Tailwind와 component 구조의 장점을 모두 잃음

참고: [Detecting classes](https://tailwindcss.com/docs/detecting-classes-in-source-files),
[Responsive design](https://tailwindcss.com/docs/responsive-design),
[Theme variables](https://tailwindcss.com/docs/theme),
[Styling with utility classes](https://tailwindcss.com/docs/styling-with-utility-classes)
