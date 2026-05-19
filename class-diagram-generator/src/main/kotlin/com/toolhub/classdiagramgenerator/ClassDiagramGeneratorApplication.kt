package com.toolhub.classdiagramgenerator

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.runApplication

@SpringBootApplication
class ClassDiagramGeneratorApplication

fun main(args: Array<String>) {
    runApplication<ClassDiagramGeneratorApplication>(*args)
}
