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
import java.io.ByteArrayOutputStream
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
                    file = MockMultipartFile("file", "m.zip", "application/zip", bytes),
                )
            waitForCompletion(rec.id, store)
            val final = store.get(rec.id)!!
            final.status shouldBe JobStatus.DONE
            // 2 modules x 3 formats = 6 artifacts
            final.artifacts.size shouldBe 6
            final.artifacts.all { it.filename.startsWith("class-design_demo_") } shouldBe true
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
