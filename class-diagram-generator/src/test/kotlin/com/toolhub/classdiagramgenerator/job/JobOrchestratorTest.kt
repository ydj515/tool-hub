package com.toolhub.classdiagramgenerator.job

import com.toolhub.classdiagramgenerator.domain.OutputLanguage
import io.kotest.core.spec.style.StringSpec
import io.kotest.extensions.spring.SpringExtension
import io.kotest.matchers.collections.shouldHaveSize
import io.kotest.matchers.shouldBe
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.mock.web.MockMultipartFile
import java.io.ByteArrayOutputStream
import java.nio.charset.Charset
import java.nio.charset.StandardCharsets
import java.util.zip.ZipEntry
import java.util.zip.ZipOutputStream

@SpringBootTest
class JobOrchestratorTest(
    private val service: JobService,
    private val store: JobStore,
) : StringSpec({
        extensions(SpringExtension)

        "happy path produces 3 artifacts for single module ko" {
            val bytes = buildJavaZip()
            val file = MockMultipartFile("file", "x.zip", "application/zip", bytes)
            val rec = service.submit("demo", "v1.0", OutputLanguage.KO, listOf("docx", "xlsx", "md"), file)
            waitForCompletion(rec.id, store)
            val final = store.get(rec.id)!!
            final.status shouldBe JobStatus.DONE
            final.artifacts shouldHaveSize 3
        }

        "UTF-16BE source completes with fallback warning" {
            val bytes = buildJavaZip(StandardCharsets.UTF_16BE)
            val file = MockMultipartFile("file", "x.zip", "application/zip", bytes)

            val rec = service.submit("demo", "v1.0", OutputLanguage.KO, listOf("docx", "xlsx", "md"), file)

            waitForCompletion(rec.id, store)
            val final = store.get(rec.id)!!
            final.status shouldBe JobStatus.DONE
            final.warnings.single().code shouldBe "SOURCE_ENCODING_FALLBACK"
            final.artifacts shouldHaveSize 3
        }
    })

private fun waitForCompletion(
    id: java.util.UUID,
    store: JobStore,
) {
    repeat(50) {
        if (store.get(id)?.status == JobStatus.DONE || store.get(id)?.status == JobStatus.FAILED) return
        Thread.sleep(200)
    }
}

private fun buildJavaZip(charset: Charset = StandardCharsets.UTF_8): ByteArray {
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
            """.trimIndent().toByteArray(charset),
        )
        zos.closeEntry()
    }
    return out.toByteArray()
}
