package com.toolhub.classdiagramgenerator

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.runApplication
import org.springframework.scheduling.annotation.EnableScheduling

@SpringBootApplication
@EnableScheduling
class ClassDiagramGeneratorApplication

fun main(args: Array<String>) {
    runApplication<ClassDiagramGeneratorApplication>(*args)
}
