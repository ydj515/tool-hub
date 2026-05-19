package com.toolhub.classdiagramgenerator.job

import com.toolhub.classdiagramgenerator.domain.OutputLanguage
import com.toolhub.classdiagramgenerator.storage.OutputStorage
import org.springframework.stereotype.Service
import org.springframework.web.multipart.MultipartFile
import java.util.UUID
import java.util.concurrent.Executors
import kotlin.io.path.createDirectories

@Service
class JobService(
    private val store: JobStore,
    private val storage: OutputStorage,
    private val orchestrator: JobOrchestrator,
) {
    private val executor = Executors.newVirtualThreadPerTaskExecutor()

    fun submit(
        programName: String,
        version: String,
        language: OutputLanguage,
        formats: List<String>,
        includeDiagrams: Boolean,
        file: MultipartFile,
    ): JobRecord {
        require(formats.isNotEmpty()) { "formats must not be empty" }
        val id = UUID.randomUUID()
        val workDir = storage.jobDir(id).createDirectories()
        storage.inputDir(id).createDirectories()
        storage.outputDir(id).createDirectories()
        val record =
            JobRecord(
                id = id,
                programName = programName,
                version = version,
                language = language,
                formats = formats,
                includeDiagrams = includeDiagrams,
                status = JobStatus.PENDING,
                workDir = workDir,
            )
        store.create(record)
        val bytes = file.bytes
        executor.submit {
            orchestrator.run(record, bytes)
        }
        return record
    }
}
