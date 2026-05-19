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
class JobControllerTest(
    private val mockMvc: MockMvc,
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
