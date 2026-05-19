package com.toolhub.classdiagramgenerator.render.diagram

import com.toolhub.classdiagramgenerator.domain.RelationKind
import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.string.shouldContain

class MermaidRendererTest :
    StringSpec({
        val renderer = MermaidRenderer()

        "render produces classDiagram body with stereotype, external dashed style, extends arrow" {
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
                )
            val output = renderer.render(spec)
            output shouldContain "classDiagram"
            output shouldContain "«Service»"
            output shouldContain "CLS-0001"
            output shouldContain "UserService"
            output shouldContain "style EXT_abcdef stroke-dasharray"
            output shouldContain "CLS_0001 --|> EXT_abcdef"
        }
    })
