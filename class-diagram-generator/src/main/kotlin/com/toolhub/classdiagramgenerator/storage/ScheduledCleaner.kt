package com.toolhub.classdiagramgenerator.storage

import com.toolhub.classdiagramgenerator.config.AppProperties
import org.slf4j.LoggerFactory
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Component
import java.time.Instant

@Component
class ScheduledCleaner(
    private val storage: OutputStorage,
    private val props: AppProperties,
) {
    private val log = LoggerFactory.getLogger(javaClass)

    @Scheduled(fixedDelayString = "#{\${app.job.cleaner-interval-minutes} * 60 * 1000}")
    fun sweep() {
        val threshold = Instant.now().minusSeconds(props.job.ttlMinutes * SECONDS_PER_MINUTE)
        log.info("Cleaning job dirs older than {}", threshold)
        storage.deleteIfOlderThan(threshold)
    }

    companion object {
        private const val SECONDS_PER_MINUTE = 60L
    }
}
