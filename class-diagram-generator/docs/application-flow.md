# 애플리케이션 처리 흐름과 화면

## 구성과 책임

Java 또는 순수 Kotlin 프로젝트 ZIP을 받아 모듈별 DOCX/XLSX/Markdown 클래스 설계서를 생성한다. Spring MVC·Thymeleaf·Bootstrap·Vanilla JS를 사용한다. 브라우저 화면은 업로드 → 진행 → 결과의 세 단계다. 상세 요구사항은 [PRD](PRD-class-diagram-generator.md), 실행·설정은 [README](../README.md)에 있다.

| 계층 | 책임 |
|---|---|
| JobController / ViewController | API와 페이지 경계, 입력 검증, 오류 응답 |
| JobService / JobStore | 업로드 저장, 작업 생성과 상태 보관, 백그라운드 실행 |
| JobOrchestrator | 압축 해제부터 분석·렌더링·산출물 등록까지 연결 |
| ProgressBus | 작업별 SSE 진행 이벤트 |
| OutputStorage / ScheduledCleaner | 로컬 작업 디렉터리와 TTL 정리 |
| OutputLabels / 메시지 번들 | 산출물과 화면의 한국어·영어 라벨 |

JobService는 업로드를 저장하고 작업 ID를 반환한다. 실제 처리는 백그라운드에서 수행한다. 인메모리 상태와 로컬 디스크를 사용하므로 서버 재시작 복구나 다중 인스턴스 공유를 보장하지 않는다. executor·SSE·저장소 판단은 [잡 처리 설계](job-processing-design.md)에 정리한다.

## 파이프라인

```text
EXTRACTING → DETECTING_MODULES → PARSING → CLASSIFYING
  → ASSIGNING_IDS → EXTRACTING_RELATIONS → RENDERING_DIAGRAMS
  → 선택 포맷 렌더링 → PACKAGING → 결과 조회/다운로드
```

ZIP은 스트리밍으로 해제하며 경로 이탈과 입력 제한을 검사한다. 프로젝트 탐지 후 언어별 분석기가 공통 ParsedType을 만들고 레이어 분류·ID 부여·관계 추출을 거친다. 다이어그램 옵션과 포맷 선택에 따라 렌더링한다. 구체적인 단계와 진행률은 [JobOrchestrator](../src/main/kotlin/com/toolhub/classdiagramgenerator/job/JobOrchestrator.kt)를 기준으로 한다.

파싱·렌더링 경고는 작업 결과의 warnings에 모은다. 처리 불가능한 작업 오류는 실패 상태와 ProblemDetail 응답으로 전달한다. 원래 MVP 계획의 코드 복사본을 다시 적용하지 않고 현행 구현과 테스트를 수정한다.

## API와 수명

| API | 용도 |
|---|---|
| POST `/api/v1/jobs` | multipart ZIP과 programName/version/language/formats/includeDiagrams 제출 |
| GET `/api/v1/jobs/{id}/events` | SSE 진행 조회 |
| GET `/api/v1/jobs/{id}/result` | 생성 시각·만료·경고·산출물·다운로드 정보 |
| GET `/api/v1/jobs/{id}/artifacts/{idx}` | 개별 파일 |
| GET `/api/v1/jobs/{id}/downloads/{format}` | 포맷별 직접 파일 또는 ZIP |
| GET `/api/v1/jobs/{id}/bundle` | 전체 ZIP |

programName/version은 파일명에 사용되므로 검증 규칙을 유지한다. language는 ko/en, formats는 docx/xlsx/md다. `includeDiagrams` 기본값은 true다. 산출물은 TTL 이후 제거되므로 다운로드 링크는 영구 링크가 아니다.

## 화면 설계

공통 layout fragment와 MMU 스타일이 세 화면의 여백·카드·타이포·상태색을 관리한다. Bootstrap을 유지하며 기존 id/data-* 훅을 보존해 JS 연결을 끊지 않는다. 토큰은 루트 정본 CSS를 복사하고 MMU 이름에 매핑한다. React ToolHeader 대상은 아니다.

- 업로드: ZIP 선택, 파일 정보, 프로그램/버전, 산출물 언어·포맷·다이어그램 옵션과 제출 상태를 한 흐름에 둔다.
- 진행: 현재 단계, 진행률, 단계 상태와 오류를 보여주고 완료 시 결과 화면으로 이동한다. 동작 기준은 실제 SSE 이벤트다.
- 결과: 생성/만료 시각, 모듈·산출물 요약, 경고, 전체·포맷별 다운로드와 모듈별 산출물 목록을 보여준다.

`createdAt`은 클라이언트 추정 시각이 아니라 결과 DTO의 값을 사용한다. 경고는 성공 결과에서도 표시한다. 색만으로 상태를 전달하지 않고 문구와 아이콘을 함께 사용한다. 좁은 화면의 긴 파일명·경고·버튼은 가로 overflow 없이 배치한다.

테마는 `[data-theme]`와 `cdg-theme` 저장값을 사용한다. 페인트 전 초기 테마와 토글 스크립트가 일치해야 한다. 화면 언어와 산출물 언어 선택을 혼동하지 않는다. ko/en 메시지 키의 양쪽 존재를 확인한다.

## 검증과 관련 문서

코드 변경 시 프로젝트에서 `./gradlew check build`를 실행한다. check는 테스트·Spotless·Detekt를 포함한다. API/MockMvc 테스트와 EndToEndTest로 업로드·진행·결과·파일을 검사하고, 화면은 실제 브라우저에서 라이트/다크·키보드·좁은 폭·경고를 확인한다. 서버 테스트 성공을 실제 화면 검증으로 대신하지 않는다.

- [프로젝트/언어 지원](project-support.md)
- [다이어그램 출력](diagram-output.md)
- [소스 분석 ADR](source-analysis-design.md)
- [아키텍처 결정 인덱스](architecture-decisions.md)
