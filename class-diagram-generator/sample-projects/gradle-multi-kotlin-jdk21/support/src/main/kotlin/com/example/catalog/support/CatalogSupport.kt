package com.example.catalog.support

/** 카탈로그 등급 */
enum class CatalogTier {
    BASIC,
    PREMIUM
}

/** 모듈 간 공유되는 스냅샷 모델 */
data class CatalogSnapshot(
    val key: String,
    val value: String,
    val tier: CatalogTier
)

/** 지원 모듈 계약 */
interface CatalogSupport {
    fun current(): List<CatalogSnapshot>
}

/** 키 생성 유틸리티 */
object CatalogKeyFactory {
    fun keyOf(id: Long): String = "catalog-$id"
}
