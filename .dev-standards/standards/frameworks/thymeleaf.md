# Thymeleaf Guidelines & Standards

Thymeleaf template은 server-side business logic을 옮겨 놓는 곳이 아니라 유효한 HTML
prototype에 view model을 선언적으로 결합하는 표현 계층이어야 합니다. Natural Template,
기본 escaping과 fragment composition을 유지합니다.

## 1. Thymeleaf다운 기본 원칙

- template은 유효한 semantic HTML로 먼저 읽혀야 하며 `th:*` attribute는 server rendering
  동작만 보강합니다.
- controller가 화면에 필요한 view model을 준비하고 template에서 repository 호출,
  복잡한 계산이나 상태 변경을 하지 않습니다.
- entity를 model에 직접 노출하지 않고 화면에 필요한 값과 권한만 가진 view model을
  전달합니다.
- 반복되는 markup은 fragment로 만들되 너무 작은 tag까지 추상화해 template 흐름을
  분산시키지 않습니다.

## 2. 권장 아키텍처

Spring MVC와 함께 사용할 때는 `application query → controller → view model → template`
흐름을 기본으로 합니다. template은 이미 표시 가능한 view model만 받고 application
service나 persistence model에 직접 접근하지 않습니다.

```text
src/main/
├─ java/com/example/shop/order/
│  ├─ application/OrderDetailQuery.java
│  └─ web/
│     ├─ OrderPageController.java
│     └─ OrderDetailView.java
└─ resources/
   ├─ templates/
   │  ├─ fragments/navigation.html
   │  └─ orders/detail.html
   ├─ messages.properties
   └─ static/
```

- controller는 route와 model attribute 계약을 소유하고 application query 결과를 view
  model로 변환합니다.
- view model은 formatting된 값과 권한별 표시 상태를 제공하되 template 전용 HTML을
  생성하지 않습니다.
- fragment는 공통 navigation, form field와 layout을 소유하고 feature template은 화면
  조립과 조건부 표시만 담당합니다.

```java
@Controller
@RequestMapping("/orders")
final class OrderPageController {
    private final OrderDetailQuery orderDetails;

    OrderPageController(OrderDetailQuery orderDetails) {
        this.orderDetails = orderDetails;
    }

    @GetMapping("/{orderId}")
    String detail(@PathVariable long orderId, Model model) {
        model.addAttribute("order", orderDetails.get(orderId));
        return "orders/detail";
    }
}
```

```html
<article th:object="${order}">
  <h1 th:text="*{displayName}">Example order</h1>
  <p th:text="*{formattedTotal}">$0.00</p>
</article>
```

## 3. Controller와 template 계약

- model attribute 이름과 nullable 여부를 화면 계약으로 관리합니다.
- optional section은 `th:if`로 명시하고 필수 attribute 누락을 빈 문자열로 숨기지
  않습니다.
- 날짜, 통화와 domain-specific label은 controller/view formatter에서 준비하거나
  일관된 Thymeleaf utility를 사용합니다.
- redirect와 validation 실패 시 필요한 form data와 error가 유지되는지 검증합니다.

## 4. Fragment와 layout

- header, navigation, field group처럼 재사용 의미가 있는 단위를 `th:fragment`로
  정의하고 필요한 값은 fragment parameter로 전달합니다.
- fragment가 암묵적인 session/global model attribute에 과도하게 의존하지 않게 합니다.
- `th:replace`와 `th:insert`의 DOM 결과 차이를 이해하고 불필요한 wrapper가 생기지 않게
  선택합니다.
- layout 구조와 page-specific content 책임을 분리합니다.

```html
<nav th:fragment="navigation(currentPage)" aria-label="Primary">
  <a th:href="@{/orders}" th:aria-current="${currentPage == 'orders'} ? 'page'">Orders</a>
</nav>
```

## 5. Escaping과 script 경계

- 사용자 또는 외부 입력은 기본 escaping이 적용되는 `th:text`와 `[[...]]`를 사용합니다.
- `th:utext`와 unescaped inline expression은 신뢰된 HTML 생성 경로와 sanitization 근거가
  없으면 사용하지 않습니다.
- server 값을 JavaScript 문자열로 직접 이어 붙이지 않고 JavaScript inlining 또는
  `data-*` attribute의 context-aware escaping을 사용합니다.
- CSP를 사용하는 프로젝트는 inline script와 event handler를 만들지 않습니다.

## 6. Form과 URL

- form 객체는 `th:object`, field는 `th:field`, 오류는 `#fields`로 일관되게 연결하여
  binding name과 validation message가 어긋나지 않게 합니다.
- state-changing form에는 framework security 설정에 맞는 CSRF token이 포함되는지
  검증합니다.
- context path와 encoding이 반영되도록 URL은 `@{...}`로 생성하고 문자열 결합을
  피합니다.
- label의 `for`, input `id`, 오류 설명과 focus 이동을 연결합니다.

## 7. 조건, 반복과 표현식

- 짧은 표시 조건과 iteration만 template에 두고 복합 business condition은 view model의
  의미 있는 boolean/value로 변환합니다.
- 반복 element에는 화면과 automation에서 안정적인 식별 기준을 둡니다.
- locale text는 message expression `#{...}`을 사용하고 사용자 노출 문자열을 여러
  template에 중복하지 않습니다.
- empty/loading/error 상태를 정상 목록과 별도 markup으로 표현합니다.

## 8. 테스트

- 중요한 화면은 controller/model contract와 실제 rendered HTML을 함께 검증합니다.
- escaping, validation error, role별 노출, locale, context path URL을 테스트합니다.
- fragment 변경은 사용하는 page의 DOM 구조와 accessibility name에 미치는 영향을
  확인합니다.

## 9. Thymeleaf 안티패턴

- template expression에서 service/repository 호출과 복잡한 domain 계산
- `th:utext`로 사용자 입력 출력
- entity graph를 그대로 model에 노출해 lazy loading과 N+1 유발
- 복사한 header/form markup을 page마다 독립 수정

참고: [Using Thymeleaf](https://www.thymeleaf.org/doc/tutorials/3.1/usingthymeleaf.html),
[Thymeleaf + Spring](https://www.thymeleaf.org/doc/tutorials/3.1/thymeleafspring.html)
