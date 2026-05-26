package com.toolhub.classdiagramgenerator.analyzer

import java.nio.file.Path

interface SourceAnalyzer {
    fun supports(path: Path): Boolean

    fun parseFile(path: Path): ParsedSource
}
