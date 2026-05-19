package com.toolhub.classdiagramgenerator.domain

enum class RelationKind { EXTENDS, IMPLEMENTS }

data class TypeRef(
    val simpleName: String,
    val fqn: String?,
    val external: Boolean,
)

data class Relation(
    val sourceClassId: String,
    val target: TypeRef,
    val kind: RelationKind,
)
