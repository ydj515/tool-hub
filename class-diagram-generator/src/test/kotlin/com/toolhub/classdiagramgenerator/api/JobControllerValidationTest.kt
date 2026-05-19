package com.toolhub.classdiagramgenerator.api

import io.kotest.core.spec.style.StringSpec
import io.kotest.extensions.spring.SpringExtension
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.mock.web.MockMultipartFile
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.multipart

@SpringBootTest
@AutoConfigureMockMvc
class JobControllerValidationTest(
    private val mockMvc: MockMvc,
) : StringSpec({
        extensions(SpringExtension)
        "rejects non-zip magic number" {
            mockMvc
                .multipart("/api/v1/jobs") {
                    file(MockMultipartFile("file", "x.zip", "application/zip", "not a zip".toByteArray()))
                    param("programName", "demo")
                    param("version", "v1.0")
                    param("language", "ko")
                }.andExpect { status { isBadRequest() } }
        }
    })
