package com.toolhub.classdiagramgenerator.render.diagram

import com.toolhub.classdiagramgenerator.domain.RelationKind
import org.springframework.stereotype.Component

@Component
class MermaidRenderer {
    fun render(spec: DiagramSpec): String =
        buildString {
            appendLine("classDiagram")
            if (spec.scope == DiagramScope.LAYER) {
                appendLine("    direction LR")
            }
            val classNames = classNames(spec)
            spec.nodes.forEach { node ->
                val className = classNames.getValue(node.id)
                appendLine("    class $className")
                node.stereotype?.let { appendLine("    <<$it>> $className") }
                node.classId?.let { appendLine("    $className : $it") }
                if (node.external) {
                    appendLine("    style $className stroke-dasharray: 5 5")
                }
            }
            spec.edges.forEach { edge ->
                val arrow =
                    when (edge.kind) {
                        RelationKind.EXTENDS -> "--|>"
                        RelationKind.IMPLEMENTS -> "..|>"
                    }
                val tag = edge.kind.name.lowercase()
                appendLine("    ${classNames.getValue(edge.fromId)} $arrow ${classNames.getValue(edge.toId)} : $tag")
            }
        }.trimEnd()

    private fun classNames(spec: DiagramSpec): Map<String, String> {
        val candidates =
            spec.nodes.associate { node ->
                node.id to
                    node.displayName
                        .takeIf { MERMAID_CLASS_NAME_REGEX.matches(it) }
                        .orEmpty()
                        .ifBlank { node.id }
            }
        val duplicatedNames =
            candidates.values
                .groupingBy { it }
                .eachCount()
                .filterValues { it > 1 }
                .keys
        return spec.nodes.associate { node ->
            val candidate = candidates.getValue(node.id)
            node.id to if (candidate in duplicatedNames) node.id else candidate
        }
    }

    companion object {
        private val MERMAID_CLASS_NAME_REGEX = Regex("^[\\p{L}\\p{N}_-]+$")
    }
}
