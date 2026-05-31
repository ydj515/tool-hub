package com.example.catalog.repository

import com.example.catalog.model.ProductStatus
import com.example.catalog.model.ProductSummary

interface ProductRepository {
    fun findAll(): List<ProductSummary>
}

class InMemoryProductRepository : ProductRepository {
    private val data = listOf(
        ProductSummary(1L, "Kotlin in Action", "cat-001", ProductStatus.ACTIVE),
        ProductSummary(2L, "Spring Recipes", "cat-002", ProductStatus.OUT_OF_STOCK),
        ProductSummary(3L, "Legacy Java", "cat-003", ProductStatus.INACTIVE)
    )

    override fun findAll(): List<ProductSummary> = data

    companion object {
        const val SOURCE = "in-memory"
    }
}
