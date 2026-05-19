package com.toolhub.classdiagramgenerator.render.diagram

import com.toolhub.classdiagramgenerator.domain.Layer
import java.nio.file.Path

data class DiagramArtifactIndex(
    val layerDiagrams: Map<String, Map<Layer, Path?>>,
    val classDiagrams: Map<String, Map<String, Path?>>,
    val specs: Map<String, Map<String, DiagramSpec>>,
) {
    companion object {
        val EMPTY = DiagramArtifactIndex(emptyMap(), emptyMap(), emptyMap())
    }
}
