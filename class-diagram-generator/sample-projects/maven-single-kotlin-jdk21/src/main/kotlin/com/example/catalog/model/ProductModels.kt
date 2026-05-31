package com.example.catalog.model

/** 상품 상태 */
enum class ProductStatus {
    ACTIVE,
    INACTIVE,
    OUT_OF_STOCK
}

/** 상품 요약 */
data class ProductSummary(
    val id: Long,
    val name: String,
    val sku: String,
    val status: ProductStatus
)

data class ProductQuery(val includeInactive: Boolean = false)

/** 조회 결과 */
sealed class CatalogResult {
    data class Success(val items: List<ProductSummary>) : CatalogResult()
    data class Failure(val reason: String) : CatalogResult()
}

/** 정책 객체 */
object CatalogPolicies {
    fun canExpose(status: ProductStatus, includeInactive: Boolean): Boolean {
        return includeInactive || status == ProductStatus.ACTIVE
    }
}
