package com.toolhub.classdiagramgenerator.domain

import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.shouldBe

class RelationTest :
    StringSpec({
        "TypeRef preserves simpleName, fqn, external flag" {
            val ref = TypeRef(simpleName = "User", fqn = "com.demo.User", external = false)
            ref.simpleName shouldBe "User"
            ref.fqn shouldBe "com.demo.User"
            ref.external shouldBe false
        }

        "Relation holds source class id, target, kind" {
            val rel =
                Relation(
                    sourceClassId = "CLS-0001",
                    target = TypeRef("BaseService", null, true),
                    kind = RelationKind.EXTENDS,
                )
            rel.sourceClassId shouldBe "CLS-0001"
            rel.target.simpleName shouldBe "BaseService"
            rel.kind shouldBe RelationKind.EXTENDS
        }

        "Module relations defaults to empty list" {
            val m = Module(name = "core", classes = emptyList())
            m.relations shouldBe emptyList()
        }
    })
