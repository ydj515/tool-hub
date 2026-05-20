package com.toolhub.classdiagramgenerator.render

import com.toolhub.classdiagramgenerator.domain.LabelDictionary
import com.toolhub.classdiagramgenerator.domain.Layer
import com.toolhub.classdiagramgenerator.domain.Module
import com.toolhub.classdiagramgenerator.domain.OutputLabels
import com.toolhub.classdiagramgenerator.domain.Program
import com.toolhub.classdiagramgenerator.render.diagram.DiagramArtifactIndex
import com.toolhub.classdiagramgenerator.render.diagram.MermaidRenderer
import org.springframework.stereotype.Component
import java.io.OutputStream
import java.io.PrintWriter
import java.time.format.DateTimeFormatter

@Component
class MarkdownGenerator(
    private val mermaid: MermaidRenderer,
) : DocumentGenerator {
    override val format = "md"

    override fun render(
        program: Program,
        module: Module,
        diagrams: DiagramArtifactIndex,
        out: OutputStream,
    ) {
        val labels = OutputLabels.of(program.language)
        PrintWriter(out.writer(Charsets.UTF_8)).use { w ->
            renderCover(w, program, module, labels)
            renderLayerDiagrams(w, module, diagrams, labels)
            renderClassList(w, module, labels)
            renderClassDesign(w, module, diagrams, labels)
            w.flush()
        }
    }

    private fun renderLayerDiagrams(
        w: PrintWriter,
        module: Module,
        diagrams: DiagramArtifactIndex,
        labels: LabelDictionary,
    ) {
        val specs = diagrams.specs[module.name] ?: return
        val layerSpecs = Layer.entries.mapNotNull { l -> specs["layer-${l.name.lowercase()}"]?.let { l to it } }
        if (layerSpecs.isEmpty()) return
        w.println("## ${labels["doc.title.layerDiagrams"]}")
        w.println()
        layerSpecs.forEach { (layer, spec) ->
            w.println("### ${labels["layer.${layer.name.lowercase()}"]}")
            w.println()
            w.println("```mermaid")
            w.println(mermaid.render(spec))
            w.println("```")
            w.println()
        }
    }

    private fun renderCover(
        w: PrintWriter,
        program: Program,
        module: Module,
        labels: LabelDictionary,
    ) {
        w.println("# ${labels["doc.title.cover"]}(${program.name})")
        w.println()
        w.println(
            "| ${labels["doc.meta.programName"]} | ${labels["doc.meta.moduleName"]} | " +
                "${labels["doc.meta.version"]} | ${labels["doc.meta.generatedAt"]} |",
        )
        w.println("|---|---|---|---|")
        val ts = program.generatedAt.format(DateTimeFormatter.ISO_OFFSET_DATE_TIME)
        w.println("| ${program.name} | ${module.name} | ${program.version} | $ts |")
        w.println()
    }

    private fun renderClassList(
        w: PrintWriter,
        module: Module,
        labels: LabelDictionary,
    ) {
        w.println("## ${labels["doc.title.classList"]}")
        w.println()
        w.println(
            "| ${labels["col.classId"]} | ${labels["col.className"]} | " +
                "${labels["col.layer"]} | ${labels["col.description"]} |",
        )
        w.println("|---|---|---|---|")
        module.classes.forEach { c ->
            w.println(
                "| ${c.id} | ${c.name} | ${labels["layer.${c.layer.name.lowercase()}"]} | ${c.description} |",
            )
        }
        w.println()
    }

    private fun renderClassDesign(
        w: PrintWriter,
        module: Module,
        diagrams: DiagramArtifactIndex,
        labels: LabelDictionary,
    ) {
        w.println("## ${labels["doc.title.classDesign"]}")
        w.println()
        val specs = diagrams.specs[module.name] ?: emptyMap()
        module.classes.forEachIndexed { idx, c ->
            if (idx > 0) {
                w.println("---")
                w.println()
            }
            w.println("### ${c.id} ${c.name}")
            w.println()
            specs["class-${c.id}"]?.let { spec ->
                w.println("```mermaid")
                w.println(mermaid.render(spec))
                w.println("```")
                w.println()
            }
            renderHeaderRow(w, c, labels)
            renderAttributesTable(w, c, labels)
            renderOperationsTable(w, c, labels)
        }
    }

    private fun renderHeaderRow(
        w: PrintWriter,
        c: com.toolhub.classdiagramgenerator.domain.ClassInfo,
        labels: LabelDictionary,
    ) {
        w.println("| ${labels["col.classId"]} | ${labels["col.className"]} | ${labels["col.description"]} |")
        w.println("|---|---|---|")
        w.println("| ${c.id} | ${c.name} | ${c.description} |")
        w.println()
    }

    private fun renderAttributesTable(
        w: PrintWriter,
        c: com.toolhub.classdiagramgenerator.domain.ClassInfo,
        labels: LabelDictionary,
    ) {
        w.println(
            "| ${labels["col.attributeName"]} | ${labels["col.type"]} | " +
                "${labels["col.accessModifier"]} | ${labels["col.description"]} |",
        )
        w.println("|---|---|---|---|")
        c.attributes.forEach { a ->
            w.println(
                "| ${a.name} | `${a.type}` | ${labels["access.${a.accessModifier.name.lowercase()}"]} | ${a.description} |",
            )
        }
        w.println()
    }

    private fun renderOperationsTable(
        w: PrintWriter,
        c: com.toolhub.classdiagramgenerator.domain.ClassInfo,
        labels: LabelDictionary,
    ) {
        w.println("| ${labels["col.operationName"]} | ${labels["col.description"]} |")
        w.println("|---|---|")
        c.operations.forEach { o ->
            w.println("| ${o.name} | ${o.description} |")
        }
        w.println()
    }
}
