# API Contract Test Generator 설계

- 상태: 승인됨
- 작성일: 2026-07-25
- 대상 프로젝트: `api-contract-test-generator/`

## 1. 개요

Tool Hub에 OpenAPI 명세를 분석해 정상·경계값·오류·인증 테스트 계획을 생성하는 독립 웹 도구를 추가한다. 사용자는 생성된 테스트의 근거와 예상 결과를 검토하고 Markdown, JSON 또는 Postman Collection 2.1로 내려받는다.

도구는 범용 API 클라이언트나 실제 테스트 실행기가 아니다. 입력 명세를 브라우저 안에서 결정론적인 테스트 자산으로 변환하는 데 집중한다.

## 2. 목표

- OpenAPI 3.0.x와 3.1.x YAML·JSON 문서를 입력받는다.
- 엔드포인트, 파라미터, 요청 본문, 스키마 제약, 인증 요구사항을 정규화한다.
- 유효한 기준 요청에서 제약 하나만 바꾸는 방식으로 테스트를 생성한다.
- 모든 테스트에 생성 근거, 원본 JSON Pointer, 신뢰 수준을 연결한다.
- 사람이 확정할 수 없는 예상 결과를 `검토 필요`로 표시한다.
- 단계형 UI에서 명세 입력, 테스트 검토, 내보내기를 순서대로 수행한다.
- 320px부터 데스크톱까지 컴포넌트가 서로 겹치거나 내용을 가리지 않는다.
- 입력 원문, 인증 정보, 생성 결과를 서버나 브라우저 영구 저장소에 저장하지 않는다.
- 같은 문서와 시드는 항상 같은 테스트와 ID를 생성한다.

## 3. 비목표

MVP에는 다음 기능을 포함하지 않는다.

- 실제 원격 API 호출과 테스트 실행
- 서버 프록시
- 계정, 동기화, 협업 워크스페이스
- AI 기반 테스트 생성
- Swagger 2.0과 OpenAPI 3.2 직접 지원
- 외부 URL 또는 파일 `$ref` 다운로드
- `multipart/form-data`와 파일 업로드 테스트 생성
- `application/x-www-form-urlencoded` 테스트 생성
- 콜백과 웹훅 실행
- OAuth 인증 흐름 실행
- `oneOf`·`anyOf`의 복합 부정 테스트
- 모든 사용자 정의 `format`에 대한 임의 값 생성
- Postman 환경 파일 생성

## 4. 주요 설계 결정

### 4.1 독립 도구

`api-contract-test-generator/`를 독립 Vite + React + TypeScript SPA로 추가한다. 다른 Tool Hub 프로젝트에 런타임으로 의존하거나 코드를 공유하지 않는다.

독립 도구를 선택한 이유는 다음과 같다.

- 입력부터 내보내기까지 하나의 명확한 목적을 유지한다.
- 기존 도구 UI의 책임과 복잡도를 늘리지 않는다.
- 별도 배포와 버전 관리가 가능하다.
- Tool Hub 홈에서 독립 카드로 설명하기 쉽다.

일부 YAML·JSON 파싱 패턴이 다른 프로젝트와 비슷해질 수 있지만, MVP에서는 공통 패키지를 먼저 만들지 않는다. 실제 중복 유지 비용이 확인된 뒤 공통화한다.

### 4.2 브라우저 전용 처리

파싱, 참조 해석, 정규화, 테스트 생성, 내보내기는 모두 브라우저에서 수행한다. 명세 원문은 네트워크로 전송하지 않는다.

CPU 사용량이 큰 분석과 생성은 Web Worker에서 실행한다. React 메인 스레드는 입력, 화면 상태, 사용자 선택, 파일 다운로드만 담당한다.

### 4.3 단일 변이 테스트

유효한 기준 요청 하나를 먼저 만든 뒤 테스트마다 제약 하나만 변경한다.

이 방식을 선택한 이유는 다음과 같다.

- 테스트 실패 원인을 하나의 제약으로 설명할 수 있다.
- 생성 테스트 수가 조합적으로 증가하지 않는다.
- 생성 근거와 원본 위치를 명확히 연결할 수 있다.
- 결정론적 출력과 중복 제거가 쉽다.

페어와이즈 또는 전체 조합 테스트는 실사용 요구가 확인된 뒤 후속 범위로 검토한다.

### 4.4 부분 성공

문법, 버전, 필수 구조, 내부 참조 오류는 전체 생성을 차단한다. 외부 참조나 미지원 미디어 타입처럼 일부 영역에 국한되는 문제는 해당 엔드포인트 또는 스키마만 불완전 상태로 격리하고 나머지 테스트는 생성한다.

## 5. 기술 구성

- Vite
- React
- TypeScript
- Tailwind CSS
- Monaco Editor
- YAML 파싱용 `yaml`
- JSON 위치 진단용 `jsonc-parser`
- Web Worker
- Vitest와 Testing Library
- Playwright

OpenAPI 구조 검사는 MVP 지원 범위에 필요한 규칙을 도메인 모듈에 명시한다. 외부 네트워크 접근이 가능한 참조 해석기를 사용하지 않는다. 라이브러리는 어댑터 뒤에 격리해 교체 가능하게 한다.

## 6. 사용자 흐름

### 6.1 1단계: 명세 입력

사용자는 다음 방법으로 명세를 입력한다.

- YAML·JSON 직접 붙여넣기
- `.yaml`, `.yml`, `.json` 파일 업로드 또는 드래그 앤 드롭
- 내장 OpenAPI 3.0·3.1 예제 불러오기

입력 화면에는 다음 요소가 있다.

- 단계 표시: `명세 입력 → 테스트 검토 → 내보내기`
- Monaco 편집기
- 파일명과 감지한 문서 형식
- 문법·버전·참조 진단
- 분석 시작 버튼
- 브라우저 내부 처리 안내

파일 업로드와 직접 입력 모두 UTF-8 바이트 길이를 기준으로 제한한다. 5MB를 초과하면 성능 경고를 표시하고 계속할 수 있다. 20MB를 초과하면 분석하지 않는다.

### 6.2 2단계: 테스트 검토

승인된 레이아웃은 엔드포인트 탐색기, 테스트 카드, 상세 패널로 구성한다.

상단 요약에는 다음 정보를 표시한다.

- 전체 엔드포인트 수
- 전체 생성 테스트 수
- 내보내기에 포함된 테스트 수
- 검토 필요 테스트 수
- 제한 때문에 생략한 테스트 수
- 검색과 카테고리·신뢰 수준 필터

테스트 카드에는 다음 정보를 표시한다.

- 포함 여부
- 테스트 제목
- 카테고리
- 신뢰 수준
- 짧은 생성 이유
- 예상 상태

생성된 테스트는 신뢰 수준과 관계없이 기본적으로 내보내기에 포함한다. `검토 필요` 테스트는 별도 필터와 상단 개수로 강조하고, 사용자가 제외하거나 예상 상태를 확정할 수 있게 한다.

상세 패널에는 다음 정보를 표시한다.

- HTTP 메서드와 경로
- 생성 근거
- 원본 JSON Pointer
- 요청 파라미터, 헤더, 쿠키, 본문
- 예상 상태와 그 선택 이유
- 검토 필요 사유
- 테스트 제외와 검토 완료 액션

### 6.3 3단계: 내보내기

사용자는 다음 형식 중 하나를 선택한다.

- Markdown 테스트 계획
- JSON 테스트 계획
- Postman Collection 2.1

내보내기 전 다음 정보를 다시 표시한다.

- 포함할 테스트 수
- 미검토 테스트 수
- 미지원 또는 생략 항목 수
- 선택한 형식의 포함 범위

미검토 테스트가 있어도 내보내기는 허용하지만 경고 확인을 요구한다.

## 7. 반응형 설계

### 7.1 데스크톱

1200px 이상에서는 다음 3열 그리드를 사용한다.

```text
200px 엔드포인트 탐색기 | minmax(0, 1fr) 테스트 목록 | 340px 상세 패널
```

상세 패널은 목록 위에 겹치는 오버레이가 아니라 별도 그리드 열을 차지한다.

### 7.2 태블릿

768px 이상 1200px 미만에서는 엔드포인트 선택 영역을 작업 공간 위의 전체 너비 행으로 옮기고, 테스트 목록과 상세를 2열로 배치한다. 상세를 닫으면 테스트 목록이 남은 폭을 사용한다.

### 7.3 모바일

768px 미만에서는 한 번에 하나의 주요 화면만 표시한다.

- 엔드포인트 탭
- 테스트 탭
- 테스트 상세 화면

상세는 목록 위에 겹치지 않고 별도 화면으로 전환한다. 뒤로 이동하면 선택한 엔드포인트, 테스트, 필터, 목록 스크롤 위치를 복원한다.

하단 액션은 콘텐츠를 덮는 `position: fixed`를 사용하지 않고 문서 흐름 안에 둔다. 긴 경로와 제목은 컨테이너 폭을 밀어내지 않도록 `min-width: 0`과 말줄임을 적용하며 전체 값은 접근 가능한 이름 또는 제목으로 제공한다.

### 7.4 Tool Hub 디자인 시스템 일관성

로컬 `design-system/`과 현재 웹 서비스의 구현을 함께 기준으로 삼는다. `design-system/`은 참고 자료이며 `.gitignore` 대상이므로 런타임으로 import하지 않는다. 필요한 시맨틱 토큰은 새 프로젝트 안에 독립적으로 정의한다.

시각 기준은 다음과 같다.

- 한 가지 액션 색상: Blue `#3366FF`
- 기본 배경: `#F7F7F8`
- 기본 표면: `#FFFFFF`
- 기본 텍스트: `#171717`
- 중립 테두리: `rgba(112, 115, 124, 0.22)`
- 선택 배경: `#EAF2FE`
- 성공·경고·오류는 상태 전달에만 사용
- 4px 간격 그리드
- 반경: 작은 요소 8px, 컨트롤 12px, 카드 16px
- 낮은 확산의 중립 그림자
- 그라데이션, 질감, 장식용 이모지 사용 금지

현재 서비스와 동일하게 `public/fonts/toolhub-sans.woff2`를 자체 호스팅하고 `ToolHub Sans`를 기본 글꼴로 사용한다. 외부 CDN 폰트에는 의존하지 않는다.

레이아웃과 컴포넌트 기준은 다음과 같다.

- 앱 최대 폭 1400px
- 모바일 16px, 데스크톱 24px 외부 여백
- 40px 브랜드 마크
- 기본 작업 버튼 높이 36px
- 카드에는 1px 중립 테두리와 `shadow-sm` 사용
- 주요 액션만 파란색 solid 버튼 사용
- 보조 액션은 흰색 또는 투명 배경과 중립 테두리 사용
- Lucide 아이콘을 `currentColor` 단색으로 사용
- 제목, 설명, 메타데이터의 위계를 기존 서비스의 20px·13px·12px 체계와 맞춤

테마는 현재 웹 앱과 같은 `[data-theme]` 속성 방식으로 구현한다. `theme.ts`의 순수 `resolveInitialTheme()` 함수, `useTheme` 훅, 페인트 전 FOUC 방지 스크립트를 둔다. 입력 원문은 저장하지 않고 테마 값만 `localStorage`에 저장한다.

CSS는 저장소 프런트엔드 컨벤션에 따라 `theme.css`, `base.css`, `components.css`로 분리하고 진입 CSS는 `@import`만 포함한다. 반복 UI는 타입이 있는 React 컴포넌트로 만들고, 한 번만 쓰는 구조는 불필요하게 추상화하지 않는다.

## 8. 아키텍처

```text
React Main Thread
  ├─ AppShell
  ├─ StepNavigator
  ├─ SpecInputStep
  ├─ TestReviewStep
  ├─ ExportStep
  └─ useTestWorkspace
          ↓ revision 기반 메시지
Web Worker
  ├─ Parser
  ├─ LocalRefResolver
  ├─ ContractNormalizer
  ├─ BaselineBuilder
  ├─ RuleEngine
  ├─ TestPlanBuilder
  └─ Exporter
```

### 8.1 UI 계층

UI 컴포넌트는 도메인 규칙을 직접 실행하지 않는다. 사용자의 입력과 선택을 Worker 요청으로 변환하고 결과를 렌더링한다.

### 8.2 워크스페이스 상태

`useTestWorkspace`는 다음을 담당한다.

- 입력 revision 증가
- Worker 생명주기
- 오래된 응답 거부
- 단계 전환
- 테스트 선택과 검토 상태
- 오래된 결과 보호
- 파일 다운로드

### 8.3 도메인 계층

- `Parser`: YAML·JSON 파싱과 위치 진단
- `LocalRefResolver`: 내부 `$ref` 해석과 순환 참조 방지
- `ContractNormalizer`: OpenAPI 3.0·3.1 차이를 공통 모델로 변환
- `BaselineBuilder`: 제약을 만족하는 기준 요청 생성
- `RuleEngine`: 제약별 단일 변이 테스트 후보 생성
- `TestPlanBuilder`: 중복 제거, 우선순위, 상한, 진단 연결
- `Exporter`: Markdown, JSON, Postman 출력

각 모듈은 직렬화 가능한 입력과 출력을 사용해 UI나 Worker 구현 없이 단위 테스트할 수 있게 한다.

## 9. Worker 프로토콜

모든 요청과 응답에는 최신 입력을 식별하는 `revision`을 포함한다.

```typescript
type WorkerRequest =
  | { type: 'analyze'; revision: number; raw: string; filename?: string }
  | { type: 'generate'; revision: number; document: NormalizedContract; seed: string }
  | { type: 'export'; revision: number; format: ExportFormat; plan: ExportablePlan };

type WorkerResponse =
  | { type: 'analysis-result'; revision: number; result: AnalysisResult }
  | { type: 'generation-result'; revision: number; result: GenerationResult }
  | { type: 'export-result'; revision: number; result: ExportResult }
  | { type: 'worker-error'; revision: number; error: WorkerError };
```

UI는 응답 revision이 현재 revision과 같을 때만 결과를 적용한다.

## 10. 지원 입력

### 10.1 문서

- OpenAPI 3.0.x
- OpenAPI 3.1.x
- YAML 단일 문서
- JSON 객체 문서
- 내부 `$ref`

Swagger 2.0, OpenAPI 3.2, YAML 다중 문서는 지원하지 않는 버전 또는 형식 오류로 명확하게 거부한다.

### 10.2 요청

- 경로 파라미터
- 쿼리 파라미터
- 헤더 파라미터
- 쿠키 파라미터
- `application/json` 요청 본문
- HTTP Bearer 인증
- API Key 인증

파라미터 직렬화는 MVP에서 다음 조합을 지원한다.

- path: `simple`
- query: `form`
- header: `simple`
- cookie: `form`

지원하지 않는 `style`·`explode` 조합은 값을 임의로 직렬화하지 않고 해당 테스트를 생략하며 진단을 남긴다.

Postman의 `{{baseUrl}}` 제안값은 OpenAPI 문서의 첫 번째 `servers[0].url`에서 가져온다. 서버가 없으면 빈 자리표시자만 생성한다.

### 10.3 스키마

- `type`
- `nullable`
- `required`
- `enum`
- `const`
- `minimum`, `maximum`
- `exclusiveMinimum`, `exclusiveMaximum`
- `multipleOf`
- `minLength`, `maxLength`, `pattern`, `format`
- `minItems`, `maxItems`, `uniqueItems`, `items`
- `properties`, `additionalProperties`
- 충돌하지 않는 `allOf`
- `oneOf`·`anyOf` 각 분기의 정상 기준값

`const`와 타입 배열처럼 OpenAPI 3.1에서만 유효한 키워드는 3.1 문서에서만 적용한다. `allOf` 병합 중 같은 키에 양립할 수 없는 제약이 발견되면 기준 요청을 추측하지 않고 해당 스키마를 불완전 상태로 표시한다.

## 11. 테스트 생성 전략

### 11.1 기준 요청

값 선택 우선순위는 다음과 같다.

1. `example`
2. `examples`의 첫 번째 값
3. `default`
4. `enum`의 첫 번째 값
5. 스키마 제약에 맞춘 결정론적 생성값

스키마 제약이 서로 충돌해 기준 요청을 만들 수 없으면 해당 엔드포인트 테스트를 생성하지 않고 진단을 남긴다.

정상 요청의 예상 상태는 숫자로 선언된 `2xx` 중 가장 낮은 상태를 우선한다. 숫자 상태가 없고 `2XX` 범위 응답만 있으면 범위로 보존한다. 성공 응답이 없으면 `검토 필요`로 분류한다.

### 11.2 필수값

- 필수 파라미터 또는 본문 필드를 하나씩 제거한다.
- 경로 파라미터는 빈 값 또는 잘못된 인코딩 변형을 생성한다.
- 유효성 오류 응답은 명세에 선언된 `400`, `422`, `4XX` 순으로 선택한다.
- 관련 오류 응답이 없으면 예상 상태를 확정하지 않는다.

### 11.3 문자열

- `minLength`: 경계값과 하나 짧은 값
- `maxLength`: 경계값과 하나 긴 값
- `pattern`: 확인된 일치 값과 불일치 값
- `email`, `uuid`, `date`, `date-time`: 정상값과 고정된 오류값

`pattern` 불일치 후보는 실제 정규식 검사에서 불일치가 확인된 경우에만 사용한다. 안전한 후보를 찾지 못하면 테스트를 추측해 만들지 않고 진단을 남긴다.

### 11.4 숫자

- `minimum`: 경계값과 명백히 작은 값
- `maximum`: 경계값과 명백히 큰 값
- 배타적 경계: 제외된 경계와 허용 범위 값
- `multipleOf`: 배수와 비배수

정수는 경계에서 1을 더하거나 뺀다. 실수는 부동소수점 인접값을 추정하지 않고 명백히 범위를 벗어나는 값을 사용한다.

### 11.5 배열

- `minItems`: 경계 길이와 하나 부족한 배열
- `maxItems`: 경계 길이와 하나 많은 배열
- `uniqueItems`: 중복 없는 배열과 중복 배열
- `items`: 정상 항목과 타입 위반 항목

선언된 배열 길이가 생성 상한을 초과하면 실제 대형 배열을 만들지 않고 제한 진단을 남긴다.

### 11.6 열거형과 타입

- `enum`: 선언된 첫 정상값과 같은 타입의 미등록 값
- `const`: 선언값과 다른 같은 타입 값
- boolean: `true`, `false`, 문자열 타입 오류
- object: 정상 객체와 배열 또는 문자열 타입 오류
- OpenAPI 3.0 `nullable`과 OpenAPI 3.1 타입 배열을 공통 nullable 표현으로 정규화

### 11.7 인증

- 자리표시자가 있는 정상 요청 템플릿
- 인증 헤더 또는 API Key 누락
- 형식이 잘못된 인증값

실제 토큰은 생성하거나 저장하지 않는다. 출력에는 `{{API_TOKEN}}`, `{{API_KEY}}` 같은 변수만 포함한다.

인증 누락은 선언된 `401`을 우선한다. 없으면 `4XX`를 보존하고, 둘 다 없으면 `검토 필요`로 분류한다. 권한 모델을 명세만으로 알 수 없으므로 `403`을 자동 확정하지 않는다.

OpenAPI `security` 배열의 각 항목은 대체 가능한 인증 조합으로 해석하고, 항목 안의 여러 스킴은 모두 필요한 조합으로 해석한다. 지원 가능한 각 대체 조합마다 정상 기준 요청을 생성하며, 조합 안의 인증 스킴을 하나씩 누락한 테스트를 만든다. OAuth 등 미지원 스킴만으로 이루어진 조합은 생략하고 진단을 남긴다.

## 12. 신뢰 수준

- `explicit`: 명세의 예시와 정확한 예상 상태를 직접 사용
- `derived`: 명확한 스키마 제약에서 변이를 만들고 관련 응답이 명세에 선언됨
- `review-required`: 예상 상태 또는 비즈니스 의미를 명세만으로 확정할 수 없음

신뢰 수준은 테스트의 품질 점수가 아니라 자동 결정 범위를 나타낸다.

## 13. 도메인 모델

```typescript
interface GeneratedTestCase {
  id: string;
  endpointId: string;
  title: string;
  category:
    | 'happy-path'
    | 'required'
    | 'type'
    | 'boundary'
    | 'format'
    | 'enum'
    | 'authentication';
  confidence: 'explicit' | 'derived' | 'review-required';
  sourcePointer: string;
  rationale: string;
  request: {
    pathParameters: Record<string, unknown>;
    queryParameters: Record<string, unknown>;
    headers: Record<string, string>;
    cookies: Record<string, string>;
    body?: unknown;
  };
  expected: {
    statuses: Array<number | '2XX' | '4XX'>;
    responseSchemaPointer?: string;
    needsReview: boolean;
    reason?: string;
  };
  generator: {
    ruleId: string;
    seed: string;
  };
}

interface TestCaseSelection {
  testCaseId: string;
  included: boolean;
  reviewed: boolean;
  expectedStatuses?: Array<number | '2XX' | '4XX'>;
}
```

생성 결과와 사용자 선택 상태를 분리한다. 명세를 다시 분석했을 때 동일한 테스트 ID의 선택과 검토 상태만 복원한다.

테스트 ID는 다음 값을 정규화해 SHA-256으로 생성한다.

```text
HTTP 메서드 + 경로 + 원본 JSON Pointer + 규칙 ID + 변형 ID
```

## 14. 생성 상한

- 한 테스트에서 한 제약만 변경
- 엔드포인트당 최대 200개
- 문서 전체 최대 2,000개
- 순환 참조 재방문 차단
- 스키마 값 생성 깊이 최대 32
- 실제 배열 값 생성 길이 최대 100
- 제한에 걸린 항목과 생략 수를 진단과 요약에 표시

테스트 우선순위는 정상 요청, 필수값, 인증, 타입, 경계값, 포맷, 열거형 순으로 적용한다. 상한에 도달해도 우선순위가 높은 테스트가 먼저 남는다.

## 15. 상태와 오류 처리

### 15.1 상태

```text
idle
  → reading-file
  → analyzing
      → invalid
      → partially-valid
      → generating
          → ready
          → generation-failed
  → exporting
```

### 15.2 치명적 오류

- YAML·JSON 문법 오류
- 버전 필드 누락 또는 미지원 버전
- `paths` 필수 구조 오류
- 해석 불가능한 내부 `$ref`
- 내부 안전 한계 초과
- 20MB 초과 입력

오류에는 코드, 한국어 메시지, 행·열, JSON Pointer, 수정 방법을 제공한다.

### 15.3 부분 처리 경고

- 외부 `$ref`
- 미지원 미디어 타입
- 파일 업로드
- 콜백과 웹훅
- 미지원 사용자 정의 `format`
- 복합 부정 테스트
- 생성 개수·깊이·배열 제한

영향받는 엔드포인트나 스키마만 불완전 상태로 표시한다.

### 15.4 오래된 결과

생성 후 입력을 수정하거나 파일을 바꾸면 기존 결과를 즉시 `stale`로 전환한다.

- 기존 결과는 참고용으로만 표시
- 테스트 편집과 내보내기 비활성화
- 새 분석 성공 후 동일 테스트 ID의 사용자 상태만 복원
- 새 분석 실패 시 이전 결과를 현재 결과로 표시하지 않음

### 15.5 Worker 오류

Worker에서 예상하지 못한 오류가 발생하면 입력 원문은 유지하고 Worker를 새로 만든다. 오래된 생성 결과를 폐기하고 재시도 버튼과 안전하게 요약한 오류 메시지를 제공한다.

## 16. 내보내기

### 16.1 Markdown

- API 제목과 버전
- 생성 시각과 입력 문서 SHA-256
- 엔드포인트별 테스트 목록
- 요청 예시
- 예상 상태
- 생성 근거와 JSON Pointer
- 검토 필요 항목
- 미지원·생략 진단

파일명은 정규화한 API 제목을 기준으로 `<api-title>-test-plan.md`를 사용한다.

### 16.2 JSON

```json
{
  "schemaVersion": "toolhub.api-contract-test-plan/v1",
  "source": {
    "title": "User API",
    "version": "1.0.0",
    "documentHash": "sha256"
  },
  "testCases": [],
  "diagnostics": []
}
```

`schemaVersion`으로 향후 출력 호환성을 판단한다.

파일명은 `<api-title>-test-plan.json`을 사용한다.

### 16.3 Postman Collection 2.1

- 첫 번째 OpenAPI 태그 기준 폴더, 태그가 없으면 `기타` 폴더
- `{{baseUrl}}` 사용
- 인증값 자리표시자 사용
- 포함하기로 선택한 테스트만 출력
- 정확한 상태가 명세에 선언되었거나 사용자가 검토해 확정한 경우에만 상태 assertion 생성
- 미검토 예상값은 assertion 없이 설명에 포함
- 실제 비밀값과 Postman 환경 파일은 생성하지 않음

MVP Postman 출력의 자동 assertion은 상태 코드까지만 지원한다. 응답 스키마 assertion은 후속 범위다.

폴더와 요청은 원본 엔드포인트 순서를 유지하고 동일 엔드포인트 안에서는 테스트 우선순위와 ID 순으로 정렬한다. 파일명은 `<api-title>-postman-collection.json`을 사용한다.

## 17. 개인정보와 보안

- 입력과 결과를 서버로 전송하지 않는다.
- 원문과 결과를 `localStorage`와 IndexedDB에 저장하지 않는다.
- 테마 값만 `localStorage`에 저장할 수 있다.
- 외부 `$ref`를 가져오지 않는다.
- 인증 자리표시자만 출력한다.
- 분석 이벤트에 명세 내용, 경로, 스키마 이름을 포함하지 않는다.
- 실제 원격 요청을 실행하지 않으므로 CORS 우회 프록시와 SSRF 표면을 만들지 않는다.

## 18. 복잡도

다음 기호를 사용한다.

- `N`: 명세와 스키마 전체 노드 수
- `E`: 엔드포인트 수
- `R`: 고정 생성 규칙 수
- `T`: 실제 생성 테스트 수

시간 복잡도:

```text
O(N + E × R + T)
```

규칙 수가 고정이면 `O(N + T)`이다. 중복 제거와 각 내보내기는 평균 `O(T)`다.

공간 복잡도:

```text
O(N + T)
```

전체 테스트 수와 생성 깊이를 제한해 비정상 입력이 브라우저 자원을 무제한 사용하지 못하게 한다.

## 19. 테스트 전략

### 19.1 단위 테스트

- YAML·JSON 파싱과 위치 진단
- OpenAPI 3.0·3.1 버전 감지
- 내부 `$ref`와 순환 참조
- 버전별 nullable·배타적 경계 정규화
- 기준 요청 값 선택 우선순위
- 제약 조건별 단일 변이
- 예상 상태와 신뢰 수준
- 테스트 ID 결정론
- 중복 제거와 생성 상한
- Markdown·JSON·Postman 출력

### 19.2 고정 fixture

- 최소 OpenAPI 3.0 문서
- 최소 OpenAPI 3.1 문서
- 모든 파라미터 위치
- 중첩 객체와 배열
- `allOf`, `oneOf`, `anyOf`
- 순환 내부 참조
- 외부 참조
- 인증 스키마
- 오류 응답이 없는 문서
- 생성 상한을 초과하는 문서

### 19.3 컴포넌트 테스트

- 단계 전환
- 파일 업로드와 예제
- 엔드포인트 선택
- 테스트 포함·제외
- 상세 패널과 모바일 상세 화면
- 검토 완료
- 검색과 필터
- 오래된 결과 내보내기 차단
- 미검토 경고
- 내보내기 형식 선택

### 19.4 Playwright 종단간 테스트

- 입력부터 각 형식 다운로드까지의 핵심 흐름
- 문법 오류 위치 표시
- 부분 지원 문서의 경고와 정상 범위 생성
- 모바일 목록·상세 전환과 상태 복원
- 키보드만으로 핵심 흐름 완료
- 320, 375, 768, 1024, 1440px 화면 검증

화면 겹침은 다음 조건으로 검증한다.

- `documentElement.scrollWidth <= documentElement.clientWidth`
- 상단 액션과 제목·단계 표시의 bounding box가 의도하지 않게 교차하지 않음
- 데스크톱 탐색기·목록·상세 패널 bounding box가 교차하지 않음
- 모바일에서 목록과 상세가 동시에 표시되지 않음
- 정적 액션 영역이 마지막 테스트 카드를 덮지 않음

## 20. 프로젝트 구조

```text
api-contract-test-generator/
  AGENTS.md
  README.md
  docs/contributor-guide.md
  index.html
  package.json
  vite.config.ts
  vitest.config.ts
  playwright.config.ts
  tsconfig.json
  tsconfig.app.json
  tsconfig.node.json
  public/
    fonts/toolhub-sans.woff2
    fonts/toolhub-sans.LICENSE.txt
  src/
    components/
      layout/
      input/
      review/
      export/
      ui/
    domain/
      contract.ts
      test-case.ts
      diagnostic.ts
    hooks/
      useTestWorkspace.ts
    lib/
      parser/
      references/
      normalization/
      generation/
      export/
      files/
    workers/
      protocol.ts
      api-contract.worker.ts
    data/
      samples.ts
    styles/
      theme.css
      base.css
      components.css
    index.css
    test/
  e2e/
  test/fixtures/
```

실제 파일 이름과 셸·콘텐츠 분리는 저장소의 Vite 프로젝트 컨벤션을 따른다.

## 21. 필수 검증 명령

프로젝트에는 다음 스크립트를 제공한다.

```bash
npm run test
npm run lint
npm run typecheck
npm run build
npm run test:e2e
```

완료 전 다섯 명령을 모두 실행한다. Tool Hub 홈 메타데이터를 변경하므로 `home/`에서도 `test`, `lint`, `typecheck`, `build`를 실행한다.

## 22. 완료 조건

- 독립 `api-contract-test-generator/` SPA가 실행된다.
- OpenAPI 3.0·3.1 YAML·JSON을 분석한다.
- 내부 참조를 해석하고 외부 참조는 네트워크 없이 격리한다.
- 기준 요청과 단일 변이 테스트를 결정론적으로 생성한다.
- 모든 테스트가 생성 근거와 JSON Pointer를 가진다.
- 예상 결과를 확정할 수 없으면 `검토 필요`로 표시한다.
- 사용자가 테스트를 포함·제외하고 예상 상태를 검토할 수 있다.
- Markdown, JSON, Postman Collection 2.1을 내려받을 수 있다.
- 명세 원문과 결과가 서버 또는 브라우저 영구 저장소에 저장되지 않는다.
- 데스크톱·태블릿·모바일에서 컴포넌트가 겹쳐 콘텐츠를 가리지 않는다.
- 지정된 모든 단위·컴포넌트·종단간 검증이 통과한다.
- Tool Hub 홈에 독립 도구 카드가 등록된다.

## 23. 참고 자료

- [OpenAPI Specification](https://github.com/OAI/OpenAPI-Specification/tree/main/versions)
- [Postman Collection Format v2.1 Schema](https://schema.getpostman.com/json/collection/v2.1.0/collection.json)
