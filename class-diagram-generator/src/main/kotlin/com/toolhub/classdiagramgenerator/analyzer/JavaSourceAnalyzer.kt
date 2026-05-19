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
import com.toolhub.classdiagramgenerator.domain.Warning
import org.springframework.stereotype.Component
import java.nio.charset.Charset
import java.nio.charset.StandardCharsets
import java.nio.file.Files
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
    val extendsNames: List<String> = emptyList(),
    val implementsNames: List<String> = emptyList(),
    val imports: List<String> = emptyList(),
)

data class ParsedSource(
    val types: List<ParsedType>,
    val warnings: List<Warning> = emptyList(),
)

@Component
class JavaSourceAnalyzer {
    // record 등 최신 Java 문법을 안정적으로 지원하도록 툴체인과 같은 언어 레벨로 고정한다.
    private val parser =
        JavaParser(
            ParserConfiguration().setLanguageLevel(ParserConfiguration.LanguageLevel.JAVA_21),
        )

    fun parseFile(path: Path): ParsedSource {
        val parsed = parseCompilationUnit(path)
        val unit = parsed.unit
        val pkg = unit.packageDeclaration.map { it.nameAsString }.orElse("")
        val imports = unit.imports.map { it.nameAsString }
        val result = mutableListOf<ParsedType>()
        unit.types.forEach { collect(it, pkg, imports, result) }
        return ParsedSource(types = result, warnings = parsed.warnings)
    }

    private fun parseCompilationUnit(path: Path): ParsedCompilationUnit {
        val bytes = Files.readAllBytes(path)
        val candidates = candidateCharsets(bytes)
        var firstFailure: ParseProblemException? = null

        candidates.forEachIndexed { index, charset ->
            val result = parser.parse(decode(bytes, charset))
            val unit = result.result.orElse(null)
            if (result.isSuccessful && unit != null) {
                val warnings =
                    if (index == 0) {
                        emptyList()
                    } else {
                        listOf(
                            Warning(
                                code = WARNING_SOURCE_ENCODING_FALLBACK,
                                message = "Parsed source with fallback charset ${charset.name()}",
                                context = mapOf("path" to path.toString(), "charset" to charset.name()),
                            ),
                        )
                    }
                return ParsedCompilationUnit(unit = unit, warnings = warnings)
            }
            if (firstFailure == null) {
                firstFailure = ParseProblemException(result.problems)
            }
        }

        throw checkNotNull(firstFailure)
    }

    private fun collect(
        type: TypeDeclaration<*>,
        pkg: String,
        imports: List<String>,
        out: MutableList<ParsedType>,
    ) {
        out.add(parseType(type, pkg, imports))
        type.members.filterIsInstance<TypeDeclaration<*>>().forEach { collect(it, pkg, imports, out) }
    }

    private fun parseType(
        type: TypeDeclaration<*>,
        pkg: String,
        imports: List<String>,
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
        val (extendsNames, implementsNames) = parentNames(type)
        return ParsedType(
            name = type.nameAsString,
            packagePath = pkg,
            description = firstSentence(type.javadoc.orElse(null)),
            attributes = attributes,
            operations = operations,
            extendsNames = extendsNames,
            implementsNames = implementsNames,
            imports = imports,
        )
    }

    private fun parentNames(type: TypeDeclaration<*>): Pair<List<String>, List<String>> {
        val td = type as? com.github.javaparser.ast.body.ClassOrInterfaceDeclaration
            ?: return emptyList<String>() to emptyList()
        val ext = td.extendedTypes.map { it.nameAsString }
        val impl = td.implementedTypes.map { it.nameAsString }
        return ext to impl
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

    private data class ParsedCompilationUnit(
        val unit: CompilationUnit,
        val warnings: List<Warning>,
    )

    companion object {
        private const val WARNING_SOURCE_ENCODING_FALLBACK = "SOURCE_ENCODING_FALLBACK"
    }
}

private fun candidateCharsets(bytes: ByteArray): List<Charset> {
    val candidates = linkedSetOf(StandardCharsets.UTF_8)
    val platformDefault = Charset.defaultCharset()
    if (platformDefault != StandardCharsets.UTF_8) {
        candidates += platformDefault
    }

    when (detectUtf16Hint(bytes)) {
        Utf16Hint.BIG_ENDIAN -> {
            candidates += StandardCharsets.UTF_16BE
            candidates += StandardCharsets.UTF_16
        }

        Utf16Hint.LITTLE_ENDIAN -> {
            candidates += StandardCharsets.UTF_16LE
            candidates += StandardCharsets.UTF_16
        }

        Utf16Hint.UNKNOWN -> {
            candidates += StandardCharsets.UTF_16
            candidates += StandardCharsets.UTF_16BE
            candidates += StandardCharsets.UTF_16LE
        }

        Utf16Hint.NONE -> Unit
    }
    return candidates.toList()
}

private fun detectUtf16Hint(bytes: ByteArray): Utf16Hint {
    detectBomHint(bytes)?.let { return it }
    val (evenZeros, oddZeros) = countZeroBytes(bytes)
    return zeroPatternHint(evenZeros, oddZeros)
}

private fun decode(
    bytes: ByteArray,
    charset: Charset,
): String = String(bytes, charset).removePrefix(UTF8_BOM)

private fun detectBomHint(bytes: ByteArray): Utf16Hint? {
    if (bytes.size < UTF16_BOM_SIZE) return null
    return when {
        bytes[0] == 0xFE.toByte() && bytes[1] == 0xFF.toByte() -> Utf16Hint.BIG_ENDIAN
        bytes[0] == 0xFF.toByte() && bytes[1] == 0xFE.toByte() -> Utf16Hint.LITTLE_ENDIAN
        else -> null
    }
}

private fun countZeroBytes(bytes: ByteArray): Pair<Int, Int> {
    val sampleSize = minOf(bytes.size, UTF16_SAMPLE_SIZE)
    var evenZeros = 0
    var oddZeros = 0
    repeat(sampleSize) { index ->
        if (bytes[index] == 0.toByte()) {
            if (index % 2 == 0) evenZeros++ else oddZeros++
        }
    }
    return evenZeros to oddZeros
}

private fun zeroPatternHint(
    evenZeros: Int,
    oddZeros: Int,
): Utf16Hint =
    when {
        evenZeros >= UTF16_ZERO_THRESHOLD && evenZeros > oddZeros -> Utf16Hint.BIG_ENDIAN
        oddZeros >= UTF16_ZERO_THRESHOLD && oddZeros > evenZeros -> Utf16Hint.LITTLE_ENDIAN
        evenZeros >= UTF16_ZERO_THRESHOLD || oddZeros >= UTF16_ZERO_THRESHOLD -> Utf16Hint.UNKNOWN
        else -> Utf16Hint.NONE
    }

private enum class Utf16Hint { BIG_ENDIAN, LITTLE_ENDIAN, UNKNOWN, NONE }

private const val UTF16_BOM_SIZE = 2
private const val UTF16_SAMPLE_SIZE = 64
private const val UTF16_ZERO_THRESHOLD = 2
private const val UTF8_BOM = "\uFEFF"
