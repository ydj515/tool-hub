# Kotlin Project Support Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `class-diagram-generator`가 순수 Kotlin Gradle/Maven 단일 모듈과 멀티모듈 프로젝트 ZIP을 분석해 기존 Java와 동일하게 문서 산출물을 생성하도록 확장하고, `sample-projects`에 Kotlin Spring 샘플 8종을 추가한다.

**Architecture:** `ProjectDetector`는 Kotlin 소스 루트를 감지하도록 확장하고, 파싱 계층은 `SourceAnalyzer` 인터페이스 아래에서 Java와 Kotlin 분석기를 병렬 운영한다. Kotlin 파서는 `kotlin-compiler-embeddable` 기반 PSI로 구현하고, 결과는 기존 `ParsedType` 모델로 변환해 `RelationExtractor`, 렌더러, 결과 API를 최대한 재사용한다.

**Tech Stack:** Kotlin, Spring Boot, Kotlin compiler PSI, Kotest, MockMvc, Gradle Kotlin DSL, Maven POM

---

## File Structure

- Modify: `gradle/libs.versions.toml`
  - Kotlin compiler embeddable 의존성 alias 추가
- Modify: `build.gradle.kts`
  - Kotlin 파서 라이브러리 연결
- Create: `src/main/kotlin/com/toolhub/classdiagramgenerator/analyzer/SourceAnalyzer.kt`
  - 언어별 파서 공통 인터페이스
- Modify: `src/main/kotlin/com/toolhub/classdiagramgenerator/analyzer/JavaSourceAnalyzer.kt`
  - `SourceAnalyzer` 구현
- Create: `src/main/kotlin/com/toolhub/classdiagramgenerator/analyzer/KotlinSourceAnalyzer.kt`
  - Kotlin PSI 기반 `.kt` 파서
- Modify: `src/main/kotlin/com/toolhub/classdiagramgenerator/input/ProjectDetector.kt`
  - Kotlin 소스 루트 감지와 `.kt` 파일 수집
- Modify: `src/main/kotlin/com/toolhub/classdiagramgenerator/job/JobOrchestrator.kt`
  - 확장자 기준 분석기 라우팅
- Modify: `src/test/kotlin/com/toolhub/classdiagramgenerator/input/ProjectDetectorTest.kt`
  - Kotlin 단일/멀티모듈 감지 테스트
- Create: `src/test/kotlin/com/toolhub/classdiagramgenerator/analyzer/KotlinSourceAnalyzerTest.kt`
  - Kotlin 문법 파싱 테스트
- Modify: `src/test/kotlin/com/toolhub/classdiagramgenerator/analyzer/RelationExtractorTest.kt`
  - Kotlin 상속/구현 관계 회귀 테스트
- Modify: `src/test/kotlin/com/toolhub/classdiagramgenerator/job/JobOrchestratorTest.kt`
  - Kotlin 단일 모듈 artifact 생성 스모크 테스트
- Modify: `src/test/kotlin/com/toolhub/classdiagramgenerator/EndToEndTest.kt`
  - Gradle/Maven single/multi Kotlin ZIP 종단 테스트
- Modify: `README.md`
  - Kotlin 프로젝트 지원과 검증 경로 문서화
- Modify: `sample-projects/README.md`
  - Kotlin 샘플 목록과 사용법 문서화
- Create: `sample-projects/verify-kotlin-samples.sh`
  - Kotlin 샘플 스모크 검증 스크립트
- Create: `sample-projects/gradle-single-kotlin-jdk17/**`
- Create: `sample-projects/gradle-single-kotlin-jdk21/**`
- Create: `sample-projects/gradle-multi-kotlin-jdk17/**`
- Create: `sample-projects/gradle-multi-kotlin-jdk21/**`
- Create: `sample-projects/maven-single-kotlin-jdk17/**`
- Create: `sample-projects/maven-single-kotlin-jdk21/**`
- Create: `sample-projects/maven-multi-kotlin-jdk17/**`
- Create: `sample-projects/maven-multi-kotlin-jdk21/**`
  - 현실적인 Spring 수준의 Kotlin 업로드 샘플

### Task 1: Kotlin 소스 감지 규칙 확장

**Files:**
- Modify: `src/test/kotlin/com/toolhub/classdiagramgenerator/input/ProjectDetectorTest.kt`
- Modify: `src/main/kotlin/com/toolhub/classdiagramgenerator/input/ProjectDetector.kt`

- [ ] **Step 1: Kotlin 단일/멀티모듈 감지 failing test를 추가**

```kotlin
"detects single Gradle Kotlin module from src/main/kotlin" {
    val root = Files.createTempDirectory("kotlin-gradle-single-")
    root.resolve("build.gradle.kts").writeText("// noop")
    val src = root.resolve("src/main/kotlin/com/example/catalog/service")
    src.createDirectories()
    src.resolve("CatalogService.kt").writeText(
        """
        package com.example.catalog.service
        class CatalogService
        """.trimIndent(),
    )

    val modules = detector.detect(root, fallbackName = "catalog")

    modules shouldHaveSize 1
    modules.single().name shouldBe "catalog"
    modules.single().sourceFiles.map { it.fileName.toString() } shouldBe listOf("CatalogService.kt")
}

"detects Gradle Kotlin multi-module project from settings.gradle.kts" {
    val root = Files.createTempDirectory("kotlin-gradle-multi-")
    root.resolve("settings.gradle.kts").writeText("""include("api", "service", "support")""")
    listOf("api", "service", "support").forEach { name ->
        val src = root.resolve("$name/src/main/kotlin/com/example/catalog/$name")
        src.createDirectories()
        root.resolve("$name/build.gradle.kts").writeText("// noop")
        src.resolve("${name.replaceFirstChar(Char::uppercase)}Type.kt").writeText("package com.example.catalog.$name\nclass X")
    }

    val modules = detector.detect(root, fallbackName = "catalog").map { it.name }.sorted()

    modules shouldBe listOf("api", "service", "support")
}

"falls back to scanning loose kotlin sources when no build file exists" {
    val root = Files.createTempDirectory("kotlin-fallback-")
    root.resolve("LooseType.kt").writeText(
        """
        package fallback
        class LooseType
        """.trimIndent(),
    )

    val modules = detector.detect(root, fallbackName = "fallback")

    modules shouldHaveSize 1
    modules.single().sourceFiles.map { it.fileName.toString() } shouldBe listOf("LooseType.kt")
}
```

- [ ] **Step 2: 실패를 확인**

Run: `./gradlew test --tests 'com.toolhub.classdiagramgenerator.input.ProjectDetectorTest'`
Expected: FAIL because `ProjectDetector`가 아직 `src/main/kotlin`과 `.kt` 폴백 스캔을 지원하지 않음

- [ ] **Step 3: Kotlin 우선 소스 수집을 구현**

```kotlin
private fun buildModule(
    dir: Path,
    name: String,
): ModuleDescriptor {
    val sources = collectSourceFiles(dir)
    return ModuleDescriptor(name = name, rootDir = dir, sourceFiles = sources)
}

private fun collectSourceFiles(dir: Path): List<Path> {
    val kotlinDir = dir.resolve("src/main/kotlin")
    if (kotlinDir.exists()) {
        return walkSources(kotlinDir, setOf("kt"))
    }

    val javaDir = dir.resolve("src/main/java")
    if (javaDir.exists()) {
        return walkSources(javaDir, setOf("java"))
    }

    return walkSources(dir, setOf("kt", "java"))
}

private fun walkSources(
    base: Path,
    extensions: Set<String>,
): List<Path> =
    Files.walk(base).use { stream ->
        stream
            .filter { path ->
                !path.isDirectory() &&
                    path.extension in extensions &&
                    !isMacOsMetadata(path)
            }.toList()
    }
```

- [ ] **Step 4: 테스트가 통과하는지 확인**

Run: `./gradlew test --tests 'com.toolhub.classdiagramgenerator.input.ProjectDetectorTest'`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add src/main/kotlin/com/toolhub/classdiagramgenerator/input/ProjectDetector.kt \
  src/test/kotlin/com/toolhub/classdiagramgenerator/input/ProjectDetectorTest.kt
git commit -m "feat(class-diagram-generator): detect kotlin source modules"
```

### Task 2: Kotlin 분석기와 공통 파서 인터페이스 추가

**Files:**
- Modify: `gradle/libs.versions.toml`
- Modify: `build.gradle.kts`
- Create: `src/main/kotlin/com/toolhub/classdiagramgenerator/analyzer/SourceAnalyzer.kt`
- Modify: `src/main/kotlin/com/toolhub/classdiagramgenerator/analyzer/JavaSourceAnalyzer.kt`
- Create: `src/test/kotlin/com/toolhub/classdiagramgenerator/analyzer/KotlinSourceAnalyzerTest.kt`
- Create: `src/main/kotlin/com/toolhub/classdiagramgenerator/analyzer/KotlinSourceAnalyzer.kt`

- [ ] **Step 1: Kotlin 분석기 failing test를 추가**

```kotlin
class KotlinSourceAnalyzerTest :
    StringSpec({
        val analyzer = KotlinSourceAnalyzer()

        "parses data class, interface, enum, object and companion object" {
            val src =
                """
                package com.example.catalog.support

                /** 상태 설명. 자세한 내용. */
                enum class CatalogStatus {
                    READY, SOLD_OUT
                }

                /** 조회 계약. */
                interface CatalogReadable

                /** 공용 유틸. */
                object CatalogSupport {
                    fun normalize(sku: String): String = sku.trim()
                }

                /** 상품 요약. */
                data class CatalogSummary(
                    /** 상품 식별자 */
                    val sku: String,
                    private val status: CatalogStatus,
                ) : CatalogReadable {
                    /** 표시 이름 */
                    val displayName: String = sku.uppercase()

                    /** 요약을 만든다. */
                    fun toLabel(): String = "${'$'}sku-${'$'}status"

                    companion object {
                        /** 빈 요약 */
                        fun empty(): CatalogSummary = CatalogSummary("EMPTY", CatalogStatus.READY)
                    }
                }
                """.trimIndent()
            val path = Files.createTempFile("CatalogSummary", ".kt").also { it.writeText(src) }

            val parsed = analyzer.parseFile(path)

            parsed.types.map { it.name } shouldBe listOf("CatalogStatus", "CatalogReadable", "CatalogSupport", "CatalogSummary", "Companion")
            parsed.types.single { it.name == "CatalogSummary" }.attributes shouldBe
                listOf(
                    ParsedAttribute("sku", "String", AccessModifier.PUBLIC, "상품 식별자"),
                    ParsedAttribute("status", "CatalogStatus", AccessModifier.PRIVATE, ""),
                    ParsedAttribute("displayName", "String", AccessModifier.PUBLIC, "표시 이름"),
                )
            parsed.types.single { it.name == "CatalogSummary" }.implementsNames shouldBe listOf("CatalogReadable")
        }

        "parses sealed class and nested types" {
            val src =
                """
                package com.example.catalog.service

                /** 서비스 결과. */
                sealed class ServiceResult {
                    /** 성공 결과. */
                    data class Success(val value: String) : ServiceResult()

                    /** 실패 결과. */
                    class Failure(private val reason: String) : ServiceResult()

                    inner class AuditTrail {
                        fun message(): String = "audit"
                    }
                }
                """.trimIndent()
            val path = Files.createTempFile("ServiceResult", ".kt").also { it.writeText(src) }

            val parsed = analyzer.parseFile(path)

            parsed.types.map { it.name } shouldBe listOf("ServiceResult", "Success", "Failure", "AuditTrail")
            parsed.types.single { it.name == "Success" }.extendsNames shouldBe listOf("ServiceResult")
        }
    })
```

- [ ] **Step 2: 실패를 확인**

Run: `./gradlew test --tests 'com.toolhub.classdiagramgenerator.analyzer.KotlinSourceAnalyzerTest'`
Expected: FAIL because Kotlin compiler dependency, `SourceAnalyzer`, `KotlinSourceAnalyzer`가 아직 없음

- [ ] **Step 3: 의존성과 분석기 구현을 추가**

```toml
# gradle/libs.versions.toml
kotlin-compiler-embeddable = { module = "org.jetbrains.kotlin:kotlin-compiler-embeddable", version.ref = "kotlin" }
```

```kotlin
// build.gradle.kts
dependencies {
    implementation(libs.kotlin.compiler.embeddable)
}
```

```kotlin
// SourceAnalyzer.kt
package com.toolhub.classdiagramgenerator.analyzer

import java.nio.file.Path

interface SourceAnalyzer {
    fun supports(path: Path): Boolean

    fun parseFile(path: Path): ParsedSource
}
```

```kotlin
// JavaSourceAnalyzer.kt
@Component
class JavaSourceAnalyzer : SourceAnalyzer {
    override fun supports(path: Path): Boolean = path.extension == "java"
}
```

```kotlin
// KotlinSourceAnalyzer.kt
package com.toolhub.classdiagramgenerator.analyzer

import com.toolhub.classdiagramgenerator.domain.AccessModifier
import org.jetbrains.kotlin.cli.jvm.compiler.EnvironmentConfigFiles
import org.jetbrains.kotlin.cli.jvm.compiler.KotlinCoreEnvironment
import org.jetbrains.kotlin.com.intellij.openapi.util.Disposer
import org.jetbrains.kotlin.config.CommonConfigurationKeys
import org.jetbrains.kotlin.config.CompilerConfiguration
import org.jetbrains.kotlin.kdoc.psi.api.KDoc
import org.jetbrains.kotlin.lexer.KtTokens
import org.jetbrains.kotlin.psi.KtCallableDeclaration
import org.jetbrains.kotlin.psi.KtClass
import org.jetbrains.kotlin.psi.KtClassOrObject
import org.jetbrains.kotlin.psi.KtDeclaration
import org.jetbrains.kotlin.psi.KtFile
import org.jetbrains.kotlin.psi.KtNamedFunction
import org.jetbrains.kotlin.psi.KtParameter
import org.jetbrains.kotlin.psi.KtProperty
import org.jetbrains.kotlin.psi.KtPsiFactory
import org.springframework.stereotype.Component
import java.nio.file.Files
import java.nio.file.Path
import kotlin.io.path.extension

@Component
class KotlinSourceAnalyzer : SourceAnalyzer {
    private val disposable = Disposer.newDisposable()
    private val environment =
        KotlinCoreEnvironment.createForProduction(
            disposable,
            CompilerConfiguration().apply {
                put(CommonConfigurationKeys.MODULE_NAME, "class-diagram-generator")
            },
            EnvironmentConfigFiles.JVM_CONFIG_FILES,
        )
    private val psiFactory = KtPsiFactory(environment.project, false)

    override fun supports(path: Path): Boolean = path.extension == "kt"

    override fun parseFile(path: Path): ParsedSource {
        val text = Files.readString(path)
        val file = psiFactory.createFile(path.fileName.toString(), text)
        val imports = file.importDirectives.mapNotNull { it.importPath?.pathStr }
        val out = mutableListOf<ParsedType>()
        file.declarations.filterIsInstance<KtClassOrObject>().forEach { collect(it, file, imports, out) }
        return ParsedSource(types = out)
    }

    private fun collect(
        declaration: KtClassOrObject,
        file: KtFile,
        imports: List<String>,
        out: MutableList<ParsedType>,
    ) {
        out += parseType(declaration, file.packageFqName.asString(), imports)
        declaration.declarations.filterIsInstance<KtClassOrObject>().forEach { collect(it, file, imports, out) }
        declaration.companionObjects.forEach { collect(it, file, imports, out) }
    }

    private fun parseType(
        declaration: KtClassOrObject,
        pkg: String,
        imports: List<String>,
    ): ParsedType {
        val attributes = primaryConstructorAttributes(declaration) + bodyAttributes(declaration)
        val operations =
            declaration.declarations
                .filterIsInstance<KtNamedFunction>()
                .map { ParsedOperation(it.name.orEmpty(), firstSentence(it.docComment)) }
        val superNames =
            declaration.superTypeListEntries
                .mapNotNull { it.typeReference?.text }
                .map { it.substringBefore('<').substringBefore('(').trim() }
        val extendsNames =
            if (declaration is KtClass && declaration.isInterface()) {
                superNames
            } else {
                superNames.take(1)
            }
        val implementsNames =
            if (declaration is KtClass && !declaration.isInterface()) {
                superNames.drop(1)
            } else {
                emptyList()
            }
        return ParsedType(
            name = declaration.name.orEmpty(),
            packagePath = pkg,
            description = firstSentence(declaration.docComment),
            attributes = attributes.distinctBy { it.name },
            operations = operations,
            extendsNames = extendsNames,
            implementsNames = implementsNames,
            imports = imports,
        )
    }

    private fun primaryConstructorAttributes(declaration: KtClassOrObject): List<ParsedAttribute> =
        (declaration as? KtClass)
            ?.primaryConstructorParameters
            ?.filter(KtParameter::hasValOrVar)
            ?.map { param ->
                ParsedAttribute(
                    name = param.name.orEmpty(),
                    type = param.typeReference?.text.orEmpty(),
                    accessModifier = accessOf(param),
                    description = firstSentence(param.docComment),
                )
            }.orEmpty()

    private fun bodyAttributes(declaration: KtClassOrObject): List<ParsedAttribute> =
        declaration.declarations
            .filterIsInstance<KtProperty>()
            .map { property ->
                ParsedAttribute(
                    name = property.name.orEmpty(),
                    type = property.typeReference?.text ?: property.initializer?.text.orEmpty(),
                    accessModifier = accessOf(property),
                    description = firstSentence(property.docComment),
                )
            }

    private fun accessOf(declaration: KtCallableDeclaration): AccessModifier =
        when {
            declaration.hasModifier(KtTokens.PRIVATE_KEYWORD) -> AccessModifier.PRIVATE
            declaration.hasModifier(KtTokens.PROTECTED_KEYWORD) -> AccessModifier.PROTECTED
            declaration.hasModifier(KtTokens.INTERNAL_KEYWORD) -> AccessModifier.DEFAULT
            else -> AccessModifier.PUBLIC
        }

    private fun firstSentence(comment: KDoc?): String =
        comment
            ?.getDefaultSection()
            ?.getContent()
            ?.replace(Regex("\\s+"), " ")
            ?.trim()
            ?.let { text ->
                val index = text.indexOf('.')
                if (index >= 0) text.substring(0, index + 1) else text
            }.orEmpty()
}
```

- [ ] **Step 4: 테스트가 통과하는지 확인**

Run: `./gradlew test --tests 'com.toolhub.classdiagramgenerator.analyzer.KotlinSourceAnalyzerTest' --tests 'com.toolhub.classdiagramgenerator.analyzer.JavaSourceAnalyzerTest'`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add gradle/libs.versions.toml \
  build.gradle.kts \
  src/main/kotlin/com/toolhub/classdiagramgenerator/analyzer/SourceAnalyzer.kt \
  src/main/kotlin/com/toolhub/classdiagramgenerator/analyzer/JavaSourceAnalyzer.kt \
  src/main/kotlin/com/toolhub/classdiagramgenerator/analyzer/KotlinSourceAnalyzer.kt \
  src/test/kotlin/com/toolhub/classdiagramgenerator/analyzer/KotlinSourceAnalyzerTest.kt
git commit -m "feat(class-diagram-generator): add kotlin source analyzer"
```

### Task 3: 분석기 라우팅과 관계 추출 연결

**Files:**
- Modify: `src/test/kotlin/com/toolhub/classdiagramgenerator/job/JobOrchestratorTest.kt`
- Modify: `src/test/kotlin/com/toolhub/classdiagramgenerator/analyzer/RelationExtractorTest.kt`
- Modify: `src/main/kotlin/com/toolhub/classdiagramgenerator/job/JobOrchestrator.kt`

- [ ] **Step 1: Kotlin 단일 모듈 실행과 관계 추출 failing test를 추가**

```kotlin
"happy path produces 3 artifacts for single kotlin module ko" {
    val bytes = buildKotlinZip()
    val file = MockMultipartFile("file", "kotlin.zip", "application/zip", bytes)
    val rec = service.submit("catalog", "v1.0", OutputLanguage.KO, listOf("docx", "xlsx", "md"), true, file)

    waitForCompletion(rec.id, store)
    val final = store.get(rec.id)!!

    final.status shouldBe JobStatus.DONE
    final.artifacts shouldHaveSize 3
}
```

```kotlin
"resolves kotlin interface extension and class implementation" {
    val parsed =
        listOf(
            ParsedType(
                name = "CatalogReadable",
                packagePath = "com.example.catalog.support",
                description = "",
                attributes = emptyList(),
                operations = emptyList(),
                extendsNames = listOf("CatalogContract"),
                imports = listOf("com.example.catalog.support.CatalogContract"),
            ),
            ParsedType(
                name = "CatalogService",
                packagePath = "com.example.catalog.service",
                description = "",
                attributes = emptyList(),
                operations = emptyList(),
                implementsNames = listOf("CatalogReadable"),
                imports = listOf("com.example.catalog.support.CatalogReadable"),
            ),
        )
    val classes =
        listOf(
            ClassInfo("C1", "CatalogReadable", Layer.SERVICE, "", "com.example.catalog.support", emptyList(), emptyList()),
            ClassInfo("C2", "CatalogService", Layer.SERVICE, "", "com.example.catalog.service", emptyList(), emptyList()),
        )

    val result = RelationExtractor().extract(parsed, classes)

    result.relations.map { it.kind.name } shouldBe listOf("EXTENDS", "IMPLEMENTS")
}
```

- [ ] **Step 2: 실패를 확인**

Run: `./gradlew test --tests 'com.toolhub.classdiagramgenerator.job.JobOrchestratorTest' --tests 'com.toolhub.classdiagramgenerator.analyzer.RelationExtractorTest'`
Expected: FAIL because `JobOrchestrator`가 아직 `.kt` 확장자를 `KotlinSourceAnalyzer`로 라우팅하지 않음

- [ ] **Step 3: `JobOrchestrator`에 분석기 선택 로직을 추가**

```kotlin
class JobOrchestrator(
    private val zipExtractor: ZipExtractor,
    private val projectDetector: ProjectDetector,
    private val analyzers: List<SourceAnalyzer>,
    private val classifier: LayerClassifier,
    private val idAssigner: ClassIdAssigner,
    private val relationExtractor: RelationExtractor,
    private val diagramRenderer: DiagramRenderer,
    private val generators: List<DocumentGenerator>,
    private val storage: OutputStorage,
    private val bus: ProgressBus,
    private val props: AppProperties,
) {
    private fun parseAll(
        record: JobRecord,
        modules: List<ModuleDescriptor>,
    ): List<Pair<ModuleDescriptor, List<ParsedType>>> =
        modules.map { md ->
            val types =
                md.sourceFiles.flatMap { path ->
                    val analyzer =
                        analyzers.firstOrNull { it.supports(path) }
                            ?: error("No analyzer registered for ${path.fileName}")
                    val parsed = analyzer.parseFile(path)
                    parsed.warnings.forEach { warning -> addWarning(record, warning) }
                    parsed.types
                }
            require(types.size <= props.analysis.maxClassesPerModule) {
                "Module ${md.name} exceeds ${props.analysis.maxClassesPerModule} classes"
            }
            md to types
        }
}
```

```kotlin
private fun buildKotlinZip(): ByteArray {
    val out = ByteArrayOutputStream()
    ZipOutputStream(out).use { zos ->
        zos.putNextEntry(ZipEntry("build.gradle.kts"))
        zos.write("// noop".toByteArray())
        zos.closeEntry()
        zos.putNextEntry(ZipEntry("src/main/kotlin/com/example/catalog/service/CatalogService.kt"))
        zos.write(
            """
            package com.example.catalog.service

            /** 상품 서비스. */
            class CatalogService {
                private val name: String = "catalog"
                fun save() {}
            }
            """.trimIndent().toByteArray(),
        )
        zos.closeEntry()
    }
    return out.toByteArray()
}
```

- [ ] **Step 4: 테스트가 통과하는지 확인**

Run: `./gradlew test --tests 'com.toolhub.classdiagramgenerator.job.JobOrchestratorTest' --tests 'com.toolhub.classdiagramgenerator.analyzer.RelationExtractorTest'`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add src/main/kotlin/com/toolhub/classdiagramgenerator/job/JobOrchestrator.kt \
  src/test/kotlin/com/toolhub/classdiagramgenerator/job/JobOrchestratorTest.kt \
  src/test/kotlin/com/toolhub/classdiagramgenerator/analyzer/RelationExtractorTest.kt
git commit -m "feat(class-diagram-generator): route kotlin sources through analyzers"
```

### Task 4: Kotlin 종단 테스트와 사용자 문서 보강

**Files:**
- Modify: `src/test/kotlin/com/toolhub/classdiagramgenerator/EndToEndTest.kt`
- Modify: `README.md`

- [ ] **Step 1: Gradle/Maven single/multi Kotlin ZIP failing test를 추가**

```kotlin
"single-module Gradle Kotlin zip yields 3 artifacts" {
    val rec =
        service.submit(
            programName = "catalog",
            version = "v1.0",
            language = OutputLanguage.EN,
            formats = listOf("docx", "xlsx", "md"),
            includeDiagrams = true,
            file = MockMultipartFile("file", "gradle-single-kotlin.zip", "application/zip", buildGradleSingleKotlinZip()),
        )
    waitForCompletion(rec.id, store)
    val final = store.get(rec.id)!!
    final.status shouldBe JobStatus.DONE
    final.artifacts.size shouldBe 3
}

"multi-module Maven Kotlin zip yields artifacts for each module and format" {
    val rec =
        service.submit(
            programName = "catalog",
            version = "v1.0",
            language = OutputLanguage.EN,
            formats = listOf("docx", "xlsx", "md"),
            includeDiagrams = true,
            file = MockMultipartFile("file", "maven-multi-kotlin.zip", "application/zip", buildMavenMultiKotlinZip()),
        )
    waitForCompletion(rec.id, store)
    val final = store.get(rec.id)!!
    final.status shouldBe JobStatus.DONE
    final.artifacts.size shouldBe 9
    final.artifacts.map { it.module }.toSet() shouldBe setOf("api", "service", "support")
}
```

- [ ] **Step 2: 실패를 확인**

Run: `./gradlew test --tests 'com.toolhub.classdiagramgenerator.EndToEndTest'`
Expected: FAIL because Kotlin ZIP fixture builders와 Kotlin 파싱 전체 파이프라인이 아직 완전히 연결되지 않았음

- [ ] **Step 3: Kotlin ZIP fixture helper와 README 문구를 추가**

```kotlin
private fun buildGradleSingleKotlinZip(): ByteArray {
    val out = ByteArrayOutputStream()
    ZipOutputStream(out).use { zos ->
        addEntry(zos, "settings.gradle.kts", """rootProject.name = "gradle-single-kotlin"""")
        addEntry(zos, "build.gradle.kts", """plugins { kotlin("jvm") version "2.0.21" }""")
        addEntry(
            zos,
            "src/main/kotlin/com/example/catalog/service/CatalogService.kt",
            """
            package com.example.catalog.service

            /** 상품 서비스. */
            class CatalogService {
                /** 저장한다. */
                fun save() {}
            }
            """.trimIndent(),
        )
    }
    return out.toByteArray()
}

private fun buildMavenMultiKotlinZip(): ByteArray {
    val out = ByteArrayOutputStream()
    ZipOutputStream(out).use { zos ->
        addEntry(
            zos,
            "pom.xml",
            """
            <project xmlns="http://maven.apache.org/POM/4.0.0"
                     xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
                     xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0.xsd">
                <modelVersion>4.0.0</modelVersion>
                <groupId>com.example</groupId>
                <artifactId>maven-multi-kotlin</artifactId>
                <version>1.0.0</version>
                <packaging>pom</packaging>
                <modules>
                    <module>api</module>
                    <module>service</module>
                    <module>support</module>
                </modules>
            </project>
            """.trimIndent(),
        )
        addEntry(zos, "support/pom.xml", "<project><parent><groupId>com.example</groupId><artifactId>maven-multi-kotlin</artifactId><version>1.0.0</version></parent><artifactId>support</artifactId></project>")
        addEntry(
            zos,
            "support/src/main/kotlin/com/example/catalog/support/CatalogSnapshot.kt",
            """
            package com.example.catalog.support

            data class CatalogSnapshot(val sku: String, val status: CatalogStatus)
            enum class CatalogStatus { READY, SOLD_OUT }
            object CatalogSupport { fun normalize(sku: String): String = sku.trim() }
            """.trimIndent(),
        )
        addEntry(zos, "service/pom.xml", "<project><parent><groupId>com.example</groupId><artifactId>maven-multi-kotlin</artifactId><version>1.0.0</version></parent><artifactId>service</artifactId></project>")
        addEntry(
            zos,
            "service/src/main/kotlin/com/example/catalog/service/CatalogService.kt",
            """
            package com.example.catalog.service

            import com.example.catalog.support.CatalogSnapshot
            import com.example.catalog.support.CatalogStatus

            class CatalogService {
                fun read(sku: String): CatalogSnapshot = CatalogSnapshot(sku, CatalogStatus.READY)
            }
            """.trimIndent(),
        )
        addEntry(zos, "api/pom.xml", "<project><parent><groupId>com.example</groupId><artifactId>maven-multi-kotlin</artifactId><version>1.0.0</version></parent><artifactId>api</artifactId></project>")
        addEntry(
            zos,
            "api/src/main/kotlin/com/example/catalog/api/CatalogController.kt",
            """
            package com.example.catalog.api

            import com.example.catalog.service.CatalogService

            class CatalogController(
                private val service: CatalogService = CatalogService(),
            ) {
                fun getCatalog(sku: String) = service.read(sku)
            }
            """.trimIndent(),
        )
    }
    return out.toByteArray()
}
```

```md
## 로컬 실행

Java 또는 순수 Kotlin 소스 ZIP을 업로드할 수 있다.

## 산출물

- Gradle/Maven single module Java/Kotlin 지원
- Gradle/Maven multi module Java/Kotlin 지원
```

- [ ] **Step 4: 전체 애플리케이션 검증을 실행**

Run: `./gradlew check build`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add src/test/kotlin/com/toolhub/classdiagramgenerator/EndToEndTest.kt README.md
git commit -m "test(class-diagram-generator): cover kotlin project uploads"
```

### Task 5: Desktop Kotlin 샘플 프로젝트와 검증 스크립트 추가

**Files:**
- Modify: `sample-projects/README.md`
- Create: `sample-projects/verify-kotlin-samples.sh`
- Create: `sample-projects/gradle-single-kotlin-jdk17/settings.gradle.kts`
- Create: `sample-projects/gradle-single-kotlin-jdk17/build.gradle.kts`
- Create: `sample-projects/gradle-single-kotlin-jdk17/src/main/kotlin/com/example/catalog/service/CatalogService.kt`
- Create: `sample-projects/gradle-single-kotlin-jdk21/**`
- Create: `sample-projects/gradle-multi-kotlin-jdk17/**`
- Create: `sample-projects/gradle-multi-kotlin-jdk21/**`
- Create: `sample-projects/maven-single-kotlin-jdk17/**`
- Create: `sample-projects/maven-single-kotlin-jdk21/**`
- Create: `sample-projects/maven-multi-kotlin-jdk17/**`
- Create: `sample-projects/maven-multi-kotlin-jdk21/**`

- [ ] **Step 1: Kotlin 샘플 검증 스크립트를 먼저 추가하고 실패를 확인**

```bash
#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(git -C "${SCRIPT_DIR}" rev-parse --show-toplevel)"
GRADLEW="${REPO_ROOT}/class-diagram-generator/gradlew"

verify_gradle_sample() {
  local sample_dir="$1"
  echo "[verify] Gradle Kotlin sample: ${sample_dir}"
  "${GRADLEW}" -p "${SCRIPT_DIR}/${sample_dir}" clean build
}

verify_maven_sample() {
  local sample_dir="$1"
  echo "[verify] Maven Kotlin sample: ${sample_dir}"
  xmllint --noout "${SCRIPT_DIR}/${sample_dir}/pom.xml"
  find "${SCRIPT_DIR}/${sample_dir}" -type f -name '*.kt' | sort | grep -q '.'
  rg -q 'data class|sealed class|companion object|inner class|object ' "${SCRIPT_DIR}/${sample_dir}"
}

verify_gradle_sample "gradle-single-kotlin-jdk17"
verify_gradle_sample "gradle-single-kotlin-jdk21"
verify_gradle_sample "gradle-multi-kotlin-jdk17"
verify_gradle_sample "gradle-multi-kotlin-jdk21"
verify_maven_sample "maven-single-kotlin-jdk17"
verify_maven_sample "maven-single-kotlin-jdk21"
verify_maven_sample "maven-multi-kotlin-jdk17"
verify_maven_sample "maven-multi-kotlin-jdk21"

echo "[verify] 모든 Kotlin 샘플 검증이 완료되었습니다."
```

Run: `bash sample-projects/verify-kotlin-samples.sh`
Expected: FAIL because Kotlin 샘플 디렉터리가 아직 존재하지 않음

- [ ] **Step 2: JDK 17 기준 템플릿과 각 변형 샘플의 파일 구성을 생성**

```kotlin
// sample-projects/gradle-single-kotlin-jdk17/settings.gradle.kts
rootProject.name = "gradle-single-kotlin-jdk17"
```

```kotlin
// sample-projects/gradle-single-kotlin-jdk17/build.gradle.kts
plugins {
    kotlin("jvm") version "2.0.21"
}

group = "com.example"
version = "1.0.0"

repositories {
    mavenCentral()
}

java {
    toolchain {
        languageVersion = JavaLanguageVersion.of(17)
    }
}

kotlin {
    jvmToolchain(17)
}

dependencies {
    implementation("org.springframework:spring-context:6.1.14")
}
```

```kotlin
// sample-projects/gradle-single-kotlin-jdk17/src/main/kotlin/com/example/catalog/service/CatalogService.kt
package com.example.catalog.service

import org.springframework.stereotype.Service

/** 카탈로그 서비스. */
@Service
class CatalogService(
    /** 기본 상태 */
    private val status: CatalogStatus = CatalogStatus.READY,
) : CatalogReadable {
    /** 요약 정보를 만든다. */
    fun summarize(sku: String): CatalogSummary = CatalogSummary(sku = sku, status = status)

    override fun read(sku: String): CatalogSummary = summarize(sku)

    companion object {
        /** 비어 있는 SKU */
        const val EMPTY_SKU: String = "EMPTY"
    }

    inner class AuditTrail {
        fun message(): String = "audit:${'$'}status"
    }
}

/** 조회 계약. */
interface CatalogReadable {
    fun read(sku: String): CatalogSummary
}

/** 상태 모델. */
enum class CatalogStatus {
    READY,
    SOLD_OUT,
}

/** 서비스 결과. */
sealed class CatalogResult {
    data class Success(val summary: CatalogSummary) : CatalogResult()
    data class Failure(val reason: String) : CatalogResult()
}

/** 상품 요약. */
data class CatalogSummary(
    /** 상품 식별자 */
    val sku: String,
    /** 상태 */
    val status: CatalogStatus,
)
```

```kotlin
// sample-projects/gradle-multi-kotlin-jdk17/build.gradle.kts
plugins {
    kotlin("jvm") version "2.0.21" apply false
}

subprojects {
    apply(plugin = "org.jetbrains.kotlin.jvm")

    group = "com.example"
    version = "1.0.0"

    repositories {
        mavenCentral()
    }

    java {
        toolchain {
            languageVersion = JavaLanguageVersion.of(17)
        }
    }

    kotlin {
        jvmToolchain(17)
    }

    dependencies {
        implementation("org.springframework:spring-context:6.1.14")
    }
}
```

```xml
<!-- sample-projects/maven-multi-kotlin-jdk17/pom.xml -->
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>
    <groupId>com.example</groupId>
    <artifactId>maven-multi-kotlin-jdk17</artifactId>
    <version>1.0.0</version>
    <packaging>pom</packaging>

    <modules>
        <module>api</module>
        <module>service</module>
        <module>support</module>
    </modules>

    <properties>
        <kotlin.version>2.0.21</kotlin.version>
        <spring.version>6.1.14</spring.version>
        <maven.compiler.release>17</maven.compiler.release>
        <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>
    </properties>

    <build>
        <pluginManagement>
            <plugins>
                <plugin>
                    <groupId>org.jetbrains.kotlin</groupId>
                    <artifactId>kotlin-maven-plugin</artifactId>
                    <version>${kotlin.version}</version>
                    <executions>
                        <execution>
                            <id>compile</id>
                            <phase>compile</phase>
                            <goals><goal>compile</goal></goals>
                            <configuration>
                                <jvmTarget>${maven.compiler.release}</jvmTarget>
                            </configuration>
                        </execution>
                    </executions>
                </plugin>
            </plugins>
        </pluginManagement>
    </build>
</project>
```

Create the remaining sample trees with this exact file set and these exact value changes:
- `sample-projects/gradle-single-kotlin-jdk21`
  - create `settings.gradle.kts`, `build.gradle.kts`, `src/main/kotlin/com/example/catalog/service/CatalogService.kt`
  - copy the JDK 17 single-module contents and replace every toolchain value `17` with `21`
- `sample-projects/gradle-multi-kotlin-jdk17`
  - create `settings.gradle.kts` containing `rootProject.name = "gradle-multi-kotlin-jdk17"` and `include("api", "service", "support")`
  - create root `build.gradle.kts`
  - create `api/build.gradle.kts`, `service/build.gradle.kts`, `support/build.gradle.kts`
  - create `api/src/main/kotlin/com/example/catalog/api/CatalogController.kt`
  - create `service/src/main/kotlin/com/example/catalog/service/CatalogService.kt`
  - create `support/src/main/kotlin/com/example/catalog/support/CatalogSummary.kt`
  - create `support/src/main/kotlin/com/example/catalog/support/CatalogStatus.kt`
  - create `support/src/main/kotlin/com/example/catalog/support/CatalogSupport.kt`
- `sample-projects/gradle-multi-kotlin-jdk21`
  - create `settings.gradle.kts`, root `build.gradle.kts`
  - create `api/build.gradle.kts`, `service/build.gradle.kts`, `support/build.gradle.kts`
  - create `api/src/main/kotlin/com/example/catalog/api/CatalogController.kt`
  - create `service/src/main/kotlin/com/example/catalog/service/CatalogService.kt`
  - create `support/src/main/kotlin/com/example/catalog/support/CatalogSummary.kt`
  - create `support/src/main/kotlin/com/example/catalog/support/CatalogStatus.kt`
  - create `support/src/main/kotlin/com/example/catalog/support/CatalogSupport.kt`
  - replace every toolchain value `17` with `21`
- `sample-projects/maven-single-kotlin-jdk17`
  - create `pom.xml`
  - create `src/main/kotlin/com/example/catalog/service/CatalogService.kt`
- `sample-projects/maven-single-kotlin-jdk21`
  - create `pom.xml`
  - create `src/main/kotlin/com/example/catalog/service/CatalogService.kt`
  - replace `<maven.compiler.release>17</maven.compiler.release>` with `21`
- `sample-projects/maven-multi-kotlin-jdk17`
  - create root `pom.xml`
  - create `api/pom.xml`, `service/pom.xml`, `support/pom.xml`
  - create `api/src/main/kotlin/com/example/catalog/api/CatalogController.kt`
  - create `service/src/main/kotlin/com/example/catalog/service/CatalogService.kt`
  - create `support/src/main/kotlin/com/example/catalog/support/CatalogSummary.kt`
  - create `support/src/main/kotlin/com/example/catalog/support/CatalogStatus.kt`
  - create `support/src/main/kotlin/com/example/catalog/support/CatalogSupport.kt`
- `sample-projects/maven-multi-kotlin-jdk21`
  - create root `pom.xml`
  - create `api/pom.xml`, `service/pom.xml`, `support/pom.xml`
  - create `api/src/main/kotlin/com/example/catalog/api/CatalogController.kt`
  - create `service/src/main/kotlin/com/example/catalog/service/CatalogService.kt`
  - create `support/src/main/kotlin/com/example/catalog/support/CatalogSummary.kt`
  - create `support/src/main/kotlin/com/example/catalog/support/CatalogStatus.kt`
  - create `support/src/main/kotlin/com/example/catalog/support/CatalogSupport.kt`
  - replace `<maven.compiler.release>17</maven.compiler.release>` with `21`
- all multi-module build files must set dependencies exactly as below:
  - `api` depends on `service` and `support`
  - `service` depends on `support`

- [ ] **Step 3: 샘플 README를 업데이트**

```md
# sample-projects

`class-diagram-generator`의 수동 업로드 테스트 및 회귀 검증용 Java/Kotlin 샘플 프로젝트 모음이다.

## 구성

- `gradle-single-kotlin-jdk17`
- `gradle-single-kotlin-jdk21`
- `gradle-multi-kotlin-jdk17`
- `gradle-multi-kotlin-jdk21`
- `maven-single-kotlin-jdk17`
- `maven-single-kotlin-jdk21`
- `maven-multi-kotlin-jdk17`
- `maven-multi-kotlin-jdk21`

## 사용 방법

Kotlin 샘플 검증: `bash ./verify-kotlin-samples.sh`
```

- [ ] **Step 4: 샘플 검증 스크립트를 실행**

Run: `bash sample-projects/verify-kotlin-samples.sh`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add sample-projects/README.md \
  sample-projects/verify-kotlin-samples.sh \
  sample-projects/gradle-single-kotlin-jdk17 \
  sample-projects/gradle-single-kotlin-jdk21 \
  sample-projects/gradle-multi-kotlin-jdk17 \
  sample-projects/gradle-multi-kotlin-jdk21 \
  sample-projects/maven-single-kotlin-jdk17 \
  sample-projects/maven-single-kotlin-jdk21 \
  sample-projects/maven-multi-kotlin-jdk17 \
  sample-projects/maven-multi-kotlin-jdk21
git commit -m "test(class-diagram-generator): add kotlin sample projects"
```
