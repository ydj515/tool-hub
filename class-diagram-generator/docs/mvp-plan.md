# class-diagram-generator MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ZIP 형식의 Java 소스 입력을 받아 docx/xlsx/md 클래스 설계서를 생성하는 Spring Boot 3 + Kotlin 기반 REST API + Thymeleaf 웹 UI MVP 구축.

**Architecture:** Spring Boot 단일 모듈. 분석 파이프라인은 `ZipExtractor → ProjectDetector → JavaSourceAnalyzer → LayerClassifier → ClassIdAssigner → DocumentGenerator`. 진행 상태는 SSE로 실시간 전송. 산출물은 1시간 임시 보관 후 스케줄러로 정리.

**Tech Stack:** JDK 21 Temurin (mise) · Kotlin 2.0.21 · Gradle 8.10 (Kotlin DSL) · Spring Boot 3.3.5 (web, validation, thymeleaf, actuator) · JavaParser 3.26.2 · Apache POI 5.3.0 · Bootstrap 5.3.3 (WebJars) · Kotest 5.9.x + MockK 1.13.x · Spotless(ktlint) + Detekt

**참조 스펙:** [PRD-class-diagram-generator.md](./PRD-class-diagram-generator.md) v0.4

---

## File Structure

| 영역 | 파일 |
|---|---|
| 빌드/도구 | `.mise.toml`, `settings.gradle.kts`, `build.gradle.kts`, `gradle/libs.versions.toml`, `.editorconfig`, `detekt.yml` |
| 진입점 | `src/main/kotlin/.../ClassDiagramGeneratorApplication.kt` |
| 설정 | `src/main/kotlin/.../config/AppProperties.kt`, `WebConfig.kt`, `WebMvcConfig.kt` |
| 도메인 | `src/main/kotlin/.../domain/Model.kt`, `Warning.kt`, `OutputLabels.kt` |
| 입력 | `src/main/kotlin/.../input/ZipExtractor.kt`, `ProjectDetector.kt`, `ModuleDescriptor.kt` |
| 분석 | `src/main/kotlin/.../analyzer/JavaSourceAnalyzer.kt`, `LayerClassifier.kt`, `ClassIdAssigner.kt` |
| 렌더 | `src/main/kotlin/.../render/DocumentGenerator.kt`, `MarkdownGenerator.kt`, `XlsxGenerator.kt`, `DocxGenerator.kt` |
| Job | `src/main/kotlin/.../job/JobStore.kt`, `JobService.kt`, `JobOrchestrator.kt`, `ProgressBus.kt`, `Stage.kt` |
| 저장 | `src/main/kotlin/.../storage/OutputStorage.kt`, `ScheduledCleaner.kt` |
| REST API | `src/main/kotlin/.../api/JobController.kt`, `dto/*.kt`, `ProblemDetailHandler.kt` |
| 웹 | `src/main/kotlin/.../web/ViewController.kt` |
| 리소스 | `src/main/resources/application.yml`, `messages.properties`, `messages_en.properties`, `templates/*.html`, `static/css/app.css`, `static/js/*.js` |
| 테스트 | `src/test/kotlin/...` (각 클래스별 spec) |
| 테스트 픽스처 | `src/test/resources/fixtures/single-module.zip`, `multi-module.zip`, `no-javadoc.zip` |

---

## 사전 약속

- 모든 task는 **TDD**: 실패 테스트 → 구현 → 통과 → 커밋.
- 베이스 패키지: `com.toolhub.classdiagramgenerator`.
- 작업 디렉터리: `class-diagram-generator/` (이 폴더 안에서 모든 명령 실행).
- 커밋 메시지는 한국어, conventional commits 스타일.
- 각 task 종료 시 `./gradlew check` 통과 확인.

---

## Task 1: 프로젝트 스캐폴드 (mise + Gradle Kotlin DSL)

**Files:**
- Create: `class-diagram-generator/.mise.toml`
- Create: `class-diagram-generator/settings.gradle.kts`
- Create: `class-diagram-generator/build.gradle.kts`
- Create: `class-diagram-generator/gradle/libs.versions.toml`
- Create: `class-diagram-generator/.gitignore`
- Create: `class-diagram-generator/.editorconfig`
- Create: `class-diagram-generator/detekt.yml`

- [ ] **Step 1: `.mise.toml` 작성**

```toml
[tools]
java = "temurin-21.0.4+7"
gradle = "8.10.2"
```

- [ ] **Step 2: `.gitignore` 작성**

```
.gradle/
build/
.idea/
*.iml
out/
.mise.local.toml
.DS_Store
```

- [ ] **Step 3: `.editorconfig` 작성**

```
root = true

[*]
charset = utf-8
end_of_line = lf
indent_style = space
indent_size = 4
insert_final_newline = true
trim_trailing_whitespace = true

[*.{kt,kts}]
max_line_length = 140

[*.{yml,yaml,md}]
indent_size = 2
```

- [ ] **Step 4: `gradle/libs.versions.toml` 작성**

```toml
[versions]
kotlin = "2.0.21"
springBoot = "3.3.5"
springDepMgmt = "1.1.6"
javaparser = "3.26.2"
poi = "5.3.0"
bootstrap = "5.3.3"
bootstrapIcons = "1.11.3"
webjarsLocator = "1.0.0"
kotest = "5.9.1"
kotestSpring = "1.3.0"
mockk = "1.13.13"
springMockk = "4.0.2"
detekt = "1.23.7"
spotless = "6.25.0"
ktlint = "1.3.1"

[libraries]
spring-boot-starter-web      = { module = "org.springframework.boot:spring-boot-starter-web" }
spring-boot-starter-validation = { module = "org.springframework.boot:spring-boot-starter-validation" }
spring-boot-starter-thymeleaf = { module = "org.springframework.boot:spring-boot-starter-thymeleaf" }
spring-boot-starter-actuator = { module = "org.springframework.boot:spring-boot-starter-actuator" }
spring-boot-starter-test     = { module = "org.springframework.boot:spring-boot-starter-test" }
jackson-module-kotlin        = { module = "com.fasterxml.jackson.module:jackson-module-kotlin" }
kotlin-reflect               = { module = "org.jetbrains.kotlin:kotlin-reflect" }
javaparser-core              = { module = "com.github.javaparser:javaparser-core", version.ref = "javaparser" }
poi                          = { module = "org.apache.poi:poi", version.ref = "poi" }
poi-ooxml                    = { module = "org.apache.poi:poi-ooxml", version.ref = "poi" }
bootstrap                    = { module = "org.webjars.npm:bootstrap", version.ref = "bootstrap" }
bootstrap-icons              = { module = "org.webjars.npm:bootstrap-icons", version.ref = "bootstrapIcons" }
webjars-locator-lite         = { module = "org.webjars:webjars-locator-lite", version.ref = "webjarsLocator" }
kotest-runner-junit5         = { module = "io.kotest:kotest-runner-junit5", version.ref = "kotest" }
kotest-assertions-core       = { module = "io.kotest:kotest-assertions-core", version.ref = "kotest" }
kotest-extensions-spring     = { module = "io.kotest.extensions:kotest-extensions-spring", version.ref = "kotestSpring" }
mockk                        = { module = "io.mockk:mockk", version.ref = "mockk" }
springmockk                  = { module = "com.ninja-squad:springmockk", version.ref = "springMockk" }

[plugins]
kotlin-jvm       = { id = "org.jetbrains.kotlin.jvm", version.ref = "kotlin" }
kotlin-spring    = { id = "org.jetbrains.kotlin.plugin.spring", version.ref = "kotlin" }
spring-boot      = { id = "org.springframework.boot", version.ref = "springBoot" }
spring-dep-mgmt  = { id = "io.spring.dependency-management", version.ref = "springDepMgmt" }
detekt           = { id = "io.gitlab.arturbosch.detekt", version.ref = "detekt" }
spotless         = { id = "com.diffplug.spotless", version.ref = "spotless" }
```

- [ ] **Step 5: `settings.gradle.kts` 작성**

```kotlin
rootProject.name = "class-diagram-generator"
```

- [ ] **Step 6: `build.gradle.kts` 작성**

```kotlin
import io.gitlab.arturbosch.detekt.Detekt

plugins {
    alias(libs.plugins.kotlin.jvm)
    alias(libs.plugins.kotlin.spring)
    alias(libs.plugins.spring.boot)
    alias(libs.plugins.spring.dep.mgmt)
    alias(libs.plugins.detekt)
    alias(libs.plugins.spotless)
}

group = "com.toolhub"
version = "0.1.0-SNAPSHOT"

java {
    toolchain {
        languageVersion = JavaLanguageVersion.of(21)
    }
}

kotlin {
    compilerOptions {
        jvmTarget.set(org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_21)
        freeCompilerArgs.add("-Xjsr305=strict")
    }
}

repositories {
    mavenCentral()
}

dependencies {
    implementation(libs.spring.boot.starter.web)
    implementation(libs.spring.boot.starter.validation)
    implementation(libs.spring.boot.starter.thymeleaf)
    implementation(libs.spring.boot.starter.actuator)
    implementation(libs.jackson.module.kotlin)
    implementation(libs.kotlin.reflect)
    implementation(libs.javaparser.core)
    implementation(libs.poi)
    implementation(libs.poi.ooxml)
    implementation(libs.bootstrap)
    implementation(libs.bootstrap.icons)
    implementation(libs.webjars.locator.lite)

    testImplementation(libs.spring.boot.starter.test) {
        exclude(module = "mockito-core")
    }
    testImplementation(libs.kotest.runner.junit5)
    testImplementation(libs.kotest.assertions.core)
    testImplementation(libs.kotest.extensions.spring)
    testImplementation(libs.mockk)
    testImplementation(libs.springmockk)
}

tasks.withType<Test>().configureEach {
    useJUnitPlatform()
}

spotless {
    kotlin {
        ktlint(libs.versions.ktlint.get())
        target("src/**/*.kt")
    }
    kotlinGradle {
        ktlint(libs.versions.ktlint.get())
        target("*.gradle.kts")
    }
}

detekt {
    buildUponDefaultConfig = true
    config.setFrom(files("detekt.yml"))
}

tasks.withType<Detekt>().configureEach {
    jvmTarget = "21"
}

tasks.named("check") {
    dependsOn("spotlessCheck", "detekt")
}
```

- [ ] **Step 7: `detekt.yml` 최소 설정 작성**

```yaml
build:
  maxIssues: 0
style:
  MagicNumber:
    active: false
  ReturnCount:
    active: false
  MaxLineLength:
    maxLineLength: 140
complexity:
  LongMethod:
    threshold: 80
```

- [ ] **Step 8: 빌드 검증**

```bash
cd class-diagram-generator
mise install
./gradlew --version
./gradlew check
```

Expected: `BUILD SUCCESSFUL`. 아직 소스가 없으므로 컴파일 대상은 없지만 spotless/detekt가 동작해야 함.

- [ ] **Step 9: 커밋**

```bash
git add class-diagram-generator/
git commit -m "chore(class-diagram-generator): 프로젝트 스캐폴드 (mise + Gradle Kotlin DSL)"
```

---

## Task 2: Spring Boot 진입점 + 헬스체크 확인

**Files:**
- Create: `src/main/kotlin/com/toolhub/classdiagramgenerator/ClassDiagramGeneratorApplication.kt`
- Create: `src/main/resources/application.yml`
- Test: `src/test/kotlin/com/toolhub/classdiagramgenerator/ApplicationStartupTest.kt`

- [ ] **Step 1: 진입점 작성**

```kotlin
package com.toolhub.classdiagramgenerator

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.runApplication

@SpringBootApplication
class ClassDiagramGeneratorApplication

fun main(args: Array<String>) {
    runApplication<ClassDiagramGeneratorApplication>(*args)
}
```

- [ ] **Step 2: `application.yml` 작성**

```yaml
server:
  port: 8080
  servlet:
    encoding:
      charset: UTF-8
      enabled: true
      force: true

spring:
  application:
    name: class-diagram-generator
  servlet:
    multipart:
      max-file-size: 100MB
      max-request-size: 110MB
  messages:
    basename: messages
    encoding: UTF-8
    fallback-to-system-locale: false

management:
  endpoints:
    web:
      exposure:
        include: health,info,metrics

app:
  workdir: ${java.io.tmpdir}/class-diagram-generator
  job:
    max-concurrent: 4
    ttl-minutes: 60
    cleaner-interval-minutes: 10
  upload:
    max-file-size-mb: 100
  analysis:
    max-classes-per-module: 5000
```

- [ ] **Step 3: 기동 테스트 작성 (실패 확인)**

```kotlin
package com.toolhub.classdiagramgenerator

import io.kotest.core.spec.style.StringSpec
import io.kotest.extensions.spring.SpringExtension
import io.kotest.matchers.shouldBe
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.get

@SpringBootTest
@AutoConfigureMockMvc
class ApplicationStartupTest(private val mockMvc: MockMvc) : StringSpec({
    extensions(SpringExtension)
    "health endpoint should return UP" {
        mockMvc.get("/actuator/health")
            .andReturn()
            .response
            .status shouldBe 200
    }
})
```

- [ ] **Step 4: 테스트 실행 및 통과 확인**

```bash
./gradlew test --tests "*ApplicationStartupTest*"
```

Expected: PASS.

- [ ] **Step 5: 커밋**

```bash
git add .
git commit -m "feat(class-diagram-generator): Spring Boot 진입점 + actuator 설정"
```

---

## Task 3: AppProperties (타입 안전 설정)

**Files:**
- Create: `src/main/kotlin/com/toolhub/classdiagramgenerator/config/AppProperties.kt`
- Test: `src/test/kotlin/com/toolhub/classdiagramgenerator/config/AppPropertiesTest.kt`

- [ ] **Step 1: 테스트 작성**

```kotlin
package com.toolhub.classdiagramgenerator.config

import io.kotest.core.spec.style.StringSpec
import io.kotest.extensions.spring.SpringExtension
import io.kotest.matchers.shouldBe
import org.springframework.boot.test.context.SpringBootTest

@SpringBootTest
class AppPropertiesTest(private val props: AppProperties) : StringSpec({
    extensions(SpringExtension)
    "default ttl is 60 minutes" {
        props.job.ttlMinutes shouldBe 60
    }
    "default max concurrent is 4" {
        props.job.maxConcurrent shouldBe 4
    }
    "max classes per module is 5000" {
        props.analysis.maxClassesPerModule shouldBe 5000
    }
})
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
./gradlew test --tests "*AppPropertiesTest*"
```

Expected: FAIL (AppProperties 미존재).

- [ ] **Step 3: 구현**

```kotlin
package com.toolhub.classdiagramgenerator.config

import org.springframework.boot.context.properties.ConfigurationProperties
import org.springframework.boot.context.properties.EnableConfigurationProperties
import org.springframework.context.annotation.Configuration
import java.nio.file.Path

@ConfigurationProperties(prefix = "app")
data class AppProperties(
    val workdir: Path,
    val job: Job,
    val upload: Upload,
    val analysis: Analysis,
) {
    data class Job(
        val maxConcurrent: Int = 4,
        val ttlMinutes: Long = 60,
        val cleanerIntervalMinutes: Long = 10,
    )
    data class Upload(val maxFileSizeMb: Int = 100)
    data class Analysis(val maxClassesPerModule: Int = 5000)
}

@Configuration
@EnableConfigurationProperties(AppProperties::class)
class AppPropertiesConfig
```

- [ ] **Step 4: 테스트 실행 및 통과 확인**

```bash
./gradlew test --tests "*AppPropertiesTest*"
```

Expected: PASS.

- [ ] **Step 5: 커밋**

```bash
git add .
git commit -m "feat(class-diagram-generator): AppProperties 타입 안전 설정"
```

---

## Task 4: 도메인 모델 + OutputLanguage

**Files:**
- Create: `src/main/kotlin/com/toolhub/classdiagramgenerator/domain/Model.kt`
- Test: `src/test/kotlin/com/toolhub/classdiagramgenerator/domain/ModelTest.kt`

- [ ] **Step 1: 테스트 작성**

```kotlin
package com.toolhub.classdiagramgenerator.domain

import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.shouldBe
import java.time.ZonedDateTime

class ModelTest : StringSpec({
    "Program holds modules and language" {
        val program = Program(
            name = "demo",
            version = "v1.0",
            language = OutputLanguage.KO,
            generatedAt = ZonedDateTime.parse("2026-05-19T10:00:00+09:00"),
            modules = listOf(
                Module(
                    name = "core",
                    classes = listOf(
                        ClassInfo(
                            id = "CLS-0001",
                            name = "UserService",
                            layer = Layer.SERVICE,
                            description = "사용자 서비스",
                            packagePath = "com.demo.service",
                            attributes = emptyList(),
                            operations = emptyList(),
                        ),
                    ),
                ),
            ),
        )
        program.modules[0].classes[0].id shouldBe "CLS-0001"
        program.language shouldBe OutputLanguage.KO
    }
})
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
./gradlew test --tests "*ModelTest*"
```

Expected: FAIL.

- [ ] **Step 3: 구현**

```kotlin
package com.toolhub.classdiagramgenerator.domain

import java.time.ZonedDateTime

enum class OutputLanguage(val code: String) {
    KO("ko"), EN("en");
    companion object {
        fun parse(value: String): OutputLanguage =
            entries.firstOrNull { it.code.equals(value, ignoreCase = true) }
                ?: error("Unsupported language: $value")
    }
}

enum class Layer { CONTROLLER, SERVICE, MAPPER, UTIL, MODEL, ETC }

enum class AccessModifier { PUBLIC, PRIVATE, PROTECTED, DEFAULT }

data class Warning(
    val code: String,
    val message: String,
    val context: Map<String, Any?> = emptyMap(),
)

data class AttributeInfo(
    val name: String,
    val type: String,
    val accessModifier: AccessModifier,
    val description: String,
)

data class OperationInfo(
    val name: String,
    val description: String,
)

data class ClassInfo(
    val id: String,
    val name: String,
    val layer: Layer,
    val description: String,
    val packagePath: String,
    val attributes: List<AttributeInfo>,
    val operations: List<OperationInfo>,
)

data class Module(
    val name: String,
    val classes: List<ClassInfo>,
)

data class Program(
    val name: String,
    val version: String,
    val language: OutputLanguage,
    val generatedAt: ZonedDateTime,
    val modules: List<Module>,
    val warnings: List<Warning> = emptyList(),
)
```

- [ ] **Step 4: 통과 확인 + 커밋**

```bash
./gradlew test --tests "*ModelTest*"
git add . && git commit -m "feat(class-diagram-generator): 도메인 모델 + OutputLanguage 정의"
```

---

## Task 5: OutputLabels (산출물 라벨 사전)

**Files:**
- Create: `src/main/kotlin/com/toolhub/classdiagramgenerator/domain/OutputLabels.kt`
- Test: `src/test/kotlin/com/toolhub/classdiagramgenerator/domain/OutputLabelsTest.kt`

- [ ] **Step 1: 테스트 작성**

```kotlin
package com.toolhub.classdiagramgenerator.domain

import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.collections.shouldContainExactly
import io.kotest.matchers.shouldBe

class OutputLabelsTest : StringSpec({
    "KO labels match dictionary" {
        val labels = OutputLabels.of(OutputLanguage.KO)
        labels["col.classId"] shouldBe "클래스 ID"
        labels["doc.title.cover"] shouldBe "클래스 설계서"
        labels["sheet.cover"] shouldBe "표지"
    }
    "EN labels match dictionary" {
        val labels = OutputLabels.of(OutputLanguage.EN)
        labels["col.classId"] shouldBe "Class ID"
        labels["doc.title.cover"] shouldBe "Class Design"
        labels["sheet.cover"] shouldBe "Cover"
    }
    "KO and EN have identical key sets" {
        val ko = OutputLabels.of(OutputLanguage.KO).keys
        val en = OutputLabels.of(OutputLanguage.EN).keys
        ko.toSortedSet().toList() shouldContainExactly en.toSortedSet().toList()
    }
})
```

- [ ] **Step 2: 실패 확인**

```bash
./gradlew test --tests "*OutputLabelsTest*"
```

Expected: FAIL.

- [ ] **Step 3: 구현 (PRD 5.6.5 사전 그대로 반영)**

```kotlin
package com.toolhub.classdiagramgenerator.domain

class LabelDictionary internal constructor(private val map: Map<String, String>) {
    operator fun get(key: String): String =
        map[key] ?: error("Missing label key: $key")
    val keys: Set<String> get() = map.keys
}

object OutputLabels {
    private val KO = LabelDictionary(
        mapOf(
            "doc.title.cover" to "클래스 설계서",
            "doc.title.classList" to "클래스 리스트",
            "doc.title.classDesign" to "클래스 설계서",
            "doc.meta.programName" to "프로그램명",
            "doc.meta.moduleName" to "모듈명",
            "doc.meta.version" to "버전",
            "doc.meta.generatedAt" to "생성일",
            "col.classId" to "클래스 ID",
            "col.className" to "클래스명",
            "col.layer" to "계층",
            "col.package" to "패키지",
            "col.description" to "설명",
            "col.attributeName" to "속성명",
            "col.type" to "타입",
            "col.accessModifier" to "접근지정자",
            "col.operationName" to "오퍼레이션명",
            "layer.controller" to "Controller",
            "layer.service" to "Service",
            "layer.mapper" to "Mapper",
            "layer.util" to "Util",
            "layer.model" to "Model",
            "layer.etc" to "기타",
            "access.public" to "public",
            "access.private" to "private",
            "access.protected" to "protected",
            "access.default" to "default",
            "sheet.cover" to "표지",
            "sheet.classList" to "클래스 리스트",
            "sheet.classDesign" to "클래스 설계서",
            "toc.title" to "목차",
            "toc.refreshHint" to "목차는 F9 또는 우클릭 → 필드 업데이트로 갱신하세요.",
        ),
    )
    private val EN = LabelDictionary(
        mapOf(
            "doc.title.cover" to "Class Design",
            "doc.title.classList" to "Class List",
            "doc.title.classDesign" to "Class Design",
            "doc.meta.programName" to "Program",
            "doc.meta.moduleName" to "Module",
            "doc.meta.version" to "Version",
            "doc.meta.generatedAt" to "Generated At",
            "col.classId" to "Class ID",
            "col.className" to "Class Name",
            "col.layer" to "Layer",
            "col.package" to "Package",
            "col.description" to "Description",
            "col.attributeName" to "Attribute",
            "col.type" to "Type",
            "col.accessModifier" to "Access",
            "col.operationName" to "Operation",
            "layer.controller" to "Controller",
            "layer.service" to "Service",
            "layer.mapper" to "Mapper",
            "layer.util" to "Util",
            "layer.model" to "Model",
            "layer.etc" to "Etc",
            "access.public" to "public",
            "access.private" to "private",
            "access.protected" to "protected",
            "access.default" to "default",
            "sheet.cover" to "Cover",
            "sheet.classList" to "Class List",
            "sheet.classDesign" to "Class Design",
            "toc.title" to "Table of Contents",
            "toc.refreshHint" to "Press F9 or right-click → Update Field to refresh.",
        ),
    )

    fun of(language: OutputLanguage): LabelDictionary = when (language) {
        OutputLanguage.KO -> KO
        OutputLanguage.EN -> EN
    }
}
```

- [ ] **Step 4: 통과 확인 + 커밋**

```bash
./gradlew test --tests "*OutputLabelsTest*"
git add . && git commit -m "feat(class-diagram-generator): 산출물 라벨 사전(ko/en) 추가"
```

---

## Task 6: ZipExtractor (Zip Slip 방어 포함)

**Files:**
- Create: `src/main/kotlin/com/toolhub/classdiagramgenerator/input/ZipExtractor.kt`
- Test: `src/test/kotlin/com/toolhub/classdiagramgenerator/input/ZipExtractorTest.kt`

- [ ] **Step 1: 테스트 작성**

```kotlin
package com.toolhub.classdiagramgenerator.input

import io.kotest.assertions.throwables.shouldThrow
import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.collections.shouldContain
import io.kotest.matchers.shouldBe
import java.io.ByteArrayOutputStream
import java.nio.file.Files
import java.util.zip.ZipEntry
import java.util.zip.ZipOutputStream
import kotlin.io.path.exists
import kotlin.io.path.readText

class ZipExtractorTest : StringSpec({
    val extractor = ZipExtractor()

    "extracts files preserving directory structure" {
        val zipBytes = buildZip(
            "module-a/src/main/java/A.java" to "class A {}",
            "module-a/build.gradle" to "// gradle",
        )
        val target = Files.createTempDirectory("ext-")
        extractor.extract(zipBytes.inputStream(), target)
        target.resolve("module-a/src/main/java/A.java").exists() shouldBe true
        target.resolve("module-a/src/main/java/A.java").readText() shouldBe "class A {}"
    }

    "rejects zip slip" {
        val zipBytes = buildZip("../evil.txt" to "owned")
        val target = Files.createTempDirectory("ext-")
        shouldThrow<ZipExtractor.ZipSlipException> {
            extractor.extract(zipBytes.inputStream(), target)
        }
    }

    "lists java files" {
        val zipBytes = buildZip(
            "A.java" to "class A {}",
            "README.md" to "doc",
            "B.java" to "class B {}",
        )
        val target = Files.createTempDirectory("ext-")
        extractor.extract(zipBytes.inputStream(), target)
        val javas = extractor.listJavaFiles(target).map { it.fileName.toString() }
        javas shouldContain "A.java"
        javas shouldContain "B.java"
        javas.size shouldBe 2
    }
})

private fun buildZip(vararg entries: Pair<String, String>): ByteArray {
    val out = ByteArrayOutputStream()
    ZipOutputStream(out).use { zos ->
        entries.forEach { (name, content) ->
            zos.putNextEntry(ZipEntry(name))
            zos.write(content.toByteArray())
            zos.closeEntry()
        }
    }
    return out.toByteArray()
}
```

- [ ] **Step 2: 실패 확인**

```bash
./gradlew test --tests "*ZipExtractorTest*"
```

Expected: FAIL.

- [ ] **Step 3: 구현**

```kotlin
package com.toolhub.classdiagramgenerator.input

import org.springframework.stereotype.Component
import java.io.InputStream
import java.nio.file.Files
import java.nio.file.Path
import java.util.zip.ZipInputStream
import kotlin.io.path.createDirectories
import kotlin.io.path.extension
import kotlin.io.path.isDirectory
import kotlin.io.path.outputStream

@Component
class ZipExtractor {
    class ZipSlipException(path: String) : RuntimeException("Zip entry escapes target: $path")

    fun extract(input: InputStream, target: Path) {
        target.createDirectories()
        val normalizedTarget = target.toAbsolutePath().normalize()
        ZipInputStream(input).use { zis ->
            generateSequence { zis.nextEntry }.forEach { entry ->
                val resolved = normalizedTarget.resolve(entry.name).normalize()
                if (!resolved.startsWith(normalizedTarget)) {
                    throw ZipSlipException(entry.name)
                }
                if (entry.isDirectory) {
                    resolved.createDirectories()
                } else {
                    resolved.parent?.createDirectories()
                    resolved.outputStream().use { os -> zis.copyTo(os) }
                }
                zis.closeEntry()
            }
        }
    }

    fun listJavaFiles(root: Path): List<Path> =
        Files.walk(root).use { stream ->
            stream.filter { !it.isDirectory() && it.extension == "java" }.toList()
        }
}
```

- [ ] **Step 4: 통과 확인 + 커밋**

```bash
./gradlew test --tests "*ZipExtractorTest*"
git add . && git commit -m "feat(class-diagram-generator): ZipExtractor (Zip Slip 방어)"
```

---

## Task 7: ProjectDetector (멀티모듈 감지)

**Files:**
- Create: `src/main/kotlin/com/toolhub/classdiagramgenerator/input/ProjectDetector.kt`
- Create: `src/main/kotlin/com/toolhub/classdiagramgenerator/input/ModuleDescriptor.kt`
- Test: `src/test/kotlin/com/toolhub/classdiagramgenerator/input/ProjectDetectorTest.kt`

- [ ] **Step 1: `ModuleDescriptor` 정의**

```kotlin
package com.toolhub.classdiagramgenerator.input

import java.nio.file.Path

data class ModuleDescriptor(
    val name: String,
    val rootDir: Path,
    val sourceFiles: List<Path>,
)
```

- [ ] **Step 2: 테스트 작성**

```kotlin
package com.toolhub.classdiagramgenerator.input

import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.collections.shouldHaveSize
import io.kotest.matchers.shouldBe
import java.nio.file.Files
import kotlin.io.path.createDirectories
import kotlin.io.path.writeText

class ProjectDetectorTest : StringSpec({
    val detector = ProjectDetector()

    "detects single Gradle module" {
        val root = Files.createTempDirectory("proj-")
        root.resolve("build.gradle").writeText("// noop")
        val src = root.resolve("src/main/java/com/example")
        src.createDirectories()
        src.resolve("Hello.java").writeText("class Hello {}")
        val modules = detector.detect(root, fallbackName = "demo")
        modules shouldHaveSize 1
        modules[0].name shouldBe "demo"
        modules[0].sourceFiles shouldHaveSize 1
    }

    "detects multi-module Gradle project from settings.gradle" {
        val root = Files.createTempDirectory("proj-")
        root.resolve("settings.gradle").writeText(
            """
            rootProject.name = 'parent'
            include 'app'
            include 'core'
            """.trimIndent(),
        )
        listOf("app", "core").forEach { name ->
            val mod = root.resolve(name)
            mod.createDirectories()
            mod.resolve("build.gradle").writeText("// noop")
            val src = mod.resolve("src/main/java")
            src.createDirectories()
            src.resolve("X.java").writeText("class X {}")
        }
        val modules = detector.detect(root, fallbackName = "fb").map { it.name }.sorted()
        modules shouldBe listOf("app", "core")
    }

    "detects Maven module via pom.xml" {
        val root = Files.createTempDirectory("proj-")
        root.resolve("pom.xml").writeText(
            "<project><artifactId>my-service</artifactId></project>",
        )
        val src = root.resolve("src/main/java")
        src.createDirectories()
        src.resolve("M.java").writeText("class M {}")
        val modules = detector.detect(root, fallbackName = "fb")
        modules[0].name shouldBe "my-service"
    }

    "falls back to scanning all .java when no build file" {
        val root = Files.createTempDirectory("proj-")
        root.resolve("Loose.java").writeText("class Loose {}")
        val modules = detector.detect(root, fallbackName = "fb")
        modules shouldHaveSize 1
        modules[0].name shouldBe "fb"
        modules[0].sourceFiles shouldHaveSize 1
    }
})
```

- [ ] **Step 3: 실패 확인**

```bash
./gradlew test --tests "*ProjectDetectorTest*"
```

Expected: FAIL.

- [ ] **Step 4: 구현**

```kotlin
package com.toolhub.classdiagramgenerator.input

import org.springframework.stereotype.Component
import java.nio.file.Files
import java.nio.file.Path
import kotlin.io.path.exists
import kotlin.io.path.extension
import kotlin.io.path.isDirectory
import kotlin.io.path.name
import kotlin.io.path.readText

@Component
class ProjectDetector {

    fun detect(root: Path, fallbackName: String): List<ModuleDescriptor> {
        val gradleSettings = listOf("settings.gradle", "settings.gradle.kts")
            .map { root.resolve(it) }
            .firstOrNull { it.exists() }
        if (gradleSettings != null) {
            val includes = parseGradleIncludes(gradleSettings.readText())
            if (includes.isNotEmpty()) {
                return includes.mapNotNull { moduleFromIncludePath(root, it) }
                    .ifEmpty { listOf(singleFallback(root, fallbackName)) }
            }
        }
        val rootBuild = listOf("build.gradle", "build.gradle.kts", "pom.xml")
            .map { root.resolve(it) }
            .firstOrNull { it.exists() }
        if (rootBuild != null) {
            val name = when (rootBuild.name) {
                "pom.xml" -> parseMavenArtifactId(rootBuild.readText()) ?: fallbackName
                else -> fallbackName
            }
            return listOf(buildModule(root, name))
        }
        return listOf(singleFallback(root, fallbackName))
    }

    private fun moduleFromIncludePath(root: Path, includePath: String): ModuleDescriptor? {
        val rel = includePath.replace(':', '/').trimStart('/')
        val dir = root.resolve(rel)
        if (!dir.exists() || !dir.isDirectory()) return null
        val name = dir.fileName.toString()
        return buildModule(dir, name)
    }

    private fun buildModule(dir: Path, name: String): ModuleDescriptor {
        val sources = collectJavaSources(dir)
        return ModuleDescriptor(name = name, rootDir = dir, sourceFiles = sources)
    }

    private fun singleFallback(root: Path, fallbackName: String): ModuleDescriptor =
        buildModule(root, fallbackName)

    private fun collectJavaSources(dir: Path): List<Path> {
        val preferred = dir.resolve("src/main/java")
        val base = if (preferred.exists()) preferred else dir
        return Files.walk(base).use { stream ->
            stream.filter { !it.isDirectory() && it.extension == "java" }.toList()
        }
    }

    private val includeRegex = Regex("""include\s*[(\s'\"]+([^'\")]+)[\s'\")]+""")

    private fun parseGradleIncludes(content: String): List<String> =
        includeRegex.findAll(content).map { it.groupValues[1] }.toList()

    private fun parseMavenArtifactId(xml: String): String? =
        Regex("""<artifactId>([^<]+)</artifactId>""").find(xml)?.groupValues?.get(1)
}
```

- [ ] **Step 5: 통과 확인 + 커밋**

```bash
./gradlew test --tests "*ProjectDetectorTest*"
git add . && git commit -m "feat(class-diagram-generator): ProjectDetector (Gradle/Maven 멀티모듈 감지)"
```

---

## Task 8: JavaSourceAnalyzer (JavaParser)

**Files:**
- Create: `src/main/kotlin/com/toolhub/classdiagramgenerator/analyzer/JavaSourceAnalyzer.kt`
- Test: `src/test/kotlin/com/toolhub/classdiagramgenerator/analyzer/JavaSourceAnalyzerTest.kt`

- [ ] **Step 1: 테스트 작성**

```kotlin
package com.toolhub.classdiagramgenerator.analyzer

import com.toolhub.classdiagramgenerator.domain.AccessModifier
import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.shouldBe
import java.nio.file.Files
import kotlin.io.path.writeText

class JavaSourceAnalyzerTest : StringSpec({
    val analyzer = JavaSourceAnalyzer()

    "parses class with javadoc, field, method" {
        val src = """
            package com.demo.service;
            /** 사용자 서비스. 자세한 내용. */
            public class UserService {
                /** 사용자 저장소 */
                private UserRepository repo;
                /** 사용자를 저장한다. */
                public void save(User u) {}
            }
        """.trimIndent()
        val path = Files.createTempFile("UserService", ".java").also { it.writeText(src) }
        val parsed = analyzer.parseFile(path).single()
        parsed.name shouldBe "UserService"
        parsed.packagePath shouldBe "com.demo.service"
        parsed.description shouldBe "사용자 서비스."
        parsed.attributes shouldBe listOf(
            ParsedAttribute("repo", "UserRepository", AccessModifier.PRIVATE, "사용자 저장소"),
        )
        parsed.operations shouldBe listOf(
            ParsedOperation("save", "사용자를 저장한다."),
        )
    }

    "empty javadoc yields empty description" {
        val src = "package x; public class Bare { public Bare() {} }"
        val path = Files.createTempFile("Bare", ".java").also { it.writeText(src) }
        val parsed = analyzer.parseFile(path).single()
        parsed.description shouldBe ""
    }

    "extracts inner classes as separate entries" {
        val src = """
            package x;
            public class Outer {
                public static class Inner {}
            }
        """.trimIndent()
        val path = Files.createTempFile("Outer", ".java").also { it.writeText(src) }
        val parsed = analyzer.parseFile(path).map { it.name }
        parsed shouldBe listOf("Outer", "Inner")
    }
})
```

- [ ] **Step 2: 실패 확인**

```bash
./gradlew test --tests "*JavaSourceAnalyzerTest*"
```

Expected: FAIL.

- [ ] **Step 3: 구현**

```kotlin
package com.toolhub.classdiagramgenerator.analyzer

import com.github.javaparser.StaticJavaParser
import com.github.javaparser.ast.body.ClassOrInterfaceDeclaration
import com.github.javaparser.ast.body.EnumDeclaration
import com.github.javaparser.ast.body.RecordDeclaration
import com.github.javaparser.ast.body.TypeDeclaration
import com.github.javaparser.ast.nodeTypes.NodeWithModifiers
import com.github.javaparser.javadoc.Javadoc
import com.toolhub.classdiagramgenerator.domain.AccessModifier
import org.springframework.stereotype.Component
import java.nio.file.Path

data class ParsedAttribute(
    val name: String,
    val type: String,
    val accessModifier: AccessModifier,
    val description: String,
)

data class ParsedOperation(
    val name: String,
    val description: String,
)

data class ParsedType(
    val name: String,
    val packagePath: String,
    val description: String,
    val attributes: List<ParsedAttribute>,
    val operations: List<ParsedOperation>,
)

@Component
class JavaSourceAnalyzer {
    fun parseFile(path: Path): List<ParsedType> {
        val unit = StaticJavaParser.parse(path)
        val pkg = unit.packageDeclaration.map { it.nameAsString }.orElse("")
        val result = mutableListOf<ParsedType>()
        unit.types.forEach { collect(it, pkg, result) }
        return result
    }

    private fun collect(type: TypeDeclaration<*>, pkg: String, out: MutableList<ParsedType>) {
        out.add(parseType(type, pkg))
        type.members.filterIsInstance<TypeDeclaration<*>>().forEach { collect(it, pkg, out) }
    }

    private fun parseType(type: TypeDeclaration<*>, pkg: String): ParsedType {
        val attributes = type.fields.flatMap { field ->
            field.variables.map { v ->
                ParsedAttribute(
                    name = v.nameAsString,
                    type = field.elementType.asString(),
                    accessModifier = accessOf(field),
                    description = firstSentence(field.javadoc.orElse(null)),
                )
            }
        }
        val operations = type.methods.map { m ->
            ParsedOperation(
                name = m.nameAsString,
                description = firstSentence(m.javadoc.orElse(null)),
            )
        }
        val supportedClass = type is ClassOrInterfaceDeclaration || type is EnumDeclaration || type is RecordDeclaration
        require(supportedClass) { "Unsupported type: ${type.nameAsString}" }
        return ParsedType(
            name = type.nameAsString,
            packagePath = pkg,
            description = firstSentence(type.javadoc.orElse(null)),
            attributes = attributes,
            operations = operations,
        )
    }

    private fun accessOf(node: NodeWithModifiers<*>): AccessModifier = when {
        node.isPublic -> AccessModifier.PUBLIC
        node.isPrivate -> AccessModifier.PRIVATE
        node.isProtected -> AccessModifier.PROTECTED
        else -> AccessModifier.DEFAULT
    }

    private fun firstSentence(javadoc: Javadoc?): String {
        if (javadoc == null) return ""
        val raw = javadoc.description.toText()
        val cleaned = raw
            .replace(Regex("\\{@link\\s+([^}]+)\\}"), "$1")
            .replace(Regex("<[^>]+>"), "")
            .replace(Regex("\\s+"), " ")
            .trim()
        val dotIdx = cleaned.indexOf('.')
        return if (dotIdx >= 0) cleaned.substring(0, dotIdx + 1) else cleaned
    }
}
```

- [ ] **Step 4: 통과 확인 + 커밋**

```bash
./gradlew test --tests "*JavaSourceAnalyzerTest*"
git add . && git commit -m "feat(class-diagram-generator): JavaSourceAnalyzer (JavaParser 기반)"
```

---

## Task 9: LayerClassifier

**Files:**
- Create: `src/main/kotlin/com/toolhub/classdiagramgenerator/analyzer/LayerClassifier.kt`
- Test: `src/test/kotlin/com/toolhub/classdiagramgenerator/analyzer/LayerClassifierTest.kt`

- [ ] **Step 1: 테스트 작성**

```kotlin
package com.toolhub.classdiagramgenerator.analyzer

import com.toolhub.classdiagramgenerator.domain.Layer
import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.shouldBe

class LayerClassifierTest : StringSpec({
    val classifier = LayerClassifier()

    "controller package → CONTROLLER" {
        classifier.classify(basePackage = "com.demo", packagePath = "com.demo.controller") shouldBe Layer.CONTROLLER
    }
    "service" {
        classifier.classify("com.demo", "com.demo.service.user") shouldBe Layer.SERVICE
    }
    "dao maps to MAPPER" {
        classifier.classify("com.demo", "com.demo.dao") shouldBe Layer.MAPPER
    }
    "entity maps to MODEL" {
        classifier.classify("com.demo", "com.demo.entity") shouldBe Layer.MODEL
    }
    "unknown segment → ETC" {
        classifier.classify("com.demo", "com.demo.weird") shouldBe Layer.ETC
    }
    "case insensitive" {
        classifier.classify("com.demo", "com.demo.Controller") shouldBe Layer.CONTROLLER
    }
    "empty base means full path" {
        classifier.classify("", "service.user") shouldBe Layer.SERVICE
    }
})
```

- [ ] **Step 2: 실패 확인**

```bash
./gradlew test --tests "*LayerClassifierTest*"
```

Expected: FAIL.

- [ ] **Step 3: 구현**

```kotlin
package com.toolhub.classdiagramgenerator.analyzer

import com.toolhub.classdiagramgenerator.domain.Layer
import org.springframework.stereotype.Component

@Component
class LayerClassifier {
    private val mapping = mapOf(
        "controller" to Layer.CONTROLLER,
        "service" to Layer.SERVICE,
        "mapper" to Layer.MAPPER,
        "dao" to Layer.MAPPER,
        "repository" to Layer.MAPPER,
        "util" to Layer.UTIL,
        "utils" to Layer.UTIL,
        "common" to Layer.UTIL,
        "model" to Layer.MODEL,
        "domain" to Layer.MODEL,
        "entity" to Layer.MODEL,
        "dto" to Layer.MODEL,
        "vo" to Layer.MODEL,
    )

    fun classify(basePackage: String, packagePath: String): Layer {
        val remainder = if (basePackage.isEmpty() || !packagePath.startsWith(basePackage)) {
            packagePath
        } else {
            packagePath.removePrefix(basePackage).trimStart('.')
        }
        val firstSegment = remainder.substringBefore('.').lowercase()
        return mapping[firstSegment] ?: Layer.ETC
    }

    fun commonBasePackage(packages: Collection<String>): String {
        if (packages.isEmpty()) return ""
        if (packages.size == 1) return packages.first()
        val segments = packages.map { it.split('.') }
        val minLen = segments.minOf { it.size }
        val common = mutableListOf<String>()
        for (i in 0 until minLen) {
            val seg = segments[0][i]
            if (segments.all { it[i] == seg }) common += seg else break
        }
        return common.joinToString(".")
    }
}
```

- [ ] **Step 4: 통과 확인 + 커밋**

```bash
./gradlew test --tests "*LayerClassifierTest*"
git add . && git commit -m "feat(class-diagram-generator): LayerClassifier (패키지 기반 계층 판정)"
```

---

## Task 10: ClassIdAssigner (CLS-0001 ~)

**Files:**
- Create: `src/main/kotlin/com/toolhub/classdiagramgenerator/analyzer/ClassIdAssigner.kt`
- Test: `src/test/kotlin/com/toolhub/classdiagramgenerator/analyzer/ClassIdAssignerTest.kt`

- [ ] **Step 1: 테스트 작성**

```kotlin
package com.toolhub.classdiagramgenerator.analyzer

import com.toolhub.classdiagramgenerator.domain.AccessModifier
import com.toolhub.classdiagramgenerator.domain.ClassInfo
import com.toolhub.classdiagramgenerator.domain.Layer
import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.shouldBe

class ClassIdAssignerTest : StringSpec({
    val assigner = ClassIdAssigner()
    fun build(name: String, layer: Layer, pkg: String) = ClassInfo(
        id = "",
        name = name,
        layer = layer,
        description = "",
        packagePath = pkg,
        attributes = emptyList(),
        operations = emptyList(),
    )

    "sorts by layer order then package then name and pads to 4 digits" {
        val input = listOf(
            build("ZService", Layer.SERVICE, "com.x.service"),
            build("AController", Layer.CONTROLLER, "com.x.controller"),
            build("BController", Layer.CONTROLLER, "com.x.controller"),
            build("CModel", Layer.MODEL, "com.x.model"),
        )
        val ids = assigner.assign(input).map { it.id }
        ids shouldBe listOf("CLS-0001", "CLS-0002", "CLS-0003", "CLS-0004")
        val names = assigner.assign(input).map { it.name }
        names shouldBe listOf("AController", "BController", "ZService", "CModel")
    }

    "pads up to 5 digits when over 9999" {
        val many = (1..10_000).map { build("C$it", Layer.UTIL, "com.x.util") }
        val last = assigner.assign(many).last()
        last.id shouldBe "CLS-10000"
    }
})
```

- [ ] **Step 2: 실패 확인**

```bash
./gradlew test --tests "*ClassIdAssignerTest*"
```

Expected: FAIL.

- [ ] **Step 3: 구현**

```kotlin
package com.toolhub.classdiagramgenerator.analyzer

import com.toolhub.classdiagramgenerator.domain.ClassInfo
import com.toolhub.classdiagramgenerator.domain.Layer
import org.springframework.stereotype.Component

@Component
class ClassIdAssigner {
    private val layerOrder = listOf(
        Layer.CONTROLLER, Layer.SERVICE, Layer.MAPPER, Layer.UTIL, Layer.MODEL, Layer.ETC,
    )
    private val layerIndex = layerOrder.withIndex().associate { (idx, layer) -> layer to idx }

    fun assign(classes: List<ClassInfo>): List<ClassInfo> {
        val sorted = classes.sortedWith(
            compareBy({ layerIndex[it.layer] ?: Int.MAX_VALUE }, { it.packagePath }, { it.name }),
        )
        val padLen = maxOf(4, sorted.size.toString().length)
        return sorted.mapIndexed { idx, info ->
            val num = (idx + 1).toString().padStart(padLen, '0')
            info.copy(id = "CLS-$num")
        }
    }
}
```

- [ ] **Step 4: 통과 확인 + 커밋**

```bash
./gradlew test --tests "*ClassIdAssignerTest*"
git add . && git commit -m "feat(class-diagram-generator): ClassIdAssigner (CLS-XXXX 부여)"
```

---

## Task 11: MarkdownGenerator

**Files:**
- Create: `src/main/kotlin/com/toolhub/classdiagramgenerator/render/DocumentGenerator.kt`
- Create: `src/main/kotlin/com/toolhub/classdiagramgenerator/render/MarkdownGenerator.kt`
- Test: `src/test/kotlin/com/toolhub/classdiagramgenerator/render/MarkdownGeneratorTest.kt`

- [ ] **Step 1: 공통 인터페이스 작성**

```kotlin
package com.toolhub.classdiagramgenerator.render

import com.toolhub.classdiagramgenerator.domain.Module
import com.toolhub.classdiagramgenerator.domain.Program
import java.io.OutputStream

interface DocumentGenerator {
    val format: String   // "docx" | "xlsx" | "md"
    fun render(program: Program, module: Module, out: OutputStream)
}
```

- [ ] **Step 2: 테스트 작성**

```kotlin
package com.toolhub.classdiagramgenerator.render

import com.toolhub.classdiagramgenerator.domain.*
import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.string.shouldContain
import java.io.ByteArrayOutputStream
import java.time.ZonedDateTime

class MarkdownGeneratorTest : StringSpec({
    val gen = MarkdownGenerator()
    val program = Program(
        name = "demo", version = "v1.0",
        language = OutputLanguage.KO,
        generatedAt = ZonedDateTime.parse("2026-05-19T10:00:00+09:00"),
        modules = listOf(
            Module(
                name = "core",
                classes = listOf(
                    ClassInfo(
                        id = "CLS-0001", name = "UserService", layer = Layer.SERVICE,
                        description = "사용자 서비스.", packagePath = "com.demo.service",
                        attributes = listOf(
                            AttributeInfo("repo", "UserRepository", AccessModifier.PRIVATE, "리포지토리"),
                        ),
                        operations = listOf(OperationInfo("save", "저장한다.")),
                    ),
                ),
            ),
        ),
    )

    "ko renders korean labels" {
        val out = ByteArrayOutputStream()
        gen.render(program, program.modules[0], out)
        val text = out.toString(Charsets.UTF_8)
        text shouldContain "# 클래스 설계서(demo)"
        text shouldContain "| 클래스 ID | 클래스명 | 계층 | 설명 |"
        text shouldContain "CLS-0001"
    }

    "en renders english labels" {
        val out = ByteArrayOutputStream()
        gen.render(program.copy(language = OutputLanguage.EN), program.modules[0], out)
        val text = out.toString(Charsets.UTF_8)
        text shouldContain "# Class Design(demo)"
        text shouldContain "| Class ID | Class Name | Layer | Description |"
    }
})
```

- [ ] **Step 3: 실패 확인**

```bash
./gradlew test --tests "*MarkdownGeneratorTest*"
```

Expected: FAIL.

- [ ] **Step 4: 구현**

```kotlin
package com.toolhub.classdiagramgenerator.render

import com.toolhub.classdiagramgenerator.domain.LabelDictionary
import com.toolhub.classdiagramgenerator.domain.Module
import com.toolhub.classdiagramgenerator.domain.OutputLabels
import com.toolhub.classdiagramgenerator.domain.Program
import org.springframework.stereotype.Component
import java.io.OutputStream
import java.io.PrintWriter
import java.time.format.DateTimeFormatter

@Component
class MarkdownGenerator : DocumentGenerator {
    override val format = "md"

    override fun render(program: Program, module: Module, out: OutputStream) {
        val labels = OutputLabels.of(program.language)
        PrintWriter(out.writer(Charsets.UTF_8)).use { w ->
            renderCover(w, program, module, labels)
            renderClassList(w, module, labels)
            renderClassDesign(w, module, labels)
            w.flush()
        }
    }

    private fun renderCover(w: PrintWriter, program: Program, module: Module, labels: LabelDictionary) {
        w.println("# ${labels["doc.title.cover"]}(${program.name})")
        w.println()
        w.println("| ${labels["doc.meta.programName"]} | ${labels["doc.meta.moduleName"]} | " +
            "${labels["doc.meta.version"]} | ${labels["doc.meta.generatedAt"]} |")
        w.println("|---|---|---|---|")
        val ts = program.generatedAt.format(DateTimeFormatter.ISO_OFFSET_DATE_TIME)
        w.println("| ${program.name} | ${module.name} | ${program.version} | $ts |")
        w.println()
    }

    private fun renderClassList(w: PrintWriter, module: Module, labels: LabelDictionary) {
        w.println("## ${labels["doc.title.classList"]}")
        w.println()
        w.println("| ${labels["col.classId"]} | ${labels["col.className"]} | " +
            "${labels["col.layer"]} | ${labels["col.description"]} |")
        w.println("|---|---|---|---|")
        module.classes.forEach { c ->
            w.println("| ${c.id} | ${c.name} | ${labels["layer.${c.layer.name.lowercase()}"]} | ${c.description} |")
        }
        w.println()
    }

    private fun renderClassDesign(w: PrintWriter, module: Module, labels: LabelDictionary) {
        w.println("## ${labels["doc.title.classDesign"]}")
        w.println()
        module.classes.forEachIndexed { idx, c ->
            if (idx > 0) {
                w.println("---")
                w.println()
            }
            w.println("### ${c.id} ${c.name}")
            w.println()
            w.println("| ${labels["col.classId"]} | ${labels["col.className"]} | ${labels["col.description"]} |")
            w.println("|---|---|---|")
            w.println("| ${c.id} | ${c.name} | ${c.description} |")
            w.println()

            w.println("| ${labels["col.attributeName"]} | ${labels["col.type"]} | " +
                "${labels["col.accessModifier"]} | ${labels["col.description"]} |")
            w.println("|---|---|---|---|")
            c.attributes.forEach { a ->
                w.println("| ${a.name} | `${a.type}` | ${labels["access.${a.accessModifier.name.lowercase()}"]} | ${a.description} |")
            }
            w.println()

            w.println("| ${labels["col.operationName"]} | ${labels["col.description"]} |")
            w.println("|---|---|")
            c.operations.forEach { o ->
                w.println("| ${o.name} | ${o.description} |")
            }
            w.println()
        }
    }
}
```

- [ ] **Step 5: 통과 확인 + 커밋**

```bash
./gradlew test --tests "*MarkdownGeneratorTest*"
git add . && git commit -m "feat(class-diagram-generator): MarkdownGenerator"
```

---

## Task 12: XlsxGenerator

**Files:**
- Create: `src/main/kotlin/com/toolhub/classdiagramgenerator/render/XlsxGenerator.kt`
- Test: `src/test/kotlin/com/toolhub/classdiagramgenerator/render/XlsxGeneratorTest.kt`

- [ ] **Step 1: 테스트 작성 (구조만 검증)**

```kotlin
package com.toolhub.classdiagramgenerator.render

import com.toolhub.classdiagramgenerator.domain.*
import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.shouldBe
import org.apache.poi.xssf.usermodel.XSSFWorkbook
import java.io.ByteArrayInputStream
import java.io.ByteArrayOutputStream
import java.time.ZonedDateTime

class XlsxGeneratorTest : StringSpec({
    val gen = XlsxGenerator()
    val program = Program(
        name = "demo", version = "v1.0",
        language = OutputLanguage.KO,
        generatedAt = ZonedDateTime.parse("2026-05-19T10:00:00+09:00"),
        modules = listOf(
            Module(
                name = "core",
                classes = listOf(
                    ClassInfo(
                        id = "CLS-0001", name = "UserService", layer = Layer.SERVICE,
                        description = "사용자 서비스.", packagePath = "com.demo.service",
                        attributes = listOf(
                            AttributeInfo("repo", "UserRepository", AccessModifier.PRIVATE, "리포지토리"),
                        ),
                        operations = listOf(OperationInfo("save", "저장한다.")),
                    ),
                ),
            ),
        ),
    )

    "produces 3 sheets with localized names" {
        val out = ByteArrayOutputStream()
        gen.render(program, program.modules[0], out)
        XSSFWorkbook(ByteArrayInputStream(out.toByteArray())).use { wb ->
            wb.numberOfSheets shouldBe 3
            wb.getSheetAt(0).sheetName shouldBe "표지"
            wb.getSheetAt(1).sheetName shouldBe "클래스 리스트"
            wb.getSheetAt(2).sheetName shouldBe "클래스 설계서"
            wb.getSheet("클래스 리스트").getRow(0).getCell(0).stringCellValue shouldBe "클래스 ID"
        }
    }

    "english sheet names" {
        val out = ByteArrayOutputStream()
        gen.render(program.copy(language = OutputLanguage.EN), program.modules[0], out)
        XSSFWorkbook(ByteArrayInputStream(out.toByteArray())).use { wb ->
            wb.getSheetAt(0).sheetName shouldBe "Cover"
            wb.getSheetAt(1).sheetName shouldBe "Class List"
            wb.getSheetAt(2).sheetName shouldBe "Class Design"
        }
    }
})
```

- [ ] **Step 2: 실패 확인**

```bash
./gradlew test --tests "*XlsxGeneratorTest*"
```

Expected: FAIL.

- [ ] **Step 3: 구현**

```kotlin
package com.toolhub.classdiagramgenerator.render

import com.toolhub.classdiagramgenerator.domain.LabelDictionary
import com.toolhub.classdiagramgenerator.domain.Module
import com.toolhub.classdiagramgenerator.domain.OutputLabels
import com.toolhub.classdiagramgenerator.domain.Program
import org.apache.poi.ss.usermodel.BorderStyle
import org.apache.poi.ss.usermodel.CellStyle
import org.apache.poi.ss.usermodel.FillPatternType
import org.apache.poi.ss.usermodel.IndexedColors
import org.apache.poi.ss.usermodel.Sheet
import org.apache.poi.ss.usermodel.Workbook
import org.apache.poi.ss.util.CellRangeAddress
import org.apache.poi.xssf.usermodel.XSSFWorkbook
import org.springframework.stereotype.Component
import java.io.OutputStream
import java.time.format.DateTimeFormatter

@Component
class XlsxGenerator : DocumentGenerator {
    override val format = "xlsx"

    override fun render(program: Program, module: Module, out: OutputStream) {
        val labels = OutputLabels.of(program.language)
        XSSFWorkbook().use { wb ->
            val header = headerStyle(wb)
            val body = bodyStyle(wb)
            renderCover(wb.createSheet(labels["sheet.cover"]), program, module, labels, body)
            renderClassList(wb.createSheet(labels["sheet.classList"]), module, labels, header, body)
            renderClassDesign(wb.createSheet(labels["sheet.classDesign"]), module, labels, header, body)
            wb.write(out)
        }
    }

    private fun renderCover(sheet: Sheet, program: Program, module: Module, labels: LabelDictionary, body: CellStyle) {
        val rows = listOf(
            labels["doc.title.cover"] to "${program.name}",
            labels["doc.meta.programName"] to program.name,
            labels["doc.meta.moduleName"] to module.name,
            labels["doc.meta.version"] to program.version,
            labels["doc.meta.generatedAt"] to program.generatedAt.format(DateTimeFormatter.ISO_OFFSET_DATE_TIME),
        )
        rows.forEachIndexed { idx, (label, value) ->
            val row = sheet.createRow(idx)
            row.createCell(0).apply { setCellValue(label); cellStyle = body }
            row.createCell(1).apply { setCellValue(value); cellStyle = body }
        }
        sheet.setColumnWidth(0, 6000)
        sheet.setColumnWidth(1, 12000)
    }

    private fun renderClassList(sheet: Sheet, module: Module, labels: LabelDictionary, header: CellStyle, body: CellStyle) {
        val headers = listOf(
            labels["col.classId"], labels["col.className"], labels["col.layer"],
            labels["col.package"], labels["col.description"],
        )
        writeRow(sheet, 0, headers, header)
        module.classes.forEachIndexed { i, c ->
            writeRow(sheet, i + 1, listOf(c.id, c.name,
                labels["layer.${c.layer.name.lowercase()}"], c.packagePath, c.description), body)
        }
        sheet.setAutoFilter(CellRangeAddress(0, module.classes.size, 0, headers.size - 1))
        sheet.createFreezePane(0, 1)
        repeat(headers.size) { sheet.setColumnWidth(it, 6000) }
    }

    private fun renderClassDesign(sheet: Sheet, module: Module, labels: LabelDictionary, header: CellStyle, body: CellStyle) {
        var row = 0
        module.classes.forEach { c ->
            writeRow(sheet, row++, listOf(labels["col.classId"], labels["col.className"], labels["col.description"]), header)
            writeRow(sheet, row++, listOf(c.id, c.name, c.description), body)
            writeRow(sheet, row++, listOf(
                labels["col.attributeName"], labels["col.type"],
                labels["col.accessModifier"], labels["col.description"],
            ), header)
            c.attributes.forEach { a ->
                writeRow(sheet, row++, listOf(
                    a.name, a.type, labels["access.${a.accessModifier.name.lowercase()}"], a.description,
                ), body)
            }
            writeRow(sheet, row++, listOf(labels["col.operationName"], labels["col.description"]), header)
            c.operations.forEach { o ->
                writeRow(sheet, row++, listOf(o.name, o.description), body)
            }
            row++ // spacer
        }
        sheet.createFreezePane(0, 1)
        repeat(4) { sheet.setColumnWidth(it, 6000) }
    }

    private fun writeRow(sheet: Sheet, rowIdx: Int, values: List<String>, style: CellStyle) {
        val row = sheet.createRow(rowIdx)
        values.forEachIndexed { i, v ->
            row.createCell(i).apply {
                setCellValue(v)
                cellStyle = style
            }
        }
    }

    private fun headerStyle(wb: Workbook): CellStyle = wb.createCellStyle().apply {
        fillForegroundColor = IndexedColors.GREY_25_PERCENT.index
        fillPattern = FillPatternType.SOLID_FOREGROUND
        applyBorders(this)
        val font = wb.createFont().apply { bold = true }
        setFont(font)
    }

    private fun bodyStyle(wb: Workbook): CellStyle = wb.createCellStyle().apply { applyBorders(this) }

    private fun applyBorders(style: CellStyle) {
        style.borderTop = BorderStyle.THIN
        style.borderBottom = BorderStyle.THIN
        style.borderLeft = BorderStyle.THIN
        style.borderRight = BorderStyle.THIN
    }
}
```

- [ ] **Step 4: 통과 확인 + 커밋**

```bash
./gradlew test --tests "*XlsxGeneratorTest*"
git add . && git commit -m "feat(class-diagram-generator): XlsxGenerator (3 시트 구조)"
```

---

## Task 13: DocxGenerator

**Files:**
- Create: `src/main/kotlin/com/toolhub/classdiagramgenerator/render/DocxGenerator.kt`
- Test: `src/test/kotlin/com/toolhub/classdiagramgenerator/render/DocxGeneratorTest.kt`

- [ ] **Step 1: 테스트 작성**

```kotlin
package com.toolhub.classdiagramgenerator.render

import com.toolhub.classdiagramgenerator.domain.*
import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.collections.shouldHaveAtLeastSize
import io.kotest.matchers.string.shouldContain
import org.apache.poi.xwpf.usermodel.XWPFDocument
import java.io.ByteArrayInputStream
import java.io.ByteArrayOutputStream
import java.time.ZonedDateTime

class DocxGeneratorTest : StringSpec({
    val gen = DocxGenerator()
    val program = Program(
        name = "demo", version = "v1.0",
        language = OutputLanguage.KO,
        generatedAt = ZonedDateTime.parse("2026-05-19T10:00:00+09:00"),
        modules = listOf(
            Module(
                name = "core",
                classes = listOf(
                    ClassInfo(
                        id = "CLS-0001", name = "UserService", layer = Layer.SERVICE,
                        description = "사용자 서비스.", packagePath = "com.demo.service",
                        attributes = listOf(AttributeInfo("repo", "UserRepository", AccessModifier.PRIVATE, "리포지토리")),
                        operations = listOf(OperationInfo("save", "저장한다.")),
                    ),
                ),
            ),
        ),
    )

    "docx contains korean labels in cover and tables" {
        val out = ByteArrayOutputStream()
        gen.render(program, program.modules[0], out)
        XWPFDocument(ByteArrayInputStream(out.toByteArray())).use { doc ->
            val text = doc.paragraphs.joinToString("\n") { it.text } +
                doc.tables.joinToString("\n") { tbl ->
                    tbl.rows.joinToString("\n") { row -> row.tableCells.joinToString("|") { it.text } }
                }
            text shouldContain "클래스 설계서(demo)"
            text shouldContain "클래스 ID"
            text shouldContain "CLS-0001"
            doc.tables shouldHaveAtLeastSize 3
        }
    }
})
```

- [ ] **Step 2: 실패 확인**

```bash
./gradlew test --tests "*DocxGeneratorTest*"
```

Expected: FAIL.

- [ ] **Step 3: 구현**

```kotlin
package com.toolhub.classdiagramgenerator.render

import com.toolhub.classdiagramgenerator.domain.LabelDictionary
import com.toolhub.classdiagramgenerator.domain.Module
import com.toolhub.classdiagramgenerator.domain.OutputLabels
import com.toolhub.classdiagramgenerator.domain.Program
import org.apache.poi.xwpf.usermodel.ParagraphAlignment
import org.apache.poi.xwpf.usermodel.XWPFDocument
import org.apache.poi.xwpf.usermodel.XWPFTable
import org.springframework.stereotype.Component
import java.io.OutputStream
import java.time.format.DateTimeFormatter

@Component
class DocxGenerator : DocumentGenerator {
    override val format = "docx"

    private val font = "맑은 고딕"
    private val headerShade = "D9D9D9"

    override fun render(program: Program, module: Module, out: OutputStream) {
        val labels = OutputLabels.of(program.language)
        XWPFDocument().use { doc ->
            renderCover(doc, program, module, labels)
            renderClassList(doc, module, labels)
            renderClassDesign(doc, module, labels)
            doc.write(out)
        }
    }

    private fun renderCover(doc: XWPFDocument, program: Program, module: Module, labels: LabelDictionary) {
        val title = doc.createParagraph().apply { alignment = ParagraphAlignment.CENTER }
        title.createRun().apply {
            fontFamily = font
            isBold = true
            fontSize = 24
            setText("${labels["doc.title.cover"]}(${program.name})")
        }
        doc.createParagraph()
        val meta = listOf(
            labels["doc.meta.programName"] to program.name,
            labels["doc.meta.moduleName"] to module.name,
            labels["doc.meta.version"] to program.version,
            labels["doc.meta.generatedAt"] to program.generatedAt.format(DateTimeFormatter.ISO_OFFSET_DATE_TIME),
        )
        val table = doc.createTable(meta.size, 2)
        applyBordersAndFont(table)
        meta.forEachIndexed { i, (k, v) ->
            table.getRow(i).getCell(0).text = k
            table.getRow(i).getCell(1).text = v
        }
        doc.createParagraph().createRun().addBreak()
    }

    private fun renderClassList(doc: XWPFDocument, module: Module, labels: LabelDictionary) {
        heading(doc, labels["doc.title.classList"])
        val headers = listOf(
            labels["col.classId"], labels["col.className"], labels["col.layer"], labels["col.description"],
        )
        val table = doc.createTable(module.classes.size + 1, headers.size)
        applyBordersAndFont(table)
        headers.forEachIndexed { i, h ->
            table.getRow(0).getCell(i).text = h
            table.getRow(0).getCell(i).color = headerShade
        }
        module.classes.forEachIndexed { i, c ->
            val row = table.getRow(i + 1)
            row.getCell(0).text = c.id
            row.getCell(1).text = c.name
            row.getCell(2).text = labels["layer.${c.layer.name.lowercase()}"]
            row.getCell(3).text = c.description
        }
        doc.createParagraph().createRun().addBreak()
    }

    private fun renderClassDesign(doc: XWPFDocument, module: Module, labels: LabelDictionary) {
        heading(doc, labels["doc.title.classDesign"])
        module.classes.forEach { c ->
            val header = doc.createTable(2, 3)
            applyBordersAndFont(header)
            listOf(labels["col.classId"], labels["col.className"], labels["col.description"]).forEachIndexed { i, h ->
                header.getRow(0).getCell(i).text = h
                header.getRow(0).getCell(i).color = headerShade
            }
            header.getRow(1).let {
                it.getCell(0).text = c.id
                it.getCell(1).text = c.name
                it.getCell(2).text = c.description
            }
            val attrTable = doc.createTable(c.attributes.size + 1, 4)
            applyBordersAndFont(attrTable)
            listOf(labels["col.attributeName"], labels["col.type"], labels["col.accessModifier"], labels["col.description"])
                .forEachIndexed { i, h ->
                    attrTable.getRow(0).getCell(i).text = h
                    attrTable.getRow(0).getCell(i).color = headerShade
                }
            c.attributes.forEachIndexed { i, a ->
                val row = attrTable.getRow(i + 1)
                row.getCell(0).text = a.name
                row.getCell(1).text = a.type
                row.getCell(2).text = labels["access.${a.accessModifier.name.lowercase()}"]
                row.getCell(3).text = a.description
            }
            val opTable = doc.createTable(c.operations.size + 1, 2)
            applyBordersAndFont(opTable)
            listOf(labels["col.operationName"], labels["col.description"]).forEachIndexed { i, h ->
                opTable.getRow(0).getCell(i).text = h
                opTable.getRow(0).getCell(i).color = headerShade
            }
            c.operations.forEachIndexed { i, o ->
                opTable.getRow(i + 1).getCell(0).text = o.name
                opTable.getRow(i + 1).getCell(1).text = o.description
            }
            doc.createParagraph().createRun().addBreak()
        }
    }

    private fun heading(doc: XWPFDocument, text: String) {
        val p = doc.createParagraph()
        p.createRun().apply { fontFamily = font; isBold = true; fontSize = 16; setText(text) }
    }

    private fun applyBordersAndFont(table: XWPFTable) {
        table.rows.forEach { row ->
            row.tableCells.forEach { cell ->
                cell.paragraphs.forEach { p ->
                    p.runs.forEach { r -> r.fontFamily = font; r.fontSize = 10 }
                }
            }
        }
    }
}
```

- [ ] **Step 4: 통과 확인 + 커밋**

```bash
./gradlew test --tests "*DocxGeneratorTest*"
git add . && git commit -m "feat(class-diagram-generator): DocxGenerator (Apache POI XWPF)"
```

---

## Task 14: Stage enum + ProgressBus + JobStore

**Files:**
- Create: `src/main/kotlin/com/toolhub/classdiagramgenerator/job/Stage.kt`
- Create: `src/main/kotlin/com/toolhub/classdiagramgenerator/job/ProgressBus.kt`
- Create: `src/main/kotlin/com/toolhub/classdiagramgenerator/job/JobStore.kt`
- Test: `src/test/kotlin/com/toolhub/classdiagramgenerator/job/JobStoreTest.kt`

- [ ] **Step 1: Stage 정의**

```kotlin
package com.toolhub.classdiagramgenerator.job

enum class Stage {
    EXTRACTING, DETECTING_MODULES, PARSING, CLASSIFYING, ASSIGNING_IDS,
    RENDERING_DOCX, RENDERING_XLSX, RENDERING_MD, PACKAGING,
}
```

- [ ] **Step 2: ProgressBus 작성**

```kotlin
package com.toolhub.classdiagramgenerator.job

import com.fasterxml.jackson.databind.ObjectMapper
import org.springframework.stereotype.Component
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter
import java.io.IOException
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap

@Component
class ProgressBus(private val objectMapper: ObjectMapper) {
    private val emitters = ConcurrentHashMap<UUID, MutableList<SseEmitter>>()

    @org.springframework.scheduling.annotation.Scheduled(fixedRate = 30_000)
    fun keepAliveAll() {
        emitters.keys.forEach { sendKeepAlive(it) }
    }

    fun subscribe(jobId: UUID): SseEmitter {
        val emitter = SseEmitter(0L) // no timeout, controlled by keep-alive
        emitters.computeIfAbsent(jobId) { mutableListOf() }.add(emitter)
        emitter.onCompletion { remove(jobId, emitter) }
        emitter.onTimeout { remove(jobId, emitter) }
        emitter.onError { remove(jobId, emitter) }
        return emitter
    }

    fun publish(jobId: UUID, eventName: String, payload: Any) {
        val data = objectMapper.writeValueAsString(payload)
        emitters[jobId]?.toList()?.forEach { em ->
            try {
                em.send(SseEmitter.event().name(eventName).data(data))
            } catch (e: IOException) {
                remove(jobId, em)
            }
        }
    }

    fun complete(jobId: UUID) {
        emitters.remove(jobId)?.forEach { it.complete() }
    }

    fun sendKeepAlive(jobId: UUID) {
        emitters[jobId]?.toList()?.forEach {
            try {
                it.send(SseEmitter.event().comment("keep-alive"))
            } catch (e: IOException) {
                remove(jobId, it)
            }
        }
    }

    private fun remove(jobId: UUID, emitter: SseEmitter) {
        emitters[jobId]?.remove(emitter)
    }
}
```

- [ ] **Step 3: JobStore 작성**

```kotlin
package com.toolhub.classdiagramgenerator.job

import com.toolhub.classdiagramgenerator.domain.OutputLanguage
import com.toolhub.classdiagramgenerator.domain.Warning
import org.springframework.stereotype.Component
import java.nio.file.Path
import java.time.Instant
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap

enum class JobStatus { PENDING, RUNNING, DONE, FAILED }

data class ArtifactRecord(
    val module: String,
    val format: String,
    val filename: String,
    val path: Path,
    val sizeBytes: Long,
)

data class JobRecord(
    val id: UUID,
    val programName: String,
    val version: String,
    val language: OutputLanguage,
    val formats: List<String>,
    var status: JobStatus,
    val workDir: Path,
    var expiresAt: Instant? = null,
    val artifacts: MutableList<ArtifactRecord> = mutableListOf(),
    val warnings: MutableList<Warning> = mutableListOf(),
    var errorCode: String? = null,
    var errorMessage: String? = null,
)

@Component
class JobStore {
    private val map = ConcurrentHashMap<UUID, JobRecord>()

    fun create(record: JobRecord): JobRecord {
        map[record.id] = record
        return record
    }

    fun get(id: UUID): JobRecord? = map[id]

    fun all(): List<JobRecord> = map.values.toList()

    fun remove(id: UUID) { map.remove(id) }
}
```

- [ ] **Step 4: 테스트 작성**

```kotlin
package com.toolhub.classdiagramgenerator.job

import com.toolhub.classdiagramgenerator.domain.OutputLanguage
import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.shouldBe
import java.nio.file.Files
import java.util.UUID

class JobStoreTest : StringSpec({
    val store = JobStore()
    "create and get" {
        val id = UUID.randomUUID()
        val rec = JobRecord(
            id = id, programName = "demo", version = "v1",
            language = OutputLanguage.KO,
            formats = listOf("docx", "xlsx", "md"),
            status = JobStatus.PENDING,
            workDir = Files.createTempDirectory("job-"),
        )
        store.create(rec)
        store.get(id)?.programName shouldBe "demo"
    }
})
```

- [ ] **Step 5: 통과 확인 + 커밋**

```bash
./gradlew test --tests "*JobStoreTest*"
git add . && git commit -m "feat(class-diagram-generator): Stage/ProgressBus/JobStore 정의"
```

---

## Task 15: OutputStorage + ScheduledCleaner

**Files:**
- Create: `src/main/kotlin/com/toolhub/classdiagramgenerator/storage/OutputStorage.kt`
- Create: `src/main/kotlin/com/toolhub/classdiagramgenerator/storage/ScheduledCleaner.kt`
- Modify: `src/main/kotlin/com/toolhub/classdiagramgenerator/ClassDiagramGeneratorApplication.kt` (`@EnableScheduling`)
- Test: `src/test/kotlin/com/toolhub/classdiagramgenerator/storage/OutputStorageTest.kt`

- [ ] **Step 1: 테스트 작성**

```kotlin
package com.toolhub.classdiagramgenerator.storage

import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.shouldBe
import java.nio.file.Files
import java.util.UUID
import kotlin.io.path.createDirectories
import kotlin.io.path.exists
import kotlin.io.path.writeText

class OutputStorageTest : StringSpec({
    val workdir = Files.createTempDirectory("ws-")
    val storage = OutputStorage(workdir)

    "create returns deterministic directory structure" {
        val id = UUID.randomUUID()
        val out = storage.outputDir(id)
        out.toString() shouldBe workdir.resolve("jobs/$id/output").toString()
    }

    "cleanup removes job dir" {
        val id = UUID.randomUUID()
        val out = storage.outputDir(id).createDirectories()
        out.resolve("dummy.txt").writeText("x")
        storage.cleanup(id)
        workdir.resolve("jobs/$id").exists() shouldBe false
    }
})
```

- [ ] **Step 2: 실패 확인**

```bash
./gradlew test --tests "*OutputStorageTest*"
```

Expected: FAIL.

- [ ] **Step 3: OutputStorage 구현**

```kotlin
package com.toolhub.classdiagramgenerator.storage

import com.toolhub.classdiagramgenerator.config.AppProperties
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.stereotype.Component
import java.nio.file.Files
import java.nio.file.Path
import java.util.UUID
import kotlin.io.path.exists
import kotlin.io.path.isDirectory

@Component
class OutputStorage(private val workdir: Path) {
    @Autowired constructor(props: AppProperties) : this(props.workdir)

    fun jobDir(jobId: UUID): Path = workdir.resolve("jobs/$jobId")
    fun inputDir(jobId: UUID): Path = jobDir(jobId).resolve("input")
    fun outputDir(jobId: UUID): Path = jobDir(jobId).resolve("output")

    fun cleanup(jobId: UUID) {
        val dir = jobDir(jobId)
        if (dir.exists()) deleteRecursively(dir)
    }

    fun deleteIfOlderThan(threshold: java.time.Instant) {
        val jobsRoot = workdir.resolve("jobs")
        if (!jobsRoot.exists()) return
        Files.list(jobsRoot).use { stream ->
            stream.filter { it.isDirectory() }
                .filter { Files.getLastModifiedTime(it).toInstant().isBefore(threshold) }
                .forEach { deleteRecursively(it) }
        }
    }

    private fun deleteRecursively(path: Path) {
        if (!path.exists()) return
        Files.walk(path).use { stream ->
            stream.sorted(Comparator.reverseOrder()).forEach(Files::delete)
        }
    }
}
```

- [ ] **Step 4: ScheduledCleaner 구현**

```kotlin
package com.toolhub.classdiagramgenerator.storage

import com.toolhub.classdiagramgenerator.config.AppProperties
import org.slf4j.LoggerFactory
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Component
import java.time.Instant

@Component
class ScheduledCleaner(
    private val storage: OutputStorage,
    private val props: AppProperties,
) {
    private val log = LoggerFactory.getLogger(javaClass)

    @Scheduled(fixedDelayString = "#{${'$'}{app.job.cleaner-interval-minutes} * 60 * 1000}")
    fun sweep() {
        val threshold = Instant.now().minusSeconds(props.job.ttlMinutes * 60)
        log.info("Cleaning job dirs older than {}", threshold)
        storage.deleteIfOlderThan(threshold)
    }
}
```

- [ ] **Step 5: `@EnableScheduling` 추가**

수정 `ClassDiagramGeneratorApplication.kt`:

```kotlin
package com.toolhub.classdiagramgenerator

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.runApplication
import org.springframework.scheduling.annotation.EnableScheduling

@SpringBootApplication
@EnableScheduling
class ClassDiagramGeneratorApplication

fun main(args: Array<String>) {
    runApplication<ClassDiagramGeneratorApplication>(*args)
}
```

- [ ] **Step 6: 통과 확인 + 커밋**

```bash
./gradlew test --tests "*OutputStorageTest*"
git add . && git commit -m "feat(class-diagram-generator): OutputStorage + ScheduledCleaner (1h TTL)"
```

---

## Task 16: JobOrchestrator (전체 파이프라인 연결)

**Files:**
- Create: `src/main/kotlin/com/toolhub/classdiagramgenerator/job/JobOrchestrator.kt`
- Create: `src/main/kotlin/com/toolhub/classdiagramgenerator/job/JobService.kt`
- Test: `src/test/kotlin/com/toolhub/classdiagramgenerator/job/JobOrchestratorTest.kt`

- [ ] **Step 1: JobService 작성 (Job 생성·시작)**

```kotlin
package com.toolhub.classdiagramgenerator.job

import com.toolhub.classdiagramgenerator.config.AppProperties
import com.toolhub.classdiagramgenerator.domain.OutputLanguage
import com.toolhub.classdiagramgenerator.storage.OutputStorage
import org.springframework.stereotype.Service
import org.springframework.web.multipart.MultipartFile
import java.util.UUID
import java.util.concurrent.Executors
import kotlin.io.path.createDirectories

@Service
class JobService(
    private val store: JobStore,
    private val storage: OutputStorage,
    private val orchestrator: JobOrchestrator,
    private val props: AppProperties,
) {
    private val executor = Executors.newVirtualThreadPerTaskExecutor()

    fun submit(
        programName: String,
        version: String,
        language: OutputLanguage,
        formats: List<String>,
        file: MultipartFile,
    ): JobRecord {
        require(formats.isNotEmpty()) { "formats must not be empty" }
        val id = UUID.randomUUID()
        val workDir = storage.jobDir(id).createDirectories()
        storage.inputDir(id).createDirectories()
        storage.outputDir(id).createDirectories()
        val record = JobRecord(
            id = id, programName = programName, version = version,
            language = language, formats = formats,
            status = JobStatus.PENDING, workDir = workDir,
        )
        store.create(record)
        executor.submit {
            orchestrator.run(record, file.bytes)
        }
        return record
    }
}
```

- [ ] **Step 2: JobOrchestrator 작성**

```kotlin
package com.toolhub.classdiagramgenerator.job

import com.toolhub.classdiagramgenerator.analyzer.ClassIdAssigner
import com.toolhub.classdiagramgenerator.analyzer.JavaSourceAnalyzer
import com.toolhub.classdiagramgenerator.analyzer.LayerClassifier
import com.toolhub.classdiagramgenerator.config.AppProperties
import com.toolhub.classdiagramgenerator.domain.AttributeInfo
import com.toolhub.classdiagramgenerator.domain.ClassInfo
import com.toolhub.classdiagramgenerator.domain.Module
import com.toolhub.classdiagramgenerator.domain.OperationInfo
import com.toolhub.classdiagramgenerator.domain.Program
import com.toolhub.classdiagramgenerator.input.ProjectDetector
import com.toolhub.classdiagramgenerator.input.ZipExtractor
import com.toolhub.classdiagramgenerator.render.DocumentGenerator
import com.toolhub.classdiagramgenerator.storage.OutputStorage
import org.slf4j.LoggerFactory
import org.slf4j.MDC
import org.springframework.stereotype.Component
import java.io.ByteArrayInputStream
import java.time.Instant
import java.time.ZonedDateTime
import java.time.format.DateTimeFormatter
import kotlin.io.path.fileSize
import kotlin.io.path.outputStream

@Component
class JobOrchestrator(
    private val zipExtractor: ZipExtractor,
    private val projectDetector: ProjectDetector,
    private val analyzer: JavaSourceAnalyzer,
    private val classifier: LayerClassifier,
    private val idAssigner: ClassIdAssigner,
    private val generators: List<DocumentGenerator>,
    private val storage: OutputStorage,
    private val store: JobStore,
    private val bus: ProgressBus,
    private val props: AppProperties,
) {
    private val log = LoggerFactory.getLogger(javaClass)
    private val timestamp = DateTimeFormatter.ofPattern("yyyyMMddHHmm")

    fun run(record: JobRecord, zipBytes: ByteArray) {
        MDC.put("jobId", record.id.toString())
        try {
            record.status = JobStatus.RUNNING
            stage(record, Stage.EXTRACTING, 5)
            val inputDir = storage.inputDir(record.id)
            zipExtractor.extract(ByteArrayInputStream(zipBytes), inputDir)

            stage(record, Stage.DETECTING_MODULES, 15)
            val modules = projectDetector.detect(inputDir, fallbackName = record.programName)

            stage(record, Stage.PARSING, 30)
            val parsedModules = modules.map { md ->
                val types = md.sourceFiles.flatMap { analyzer.parseFile(it) }
                require(types.size <= props.analysis.maxClassesPerModule) {
                    "Module ${md.name} exceeds ${props.analysis.maxClassesPerModule} classes"
                }
                md to types
            }

            stage(record, Stage.CLASSIFYING, 55)
            val classifiedModules = parsedModules.map { (md, types) ->
                val base = classifier.commonBasePackage(types.map { it.packagePath })
                val classes = types.map { t ->
                    ClassInfo(
                        id = "",
                        name = t.name,
                        layer = classifier.classify(base, t.packagePath),
                        description = t.description,
                        packagePath = t.packagePath,
                        attributes = t.attributes.map { a ->
                            AttributeInfo(a.name, a.type, a.accessModifier, a.description)
                        },
                        operations = t.operations.map { OperationInfo(it.name, it.description) },
                    )
                }
                Module(name = md.name, classes = classes)
            }

            stage(record, Stage.ASSIGNING_IDS, 65)
            val finalModules = classifiedModules.map { m -> m.copy(classes = idAssigner.assign(m.classes)) }

            val program = Program(
                name = record.programName,
                version = record.version,
                language = record.language,
                generatedAt = ZonedDateTime.now(),
                modules = finalModules,
            )

            val sequence = listOf("docx" to Stage.RENDERING_DOCX, "xlsx" to Stage.RENDERING_XLSX, "md" to Stage.RENDERING_MD)
                .filter { it.first in record.formats }
            val baseProgress = 70
            val per = (95 - baseProgress) / sequence.size.coerceAtLeast(1)
            sequence.forEachIndexed { idx, (format, st) ->
                stage(record, st, baseProgress + per * idx)
                renderFormat(record, program, format)
            }

            stage(record, Stage.PACKAGING, 98)
            record.expiresAt = Instant.now().plusSeconds(props.job.ttlMinutes * 60)
            record.status = JobStatus.DONE
            bus.publish(record.id, "done", mapOf(
                "resultUrl" to "/api/v1/jobs/${record.id}/result",
                "expiresAt" to record.expiresAt.toString(),
            ))
            bus.complete(record.id)
        } catch (e: Exception) {
            log.error("Job failed", e)
            record.status = JobStatus.FAILED
            record.errorCode = (e as? ZipExtractor.ZipSlipException)?.let { "ZIP_SLIP" } ?: "INTERNAL_ERROR"
            record.errorMessage = e.message
            bus.publish(record.id, "error", mapOf("code" to record.errorCode, "message" to record.errorMessage))
            bus.complete(record.id)
        } finally {
            MDC.remove("jobId")
        }
    }

    private fun renderFormat(record: JobRecord, program: Program, format: String) {
        val gen = generators.first { it.format == format }
        val outDir = storage.outputDir(record.id)
        program.modules.forEachIndexed { idx, module ->
            val moduleToken = if (program.modules.size == 1) null else module.name
            val filename = buildFilename(record, moduleToken, format)
            val target = outDir.resolve(filename)
            target.outputStream().use { gen.render(program, module, it) }
            record.artifacts += ArtifactRecord(
                module = module.name, format = format,
                filename = filename, path = target,
                sizeBytes = target.fileSize(),
            )
        }
    }

    private fun buildFilename(record: JobRecord, module: String?, format: String): String {
        val parts = mutableListOf("class-design", record.programName)
        if (module != null) parts += sanitizeModule(module)
        parts += record.version
        parts += ZonedDateTime.now().format(timestamp)
        return parts.joinToString("_") + "." + format
    }

    private fun sanitizeModule(name: String): String {
        val cleaned = name.replace(Regex("[^A-Za-z0-9._-]"), "-")
        return cleaned.ifBlank { "module" }
    }

    private fun stage(record: JobRecord, stage: Stage, percent: Int) {
        bus.publish(record.id, "stage", mapOf("stage" to stage.name, "percent" to percent))
    }
}
```

- [ ] **Step 3: Orchestrator 통합 테스트 작성**

```kotlin
package com.toolhub.classdiagramgenerator.job

import com.toolhub.classdiagramgenerator.domain.OutputLanguage
import io.kotest.core.spec.style.StringSpec
import io.kotest.extensions.spring.SpringExtension
import io.kotest.matchers.collections.shouldHaveSize
import io.kotest.matchers.shouldBe
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.mock.web.MockMultipartFile
import java.io.ByteArrayOutputStream
import java.util.zip.ZipEntry
import java.util.zip.ZipOutputStream

@SpringBootTest
class JobOrchestratorTest(private val service: JobService, private val store: JobStore) : StringSpec({
    extensions(SpringExtension)
    "happy path produces 3 artifacts for single module ko" {
        val bytes = buildJavaZip()
        val file = MockMultipartFile("file", "x.zip", "application/zip", bytes)
        val rec = service.submit("demo", "v1.0", OutputLanguage.KO, listOf("docx", "xlsx", "md"), file)
        // wait for async
        repeat(50) {
            if (store.get(rec.id)?.status == JobStatus.DONE) return@repeat
            Thread.sleep(200)
        }
        val final = store.get(rec.id)!!
        final.status shouldBe JobStatus.DONE
        final.artifacts shouldHaveSize 3
    }
})

private fun buildJavaZip(): ByteArray {
    val out = ByteArrayOutputStream()
    ZipOutputStream(out).use { zos ->
        zos.putNextEntry(ZipEntry("build.gradle"))
        zos.write("// noop".toByteArray())
        zos.closeEntry()
        zos.putNextEntry(ZipEntry("src/main/java/com/demo/service/UserService.java"))
        zos.write(
            """
            package com.demo.service;
            /** 사용자 서비스. */
            public class UserService {
                private String name;
                public void save() {}
            }
            """.trimIndent().toByteArray(),
        )
        zos.closeEntry()
    }
    return out.toByteArray()
}
```

- [ ] **Step 4: 통과 확인 + 커밋**

```bash
./gradlew test --tests "*JobOrchestratorTest*"
git add . && git commit -m "feat(class-diagram-generator): JobService + JobOrchestrator 파이프라인"
```

---

## Task 17: REST API DTOs + JobController (POST /jobs)

**Files:**
- Create: `src/main/kotlin/com/toolhub/classdiagramgenerator/api/dto/JobDtos.kt`
- Create: `src/main/kotlin/com/toolhub/classdiagramgenerator/api/JobController.kt`
- Test: `src/test/kotlin/com/toolhub/classdiagramgenerator/api/JobControllerTest.kt`

- [ ] **Step 1: DTO 정의**

```kotlin
package com.toolhub.classdiagramgenerator.api.dto

import com.toolhub.classdiagramgenerator.domain.Warning
import java.time.Instant
import java.util.UUID

data class JobCreatedResponse(
    val jobId: UUID,
    val status: String,
    val streamUrl: String,
)

data class ArtifactSummary(
    val index: Int,
    val module: String,
    val format: String,
    val filename: String,
    val sizeBytes: Long,
    val downloadUrl: String,
)

data class JobResultResponse(
    val jobId: UUID,
    val expiresAt: Instant?,
    val warnings: List<Warning>,
    val artifacts: List<ArtifactSummary>,
    val bundleUrl: String,
)
```

- [ ] **Step 2: 테스트 작성**

```kotlin
package com.toolhub.classdiagramgenerator.api

import io.kotest.core.spec.style.StringSpec
import io.kotest.extensions.spring.SpringExtension
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.mock.web.MockMultipartFile
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.multipart
import java.io.ByteArrayOutputStream
import java.util.zip.ZipEntry
import java.util.zip.ZipOutputStream

@SpringBootTest
@AutoConfigureMockMvc
class JobControllerTest(private val mockMvc: MockMvc) : StringSpec({
    extensions(SpringExtension)

    "POST /api/v1/jobs returns 202 with jobId" {
        val zipBytes = buildSimpleZip()
        mockMvc.multipart("/api/v1/jobs") {
            file(MockMultipartFile("file", "src.zip", "application/zip", zipBytes))
            param("programName", "demo")
            param("version", "v1.0")
            param("language", "ko")
            param("formats", "docx,xlsx,md")
        }.andExpect {
            status { isAccepted() }
            jsonPath("$.jobId") { exists() }
            jsonPath("$.streamUrl") { exists() }
        }
    }

    "rejects invalid programName" {
        val zipBytes = buildSimpleZip()
        mockMvc.multipart("/api/v1/jobs") {
            file(MockMultipartFile("file", "src.zip", "application/zip", zipBytes))
            param("programName", "한글이름")
            param("version", "v1.0")
            param("language", "ko")
        }.andExpect {
            status { isBadRequest() }
        }
    }
})

private fun buildSimpleZip(): ByteArray {
    val out = ByteArrayOutputStream()
    ZipOutputStream(out).use { zos ->
        zos.putNextEntry(ZipEntry("A.java"))
        zos.write("package x; public class A {}".toByteArray())
        zos.closeEntry()
    }
    return out.toByteArray()
}
```

- [ ] **Step 3: 실패 확인**

```bash
./gradlew test --tests "*JobControllerTest*"
```

Expected: FAIL.

- [ ] **Step 4: JobController 구현**

```kotlin
package com.toolhub.classdiagramgenerator.api

import com.toolhub.classdiagramgenerator.api.dto.JobCreatedResponse
import com.toolhub.classdiagramgenerator.domain.OutputLanguage
import com.toolhub.classdiagramgenerator.job.JobService
import jakarta.validation.constraints.Pattern
import jakarta.validation.constraints.Size
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.validation.annotation.Validated
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.multipart.MultipartFile

@RestController
@RequestMapping("/api/v1/jobs")
@Validated
class JobController(private val jobService: JobService) {

    @PostMapping
    fun create(
        @RequestParam("file") file: MultipartFile,
        @RequestParam("programName")
        @Pattern(regexp = "^[A-Za-z0-9_-]+$") @Size(min = 1, max = 64)
        programName: String,
        @RequestParam("version")
        @Pattern(regexp = "^[A-Za-z0-9._-]+$") @Size(min = 1, max = 32)
        version: String,
        @RequestParam("language") @Pattern(regexp = "^(ko|en)$") language: String,
        @RequestParam(name = "formats", defaultValue = "docx,xlsx,md") formats: String,
    ): ResponseEntity<JobCreatedResponse> {
        val parsedFormats = formats.split(",").map { it.trim().lowercase() }.filter { it.isNotEmpty() }
        require(parsedFormats.all { it in listOf("docx", "xlsx", "md") }) { "Unsupported format" }
        val rec = jobService.submit(
            programName = programName, version = version,
            language = OutputLanguage.parse(language), formats = parsedFormats, file = file,
        )
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(
            JobCreatedResponse(
                jobId = rec.id, status = "ACCEPTED",
                streamUrl = "/api/v1/jobs/${rec.id}/events",
            ),
        )
    }
}
```

- [ ] **Step 5: 통과 확인 + 커밋**

```bash
./gradlew test --tests "*JobControllerTest*"
git add . && git commit -m "feat(class-diagram-generator): POST /api/v1/jobs"
```

---

## Task 18: SSE + 결과 조회 + 다운로드 + 묶음 다운로드

**Files:**
- Modify: `src/main/kotlin/com/toolhub/classdiagramgenerator/api/JobController.kt`
- Test: `src/test/kotlin/com/toolhub/classdiagramgenerator/api/JobControllerDownloadTest.kt`

- [ ] **Step 1: JobController에 GET 핸들러 추가**

`JobController.kt` 의 클래스 본문에 아래 메서드들을 추가:

```kotlin
@org.springframework.web.bind.annotation.GetMapping("/{id}/events", produces = ["text/event-stream"])
fun events(@org.springframework.web.bind.annotation.PathVariable id: java.util.UUID):
    org.springframework.web.servlet.mvc.method.annotation.SseEmitter =
    progressBus.subscribe(id)

@org.springframework.web.bind.annotation.GetMapping("/{id}/result")
fun result(@org.springframework.web.bind.annotation.PathVariable id: java.util.UUID):
    com.toolhub.classdiagramgenerator.api.dto.JobResultResponse {
    val rec = jobStore.get(id) ?: throw NoSuchElementException("Job not found: $id")
    val artifacts = rec.artifacts.mapIndexed { idx, a ->
        com.toolhub.classdiagramgenerator.api.dto.ArtifactSummary(
            index = idx, module = a.module, format = a.format,
            filename = a.filename, sizeBytes = a.sizeBytes,
            downloadUrl = "/api/v1/jobs/$id/artifacts/$idx",
        )
    }
    return com.toolhub.classdiagramgenerator.api.dto.JobResultResponse(
        jobId = id, expiresAt = rec.expiresAt,
        warnings = rec.warnings, artifacts = artifacts,
        bundleUrl = "/api/v1/jobs/$id/bundle",
    )
}

@org.springframework.web.bind.annotation.GetMapping("/{id}/artifacts/{idx}")
fun download(
    @org.springframework.web.bind.annotation.PathVariable id: java.util.UUID,
    @org.springframework.web.bind.annotation.PathVariable idx: Int,
): org.springframework.http.ResponseEntity<org.springframework.core.io.FileSystemResource> {
    val rec = jobStore.get(id) ?: throw NoSuchElementException("Job not found: $id")
    val art = rec.artifacts.getOrNull(idx) ?: throw NoSuchElementException("Artifact $idx not found")
    return org.springframework.http.ResponseEntity.ok()
        .header(org.springframework.http.HttpHeaders.CONTENT_DISPOSITION,
            """attachment; filename="${art.filename}"""")
        .body(org.springframework.core.io.FileSystemResource(art.path))
}

@org.springframework.web.bind.annotation.GetMapping("/{id}/bundle")
fun bundle(@org.springframework.web.bind.annotation.PathVariable id: java.util.UUID):
    org.springframework.http.ResponseEntity<org.springframework.core.io.InputStreamResource> {
    val rec = jobStore.get(id) ?: throw NoSuchElementException("Job not found: $id")
    val baos = java.io.ByteArrayOutputStream()
    java.util.zip.ZipOutputStream(baos).use { zos ->
        rec.artifacts.forEach { art ->
            zos.putNextEntry(java.util.zip.ZipEntry(art.filename))
            java.nio.file.Files.copy(art.path, zos)
            zos.closeEntry()
        }
    }
    val bytes = baos.toByteArray()
    return org.springframework.http.ResponseEntity.ok()
        .header(org.springframework.http.HttpHeaders.CONTENT_DISPOSITION,
            """attachment; filename="bundle-$id.zip"""")
        .contentType(org.springframework.http.MediaType.parseMediaType("application/zip"))
        .body(org.springframework.core.io.InputStreamResource(java.io.ByteArrayInputStream(bytes)))
}
```

그리고 클래스 시그니처를 다음과 같이 변경:

```kotlin
@RestController
@RequestMapping("/api/v1/jobs")
@Validated
class JobController(
    private val jobService: JobService,
    private val jobStore: com.toolhub.classdiagramgenerator.job.JobStore,
    private val progressBus: com.toolhub.classdiagramgenerator.job.ProgressBus,
) { ... }
```

- [ ] **Step 2: 결과·다운로드 테스트**

```kotlin
package com.toolhub.classdiagramgenerator.api

import com.toolhub.classdiagramgenerator.job.JobService
import com.toolhub.classdiagramgenerator.job.JobStore
import com.toolhub.classdiagramgenerator.job.JobStatus
import com.toolhub.classdiagramgenerator.domain.OutputLanguage
import io.kotest.core.spec.style.StringSpec
import io.kotest.extensions.spring.SpringExtension
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.mock.web.MockMultipartFile
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.get
import java.io.ByteArrayOutputStream
import java.util.zip.ZipEntry
import java.util.zip.ZipOutputStream

@SpringBootTest
@AutoConfigureMockMvc
class JobControllerDownloadTest(
    private val mockMvc: MockMvc,
    private val service: JobService,
    private val store: JobStore,
) : StringSpec({
    extensions(SpringExtension)
    "result endpoint returns artifact list after job done" {
        val zipBytes = ByteArrayOutputStream().also { baos ->
            ZipOutputStream(baos).use {
                it.putNextEntry(ZipEntry("A.java"))
                it.write("package x; public class A {}".toByteArray())
                it.closeEntry()
            }
        }.toByteArray()
        val rec = service.submit(
            "demo", "v1.0", OutputLanguage.KO, listOf("md"),
            MockMultipartFile("file", "s.zip", "application/zip", zipBytes),
        )
        repeat(50) { if (store.get(rec.id)?.status == JobStatus.DONE) return@repeat; Thread.sleep(200) }
        mockMvc.get("/api/v1/jobs/${rec.id}/result")
            .andExpect { status { isOk() } }
        mockMvc.get("/api/v1/jobs/${rec.id}/artifacts/0")
            .andExpect { status { isOk() } }
        mockMvc.get("/api/v1/jobs/${rec.id}/bundle")
            .andExpect { status { isOk() } }
    }
})
```

- [ ] **Step 3: 통과 확인 + 커밋**

```bash
./gradlew test --tests "*JobControllerDownloadTest*"
git add . && git commit -m "feat(class-diagram-generator): SSE/result/artifact/bundle 엔드포인트"
```

---

## Task 19: ProblemDetail 에러 핸들러 (RFC 7807)

**Files:**
- Create: `src/main/kotlin/com/toolhub/classdiagramgenerator/api/ProblemDetailHandler.kt`
- Test: `src/test/kotlin/com/toolhub/classdiagramgenerator/api/ProblemDetailHandlerTest.kt`

- [ ] **Step 1: 테스트 작성**

```kotlin
package com.toolhub.classdiagramgenerator.api

import io.kotest.core.spec.style.StringSpec
import io.kotest.extensions.spring.SpringExtension
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.get

@SpringBootTest
@AutoConfigureMockMvc
class ProblemDetailHandlerTest(private val mockMvc: MockMvc) : StringSpec({
    extensions(SpringExtension)
    "missing job returns 404 problem+json" {
        mockMvc.get("/api/v1/jobs/00000000-0000-0000-0000-000000000000/result")
            .andExpect {
                status { isNotFound() }
                content { contentTypeCompatibleWith("application/problem+json") }
            }
    }
})
```

- [ ] **Step 2: 구현**

```kotlin
package com.toolhub.classdiagramgenerator.api

import org.springframework.http.HttpStatus
import org.springframework.http.MediaType
import org.springframework.http.ProblemDetail
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.MethodArgumentNotValidException
import org.springframework.web.bind.annotation.ExceptionHandler
import org.springframework.web.bind.annotation.RestControllerAdvice
import org.springframework.web.multipart.MaxUploadSizeExceededException
import com.toolhub.classdiagramgenerator.input.ZipExtractor

@RestControllerAdvice
class ProblemDetailHandler {

    @ExceptionHandler(NoSuchElementException::class)
    fun handleNotFound(e: NoSuchElementException): ResponseEntity<ProblemDetail> =
        problem(HttpStatus.NOT_FOUND, "NOT_FOUND", e.message ?: "Resource not found")

    @ExceptionHandler(IllegalArgumentException::class)
    fun handleBadRequest(e: IllegalArgumentException): ResponseEntity<ProblemDetail> =
        problem(HttpStatus.BAD_REQUEST, "INVALID_REQUEST", e.message ?: "Bad request")

    @ExceptionHandler(MethodArgumentNotValidException::class)
    fun handleValidation(e: MethodArgumentNotValidException): ResponseEntity<ProblemDetail> =
        problem(HttpStatus.BAD_REQUEST, "VALIDATION_FAILED", e.bindingResult.toString())

    @ExceptionHandler(ZipExtractor.ZipSlipException::class)
    fun handleZipSlip(e: ZipExtractor.ZipSlipException): ResponseEntity<ProblemDetail> =
        problem(HttpStatus.BAD_REQUEST, "ZIP_SLIP", e.message ?: "Zip slip detected")

    @ExceptionHandler(MaxUploadSizeExceededException::class)
    fun handleTooLarge(e: MaxUploadSizeExceededException): ResponseEntity<ProblemDetail> =
        problem(HttpStatus.PAYLOAD_TOO_LARGE, "FILE_TOO_LARGE", "Upload exceeds limit")

    private fun problem(status: HttpStatus, code: String, detail: String): ResponseEntity<ProblemDetail> {
        val pd = ProblemDetail.forStatusAndDetail(status, detail)
        pd.title = status.reasonPhrase
        pd.setProperty("code", code)
        return ResponseEntity.status(status)
            .contentType(MediaType.APPLICATION_PROBLEM_JSON)
            .body(pd)
    }
}
```

- [ ] **Step 3: 통과 확인 + 커밋**

```bash
./gradlew test --tests "*ProblemDetailHandlerTest*"
git add . && git commit -m "feat(class-diagram-generator): RFC 7807 ProblemDetail 핸들러"
```

---

## Task 20: i18n 설정 (MessageSource + LocaleResolver)

**Files:**
- Create: `src/main/kotlin/com/toolhub/classdiagramgenerator/config/WebMvcConfig.kt`
- Create: `src/main/resources/messages.properties`
- Create: `src/main/resources/messages_en.properties`
- Test: `src/test/kotlin/com/toolhub/classdiagramgenerator/config/WebMvcConfigTest.kt`

- [ ] **Step 1: WebMvcConfig 작성**

```kotlin
package com.toolhub.classdiagramgenerator.config

import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.web.servlet.LocaleResolver
import org.springframework.web.servlet.config.annotation.InterceptorRegistry
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer
import org.springframework.web.servlet.i18n.CookieLocaleResolver
import org.springframework.web.servlet.i18n.LocaleChangeInterceptor
import java.time.Duration
import java.util.Locale

@Configuration
class WebMvcConfig : WebMvcConfigurer {

    @Bean
    fun localeResolver(): LocaleResolver = CookieLocaleResolver("LOCALE").apply {
        setDefaultLocale(Locale.KOREAN)
        setCookieMaxAge(Duration.ofDays(30))
    }

    @Bean
    fun localeChangeInterceptor() = LocaleChangeInterceptor().apply {
        paramName = "lang"
    }

    override fun addInterceptors(registry: InterceptorRegistry) {
        registry.addInterceptor(localeChangeInterceptor())
    }

    override fun addResourceHandlers(registry: ResourceHandlerRegistry) {
        registry.addResourceHandler("/webjars/**").addResourceLocations("classpath:/META-INF/resources/webjars/")
    }
}
```

- [ ] **Step 2: `messages.properties` (한국어 기본)**

```properties
page.upload.title=클래스 설계서 자동 생성
page.upload.programName=프로그램명
page.upload.version=버전
page.upload.language=산출물 언어
page.upload.formats=출력 형식
page.upload.file=Java 소스 ZIP
page.upload.submit=업로드
page.progress.title=진행 상태
page.progress.stage=현재 단계
page.result.title=완료
page.result.download=다운로드
page.result.bundle=묶음 다운로드
page.result.expiresAt=만료
page.error.title=오류
```

- [ ] **Step 3: `messages_en.properties`**

```properties
page.upload.title=Class Diagram Generator
page.upload.programName=Program
page.upload.version=Version
page.upload.language=Output Language
page.upload.formats=Formats
page.upload.file=Java Source ZIP
page.upload.submit=Upload
page.progress.title=Progress
page.progress.stage=Current Stage
page.result.title=Done
page.result.download=Download
page.result.bundle=Bundle Download
page.result.expiresAt=Expires At
page.error.title=Error
```

- [ ] **Step 4: 테스트 작성**

```kotlin
package com.toolhub.classdiagramgenerator.config

import io.kotest.core.spec.style.StringSpec
import io.kotest.extensions.spring.SpringExtension
import io.kotest.matchers.collections.shouldContainExactly
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.context.MessageSource
import java.util.Locale

@SpringBootTest
class WebMvcConfigTest(private val messageSource: MessageSource) : StringSpec({
    extensions(SpringExtension)
    "ko message lookup" {
        messageSource.getMessage("page.upload.title", null, Locale.KOREAN)
    }
    "en message lookup" {
        messageSource.getMessage("page.upload.title", null, Locale.ENGLISH)
    }
    "ko and en have same key set" {
        val ko = java.util.Properties().also {
            it.load(javaClass.getResourceAsStream("/messages.properties"))
        }
        val en = java.util.Properties().also {
            it.load(javaClass.getResourceAsStream("/messages_en.properties"))
        }
        ko.stringPropertyNames().sorted() shouldContainExactly en.stringPropertyNames().sorted()
    }
})
```

- [ ] **Step 5: 통과 확인 + 커밋**

```bash
./gradlew test --tests "*WebMvcConfigTest*"
git add . && git commit -m "feat(class-diagram-generator): i18n 설정 + 메시지 번들(ko/en)"
```

---

## Task 21: ViewController + 공통 레이아웃 + 로케일 토글

**Files:**
- Create: `src/main/kotlin/com/toolhub/classdiagramgenerator/web/ViewController.kt`
- Create: `src/main/resources/templates/layout.html`
- Create: `src/main/resources/static/css/app.css`
- Test: `src/test/kotlin/com/toolhub/classdiagramgenerator/web/ViewControllerTest.kt`

- [ ] **Step 1: ViewController 작성**

```kotlin
package com.toolhub.classdiagramgenerator.web

import org.springframework.stereotype.Controller
import org.springframework.ui.Model
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import java.util.UUID

@Controller
class ViewController {

    @GetMapping("/")
    fun upload(model: Model): String {
        model.addAttribute("page", "upload")
        return "upload"
    }

    @GetMapping("/jobs/{id}")
    fun progress(@PathVariable id: UUID, model: Model): String {
        model.addAttribute("jobId", id)
        model.addAttribute("page", "progress")
        return "progress"
    }

    @GetMapping("/jobs/{id}/result")
    fun result(@PathVariable id: UUID, model: Model): String {
        model.addAttribute("jobId", id)
        model.addAttribute("page", "result")
        return "result"
    }
}
```

- [ ] **Step 2: `layout.html` (공통 헤더/푸터)**

```html
<!DOCTYPE html>
<html xmlns:th="http://www.thymeleaf.org" lang="ko">
<head>
    <meta charset="UTF-8">
    <title th:text="${title}">Class Diagram Generator</title>
    <link rel="stylesheet" href="/webjars/bootstrap/css/bootstrap.min.css">
    <link rel="stylesheet" href="/webjars/bootstrap-icons/font/bootstrap-icons.css">
    <link rel="stylesheet" href="/css/app.css">
</head>
<body>
<nav class="navbar navbar-light bg-light border-bottom">
    <div class="container">
        <a class="navbar-brand" href="/">class-diagram-generator</a>
        <div>
            <a class="btn btn-sm btn-outline-secondary" th:href="@{${#httpServletRequest.requestURI}(lang='ko')}">KO</a>
            <a class="btn btn-sm btn-outline-secondary" th:href="@{${#httpServletRequest.requestURI}(lang='en')}">EN</a>
        </div>
    </div>
</nav>
<main class="container py-4" th:insert="~{${page} :: content}"></main>
<script src="/webjars/bootstrap/js/bootstrap.bundle.min.js"></script>
<script th:if="${page == 'upload'}" src="/js/upload.js"></script>
<script th:if="${page == 'progress'}" src="/js/progress.js"></script>
<script th:if="${page == 'result'}" src="/js/result.js"></script>
</body>
</html>
```

- [ ] **Step 3: `app.css` 최소 작성**

```css
body { background: #f8f9fa; }
.card-meta th { width: 30%; }
```

- [ ] **Step 4: 테스트**

```kotlin
package com.toolhub.classdiagramgenerator.web

import io.kotest.core.spec.style.StringSpec
import io.kotest.extensions.spring.SpringExtension
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.get

@SpringBootTest
@AutoConfigureMockMvc
class ViewControllerTest(private val mockMvc: MockMvc) : StringSpec({
    extensions(SpringExtension)
    "GET / returns 200" {
        mockMvc.get("/").andExpect { status { isOk() } }
    }
    "GET /jobs/{id} returns 200" {
        mockMvc.get("/jobs/00000000-0000-0000-0000-000000000001").andExpect { status { isOk() } }
    }
})
```

- [ ] **Step 5: 통과 확인 + 커밋**

```bash
./gradlew test --tests "*ViewControllerTest*"
git add . && git commit -m "feat(class-diagram-generator): ViewController + 공통 레이아웃 + 로케일 토글"
```

---

## Task 22: 업로드 페이지 (upload.html + upload.js)

**Files:**
- Create: `src/main/resources/templates/upload.html`
- Create: `src/main/resources/static/js/upload.js`

- [ ] **Step 1: `upload.html` 작성**

```html
<!DOCTYPE html>
<html xmlns:th="http://www.thymeleaf.org">
<body>
<th:block th:fragment="content">
    <h1 th:text="#{page.upload.title}"></h1>
    <form id="uploadForm" class="row g-3 mt-3" enctype="multipart/form-data">
        <div class="col-md-6">
            <label class="form-label" th:text="#{page.upload.programName}"></label>
            <input class="form-control" name="programName" required pattern="^[A-Za-z0-9_-]+$" maxlength="64">
        </div>
        <div class="col-md-3">
            <label class="form-label" th:text="#{page.upload.version}"></label>
            <input class="form-control" name="version" required pattern="^[A-Za-z0-9._-]+$" maxlength="32" value="v1.0">
        </div>
        <div class="col-md-3">
            <label class="form-label" th:text="#{page.upload.language}"></label>
            <select class="form-select" name="language">
                <option value="ko" th:selected="${#locale.language == 'ko'}">한국어</option>
                <option value="en" th:selected="${#locale.language == 'en'}">English</option>
            </select>
        </div>
        <div class="col-12">
            <label class="form-label" th:text="#{page.upload.formats}"></label>
            <div>
                <label class="me-3"><input type="checkbox" name="formats" value="docx" checked> docx</label>
                <label class="me-3"><input type="checkbox" name="formats" value="xlsx" checked> xlsx</label>
                <label class="me-3"><input type="checkbox" name="formats" value="md" checked> md</label>
            </div>
        </div>
        <div class="col-12">
            <label class="form-label" th:text="#{page.upload.file}"></label>
            <input type="file" class="form-control" name="file" accept=".zip" required>
        </div>
        <div class="col-12">
            <button type="submit" class="btn btn-primary" th:text="#{page.upload.submit}"></button>
        </div>
    </form>
</th:block>
</body>
</html>
```

- [ ] **Step 2: `upload.js`**

```javascript
document.getElementById('uploadForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const fd = new FormData();
    fd.append('file', form.file.files[0]);
    fd.append('programName', form.programName.value);
    fd.append('version', form.version.value);
    fd.append('language', form.language.value);
    const formats = Array.from(form.querySelectorAll('input[name=formats]:checked')).map(i => i.value).join(',');
    fd.append('formats', formats);

    const res = await fetch('/api/v1/jobs', { method: 'POST', body: fd });
    if (!res.ok) {
        const err = await res.json();
        alert('Error: ' + (err.detail || res.statusText));
        return;
    }
    const body = await res.json();
    window.location.href = `/jobs/${body.jobId}`;
});
```

- [ ] **Step 3: 수동 검증**

```bash
./gradlew bootRun
```

브라우저에서 `http://localhost:8080` 열기 → 필요 시 헤더 `KO / EN` 토글 또는 산출물 언어 선택 확인 → 폼 → ZIP 업로드 → 진행 페이지 이동 확인.

- [ ] **Step 4: 커밋**

```bash
git add . && git commit -m "feat(class-diagram-generator): 업로드 페이지 + JS"
```

---

## Task 23: 진행 페이지 (progress.html + progress.js)

**Files:**
- Create: `src/main/resources/templates/progress.html`
- Create: `src/main/resources/static/js/progress.js`

- [ ] **Step 1: `progress.html`**

```html
<!DOCTYPE html>
<html xmlns:th="http://www.thymeleaf.org">
<body>
<th:block th:fragment="content">
    <h1 th:text="#{page.progress.title}"></h1>
    <p><strong th:text="#{page.progress.stage}"></strong>: <span id="stage">-</span></p>
    <div class="progress" style="height: 24px;">
        <div id="bar" class="progress-bar progress-bar-striped progress-bar-animated"
             role="progressbar" style="width: 0%">0%</div>
    </div>
    <div id="warnings" class="mt-3"></div>
    <script th:inline="javascript">
        window.__jobId = /*[[${jobId}]]*/ '';
    </script>
</th:block>
</body>
</html>
```

- [ ] **Step 2: `progress.js`**

```javascript
const jobId = window.__jobId;
const stage = document.getElementById('stage');
const bar = document.getElementById('bar');
const warnings = document.getElementById('warnings');

const es = new EventSource(`/api/v1/jobs/${jobId}/events`);

es.addEventListener('stage', (e) => {
    const data = JSON.parse(JSON.parse(e.data));
    stage.textContent = data.stage;
    bar.style.width = data.percent + '%';
    bar.textContent = data.percent + '%';
});

es.addEventListener('progress', (e) => {
    const data = JSON.parse(JSON.parse(e.data));
    bar.style.width = data.percent + '%';
    bar.textContent = data.percent + '%';
});

es.addEventListener('warning', (e) => {
    const data = JSON.parse(JSON.parse(e.data));
    const div = document.createElement('div');
    div.className = 'alert alert-warning';
    div.textContent = `${data.code}: ${data.message}`;
    warnings.appendChild(div);
});

es.addEventListener('done', () => {
    es.close();
    window.location.href = `/jobs/${jobId}/result`;
});

es.addEventListener('error', (e) => {
    if (e.data) {
        const data = JSON.parse(JSON.parse(e.data));
        warnings.innerHTML = `<div class="alert alert-danger">${data.code}: ${data.message}</div>`;
    }
    es.close();
});
```

> **주의**: 서버가 ProgressBus에서 `objectMapper.writeValueAsString(payload)` 한 JSON 문자열을 다시 SseEmitter `.data(...)` 에 넘기므로 클라이언트에 도착할 때 한 번 더 quoting 됨. 위 코드의 `JSON.parse(JSON.parse(...))`는 의도된 것이다. 만약 ProgressBus에서 `payload` 객체를 그대로 `.data(payload)` 로 넘기도록 변경했다면 한 번만 `JSON.parse`.

- [ ] **Step 3: 수동 검증**

업로드 → 진행 페이지에서 단계가 EXTRACTING → ... 순서로 갱신되고 progress bar가 채워지는지 브라우저에서 확인.

- [ ] **Step 4: 커밋**

```bash
git add . && git commit -m "feat(class-diagram-generator): 진행 페이지 + SSE 클라이언트"
```

---

## Task 24: 결과 페이지 (result.html + result.js)

**Files:**
- Create: `src/main/resources/templates/result.html`
- Create: `src/main/resources/static/js/result.js`

- [ ] **Step 1: `result.html`**

```html
<!DOCTYPE html>
<html xmlns:th="http://www.thymeleaf.org">
<body>
<th:block th:fragment="content">
    <h1 th:text="#{page.result.title}"></h1>
    <p><strong th:text="#{page.result.expiresAt}"></strong>: <span id="expiresAt">-</span></p>
    <table class="table table-striped">
        <thead>
            <tr>
                <th>Module</th><th>Format</th><th>Filename</th><th>Size</th><th></th>
            </tr>
        </thead>
        <tbody id="artifacts"></tbody>
    </table>
    <a id="bundleBtn" class="btn btn-success" th:text="#{page.result.bundle}"></a>
    <script th:inline="javascript">
        window.__jobId = /*[[${jobId}]]*/ '';
    </script>
</th:block>
</body>
</html>
```

- [ ] **Step 2: `result.js`**

```javascript
const jobId = window.__jobId;

async function load() {
    const res = await fetch(`/api/v1/jobs/${jobId}/result`);
    if (!res.ok) {
        document.body.insertAdjacentHTML('afterbegin',
            `<div class="alert alert-danger">Failed to load result</div>`);
        return;
    }
    const data = await res.json();
    document.getElementById('expiresAt').textContent = data.expiresAt || '-';
    const tbody = document.getElementById('artifacts');
    data.artifacts.forEach(a => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${a.module}</td>
          <td>${a.format}</td>
          <td>${a.filename}</td>
          <td>${a.sizeBytes}</td>
          <td><a class="btn btn-sm btn-primary" href="${a.downloadUrl}">Download</a></td>
        `;
        tbody.appendChild(tr);
    });
    document.getElementById('bundleBtn').setAttribute('href', data.bundleUrl);
}

load();
```

- [ ] **Step 3: 수동 검증**

업로드 → 진행 완료 후 결과 페이지에서 다운로드 버튼이 동작하고 묶음 다운로드가 zip을 내려주는지 확인.

- [ ] **Step 4: 커밋**

```bash
git add . && git commit -m "feat(class-diagram-generator): 결과 페이지 + 다운로드 UI"
```

---

## Task 25: 통합 E2E 테스트 (REST 전체 흐름)

**Files:**
- Create: `src/test/kotlin/com/toolhub/classdiagramgenerator/EndToEndTest.kt`
- Create: `src/test/resources/fixtures/multi-module.zip` (수동 생성)

- [ ] **Step 1: 픽스처 ZIP 만들기 (멀티모듈)**

`class-diagram-generator/` 에서 실행:

```bash
mkdir -p /tmp/fixture/{app,core}/src/main/java/com/demo/{controller,service}
cat > /tmp/fixture/settings.gradle <<'EOF'
rootProject.name = 'parent'
include 'app'
include 'core'
EOF
echo "// noop" > /tmp/fixture/app/build.gradle
echo "// noop" > /tmp/fixture/core/build.gradle
cat > /tmp/fixture/app/src/main/java/com/demo/controller/AppController.java <<'EOF'
package com.demo.controller;
/** 앱 컨트롤러. */
public class AppController { public void ping() {} }
EOF
cat > /tmp/fixture/core/src/main/java/com/demo/service/CoreService.java <<'EOF'
package com.demo.service;
/** 코어 서비스. */
public class CoreService { private String name; public void exec() {} }
EOF
cd /tmp/fixture && zip -r multi-module.zip . && mv multi-module.zip "/Users/dongjin/dev/study/tool-hub/class-diagram-generator/src/test/resources/fixtures/multi-module.zip"
```

- [ ] **Step 2: 통합 테스트 작성**

```kotlin
package com.toolhub.classdiagramgenerator

import com.toolhub.classdiagramgenerator.domain.OutputLanguage
import com.toolhub.classdiagramgenerator.job.JobService
import com.toolhub.classdiagramgenerator.job.JobStatus
import com.toolhub.classdiagramgenerator.job.JobStore
import io.kotest.core.spec.style.StringSpec
import io.kotest.extensions.spring.SpringExtension
import io.kotest.matchers.shouldBe
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.mock.web.MockMultipartFile

@SpringBootTest
class EndToEndTest(
    private val service: JobService,
    private val store: JobStore,
) : StringSpec({
    extensions(SpringExtension)
    "multi-module zip yields per-module artifacts in english" {
        val bytes = javaClass.getResourceAsStream("/fixtures/multi-module.zip")!!.readBytes()
        val rec = service.submit(
            programName = "demo", version = "v1.0",
            language = OutputLanguage.EN,
            formats = listOf("docx", "xlsx", "md"),
            file = MockMultipartFile("file", "m.zip", "application/zip", bytes),
        )
        repeat(100) {
            if (store.get(rec.id)?.status == JobStatus.DONE) return@repeat
            Thread.sleep(200)
        }
        val final = store.get(rec.id)!!
        final.status shouldBe JobStatus.DONE
        // 2 modules × 3 formats = 6 artifacts
        final.artifacts.size shouldBe 6
        final.artifacts.all { it.filename.startsWith("class-design_demo_") } shouldBe true
    }
})
```

- [ ] **Step 3: 통과 확인 + 커밋**

```bash
./gradlew test --tests "*EndToEndTest*"
git add . && git commit -m "test(class-diagram-generator): 멀티모듈 E2E 통합 테스트"
```

---

## Task 26: ZIP 매직 넘버 검증 + Bean Validation 강화

**Files:**
- Modify: `src/main/kotlin/com/toolhub/classdiagramgenerator/api/JobController.kt` (file 검증)
- Test: `src/test/kotlin/com/toolhub/classdiagramgenerator/api/JobControllerValidationTest.kt`

- [ ] **Step 1: 테스트 작성**

```kotlin
package com.toolhub.classdiagramgenerator.api

import io.kotest.core.spec.style.StringSpec
import io.kotest.extensions.spring.SpringExtension
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.mock.web.MockMultipartFile
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.multipart

@SpringBootTest
@AutoConfigureMockMvc
class JobControllerValidationTest(private val mockMvc: MockMvc) : StringSpec({
    extensions(SpringExtension)
    "rejects non-zip magic number" {
        mockMvc.multipart("/api/v1/jobs") {
            file(MockMultipartFile("file", "x.zip", "application/zip", "not a zip".toByteArray()))
            param("programName", "demo")
            param("version", "v1.0")
            param("language", "ko")
        }.andExpect { status { isBadRequest() } }
    }
})
```

- [ ] **Step 2: JobController.create 본문에 매직 넘버 체크 추가**

```kotlin
// create() 첫 라인에 추가
require(file.size >= 4) { "Empty file" }
val magic = file.inputStream.use { it.readNBytes(4) }
require(magic[0] == 0x50.toByte() && magic[1] == 0x4B.toByte()) { "Not a ZIP file" }
```

- [ ] **Step 3: 통과 확인 + 커밋**

```bash
./gradlew test --tests "*JobControllerValidationTest*"
git add . && git commit -m "feat(class-diagram-generator): ZIP 매직 넘버 검증"
```

---

## Task 27: README + 최종 verification

**Files:**
- Create: `class-diagram-generator/README.md`

- [ ] **Step 1: README 작성**

```markdown
# class-diagram-generator

Java 소스 ZIP을 입력받아 docx/xlsx/md 클래스 설계서를 생성하는 Spring Boot 3 + Kotlin 기반 도구.

상세 PRD: [docs/PRD-class-diagram-generator.md](docs/PRD-class-diagram-generator.md)
구현 계획: [docs/mvp-plan.md](docs/mvp-plan.md)

## 로컬 실행

```bash
mise install
./gradlew bootRun
```

브라우저에서 http://localhost:8080 접속 → 필요 시 헤더 `KO / EN` 토글 또는 산출물 언어 선택 확인 → ZIP 업로드.

## 검증

```bash
./gradlew check
```

위 명령은 Kotest 단위/통합 테스트, Spotless(ktlint), Detekt를 모두 실행한다.

## 주요 API

| 메서드 | 경로 | 설명 |
|---|---|---|
| POST | `/api/v1/jobs` | ZIP 업로드 + 작업 생성 |
| GET | `/api/v1/jobs/{id}/events` | SSE 진행 스트리밍 |
| GET | `/api/v1/jobs/{id}/result` | 결과 메타 조회 |
| GET | `/api/v1/jobs/{id}/artifacts/{idx}` | 개별 산출물 다운로드 |
| GET | `/api/v1/jobs/{id}/bundle` | 전체 산출물 zip 묶음 |

## 설정 키 (`application.yml`)

| 키 | 기본값 | 설명 |
|---|---|---|
| `app.workdir` | OS temp/class-diagram-generator | 작업 디렉터리 |
| `app.job.max-concurrent` | 4 | 동시 작업 수 |
| `app.job.ttl-minutes` | 60 | 산출물 보관 시간 |
| `app.upload.max-file-size-mb` | 100 | 업로드 크기 한도 |
| `app.analysis.max-classes-per-module` | 5000 | 모듈당 클래스 한도 |
```

- [ ] **Step 2: 최종 verification**

```bash
./gradlew clean check
```

Expected: BUILD SUCCESSFUL.

- [ ] **Step 3: 수동 브라우저 검증 체크리스트**

```bash
./gradlew bootRun
```

- [ ] 헤더 KO/EN 토글로 라벨 변경
- [ ] 단일 모듈 ZIP 업로드 → 진행 페이지에서 단계 표시 → 결과 페이지에서 docx/xlsx/md 다운로드 가능
- [ ] 멀티모듈 ZIP 업로드 → 모듈 수 × 포맷 수 만큼 산출물 생성, 묶음 다운로드 zip 정상

- [ ] **Step 4: 최종 커밋**

```bash
git add . && git commit -m "docs(class-diagram-generator): README + MVP 완성"
```

---

## 완료 기준 점검 (PRD §13 매핑)

각 수용 기준이 어떤 Task에서 충족되는지 매핑:

| PRD 수용 기준 | Task |
|---|---|
| 멀티모듈 Gradle 산출물 생성 | 7, 16, 25 |
| 단일 모듈 Maven 산출물 생성 | 7, 16 |
| Javadoc 설명 자동 추출 | 8 |
| Javadoc 부재 시 빈칸 (경고 없음) | 8 |
| 패키지 기반 계층 분류 | 9 |
| SSE 단계 이벤트 수신 | 14, 16, 18, 23 |
| 1시간 후 자동 삭제 | 15 |
| Zip Slip / invalid ZIP → RFC 7807 | 6, 19, 26 |
| `./gradlew check` 통과 | 1, 모든 task 종료 시 |
| 결정적 산출물 | 10 |
| ASCII 파일명 | 16 (sanitize 로직) |
| 브라우저 업로드→진행→결과 흐름 | 22, 23, 24 |
| EventSource 실시간 갱신 | 23 |
| 개별/묶음 다운로드 | 18, 24 |
| 헤더 언어 토글 & 쿠키 | 20, 21 |
| KO/EN 라벨 토글 | 20 |
| 산출물 언어 분기 | 5, 11, 12, 13, 16 |
| 식별자 비번역 | 16, 11, 12, 13 (그대로 출력) |
| 메시지 키 일치 검증 | 20 (Step 4 테스트) |

---

## 후속 (NEXT-XX) 작업과의 경계

본 계획은 PRD MVP만 다룬다. 다음은 별도 spec/plan으로 분리:

- NEXT-01 Git repo 입력 — `ZipExtractor` 옆에 `GitCloner` 추가, `JobService` 입력 채널 확장.
- NEXT-02 Kotlin 소스 분석 — `JavaSourceAnalyzer` 옆에 `KotlinSourceAnalyzer` 추가.
- NEXT-05/10 인증·DB·S3 — `JobStore`/`OutputStorage` 인터페이스화 후 구현체 교체.

이 인터페이스 분리는 MVP 코드에 이미 적용되어 있어 후속 작업 시 깨질 가능성이 낮다.
