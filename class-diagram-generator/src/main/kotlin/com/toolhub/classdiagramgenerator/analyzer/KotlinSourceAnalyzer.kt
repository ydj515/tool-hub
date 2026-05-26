package com.toolhub.classdiagramgenerator.analyzer

import com.toolhub.classdiagramgenerator.domain.AccessModifier
import org.jetbrains.kotlin.cli.jvm.compiler.EnvironmentConfigFiles
import org.jetbrains.kotlin.cli.jvm.compiler.KotlinCoreEnvironment
import org.jetbrains.kotlin.com.intellij.openapi.Disposable
import org.jetbrains.kotlin.com.intellij.openapi.util.Disposer
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
import org.springframework.stereotype.Component
import java.nio.file.Files
import java.nio.file.Path

@Component
@Suppress("TooManyFunctions")
class KotlinSourceAnalyzer : SourceAnalyzer {
    override fun parseFile(path: Path): ParsedSource {
        val content = Files.readString(path)
        val disposable = Disposer.newDisposable()
        return try {
            val file = createKtFile(disposable, path.fileName.toString(), content)
            val pkg = file.packageFqName.asString()
            val imports = file.importDirectives.mapNotNull { it.importPath?.pathStr }
            val knownKinds = collectKnownKinds(file.declarations)
            val types = mutableListOf<ParsedType>()
            file.declarations.filterIsInstance<KtClassOrObject>().forEach { collect(it, pkg, imports, knownKinds, types) }
            ParsedSource(types = types)
        } finally {
            Disposer.dispose(disposable)
        }
    }

    private fun createKtFile(
        disposable: Disposable,
        fileName: String,
        content: String,
    ): KtFile {
        val configuration = CompilerConfiguration()
        configuration.put(CommonConfigurationKeys.MODULE_NAME, "class-diagram-generator")
        configuration.put(JVMConfigurationKeys.JVM_TARGET, JvmTarget.JVM_21)
        val env = KotlinCoreEnvironment.createForProduction(disposable, configuration, EnvironmentConfigFiles.JVM_CONFIG_FILES)
        return KtPsiFactory(env.project, false).createFile(fileName, content)
    }

    private fun collectKnownKinds(declarations: List<KtDeclaration>): Map<String, KnownTypeKind> {
        val result = mutableMapOf<String, KnownTypeKind>()
        declarations.filterIsInstance<KtClassOrObject>().forEach { collectKnownKind(it, result) }
        return result
    }

    private fun collectKnownKind(
        declaration: KtClassOrObject,
        out: MutableMap<String, KnownTypeKind>,
    ) {
        val name = declaration.typeName() ?: return
        out[name] = if (declaration is KtClass && declaration.isInterface()) KnownTypeKind.INTERFACE else KnownTypeKind.CLASS_LIKE
        declaration.declarations.filterIsInstance<KtClassOrObject>().forEach { collectKnownKind(it, out) }
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
            return entries.map { it.name } to emptyList()
        }

        val extendsNames = mutableListOf<String>()
        val implementsNames = mutableListOf<String>()
        entries.forEach { entry ->
            val kind = knownKinds[entry.name]
            if (kind == KnownTypeKind.INTERFACE) {
                implementsNames += entry.name
            } else if (entry.isConstructorCall && extendsNames.isEmpty()) {
                extendsNames += entry.name
            } else {
                implementsNames += entry.name
            }
        }
        return extendsNames to implementsNames
    }

    private fun KtSuperTypeListEntry.toParentEntry(): ParentEntry? {
        val name =
            typeAsUserType?.referencedName
                ?: typeReference
                    ?.text
                    ?.substringBefore("<")
                    ?.substringBefore("(")
                ?: return null
        return ParentEntry(name = name, isConstructorCall = this is KtSuperTypeCallEntry)
    }

    private data class ParentEntry(
        val name: String,
        val isConstructorCall: Boolean,
    )

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
}
