package com.toolhub.classdiagramgenerator.storage

import com.toolhub.classdiagramgenerator.config.AppProperties
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.stereotype.Component
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
    @Autowired
    constructor(props: AppProperties) : this(props.workdir)

    fun jobDir(jobId: UUID): Path = workdir.resolve("jobs/$jobId")

    fun inputDir(jobId: UUID): Path = jobDir(jobId).resolve("input")

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
                .filter { Files.getLastModifiedTime(it).toInstant().isBefore(threshold) }
                .forEach { deleteRecursively(it) }
        }
    }

    private fun deleteRecursively(path: Path) {
        if (!path.exists()) return
        Files.walk(path).use { stream ->
            stream.sorted(Comparator.reverseOrder()).forEach(Files::delete)
        }
    }
}
