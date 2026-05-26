package com.toolhub.classdiagramgenerator.analyzer

import com.toolhub.classdiagramgenerator.domain.AccessModifier
import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.collections.shouldContain
import io.kotest.matchers.shouldBe
import java.nio.file.Files
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
    })
