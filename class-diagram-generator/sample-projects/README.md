# sample-projects

`class-diagram-generator`의 수동 업로드 테스트 및 회귀 검증용 Java/Kotlin 샘플 프로젝트 모음이다.

## 구성

- `maven-single-jdk21`: Maven 단일 모듈, JDK 21
- `maven-single-jdk17`: Maven 단일 모듈, JDK 17
- `maven-multi-jdk21`: Maven 멀티모듈, JDK 21
- `maven-multi-jdk17`: Maven 멀티모듈, JDK 17
- `gradle-single-jdk21`: Gradle Kotlin DSL 단일 모듈, JDK 21
- `gradle-single-jdk17`: Gradle Kotlin DSL 단일 모듈, JDK 17
- `gradle-multi-jdk21`: Gradle Kotlin DSL 멀티모듈, JDK 21
- `gradle-multi-jdk17`: Gradle Kotlin DSL 멀티모듈, JDK 17
- `maven-single-kotlin-jdk21`: Maven 단일 모듈, JDK 21, Spring Boot Kotlin
- `maven-single-kotlin-jdk17`: Maven 단일 모듈, JDK 17, Spring Boot Kotlin
- `maven-multi-kotlin-jdk21`: Maven 멀티모듈, JDK 21, Spring Boot Kotlin
- `maven-multi-kotlin-jdk17`: Maven 멀티모듈, JDK 17, Spring Boot Kotlin
- `gradle-single-kotlin-jdk21`: Gradle Kotlin DSL 단일 모듈, JDK 21, Spring Boot Kotlin
- `gradle-single-kotlin-jdk17`: Gradle Kotlin DSL 단일 모듈, JDK 17, Spring Boot Kotlin
- `gradle-multi-kotlin-jdk21`: Gradle Kotlin DSL 멀티모듈, JDK 21, Spring Boot Kotlin
- `gradle-multi-kotlin-jdk17`: Gradle Kotlin DSL 멀티모듈, JDK 17, Spring Boot Kotlin

## 공통 원칙

- 기본 패키지: `com.example.catalog`
- 동일 도메인과 유사한 계층 구조를 유지
- 보고서 품질 확인을 위해 Java 샘플은 Javadoc, Kotlin 샘플은 KDoc 포함
- 접근 지정자(`public`, `protected`, `private`, package-private) 다양성 포함
- `class`, `interface`, `enum`, `record`, inner class 포함
- 멀티모듈 샘플은 `api`, `service`, `support` 3모듈 구조 사용
- Kotlin 샘플은 `src/main/kotlin`, `src/test/kotlin` 기반 pure Kotlin 구성
- Kotlin 샘플은 Spring Boot 계층 구조(`controller/service/repository/model/config`) 또는 멀티모듈 역할 분리(`api/service/support`)를 사용

## 사용 방법

로컬에서 개발 중이거나 기능 검증이 필요할 때, 이 sample-projects 폴더 내의 예제들을 사용하여 정상 동작 여부를 테스트할 수 있습니다.

### 테스트 진행 방법

1. **샘플 프로젝트 압축**
   - 테스트하려는 샘플 디렉터리(예: gradle-single-jdk21)를 선택합니다.
   - 해당 디렉터리의 내부 파일들을 ZIP 포맷으로 압축합니다.

2. **웹 UI를 통한 수동 테스트**
   - 로컬에서 애플리케이션을 기동합니다. (mise run dev 또는 ./gradlew bootRun)
   - 웹 브라우저로 http://localhost:8080 에 접속합니다.
   - 준비한 ZIP 파일을 업로드하여 docx, xlsx, md 설계서가 올바르게 생성되고 다운로드되는지 확인합니다.

3. **API를 통한 테스트**
   - /api/v1/jobs API를 호출하여 multipart/form-data 형식으로 ZIP 파일을 전송하고 정상적으로 작업이 생성되는지 테스트합니다.

4. **검증 스크립트를 이용한 자동화 테스트**
   - 멀티모듈 Java 샘플 4종 검증은 아래 스크립트로 실행할 수 있습니다.
     ```bash
     ./sample-projects/verify-java-samples.sh
     ```
   - Kotlin Spring 샘플 8종 검증은 아래 스크립트로 실행할 수 있습니다.
     ```bash
     ./sample-projects/verify-kotlin-samples.sh
     ```
