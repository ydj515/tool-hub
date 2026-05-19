package com.toolhub.classdiagramgenerator.render

import com.toolhub.classdiagramgenerator.domain.LabelDictionary
import com.toolhub.classdiagramgenerator.domain.Module
import com.toolhub.classdiagramgenerator.domain.OutputLabels
import com.toolhub.classdiagramgenerator.domain.Program
import org.apache.poi.ss.usermodel.BorderStyle
import org.apache.poi.ss.usermodel.CellStyle
import org.apache.poi.ss.usermodel.FillPatternType
import org.apache.poi.ss.usermodel.IndexedColors
import org.apache.poi.ss.usermodel.Sheet
import org.apache.poi.ss.usermodel.Workbook
import org.apache.poi.ss.util.CellRangeAddress
import org.apache.poi.xssf.usermodel.XSSFWorkbook
import org.springframework.stereotype.Component
import java.io.OutputStream
import java.time.format.DateTimeFormatter

@Component
class XlsxGenerator : DocumentGenerator {
    override val format = "xlsx"

    override fun render(
        program: Program,
        module: Module,
        out: OutputStream,
    ) {
        val labels = OutputLabels.of(program.language)
        XSSFWorkbook().use { wb ->
            val header = headerStyle(wb)
            val body = bodyStyle(wb)
            renderCover(wb.createSheet(labels["sheet.cover"]), program, module, labels, body)
            renderClassList(wb.createSheet(labels["sheet.classList"]), module, labels, header, body)
            renderClassDesign(wb.createSheet(labels["sheet.classDesign"]), module, labels, header, body)
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
        repeat(headers.size) { sheet.setColumnWidth(it, COL_WIDTH_DATA) }
    }

    private fun renderClassDesign(
        sheet: Sheet,
        module: Module,
        labels: LabelDictionary,
        header: CellStyle,
        body: CellStyle,
    ) {
        var row = 0
        module.classes.forEach { c ->
            row = writeClassBlock(sheet, row, c, labels, header, body)
            row++ // spacer
        }
        sheet.createFreezePane(0, 1)
        repeat(MAX_HEADER_COLS) { sheet.setColumnWidth(it, COL_WIDTH_DATA) }
    }

    private fun writeClassBlock(
        sheet: Sheet,
        startRow: Int,
        c: com.toolhub.classdiagramgenerator.domain.ClassInfo,
        labels: LabelDictionary,
        header: CellStyle,
        body: CellStyle,
    ): Int {
        var row = startRow
        writeRow(sheet, row++, listOf(labels["col.classId"], labels["col.className"], labels["col.description"]), header)
        writeRow(sheet, row++, listOf(c.id, c.name, c.description), body)
        writeRow(
            sheet,
            row++,
            listOf(
                labels["col.attributeName"],
                labels["col.type"],
                labels["col.accessModifier"],
                labels["col.description"],
            ),
            header,
        )
        c.attributes.forEach { a ->
            writeRow(
                sheet,
                row++,
                listOf(a.name, a.type, labels["access.${a.accessModifier.name.lowercase()}"], a.description),
                body,
            )
        }
        writeRow(sheet, row++, listOf(labels["col.operationName"], labels["col.description"]), header)
        c.operations.forEach { o ->
            writeRow(sheet, row++, listOf(o.name, o.description), body)
        }
        return row
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
        private const val COL_WIDTH_DATA = 6000
        private const val MAX_HEADER_COLS = 4
    }
}
