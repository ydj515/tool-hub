package com.example.catalog.config

import com.example.catalog.repository.InMemoryProductRepository
import com.example.catalog.repository.ProductRepository
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration

@Configuration
class RepositoryConfig {
    @Bean
    fun productRepository(): ProductRepository = InMemoryProductRepository()
}
