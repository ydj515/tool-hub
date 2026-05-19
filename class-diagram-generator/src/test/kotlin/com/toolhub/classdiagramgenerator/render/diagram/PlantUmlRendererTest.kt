package com.toolhub.classdiagramgenerator.render.diagram

import com.toolhub.classdiagramgenerator.domain.RelationKind
import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.booleans.shouldBeTrue
import io.kotest.matchers.string.shouldContain

class PlantUmlRendererTest :
    StringSpec({
        val renderer = PlantUmlRenderer()

        val spec =
            DiagramSpec(
                scope = DiagramScope.CLASS,
                key = "class-CLS-0001",
                title = "CLS-0001 UserService",
                nodes =
                    listOf(
                        DiagramNode("CLS_0001", "CLS-0001", "Service", "UserService", false),
                        DiagramNode("EXT_abcdef", null, null, "BaseService", true),
                    ),
                edges = listOf(DiagramEdge("CLS_0001", "EXT_abcdef", RelationKind.EXTENDS)),
                classId = "CLS-0001",
            )

        "buildSource produces PlantUML text with stereotype, external dashed style, extends arrow" {
            val src = renderer.buildSource(spec)
            src shouldContain "@startuml"
            src shouldContain "<<Service>>"
            src shouldContain "CLS-0001"
            src shouldContain "UserService"
            src shouldContain "<<external>>"
            src shouldContain "borderStyle dashed"
            src shouldContain "CLS_0001 --|> EXT_abcdef"
        }

        "render produces a PNG starting with the PNG magic header" {
            val bytes = renderer.render(spec)
            (bytes.size > PNG_HEADER.size).shouldBeTrue()
            PNG_HEADER.indices.all { bytes[it] == PNG_HEADER[it] }.shouldBeTrue()
        }
    })

private val PNG_HEADER = byteArrayOf(0x89.toByte(), 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A)
