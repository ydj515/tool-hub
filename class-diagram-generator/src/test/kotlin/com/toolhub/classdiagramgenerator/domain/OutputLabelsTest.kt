package com.toolhub.classdiagramgenerator.domain

import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.collections.shouldContainExactly
import io.kotest.matchers.shouldBe

class OutputLabelsTest :
    StringSpec({
        "KO labels match dictionary" {
            val labels = OutputLabels.of(OutputLanguage.KO)
            labels["col.classId"] shouldBe "클래스 ID"
            labels["doc.title.cover"] shouldBe "클래스 설계서"
            labels["sheet.cover"] shouldBe "표지"
        }
        "EN labels match dictionary" {
            val labels = OutputLabels.of(OutputLanguage.EN)
            labels["col.classId"] shouldBe "Class ID"
            labels["doc.title.cover"] shouldBe "Class Design"
            labels["sheet.cover"] shouldBe "Cover"
        }
        "KO and EN have identical key sets" {
            val ko = OutputLabels.of(OutputLanguage.KO).keys
            val en = OutputLabels.of(OutputLanguage.EN).keys
            ko.toSortedSet().toList() shouldContainExactly en.toSortedSet().toList()
        }
    })
