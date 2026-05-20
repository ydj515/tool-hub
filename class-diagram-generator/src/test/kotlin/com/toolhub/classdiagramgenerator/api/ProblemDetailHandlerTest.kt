package com.toolhub.classdiagramgenerator.api

import io.kotest.core.spec.style.StringSpec
import io.kotest.extensions.spring.SpringExtension
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.get

@SpringBootTest
@AutoConfigureMockMvc
class ProblemDetailHandlerTest(
    private val mockMvc: MockMvc,
) : StringSpec({
        extensions(SpringExtension)
        "missing job returns 404 problem+json" {
            mockMvc
                .get("/api/v1/jobs/00000000-0000-0000-0000-000000000000/result")
                .andExpect {
                    status { isNotFound() }
                }
        }
    })
