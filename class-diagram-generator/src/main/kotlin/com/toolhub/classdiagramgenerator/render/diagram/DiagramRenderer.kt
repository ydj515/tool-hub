package com.toolhub.classdiagramgenerator.render.diagram

import com.toolhub.classdiagramgenerator.config.AppProperties
import com.toolhub.classdiagramgenerator.domain.Layer
import com.toolhub.classdiagramgenerator.domain.Module
import com.toolhub.classdiagramgenerator.domain.Program
import com.toolhub.classdiagramgenerator.domain.Warning
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Component
import java.nio.file.Files
import java.nio.file.Path
import java.util.concurrent.Callable
import java.util.concurrent.Executors

@Component
class DiagramRenderer(
    private val specBuilder: DiagramSpecBuilder,
    private val plantUml: PlantUmlRenderer,
    private val props: AppProperties,
) {
    private val log = LoggerFactory.getLogger(javaClass)

    fun render(
        program: Program,
        outputDir: Path,
        includeDiagrams: Boolean,
        onWarning: (Warning) -> Unit = {},
    ): DiagramArtifactIndex {
        if (!includeDiagrams) return DiagramArtifactIndex.EMPTY

        val parallelism =
            if (props.diagrams.parallelism > 0) props.diagrams.parallelism else Runtime.getRuntime().availableProcessors()
        val layerOut = mutableMapOf<String, MutableMap<Layer, Path?>>()
        val classOut = mutableMapOf<String, MutableMap<String, Path?>>()
        val specOut = mutableMapOf<String, MutableMap<String, DiagramSpec>>()

        program.modules.forEach { module ->
            val specs = specBuilder.build(module)
            if (specs.isEmpty()) return@forEach
            val moduleDir = outputDir.resolve(module.name).also { Files.createDirectories(it) }
            val layerMap = layerOut.getOrPut(module.name) { mutableMapOf() }
            val classMap = classOut.getOrPut(module.name) { mutableMapOf() }
            val specMap = specOut.getOrPut(module.name) { mutableMapOf() }

            renderSpecsParallel(specs, moduleDir, module.name, parallelism, onWarning).forEach { (spec, path) ->
                specMap[spec.key] = spec
                when (spec.scope) {
                    DiagramScope.LAYER -> if (spec.layer != null) layerMap[spec.layer] = path
                    DiagramScope.CLASS -> if (spec.classId != null) classMap[spec.classId] = path
                }
            }
        }
        return DiagramArtifactIndex(
            layerDiagrams = layerOut.mapValues { it.value.toMap() },
            classDiagrams = classOut.mapValues { it.value.toMap() },
            specs = specOut.mapValues { it.value.toMap() },
        )
    }

    private fun renderSpecsParallel(
        specs: List<DiagramSpec>,
        moduleDir: Path,
        moduleName: String,
        parallelism: Int,
        onWarning: (Warning) -> Unit,
    ): List<Pair<DiagramSpec, Path?>> {
        val pool = Executors.newWorkStealingPool(parallelism)
        try {
            val tasks =
                specs.map { spec ->
                    Callable { spec to renderOne(spec, moduleDir, moduleName, onWarning) }
                }
            return pool.invokeAll(tasks).map { it.get() }
        } finally {
            pool.shutdown()
        }
    }

    @Suppress("TooGenericExceptionCaught")
    private fun renderOne(
        spec: DiagramSpec,
        moduleDir: Path,
        moduleName: String,
        onWarning: (Warning) -> Unit,
    ): Path? =
        try {
            val bytes = plantUml.render(spec)
            val file = moduleDir.resolve("${spec.key}.png")
            Files.write(file, bytes)
            file
        } catch (e: Exception) {
            log.warn("Diagram render failed: module={} key={}", moduleName, spec.key, e)
            onWarning(
                Warning(
                    code = "DIAGRAM_RENDER_FAILED",
                    message = "Diagram render failed: ${e.message}",
                    context = mapOf("module" to moduleName, "scope" to spec.scope.name, "key" to spec.key),
                ),
            )
            null
        }
}
