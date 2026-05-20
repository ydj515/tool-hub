package com.toolhub.classdiagramgenerator.config

import org.springframework.boot.context.properties.ConfigurationProperties
import org.springframework.boot.context.properties.EnableConfigurationProperties
import org.springframework.context.annotation.Configuration
import java.nio.file.Path

@ConfigurationProperties(prefix = "app")
data class AppProperties(
    val workdir: Path,
    val job: Job,
    val upload: Upload,
    val analysis: Analysis,
    val diagrams: Diagrams = Diagrams(),
    val render: Render = Render(),
) {
    data class Job(
        val maxConcurrent: Int = 4,
        val ttlMinutes: Long = 60,
        val cleanerIntervalMinutes: Long = 10,
    )

    data class Upload(
        val maxFileSizeMb: Int = 100,
    )

    data class Analysis(
        val maxClassesPerModule: Int = 5000,
    )

    data class Diagrams(
        val enabledDefault: Boolean = true,
        val parallelism: Int = 0,
        val maxBytesPerPng: Long = 5_242_880L,
    )

    data class Render(
        val docx: Docx = Docx(),
    ) {
        data class Docx(
            val fontFamily: String = "Malgun Gothic",
        )
    }
}

@Configuration
@EnableConfigurationProperties(AppProperties::class)
class AppPropertiesConfig
