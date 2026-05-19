package com.toolhub.classdiagramgenerator.analyzer

import com.github.javaparser.JavaParser
import com.github.javaparser.ParseProblemException
import com.github.javaparser.ParserConfiguration
import com.github.javaparser.ast.CompilationUnit
import com.github.javaparser.ast.Modifier
import com.github.javaparser.ast.body.TypeDeclaration
import com.github.javaparser.ast.nodeTypes.NodeWithModifiers
import com.github.javaparser.javadoc.Javadoc
import com.toolhub.classdiagramgenerator.domain.AccessModifier
import org.springframework.stereotype.Component
import java.nio.file.Path

data class ParsedAttribute(
    val name: String,
    val type: String,
    val accessModifier: AccessModifier,
    val description: String,
)

data class ParsedOperation(
    val name: String,
    val description: String,
)

data class ParsedType(
    val name: String,
    val packagePath: String,
    val description: String,
    val attributes: List<ParsedAttribute>,
    val operations: List<ParsedOperation>,
)

@Component
class JavaSourceAnalyzer {
    // record 등 최신 Java 문법을 안정적으로 지원하도록 툴체인과 같은 언어 레벨로 고정한다.
    private val parser =
        JavaParser(
            ParserConfiguration().setLanguageLevel(ParserConfiguration.LanguageLevel.JAVA_21),
        )

    fun parseFile(path: Path): List<ParsedType> {
        val unit = parseCompilationUnit(path)
        val pkg = unit.packageDeclaration.map { it.nameAsString }.orElse("")
        val result = mutableListOf<ParsedType>()
        unit.types.forEach { collect(it, pkg, result) }
        return result
    }

    private fun parseCompilationUnit(path: Path): CompilationUnit {
        val result = parser.parse(path)
        return result.result.orElseThrow { ParseProblemException(result.problems) }
    }

    private fun collect(
        type: TypeDeclaration<*>,
        pkg: String,
        out: MutableList<ParsedType>,
    ) {
        out.add(parseType(type, pkg))
        type.members.filterIsInstance<TypeDeclaration<*>>().forEach { collect(it, pkg, out) }
    }

    private fun parseType(
        type: TypeDeclaration<*>,
        pkg: String,
    ): ParsedType {
        val attributes =
            type.fields.flatMap { field ->
                field.variables.map { v ->
                    ParsedAttribute(
                        name = v.nameAsString,
                        type = field.elementType.asString(),
                        accessModifier = accessOf(field),
                        description = firstSentence(field.javadoc.orElse(null)),
                    )
                }
            }
        val operations =
            type.methods.map { m ->
                ParsedOperation(
                    name = m.nameAsString,
                    description = firstSentence(m.javadoc.orElse(null)),
                )
            }
        return ParsedType(
            name = type.nameAsString,
            packagePath = pkg,
            description = firstSentence(type.javadoc.orElse(null)),
            attributes = attributes,
            operations = operations,
        )
    }

    private fun accessOf(node: NodeWithModifiers<*>): AccessModifier =
        when {
            node.hasModifier(Modifier.Keyword.PUBLIC) -> AccessModifier.PUBLIC
            node.hasModifier(Modifier.Keyword.PRIVATE) -> AccessModifier.PRIVATE
            node.hasModifier(Modifier.Keyword.PROTECTED) -> AccessModifier.PROTECTED
            else -> AccessModifier.DEFAULT
        }

    private fun firstSentence(javadoc: Javadoc?): String {
        if (javadoc == null) return ""
        val raw = javadoc.description.toText()
        val cleaned =
            raw
                .replace(Regex("\\{@link\\s+([^}]+)\\}"), "$1")
                .replace(Regex("<[^>]+>"), "")
                .replace(Regex("\\s+"), " ")
                .trim()
        val dotIdx = cleaned.indexOf('.')
        return if (dotIdx >= 0) cleaned.substring(0, dotIdx + 1) else cleaned
    }
}
