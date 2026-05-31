package com.example.catalog.api

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.runApplication

@SpringBootApplication(scanBasePackages = ["com.example.catalog"])
class CatalogApiApplication

fun main(args: Array<String>) {
    runApplication<CatalogApiApplication>(*args)
}
