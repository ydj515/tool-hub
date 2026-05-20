package com.toolhub.classdiagramgenerator.api

import java.text.NumberFormat
import java.util.Locale

object ArtifactSizeFormatter {
    private val UNITS = listOf("B", "KB", "MB", "GB", "TB")
    private const val UNIT_STEP = 1024.0

    fun format(
        sizeBytes: Long,
        locale: Locale,
    ): String {
        require(sizeBytes >= 0) { "sizeBytes must be non-negative" }
        if (sizeBytes < UNIT_STEP.toLong()) {
            return "$sizeBytes B"
        }

        var value = sizeBytes.toDouble()
        var unitIndex = 0
        while (value >= UNIT_STEP && unitIndex < UNITS.lastIndex) {
            value /= UNIT_STEP
            unitIndex += 1
        }

        val formatter =
            NumberFormat.getNumberInstance(locale).apply {
                minimumFractionDigits = 0
                maximumFractionDigits = 1
            }
        return "${formatter.format(value)} ${UNITS[unitIndex]}"
    }
}
