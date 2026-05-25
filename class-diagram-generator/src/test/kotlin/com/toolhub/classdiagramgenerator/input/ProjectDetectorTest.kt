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

        "detects all modules from Kotlin DSL include list" {
            val root = Files.createTempDirectory("proj-kts-")
            root.resolve("settings.gradle.kts").writeText(
                """
                rootProject.name = "parent"
                include("app", "core")
                """.trimIndent(),
            )
            listOf("app", "core").forEach { name ->
                val mod = root.resolve(name)
                mod.createDirectories()
                mod.resolve("build.gradle.kts").writeText("// noop")
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

        "detects Maven multi-module project from parent pom modules" {
            val root = Files.createTempDirectory("maven-multi-")
            root.resolve("pom.xml").writeText(
                """
                <project>
                  <modelVersion>4.0.0</modelVersion>
                  <groupId>com.example</groupId>
                  <artifactId>catalog-parent</artifactId>
                  <packaging>pom</packaging>
                  <modules>
                    <module>api</module>
                    <module>service</module>
                    <module>support</module>
                  </modules>
                </project>
                """.trimIndent(),
            )
            listOf("api", "service", "support").forEach { name ->
                val src = root.resolve("$name/src/main/java")
                src.createDirectories()
                root.resolve("$name/pom.xml").writeText("<project/>")
                src.resolve("${name.replaceFirstChar(Char::uppercase)}Type.java").writeText("class X {}")
            }

            val modules = detector.detect(root, fallbackName = "fb").map { it.name }.sorted()

            modules shouldBe listOf("api", "service", "support")
        }

        "detects Maven multi-module project inside a single wrapper directory" {
            val root = Files.createTempDirectory("maven-wrapper-")
            val wrappedRoot = root.resolve("maven-multi-jdk17")
            wrappedRoot.createDirectories()
            wrappedRoot.resolve("pom.xml").writeText(
                """
                <project>
                  <modelVersion>4.0.0</modelVersion>
                  <groupId>com.example</groupId>
                  <artifactId>catalog-parent</artifactId>
                  <packaging>pom</packaging>
                  <modules>
                    <module>api</module>
                    <module>service</module>
                    <module>support</module>
                  </modules>
                </project>
                """.trimIndent(),
            )
            listOf("api", "service", "support").forEach { name ->
                val src = wrappedRoot.resolve("$name/src/main/java")
                src.createDirectories()
                wrappedRoot.resolve("$name/pom.xml").writeText("<project/>")
                src.resolve("${name.replaceFirstChar(Char::uppercase)}Type.java").writeText("class X {}")
            }

            val modules = detector.detect(root, fallbackName = "fb").map { it.name }.sorted()

            modules shouldBe listOf("api", "service", "support")
        }

        "ignores root java sources when Gradle multi-module declarations exist" {
            val root = Files.createTempDirectory("gradle-multi-root-")
            root.resolve("settings.gradle.kts").writeText("""include("api", "service")""")
            root.resolve("src/main/java").createDirectories()
            root.resolve("src/main/java/RootType.java").writeText("class RootType {}")
            listOf("api", "service").forEach { name ->
                val src = root.resolve("$name/src/main/java")
                src.createDirectories()
                root.resolve("$name/build.gradle.kts").writeText("// noop")
                src.resolve("${name.replaceFirstChar(Char::uppercase)}Type.java").writeText("class X {}")
            }

            val modules = detector.detect(root, fallbackName = "fb")

            modules.map { it.name }.sorted() shouldBe listOf("api", "service")
            modules.flatMap { it.sourceFiles }.none { it.name == "RootType.java" } shouldBe true
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
