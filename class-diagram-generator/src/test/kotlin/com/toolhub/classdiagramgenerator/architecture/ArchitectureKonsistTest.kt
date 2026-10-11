package com.toolhub.classdiagramgenerator.architecture

import com.lemonappdev.konsist.api.Konsist
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

class ArchitectureKonsistTest {
    private val scope = Konsist.scopeFromExternalDirectory(System.getProperty("architecture.sources"))

    @Test
    fun `production sources are present and belong to the application package`() {
        assertTrue(scope.files.isNotEmpty(), "No production Kotlin sources found")
        assertTrue(scope.files.all { it.packagee?.name?.startsWith("com.toolhub.classdiagramgenerator") == true })
    }

    @Test
    fun `domain does not depend on delivery or concrete adapters`() {
        val domain =
            scope.files.filter {
                it.packagee?.name.let { name ->
                    name == "com.toolhub.classdiagramgenerator.domain" ||
                        name?.startsWith("com.toolhub.classdiagramgenerator.domain.") == true
                }
            }
        assertTrue(domain.isNotEmpty(), "Missing domain sources")
        domain.forEach { file ->
            assertFalse(
                file.imports.any { dependency ->
                    listOf("api", "web", "analyzer", "render", "storage", "job", "config").any {
                        dependency.name.startsWith("com.toolhub.classdiagramgenerator.$it.")
                    }
                },
                "Domain depends on an outer layer: ${file.path}",
            )
        }
    }
}
