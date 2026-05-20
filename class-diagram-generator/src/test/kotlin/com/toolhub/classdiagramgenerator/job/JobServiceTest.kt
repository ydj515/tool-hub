package com.toolhub.classdiagramgenerator.job

import com.toolhub.classdiagramgenerator.config.AppProperties
import com.toolhub.classdiagramgenerator.domain.OutputLanguage
import com.toolhub.classdiagramgenerator.storage.OutputStorage
import io.kotest.assertions.throwables.shouldThrow
import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.shouldBe
import io.mockk.every
import io.mockk.mockk
import io.mockk.slot
import io.mockk.verify
import org.springframework.web.multipart.MultipartFile
import java.io.ByteArrayInputStream
import java.io.File
import java.io.IOException
import java.io.InputStream
import java.nio.file.Files
import java.nio.file.Path
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit

class JobServiceTest :
    StringSpec({
        "submit persists uploaded zip to disk before scheduling async work" {
            val store = JobStore()
            val workdir = Files.createTempDirectory("job-service-test")
            val storage = OutputStorage(workdir)
            val orchestrator = mockk<JobOrchestrator>()
            val service = JobService(store, storage, orchestrator, testAppProperties())
            val zipBytes = byteArrayOf(0x50, 0x4B, 0x03, 0x04, 0x00)
            val uploadPath = slot<Path>()
            val latch = CountDownLatch(1)

            every { orchestrator.run(any(), capture(uploadPath)) } answers {
                latch.countDown()
            }

            val rec =
                service.submit(
                    programName = "demo",
                    version = "v1.0",
                    language = OutputLanguage.KO,
                    formats = listOf("md"),
                    includeDiagrams = false,
                    file = TransferOnlyMultipartFile(zipBytes),
                )

            latch.await(5, TimeUnit.SECONDS) shouldBe true
            uploadPath.captured shouldBe storage.uploadZip(rec.id)
            Files.exists(uploadPath.captured) shouldBe true
            Files.readAllBytes(uploadPath.captured).contentEquals(zipBytes) shouldBe true
        }

        "submit rejects uploads larger than app upload limit" {
            val store = JobStore()
            val workdir = Files.createTempDirectory("job-service-limit-test")
            val storage = OutputStorage(workdir)
            val orchestrator = mockk<JobOrchestrator>(relaxed = true)
            val service = JobService(store, storage, orchestrator, testAppProperties(maxFileSizeMb = 1))

            val ex =
                shouldThrow<IllegalArgumentException> {
                    service.submit(
                        programName = "demo",
                        version = "v1.0",
                        language = OutputLanguage.KO,
                        formats = listOf("md"),
                        includeDiagrams = false,
                        file = TransferOnlyMultipartFile(byteArrayOf(0x50, 0x4B), sizeOverride = 2L * 1024 * 1024),
                    )
                }

            ex.message shouldBe "Upload exceeds app limit of 1 MB"
            verify(exactly = 0) { orchestrator.run(any(), any()) }
        }

        "submit does not persist a pending job when upload transfer fails" {
            val store = JobStore()
            val workdir = Files.createTempDirectory("job-service-transfer-test")
            val storage = OutputStorage(workdir)
            val orchestrator = mockk<JobOrchestrator>(relaxed = true)
            val service = JobService(store, storage, orchestrator, testAppProperties())

            shouldThrow<IOException> {
                service.submit(
                    programName = "demo",
                    version = "v1.0",
                    language = OutputLanguage.KO,
                    formats = listOf("md"),
                    includeDiagrams = false,
                    file = BrokenTransferMultipartFile(),
                )
            }.message shouldBe "transfer failed"

            store.all().shouldBe(emptyList())
            verify(exactly = 0) { orchestrator.run(any(), any()) }
        }
    })

private fun testAppProperties(maxFileSizeMb: Int = 100): AppProperties =
    AppProperties(
        workdir = Path.of(System.getProperty("java.io.tmpdir"), "class-diagram-generator-job-service-test"),
        job = AppProperties.Job(),
        upload = AppProperties.Upload(maxFileSizeMb = maxFileSizeMb),
        analysis = AppProperties.Analysis(),
    )

private class TransferOnlyMultipartFile(
    private val bytes: ByteArray,
    private val sizeOverride: Long = bytes.size.toLong(),
) : MultipartFile {
    override fun getName(): String = "file"

    override fun getOriginalFilename(): String = "source.zip"

    override fun getContentType(): String = "application/zip"

    override fun isEmpty(): Boolean = bytes.isEmpty()

    override fun getSize(): Long = sizeOverride

    override fun getBytes(): ByteArray = error("getBytes() should not be used for large uploads")

    override fun getInputStream(): InputStream = ByteArrayInputStream(bytes)

    override fun transferTo(dest: File) {
        dest.parentFile?.mkdirs()
        dest.writeBytes(bytes)
    }
}

private class BrokenTransferMultipartFile : MultipartFile {
    override fun getName(): String = "file"

    override fun getOriginalFilename(): String = "broken.zip"

    override fun getContentType(): String = "application/zip"

    override fun isEmpty(): Boolean = false

    override fun getSize(): Long = 8

    override fun getBytes(): ByteArray = error("getBytes() should not be used")

    override fun getInputStream(): InputStream = ByteArrayInputStream(byteArrayOf(0x50, 0x4B))

    override fun transferTo(dest: File): Unit = throw IOException("transfer failed")
}
