package com.toolhub.classdiagramgenerator.input

import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.collections.shouldHaveSize
import io.kotest.matchers.shouldBe
import java.nio.file.Files
import kotlin.io.path.createDirectories
import kotlin.io.path.name
import kotlin.io.path.writeText

class ProjectDetectorTest :
    StringSpec({
        val detector = ProjectDetector()

        "detects single Gradle module" {
            val root = Files.createTempDirectory("proj-")
            root.resolve("build.gradle").writeText("// noop")
            val src = root.resolve("src/main/java/com/example")
            src.createDirectories()
            src.resolve("Hello.java").writeText("class Hello {}")
            val modules = detector.detect(root, fallbackName = "demo")
            modules shouldHaveSize 1
            modules[0].name shouldBe "demo"
            modules[0].sourceFiles shouldHaveSize 1
        }

        "detects multi-module Gradle project from settings.gradle" {
            val root = Files.createTempDirectory("proj-")
            root.resolve("settings.gradle").writeText(
                """
                rootProject.name = 'parent'
                include 'app'
                include 'core'
                """.trimIndent(),
            )
            listOf("app", "core").forEach { name ->
                val mod = root.resolve(name)
                mod.createDirectories()
                mod.resolve("build.gradle").writeText("// noop")
                val src = mod.resolve("src/main/java")
                src.createDirectories()
                src.resolve("X.java").writeText("class X {}")
            }
            val modules = detector.detect(root, fallbackName = "fb").map { it.name }.sorted()
            modules shouldBe listOf("app", "core")
        }

        "detects Maven module via pom.xml" {
            val root = Files.createTempDirectory("proj-")
            root.resolve("pom.xml").writeText(
                "<project><artifactId>my-service</artifactId></project>",
            )
            val src = root.resolve("src/main/java")
            src.createDirectories()
            src.resolve("M.java").writeText("class M {}")
            val modules = detector.detect(root, fallbackName = "fb")
            modules[0].name shouldBe "my-service"
        }

        "falls back to scanning all .java when no build file" {
            val root = Files.createTempDirectory("proj-")
            root.resolve("Loose.java").writeText("class Loose {}")
            val modules = detector.detect(root, fallbackName = "fb")
            modules shouldHaveSize 1
            modules[0].name shouldBe "fb"
            modules[0].sourceFiles shouldHaveSize 1
        }

        "fallback scan ignores macOS metadata files" {
            val root = Files.createTempDirectory("proj-")
            root.resolve(".DS_Store").writeText("metadata")
            root.resolve("Loose.java").writeText("class Loose {}")

            val metadataDir = root.resolve("__MACOSX/src/main/java")
            metadataDir.createDirectories()
            metadataDir.resolve("._Loose.java").writeText("not a java source")

            val modules = detector.detect(root, fallbackName = "fb")

            modules shouldHaveSize 1
            modules[0].sourceFiles.map { it.name } shouldBe listOf("Loose.java")
        }
    })
