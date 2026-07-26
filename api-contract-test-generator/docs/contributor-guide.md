# Contributor Guide

## Architecture

React는 세 단계 화면과 사용자 선택을 관리합니다. 파싱·내부 참조 해석·정규화·테스트 생성·내보내기는 `src/workers/api-contract.worker.ts`에서 호출하는 UI 독립 순수 모듈에 둡니다. Worker 메시지는 revision을 포함하며 현재 입력보다 오래된 응답은 화면 상태에 반영하지 않습니다.

입력 원문이나 생성 요청을 로그에 기록하지 마세요. 네트워크 클라이언트, 원격 `$ref` 로더, 입력 영구 저장소를 추가하면 현재 개인정보 경계가 깨집니다.

## OpenAPI Specification References

OpenAPI 관련 기능을 구현하거나 검토할 때는 다음 공식 사양을 참고합니다.

- [OpenAPI Specification 3.2](https://spec.openapis.org/oas/v3.2)
- [OpenAPI Specification 3.1](https://spec.openapis.org/oas/v3.1)
- [OpenAPI Specification 3.0](https://spec.openapis.org/oas/v3.0)

## Generation Rules

규칙은 `src/lib/generation/rules.ts`에 작은 분기 단위로 추가합니다.

- `ruleId`는 소문자 kebab-case이며 의미가 바뀌지 않는 안정 식별자여야 합니다.
- `variantId`는 같은 근거 위치에서 생성하는 변형을 구분해야 합니다.
- 한 후보는 기준 요청에서 제약 조건 하나만 바꿔야 합니다.
- `sourcePointer`는 근거가 된 OpenAPI 위치를 가리켜야 합니다.
- 명세가 숫자 상태 코드를 확정하지 못하면 `needsReview: true`로 두고 상태를 추측하지 않습니다.
- 선언된 `2XX`, `4XX` 범위는 문자열 상태로 보존하고 Postman의 정확한 상태 assertion은 만들지 않습니다.
- 후보 값은 목표 제약만 완화한 스키마로 다시 검증해 다른 제약을 함께 위반하지 않아야 합니다.
- 파라미터 값은 Postman 내보내기에서 정규화된 `style`과 `explode`를 사용해 직렬화합니다.
- 새 함수와 분기는 실패하는 테스트를 먼저 추가한 뒤 구현합니다.

## Fixtures

작은 객체는 `src/test/factories.ts`의 타입 안전한 팩토리를 사용합니다. 파서 원문이나 참조 그래프가 중요한 경우에만 `test/fixtures/` 아래 YAML 또는 JSON 파일을 추가합니다.

fixture에는 검증하려는 최소 조건과 기대 근거 포인터가 보여야 합니다. 실서비스 명세, 토큰, 호스트 비밀값을 복사하지 마세요. OpenAPI 3.0과 3.1 의미가 다른 규칙은 두 버전의 회귀 테스트를 각각 작성합니다.

## Stable IDs

테스트 ID 입력은 다음 순서를 유지합니다.

```text
UPPERCASE_METHOD | normalized_path | source_pointer | rule_id | variant_id
```

해시는 브라우저 `crypto.subtle`의 UTF-8 SHA-256 소문자 hex입니다. ID 입력을 바꾸면 사용자의 재생성 선택 복원에 영향을 주므로 문서화된 마이그레이션 없이 변경하지 마세요.

## Responsive Verification

검토 화면의 상세 패널이나 액션을 `fixed` 또는 `absolute`로 띄우지 않습니다. 모든 grid 자식은 `min-width: 0`을 유지합니다.

- 320px, 375px: 엔드포인트·테스트 목록·상세를 한 화면씩 표시
- 768px, 1024px: 엔드포인트 행과 목록·상세 2열
- 1440px: 엔드포인트·목록·상세 3열

`e2e/responsive.spec.ts`에서 가로 overflow, 데스크톱 열 경계, 모바일 단일 화면, 마지막 카드와 고정 액션의 교차 여부를 검증합니다.

## Required Verification

```bash
npm run test
npm run lint
npm run typecheck
npm run build
npm run test:e2e
```
