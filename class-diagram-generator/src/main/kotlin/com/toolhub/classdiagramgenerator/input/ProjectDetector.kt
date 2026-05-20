package com.toolhub.classdiagramgenerator.input

import org.springframework.stereotype.Component
import java.nio.file.Files
import java.nio.file.Path
import kotlin.io.path.exists
import kotlin.io.path.extension
import kotlin.io.path.isDirectory
import kotlin.io.path.name
import kotlin.io.path.readText

@Component
class ProjectDetector {
    fun detect(
        root: Path,
        fallbackName: String,
    ): List<ModuleDescriptor> {
        val gradleSettings =
            listOf("settings.gradle", "settings.gradle.kts")
                .map { root.resolve(it) }
                .firstOrNull { it.exists() }
        if (gradleSettings != null) {
            val includes = parseGradleIncludes(gradleSettings.readText())
            if (includes.isNotEmpty()) {
                val modules = includes.mapNotNull { moduleFromIncludePath(root, it) }
                return modules.ifEmpty { listOf(singleFallback(root, fallbackName)) }
            }
        }
        val rootBuild =
            listOf("build.gradle", "build.gradle.kts", "pom.xml")
                .map { root.resolve(it) }
                .firstOrNull { it.exists() }
        if (rootBuild != null) {
            val name =
                when (rootBuild.name) {
                    "pom.xml" -> parseMavenArtifactId(rootBuild.readText()) ?: fallbackName
                    else -> fallbackName
                }
            return listOf(buildModule(root, name))
        }
        return listOf(singleFallback(root, fallbackName))
    }

    private fun moduleFromIncludePath(
        root: Path,
        includePath: String,
    ): ModuleDescriptor? {
        val rel = includePath.replace(':', '/').trimStart('/')
        val dir = root.resolve(rel)
        if (!dir.exists() || !dir.isDirectory()) return null
        val name = dir.fileName.toString()
        return buildModule(dir, name)
    }

    private fun buildModule(
        dir: Path,
        name: String,
    ): ModuleDescriptor {
        val sources = collectJavaSources(dir)
        return ModuleDescriptor(name = name, rootDir = dir, sourceFiles = sources)
    }

    private fun singleFallback(
        root: Path,
        fallbackName: String,
    ): ModuleDescriptor = buildModule(root, fallbackName)

    private fun collectJavaSources(dir: Path): List<Path> {
        val preferred = dir.resolve("src/main/java")
        val base = if (preferred.exists()) preferred else dir
        return Files.walk(base).use { stream ->
            stream.filter { path -> isJavaSourceCandidate(path) }.toList()
        }
    }

    private fun isJavaSourceCandidate(path: Path): Boolean =
        !path.isDirectory() &&
            path.extension == "java" &&
            !isMacOsMetadata(path)

    private fun isMacOsMetadata(path: Path): Boolean =
        path.any { part -> part.toString() == "__MACOSX" } ||
            path.name == ".DS_Store" ||
            path.name.startsWith("._")

    private fun parseGradleIncludes(content: String): List<String> =
        includeCallRegex
            .findAll(content)
            .flatMap { match ->
                val args = match.groups[1]?.value ?: match.groups[2]?.value.orEmpty()
                quotedTokenRegex.findAll(args).map { token -> token.groupValues[1] }
            }.toList()

    private fun parseMavenArtifactId(xml: String): String? = Regex("""<artifactId>([^<]+)</artifactId>""").find(xml)?.groupValues?.get(1)

    companion object {
        private val includeCallRegex =
            Regex(
                """include\s*\((.*?)\)|include\s+([^\r\n]+)""",
                setOf(RegexOption.DOT_MATCHES_ALL),
            )
        private val quotedTokenRegex = Regex("""['"]([^'"]+)['"]""")
    }
}
