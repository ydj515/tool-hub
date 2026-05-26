# Kotlin Project Support Design

## 1. 배경

`class-diagram-generator`는 현재 Java 소스 ZIP을 기준으로 클래스 설계서를 생성한다. 모듈 감지는 Gradle/Maven 기준으로 수행하고, 소스 분석은 `JavaSourceAnalyzer` 하나에 의존한다. 이 구조는 Java 프로젝트에는 충분하지만, 실제 현업에서 많이 쓰는 Kotlin Spring 프로젝트는 처리할 수 없다.

이번 변경의 목표는 순수 Kotlin 프로젝트를 Java와 동일한 사용자 경험으로 지원하는 것이다. 사용자는 Gradle 또는 Maven 기반 Kotlin Spring 프로젝트를 ZIP으로 업로드하고, 단일 모듈과 멀티모듈 여부에 관계없이 `docx`, `xlsx`, `md` 산출물을 얻을 수 있어야 한다. 샘플 프로젝트도 현실적인 Spring 프로젝트 수준으로 제공해 수동 테스트와 회귀 검증에 바로 사용할 수 있어야 한다.

## 2. 범위

### 포함

- 순수 Kotlin 단일 모듈 Gradle 프로젝트 지원
- 순수 Kotlin 멀티모듈 Gradle 프로젝트 지원
- 순수 Kotlin 단일 모듈 Maven 프로젝트 지원
- 순수 Kotlin 멀티모듈 Maven 프로젝트 지원
- Kotlin 소스 파서 추가
- Kotlin 타입 간 상속/구현 관계 추출
- Kotlin 샘플 프로젝트 8종 추가
- Kotlin 샘플 검증 스크립트 추가 또는 기존 스크립트 확장
- Kotlin 지원에 대한 자동 테스트 보강

### 제외

- 동일 모듈 내 Java + Kotlin 혼합 소스 프로젝트
- Groovy, Scala 등 기타 JVM 언어
- Kotlin Symbol Processing, kapt 결과물 등 생성 소스 처리
- 스크립트 파일(`.kts`) 자체 분석
- 컴파일 결과 바이트코드 기반 분석으로의 전환

## 3. 요구사항 정리

### 기능 요구사항

1. `.kt` 파일을 포함한 순수 Kotlin 프로젝트 ZIP 업로드 시 기존 Java 프로젝트와 동일한 파이프라인으로 처리한다.
2. `ProjectDetector`는 Kotlin 단일 모듈과 멀티모듈 프로젝트를 감지할 수 있어야 한다.
3. Gradle 멀티모듈은 `settings.gradle` 또는 `settings.gradle.kts`의 `include` 선언을 기준으로 모듈을 수집한다.
4. Maven 멀티모듈은 루트 `pom.xml`의 `<modules>` 선언을 기준으로 모듈을 수집한다.
5. 각 Kotlin 모듈에 대해 `docx`, `xlsx`, `md` 산출물을 생성한다.
6. Kotlin 타입의 설명, 속성, 연산, 상속, 구현 관계를 기존 렌더러가 사용할 수 있는 공통 모델로 변환한다.
7. Kotlin의 대표 타입 선언인 `class`, `data class`, `interface`, `enum class`, `object`, `sealed class`를 지원한다.
8. Kotlin의 `nested class`, `inner class`, `companion object`를 지원한다.
9. 주 생성자 `val`/`var` 프로퍼티와 클래스 본문 프로퍼티를 모두 속성으로 반영한다.
10. 함수 선언은 이름과 KDoc 첫 문장을 추출한다.
11. KDoc 첫 문장은 기존 Java Javadoc 규칙과 일관되게 설명 문장으로 사용한다.
12. 멀티모듈 선언은 있으나 실제 디렉터리가 없는 경우 실패시키지 않고 warning으로 남긴다.
13. 기존 Java 프로젝트 동작은 깨지지 않아야 한다.

### 비기능 요구사항

- `./gradlew check build`를 통과해야 한다.
- Kotlin 지원 추가 후에도 Java 회귀 테스트가 유지되어야 한다.
- 샘플 프로젝트는 JDK 17, JDK 21 매트릭스를 유지해야 한다.
- 샘플 프로젝트는 업로드 회귀 검증에 바로 사용할 수 있어야 한다.
- Kotlin 문법 지원 범위는 “현실적인 Spring 프로젝트” 기준에서 충분히 넓어야 한다.

## 4. 사용자 경험

### 업로드와 결과 흐름

- 사용자는 기존과 동일하게 ZIP 파일을 업로드한다.
- 프로젝트가 Kotlin인지 Java인지 사용자가 직접 지정할 필요는 없다.
- 프로젝트 구조가 올바르면 단일 모듈과 멀티모듈 모두 자동으로 처리된다.
- 결과 페이지와 다운로드 흐름은 기존 동작을 유지한다.

### 기대 사용자 시나리오

1. 사용자가 Kotlin Spring Boot 단일 모듈 프로젝트를 압축해 업로드한다.
2. 서비스가 `src/main/kotlin`을 인식하고 Kotlin 타입을 분석한다.
3. 결과 페이지에서 문서 산출물과 다이어그램 포함 여부를 기존 Java와 동일하게 확인한다.
4. 사용자가 Kotlin 멀티모듈 프로젝트를 올려도 모듈별 산출물이 정상 생성된다.

## 5. 프로젝트 감지 규칙

### 5.1 기본 원칙

- 빌드 시스템 감지 규칙은 기존 Java 지원과 동일하게 유지한다.
- 모듈 수집 후 각 모듈의 소스 수집 기준만 Kotlin까지 확장한다.
- 이번 범위는 순수 Kotlin 프로젝트이므로 모듈별 소스 루트는 `src/main/kotlin`을 우선 대상으로 본다.
- 빌드 파일은 존재하지만 Kotlin 소스가 없으면 warning을 남기고 빈 모듈을 만들지 않는 방향을 기본값으로 삼는다.

### 5.2 Gradle

1. 루트에 `settings.gradle` 또는 `settings.gradle.kts`가 있으면 Gradle 루트로 본다.
2. `include` 선언이 있으면 선언 기반 멀티모듈로 처리한다.
3. 각 모듈은 `src/main/kotlin`을 우선 스캔한다.
4. Kotlin 소스가 하나도 없고 Java 소스만 있는 경우는 기존 Java 경로로 계속 처리한다.
5. 루트 `build.gradle` 또는 `build.gradle.kts`만 있고 `include`가 없으면 단일 모듈 프로젝트로 본다.

### 5.3 Maven

1. 루트 `pom.xml`에 `<modules>`가 있으면 Maven 멀티모듈로 본다.
2. 각 모듈은 `src/main/kotlin`을 우선 스캔한다.
3. Kotlin Maven 플러그인 사용 여부는 참고 정보일 뿐, 실제 판정은 소스 디렉터리와 소스 파일 기준으로 한다.
4. 루트 `pom.xml`만 있고 `<modules>`가 비어 있으면 단일 모듈 Maven 프로젝트로 본다.

### 5.4 단일 모듈 폴백

- 빌드 파일이 있으면 해당 루트를 단일 모듈로 본다.
- `src/main/kotlin`이 있으면 Kotlin 모듈로 처리한다.
- `src/main/kotlin`이 없고 `src/main/java`만 있으면 기존 Java 모듈 처리 경로를 사용한다.
- 빌드 파일이 없을 때는 기존 폴백 스캔을 유지하되, `.kt` 파일도 후보에 포함한다.

## 6. Kotlin 문법 지원 범위

### 6.1 지원 타입

- `class`
- `data class`
- `interface`
- `enum class`
- `object`
- `sealed class`
- `nested class`
- `inner class`
- `companion object`

### 6.2 추출 대상

- 패키지 경로
- 타입 이름
- 설명
- 속성 목록
- 연산 목록
- 상속 타입 목록
- 구현 인터페이스 목록
- import 목록

### 6.3 속성 추출 규칙

- 주 생성자 파라미터 중 `val` 또는 `var`가 붙은 선언은 속성으로 포함한다.
- 클래스 본문에 선언된 프로퍼티도 속성으로 포함한다.
- `private`, `protected`, `public`, `internal` 접근 수준을 기존 모델의 접근 지정자 체계에 매핑한다.
- `internal`은 현재 공통 모델에 전용 값이 없으므로 `DEFAULT`로 매핑한다.
- `lateinit`, `const`, `override` 등 수식자는 설명 보조 정보로 쓰지 않고 우선 무시한다.
- delegate 프로퍼티는 타입과 이름만 추출하고 구현 세부사항은 무시한다.

### 6.4 연산 추출 규칙

- 멤버 함수는 이름과 KDoc 첫 문장을 추출한다.
- 생성자는 별도 연산으로 노출하지 않는다.
- getter/setter는 Kotlin 소스에 명시된 함수만 연산으로 취급한다.
- `suspend`, `operator`, `infix` 등의 함수는 이름은 그대로 쓰고 수식자는 우선 별도 표기하지 않는다.

### 6.5 타입 표현 규칙

- `data class`는 일반 클래스처럼 렌더링하되, 주 생성자 프로퍼티가 핵심 속성으로 반영되어야 한다.
- `enum class`는 타입 자체를 추출하고, enum entry는 산출물에서 강제로 속성화하지 않는다.
- `object`는 인스턴스 싱글턴 타입으로 파싱하되 공통 모델에서는 일반 타입으로 취급한다.
- `companion object`는 중첩 타입으로 추출한다.
- `sealed class`는 상속 가능한 추상 타입처럼 취급하고, 같은 파일 또는 같은 패키지 내부 하위 타입과의 관계는 일반 상속 관계로 추출한다.

## 7. 백엔드 설계

### 7.1 공통 파싱 모델 유지

현재 렌더링과 관계 추출은 `ParsedType`, `ParsedAttribute`, `ParsedOperation` 중심으로 구성되어 있다. Kotlin 지원도 새로운 도메인 모델을 만들지 않고 동일한 공통 파싱 모델로 변환한다.

이 원칙을 따르면 다음 이점이 있다.

- 렌더러 수정 범위를 최소화할 수 있다.
- Java와 Kotlin이 같은 산출물 형식을 공유할 수 있다.
- 관계 추출기와 레이어 분류기를 대부분 재사용할 수 있다.

### 7.2 KotlinSourceAnalyzer 추가

새로운 `KotlinSourceAnalyzer`를 추가한다.

책임은 아래와 같다.

- `.kt` 파일 파싱
- KDoc 추출
- 타입 선언 수집
- 속성/함수/상속/구현 정보 추출
- 중첩 타입 순회
- warning 생성

구현은 `kotlin-compiler-embeddable` 기반 PSI를 사용한다. 이유는 Kotlin 공식 파서 계열이라 문법 커버리지가 가장 넓고, 현실적인 Spring 프로젝트 문법을 다루기에 가장 안정적이기 때문이다.

### 7.3 SourceAnalyzer 라우팅

기존 `JobOrchestrator`는 모든 소스 파일을 `JavaSourceAnalyzer`로 보낸다. Kotlin 지원 후에는 파일 확장자 기준 라우팅 계층이 필요하다.

권장 구조는 아래와 같다.

- `SourceAnalyzer` 인터페이스 도입
- `JavaSourceAnalyzer`와 `KotlinSourceAnalyzer`가 이를 구현
- `JobOrchestrator`는 파일 경로의 확장자를 보고 해당 확장자에 대응하는 분석기를 선택

이 구조는 향후 다른 언어 지원이나 혼합 프로젝트 지원을 확장할 때도 유리하다.

### 7.4 ProjectDetector 확장

`ProjectDetector`는 현재 Java 소스 수집에 치우쳐 있다. Kotlin 지원 후에는 모듈 빌드 구조는 그대로 두고, 소스 수집 규칙을 아래처럼 확장한다.

1. `src/main/kotlin` 존재 여부 확인
2. 있으면 `.kt` 파일 수집
3. 없으면 `src/main/java` 존재 여부 확인
4. 있으면 `.java` 파일 수집
5. 둘 다 없으면 루트/폴백 스캔 수행

이번 범위는 순수 Kotlin 프로젝트이므로 Kotlin 모듈에서 `.java`를 함께 수집하지 않는다.

### 7.5 Warning 처리

추가될 수 있는 warning 예시는 아래와 같다.

- `KOTLIN_PARSE_FAILED`
- `UNSUPPORTED_KOTLIN_DECLARATION`
- `MISSING_DECLARED_MODULE`
- `INVALID_DECLARED_MODULE_PATH`

warning은 기존과 동일하게 `JobRecord.warnings`, 결과 API, 결과 페이지에 노출한다.

## 8. 관계 추출 설계

### 8.1 재사용 원칙

`RelationExtractor`는 현재 `ParsedType`의 `extendsNames`, `implementsNames`, `imports`를 바탕으로 관계를 추출한다. Kotlin도 이 필드를 채우는 방식으로 맞추면 기존 구현을 최대한 재사용할 수 있다.

### 8.2 Kotlin 매핑 규칙

- `class A : B()` 는 `extends`
- `class A : B, C`에서 인터페이스는 `implements`
- `interface A : B`는 현재 모델 제약상 `extends` 계열로 해석하거나, 기존 `implements` 체계와의 충돌을 피하기 위해 별도 규칙을 코드에 명시한다
- `sealed class`와 하위 타입의 관계도 일반 상속 관계로 추출한다

인터페이스 상속 표현은 Java 모델과 Kotlin 모델의 의미 차이가 있으므로 구현 시 명확한 규칙을 택해야 한다. 본 설계에서는 “타입 선언이 interface이고 상위 타입도 interface이면 `extendsNames`에 넣는다”를 권장한다.

## 9. 샘플 프로젝트 설계

### 9.1 추가할 디렉터리

- `/Users/dongjin/Desktop/sample-projects/gradle-single-kotlin-jdk17`
- `/Users/dongjin/Desktop/sample-projects/gradle-single-kotlin-jdk21`
- `/Users/dongjin/Desktop/sample-projects/gradle-multi-kotlin-jdk17`
- `/Users/dongjin/Desktop/sample-projects/gradle-multi-kotlin-jdk21`
- `/Users/dongjin/Desktop/sample-projects/maven-single-kotlin-jdk17`
- `/Users/dongjin/Desktop/sample-projects/maven-single-kotlin-jdk21`
- `/Users/dongjin/Desktop/sample-projects/maven-multi-kotlin-jdk17`
- `/Users/dongjin/Desktop/sample-projects/maven-multi-kotlin-jdk21`

### 9.2 공통 패키지와 도메인

- 기본 패키지: `com.example.catalog`
- 샘플 수준: Spring 프로젝트 정도의 현실적인 구조
- 멀티모듈은 `api`, `service`, `support` 3모듈 구조 사용

### 9.3 포함할 Kotlin 문법 요소

- `data class`
- `enum class`
- `sealed class`
- `interface`
- `object`
- `companion object`
- `nested class`
- `inner class`

### 9.4 모듈별 역할

- `support`
  - 공용 DTO
  - enum
  - sealed class
  - utility object
  - 공용 interface
- `service`
  - Spring `@Service`
  - support 타입 의존
  - nested/inner class 예시
  - companion object 예시
- `api`
  - Spring `@RestController`
  - request/response 흐름 예시
  - service 의존

### 9.5 빌드 스택

- Gradle 샘플은 Kotlin DSL 사용
- Maven 샘플은 Kotlin Maven 플러그인 사용
- JDK 17, JDK 21 모두 Kotlin/JVM 타깃을 맞춘다

## 10. 테스트 전략

### 10.1 단위 테스트

- `ProjectDetectorTest`
  - Kotlin 단일 모듈 감지
  - Kotlin 멀티모듈 감지
  - wrapper 디렉터리 내부 Kotlin 루트 감지
- `KotlinSourceAnalyzerTest`
  - class/data class/interface/enum/object/sealed class 파싱
  - primary constructor 프로퍼티 추출
  - nested/inner/companion object 추출
  - KDoc 추출
- `RelationExtractorTest`
  - Kotlin 상속/구현 관계 추출

### 10.2 통합 테스트

- `EndToEndTest`
  - Gradle single Kotlin ZIP
  - Gradle multi Kotlin ZIP
  - Maven single Kotlin ZIP
  - Maven multi Kotlin ZIP
  - 누락된 선언 모듈 warning 유지

### 10.3 샘플 검증

- Desktop의 `sample-projects`에 대해 Kotlin 샘플 전용 검증 스크립트를 추가하거나 기존 스크립트를 Kotlin까지 확장한다.
- Gradle 샘플은 `gradlew clean build`
- Maven 샘플은 가능한 한 실제 `mvn` 없이 구조와 소스 일관성을 검증할 수 있는 보조 스크립트를 우선 고려한다.

## 11. 구현 순서 제안

1. Kotlin 파서 의존성 추가
2. `ProjectDetector`에 Kotlin 소스 수집 규칙 추가
3. `KotlinSourceAnalyzer`와 관련 테스트 추가
4. `JobOrchestrator`에 분석기 라우팅 추가
5. 관계 추출 회귀 테스트 보강
6. 종단 테스트 추가
7. Desktop 샘플 프로젝트 8종 추가
8. Kotlin 샘플 검증 스크립트 추가
9. 전체 `check`, `build` 검증

## 12. 리스크와 대응

### 12.1 Kotlin PSI 의존성 증가

- 리스크
  - 빌드 시간이 늘어날 수 있다.
- 대응
  - 분석기 경계를 명확히 두고, Java 경로에는 영향이 최소화되도록 한다.

### 12.2 Kotlin 언어 특성 표현 한계

- 리스크
  - `companion object`, `enum entry`, `interface extends interface` 표현 규칙이 Java 모델과 완전히 일치하지 않는다.
- 대응
  - 공통 모델로 안정적으로 투영 가능한 부분만 우선 반영하고, 표현 규칙을 테스트로 고정한다.

### 12.3 혼합 프로젝트 오해

- 리스크
  - 사용자가 Kotlin 지원을 혼합 Java/Kotlin 지원으로 오해할 수 있다.
- 대응
  - README와 샘플 문서에 이번 범위가 “순수 Kotlin 프로젝트”임을 명시한다.

## 13. 완료 조건

- Kotlin 단일/멀티모듈 Gradle/Maven ZIP이 모두 성공적으로 처리된다.
- Kotlin 대표 문법 요소가 산출물에 반영된다.
- Java 기존 테스트가 깨지지 않는다.
- Kotlin 자동 테스트가 추가된다.
- `/Users/dongjin/Desktop/sample-projects`에 Kotlin 샘플 8종이 추가된다.
- Kotlin 샘플 검증 경로가 문서화되고 실행 가능하다.
