# Tool Hub 문서

개발 지침과 도구별 설계를 주제별로 정리한다. 과거 작업 계획의 실행 순서·완료 체크박스·코드 복사본 대신 유지해야 할 동작, 설계 이유, 구현 위치와 검증 기준을 기록한다.

## 공통

- [기여자 가이드](contributor-guide.md): 프로젝트별 작업 위치와 검증 명령
- [프론트엔드 컨벤션](frontend-conventions.md): 테마, CSS 구조, 공통 셸, 반응형 규칙
- [디자인 시스템 구조와 유지보수](design-system.md): 생성물 배포, 토큰, 프리미티브, 앱별 예외
- [UI 검증](ui-verification.md): drift, 색상 대비, 셸 계약, 시각 회귀
- [문서 이관 목록](document-migration.md): 이전 설계·계획별 대체 문서와 폐기한 기준

## 도구별 설계

| 도구 | 문서 |
|---|---|
| JSON/YAML Converter | [변환·진단·편집 상태](../json-yaml-converter/docs/conversion-design.md) |
| OpenAPI Editor | [분석·버전 변환](../openapi-editor/docs/document-processing.md), [메뉴·패널 조작](../openapi-editor/docs/workspace.md) |
| API Contract Test Generator | [테스트 생성·검토·내보내기](../api-contract-test-generator/docs/test-generation.md) |
| Class Diagram Generator | [처리 흐름과 화면](../class-diagram-generator/docs/application-flow.md), [Java/Kotlin과 멀티모듈](../class-diagram-generator/docs/project-support.md), [다이어그램과 문서 출력](../class-diagram-generator/docs/diagram-output.md) |

다른 도구의 사용법과 상세 기여 지침은 [프로젝트별 참조](contributor-guide.md#project-specific-references)에서 찾는다. 새 설계는 해당 주제 문서를 갱신하고, 구현과 다른 제안은 현재 동작과 구분한다. 과거 검증 성공 기록은 현재 체크아웃의 검증 결과로 취급하지 않는다.
