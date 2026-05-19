package com.toolhub.classdiagramgenerator.analyzer

import com.toolhub.classdiagramgenerator.domain.ClassInfo
import com.toolhub.classdiagramgenerator.domain.Layer
import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.shouldBe

class ClassIdAssignerTest :
    StringSpec({
        val assigner = ClassIdAssigner()

        fun build(
            name: String,
            layer: Layer,
            pkg: String,
        ) = ClassInfo(
            id = "",
            name = name,
            layer = layer,
            description = "",
            packagePath = pkg,
            attributes = emptyList(),
            operations = emptyList(),
        )

        "sorts by layer order then package then name and pads to 4 digits" {
            val input =
                listOf(
                    build("ZService", Layer.SERVICE, "com.x.service"),
                    build("AController", Layer.CONTROLLER, "com.x.controller"),
                    build("BController", Layer.CONTROLLER, "com.x.controller"),
                    build("CModel", Layer.MODEL, "com.x.model"),
                )
            val ids = assigner.assign(input).map { it.id }
            ids shouldBe listOf("CLS-0001", "CLS-0002", "CLS-0003", "CLS-0004")
            val names = assigner.assign(input).map { it.name }
            names shouldBe listOf("AController", "BController", "ZService", "CModel")
        }

        "pads up to 5 digits when over 9999" {
            val many = (1..10_000).map { build("C$it", Layer.UTIL, "com.x.util") }
            val last = assigner.assign(many).last()
            last.id shouldBe "CLS-10000"
        }
    })
