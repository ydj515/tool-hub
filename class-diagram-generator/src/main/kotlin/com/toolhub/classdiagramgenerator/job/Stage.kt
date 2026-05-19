package com.toolhub.classdiagramgenerator.job

enum class Stage {
    EXTRACTING,
    DETECTING_MODULES,
    PARSING,
    CLASSIFYING,
    ASSIGNING_IDS,
    RENDERING_DOCX,
    RENDERING_XLSX,
    RENDERING_MD,
    PACKAGING,
}
