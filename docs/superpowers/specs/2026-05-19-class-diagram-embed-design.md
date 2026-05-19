# 설계 스펙: 산출물 본문에 클래스 다이어그램 임베드 (NEXT-03)

| 항목 | 내용 |
|---|---|
| 프로젝트 | class-diagram-generator |
| Phase | NEXT-03 (PRD §12) |
| 문서명 | 클래스 다이어그램 임베드 설계 스펙 |
| 위치 | tool-hub/docs/superpowers/specs |
| 작성일 | 2026-05-19 |
| 상태 | 초안 (v1.0) |
| 작성자 | ydj515 |
| 관련 문서 | `class-diagram-generator/docs/PRD-class-diagram-generator.md` |

---

## 1. 목적 / 범위

산출물 본문(docx / xlsx / md)에 **클래스 다이어그램**을 자동 삽입한다. PRD §12 NEXT-03의 "PlantUML 또는 Mermaid 렌더링 → 본문에 삽입. 다이어그램 범위(클래스 내부 vs 모듈 전체) 의사결정 필요" 항목을 구체화한 결과물이다.

### 1.1 다이어그램 입도 / 종류

| 종류 | 단위 | 모듈당 장수 |
|---|---|---|
| 계층 다이어그램 | 계층(Controller/Service/Mapper/Util/Model/Etc) | 최대 6장 (해당 계층에 클래스가 1개 이상이면 1장) |
| 클래스 다이어그램 | 단일 클래스 | 클래스 수 N |

### 1.2 표시 관계

- `extends` (상속)
- `implements` (구현)
- 필드/파라미터 의존, 메서드 시그니처 의존은 **표시하지 않는다** (노이즈 회피)
- `java.lang.Object`는 어떤 다이어그램에도 노드/엣지로 나타나지 않는다 (자동 제외)

### 1.3 산출물 적용 범위

| 산출물 | 다이어그램 표현 |
|---|---|
| docx | PNG 임베드 (PlantUML 렌더링) |
| xlsx | PNG 임베드 (PlantUML 렌더링) |
| md | Mermaid 코드 블록 (` ```mermaid` 펜스) |

### 1.4 옵션 토글

`POST /api/v1/jobs` 에 `includeDiagrams: boolean` 파라미터 추가, 기본값 `true`. 업로드 폼에 체크박스 노출. `false` 인 경우 다이어그램 추출/렌더링/삽입을 모두 건너뛴다.

---

## 2. 도메인 모델 확장

### 2.1 `domain/Relation.kt` (신규)

```kotlin
package com.toolhub.classdiagramgenerator.domain

enum class RelationKind { EXTENDS, IMPLEMENTS }

data class TypeRef(
    val simpleName: String,      // "User", "JpaRepository"
    val fqn: String?,            // 알 수 있으면 채움 (import문/같은 패키지/JLS 기본)
    val external: Boolean,       // 모듈 외부 타입이면 true
)

data class Relation(
    val sourceClassId: String,   // CLS-XXXX (내부 클래스만 source)
    val target: TypeRef,
    val kind: RelationKind,
)
```

### 2.2 `Module` 확장

```kotlin
data class Module(
    val name: String,
    val classes: List<ClassInfo>,
    val relations: List<Relation> = emptyList(),   // 추가
)
```

`ClassInfo`는 변경하지 않는다.

### 2.3 관계 추출 규칙

1. JavaParser `ClassOrInterfaceDeclaration`의 `extendedTypes` / `implementedTypes` 에서 추출
2. enum의 implicit `Enum<E>` 상속은 제외
3. target resolution 우선순위
   - (a) 같은 모듈 내 동일 simpleName 클래스가 존재 → internal (`external=false`), `fqn` 도 채움
   - (b) import문에 정확 매칭되는 항목이 있음 → `fqn` 채움 + `external=true`
   - (c) 매칭 안 됨 → `simpleName` 만 채움 + `external=true`
4. `java.lang.Object` 는 추출 단계에서 무조건 제외
5. 같은 모듈에 같은 simpleName 클래스가 둘 이상이고 import문으로도 모호 → external 로 강등 + warning(`code=AMBIGUOUS_TYPE_REF`)

---

## 3. 파이프라인 / Stage 변경

### 3.1 Stage enum

```kotlin
enum class Stage {
    EXTRACTING,
    DETECTING_MODULES,
    PARSING,
    CLASSIFYING,
    ASSIGNING_IDS,
    EXTRACTING_RELATIONS,   // 신규
    RENDERING_DIAGRAMS,     // 신규
    RENDERING_DOCX,
    RENDERING_XLSX,
    RENDERING_MD,
    PACKAGING,
}
```

### 3.2 파이프라인 순서

```
EXTRACTING → DETECTING_MODULES → PARSING → CLASSIFYING → ASSIGNING_IDS
  → EXTRACTING_RELATIONS        ← Relation[] 생성, sourceClassId 매핑
  → RENDERING_DIAGRAMS          ← includeDiagrams=false면 스킵
  → RENDERING_DOCX / RENDERING_XLSX / RENDERING_MD
  → PACKAGING
```

### 3.3 진행도 퍼센트 재분배

기존 percent 상수 (`PCT_EXTRACT=5`, `PCT_DETECT=15`, `PCT_PARSE=30`, `PCT_CLASSIFY=55`, `PCT_ASSIGN=65`, `PCT_RENDER_BASE=70`, `PCT_PACK=95`) 에서 새 단계 2개를 끼워 넣는다.

| 단계 | percent |
|---|---|
| EXTRACTING | 5 |
| DETECTING_MODULES | 15 |
| PARSING | 30 |
| CLASSIFYING | 50 |
| ASSIGNING_IDS | 58 |
| EXTRACTING_RELATIONS | 62 |
| RENDERING_DIAGRAMS | 시작 70 → 끝 75 (includeDiagrams=true). false 면 즉시 스킵하고 다음 단계 75로 점프 |
| RENDERING_DOCX/XLSX/MD | 75 시작, 95 직전 종료. 활성화된 포맷 수로 균등 분할 |
| PACKAGING | 95 |

### 3.4 변경되는 클래스

| 클래스 | 변경 |
|---|---|
| `analyzer/JavaSourceAnalyzer.kt` | `ParsedType` 에 `extendsNames: List<String>`, `implementsNames: List<String>`, `imports: List<String>` 추가 |
| `analyzer/RelationExtractor.kt` | **신규** — ParsedType + ClassInfo → Relation 목록 |
| `render/diagram/DiagramSpec.kt` | **신규** |
| `render/diagram/DiagramSpecBuilder.kt` | **신규** |
| `render/diagram/PlantUmlRenderer.kt` | **신규** |
| `render/diagram/MermaidRenderer.kt` | **신규** |
| `render/diagram/DiagramRenderer.kt` | **신규** — Stage 진입점 |
| `render/DocumentGenerator.kt` | `render(...)` 시그니처에 `diagrams: DiagramArtifactIndex` 추가 |
| `render/DocxGenerator.kt` | 다이어그램 삽입 로직 추가 |
| `render/XlsxGenerator.kt` | 다이어그램 삽입 로직 + `layerDiagrams` 시트 신설 |
| `render/MarkdownGenerator.kt` | Mermaid 코드 블록 삽입 |
| `domain/OutputLabels.kt` | 신규 라벨 키 추가 |
| `job/JobOrchestrator.kt` | 신규 단계 호출 추가, generator 호출 시 diagrams 전달 |
| `job/JobRecord` 관련 | `includeDiagrams: Boolean` 필드 추가 |
| `api/JobController.kt` | `includeDiagrams` 폼 파라미터 수신 |
| `api/dto/JobDtos.kt` | DTO 확장 |
| `config/AppProperties.kt` | `diagrams` 섹션 추가 |
| `web/upload.html` 등 | 폼/메시지 변경 |

---

## 4. 다이어그램 컴포넌트 상세

### 4.1 DiagramSpec (엔진 중립 표현)

```kotlin
enum class DiagramScope { LAYER, CLASS }

data class DiagramNode(
    val id: String,              // PlantUML/Mermaid 식별자 (ASCII 안전, 예: CLS_0001, EXT_ab12)
    val classId: String?,        // CLS-XXXX (외부면 null)
    val stereotype: String?,     // "Controller", "Service", ... (외부면 null)
    val displayName: String,     // 내부: ClassName, 외부: FQN 마지막 세그먼트
    val external: Boolean,
)

data class DiagramEdge(
    val fromId: String,
    val toId: String,
    val kind: RelationKind,
)

data class DiagramSpec(
    val scope: DiagramScope,
    val key: String,             // 파일명 베이스: "layer-controller", "class-CLS-0001"
    val title: String,           // "Controller Layer", "CLS-0001 UserController"
    val nodes: List<DiagramNode>,
    val edges: List<DiagramEdge>,
)
```

### 4.2 DiagramSpecBuilder

| 다이어그램 | 노드 | 엣지 |
|---|---|---|
| 계층 다이어그램 (계층당 1장) | 해당 계층의 모든 내부 클래스 + 그들이 extends/implements 하는 외부 노드 | 해당 계층 클래스가 source 인 모든 Relation |
| 클래스 다이어그램 (클래스당 1장) | 해당 클래스 + 직접 부모 노드들만 | 해당 클래스가 source 인 Relation 만 |

스킵 규칙
- 노드가 0개 → 산출물에 미포함, warning 없음
- 클래스 다이어그램에서 외부 부모 0개 + 내부 부모 0개 → 자기 자신만 그리는 의미 없는 다이어그램, 스킵
- 계층 다이어그램은 노드가 1개라도 그림 (그 박스 자체가 정보)

노드 ID 규칙
- 내부: `CLS_XXXX` (하이픈 → 언더스코어)
- 외부: `EXT_` + (해시 입력) 의 SHA-1 앞 6자 hex. 해시 입력은 `fqn` 이 있으면 `fqn`, 없으면 `simpleName` 사용. 같은 다이어그램 안에서 충돌 시 뒤에 카운터 `_2`, `_3` 부여

### 4.3 PlantUmlRenderer

- 의존성: `net.sourceforge.plantuml:plantuml-mit:1.2025.x` (가장 최근 1.2025 안정 버전, MIT 변형)
- 레이아웃: Smetana (Pure Java, Graphviz 불필요). `!pragma layout smetana` 헤더로 명시
- 출력 포맷: PNG (`FileFormat.PNG`)
- 폰트/크기: `skinparam dpi 96`, `skinparam classBackgroundColor white`, `skinparam classBorderColor #555555`
- 외부 노드 스타일: `skinparam class<<external>> { borderStyle dashed }`
- 박스 텍스트 형식
  - 내부: `class "<<Controller>>\nCLS-0001\nUserController" as CLS_0001`
  - 외부: `class "JpaRepository" as EXT_ab12cd <<external>>`
- 엣지
  - extends: `A --|> B`
  - implements: `A ..|> B`
- 출력: `ByteArrayOutputStream` → `ByteArray`

### 4.4 MermaidRenderer

- Mermaid `classDiagram` 문법
- 박스 텍스트 형식: `class CLS_0001["«Controller»\nCLS-0001\nUserController"]`
- 외부 노드: `class EXT_ab12cd["JpaRepository"]` + `style EXT_ab12cd stroke-dasharray: 5 5`
- 엣지
  - extends: `A --|> B : extends`
  - implements: `A ..|> B : implements`
- 출력: 문자열 (Markdown 생성기가 ` ```mermaid` 펜스로 감싸 삽입)

### 4.5 DiagramRenderer (Stage 진입점)

입력: `Program`, `outputDir = ${app.workdir}/jobs/{jobId}/diagrams/`, `includeDiagrams: Boolean`

동작
1. `includeDiagrams=false` → 빈 `DiagramArtifactIndex` 반환, PNG 0건
2. 모듈별로 `DiagramSpecBuilder.build(module)` 호출 → `List<DiagramSpec>`
3. 모듈 내 spec들은 **병렬 렌더링**. 실행기는 `Executors.newWorkStealingPool(parallelism)` 으로 확정 (PlantUML 렌더링이 CPU 바운드이므로 가상 스레드보다 코어 수 기반 work-stealing 이 적합)
   - parallelism = `app.diagrams.parallelism` (0이면 `Runtime.getRuntime().availableProcessors()` 사용)
4. 각 spec → `PlantUmlRenderer.render(spec)` → `${outputDir}/{module}/{spec.key}.png` 에 저장
5. 모듈 단위 progress 이벤트 발행
6. `MermaidRenderer` 는 여기서 호출하지 않음 (Markdown 생성 시 즉시 변환)
7. 결과로 `DiagramArtifactIndex` 반환

```kotlin
data class DiagramArtifactIndex(
    val layerDiagrams: Map<String, Map<Layer, Path?>>,   // module name → layer → PNG path (없으면 null)
    val classDiagrams: Map<String, Map<String, Path?>>,  // module name → classId → PNG path
    val specs: Map<String, Map<String, DiagramSpec>>,    // module name → spec.key → DiagramSpec
) {
    companion object {
        val EMPTY = DiagramArtifactIndex(emptyMap(), emptyMap(), emptyMap())
    }
}
```

---

## 5. 산출물 통합

### 5.1 DocumentGenerator 인터페이스

```kotlin
interface DocumentGenerator {
    val format: String
    fun render(
        program: Program,
        module: Module,
        diagrams: DiagramArtifactIndex,
        out: OutputStream,
    )
}
```

### 5.2 DocxGenerator

배치
- 표지 다음, 클래스 리스트 표 **앞** 에 `H2 {doc.title.layerDiagrams}` 섹션 + 계층 6개 순회. 각 계층은 `H3 {layer.controller}` 등 헤딩 + 해당 PNG 삽입. PNG null 인 계층은 통째로 스킵.
- 각 클래스 본문에서 헤더 표(클래스 ID/이름/설명) **바로 아래** 에 `classDiagrams[module][classId]` PNG 삽입. PNG null 이면 그 자리만 비움.

삽입 방법
- `XWPFRun.addPicture(InputStream, type=Document.PICTURE_TYPE_PNG, name, widthEmu, heightEmu)`
- 너비 가드: A4 가용 폭 ≈ 6.27 인치 = 5,715,000 EMU. PNG 실제 픽셀 너비를 ImageIO로 읽어 가용 폭을 초과하면 비율 유지 축소. 그 이하면 원본.

### 5.3 XlsxGenerator

시트 구조 변경
- 기존 3개 시트 (`cover`, `classList`, `classDesign`) 유지
- **신규 시트** `sheet.layerDiagrams` 를 `classList` 와 `classDesign` 사이에 삽입. 계층 6개 PNG를 세로로 나열 (계층 이름 헤더 + 빈 행 + 이미지).

`classDesign` 시트
- 각 클래스 블록의 헤더 행 아래에 빈 행 3~5줄을 할당하고 그 영역에 클래스 PNG 앵커. PNG null 이면 빈 행 추가 없이 다음 블록으로.

이미지 삽입 방법
- `workbook.addPicture(bytes, Workbook.PICTURE_TYPE_PNG)` → `Drawing.createPicture(anchor, pictureIdx)` → `picture.resize(scale)`
- 셀 단위 너비 기준 적정 scale 산출 (대략 6컬럼 너비 600px 기준)

### 5.4 MarkdownGenerator

- 클래스 리스트 표 앞에 `## {doc.title.layerDiagrams}` 섹션. 계층 6개 각각 `### {layer.controller}` 헤딩 + ` ```mermaid` 코드 블록. spec 없는 계층은 스킵.
- 각 클래스의 `## CLS-XXXX ClassName` 헤더 바로 아래에 Mermaid 코드 블록. spec 없으면 그 자리만 비움.
- spec 조회: `diagrams.specs[module.name][spec.key]` → `MermaidRenderer.render(spec)`

### 5.5 OutputLabels 신규 키

| 키 | ko | en |
|---|---|---|
| `doc.title.layerDiagrams` | 계층 다이어그램 | Layer Diagrams |
| `doc.title.classDiagram` | 클래스 다이어그램 | Class Diagram |
| `sheet.layerDiagrams` | 계층 다이어그램 | Layer Diagrams |
| `diagram.legend.external` | 외부 타입 | External Type |
| `warning.diagramFailed` | 다이어그램 렌더링 실패 | Diagram rendering failed |

### 5.6 API / 폼 변경

| 항목 | 변경 |
|---|---|
| `POST /api/v1/jobs` | multipart 파트에 `includeDiagrams: boolean` 추가 (선택, 기본 `true`) |
| `JobRecord` | `includeDiagrams: Boolean` 필드 추가 |
| `upload.html` | "클래스 다이어그램 포함" 체크박스 (기본 체크) |
| i18n | `page.upload.includeDiagrams` 키 추가 (ko/en) |

---

## 6. 에러 처리

| 상황 | 대응 |
|---|---|
| PlantUML 라이브러리 초기화 실패 | 작업 실패 처리 안 함. 전체 다이어그램 스킵 + 단일 warning(`code=DIAGRAM_ENGINE_UNAVAILABLE`) + 본문은 다이어그램 없이 정상 생성 |
| 개별 PNG 렌더 실패 | 해당 1장만 스킵. warning(`code=DIAGRAM_RENDER_FAILED`, context: `{module, scope, key}`) 누적, 산출물에 그 위치는 통째로 생략 |
| 노드 0개 다이어그램 | 정상 동작, 미삽입, warning 없음 |
| `RelationExtractor` source ID 매핑 실패 | 해당 Relation 1개만 스킵 + warning(`code=ORPHAN_RELATION`) |
| 같은 simpleName 다중 매칭 | external 로 강등 + warning(`code=AMBIGUOUS_TYPE_REF`) |

`includeDiagrams=false` 시에는 위 에러가 발생 자체가 불가능.

---

## 7. 비기능 / 성능

- PlantUML 렌더링은 CPU 바운드. 작은 다이어그램 기준 PNG 1장 100~300ms.
- 5,000 클래스 모듈 기준 클래스 다이어그램 5,000 + 계층 6 ≈ 5,006장 → 직렬 처리 시 수십 분. 모듈 내 다이어그램은 병렬 렌더링.
- 모듈 간은 직렬 (모듈별 진행도 이벤트가 한 번에 하나씩 흘러야 깨끗함)
- 결과 산출물 디렉터리는 기존 1시간 TTL 정리 정책에 그대로 포함 (`${jobId}/diagrams/` 도 함께 삭제)

신규 설정 키
```yaml
app:
  diagrams:
    enabled-default: true            # 폼 기본값
    parallelism: 0                   # 0 = 사용 가능 코어 수
    max-bytes-per-png: 5242880       # 5MB 가드, 초과 시 warning
```

---

## 8. 테스트 계획

| 레벨 | 테스트 |
|---|---|
| 단위 — `RelationExtractor` | extends/implements 추출, `java.lang.Object` 제외, import 기반 FQN 해석, 같은 모듈 내 simpleName 매칭, 모호한 simpleName external 강등 |
| 단위 — `DiagramSpecBuilder` | 계층 다이어그램 노드 구성(자기 계층 + 외부 부모), 클래스 다이어그램 노드 구성(자신 + 직접 부모), 빈 다이어그램(노드 0개) 스킵, 자기 자신만 있는 클래스 다이어그램 스킵 |
| 단위 — `PlantUmlRenderer` | 작은 spec → PNG 바이트 생성 성공(헤더 매직넘버 `0x89 0x50 0x4E 0x47`), 생성된 PlantUML 텍스트에 외부 노드 점선 스타일 들어가는지 검증 (텍스트 캡처 옵션) |
| 단위 — `MermaidRenderer` | spec → Mermaid 문자열에 ` ```mermaid` 펜스가 아닌 본문이 포함되고, `style EXT_... stroke-dasharray` 외부 노드 스타일 포함 |
| 통합 — `DiagramRenderer` | `includeDiagrams=false` 시 PNG 파일 0건, `true` 시 모듈 디렉터리에 PNG 생성. 병렬 처리 시 결과 일관성 |
| 통합 — generators | docx에서 `XWPFDocument` 로드 후 picture relationship 개수 검증, xlsx에서 `getAllPictures()` 검증, md에서 ` ```mermaid` 펜스 등장 횟수 검증 |
| E2E — fixture 모듈 | 기존 멀티모듈 fixture에 상속/구현 관계가 있는 클래스 추가, 산출물 3종 모두 다이어그램 흔적 검증 |
| i18n | 신규 라벨 키 5개가 ko/en 양쪽에 존재하는지 키 집합 일치 테스트 (기존 i18n 테스트에 자동 포함) |

---

## 9. PRD 영향 (반영해야 할 변경)

PRD §12 NEXT-03 항목을 "완료"로 옮기고 §13 수용 기준에 다음 항목 추가:

- [ ] `includeDiagrams=true` 업로드 시 docx에 클래스/계층 PNG가 본문 적정 위치에 임베드된다
- [ ] `includeDiagrams=true` 업로드 시 xlsx의 `classDesign` / `layerDiagrams` 시트에 PNG가 임베드된다
- [ ] `includeDiagrams=true` 업로드 시 md에 ` ```mermaid` 코드 블록이 클래스/계층 자리에 삽입된다
- [ ] `includeDiagrams=false` 업로드 시 산출물 3종에 다이어그램 흔적이 전혀 없다 (PNG 0건, mermaid 펜스 0건)
- [ ] `java.lang.Object` 는 어떤 다이어그램에도 노드로 등장하지 않는다
- [ ] 모듈 외부 상속/구현 대상은 점선 박스(docx/xlsx) 또는 `stroke-dasharray`(md/Mermaid)로 표시된다

---

## 10. 변경 이력

| 일자 | 버전 | 변경 내용 | 작성자 |
|---|---|---|---|
| 2026-05-19 | 1.0 | 초안 작성 (브레인스토밍 결과 반영) | ydj515 |
