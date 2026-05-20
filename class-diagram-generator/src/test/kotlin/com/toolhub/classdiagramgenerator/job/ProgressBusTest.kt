package com.toolhub.classdiagramgenerator.job

import io.kotest.core.spec.style.StringSpec
import io.kotest.extensions.spring.SpringExtension
import org.hamcrest.Matchers.containsString
import org.hamcrest.Matchers.not
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.http.MediaType
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.get
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.asyncDispatch
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.content
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import java.util.UUID

@SpringBootTest
@AutoConfigureMockMvc
class ProgressBusTest(
    private val mockMvc: MockMvc,
    private val progressBus: ProgressBus,
) : StringSpec({
        extensions(SpringExtension)

        "SSE stage events are sent as a single JSON object payload" {
            val jobId = UUID.randomUUID()
            val result =
                mockMvc
                    .get("/api/v1/jobs/$jobId/events") {
                        accept = MediaType.TEXT_EVENT_STREAM
                    }.andExpect {
                        request { asyncStarted() }
                    }.andReturn()

            progressBus.publish(jobId, "stage", mapOf("stage" to "EXTRACTING", "percent" to 5))
            progressBus.complete(jobId)

            mockMvc
                .perform(asyncDispatch(result))
                .andExpect(status().isOk)
                .andExpect(content().string(containsString("event:stage")))
                .andExpect(content().string(containsString("data:{")))
                .andExpect(content().string(containsString("\"stage\":\"EXTRACTING\"")))
                .andExpect(content().string(containsString("\"percent\":5")))
                .andExpect(content().string(not(containsString("data:\"{"))))
        }
    })
