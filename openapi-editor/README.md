# openapi-editor

Swagger 2.0, OpenAPI 3.0.x, OpenAPI 3.1.x, OpenAPI 3.2.x 단일 문서를 브라우저 안에서 편집·검증·변환하는 Vite + React 도구다. 입력한 명세는 서버나 브라우저 영구 저장소에 저장하지 않는다.

## 지원 범위

- YAML·JSON 직접 입력과 `.yaml`, `.yml`, `.json` 업로드
- Swagger 2.0, OpenAPI 3.0.0~3.0.4, OpenAPI 3.1.0~3.1.2, OpenAPI 3.2.x 검증
- Swagger 2.0, OpenAPI 3.0.4, OpenAPI 3.1.2, OpenAPI 3.2.0 사이의 모든 변환 방향
- 내부 `$ref` 검사, 외부 `$ref` 경고, 읽기 전용 Swagger UI 미리보기
- YAML·JSON 다운로드, 버전별 YAML 예시 명세 다운로드, 라이트·다크 테마, 반응형 패널

## 변환 손실

Swagger 2.0과 OpenAPI 3.x의 표현력은 다르다. 하향 변환 시 표현할 수 없는 기능은 `x-toolhub-original-*` 확장에 보존하고 JSON Pointer 경고를 표시한다. 특히 OpenAPI 3.2의 `query`, `additionalOperations`, 확장 태그, 스트리밍 미디어 필드, OAuth Device Authorization Flow는 3.1 이하로 내릴 때 보존 경고 대상이다. 대상 버전 검증 통과가 의미의 완전한 보존을 뜻하지는 않는다.

## 보안 경계

- 외부 URL·파일 `$ref`는 다운로드하거나 해석하지 않는다.
- Swagger UI의 `Try it out`을 비활성화한다.
- 문서 내용은 `localStorage`나 분석 이벤트에 저장하지 않는다.

## 명령

```bash
mise run setup
mise run check
```
