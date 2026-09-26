# Next.js + TypeScript Guidelines & Standards

이 문서는 App Router를 사용하는 Next.js 프로젝트의 기본 방향을 정의합니다. Next.js는
version별 caching과 rendering 계약 변화가 크므로 고정된 major의 공식 문서를 기준으로
검증하고, Server Component 기본값과 명시적인 client boundary를 유지합니다.

## 1. Next.js다운 기본 원칙

- `app/`의 page와 layout은 기본 Server Component로 유지합니다.
- state, event handler, lifecycle 또는 browser API가 필요한 가장 작은 entry에만
  `"use client"`를 선언합니다. 한 번 선언하면 그 아래 import graph가 client bundle에
  포함됨을 고려합니다.
- Server Component는 data source 가까이에서 직접 조회하고 같은 app의 Route Handler를
  HTTP로 다시 호출하지 않습니다.
- route segment는 URL과 loading/error/not-found 경계를 반영하고 shared UI는 layout으로
  구성합니다.

## 2. Next.js 적용: route-feature

Next.js를 선택하고 `architectures`를 생략하면 `route-feature` profile을 함께 적용합니다.
App Router 프로젝트는 URL과 rendering boundary를 `app/`에 표현하고, route가 조립하는
domain 기능은 별도 feature에 둡니다. Next.js가 폴더 layout 하나를 강제하지는 않으므로
route colocation과 top-level feature 중 하나를 일관되게 선택합니다.

```text
src/
├─ app/
│  ├─ (shop)/
│  │  ├─ layout.tsx
│  │  └─ orders/[orderId]/
│  │     ├─ page.tsx            # Server Component, 화면 조립
│  │     ├─ loading.tsx
│  │     ├─ error.tsx
│  │     └─ _components/
│  │        └─ order-actions.tsx # 필요한 최소 Client Component
│  └─ api/webhooks/payment/route.ts
├─ features/orders/
│  ├─ server/                    # server-only query, mutation, adapter
│  ├─ model/                     # serializable DTO와 domain type
│  └─ ui/                        # 재사용 가능한 Server/Client component
└─ components/ui/
```

- 의존 방향은 `app route → feature public API → data source adapter`입니다. `page.tsx`는
  route parameter, authorization, data loading과 화면 조립을 담당합니다.
- Server Component가 기본 경계이며 interactive leaf만 Client Component가 됩니다.
  server-only module은 client feature의 import graph에 노출하지 않습니다.
- `_components`는 route 내부 구현, route group은 URL을 바꾸지 않는 layout/조직 경계로
  사용합니다. 외부 client용 HTTP 계약만 Route Handler에 둡니다.

```tsx
import { loadOrder } from "@/features/orders/server/load-order";
import { OrderDetails } from "@/features/orders/ui/order-details";

export default async function OrderPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  const order = await loadOrder(orderId);
  return <OrderDetails order={order} />;
}
```

이 page는 직접 database 세부 구현이나 client state를 소유하지 않고 server feature의 공개
query와 serializable view data만 사용합니다.

## 3. Server와 Client 경계

- secret, privileged data access와 server-only module은 Server Component, Server Action
  또는 Route Handler에 둡니다.
- Server에서 Client Component로 넘기는 props는 직렬화 가능한 최소 data로 제한합니다.
- interactive leaf를 Client Component로 만들고 page 전체를 편의상 client로 전환하지
  않습니다.
- provider는 필요한 subtree에 최대한 깊게 배치해 static server tree를 유지합니다.
- `server-only`/`client-only` 경계 또는 동일한 역할의 project convention으로 잘못된
  import를 build에서 발견하게 합니다.

## 4. Data fetching, streaming과 cache

- 독립 조회는 병렬로 시작하고 순차 dependency만 await chain으로 유지합니다.
- 느린 subtree는 `loading.tsx` 또는 의미 있는 `<Suspense>` fallback으로 stream합니다.
- cache 여부, lifetime과 invalidation을 각 data source의 freshness 계약으로 결정합니다.
- 최신 major에서 Cache Components를 채택했다면 `use cache`, `cacheLife`, cache tag를
  일관되게 사용합니다. 이전 major의 `revalidate` 관용구와 섞기 전에 migration 문서를
  확인합니다.
- 사용자별 또는 권한별 data를 shared cache에 넣지 않습니다. cache key가 tenant와
  authorization context를 포함하는지 검증합니다.

## 5. Mutation과 권한

- Server Action은 mutation 경계에 사용하고 일반 data fetching 수단으로 남용하지
  않습니다.
- Client에서 숨겼다는 이유로 안전하다고 가정하지 말고 Action과 Route Handler 내부에서
  authentication, authorization과 input validation을 다시 수행합니다.
- mutation 성공 후 redirect, optimistic state와 cache invalidation 순서를 명시합니다.
- idempotency가 필요한 submit에는 stable request key와 중복 실행 처리 정책을 둡니다.

## 6. Route Handler와 BFF

- browser 또는 외부 client에 HTTP endpoint가 필요할 때 Route Handler를 사용합니다.
- Server Component가 내부 data를 읽기 위해 자기 Route Handler를 호출하지 않습니다.
- handler는 runtime 제한, timeout, body size, response caching과 deployment 환경의
  ephemeral filesystem 특성을 고려합니다.
- long-running job, durable queue와 WebSocket을 serverless handler의 process memory에
  의존시키지 않습니다.

## 7. 오류, metadata와 보안

- 예상 가능한 404는 `notFound`, segment 오류는 `error.tsx`, 전역 복구는 가장 가까운
  적절한 boundary에 둡니다.
- loading UI는 layout shift와 접근 가능한 상태 설명을 고려합니다.
- metadata는 route data와 일관되게 생성하고 title, canonical, social metadata를
  중복 하드코딩하지 않습니다.
- 공개 client environment variable만 client bundle에 포함하고 server secret이 serialized
  props, logs나 source map에 들어가지 않게 합니다.

## 8. 테스트와 품질 게이트

- 순수 component와 use case는 단위 테스트하고 routing, Server/Client serialization,
  metadata와 mutation은 integration/E2E에서 검증합니다.
- production build가 발견하는 dynamic API, cache와 runtime 제약을 확인하기 위해
  `next build`를 필수 gate에 포함합니다.
- `tools/frameworks/next-ts/eslint-config-next.md`의 Core Web Vitals와 TypeScript preset을
  적용합니다. Next.js 16 이상에서는 `next lint`가 아니라 ESLint CLI를 사용합니다.

```sh
pnpm run lint
pnpm run typecheck
pnpm run test
pnpm run build
```

## 9. Next.js 안티패턴

- page/layout 전체에 `"use client"` 선언
- Server Component에서 자체 Route Handler 호출
- pinned version 확인 없이 서로 다른 Next.js 세대의 cache API 혼합
- Server Action을 인증된 내부 함수로 간주하거나 secret을 client prop으로 전달

참고: [Server and Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components),
[Fetching Data](https://nextjs.org/docs/app/getting-started/fetching-data),
[Backend for Frontend](https://nextjs.org/docs/app/guides/backend-for-frontend),
[Caching](https://nextjs.org/docs/app/getting-started/caching),
[Project Structure](https://nextjs.org/docs/app/getting-started/project-structure)
