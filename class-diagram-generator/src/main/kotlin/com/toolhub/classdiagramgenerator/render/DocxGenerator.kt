package com.toolhub.classdiagramgenerator.render

import com.toolhub.classdiagramgenerator.domain.ClassInfo
import com.toolhub.classdiagramgenerator.domain.LabelDictionary
import com.toolhub.classdiagramgenerator.domain.Module
import com.toolhub.classdiagramgenerator.domain.OutputLabels
import com.toolhub.classdiagramgenerator.domain.Program
import com.toolhub.classdiagramgenerator.render.diagram.DiagramArtifactIndex
import org.apache.poi.util.Units
import org.apache.poi.xwpf.usermodel.Document
import org.apache.poi.xwpf.usermodel.ParagraphAlignment
import org.apache.poi.xwpf.usermodel.XWPFDocument
import org.apache.poi.xwpf.usermodel.XWPFTable
import org.springframework.stereotype.Component
import java.io.OutputStream
import java.nio.file.Files
import java.nio.file.Path
import java.time.format.DateTimeFormatter
import javax.imageio.ImageIO

@Component
@Suppress("TooManyFunctions")
class DocxGenerator : DocumentGenerator {
    override val format = "docx"

    private val font = "맑은 고딕"
    private val headerShade = "D9D9D9"

    override fun render(
        program: Program,
        module: Module,
        diagrams: DiagramArtifactIndex,
        out: OutputStream,
    ) {
        val labels = OutputLabels.of(program.language)
        XWPFDocument().use { doc ->
            renderCover(doc, program, module, labels)
            renderLayerDiagrams(doc, module, diagrams, labels)
            renderClassList(doc, module, labels)
            renderClassDesign(doc, module, diagrams, labels)
            doc.write(out)
        }
    }

    private fun renderLayerDiagrams(
        doc: XWPFDocument,
        module: Module,
        diagrams: DiagramArtifactIndex,
        labels: LabelDictionary,
    ) {
        val map = diagrams.layerDiagrams[module.name] ?: return
        if (map.values.filterNotNull().isEmpty()) return
        heading(doc, labels["doc.title.layerDiagrams"])
        com.toolhub.classdiagramgenerator.domain.Layer.entries.forEach { layer ->
            val path = map[layer] ?: return@forEach
            subHeading(doc, labels["layer.${layer.name.lowercase()}"])
            insertImage(doc, path)
        }
        doc.createParagraph().createRun().addBreak()
    }

    private fun renderClassDiagram(
        doc: XWPFDocument,
        module: Module,
        classId: String,
        diagrams: DiagramArtifactIndex,
    ) {
        val path = diagrams.classDiagrams[module.name]?.get(classId) ?: return
        insertImage(doc, path)
    }

    private fun insertImage(
        doc: XWPFDocument,
        path: Path,
    ) {
        val bytes = Files.readAllBytes(path)
        val image = ImageIO.read(java.io.ByteArrayInputStream(bytes))
        val maxWidthEmu = MAX_WIDTH_EMU
        val pxToEmu = Units.EMU_PER_PIXEL.toLong()
        val origWidth = image.width.toLong() * pxToEmu
        val origHeight = image.height.toLong() * pxToEmu
        val (w, h) =
            if (origWidth > maxWidthEmu) {
                val ratio = maxWidthEmu.toDouble() / origWidth
                maxWidthEmu to (origHeight * ratio).toLong()
            } else {
                origWidth to origHeight
            }
        val para = doc.createParagraph()
        val run = para.createRun()
        java.io.ByteArrayInputStream(bytes).use { input ->
            run.addPicture(input, Document.PICTURE_TYPE_PNG, path.fileName.toString(), w.toInt(), h.toInt())
        }
    }

    private fun subHeading(
        doc: XWPFDocument,
        text: String,
    ) {
        val p = doc.createParagraph()
        p.createRun().apply {
            fontFamily = font
            isBold = true
            fontSize = SUBHEADING_FONT_SIZE
            setText(text)
        }
    }

    private fun renderCover(
        doc: XWPFDocument,
        program: Program,
        module: Module,
        labels: LabelDictionary,
    ) {
        val title = doc.createParagraph().apply { alignment = ParagraphAlignment.CENTER }
        title.createRun().apply {
            fontFamily = font
            isBold = true
            fontSize = TITLE_FONT_SIZE
            setText("${labels["doc.title.cover"]}(${program.name})")
        }
        doc.createParagraph()
        val meta =
            listOf(
                labels["doc.meta.programName"] to program.name,
                labels["doc.meta.moduleName"] to module.name,
                labels["doc.meta.version"] to program.version,
                labels["doc.meta.generatedAt"] to program.generatedAt.format(DateTimeFormatter.ISO_OFFSET_DATE_TIME),
            )
        val table = doc.createTable(meta.size, 2)
        applyFont(table)
        meta.forEachIndexed { i, (k, v) ->
            table.getRow(i).getCell(0).text = k
            table.getRow(i).getCell(1).text = v
        }
        doc.createParagraph().createRun().addBreak()
    }

    private fun renderClassList(
        doc: XWPFDocument,
        module: Module,
        labels: LabelDictionary,
    ) {
        heading(doc, labels["doc.title.classList"])
        val headers =
            listOf(
                labels["col.classId"],
                labels["col.className"],
                labels["col.layer"],
                labels["col.description"],
            )
        val table = doc.createTable(module.classes.size + 1, headers.size)
        applyFont(table)
        headers.forEachIndexed { i, h ->
            table.getRow(0).getCell(i).text = h
            table.getRow(0).getCell(i).color = headerShade
        }
        module.classes.forEachIndexed { i, c ->
            val row = table.getRow(i + 1)
            row.getCell(0).text = c.id
            row.getCell(1).text = c.name
            row.getCell(2).text = labels["layer.${c.layer.name.lowercase()}"]
            row.getCell(3).text = c.description
        }
        doc.createParagraph().createRun().addBreak()
    }

    private fun renderClassDesign(
        doc: XWPFDocument,
        module: Module,
        diagrams: DiagramArtifactIndex,
        labels: LabelDictionary,
    ) {
        heading(doc, labels["doc.title.classDesign"])
        module.classes.forEach { c ->
            renderClassHeader(doc, c, labels)
            renderClassDiagram(doc, module, c.id, diagrams)
            renderAttributesTable(doc, c, labels)
            renderOperationsTable(doc, c, labels)
            doc.createParagraph().createRun().addBreak()
        }
    }

    private fun renderClassHeader(
        doc: XWPFDocument,
        c: ClassInfo,
        labels: LabelDictionary,
    ) {
        val header = doc.createTable(2, 3)
        applyFont(header)
        listOf(labels["col.classId"], labels["col.className"], labels["col.description"]).forEachIndexed { i, h ->
            header.getRow(0).getCell(i).text = h
            header.getRow(0).getCell(i).color = headerShade
        }
        header.getRow(1).let {
            it.getCell(0).text = c.id
            it.getCell(1).text = c.name
            it.getCell(2).text = c.description
        }
    }

    private fun renderAttributesTable(
        doc: XWPFDocument,
        c: ClassInfo,
        labels: LabelDictionary,
    ) {
        val attrTable = doc.createTable(c.attributes.size + 1, 4)
        applyFont(attrTable)
        listOf(
            labels["col.attributeName"],
            labels["col.type"],
            labels["col.accessModifier"],
            labels["col.description"],
        ).forEachIndexed { i, h ->
            attrTable.getRow(0).getCell(i).text = h
            attrTable.getRow(0).getCell(i).color = headerShade
        }
        c.attributes.forEachIndexed { i, a ->
            val row = attrTable.getRow(i + 1)
            row.getCell(0).text = a.name
            row.getCell(1).text = a.type
            row.getCell(2).text = labels["access.${a.accessModifier.name.lowercase()}"]
            row.getCell(3).text = a.description
        }
    }

    private fun renderOperationsTable(
        doc: XWPFDocument,
        c: ClassInfo,
        labels: LabelDictionary,
    ) {
        val opTable = doc.createTable(c.operations.size + 1, 2)
        applyFont(opTable)
        listOf(labels["col.operationName"], labels["col.description"]).forEachIndexed { i, h ->
            opTable.getRow(0).getCell(i).text = h
            opTable.getRow(0).getCell(i).color = headerShade
        }
        c.operations.forEachIndexed { i, o ->
            opTable.getRow(i + 1).getCell(0).text = o.name
            opTable.getRow(i + 1).getCell(1).text = o.description
        }
    }

    private fun heading(
        doc: XWPFDocument,
        text: String,
    ) {
        val p = doc.createParagraph()
        p.createRun().apply {
            fontFamily = font
            isBold = true
            fontSize = HEADING_FONT_SIZE
            setText(text)
        }
    }

    private fun applyFont(table: XWPFTable) {
        table.rows
            .flatMap { it.tableCells }
            .flatMap { it.paragraphs }
            .flatMap { it.runs }
            .forEach { r ->
                r.fontFamily = font
                r.fontSize = BODY_FONT_SIZE
            }
    }

    companion object {
        private const val TITLE_FONT_SIZE = 24
        private const val HEADING_FONT_SIZE = 16
        private const val SUBHEADING_FONT_SIZE = 12
        private const val BODY_FONT_SIZE = 10
        private const val MAX_WIDTH_EMU = 5_715_000L
    }
}
