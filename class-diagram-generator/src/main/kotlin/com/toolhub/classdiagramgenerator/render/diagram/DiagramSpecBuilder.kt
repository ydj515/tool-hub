package com.toolhub.classdiagramgenerator.render.diagram

import com.toolhub.classdiagramgenerator.domain.ClassInfo
import com.toolhub.classdiagramgenerator.domain.Layer
import com.toolhub.classdiagramgenerator.domain.Module
import com.toolhub.classdiagramgenerator.domain.Relation
import com.toolhub.classdiagramgenerator.domain.TypeRef
import org.springframework.stereotype.Component
import java.security.MessageDigest

@Component
class DiagramSpecBuilder {
    fun build(module: Module): List<DiagramSpec> {
        val byId = module.classes.associateBy { it.id }
        val layerSpecs = buildLayerSpecs(module, byId)
        val classSpecs = buildClassSpecs(module, byId)
        return layerSpecs + classSpecs
    }

    private fun buildLayerSpecs(
        module: Module,
        byId: Map<String, ClassInfo>,
    ): List<DiagramSpec> =
        Layer.entries.mapNotNull { layer ->
            val members = module.classes.filter { it.layer == layer }
            if (members.isEmpty()) return@mapNotNull null
            val memberIds = members.map { it.id }.toSet()
            val relations = module.relations.filter { it.sourceClassId in memberIds }
            val externalNodes = relations.filter { it.target.external }.map { it.target }.distinctBy { it.fqn ?: it.simpleName }
            val internalNodes = members.map { nodeForInternal(it) }
            val externals = externalNodes.map { nodeForExternal(it) }
            val nodes = internalNodes + externals
            val edges = relations.map { edgeFor(it, byId) }
            DiagramSpec(
                scope = DiagramScope.LAYER,
                key = "layer-${layer.name.lowercase()}",
                title = "${layer.name.lowercase().replaceFirstChar { it.titlecase() }} Layer",
                nodes = nodes,
                edges = edges,
                layer = layer,
            )
        }

    private fun buildClassSpecs(
        module: Module,
        byId: Map<String, ClassInfo>,
    ): List<DiagramSpec> =
        module.classes.mapNotNull { ci ->
            val relations = module.relations.filter { it.sourceClassId == ci.id }
            if (relations.isEmpty()) return@mapNotNull null
            val parents = relations.map { it.target }
            val parentNodes =
                parents.map { ref ->
                    if (ref.external) {
                        nodeForExternal(ref)
                    } else {
                        val matched = byId.values.firstOrNull { it.name == ref.simpleName }
                        if (matched != null) nodeForInternal(matched) else nodeForExternal(ref)
                    }
                }
            val nodes = listOf(nodeForInternal(ci)) + parentNodes.distinctBy { it.id }
            val edges = relations.map { edgeFor(it, byId) }
            DiagramSpec(
                scope = DiagramScope.CLASS,
                key = "class-${ci.id}",
                title = "${ci.id} ${ci.name}",
                nodes = nodes,
                edges = edges,
                classId = ci.id,
            )
        }

    private fun nodeForInternal(ci: ClassInfo): DiagramNode =
        DiagramNode(
            id = ci.id.replace('-', '_'),
            classId = ci.id,
            stereotype = ci.layer.name.lowercase().replaceFirstChar { it.titlecase() },
            displayName = ci.name,
            external = false,
        )

    private fun nodeForExternal(ref: TypeRef): DiagramNode {
        val hashInput = ref.fqn ?: ref.simpleName
        val hash = sha1Hex(hashInput).take(EXTERNAL_HASH_LEN)
        return DiagramNode(
            id = "EXT_$hash",
            classId = null,
            stereotype = null,
            displayName = ref.fqn?.substringAfterLast('.') ?: ref.simpleName,
            external = true,
        )
    }

    private fun edgeFor(
        rel: Relation,
        byId: Map<String, ClassInfo>,
    ): DiagramEdge {
        val from = rel.sourceClassId.replace('-', '_')
        val to = if (rel.target.external) {
            "EXT_${sha1Hex(rel.target.fqn ?: rel.target.simpleName).take(EXTERNAL_HASH_LEN)}"
        } else {
            val matched = byId.values.firstOrNull { it.name == rel.target.simpleName }
            matched?.id?.replace('-', '_')
                ?: "EXT_${sha1Hex(rel.target.simpleName).take(EXTERNAL_HASH_LEN)}"
        }
        return DiagramEdge(fromId = from, toId = to, kind = rel.kind)
    }

    private fun sha1Hex(input: String): String {
        val md = MessageDigest.getInstance("SHA-1")
        val bytes = md.digest(input.toByteArray(Charsets.UTF_8))
        return bytes.joinToString("") { "%02x".format(it) }
    }

    companion object {
        private const val EXTERNAL_HASH_LEN = 6
    }
}
