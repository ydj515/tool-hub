package com.toolhub.classdiagramgenerator.render.diagram

import com.toolhub.classdiagramgenerator.domain.RelationKind
import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.string.shouldContain
import io.kotest.matchers.string.shouldNotContain

class MermaidRendererTest :
    StringSpec({
        val renderer = MermaidRenderer()

        "render produces preview-friendly classDiagram body without class label alias syntax" {
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
            output shouldContain "class UserService"
            output shouldContain "<<Service>> UserService"
            output shouldContain "UserService : CLS-0001"
            output shouldContain "CLS-0001"
            output shouldContain "UserService"
            output shouldContain "class BaseService"
            output shouldContain "style BaseService stroke-dasharray"
            output shouldContain "UserService --|> BaseService"
            output shouldNotContain "[\""
        }
    })
