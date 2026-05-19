package com.toolhub.classdiagramgenerator.analyzer

import com.toolhub.classdiagramgenerator.domain.AccessModifier
import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.shouldBe
import java.nio.file.Files
import kotlin.io.path.writeText

class JavaSourceAnalyzerTest :
    StringSpec({
        val analyzer = JavaSourceAnalyzer()

        "parses class with javadoc, field, method" {
            val src =
                """
                package com.demo.service;
                /** 사용자 서비스. 자세한 내용. */
                public class UserService {
                    /** 사용자 저장소 */
                    private UserRepository repo;
                    /** 사용자를 저장한다. */
                    public void save(User u) {}
                }
                """.trimIndent()
            val path = Files.createTempFile("UserService", ".java").also { it.writeText(src) }
            val parsed = analyzer.parseFile(path).single()
            parsed.name shouldBe "UserService"
            parsed.packagePath shouldBe "com.demo.service"
            parsed.description shouldBe "사용자 서비스."
            parsed.attributes shouldBe
                listOf(
                    ParsedAttribute("repo", "UserRepository", AccessModifier.PRIVATE, "사용자 저장소"),
                )
            parsed.operations shouldBe
                listOf(
                    ParsedOperation("save", "사용자를 저장한다."),
                )
        }

        "empty javadoc yields empty description" {
            val src = "package x; public class Bare { public Bare() {} }"
            val path = Files.createTempFile("Bare", ".java").also { it.writeText(src) }
            val parsed = analyzer.parseFile(path).single()
            parsed.description shouldBe ""
        }

        "extracts inner classes as separate entries" {
            val src =
                """
                package x;
                public class Outer {
                    public static class Inner {}
                }
                """.trimIndent()
            val path = Files.createTempFile("Outer", ".java").also { it.writeText(src) }
            val parsed = analyzer.parseFile(path).map { it.name }
            parsed shouldBe listOf("Outer", "Inner")
        }
    })
