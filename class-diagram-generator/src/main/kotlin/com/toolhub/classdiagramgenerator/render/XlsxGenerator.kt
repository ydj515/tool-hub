package com.toolhub.classdiagramgenerator.render

import com.toolhub.classdiagramgenerator.domain.LabelDictionary
import com.toolhub.classdiagramgenerator.domain.Layer
import com.toolhub.classdiagramgenerator.domain.Module
import com.toolhub.classdiagramgenerator.domain.OutputLabels
import com.toolhub.classdiagramgenerator.domain.Program
import com.toolhub.classdiagramgenerator.render.diagram.DiagramArtifactIndex
import org.apache.poi.ss.usermodel.BorderStyle
import org.apache.poi.ss.usermodel.CellStyle
import org.apache.poi.ss.usermodel.ClientAnchor
import org.apache.poi.ss.usermodel.Drawing
import org.apache.poi.ss.usermodel.FillPatternType
import org.apache.poi.ss.usermodel.IndexedColors
import org.apache.poi.ss.usermodel.Sheet
import org.apache.poi.ss.usermodel.Workbook
import org.apache.poi.ss.util.CellRangeAddress
import org.apache.poi.xssf.usermodel.XSSFClientAnchor
import org.apache.poi.xssf.usermodel.XSSFWorkbook
import org.springframework.stereotype.Component
import java.io.OutputStream
import java.nio.file.Files
import java.nio.file.Path
import java.time.format.DateTimeFormatter

@Component
@Suppress("TooManyFunctions")
class XlsxGenerator : DocumentGenerator {
    override val format = "xlsx"

    override fun render(
        program: Program,
        module: Module,
        diagrams: DiagramArtifactIndex,
        out: OutputStream,
    ) {
        val labels = OutputLabels.of(program.language)
        XSSFWorkbook().use { wb ->
            val header = headerStyle(wb)
            val body = bodyStyle(wb)
            renderCover(wb.createSheet(labels["sheet.cover"]), program, module, labels, body)
            renderClassList(wb.createSheet(labels["sheet.classList"]), module, labels, header, body)
            renderLayerDiagramsSheet(wb, module, diagrams, labels, header, body)
            renderClassDesign(wb.createSheet(labels["sheet.classDesign"]), module, diagrams, labels, header, body)
            wb.write(out)
        }
    }

    private fun renderCover(
        sheet: Sheet,
        program: Program,
        module: Module,
        labels: LabelDictionary,
        body: CellStyle,
    ) {
        val rows =
            listOf(
                labels["doc.title.cover"] to program.name,
                labels["doc.meta.programName"] to program.name,
                labels["doc.meta.moduleName"] to module.name,
                labels["doc.meta.version"] to program.version,
                labels["doc.meta.generatedAt"] to program.generatedAt.format(DateTimeFormatter.ISO_OFFSET_DATE_TIME),
            )
        rows.forEachIndexed { idx, (label, value) ->
            val row = sheet.createRow(idx)
            row.createCell(0).apply {
                setCellValue(label)
                cellStyle = body
            }
            row.createCell(1).apply {
                setCellValue(value)
                cellStyle = body
            }
        }
        sheet.setColumnWidth(0, COL_WIDTH_LABEL)
        sheet.setColumnWidth(1, COL_WIDTH_VALUE)
    }

    private fun renderClassList(
        sheet: Sheet,
        module: Module,
        labels: LabelDictionary,
        header: CellStyle,
        body: CellStyle,
    ) {
        val headers =
            listOf(
                labels["col.classId"],
                labels["col.className"],
                labels["col.layer"],
                labels["col.package"],
                labels["col.description"],
            )
        writeRow(sheet, 0, headers, header)
        module.classes.forEachIndexed { i, c ->
            writeRow(
                sheet,
                i + 1,
                listOf(
                    c.id,
                    c.name,
                    labels["layer.${c.layer.name.lowercase()}"],
                    c.packagePath,
                    c.description,
                ),
                body,
            )
        }
        sheet.setAutoFilter(CellRangeAddress(0, module.classes.size, 0, headers.size - 1))
        sheet.createFreezePane(0, 1)
        CLASS_LIST_COLUMN_WIDTHS.forEachIndexed { index, width -> sheet.setColumnWidth(index, width) }
    }

    private fun renderLayerDiagramsSheet(
        wb: XSSFWorkbook,
        module: Module,
        diagrams: DiagramArtifactIndex,
        labels: LabelDictionary,
        header: CellStyle,
        body: CellStyle,
    ) {
        val map = diagrams.layerDiagrams[module.name] ?: return
        if (map.values.filterNotNull().isEmpty()) return
        val sheet = wb.createSheet(labels["sheet.layerDiagrams"])
        applyColumnWidths(sheet, DIAGRAM_SHEET_COLUMN_WIDTHS)
        val drawing: Drawing<*> = sheet.createDrawingPatriarch()
        val drawingContext = DrawingContext(wb, drawing)
        var row = 0
        Layer.entries.forEach { layer ->
            val path = map[layer] ?: return@forEach
            writeMergedRow(sheet, row, labels["layer.${layer.name.lowercase()}"], header)
            row += 1
            row = writeDiagramRow(sheet, row, drawingContext, path, body) + ROW_PAD
        }
    }

    private fun renderClassDesign(
        sheet: Sheet,
        module: Module,
        diagrams: DiagramArtifactIndex,
        labels: LabelDictionary,
        header: CellStyle,
        body: CellStyle,
    ) {
        val wb = sheet.workbook as XSSFWorkbook
        val context =
            ClassDesignRenderContext(
                labels = labels,
                header = header,
                body = body,
                drawing = DrawingContext(wb, sheet.createDrawingPatriarch()),
            )
        applyColumnWidths(sheet, CLASS_DESIGN_COLUMN_WIDTHS)
        var row = 0
        module.classes.forEach { c ->
            val path = diagrams.classDiagrams[module.name]?.get(c.id)
            row = writeClassBlock(sheet, row, c, path, context) + CLASS_BLOCK_SPACING_ROWS
        }
        sheet.createFreezePane(0, 1)
    }

    private fun embedImage(
        wb: XSSFWorkbook,
        drawing: Drawing<*>,
        path: Path,
        anchorCol: Int,
        anchorRow: Int,
    ): Int {
        val bytes = Files.readAllBytes(path)
        val pictureIdx = wb.addPicture(bytes, Workbook.PICTURE_TYPE_PNG)
        val anchor: ClientAnchor = XSSFClientAnchor(0, 0, 0, 0, anchorCol, anchorRow, anchorCol, anchorRow)
        anchor.anchorType = ClientAnchor.AnchorType.MOVE_DONT_RESIZE
        val picture = drawing.createPicture(anchor, pictureIdx)
        picture.resize()
        picture.resize(PIC_SCALE)
        return picture.preferredSize.row2 + 1
    }

    private fun writeClassBlock(
        sheet: Sheet,
        startRow: Int,
        c: com.toolhub.classdiagramgenerator.domain.ClassInfo,
        classDiagramPath: Path?,
        context: ClassDesignRenderContext,
    ): Int {
        var row = startRow
        writeRow(
            sheet,
            row,
            listOf(
                context.labels["col.classId"],
                context.labels["col.className"],
                context.labels["col.description"],
                "",
            ),
            context.header,
        )
        mergeCells(sheet, row++, 2, CLASS_DESIGN_LAST_COLUMN)

        writeRow(sheet, row, listOf(c.id, c.name, c.description, ""), context.body)
        mergeCells(sheet, row++, 2, CLASS_DESIGN_LAST_COLUMN)

        writeMergedRow(sheet, row++, context.labels["doc.title.classDiagram"], context.header)
        row = writeDiagramRow(sheet, row, context.drawing, classDiagramPath, context.body)

        writeRow(
            sheet,
            row++,
            listOf(
                context.labels["col.attributeName"],
                context.labels["col.type"],
                context.labels["col.accessModifier"],
                context.labels["col.description"],
            ),
            context.header,
        )
        c.attributes.forEach { a ->
            writeRow(
                sheet,
                row++,
                listOf(a.name, a.type, context.labels["access.${a.accessModifier.name.lowercase()}"], a.description),
                context.body,
            )
        }
        writeRow(
            sheet,
            row,
            listOf(context.labels["col.operationName"], context.labels["col.description"], "", ""),
            context.header,
        )
        mergeCells(sheet, row++, 1, CLASS_DESIGN_LAST_COLUMN)
        c.operations.forEach { o ->
            writeRow(sheet, row, listOf(o.name, o.description, "", ""), context.body)
            mergeCells(sheet, row++, 1, CLASS_DESIGN_LAST_COLUMN)
        }
        return row
    }

    private fun writeDiagramRow(
        sheet: Sheet,
        rowIdx: Int,
        drawingContext: DrawingContext,
        path: Path?,
        body: CellStyle,
    ): Int =
        if (path == null) {
            writeMergedRow(sheet, rowIdx, "-", body)
            rowIdx + 1
        } else {
            writeMergedRow(sheet, rowIdx, "", body)
            embedImage(drawingContext.workbook, drawingContext.drawing, path, anchorCol = 0, anchorRow = rowIdx)
        }

    private fun writeRow(
        sheet: Sheet,
        rowIdx: Int,
        values: List<String>,
        style: CellStyle,
    ) {
        val row = sheet.createRow(rowIdx)
        values.forEachIndexed { i, v ->
            row.createCell(i).apply {
                setCellValue(v)
                cellStyle = style
            }
        }
    }

    private fun writeMergedRow(
        sheet: Sheet,
        rowIdx: Int,
        value: String,
        style: CellStyle,
    ) {
        writeRow(sheet, rowIdx, listOf(value, "", "", ""), style)
        mergeCells(sheet, rowIdx, 0, CLASS_DESIGN_LAST_COLUMN)
    }

    private fun mergeCells(
        sheet: Sheet,
        rowIdx: Int,
        fromCol: Int,
        toCol: Int,
    ) {
        if (toCol <= fromCol) return
        sheet.addMergedRegion(CellRangeAddress(rowIdx, rowIdx, fromCol, toCol))
    }

    private fun applyColumnWidths(
        sheet: Sheet,
        widths: IntArray,
    ) {
        widths.forEachIndexed { index, width ->
            sheet.setColumnWidth(index, width)
        }
    }

    private fun headerStyle(wb: Workbook): CellStyle =
        wb.createCellStyle().apply {
            fillForegroundColor = IndexedColors.GREY_25_PERCENT.index
            fillPattern = FillPatternType.SOLID_FOREGROUND
            applyBorders(this)
            val font = wb.createFont().apply { bold = true }
            setFont(font)
        }

    private fun bodyStyle(wb: Workbook): CellStyle = wb.createCellStyle().apply { applyBorders(this) }

    private fun applyBorders(style: CellStyle) {
        style.borderTop = BorderStyle.THIN
        style.borderBottom = BorderStyle.THIN
        style.borderLeft = BorderStyle.THIN
        style.borderRight = BorderStyle.THIN
    }

    companion object {
        private const val COL_WIDTH_LABEL = 6000
        private const val COL_WIDTH_VALUE = 12000
        private const val ROW_PAD = 2
        private const val PIC_SCALE = 0.5
        private const val CLASS_DESIGN_LAST_COLUMN = 3
        private const val CLASS_BLOCK_SPACING_ROWS = 3
        private val CLASS_LIST_COLUMN_WIDTHS = intArrayOf(4_500, 6_000, 4_500, 8_000, 14_000)
        private val DIAGRAM_SHEET_COLUMN_WIDTHS = intArrayOf(7_000, 7_000, 7_000, 7_000)
        private val CLASS_DESIGN_COLUMN_WIDTHS = intArrayOf(4_500, 5_000, 4_500, 14_000)
    }

    private data class DrawingContext(
        val workbook: XSSFWorkbook,
        val drawing: Drawing<*>,
    )

    private data class ClassDesignRenderContext(
        val labels: LabelDictionary,
        val header: CellStyle,
        val body: CellStyle,
        val drawing: DrawingContext,
    )
}
