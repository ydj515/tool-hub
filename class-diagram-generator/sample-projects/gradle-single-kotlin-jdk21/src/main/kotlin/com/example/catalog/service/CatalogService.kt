package com.example.catalog.service

import com.example.catalog.model.CatalogPolicies
import com.example.catalog.model.CatalogResult
import com.example.catalog.model.ProductQuery
import com.example.catalog.repository.ProductRepository
import org.springframework.stereotype.Service

@Service
class CatalogService(
    private val productRepository: ProductRepository
) {
    fun findProducts(query: ProductQuery): CatalogResult {
        val filtered = productRepository.findAll().filter {
            CatalogPolicies.canExpose(it.status, query.includeInactive)
        }
        return if (filtered.isEmpty()) {
            CatalogResult.Failure("조회 가능한 상품이 없습니다.")
        } else {
            CatalogResult.Success(filtered)
        }
    }

    data class ServiceMeta(val provider: String)
}
