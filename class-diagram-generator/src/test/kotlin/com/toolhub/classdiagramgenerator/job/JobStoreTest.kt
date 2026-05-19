package com.toolhub.classdiagramgenerator.job

import com.toolhub.classdiagramgenerator.domain.OutputLanguage
import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.shouldBe
import java.nio.file.Files
import java.util.UUID

class JobStoreTest :
    StringSpec({
        val store = JobStore()
        "create and get" {
            val id = UUID.randomUUID()
            val rec =
                JobRecord(
                    id = id,
                    programName = "demo",
                    version = "v1",
                    language = OutputLanguage.KO,
                    formats = listOf("docx", "xlsx", "md"),
                    status = JobStatus.PENDING,
                    workDir = Files.createTempDirectory("job-"),
                )
            store.create(rec)
            store.get(id)?.programName shouldBe "demo"
        }
    })
