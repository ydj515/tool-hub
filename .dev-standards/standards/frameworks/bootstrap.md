# Bootstrap Guidelines & Standards

Bootstrap 코드는 임의 CSS 위에 class를 덧붙이는 방식이 아니라 framework의 component
markup, mobile-first grid와 utility scale을 일관되게 조합해야 합니다. Bootstrap을
사용하는 영역과 별도 design system 영역의 경계를 먼저 정합니다.

## 1. Bootstrap다운 기본 원칙

- semantic HTML을 먼저 선택하고 Bootstrap class는 layout, component state와 시각 표현을
  보강합니다.
- component documentation의 필수 markup, role, data attribute와 JavaScript lifecycle을
  유지합니다.
- spacing, color와 breakpoint는 Bootstrap Sass variable/CSS variable과 utility scale을
  사용하고 비슷한 raw 값을 반복하지 않습니다.
- Bootstrap component를 project abstraction으로 감쌀 때 원래 접근성, state와 responsive
  behavior를 보존합니다.

## 2. 권장 아키텍처

Bootstrap은 `Sass/CSS variable 설정 → Bootstrap primitive → project component → page`
순으로 적용합니다. theme와 import는 한 entry에서 조립하고 page는 Bootstrap JavaScript
instance의 lifecycle을 직접 분산 소유하지 않습니다.

```text
src/
├─ styles/
│  ├─ _variables.scss            # Bootstrap variable override
│  ├─ _components.scss           # project semantic component
│  └─ app.scss                   # Bootstrap과 project style 조립
├─ bootstrap/
│  └─ lifecycle.ts               # imperative component 초기화가 필요할 때만
├─ components/                   # template partial 또는 UI wrapper
└─ pages/
```

- 의존 방향은 `pages → project components → Bootstrap component/utility → theme`입니다.
- Bootstrap Sass를 여러 entry에서 각각 compile하지 않고 application bundle 한 곳에서
  theme와 필요한 module을 조립합니다.
- React/Vue wrapper를 사용하면 wrapper가 lifecycle을 소유하고 별도 data API 초기화를
  섞지 않습니다. server template은 partial이 markup 계약을 소유합니다.

```scss
@import "bootstrap/scss/functions";

$primary: #0057b8;
$border-radius: 0.5rem;

@import "bootstrap/scss/bootstrap";
@import "components";
```

변수 override는 Bootstrap import 전에 선언하고 product component style은 import 뒤의
명시적인 layer에서 관리합니다.

## 3. Grid와 responsive layout

- 기본 grid는 `container → row → col-*` 구조와 gutter 계약을 따릅니다.
- mobile-first로 unprefixed column을 기본값에 사용하고 더 큰 breakpoint에서
  `col-md-*` 등을 추가합니다.
- Grid, flex utility와 custom CSS Grid를 같은 영역에서 중복 제어하지 않습니다.
- negative margin, nested row와 gutter 제거가 overflow를 만들지 작은 viewport에서
  확인합니다.

```html
<main class="container py-4">
  <div class="row g-3">
    <section class="col-12 col-lg-8">...</section>
    <aside class="col-12 col-lg-4">...</aside>
  </div>
</main>
```

## 4. Utility와 custom style

- 한두 속성의 layout/spacing 조정은 utility를 사용합니다.
- 반복되는 product component와 복잡한 state는 semantic class 또는 component wrapper로
  올리고 utility 조합을 화면마다 복사하지 않습니다.
- 논리 방향 utility인 `ms-*`, `me-*`를 사용해 RTL 가능성을 보존합니다.
- `!important`와 specificity 경쟁으로 Bootstrap을 덮기보다 Sass/CSS variable 또는
  supported customization point를 사용합니다.

## 5. Component와 JavaScript

- Modal, Dropdown, Collapse, Tooltip 등은 한 lifecycle owner만 둡니다. Bootstrap data API와
  framework wrapper가 같은 DOM을 동시에 초기화하지 않습니다.
- 동적으로 mount/unmount하는 UI는 event listener와 component instance를 dispose합니다.
- DOM query와 imperative mutation이 React/Vue 등의 render ownership과 충돌하지 않게
  adapter boundary를 둡니다.
- 비활성 상태와 loading 상태를 class만으로 표현하지 말고 실제 `disabled`,
  `aria-disabled`와 focus 동작을 맞춥니다.

## 6. Theme과 접근성

- brand color와 component 기본값은 중앙 theme에서 관리하고 page별 override를
  최소화합니다.
- semantic button/link, label, heading 구조를 유지하고 color만으로 상태를 구분하지
  않습니다.
- Bootstrap 기본 palette나 theme override가 프로젝트의 색 대비 기준을 자동 보장한다고
  가정하지 말고 실제 text, control과 state 조합을 검증합니다.
- responsive display utility로 content를 숨길 때 assistive technology와 keyboard 접근
  요구를 확인합니다.
- modal focus, offcanvas navigation, validation message와 reduced motion을 테스트합니다.

## 7. Asset과 테스트

- 사용 방식에 맞는 CSS/JavaScript bundle만 포함하고 Popper나 전체 bundle을 중복
  로드하지 않습니다.
- Bootstrap major와 icon/plugin 버전을 lockfile에 고정하고 markup migration을 함께
  검토합니다.
- mobile/desktop viewport, keyboard, focus, RTL 지원 대상과 production asset 크기를
  확인합니다.

## 8. Bootstrap 안티패턴

- `.row`/`.col-*` 계약을 무시한 grid, 과도한 nested grid와 음수 margin 보정
- data API와 직접 JavaScript 초기화를 동시에 사용
- raw CSS와 `!important`로 theme를 화면마다 재정의
- semantic element 없이 clickable `div`와 color-only validation 사용

참고: [Bootstrap Grid](https://getbootstrap.com/docs/5.3/layout/grid/),
[Layout Utilities](https://getbootstrap.com/docs/5.3/layout/utilities/),
[Accessibility](https://getbootstrap.com/docs/5.3/getting-started/accessibility/)
