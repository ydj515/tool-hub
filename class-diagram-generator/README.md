# Class Diagram Generator

Java 또는 순수 Kotlin 프로젝트 ZIP 파일을 업로드하면 클래스 다이어그램을 포함한 설계서(`docx`, `xlsx`, `md`)를 자동 생성하는 웹 애플리케이션입니다.
단일·멀티 모듈 구조의 Gradle·Maven 프로젝트를 분석하며, SSE 기반 실시간 진행 상태와 한·영 문서 라벨 전환을 지원합니다.

**기술 스택:** Kotlin 2.0 · Java 21 · Spring Boot 3.3 · Thymeleaf · JavaParser · Apache POI · Gradle · Kotest

## 주요 기능

- **소스 분석 및 지원 범위:** Java(`src/main/java`) 및 순수 Kotlin(`src/main/kotlin`) 단일·멀티 모듈 프로젝트 분석(동일 모듈 내 Java·Kotlin 혼합 소스는 제외)
- **설계서 및 다이어그램 생성:** Apache POI 기반 Word(`docx`)·Excel(`xlsx`, 표지·클래스 리스트·설계서 3시트)·Markdown(`md`) 생성 및 개별/ZIP 번들 다운로드
- **비동기 잡 처리 및 아키텍처 검증:** `/api/v1/jobs` 업로드 후 SSE 진행률 스트리밍, TTL 기반 작업 정리 스케줄러, Konsist 계층 의존성 검사

## 요구 사항

- [mise](https://mise.jdx.dev/) — Java 21 버전은 [`mise.toml`](./mise.toml)에 고정되어 있으며 `mise`가 설치합니다.

## 빠른 시작

```bash
mise trust          # 최초 1회, mise.toml 검토 후 신뢰
mise run bootstrap  # 고정된 JDK 21 설치 + Gradle 준비
mise run dev        # Spring Boot 서버 실행 (http://localhost:8080)
```

`sample-projects/` 디렉터리의 샘플 프로젝트를 ZIP으로 압축해 업로드하면 전체 생성 흐름을 바로 확인할 수 있습니다.
Docker로 실행할 때는 아래와 같이 빌드·기동합니다(`PORT`, `DOCX_FONT_FAMILY` 환경변수 지원).

```bash
docker build -t class-diagram-generator .
docker run --rm -p 8080:8080 class-diagram-generator
```

## 주요 명령

| 명령 | 설명 |
| --- | --- |
| `mise run dev` | Spring Boot 개발 서버 실행 (`:8080`) |
| `mise run test` | Kotest 단위·통합·Konsist 아키텍처 테스트 실행 |
| `mise run lint` | Detekt 정적 분석 실행 |
| `mise run format` | Spotless(ktlint) 코드 자동 포맷 |
| `mise run build` | JAR 빌드 및 테스트 |
| `mise run check` | 테스트·Spotless·Detekt 전체 검증 (`mise run` 기본값) |

전체 task 목록은 `mise tasks`로 확인할 수 있습니다.

## 문서

- [처리 흐름과 화면 설계](./docs/application-flow.md)
- [Java/Kotlin 및 멀티모듈 지원](./docs/project-support.md)
- [다이어그램과 문서 출력](./docs/diagram-output.md)
- [아키텍처 결정 인덱스](./docs/architecture-decisions.md)
- [잡 처리 및 SSE 설계](./docs/job-processing-design.md)
- [소스 분석 설계](./docs/source-analysis-design.md)
- [Render 배포 가이드](./docs/render-deploy.md)
- [상세 PRD](./docs/PRD-class-diagram-generator.md)

## 기여

변경 전 [루트 기여자 가이드](../docs/contributor-guide.md)와 위 설계 문서를 확인해 주세요.
