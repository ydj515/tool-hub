package com.toolhub.classdiagramgenerator.analyzer

import com.toolhub.classdiagramgenerator.domain.Layer
import org.springframework.stereotype.Component

@Component
class LayerClassifier {
    private val mapping =
        mapOf(
            "controller" to Layer.CONTROLLER,
            "service" to Layer.SERVICE,
            "mapper" to Layer.MAPPER,
            "dao" to Layer.MAPPER,
            "repository" to Layer.MAPPER,
            "util" to Layer.UTIL,
            "utils" to Layer.UTIL,
            "common" to Layer.UTIL,
            "model" to Layer.MODEL,
            "domain" to Layer.MODEL,
            "entity" to Layer.MODEL,
            "dto" to Layer.MODEL,
            "vo" to Layer.MODEL,
        )

    fun classify(
        basePackage: String,
        packagePath: String,
    ): Layer {
        val remainder =
            if (basePackage.isEmpty() || !packagePath.startsWith(basePackage)) {
                packagePath
            } else {
                packagePath.removePrefix(basePackage).trimStart('.')
            }
        val firstSegment = remainder.substringBefore('.').lowercase()
        return mapping[firstSegment] ?: Layer.ETC
    }

    fun commonBasePackage(packages: Collection<String>): String {
        if (packages.isEmpty()) return ""
        if (packages.size == 1) return packages.first()
        val segments = packages.map { it.split('.') }
        val minLen = segments.minOf { it.size }
        val common = mutableListOf<String>()
        for (i in 0 until minLen) {
            val seg = segments[0][i]
            if (segments.all { it[i] == seg }) common += seg else break
        }
        return common.joinToString(".")
    }
}
