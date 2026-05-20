package com.toolhub.classdiagramgenerator.domain

import java.time.ZonedDateTime

enum class OutputLanguage(
    val code: String,
) {
    KO("ko"),
    EN("en"),
    ;

    companion object {
        fun parse(value: String): OutputLanguage =
            entries.firstOrNull { it.code.equals(value, ignoreCase = true) }
                ?: throw IllegalArgumentException("Unsupported language: $value")
    }
}

enum class Layer { CONTROLLER, SERVICE, MAPPER, UTIL, MODEL, ETC }

enum class AccessModifier { PUBLIC, PRIVATE, PROTECTED, DEFAULT }

data class Warning(
    val code: String,
    val message: String,
    val context: Map<String, Any?> = emptyMap(),
)

data class AttributeInfo(
    val name: String,
    val type: String,
    val accessModifier: AccessModifier,
    val description: String,
)

data class OperationInfo(
    val name: String,
    val description: String,
)

data class ClassInfo(
    val id: String,
    val name: String,
    val layer: Layer,
    val description: String,
    val packagePath: String,
    val attributes: List<AttributeInfo>,
    val operations: List<OperationInfo>,
)

data class Module(
    val name: String,
    val classes: List<ClassInfo>,
    val relations: List<Relation> = emptyList(),
)

data class Program(
    val name: String,
    val version: String,
    val language: OutputLanguage,
    val generatedAt: ZonedDateTime,
    val modules: List<Module>,
    val warnings: List<Warning> = emptyList(),
)
