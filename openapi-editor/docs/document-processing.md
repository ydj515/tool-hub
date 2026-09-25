# OpenAPI Editor 분석과 버전 변환

## 범위와 구조

Swagger 2.0과 OpenAPI 3.0/3.1/3.2 단일 문서를 브라우저에서 편집·검증·변환한다. 현재 지원 입력과 정규 출력 버전은 [README](../README.md), 타입은 [document.ts](../src/domain/document.ts)에 있다. 출력 대상은 Swagger 2.0, OpenAPI 3.0.4, 3.1.2, 3.2.0이다.

React는 편집 상태와 화면을 관리하고 Web Worker는 분석·버전 변환을 수행한다. [useWorkspace](../src/hooks/useWorkspace.ts)가 400ms 분석 debounce와 revision을 관리한다. [workers](../src/workers/)와 [lib](../src/lib/)는 메시지 경계와 파서·검증·변환 어댑터를 나눈다. 과거 계획의 훅 분할 예시는 필수 파일 구조가 아니다.

## 입력과 분석

YAML/JSON 자동 감지는 입력 형식을 정한 뒤 편집 중 유지한다. 잘못 감지됐을 때 다시 감지하거나 `YAML로 읽기`/`JSON으로 읽기`로 강제 지정한다. 강제 지정은 원문을 직렬화하지 않는다. 실제 형식 변환은 별도 명령이다.

분석 순서는 문법 파싱 → 루트 객체 → 버전 → 구조 검증 → 참조 검사 → 탐색기/미리보기 데이터다. YAML AST와 JSON 트리의 위치를 JSON Pointer에 연결한다. 탐색기는 버전별 info/servers/paths/components/tags/security 차이를 흡수한다. 위치가 없는 진단은 가까운 상위 Pointer를 이용한다.

내부 `$ref`는 `~0`/`~1` escape를 처리하며 존재하지 않는 참조는 오류다. 순환 자체를 무조건 오류로 만들지 않고 무한 전개를 중단한다. URL 또는 상대 파일 참조는 가져오지 않고 `EXTERNAL_REF_NOT_RESOLVED` 경고와 원래 문자열을 유지한다.

## 변환 파이프라인

```text
원본 검증 → 경로 선택 → 직접/연쇄 변환 → 자체 보정
  → 의미 인벤토리 비교 → 손실 진단 → 대상 재검증 → 후보 검토
```

변환기는 [conversion](../src/lib/conversion/) 아래에 격리한다. 라이브러리 결과만 신뢰하지 않고 어댑터 뒤에서 보정과 의미 비교를 수행한다.

| 방향 | 주요 규칙 |
|---|---|
| 2.0 → 3.0 | host/basePath/schemes를 servers로, consumes/produces를 content로, body/formData를 requestBody로, definitions/securityDefinitions를 components로 이동 |
| 3.0 → 3.1 | nullable과 null type, boolean exclusive 경계와 숫자 경계를 변환 |
| 3.1 → 3.0 | null type을 nullable로, const를 enum으로 변환; 미지원 JSON Schema·webhooks·ref 형제 필드 진단 |
| 3.x → 2.0 | servers·components·requestBody·response content와 내부 ref를 재작성; cookie/callbacks/links/webhooks 등 표현 불가능 요소 보존 경고 |
| 3.2 → 하위 버전 | query/additionalOperations, 확장 태그, 스트리밍 필드, OAuth Device Authorization 등 보존 경고 |

표현할 수 없는 값은 `x-toolhub-original-*` 확장에 보관하고 손실 진단을 남긴다. 확장이 존재하거나 대상 문법 검증이 성공해도 원래 의미가 대상 도구에서 실행된다는 뜻은 아니다. 여러 서버·미디어 중 선택이 필요한 경우 선택 사실을 알린다.

의미 인벤토리는 path/method, operationId, 파라미터와 필수 여부, 본문·응답 media type, 상태 코드, schema/ref, 인증, 서버, callbacks/links/webhooks, 확장을 비교한다. 설명되지 않는 차이는 `UNEXPLAINED_CONVERSION_CHANGE`로 처리해 후보 적용을 막는다.

## 상태와 복구

모든 Worker 메시지에는 revision이 있다. 최신 입력과 맞지 않는 응답은 버리고, 변환 기준 원문이 바뀌면 후보를 적용하지 않는다. 후보 검토 중 원본을 잠그고 원본/후보·경고·미리보기를 함께 확인한다. 대상 검증 오류가 있으면 적용할 수 없다.

적용 시 직전 원문을 메모리 스냅샷 한 슬롯에 저장한다. `원본 복원`과 Monaco undo를 제공한다. 형식 변환도 버전을 바꾸지 않으며 YAML 주석·앵커 표현의 손실을 고려한다.

파싱 오류에서는 마지막 유효 미리보기를 유지하되 현재 편집 내용과 다름을 표시한다. 버전 변환과 다른 형식 다운로드를 막고 현재 원문 다운로드는 유지한다. Worker 연속 장애에는 자동 재시작을 무한 반복하지 않고 원문 복구 경로를 제공한다. 미리보기 오류는 편집기와 격리한다.

## 파일과 보안 경계

`.yaml`, `.yml`, `.json`을 받으며 5MiB 경고/20MiB 차단 기준과 파서 안전 한계를 적용한다. 지원하지 않는 파일이나 읽기 실패로 현재 원문을 잃지 않게 한다. 다운로드는 basename을 정리하고 형식에 맞는 확장자를 붙인다. Blob URL은 사용 후 해제한다.

- 문서 원문·분석 결과는 서버나 영구 브라우저 저장소에 보관하지 않는다.
- 테마와 패널 설정은 저장할 수 있다.
- 외부 ref 요청을 차단하고 Swagger UI의 Try it out을 비활성화한다.
- 예외·분석 이벤트에 문서 전체를 기록하지 않는다.
- 편집 내용은 새로고침 시 사라질 수 있으므로 파일 다운로드와 이탈 확인 흐름을 유지한다.

## 검증

파서 위치, 버전 감지, 내부/외부/순환 ref, 모든 변환 방향의 골든 fixture, vendor extension, 설명되지 않는 누락, revision 경쟁, 후보 적용/취소/복원을 검사한다. 브라우저에서는 외부 요청 차단, 실제 Monaco/Swagger UI와 파일 다운로드를 확인한다. [기여자 가이드](contributor-guide.md)의 전체 명령을 따른다.

메뉴·반응형·리사이즈 기준은 [워크스페이스 문서](workspace.md)에 있다.
