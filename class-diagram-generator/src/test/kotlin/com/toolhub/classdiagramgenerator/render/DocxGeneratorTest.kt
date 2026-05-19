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
import io.kotest.matchers.collections.shouldHaveAtLeastSize
import io.kotest.matchers.shouldBe
import io.kotest.matchers.string.shouldContain
import org.apache.poi.xwpf.usermodel.XWPFDocument
import java.io.ByteArrayInputStream
import java.io.ByteArrayOutputStream
import java.time.ZonedDateTime

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

        "docx contains korean labels in cover and tables" {
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
                doc.tables shouldHaveAtLeastSize 3
            }
        }

        "docx embeds layer diagram PNGs and class diagram PNGs when index has paths" {
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
            }
        }
    })

private fun minimalPng(): ByteArray {
    val resource = DocxGeneratorTest::class.java.classLoader.getResourceAsStream("fixtures/diagram/minimal.png")
    require(resource != null) { "Place a minimal valid PNG at src/test/resources/fixtures/diagram/minimal.png" }
    return resource.readBytes()
}
