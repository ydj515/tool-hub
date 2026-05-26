package com.toolhub.classdiagramgenerator.analyzer

import java.nio.file.Path

interface SourceAnalyzer {
    fun parseFile(path: Path): ParsedSource
}
