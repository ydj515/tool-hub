# 클래스 다이어그램 본문 임베드 구현 계획 (NEXT-03)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** class-diagram-generator 산출물(docx/xlsx/md)에 계층 다이어그램(모듈당 6장) + 클래스 다이어그램(모듈당 N장)을 PlantUML PNG / Mermaid 코드 블록으로 자동 삽입한다.

**Architecture:** JavaParser 로 extends/implements 추출 → `Relation` 도메인 객체 → `DiagramSpec`(엔진 중립) → 모듈별로 `PlantUmlRenderer` 가 PNG 일괄 렌더링 후 디스크 저장 → 산출물 generator 가 임베드. md 만 별도로 `MermaidRenderer` 가 spec 을 문자열로 변환.

**Tech Stack:** Kotlin 2.0.21, Spring Boot 3.3.5, JavaParser 3.26.2, Apache POI 5.3.0, PlantUML 1.2025.x (plantuml-mit, Smetana 레이아웃), Kotest StringSpec, MockK.

**관련 스펙:** `docs/superpowers/specs/2026-05-19-class-diagram-embed-design.md`

---

## 작업 디렉터리 / 기준 파일

모든 경로는 다음 베이스를 기준으로 한다 (별도 명시 없으면 모두 `class-diagram-generator/` 하위).

- 메인: `class-diagram-generator/src/main/kotlin/com/toolhub/classdiagramgenerator/`
- 테스트: `class-diagram-generator/src/test/kotlin/com/toolhub/classdiagramgenerator/`
- 리소스: `class-diagram-generator/src/main/resources/`
- 빌드: `class-diagram-generator/build.gradle.kts`, `class-diagram-generator/gradle/libs.versions.toml`

---

## 파일 구조 (생성/수정 매핑)

| 작업 | 파일 |
|---|---|
| 생성 | `domain/Relation.kt` |
| 생성 | `analyzer/RelationExtractor.kt` |
| 생성 | `render/diagram/DiagramSpec.kt` |
| 생성 | `render/diagram/DiagramSpecBuilder.kt` |
| 생성 | `render/diagram/PlantUmlRenderer.kt` |
| 생성 | `render/diagram/MermaidRenderer.kt` |
| 생성 | `render/diagram/DiagramRenderer.kt` |
| 생성 | `render/diagram/DiagramArtifactIndex.kt` |
| 생성 (테스트) | `analyzer/RelationExtractorTest.kt`, `render/diagram/*Test.kt` 등 8개 |
| 수정 | `gradle/libs.versions.toml` (PlantUML lib 추가) |
| 수정 | `build.gradle.kts` (plantuml 의존성) |
| 수정 | `domain/Model.kt` (`Module.relations` 추가) |
| 수정 | `domain/OutputLabels.kt` (신규 라벨 키 5개) |
| 수정 | `analyzer/JavaSourceAnalyzer.kt` (`ParsedType` 확장 + 추출) |
| 수정 | `render/DocumentGenerator.kt` (인터페이스 시그니처 변경) |
| 수정 | `render/DocxGenerator.kt` (다이어그램 임베드) |
| 수정 | `render/XlsxGenerator.kt` (layerDiagrams 시트 + 이미지) |
| 수정 | `render/MarkdownGenerator.kt` (Mermaid 코드블록) |
| 수정 | `job/Stage.kt` (`EXTRACTING_RELATIONS`, `RENDERING_DIAGRAMS` 추가) |
| 수정 | `job/JobStore.kt` (`JobRecord.includeDiagrams` 필드) |
| 수정 | `job/JobService.kt` (submit 시그니처) |
| 수정 | `job/JobOrchestrator.kt` (신규 단계 호출, percent 재분배, generator 호출 시 diagrams 전달) |
| 수정 | `api/JobController.kt` (`includeDiagrams` 폼 파라미터) |
| 수정 | `config/AppProperties.kt` (`Diagrams` 섹션) |
| 수정 | `src/main/resources/application.yml` (`app.diagrams.*`) |
| 수정 | `src/main/resources/messages.properties`, `messages_en.properties` |
| 수정 | `src/main/resources/templates/upload.html` (체크박스) |
| 수정 | `src/main/resources/static/js/upload.js` (formData includeDiagrams) |
| 수정 | `src/test/resources/fixtures/...` (상속/구현 관계 fixture 추가) |
| 수정 | 기존 `render/*Test.kt` (시그니처 변경 반영) |
| 수정 | 기존 `job/JobOrchestratorTest.kt`, `EndToEndTest.kt` |
| 수정 | `class-diagram-generator/docs/PRD-class-diagram-generator.md` (NEXT-03 완료 표시 + 수용 기준 6개 추가) |

---

## 공통 명령어

```bash
# 단위 테스트 한 클래스만
./gradlew :test --tests "com.toolhub.classdiagramgenerator.<pkg>.<ClassName>"

# 전체 검증 (test + spotless + detekt)
./gradlew check

# 포맷 자동 정리
./gradlew spotlessApply
```

모든 Bash 실행은 `class-diagram-generator/` 디렉터리에서 한다.

---

## Task 1: PlantUML 의존성 추가 + Stage / AppProperties / OutputLabels / application.yml 일괄 변경

기반 변경을 한 커밋으로. 이후 task 들이 이 토대를 참조한다.

**Files:**
- Modify: `class-diagram-generator/gradle/libs.versions.toml`
- Modify: `class-diagram-generator/build.gradle.kts`
- Modify: `class-diagram-generator/src/main/kotlin/com/toolhub/classdiagramgenerator/job/Stage.kt`
- Modify: `class-diagram-generator/src/main/kotlin/com/toolhub/classdiagramgenerator/config/AppProperties.kt`
- Modify: `class-diagram-generator/src/main/resources/application.yml`
- Modify: `class-diagram-generator/src/main/kotlin/com/toolhub/classdiagramgenerator/domain/OutputLabels.kt`

- [ ] **Step 1: `libs.versions.toml` 에 plantuml 버전·라이브러리 추가**

`[versions]` 섹션 끝(현재 `ktlint = "1.3.1"` 다음 줄)에 추가:

```toml
plantuml = "1.2025.0"
```

`[libraries]` 섹션 끝(현재 `springmockk` 다음 줄)에 추가:

```toml
plantuml                     = { module = "net.sourceforge.plantuml:plantuml-mit", version.ref = "plantuml" }
```

- [ ] **Step 2: `build.gradle.kts` 에 implementation 추가**

`implementation(libs.webjars.locator.core)` 다음 줄(현재 줄 45)에 추가:

```kotlin
implementation(libs.plantuml)
```

- [ ] **Step 3: 의존성 해석 확인**

```bash
./gradlew dependencies --configuration runtimeClasspath | grep -i plantuml
```

기대 출력: `net.sourceforge.plantuml:plantuml-mit:1.2025.0` 가 보여야 한다. 보이지 않으면 버전이 Maven Central 에 존재하는지 확인하고 가장 최근 1.2025.x 안정 버전으로 조정한다.

- [ ] **Step 4: `Stage.kt` 에 새 단계 2개 추가**

파일을 다음 전체 내용으로 대체:

```kotlin
package com.toolhub.classdiagramgenerator.job

enum class Stage {
    EXTRACTING,
    DETECTING_MODULES,
    PARSING,
    CLASSIFYING,
    ASSIGNING_IDS,
    EXTRACTING_RELATIONS,
    RENDERING_DIAGRAMS,
    RENDERING_DOCX,
    RENDERING_XLSX,
    RENDERING_MD,
    PACKAGING,
}
```

- [ ] **Step 5: `AppProperties.kt` 에 `Diagrams` 섹션 추가**

`Analysis` 데이터 클래스 정의 바로 아래(클래스 닫는 중괄호 `}` 직전)에 새 nested class 추가하고, 상단 primary constructor 에도 필드 추가. 다음 전체 본문으로 대체:

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
    val diagrams: Diagrams = Diagrams(),
) {
    data class Job(
        val maxConcurrent: Int = 4,
        val ttlMinutes: Long = 60,
        val cleanerIntervalMinutes: Long = 10,
    )

    data class Upload(
        val maxFileSizeMb: Int = 100,
    )

    data class Analysis(
        val maxClassesPerModule: Int = 5000,
    )

    data class Diagrams(
        val enabledDefault: Boolean = true,
        val parallelism: Int = 0,
        val maxBytesPerPng: Long = 5_242_880L,
    )
}

@Configuration
@EnableConfigurationProperties(AppProperties::class)
class AppPropertiesConfig
```

- [ ] **Step 6: `application.yml` 에 `app.diagrams` 추가**

`analysis:` 블록(현재 줄 35-36) 다음에 추가하여 최종 `app:` 블록은 다음과 같이:

```yaml
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
  diagrams:
    enabled-default: true
    parallelism: 0
    max-bytes-per-png: 5242880
```

- [ ] **Step 7: `OutputLabels.kt` 의 KO/EN 양쪽 맵에 신규 5개 키 추가**

`"toc.refreshHint"` 다음 (각 맵 마지막 항목 뒤) 에 다음 항목 추가.

KO 맵 (`"toc.refreshHint" to "..."` 라인 다음):
```kotlin
                "doc.title.layerDiagrams" to "계층 다이어그램",
                "doc.title.classDiagram" to "클래스 다이어그램",
                "sheet.layerDiagrams" to "계층 다이어그램",
                "diagram.legend.external" to "외부 타입",
                "warning.diagramFailed" to "다이어그램 렌더링 실패",
```

EN 맵 (`"toc.refreshHint" to "..."` 라인 다음):
```kotlin
                "doc.title.layerDiagrams" to "Layer Diagrams",
                "doc.title.classDiagram" to "Class Diagram",
                "sheet.layerDiagrams" to "Layer Diagrams",
                "diagram.legend.external" to "External Type",
                "warning.diagramFailed" to "Diagram rendering failed",
```

- [ ] **Step 8: 기존 OutputLabels 테스트로 회귀 없는지 확인**

```bash
./gradlew :test --tests "com.toolhub.classdiagramgenerator.domain.OutputLabelsTest"
```

기대: PASS. 신규 키 검증은 별도 task 에서 추가하지 않고 기존 키 집합 일치 테스트가 자동으로 신규 키 5종을 양쪽 맵에 요구하게 됨.

- [ ] **Step 9: 컴파일 통과 확인**

```bash
./gradlew :compileKotlin
```

기대: BUILD SUCCESSFUL.

- [ ] **Step 10: 커밋**

```bash
git add class-diagram-generator/gradle/libs.versions.toml \
        class-diagram-generator/build.gradle.kts \
        class-diagram-generator/src/main/kotlin/com/toolhub/classdiagramgenerator/job/Stage.kt \
        class-diagram-generator/src/main/kotlin/com/toolhub/classdiagramgenerator/config/AppProperties.kt \
        class-diagram-generator/src/main/resources/application.yml \
        class-diagram-generator/src/main/kotlin/com/toolhub/classdiagramgenerator/domain/OutputLabels.kt
git commit -m "feat(class-diagram-generator): NEXT-03 토대 - PlantUML 의존성, Stage 2단계, app.diagrams 설정, 라벨 키 추가"
```

---

## Task 2: 도메인 — `Relation`, `TypeRef`, `Module.relations` 추가

**Files:**
- Create: `class-diagram-generator/src/main/kotlin/com/toolhub/classdiagramgenerator/domain/Relation.kt`
- Modify: `class-diagram-generator/src/main/kotlin/com/toolhub/classdiagramgenerator/domain/Model.kt`
- Create test: `class-diagram-generator/src/test/kotlin/com/toolhub/classdiagramgenerator/domain/RelationTest.kt`

- [ ] **Step 1: 실패하는 테스트 작성**

`src/test/kotlin/com/toolhub/classdiagramgenerator/domain/RelationTest.kt` 생성:

```kotlin
package com.toolhub.classdiagramgenerator.domain

import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.shouldBe

class RelationTest :
    StringSpec({
        "TypeRef preserves simpleName, fqn, external flag" {
            val ref = TypeRef(simpleName = "User", fqn = "com.demo.User", external = false)
            ref.simpleName shouldBe "User"
            ref.fqn shouldBe "com.demo.User"
            ref.external shouldBe false
        }

        "Relation holds source class id, target, kind" {
            val rel =
                Relation(
                    sourceClassId = "CLS-0001",
                    target = TypeRef("BaseService", null, true),
                    kind = RelationKind.EXTENDS,
                )
            rel.sourceClassId shouldBe "CLS-0001"
            rel.target.simpleName shouldBe "BaseService"
            rel.kind shouldBe RelationKind.EXTENDS
        }

        "Module relations defaults to empty list" {
            val m = Module(name = "core", classes = emptyList())
            m.relations shouldBe emptyList()
        }
    })
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
./gradlew :test --tests "com.toolhub.classdiagramgenerator.domain.RelationTest"
```

기대: 컴파일 에러 (`Unresolved reference: TypeRef` / `Relation` / `RelationKind`).

- [ ] **Step 3: `Relation.kt` 생성**

`src/main/kotlin/com/toolhub/classdiagramgenerator/domain/Relation.kt`:

```kotlin
package com.toolhub.classdiagramgenerator.domain

enum class RelationKind { EXTENDS, IMPLEMENTS }

data class TypeRef(
    val simpleName: String,
    val fqn: String?,
    val external: Boolean,
)

data class Relation(
    val sourceClassId: String,
    val target: TypeRef,
    val kind: RelationKind,
)
```

- [ ] **Step 4: `Module` 데이터 클래스에 `relations` 필드 추가**

`Model.kt` 의 `Module` 데이터 클래스 (현재 줄 51-54) 를 다음으로 교체:

```kotlin
data class Module(
    val name: String,
    val classes: List<ClassInfo>,
    val relations: List<Relation> = emptyList(),
)
```

- [ ] **Step 5: 테스트 통과 확인**

```bash
./gradlew :test --tests "com.toolhub.classdiagramgenerator.domain.RelationTest"
```

기대: PASS, 3 tests.

- [ ] **Step 6: 회귀 테스트 — 기존 ModelTest 가 깨지지 않는지 확인**

```bash
./gradlew :test --tests "com.toolhub.classdiagramgenerator.domain.ModelTest"
```

기대: PASS. (default 값이 있으므로 기존 호출자 영향 없음)

- [ ] **Step 7: 커밋**

```bash
git add class-diagram-generator/src/main/kotlin/com/toolhub/classdiagramgenerator/domain/Relation.kt \
        class-diagram-generator/src/main/kotlin/com/toolhub/classdiagramgenerator/domain/Model.kt \
        class-diagram-generator/src/test/kotlin/com/toolhub/classdiagramgenerator/domain/RelationTest.kt
git commit -m "feat(class-diagram-generator): NEXT-03 도메인 - Relation/TypeRef/RelationKind 추가"
```

---

## Task 3: `JavaSourceAnalyzer` 에 extends/implements/imports 추출 추가

**Files:**
- Modify: `class-diagram-generator/src/main/kotlin/com/toolhub/classdiagramgenerator/analyzer/JavaSourceAnalyzer.kt`
- Modify: `class-diagram-generator/src/test/kotlin/com/toolhub/classdiagramgenerator/analyzer/JavaSourceAnalyzerTest.kt`

- [ ] **Step 1: 기존 테스트 파일 위치/이름 확인**

```bash
cat class-diagram-generator/src/test/kotlin/com/toolhub/classdiagramgenerator/analyzer/JavaSourceAnalyzerTest.kt | head -40
```

(어떤 imports/test 구조인지 파악)

- [ ] **Step 2: 실패하는 테스트 추가**

`JavaSourceAnalyzerTest.kt` 의 `StringSpec({` 블록 안 마지막에 다음 테스트 케이스 3개를 추가한다 (기존 케이스들 다음 줄):

```kotlin
        "extracts extends names" {
            val tmp = kotlin.io.path.createTempFile(suffix = ".java")
            tmp.toFile().writeText(
                """
                package com.demo;
                import com.demo.base.BaseService;
                public class UserService extends BaseService {}
                """.trimIndent(),
            )
            val parsed = JavaSourceAnalyzer().parseFile(tmp)
            parsed.types[0].extendsNames shouldBe listOf("BaseService")
        }

        "extracts implements names" {
            val tmp = kotlin.io.path.createTempFile(suffix = ".java")
            tmp.toFile().writeText(
                """
                package com.demo;
                import java.io.Serializable;
                public class User implements Serializable, Cloneable {}
                """.trimIndent(),
            )
            val parsed = JavaSourceAnalyzer().parseFile(tmp)
            parsed.types[0].implementsNames shouldBe listOf("Serializable", "Cloneable")
        }

        "extracts import statements" {
            val tmp = kotlin.io.path.createTempFile(suffix = ".java")
            tmp.toFile().writeText(
                """
                package com.demo;
                import com.demo.base.BaseService;
                import java.util.List;
                public class Svc {}
                """.trimIndent(),
            )
            val parsed = JavaSourceAnalyzer().parseFile(tmp)
            parsed.types[0].imports shouldBe listOf("com.demo.base.BaseService", "java.util.List")
        }
```

테스트 파일 상단에 `import io.kotest.matchers.shouldBe` 가 있는지 확인하고, 없으면 추가.

- [ ] **Step 3: 테스트 실패 확인**

```bash
./gradlew :test --tests "com.toolhub.classdiagramgenerator.analyzer.JavaSourceAnalyzerTest"
```

기대: 컴파일 에러 (`Unresolved reference: extendsNames`).

- [ ] **Step 4: `ParsedType` 에 필드 추가**

`JavaSourceAnalyzer.kt` 의 `ParsedType` 정의(현재 줄 31-37) 를 다음으로 교체:

```kotlin
data class ParsedType(
    val name: String,
    val packagePath: String,
    val description: String,
    val attributes: List<ParsedAttribute>,
    val operations: List<ParsedOperation>,
    val extendsNames: List<String> = emptyList(),
    val implementsNames: List<String> = emptyList(),
    val imports: List<String> = emptyList(),
)
```

- [ ] **Step 5: `parseFile` 에서 imports 추출 → `parseType` 으로 전달**

`parseFile` 메서드(현재 줄 52-59)를 다음으로 교체:

```kotlin
    fun parseFile(path: Path): ParsedSource {
        val parsed = parseCompilationUnit(path)
        val unit = parsed.unit
        val pkg = unit.packageDeclaration.map { it.nameAsString }.orElse("")
        val imports = unit.imports.map { it.nameAsString }
        val result = mutableListOf<ParsedType>()
        unit.types.forEach { collect(it, pkg, imports, result) }
        return ParsedSource(types = result, warnings = parsed.warnings)
    }
```

`collect` 메서드(현재 줄 92-99) 를 다음으로 교체:

```kotlin
    private fun collect(
        type: TypeDeclaration<*>,
        pkg: String,
        imports: List<String>,
        out: MutableList<ParsedType>,
    ) {
        out.add(parseType(type, pkg, imports))
        type.members.filterIsInstance<TypeDeclaration<*>>().forEach { collect(it, pkg, imports, out) }
    }
```

`parseType` 메서드(현재 줄 101-130) 를 다음으로 교체:

```kotlin
    private fun parseType(
        type: TypeDeclaration<*>,
        pkg: String,
        imports: List<String>,
    ): ParsedType {
        val attributes =
            type.fields.flatMap { field ->
                field.variables.map { v ->
                    ParsedAttribute(
                        name = v.nameAsString,
                        type = field.elementType.asString(),
                        accessModifier = accessOf(field),
                        description = firstSentence(field.javadoc.orElse(null)),
                    )
                }
            }
        val operations =
            type.methods.map { m ->
                ParsedOperation(
                    name = m.nameAsString,
                    description = firstSentence(m.javadoc.orElse(null)),
                )
            }
        val (extendsNames, implementsNames) = parentNames(type)
        return ParsedType(
            name = type.nameAsString,
            packagePath = pkg,
            description = firstSentence(type.javadoc.orElse(null)),
            attributes = attributes,
            operations = operations,
            extendsNames = extendsNames,
            implementsNames = implementsNames,
            imports = imports,
        )
    }

    private fun parentNames(type: TypeDeclaration<*>): Pair<List<String>, List<String>> {
        val td = type as? com.github.javaparser.ast.body.ClassOrInterfaceDeclaration
            ?: return emptyList<String>() to emptyList()
        val ext = td.extendedTypes.map { it.nameAsString }
        val impl = td.implementedTypes.map { it.nameAsString }
        return ext to impl
    }
```

- [ ] **Step 6: 테스트 통과 확인**

```bash
./gradlew :test --tests "com.toolhub.classdiagramgenerator.analyzer.JavaSourceAnalyzerTest"
```

기대: 신규 3개 PASS + 기존 케이스 모두 PASS.

- [ ] **Step 7: 커밋**

```bash
git add class-diagram-generator/src/main/kotlin/com/toolhub/classdiagramgenerator/analyzer/JavaSourceAnalyzer.kt \
        class-diagram-generator/src/test/kotlin/com/toolhub/classdiagramgenerator/analyzer/JavaSourceAnalyzerTest.kt
git commit -m "feat(class-diagram-generator): NEXT-03 - JavaSourceAnalyzer 에 extends/implements/imports 추출 추가"
```

---

## Task 4: `RelationExtractor` 신규

ParsedType + 매핑된 ClassInfo 들로부터 `Relation` 목록을 만든다. `java.lang.Object` 제외, internal/external 판정, AMBIGUOUS_TYPE_REF warning 등 모든 규칙은 스펙 §2.3.

**Files:**
- Create: `class-diagram-generator/src/main/kotlin/com/toolhub/classdiagramgenerator/analyzer/RelationExtractor.kt`
- Create test: `class-diagram-generator/src/test/kotlin/com/toolhub/classdiagramgenerator/analyzer/RelationExtractorTest.kt`

- [ ] **Step 1: 실패하는 테스트 작성**

```kotlin
package com.toolhub.classdiagramgenerator.analyzer

import com.toolhub.classdiagramgenerator.domain.AccessModifier
import com.toolhub.classdiagramgenerator.domain.AttributeInfo
import com.toolhub.classdiagramgenerator.domain.ClassInfo
import com.toolhub.classdiagramgenerator.domain.Layer
import com.toolhub.classdiagramgenerator.domain.RelationKind
import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.collections.shouldContain
import io.kotest.matchers.collections.shouldHaveSize
import io.kotest.matchers.shouldBe

class RelationExtractorTest :
    StringSpec({
        val ex = RelationExtractor()

        "internal extends produces non-external relation with fqn" {
            val parsed =
                listOf(
                    ParsedType(
                        name = "UserService",
                        packagePath = "com.demo.service",
                        description = "",
                        attributes = emptyList(),
                        operations = emptyList(),
                        extendsNames = listOf("BaseService"),
                        implementsNames = emptyList(),
                        imports = emptyList(),
                    ),
                    ParsedType(
                        name = "BaseService",
                        packagePath = "com.demo.service",
                        description = "",
                        attributes = emptyList(),
                        operations = emptyList(),
                    ),
                )
            val classes =
                listOf(
                    classInfo("CLS-0001", "UserService", "com.demo.service"),
                    classInfo("CLS-0002", "BaseService", "com.demo.service"),
                )
            val result = ex.extract(parsed, classes)
            result.relations shouldHaveSize 1
            val r = result.relations[0]
            r.sourceClassId shouldBe "CLS-0001"
            r.target.simpleName shouldBe "BaseService"
            r.target.fqn shouldBe "com.demo.service.BaseService"
            r.target.external shouldBe false
            r.kind shouldBe RelationKind.EXTENDS
        }

        "java.lang.Object is excluded" {
            val parsed =
                listOf(
                    ParsedType(
                        name = "Foo",
                        packagePath = "com.demo",
                        description = "",
                        attributes = emptyList(),
                        operations = emptyList(),
                        extendsNames = listOf("Object"),
                        implementsNames = emptyList(),
                        imports = listOf("java.lang.Object"),
                    ),
                )
            val classes = listOf(classInfo("CLS-0001", "Foo", "com.demo"))
            ex.extract(parsed, classes).relations shouldHaveSize 0
        }

        "external implements resolves fqn from imports" {
            val parsed =
                listOf(
                    ParsedType(
                        name = "UserRepo",
                        packagePath = "com.demo.repo",
                        description = "",
                        attributes = emptyList(),
                        operations = emptyList(),
                        extendsNames = emptyList(),
                        implementsNames = listOf("JpaRepository"),
                        imports = listOf("org.springframework.data.jpa.repository.JpaRepository"),
                    ),
                )
            val classes = listOf(classInfo("CLS-0001", "UserRepo", "com.demo.repo"))
            val r = ex.extract(parsed, classes).relations.single()
            r.target.external shouldBe true
            r.target.fqn shouldBe "org.springframework.data.jpa.repository.JpaRepository"
            r.kind shouldBe RelationKind.IMPLEMENTS
        }

        "ambiguous simple name with multiple internal candidates degrades to external + warning" {
            val parsed =
                listOf(
                    ParsedType(
                        name = "Caller",
                        packagePath = "com.demo.api",
                        description = "",
                        attributes = emptyList(),
                        operations = emptyList(),
                        extendsNames = listOf("Helper"),
                        implementsNames = emptyList(),
                    ),
                    ParsedType("Helper", "com.demo.a", "", emptyList(), emptyList()),
                    ParsedType("Helper", "com.demo.b", "", emptyList(), emptyList()),
                )
            val classes =
                listOf(
                    classInfo("CLS-0001", "Caller", "com.demo.api"),
                    classInfo("CLS-0002", "Helper", "com.demo.a"),
                    classInfo("CLS-0003", "Helper", "com.demo.b"),
                )
            val result = ex.extract(parsed, classes)
            result.relations.single().target.external shouldBe true
            result.warnings.map { it.code } shouldContain "AMBIGUOUS_TYPE_REF"
        }
    })

private fun classInfo(id: String, name: String, pkg: String) =
    ClassInfo(
        id = id,
        name = name,
        layer = Layer.SERVICE,
        description = "",
        packagePath = pkg,
        attributes = emptyList<AttributeInfo>(),
        operations = emptyList(),
    )
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
./gradlew :test --tests "com.toolhub.classdiagramgenerator.analyzer.RelationExtractorTest"
```

기대: 컴파일 에러 (`Unresolved reference: RelationExtractor`).

- [ ] **Step 3: `RelationExtractor.kt` 구현**

```kotlin
package com.toolhub.classdiagramgenerator.analyzer

import com.toolhub.classdiagramgenerator.domain.ClassInfo
import com.toolhub.classdiagramgenerator.domain.Relation
import com.toolhub.classdiagramgenerator.domain.RelationKind
import com.toolhub.classdiagramgenerator.domain.TypeRef
import com.toolhub.classdiagramgenerator.domain.Warning
import org.springframework.stereotype.Component

data class RelationExtraction(
    val relations: List<Relation>,
    val warnings: List<Warning>,
)

@Component
class RelationExtractor {
    fun extract(
        parsed: List<ParsedType>,
        classes: List<ClassInfo>,
    ): RelationExtraction {
        require(parsed.size == classes.size) {
            "parsed and classes must align: ${parsed.size} vs ${classes.size}"
        }
        val pairs = parsed.zip(classes)
        val nameIndex: Map<String, List<ClassInfo>> = classes.groupBy { it.name }
        val relations = mutableListOf<Relation>()
        val warnings = mutableListOf<Warning>()

        pairs.forEach { (pt, ci) ->
            pt.extendsNames.forEach { name ->
                resolve(name, pt, nameIndex, warnings)?.let { ref ->
                    relations += Relation(ci.id, ref, RelationKind.EXTENDS)
                }
            }
            pt.implementsNames.forEach { name ->
                resolve(name, pt, nameIndex, warnings)?.let { ref ->
                    relations += Relation(ci.id, ref, RelationKind.IMPLEMENTS)
                }
            }
        }
        return RelationExtraction(relations, warnings)
    }

    private fun resolve(
        simpleName: String,
        owner: ParsedType,
        index: Map<String, List<ClassInfo>>,
        warnings: MutableList<Warning>,
    ): TypeRef? {
        if (simpleName == "Object" || simpleName.endsWith(".Object")) return null
        val candidates = index[simpleName] ?: emptyList()
        return when {
            candidates.size == 1 -> {
                val match = candidates.single()
                TypeRef(simpleName, "${match.packagePath}.${match.name}", external = false)
            }
            candidates.size > 1 -> {
                warnings += Warning(
                    code = "AMBIGUOUS_TYPE_REF",
                    message = "Multiple internal candidates for $simpleName from ${owner.packagePath}.${owner.name}",
                    context = mapOf(
                        "owner" to "${owner.packagePath}.${owner.name}",
                        "simpleName" to simpleName,
                        "candidates" to candidates.map { "${it.packagePath}.${it.name}" },
                    ),
                )
                externalRef(simpleName, owner)
            }
            else -> externalRef(simpleName, owner)
        }
    }

    private fun externalRef(simpleName: String, owner: ParsedType): TypeRef {
        val importMatch = owner.imports.firstOrNull { it.substringAfterLast('.') == simpleName }
        return TypeRef(simpleName, importMatch, external = true)
    }
}
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
./gradlew :test --tests "com.toolhub.classdiagramgenerator.analyzer.RelationExtractorTest"
```

기대: 4 PASS.

- [ ] **Step 5: 커밋**

```bash
git add class-diagram-generator/src/main/kotlin/com/toolhub/classdiagramgenerator/analyzer/RelationExtractor.kt \
        class-diagram-generator/src/test/kotlin/com/toolhub/classdiagramgenerator/analyzer/RelationExtractorTest.kt
git commit -m "feat(class-diagram-generator): NEXT-03 - RelationExtractor (extends/implements 추출, Object 제외, 모호 매칭 처리)"
```

---

## Task 5: `DiagramSpec` 모델 + `DiagramSpecBuilder` + `DiagramArtifactIndex`

**Files:**
- Create: `class-diagram-generator/src/main/kotlin/com/toolhub/classdiagramgenerator/render/diagram/DiagramSpec.kt`
- Create: `class-diagram-generator/src/main/kotlin/com/toolhub/classdiagramgenerator/render/diagram/DiagramArtifactIndex.kt`
- Create: `class-diagram-generator/src/main/kotlin/com/toolhub/classdiagramgenerator/render/diagram/DiagramSpecBuilder.kt`
- Create test: `class-diagram-generator/src/test/kotlin/com/toolhub/classdiagramgenerator/render/diagram/DiagramSpecBuilderTest.kt`

- [ ] **Step 1: 실패 테스트 작성**

```kotlin
package com.toolhub.classdiagramgenerator.render.diagram

import com.toolhub.classdiagramgenerator.domain.AttributeInfo
import com.toolhub.classdiagramgenerator.domain.ClassInfo
import com.toolhub.classdiagramgenerator.domain.Layer
import com.toolhub.classdiagramgenerator.domain.Module
import com.toolhub.classdiagramgenerator.domain.Relation
import com.toolhub.classdiagramgenerator.domain.RelationKind
import com.toolhub.classdiagramgenerator.domain.TypeRef
import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.collections.shouldContain
import io.kotest.matchers.collections.shouldHaveSize
import io.kotest.matchers.shouldBe

class DiagramSpecBuilderTest :
    StringSpec({
        val builder = DiagramSpecBuilder()

        "layer diagram contains all classes in the layer plus external parents" {
            val module =
                Module(
                    name = "core",
                    classes =
                        listOf(
                            cls("CLS-0001", "UserController", Layer.CONTROLLER),
                            cls("CLS-0002", "AdminController", Layer.CONTROLLER),
                            cls("CLS-0003", "UserService", Layer.SERVICE),
                        ),
                    relations =
                        listOf(
                            Relation("CLS-0001", TypeRef("BaseController", "x.BaseController", true), RelationKind.EXTENDS),
                        ),
                )
            val specs = builder.build(module)
            val layerCtrl = specs.single { it.scope == DiagramScope.LAYER && it.key == "layer-controller" }
            layerCtrl.nodes.map { it.displayName } shouldContain "UserController"
            layerCtrl.nodes.map { it.displayName } shouldContain "AdminController"
            layerCtrl.nodes.map { it.displayName } shouldContain "BaseController"
            layerCtrl.nodes.single { it.external }.external shouldBe true
        }

        "class diagram contains the class plus direct parents only" {
            val module =
                Module(
                    name = "core",
                    classes = listOf(cls("CLS-0001", "UserService", Layer.SERVICE), cls("CLS-0002", "BaseService", Layer.SERVICE)),
                    relations =
                        listOf(
                            Relation("CLS-0001", TypeRef("BaseService", "com.BaseService", false), RelationKind.EXTENDS),
                        ),
                )
            val spec = builder.build(module).single { it.scope == DiagramScope.CLASS && it.key == "class-CLS-0001" }
            spec.nodes.map { it.displayName } shouldHaveSize 2
            spec.edges.single().kind shouldBe RelationKind.EXTENDS
        }

        "isolated class with no parents is skipped" {
            val module = Module(name = "core", classes = listOf(cls("CLS-0001", "Lone", Layer.UTIL)), relations = emptyList())
            val specs = builder.build(module)
            specs.any { it.scope == DiagramScope.CLASS } shouldBe false
        }

        "empty layer skipped" {
            val module = Module(name = "core", classes = listOf(cls("CLS-0001", "Foo", Layer.SERVICE)), relations = emptyList())
            val specs = builder.build(module)
            specs.any { it.scope == DiagramScope.LAYER && it.key == "layer-controller" } shouldBe false
        }
    })

private fun cls(id: String, name: String, layer: Layer) =
    ClassInfo(
        id = id,
        name = name,
        layer = layer,
        description = "",
        packagePath = "com.demo",
        attributes = emptyList<AttributeInfo>(),
        operations = emptyList(),
    )
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
./gradlew :test --tests "com.toolhub.classdiagramgenerator.render.diagram.DiagramSpecBuilderTest"
```

기대: 컴파일 에러.

- [ ] **Step 3: `DiagramSpec.kt` 작성**

```kotlin
package com.toolhub.classdiagramgenerator.render.diagram

import com.toolhub.classdiagramgenerator.domain.Layer
import com.toolhub.classdiagramgenerator.domain.RelationKind

enum class DiagramScope { LAYER, CLASS }

data class DiagramNode(
    val id: String,
    val classId: String?,
    val stereotype: String?,
    val displayName: String,
    val external: Boolean,
)

data class DiagramEdge(
    val fromId: String,
    val toId: String,
    val kind: RelationKind,
)

data class DiagramSpec(
    val scope: DiagramScope,
    val key: String,
    val title: String,
    val nodes: List<DiagramNode>,
    val edges: List<DiagramEdge>,
    val layer: Layer? = null,
    val classId: String? = null,
)
```

- [ ] **Step 4: `DiagramArtifactIndex.kt` 작성**

```kotlin
package com.toolhub.classdiagramgenerator.render.diagram

import com.toolhub.classdiagramgenerator.domain.Layer
import java.nio.file.Path

data class DiagramArtifactIndex(
    val layerDiagrams: Map<String, Map<Layer, Path?>>,
    val classDiagrams: Map<String, Map<String, Path?>>,
    val specs: Map<String, Map<String, DiagramSpec>>,
) {
    companion object {
        val EMPTY = DiagramArtifactIndex(emptyMap(), emptyMap(), emptyMap())
    }
}
```

- [ ] **Step 5: `DiagramSpecBuilder.kt` 작성**

```kotlin
package com.toolhub.classdiagramgenerator.render.diagram

import com.toolhub.classdiagramgenerator.domain.ClassInfo
import com.toolhub.classdiagramgenerator.domain.Layer
import com.toolhub.classdiagramgenerator.domain.Module
import com.toolhub.classdiagramgenerator.domain.Relation
import com.toolhub.classdiagramgenerator.domain.TypeRef
import org.springframework.stereotype.Component
import java.security.MessageDigest

@Component
class DiagramSpecBuilder {
    fun build(module: Module): List<DiagramSpec> {
        val byId = module.classes.associateBy { it.id }
        val layerSpecs = buildLayerSpecs(module, byId)
        val classSpecs = buildClassSpecs(module, byId)
        return layerSpecs + classSpecs
    }

    private fun buildLayerSpecs(
        module: Module,
        byId: Map<String, ClassInfo>,
    ): List<DiagramSpec> =
        Layer.entries.mapNotNull { layer ->
            val members = module.classes.filter { it.layer == layer }
            if (members.isEmpty()) return@mapNotNull null
            val memberIds = members.map { it.id }.toSet()
            val relations = module.relations.filter { it.sourceClassId in memberIds }
            val externalNodes = relations.filter { it.target.external }.map { it.target }.distinctBy { it.fqn ?: it.simpleName }
            val internalNodes = members.map { nodeForInternal(it) }
            val externals = externalNodes.map { nodeForExternal(it) }
            val nodes = internalNodes + externals
            val edges = relations.map { edgeFor(it, byId) }
            DiagramSpec(
                scope = DiagramScope.LAYER,
                key = "layer-${layer.name.lowercase()}",
                title = "${layer.name.lowercase().replaceFirstChar { it.titlecase() }} Layer",
                nodes = nodes,
                edges = edges,
                layer = layer,
            )
        }

    private fun buildClassSpecs(
        module: Module,
        byId: Map<String, ClassInfo>,
    ): List<DiagramSpec> =
        module.classes.mapNotNull { ci ->
            val relations = module.relations.filter { it.sourceClassId == ci.id }
            if (relations.isEmpty()) return@mapNotNull null
            val parents = relations.map { it.target }
            val parentNodes =
                parents.map { ref ->
                    if (ref.external) {
                        nodeForExternal(ref)
                    } else {
                        val matched = byId.values.firstOrNull { it.name == ref.simpleName }
                        if (matched != null) nodeForInternal(matched) else nodeForExternal(ref)
                    }
                }
            val nodes = listOf(nodeForInternal(ci)) + parentNodes.distinctBy { it.id }
            val edges = relations.map { edgeFor(it, byId) }
            DiagramSpec(
                scope = DiagramScope.CLASS,
                key = "class-${ci.id}",
                title = "${ci.id} ${ci.name}",
                nodes = nodes,
                edges = edges,
                classId = ci.id,
            )
        }

    private fun nodeForInternal(ci: ClassInfo): DiagramNode =
        DiagramNode(
            id = ci.id.replace('-', '_'),
            classId = ci.id,
            stereotype = ci.layer.name.lowercase().replaceFirstChar { it.titlecase() },
            displayName = ci.name,
            external = false,
        )

    private fun nodeForExternal(ref: TypeRef): DiagramNode {
        val hashInput = ref.fqn ?: ref.simpleName
        val hash = sha1Hex(hashInput).take(EXTERNAL_HASH_LEN)
        return DiagramNode(
            id = "EXT_$hash",
            classId = null,
            stereotype = null,
            displayName = ref.fqn?.substringAfterLast('.') ?: ref.simpleName,
            external = true,
        )
    }

    private fun edgeFor(
        rel: Relation,
        byId: Map<String, ClassInfo>,
    ): DiagramEdge {
        val from = rel.sourceClassId.replace('-', '_')
        val to = if (rel.target.external) {
            "EXT_${sha1Hex(rel.target.fqn ?: rel.target.simpleName).take(EXTERNAL_HASH_LEN)}"
        } else {
            val matched = byId.values.firstOrNull { it.name == rel.target.simpleName }
            matched?.id?.replace('-', '_')
                ?: "EXT_${sha1Hex(rel.target.simpleName).take(EXTERNAL_HASH_LEN)}"
        }
        return DiagramEdge(fromId = from, toId = to, kind = rel.kind)
    }

    private fun sha1Hex(input: String): String {
        val md = MessageDigest.getInstance("SHA-1")
        val bytes = md.digest(input.toByteArray(Charsets.UTF_8))
        return bytes.joinToString("") { "%02x".format(it) }
    }

    companion object {
        private const val EXTERNAL_HASH_LEN = 6
    }
}
```

- [ ] **Step 6: 테스트 통과 확인**

```bash
./gradlew :test --tests "com.toolhub.classdiagramgenerator.render.diagram.DiagramSpecBuilderTest"
```

기대: 4 PASS.

- [ ] **Step 7: 커밋**

```bash
git add class-diagram-generator/src/main/kotlin/com/toolhub/classdiagramgenerator/render/diagram/DiagramSpec.kt \
        class-diagram-generator/src/main/kotlin/com/toolhub/classdiagramgenerator/render/diagram/DiagramArtifactIndex.kt \
        class-diagram-generator/src/main/kotlin/com/toolhub/classdiagramgenerator/render/diagram/DiagramSpecBuilder.kt \
        class-diagram-generator/src/test/kotlin/com/toolhub/classdiagramgenerator/render/diagram/DiagramSpecBuilderTest.kt
git commit -m "feat(class-diagram-generator): NEXT-03 - DiagramSpec 모델 + Builder + ArtifactIndex"
```

---

## Task 6: `PlantUmlRenderer` — DiagramSpec → PlantUML 텍스트 + PNG

**Files:**
- Create: `class-diagram-generator/src/main/kotlin/com/toolhub/classdiagramgenerator/render/diagram/PlantUmlRenderer.kt`
- Create test: `class-diagram-generator/src/test/kotlin/com/toolhub/classdiagramgenerator/render/diagram/PlantUmlRendererTest.kt`

- [ ] **Step 1: 실패 테스트 작성**

```kotlin
package com.toolhub.classdiagramgenerator.render.diagram

import com.toolhub.classdiagramgenerator.domain.RelationKind
import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.booleans.shouldBeTrue
import io.kotest.matchers.string.shouldContain

class PlantUmlRendererTest :
    StringSpec({
        val renderer = PlantUmlRenderer()

        val spec =
            DiagramSpec(
                scope = DiagramScope.CLASS,
                key = "class-CLS-0001",
                title = "CLS-0001 UserService",
                nodes =
                    listOf(
                        DiagramNode("CLS_0001", "CLS-0001", "Service", "UserService", false),
                        DiagramNode("EXT_abcdef", null, null, "BaseService", true),
                    ),
                edges = listOf(DiagramEdge("CLS_0001", "EXT_abcdef", RelationKind.EXTENDS)),
                classId = "CLS-0001",
            )

        "buildSource produces PlantUML text with stereotype, external dashed style, extends arrow" {
            val src = renderer.buildSource(spec)
            src shouldContain "@startuml"
            src shouldContain "<<Service>>"
            src shouldContain "CLS-0001"
            src shouldContain "UserService"
            src shouldContain "<<external>>"
            src shouldContain "borderStyle dashed"
            src shouldContain "CLS_0001 --|> EXT_abcdef"
        }

        "render produces a PNG starting with the PNG magic header" {
            val bytes = renderer.render(spec)
            (bytes.size > PNG_HEADER.size).shouldBeTrue()
            PNG_HEADER.indices.all { bytes[it] == PNG_HEADER[it] }.shouldBeTrue()
        }
    })

private val PNG_HEADER = byteArrayOf(0x89.toByte(), 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A)
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
./gradlew :test --tests "com.toolhub.classdiagramgenerator.render.diagram.PlantUmlRendererTest"
```

기대: 컴파일 에러.

- [ ] **Step 3: `PlantUmlRenderer.kt` 작성**

```kotlin
package com.toolhub.classdiagramgenerator.render.diagram

import com.toolhub.classdiagramgenerator.domain.RelationKind
import net.sourceforge.plantuml.FileFormat
import net.sourceforge.plantuml.FileFormatOption
import net.sourceforge.plantuml.SourceStringReader
import org.springframework.stereotype.Component
import java.io.ByteArrayOutputStream

@Component
class PlantUmlRenderer {
    fun buildSource(spec: DiagramSpec): String =
        buildString {
            appendLine("@startuml")
            appendLine("!pragma layout smetana")
            appendLine("skinparam dpi 96")
            appendLine("skinparam classBackgroundColor white")
            appendLine("skinparam classBorderColor #555555")
            appendLine("skinparam class<<external>> {")
            appendLine("  borderStyle dashed")
            appendLine("}")
            spec.nodes.forEach { node -> appendLine(formatNode(node)) }
            spec.edges.forEach { e -> appendLine(formatEdge(e)) }
            append("@enduml")
        }

    fun render(spec: DiagramSpec): ByteArray {
        val source = buildSource(spec)
        val reader = SourceStringReader(source)
        val out = ByteArrayOutputStream()
        reader.outputImage(out, FileFormatOption(FileFormat.PNG))
        return out.toByteArray()
    }

    private fun formatNode(node: DiagramNode): String =
        if (node.external) {
            """class "${escape(node.displayName)}" as ${node.id} <<external>>"""
        } else {
            val st = node.stereotype?.let { "<<$it>>\\n" } ?: ""
            val cls = node.classId?.let { "$it\\n" } ?: ""
            """class "$st$cls${escape(node.displayName)}" as ${node.id}"""
        }

    private fun formatEdge(edge: DiagramEdge): String {
        val arrow = when (edge.kind) {
            RelationKind.EXTENDS -> "--|>"
            RelationKind.IMPLEMENTS -> "..|>"
        }
        return "${edge.fromId} $arrow ${edge.toId}"
    }

    private fun escape(text: String): String = text.replace("\"", "\\\"")
}
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
./gradlew :test --tests "com.toolhub.classdiagramgenerator.render.diagram.PlantUmlRendererTest"
```

기대: 2 PASS. PNG 생성 테스트가 느릴 수 있음(첫 호출 시 PlantUML 초기화 약 1~2초).

- [ ] **Step 5: 커밋**

```bash
git add class-diagram-generator/src/main/kotlin/com/toolhub/classdiagramgenerator/render/diagram/PlantUmlRenderer.kt \
        class-diagram-generator/src/test/kotlin/com/toolhub/classdiagramgenerator/render/diagram/PlantUmlRendererTest.kt
git commit -m "feat(class-diagram-generator): NEXT-03 - PlantUmlRenderer (Smetana, PNG, external dashed)"
```

---

## Task 7: `MermaidRenderer`

**Files:**
- Create: `class-diagram-generator/src/main/kotlin/com/toolhub/classdiagramgenerator/render/diagram/MermaidRenderer.kt`
- Create test: `class-diagram-generator/src/test/kotlin/com/toolhub/classdiagramgenerator/render/diagram/MermaidRendererTest.kt`

- [ ] **Step 1: 실패 테스트 작성**

```kotlin
package com.toolhub.classdiagramgenerator.render.diagram

import com.toolhub.classdiagramgenerator.domain.RelationKind
import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.string.shouldContain

class MermaidRendererTest :
    StringSpec({
        val renderer = MermaidRenderer()

        "render produces classDiagram body with stereotype, external dashed style, extends arrow" {
            val spec =
                DiagramSpec(
                    scope = DiagramScope.CLASS,
                    key = "class-CLS-0001",
                    title = "CLS-0001 UserService",
                    nodes =
                        listOf(
                            DiagramNode("CLS_0001", "CLS-0001", "Service", "UserService", false),
                            DiagramNode("EXT_abcdef", null, null, "BaseService", true),
                        ),
                    edges = listOf(DiagramEdge("CLS_0001", "EXT_abcdef", RelationKind.EXTENDS)),
                )
            val output = renderer.render(spec)
            output shouldContain "classDiagram"
            output shouldContain "«Service»"
            output shouldContain "CLS-0001"
            output shouldContain "UserService"
            output shouldContain "style EXT_abcdef stroke-dasharray"
            output shouldContain "CLS_0001 --|> EXT_abcdef"
        }
    })
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
./gradlew :test --tests "com.toolhub.classdiagramgenerator.render.diagram.MermaidRendererTest"
```

기대: 컴파일 에러.

- [ ] **Step 3: `MermaidRenderer.kt` 작성**

```kotlin
package com.toolhub.classdiagramgenerator.render.diagram

import com.toolhub.classdiagramgenerator.domain.RelationKind
import org.springframework.stereotype.Component

@Component
class MermaidRenderer {
    fun render(spec: DiagramSpec): String =
        buildString {
            appendLine("classDiagram")
            spec.nodes.forEach { node ->
                val label = labelOf(node)
                appendLine("    class ${node.id}[\"$label\"]")
                if (node.external) {
                    appendLine("    style ${node.id} stroke-dasharray: 5 5")
                }
            }
            spec.edges.forEach { edge ->
                val arrow = when (edge.kind) {
                    RelationKind.EXTENDS -> "--|>"
                    RelationKind.IMPLEMENTS -> "..|>"
                }
                val tag = edge.kind.name.lowercase()
                appendLine("    ${edge.fromId} $arrow ${edge.toId} : $tag")
            }
        }.trimEnd()

    private fun labelOf(node: DiagramNode): String {
        if (node.external) return escape(node.displayName)
        val parts = mutableListOf<String>()
        node.stereotype?.let { parts += "«$it»" }
        node.classId?.let { parts += it }
        parts += node.displayName
        return parts.joinToString("\\n") { escape(it) }
    }

    private fun escape(text: String): String = text.replace("\"", "\\\"")
}
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
./gradlew :test --tests "com.toolhub.classdiagramgenerator.render.diagram.MermaidRendererTest"
```

기대: 1 PASS.

- [ ] **Step 5: 커밋**

```bash
git add class-diagram-generator/src/main/kotlin/com/toolhub/classdiagramgenerator/render/diagram/MermaidRenderer.kt \
        class-diagram-generator/src/test/kotlin/com/toolhub/classdiagramgenerator/render/diagram/MermaidRendererTest.kt
git commit -m "feat(class-diagram-generator): NEXT-03 - MermaidRenderer"
```

---

## Task 8: `DiagramRenderer` (Stage 진입점, 병렬 PNG 렌더링)

**Files:**
- Create: `class-diagram-generator/src/main/kotlin/com/toolhub/classdiagramgenerator/render/diagram/DiagramRenderer.kt`
- Create test: `class-diagram-generator/src/test/kotlin/com/toolhub/classdiagramgenerator/render/diagram/DiagramRendererTest.kt`

- [ ] **Step 1: 실패 테스트 작성**

```kotlin
package com.toolhub.classdiagramgenerator.render.diagram

import com.toolhub.classdiagramgenerator.config.AppProperties
import com.toolhub.classdiagramgenerator.domain.AttributeInfo
import com.toolhub.classdiagramgenerator.domain.ClassInfo
import com.toolhub.classdiagramgenerator.domain.Layer
import com.toolhub.classdiagramgenerator.domain.Module
import com.toolhub.classdiagramgenerator.domain.OutputLanguage
import com.toolhub.classdiagramgenerator.domain.Program
import com.toolhub.classdiagramgenerator.domain.Relation
import com.toolhub.classdiagramgenerator.domain.RelationKind
import com.toolhub.classdiagramgenerator.domain.TypeRef
import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.booleans.shouldBeTrue
import io.kotest.matchers.shouldBe
import java.nio.file.Files
import java.nio.file.Path
import java.time.ZonedDateTime

class DiagramRendererTest :
    StringSpec({
        val props = defaultProps()
        val renderer = DiagramRenderer(DiagramSpecBuilder(), PlantUmlRenderer(), props)

        "EMPTY index when includeDiagrams=false" {
            val tmp = Files.createTempDirectory("diagram-test-")
            val idx = renderer.render(sampleProgram(), tmp, includeDiagrams = false)
            (idx === DiagramArtifactIndex.EMPTY).shouldBeTrue()
            Files.list(tmp).use { it.count() shouldBe 0L }
        }

        "renders PNGs to disk per module when includeDiagrams=true" {
            val tmp = Files.createTempDirectory("diagram-test-")
            val idx = renderer.render(sampleProgram(), tmp, includeDiagrams = true)
            val modulePath = tmp.resolve("core")
            Files.exists(modulePath).shouldBeTrue()
            (Files.list(modulePath).use { it.count() } > 0L).shouldBeTrue()
            idx.classDiagrams["core"]!!["CLS-0001"]!!.let { p ->
                Files.exists(p as Path).shouldBeTrue()
            }
        }
    })

private fun defaultProps(): AppProperties =
    AppProperties(
        workdir = java.nio.file.Paths.get(System.getProperty("java.io.tmpdir")),
        job = AppProperties.Job(),
        upload = AppProperties.Upload(),
        analysis = AppProperties.Analysis(),
        diagrams = AppProperties.Diagrams(),
    )

private fun sampleProgram(): Program =
    Program(
        name = "demo",
        version = "v1",
        language = OutputLanguage.KO,
        generatedAt = ZonedDateTime.now(),
        modules =
            listOf(
                Module(
                    name = "core",
                    classes =
                        listOf(
                            ClassInfo(
                                id = "CLS-0001",
                                name = "UserService",
                                layer = Layer.SERVICE,
                                description = "",
                                packagePath = "com.demo",
                                attributes = emptyList<AttributeInfo>(),
                                operations = emptyList(),
                            ),
                        ),
                    relations =
                        listOf(
                            Relation("CLS-0001", TypeRef("BaseService", "x.BaseService", true), RelationKind.EXTENDS),
                        ),
                ),
            ),
    )
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
./gradlew :test --tests "com.toolhub.classdiagramgenerator.render.diagram.DiagramRendererTest"
```

기대: 컴파일 에러.

- [ ] **Step 3: `DiagramRenderer.kt` 작성**

```kotlin
package com.toolhub.classdiagramgenerator.render.diagram

import com.toolhub.classdiagramgenerator.config.AppProperties
import com.toolhub.classdiagramgenerator.domain.Layer
import com.toolhub.classdiagramgenerator.domain.Module
import com.toolhub.classdiagramgenerator.domain.Program
import com.toolhub.classdiagramgenerator.domain.Warning
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Component
import java.nio.file.Files
import java.nio.file.Path
import java.util.concurrent.Callable
import java.util.concurrent.Executors

@Component
class DiagramRenderer(
    private val specBuilder: DiagramSpecBuilder,
    private val plantUml: PlantUmlRenderer,
    private val props: AppProperties,
) {
    private val log = LoggerFactory.getLogger(javaClass)

    fun render(
        program: Program,
        outputDir: Path,
        includeDiagrams: Boolean,
        onWarning: (Warning) -> Unit = {},
    ): DiagramArtifactIndex {
        if (!includeDiagrams) return DiagramArtifactIndex.EMPTY

        val parallelism = if (props.diagrams.parallelism > 0) props.diagrams.parallelism else Runtime.getRuntime().availableProcessors()
        val layerOut = mutableMapOf<String, MutableMap<Layer, Path?>>()
        val classOut = mutableMapOf<String, MutableMap<String, Path?>>()
        val specOut = mutableMapOf<String, MutableMap<String, DiagramSpec>>()

        program.modules.forEach { module ->
            val specs = specBuilder.build(module)
            if (specs.isEmpty()) return@forEach
            val moduleDir = outputDir.resolve(module.name).also { Files.createDirectories(it) }
            val layerMap = layerOut.getOrPut(module.name) { mutableMapOf() }
            val classMap = classOut.getOrPut(module.name) { mutableMapOf() }
            val specMap = specOut.getOrPut(module.name) { mutableMapOf() }

            renderSpecsParallel(specs, moduleDir, module.name, parallelism, onWarning).forEach { (spec, path) ->
                specMap[spec.key] = spec
                when (spec.scope) {
                    DiagramScope.LAYER -> if (spec.layer != null) layerMap[spec.layer] = path
                    DiagramScope.CLASS -> if (spec.classId != null) classMap[spec.classId] = path
                }
            }
        }
        return DiagramArtifactIndex(
            layerDiagrams = layerOut.mapValues { it.value.toMap() },
            classDiagrams = classOut.mapValues { it.value.toMap() },
            specs = specOut.mapValues { it.value.toMap() },
        )
    }

    private fun renderSpecsParallel(
        specs: List<DiagramSpec>,
        moduleDir: Path,
        moduleName: String,
        parallelism: Int,
        onWarning: (Warning) -> Unit,
    ): List<Pair<DiagramSpec, Path?>> {
        val pool = Executors.newWorkStealingPool(parallelism)
        try {
            val tasks = specs.map { spec ->
                Callable { spec to renderOne(spec, moduleDir, moduleName, onWarning) }
            }
            return pool.invokeAll(tasks).map { it.get() }
        } finally {
            pool.shutdown()
        }
    }

    @Suppress("TooGenericExceptionCaught")
    private fun renderOne(
        spec: DiagramSpec,
        moduleDir: Path,
        moduleName: String,
        onWarning: (Warning) -> Unit,
    ): Path? =
        try {
            val bytes = plantUml.render(spec)
            val file = moduleDir.resolve("${spec.key}.png")
            Files.write(file, bytes)
            file
        } catch (e: Exception) {
            log.warn("Diagram render failed: module={} key={}", moduleName, spec.key, e)
            onWarning(
                Warning(
                    code = "DIAGRAM_RENDER_FAILED",
                    message = "Diagram render failed: ${e.message}",
                    context = mapOf("module" to moduleName, "scope" to spec.scope.name, "key" to spec.key),
                ),
            )
            null
        }
}
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
./gradlew :test --tests "com.toolhub.classdiagramgenerator.render.diagram.DiagramRendererTest"
```

기대: 2 PASS.

- [ ] **Step 5: 커밋**

```bash
git add class-diagram-generator/src/main/kotlin/com/toolhub/classdiagramgenerator/render/diagram/DiagramRenderer.kt \
        class-diagram-generator/src/test/kotlin/com/toolhub/classdiagramgenerator/render/diagram/DiagramRendererTest.kt
git commit -m "feat(class-diagram-generator): NEXT-03 - DiagramRenderer (병렬 PNG 렌더링, includeDiagrams=false 시 EMPTY)"
```

---

## Task 9: `DocumentGenerator` 시그니처 변경 + 기존 호출자/테스트 영향 일괄 수정 + `JobRecord.includeDiagrams` + `JobOrchestrator` 파이프라인 통합

이번 task 는 인터페이스 변경이 광범위해서 한 번에 묶는다.

**Files:**
- Modify: `class-diagram-generator/src/main/kotlin/com/toolhub/classdiagramgenerator/render/DocumentGenerator.kt`
- Modify: `class-diagram-generator/src/main/kotlin/com/toolhub/classdiagramgenerator/render/DocxGenerator.kt` (시그니처만 — 본문 임베드는 Task 10)
- Modify: `class-diagram-generator/src/main/kotlin/com/toolhub/classdiagramgenerator/render/XlsxGenerator.kt` (시그니처만 — Task 11)
- Modify: `class-diagram-generator/src/main/kotlin/com/toolhub/classdiagramgenerator/render/MarkdownGenerator.kt` (시그니처만 — Task 12)
- Modify: `class-diagram-generator/src/test/kotlin/com/toolhub/classdiagramgenerator/render/DocxGeneratorTest.kt`
- Modify: `class-diagram-generator/src/test/kotlin/com/toolhub/classdiagramgenerator/render/XlsxGeneratorTest.kt`
- Modify: `class-diagram-generator/src/test/kotlin/com/toolhub/classdiagramgenerator/render/MarkdownGeneratorTest.kt`
- Modify: `class-diagram-generator/src/main/kotlin/com/toolhub/classdiagramgenerator/job/JobStore.kt`
- Modify: `class-diagram-generator/src/main/kotlin/com/toolhub/classdiagramgenerator/job/JobService.kt`
- Modify: `class-diagram-generator/src/main/kotlin/com/toolhub/classdiagramgenerator/job/JobOrchestrator.kt`
- Modify: `class-diagram-generator/src/main/kotlin/com/toolhub/classdiagramgenerator/storage/OutputStorage.kt` (diagrams 디렉터리 추가)
- Modify: `class-diagram-generator/src/test/kotlin/com/toolhub/classdiagramgenerator/job/JobOrchestratorTest.kt`

- [ ] **Step 1: `DocumentGenerator` 인터페이스 변경**

`render/DocumentGenerator.kt` 전체를 다음으로 교체:

```kotlin
package com.toolhub.classdiagramgenerator.render

import com.toolhub.classdiagramgenerator.domain.Module
import com.toolhub.classdiagramgenerator.domain.Program
import com.toolhub.classdiagramgenerator.render.diagram.DiagramArtifactIndex
import java.io.OutputStream

interface DocumentGenerator {
    val format: String

    fun render(
        program: Program,
        module: Module,
        diagrams: DiagramArtifactIndex,
        out: OutputStream,
    )
}
```

- [ ] **Step 2: 세 generator 시그니처 변경 (본문 변경은 다음 task 들로 미룸)**

`DocxGenerator.kt` 의 `render(program, module, out)` 시그니처(현재 줄 22-26)를 다음으로 교체. 본문은 그대로 유지:

```kotlin
    override fun render(
        program: Program,
        module: Module,
        diagrams: DiagramArtifactIndex,
        out: OutputStream,
    ) {
```

(파일 상단에 `import com.toolhub.classdiagramgenerator.render.diagram.DiagramArtifactIndex` 추가)

`XlsxGenerator.kt` 와 `MarkdownGenerator.kt` 도 같은 패턴으로 시그니처에 `diagrams: DiagramArtifactIndex,` 추가 + import 추가.

- [ ] **Step 3: 세 generator 테스트의 `gen.render(...)` 호출 수정**

`DocxGeneratorTest.kt`, `XlsxGeneratorTest.kt`, `MarkdownGeneratorTest.kt` 에서 `gen.render(program, program.modules[0], out)` 를 `gen.render(program, program.modules[0], DiagramArtifactIndex.EMPTY, out)` 로 변경.

각 파일 상단에 `import com.toolhub.classdiagramgenerator.render.diagram.DiagramArtifactIndex` 추가.

- [ ] **Step 4: `JobRecord` 에 `includeDiagrams` 필드 추가**

`job/JobStore.kt` 의 `JobRecord` 데이터 클래스(현재 줄 21-34) 를 다음으로 교체:

```kotlin
data class JobRecord(
    val id: UUID,
    val programName: String,
    val version: String,
    val language: OutputLanguage,
    val formats: List<String>,
    val includeDiagrams: Boolean,
    var status: JobStatus,
    val workDir: Path,
    var expiresAt: Instant? = null,
    val artifacts: MutableList<ArtifactRecord> = mutableListOf(),
    val warnings: MutableList<Warning> = mutableListOf(),
    var errorCode: String? = null,
    var errorMessage: String? = null,
)
```

- [ ] **Step 5: `JobService.submit` 시그니처에 `includeDiagrams` 추가**

`job/JobService.kt` 의 `submit` 함수 전체를 다음으로 교체:

```kotlin
    fun submit(
        programName: String,
        version: String,
        language: OutputLanguage,
        formats: List<String>,
        includeDiagrams: Boolean,
        file: MultipartFile,
    ): JobRecord {
        require(formats.isNotEmpty()) { "formats must not be empty" }
        val id = UUID.randomUUID()
        val workDir = storage.jobDir(id).createDirectories()
        storage.inputDir(id).createDirectories()
        storage.outputDir(id).createDirectories()
        val record =
            JobRecord(
                id = id,
                programName = programName,
                version = version,
                language = language,
                formats = formats,
                includeDiagrams = includeDiagrams,
                status = JobStatus.PENDING,
                workDir = workDir,
            )
        store.create(record)
        val bytes = file.bytes
        executor.submit {
            orchestrator.run(record, bytes)
        }
        return record
    }
```

- [ ] **Step 6: `OutputStorage` 에 `diagramsDir` 메서드 추가**

`storage/OutputStorage.kt` 를 읽어 기존 `inputDir(id)` / `outputDir(id)` 패턴을 확인하고, 같은 패턴으로 `diagramsDir(id: UUID): Path = jobDir(id).resolve("diagrams")` 를 추가한다.

```bash
cat class-diagram-generator/src/main/kotlin/com/toolhub/classdiagramgenerator/storage/OutputStorage.kt
```

해당 클래스에 다음 메서드 추가 (기존 `inputDir`/`outputDir` 아래):

```kotlin
    fun diagramsDir(id: UUID): Path = jobDir(id).resolve("diagrams")
```

- [ ] **Step 7: `JobOrchestrator` — 신규 두 단계 호출 + percent 재분배 + diagrams 전달**

`job/JobOrchestrator.kt` 의 주요 메서드들을 다음과 같이 수정. 전체 파일에서 다음 부분들을 차례로 교체:

(a) 생성자에 `RelationExtractor`, `DiagramRenderer` 주입 — 클래스 선언부:

```kotlin
@Component
@Suppress("LongParameterList", "TooManyFunctions")
class JobOrchestrator(
    private val zipExtractor: ZipExtractor,
    private val projectDetector: ProjectDetector,
    private val analyzer: JavaSourceAnalyzer,
    private val classifier: LayerClassifier,
    private val idAssigner: ClassIdAssigner,
    private val relationExtractor: RelationExtractor,
    private val diagramRenderer: DiagramRenderer,
    private val generators: List<DocumentGenerator>,
    private val storage: OutputStorage,
    private val bus: ProgressBus,
    private val props: AppProperties,
) {
```

(필요한 import 추가: `com.toolhub.classdiagramgenerator.analyzer.RelationExtractor`, `com.toolhub.classdiagramgenerator.render.diagram.DiagramRenderer`, `com.toolhub.classdiagramgenerator.render.diagram.DiagramArtifactIndex`, `com.toolhub.classdiagramgenerator.analyzer.ParsedType`는 이미 있음)

(b) `executePipeline` 메서드 — `ASSIGNING_IDS` 와 `renderAll` 사이에 두 신규 단계 호출 삽입. 또한 모듈별 ParsedType 을 잊지 말고 RelationExtractor 로 넘기기 위해 `parsedModules` 를 보존. 다음으로 교체:

```kotlin
    private fun executePipeline(
        record: JobRecord,
        zipBytes: ByteArray,
    ) {
        record.status = JobStatus.RUNNING
        val inputDir = storage.inputDir(record.id)

        stage(record, Stage.EXTRACTING, PCT_EXTRACT)
        zipExtractor.extract(ByteArrayInputStream(zipBytes), inputDir)

        stage(record, Stage.DETECTING_MODULES, PCT_DETECT)
        val modules = projectDetector.detect(inputDir, fallbackName = record.programName)

        stage(record, Stage.PARSING, PCT_PARSE)
        val parsedModules = parseAll(record, modules)

        stage(record, Stage.CLASSIFYING, PCT_CLASSIFY)
        val classifiedModules = parsedModules.map { (md, types) -> classifyModule(md, types) }

        stage(record, Stage.ASSIGNING_IDS, PCT_ASSIGN)
        val withIds = classifiedModules.map { m -> m.copy(classes = idAssigner.assign(m.classes)) }

        stage(record, Stage.EXTRACTING_RELATIONS, PCT_RELATIONS)
        val finalModules = attachRelations(record, parsedModules, withIds)

        val program =
            Program(
                name = record.programName,
                version = record.version,
                language = record.language,
                generatedAt = ZonedDateTime.now(),
                modules = finalModules,
                warnings = record.warnings.toList(),
            )

        stage(record, Stage.RENDERING_DIAGRAMS, PCT_DIAGRAMS)
        val diagrams =
            diagramRenderer.render(
                program = program,
                outputDir = storage.diagramsDir(record.id).also { kotlin.io.path.createDirectories(it) },
                includeDiagrams = record.includeDiagrams,
                onWarning = { addWarning(record, it) },
            )

        renderAll(record, program, diagrams)

        stage(record, Stage.PACKAGING, PCT_PACK)
        record.expiresAt = Instant.now().plusSeconds(props.job.ttlMinutes * SECONDS_PER_MINUTE)
        record.status = JobStatus.DONE
        bus.publish(
            record.id,
            "done",
            mapOf(
                "resultUrl" to "/api/v1/jobs/${record.id}/result",
                "expiresAt" to record.expiresAt.toString(),
            ),
        )
        bus.complete(record.id)
    }

    private fun attachRelations(
        record: JobRecord,
        parsedModules: List<Pair<com.toolhub.classdiagramgenerator.input.ModuleDescriptor, List<ParsedType>>>,
        modules: List<Module>,
    ): List<Module> {
        val byName = parsedModules.associate { (md, types) -> md.name to types }
        return modules.map { m ->
            val parsed = byName[m.name] ?: return@map m
            val result = relationExtractor.extract(parsed, m.classes)
            result.warnings.forEach { addWarning(record, it) }
            m.copy(relations = result.relations)
        }
    }
```

(c) `renderAll` 및 `renderFormat` 시그니처에 `diagrams: DiagramArtifactIndex` 전달:

```kotlin
    private fun renderAll(
        record: JobRecord,
        program: Program,
        diagrams: DiagramArtifactIndex,
    ) {
        val sequence =
            listOf(
                "docx" to Stage.RENDERING_DOCX,
                "xlsx" to Stage.RENDERING_XLSX,
                "md" to Stage.RENDERING_MD,
            ).filter { it.first in record.formats }
        val per = (PCT_PACK - PCT_RENDER_BASE) / sequence.size.coerceAtLeast(1)
        sequence.forEachIndexed { idx, (format, st) ->
            stage(record, st, PCT_RENDER_BASE + per * idx)
            renderFormat(record, program, format, diagrams)
        }
    }

    private fun renderFormat(
        record: JobRecord,
        program: Program,
        format: String,
        diagrams: DiagramArtifactIndex,
    ) {
        val gen = generators.first { it.format == format }
        val outDir = storage.outputDir(record.id)
        program.modules.forEach { module ->
            val moduleToken = if (program.modules.size == 1) null else module.name
            val filename = buildFilename(record, moduleToken, format)
            val target = outDir.resolve(filename)
            target.outputStream().use { gen.render(program, module, diagrams, it) }
            record.artifacts +=
                ArtifactRecord(
                    module = module.name,
                    format = format,
                    filename = filename,
                    path = target,
                    sizeBytes = target.fileSize(),
                )
        }
    }
```

(d) `companion object` 내부 percent 상수 재분배:

```kotlin
    companion object {
        private const val PCT_EXTRACT = 5
        private const val PCT_DETECT = 15
        private const val PCT_PARSE = 30
        private const val PCT_CLASSIFY = 50
        private const val PCT_ASSIGN = 58
        private const val PCT_RELATIONS = 62
        private const val PCT_DIAGRAMS = 70
        private const val PCT_RENDER_BASE = 75
        private const val PCT_PACK = 95
        private const val SECONDS_PER_MINUTE = 60L
    }
```

- [ ] **Step 8: `JobOrchestratorTest` 및 모든 `JobService.submit` 호출처 수정**

```bash
cat class-diagram-generator/src/test/kotlin/com/toolhub/classdiagramgenerator/job/JobOrchestratorTest.kt | head -80
grep -rn "service.submit\|jobService.submit" class-diagram-generator/src/test
```

`JobOrchestrator(...)` 생성자 호출이 있다면 새 인자(`RelationExtractor`, `DiagramRenderer`)를 mock 또는 실제 인스턴스로 채워야 한다.

추가로 명시적으로 다음 호출처 모두에 `includeDiagrams = true` 인자를 추가:

- `class-diagram-generator/src/test/kotlin/com/toolhub/classdiagramgenerator/EndToEndTest.kt` 의 `service.submit(...)` 호출 (현재 줄 25-32)
- `JobControllerTest`, `JobOrchestratorTest` 등에서 `JobService.submit` 또는 모킹 stub 의 인자 매칭부.

예시 (EndToEndTest 의 service.submit 호출을 다음과 같이 교체):

```kotlin
            val rec =
                service.submit(
                    programName = "demo",
                    version = "v1.0",
                    language = OutputLanguage.EN,
                    formats = listOf("docx", "xlsx", "md"),
                    includeDiagrams = true,
                    file = MockMultipartFile("file", "m.zip", "application/zip", bytes),
                )
```

- [ ] **Step 9: 컴파일 + 기존 모든 테스트 통과 확인**

```bash
./gradlew :test
```

기대: 신규/기존 모든 테스트 PASS. 시그니처 변경으로 인한 컴파일 에러가 더 이상 없어야 한다.

- [ ] **Step 10: 커밋**

```bash
git add class-diagram-generator/src/main/kotlin/com/toolhub/classdiagramgenerator/render/DocumentGenerator.kt \
        class-diagram-generator/src/main/kotlin/com/toolhub/classdiagramgenerator/render/DocxGenerator.kt \
        class-diagram-generator/src/main/kotlin/com/toolhub/classdiagramgenerator/render/XlsxGenerator.kt \
        class-diagram-generator/src/main/kotlin/com/toolhub/classdiagramgenerator/render/MarkdownGenerator.kt \
        class-diagram-generator/src/main/kotlin/com/toolhub/classdiagramgenerator/storage/OutputStorage.kt \
        class-diagram-generator/src/main/kotlin/com/toolhub/classdiagramgenerator/job/JobStore.kt \
        class-diagram-generator/src/main/kotlin/com/toolhub/classdiagramgenerator/job/JobService.kt \
        class-diagram-generator/src/main/kotlin/com/toolhub/classdiagramgenerator/job/JobOrchestrator.kt \
        class-diagram-generator/src/test/kotlin/com/toolhub/classdiagramgenerator/render/DocxGeneratorTest.kt \
        class-diagram-generator/src/test/kotlin/com/toolhub/classdiagramgenerator/render/XlsxGeneratorTest.kt \
        class-diagram-generator/src/test/kotlin/com/toolhub/classdiagramgenerator/render/MarkdownGeneratorTest.kt \
        class-diagram-generator/src/test/kotlin/com/toolhub/classdiagramgenerator/job/JobOrchestratorTest.kt
git commit -m "feat(class-diagram-generator): NEXT-03 파이프라인 통합 - JobOrchestrator 에 EXTRACTING_RELATIONS/RENDERING_DIAGRAMS 추가, generator 시그니처 변경"
```

---

## Task 10: `DocxGenerator` 다이어그램 임베드

**Files:**
- Modify: `class-diagram-generator/src/main/kotlin/com/toolhub/classdiagramgenerator/render/DocxGenerator.kt`
- Modify: `class-diagram-generator/src/test/kotlin/com/toolhub/classdiagramgenerator/render/DocxGeneratorTest.kt`

- [ ] **Step 1: 실패 테스트 추가**

`DocxGeneratorTest.kt` 의 기존 케이스 뒤에 다음 케이스 추가 (`StringSpec({` 블록 안):

```kotlin
        "docx embeds layer diagram PNGs and class diagram PNGs when index has paths" {
            val tmp = kotlin.io.path.createTempFile(prefix = "layer-controller", suffix = ".png")
            tmp.toFile().writeBytes(minimalPng())
            val classTmp = kotlin.io.path.createTempFile(prefix = "class-CLS-0001", suffix = ".png")
            classTmp.toFile().writeBytes(minimalPng())
            val idx =
                com.toolhub.classdiagramgenerator.render.diagram.DiagramArtifactIndex(
                    layerDiagrams = mapOf("core" to mapOf(com.toolhub.classdiagramgenerator.domain.Layer.CONTROLLER to tmp)),
                    classDiagrams = mapOf("core" to mapOf("CLS-0001" to classTmp)),
                    specs = emptyMap(),
                )
            val out = ByteArrayOutputStream()
            gen.render(program, program.modules[0], idx, out)
            XWPFDocument(ByteArrayInputStream(out.toByteArray())).use { doc ->
                doc.allPictures.size shouldBe 2
            }
        }
```

상단 import 추가:
```kotlin
import io.kotest.matchers.shouldBe
```

테스트 파일 하단(클래스 닫는 `})` 뒤)에 PNG 헬퍼:

```kotlin
private fun minimalPng(): ByteArray {
    val resource = DocxGeneratorTest::class.java.classLoader.getResourceAsStream("fixtures/diagram/minimal.png")
    require(resource != null) { "Place a minimal valid PNG at src/test/resources/fixtures/diagram/minimal.png" }
    return resource.readBytes()
}
```

`class-diagram-generator/src/test/resources/fixtures/diagram/minimal.png` 에 1×1 투명 PNG 를 미리 배치 (다음 step 참조).

- [ ] **Step 2: 최소 PNG fixture 생성**

```bash
mkdir -p class-diagram-generator/src/test/resources/fixtures/diagram
printf '\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\rIDATx\x9cc\xfc\xff\xff?\x00\x05\xfe\x02\xfe\xa75\x81\x84\x00\x00\x00\x00IEND\xaeB`\x82' > class-diagram-generator/src/test/resources/fixtures/diagram/minimal.png
file class-diagram-generator/src/test/resources/fixtures/diagram/minimal.png
```

기대: `PNG image data, 1 x 1, ...` 가 출력된다. 출력이 아니면 다음 명령으로 Python 으로 만든다:

```bash
python3 -c "import struct,zlib;import sys;sig=b'\\x89PNG\\r\\n\\x1a\\n';ihdr=struct.pack('>IIBBBBB',1,1,8,6,0,0,0);ihdr_chunk=b'IHDR'+ihdr;ihdr_full=struct.pack('>I',len(ihdr))+ihdr_chunk+struct.pack('>I',zlib.crc32(ihdr_chunk));raw=b'\\x00\\x00\\x00\\x00\\x00';idat=zlib.compress(raw);idat_chunk=b'IDAT'+idat;idat_full=struct.pack('>I',len(idat))+idat_chunk+struct.pack('>I',zlib.crc32(idat_chunk));iend_chunk=b'IEND';iend_full=struct.pack('>I',0)+iend_chunk+struct.pack('>I',zlib.crc32(iend_chunk));sys.stdout.buffer.write(sig+ihdr_full+idat_full+iend_full)" > class-diagram-generator/src/test/resources/fixtures/diagram/minimal.png
file class-diagram-generator/src/test/resources/fixtures/diagram/minimal.png
```

- [ ] **Step 3: 테스트 실패 확인**

```bash
./gradlew :test --tests "com.toolhub.classdiagramgenerator.render.DocxGeneratorTest"
```

기대: 새 케이스 FAIL (현재 `doc.allPictures.size == 0`).

- [ ] **Step 4: `DocxGenerator` 본문 수정**

`DocxGenerator.kt` 전체를 다음과 같이 수정:

(a) 생성자 직후, 기존 `private val font = "맑은 고딕"` 위에 import 추가:

```kotlin
import com.toolhub.classdiagramgenerator.render.diagram.DiagramArtifactIndex
import org.apache.poi.xwpf.usermodel.Document
import org.apache.poi.util.Units
import javax.imageio.ImageIO
import java.nio.file.Files
import java.nio.file.Path
```

(b) `render(...)` 메서드를 다음으로 교체 (계층 다이어그램 섹션을 클래스 리스트 앞에 추가):

```kotlin
    override fun render(
        program: Program,
        module: Module,
        diagrams: DiagramArtifactIndex,
        out: OutputStream,
    ) {
        val labels = OutputLabels.of(program.language)
        XWPFDocument().use { doc ->
            renderCover(doc, program, module, labels)
            renderLayerDiagrams(doc, module, diagrams, labels)
            renderClassList(doc, module, labels)
            renderClassDesign(doc, module, diagrams, labels)
            doc.write(out)
        }
    }
```

(c) 신규 메서드 두 개 추가 (`renderClassList` 위, `renderCover` 다음 위치):

```kotlin
    private fun renderLayerDiagrams(
        doc: XWPFDocument,
        module: Module,
        diagrams: DiagramArtifactIndex,
        labels: LabelDictionary,
    ) {
        val map = diagrams.layerDiagrams[module.name] ?: return
        if (map.values.filterNotNull().isEmpty()) return
        heading(doc, labels["doc.title.layerDiagrams"])
        com.toolhub.classdiagramgenerator.domain.Layer.entries.forEach { layer ->
            val path = map[layer] ?: return@forEach
            subHeading(doc, labels["layer.${layer.name.lowercase()}"])
            insertImage(doc, path)
        }
        doc.createParagraph().createRun().addBreak()
    }

    private fun renderClassDiagram(
        doc: XWPFDocument,
        module: Module,
        classId: String,
        diagrams: DiagramArtifactIndex,
    ) {
        val path = diagrams.classDiagrams[module.name]?.get(classId) ?: return
        insertImage(doc, path)
    }

    private fun insertImage(
        doc: XWPFDocument,
        path: Path,
    ) {
        val bytes = Files.readAllBytes(path)
        val image = ImageIO.read(java.io.ByteArrayInputStream(bytes))
        val maxWidthEmu = MAX_WIDTH_EMU
        val pxToEmu = Units.EMU_PER_PIXEL.toLong()
        val origWidth = image.width.toLong() * pxToEmu
        val origHeight = image.height.toLong() * pxToEmu
        val (w, h) =
            if (origWidth > maxWidthEmu) {
                val ratio = maxWidthEmu.toDouble() / origWidth
                maxWidthEmu to (origHeight * ratio).toLong()
            } else {
                origWidth to origHeight
            }
        val para = doc.createParagraph()
        val run = para.createRun()
        java.io.ByteArrayInputStream(bytes).use { input ->
            run.addPicture(input, Document.PICTURE_TYPE_PNG, path.fileName.toString(), w.toInt(), h.toInt())
        }
    }

    private fun subHeading(
        doc: XWPFDocument,
        text: String,
    ) {
        val p = doc.createParagraph()
        p.createRun().apply {
            fontFamily = font
            isBold = true
            fontSize = SUBHEADING_FONT_SIZE
            setText(text)
        }
    }
```

(d) `renderClassDesign` 메서드 시그니처와 본문 수정 — `diagrams` 받아서 헤더 표 다음에 클래스 다이어그램 삽입:

```kotlin
    private fun renderClassDesign(
        doc: XWPFDocument,
        module: Module,
        diagrams: DiagramArtifactIndex,
        labels: LabelDictionary,
    ) {
        heading(doc, labels["doc.title.classDesign"])
        module.classes.forEach { c ->
            renderClassHeader(doc, c, labels)
            renderClassDiagram(doc, module, c.id, diagrams)
            renderAttributesTable(doc, c, labels)
            renderOperationsTable(doc, c, labels)
            doc.createParagraph().createRun().addBreak()
        }
    }
```

(e) `companion object` 에 상수 추가:

```kotlin
    companion object {
        private const val TITLE_FONT_SIZE = 24
        private const val HEADING_FONT_SIZE = 16
        private const val SUBHEADING_FONT_SIZE = 12
        private const val BODY_FONT_SIZE = 10
        private const val MAX_WIDTH_EMU = 5_715_000L
    }
```

- [ ] **Step 5: 테스트 통과 확인**

```bash
./gradlew :test --tests "com.toolhub.classdiagramgenerator.render.DocxGeneratorTest"
```

기대: 신규 + 기존 모두 PASS.

- [ ] **Step 6: 커밋**

```bash
git add class-diagram-generator/src/main/kotlin/com/toolhub/classdiagramgenerator/render/DocxGenerator.kt \
        class-diagram-generator/src/test/kotlin/com/toolhub/classdiagramgenerator/render/DocxGeneratorTest.kt \
        class-diagram-generator/src/test/resources/fixtures/diagram/minimal.png
git commit -m "feat(class-diagram-generator): NEXT-03 - DocxGenerator 에 계층/클래스 다이어그램 PNG 임베드"
```

---

## Task 11: `XlsxGenerator` 다이어그램 임베드 + `layerDiagrams` 시트 추가

**Files:**
- Modify: `class-diagram-generator/src/main/kotlin/com/toolhub/classdiagramgenerator/render/XlsxGenerator.kt`
- Modify: `class-diagram-generator/src/test/kotlin/com/toolhub/classdiagramgenerator/render/XlsxGeneratorTest.kt`

- [ ] **Step 1: 실패 테스트 추가**

`XlsxGeneratorTest.kt` 의 기존 케이스 뒤에 다음 케이스 추가:

```kotlin
        "xlsx adds layerDiagrams sheet and embeds class diagram pictures when index has paths" {
            val tmp = kotlin.io.path.createTempFile(prefix = "layer", suffix = ".png")
            tmp.toFile().writeBytes(minimalPngBytes())
            val classTmp = kotlin.io.path.createTempFile(prefix = "class", suffix = ".png")
            classTmp.toFile().writeBytes(minimalPngBytes())
            val idx =
                com.toolhub.classdiagramgenerator.render.diagram.DiagramArtifactIndex(
                    layerDiagrams =
                        mapOf("core" to mapOf(com.toolhub.classdiagramgenerator.domain.Layer.SERVICE to tmp)),
                    classDiagrams = mapOf("core" to mapOf("CLS-0001" to classTmp)),
                    specs = emptyMap(),
                )
            val out = ByteArrayOutputStream()
            gen.render(program, program.modules[0], idx, out)
            org.apache.poi.xssf.usermodel.XSSFWorkbook(ByteArrayInputStream(out.toByteArray())).use { wb ->
                wb.getSheet("계층 다이어그램") shouldNotBe null
                wb.allPictures.size shouldBeGreaterThanOrEqual 2
            }
        }
```

상단 import 추가:
```kotlin
import io.kotest.matchers.shouldNotBe
import io.kotest.matchers.ints.shouldBeGreaterThanOrEqual
```

테스트 파일 끝(클래스 닫는 `})` 뒤)에 PNG 헬퍼 (Task 10 의 헬퍼와 동일):

```kotlin
private fun minimalPngBytes(): ByteArray =
    XlsxGeneratorTest::class.java.classLoader
        .getResourceAsStream("fixtures/diagram/minimal.png")!!
        .readBytes()
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
./gradlew :test --tests "com.toolhub.classdiagramgenerator.render.XlsxGeneratorTest"
```

기대: 새 케이스 FAIL.

- [ ] **Step 3: `XlsxGenerator` 본문 수정**

`XlsxGenerator.kt` 상단 import 추가:

```kotlin
import com.toolhub.classdiagramgenerator.domain.Layer
import com.toolhub.classdiagramgenerator.render.diagram.DiagramArtifactIndex
import org.apache.poi.ss.usermodel.ClientAnchor
import org.apache.poi.ss.usermodel.Drawing
import org.apache.poi.xssf.usermodel.XSSFClientAnchor
import java.nio.file.Files
import java.nio.file.Path
```

`render` 메서드 본문을 다음으로 교체 (시트 순서: cover, classList, layerDiagrams, classDesign):

```kotlin
    override fun render(
        program: Program,
        module: Module,
        diagrams: DiagramArtifactIndex,
        out: OutputStream,
    ) {
        val labels = OutputLabels.of(program.language)
        XSSFWorkbook().use { wb ->
            val header = headerStyle(wb)
            val body = bodyStyle(wb)
            renderCover(wb.createSheet(labels["sheet.cover"]), program, module, labels, body)
            renderClassList(wb.createSheet(labels["sheet.classList"]), module, labels, header, body)
            renderLayerDiagramsSheet(wb, module, diagrams, labels, header)
            renderClassDesign(wb.createSheet(labels["sheet.classDesign"]), module, diagrams, labels, header, body)
            wb.write(out)
        }
    }
```

신규 메서드 추가:

```kotlin
    private fun renderLayerDiagramsSheet(
        wb: XSSFWorkbook,
        module: Module,
        diagrams: DiagramArtifactIndex,
        labels: LabelDictionary,
        header: CellStyle,
    ) {
        val map = diagrams.layerDiagrams[module.name] ?: return
        if (map.values.filterNotNull().isEmpty()) return
        val sheet = wb.createSheet(labels["sheet.layerDiagrams"])
        val drawing: Drawing<*> = sheet.createDrawingPatriarch()
        var row = 0
        Layer.entries.forEach { layer ->
            val path = map[layer] ?: return@forEach
            writeRow(sheet, row, listOf(labels["layer.${layer.name.lowercase()}"]), header)
            row += 1
            row = embedImage(wb, sheet, drawing, path, anchorCol = 0, anchorRow = row) + ROW_PAD
        }
    }

    private fun renderClassDesign(
        sheet: Sheet,
        module: Module,
        diagrams: DiagramArtifactIndex,
        labels: LabelDictionary,
        header: CellStyle,
        body: CellStyle,
    ) {
        val wb = sheet.workbook as XSSFWorkbook
        val drawing: Drawing<*> = sheet.createDrawingPatriarch()
        var row = 0
        module.classes.forEach { c ->
            row = writeClassBlock(sheet, row, c, labels, header, body)
            val path = diagrams.classDiagrams[module.name]?.get(c.id)
            if (path != null) {
                row = embedImage(wb, sheet, drawing, path, anchorCol = 0, anchorRow = row + 1) + ROW_PAD
            } else {
                row++
            }
        }
        sheet.createFreezePane(0, 1)
        repeat(MAX_HEADER_COLS) { sheet.setColumnWidth(it, COL_WIDTH_DATA) }
    }

    private fun embedImage(
        wb: XSSFWorkbook,
        sheet: Sheet,
        drawing: Drawing<*>,
        path: Path,
        anchorCol: Int,
        anchorRow: Int,
    ): Int {
        val bytes = Files.readAllBytes(path)
        val pictureIdx = wb.addPicture(bytes, Workbook.PICTURE_TYPE_PNG)
        val anchor: ClientAnchor =
            XSSFClientAnchor().apply {
                col1 = anchorCol
                row1 = anchorRow
            }
        val picture = drawing.createPicture(anchor, pictureIdx)
        picture.resize(PIC_SCALE)
        return picture.preferredSize.row2
    }
```

`companion object` 에 상수 추가:

```kotlin
        private const val ROW_PAD = 2
        private const val PIC_SCALE = 0.5
```

`renderClassDesign(sheet=…)` 호출이 한 군데에서만 일어나는지 확인하고 — 이제 시그니처가 바뀌어 위 신규 메서드가 그 자리를 차지하므로 기존 동명 함수는 위 신규 본문으로 완전 교체된다.

- [ ] **Step 4: 테스트 통과 확인**

```bash
./gradlew :test --tests "com.toolhub.classdiagramgenerator.render.XlsxGeneratorTest"
```

기대: 모든 케이스 PASS.

- [ ] **Step 5: 커밋**

```bash
git add class-diagram-generator/src/main/kotlin/com/toolhub/classdiagramgenerator/render/XlsxGenerator.kt \
        class-diagram-generator/src/test/kotlin/com/toolhub/classdiagramgenerator/render/XlsxGeneratorTest.kt
git commit -m "feat(class-diagram-generator): NEXT-03 - XlsxGenerator 에 layerDiagrams 시트 + classDesign 이미지 임베드"
```

---

## Task 12: `MarkdownGenerator` Mermaid 코드 블록 삽입

**Files:**
- Modify: `class-diagram-generator/src/main/kotlin/com/toolhub/classdiagramgenerator/render/MarkdownGenerator.kt`
- Modify: `class-diagram-generator/src/test/kotlin/com/toolhub/classdiagramgenerator/render/MarkdownGeneratorTest.kt`

- [ ] **Step 1: 실패 테스트 추가**

`MarkdownGeneratorTest.kt` 끝에 다음 케이스 추가:

```kotlin
        "md embeds mermaid code fences for layer and class scopes from specs" {
            val spec =
                com.toolhub.classdiagramgenerator.render.diagram.DiagramSpec(
                    scope = com.toolhub.classdiagramgenerator.render.diagram.DiagramScope.CLASS,
                    key = "class-CLS-0001",
                    title = "CLS-0001 UserService",
                    nodes =
                        listOf(
                            com.toolhub.classdiagramgenerator.render.diagram.DiagramNode(
                                "CLS_0001", "CLS-0001", "Service", "UserService", false,
                            ),
                        ),
                    edges = emptyList(),
                    classId = "CLS-0001",
                )
            val idx =
                com.toolhub.classdiagramgenerator.render.diagram.DiagramArtifactIndex(
                    layerDiagrams = emptyMap(),
                    classDiagrams = emptyMap(),
                    specs = mapOf("core" to mapOf("class-CLS-0001" to spec)),
                )
            val out = ByteArrayOutputStream()
            gen.render(program, program.modules[0], idx, out)
            val text = out.toString(Charsets.UTF_8)
            text shouldContain "```mermaid"
            text shouldContain "classDiagram"
            text shouldContain "CLS-0001"
        }
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
./gradlew :test --tests "com.toolhub.classdiagramgenerator.render.MarkdownGeneratorTest"
```

기대: 새 케이스 FAIL.

- [ ] **Step 3: `MarkdownGenerator` 수정**

```kotlin
package com.toolhub.classdiagramgenerator.render

import com.toolhub.classdiagramgenerator.domain.ClassInfo
import com.toolhub.classdiagramgenerator.domain.Layer
import com.toolhub.classdiagramgenerator.domain.LabelDictionary
import com.toolhub.classdiagramgenerator.domain.Module
import com.toolhub.classdiagramgenerator.domain.OutputLabels
import com.toolhub.classdiagramgenerator.domain.Program
import com.toolhub.classdiagramgenerator.render.diagram.DiagramArtifactIndex
import com.toolhub.classdiagramgenerator.render.diagram.MermaidRenderer
import org.springframework.stereotype.Component
import java.io.OutputStream
import java.io.PrintWriter
import java.time.format.DateTimeFormatter

@Component
class MarkdownGenerator(
    private val mermaid: MermaidRenderer,
) : DocumentGenerator {
    override val format = "md"

    override fun render(
        program: Program,
        module: Module,
        diagrams: DiagramArtifactIndex,
        out: OutputStream,
    ) {
        val labels = OutputLabels.of(program.language)
        PrintWriter(out.writer(Charsets.UTF_8)).use { w ->
            renderCover(w, program, module, labels)
            renderLayerDiagrams(w, module, diagrams, labels)
            renderClassList(w, module, labels)
            renderClassDesign(w, module, diagrams, labels)
            w.flush()
        }
    }

    // ... renderCover / renderClassList 기존 본문 유지 ...

    private fun renderLayerDiagrams(
        w: PrintWriter,
        module: Module,
        diagrams: DiagramArtifactIndex,
        labels: LabelDictionary,
    ) {
        val specs = diagrams.specs[module.name] ?: return
        val layerSpecs = Layer.entries.mapNotNull { l -> specs["layer-${l.name.lowercase()}"]?.let { l to it } }
        if (layerSpecs.isEmpty()) return
        w.println("## ${labels["doc.title.layerDiagrams"]}")
        w.println()
        layerSpecs.forEach { (layer, spec) ->
            w.println("### ${labels["layer.${layer.name.lowercase()}"]}")
            w.println()
            w.println("```mermaid")
            w.println(mermaid.render(spec))
            w.println("```")
            w.println()
        }
    }

    private fun renderClassDesign(
        w: PrintWriter,
        module: Module,
        diagrams: DiagramArtifactIndex,
        labels: LabelDictionary,
    ) {
        w.println("## ${labels["doc.title.classDesign"]}")
        w.println()
        val specs = diagrams.specs[module.name] ?: emptyMap()
        module.classes.forEachIndexed { idx, c ->
            if (idx > 0) {
                w.println("---")
                w.println()
            }
            w.println("### ${c.id} ${c.name}")
            w.println()
            specs["class-${c.id}"]?.let { spec ->
                w.println("```mermaid")
                w.println(mermaid.render(spec))
                w.println("```")
                w.println()
            }
            renderHeaderRow(w, c, labels)
            renderAttributesTable(w, c, labels)
            renderOperationsTable(w, c, labels)
        }
    }

    // ... renderHeaderRow / renderAttributesTable / renderOperationsTable 기존 본문 유지 ...
}
```

(나머지 기존 private 메서드들은 그대로 둔다. 시그니처 변경된 두 메서드 — `renderClassDesign` — 만 본문 교체)

- [ ] **Step 4: 테스트 통과 확인**

```bash
./gradlew :test --tests "com.toolhub.classdiagramgenerator.render.MarkdownGeneratorTest"
```

기대: 모든 케이스 PASS. `MermaidRenderer` 빈이 주입되어야 하므로 `gen = MarkdownGenerator(MermaidRenderer())` 처럼 테스트 생성자도 수정해야 한다 — `gen` 정의 줄을 다음과 같이 바꾼다:

```kotlin
val gen = MarkdownGenerator(MermaidRenderer())
```

(MermaidRenderer import 도 추가)

- [ ] **Step 5: 커밋**

```bash
git add class-diagram-generator/src/main/kotlin/com/toolhub/classdiagramgenerator/render/MarkdownGenerator.kt \
        class-diagram-generator/src/test/kotlin/com/toolhub/classdiagramgenerator/render/MarkdownGeneratorTest.kt
git commit -m "feat(class-diagram-generator): NEXT-03 - MarkdownGenerator 에 Mermaid 코드 블록 삽입"
```

---

## Task 13: API/폼/웹 UI 통합 (`includeDiagrams` 파라미터)

**Files:**
- Modify: `class-diagram-generator/src/main/kotlin/com/toolhub/classdiagramgenerator/api/JobController.kt`
- Modify: `class-diagram-generator/src/main/resources/templates/upload.html`
- Modify: `class-diagram-generator/src/main/resources/messages.properties`
- Modify: `class-diagram-generator/src/main/resources/messages_en.properties`
- Modify: `class-diagram-generator/src/main/resources/static/js/upload.js`
- Modify: `class-diagram-generator/src/test/kotlin/com/toolhub/classdiagramgenerator/api/JobControllerTest.kt`

- [ ] **Step 1: `JobControllerTest` 에 케이스 추가 (가능하면)**

```bash
cat class-diagram-generator/src/test/kotlin/com/toolhub/classdiagramgenerator/api/JobControllerTest.kt | head -60
```

기존 패턴을 보고, multipart 업로드가 mock 되는 곳에 `includeDiagrams=true` / `false` 두 케이스를 추가한다. 기존 호출에서 누락된 파라미터가 없는지 확인하고 `submit(...)` 모킹 검증에 `includeDiagrams = true` 가 전달되는지 검증.

- [ ] **Step 2: `JobController.create` 시그니처에 `includeDiagrams` 추가**

`JobController.kt` 의 `create` 함수(현재 줄 43-77)를 다음으로 교체:

```kotlin
    @PostMapping
    fun create(
        @RequestParam("file") file: MultipartFile,
        @RequestParam("programName")
        @Pattern(regexp = "^[A-Za-z0-9_-]+$")
        @Size(min = 1, max = PROGRAM_NAME_MAX)
        programName: String,
        @RequestParam("version")
        @Pattern(regexp = "^[A-Za-z0-9._-]+$")
        @Size(min = 1, max = VERSION_MAX)
        version: String,
        @RequestParam("language") @Pattern(regexp = "^(ko|en)$") language: String,
        @RequestParam(name = "formats", defaultValue = "docx,xlsx,md") formats: String,
        @RequestParam(name = "includeDiagrams", defaultValue = "true") includeDiagrams: Boolean,
    ): ResponseEntity<JobCreatedResponse> {
        require(file.size >= MIN_ZIP_SIZE) { "Empty file" }
        val magic = file.inputStream.use { it.readNBytes(MIN_ZIP_SIZE) }
        require(magic[0] == ZIP_MAGIC_BYTE_0 && magic[1] == ZIP_MAGIC_BYTE_1) { "Not a ZIP file" }
        val parsedFormats = formats.split(",").map { it.trim().lowercase() }.filter { it.isNotEmpty() }
        require(parsedFormats.all { it in SUPPORTED_FORMATS }) { "Unsupported format" }
        val rec =
            jobService.submit(
                programName = programName,
                version = version,
                language = OutputLanguage.parse(language),
                formats = parsedFormats,
                includeDiagrams = includeDiagrams,
                file = file,
            )
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(
            JobCreatedResponse(
                jobId = rec.id,
                status = "ACCEPTED",
                streamUrl = "/api/v1/jobs/${rec.id}/events",
            ),
        )
    }
```

- [ ] **Step 3: 메시지 번들 키 추가**

`messages.properties` 끝에 추가:

```properties
page.upload.includeDiagrams=클래스 다이어그램 포함
```

`messages_en.properties` 끝에 추가:

```properties
page.upload.includeDiagrams=Include class diagrams
```

(`messages_en.properties` 파일이 없으면 같은 디렉터리에 생성하고 기존 KO 키와 동일한 EN 번역을 모두 채워야 하지만, 보통 이미 있음. 확인:)

```bash
ls class-diagram-generator/src/main/resources/messages_en.properties
```

- [ ] **Step 4: `upload.html` 에 체크박스 추가**

`upload.html` 의 formats 체크박스 그룹 (현재 줄 49-65) 다음, 파일 input(`<input type="file" ...>`) 앞에 다음 블록 삽입:

```html
        <div class="col-12">
            <div class="form-check">
                <input class="form-check-input" type="checkbox" name="includeDiagrams" id="includeDiagrams" value="true" checked>
                <label class="form-check-label" for="includeDiagrams" th:text="#{page.upload.includeDiagrams}"></label>
            </div>
        </div>
```

- [ ] **Step 5: `upload.js` 에서 체크박스 값 전송**

```bash
cat class-diagram-generator/src/main/resources/static/js/upload.js
```

`FormData` 를 구성하는 부분에서 체크박스가 unchecked 일 때 `includeDiagrams=false` 가 전송되도록 처리한다. 일반적인 form submit 인 경우 unchecked 체크박스는 form 에 포함되지 않으므로, JS 에서 명시적으로 추가하는 한 줄을 보강:

```js
// FormData 직후, fetch 호출 전 위치에 삽입
if (!formData.has('includeDiagrams')) formData.set('includeDiagrams', 'false');
```

(만약 `upload.js` 가 form 을 그대로 fetch 에 보내는 형태면 위 한 줄 보강. fetch 직전 분기에 둔다.)

- [ ] **Step 6: 전체 빌드 + 테스트**

```bash
./gradlew :test
```

기대: 모든 케이스 PASS. `JobControllerTest` 가 새 시그니처에 의해 깨지면 추가/수정.

- [ ] **Step 7: 커밋**

```bash
git add class-diagram-generator/src/main/kotlin/com/toolhub/classdiagramgenerator/api/JobController.kt \
        class-diagram-generator/src/main/resources/templates/upload.html \
        class-diagram-generator/src/main/resources/messages.properties \
        class-diagram-generator/src/main/resources/messages_en.properties \
        class-diagram-generator/src/main/resources/static/js/upload.js \
        class-diagram-generator/src/test/kotlin/com/toolhub/classdiagramgenerator/api/JobControllerTest.kt
git commit -m "feat(class-diagram-generator): NEXT-03 - includeDiagrams API 파라미터 + 업로드 폼 체크박스"
```

---

## Task 14: E2E 케이스 추가 — 다이어그램 임베드 / OFF 두 가지

`EndToEndTest.kt` 는 `buildMultiModuleZip()` 으로 in-memory ZIP 을 만든다 (현재 줄 73-83). 동일 패턴으로 상속 관계가 포함된 ZIP 빌더를 추가하고, 두 가지 케이스(`includeDiagrams=true` / `false`) 를 추가한다.

**Files:**
- Modify: `class-diagram-generator/src/test/kotlin/com/toolhub/classdiagramgenerator/EndToEndTest.kt`

- [ ] **Step 1: ZIP 빌더 헬퍼 추가**

`EndToEndTest.kt` 의 파일 끝(현재 줄 93 의 `addEntry` 함수 다음)에 새 헬퍼 추가:

```kotlin
private fun baseServiceJava(): String =
    "package com.demo.service;\n" +
        "/** Base service. */\n" +
        "public abstract class BaseService {}\n"

private fun userServiceJava(): String =
    "package com.demo.service;\n" +
        "/** User service. */\n" +
        "public class UserService extends BaseService {\n" +
        "    public void save() {}\n" +
        "}\n"

private fun buildInheritanceZip(): ByteArray {
    val out = ByteArrayOutputStream()
    ZipOutputStream(out).use { zos ->
        addEntry(zos, "settings.gradle", "rootProject.name = 'core'\n")
        addEntry(zos, "build.gradle", "// noop")
        addEntry(zos, "src/main/java/com/demo/service/BaseService.java", baseServiceJava())
        addEntry(zos, "src/main/java/com/demo/service/UserService.java", userServiceJava())
    }
    return out.toByteArray()
}
```

- [ ] **Step 2: E2E 케이스 두 개 추가**

`EndToEndTest.kt` 의 `StringSpec({` 블록 안, 기존 케이스(`"multi-module zip yields per-module artifacts in english"`) 다음에 추가:

```kotlin
        "diagrams embedded in docx/xlsx/md when includeDiagrams=true" {
            val rec =
                service.submit(
                    programName = "demo",
                    version = "v1.0",
                    language = OutputLanguage.EN,
                    formats = listOf("docx", "xlsx", "md"),
                    includeDiagrams = true,
                    file = MockMultipartFile("file", "i.zip", "application/zip", buildInheritanceZip()),
                )
            waitForCompletion(rec.id, store)
            val final = store.get(rec.id)!!
            final.status shouldBe JobStatus.DONE

            val docxArt = final.artifacts.single { it.format == "docx" }
            org.apache.poi.xwpf.usermodel.XWPFDocument(java.nio.file.Files.newInputStream(docxArt.path)).use { doc ->
                (doc.allPictures.size > 0) shouldBe true
            }

            val xlsxArt = final.artifacts.single { it.format == "xlsx" }
            org.apache.poi.xssf.usermodel.XSSFWorkbook(java.nio.file.Files.newInputStream(xlsxArt.path)).use { wb ->
                (wb.allPictures.size > 0) shouldBe true
                (wb.getSheet("Layer Diagrams") != null) shouldBe true
            }

            val mdArt = final.artifacts.single { it.format == "md" }
            val mdText = String(java.nio.file.Files.readAllBytes(mdArt.path), Charsets.UTF_8)
            (mdText.contains("```mermaid")) shouldBe true
            (mdText.contains("UserService")) shouldBe true
        }

        "no diagrams when includeDiagrams=false" {
            val rec =
                service.submit(
                    programName = "demo",
                    version = "v1.0",
                    language = OutputLanguage.EN,
                    formats = listOf("docx", "xlsx", "md"),
                    includeDiagrams = false,
                    file = MockMultipartFile("file", "i.zip", "application/zip", buildInheritanceZip()),
                )
            waitForCompletion(rec.id, store)
            val final = store.get(rec.id)!!
            final.status shouldBe JobStatus.DONE

            val docxArt = final.artifacts.single { it.format == "docx" }
            org.apache.poi.xwpf.usermodel.XWPFDocument(java.nio.file.Files.newInputStream(docxArt.path)).use { doc ->
                doc.allPictures.size shouldBe 0
            }
            val xlsxArt = final.artifacts.single { it.format == "xlsx" }
            org.apache.poi.xssf.usermodel.XSSFWorkbook(java.nio.file.Files.newInputStream(xlsxArt.path)).use { wb ->
                wb.allPictures.size shouldBe 0
                (wb.getSheet("Layer Diagrams") == null) shouldBe true
            }
            val mdArt = final.artifacts.single { it.format == "md" }
            val mdText = String(java.nio.file.Files.readAllBytes(mdArt.path), Charsets.UTF_8)
            (mdText.contains("```mermaid")) shouldBe false
        }
```

(EN 로케일이므로 시트명은 `"Layer Diagrams"` — Task 1 의 `OutputLabels` EN 맵의 `sheet.layerDiagrams` 값을 기준으로 한다)

- [ ] **Step 3: 전체 검증 명령 실행**

```bash
./gradlew check
```

기대: BUILD SUCCESSFUL. test + spotless + detekt 모두 통과.

- [ ] **Step 4: 실패 시 대응**

- detekt 가 새로 추가된 코드에 대해 경고하면 사소한 스타일은 그 자리에서 고친다 (긴 파라미터 리스트는 이미 `@Suppress` 가 있고, 새 파일은 80~120라인 안쪽이라 크게 걸리지 않을 것).
- spotless 가 ktlint 위반을 잡으면 `./gradlew spotlessApply` 실행 후 다시 `check`.

- [ ] **Step 5: 커밋**

```bash
git add class-diagram-generator/src/test/kotlin/com/toolhub/classdiagramgenerator/EndToEndTest.kt
git commit -m "test(class-diagram-generator): NEXT-03 - E2E 케이스에 다이어그램 임베드/OFF 검증 추가"
```

---

## Task 15: PRD 업데이트 (NEXT-03 완료 표시 + 수용 기준 6개 추가)

**Files:**
- Modify: `class-diagram-generator/docs/PRD-class-diagram-generator.md`

- [ ] **Step 1: §12 후속 Phase 작업 표에서 NEXT-03 항목 처리**

PRD §12 표의 NEXT-03 행에 "완료(2026-05-19)" 마크 추가. 정확히 다음으로 교체:

```markdown
| **NEXT-03** | ~~클래스 다이어그램 이미지 첨부~~ (완료 2026-05-19) | PlantUML(서버 사이드 PNG, Smetana 레이아웃) + Mermaid(md). 본문에 계층/클래스 다이어그램 임베드. 구현 스펙: `docs/superpowers/specs/2026-05-19-class-diagram-embed-design.md` |
```

- [ ] **Step 2: §13 수용 기준에 6개 항목 추가**

§13 (수용 기준) 의 기존 마지막 체크박스 뒤에 추가:

```markdown
- [ ] `includeDiagrams=true` (기본) 업로드 시 docx 본문에 계층 다이어그램과 클래스 다이어그램 PNG가 임베드된다.
- [ ] `includeDiagrams=true` 업로드 시 xlsx의 `classDesign` 시트와 `layerDiagrams` 시트에 PNG가 임베드된다.
- [ ] `includeDiagrams=true` 업로드 시 md 산출물에 ` ```mermaid` 코드 블록이 클래스/계층 자리에 삽입된다.
- [ ] `includeDiagrams=false` 업로드 시 산출물 3종에 다이어그램 흔적이 전혀 없다(PNG 0건, mermaid 펜스 0건).
- [ ] `java.lang.Object`는 어떤 다이어그램에도 노드로 등장하지 않는다.
- [ ] 모듈 외부 상속/구현 대상은 점선 박스(docx/xlsx) 또는 `stroke-dasharray`(md/Mermaid)로 표시된다.
```

- [ ] **Step 3: §15 변경 이력에 한 줄 추가**

```markdown
| 2026-05-19 | 0.5 | NEXT-03 완료: 산출물 본문에 PlantUML PNG + Mermaid 코드 블록 임베드, `includeDiagrams` API 파라미터 추가, 수용 기준 6개 추가 | ydj515 |
```

- [ ] **Step 4: 커밋**

```bash
git add class-diagram-generator/docs/PRD-class-diagram-generator.md
git commit -m "docs(class-diagram-generator): NEXT-03 PRD 갱신 - 완료 표시 + 수용 기준 6개 추가"
```

---

## 자기 검토

(`writing-plans` 스킬의 self-review 단계로 작성자가 plan 저장 직후 한 차례 인라인 점검을 마쳤다. 잔여 결함이 발견되면 개별 task 내부에서 inline 수정.)
