package com.toolhub.classdiagramgenerator.render.diagram

import com.toolhub.classdiagramgenerator.domain.RelationKind
import org.springframework.stereotype.Component

@Component
class MermaidRenderer {
    fun render(spec: DiagramSpec): String =
        buildString {
            appendLine("classDiagram")
            spec.nodes.forEach { node ->
                val label = labelOf(node)
                appendLine("    class ${node.id}[\"$label\"]")
                if (node.external) {
                    appendLine("    style ${node.id} stroke-dasharray: 5 5")
                }
            }
            spec.edges.forEach { edge ->
                val arrow =
                    when (edge.kind) {
                        RelationKind.EXTENDS -> "--|>"
                        RelationKind.IMPLEMENTS -> "..|>"
                    }
                val tag = edge.kind.name.lowercase()
                appendLine("    ${edge.fromId} $arrow ${edge.toId} : $tag")
            }
        }.trimEnd()

    private fun labelOf(node: DiagramNode): String {
        if (node.external) return escape(node.displayName)
        val parts = mutableListOf<String>()
        node.stereotype?.let { parts += "«$it»" }
        node.classId?.let { parts += it }
        parts += node.displayName
        return parts.joinToString("\\n") { escape(it) }
    }

    private fun escape(text: String): String = text.replace("\"", "\\\"")
}
