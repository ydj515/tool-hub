package com.toolhub.classdiagramgenerator.job

import com.toolhub.classdiagramgenerator.analyzer.ClassIdAssigner
import com.toolhub.classdiagramgenerator.analyzer.JavaSourceAnalyzer
import com.toolhub.classdiagramgenerator.analyzer.LayerClassifier
import com.toolhub.classdiagramgenerator.analyzer.ParsedType
import com.toolhub.classdiagramgenerator.config.AppProperties
import com.toolhub.classdiagramgenerator.domain.AttributeInfo
import com.toolhub.classdiagramgenerator.domain.ClassInfo
import com.toolhub.classdiagramgenerator.domain.Module
import com.toolhub.classdiagramgenerator.domain.OperationInfo
import com.toolhub.classdiagramgenerator.domain.Program
import com.toolhub.classdiagramgenerator.domain.Warning
import com.toolhub.classdiagramgenerator.input.ModuleDescriptor
import com.toolhub.classdiagramgenerator.input.ProjectDetector
import com.toolhub.classdiagramgenerator.input.ZipExtractor
import com.toolhub.classdiagramgenerator.render.DocumentGenerator
import com.toolhub.classdiagramgenerator.storage.OutputStorage
import org.slf4j.LoggerFactory
import org.slf4j.MDC
import org.springframework.stereotype.Component
import java.io.ByteArrayInputStream
import java.time.Instant
import java.time.ZonedDateTime
import java.time.format.DateTimeFormatter
import kotlin.io.path.fileSize
import kotlin.io.path.outputStream

@Component
@Suppress("LongParameterList", "TooManyFunctions")
class JobOrchestrator(
    private val zipExtractor: ZipExtractor,
    private val projectDetector: ProjectDetector,
    private val analyzer: JavaSourceAnalyzer,
    private val classifier: LayerClassifier,
    private val idAssigner: ClassIdAssigner,
    private val generators: List<DocumentGenerator>,
    private val storage: OutputStorage,
    private val bus: ProgressBus,
    private val props: AppProperties,
) {
    private val log = LoggerFactory.getLogger(javaClass)
    private val timestamp = DateTimeFormatter.ofPattern("yyyyMMddHHmm")

    fun run(
        record: JobRecord,
        zipBytes: ByteArray,
    ) {
        MDC.put("jobId", record.id.toString())
        try {
            executePipeline(record, zipBytes)
        } catch (
            @Suppress("TooGenericExceptionCaught") e: Exception,
        ) {
            handleFailure(record, e)
        } finally {
            MDC.remove("jobId")
        }
    }

    private fun executePipeline(
        record: JobRecord,
        zipBytes: ByteArray,
    ) {
        record.status = JobStatus.RUNNING
        val inputDir = storage.inputDir(record.id)

        stage(record, Stage.EXTRACTING, PCT_EXTRACT)
        zipExtractor.extract(ByteArrayInputStream(zipBytes), inputDir)

        stage(record, Stage.DETECTING_MODULES, PCT_DETECT)
        val modules = projectDetector.detect(inputDir, fallbackName = record.programName)

        stage(record, Stage.PARSING, PCT_PARSE)
        val parsedModules = parseAll(record, modules)

        stage(record, Stage.CLASSIFYING, PCT_CLASSIFY)
        val classifiedModules = parsedModules.map { (md, types) -> classifyModule(md, types) }

        stage(record, Stage.ASSIGNING_IDS, PCT_ASSIGN)
        val finalModules = classifiedModules.map { m -> m.copy(classes = idAssigner.assign(m.classes)) }

        val program =
            Program(
                name = record.programName,
                version = record.version,
                language = record.language,
                generatedAt = ZonedDateTime.now(),
                modules = finalModules,
                warnings = record.warnings.toList(),
            )

        renderAll(record, program)

        stage(record, Stage.PACKAGING, PCT_PACK)
        record.expiresAt = Instant.now().plusSeconds(props.job.ttlMinutes * SECONDS_PER_MINUTE)
        record.status = JobStatus.DONE
        bus.publish(
            record.id,
            "done",
            mapOf(
                "resultUrl" to "/api/v1/jobs/${record.id}/result",
                "expiresAt" to record.expiresAt.toString(),
            ),
        )
        bus.complete(record.id)
    }

    private fun parseAll(
        record: JobRecord,
        modules: List<ModuleDescriptor>,
    ): List<Pair<ModuleDescriptor, List<ParsedType>>> =
        modules.map { md ->
            val types =
                md.sourceFiles.flatMap { path ->
                    val parsed = analyzer.parseFile(path)
                    parsed.warnings.forEach { warning -> addWarning(record, warning) }
                    parsed.types
                }
            require(types.size <= props.analysis.maxClassesPerModule) {
                "Module ${md.name} exceeds ${props.analysis.maxClassesPerModule} classes"
            }
            md to types
        }

    private fun classifyModule(
        md: ModuleDescriptor,
        types: List<ParsedType>,
    ): Module {
        val base = classifier.commonBasePackage(types.map { it.packagePath })
        val classes =
            types.map { t ->
                ClassInfo(
                    id = "",
                    name = t.name,
                    layer = classifier.classify(base, t.packagePath),
                    description = t.description,
                    packagePath = t.packagePath,
                    attributes =
                        t.attributes.map { a ->
                            AttributeInfo(a.name, a.type, a.accessModifier, a.description)
                        },
                    operations = t.operations.map { OperationInfo(it.name, it.description) },
                )
            }
        return Module(name = md.name, classes = classes)
    }

    private fun renderAll(
        record: JobRecord,
        program: Program,
    ) {
        val sequence =
            listOf(
                "docx" to Stage.RENDERING_DOCX,
                "xlsx" to Stage.RENDERING_XLSX,
                "md" to Stage.RENDERING_MD,
            ).filter { it.first in record.formats }
        val per = (PCT_PACK - PCT_RENDER_BASE) / sequence.size.coerceAtLeast(1)
        sequence.forEachIndexed { idx, (format, st) ->
            stage(record, st, PCT_RENDER_BASE + per * idx)
            renderFormat(record, program, format)
        }
    }

    private fun renderFormat(
        record: JobRecord,
        program: Program,
        format: String,
    ) {
        val gen = generators.first { it.format == format }
        val outDir = storage.outputDir(record.id)
        program.modules.forEach { module ->
            val moduleToken = if (program.modules.size == 1) null else module.name
            val filename = buildFilename(record, moduleToken, format)
            val target = outDir.resolve(filename)
            target.outputStream().use { gen.render(program, module, it) }
            record.artifacts +=
                ArtifactRecord(
                    module = module.name,
                    format = format,
                    filename = filename,
                    path = target,
                    sizeBytes = target.fileSize(),
                )
        }
    }

    private fun buildFilename(
        record: JobRecord,
        module: String?,
        format: String,
    ): String {
        val parts = mutableListOf("class-design", record.programName)
        if (module != null) parts += sanitizeModule(module)
        parts += record.version
        parts += ZonedDateTime.now().format(timestamp)
        return parts.joinToString("_") + "." + format
    }

    private fun sanitizeModule(name: String): String {
        val cleaned = name.replace(Regex("[^A-Za-z0-9._-]"), "-")
        return cleaned.ifBlank { "module" }
    }

    private fun stage(
        record: JobRecord,
        stage: Stage,
        percent: Int,
    ) {
        bus.publish(record.id, "stage", mapOf("stage" to stage.name, "percent" to percent))
    }

    private fun addWarning(
        record: JobRecord,
        warning: Warning,
    ) {
        record.warnings += warning
        bus.publish(record.id, "warning", warning)
    }

    private fun handleFailure(
        record: JobRecord,
        e: Exception,
    ) {
        log.error("Job failed", e)
        record.status = JobStatus.FAILED
        record.errorCode = if (e is ZipExtractor.ZipSlipException) "ZIP_SLIP" else "INTERNAL_ERROR"
        record.errorMessage = e.message
        bus.publish(record.id, "error", mapOf("code" to record.errorCode, "message" to record.errorMessage))
        bus.complete(record.id)
    }

    companion object {
        private const val PCT_EXTRACT = 5
        private const val PCT_DETECT = 15
        private const val PCT_PARSE = 30
        private const val PCT_CLASSIFY = 55
        private const val PCT_ASSIGN = 65
        private const val PCT_RENDER_BASE = 70
        private const val PCT_PACK = 95
        private const val SECONDS_PER_MINUTE = 60L
    }
}
