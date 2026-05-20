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
            val internalNodes = members.map { nodeForInternal(it) }
            val targetNodes =
                relations.map { relation ->
                    if (relation.target.external) {
                        nodeForExternal(relation.target)
                    } else {
                        findInternalTarget(relation.target, byId)?.let { nodeForInternal(it) } ?: nodeForExternal(relation.target)
                    }
                }
            val nodes = (internalNodes + targetNodes).distinctBy { it.id }
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
                        val matched = findInternalTarget(ref, byId)
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

    private fun findInternalTarget(
        ref: TypeRef,
        byId: Map<String, ClassInfo>,
    ): ClassInfo? {
        byId.values.firstOrNull { "${it.packagePath}.${it.name}" == ref.fqn }?.let { return it }
        val bySimpleName = byId.values.filter { it.name == ref.simpleName }
        return bySimpleName.singleOrNull()
    }

    private fun nodeForInternal(ci: ClassInfo): DiagramNode =
        DiagramNode(
            id = ci.id.replace('-', '_'),
            classId = ci.id,
            stereotype =
                ci.layer.name
                    .lowercase()
                    .replaceFirstChar { it.titlecase() },
            displayName = ci.name,
            external = false,
        )

    private fun nodeForExternal(ref: TypeRef): DiagramNode =
        DiagramNode(
            id = externalNodeId(ref),
            classId = null,
            stereotype = null,
            displayName = ref.fqn?.substringAfterLast('.') ?: ref.simpleName,
            external = true,
        )

    private fun edgeFor(
        rel: Relation,
        byId: Map<String, ClassInfo>,
    ): DiagramEdge {
        val from = rel.sourceClassId.replace('-', '_')
        val to =
            if (rel.target.external) {
                externalNodeId(rel.target)
            } else {
                val matched = findInternalTarget(rel.target, byId)
                matched?.id?.replace('-', '_')
                    ?: externalNodeId(rel.target)
            }
        return DiagramEdge(fromId = from, toId = to, kind = rel.kind)
    }

    private fun externalNodeId(ref: TypeRef): String {
        val hashInput = ref.fqn ?: ref.simpleName
        val hash = sha1Hex(hashInput).take(EXTERNAL_HASH_LEN)
        return "EXT_$hash"
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
