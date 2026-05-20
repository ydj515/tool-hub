package com.toolhub.classdiagramgenerator.input

import org.apache.commons.compress.archivers.zip.ZipArchiveEntry
import org.apache.commons.compress.archivers.zip.ZipArchiveInputStream
import org.springframework.stereotype.Component
import java.io.InputStream
import java.nio.file.Files
import java.nio.file.Path
import kotlin.io.path.createDirectories
import kotlin.io.path.extension
import kotlin.io.path.isDirectory
import kotlin.io.path.outputStream

@Component
class ZipExtractor {
    class ZipSlipException(
        path: String,
    ) : RuntimeException("Zip entry escapes target: $path")

    fun extract(
        input: InputStream,
        target: Path,
    ) {
        target.createDirectories()
        val normalizedTarget = target.toAbsolutePath().normalize()
        ZipArchiveInputStream(
            input,
            Charsets.UTF_8.name(),
            true,
            true,
        ).use { zis ->
            generateSequence { zis.nextEntry as? ZipArchiveEntry }.forEach { entry ->
                writeEntry(zis, entry, normalizedTarget)
            }
        }
    }

    private fun writeEntry(
        zis: ZipArchiveInputStream,
        entry: ZipArchiveEntry,
        normalizedTarget: Path,
    ) {
        val resolved = normalizedTarget.resolve(entry.name).normalize()
        if (!resolved.startsWith(normalizedTarget)) {
            throw ZipSlipException(entry.name)
        }
        if (entry.isDirectory) {
            resolved.createDirectories()
            return
        }
        resolved.parent?.createDirectories()
        resolved.outputStream().use { os -> zis.copyTo(os) }
    }

    fun listJavaFiles(root: Path): List<Path> =
        Files.walk(root).use { stream ->
            stream.filter { !it.isDirectory() && it.extension == "java" }.toList()
        }
}
