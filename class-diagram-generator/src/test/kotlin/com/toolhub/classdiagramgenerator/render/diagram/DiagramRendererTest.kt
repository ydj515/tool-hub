package com.toolhub.classdiagramgenerator.render.diagram

import com.toolhub.classdiagramgenerator.config.AppProperties
import com.toolhub.classdiagramgenerator.domain.AttributeInfo
import com.toolhub.classdiagramgenerator.domain.ClassInfo
import com.toolhub.classdiagramgenerator.domain.Layer
import com.toolhub.classdiagramgenerator.domain.Module
import com.toolhub.classdiagramgenerator.domain.OutputLanguage
import com.toolhub.classdiagramgenerator.domain.Program
import com.toolhub.classdiagramgenerator.domain.Relation
import com.toolhub.classdiagramgenerator.domain.RelationKind
import com.toolhub.classdiagramgenerator.domain.TypeRef
import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.booleans.shouldBeTrue
import io.kotest.matchers.shouldBe
import java.nio.file.Files
import java.nio.file.Path
import java.time.ZonedDateTime

class DiagramRendererTest :
    StringSpec({
        val props = defaultProps()
        val renderer = DiagramRenderer(DiagramSpecBuilder(), PlantUmlRenderer(), props)

        "EMPTY index when includeDiagrams=false" {
            val tmp = Files.createTempDirectory("diagram-test-")
            val idx = renderer.render(sampleProgram(), tmp, includeDiagrams = false)
            (idx === DiagramArtifactIndex.EMPTY).shouldBeTrue()
            Files.list(tmp).use { it.count() shouldBe 0L }
        }

        "renders PNGs to disk per module when includeDiagrams=true" {
            val tmp = Files.createTempDirectory("diagram-test-")
            val idx = renderer.render(sampleProgram(), tmp, includeDiagrams = true)
            val modulePath = tmp.resolve("core")
            Files.exists(modulePath).shouldBeTrue()
            (Files.list(modulePath).use { it.count() } > 0L).shouldBeTrue()
            idx.classDiagrams["core"]!!["CLS-0001"]!!.let { p ->
                Files.exists(p as Path).shouldBeTrue()
            }
        }
    })

private fun defaultProps(): AppProperties =
    AppProperties(
        workdir =
            java.nio.file.Paths
                .get(System.getProperty("java.io.tmpdir")),
        job = AppProperties.Job(),
        upload = AppProperties.Upload(),
        analysis = AppProperties.Analysis(),
        diagrams = AppProperties.Diagrams(),
    )

private fun sampleProgram(): Program =
    Program(
        name = "demo",
        version = "v1",
        language = OutputLanguage.KO,
        generatedAt = ZonedDateTime.now(),
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
                                description = "",
                                packagePath = "com.demo",
                                attributes = emptyList<AttributeInfo>(),
                                operations = emptyList(),
                            ),
                        ),
                    relations =
                        listOf(
                            Relation("CLS-0001", TypeRef("BaseService", "x.BaseService", true), RelationKind.EXTENDS),
                        ),
                ),
            ),
    )
