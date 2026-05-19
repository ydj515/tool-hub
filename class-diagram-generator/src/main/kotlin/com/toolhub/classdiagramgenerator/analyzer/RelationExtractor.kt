package com.toolhub.classdiagramgenerator.analyzer

import com.toolhub.classdiagramgenerator.domain.ClassInfo
import com.toolhub.classdiagramgenerator.domain.Relation
import com.toolhub.classdiagramgenerator.domain.RelationKind
import com.toolhub.classdiagramgenerator.domain.TypeRef
import com.toolhub.classdiagramgenerator.domain.Warning
import org.springframework.stereotype.Component

data class RelationExtraction(
    val relations: List<Relation>,
    val warnings: List<Warning>,
)

@Component
class RelationExtractor {
    fun extract(
        parsed: List<ParsedType>,
        classes: List<ClassInfo>,
    ): RelationExtraction {
        require(parsed.size == classes.size) {
            "parsed and classes must align: ${parsed.size} vs ${classes.size}"
        }
        val pairs = parsed.zip(classes)
        val nameIndex: Map<String, List<ClassInfo>> = classes.groupBy { it.name }
        val relations = mutableListOf<Relation>()
        val warnings = mutableListOf<Warning>()

        pairs.forEach { (pt, ci) ->
            pt.extendsNames.forEach { name ->
                resolve(name, pt, nameIndex, warnings)?.let { ref ->
                    relations += Relation(ci.id, ref, RelationKind.EXTENDS)
                }
            }
            pt.implementsNames.forEach { name ->
                resolve(name, pt, nameIndex, warnings)?.let { ref ->
                    relations += Relation(ci.id, ref, RelationKind.IMPLEMENTS)
                }
            }
        }
        return RelationExtraction(relations, warnings)
    }

    private fun resolve(
        simpleName: String,
        owner: ParsedType,
        index: Map<String, List<ClassInfo>>,
        warnings: MutableList<Warning>,
    ): TypeRef? {
        if (simpleName == "Object" || simpleName.endsWith(".Object")) return null
        val candidates = index[simpleName] ?: emptyList()
        return when {
            candidates.size == 1 -> {
                val match = candidates.single()
                TypeRef(simpleName, "${match.packagePath}.${match.name}", external = false)
            }
            candidates.size > 1 -> {
                warnings +=
                    Warning(
                        code = "AMBIGUOUS_TYPE_REF",
                        message = "Multiple internal candidates for $simpleName from ${owner.packagePath}.${owner.name}",
                        context =
                            mapOf(
                                "owner" to "${owner.packagePath}.${owner.name}",
                                "simpleName" to simpleName,
                                "candidates" to candidates.map { "${it.packagePath}.${it.name}" },
                            ),
                    )
                externalRef(simpleName, owner)
            }
            else -> externalRef(simpleName, owner)
        }
    }

    private fun externalRef(
        simpleName: String,
        owner: ParsedType,
    ): TypeRef {
        val importMatch = owner.imports.firstOrNull { it.substringAfterLast('.') == simpleName }
        return TypeRef(simpleName, importMatch, external = true)
    }
}
