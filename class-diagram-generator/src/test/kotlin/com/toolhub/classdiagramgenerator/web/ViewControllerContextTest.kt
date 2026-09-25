package com.toolhub.classdiagramgenerator.web

import com.toolhub.classdiagramgenerator.domain.OutputLanguage
import com.toolhub.classdiagramgenerator.job.JobRecord
import com.toolhub.classdiagramgenerator.job.JobStatus
import com.toolhub.classdiagramgenerator.job.JobStore
import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.shouldBe
import org.springframework.ui.ExtendedModelMap
import java.nio.file.Path
import java.util.Locale
import java.util.UUID

class ViewControllerContextTest :
    StringSpec({
        "progress and result retain the submitted file and requested outputs" {
            val store = JobStore()
            val job =
                store.create(
                    JobRecord(
                        id = UUID.randomUUID(),
                        programName = "institution-reservation",
                        version = "v1.0",
                        language = OutputLanguage.KO,
                        formats = listOf("docx", "md"),
                        includeDiagrams = false,
                        status = JobStatus.RUNNING,
                        workDir = Path.of("private-job-directory"),
                        sourceFilename = "reference.zip",
                        sourceSizeBytes = 1024,
                    ),
                )
            val controller = ViewController(store)
            val progress = ExtendedModelMap()
            val result = ExtendedModelMap()
            controller.progress(job.id, progress, Locale.ENGLISH) shouldBe "progress"
            controller.result(job.id, result, Locale.ENGLISH) shouldBe "result"
            val context = progress["jobContext"] as Map<*, *>
            context["programName"] shouldBe "institution-reservation"
            context["language"] shouldBe "한국어"
            context["formats"] shouldBe listOf("DOCX", "MD")
            context["includeDiagrams"] shouldBe false
            context["sourceFilename"] shouldBe "reference.zip"
            context["sourceSizeLabel"] shouldBe "1 KB"
            context.containsKey("workDir") shouldBe false
            result["jobContext"] shouldBe context
        }

        "missing jobs do not fabricate request context" {
            val model = ExtendedModelMap()
            ViewController(JobStore()).progress(UUID.randomUUID(), model, Locale.ENGLISH)
            model.containsKey("jobContext") shouldBe false
        }
    })
