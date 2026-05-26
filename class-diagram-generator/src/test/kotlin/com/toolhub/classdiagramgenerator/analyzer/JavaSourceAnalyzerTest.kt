package com.toolhub.classdiagramgenerator.analyzer

import com.toolhub.classdiagramgenerator.domain.AccessModifier
import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.shouldBe
import java.nio.charset.StandardCharsets
import java.nio.file.Files
import kotlin.io.path.Path
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
            val parsed = analyzer.parseFile(path).types.single()
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
            val parsed = analyzer.parseFile(path).types.single()
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
            val parsed = analyzer.parseFile(path).types.map { it.name }
            parsed shouldBe listOf("Outer", "Inner")
        }

        "parses record declarations" {
            val src =
                """
                package com.demo.model;
                /** 사용자 요약. */
                public record UserSummary(String name, int age) {}
                """.trimIndent()
            val path = Files.createTempFile("UserSummary", ".java").also { it.writeText(src) }
            val parsed = analyzer.parseFile(path).types.single()

            parsed.name shouldBe "UserSummary"
            parsed.packagePath shouldBe "com.demo.model"
            parsed.description shouldBe "사용자 요약."
        }

        "parses UTF-16BE encoded source with fallback charset" {
            val src =
                """
                package com.demo.legacy;
                public class LegacyService {}
                """.trimIndent()
            val path = Files.createTempFile("LegacyService", ".java")
            Files.write(path, src.toByteArray(StandardCharsets.UTF_16BE))

            val parsed = analyzer.parseFile(path)

            parsed.types.single().name shouldBe "LegacyService"
            parsed.types.single().packagePath shouldBe "com.demo.legacy"
            parsed.warnings.single().code shouldBe "SOURCE_ENCODING_FALLBACK"
            parsed.warnings.single().context["charset"] shouldBe "UTF-16BE"
            parsed.warnings.single().context["path"] shouldBe path.fileName.toString()
        }

        "extracts extends names" {
            val tmp = kotlin.io.path.createTempFile(suffix = ".java")
            tmp.toFile().writeText(
                """
                package com.demo;
                import com.demo.base.BaseService;
                public class UserService extends BaseService {}
                """.trimIndent(),
            )
            val parsed = JavaSourceAnalyzer().parseFile(tmp)
            parsed.types[0].extendsNames shouldBe listOf("BaseService")
        }

        "extracts implements names" {
            val tmp = kotlin.io.path.createTempFile(suffix = ".java")
            tmp.toFile().writeText(
                """
                package com.demo;
                import java.io.Serializable;
                public class User implements Serializable, Cloneable {}
                """.trimIndent(),
            )
            val parsed = JavaSourceAnalyzer().parseFile(tmp)
            parsed.types[0].implementsNames shouldBe listOf("Serializable", "Cloneable")
        }

        "extracts import statements" {
            val tmp = kotlin.io.path.createTempFile(suffix = ".java")
            tmp.toFile().writeText(
                """
                package com.demo;
                import com.demo.base.BaseService;
                import java.util.List;
                public class Svc {}
                """.trimIndent(),
            )
            val parsed = JavaSourceAnalyzer().parseFile(tmp)
            parsed.types[0].imports shouldBe listOf("com.demo.base.BaseService", "java.util.List")
        }

        "supports only java extension" {
            analyzer.supports(Path("A.java")) shouldBe true
            analyzer.supports(Path("A.kt")) shouldBe false
            analyzer.supports(Path("/")) shouldBe false
        }
    })
