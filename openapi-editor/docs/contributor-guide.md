# OpenAPI Studio Contributor Guide

## 프로젝트 구조

- `src/lib/parser/`: YAML·JSON 파싱, 형식 감지, 직렬화
- `src/lib/validation/`: 버전, 최소 구조, 내부·외부 `$ref` 검사
- `src/lib/conversion/`: 브라우저 전용 변환 어댑터와 의미 인벤토리
- `src/workers/`: revision 기반 분석·변환 Worker 프로토콜
- `src/components/`: 탐색기, Monaco 편집기, Swagger UI, 레이아웃

## 변환 규칙

변환 어댑터를 수정하면 입력과 대상 버전을 명확히 하고, 하향 변환으로 손실되는 필드는 `x-toolhub-original-<keyword>` 확장과 `lossy: true` 진단을 함께 추가한다. OpenAPI 3.2를 3.1 이하로 내릴 때는 3.2 전용 필드를 제거만 하지 말고 보존 경고를 남긴다. 외부 `$ref`를 해석하거나 네트워크 요청을 추가하지 않는다.

## 검증

```bash
mise run check
```

변환 로직 변경에는 해당 방향의 단위 테스트와 의미 인벤토리 회귀 테스트를 추가한다. 버전별 예시 명세는 버전을 감지할 수 있고 YAML로 내려받을 수 있어야 한다. UI 변경은 데스크톱, 768px~1023px, 767px 이하에서 구조·편집기·미리보기를 확인한다.
