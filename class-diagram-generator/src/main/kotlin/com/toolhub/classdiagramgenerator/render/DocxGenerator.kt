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
import org.apache.poi.xwpf.usermodel.TableWidthType
import org.apache.poi.xwpf.usermodel.XWPFDocument
import org.apache.poi.xwpf.usermodel.XWPFParagraph
import org.apache.poi.xwpf.usermodel.XWPFTable
import org.apache.poi.xwpf.usermodel.XWPFTableCell
import org.apache.poi.xwpf.usermodel.XWPFTableRow
import org.openxmlformats.schemas.wordprocessingml.x2006.main.STPageOrientation
import org.openxmlformats.schemas.wordprocessingml.x2006.main.STTblLayoutType
import org.springframework.stereotype.Component
import java.io.OutputStream
import java.math.BigInteger
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
            configureSectionProperties(doc)
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

    private fun findClassDiagramPath(
        module: Module,
        classId: String,
        diagrams: DiagramArtifactIndex,
    ): Path? = diagrams.classDiagrams[module.name]?.get(classId)

    private fun insertImage(
        doc: XWPFDocument,
        path: Path,
    ) {
        val para = doc.createParagraph()
        insertImage(para, path)
    }

    private fun insertImage(
        cell: XWPFTableCell,
        path: Path,
    ) {
        val para = cell.paragraphs.firstOrNull() ?: cell.addParagraph()
        para.alignment = ParagraphAlignment.CENTER
        insertImage(para, path)
    }

    private fun insertImage(
        paragraph: XWPFParagraph,
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
        val run = paragraph.createRun()
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
        configureTable(table, COVER_TABLE_GRID)
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
        configureTable(table, CLASS_LIST_TABLE_GRID)
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
        module.classes.forEachIndexed { index, c ->
            renderClassDesignTable(doc, module, c, diagrams, labels)
            if (index < module.classes.lastIndex) {
                addBlankLines(doc, CLASS_TABLE_SPACING_LINES)
            }
        }
    }

    private fun renderClassDesignTable(
        doc: XWPFDocument,
        module: Module,
        c: ClassInfo,
        diagrams: DiagramArtifactIndex,
        labels: LabelDictionary,
    ) {
        val totalRows = BASE_CLASS_TABLE_ROWS + c.attributes.size + c.operations.size
        val table = doc.createTable(totalRows, CLASS_TABLE_COLUMNS)
        configureTable(table, CLASS_DESIGN_TABLE_GRID)
        var rowIndex = 0

        renderClassHeader(table.getRow(rowIndex++), labels)
        renderClassSummary(table.getRow(rowIndex++), c)
        rowIndex = renderClassDiagram(table, rowIndex, findClassDiagramPath(module, c.id, diagrams), labels)
        rowIndex = renderAttributes(table, rowIndex, c, labels)
        renderOperations(table, rowIndex, c, labels)
        applyFont(table)
    }

    private fun renderClassHeader(
        row: XWPFTableRow,
        labels: LabelDictionary,
    ) {
        setHeaderCell(row.getCell(0), labels["col.classId"])
        setHeaderCell(row.getCell(1), labels["col.className"])
        setHeaderCell(row.getCell(2), labels["col.description"])
        mergeCells(row, 2, 3)
    }

    private fun renderClassSummary(
        row: XWPFTableRow,
        c: ClassInfo,
    ) {
        row.getCell(0).text = c.id
        row.getCell(1).text = c.name
        row.getCell(2).text = c.description
        mergeCells(row, 2, 3)
    }

    private fun renderClassDiagram(
        table: XWPFTable,
        startRowIndex: Int,
        classDiagramPath: Path?,
        labels: LabelDictionary,
    ): Int {
        val diagramHeaderRow = table.getRow(startRowIndex)
        setHeaderCell(diagramHeaderRow.getCell(0), labels["doc.title.classDiagram"])
        mergeCells(diagramHeaderRow, 0, LAST_COLUMN_INDEX)

        val diagramRow = table.getRow(startRowIndex + 1)
        if (classDiagramPath == null) {
            diagramRow.getCell(0).text = "-"
        } else {
            insertImage(diagramRow.getCell(0), classDiagramPath)
        }
        mergeCells(diagramRow, 0, LAST_COLUMN_INDEX)
        return startRowIndex + 2
    }

    private fun renderAttributes(
        table: XWPFTable,
        startRowIndex: Int,
        c: ClassInfo,
        labels: LabelDictionary,
    ): Int {
        val headerRow = table.getRow(startRowIndex)
        listOf(
            labels["col.attributeName"],
            labels["col.type"],
            labels["col.accessModifier"],
            labels["col.description"],
        ).forEachIndexed { i, h ->
            setHeaderCell(headerRow.getCell(i), h)
        }
        c.attributes.forEachIndexed { index, a ->
            val row = table.getRow(startRowIndex + index + 1)
            row.getCell(0).text = a.name
            row.getCell(1).text = a.type
            row.getCell(2).text = labels["access.${a.accessModifier.name.lowercase()}"]
            row.getCell(3).text = a.description
        }
        return startRowIndex + 1 + c.attributes.size
    }

    private fun renderOperations(
        table: XWPFTable,
        startRowIndex: Int,
        c: ClassInfo,
        labels: LabelDictionary,
    ) {
        val headerRow = table.getRow(startRowIndex)
        setHeaderCell(headerRow.getCell(0), labels["col.operationName"])
        setHeaderCell(headerRow.getCell(1), labels["col.description"])
        mergeCells(headerRow, 1, LAST_COLUMN_INDEX)

        c.operations.forEachIndexed { index, o ->
            val row = table.getRow(startRowIndex + index + 1)
            row.getCell(0).text = o.name
            row.getCell(1).text = o.description
            mergeCells(row, 1, LAST_COLUMN_INDEX)
        }
    }

    private fun setHeaderCell(
        cell: XWPFTableCell,
        text: String,
    ) {
        cell.text = text
        cell.color = headerShade
    }

    private fun mergeCells(
        row: XWPFTableRow,
        fromCell: Int,
        toCell: Int,
    ) {
        if (toCell <= fromCell) return
        val cell = row.getCell(fromCell) ?: return
        val tcPr = cell.ctTc.tcPr ?: cell.ctTc.addNewTcPr()
        val gridSpan = if (tcPr.isSetGridSpan) tcPr.gridSpan else tcPr.addNewGridSpan()
        gridSpan.`val` = BigInteger.valueOf((toCell - fromCell + 1).toLong())
        for (index in toCell downTo fromCell + 1) {
            row.removeCell(index)
        }
    }

    private fun addBlankLines(
        doc: XWPFDocument,
        count: Int,
    ) {
        repeat(count) {
            doc.createParagraph()
        }
    }

    private fun configureTable(
        table: XWPFTable,
        columnGrid: List<Int>,
    ) {
        table.setWidthType(TableWidthType.PCT)
        table.setWidth("100%")
        val tblPr = table.ctTbl.tblPr ?: table.ctTbl.addNewTblPr()
        val tblLayout = tblPr.tblLayout ?: tblPr.addNewTblLayout()
        tblLayout.type = STTblLayoutType.FIXED

        val tblGrid = table.ctTbl.tblGrid ?: table.ctTbl.addNewTblGrid()
        while (tblGrid.gridColList.isNotEmpty()) {
            tblGrid.removeGridCol(tblGrid.gridColList.lastIndex)
        }
        columnGrid.forEach { width ->
            tblGrid.addNewGridCol().w = BigInteger.valueOf(width.toLong())
        }
    }

    private fun configureSectionProperties(doc: XWPFDocument) {
        val body = doc.document.body
        val section = if (body.isSetSectPr) body.sectPr else body.addNewSectPr()
        val pageSize = if (section.isSetPgSz) section.pgSz else section.addNewPgSz()
        pageSize.w = BigInteger.valueOf(PAGE_WIDTH_TWIPS.toLong())
        pageSize.h = BigInteger.valueOf(PAGE_HEIGHT_TWIPS.toLong())
        pageSize.orient = STPageOrientation.PORTRAIT

        val pageMargin = if (section.isSetPgMar) section.pgMar else section.addNewPgMar()
        pageMargin.top = BigInteger.valueOf(PAGE_MARGIN_TWIPS.toLong())
        pageMargin.bottom = BigInteger.valueOf(PAGE_MARGIN_TWIPS.toLong())
        pageMargin.left = BigInteger.valueOf(PAGE_MARGIN_TWIPS.toLong())
        pageMargin.right = BigInteger.valueOf(PAGE_MARGIN_TWIPS.toLong())
        pageMargin.header = BigInteger.valueOf(HEADER_FOOTER_MARGIN_TWIPS.toLong())
        pageMargin.footer = BigInteger.valueOf(HEADER_FOOTER_MARGIN_TWIPS.toLong())
        pageMargin.gutter = BigInteger.ZERO
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
        private const val BASE_CLASS_TABLE_ROWS = 6
        private const val CLASS_TABLE_COLUMNS = 4
        private const val LAST_COLUMN_INDEX = CLASS_TABLE_COLUMNS - 1
        private const val CLASS_TABLE_SPACING_LINES = 3
        private val COVER_TABLE_GRID = listOf(2_400, 7_200)
        private val CLASS_LIST_TABLE_GRID = listOf(1_400, 2_000, 1_500, 4_900)
        private val CLASS_DESIGN_TABLE_GRID = listOf(1_400, 1_900, 1_500, 5_000)
        private const val PAGE_WIDTH_TWIPS = 11_907
        private const val PAGE_HEIGHT_TWIPS = 16_839
        private const val PAGE_MARGIN_TWIPS = 1_440
        private const val HEADER_FOOTER_MARGIN_TWIPS = 720
    }
}
