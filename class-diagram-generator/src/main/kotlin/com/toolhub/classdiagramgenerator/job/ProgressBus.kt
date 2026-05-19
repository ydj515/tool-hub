package com.toolhub.classdiagramgenerator.job

import com.fasterxml.jackson.databind.ObjectMapper
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Component
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter
import java.io.IOException
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap

@Component
class ProgressBus(
    private val objectMapper: ObjectMapper,
) {
    private val emitters = ConcurrentHashMap<UUID, MutableList<SseEmitter>>()

    fun subscribe(jobId: UUID): SseEmitter {
        val emitter = SseEmitter(0L)
        emitters.computeIfAbsent(jobId) { mutableListOf() }.add(emitter)
        emitter.onCompletion { remove(jobId, emitter) }
        emitter.onTimeout { remove(jobId, emitter) }
        emitter.onError { remove(jobId, emitter) }
        return emitter
    }

    fun publish(
        jobId: UUID,
        eventName: String,
        payload: Any,
    ) {
        val data = objectMapper.writeValueAsString(payload)
        emitters[jobId]?.toList()?.forEach { em ->
            try {
                em.send(SseEmitter.event().name(eventName).data(data))
            } catch (
                @Suppress("SwallowedException", "unused") e: IOException,
            ) {
                remove(jobId, em)
            }
        }
    }

    fun complete(jobId: UUID) {
        emitters.remove(jobId)?.forEach { it.complete() }
    }

    @Scheduled(fixedRate = KEEP_ALIVE_MS)
    fun keepAliveAll() {
        emitters.keys.forEach { sendKeepAlive(it) }
    }

    private fun sendKeepAlive(jobId: UUID) {
        emitters[jobId]?.toList()?.forEach {
            try {
                it.send(SseEmitter.event().comment("keep-alive"))
            } catch (
                @Suppress("SwallowedException", "unused") e: IOException,
            ) {
                remove(jobId, it)
            }
        }
    }

    private fun remove(
        jobId: UUID,
        emitter: SseEmitter,
    ) {
        emitters[jobId]?.remove(emitter)
    }

    companion object {
        private const val KEEP_ALIVE_MS = 30_000L
    }
}
