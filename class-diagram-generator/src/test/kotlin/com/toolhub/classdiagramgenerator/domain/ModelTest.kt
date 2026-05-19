package com.toolhub.classdiagramgenerator.domain

import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.shouldBe
import java.time.ZonedDateTime

class ModelTest :
    StringSpec({
        "Program holds modules and language" {
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
                                            description = "사용자 서비스",
                                            packagePath = "com.demo.service",
                                            attributes = emptyList(),
                                            operations = emptyList(),
                                        ),
                                    ),
                            ),
                        ),
                )
            program.modules[0].classes[0].id shouldBe "CLS-0001"
            program.language shouldBe OutputLanguage.KO
        }

        "OutputLanguage.parse accepts case insensitive code" {
            OutputLanguage.parse("ko") shouldBe OutputLanguage.KO
            OutputLanguage.parse("EN") shouldBe OutputLanguage.EN
        }
    })
