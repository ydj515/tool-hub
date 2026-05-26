package com.toolhub.classdiagramgenerator.analyzer

import com.toolhub.classdiagramgenerator.domain.AccessModifier
import io.kotest.assertions.throwables.shouldThrow
import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.collections.shouldContain
import io.kotest.matchers.shouldBe
import java.nio.charset.StandardCharsets
import java.nio.file.Files
import kotlin.io.path.Path
import kotlin.io.path.writeText

class KotlinSourceAnalyzerTest :
    StringSpec({
        val analyzer = KotlinSourceAnalyzer()

        "parses data class interface enum object and companion object" {
            val src =
                """
                package com.demo

                import java.time.Instant
                import kotlin.collections.List

                /** 사용자 계약. 상세 문서 */
                interface UserContract : BaseContract {
                    /** 처리한다. 추가 설명 */
                    fun handle()
                }

                /** 사용자 상태. */
                enum class UserStatus {
                    ACTIVE,
                    INACTIVE,
                }

                /** 설정 싱글턴. 자세한 설명 */
                object Config {
                    val region: String = "kr"
                }

                /** 사용자 모델. 상세 설명 */
                data class User(
                    /** 식별자 */
                    val id: Long,
                    var name: String,
                ) : BaseEntity(), UserContract {
                    val createdAt: Instant = Instant.now()

                    /** 이름을 바꾼다. */
                    fun rename(newName: String) {}

                    companion object {
                        const val DEFAULT_NAME: String = "guest"
                    }
                }
                """.trimIndent()
            val path = Files.createTempFile("KotlinTypes", ".kt").also { it.writeText(src) }

            val parsed = analyzer.parseFile(path)
            val names = parsed.types.map { it.name }

            names shouldContain "User"
            names shouldContain "UserContract"
            names shouldContain "UserStatus"
            names shouldContain "Config"
            names shouldContain "Companion"

            val user = parsed.types.first { it.name == "User" }
            user.packagePath shouldBe "com.demo"
            user.description shouldBe "사용자 모델."
            user.attributes.map { it.name } shouldContain "id"
            user.attributes.map { it.name } shouldContain "name"
            user.attributes.map { it.name } shouldContain "createdAt"
            user.attributes.first { it.name == "id" }.accessModifier shouldBe AccessModifier.PUBLIC
            user.operations.map { it.name } shouldContain "rename"
            user.extendsNames shouldBe listOf("BaseEntity")
            user.implementsNames shouldBe listOf("UserContract")
            user.imports shouldBe listOf("java.time.Instant", "kotlin.collections.List")

            val contract = parsed.types.first { it.name == "UserContract" }
            contract.extendsNames shouldBe listOf("BaseContract")
            contract.implementsNames shouldBe emptyList()

            val companion = parsed.types.first { it.name == "Companion" }
            companion.attributes.map { it.name } shouldContain "DEFAULT_NAME"
        }

        "parses sealed and nested inner classes" {
            val src =
                """
                package com.demo.shape

                /** 도형 루트. 더 많은 설명 */
                sealed class Shape {
                    class Point : Shape()

                    inner class Editor {
                        internal val version: Int = 1
                    }
                }
                """.trimIndent()
            val path = Files.createTempFile("Shape", ".kt").also { it.writeText(src) }

            val parsed = analyzer.parseFile(path)
            parsed.types.map { it.name } shouldBe listOf("Shape", "Point", "Editor")

            val shape = parsed.types.first { it.name == "Shape" }
            shape.description shouldBe "도형 루트."

            val point = parsed.types.first { it.name == "Point" }
            point.extendsNames shouldBe listOf("Shape")

            val editor = parsed.types.first { it.name == "Editor" }
            editor.attributes.single().name shouldBe "version"
            editor.attributes.single().accessModifier shouldBe AccessModifier.DEFAULT
        }

        "extracts kdoc first sentence" {
            val src =
                """
                package com.demo

                /** 첫 문장. 두 번째 문장 */
                class DocSample
                """.trimIndent()
            val path = Files.createTempFile("DocSample", ".kt").also { it.writeText(src) }

            val parsed = analyzer.parseFile(path).types.single()
            parsed.description shouldBe "첫 문장."
        }

        "class with only external interfaces has empty extends and filled implements" {
            val src =
                """
                package com.demo

                class Worker : Runnable, AutoCloseable {
                    override fun run() {}
                    override fun close() {}
                }
                """.trimIndent()
            val path = Files.createTempFile("Worker", ".kt").also { it.writeText(src) }

            val parsed = analyzer.parseFile(path).types.single()
            parsed.extendsNames shouldBe emptyList()
            parsed.implementsNames shouldBe listOf("Runnable", "AutoCloseable")
        }

        "collects warning when kotlin source has parse error" {
            val src =
                """
                package com.demo

                class Broken {
                    fun x( {
                }
                """.trimIndent()
            val path = Files.createTempFile("Broken", ".kt").also { it.writeText(src) }

            val parsed = analyzer.parseFile(path)
            parsed.warnings.single().code shouldBe "KOTLIN_PARSE_PARTIAL"
        }

        "supports only kt extension" {
            analyzer.supports(Path("A.kt")) shouldBe true
            analyzer.supports(Path("A.java")) shouldBe false
            analyzer.supports(Path("/")) shouldBe false
        }

        "throws explicit exception when parse is called after destroy" {
            val src = "class ClosedAnalyzerSample"
            val path = Files.createTempFile("ClosedAnalyzerSample", ".kt").also { it.writeText(src) }
            val instance = KotlinSourceAnalyzer()

            instance.destroy()

            val error = shouldThrow<IllegalStateException> { instance.parseFile(path) }
            error.message shouldBe "KotlinSourceAnalyzer is already closed"
        }

        "parses UTF-16BE encoded kotlin source with fallback charset" {
            val src =
                """
                package com.demo.legacy
                class LegacyKotlinService
                """.trimIndent()
            val path = Files.createTempFile("LegacyKotlinService", ".kt")
            Files.write(path, src.toByteArray(StandardCharsets.UTF_16BE))

            val parsed = analyzer.parseFile(path)

            parsed.types.single().name shouldBe "LegacyKotlinService"
            parsed.types.single().packagePath shouldBe "com.demo.legacy"
            parsed.warnings.map { it.code } shouldContain "SOURCE_ENCODING_FALLBACK"
            parsed.warnings.first { it.code == "SOURCE_ENCODING_FALLBACK" }.context["charset"] shouldBe "UTF-16BE"
            parsed.warnings.first { it.code == "SOURCE_ENCODING_FALLBACK" }.context["path"] shouldBe path.fileName.toString()
        }

        "keeps qualified super type names for extends and interface extends" {
            val classSrc =
                """
                package com.demo

                class Outer {
                    open class Parent
                    interface Contract
                }

                class Child : Outer.Parent()
                """.trimIndent()
            val classPath = Files.createTempFile("QualifiedClass", ".kt").also { it.writeText(classSrc) }
            val classParsed = analyzer.parseFile(classPath).types.first { it.name == "Child" }
            classParsed.extendsNames shouldBe listOf("Outer.Parent")
            classParsed.implementsNames shouldBe emptyList()

            val interfaceSrc =
                """
                package com.demo

                class Outer {
                    interface Contract
                }

                interface ChildContract : Outer.Contract
                """.trimIndent()
            val interfacePath = Files.createTempFile("QualifiedInterface", ".kt").also { it.writeText(interfaceSrc) }
            val interfaceParsed = analyzer.parseFile(interfacePath).types.first { it.name == "ChildContract" }
            interfaceParsed.extendsNames shouldBe listOf("Outer.Contract")
            interfaceParsed.implementsNames shouldBe emptyList()
        }
    })
