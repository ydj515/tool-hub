package com.toolhub.classdiagramgenerator.render.diagram

import com.toolhub.classdiagramgenerator.domain.Layer
import com.toolhub.classdiagramgenerator.domain.RelationKind

enum class DiagramScope { LAYER, CLASS }

data class DiagramNode(
    val id: String,
    val classId: String?,
    val stereotype: String?,
    val displayName: String,
    val external: Boolean,
)

data class DiagramEdge(
    val fromId: String,
    val toId: String,
    val kind: RelationKind,
)

data class DiagramSpec(
    val scope: DiagramScope,
    val key: String,
    val title: String,
    val nodes: List<DiagramNode>,
    val edges: List<DiagramEdge>,
    val layer: Layer? = null,
    val classId: String? = null,
)
