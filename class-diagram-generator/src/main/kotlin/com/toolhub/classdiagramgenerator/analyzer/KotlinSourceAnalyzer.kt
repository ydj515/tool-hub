package com.toolhub.classdiagramgenerator.analyzer

import com.toolhub.classdiagramgenerator.domain.AccessModifier
import com.toolhub.classdiagramgenerator.domain.Warning
import jakarta.annotation.PreDestroy
import org.jetbrains.kotlin.cli.jvm.compiler.EnvironmentConfigFiles
import org.jetbrains.kotlin.cli.jvm.compiler.KotlinCoreEnvironment
import org.jetbrains.kotlin.com.intellij.openapi.util.Disposer
import org.jetbrains.kotlin.com.intellij.psi.PsiErrorElement
import org.jetbrains.kotlin.config.CommonConfigurationKeys
import org.jetbrains.kotlin.config.CompilerConfiguration
import org.jetbrains.kotlin.config.JVMConfigurationKeys
import org.jetbrains.kotlin.config.JvmTarget
import org.jetbrains.kotlin.kdoc.psi.api.KDoc
import org.jetbrains.kotlin.lexer.KtTokens
import org.jetbrains.kotlin.psi.KtClass
import org.jetbrains.kotlin.psi.KtClassOrObject
import org.jetbrains.kotlin.psi.KtDeclaration
import org.jetbrains.kotlin.psi.KtFile
import org.jetbrains.kotlin.psi.KtNamedFunction
import org.jetbrains.kotlin.psi.KtObjectDeclaration
import org.jetbrains.kotlin.psi.KtParameter
import org.jetbrains.kotlin.psi.KtProperty
import org.jetbrains.kotlin.psi.KtPsiFactory
import org.jetbrains.kotlin.psi.KtSuperTypeCallEntry
import org.jetbrains.kotlin.psi.KtSuperTypeListEntry
import org.jetbrains.kotlin.psi.psiUtil.collectDescendantsOfType
import org.springframework.stereotype.Component
import java.nio.file.Files
import java.nio.file.Path

@Component
@Suppress("TooManyFunctions")
class KotlinSourceAnalyzer : SourceAnalyzer {
    private val disposable = Disposer.newDisposable()
    private val environment: KotlinCoreEnvironment = createEnvironment()
    private val psiFactory = KtPsiFactory(environment.project, false)

    override fun supports(path: Path): Boolean = path.fileName.toString().endsWith(".kt")

    @Synchronized
    override fun parseFile(path: Path): ParsedSource {
        val content = Files.readString(path)
        val file = createKtFile(path.fileName.toString(), content)
        val pkg = file.packageFqName.asString()
        val imports = file.importDirectives.mapNotNull { it.importPath?.pathStr }
        val knownKinds = collectKnownKinds(file.declarations)
        val types = mutableListOf<ParsedType>()
        file.declarations.filterIsInstance<KtClassOrObject>().forEach { collect(it, pkg, imports, knownKinds, types) }
        return ParsedSource(types = types, warnings = collectWarnings(path, file))
    }

    @PreDestroy
    fun destroy() {
        Disposer.dispose(disposable)
    }

    private fun createEnvironment(): KotlinCoreEnvironment {
        val configuration = CompilerConfiguration()
        configuration.put(CommonConfigurationKeys.MODULE_NAME, "class-diagram-generator")
        configuration.put(JVMConfigurationKeys.JVM_TARGET, JvmTarget.JVM_21)
        return KotlinCoreEnvironment.createForProduction(disposable, configuration, EnvironmentConfigFiles.JVM_CONFIG_FILES)
    }

    private fun createKtFile(
        fileName: String,
        content: String,
    ): KtFile = psiFactory.createFile(fileName, content)

    private fun collectKnownKinds(declarations: List<KtDeclaration>): Map<String, KnownTypeKind> {
        val result = mutableMapOf<String, KnownTypeKind>()
        declarations.filterIsInstance<KtClassOrObject>().forEach { collectKnownKind(it, result, parent = null) }
        return result
    }

    private fun collectKnownKind(
        declaration: KtClassOrObject,
        out: MutableMap<String, KnownTypeKind>,
        parent: String?,
    ) {
        val name = declaration.typeName() ?: return
        val qualifiedName = if (parent.isNullOrBlank()) name else "$parent.$name"
        val kind = if (declaration is KtClass && declaration.isInterface()) KnownTypeKind.INTERFACE else KnownTypeKind.CLASS_LIKE
        out[name] = kind
        out[qualifiedName] = kind
        declaration.declarations.filterIsInstance<KtClassOrObject>().forEach { collectKnownKind(it, out, qualifiedName) }
    }

    private fun collect(
        declaration: KtClassOrObject,
        pkg: String,
        imports: List<String>,
        knownKinds: Map<String, KnownTypeKind>,
        out: MutableList<ParsedType>,
    ) {
        parseType(declaration, pkg, imports, knownKinds)?.let { out += it }
        declaration.declarations.filterIsInstance<KtClassOrObject>().forEach { collect(it, pkg, imports, knownKinds, out) }
    }

    private fun parseType(
        declaration: KtClassOrObject,
        pkg: String,
        imports: List<String>,
        knownKinds: Map<String, KnownTypeKind>,
    ): ParsedType? {
        val name = declaration.typeName() ?: return null
        val attributes = mutableListOf<ParsedAttribute>()

        if (declaration is KtClass) {
            declaration.primaryConstructorParameters
                .filter { it.hasValOrVar() }
                .mapTo(attributes) { parseConstructorProperty(it) }
        }

        declaration.declarations.filterIsInstance<KtProperty>().mapTo(attributes) { parseProperty(it) }
        val operations =
            declaration.declarations
                .filterIsInstance<KtNamedFunction>()
                .map { ParsedOperation(name = it.name.orEmpty(), description = firstSentence(kdocText(it.docComment))) }

        val (extendsNames, implementsNames) = parentNames(declaration, knownKinds)
        return ParsedType(
            name = name,
            packagePath = pkg,
            description = firstSentence(kdocText(declaration.docComment)),
            attributes = attributes,
            operations = operations,
            extendsNames = extendsNames,
            implementsNames = implementsNames,
            imports = imports,
        )
    }

    private fun parseConstructorProperty(parameter: KtParameter): ParsedAttribute =
        ParsedAttribute(
            name = parameter.name.orEmpty(),
            type = parameter.typeReference?.text.orEmpty(),
            accessModifier = accessOf(parameter),
            description = firstSentence(kdocText(parameter.docComment)),
        )

    private fun parseProperty(property: KtProperty): ParsedAttribute =
        ParsedAttribute(
            name = property.name.orEmpty(),
            type = property.typeReference?.text.orEmpty(),
            accessModifier = accessOf(property),
            description = firstSentence(kdocText(property.docComment)),
        )

    private fun parentNames(
        declaration: KtClassOrObject,
        knownKinds: Map<String, KnownTypeKind>,
    ): Pair<List<String>, List<String>> {
        val entries =
            declaration
                .superTypeListEntries
                .mapNotNull { entry ->
                    entry.toParentEntry()
                }
        if (entries.isEmpty()) return emptyList<String>() to emptyList()

        if (declaration is KtClass && declaration.isInterface()) {
            return entries.map { it.displayName } to emptyList()
        }

        val extendsNames = mutableListOf<String>()
        val implementsNames = mutableListOf<String>()
        entries.forEach { entry ->
            val kind = knownTypeKind(entry, knownKinds)
            if (kind == KnownTypeKind.INTERFACE) {
                implementsNames += entry.displayName
            } else if (entry.isConstructorCall && extendsNames.isEmpty()) {
                extendsNames += entry.displayName
            } else {
                implementsNames += entry.displayName
            }
        }
        return extendsNames to implementsNames
    }

    private fun knownTypeKind(
        entry: ParentEntry,
        knownKinds: Map<String, KnownTypeKind>,
    ): KnownTypeKind? = knownKinds[entry.lookupName] ?: knownKinds[entry.shortName]

    private fun KtSuperTypeListEntry.toParentEntry(): ParentEntry? {
        val baseTypeText =
            typeReference
                ?.text
                ?.substringBefore("<")
                ?.substringBefore("(")
                ?.trim()
                ?: return null
        val shortName = baseTypeText.substringAfterLast('.')
        return ParentEntry(
            displayName = baseTypeText,
            lookupName = baseTypeText,
            shortName = shortName,
            isConstructorCall = this is KtSuperTypeCallEntry,
        )
    }

    private data class ParentEntry(
        val displayName: String,
        val lookupName: String,
        val shortName: String,
        val isConstructorCall: Boolean,
    )

    private fun collectWarnings(
        path: Path,
        file: KtFile,
    ): List<Warning> {
        val errors = file.collectDescendantsOfType<PsiErrorElement>()
        if (errors.isEmpty()) return emptyList()
        return listOf(
            Warning(
                code = WARNING_KOTLIN_PARSE_PARTIAL,
                message = "Kotlin source parsed with PSI errors",
                context = mapOf("path" to path.fileName.toString(), "errorCount" to errors.size.toString()),
            ),
        )
    }

    private fun accessOf(declaration: KtDeclaration): AccessModifier =
        when {
            declaration.hasModifier(KtTokens.PUBLIC_KEYWORD) -> AccessModifier.PUBLIC
            declaration.hasModifier(KtTokens.PRIVATE_KEYWORD) -> AccessModifier.PRIVATE
            declaration.hasModifier(KtTokens.PROTECTED_KEYWORD) -> AccessModifier.PROTECTED
            declaration.hasModifier(KtTokens.INTERNAL_KEYWORD) -> AccessModifier.DEFAULT
            else -> AccessModifier.PUBLIC
        }

    private fun kdocText(kdoc: KDoc?): String =
        kdoc
            ?.getDefaultSection()
            ?.getContent()
            ?.trim()
            .orEmpty()

    private fun firstSentence(raw: String): String {
        if (raw.isBlank()) return ""
        val cleaned =
            raw
                .replace(Regex("<[^>]+>"), "")
                .replace(Regex("\\s+"), " ")
                .trim()
        val dotIndex = cleaned.indexOf('.')
        return if (dotIndex >= 0) cleaned.substring(0, dotIndex + 1) else cleaned
    }

    private fun KtClassOrObject.typeName(): String? =
        when (this) {
            is KtObjectDeclaration -> if (isCompanion()) "Companion" else name
            else -> name
        }

    private enum class KnownTypeKind {
        INTERFACE,
        CLASS_LIKE,
    }

    companion object {
        private const val WARNING_KOTLIN_PARSE_PARTIAL = "KOTLIN_PARSE_PARTIAL"
    }
}
