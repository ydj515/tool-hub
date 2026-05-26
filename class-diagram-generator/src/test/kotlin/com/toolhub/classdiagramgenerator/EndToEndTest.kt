package com.toolhub.classdiagramgenerator

import com.toolhub.classdiagramgenerator.domain.OutputLanguage
import com.toolhub.classdiagramgenerator.job.JobService
import com.toolhub.classdiagramgenerator.job.JobStatus
import com.toolhub.classdiagramgenerator.job.JobStore
import io.kotest.core.spec.style.StringSpec
import io.kotest.extensions.spring.SpringExtension
import io.kotest.matchers.shouldBe
import org.apache.poi.xssf.usermodel.XSSFWorkbook
import org.apache.poi.xwpf.usermodel.XWPFDocument
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.mock.web.MockMultipartFile
import java.io.ByteArrayOutputStream
import java.nio.file.Files
import java.util.zip.ZipEntry
import java.util.zip.ZipOutputStream

@SpringBootTest
class EndToEndTest(
    private val service: JobService,
    private val store: JobStore,
) : StringSpec({
        extensions(SpringExtension)

        "multi-module zip yields per-module artifacts in english" {
            val bytes = buildMultiModuleZip()
            val rec =
                service.submit(
                    programName = "demo",
                    version = "v1.0",
                    language = OutputLanguage.EN,
                    formats = listOf("docx", "xlsx", "md"),
                    includeDiagrams = true,
                    file = MockMultipartFile("file", "m.zip", "application/zip", bytes),
                )
            waitForCompletion(rec.id, store)
            val final = store.get(rec.id)!!
            final.status shouldBe JobStatus.DONE
            // 2 modules x 3 formats = 6 artifacts
            final.artifacts.size shouldBe 6
            final.artifacts.all { it.filename.startsWith("class-design_demo_") } shouldBe true
        }

        "three-module Gradle zip yields artifacts for each module and format" {
            val rec =
                service.submit(
                    programName = "demo",
                    version = "v1.0",
                    language = OutputLanguage.EN,
                    formats = listOf("docx", "xlsx", "md"),
                    includeDiagrams = true,
                    file = MockMultipartFile("file", "gradle-three.zip", "application/zip", buildGradleThreeModuleZip()),
                )
            waitForCompletion(rec.id, store)
            val final = store.get(rec.id)!!
            final.status shouldBe JobStatus.DONE
            final.artifacts.size shouldBe 9
            final.artifacts.map { it.module }.toSet() shouldBe setOf("api", "service", "support")
        }

        "three-module Maven zip yields artifacts for each module and format" {
            val rec =
                service.submit(
                    programName = "demo",
                    version = "v1.0",
                    language = OutputLanguage.EN,
                    formats = listOf("docx", "xlsx", "md"),
                    includeDiagrams = true,
                    file = MockMultipartFile("file", "maven-three.zip", "application/zip", buildMavenThreeModuleZip()),
                )
            waitForCompletion(rec.id, store)
            val final = store.get(rec.id)!!
            final.status shouldBe JobStatus.DONE
            final.artifacts.size shouldBe 9
            final.artifacts.map { it.module }.toSet() shouldBe setOf("api", "service", "support")
        }

        "three-module Maven zip inside wrapper directory still yields artifacts for each module and format" {
            val rec =
                service.submit(
                    programName = "demo",
                    version = "v1.0",
                    language = OutputLanguage.EN,
                    formats = listOf("docx", "xlsx", "md"),
                    includeDiagrams = true,
                    file = MockMultipartFile("file", "maven-three-wrapped.zip", "application/zip", buildWrappedMavenThreeModuleZip()),
                )
            waitForCompletion(rec.id, store)
            val final = store.get(rec.id)!!
            final.status shouldBe JobStatus.DONE
            final.artifacts.size shouldBe 9
            final.artifacts.map { it.module }.toSet() shouldBe setOf("api", "service", "support")
        }

        "missing declared module yields warning and keeps present module artifacts" {
            val rec =
                service.submit(
                    programName = "demo",
                    version = "v1.0",
                    language = OutputLanguage.EN,
                    formats = listOf("docx", "xlsx", "md"),
                    includeDiagrams = true,
                    file = MockMultipartFile("file", "maven-missing.zip", "application/zip", buildMavenMissingModuleZip()),
                )
            waitForCompletion(rec.id, store)
            val final = store.get(rec.id)!!
            final.status shouldBe JobStatus.DONE
            final.artifacts.size shouldBe 6
            final.warnings.any { it.code == "MISSING_DECLARED_MODULE" } shouldBe true
        }

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
            final.warnings.isEmpty() shouldBe true
        }

        "single-module Maven Kotlin zip yields 3 artifacts" {
            val rec =
                service.submit(
                    programName = "catalog",
                    version = "v1.0",
                    language = OutputLanguage.EN,
                    formats = listOf("docx", "xlsx", "md"),
                    includeDiagrams = true,
                    file = MockMultipartFile("file", "maven-single-kotlin.zip", "application/zip", buildMavenSingleKotlinZip()),
                )
            waitForCompletion(rec.id, store)
            val final = store.get(rec.id)!!
            final.status shouldBe JobStatus.DONE
            final.artifacts.size shouldBe 3
            final.warnings.isEmpty() shouldBe true
        }

        "three-module Gradle Kotlin zip yields artifacts for each module and format" {
            val rec =
                service.submit(
                    programName = "catalog",
                    version = "v1.0",
                    language = OutputLanguage.EN,
                    formats = listOf("docx", "xlsx", "md"),
                    includeDiagrams = true,
                    file = MockMultipartFile("file", "gradle-three-kotlin.zip", "application/zip", buildGradleThreeModuleKotlinZip()),
                )
            waitForCompletion(rec.id, store)
            val final = store.get(rec.id)!!
            final.status shouldBe JobStatus.DONE
            final.artifacts.size shouldBe 9
            final.artifacts.map { it.module }.toSet() shouldBe setOf("api", "service", "support")
            final.warnings.isEmpty() shouldBe true
        }

        "three-module Maven Kotlin zip yields artifacts for each module and format" {
            val rec =
                service.submit(
                    programName = "catalog",
                    version = "v1.0",
                    language = OutputLanguage.EN,
                    formats = listOf("docx", "xlsx", "md"),
                    includeDiagrams = true,
                    file = MockMultipartFile("file", "maven-three-kotlin.zip", "application/zip", buildMavenThreeModuleKotlinZip()),
                )
            waitForCompletion(rec.id, store)
            val final = store.get(rec.id)!!
            final.status shouldBe JobStatus.DONE
            final.artifacts.size shouldBe 9
            final.artifacts.map { it.module }.toSet() shouldBe setOf("api", "service", "support")
            final.warnings.isEmpty() shouldBe true
        }

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
            XWPFDocument(Files.newInputStream(docxArt.path)).use { doc ->
                (doc.allPictures.size > 0) shouldBe true
            }

            val xlsxArt = final.artifacts.single { it.format == "xlsx" }
            XSSFWorkbook(Files.newInputStream(xlsxArt.path)).use { wb ->
                (wb.allPictures.size > 0) shouldBe true
                (wb.getSheet("Layer Diagrams") != null) shouldBe true
            }

            val mdArt = final.artifacts.single { it.format == "md" }
            val mdText = String(Files.readAllBytes(mdArt.path), Charsets.UTF_8)
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
            XWPFDocument(Files.newInputStream(docxArt.path)).use { doc ->
                doc.allPictures.size shouldBe 0
            }
            val xlsxArt = final.artifacts.single { it.format == "xlsx" }
            XSSFWorkbook(Files.newInputStream(xlsxArt.path)).use { wb ->
                wb.allPictures.size shouldBe 0
                (wb.getSheet("Layer Diagrams") == null) shouldBe true
            }
            val mdArt = final.artifacts.single { it.format == "md" }
            val mdText = String(Files.readAllBytes(mdArt.path), Charsets.UTF_8)
            (mdText.contains("```mermaid")) shouldBe false
        }
    })

private fun waitForCompletion(
    id: java.util.UUID,
    store: JobStore,
) {
    repeat(100) {
        val s = store.get(id)?.status
        if (s == JobStatus.DONE || s == JobStatus.FAILED) return
        Thread.sleep(200)
    }
}

private fun appJavaSource(): String =
    "package com.demo.controller;\n" +
        "/** App controller. */\n" +
        "public class AppController {\n" +
        "    public void ping() {}\n" +
        "}\n"

private fun coreJavaSource(): String =
    "package com.demo.service;\n" +
        "/** Core service. */\n" +
        "public class CoreService {\n" +
        "    private String name;\n" +
        "    public void run() {}\n" +
        "}\n"

private fun settingsGradle(): String =
    "rootProject.name = 'parent'\n" +
        "include 'app'\n" +
        "include 'core'\n"

private fun buildMultiModuleZip(): ByteArray {
    val out = ByteArrayOutputStream()
    ZipOutputStream(out).use { zos ->
        addEntry(zos, "settings.gradle", settingsGradle())
        addEntry(zos, "app/build.gradle", "// noop")
        addEntry(zos, "app/src/main/java/com/demo/controller/AppController.java", appJavaSource())
        addEntry(zos, "core/build.gradle", "// noop")
        addEntry(zos, "core/src/main/java/com/demo/service/CoreService.java", coreJavaSource())
    }
    return out.toByteArray()
}

private fun mavenParentPomWithMissingModule(): String =
    """
    <project>
      <modelVersion>4.0.0</modelVersion>
      <groupId>com.demo</groupId>
      <artifactId>parent</artifactId>
      <packaging>pom</packaging>
      <modules>
        <module>app</module>
        <module>core</module>
        <module>missing</module>
      </modules>
    </project>
    """.trimIndent()

private fun buildMavenMissingModuleZip(): ByteArray {
    val out = ByteArrayOutputStream()
    ZipOutputStream(out).use { zos ->
        addEntry(zos, "pom.xml", mavenParentPomWithMissingModule())
        addEntry(zos, "app/pom.xml", "<project/>")
        addEntry(zos, "app/src/main/java/com/demo/controller/AppController.java", appJavaSource())
        addEntry(zos, "core/pom.xml", "<project/>")
        addEntry(zos, "core/src/main/java/com/demo/service/CoreService.java", coreJavaSource())
    }
    return out.toByteArray()
}

private fun addEntry(
    zos: ZipOutputStream,
    name: String,
    content: String,
) {
    zos.putNextEntry(ZipEntry(name))
    zos.write(content.toByteArray())
    zos.closeEntry()
}

private fun apiJavaSource(): String =
    "package com.demo.api;\n" +
        "/** API controller. */\n" +
        "public class ApiController {\n" +
        "    public void get() {}\n" +
        "}\n"

private fun serviceJavaSource(): String =
    "package com.demo.service;\n" +
        "/** Service entry. */\n" +
        "public class ServiceEntry {\n" +
        "    public void execute() {}\n" +
        "}\n"

private fun supportJavaSource(): String =
    "package com.demo.support;\n" +
        "/** Support utility. */\n" +
        "public class SupportUtil {\n" +
        "    public String format() { return \"ok\"; }\n" +
        "}\n"

private fun gradleThreeModuleSettings(): String =
    "rootProject.name = 'catalog-parent'\n" +
        "include 'api'\n" +
        "include 'service'\n" +
        "include 'support'\n"

private fun buildGradleThreeModuleZip(): ByteArray {
    val out = ByteArrayOutputStream()
    ZipOutputStream(out).use { zos ->
        addEntry(zos, "settings.gradle", gradleThreeModuleSettings())
        addEntry(zos, "api/build.gradle", "// noop")
        addEntry(zos, "api/src/main/java/com/demo/api/ApiController.java", apiJavaSource())
        addEntry(zos, "service/build.gradle", "// noop")
        addEntry(zos, "service/src/main/java/com/demo/service/ServiceEntry.java", serviceJavaSource())
        addEntry(zos, "support/build.gradle", "// noop")
        addEntry(zos, "support/src/main/java/com/demo/support/SupportUtil.java", supportJavaSource())
    }
    return out.toByteArray()
}

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

private fun singleKotlinSource(): String =
    """
    package com.demo.catalog

    /** 상태 타입. */
    enum class CatalogStatus {
        READY,
        SOLD_OUT,
    }

    /** 상품 요약. */
    data class CatalogSummary(
        val sku: String,
        val status: CatalogStatus,
    )

    /** 조회 서비스. */
    class CatalogService {
        fun summaries(): List<CatalogSummary> = listOf(CatalogSummary("CAT-001", CatalogStatus.READY))
    }
    """.trimIndent()

private fun kotlinSupportSource(): String =
    """
    package com.demo.support

    /** 공유 상태 타입. */
    enum class CatalogStatus {
        READY,
        SOLD_OUT,
    }

    /** 공유 요약 뷰. */
    data class CatalogSnapshot(
        val sku: String,
        val status: CatalogStatus,
    )

    /** 공용 포맷터. */
    object CatalogSupport {
        fun normalize(sku: String): String = sku.trim().uppercase()
    }
    """.trimIndent()

private fun kotlinServiceSource(): String =
    """
    package com.demo.service

    import com.demo.support.CatalogSnapshot
    import com.demo.support.CatalogStatus
    import com.demo.support.CatalogSupport

    /** 서비스 계약. */
    interface CatalogReadable {
        fun findAll(): List<CatalogSnapshot>
    }

    /** 상품 서비스. */
    class CatalogService : CatalogReadable {
        override fun findAll(): List<CatalogSnapshot> =
            listOf(CatalogSnapshot(CatalogSupport.normalize("cat-001"), CatalogStatus.READY))
    }
    """.trimIndent()

private fun kotlinApiSource(): String =
    """
    package com.demo.api

    import com.demo.service.CatalogReadable
    import com.demo.service.CatalogService
    import com.demo.support.CatalogSnapshot

    /** API 진입점. */
    class CatalogController(
        private val catalogService: CatalogReadable = CatalogService(),
    ) {
        fun list(): List<CatalogSnapshot> = catalogService.findAll()
    }
    """.trimIndent()

private fun buildGradleSingleKotlinZip(): ByteArray {
    val out = ByteArrayOutputStream()
    ZipOutputStream(out).use { zos ->
        addEntry(zos, "settings.gradle.kts", """rootProject.name = "gradle-single-kotlin"""")
        addEntry(
            zos,
            "build.gradle.kts",
            """
            plugins {
                kotlin("jvm") version "2.0.21"
            }
            """.trimIndent(),
        )
        addEntry(zos, "src/main/kotlin/com/demo/catalog/CatalogModule.kt", singleKotlinSource())
    }
    return out.toByteArray()
}

private fun buildMavenSingleKotlinZip(): ByteArray {
    val out = ByteArrayOutputStream()
    ZipOutputStream(out).use { zos ->
        addEntry(
            zos,
            "pom.xml",
            """
            <project>
              <modelVersion>4.0.0</modelVersion>
              <groupId>com.demo</groupId>
              <artifactId>maven-single-kotlin</artifactId>
            </project>
            """.trimIndent(),
        )
        addEntry(zos, "src/main/kotlin/com/demo/catalog/CatalogModule.kt", singleKotlinSource())
    }
    return out.toByteArray()
}

private fun buildGradleThreeModuleKotlinZip(): ByteArray {
    val out = ByteArrayOutputStream()
    ZipOutputStream(out).use { zos ->
        addEntry(
            zos,
            "settings.gradle.kts",
            """
            rootProject.name = "gradle-multi-kotlin"
            include("api", "service", "support")
            """.trimIndent(),
        )
        addEntry(zos, "build.gradle.kts", "// root")
        addEntry(zos, "api/build.gradle.kts", """plugins { kotlin("jvm") version "2.0.21" }""")
        addEntry(zos, "service/build.gradle.kts", """plugins { kotlin("jvm") version "2.0.21" }""")
        addEntry(zos, "support/build.gradle.kts", """plugins { kotlin("jvm") version "2.0.21" }""")
        addEntry(zos, "api/src/main/kotlin/com/demo/api/CatalogController.kt", kotlinApiSource())
        addEntry(zos, "service/src/main/kotlin/com/demo/service/CatalogService.kt", kotlinServiceSource())
        addEntry(zos, "support/src/main/kotlin/com/demo/support/CatalogSupport.kt", kotlinSupportSource())
    }
    return out.toByteArray()
}

private fun buildMavenThreeModuleKotlinZip(): ByteArray {
    val out = ByteArrayOutputStream()
    ZipOutputStream(out).use { zos ->
        addEntry(
            zos,
            "pom.xml",
            """
            <project>
              <modelVersion>4.0.0</modelVersion>
              <groupId>com.demo</groupId>
              <artifactId>maven-multi-kotlin</artifactId>
              <packaging>pom</packaging>
              <modules>
                <module>api</module>
                <module>service</module>
                <module>support</module>
              </modules>
            </project>
            """.trimIndent(),
        )
        addEntry(zos, "api/pom.xml", "<project/>")
        addEntry(zos, "service/pom.xml", "<project/>")
        addEntry(zos, "support/pom.xml", "<project/>")
        addEntry(zos, "api/src/main/kotlin/com/demo/api/CatalogController.kt", kotlinApiSource())
        addEntry(zos, "service/src/main/kotlin/com/demo/service/CatalogService.kt", kotlinServiceSource())
        addEntry(zos, "support/src/main/kotlin/com/demo/support/CatalogSupport.kt", kotlinSupportSource())
    }
    return out.toByteArray()
}

private fun mavenThreeModulePom(): String =
    """
    <project>
      <modelVersion>4.0.0</modelVersion>
      <groupId>com.demo</groupId>
      <artifactId>catalog-parent</artifactId>
      <packaging>pom</packaging>
      <modules>
        <module>api</module>
        <module>service</module>
        <module>support</module>
      </modules>
    </project>
    """.trimIndent()

private fun buildMavenThreeModuleZip(): ByteArray {
    val out = ByteArrayOutputStream()
    ZipOutputStream(out).use { zos ->
        addEntry(zos, "pom.xml", mavenThreeModulePom())
        addEntry(zos, "api/pom.xml", "<project/>")
        addEntry(zos, "api/src/main/java/com/demo/api/ApiController.java", apiJavaSource())
        addEntry(zos, "service/pom.xml", "<project/>")
        addEntry(zos, "service/src/main/java/com/demo/service/ServiceEntry.java", serviceJavaSource())
        addEntry(zos, "support/pom.xml", "<project/>")
        addEntry(zos, "support/src/main/java/com/demo/support/SupportUtil.java", supportJavaSource())
    }
    return out.toByteArray()
}

private fun buildWrappedMavenThreeModuleZip(): ByteArray {
    val out = ByteArrayOutputStream()
    ZipOutputStream(out).use { zos ->
        addEntry(zos, "maven-multi-jdk17/pom.xml", mavenThreeModulePom())
        addEntry(zos, "maven-multi-jdk17/api/pom.xml", "<project/>")
        addEntry(zos, "maven-multi-jdk17/api/src/main/java/com/demo/api/ApiController.java", apiJavaSource())
        addEntry(zos, "maven-multi-jdk17/service/pom.xml", "<project/>")
        addEntry(zos, "maven-multi-jdk17/service/src/main/java/com/demo/service/ServiceEntry.java", serviceJavaSource())
        addEntry(zos, "maven-multi-jdk17/support/pom.xml", "<project/>")
        addEntry(zos, "maven-multi-jdk17/support/src/main/java/com/demo/support/SupportUtil.java", supportJavaSource())
    }
    return out.toByteArray()
}
