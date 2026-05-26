package com.toolhub.classdiagramgenerator.analyzer

import com.toolhub.classdiagramgenerator.domain.AttributeInfo
import com.toolhub.classdiagramgenerator.domain.ClassInfo
import com.toolhub.classdiagramgenerator.domain.Layer
import com.toolhub.classdiagramgenerator.domain.RelationKind
import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.collections.shouldContain
import io.kotest.matchers.collections.shouldHaveSize
import io.kotest.matchers.shouldBe

class RelationExtractorTest :
    StringSpec({
        val ex = RelationExtractor()

        "internal extends produces non-external relation with fqn" {
            val parsed =
                listOf(
                    ParsedType(
                        name = "UserService",
                        packagePath = "com.demo.service",
                        description = "",
                        attributes = emptyList(),
                        operations = emptyList(),
                        extendsNames = listOf("BaseService"),
                        implementsNames = emptyList(),
                        imports = emptyList(),
                    ),
                    ParsedType(
                        name = "BaseService",
                        packagePath = "com.demo.service",
                        description = "",
                        attributes = emptyList(),
                        operations = emptyList(),
                    ),
                )
            val classes =
                listOf(
                    classInfo("CLS-0001", "UserService", "com.demo.service"),
                    classInfo("CLS-0002", "BaseService", "com.demo.service"),
                )
            val result = ex.extract(parsed, classes)
            result.relations shouldHaveSize 1
            val r = result.relations[0]
            r.sourceClassId shouldBe "CLS-0001"
            r.target.simpleName shouldBe "BaseService"
            r.target.fqn shouldBe "com.demo.service.BaseService"
            r.target.external shouldBe false
            r.kind shouldBe RelationKind.EXTENDS
        }

        "java.lang.Object is excluded" {
            val parsed =
                listOf(
                    ParsedType(
                        name = "Foo",
                        packagePath = "com.demo",
                        description = "",
                        attributes = emptyList(),
                        operations = emptyList(),
                        extendsNames = listOf("Object"),
                        implementsNames = emptyList(),
                        imports = listOf("java.lang.Object"),
                    ),
                )
            val classes = listOf(classInfo("CLS-0001", "Foo", "com.demo"))
            ex.extract(parsed, classes).relations shouldHaveSize 0
        }

        "external implements resolves fqn from imports" {
            val parsed =
                listOf(
                    ParsedType(
                        name = "UserRepo",
                        packagePath = "com.demo.repo",
                        description = "",
                        attributes = emptyList(),
                        operations = emptyList(),
                        extendsNames = emptyList(),
                        implementsNames = listOf("JpaRepository"),
                        imports = listOf("org.springframework.data.jpa.repository.JpaRepository"),
                    ),
                )
            val classes = listOf(classInfo("CLS-0001", "UserRepo", "com.demo.repo"))
            val r = ex.extract(parsed, classes).relations.single()
            r.target.external shouldBe true
            r.target.fqn shouldBe "org.springframework.data.jpa.repository.JpaRepository"
            r.kind shouldBe RelationKind.IMPLEMENTS
        }

        "ambiguous simple name with multiple internal candidates degrades to external + warning" {
            val parsed =
                listOf(
                    ParsedType(
                        name = "Caller",
                        packagePath = "com.demo.api",
                        description = "",
                        attributes = emptyList(),
                        operations = emptyList(),
                        extendsNames = listOf("Helper"),
                        implementsNames = emptyList(),
                    ),
                    ParsedType("Helper", "com.demo.a", "", emptyList(), emptyList()),
                    ParsedType("Helper", "com.demo.b", "", emptyList(), emptyList()),
                )
            val classes =
                listOf(
                    classInfo("CLS-0001", "Caller", "com.demo.api"),
                    classInfo("CLS-0002", "Helper", "com.demo.a"),
                    classInfo("CLS-0003", "Helper", "com.demo.b"),
                )
            val result = ex.extract(parsed, classes)
            result.relations
                .single()
                .target.external shouldBe true
            result.warnings.map { it.code } shouldContain "AMBIGUOUS_TYPE_REF"
        }

        "same-package candidate wins over other internal simple-name matches" {
            val parsed =
                listOf(
                    ParsedType(
                        name = "Caller",
                        packagePath = "com.demo.api",
                        description = "",
                        attributes = emptyList(),
                        operations = emptyList(),
                        extendsNames = listOf("Helper"),
                        implementsNames = emptyList(),
                    ),
                    ParsedType("Helper", "com.demo.api", "", emptyList(), emptyList()),
                    ParsedType("Helper", "com.demo.shared", "", emptyList(), emptyList()),
                )
            val classes =
                listOf(
                    classInfo("CLS-0001", "Caller", "com.demo.api"),
                    classInfo("CLS-0002", "Helper", "com.demo.api"),
                    classInfo("CLS-0003", "Helper", "com.demo.shared"),
                )

            val result = ex.extract(parsed, classes)

            result.warnings shouldHaveSize 0
            result.relations
                .single()
                .target.fqn shouldBe "com.demo.api.Helper"
            result.relations
                .single()
                .target.external shouldBe false
        }

        "imported internal candidate wins when multiple simple-name matches exist" {
            val parsed =
                listOf(
                    ParsedType(
                        name = "Caller",
                        packagePath = "com.demo.api",
                        description = "",
                        attributes = emptyList(),
                        operations = emptyList(),
                        extendsNames = listOf("Helper"),
                        implementsNames = emptyList(),
                        imports = listOf("com.demo.shared.Helper"),
                    ),
                    ParsedType("Helper", "com.demo.other", "", emptyList(), emptyList()),
                    ParsedType("Helper", "com.demo.shared", "", emptyList(), emptyList()),
                )
            val classes =
                listOf(
                    classInfo("CLS-0001", "Caller", "com.demo.api"),
                    classInfo("CLS-0002", "Helper", "com.demo.other"),
                    classInfo("CLS-0003", "Helper", "com.demo.shared"),
                )

            val result = ex.extract(parsed, classes)

            result.warnings shouldHaveSize 0
            result.relations
                .single()
                .target.fqn shouldBe "com.demo.shared.Helper"
            result.relations
                .single()
                .target.external shouldBe false
        }

        "kotlin interface extends and class implements are extracted with correct kinds" {
            val parsed =
                listOf(
                    ParsedType(
                        name = "BasePort",
                        packagePath = "com.demo.port",
                        description = "",
                        attributes = emptyList(),
                        operations = emptyList(),
                    ),
                    ParsedType(
                        name = "ChildPort",
                        packagePath = "com.demo.port",
                        description = "",
                        attributes = emptyList(),
                        operations = emptyList(),
                        extendsNames = listOf("BasePort"),
                        implementsNames = emptyList(),
                    ),
                    ParsedType(
                        name = "PortAdapter",
                        packagePath = "com.demo.adapter",
                        description = "",
                        attributes = emptyList(),
                        operations = emptyList(),
                        extendsNames = emptyList(),
                        implementsNames = listOf("ChildPort"),
                        imports = listOf("com.demo.port.ChildPort"),
                    ),
                )
            val classes =
                listOf(
                    classInfo("CLS-0001", "BasePort", "com.demo.port"),
                    classInfo("CLS-0002", "ChildPort", "com.demo.port"),
                    classInfo("CLS-0003", "PortAdapter", "com.demo.adapter"),
                )

            val result = ex.extract(parsed, classes)

            result.warnings shouldHaveSize 0
            result.relations shouldHaveSize 2
            result.relations shouldContain
                com.toolhub.classdiagramgenerator.domain.Relation(
                    sourceClassId = "CLS-0002",
                    target =
                        com.toolhub.classdiagramgenerator.domain.TypeRef(
                            simpleName = "BasePort",
                            fqn = "com.demo.port.BasePort",
                            external = false,
                        ),
                    kind = RelationKind.EXTENDS,
                )
            result.relations shouldContain
                com.toolhub.classdiagramgenerator.domain.Relation(
                    sourceClassId = "CLS-0003",
                    target =
                        com.toolhub.classdiagramgenerator.domain.TypeRef(
                            simpleName = "ChildPort",
                            fqn = "com.demo.port.ChildPort",
                            external = false,
                        ),
                    kind = RelationKind.IMPLEMENTS,
                )
        }
    })

private fun classInfo(
    id: String,
    name: String,
    pkg: String,
) = ClassInfo(
    id = id,
    name = name,
    layer = Layer.SERVICE,
    description = "",
    packagePath = pkg,
    attributes = emptyList<AttributeInfo>(),
    operations = emptyList(),
)
