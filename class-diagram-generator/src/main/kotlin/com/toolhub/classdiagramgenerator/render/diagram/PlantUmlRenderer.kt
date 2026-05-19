package com.toolhub.classdiagramgenerator.render.diagram

import com.toolhub.classdiagramgenerator.domain.RelationKind
import net.sourceforge.plantuml.FileFormat
import net.sourceforge.plantuml.FileFormatOption
import net.sourceforge.plantuml.SourceStringReader
import org.springframework.stereotype.Component
import java.io.ByteArrayOutputStream

@Component
class PlantUmlRenderer {
    fun buildSource(spec: DiagramSpec): String =
        buildString {
            appendLine("@startuml")
            appendLine("!pragma layout smetana")
            appendLine("skinparam dpi 96")
            appendLine("skinparam classBackgroundColor white")
            appendLine("skinparam classBorderColor #555555")
            appendLine("skinparam class<<external>> {")
            appendLine("  borderStyle dashed")
            appendLine("}")
            spec.nodes.forEach { node -> appendLine(formatNode(node)) }
            spec.edges.forEach { e -> appendLine(formatEdge(e)) }
            append("@enduml")
        }

    fun render(spec: DiagramSpec): ByteArray {
        val source = buildSource(spec)
        val reader = SourceStringReader(source)
        val out = ByteArrayOutputStream()
        reader.outputImage(out, FileFormatOption(FileFormat.PNG))
        return out.toByteArray()
    }

    private fun formatNode(node: DiagramNode): String =
        if (node.external) {
            """class "${escape(node.displayName)}" as ${node.id} <<external>>"""
        } else {
            val st = node.stereotype?.let { "<<$it>>\\n" } ?: ""
            val cls = node.classId?.let { "$it\\n" } ?: ""
            """class "$st$cls${escape(node.displayName)}" as ${node.id}"""
        }

    private fun formatEdge(edge: DiagramEdge): String {
        val arrow =
            when (edge.kind) {
                RelationKind.EXTENDS -> "--|>"
                RelationKind.IMPLEMENTS -> "..|>"
            }
        return "${edge.fromId} $arrow ${edge.toId}"
    }

    private fun escape(text: String): String = text.replace("\"", "\\\"")
}
