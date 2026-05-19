package com.toolhub.classdiagramgenerator.api

import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.shouldBe
import java.util.Locale

class ArtifactSizeFormatterTest :
    StringSpec({
        "formats bytes without scaling for small files" {
            ArtifactSizeFormatter.format(999, Locale.KOREAN) shouldBe "999 B"
        }

        "uses the most readable unit and strips unnecessary decimals" {
            ArtifactSizeFormatter.format(6110, Locale.KOREAN) shouldBe "6 KB"
            ArtifactSizeFormatter.format(1536, Locale.KOREAN) shouldBe "1.5 KB"
            ArtifactSizeFormatter.format(5L * 1024 * 1024, Locale.KOREAN) shouldBe "5 MB"
        }
    })
