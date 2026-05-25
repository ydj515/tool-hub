# Java Multi-Module Support Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Gradle/Maven Java 멀티모듈 프로젝트를 모듈별 산출물로 생성하고, 결과 페이지에서 전체 묶음과 포맷별 다운로드를 모두 제공한다.

**Architecture:** `ProjectDetector`를 선언 기반 멀티모듈 감지 구조로 확장하고, `JobController`가 포맷별 다운로드를 직접 파일 또는 zip으로 분기해 제공한다. 결과 페이지는 모듈별 목록을 유지하되 다운로드 액션은 포맷별 중심으로 재구성한다.

**Tech Stack:** Kotlin, Spring Boot MockMvc, Kotest, Thymeleaf, Vanilla JS

---

## File Structure

- Modify: `src/main/kotlin/com/toolhub/classdiagramgenerator/input/ProjectDetector.kt`
  - Gradle/Maven 멀티모듈 선언 감지, 누락 모듈 warning 처리, 루트 소스 제외 규칙 담당
- Modify: `src/main/kotlin/com/toolhub/classdiagramgenerator/job/JobOrchestrator.kt`
  - `ProjectDetector` warning을 `JobRecord.warnings`로 연결
- Modify: `src/test/kotlin/com/toolhub/classdiagramgenerator/input/ProjectDetectorTest.kt`
  - 멀티모듈 감지 규칙 회귀 테스트 담당
- Modify: `src/test/kotlin/com/toolhub/classdiagramgenerator/EndToEndTest.kt`
  - Gradle/Maven 멀티모듈 artifact 생성 종단 테스트 담당
- Modify: `src/main/kotlin/com/toolhub/classdiagramgenerator/api/dto/JobDtos.kt`
  - 포맷별 다운로드 DTO 추가
- Modify: `src/main/kotlin/com/toolhub/classdiagramgenerator/api/JobController.kt`
  - 결과 응답 확장, 포맷별 다운로드 API 추가
- Modify: `src/test/kotlin/com/toolhub/classdiagramgenerator/api/JobControllerTest.kt`
  - 포맷별 다운로드 API와 결과 DTO 회귀 테스트 담당
- Modify: `src/main/resources/templates/result.html`
  - 전체 묶음 + 포맷별 다운로드 액션 영역 렌더링
- Modify: `src/main/resources/static/js/result.js`
  - 결과 응답의 포맷별 다운로드를 버튼으로 표시
- Modify: `src/test/kotlin/com/toolhub/classdiagramgenerator/web/ViewControllerTest.kt`
  - 결과 페이지 액션 영역 렌더링 검증
- Modify: `src/main/resources/messages.properties`
  - 한국어 다운로드 액션 라벨 추가
- Modify: `src/main/resources/messages_en.properties`
  - 영어 다운로드 액션 라벨 추가
- Modify: `../sample-projects/README.md`
  - 멀티모듈 샘플 설명 추가
- Create: `../sample-projects/gradle-multi-jdk17/**`
- Create: `../sample-projects/gradle-multi-jdk21/**`
- Create: `../sample-projects/maven-multi-jdk17/**`
- Create: `../sample-projects/maven-multi-jdk21/**`
  - 업로드 회귀 검증용 3모듈 샘플

### Task 1: 멀티모듈 감지 규칙 확장

**Files:**
- Modify: `src/test/kotlin/com/toolhub/classdiagramgenerator/input/ProjectDetectorTest.kt`
- Modify: `src/main/kotlin/com/toolhub/classdiagramgenerator/input/ProjectDetector.kt`
- Modify: `src/main/kotlin/com/toolhub/classdiagramgenerator/job/JobOrchestrator.kt`

- [ ] **Step 1: Maven 멀티모듈과 선언 우선 규칙의 failing test를 추가**

```kotlin
"detects Maven multi-module project from parent pom modules" {
    val root = Files.createTempDirectory("maven-multi-")
    root.resolve("pom.xml").writeText(
        """
        <project>
          <modelVersion>4.0.0</modelVersion>
          <groupId>com.example</groupId>
          <artifactId>catalog-parent</artifactId>
          <packaging>pom</packaging>
          <modules>
            <module>api</module>
            <module>service</module>
            <module>support</module>
          </modules>
        </project>
        """.trimIndent(),
    )
    listOf("api", "service", "support").forEach { name ->
        val src = root.resolve("$name/src/main/java")
        src.createDirectories()
        root.resolve("$name/pom.xml").writeText("<project/>")
        src.resolve("${name.replaceFirstChar(Char::uppercase)}Type.java").writeText("class X {}")
    }

    val result = detector.detect(root, fallbackName = "fb")
    val modules = result.modules.map { it.name }.sorted()

    modules shouldBe listOf("api", "service", "support")
}

"ignores root java sources when Gradle multi-module declarations exist" {
    val root = Files.createTempDirectory("gradle-multi-root-")
    root.resolve("settings.gradle.kts").writeText("""include("api", "service")""")
    root.resolve("src/main/java").createDirectories()
    root.resolve("src/main/java/RootType.java").writeText("class RootType {}")
    listOf("api", "service").forEach { name ->
        val src = root.resolve("$name/src/main/java")
        src.createDirectories()
        root.resolve("$name/build.gradle.kts").writeText("// noop")
        src.resolve("${name.replaceFirstChar(Char::uppercase)}Type.java").writeText("class X {}")
    }

    val modules = detector.detect(root, fallbackName = "fb").modules

    modules.map { it.name }.sorted() shouldBe listOf("api", "service")
    modules.flatMap { it.sourceFiles }.none { it.fileName.toString() == "RootType.java" } shouldBe true
}

"returns warning when declared module directory is missing" {
    val root = Files.createTempDirectory("maven-missing-module-")
    root.resolve("pom.xml").writeText(
        """
        <project>
          <packaging>pom</packaging>
          <modules>
            <module>api</module>
            <module>missing</module>
          </modules>
        </project>
        """.trimIndent(),
    )
    val src = root.resolve("api/src/main/java")
    src.createDirectories()
    root.resolve("api/pom.xml").writeText("<project/>")
    src.resolve("ApiType.java").writeText("class ApiType {}")

    val result = detector.detect(root, fallbackName = "fb")

    result.modules.map { it.name } shouldBe listOf("api")
    result.warnings.single().code shouldBe "MISSING_DECLARED_MODULE"
}
```

- [ ] **Step 2: 실패를 확인**

Run: `./gradlew test --tests 'com.toolhub.classdiagramgenerator.input.ProjectDetectorTest'`
Expected: FAIL because Maven `<modules>` 기반 멀티모듈 감지, 루트 소스 제외, warning 반환 규칙이 아직 구현되지 않음

- [ ] **Step 3: `ProjectDetector`에 Maven `<modules>` 파싱과 선언 기반 모듈 수집을 구현**

```kotlin
data class ProjectDetectionResult(
    val modules: List<ModuleDescriptor>,
    val warnings: List<Warning> = emptyList(),
)

fun detect(
    root: Path,
    fallbackName: String,
): ProjectDetectionResult {
    detectGradleModules(root)?.let { return it }
    detectMavenModules(root)?.let { return it }
    return detectSingleModuleOrFallback(root, fallbackName)
}

private fun detectGradleModules(root: Path): ProjectDetectionResult? {
    val settings = listOf("settings.gradle", "settings.gradle.kts")
        .map(root::resolve)
        .firstOrNull { it.exists() } ?: return null
    val includes = parseGradleIncludes(settings.readText())
    if (includes.isEmpty()) return null
    val warnings = mutableListOf<Warning>()
    val modules = includes.mapNotNull { moduleFromDeclaredPath(root, it, "gradle", warnings) }
    return ProjectDetectionResult(modules = modules, warnings = warnings)
}

private fun detectMavenModules(root: Path): ProjectDetectionResult? {
    val pom = root.resolve("pom.xml")
    if (!pom.exists()) return null
    val modules = parseMavenModules(pom.readText())
    if (modules.isEmpty()) return null
    val warnings = mutableListOf<Warning>()
    val declared = modules.mapNotNull { moduleFromDeclaredPath(root, it, "maven", warnings) }
    return ProjectDetectionResult(modules = declared, warnings = warnings)
}
```

- [ ] **Step 3a: `JobOrchestrator`에 detector warning 연결을 구현**

```kotlin
stage(record, Stage.DETECTING_MODULES, PCT_DETECT)
val detection = projectDetector.detect(inputDir, fallbackName = record.programName)
detection.warnings.forEach { addWarning(record, it) }
val modules = detection.modules
```

- [ ] **Step 4: 테스트가 통과하는지 확인**

Run: `./gradlew test --tests 'com.toolhub.classdiagramgenerator.input.ProjectDetectorTest'`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add src/main/kotlin/com/toolhub/classdiagramgenerator/input/ProjectDetector.kt \
  src/main/kotlin/com/toolhub/classdiagramgenerator/job/JobOrchestrator.kt \
  src/test/kotlin/com/toolhub/classdiagramgenerator/input/ProjectDetectorTest.kt
git commit -m "feat(class-diagram-generator): detect gradle and maven multi-module projects"
```

### Task 2: 멀티모듈 artifact 생성 종단 검증

**Files:**
- Modify: `src/test/kotlin/com/toolhub/classdiagramgenerator/EndToEndTest.kt`

- [ ] **Step 1: Gradle/Maven 3모듈 종단 failing test를 추가**

```kotlin
"maven multi-module zip yields per-module artifacts in english" {
    val rec = service.submit(
        programName = "demo",
        version = "v1.0",
        language = OutputLanguage.EN,
        formats = listOf("docx", "xlsx", "md"),
        includeDiagrams = true,
        file = MockMultipartFile("file", "maven-multi.zip", "application/zip", buildMavenMultiModuleZip()),
    )
    waitForCompletion(rec.id, store)
    val final = store.get(rec.id)!!
    final.status shouldBe JobStatus.DONE
    final.artifacts.size shouldBe 9
    final.artifacts.map { it.module }.toSet() shouldBe setOf("api", "service", "support")
    final.artifacts.filter { it.format == "xlsx" }.size shouldBe 3
}
```

- [ ] **Step 2: 실패를 확인**

Run: `./gradlew test --tests 'com.toolhub.classdiagramgenerator.EndToEndTest'`
Expected: FAIL because Maven 멀티모듈 ZIP이 아직 3모듈 artifact로 생성되지 않음

- [ ] **Step 3: fixture helper를 추가하고 최소 보정 구현이 필요하면 적용**

```kotlin
private fun buildMavenMultiModuleZip(): ByteArray {
    val out = ByteArrayOutputStream()
    ZipOutputStream(out).use { zos ->
        addEntry(zos, "pom.xml", parentPomXml())
        addEntry(zos, "support/pom.xml", childPomXml("support"))
        addEntry(zos, "support/src/main/java/com/example/catalog/support/CatalogSupport.java", supportJavaSource())
        addEntry(zos, "service/pom.xml", childPomXml("service"))
        addEntry(zos, "service/src/main/java/com/example/catalog/service/CatalogService.java", serviceJavaSource())
        addEntry(zos, "api/pom.xml", childPomXml("api"))
        addEntry(zos, "api/src/main/java/com/example/catalog/api/CatalogController.java", apiJavaSource())
    }
    return out.toByteArray()
}
```

- [ ] **Step 4: 테스트가 통과하는지 확인**

Run: `./gradlew test --tests 'com.toolhub.classdiagramgenerator.EndToEndTest'`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add src/test/kotlin/com/toolhub/classdiagramgenerator/EndToEndTest.kt
git commit -m "test(class-diagram-generator): cover gradle and maven multi-module artifacts"
```

### Task 3: 포맷별 다운로드 API와 결과 DTO 확장

**Files:**
- Modify: `src/test/kotlin/com/toolhub/classdiagramgenerator/api/JobControllerTest.kt`
- Modify: `src/main/kotlin/com/toolhub/classdiagramgenerator/api/dto/JobDtos.kt`
- Modify: `src/main/kotlin/com/toolhub/classdiagramgenerator/api/JobController.kt`

- [ ] **Step 1: 결과 DTO와 포맷별 다운로드 API failing test를 추가**

```kotlin
"GET /api/v1/jobs/{id}/result includes format download summaries" {
    mockMvc.get("/api/v1/jobs/$jobId/result").andExpect {
        status { isOk() }
        jsonPath("$.formatDownloads[0].format") { value("xlsx") }
        jsonPath("$.formatDownloads[0].downloadUrl") { value("/api/v1/jobs/$jobId/downloads/xlsx") }
    }
}

"GET /api/v1/jobs/{id}/downloads/{format} returns zip for multi-module artifacts" {
    val response = mockMvc.get("/api/v1/jobs/$jobId/downloads/xlsx").andExpect {
        status { isOk() }
        content { contentTypeCompatibleWith("application/zip") }
    }.andReturn().response.contentAsByteArray

    ZipInputStream(ByteArrayInputStream(response)).use { zip ->
        zip.nextEntry.name.endsWith(".xlsx") shouldBe true
    }
}
```

- [ ] **Step 2: 실패를 확인**

Run: `./gradlew test --tests 'com.toolhub.classdiagramgenerator.api.JobControllerTest'`
Expected: FAIL because `formatDownloads`와 `/downloads/{format}` API가 아직 없음

- [ ] **Step 3: DTO와 Controller를 최소 구현**

```kotlin
data class FormatDownloadSummary(
    val format: String,
    val artifactCount: Int,
    val downloadUrl: String,
    val archive: Boolean,
)

@GetMapping("/{id}/downloads/{format}")
fun downloadByFormat(
    @PathVariable id: UUID,
    @PathVariable format: String,
): ResponseEntity<out Any> {
    val rec = jobStore.get(id) ?: throw NoSuchElementException("Job not found: $id")
    val artifacts = rec.artifacts.filter { it.format == format.lowercase() }
    require(artifacts.isNotEmpty()) { "No artifacts for format: $format" }
    if (artifacts.size == 1) {
        val artifact = artifacts.single()
        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"${artifact.filename}\"")
            .body(FileSystemResource(artifact.path))
    }
    val body = StreamingResponseBody { output ->
        ZipOutputStream(output).use { zos ->
            artifacts.forEach { art ->
                zos.putNextEntry(ZipEntry(art.filename))
                Files.copy(art.path, zos)
                zos.closeEntry()
            }
            zos.finish()
        }
    }
    return ResponseEntity.ok()
        .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"bundle-$id-$format.zip\"")
        .contentType(MediaType.parseMediaType("application/zip"))
        .body(body)
}
```

- [ ] **Step 4: 테스트가 통과하는지 확인**

Run: `./gradlew test --tests 'com.toolhub.classdiagramgenerator.api.JobControllerTest'`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add src/main/kotlin/com/toolhub/classdiagramgenerator/api/dto/JobDtos.kt \
  src/main/kotlin/com/toolhub/classdiagramgenerator/api/JobController.kt \
  src/test/kotlin/com/toolhub/classdiagramgenerator/api/JobControllerTest.kt
git commit -m "feat(class-diagram-generator): add format-specific downloads"
```

### Task 4: 결과 페이지 포맷별 다운로드 UI 추가

**Files:**
- Modify: `src/test/kotlin/com/toolhub/classdiagramgenerator/web/ViewControllerTest.kt`
- Modify: `src/main/resources/templates/result.html`
- Modify: `src/main/resources/static/js/result.js`
- Modify: `src/main/resources/messages.properties`
- Modify: `src/main/resources/messages_en.properties`

- [ ] **Step 1: 결과 페이지 렌더링 failing test를 추가**

```kotlin
"GET /jobs/{id}/result renders bundle and format download actions" {
    mockMvc.get("/jobs/00000000-0000-0000-0000-000000000001/result").andExpect {
        status { isOk() }
        content { string(org.hamcrest.Matchers.containsString("id=\"bundleBtn\"")) }
        content { string(org.hamcrest.Matchers.containsString("id=\"formatDownloads\"")) }
        content { string(org.hamcrest.Matchers.containsString("window.__resultLabels")) }
    }
}
```

- [ ] **Step 2: 실패를 확인**

Run: `./gradlew test --tests 'com.toolhub.classdiagramgenerator.web.ViewControllerTest'`
Expected: FAIL because 포맷별 다운로드 액션 영역이 아직 없음

- [ ] **Step 3: 템플릿과 JS, 메시지를 최소 구현**

```html
<div class="mmu-download-actions" id="formatDownloads" aria-live="polite"></div>
```

```javascript
function buildFormatDownloadButton(item) {
    const link = el('a', 'btn btn-outline-primary btn-sm btn-with-icon');
    link.href = item.downloadUrl;
    link.append(icon('bi-download'), el('span', null, item.label));
    return link;
}

const formatContainer = document.getElementById('formatDownloads');
formatContainer.replaceChildren();
(data.formatDownloads ?? []).forEach((item) => {
    formatContainer.appendChild(buildFormatDownloadButton({
        ...item,
        label: `${(item.format ?? '').toUpperCase()} ${resultLabels.download}`,
    }));
});
```

- [ ] **Step 4: 테스트가 통과하는지 확인**

Run: `./gradlew test --tests 'com.toolhub.classdiagramgenerator.web.ViewControllerTest'`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add src/main/resources/templates/result.html \
  src/main/resources/static/js/result.js \
  src/main/resources/messages.properties \
  src/main/resources/messages_en.properties \
  src/test/kotlin/com/toolhub/classdiagramgenerator/web/ViewControllerTest.kt
git commit -m "feat(class-diagram-generator): show format downloads on result page"
```

### Task 5: sample-projects 멀티모듈 샘플 추가와 최종 검증

**Files:**
- Modify: `../sample-projects/README.md`
- Create: `../sample-projects/gradle-multi-jdk17/**`
- Create: `../sample-projects/gradle-multi-jdk21/**`
- Create: `../sample-projects/maven-multi-jdk17/**`
- Create: `../sample-projects/maven-multi-jdk21/**`

- [ ] **Step 1: 샘플 프로젝트 설명 failing check를 추가**

```bash
rg -n "gradle-multi-jdk17|gradle-multi-jdk21|maven-multi-jdk17|maven-multi-jdk21" ../sample-projects/README.md
```

Expected: no matches before update

- [ ] **Step 2: 4개 샘플 디렉터리와 3모듈 소스를 추가**

```text
sample-projects/gradle-multi-jdk21/
  settings.gradle.kts
  build.gradle.kts
  api/build.gradle.kts
  service/build.gradle.kts
  support/build.gradle.kts
  api/src/main/java/com/example/catalog/api/CatalogController.java
  service/src/main/java/com/example/catalog/service/CatalogService.java
  support/src/main/java/com/example/catalog/support/CatalogSupport.java
```

- [ ] **Step 3: README를 갱신**

```markdown
- `gradle-multi-jdk17`: Gradle Kotlin DSL 멀티모듈, JDK 17
- `gradle-multi-jdk21`: Gradle Kotlin DSL 멀티모듈, JDK 21
- `maven-multi-jdk17`: Maven 멀티모듈, JDK 17
- `maven-multi-jdk21`: Maven 멀티모듈, JDK 21
```

- [ ] **Step 4: 전체 검증**

Run: `./gradlew check build`
Expected: BUILD SUCCESSFUL

- [ ] **Step 5: 커밋**

```bash
git add ../sample-projects/README.md \
  ../sample-projects/gradle-multi-jdk17 \
  ../sample-projects/gradle-multi-jdk21 \
  ../sample-projects/maven-multi-jdk17 \
  ../sample-projects/maven-multi-jdk21
git commit -m "test(sample-projects): add java multi-module upload fixtures"
```
