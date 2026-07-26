# API Contract Test Generator

OpenAPI 명세에서 정상·경계값·검증 오류·인증 테스트 계획을 결정론적으로 생성하는 브라우저 전용 도구입니다. 실제 API를 호출하지 않으며, 생성 결과를 검토한 뒤 Markdown, JSON 또는 Postman Collection 2.1로 저장할 수 있습니다.

## 지원 범위

- OpenAPI 3.0.x 및 3.1.x
- YAML 단일 문서와 JSON 객체 문서
- path `simple`, query `form`, header `simple`, cookie `form` 파라미터
- JSON 및 `+json` 요청 본문
- 내부 JSON Pointer `$ref`
- HTTP Bearer·Basic 및 header·query·cookie API Key
- 파라미터·본문의 `required`, 타입, 문자열 길이, 검증 가능한 pattern·format, 숫자 범위, `multipleOf`, 배열 범위·항목 타입, `uniqueItems`, `enum`, `const` 기반 테스트
- `allOf` 병합, `oneOf`·`anyOf` 정상 분기, `additionalProperties: false` 위반 테스트
- 숫자 상태 코드와 `2XX`·`4XX` 범위 응답 보존

## 사용 흐름

1. 명세를 붙여 넣거나 `.yaml`, `.yml`, `.json` 파일을 엽니다.
2. `테스트 생성`을 눌러 명세를 분석합니다.
3. 엔드포인트와 테스트 카드를 탐색하고, 포함 여부와 기대 상태 코드를 검토합니다.
4. Markdown 테스트 계획, 버전이 있는 JSON 계획, Postman Collection 2.1 중 하나를 다운로드합니다.

## 개인정보와 보안 경계

- 명세 파싱, 참조 해석, 테스트 생성, 내보내기는 브라우저 Web Worker에서 수행합니다.
- 실제 API를 호출하거나 명세를 서버로 전송하지 않습니다.
- 입력과 결과를 `localStorage`, IndexedDB, 쿠키에 저장하지 않습니다.
- `localStorage`에는 사용자가 선택한 `theme` 값만 저장합니다.
- 외부 `$ref`를 다운로드하지 않고 영향받는 엔드포인트를 불완전 상태로 표시합니다.
- 모든 내보내기에서 인증값을 `{{API_TOKEN}}`, `{{API_KEY}}`, `{{BASIC_AUTH}}` 변수로 정화합니다.

## 결정론과 상한

- 기준값은 `example` → `examples[0]` → `default` → `enum[0]` → 결정론적 생성값 순으로 선택합니다.
- 우선순위 값이 다른 스키마 제약을 위반하면 진단을 남기고 다음 유효한 값으로 이동합니다.
- 각 오류 테스트는 유효한 기준 요청에서 제약 조건 하나만 바꿉니다.
- ID는 메서드, 경로, 근거 포인터, 규칙 ID, 변형 ID의 SHA-256으로 생성합니다.
- 엔드포인트당 최대 200개, 전체 최대 2,000개 테스트를 생성합니다.
- 스키마 깊이는 32, 생성 배열은 100개 항목으로 제한합니다.
- 파일과 직접 입력은 UTF-8 기준 5MB부터 경고하고 20MB를 초과하면 차단합니다.

## 지원하지 않는 기능

- Swagger 2.0과 OpenAPI 3.2
- YAML 다중 문서
- 외부 또는 원격 `$ref`
- XML, multipart, 바이너리 본문 자동 생성
- OAuth 흐름 실행과 실제 토큰 발급
- `oneOf`·`anyOf`의 복합 부정 테스트
- 실제 HTTP 요청, 서버 프록시, 계정, AI 생성
- 서버별 런타임 검증을 대신하는 완전한 테스트 코드 생성

## 개발

```bash
npm install
npm run dev
```

## 검증

```bash
npm run test
npm run lint
npm run typecheck
npm run build
npm run test:e2e
```
