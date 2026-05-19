package com.toolhub.classdiagramgenerator.analyzer

import com.toolhub.classdiagramgenerator.domain.ClassInfo
import com.toolhub.classdiagramgenerator.domain.Layer
import org.springframework.stereotype.Component

@Component
class ClassIdAssigner {
    private val layerOrder =
        listOf(
            Layer.CONTROLLER,
            Layer.SERVICE,
            Layer.MAPPER,
            Layer.UTIL,
            Layer.MODEL,
            Layer.ETC,
        )
    private val layerIndex = layerOrder.withIndex().associate { (idx, layer) -> layer to idx }

    fun assign(classes: List<ClassInfo>): List<ClassInfo> {
        val sorted =
            classes.sortedWith(
                compareBy({ layerIndex[it.layer] ?: Int.MAX_VALUE }, { it.packagePath }, { it.name }),
            )
        val padLen = maxOf(MIN_PAD_LEN, sorted.size.toString().length)
        return sorted.mapIndexed { idx, info ->
            val num = (idx + 1).toString().padStart(padLen, '0')
            info.copy(id = "CLS-$num")
        }
    }

    companion object {
        private const val MIN_PAD_LEN = 4
    }
}
