package com.toolhub.classdiagramgenerator.render

import com.toolhub.classdiagramgenerator.domain.AccessModifier
import com.toolhub.classdiagramgenerator.domain.AttributeInfo
import com.toolhub.classdiagramgenerator.domain.ClassInfo
import com.toolhub.classdiagramgenerator.domain.Layer
import com.toolhub.classdiagramgenerator.domain.Module
import com.toolhub.classdiagramgenerator.domain.OperationInfo
import com.toolhub.classdiagramgenerator.domain.OutputLanguage
import com.toolhub.classdiagramgenerator.domain.Program
import com.toolhub.classdiagramgenerator.render.diagram.DiagramArtifactIndex
import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.shouldBe
import io.kotest.matchers.string.shouldContain
import org.apache.poi.xwpf.usermodel.XWPFDocument
import org.apache.poi.xwpf.usermodel.XWPFParagraph
import org.apache.poi.xwpf.usermodel.XWPFTable
import java.io.ByteArrayInputStream
import java.io.ByteArrayOutputStream
import java.time.ZonedDateTime
import java.util.zip.ZipInputStream

class DocxGeneratorTest :
    StringSpec({
        val gen = DocxGenerator()
        val program =
            Program(
                name = "demo",
                version = "v1.0",
                language = OutputLanguage.KO,
                generatedAt = ZonedDateTime.parse("2026-05-19T10:00:00+09:00"),
                modules =
                    listOf(
                        Module(
                            name = "core",
                            classes =
                                listOf(
                                    ClassInfo(
                                        id = "CLS-0001",
                                        name = "UserService",
                                        layer = Layer.SERVICE,
                                        description = "사용자 서비스.",
                                        packagePath = "com.demo.service",
                                        attributes =
                                            listOf(
                                                AttributeInfo("repo", "UserRepository", AccessModifier.PRIVATE, "리포지토리"),
                                            ),
                                        operations = listOf(OperationInfo("save", "저장한다.")),
                                    ),
                                ),
                        ),
                    ),
            )

        "docx contains korean labels in cover and class design single table" {
            val out = ByteArrayOutputStream()
            gen.render(program, program.modules[0], DiagramArtifactIndex.EMPTY, out)
            XWPFDocument(ByteArrayInputStream(out.toByteArray())).use { doc ->
                val text =
                    doc.paragraphs.joinToString("\n") { it.text } +
                        doc.tables.joinToString("\n") { tbl ->
                            tbl.rows.joinToString("\n") { row -> row.tableCells.joinToString("|") { it.text } }
                        }
                text shouldContain "클래스 설계서(demo)"
                text shouldContain "클래스 ID"
                text shouldContain "CLS-0001"
                doc.tables.size shouldBe 3
                doc.tables.last().text shouldContain "속성명"
                doc.tables.last().text shouldContain "오퍼레이션명"
            }
        }

        "docx embeds class diagram inside class design table and uses 2 operation columns" {
            val tmp = kotlin.io.path.createTempFile(prefix = "layer-controller", suffix = ".png")
            tmp.toFile().writeBytes(minimalPng() + byteArrayOf(0x00))
            val classTmp = kotlin.io.path.createTempFile(prefix = "class-CLS-0001", suffix = ".png")
            classTmp.toFile().writeBytes(minimalPng() + byteArrayOf(0x01))
            val idx =
                com.toolhub.classdiagramgenerator.render.diagram.DiagramArtifactIndex(
                    layerDiagrams = mapOf("core" to mapOf(com.toolhub.classdiagramgenerator.domain.Layer.CONTROLLER to tmp)),
                    classDiagrams = mapOf("core" to mapOf("CLS-0001" to classTmp)),
                    specs = emptyMap(),
                )
            val out = ByteArrayOutputStream()
            gen.render(program, program.modules[0], idx, out)
            XWPFDocument(ByteArrayInputStream(out.toByteArray())).use { doc ->
                doc.allPictures.size shouldBe 2
                doc.tables.size shouldBe 3

                val classTable = doc.tables.last()
                val hasEmbeddedClassDiagram =
                    classTable.rows
                        .flatMap { it.tableCells }
                        .flatMap { it.paragraphs }
                        .flatMap { it.runs }
                        .any { it.embeddedPictures.isNotEmpty() }

                hasEmbeddedClassDiagram shouldBe true

                val operationHeaderRow = classTable.rows.first { row -> row.getCell(0)?.text == "오퍼레이션명" }
                operationHeaderRow.tableCells.size shouldBe 2
            }
        }

        "docx uses dash for missing class diagrams and leaves three blank lines between class tables" {
            val multiClassProgram =
                program.copy(
                    modules =
                        listOf(
                            Module(
                                name = "core",
                                classes =
                                    listOf(
                                        program.modules[0].classes[0],
                                        ClassInfo(
                                            id = "CLS-0002",
                                            name = "UserSummary",
                                            layer = Layer.MODEL,
                                            description = "사용자 요약 정보.",
                                            packagePath = "com.demo.model",
                                            attributes = emptyList(),
                                            operations = emptyList(),
                                        ),
                                    ),
                            ),
                        ),
                )
            val out = ByteArrayOutputStream()
            gen.render(multiClassProgram, multiClassProgram.modules[0], DiagramArtifactIndex.EMPTY, out)
            XWPFDocument(ByteArrayInputStream(out.toByteArray())).use { doc ->
                doc.tables.size shouldBe 4

                val classTables = doc.bodyElements.filterIsInstance<XWPFTable>().takeLast(2)
                classTables.forEach { it.text shouldContain "-" }

                val bodyElements = doc.bodyElements
                val firstClassTableIndex = bodyElements.indexOf(classTables[0])
                val secondClassTableIndex = bodyElements.indexOf(classTables[1])
                val blankParagraphsBetweenTables =
                    bodyElements
                        .subList(firstClassTableIndex + 1, secondClassTableIndex)
                        .filterIsInstance<XWPFParagraph>()

                blankParagraphsBetweenTables.size shouldBe 3
                blankParagraphsBetweenTables.forEach { it.text shouldBe "" }
            }
        }

        "docx writes section properties and full-width tables" {
            val out = ByteArrayOutputStream()
            gen.render(program, program.modules[0], DiagramArtifactIndex.EMPTY, out)

            val documentXml = unzipEntry(out.toByteArray(), "word/document.xml")

            documentXml shouldContain "<w:sectPr"
            documentXml shouldContain "<w:tblW w:w=\"5000\" w:type=\"pct\""
        }
    })

private fun minimalPng(): ByteArray {
    val resource = DocxGeneratorTest::class.java.classLoader.getResourceAsStream("fixtures/diagram/minimal.png")
    require(resource != null) { "Place a minimal valid PNG at src/test/resources/fixtures/diagram/minimal.png" }
    return resource.readBytes()
}

private fun unzipEntry(
    archiveBytes: ByteArray,
    entryName: String,
): String =
    ZipInputStream(ByteArrayInputStream(archiveBytes)).use { zip ->
        generateSequence { zip.nextEntry }
            .firstOrNull { it.name == entryName }
            ?.let { zip.readBytes().toString(Charsets.UTF_8) }
            ?: error("Missing zip entry: $entryName")
    }
