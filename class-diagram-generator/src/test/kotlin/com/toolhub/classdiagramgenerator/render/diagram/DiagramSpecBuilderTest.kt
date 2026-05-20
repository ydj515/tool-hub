package com.toolhub.classdiagramgenerator.render.diagram

import com.toolhub.classdiagramgenerator.domain.AttributeInfo
import com.toolhub.classdiagramgenerator.domain.ClassInfo
import com.toolhub.classdiagramgenerator.domain.Layer
import com.toolhub.classdiagramgenerator.domain.Module
import com.toolhub.classdiagramgenerator.domain.Relation
import com.toolhub.classdiagramgenerator.domain.RelationKind
import com.toolhub.classdiagramgenerator.domain.TypeRef
import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.collections.shouldContain
import io.kotest.matchers.collections.shouldHaveSize
import io.kotest.matchers.shouldBe

class DiagramSpecBuilderTest :
    StringSpec({
        val builder = DiagramSpecBuilder()

        "layer diagram contains all classes in the layer plus external parents" {
            val module =
                Module(
                    name = "core",
                    classes =
                        listOf(
                            cls("CLS-0001", "UserController", Layer.CONTROLLER),
                            cls("CLS-0002", "AdminController", Layer.CONTROLLER),
                            cls("CLS-0003", "UserService", Layer.SERVICE),
                        ),
                    relations =
                        listOf(
                            Relation("CLS-0001", TypeRef("BaseController", "x.BaseController", true), RelationKind.EXTENDS),
                        ),
                )
            val specs = builder.build(module)
            val layerCtrl = specs.single { it.scope == DiagramScope.LAYER && it.key == "layer-controller" }
            layerCtrl.nodes.map { it.displayName } shouldContain "UserController"
            layerCtrl.nodes.map { it.displayName } shouldContain "AdminController"
            layerCtrl.nodes.map { it.displayName } shouldContain "BaseController"
            layerCtrl.nodes.single { it.external }.external shouldBe true
        }

        "layer diagram includes internal targets from other layers" {
            val module =
                Module(
                    name = "core",
                    classes =
                        listOf(
                            cls("CLS-0001", "UserController", Layer.CONTROLLER),
                            cls("CLS-0009", "BaseHandler", Layer.ETC),
                        ),
                    relations =
                        listOf(
                            Relation("CLS-0001", TypeRef("BaseHandler", "com.demo.common.BaseHandler", false), RelationKind.EXTENDS),
                        ),
                )
            val layerCtrl = builder.build(module).single { it.scope == DiagramScope.LAYER && it.key == "layer-controller" }
            layerCtrl.nodes.map { it.id } shouldContain "CLS_0009"
            layerCtrl.nodes.single { it.id == "CLS_0009" }.external shouldBe false
            layerCtrl.edges.single().toId shouldBe "CLS_0009"
        }

        "class diagram contains the class plus direct parents only" {
            val module =
                Module(
                    name = "core",
                    classes = listOf(cls("CLS-0001", "UserService", Layer.SERVICE), cls("CLS-0002", "BaseService", Layer.SERVICE)),
                    relations =
                        listOf(
                            Relation("CLS-0001", TypeRef("BaseService", "com.BaseService", false), RelationKind.EXTENDS),
                        ),
                )
            val spec = builder.build(module).single { it.scope == DiagramScope.CLASS && it.key == "class-CLS-0001" }
            spec.nodes.map { it.displayName } shouldHaveSize 2
            spec.edges.single().kind shouldBe RelationKind.EXTENDS
        }

        "isolated class with no parents is skipped" {
            val module = Module(name = "core", classes = listOf(cls("CLS-0001", "Lone", Layer.UTIL)), relations = emptyList())
            val specs = builder.build(module)
            specs.any { it.scope == DiagramScope.CLASS } shouldBe false
        }

        "empty layer skipped" {
            val module = Module(name = "core", classes = listOf(cls("CLS-0001", "Foo", Layer.SERVICE)), relations = emptyList())
            val specs = builder.build(module)
            specs.any { it.scope == DiagramScope.LAYER && it.key == "layer-controller" } shouldBe false
        }

        "unresolved internal target uses a consistent external node id" {
            val module =
                Module(
                    name = "core",
                    classes = listOf(cls("CLS-0001", "UserService", Layer.SERVICE)),
                    relations =
                        listOf(
                            Relation("CLS-0001", TypeRef("BaseService", "com.missing.BaseService", false), RelationKind.EXTENDS),
                        ),
                )

            val spec = builder.build(module).single { it.scope == DiagramScope.CLASS && it.key == "class-CLS-0001" }
            val externalNode = spec.nodes.single { it.external }

            spec.edges.single().toId shouldBe externalNode.id
        }

        "layer diagram includes an external fallback node for unresolved internal targets" {
            val module =
                Module(
                    name = "core",
                    classes = listOf(cls("CLS-0001", "UserService", Layer.SERVICE)),
                    relations =
                        listOf(
                            Relation("CLS-0001", TypeRef("BaseService", "com.missing.BaseService", false), RelationKind.EXTENDS),
                        ),
                )

            val spec = builder.build(module).single { it.scope == DiagramScope.LAYER && it.key == "layer-service" }
            val externalNode = spec.nodes.single { it.external }

            spec.edges.single().toId shouldBe externalNode.id
        }

        "ambiguous internal simple-name fallback does not bind to an arbitrary class" {
            val module =
                Module(
                    name = "core",
                    classes =
                        listOf(
                            cls("CLS-0001", "Caller", Layer.SERVICE),
                            cls("CLS-0002", "Helper", Layer.SERVICE, "com.demo.a"),
                            cls("CLS-0003", "Helper", Layer.MODEL, "com.demo.b"),
                        ),
                    relations =
                        listOf(
                            Relation("CLS-0001", TypeRef("Helper", null, false), RelationKind.EXTENDS),
                        ),
                )

            val spec = builder.build(module).single { it.scope == DiagramScope.CLASS && it.key == "class-CLS-0001" }

            spec.nodes.single { it.external }.displayName shouldBe "Helper"
            spec.edges.single().toId shouldBe spec.nodes.single { it.external }.id
        }
    })

private fun cls(
    id: String,
    name: String,
    layer: Layer,
    pkg: String = "com.demo",
) = ClassInfo(
    id = id,
    name = name,
    layer = layer,
    description = "",
    packagePath = pkg,
    attributes = emptyList<AttributeInfo>(),
    operations = emptyList(),
)
