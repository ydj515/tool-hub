package com.toolhub.classdiagramgenerator.input

import com.toolhub.classdiagramgenerator.domain.Warning
import org.springframework.stereotype.Component
import java.nio.file.Files
import java.nio.file.Path
import kotlin.io.path.exists
import kotlin.io.path.extension
import kotlin.io.path.isDirectory
import kotlin.io.path.name
import kotlin.io.path.nameWithoutExtension
import kotlin.io.path.readText

@Component
@Suppress("TooManyFunctions")
class ProjectDetector {
    fun detect(
        root: Path,
        fallbackName: String,
        onWarning: (Warning) -> Unit = {},
    ): List<ModuleDescriptor> {
        val projectRoot = resolveProjectRoot(root)
        val mavenPom = projectRoot.resolve("pom.xml")
        if (mavenPom.exists()) {
            val mavenModules = parseMavenModules(mavenPom.readText())
            if (mavenModules.isNotEmpty()) {
                return mavenModules.mapNotNull { moduleFromIncludePath(projectRoot, it, "maven", onWarning) }
            }
        }
        val gradleSettings =
            listOf("settings.gradle", "settings.gradle.kts")
                .map { projectRoot.resolve(it) }
                .firstOrNull { it.exists() }
        if (gradleSettings != null) {
            val includes = parseGradleIncludes(gradleSettings.readText())
            if (includes.isNotEmpty()) {
                return includes.mapNotNull { moduleFromIncludePath(projectRoot, it, "gradle", onWarning) }
            }
        }
        val rootBuild =
            listOf("build.gradle", "build.gradle.kts", "pom.xml")
                .map { projectRoot.resolve(it) }
                .firstOrNull { it.exists() }
        if (rootBuild != null) {
            val name =
                when (rootBuild.name) {
                    "pom.xml" -> parseMavenArtifactId(rootBuild.readText()) ?: fallbackName
                    else -> fallbackName
                }
            return listOf(buildModule(projectRoot, name))
        }
        return listOf(singleFallback(projectRoot, fallbackName))
    }

    private fun moduleFromIncludePath(
        root: Path,
        includePath: String,
        buildSystem: String,
        onWarning: (Warning) -> Unit,
    ): ModuleDescriptor? {
        val rel = includePath.replace(':', '/').trimStart('/')
        val normalizedRoot = root.toAbsolutePath().normalize()
        val dir = normalizedRoot.resolve(rel).normalize()
        if (!dir.startsWith(normalizedRoot)) {
            onWarning(
                Warning(
                    code = "INVALID_DECLARED_MODULE_PATH",
                    message = "Declared $buildSystem module path escapes project root: $includePath",
                    context = mapOf("buildSystem" to buildSystem, "module" to includePath, "path" to rel),
                ),
            )
            return null
        }
        if (!dir.exists() || !dir.isDirectory()) {
            onWarning(
                Warning(
                    code = "MISSING_DECLARED_MODULE",
                    message = "Declared $buildSystem module directory is missing: $includePath",
                    context = mapOf("buildSystem" to buildSystem, "module" to includePath, "path" to rel),
                ),
            )
            return null
        }
        val name = dir.fileName.toString()
        return buildModule(dir, name)
    }

    private fun buildModule(
        dir: Path,
        name: String,
    ): ModuleDescriptor {
        val sources = collectSourceFiles(dir)
        return ModuleDescriptor(name = name, rootDir = dir, sourceFiles = sources)
    }

    private fun singleFallback(
        root: Path,
        fallbackName: String,
    ): ModuleDescriptor = buildModule(root, fallbackName)

    private fun resolveProjectRoot(root: Path): Path {
        var current = root
        while (!hasBuildMetadata(current)) {
            val entries = listMeaningfulEntries(current)
            if (entries.size != 1) {
                return current
            }
            val only = entries.single()
            if (!only.isDirectory()) {
                return current
            }
            current = only
        }
        return current
    }

    private fun hasBuildMetadata(root: Path): Boolean =
        listOf("pom.xml", "build.gradle", "build.gradle.kts", "settings.gradle", "settings.gradle.kts")
            .any { root.resolve(it).exists() }

    private fun listMeaningfulEntries(root: Path): List<Path> =
        Files.list(root).use { stream ->
            stream
                .filter { !isMacOsMetadata(it) }
                .toList()
        }

    private fun collectSourceFiles(dir: Path): List<Path> {
        val kotlinDir = dir.resolve("src/main/kotlin")
        // 순수 Kotlin 지원 범위를 우선해 kotlin 디렉터리가 있으면 java는 스캔하지 않는다.
        if (kotlinDir.exists()) {
            return walkSources(kotlinDir, setOf("kt"))
        }

        val javaDir = dir.resolve("src/main/java")
        if (javaDir.exists()) {
            return walkSources(javaDir, setOf("java"))
        }

        return walkSources(dir, setOf("kt", "java"))
    }

    private fun walkSources(
        base: Path,
        extensions: Set<String>,
    ): List<Path> =
        Files.walk(base).use { stream ->
            stream.filter { path -> isSourceCandidate(path, extensions) }.toList()
        }

    private fun isSourceCandidate(
        path: Path,
        extensions: Set<String>,
    ): Boolean =
        !path.isDirectory() &&
            path.extension in extensions &&
            !isMacOsMetadata(path)

    private fun isMacOsMetadata(path: Path): Boolean =
        path.any { part -> part.toString() == "__MACOSX" } ||
            path.name == ".DS_Store" ||
            path.name.startsWith("._") ||
            path.nameWithoutExtension == ".DS_Store"

    private fun parseGradleIncludes(content: String): List<String> =
        includeCallRegex
            .findAll(content)
            .flatMap { match ->
                val args = match.groups[1]?.value ?: match.groups[2]?.value.orEmpty()
                quotedTokenRegex.findAll(args).map { token -> token.groupValues[1] }
            }.toList()

    private fun parseMavenModules(xml: String): List<String> =
        mavenModulesRegex
            .findAll(xml.replace(xmlCommentRegex, ""))
            .flatMap { block ->
                mavenModuleRegex.findAll(block.groupValues[1]).map { module -> module.groupValues[1].trim() }
            }.toList()

    private fun parseMavenArtifactId(xml: String): String? = Regex("""<artifactId>([^<]+)</artifactId>""").find(xml)?.groupValues?.get(1)

    companion object {
        private val includeCallRegex =
            Regex(
                """include\s*\((.*?)\)|include\s+([^\r\n]+)""",
                setOf(RegexOption.DOT_MATCHES_ALL),
            )
        private val xmlCommentRegex = Regex("""<!--.*?-->""", setOf(RegexOption.DOT_MATCHES_ALL))
        private val quotedTokenRegex = Regex("""['"]([^'"]+)['"]""")
        private val mavenModulesRegex = Regex("""<modules>(.*?)</modules>""", setOf(RegexOption.DOT_MATCHES_ALL))
        private val mavenModuleRegex = Regex("""<module>\s*([^<]+)\s*</module>""")
    }
}
