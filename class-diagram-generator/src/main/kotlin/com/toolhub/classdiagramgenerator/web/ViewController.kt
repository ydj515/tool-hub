package com.toolhub.classdiagramgenerator.web

import com.toolhub.classdiagramgenerator.api.ArtifactSizeFormatter
import com.toolhub.classdiagramgenerator.domain.OutputLanguage
import com.toolhub.classdiagramgenerator.job.JobStore
import org.springframework.stereotype.Controller
import org.springframework.ui.Model
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import java.util.Locale
import java.util.UUID

@Controller
class ViewController(
    private val jobStore: JobStore,
) {
    @GetMapping("/")
    fun upload(model: Model): String {
        model.addAttribute("page", "upload")
        return "upload"
    }

    @GetMapping("/jobs/{id}")
    fun progress(
        @PathVariable id: UUID,
        model: Model,
        locale: Locale,
    ): String {
        model.addAttribute("jobId", id)
        model.addAttribute("page", "progress")
        addJobContext(id, model, locale)
        return "progress"
    }

    @GetMapping("/jobs/{id}/result")
    fun result(
        @PathVariable id: UUID,
        model: Model,
        locale: Locale,
    ): String {
        model.addAttribute("jobId", id)
        model.addAttribute("page", "result")
        addJobContext(id, model, locale)
        return "result"
    }

    private fun addJobContext(
        id: UUID,
        model: Model,
        locale: Locale,
    ) {
        val job = jobStore.get(id) ?: return
        model.addAttribute(
            "jobContext",
            mapOf(
                "programName" to job.programName,
                "version" to job.version,
                "language" to if (job.language == OutputLanguage.KO) "한국어" else "English",
                "formats" to job.formats.map { it.uppercase(Locale.ROOT) },
                "includeDiagrams" to job.includeDiagrams,
                "sourceFilename" to job.sourceFilename,
                "sourceSizeLabel" to job.sourceSizeBytes?.let { ArtifactSizeFormatter.format(it, locale) },
            ),
        )
    }
}
