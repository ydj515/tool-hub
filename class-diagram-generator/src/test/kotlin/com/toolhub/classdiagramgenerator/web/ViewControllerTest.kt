package com.toolhub.classdiagramgenerator.web

import io.kotest.core.spec.style.StringSpec
import io.kotest.extensions.spring.SpringExtension
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.get

@SpringBootTest
@AutoConfigureMockMvc
class ViewControllerTest(
    private val mockMvc: MockMvc,
) : StringSpec({
        extensions(SpringExtension)
        "GET / returns 200" {
            mockMvc.get("/").andExpect { status { isOk() } }
        }
        "GET /jobs/{id} returns 200" {
            mockMvc.get("/jobs/00000000-0000-0000-0000-000000000001").andExpect { status { isOk() } }
        }
    })
