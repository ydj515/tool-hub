package com.toolhub.classdiagramgenerator.api

import com.toolhub.classdiagramgenerator.api.dto.ArtifactSummary
import com.toolhub.classdiagramgenerator.api.dto.JobCreatedResponse
import com.toolhub.classdiagramgenerator.api.dto.JobResultResponse
import com.toolhub.classdiagramgenerator.domain.OutputLanguage
import com.toolhub.classdiagramgenerator.job.JobService
import com.toolhub.classdiagramgenerator.job.JobStore
import com.toolhub.classdiagramgenerator.job.ProgressBus
import jakarta.validation.constraints.Pattern
import jakarta.validation.constraints.Size
import org.springframework.core.io.FileSystemResource
import org.springframework.core.io.InputStreamResource
import org.springframework.http.HttpHeaders
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType
import org.springframework.http.ResponseEntity
import org.springframework.validation.annotation.Validated
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.multipart.MultipartFile
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter
import java.io.ByteArrayInputStream
import java.io.ByteArrayOutputStream
import java.nio.file.Files
import java.util.Locale
import java.util.UUID
import java.util.zip.ZipEntry
import java.util.zip.ZipOutputStream

@RestController
@RequestMapping("/api/v1/jobs")
@Validated
class JobController(
    private val jobService: JobService,
    private val jobStore: JobStore,
    private val progressBus: ProgressBus,
) {
    @PostMapping
    fun create(
        @RequestParam("file") file: MultipartFile,
        @RequestParam("programName")
        @Pattern(regexp = "^[A-Za-z0-9_-]+$")
        @Size(min = 1, max = PROGRAM_NAME_MAX)
        programName: String,
        @RequestParam("version")
        @Pattern(regexp = "^[A-Za-z0-9._-]+$")
        @Size(min = 1, max = VERSION_MAX)
        version: String,
        @RequestParam("language") @Pattern(regexp = "^(ko|en)$") language: String,
        @RequestParam(name = "formats", defaultValue = "docx,xlsx,md") formats: String,
        @RequestParam(name = "includeDiagrams", defaultValue = "true") includeDiagrams: Boolean,
    ): ResponseEntity<JobCreatedResponse> {
        require(file.size >= MIN_ZIP_SIZE) { "Empty file" }
        val magic = file.inputStream.use { it.readNBytes(MIN_ZIP_SIZE) }
        require(magic[0] == ZIP_MAGIC_BYTE_0 && magic[1] == ZIP_MAGIC_BYTE_1) { "Not a ZIP file" }
        val parsedFormats = formats.split(",").map { it.trim().lowercase() }.filter { it.isNotEmpty() }
        require(parsedFormats.all { it in SUPPORTED_FORMATS }) { "Unsupported format" }
        val rec =
            jobService.submit(
                programName = programName,
                version = version,
                language = OutputLanguage.parse(language),
                formats = parsedFormats,
                includeDiagrams = includeDiagrams,
                file = file,
            )
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(
            JobCreatedResponse(
                jobId = rec.id,
                status = "ACCEPTED",
                streamUrl = "/api/v1/jobs/${rec.id}/events",
            ),
        )
    }

    @GetMapping("/{id}/events", produces = [MediaType.TEXT_EVENT_STREAM_VALUE])
    fun events(
        @PathVariable id: UUID,
    ): SseEmitter = progressBus.subscribe(id)

    @GetMapping("/{id}/result")
    fun result(
        @PathVariable id: UUID,
        locale: Locale,
    ): JobResultResponse {
        val rec = jobStore.get(id) ?: throw NoSuchElementException("Job not found: $id")
        val artifacts =
            rec.artifacts.mapIndexed { idx, a ->
                ArtifactSummary(
                    index = idx,
                    module = a.module,
                    format = a.format,
                    filename = a.filename,
                    sizeBytes = a.sizeBytes,
                    sizeLabel = ArtifactSizeFormatter.format(a.sizeBytes, locale),
                    downloadUrl = "/api/v1/jobs/$id/artifacts/$idx",
                )
            }
        return JobResultResponse(
            jobId = id,
            expiresAt = rec.expiresAt,
            warnings = rec.warnings,
            artifacts = artifacts,
            bundleUrl = "/api/v1/jobs/$id/bundle",
        )
    }

    @GetMapping("/{id}/artifacts/{idx}")
    fun download(
        @PathVariable id: UUID,
        @PathVariable idx: Int,
    ): ResponseEntity<FileSystemResource> {
        val rec = jobStore.get(id) ?: throw NoSuchElementException("Job not found: $id")
        val art = rec.artifacts.getOrNull(idx) ?: throw NoSuchElementException("Artifact $idx not found")
        return ResponseEntity
            .ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"${art.filename}\"")
            .body(FileSystemResource(art.path))
    }

    @GetMapping("/{id}/bundle")
    fun bundle(
        @PathVariable id: UUID,
    ): ResponseEntity<InputStreamResource> {
        val rec = jobStore.get(id) ?: throw NoSuchElementException("Job not found: $id")
        val baos = ByteArrayOutputStream()
        ZipOutputStream(baos).use { zos ->
            rec.artifacts.forEach { art ->
                zos.putNextEntry(ZipEntry(art.filename))
                Files.copy(art.path, zos)
                zos.closeEntry()
            }
        }
        val bytes = baos.toByteArray()
        return ResponseEntity
            .ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"bundle-$id.zip\"")
            .contentType(MediaType.parseMediaType("application/zip"))
            .body(InputStreamResource(ByteArrayInputStream(bytes)))
    }

    companion object {
        private const val PROGRAM_NAME_MAX = 64
        private const val VERSION_MAX = 32
        private const val MIN_ZIP_SIZE = 4
        private const val ZIP_MAGIC_BYTE_0: Byte = 0x50
        private const val ZIP_MAGIC_BYTE_1: Byte = 0x4B
        private val SUPPORTED_FORMATS = listOf("docx", "xlsx", "md")
    }
}
