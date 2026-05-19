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

private fun addEntry(
    zos: ZipOutputStream,
    name: String,
    content: String,
) {
    zos.putNextEntry(ZipEntry(name))
    zos.write(content.toByteArray())
    zos.closeEntry()
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
