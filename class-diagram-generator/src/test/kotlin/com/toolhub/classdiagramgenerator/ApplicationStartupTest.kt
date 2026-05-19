package com.toolhub.classdiagramgenerator

import io.kotest.core.spec.style.StringSpec
import io.kotest.extensions.spring.SpringExtension
import io.kotest.matchers.shouldBe
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.get

@SpringBootTest
@AutoConfigureMockMvc
class ApplicationStartupTest(
    private val mockMvc: MockMvc,
) : StringSpec({
        extensions(SpringExtension)
        "health endpoint should return UP" {
            mockMvc
                .get("/actuator/health")
                .andReturn()
                .response
                .status shouldBe 200
        }
    })
