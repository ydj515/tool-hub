# class-diagram-generator

Java 소스 ZIP을 입력받아 docx / xlsx / md 클래스 설계서를 자동 생성하는 Spring Boot 3 + Kotlin 기반 도구.

- 상세 PRD: [docs/PRD-class-diagram-generator.md](docs/PRD-class-diagram-generator.md)
- 구현 계획: [docs/mvp-plan.md](docs/mvp-plan.md)

## 로컬 실행

```bash
mise install
./gradlew bootRun
```

브라우저에서 http://localhost:8080 접속 → 언어 선택 → ZIP 업로드 → 진행 페이지 → 결과 페이지에서 다운로드.

## 검증

```bash
./gradlew check
```

위 명령은 Kotest 단위/통합 테스트 + Spotless(ktlint) + Detekt 를 모두 실행한다.

## 주요 API

| 메서드 | 경로 | 설명 |
|---|---|---|
| POST | `/api/v1/jobs` | ZIP 업로드 + 작업 생성 (multipart) |
| GET  | `/api/v1/jobs/{id}/events` | SSE 진행 스트리밍 |
| GET  | `/api/v1/jobs/{id}/result` | 결과 메타 조회 (RFC 7807 에러 응답) |
| GET  | `/api/v1/jobs/{id}/artifacts/{idx}` | 개별 산출물 다운로드 |
| GET  | `/api/v1/jobs/{id}/bundle` | 전체 산출물 zip 묶음 |

요청 파라미터: `file`, `programName` (`^[A-Za-z0-9_-]+$`), `version` (`^[A-Za-z0-9._-]+$`), `language` (`ko|en`), `formats` (`docx,xlsx,md`).

## 설정 키 (`application.yml`)

| 키 | 기본값 | 설명 |
|---|---|---|
| `app.workdir` | OS temp/class-diagram-generator | 작업 디렉터리 |
| `app.job.max-concurrent` | 4 | 동시 작업 수 |
| `app.job.ttl-minutes` | 60 | 산출물 보관 시간 |
| `app.job.cleaner-interval-minutes` | 10 | 정리 스케줄러 주기 |
| `app.upload.max-file-size-mb` | 100 | 업로드 크기 한도 |
| `app.analysis.max-classes-per-module` | 5000 | 모듈당 클래스 한도 |

## 산출물

- 파일명: `class-design_{programName}_{moduleName}_{version}_{yyyyMMddHHmm}.{ext}` (단일 모듈 시 `{moduleName}` 생략, ASCII 한정)
- 폼: docx (Apache POI XWPF) / xlsx (XSSF, 3 시트: 표지·클래스 리스트·클래스 설계서) / md (마크다운 표)
- 라벨 언어: 요청의 `language` 값 (ko/en)을 따름

## 기술 스택

- JDK 21 (Temurin, mise 관리) / Kotlin 2.0.21 / Gradle 8.10 (Kotlin DSL)
- Spring Boot 3.3.5 (web, validation, thymeleaf, actuator)
- JavaParser 3.26.2 / Apache POI 5.3.0
- Bootstrap 5.3.3 + Bootstrap Icons 1.11.x (WebJars) + 순수 Vanilla JS (`EventSource`)
- Kotest 5.9.1 + MockK 1.13.x + Spring MockMvc
- Spotless (ktlint 1.3.1) + Detekt 1.23.8
