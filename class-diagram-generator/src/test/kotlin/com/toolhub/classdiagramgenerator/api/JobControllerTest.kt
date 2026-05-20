package com.toolhub.classdiagramgenerator.api

import com.toolhub.classdiagramgenerator.domain.Warning
import com.toolhub.classdiagramgenerator.domain.OutputLanguage
import com.toolhub.classdiagramgenerator.job.ArtifactRecord
import com.toolhub.classdiagramgenerator.job.JobRecord
import com.toolhub.classdiagramgenerator.job.JobStatus
import com.toolhub.classdiagramgenerator.job.JobStore
import io.kotest.core.spec.style.StringSpec
import io.kotest.extensions.spring.SpringExtension
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.mock.web.MockMultipartFile
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.get
import org.springframework.test.web.servlet.multipart
import java.io.ByteArrayOutputStream
import java.nio.file.Files
import java.time.Instant
import java.util.UUID
import java.util.zip.ZipEntry
import java.util.zip.ZipOutputStream

@SpringBootTest
@AutoConfigureMockMvc
class JobControllerTest(
    private val mockMvc: MockMvc,
    private val jobStore: JobStore,
) : StringSpec({
        extensions(SpringExtension)

        "POST /api/v1/jobs returns 202 with jobId" {
            val zipBytes = buildSimpleZip()
            mockMvc
                .multipart("/api/v1/jobs") {
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

        "POST /api/v1/jobs accepts explicit includeDiagrams=false" {
            val zipBytes = buildSimpleZip()
            mockMvc
                .multipart("/api/v1/jobs") {
                    file(MockMultipartFile("file", "src.zip", "application/zip", zipBytes))
                    param("programName", "demo")
                    param("version", "v1.0")
                    param("language", "ko")
                    param("formats", "docx,xlsx,md")
                    param("includeDiagrams", "false")
                }.andExpect {
                    status { isAccepted() }
                    jsonPath("$.jobId") { exists() }
                }
        }

        "rejects invalid programName" {
            val zipBytes = buildSimpleZip()
            mockMvc
                .multipart("/api/v1/jobs") {
                    file(MockMultipartFile("file", "src.zip", "application/zip", zipBytes))
                    param("programName", "한글이름")
                    param("version", "v1.0")
                    param("language", "ko")
                }.andExpect {
                    status { isBadRequest() }
                }
        }

        "GET /api/v1/jobs/{id}/result includes human readable size label" {
            val jobId = UUID.randomUUID()
            val workDir = Files.createTempDirectory("job-controller-test")
            val artifactPath = workDir.resolve("artifact.txt")
            Files.write(artifactPath, ByteArray(1536) { 'a'.code.toByte() })

            jobStore.create(
                JobRecord(
                    id = jobId,
                    programName = "demo",
                    version = "v1.0",
                    language = OutputLanguage.KO,
                    formats = listOf("md"),
                    includeDiagrams = false,
                    status = JobStatus.DONE,
                    workDir = workDir,
                    expiresAt = Instant.parse("2026-05-19T06:00:00Z"),
                    artifacts =
                        mutableListOf(
                            ArtifactRecord(
                                module = "demo",
                                format = "md",
                                filename = "artifact.txt",
                                path = artifactPath,
                                sizeBytes = 1536,
                            ),
                        ),
                ),
            )

            mockMvc.get("/api/v1/jobs/$jobId/result").andExpect {
                status { isOk() }
                jsonPath("$.artifacts[0].sizeBytes") { value(1536) }
                jsonPath("$.artifacts[0].sizeLabel") { value("1.5 KB") }
            }
        }

        "GET /api/v1/jobs/{id}/result includes createdAt and warnings for summary cards" {
            val jobId = UUID.randomUUID()
            val workDir = Files.createTempDirectory("job-result-summary-test")
            val artifactPath = workDir.resolve("artifact.txt")
            Files.write(artifactPath, ByteArray(1536) { 'a'.code.toByte() })

            jobStore.create(
                JobRecord(
                    id = jobId,
                    programName = "demo",
                    version = "v1.0",
                    language = OutputLanguage.KO,
                    formats = listOf("md"),
                    includeDiagrams = false,
                    status = JobStatus.DONE,
                    workDir = workDir,
                    expiresAt = Instant.parse("2026-05-19T06:00:00Z"),
                    warnings =
                        mutableListOf(
                            Warning(
                                code = "SOURCE_ENCODING_FALLBACK",
                                message = "UTF-16BE source decoded with fallback",
                            ),
                        ),
                    artifacts =
                        mutableListOf(
                            ArtifactRecord(
                                module = "demo",
                                format = "md",
                                filename = "artifact.txt",
                                path = artifactPath,
                                sizeBytes = 1536,
                            ),
                        ),
                ),
            )

            mockMvc.get("/api/v1/jobs/$jobId/result").andExpect {
                status { isOk() }
                jsonPath("$.createdAt") { exists() }
                jsonPath("$.warnings[0].code") { value("SOURCE_ENCODING_FALLBACK") }
                jsonPath("$.warnings[0].message") { value("UTF-16BE source decoded with fallback") }
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
