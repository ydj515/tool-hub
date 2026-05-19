package com.toolhub.classdiagramgenerator.analyzer

import com.toolhub.classdiagramgenerator.domain.Layer
import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.shouldBe

class LayerClassifierTest :
    StringSpec({
        val classifier = LayerClassifier()

        "controller package maps to CONTROLLER" {
            classifier.classify(basePackage = "com.demo", packagePath = "com.demo.controller") shouldBe Layer.CONTROLLER
        }
        "service" {
            classifier.classify("com.demo", "com.demo.service.user") shouldBe Layer.SERVICE
        }
        "dao maps to MAPPER" {
            classifier.classify("com.demo", "com.demo.dao") shouldBe Layer.MAPPER
        }
        "entity maps to MODEL" {
            classifier.classify("com.demo", "com.demo.entity") shouldBe Layer.MODEL
        }
        "unknown segment maps to ETC" {
            classifier.classify("com.demo", "com.demo.weird") shouldBe Layer.ETC
        }
        "case insensitive" {
            classifier.classify("com.demo", "com.demo.Controller") shouldBe Layer.CONTROLLER
        }
        "empty base means full path" {
            classifier.classify("", "service.user") shouldBe Layer.SERVICE
        }
        "commonBasePackage computes prefix" {
            classifier.commonBasePackage(listOf("com.demo.a", "com.demo.b.c")) shouldBe "com.demo"
        }
    })
