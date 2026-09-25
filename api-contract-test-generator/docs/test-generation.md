# API Contract Test Generator

## 범위와 처리 흐름

OpenAPI 3.0/3.1 명세에서 테스트 계획을 결정론적으로 생성한다. 실제 API 호출, 토큰 발급, 서버 프록시, AI 생성은 수행하지 않는다. Swagger 2.0, OpenAPI 3.2, YAML 다중 문서는 지원하지 않는다. [README](../README.md)에 사용자용 지원 범위가 있다.

```text
명세 입력 → Worker 분석/정규화 → 기준 요청 → 단일 변이 규칙
  → 테스트 계획 → 사용자 검토/선택 → Markdown/JSON/Postman
```

UI는 단계와 선택 상태를, [useTestWorkspace](../src/hooks/useTestWorkspace.ts)는 revision·Worker·결과 최신성을 관리한다. 파서, 내부 ref 해석, 정규화, 생성, 내보내기는 [lib](../src/lib/)에 분리한다. 현재 [Worker 프로토콜](../src/workers/protocol.ts)은 `analyze`에 분석과 생성을 묶고 `export`를 별도 요청으로 처리한다. 초기 계획의 별도 generate 메시지는 현재 계약이 아니다.

## 입력 정규화

JSON 객체 또는 YAML 단일 문서를 받는다. 내부 JSON Pointer ref를 해석하고 순환 재방문을 제한한다. 외부 ref는 다운로드하지 않으며 영향받는 부분을 불완전 상태로 표시한다.

지원 파라미터는 path/simple, query/form, header/simple, cookie/form이며 JSON과 `+json` 요청 본문을 처리한다. 지원하지 않는 직렬화나 미디어는 임의로 요청을 만들지 않고 진단과 생략 수를 남긴다.

스키마는 타입·nullable·required·enum·const, 문자열 길이/pattern/format, 숫자 범위/multipleOf, 배열 길이/uniqueItems/items, properties/additionalProperties, allOf 병합과 oneOf/anyOf 정상 분기를 다룬다. 버전별 의미를 정규화하고 충돌하는 제약은 불완전 상태로 처리한다. oneOf/anyOf의 복합 부정 테스트는 생성 범위 밖이다.

## 기준 요청과 변이

값은 example → examples[0] → default → enum[0] → 결정론적 생성값 순으로 선택한다. 우선 후보가 제약을 위반하면 진단 후 다음 유효 후보를 사용한다. 유효한 기준 요청을 만들 수 없으면 그 위에 오류 변이를 쌓지 않는다.

| 규칙 | 생성 근거 |
|---|---|
| 필수값 | 필수 파라미터/필드 하나 누락 |
| 문자열 | 최소/최대 길이 경계와 바깥값, 검증된 pattern 일치/불일치, 고정 format 예시 |
| 숫자 | 포함·배타 경계, 범위 밖 값, multipleOf 위반 |
| 배열 | 길이 경계, 중복, 항목 타입 위반 |
| enum/const/type | 같은 타입의 미등록 값, 다른 상수, 타입 위반 |
| 객체 | required와 additionalProperties:false 위반 |
| 인증 | 정상 자리표시자, 인증 누락, 잘못된 형식 |

한 오류 테스트에서는 유효한 기준 요청의 제약 하나만 바꾼다. pattern 불일치는 실제 검사로 확인된 후보만 사용한다. 큰 배열이나 안전하게 만들 수 없는 값은 제한 진단을 남긴다.

정상 기대 응답은 선언된 성공 상태를 사용하고 `2XX`/`4XX` 범위 응답도 보존한다. 검증 오류는 400/422/4XX, 인증 누락은 401/4XX 같은 명세 근거를 이용한다. 근거가 없으면 검토 필요로 남기고 403 등 비즈니스 의미를 추측해 확정하지 않는다.

HTTP Bearer/Basic과 API Key를 처리한다. security 배열 항목은 대체 조합, 항목 내부 스킴은 함께 필요한 조합이다. 지원하지 않는 인증 흐름은 실행하지 않는다.

## 모델과 제한

[test-case.ts](../src/domain/test-case.ts)가 현재 모델의 기준이다. 카테고리는 valid/validation/boundary/authentication이며, 신뢰 수준은 explicit/derived/review-required다. 신뢰 수준은 품질 점수가 아니라 명세에서 자동으로 확정할 수 있는 범위다.

테스트는 endpoint, 요청, 기대 응답, 원본 Pointer, 이유, ruleId/variantId를 가진다. ID는 method·path·Pointer·rule·variant의 SHA-256으로 안정적으로 만든다. 생성 데이터와 included/reviewed/기대 상태 override를 분리해 동일 ID의 사용자 선택을 보존한다.

- 엔드포인트당 최대 200개, 전체 최대 2,000개
- 스키마 생성 깊이 32, 생성 배열 길이 100
- UTF-8 입력 5MiB부터 경고, 20MiB 초과 차단
- 제한과 미지원 항목은 진단 및 요약에 표시

## 검토 화면과 오래된 결과

입력 → 검토 → 내보내기의 세 단계를 제공한다. 검토에서는 엔드포인트·카테고리·검토 여부로 탐색하고 요청과 근거를 확인한다. 데스크톱 상세는 별도 열, 모바일 상세는 별도 화면으로 표시하며 선택 상태를 유지한다. 셸·breakpoint·색은 [공통 디자인 시스템](../../docs/design-system.md)을 따른다. 초기의 로컬 토큰·1200px 레이아웃 제안은 정본 규칙으로 대체됐다.

입력이나 파일이 바뀌면 이전 계획은 stale이 된다. 참고용 결과와 현재 결과를 구분하고 테스트 수정·내보내기를 막는다. Worker 응답은 현재 revision과 맞을 때만 반영한다. 분석 실패가 이전 결과를 새 결과처럼 보이게 해서는 안 된다. 미검토 항목은 내보내기 전에 개수와 경고를 확인한다.

## 내보내기와 개인정보

| 형식 | 내용 |
|---|---|
| Markdown | 엔드포인트별 요청, 기대 상태, 근거 Pointer, 검토와 생략 진단 |
| JSON | `toolhub.api-contract-test-plan/v1` schemaVersion과 계획·선택 결과 |
| Postman 2.1 | 태그별 요청, baseUrl 변수, 인증 자리표시자, 확정 가능한 상태 assertion |

선택한 테스트만 내보낸다. 미확정 응답을 assertion으로 단정하지 않으며 응답 스키마 assertion은 제공 범위 밖이다. 출력 인증값은 `{{API_TOKEN}}`, `{{API_KEY}}`, `{{BASIC_AUTH}}`로 정화한다. 입력과 계획은 localStorage/IndexedDB/쿠키에 저장하지 않고 테마만 저장한다. 생성 시각 등 metadata와 테스트 내용의 결정론은 구분한다.

## 검증

정상·경계·인증·합성 스키마 fixture, 기준값 유효성, 한 제약만 바뀌는지, ID 안정성, 상한, stale revision, 모든 exporter의 인증 정화를 검사한다. 브라우저에서는 입력부터 검토·내보내기까지와 모바일 복귀 동작을 확인한다. 명령은 [기여자 가이드](contributor-guide.md)를 따른다.
