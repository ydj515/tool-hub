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
    })

private fun cls(
    id: String,
    name: String,
    layer: Layer,
) = ClassInfo(
    id = id,
    name = name,
    layer = layer,
    description = "",
    packagePath = "com.demo",
    attributes = emptyList<AttributeInfo>(),
    operations = emptyList(),
)
