package com.example.catalog.api

import com.example.catalog.service.CatalogService
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/catalog")
class CatalogController(
    private val catalogService: CatalogService
) {
    @GetMapping("/snapshots")
    fun snapshots() = catalogService.findSnapshots()
}
