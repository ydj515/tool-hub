# class-diagram-generator

Java 또는 순수 Kotlin 소스 ZIP을 입력받아 docx / xlsx / md 클래스 설계서를 자동 생성하는 Spring Boot 3 + Kotlin 기반 도구.

- 상세 PRD: [docs/PRD-class-diagram-generator.md](docs/PRD-class-diagram-generator.md)
- 구현 계획: [docs/mvp-plan.md](docs/mvp-plan.md)

## 지원 범위

- 언어: Java, 순수 Kotlin
- 빌드 도구: Gradle, Maven
- 프로젝트 구조: single module, multi module
- 소스 루트:
  - Java: `src/main/java`
  - Kotlin: `src/main/kotlin`
- 현재 정책:
  - 순수 Kotlin 프로젝트를 지원한다.
  - 동일 모듈 안에서 Java와 Kotlin을 함께 분석하는 혼합 소스 프로젝트는 이번 범위에 포함하지 않는다.

## 로컬 실행

```bash
mise install        # JDK/Gradle 설치
mise run dev        # Spring Boot 기동
```

브라우저에서 http://localhost:8080 접속 → 필요 시 헤더의 `KO / EN` 토글 또는 산출물 언어 선택 확인 → ZIP 업로드 → 진행 페이지 → 결과 페이지에서 다운로드.

## Docker 실행

```bash
docker build -t class-diagram-generator ./class-diagram-generator
docker run --rm -p 8080:8080 class-diagram-generator
```

`PORT` 환경변수를 주면 해당 포트로 기동한다. 예:

```bash
docker run --rm -e PORT=10000 -p 10000:10000 class-diagram-generator
```

한글 DOCX 품질을 위해 Docker 이미지에는 `Noto Sans CJK KR` 폰트가 포함된다. 다른 폰트를 강제로 쓰고 싶으면 `DOCX_FONT_FAMILY` 환경변수로 덮어쓸 수 있다.

## Render 배포

이 저장소는 모노레포이므로 `class-diagram-generator`만 배포하도록 루트 [render.yaml](../render.yaml) 에 `rootDir` 가 설정되어 있다.

1. Render Dashboard에서 `New +` → `Blueprint` 또는 `Web Service`를 선택한다.
2. 이 저장소를 연결한다.
3. Blueprint를 쓸 경우 루트 `render.yaml` 을 그대로 적용한다.
4. 배포 후 헬스체크 경로는 `/actuator/health` 로 동작한다.

Render는 `PORT` 환경변수를 주입하므로 애플리케이션은 `server.port: ${PORT:8080}` 설정으로 Render 포트에 맞춰 기동한다.

자세한 절차와 명령은 [docs/render-deploy.md](docs/render-deploy.md) 를 참고한다.

## 검증

```bash
mise run            # default = check (테스트 + Spotless + Detekt)
```

또는 직접 `./gradlew check`.

Kotlin 파이프라인 중심 회귀 검증만 빠르게 확인하려면 아래 테스트를 실행한다.

```bash
./gradlew test --tests 'com.toolhub.classdiagramgenerator.EndToEndTest'
```

## mise tasks

`mise tasks` 로 정의된 task 확인. 정의: `mise.toml`.

| task | 설명 |
|---|---|
| `default` (= `check`) | 전체 검증 (`mise run` 만 입력해도 실행) |
| `dev` | Spring Boot 기동 |
| `build` | Jar 빌드 + 테스트 |
| `test` | Kotest 테스트만 |
| `check` | 테스트 + Spotless + Detekt |
| `format` | Spotless(ktlint) 자동 포맷 |
| `lint` | Detekt 정적 분석만 |
| `clean` | Gradle 캐시 정리 |
| `clean-check` | clean 후 전체 검증 (CI 용도) |

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

- JDK 21 (Temurin, mise 관리) / Kotlin 2.0.21 / Gradle 8.14.4 (Kotlin DSL)
- Spring Boot 3.3.5 (web, validation, thymeleaf, actuator)
- JavaParser 3.26.2 / Apache POI 5.3.0
- Bootstrap 5.3.3 + Bootstrap Icons 1.11.x (WebJars) + 순수 Vanilla JS (`EventSource`)
- Kotest 5.9.1 + MockK 1.13.x + Spring MockMvc
- Spotless (ktlint 1.3.1) + Detekt 1.23.8
