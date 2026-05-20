package com.toolhub.classdiagramgenerator.api.dto

import com.toolhub.classdiagramgenerator.domain.Warning
import java.time.Instant
import java.util.UUID

data class JobCreatedResponse(
    val jobId: UUID,
    val status: String,
    val streamUrl: String,
)

data class ArtifactSummary(
    val index: Int,
    val module: String,
    val format: String,
    val filename: String,
    val sizeBytes: Long,
    val sizeLabel: String,
    val downloadUrl: String,
)

data class JobResultResponse(
    val jobId: UUID,
    val createdAt: Instant,
    val expiresAt: Instant?,
    val warnings: List<Warning>,
    val artifacts: List<ArtifactSummary>,
    val bundleUrl: String,
)
