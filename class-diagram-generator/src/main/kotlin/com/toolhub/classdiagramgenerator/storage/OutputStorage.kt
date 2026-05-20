package com.toolhub.classdiagramgenerator.storage

import com.toolhub.classdiagramgenerator.config.AppProperties
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.stereotype.Component
import java.io.IOException
import java.nio.file.Files
import java.nio.file.Path
import java.time.Instant
import java.util.UUID
import kotlin.io.path.exists
import kotlin.io.path.isDirectory

@Component
class OutputStorage(
    private val workdir: Path,
) {
    private val log = LoggerFactory.getLogger(javaClass)

    @Autowired
    constructor(props: AppProperties) : this(props.workdir)

    fun jobDir(jobId: UUID): Path = workdir.resolve("jobs/$jobId")

    fun inputDir(jobId: UUID): Path = jobDir(jobId).resolve("input")

    fun uploadZip(jobId: UUID): Path = jobDir(jobId).resolve("upload.zip")

    fun outputDir(jobId: UUID): Path = jobDir(jobId).resolve("output")

    fun diagramsDir(jobId: UUID): Path = jobDir(jobId).resolve("diagrams")

    fun cleanup(jobId: UUID) {
        val dir = jobDir(jobId)
        if (dir.exists()) deleteRecursively(dir)
    }

    fun deleteIfOlderThan(threshold: Instant) {
        val jobsRoot = workdir.resolve("jobs")
        if (!jobsRoot.exists()) return
        Files.list(jobsRoot).use { stream ->
            stream
                .filter { it.isDirectory() }
                .forEach { jobDir -> cleanupIfExpired(jobDir, threshold) }
        }
    }

    private fun deleteRecursively(path: Path) {
        if (!path.exists()) return
        try {
            Files.walk(path).use { stream ->
                stream.sorted(Comparator.reverseOrder()).forEach(Files::delete)
            }
        } catch (e: IOException) {
            log.warn("Failed to delete {}", path, e)
        } catch (e: SecurityException) {
            log.warn("Failed to delete {}", path, e)
        }
    }

    private fun cleanupIfExpired(
        jobDir: Path,
        threshold: Instant,
    ) {
        try {
            if (Files.getLastModifiedTime(jobDir).toInstant().isBefore(threshold)) {
                deleteRecursively(jobDir)
            }
        } catch (e: IOException) {
            log.warn("Skipping cleanup for {}", jobDir, e)
        } catch (e: SecurityException) {
            log.warn("Skipping cleanup for {}", jobDir, e)
        }
    }
}
