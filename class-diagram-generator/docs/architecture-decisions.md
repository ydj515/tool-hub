# 아키텍처 결정 인덱스

이 문서는 `class-diagram-generator`의 주요 A/B 설계 판단을 한눈에 찾기 위한 인덱스다. 각 ADR의 상세 내용은 주제별 설계 문서에 둔다.

## 문서 목록

| 문서 | 범위 |
|---|---|
| [job-processing-design.md](job-processing-design.md) | 비동기 job 실행, SSE 진행 이벤트, 산출물 저장/다운로드, 렌더링 운영 판단 |
| [source-analysis-design.md](source-analysis-design.md) | ZIP 입력, 프로젝트 감지, Java/Kotlin 파싱, 관계 추출, 레이어 분류 |

## ADR 목록

| ADR         | 분류 | 현재 선택 | 비교 대상 | 상세 |
|-------------|---|---|---|---|
| ADR-JOB-001 | 렌더링 | `newWorkStealingPool` 기반 다이어그램 병렬 렌더링 | 순차 실행, fixed pool, virtual thread | [다이어그램 렌더링 병렬화](job-processing-design.md#adr-job-001-다이어그램-렌더링-병렬화) |
| ADR-JOB-002 | 상태 관리 | 인메모리 `ConcurrentHashMap` job store | DB, Redis, 파일 기반 상태 저장 | [잡 상태 저장소](job-processing-design.md#adr-job-002-잡-상태-저장소) |
| ADR-JOB-003 | 저장소 | 로컬 디스크와 TTL 삭제 | Object Storage, DB BLOB, 즉시 스트리밍 | [결과물 저장 방식](job-processing-design.md#adr-job-003-결과물-저장-방식) |
| ADR-JOB-004 | 다운로드 | `StreamingResponseBody` 기반 ZIP 스트리밍 | 메모리 ZIP 생성, 사전 ZIP 파일 생성 | [다운로드 스트리밍 방식](job-processing-design.md#adr-job-004-다운로드-스트리밍-방식) |
| ADR-SRC-001 | 입력 처리 | streaming extract와 Zip Slip 방어 | 전체 사전 검증, `ZipFile`, Java `ZipInputStream` | [ZIP 처리 방식](source-analysis/zip-processing.md) |
| ADR-SRC-003 | 언어별 파싱 | `KotlinCoreEnvironment` 재사용과 lock | 파일마다 환경 생성, thread-local 환경 | [Kotlin 파서 생명주기](source-analysis/kotlin-parser-lifecycle.md) |
| ADR-SRC-002 | 프로젝트 구조 감지 | Gradle/Maven 파일 텍스트 파싱 | Gradle Tooling API, Maven Model Parser | [프로젝트 감지 방식](source-analysis/project-detection.md) |
| ADR-SRC-004 | 모델 해석 | 이름/패키지/import 휴리스틱 | JavaParser symbol solver, Kotlin compiler symbol 분석 | [관계 해석 방식](source-analysis/relation-resolution.md) |
| ADR-SRC-005 | 모델 해석 | 패키지명 첫 세그먼트 규칙 | annotation 기반, 설정 기반 mapping | [레이어 분류 방식](source-analysis/layer-classification.md) |

## 관리 원칙

- 새 A/B 판단을 추가할 때는 이 인덱스에 한 줄을 추가하고, 상세 내용은 주제별 문서에 둔다.
- ADR 상세 문서는 `현재 선택 / 대안 / 결정 이유 / 재검토 조건 / 복잡도 / 주의사항` 구조를 따른다.
- 코드 변경으로 현재 선택이 바뀌면 ADR을 삭제하기보다 변경된 선택과 재검토 배경을 갱신한다.
