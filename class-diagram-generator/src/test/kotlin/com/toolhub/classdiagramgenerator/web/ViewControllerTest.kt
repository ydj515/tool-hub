package com.toolhub.classdiagramgenerator.web

import io.kotest.core.spec.style.StringSpec
import io.kotest.extensions.spring.SpringExtension
import org.hamcrest.Matchers.not
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

        "GET / renders Bootstrap asset paths without initial language modal" {
            mockMvc.get("/").andExpect {
                status { isOk() }
                content { string(org.hamcrest.Matchers.containsString("href=\"/favicon.ico\"")) }
                content { string(org.hamcrest.Matchers.containsString("/webjars/bootstrap/")) }
                content { string(org.hamcrest.Matchers.containsString("bootstrap.min.css")) }
                content { string(org.hamcrest.Matchers.containsString("/webjars/bootstrap-icons/")) }
                content { string(org.hamcrest.Matchers.containsString("bootstrap-icons.css")) }
                content { string(org.hamcrest.Matchers.containsString("bootstrap.bundle.min.js")) }
                content { string(not(org.hamcrest.Matchers.containsString("window.addEventListener('load'"))) }
                content { string(not(org.hamcrest.Matchers.containsString("id=\"languageModal\""))) }
            }
        }

        "GET / renders escaped input patterns for browser validation" {
            mockMvc.get("/").andExpect {
                status { isOk() }
                content { string(org.hamcrest.Matchers.containsString("pattern=\"^[A-Za-z0-9_\\-]+$\"")) }
                content { string(org.hamcrest.Matchers.containsString("pattern=\"^[A-Za-z0-9._\\-]+$\"")) }
            }
        }

        "GET / renders segmented locale toggle and drag drop upload zone" {
            mockMvc.get("/?lang=en").andExpect {
                status { isOk() }
                content { string(org.hamcrest.Matchers.containsString("lang-toggle")) }
                content { string(org.hamcrest.Matchers.containsString("data-lang-option=\"ko\"")) }
                content { string(org.hamcrest.Matchers.containsString("data-lang-option=\"en\"")) }
                content { string(org.hamcrest.Matchers.containsString("data-active=\"false\">KO</a>")) }
                content { string(org.hamcrest.Matchers.containsString("data-active=\"true\">EN</a>")) }
                content { string(org.hamcrest.Matchers.containsString("data-upload-dropzone")) }
                content { string(org.hamcrest.Matchers.containsString("data-upload-input")) }
                content { string(org.hamcrest.Matchers.containsString("data-upload-filename")) }
                content { string(not(org.hamcrest.Matchers.containsString("feature-pill"))) }
            }
        }

        "GET / renders modern UI assets and theme toggle shell" {
            mockMvc.get("/?lang=en").andExpect {
                status { isOk() }
                content { string(org.hamcrest.Matchers.containsString("/css/mmu/tokens.css")) }
                content { string(org.hamcrest.Matchers.containsString("/css/mmu/components.css")) }
                content { string(org.hamcrest.Matchers.containsString("/js/theme.js")) }
                content { string(org.hamcrest.Matchers.containsString("mmu-body")) }
                content { string(org.hamcrest.Matchers.containsString("mmu-topbar")) }
                content { string(org.hamcrest.Matchers.containsString("data-theme-toggle")) }
            }
        }

        "GET / renders grouped upload cards and upload action hint" {
            mockMvc.get("/?lang=ko").andExpect {
                status { isOk() }
                content { string(org.hamcrest.Matchers.containsString("data-upload-section=\"project\"")) }
                content { string(org.hamcrest.Matchers.containsString("data-upload-section=\"options\"")) }
                content { string(org.hamcrest.Matchers.containsString("data-upload-section=\"source\"")) }
                content { string(org.hamcrest.Matchers.containsString("data-upload-action-hint")) }
                content { string(org.hamcrest.Matchers.containsString("data-upload-dropzone")) }
            }
        }

        "GET /jobs/{id} returns 200" {
            mockMvc.get("/jobs/00000000-0000-0000-0000-000000000001").andExpect { status { isOk() } }
        }

        "GET /jobs/{id} renders progress hero, status card, and timeline shell" {
            mockMvc.get("/jobs/00000000-0000-0000-0000-000000000001").andExpect {
                status { isOk() }
                content { string(org.hamcrest.Matchers.containsString("data-progress-hero")) }
                content { string(org.hamcrest.Matchers.containsString("data-progress-status")) }
                content { string(org.hamcrest.Matchers.containsString("data-progress-timeline")) }
                content { string(org.hamcrest.Matchers.containsString("data-progress-note")) }
            }
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

        "GET /jobs/{id}/result renders summary cards and warning container" {
            mockMvc.get("/jobs/00000000-0000-0000-0000-000000000001/result").andExpect {
                status { isOk() }
                content { string(org.hamcrest.Matchers.containsString("id=\"createdAt\"")) }
                content { string(org.hamcrest.Matchers.containsString("id=\"expiresAt\"")) }
                content { string(org.hamcrest.Matchers.containsString("id=\"artifactCount\"")) }
                content { string(org.hamcrest.Matchers.containsString("id=\"resultWarnings\"")) }
            }
        }

        "GET /jobs/{id}/result renders bundle and format download actions" {
            mockMvc.get("/jobs/00000000-0000-0000-0000-000000000001/result").andExpect {
                status { isOk() }
                content { string(org.hamcrest.Matchers.containsString("id=\"bundleBtn\"")) }
                content { string(org.hamcrest.Matchers.containsString("id=\"formatDownloads\"")) }
                content { string(org.hamcrest.Matchers.containsString("formatDownloadsTitle")) }
            }
        }

        "GET /webjars/bootstrap/dist/css/bootstrap.min.css returns 200" {
            mockMvc.get("/webjars/bootstrap/dist/css/bootstrap.min.css").andExpect { status { isOk() } }
        }

        "GET /favicon.ico returns 200" {
            mockMvc.get("/favicon.ico").andExpect { status { isOk() } }
        }
    })
