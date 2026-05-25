package com.toolhub.classdiagramgenerator.config

import io.kotest.core.spec.style.StringSpec
import io.kotest.extensions.spring.SpringExtension
import io.kotest.matchers.shouldBe
import org.springframework.boot.test.context.SpringBootTest

@SpringBootTest
class AppPropertiesTest(
    private val props: AppProperties,
) : StringSpec({
        extensions(SpringExtension)
        "default ttl is 60 minutes" {
            props.job.ttlMinutes shouldBe 60L
        }
        "default max concurrent is 4" {
            props.job.maxConcurrent shouldBe 4
        }
        "max classes per module is 5000" {
            props.analysis.maxClassesPerModule shouldBe 5000
        }
        "default docx font family is configurable" {
            props.render.docx.fontFamily shouldBe "Noto Sans CJK KR"
        }
    })
