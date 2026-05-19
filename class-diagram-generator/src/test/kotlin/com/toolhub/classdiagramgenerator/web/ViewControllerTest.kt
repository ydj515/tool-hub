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

        "GET / renders Bootstrap asset paths and deferred modal init" {
            mockMvc.get("/").andExpect {
                status { isOk() }
                content { string(org.hamcrest.Matchers.containsString("href=\"/favicon.ico\"")) }
                content { string(org.hamcrest.Matchers.containsString("/webjars/bootstrap/")) }
                content { string(org.hamcrest.Matchers.containsString("bootstrap.min.css")) }
                content { string(org.hamcrest.Matchers.containsString("/webjars/bootstrap-icons/")) }
                content { string(org.hamcrest.Matchers.containsString("bootstrap-icons.css")) }
                content { string(org.hamcrest.Matchers.containsString("bootstrap.bundle.min.js")) }
                content { string(org.hamcrest.Matchers.containsString("window.addEventListener('load'")) }
            }
        }

        "GET /jobs/{id} returns 200" {
            mockMvc.get("/jobs/00000000-0000-0000-0000-000000000001").andExpect { status { isOk() } }
        }

        "GET /jobs/{id}/result renders localized labels for result page" {
            mockMvc.get("/jobs/00000000-0000-0000-0000-000000000001/result").andExpect {
                status { isOk() }
                content { string(org.hamcrest.Matchers.containsString("산출물")) }
                content { string(org.hamcrest.Matchers.containsString("모듈")) }
                content { string(org.hamcrest.Matchers.containsString("형식")) }
                content { string(org.hamcrest.Matchers.containsString("파일명")) }
                content { string(org.hamcrest.Matchers.containsString("크기")) }
                content { string(org.hamcrest.Matchers.containsString("window.__resultLabels")) }
            }
        }

        "GET /webjars/bootstrap/dist/css/bootstrap.min.css returns 200" {
            mockMvc.get("/webjars/bootstrap/dist/css/bootstrap.min.css").andExpect { status { isOk() } }
        }

        "GET /favicon.ico returns 200" {
            mockMvc.get("/favicon.ico").andExpect { status { isOk() } }
        }
    })
