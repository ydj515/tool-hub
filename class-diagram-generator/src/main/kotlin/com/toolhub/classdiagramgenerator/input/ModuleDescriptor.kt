package com.toolhub.classdiagramgenerator.input

import java.nio.file.Path

data class ModuleDescriptor(
    val name: String,
    val rootDir: Path,
    val sourceFiles: List<Path>,
)
