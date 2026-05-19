package com.toolhub.classdiagramgenerator.domain

class LabelDictionary internal constructor(
    private val map: Map<String, String>,
) {
    operator fun get(key: String): String = map[key] ?: error("Missing label key: $key")

    val keys: Set<String> get() = map.keys
}

object OutputLabels {
    private val KO =
        LabelDictionary(
            mapOf(
                "doc.title.cover" to "클래스 설계서",
                "doc.title.classList" to "클래스 리스트",
                "doc.title.classDesign" to "클래스 설계서",
                "doc.meta.programName" to "프로그램명",
                "doc.meta.moduleName" to "모듈명",
                "doc.meta.version" to "버전",
                "doc.meta.generatedAt" to "생성일",
                "col.classId" to "클래스 ID",
                "col.className" to "클래스명",
                "col.layer" to "계층",
                "col.package" to "패키지",
                "col.description" to "설명",
                "col.attributeName" to "속성명",
                "col.type" to "타입",
                "col.accessModifier" to "접근지정자",
                "col.operationName" to "오퍼레이션명",
                "layer.controller" to "Controller",
                "layer.service" to "Service",
                "layer.mapper" to "Mapper",
                "layer.util" to "Util",
                "layer.model" to "Model",
                "layer.etc" to "기타",
                "access.public" to "public",
                "access.private" to "private",
                "access.protected" to "protected",
                "access.default" to "default",
                "sheet.cover" to "표지",
                "sheet.classList" to "클래스 리스트",
                "sheet.classDesign" to "클래스 설계서",
                "toc.title" to "목차",
                "toc.refreshHint" to "목차는 F9 또는 우클릭 → 필드 업데이트로 갱신하세요.",
                "doc.title.layerDiagrams" to "계층 다이어그램",
                "doc.title.classDiagram" to "클래스 다이어그램",
                "sheet.layerDiagrams" to "계층 다이어그램",
                "diagram.legend.external" to "외부 타입",
                "warning.diagramFailed" to "다이어그램 렌더링 실패",
            ),
        )

    private val EN =
        LabelDictionary(
            mapOf(
                "doc.title.cover" to "Class Design",
                "doc.title.classList" to "Class List",
                "doc.title.classDesign" to "Class Design",
                "doc.meta.programName" to "Program",
                "doc.meta.moduleName" to "Module",
                "doc.meta.version" to "Version",
                "doc.meta.generatedAt" to "Generated At",
                "col.classId" to "Class ID",
                "col.className" to "Class Name",
                "col.layer" to "Layer",
                "col.package" to "Package",
                "col.description" to "Description",
                "col.attributeName" to "Attribute",
                "col.type" to "Type",
                "col.accessModifier" to "Access",
                "col.operationName" to "Operation",
                "layer.controller" to "Controller",
                "layer.service" to "Service",
                "layer.mapper" to "Mapper",
                "layer.util" to "Util",
                "layer.model" to "Model",
                "layer.etc" to "Etc",
                "access.public" to "public",
                "access.private" to "private",
                "access.protected" to "protected",
                "access.default" to "default",
                "sheet.cover" to "Cover",
                "sheet.classList" to "Class List",
                "sheet.classDesign" to "Class Design",
                "toc.title" to "Table of Contents",
                "toc.refreshHint" to "Press F9 or right-click → Update Field to refresh.",
                "doc.title.layerDiagrams" to "Layer Diagrams",
                "doc.title.classDiagram" to "Class Diagram",
                "sheet.layerDiagrams" to "Layer Diagrams",
                "diagram.legend.external" to "External Type",
                "warning.diagramFailed" to "Diagram rendering failed",
            ),
        )

    fun of(language: OutputLanguage): LabelDictionary =
        when (language) {
            OutputLanguage.KO -> KO
            OutputLanguage.EN -> EN
        }
}
