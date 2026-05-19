package com.toolhub.classdiagramgenerator.web

import org.springframework.stereotype.Controller
import org.springframework.ui.Model
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import java.util.UUID

@Controller
class ViewController {
    @GetMapping("/")
    fun upload(model: Model): String {
        model.addAttribute("page", "upload")
        return "upload"
    }

    @GetMapping("/jobs/{id}")
    fun progress(
        @PathVariable id: UUID,
        model: Model,
    ): String {
        model.addAttribute("jobId", id)
        model.addAttribute("page", "progress")
        return "progress"
    }

    @GetMapping("/jobs/{id}/result")
    fun result(
        @PathVariable id: UUID,
        model: Model,
    ): String {
        model.addAttribute("jobId", id)
        model.addAttribute("page", "result")
        return "result"
    }
}
