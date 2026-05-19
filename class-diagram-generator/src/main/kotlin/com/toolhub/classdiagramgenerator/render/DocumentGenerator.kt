package com.toolhub.classdiagramgenerator.render

import com.toolhub.classdiagramgenerator.domain.Module
import com.toolhub.classdiagramgenerator.domain.Program
import java.io.OutputStream

interface DocumentGenerator {
    val format: String

    fun render(
        program: Program,
        module: Module,
        out: OutputStream,
    )
}
