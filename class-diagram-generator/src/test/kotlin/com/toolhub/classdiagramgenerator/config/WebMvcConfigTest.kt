package com.toolhub.classdiagramgenerator.config

import io.kotest.core.spec.style.StringSpec
import io.kotest.extensions.spring.SpringExtension
import io.kotest.matchers.collections.shouldContainExactly
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.context.MessageSource
import java.util.Locale
import java.util.Properties

@SpringBootTest
class WebMvcConfigTest(
    private val messageSource: MessageSource,
) : StringSpec({
        extensions(SpringExtension)
        "ko message lookup" {
            messageSource.getMessage("page.upload.title", null, Locale.KOREAN)
        }
        "en message lookup" {
            messageSource.getMessage("page.upload.title", null, Locale.ENGLISH)
        }
        "ko and en have same key set" {
            val ko =
                Properties().also {
                    it.load(javaClass.getResourceAsStream("/messages.properties"))
                }
            val en =
                Properties().also {
                    it.load(javaClass.getResourceAsStream("/messages_en.properties"))
                }
            ko.stringPropertyNames().sorted() shouldContainExactly en.stringPropertyNames().sorted()
        }
    })
