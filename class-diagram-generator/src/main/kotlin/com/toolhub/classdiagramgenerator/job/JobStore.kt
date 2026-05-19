package com.toolhub.classdiagramgenerator.job

import com.toolhub.classdiagramgenerator.domain.OutputLanguage
import com.toolhub.classdiagramgenerator.domain.Warning
import org.springframework.stereotype.Component
import java.nio.file.Path
import java.time.Instant
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap

enum class JobStatus { PENDING, RUNNING, DONE, FAILED }

data class ArtifactRecord(
    val module: String,
    val format: String,
    val filename: String,
    val path: Path,
    val sizeBytes: Long,
)

data class JobRecord(
    val id: UUID,
    val programName: String,
    val version: String,
    val language: OutputLanguage,
    val formats: List<String>,
    val includeDiagrams: Boolean,
    var status: JobStatus,
    val workDir: Path,
    var expiresAt: Instant? = null,
    val artifacts: MutableList<ArtifactRecord> = mutableListOf(),
    val warnings: MutableList<Warning> = mutableListOf(),
    var errorCode: String? = null,
    var errorMessage: String? = null,
)

@Component
class JobStore {
    private val map = ConcurrentHashMap<UUID, JobRecord>()

    fun create(record: JobRecord): JobRecord {
        map[record.id] = record
        return record
    }

    fun get(id: UUID): JobRecord? = map[id]

    fun all(): List<JobRecord> = map.values.toList()

    fun remove(id: UUID) {
        map.remove(id)
    }
}
