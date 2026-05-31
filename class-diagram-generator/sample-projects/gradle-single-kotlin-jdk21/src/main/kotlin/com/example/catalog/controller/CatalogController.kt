package com.example.catalog.controller

import com.example.catalog.model.CatalogResult
import com.example.catalog.model.ProductQuery
import com.example.catalog.service.CatalogService
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/catalog")
class CatalogController(
    private val catalogService: CatalogService
) {
    @GetMapping("/products")
    fun products(@RequestParam(defaultValue = "false") includeInactive: Boolean): ResponseEntity<Any> {
        return when (val result = catalogService.findProducts(ProductQuery(includeInactive))) {
            is CatalogResult.Success -> ResponseEntity.ok(result.items)
            is CatalogResult.Failure -> ResponseEntity.badRequest().body(mapOf("message" to result.reason))
        }
    }
}
