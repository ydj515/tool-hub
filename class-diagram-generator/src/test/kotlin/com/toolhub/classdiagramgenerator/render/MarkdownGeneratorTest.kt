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
import com.toolhub.classdiagramgenerator.render.diagram.MermaidRenderer
import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.string.shouldContain
import java.io.ByteArrayOutputStream
import java.time.ZonedDateTime

class MarkdownGeneratorTest :
    StringSpec({
        val gen = MarkdownGenerator(MermaidRenderer())
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

        "ko renders korean labels" {
            val out = ByteArrayOutputStream()
            gen.render(program, program.modules[0], DiagramArtifactIndex.EMPTY, out)
            val text = out.toString(Charsets.UTF_8)
            text shouldContain "# 클래스 설계서(demo)"
            text shouldContain "| 클래스 ID | 클래스명 | 계층 | 설명 |"
            text shouldContain "CLS-0001"
        }

        "en renders english labels" {
            val out = ByteArrayOutputStream()
            gen.render(program.copy(language = OutputLanguage.EN), program.modules[0], DiagramArtifactIndex.EMPTY, out)
            val text = out.toString(Charsets.UTF_8)
            text shouldContain "# Class Design(demo)"
            text shouldContain "| Class ID | Class Name | Layer | Description |"
        }

        "md embeds mermaid code fences for layer and class scopes from specs" {
            val spec =
                com.toolhub.classdiagramgenerator.render.diagram.DiagramSpec(
                    scope = com.toolhub.classdiagramgenerator.render.diagram.DiagramScope.CLASS,
                    key = "class-CLS-0001",
                    title = "CLS-0001 UserService",
                    nodes =
                        listOf(
                            com.toolhub.classdiagramgenerator.render.diagram.DiagramNode(
                                "CLS_0001",
                                "CLS-0001",
                                "Service",
                                "UserService",
                                false,
                            ),
                        ),
                    edges = emptyList(),
                    classId = "CLS-0001",
                )
            val idx =
                com.toolhub.classdiagramgenerator.render.diagram.DiagramArtifactIndex(
                    layerDiagrams = emptyMap(),
                    classDiagrams = emptyMap(),
                    specs = mapOf("core" to mapOf("class-CLS-0001" to spec)),
                )
            val out = ByteArrayOutputStream()
            gen.render(program, program.modules[0], idx, out)
            val text = out.toString(Charsets.UTF_8)
            text shouldContain "```mermaid"
            text shouldContain "classDiagram"
            text shouldContain "CLS-0001"
        }
    })
