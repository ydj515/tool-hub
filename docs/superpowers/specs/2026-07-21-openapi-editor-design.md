# OpenAPI Editor 설계 명세

| 항목 | 내용 |
|---|---|
| 프로젝트 디렉터리 | `openapi-editor/` |
| 제품 표시명 | OpenAPI Studio |
| 작성일 | 2026-07-21 |
| 상태 | 사용자 검토 대기 |
| 구현 방식 | Vite + React + TypeScript SPA, Web Worker |
| 데이터 처리 위치 | 브라우저 내부 전용 |

## 1. 목적

Swagger Editor와 유사한 편집 경험을 Tool Hub에 추가한다. 사용자는 단일 Swagger/OpenAPI 문서를 YAML 또는 JSON으로 입력하고, 구조 탐색·검증·읽기 전용 API 문서 미리보기를 확인하며, Swagger 2.0과 OpenAPI 3.0/3.1 사이를 모든 방향으로 변환할 수 있다.

버전 하향 변환에서 표현할 수 없는 정보가 생기면 변환을 숨기거나 성공으로만 표시하지 않는다. 변환 전후 문서를 비교하여 손실 가능 요소를 JSON Pointer 단위의 경고로 제공하고, 사용자가 후보 결과를 검토한 뒤 편집기에 적용하도록 한다.

## 2. 범위

### 2.1 MVP 포함 범위

- YAML과 JSON 직접 입력 및 Monaco Editor 문법 강조
- `.yaml`, `.yml`, `.json` 파일 업로드
- 확장자와 내용을 이용한 고정형 자동 형식 감지
- YAML ↔ JSON 편집 포맷 변환
- 현재 편집 포맷과 독립적인 YAML·JSON 다운로드
- Swagger 2.0, OpenAPI 3.0.x, OpenAPI 3.1.x 입력 검증
- Swagger 2.0 ↔ OpenAPI 3.0 ↔ OpenAPI 3.1의 모든 변환 방향
- 기존 변환 라이브러리와 자체 보정·경고 계층의 조합
- 단일 문서 내부 `$ref` 검증 및 위치 추적
- 외부 URL·외부 파일 `$ref` 탐지와 경고
- 3분할 작업 화면: 문서 탐색기, 편집기, 읽기 전용 Swagger UI
- 변환 후보 검토, 적용, 취소, 원본 복원
- 라이트·다크 테마
- 반응형 화면과 패널 접기
- Tool Hub 홈 카드와 저장소 문서 연결

### 2.2 MVP 제외 범위

- OpenAPI 3.2 입력·출력 및 변환
- AsyncAPI와 기타 API 명세 형식
- 다중 파일 업로드와 외부 파일 `$ref` 번들링
- 외부 URL `$ref` 다운로드
- Swagger UI `Try it out`과 실제 API 호출
- CORS 우회 프록시 서버
- 계정, 서버 저장, 공유 URL, 협업 편집
- SDK·서버 스텁·클라이언트 코드 생성
- 전체 변환 이력 저장
- API 명세의 `localStorage`·IndexedDB 영구 저장

OpenAPI 공식 저장소에는 2026-07-21 기준 3.0.4, 3.1.2, 3.2.0 문서가 존재하지만, 사용자가 승인한 MVP 범위는 Swagger 2.0과 OpenAPI 3.0/3.1 계열로 제한한다.

## 3. 지원 버전과 출력 규칙

### 3.1 입력 버전

| 계열 | 인식하는 루트 값 |
|---|---|
| Swagger 2.0 | `swagger: "2.0"` |
| OpenAPI 3.0 | `openapi: "3.0.0"`부터 `"3.0.4"` |
| OpenAPI 3.1 | `openapi: "3.1.0"`부터 `"3.1.2"` |

지원 범위를 벗어난 값은 문서를 지우거나 강제로 낮추지 않고 `UNSUPPORTED_SPEC_VERSION` 오류를 표시한다. OpenAPI 3.2 문서에는 후속 지원 대상임을 명시한다.

### 3.2 변환 대상 버전

사용자에게 노출하는 대상은 다음 세 가지다.

- Swagger `2.0`
- OpenAPI `3.0.4`
- OpenAPI `3.1.2`

같은 계열의 이전 패치 버전에서 최신 지원 패치 버전으로 변환할 때는 루트 버전을 정규화하고 대상 버전 검증을 수행한다. 구조 변경이 필요하지 않은 경우 `NORMALIZED_PATCH_VERSION` 정보 진단만 제공한다.

### 3.3 변환 매트릭스

| 입력 | 출력 | 경로 |
|---|---|---|
| 2.0 | 3.0.4 | `swagger2openapi` 어댑터 → 보정 → 재검증 |
| 2.0 | 3.1.2 | 2.0 → 3.0.4 → 3.1.2 연쇄 변환 |
| 3.0.x | 2.0 | 자체 3.x → 2.0 어댑터 → 보정 → 재검증 |
| 3.0.x | 3.1.2 | 자체 3.0 → 3.1 승격 규칙 → 재검증 |
| 3.1.x | 3.0.4 | `@apiture/openapi-down-convert` 어댑터 → 보정 → 재검증 |
| 3.1.x | 2.0 | 3.1 → 3.0.4 → 2.0 연쇄 변환 |

연쇄 변환은 중간 단계마다 검증한다. 중간 단계가 실패하면 다음 변환기를 호출하지 않고 실패 단계와 진단을 반환한다.

## 4. 전체 아키텍처

### 4.1 실행 경계

```text
브라우저
├─ React 메인 스레드
│  ├─ Topbar
│  ├─ 문서 탐색기
│  ├─ Monaco Editor
│  ├─ Swagger UI 읽기 전용 미리보기
│  ├─ 변환 검토 상태
│  └─ 업로드·다운로드·테마·패널 상태
└─ Web Worker
   ├─ YAML/JSON 파싱과 위치 인덱스
   ├─ 버전 감지
   ├─ OpenAPI 검증
   ├─ 내부 $ref 검사
   ├─ 변환 라우팅
   ├─ 라이브러리 어댑터
   ├─ 보정·손실 경고
   └─ 대상 버전 재검증
```

React는 화면과 사용자 상호작용만 담당한다. 문서 크기에 비례하는 파싱·검증·변환은 Web Worker에서 실행하여 입력 중 메인 스레드 정지를 줄인다.

### 4.2 주요 모듈 경계

| 모듈 | 책임 | 주요 의존성 |
|---|---|---|
| `document-parser` | YAML/JSON 파싱, AST와 위치 정보 생성 | `yaml`, JSON AST 파서 |
| `format-detector` | 확장자·내용 기반 고정형 형식 감지 | parser |
| `version-detector` | Swagger/OpenAPI 계열과 패치 버전 감지 | 없음 |
| `document-validator` | 구조 검증, 내부 `$ref`, 외부 `$ref` 진단 | `@scalar/openapi-parser` |
| `conversion-router` | 입력·출력 버전에 맞는 직접·연쇄 경로 결정 | converter adapters |
| `converter-adapters` | 외부 변환기와 자체 변환 규칙 격리 | 변환 라이브러리 |
| `reconciler` | 변환 결과 보정, 전후 비교, 손실 경고 | pointer walker |
| `navigator-index` | JSON Pointer와 Monaco 위치·트리 노드 연결 | AST |
| `serializer` | YAML·JSON 출력과 안정된 키 순서 | `yaml`, JSON |
| `downloader` | 파일명 정규화, Blob 생성·폐기 | Browser API |

외부 라이브러리의 형식은 UI나 도메인 타입으로 직접 노출하지 않는다. 모든 변환기는 동일한 `ConverterAdapter` 인터페이스 뒤에 둔다.

```ts
interface ConverterAdapter {
  readonly source: SpecFamily;
  readonly target: SpecFamily;
  convert(document: OpenApiDocument): Promise<AdapterResult>;
}

interface AdapterResult {
  document: OpenApiDocument;
  diagnostics: Diagnostic[];
}
```

## 5. 핵심 도메인 모델

```ts
type DocumentFormat = 'yaml' | 'json';
type SpecFamily = 'swagger-2.0' | 'openapi-3.0' | 'openapi-3.1';
type Severity = 'info' | 'warning' | 'error';

interface SourceLocation {
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
}

interface Diagnostic {
  id: string;
  code: string;
  severity: Severity;
  stage: 'parse' | 'validate' | 'convert' | 'reconcile' | 'render';
  message: string;
  sourcePointer: string;
  targetPointer?: string;
  location?: SourceLocation;
  action?: string;
  lossy: boolean;
}

interface ParsedDocument {
  raw: string;
  format: DocumentFormat;
  version: SpecFamily;
  value: OpenApiDocument;
  pointerLocations: Map<string, SourceLocation>;
  diagnostics: Diagnostic[];
}

interface ConversionCandidate {
  revision: number;
  sourceVersion: SpecFamily;
  targetVersion: SpecFamily;
  sourceSnapshot: string;
  targetDocument: OpenApiDocument;
  targetText: string;
  diagnostics: Diagnostic[];
  targetValid: boolean;
}
```

`OpenApiDocument`는 `Record<string, unknown>` 기반의 경계 타입으로 시작하되, 버전별 핵심 루트 필드와 변환 규칙에는 명시적인 타입 가드를 제공한다. 외부 변환기의 광범위한 `any` 타입이 UI 계층으로 퍼지지 않게 한다.

## 6. YAML·JSON 입력과 고정형 자동 감지

### 6.1 파일 업로드

1. `.yaml` 또는 `.yml`이면 YAML 후보로 설정한다.
2. `.json`이면 JSON 후보로 설정한다.
3. 후보 형식 파싱에 실패하면 다른 형식으로 한 번 재시도한다.
4. 다른 형식만 성공하면 실제 성공 형식으로 열고 `FILE_EXTENSION_MISMATCH` 경고를 표시한다.
5. 둘 다 실패하면 확장자 기반 Monaco 모드를 유지하고 문법 오류를 표시한다.

### 6.2 붙여넣기와 새 문서

- 빈 편집기 붙여넣기 또는 전체 교체는 JSON을 먼저 파싱한다.
- JSON이 실패하면 YAML을 파싱한다.
- 한 형식이 성공하면 형식을 확정하고 잠근다.
- 둘 다 실패하면 마지막 확정 형식 또는 새 문서 기본값 YAML을 유지한다.
- 파일 열기·전체 초기화 전까지 자동으로 다른 형식으로 전환하지 않는다.

JSON은 YAML 1.2의 부분집합이므로 확장자가 없는 내용에서는 JSON 우선 검사가 필수다.

### 6.3 수동 제어

수동 선택은 기본 작업이 아니라 오탐 복구 기능이다.

- `형식 다시 감지`
- `YAML로 강제 해석`
- `JSON으로 강제 해석`

강제 해석은 문서를 변환하지 않고 파서와 Monaco 언어 모드만 바꾼다. 실제 YAML ↔ JSON 변환은 별도 `포맷 변환` 명령으로 실행한다.

### 6.4 YAML ↔ JSON 포맷 변환

- 현재 문서가 유효하게 파싱되어야 한다.
- YAML → JSON에서는 주석·앵커·별칭 손실 가능성을 적용 전에 알린다.
- 변환 전 원문을 메모리 스냅샷으로 보관한다.
- 포맷 변환은 OpenAPI 버전을 바꾸지 않는다.
- Monaco undo 기록과 `원본 복원`을 모두 제공한다.
- 포맷 변환이나 버전 변환을 새로 적용할 때마다 복원 슬롯을 직전 원문으로 교체한다. MVP는 가장 최근의 파괴적 변환 한 건만 원클릭 복원한다.

## 7. 파싱·위치·탐색기

### 7.1 YAML

`yaml` 패키지의 Document AST와 line counter를 사용한다. 파싱 결과 객체만 사용하지 않고 각 노드의 범위를 JSON Pointer와 연결하여 Monaco 위치 이동을 지원한다.

### 7.2 JSON

`jsonc-parser`를 엄격 모드로 사용한다. `disallowComments: true`, `allowTrailingComma: false`로 설정하고 객체·배열 노드 위치를 JSON Pointer로 인덱싱한다.

### 7.3 문서 탐색기

탐색기는 버전별 루트 구조 차이를 정규화한 뷰 모델을 사용한다.

- Info
- Servers 또는 Swagger 2.0의 host/basePath/schemes
- Paths와 HTTP operation
- Components 또는 Swagger 2.0의 definitions/parameters/responses/securityDefinitions
- Tags
- Security
- 진단 목록

트리 항목을 클릭하면 `pointerLocations`에서 위치를 찾아 Monaco selection과 스크롤을 이동한다. 위치가 없는 변환 후보 경고는 가장 가까운 상위 Pointer로 이동한다.

## 8. 검증과 `$ref` 정책

### 8.1 검증 순서

1. YAML/JSON 문법 파싱
2. 루트 객체 확인
3. 버전 감지
4. 해당 버전 구조 검증
5. 내부 `$ref` 존재 여부와 순환 참조 검사
6. 외부 `$ref` 탐지
7. 탐색기·미리보기용 안전한 문서 생성

문법 오류 또는 지원하지 않는 버전은 변환을 차단한다. 외부 `$ref`는 경고지만 원문 편집과 동일 형식 다운로드를 차단하지 않는다.

### 8.2 내부 참조

- `#/...`로 시작하는 참조만 해석한다.
- JSON Pointer escape 규칙인 `~0`, `~1`을 처리한다.
- 존재하지 않는 참조는 `UNRESOLVED_INTERNAL_REF` 오류다.
- 순환 참조 자체는 스키마에서 가능하므로 무조건 오류로 만들지 않는다.
- 순환을 따라 무한 전개하지 않고 방문 집합으로 중단한다.

### 8.3 외부 참조

다음 참조는 가져오지 않는다.

- `https://...`
- `http://...`
- `./common.yaml#/...`
- `../schemas.json#/...`

`EXTERNAL_REF_NOT_RESOLVED` 경고를 생성하고 원문 문자열은 유지한다. Web Worker와 Swagger UI 모두 외부 참조를 가져오지 못하게 네트워크 요청을 차단한다.

## 9. 버전 변환과 보정 규칙

### 9.1 공통 파이프라인

```text
원본 파싱
→ 원본 버전 검증
→ 변환 경로 선택
→ 직접 또는 연쇄 변환
→ 자체 보정
→ 변환 전후 의미 비교
→ 손실 경고 생성
→ 대상 버전 재검증
→ 후보 직렬화
```

### 9.2 Swagger 2.0 → OpenAPI 3.0

`swagger2openapi`를 격리된 어댑터로 사용하고 다음 항목을 자체 검증한다.

- `host`, `basePath`, `schemes` → `servers`
- `consumes`, `produces` → request/response `content`
- body/formData parameter → `requestBody`
- `definitions` → `components.schemas`
- `securityDefinitions` → `components.securitySchemes`
- Swagger 2.0 내부 `$ref` → OpenAPI 3 내부 `$ref`
- 원본 `x-*` 확장 보존

라이브러리에서 나온 경고를 도메인 `Diagnostic`으로 변환하고, 변환 전후 비교에서 추가 누락을 탐지한다.

### 9.3 OpenAPI 3.0 → OpenAPI 3.1

자체 승격 규칙을 적용한다.

- `openapi`를 `3.1.2`로 정규화
- `nullable: true`를 `type`의 `null` 표현으로 변환
- 3.0의 boolean `exclusiveMinimum`/`exclusiveMaximum`과 경계값을 3.1 숫자 키워드로 변환
- Schema Object의 3.1 JSON Schema 표현으로 안전하게 이동 가능한 항목 변환
- 3.0에서 이미 유효한 구조는 불필요하게 재작성하지 않음

### 9.4 OpenAPI 3.1 → OpenAPI 3.0

`@apiture/openapi-down-convert`를 어댑터로 사용하되 라이브러리 문서가 완전한 변환을 보장하지 않으므로 다음 보정을 독립적으로 수행한다.

- `type: [T, "null"]` → `type: T`, `nullable: true`
- 단일 `const` → 단일 값 `enum`
- 숫자 `exclusiveMinimum`/`exclusiveMaximum` → 3.0 경계값과 boolean 표현
- 3.0에서 지원하지 않는 JSON Schema 키워드 탐지
- `webhooks` 등 3.0에서 지원하지 않는 루트 기능 탐지
- `$ref` 형제 필드 처리와 경고

하향 버전에서 의미를 표현할 수 없는 필드는 가장 가까운 객체의 `x-toolhub-original-<keyword>` 확장으로 보존하고 `lossy: true` 경고를 생성한다. 대상 도구가 해당 확장을 이해하지 못하므로 의미 보존 성공으로 간주하지 않는다.

### 9.5 OpenAPI 3.x → Swagger 2.0

유지보수 위험이 큰 범용 역변환 패키지를 핵심 의존성으로 채택하지 않고, 필요한 범위의 자체 어댑터를 구현한다.

- 첫 번째 유효 `servers` URL → `schemes`, `host`, `basePath`
- 추가 서버 → 손실 경고와 `x-toolhub-original-servers`
- `components.schemas` → `definitions`
- `components.parameters` → `parameters`
- `components.responses` → `responses`
- `components.securitySchemes` → `securityDefinitions`
- `requestBody` → body 또는 formData parameter
- response `content` → `schema`, `examples`, `produces`
- operation별 `content` 차이를 Swagger 전역·operation `consumes`/`produces`로 축약
- cookie parameter, callbacks, links, webhooks와 표현 불가능 Schema 키워드 → 확장 보존과 손실 경고
- 내부 `$ref` 경로 재작성
- 기존 `x-*` 확장 보존

여러 미디어 타입이나 서버 중 하나를 선택해야 할 때는 문서 순서의 첫 번째 값을 사용하고 선택 사실을 경고한다. 임의의 의미 추론은 하지 않는다.

### 9.6 변환 전후 비교

다음 의미 인벤토리를 원본과 후보에서 추출해 비교한다.

- path와 HTTP method
- operationId
- parameter 위치와 필수 여부
- request body 존재 여부와 media type
- response status와 media type
- schema 이름과 내부 `$ref` 연결
- security scheme과 operation security
- server URL
- callbacks, links, webhooks
- vendor extensions

인벤토리 차이가 변환기의 기존 경고로 설명되지 않으면 `UNEXPLAINED_CONVERSION_CHANGE` 오류로 승격하고 후보 적용을 차단한다.

## 10. Web Worker 프로토콜과 경쟁 상태

```ts
type WorkerRequest =
  | { type: 'analyze'; revision: number; raw: string; filename?: string; formatHint?: DocumentFormat }
  | { type: 'convert'; revision: number; document: OpenApiDocument; source: SpecFamily; target: SpecFamily; outputFormat: DocumentFormat };

type WorkerResponse =
  | { type: 'analysis-result'; revision: number; result: AnalysisResult }
  | { type: 'conversion-result'; revision: number; candidate: ConversionCandidate }
  | { type: 'worker-error'; revision: number; error: SerializableWorkerError };
```

- 모든 요청은 단조 증가하는 `revision`을 가진다.
- 메인 스레드는 최신 revision보다 오래된 응답을 폐기한다.
- 편집 중 분석은 마지막 입력 후 400ms 디바운스한다.
- 변환 중 원문이 변경되면 변환 후보를 폐기한다.
- Worker가 종료되면 한 번 자동 재시작하고 현재 원문을 다시 분석한다.
- 두 번째 연속 종료에서는 재시작을 중단하고 원문 다운로드와 새로고침 안내를 제공한다.

## 11. React 상태와 UI

### 11.1 작업 상태

```ts
type WorkspaceStatus =
  | 'idle'
  | 'analyzing'
  | 'valid'
  | 'invalid'
  | 'converting'
  | 'reviewing'
  | 'worker-error';
```

주요 상태는 현재 원문, 확정 형식, 감지 버전, 마지막 유효 분석, 변환 후보, 복원 스냅샷, 패널 폭으로 나눈다. 하나의 거대한 컴포넌트에 모두 넣지 않고 `useWorkspace`, `useDocumentAnalysis`, `useConversion`, `usePanelLayout` 훅으로 책임을 나눈다.

### 11.2 3분할 데스크톱 화면

```text
┌────────────────────────────────────────────────────────────┐
│ 파일 · 입력 버전 · 대상 버전 · 변환 · 업로드 · 다운로드 │
├──────────────┬─────────────────────┬───────────────────────┤
│ 문서 탐색기  │ Monaco Editor       │ Swagger UI 미리보기   │
│ 구조/진단    │ YAML 또는 JSON      │ 읽기 전용             │
│ Pointer 이동 │ 원본/후보 탭        │ 최신/오래된 상태 표시 │
└──────────────┴─────────────────────┴───────────────────────┘
```

- 기본 폭은 22% / 39% / 39%다.
- 두 구분선을 드래그해 폭을 조절한다.
- 패널 최소 폭을 적용하고 탐색기·미리보기를 접을 수 있다.
- 문서 내용은 저장하지 않고 패널 폭과 테마만 `localStorage`에 저장한다.

### 11.3 반응형 화면

- 1024px 이상: 3분할
- 768px 이상 1024px 미만: 탐색기 접힘, 편집기·미리보기 2분할
- 768px 미만: 구조·편집기·미리보기·진단 탭 전환

### 11.4 일반 편집 상태

- 편집기 헤더에 파일명, 자동 감지 형식, cursor 위치 표시
- Topbar에 감지된 입력 버전과 대상 버전 표시
- 문서 탐색기에서 구조와 진단 탭 제공
- Swagger UI에는 마지막 유효 문서만 전달
- 하단 상태 바에 검증 상태, 내부 참조 수, 외부 참조 경고 수 표시

### 11.5 변환 검토 상태

- 원본 편집을 잠가 변환 기준점 변경 방지
- 탐색기 패널을 변환 경고 목록 우선 상태로 전환
- 가운데 편집기에 `원본`과 `변환 결과` 읽기 전용 탭 제공
- 오른쪽 미리보기에는 변환 후보 표시
- 상단에 `취소`, `편집기에 적용` 제공
- 대상 버전 검증 오류 또는 설명되지 않은 변경이 있으면 적용 비활성화
- 적용 후 복원 스냅샷 1개와 Monaco undo 기록 유지

### 11.6 파싱 오류 상태

- Monaco marker와 진단 목록에 위치 표시
- 마지막 유효 미리보기를 유지
- 미리보기에 `현재 편집 내용과 다름` 배지 표시
- 버전 변환과 다른 형식 다운로드 비활성화
- 현재 원문과 동일 형식 다운로드는 허용

## 12. 파일 업로드와 다운로드

### 12.1 업로드

- 클릭 파일 선택과 drag-and-drop 지원
- 허용 확장자: `.yaml`, `.yml`, `.json`
- UTF-8 텍스트 기준
- 5MB 초과 시 성능 경고
- 20MB 초과 시 열기 차단
- 기존 작업이 수정된 상태면 교체 확인

### 12.2 다운로드

- 현재 문서가 파싱 가능하면 YAML과 JSON을 항상 제공
- 현재 문서가 파싱 불가능하면 현재 원문 형식 다운로드만 제공
- YAML 기본 들여쓰기 2칸
- JSON 기본 들여쓰기 2칸과 마지막 개행
- 원래 basename 유지, 선택 형식에 맞춰 확장자 변경
- basename이 없으면 `openapi.yaml` 또는 `openapi.json`
- 파일명 경로 구분자와 제어 문자 제거
- Blob URL은 다운로드 트리거 직후 `URL.revokeObjectURL`로 해제

## 13. 오류 처리와 복구

| 오류 | UI 처리 | 데이터 처리 |
|---|---|---|
| YAML/JSON 문법 오류 | Monaco marker, 변환 비활성화 | 현재 원문과 마지막 유효 결과 유지 |
| 버전 누락·미지원 | 루트 진단 | 원문 유지, 변환 차단 |
| 내부 `$ref` 미해결 | Pointer 진단 | 변환 차단 |
| 외부 `$ref` | 경고 | 네트워크 요청 없이 문자열 보존 |
| 변환기 실패 | 실패 단계와 원인 | 후보 폐기, 원본 유지 |
| 대상 재검증 실패 | 후보 진단, 적용 비활성화 | 후보는 검토용으로만 유지 |
| Worker 1차 종료 | 재시작 상태 | 현재 원문 재분석 |
| Worker 연속 종료 | 복구 안내 | 원문 다운로드 허용 |
| Swagger UI 렌더 오류 | 미리보기 오류 경계 | 편집기와 분석 결과 유지 |

브라우저 종료·새로고침으로 문서가 사라질 수 있으므로 수정된 문서에는 `beforeunload` 확인을 사용한다. API 명세를 브라우저 영구 저장소에 자동 저장하지 않는다.

## 14. 보안과 개인정보

- 모든 문서 처리는 브라우저에서 수행한다.
- 외부 `$ref`와 Swagger UI 네트워크 요청을 차단한다.
- `Try it out`은 `supportedSubmitMethods: []` 등으로 비활성화한다.
- Swagger UI request interceptor에서 문서 관련 외부 요청을 거부한다.
- YAML alias 확장 수, 객체 깊이, 파일 크기를 제한한다.
- 미리보기 컴포넌트를 오류 경계로 격리한다.
- 사용자 description의 HTML·Markdown이 임의 스크립트를 실행하지 못하도록 Swagger UI의 안전한 렌더링 설정과 CSP를 적용한다.
- API 명세는 `localStorage`, 로그, 분석 이벤트에 기록하지 않는다.
- 변환기 예외 메시지에 전체 문서 내용을 포함하지 않는다.
- 파일명은 다운로드 전에 정규화한다.

## 15. 성능과 복잡도

문서 노드 수를 `n`, 내부 참조 수를 `r`, 진단 수를 `d`라고 한다.

| 작업 | 시간 복잡도 | 공간 복잡도 |
|---|---:|---:|
| 형식 감지 | `O(n)` | `O(n)` |
| YAML/JSON 파싱 | `O(n)` | `O(n)` |
| Pointer 위치 인덱스 | `O(n)` | `O(n)` |
| 내부 `$ref` 검사 | `O(n + r)` | `O(n + r)` |
| 직접 변환과 보정 | `O(n)` | `O(n)` |
| 연쇄 변환 | `O(n)` | `O(n)` |
| 의미 인벤토리 비교 | `O(n)` | `O(n)` |
| 진단 정렬 | `O(d log d)` | `O(d)` |
| 탐색기 Pointer 이동 | 평균 `O(1)` | Pointer map에 포함 |

전체 분석·변환은 `O(n + r)`, 공간은 `O(n + r)`이다. 현재 원문, 마지막 유효 객체, 변환 후보와 Worker 구조화 복제로 실제 상수 배수 메모리가 필요하지만 점근 복잡도는 유지된다.

메인 스레드 작업은 편집 상태 갱신과 렌더링으로 제한한다. Swagger UI 렌더링은 메인 스레드에서 발생하므로 400ms 디바운스와 마지막 유효 문서 전략을 적용한다.

## 16. 프로젝트 구조

```text
openapi-editor/
├─ AGENTS.md
├─ README.md
├─ docs/
│  └─ contributor-guide.md
├─ public/
├─ src/
│  ├─ components/
│  │  ├─ layout/
│  │  ├─ navigator/
│  │  ├─ editor/
│  │  ├─ preview/
│  │  ├─ conversion/
│  │  └─ ui/
│  ├─ hooks/
│  ├─ lib/
│  │  ├─ parser/
│  │  ├─ validation/
│  │  ├─ conversion/
│  │  │  ├─ adapters/
│  │  │  ├─ reconcile/
│  │  │  └─ warnings/
│  │  ├─ navigation/
│  │  ├─ serialization/
│  │  └─ download/
│  ├─ workers/
│  ├─ styles/
│  ├─ test/
│  ├─ theme.ts
│  ├─ App.tsx
│  └─ main.tsx
├─ e2e/
├─ test/fixtures/
├─ package.json
├─ tsconfig*.json
├─ vite.config.ts
└─ vitest.config.ts
```

저장소 프론트엔드 컨벤션에 따라 App은 얇게 유지하고, shell/content를 분리하며, CSS는 theme/base/components 주제로 나눈다. 테마는 `[data-theme]`, `theme.ts`, `useTheme`, FOUC 방지 스크립트 구조를 따른다.

## 17. 의존성 방향

| 용도 | 선택 방향 |
|---|---|
| 앱 | Vite + React + TypeScript |
| 편집기 | Monaco React wrapper |
| YAML AST | `yaml` |
| JSON AST | 엄격 모드의 `jsonc-parser` |
| OpenAPI 파싱·검증 | 브라우저 지원 `@scalar/openapi-parser` |
| 2.0 → 3.0 | `swagger2openapi` |
| 3.1 → 3.0 | `@apiture/openapi-down-convert` |
| 미리보기 | `swagger-ui-react` |
| 단위·컴포넌트 테스트 | Vitest + Testing Library |
| 브라우저 테스트 | Playwright |

Web Worker에서 실행할 외부 파서·검증·변환 패키지는 구현 초기에 다음 게이트를 모두 통과해야 한다.

1. Vite production browser build 성공
2. Web Worker bundle 안에서 실행 성공
3. Node 전용 내장 모듈 polyfill 강제 없음
4. 저장소 보안 감사에서 수용 불가능한 취약점 없음
5. 대표 fixture 변환 성공
6. 라이선스 기록 가능

게이트를 통과하지 못한 변환기는 해당 어댑터만 자체 구현으로 교체한다. UI, 라우터, 경고 모델은 변경하지 않는다.

## 18. 테스트 전략

### 18.1 단위 테스트

- 확장자·내용·수동 override 형식 감지
- YAML/JSON 파싱과 Pointer 위치
- 지원·미지원 버전 감지
- 내부·외부 `$ref` 분류
- 직렬화와 파일명 정규화
- 변환 라우터의 직접·연쇄 경로
- 각 보정 규칙과 Diagnostic
- 변환 전후 의미 인벤토리 비교
- Worker revision과 stale response 폐기

### 18.2 변환 골든 fixture

```text
test/fixtures/conversions/
├─ 2-to-3.0/
├─ 2-to-3.1/
├─ 3.0-to-2/
├─ 3.0-to-3.1/
├─ 3.1-to-3.0/
└─ 3.1-to-2/
```

각 fixture는 입력, 정규화 예상 결과, 예상 진단을 가진다. 문자열 스냅샷만 비교하지 않고 path/method, parameter, request/response, schema ref, security, server와 손실 경고를 의미 단위로도 검증한다.

경계 fixture에는 `webhooks`, callbacks, links, 여러 servers, 여러 media type, nullable, type 배열, const, unevaluatedProperties, exclusive bounds, `$ref` 형제 필드, cookie parameter, vendor extensions, 순환 내부 참조, 외부 참조를 포함한다.

### 18.3 React 컴포넌트 테스트

- YAML·JSON 자동 감지 표시와 format lock
- 탐색기 렌더와 Monaco 위치 이동
- 마지막 유효 미리보기와 오래된 상태 배지
- 파싱 오류 시 변환 비활성화
- 변환 후보 원본/결과 탭
- 경고 Pointer 이동
- 적용·취소·복원
- YAML·JSON 다운로드 메뉴
- 패널 리사이즈·접기

### 18.4 Playwright 사용자 흐름

1. YAML 업로드 → 자동 감지 → 미리보기
2. JSON 업로드 → 자동 감지 → 미리보기
3. 붙여넣기 → 형식 고정 → 탐색기 생성
4. 문법 오류 → 마지막 유효 미리보기 유지
5. 2.0 → 3.1 변환 → 검토 → 적용
6. 3.1 → 2.0 변환 → 손실 경고 확인
7. 변환 취소 → 원본 유지
8. YAML·JSON 다운로드 → 재업로드·재파싱
9. 외부 `$ref` → 네트워크 없이 경고
10. 모바일 탭 전환과 데스크톱 패널 리사이즈

### 18.5 보안·안정성 테스트

- YAML alias 증폭
- 깊은 중첩
- 순환·미해결 내부 `$ref`
- 외부 URL·파일 `$ref`
- HTML·스크립트가 있는 description
- 5MB 성능 경고와 20MB 차단
- Worker 재시작과 연속 실패
- 다운로드 파일명 특수문자

### 18.6 필수 검증 명령

```bash
npm run test
npm run lint
npm run typecheck
npm run build
npm run test:e2e
```

## 19. 문서와 Tool Hub 통합

구현 시 다음 문서를 함께 갱신한다.

- 루트 `README.md` 도구 목록
- `home/src/data/tools.ts`의 OpenAPI Studio 카드
- `home/src/data/tools.test.ts`
- `openapi-editor/README.md`의 지원 범위와 손실 가능성
- `openapi-editor/AGENTS.md`의 검증 명령 인덱스
- `openapi-editor/docs/contributor-guide.md`의 변환 fixture와 보정 규칙 작성법
- 루트 `docs/contributor-guide.md`의 프로젝트별 문서 링크

배포 전 홈 카드는 `coming-soon`, `url: null`로 추가한다. 실제 배포 URL이 생기기 전 임의 URL을 넣지 않는다.

## 20. 대안과 결정

### 20.1 Next.js 대신 Vite React

- 선택: Vite React SPA
- 이유: 서버 기능이 없고 모든 처리를 브라우저에서 수행하므로 정적 배포가 단순하다.
- 대안 장점: Next.js는 향후 저장·공유 API에 유리하다.
- 대안 단점: MVP에는 서버 프레임워크 비용과 경계가 불필요하다.

### 20.2 메인 스레드 대신 Web Worker

- 선택: 파싱·검증·변환을 Worker로 이동
- 이유: 입력 중 UI 정지를 줄이고 경쟁 상태를 명시적 revision으로 관리한다.
- 대안 장점: 메인 스레드 전용 구현은 단순하다.
- 대안 단점: 큰 문서 변환이 편집과 패널 조작을 막을 수 있다.

### 20.3 변환 라이브러리만 사용하지 않음

- 선택: 전문 라이브러리 + 어댑터 + 자체 보정·경고
- 이유: 라이브러리별 지원 방향과 완전성이 다르고 하향 변환은 손실 추적이 필수다.
- 대안 장점: 라이브러리 직접 사용은 개발이 빠르다.
- 대안 단점: 누락·손실·유지보수 위험을 UI에서 통제하기 어렵다.

### 20.4 마지막 유효 미리보기

- 선택: 오류 시 마지막 유효 Swagger UI를 오래된 상태 배지와 함께 유지
- 이유: 작은 입력 오류마다 미리보기가 사라지는 것을 막는다.
- 대안 장점: 오류 즉시 제거는 현재 문서와 미리보기 불일치를 없앤다.
- 대안 단점: 편집 흐름이 크게 끊긴다.

## 21. 완료 기준

- YAML·JSON 업로드, 붙여넣기, 직접 입력이 고정형 자동 감지로 동작한다.
- 사용자는 수동 형식 선택 없이 일반적인 파일과 붙여넣기를 편집할 수 있다.
- Swagger 2.0, OpenAPI 3.0.x, 3.1.x를 검증하고 지원 범위 밖 버전을 명확히 거부한다.
- 여섯 변환 방향이 모두 구현되고 대상 버전 재검증을 수행한다.
- 하향 변환 손실이 JSON Pointer 경고로 나타난다.
- 설명되지 않은 변환 변경은 적용을 차단한다.
- 외부 `$ref`에 네트워크 요청을 하지 않는다.
- `Try it out`이 비활성화된다.
- 오류가 있어도 현재 원문과 마지막 유효 미리보기가 보존된다.
- YAML·JSON 다운로드 결과가 다시 파싱된다.
- 3분할 데스크톱 UI와 모바일 탭 UI가 동작한다.
- 새 프로젝트와 `home/`의 test, lint, typecheck, build가 통과한다.
- Playwright 핵심 사용자 흐름이 통과한다.
- README, contributor guide, 홈 도구 메타데이터가 실제 구현과 일치한다.

## 22. 주의사항

> Swagger 2.0과 OpenAPI 3.0/3.1은 표현력이 다르므로 모든 방향의 무손실 변환은 불가능하다. 대상 버전 검증 성공은 의미 보존 성공과 같지 않다.
>
> YAML에서 JSON으로 전환하면 주석·앵커·별칭을 완전히 보존할 수 없다. 적용 전 경고와 원본 복원이 필요하다.
>
> 외부 `$ref` 문자열은 원문에 남을 수 있지만 도구가 가져오거나 검증하지 않는다. 미리보기에서도 네트워크 요청을 차단해야 한다.
>
> 변환 라이브러리의 성공 반환만 완료 기준으로 사용하지 않는다. 보정, 의미 비교, 대상 버전 재검증, 골든 fixture가 모두 필요하다.

## 23. 참고 자료

- [OpenAPI Specification versions](https://github.com/OAI/OpenAPI-Specification/tree/main/versions)
- [Swagger UI 설치 문서](https://swagger.io/docs/open-source-tools/swagger-ui/usage/installation/)
- [Scalar OpenAPI Parser](https://github.com/scalar/openapi-parser)
- [swagger2openapi](https://github.com/Mermade/oas-kit/tree/main/packages/swagger2openapi)
- [OpenAPI Down Convert](https://github.com/apiture/openapi-down-convert)
- [Spectral](https://github.com/stoplightio/spectral)
