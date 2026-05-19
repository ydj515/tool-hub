package com.toolhub.classdiagramgenerator.render

import com.toolhub.classdiagramgenerator.domain.AccessModifier
import com.toolhub.classdiagramgenerator.domain.AttributeInfo
import com.toolhub.classdiagramgenerator.domain.ClassInfo
import com.toolhub.classdiagramgenerator.domain.Layer
import com.toolhub.classdiagramgenerator.domain.Module
import com.toolhub.classdiagramgenerator.domain.OperationInfo
import com.toolhub.classdiagramgenerator.domain.OutputLanguage
import com.toolhub.classdiagramgenerator.domain.Program
import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.collections.shouldHaveAtLeastSize
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
            gen.render(program, program.modules[0], out)
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
    })
