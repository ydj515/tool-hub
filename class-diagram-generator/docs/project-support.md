# Java/Kotlin과 멀티모듈 지원

## 지원 경계

Java와 순수 Kotlin의 Gradle/Maven 단일·멀티모듈 ZIP을 처리한다. 동일 모듈 내 Java와 Kotlin을 함께 분석하는 혼합 소스는 지원 계약에 포함하지 않는다. Groovy/Scala, 생성 소스, `.kts` 스크립트 분석과 바이트코드 분석도 대상이 아니다.

## 프로젝트 감지

[ProjectDetector](../src/main/kotlin/com/toolhub/classdiagramgenerator/input/ProjectDetector.kt)는 ZIP 안의 wrapper 디렉터리를 내려가며 빌드 메타데이터를 찾는다. macOS 메타데이터는 후보에서 제외한다.

현재 판정 순서는 Maven modules → Gradle include → 단일 모듈 빌드 파일 → 소스 fallback이다. 초기 설계에 적힌 Gradle 우선 순서와 다르므로 코드를 기준으로 한다.

- Maven은 pom.xml의 modules/module 선언을 읽는다.
- Gradle은 settings.gradle/settings.gradle.kts의 문자열 include 선언을 읽고 `:` 경로를 디렉터리 경로로 해석한다.
- 선언 모듈이 있으면 루트 자체를 별도 산출물 모듈로 추가하지 않는다.
- 경로가 루트 밖이면 `INVALID_DECLARED_MODULE_PATH`, 디렉터리가 없으면 `MISSING_DECLARED_MODULE` 경고 후 해당 모듈을 제외한다.
- 빌드 도구를 실행하지 않는 텍스트 해석이므로 동적 Gradle DSL 전체를 평가하는 기능은 아니다.

소스 수집은 실제 `.kt` 파일이 있는 `src/main/kotlin`을 우선한다. Kotlin 디렉터리가 비어 있으면 `src/main/java`로 넘어간다. 표준 루트가 없으면 fallback으로 `.kt`/`.java` 후보를 찾는다. 이 fallback을 혼합 프로젝트 전체 지원으로 해석하지 않는다. 상세 판단은 [프로젝트 감지 ADR](source-analysis/project-detection.md)에 있다.

## 언어별 분석과 공통 모델

[SourceAnalyzer](../src/main/kotlin/com/toolhub/classdiagramgenerator/analyzer/SourceAnalyzer.kt) 경계에서 지원 확장자에 맞는 분석기를 선택한다. Java는 JavaParser, Kotlin은 compiler-embeddable PSI를 사용한다. 공통 ParsedType의 패키지·이름·설명·속성·연산·상위 타입·import로 변환해 분류·관계 추출·렌더러를 공유한다.

Kotlin은 class/data class/interface/enum class/object/sealed class와 nested/inner/companion object를 다룬다. 주 생성자의 val/var와 본문 프로퍼티를 속성으로, 함수 선언을 연산으로 추출한다. 설명은 KDoc 첫 문장을 이용하며 internal은 공통 모델의 DEFAULT 접근 수준에 매핑한다. Java는 Javadoc 기반 설명을 유지한다.

인터페이스의 상위 타입은 extends로, 알려진 인터페이스 구현은 implements로 매핑한다. 클래스 부모의 생성자 호출과 타입 정보도 사용한다. 이름·import 휴리스틱은 컴파일러 전체 심볼 해석과 같지 않다. 모호한 타입을 확정된 내부 관계처럼 표시하지 않는다.

Kotlin PSI 환경의 재사용·lock·종료는 [파서 생명주기](source-analysis/kotlin-parser-lifecycle.md), 관계 해석은 [관계 ADR](source-analysis/relation-resolution.md), 레이어는 [분류 ADR](source-analysis/layer-classification.md)을 따른다.

## 모듈별 산출물과 다운로드

오케스트레이터는 모듈별로 선택 포맷을 생성한다. 세 모듈에서 세 포맷을 선택하면 산출물은 9개다. 멀티모듈 파일명에는 모듈명을 포함하고 단일 모듈에서는 생략한다.

포맷별 API는 `GET /api/v1/jobs/{id}/downloads/{format}`이다. 해당 포맷 파일이 하나면 직접 파일, 둘 이상이면 ZIP 스트림, 없으면 404를 반환한다. 결과 DTO의 `formatDownloads`에는 format/artifactCount/downloadUrl/archive가 있다. UI는 archive를 보고 직접 파일과 묶음을 구분하며 실제 생성된 포맷만 노출한다. 전체 bundle과 개별 artifact API도 유지한다.

결과 페이지는 상단의 포맷별 다운로드를 기본 동선으로 제공하고 모듈별 파일 목록·개별 다운로드도 유지한다. 서버가 반환한 정보를 쓰며 브라우저에서 파일 수를 추정해 API 경로를 만들지 않는다.

## 샘플과 회귀 검증

[sample-projects](../sample-projects/README.md)는 Gradle/Maven × 단일/멀티 × JDK 17/21을 제공한다. Kotlin 8종과 Java 샘플을 구분한다. 멀티모듈은 api/service/support와 com.example.catalog 도메인으로 관계와 대표 문법을 확인한다. 과거 계획의 Desktop 절대 경로 대신 저장소 안 샘플을 사용한다.

검사 항목은 wrapper ZIP, 빈 Kotlin scaffold의 Java fallback, Maven/Gradle 선언, 누락/이탈 모듈, Kotlin 대표 문법·KDoc·관계, Java 기존 동작, 9개 산출물, 직접 파일/ZIP/404다. [테스트 소스](../src/test/)의 ProjectDetectorTest, KotlinSourceAnalyzerTest, RelationExtractorTest, JobControllerTest, EndToEndTest에서 해당 계약을 유지하고 `./gradlew check build`로 검증한다.
