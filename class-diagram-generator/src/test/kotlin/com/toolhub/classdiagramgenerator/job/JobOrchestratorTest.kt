package com.toolhub.classdiagramgenerator.job

import com.toolhub.classdiagramgenerator.domain.OutputLanguage
import io.kotest.core.spec.style.StringSpec
import io.kotest.extensions.spring.SpringExtension
import io.kotest.matchers.collections.shouldHaveSize
import io.kotest.matchers.shouldBe
import io.kotest.matchers.string.shouldNotContain
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.mock.web.MockMultipartFile
import java.io.ByteArrayOutputStream
import java.lang.reflect.InvocationTargetException
import java.nio.charset.Charset
import java.nio.charset.StandardCharsets
import java.nio.file.Files
import java.nio.file.Path
import java.time.Instant
import java.util.UUID
import java.util.zip.ZipEntry
import java.util.zip.ZipOutputStream

@SpringBootTest
class JobOrchestratorTest(
    private val service: JobService,
    private val store: JobStore,
    private val orchestrator: JobOrchestrator,
) : StringSpec({
        extensions(SpringExtension)

        "happy path produces 3 artifacts for single module ko" {
            val bytes = buildJavaZip()
            val file = MockMultipartFile("file", "x.zip", "application/zip", bytes)
            val rec = service.submit("demo", "v1.0", OutputLanguage.KO, listOf("docx", "xlsx", "md"), true, file)
            waitForCompletion(rec.id, store)
            val final = store.get(rec.id)!!
            final.status shouldBe JobStatus.DONE
            final.artifacts shouldHaveSize 3
            final.warnings shouldHaveSize 0
        }

        "happy path produces 3 artifacts for kotlin single module ko" {
            val bytes = buildKotlinZip()
            val file = MockMultipartFile("file", "kotlin.zip", "application/zip", bytes)
            val rec = service.submit("demo-kotlin", "v1.0", OutputLanguage.KO, listOf("docx", "xlsx", "md"), true, file)

            waitForCompletion(rec.id, store)
            val final = store.get(rec.id)!!
            final.status shouldBe JobStatus.DONE
            final.artifacts shouldHaveSize 3
        }

        "UTF-16BE source completes with fallback warning" {
            val bytes = buildJavaZip(StandardCharsets.UTF_16BE)
            val file = MockMultipartFile("file", "x.zip", "application/zip", bytes)

            val rec = service.submit("demo", "v1.0", OutputLanguage.KO, listOf("docx", "xlsx", "md"), true, file)

            waitForCompletion(rec.id, store)
            val final = store.get(rec.id)!!
            final.status shouldBe JobStatus.DONE
            final.warnings.single().code shouldBe "SOURCE_ENCODING_FALLBACK"
            final.artifacts shouldHaveSize 3
        }

        "artifact filenames are sanitized and stay within the output directory" {
            val bytes = buildJavaZip()
            val file = MockMultipartFile("file", "x.zip", "application/zip", bytes)

            val rec = service.submit("demo/../../oops", "../v1.0", OutputLanguage.KO, listOf("md"), true, file)

            waitForCompletion(rec.id, store)
            val final = store.get(rec.id)!!

            final.status shouldBe JobStatus.DONE
            final.artifacts shouldHaveSize 1
            final.artifacts
                .single()
                .filename
                .contains('/') shouldBe false
            final.artifacts
                .single()
                .filename
                .contains('\\') shouldBe false
            final.artifacts
                .single()
                .path
                .normalize()
                .startsWith(final.workDir.resolve("output").normalize()) shouldBe true
        }

        "unsupported analyzer error is classified without leaking absolute paths" {
            val record =
                JobRecord(
                    id = UUID.randomUUID(),
                    programName = "demo",
                    version = "v1.0",
                    language = OutputLanguage.KO,
                    formats = listOf("md"),
                    includeDiagrams = false,
                    status = JobStatus.RUNNING,
                    workDir = Files.createTempDirectory("job-orchestrator-error-"),
                    createdAt = Instant.now(),
                )
            val path = Path.of("/tmp/secret/workspace/Foo.scala")

            val thrown =
                runCatching { invokeAnalyzerFor(orchestrator, path) }
                    .exceptionOrNull() as Exception

            invokeHandleFailure(orchestrator, record, thrown)

            record.status shouldBe JobStatus.FAILED
            record.errorCode shouldBe "UNSUPPORTED_SOURCE_TYPE"
            record.errorMessage shouldBe "Unsupported source file type: Foo.scala"
            record.errorMessage.shouldNotContain("/tmp/secret/workspace")
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

private fun buildKotlinZip(): ByteArray {
    val out = ByteArrayOutputStream()
    ZipOutputStream(out).use { zos ->
        zos.putNextEntry(ZipEntry("build.gradle.kts"))
        zos.write("// noop".toByteArray())
        zos.closeEntry()
        zos.putNextEntry(ZipEntry("src/main/kotlin/com/demo/service/UserService.kt"))
        zos.write(
            """
            package com.demo.service

            interface Saver

            class UserService : Saver {
                private val name: String = "user"

                fun save() {}
            }
            """.trimIndent().toByteArray(StandardCharsets.UTF_8),
        )
        zos.closeEntry()
    }
    return out.toByteArray()
}

private fun invokeAnalyzerFor(
    orchestrator: JobOrchestrator,
    path: Path,
): Any? {
    val method =
        JobOrchestrator::class.java.getDeclaredMethod("analyzerFor", Path::class.java).apply {
            isAccessible = true
        }
    return try {
        method.invoke(orchestrator, path)
    } catch (e: InvocationTargetException) {
        throw (e.targetException as? Exception ?: e)
    }
}

private fun invokeHandleFailure(
    orchestrator: JobOrchestrator,
    record: JobRecord,
    exception: Exception,
) {
    val method =
        JobOrchestrator::class.java.getDeclaredMethod("handleFailure", JobRecord::class.java, Exception::class.java).apply {
            isAccessible = true
        }
    method.invoke(orchestrator, record, exception)
}
