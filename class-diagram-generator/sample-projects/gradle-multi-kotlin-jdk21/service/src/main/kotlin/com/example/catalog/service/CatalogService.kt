package com.example.catalog.service

import com.example.catalog.support.CatalogKeyFactory
import com.example.catalog.support.CatalogSnapshot
import com.example.catalog.support.CatalogSupport
import com.example.catalog.support.CatalogTier
import org.springframework.stereotype.Service

interface CatalogService {
    fun findSnapshots(): List<CatalogSnapshot>
}

@Service
class DefaultCatalogService : CatalogService, CatalogSupport {
    override fun findSnapshots(): List<CatalogSnapshot> = current()

    override fun current(): List<CatalogSnapshot> = listOf(
        CatalogSnapshot(CatalogKeyFactory.keyOf(1), "Kotlin", CatalogTier.BASIC),
        CatalogSnapshot(CatalogKeyFactory.keyOf(2), "Spring", CatalogTier.PREMIUM)
    )

    companion object {
        const val SOURCE = "service-module"
    }
}
