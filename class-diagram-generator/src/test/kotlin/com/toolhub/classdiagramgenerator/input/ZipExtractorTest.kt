package com.toolhub.classdiagramgenerator.input

import io.kotest.assertions.throwables.shouldThrow
import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.collections.shouldContain
import io.kotest.matchers.shouldBe
import java.io.ByteArrayOutputStream
import java.nio.file.Files
import java.util.zip.ZipEntry
import java.util.zip.ZipOutputStream
import kotlin.io.path.exists
import kotlin.io.path.readText

class ZipExtractorTest :
    StringSpec({
        val extractor = ZipExtractor()

        "extracts files preserving directory structure" {
            val zipBytes =
                buildZip(
                    "module-a/src/main/java/A.java" to "class A {}",
                    "module-a/build.gradle" to "// gradle",
                )
            val target = Files.createTempDirectory("ext-")
            extractor.extract(zipBytes.inputStream(), target)
            target.resolve("module-a/src/main/java/A.java").exists() shouldBe true
            target.resolve("module-a/src/main/java/A.java").readText() shouldBe "class A {}"
        }

        "rejects zip slip" {
            val zipBytes = buildZip("../evil.txt" to "owned")
            val target = Files.createTempDirectory("ext-")
            shouldThrow<ZipExtractor.ZipSlipException> {
                extractor.extract(zipBytes.inputStream(), target)
            }
        }

        "lists java files" {
            val zipBytes =
                buildZip(
                    "A.java" to "class A {}",
                    "README.md" to "doc",
                    "B.java" to "class B {}",
                )
            val target = Files.createTempDirectory("ext-")
            extractor.extract(zipBytes.inputStream(), target)
            val javas = extractor.listJavaFiles(target).map { it.fileName.toString() }
            javas shouldContain "A.java"
            javas shouldContain "B.java"
            javas.size shouldBe 2
        }
    })

private fun buildZip(vararg entries: Pair<String, String>): ByteArray {
    val out = ByteArrayOutputStream()
    ZipOutputStream(out).use { zos ->
        entries.forEach { (name, content) ->
            zos.putNextEntry(ZipEntry(name))
            zos.write(content.toByteArray())
            zos.closeEntry()
        }
    }
    return out.toByteArray()
}
