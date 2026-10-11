# Konsist Guidelines

이 문서는 Kotlin source의 선언 규칙과 module/package architecture를 Konsist test로
검증하기 위한 기준입니다. Konsist는 Kotlin syntax와 declaration을 검사하며 formatter는
Spotless 또는 ktlint, 일반 정적 분석은 Detekt가 담당합니다.

## 의존성과 범위

- `com.lemonappdev:konsist` version을 test dependency와 version catalog에서 고정합니다.
- JUnit 또는 Kotest 중 저장소가 사용하는 test engine과 맞추고, Konsist test가 표준 `test`
  또는 별도 architecture test task에 실제 연결되는지 확인합니다.
- `scopeFromProject`, source set 또는 module 범위를 명시합니다. scope가 비어 있거나 일부
  module만 포함된 상태를 성공으로 처리하지 않습니다.

## Rule 설계

- package 배치, naming, declaration modifier와 layer dependency처럼 변경 영향이 큰 규칙부터
  추가합니다.
- `assertArchitecture`로 layer 간 허용 방향을 고정하고 예외는 최소 package/class에만
  허용합니다. 규칙의 적용 범위와 예외 제거 조건을 테스트에 남깁니다.
- 기존 부채를 숨기기 위한 광범위한 exclude와 빈 scope 허용을 기본값으로 사용하지 않습니다.
- Kotlin compiler, Konsist, test engine 버전의 호환성을 확인하고 정상·위반 fixture로
  규칙이 실제 실패하는지 검증합니다.

## Gradle과 테스트 실행

- `templates/gradle/konsist/build.gradle.kts.example`은 Kotlin/JVM plugin을 사용하는 모듈의
  기존 build에 병합합니다. 예시는 JUnit Jupiter dependency와 `useJUnitPlatform()`을
  연결합니다. 기존 Kotest 구성이 있으면 그 engine을 유지합니다.
- 테스트는 `src/test/kotlin`에 두고 이름을 `*KonsistTest`로 통일합니다. 별도 task를
  만들지 않아도 표준 `test`와 `check`에서 실행되도록 구성합니다.
- 테스트 필터, engine, source set을 확인해 실제 실행 건수를 검증합니다. `NO-SOURCE`,
  `SKIPPED` 또는 테스트 0개는 최초 연결 성공으로 처리하지 않습니다.
- Konsist는 소스 파일을 읽습니다. 다른 모듈을 검사하면 해당 소스도 test task input에
  선언해 소스만 바뀐 경우 up-to-date/cache 판정으로 검사가 생략되지 않게 합니다.

## 분석 범위와 Multi-module

- production 검사는 `scopeFromProduction()`에서 시작하고 테스트 소스를 포함하는 규칙은
  별도로 분리합니다. `scopeFromProject()`는 범위가 넓으므로 무조건 기본으로 사용하지 않습니다.
- module별 규칙은 `scopeFromModule` 등 프로젝트 버전이 지원하는 범위 API로 제한하고,
  전체 의존 검사는 하나의 담당 테스트 모듈에서 수행해 중복 실행을 피합니다.
- 로컬과 CI의 작업 디렉터리가 달라도 같은 파일을 선택하는지 확인합니다. nested module,
  custom source set과 generated source는 실제 포함 파일 목록으로 검증합니다.
- 전체 파일 수뿐 아니라 필수 package/layer별로 대상 선언이 존재하는지 검사합니다.
  모듈명이나 package 오타로 규칙 적용 대상이 비는 상황을 명시적으로 실패시킵니다.

## 선언 규칙 예시

다음 JUnit 5 예시는 프로젝트에서 `UseCase` 접미사 클래스를 실제 사용하는 경우 적용합니다.
프로젝트의 package와 이름 규약에 맞게 수정하며, 없는 계층을 강제로 만들지 않습니다.

```kotlin
import com.lemonappdev.konsist.api.Konsist
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

class NamingKonsistTest {
    @Test
    fun `use case classes follow the project name convention`() {
        val useCases = Konsist.scopeFromProduction()
            .classes()
            .filter { it.name.endsWith("UseCase") }

        assertTrue(useCases.isNotEmpty(), "No use case classes found")
        useCases.forEach {
            assertTrue(it.name.first().isUpperCase(), "Invalid class name: ${it.name}")
        }
    }
}
```

## 레이어 의존 규칙 예시

아래는 프로젝트가 `com.example.application`과 `com.example.domain`을 사용하는 경우의
최소 예시입니다. 허용 방향을 설명하는 전체 아키텍처 테스트로 오해하지 않도록 실제
계층을 추가하고 필수 layer별 존재 검증을 함께 작성합니다.

```kotlin
import com.lemonappdev.konsist.api.Konsist
import com.lemonappdev.konsist.api.architecture.Layer
import com.lemonappdev.konsist.api.architecture.assertArchitecture
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

class DependencyKonsistTest {
    @Test
    fun `domain does not depend on application`() {
        val scope = Konsist.scopeFromProduction()
        assertTrue(scope.files.isNotEmpty(), "No production Kotlin files found")
        scope.assertArchitecture {
            val application = Layer("Application", "com.example.application..")
            val domain = Layer("Domain", "com.example.domain..")
            application.dependsOn(domain)
            domain.dependsOnNothing()
        }
    }
}
```

`dependsOn`의 기본값은 의존을 허용하는 규칙이며 반드시 의존하라는 요구가 아닙니다.
실제 의존 존재가 요구될 때만 `strict = true`를 사용합니다. `dependsOnNothing()`의
layer 검사 결과를 외부 라이브러리 의존까지 모두 금지했다는 증거로 사용하지 않습니다.

## ArchUnit과 검증 경계

- Konsist는 Kotlin source 선언과 구조, ArchUnit은 compile된 JVM bytecode 의존을 검사합니다.
  Java와 Kotlin 혼합 저장소에서 Konsist만으로 Java 코드를 검증했다고 판단하지 않습니다.
- DI 설정, reflection과 런타임 호출은 별도 integration test가 필요합니다. Gradle project
  dependency와 문서의 module diagram 일치도 별도 검증 책임으로 둡니다.
- 정상 fixture와 금지 방향·잘못된 선언 fixture를 각각 준비해 실패를 확인합니다.
  예외 추가 시에도 나머지 위반을 잡는지 확인하고 전체 rule을 끄지 않습니다.

## 검증

```sh
./gradlew test --tests '*KonsistTest'
./gradlew check
```

참고: [Konsist getting started](https://docs.konsist.lemonappdev.com/getting-started/getting-started),
[scope 구성](https://docs.konsist.lemonappdev.com/writing-tests/koscope),
[architecture assertion](https://docs.konsist.lemonappdev.com/writing-tests/architecture-assert)
