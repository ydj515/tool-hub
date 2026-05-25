package com.toolhub.classdiagramgenerator.api

import com.toolhub.classdiagramgenerator.api.dto.ArtifactSummary
import com.toolhub.classdiagramgenerator.api.dto.FormatDownloadSummary
import com.toolhub.classdiagramgenerator.api.dto.JobCreatedResponse
import com.toolhub.classdiagramgenerator.api.dto.JobResultResponse
import com.toolhub.classdiagramgenerator.domain.OutputLanguage
import com.toolhub.classdiagramgenerator.job.JobService
import com.toolhub.classdiagramgenerator.job.JobStore
import com.toolhub.classdiagramgenerator.job.ProgressBus
import jakarta.validation.constraints.Pattern
import jakarta.validation.constraints.Size
import org.springframework.core.io.FileSystemResource
import org.springframework.http.HttpHeaders
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType
import org.springframework.http.MediaTypeFactory
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
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody
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
        require(parsedFormats.isNotEmpty()) { "At least one format is required" }
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
        val formatDownloads =
            rec.artifacts
                .groupBy { it.format }
                .toSortedMap()
                .map { (format, grouped) ->
                    FormatDownloadSummary(
                        format = format,
                        artifactCount = grouped.size,
                        downloadUrl = "/api/v1/jobs/$id/downloads/$format",
                        archive = grouped.size > 1,
                    )
                }
        return JobResultResponse(
            jobId = id,
            createdAt = rec.createdAt,
            expiresAt = rec.expiresAt,
            warnings = rec.warnings,
            artifacts = artifacts,
            bundleUrl = "/api/v1/jobs/$id/bundle",
            formatDownloads = formatDownloads,
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
    ): ResponseEntity<StreamingResponseBody> {
        val rec = jobStore.get(id) ?: throw NoSuchElementException("Job not found: $id")
        return zipArtifactBundle(
            filename = "bundle-$id.zip",
            artifacts = rec.artifacts,
        )
    }

    @GetMapping("/{id}/downloads/{format}")
    fun downloadByFormat(
        @PathVariable id: UUID,
        @PathVariable format: String,
    ): ResponseEntity<StreamingResponseBody> {
        val rec = jobStore.get(id) ?: throw NoSuchElementException("Job not found: $id")
        val normalizedFormat = format.lowercase()
        require(normalizedFormat in SUPPORTED_FORMATS) { "Unsupported format" }
        val artifacts = rec.artifacts.filter { it.format == normalizedFormat }
        val artifact =
            artifacts.singleOrNull()
                ?: if (artifacts.isEmpty()) {
                    throw NoSuchElementException("No artifacts found for format: $normalizedFormat")
                } else {
                    null
                }
        if (artifact != null) {
            val body = StreamingResponseBody { output -> Files.copy(artifact.path, output) }
            val contentType = MediaTypeFactory.getMediaType(artifact.filename).orElse(MediaType.APPLICATION_OCTET_STREAM)
            return ResponseEntity
                .ok()
                .contentType(contentType)
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"${artifact.filename}\"")
                .body(body)
        }
        return zipArtifactBundle(
            filename = "bundle-$id-$normalizedFormat.zip",
            artifacts = artifacts,
        )
    }

    private fun zipArtifactBundle(
        filename: String,
        artifacts: List<com.toolhub.classdiagramgenerator.job.ArtifactRecord>,
    ): ResponseEntity<StreamingResponseBody> {
        val body =
            StreamingResponseBody { output ->
                ZipOutputStream(output).use { zos ->
                    artifacts.forEach { art ->
                        zos.putNextEntry(ZipEntry(art.filename))
                        Files.copy(art.path, zos)
                        zos.closeEntry()
                    }
                    zos.finish()
                }
            }
        return ResponseEntity
            .ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"$filename\"")
            .contentType(MediaType.parseMediaType("application/zip"))
            .body(body)
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
