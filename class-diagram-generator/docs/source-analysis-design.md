# 소스 분석 파이프라인 설계 인덱스

이 문서는 ZIP 입력, 프로젝트 감지, Java/Kotlin 파싱, 관계 추출, 레이어 분류와 관련된 ADR 상세 문서를 찾기 위한 인덱스다. 전체 ADR 목록은 [architecture-decisions.md](architecture-decisions.md)를, 잡 실행과 다운로드 운영 판단은 [job-processing-design.md](job-processing-design.md)를 참고한다.

## 문서 구성

| 분류 | ADR         | 상세 문서 |
|---|-------------|---|
| 입력 처리 | ADR-SRC-001 | [ZIP 처리 방식](source-analysis/zip-processing.md) |
| 프로젝트 구조 감지 | ADR-SRC-002 | [프로젝트 감지 방식](source-analysis/project-detection.md) |
| 언어별 파싱 | ADR-SRC-003 | [Kotlin 파서 생명주기](source-analysis/kotlin-parser-lifecycle.md) |
| 모델 해석 | ADR-SRC-004 | [관계 해석 방식](source-analysis/relation-resolution.md) |
| 모델 해석 | ADR-SRC-005 | [레이어 분류 방식](source-analysis/layer-classification.md) |

## ADR 작성 형식

각 상세 문서는 아래 구조를 따른다.

- 현재 선택
- 대안
- 결정 이유
- 재검토 조건
- 복잡도
- 주의사항

## 관리 원칙

- 소스 분석 관련 A/B 판단이 추가되면 `docs/source-analysis/` 아래에 상세 문서를 만들고 이 인덱스에 연결한다.
- 상세 문서 파일명은 기능 이름을 기준으로 짧고 명확하게 작성한다.
- 코드 변경으로 현재 선택이 바뀌면 상세 문서를 삭제하지 않고, 변경된 선택과 재검토 배경을 갱신한다.
