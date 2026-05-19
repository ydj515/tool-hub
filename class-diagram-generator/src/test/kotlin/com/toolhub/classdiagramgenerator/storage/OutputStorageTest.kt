package com.toolhub.classdiagramgenerator.storage

import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.shouldBe
import java.nio.file.Files
import java.util.UUID
import kotlin.io.path.createDirectories
import kotlin.io.path.exists
import kotlin.io.path.writeText

class OutputStorageTest :
    StringSpec({
        val workdir = Files.createTempDirectory("ws-")
        val storage = OutputStorage(workdir)

        "outputDir returns deterministic structure" {
            val id = UUID.randomUUID()
            val out = storage.outputDir(id)
            out.toString() shouldBe workdir.resolve("jobs/$id/output").toString()
        }

        "cleanup removes job dir" {
            val id = UUID.randomUUID()
            val out = storage.outputDir(id).createDirectories()
            out.resolve("dummy.txt").writeText("x")
            storage.cleanup(id)
            workdir.resolve("jobs/$id").exists() shouldBe false
        }
    })
