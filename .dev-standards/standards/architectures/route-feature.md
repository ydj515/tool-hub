# Route-Feature Architecture Guidelines & Standards

Route-feature 구조는 filesystem routing과 server/client 실행 경계를 먼저 표현하고 route가
조립하는 업무 기능을 feature로 분리합니다. 이 저장소에서는 App Router 기반 Next.js
애플리케이션의 기본 profile로 사용합니다.

## 1. 적용 기준

- URL segment, layout, loading/error/not-found 경계가 애플리케이션 구조의 중심입니다.
- Server Component를 기본으로 유지하면서 interactive leaf만 Client Component로
  분리해야 합니다.
- 여러 route가 공유하는 query, mutation과 UI를 feature 공개 API로 관리합니다.
- 외부 HTTP 계약과 내부 Server Component data access를 구분해야 합니다.

## 2. 기본 구조와 의존 방향

```text
src/
├─ app/
│  ├─ (shop)/orders/[orderId]/
│  │  ├─ page.tsx
│  │  ├─ loading.tsx
│  │  ├─ error.tsx
│  │  └─ _components/OrderActions.tsx
│  └─ api/orders/
│     ├─ route.ts
│     ├─ schema.ts                 # CreateOrderRequest/OrderResponse
│     └─ errorResponse.ts
├─ features/orders/
│  ├─ server/loadOrder.ts
│  ├─ server/placeOrder.ts
│  ├─ server/ports.ts
│  ├─ server/errors.ts
│  ├─ server/adapters/orderRepository.ts
│  ├─ model/orderView.ts
│  ├─ model/placeOrderState.ts
│  └─ ui/OrderDetails.tsx
└─ components/ui/Button.tsx
```

- 의존 방향은 `app route → feature public API → server adapter`입니다.
- `app/`은 URL, layout, metadata와 rendering boundary를 소유합니다.
- route 전용 component는 route에 colocate하고 여러 route가 공유하는 업무 동작과 표현은
  feature로 올립니다.
- server-only module은 client import graph에 노출하지 않습니다.
- Server Component는 같은 애플리케이션의 Route Handler를 HTTP로 다시 호출하지 않고
  server feature API를 직접 사용합니다.

## 3. DTO와 오류 위치

| 종류 | 샘플 파일 | 소유권 |
| --- | --- | --- |
| 외부 request/response schema | `app/api/orders/schema.ts` | HTTP contract와 runtime validation |
| Route error response | `app/api/orders/errorResponse.ts` | 내부 오류를 status/body로 변환 |
| Server use case params/result | `features/orders/server/placeOrder.ts` | framework request와 무관한 operation 계약 |
| Client view model | `features/orders/model/orderView.ts` | 직렬화 가능한 최소 data |
| Expected action state | `features/orders/model/placeOrderState.ts` | success/rejected/error UI 상태 |
| Domain/application error | `features/orders/server/errors.ts` | server use case가 분기하는 의미 있는 실패 |
| Data source error | `features/orders/server/adapters/orderRepository.ts` 내부 | DB/remote 원인 보존 |
| Render error boundary | `app/(shop)/orders/[orderId]/error.tsx` | 화면 fallback, reset과 관찰 |

`error.tsx`는 domain exception 저장 위치가 아닙니다. Route Handler와 Server Action이
내부 오류를 외부 response 또는 expected action state로 명시적으로 변환합니다.

## 4. 샘플 요청 흐름

```text
page.tsx
  → features/orders/server/loadOrder
  → orderRepository
  → orderView
  → OrderDetails

OrderActions
  → Server Action / placeOrder
  → placeOrderState
  → revalidation or redirect
```

외부 client 요청은 `app/api/orders/route.ts → schema.ts → server use case →
errorResponse.ts` 경로를 사용합니다. 내부 Server Component 조회는 Route Handler를 거치지
않습니다.

## 5. 경계와 검증

- Server에서 Client Component로 class instance, database row와 secret field를 전달하지
  않고 직렬화 가능한 view model로 변환합니다.
- Server Action과 Route Handler는 authentication, authorization과 input validation을
  각각의 실행 경계에서 수행합니다.
- cache key, tag와 invalidation에 tenant/authorization context를 반영합니다.
- build에서 server-only/client-only import, serialization과 dynamic API 제약을 검증합니다.
- route contract는 integration/E2E로, feature의 순수 mapping과 state는 단위 테스트합니다.

## 6. 피해야 할 구조

- page/layout 전체를 편의상 Client Component로 전환
- ORM row나 외부 API DTO를 Client Component props로 직접 전달
- `error.tsx`를 domain/application exception 저장 위치로 오해
- route마다 동일한 query, mutation과 mapping을 복사
- `app/` directory를 범용 domain/service 저장소로 사용
- server secret이나 privileged adapter를 client feature에서 import

참고: [Next.js Project Structure](https://nextjs.org/docs/app/getting-started/project-structure),
[Server and Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components)
