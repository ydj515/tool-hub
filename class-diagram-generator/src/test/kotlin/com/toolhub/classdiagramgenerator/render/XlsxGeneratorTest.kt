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
import io.kotest.matchers.ints.shouldBeGreaterThanOrEqual
import io.kotest.matchers.shouldBe
import io.kotest.matchers.shouldNotBe
import io.kotest.matchers.string.shouldContain
import org.apache.poi.xssf.usermodel.XSSFWorkbook
import java.io.ByteArrayInputStream
import java.io.ByteArrayOutputStream
import java.time.ZonedDateTime
import java.util.zip.ZipInputStream

class XlsxGeneratorTest :
    StringSpec({
        val gen = XlsxGenerator()
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

        "produces 3 sheets with localized names (ko)" {
            val out = ByteArrayOutputStream()
            gen.render(program, program.modules[0], DiagramArtifactIndex.EMPTY, out)
            XSSFWorkbook(ByteArrayInputStream(out.toByteArray())).use { wb ->
                wb.numberOfSheets shouldBe 3
                wb.getSheetAt(0).sheetName shouldBe "표지"
                wb.getSheetAt(1).sheetName shouldBe "클래스 리스트"
                wb.getSheetAt(2).sheetName shouldBe "클래스 설계서"
                wb
                    .getSheet("클래스 리스트")
                    .getRow(0)
                    .getCell(0)
                    .stringCellValue shouldBe "클래스 ID"
            }
        }

        "english sheet names" {
            val out = ByteArrayOutputStream()
            gen.render(program.copy(language = OutputLanguage.EN), program.modules[0], DiagramArtifactIndex.EMPTY, out)
            XSSFWorkbook(ByteArrayInputStream(out.toByteArray())).use { wb ->
                wb.getSheetAt(0).sheetName shouldBe "Cover"
                wb.getSheetAt(1).sheetName shouldBe "Class List"
                wb.getSheetAt(2).sheetName shouldBe "Class Design"
            }
        }

        "xlsx adds layerDiagrams sheet and embeds class diagram pictures when index has paths" {
            val tmp = kotlin.io.path.createTempFile(prefix = "layer", suffix = ".png")
            tmp.toFile().writeBytes(minimalPngBytes() + byteArrayOf(0x00))
            val classTmp = kotlin.io.path.createTempFile(prefix = "class", suffix = ".png")
            classTmp.toFile().writeBytes(minimalPngBytes() + byteArrayOf(0x01))
            val idx =
                com.toolhub.classdiagramgenerator.render.diagram.DiagramArtifactIndex(
                    layerDiagrams =
                        mapOf("core" to mapOf(com.toolhub.classdiagramgenerator.domain.Layer.SERVICE to tmp)),
                    classDiagrams = mapOf("core" to mapOf("CLS-0001" to classTmp)),
                    specs = emptyMap(),
                )
            val out = ByteArrayOutputStream()
            gen.render(program, program.modules[0], idx, out)
            XSSFWorkbook(ByteArrayInputStream(out.toByteArray())).use { wb ->
                wb.getSheet("계층 다이어그램") shouldNotBe null
                wb.allPictures.size shouldBeGreaterThanOrEqual 2
            }

            val layerDrawingXml = unzipEntry(out.toByteArray(), "xl/drawings/drawing1.xml")
            val classDrawingXml = unzipEntry(out.toByteArray(), "xl/drawings/drawing2.xml")
            val classSheetXml = unzipEntry(out.toByteArray(), "xl/worksheets/sheet4.xml")

            layerDrawingXml.contains("cx=\"0\" cy=\"0\"") shouldBe false
            classDrawingXml.contains("cx=\"0\" cy=\"0\"") shouldBe false
            classSheetXml shouldContain "<mergeCells"
        }
    })

private fun minimalPngBytes(): ByteArray =
    XlsxGeneratorTest::class.java.classLoader
        .getResourceAsStream("fixtures/diagram/minimal.png")!!
        .readBytes()

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
