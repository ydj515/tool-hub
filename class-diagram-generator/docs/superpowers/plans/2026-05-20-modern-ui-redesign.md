# Modern UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `upload`, `progress`, `result` 세 화면을 공통 디자인 시스템 위에서 재구성하고, 결과 화면 요약에 `createdAt` 및 경고 정보를 노출한다.

**Architecture:** Bootstrap 5는 유지하고, 그 위에 `tokens.css`와 `components.css`로 공통 시각 규칙을 올린다. 서버 렌더링은 Thymeleaf 템플릿을 그대로 사용하되, 기존 `data-*` 훅과 주요 `id`는 유지해서 프론트엔드 JS의 동작 안정성을 보존한다. 결과 데이터 계약은 `JobResultResponse`를 확장해 `createdAt`을 노출하고, 결과 페이지 JS는 이 메타데이터와 경고 목록을 렌더링한다.

**Tech Stack:** Kotlin 2.0.21, Spring Boot 3.3.5, Thymeleaf, WebJars Bootstrap 5.3.3, Bootstrap Icons, Vanilla JS, Kotest + MockMvc, Spotless, Detekt

---

## File Map

### Create

- `src/main/resources/static/css/mmu/tokens.css`
  - 라이트/다크 테마 토큰, 간격/반경/그림자 변수 정의
- `src/main/resources/static/css/mmu/components.css`
  - 상단 셸, hero 카드, surface 카드, meta 카드, 타임라인, 드롭존, 결과 카드 공통 스타일
- `src/main/resources/static/js/theme.js`
  - 테마 토글 초기화 및 `aria-label` 갱신

### Modify

- `src/main/kotlin/com/toolhub/classdiagramgenerator/job/JobStore.kt`
  - `JobRecord.createdAt` 추가
- `src/main/kotlin/com/toolhub/classdiagramgenerator/api/dto/JobDtos.kt`
  - `JobResultResponse.createdAt` 추가
- `src/main/kotlin/com/toolhub/classdiagramgenerator/api/JobController.kt`
  - 결과 응답에 `createdAt` 포함
- `src/main/resources/templates/upload.html`
  - 업로드 정보 구조를 2열 카드 레이아웃으로 재구성
- `src/main/resources/templates/progress.html`
  - hero + 파이프라인 카드 + 상태 카드 레이아웃으로 재구성
- `src/main/resources/templates/result.html`
  - 요약 메타 카드, 경고 영역, 결과 카드 레이아웃 강화
- `src/main/resources/static/css/app.css`
  - Bootstrap primary/focus 재스킨과 페이지별 미세 조정
- `src/main/resources/static/js/upload.js`
  - 드롭존 invalid 상태 반영
- `src/main/resources/static/js/progress.js`
  - 빈 상태 안내 / 경고 상태 렌더링 개선
- `src/main/resources/static/js/result.js`
  - `createdAt`, 경고 카드, 개선된 결과 카드 렌더링
- `src/main/resources/messages.properties`
  - 한국어 신규 문구 추가
- `src/main/resources/messages_en.properties`
  - 영어 신규 문구 추가
- `src/test/kotlin/com/toolhub/classdiagramgenerator/api/JobControllerTest.kt`
  - `createdAt` 포함 결과 응답 테스트 추가
- `src/test/kotlin/com/toolhub/classdiagramgenerator/web/ViewControllerTest.kt`
  - 공통 자산, 상단 셸, 페이지별 구조 렌더링 테스트 추가

### Keep an Eye On

- `src/test/kotlin/com/toolhub/classdiagramgenerator/job/JobStoreTest.kt`
  - `JobRecord` 시그니처 변경 시 컴파일 영향 확인
- `README.md`
  - 새 실행 방식이 아니라면 문서 수정 불필요

---

### Task 1: 결과 메타데이터 계약 확장

**Files:**
- Modify: `src/main/kotlin/com/toolhub/classdiagramgenerator/job/JobStore.kt`
- Modify: `src/main/kotlin/com/toolhub/classdiagramgenerator/api/dto/JobDtos.kt`
- Modify: `src/main/kotlin/com/toolhub/classdiagramgenerator/api/JobController.kt`
- Test: `src/test/kotlin/com/toolhub/classdiagramgenerator/api/JobControllerTest.kt`

- [ ] **Step 1: `createdAt`가 없는 현재 응답을 고정하는 실패 테스트를 추가한다**

```kotlin
"GET /api/v1/jobs/{id}/result includes createdAt and warnings for summary cards" {
    val jobId = UUID.randomUUID()
    val workDir = Files.createTempDirectory("job-result-summary-test")
    val artifactPath = workDir.resolve("artifact.txt")
    Files.write(artifactPath, ByteArray(1536) { 'a'.code.toByte() })

    jobStore.create(
        JobRecord(
            id = jobId,
            programName = "demo",
            version = "v1.0",
            language = OutputLanguage.KO,
            formats = listOf("md"),
            includeDiagrams = false,
            status = JobStatus.DONE,
            workDir = workDir,
            expiresAt = Instant.parse("2026-05-19T06:00:00Z"),
            warnings =
                mutableListOf(
                    Warning(
                        code = "SOURCE_ENCODING_FALLBACK",
                        message = "UTF-16BE source decoded with fallback",
                    ),
                ),
            artifacts =
                mutableListOf(
                    ArtifactRecord(
                        module = "demo",
                        format = "md",
                        filename = "artifact.txt",
                        path = artifactPath,
                        sizeBytes = 1536,
                    ),
                ),
        ),
    )

    mockMvc.get("/api/v1/jobs/$jobId/result").andExpect {
        status { isOk() }
        jsonPath("$.createdAt") { exists() }
        jsonPath("$.warnings[0].code") { value("SOURCE_ENCODING_FALLBACK") }
        jsonPath("$.warnings[0].message") { value("UTF-16BE source decoded with fallback") }
    }
}
```

- [ ] **Step 2: 실패를 확인한다**

Run: `./gradlew test --tests "*JobControllerTest*"`

Expected: `$.createdAt` 경로가 없다는 이유로 FAIL

- [ ] **Step 3: `JobRecord`와 결과 DTO/컨트롤러를 최소 범위로 확장한다**

`src/main/kotlin/com/toolhub/classdiagramgenerator/job/JobStore.kt`

```kotlin
data class JobRecord(
    val id: UUID,
    val programName: String,
    val version: String,
    val language: OutputLanguage,
    val formats: List<String>,
    val includeDiagrams: Boolean,
    var status: JobStatus,
    val workDir: Path,
    val createdAt: Instant = Instant.now(),
    var expiresAt: Instant? = null,
    val artifacts: MutableList<ArtifactRecord> = mutableListOf(),
    val warnings: MutableList<Warning> = mutableListOf(),
    var errorCode: String? = null,
    var errorMessage: String? = null,
)
```

`src/main/kotlin/com/toolhub/classdiagramgenerator/api/dto/JobDtos.kt`

```kotlin
data class JobResultResponse(
    val jobId: UUID,
    val createdAt: Instant,
    val expiresAt: Instant?,
    val warnings: List<Warning>,
    val artifacts: List<ArtifactSummary>,
    val bundleUrl: String,
)
```

`src/main/kotlin/com/toolhub/classdiagramgenerator/api/JobController.kt`

```kotlin
return JobResultResponse(
    jobId = id,
    createdAt = rec.createdAt,
    expiresAt = rec.expiresAt,
    warnings = rec.warnings,
    artifacts = artifacts,
    bundleUrl = "/api/v1/jobs/$id/bundle",
)
```

- [ ] **Step 4: 테스트를 다시 돌려 통과를 확인한다**

Run: `./gradlew test --tests "*JobControllerTest*"`

Expected: `BUILD SUCCESSFUL`

- [ ] **Step 5: 변경을 커밋한다**

```bash
git add \
  src/main/kotlin/com/toolhub/classdiagramgenerator/job/JobStore.kt \
  src/main/kotlin/com/toolhub/classdiagramgenerator/api/dto/JobDtos.kt \
  src/main/kotlin/com/toolhub/classdiagramgenerator/api/JobController.kt \
  src/test/kotlin/com/toolhub/classdiagramgenerator/api/JobControllerTest.kt
git commit -m "feat(class-diagram-generator): expose result createdAt metadata"
```

---

### Task 2: 공통 디자인 시스템 자산과 테마 토글 기반을 추가한다

**Files:**
- Create: `src/main/resources/static/css/mmu/tokens.css`
- Create: `src/main/resources/static/css/mmu/components.css`
- Create: `src/main/resources/static/js/theme.js`
- Modify: `src/main/resources/templates/upload.html`
- Modify: `src/main/resources/templates/progress.html`
- Modify: `src/main/resources/templates/result.html`
- Modify: `src/main/resources/messages.properties`
- Modify: `src/main/resources/messages_en.properties`
- Test: `src/test/kotlin/com/toolhub/classdiagramgenerator/web/ViewControllerTest.kt`

- [ ] **Step 1: 공통 자산과 테마 토글이 없는 현재 상태를 잡는 실패 테스트를 추가한다**

```kotlin
"GET / renders modern UI assets and theme toggle shell" {
    mockMvc.get("/?lang=en").andExpect {
        status { isOk() }
        content { string(org.hamcrest.Matchers.containsString("/css/mmu/tokens.css")) }
        content { string(org.hamcrest.Matchers.containsString("/css/mmu/components.css")) }
        content { string(org.hamcrest.Matchers.containsString("/js/theme.js")) }
        content { string(org.hamcrest.Matchers.containsString("mmu-body")) }
        content { string(org.hamcrest.Matchers.containsString("mmu-topbar")) }
        content { string(org.hamcrest.Matchers.containsString("data-theme-toggle")) }
    }
}
```

- [ ] **Step 2: 실패를 확인한다**

Run: `./gradlew test --tests "*ViewControllerTest*"`

Expected: MMU CSS/JS 링크 또는 `data-theme-toggle`가 없어서 FAIL

- [ ] **Step 3: 토큰과 공통 셸/카드/버튼/메타 카드 기본 스타일 파일을 만든다**

`src/main/resources/static/css/mmu/tokens.css`

```css
:root {
    --mmu-bg: #f5f7fb;
    --mmu-surface: rgba(255, 255, 255, 0.94);
    --mmu-surface-strong: #ffffff;
    --mmu-border: rgba(15, 23, 42, 0.08);
    --mmu-text: #0f172a;
    --mmu-text-muted: #64748b;
    --mmu-accent: #6366f1;
    --mmu-accent-strong: #4f46e5;
    --mmu-accent-soft: rgba(99, 102, 241, 0.16);
    --mmu-success: #10b981;
    --mmu-warning: #f59e0b;
    --mmu-danger: #ef4444;
    --mmu-shadow-soft: 0 14px 30px rgba(15, 23, 42, 0.06);
    --mmu-shadow-md: 0 24px 56px rgba(15, 23, 42, 0.1);
    --mmu-radius-lg: 1.25rem;
    --mmu-radius-xl: 1.5rem;
    --mmu-space-3: 0.75rem;
    --mmu-space-4: 1rem;
    --mmu-space-6: 1.5rem;
    --mmu-space-8: 2rem;
}

html[data-theme="dark"] {
    --mmu-bg: #0b1220;
    --mmu-surface: rgba(15, 23, 42, 0.88);
    --mmu-surface-strong: #111827;
    --mmu-border: rgba(148, 163, 184, 0.18);
    --mmu-text: #e5eefc;
    --mmu-text-muted: #9fb0c7;
    --mmu-accent-soft: rgba(99, 102, 241, 0.28);
    --mmu-shadow-soft: 0 16px 32px rgba(2, 6, 23, 0.35);
    --mmu-shadow-md: 0 24px 56px rgba(2, 6, 23, 0.5);
}
```

`src/main/resources/static/css/mmu/components.css`

```css
.mmu-body {
    min-height: 100vh;
    background:
        radial-gradient(circle at top right, rgba(99, 102, 241, 0.08), transparent 34%),
        linear-gradient(180deg, #fbfcff 0%, var(--mmu-bg) 100%);
    color: var(--mmu-text);
}

.mmu-topbar {
    position: sticky;
    top: 0;
    z-index: 1030;
    background: color-mix(in srgb, var(--mmu-surface-strong) 82%, transparent);
    backdrop-filter: blur(14px);
    border-bottom: 1px solid var(--mmu-border);
}

.mmu-shell {
    padding-top: var(--mmu-space-8);
    padding-bottom: calc(var(--mmu-space-8) * 1.5);
}

.mmu-hero-card,
.mmu-surface-card,
.mmu-meta-card {
    border: 1px solid var(--mmu-border);
    background: var(--mmu-surface);
    border-radius: var(--mmu-radius-xl);
    box-shadow: var(--mmu-shadow-soft);
}

.mmu-hero-card { padding: 2rem; }
.mmu-surface-card { padding: 1.5rem; }
.mmu-meta-card { padding: 1rem 1.125rem; }

.mmu-toolbar {
    margin-left: auto;
    display: inline-flex;
    align-items: center;
    gap: 0.75rem;
}

.mmu-theme-toggle {
    width: 2.75rem;
    height: 2.75rem;
    border: 1px solid var(--mmu-border);
    border-radius: 999px;
    background: var(--mmu-surface-strong);
    color: var(--mmu-text);
}
```

`src/main/resources/static/js/theme.js`

```javascript
const html = document.documentElement;
const toggle = document.querySelector('[data-theme-toggle]');
const lightLabel = toggle?.dataset.themeLabelLight ?? '라이트 모드로 전환';
const darkLabel = toggle?.dataset.themeLabelDark ?? '다크 모드로 전환';

function applyTheme(theme) {
    html.dataset.theme = theme;
    localStorage.setItem('cdg-theme', theme);
    if (!toggle) return;
    toggle.setAttribute('aria-label', theme === 'dark' ? lightLabel : darkLabel);
    toggle.dataset.themeState = theme;
}

if (toggle) {
    toggle.addEventListener('click', () => {
        applyTheme(html.dataset.theme === 'dark' ? 'light' : 'dark');
    });
}
```

- [ ] **Step 4: 세 템플릿에 공통 자산과 헤더 셸을 연결하고 테마 토글 메시지를 추가한다**

공통 `<head>` / `<body>` 구조를 세 템플릿에 맞춰 다음 패턴으로 바꾼다.

```html
<head>
    <meta charset="UTF-8">
    <script>
        (function () {
            const stored = localStorage.getItem('cdg-theme');
            const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            document.documentElement.dataset.theme = stored ?? (systemDark ? 'dark' : 'light');
        }());
    </script>
    <title th:text="#{page.upload.title}">Class Diagram Generator</title>
    <link rel="icon" href="/favicon.ico" th:href="@{/favicon.ico}">
    <link rel="stylesheet" href="/webjars/bootstrap/dist/css/bootstrap.min.css" th:href="@{/webjars/bootstrap/dist/css/bootstrap.min.css}">
    <link rel="stylesheet" href="/webjars/bootstrap-icons/font/bootstrap-icons.css" th:href="@{/webjars/bootstrap-icons/font/bootstrap-icons.css}">
    <link rel="stylesheet" href="/css/mmu/tokens.css" th:href="@{/css/mmu/tokens.css}">
    <link rel="stylesheet" href="/css/mmu/components.css" th:href="@{/css/mmu/components.css}">
    <link rel="stylesheet" href="/css/app.css" th:href="@{/css/app.css}">
</head>
<body class="mmu-body">
<nav class="navbar navbar-expand mmu-topbar">
    <div class="container">
        <a class="navbar-brand fw-semibold" href="/">class-diagram-generator</a>
        <span class="mmu-page-context" th:text="#{page.upload.title}">Class Diagram Generator</span>
        <div class="mmu-toolbar">
            <div class="lang-toggle" role="group" aria-label="Locale selector">
                <a
                    href="?lang=ko"
                    class="lang-toggle__option"
                    data-lang-option="ko"
                    th:attr="data-active=${#locale.language == 'ko'}"
                    th:classappend="${#locale.language == 'ko'} ? ' is-active' : ''">KO</a>
                <a
                    href="?lang=en"
                    class="lang-toggle__option"
                    data-lang-option="en"
                    th:attr="data-active=${#locale.language == 'en'}"
                    th:classappend="${#locale.language == 'en'} ? ' is-active' : ''">EN</a>
            </div>
            <button
                type="button"
                class="mmu-theme-toggle"
                data-theme-toggle
                th:attr="data-theme-label-light=#{page.theme.light},data-theme-label-dark=#{page.theme.dark}">
                <i class="bi bi-moon-stars" aria-hidden="true"></i>
            </button>
        </div>
    </div>
</nav>
<script src="/js/theme.js" th:src="@{/js/theme.js}"></script>
```

`src/main/resources/messages.properties`

```properties
page.theme.light=라이트 모드로 전환
page.theme.dark=다크 모드로 전환
```

`src/main/resources/messages_en.properties`

```properties
page.theme.light=Switch to light mode
page.theme.dark=Switch to dark mode
```

- [ ] **Step 5: View 테스트를 다시 돌려 통과를 확인한다**

Run: `./gradlew test --tests "*ViewControllerTest*"`

Expected: `BUILD SUCCESSFUL`

- [ ] **Step 6: 변경을 커밋한다**

```bash
git add \
  src/main/resources/static/css/mmu/tokens.css \
  src/main/resources/static/css/mmu/components.css \
  src/main/resources/static/js/theme.js \
  src/main/resources/templates/upload.html \
  src/main/resources/templates/progress.html \
  src/main/resources/templates/result.html \
  src/main/resources/messages.properties \
  src/main/resources/messages_en.properties \
  src/test/kotlin/com/toolhub/classdiagramgenerator/web/ViewControllerTest.kt
git commit -m "feat(class-diagram-generator): add shared modern UI foundation"
```

---

### Task 3: Upload 화면을 카드 중심 레이아웃으로 재구성한다

**Files:**
- Modify: `src/main/resources/templates/upload.html`
- Modify: `src/main/resources/static/css/mmu/components.css`
- Modify: `src/main/resources/static/css/app.css`
- Modify: `src/main/resources/static/js/upload.js`
- Modify: `src/main/resources/messages.properties`
- Modify: `src/main/resources/messages_en.properties`
- Test: `src/test/kotlin/com/toolhub/classdiagramgenerator/web/ViewControllerTest.kt`

- [ ] **Step 1: 업로드 화면의 새 정보 구조를 검증하는 실패 테스트를 추가한다**

```kotlin
"GET / renders grouped upload cards and upload action hint" {
    mockMvc.get("/?lang=ko").andExpect {
        status { isOk() }
        content { string(org.hamcrest.Matchers.containsString("data-upload-section=\"project\"")) }
        content { string(org.hamcrest.Matchers.containsString("data-upload-section=\"options\"")) }
        content { string(org.hamcrest.Matchers.containsString("data-upload-section=\"source\"")) }
        content { string(org.hamcrest.Matchers.containsString("data-upload-action-hint")) }
        content { string(org.hamcrest.Matchers.containsString("data-upload-dropzone")) }
    }
}
```

- [ ] **Step 2: 실패를 확인한다**

Run: `./gradlew test --tests "*ViewControllerTest*"`

Expected: 새 `data-upload-section` 마커가 없어 FAIL

- [ ] **Step 3: `upload.html`을 hero + 2열 카드 구조로 재작성하되 기존 JS 훅을 유지한다**

```html
<main class="container mmu-shell">
    <section class="mmu-hero-card mmu-page-hero">
        <p class="mmu-eyebrow" th:text="#{page.upload.section}">Upload</p>
        <h1 class="page-title" th:text="#{page.upload.title}">클래스 설계서 자동 생성</h1>
        <p class="mmu-hero-copy" th:text="#{page.upload.lead}">
            Java 소스 ZIP을 업로드하면 문서와 다이어그램 산출물을 자동으로 생성합니다.
        </p>
    </section>

    <form id="uploadForm" class="mmu-upload-layout mt-4" enctype="multipart/form-data">
        <div class="mmu-upload-stack">
            <section class="mmu-surface-card" data-upload-section="project">
                <div class="mmu-section-heading">
                    <h2 th:text="#{page.upload.projectInfo}">프로젝트 정보</h2>
                    <p th:text="#{page.upload.projectInfo.help}">문서 제목과 언어를 결정합니다.</p>
                </div>
                <div class="mmu-form-grid">
                    <div>
                        <label class="form-label" th:text="#{page.upload.programName}">프로그램명</label>
                        <input class="form-control" name="programName" required pattern="^[A-Za-z0-9_\-]+$" maxlength="64">
                    </div>
                    <div>
                        <label class="form-label" th:text="#{page.upload.version}">버전</label>
                        <input class="form-control" name="version" required pattern="^[A-Za-z0-9._\-]+$" maxlength="32" value="v1.0">
                    </div>
                    <div>
                        <label class="form-label" th:text="#{page.upload.language}">산출물 언어</label>
                        <select class="form-select" name="language">
                            <option value="ko" th:selected="${#locale.language == 'ko'}">한국어</option>
                            <option value="en" th:selected="${#locale.language == 'en'}">English</option>
                        </select>
                    </div>
                </div>
            </section>

            <section class="mmu-surface-card" data-upload-section="options">
                <div class="mmu-section-heading">
                    <h2 th:text="#{page.upload.outputOptions}">출력 설정</h2>
                    <p th:text="#{page.upload.outputOptions.help}">생성할 문서 형식과 다이어그램 포함 여부를 선택합니다.</p>
                </div>
                <div class="mmu-chip-grid">
                    <label class="form-check-card">
                        <input type="checkbox" class="form-check-input" name="formats" value="docx" checked>
                        <span>docx</span>
                    </label>
                    <label class="form-check-card">
                        <input type="checkbox" class="form-check-input" name="formats" value="xlsx" checked>
                        <span>xlsx</span>
                    </label>
                    <label class="form-check-card">
                        <input type="checkbox" class="form-check-input" name="formats" value="md" checked>
                        <span>md</span>
                    </label>
                </div>
                <div class="mmu-toggle-row mt-4">
                    <div class="form-check">
                        <input class="form-check-input" type="checkbox" name="includeDiagrams" id="includeDiagrams" value="true" checked>
                        <label class="form-check-label" for="includeDiagrams" th:text="#{page.upload.includeDiagrams}">클래스 다이어그램 포함</label>
                    </div>
                </div>
            </section>
        </div>

        <div class="mmu-upload-stack">
            <section class="mmu-surface-card" data-upload-section="source">
                <div class="mmu-section-heading">
                    <h2 th:text="#{page.upload.sourceUpload}">소스 업로드</h2>
                    <p th:text="#{page.upload.sourceUpload.help}">ZIP 파일 한 개만 업로드할 수 있습니다.</p>
                </div>
                <label
                    class="file-dropzone mmu-dropzone"
                    for="fileInput"
                    data-upload-dropzone
                    tabindex="0">
                    <input
                        id="fileInput"
                        type="file"
                        class="visually-hidden"
                        name="file"
                        accept=".zip"
                        required
                        data-upload-input
                        th:attr="data-invalid-type-message=#{page.upload.dropzone.invalid}">
                    <span class="file-dropzone__body" data-dropzone-default>
                        <i class="bi bi-cloud-arrow-up file-dropzone__icon" aria-hidden="true"></i>
                        <span class="file-dropzone__title" th:text="#{page.upload.dropzone.title}">ZIP 파일을 드래그하거나 클릭해서 선택하세요</span>
                        <span class="file-dropzone__hint" th:text="#{page.upload.dropzone.hint}">.zip 파일만 업로드할 수 있습니다</span>
                    </span>
                    <span class="file-dropzone__success" data-dropzone-selected>
                        <button
                            type="button"
                            class="file-dropzone__remove"
                            data-upload-remove
                            th:attr="aria-label=#{page.upload.dropzone.remove}, title=#{page.upload.dropzone.remove}">
                            <i class="bi bi-x-lg" aria-hidden="true"></i>
                        </button>
                        <i class="bi bi-check-circle-fill file-dropzone__success-icon" aria-hidden="true"></i>
                        <span class="file-dropzone__title" th:text="#{page.upload.dropzone.selected}">파일이 첨부되었습니다</span>
                        <span class="file-dropzone__meta">
                            <span
                                class="file-dropzone__filename-strong"
                                data-upload-filename
                                th:attr="data-empty-label=#{page.upload.dropzone.empty}"></span>
                            <span class="file-dropzone__dot" aria-hidden="true">·</span>
                            <span class="file-dropzone__size" data-upload-size></span>
                        </span>
                        <button
                            type="button"
                            class="btn btn-outline-primary btn-sm file-dropzone__change"
                            data-upload-change
                            th:text="#{page.upload.dropzone.change}">다른 파일 선택</button>
                    </span>
                </label>
            </section>

            <section class="mmu-upload-submit">
                <button type="submit" class="btn btn-primary btn-lg px-4" th:text="#{page.upload.submit}">업로드</button>
                <p class="mmu-action-hint mt-3" data-upload-action-hint th:text="#{page.upload.submitHint}">
                    입력 ZIP 하나로 DOCX, XLSX, MD 산출물을 생성합니다.
                </p>
            </section>
        </div>
    </form>
</main>
```

- [ ] **Step 4: 업로드 전용 스타일과 invalid 상태 토글을 추가한다**

`src/main/resources/static/css/mmu/components.css`

```css
.mmu-upload-layout {
    display: grid;
    grid-template-columns: minmax(0, 1.1fr) minmax(0, 0.9fr);
    gap: 2rem;
}

.mmu-upload-stack {
    display: grid;
    gap: 1.5rem;
    min-width: 0;
}

.mmu-form-grid {
    display: grid;
    grid-template-columns: minmax(0, 2fr) minmax(0, 1fr) minmax(0, 1fr);
    gap: 1.5rem 2rem;
}

.mmu-chip-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.875rem;
}

.mmu-dropzone.is-invalid {
    border-color: rgba(239, 68, 68, 0.48);
    background: linear-gradient(180deg, rgba(254, 242, 242, 0.92), rgba(255, 255, 255, 0.98));
}

@media (max-width: 991.98px) {
    .mmu-upload-layout,
    .mmu-form-grid,
    .mmu-chip-grid {
        grid-template-columns: 1fr;
    }
}
```

`src/main/resources/static/js/upload.js`

```javascript
const syncValidity = (file) => {
    if (!fileInput || !dropzone) return;
    const invalid = Boolean(file && !isZipFile(file));
    fileInput.setCustomValidity(invalid ? invalidTypeMessage : '');
    dropzone.classList.toggle('is-invalid', invalid);
};

const updateFilename = (file) => {
    if (filename) filename.textContent = file ? file.name : emptyLabel;
    if (sizeEl) sizeEl.textContent = file ? formatBytes(file.size) : '';
    if (!dropzone) return;
    const selected = Boolean(file && isZipFile(file));
    dropzone.classList.toggle('is-selected', selected);
    dropzone.classList.toggle('is-invalid', Boolean(file) && !selected);
};
```

메시지 키도 함께 추가한다.

```properties
page.upload.section=Upload
page.upload.lead=Java 소스 ZIP을 업로드하면 문서와 다이어그램 산출물을 자동으로 생성합니다
page.upload.projectInfo=프로젝트 정보
page.upload.projectInfo.help=문서 제목, 버전, 산출물 언어를 설정합니다
page.upload.outputOptions=출력 설정
page.upload.outputOptions.help=생성할 문서 형식과 다이어그램 포함 여부를 선택합니다
page.upload.sourceUpload=소스 업로드
page.upload.sourceUpload.help=ZIP 파일 한 개만 업로드할 수 있습니다
page.upload.submitHint=입력 ZIP 하나로 DOCX, XLSX, MD 산출물을 생성합니다
```

`src/main/resources/messages_en.properties`

```properties
page.upload.section=Upload
page.upload.lead=Upload one Java source ZIP to generate documents and diagram artifacts automatically
page.upload.projectInfo=Project Details
page.upload.projectInfo.help=Set the document title, version, and output language
page.upload.outputOptions=Output Options
page.upload.outputOptions.help=Choose which documents to generate and whether to include diagrams
page.upload.sourceUpload=Source Upload
page.upload.sourceUpload.help=Only one ZIP file can be uploaded
page.upload.submitHint=One input ZIP generates DOCX, XLSX, and Markdown artifacts
```

- [ ] **Step 5: 업로드 관련 View 테스트를 다시 돌려 통과를 확인한다**

Run: `./gradlew test --tests "*ViewControllerTest*"`

Expected: `BUILD SUCCESSFUL`

- [ ] **Step 6: 변경을 커밋한다**

```bash
git add \
  src/main/resources/templates/upload.html \
  src/main/resources/static/css/mmu/components.css \
  src/main/resources/static/css/app.css \
  src/main/resources/static/js/upload.js \
  src/main/resources/messages.properties \
  src/main/resources/messages_en.properties \
  src/test/kotlin/com/toolhub/classdiagramgenerator/web/ViewControllerTest.kt
git commit -m "feat(class-diagram-generator): redesign upload page layout"
```

---

### Task 4: Progress 화면을 상태 대시보드 형태로 재구성한다

**Files:**
- Modify: `src/main/resources/templates/progress.html`
- Modify: `src/main/resources/static/css/mmu/components.css`
- Modify: `src/main/resources/static/css/app.css`
- Modify: `src/main/resources/static/js/progress.js`
- Modify: `src/main/resources/messages.properties`
- Modify: `src/main/resources/messages_en.properties`
- Test: `src/test/kotlin/com/toolhub/classdiagramgenerator/web/ViewControllerTest.kt`

- [ ] **Step 1: 진행 화면의 hero/상태 카드 구조를 검증하는 실패 테스트를 추가한다**

```kotlin
"GET /jobs/{id} renders progress hero, status card, and timeline shell" {
    mockMvc.get("/jobs/00000000-0000-0000-0000-000000000001").andExpect {
        status { isOk() }
        content { string(org.hamcrest.Matchers.containsString("data-progress-hero")) }
        content { string(org.hamcrest.Matchers.containsString("data-progress-status")) }
        content { string(org.hamcrest.Matchers.containsString("data-progress-timeline")) }
        content { string(org.hamcrest.Matchers.containsString("data-progress-note")) }
    }
}
```

- [ ] **Step 2: 실패를 확인한다**

Run: `./gradlew test --tests "*ViewControllerTest*"`

Expected: `data-progress-hero` 또는 `data-progress-status` 마커가 없어 FAIL

- [ ] **Step 3: `progress.html`을 hero + 2컬럼 본문 구조로 재작성한다**

```html
<main class="container mmu-shell">
    <section class="mmu-hero-card mmu-progress-hero" data-progress-hero>
        <p class="mmu-eyebrow" th:text="#{page.progress.section}">Progress</p>
        <h1 class="page-title" th:text="#{page.progress.title}">진행 상태</h1>
        <p class="mmu-hero-copy" th:text="#{page.progress.lead}">
            업로드한 소스를 분석하고 산출물을 생성하는 중입니다.
        </p>
        <div class="percent-hero mt-4">
            <strong id="progressPercent" class="percent-hero__value">0%</strong>
            <span id="stage" class="percent-hero__stage">-</span>
        </div>
        <div class="progress progress-lg mt-3">
            <div id="bar" class="progress-bar" role="progressbar" style="width: 0%"></div>
        </div>
        <p class="mmu-status-note mt-3" data-progress-note th:text="#{page.progress.autoRedirect}">
            완료되면 결과 화면으로 자동 이동합니다.
        </p>
    </section>

    <section class="mmu-progress-layout mt-4">
        <article class="mmu-surface-card" data-progress-timeline>
            <h2 class="mmu-section-title" th:text="#{page.progress.pipeline}">처리 단계</h2>
            <ol class="timeline" id="timeline" aria-label="pipeline timeline">
                <li class="timeline__step" data-step="intake">
                    <span class="timeline__dot"><i class="bi bi-box-arrow-in-down" aria-hidden="true"></i></span>
                    <span class="timeline__label" th:text="#{page.progress.step.intake}">Intake</span>
                </li>
                <li class="timeline__step" data-step="analysis">
                    <span class="timeline__dot"><i class="bi bi-braces" aria-hidden="true"></i></span>
                    <span class="timeline__label" th:text="#{page.progress.step.analysis}">Analysis</span>
                </li>
                <li class="timeline__step" data-step="diagrams">
                    <span class="timeline__dot"><i class="bi bi-diagram-3" aria-hidden="true"></i></span>
                    <span class="timeline__label" th:text="#{page.progress.step.diagrams}">Diagrams</span>
                </li>
                <li class="timeline__step" data-step="rendering">
                    <span class="timeline__dot"><i class="bi bi-file-earmark-richtext" aria-hidden="true"></i></span>
                    <span class="timeline__label" th:text="#{page.progress.step.rendering}">Rendering</span>
                </li>
                <li class="timeline__step" data-step="packaging">
                    <span class="timeline__dot"><i class="bi bi-box-seam" aria-hidden="true"></i></span>
                    <span class="timeline__label" th:text="#{page.progress.step.packaging}">Packaging</span>
                </li>
            </ol>
        </article>

        <article class="mmu-surface-card" data-progress-status>
            <h2 class="mmu-section-title" th:text="#{page.progress.statusTitle}">상태 안내</h2>
            <div id="warnings" class="mmu-warning-stack"></div>
        </article>
    </section>
</main>
<script th:inline="javascript">
    window.__jobId = /*[[${jobId}]]*/ '';
    window.__progressStageLabels = {
        EXTRACTING: /*[[#{page.progress.stage.extracting}]]*/ 'Extracting',
        DETECTING_MODULES: /*[[#{page.progress.stage.detectingModules}]]*/ 'Detecting Modules',
        PARSING: /*[[#{page.progress.stage.parsing}]]*/ 'Parsing Sources',
        CLASSIFYING: /*[[#{page.progress.stage.classifying}]]*/ 'Classifying Layers',
        ASSIGNING_IDS: /*[[#{page.progress.stage.assigningIds}]]*/ 'Assigning IDs',
        EXTRACTING_RELATIONS: /*[[#{page.progress.stage.extractingRelations}]]*/ 'Extracting Relations',
        RENDERING_DIAGRAMS: /*[[#{page.progress.stage.renderingDiagrams}]]*/ 'Rendering Diagrams',
        RENDERING_DOCX: /*[[#{page.progress.stage.renderingDocx}]]*/ 'Rendering DOCX',
        RENDERING_XLSX: /*[[#{page.progress.stage.renderingXlsx}]]*/ 'Rendering XLSX',
        RENDERING_MD: /*[[#{page.progress.stage.renderingMd}]]*/ 'Rendering Markdown',
        PACKAGING: /*[[#{page.progress.stage.packaging}]]*/ 'Packaging Results'
    };
    window.__progressUiLabels = {
        idle: /*[[#{page.progress.statusIdle}]]*/ 'Work has started and is waiting for the next stage event.'
    };
</script>
```

- [ ] **Step 4: 타임라인 반응형과 빈 상태/경고 렌더링을 추가한다**

`src/main/resources/static/css/mmu/components.css`

```css
.mmu-progress-layout {
    display: grid;
    grid-template-columns: minmax(0, 1.2fr) minmax(0, 0.8fr);
    gap: 1.5rem;
}

.mmu-warning-stack {
    display: grid;
    gap: 0.875rem;
}

.mmu-warning-card,
.mmu-info-card {
    padding: 1rem 1.125rem;
    border-radius: 1rem;
    border: 1px solid var(--mmu-border);
    background: color-mix(in srgb, var(--mmu-surface-strong) 90%, transparent);
}

@media (max-width: 991.98px) {
    .mmu-progress-layout {
        grid-template-columns: 1fr;
    }

    .timeline {
        grid-template-columns: 1fr;
        gap: 1rem;
    }

    .timeline__step {
        grid-template-columns: auto 1fr;
        justify-items: start;
        text-align: left;
    }

    .timeline__step::before {
        left: 0.85rem;
        top: -0.8rem;
        width: 2px;
        height: calc(100% + 0.8rem);
    }
}
```

`src/main/resources/static/js/progress.js`

```javascript
const progressUiLabels = window.__progressUiLabels ?? {};

function renderIdleState() {
    warnings.replaceChildren();
    const div = document.createElement('div');
    div.className = 'mmu-info-card';
    div.textContent = progressUiLabels.idle ?? '작업을 시작했고 다음 단계 이벤트를 기다리는 중입니다.';
    warnings.appendChild(div);
}

function appendAlert(parent, cls, text) {
    const div = document.createElement('div');
    div.className = `mmu-warning-card ${cls}`;
    div.textContent = text;
    parent.appendChild(div);
}

renderIdleState();

es.addEventListener('warning', (e) => {
    const data = parseEvent(e.data);
    if (warnings.querySelector('.mmu-info-card')) {
        warnings.replaceChildren();
    }
    appendAlert(warnings, 'is-warning', `${data.code}: ${data.message}`);
});
```

메시지 키를 추가한다.

```properties
page.progress.section=Progress
page.progress.lead=업로드한 소스를 분석하고 산출물을 생성하는 중입니다
page.progress.pipeline=처리 단계
page.progress.statusTitle=상태 안내
page.progress.autoRedirect=완료되면 결과 화면으로 자동 이동합니다
page.progress.statusIdle=작업을 시작했고 다음 단계 이벤트를 기다리는 중입니다
```

`src/main/resources/messages_en.properties`

```properties
page.progress.section=Progress
page.progress.lead=The uploaded sources are being analyzed and transformed into output artifacts
page.progress.pipeline=Pipeline
page.progress.statusTitle=Status
page.progress.autoRedirect=You will be redirected to the result page automatically when the job completes
page.progress.statusIdle=The job has started and is waiting for the next stage event
```

- [ ] **Step 5: 진행 화면 View 테스트를 다시 돌려 통과를 확인한다**

Run: `./gradlew test --tests "*ViewControllerTest*"`

Expected: `BUILD SUCCESSFUL`

- [ ] **Step 6: 변경을 커밋한다**

```bash
git add \
  src/main/resources/templates/progress.html \
  src/main/resources/static/css/mmu/components.css \
  src/main/resources/static/css/app.css \
  src/main/resources/static/js/progress.js \
  src/main/resources/messages.properties \
  src/main/resources/messages_en.properties \
  src/test/kotlin/com/toolhub/classdiagramgenerator/web/ViewControllerTest.kt
git commit -m "feat(class-diagram-generator): redesign progress page dashboard"
```

---

### Task 5: Result 화면에 요약 메타와 경고 렌더링을 추가한다

**Files:**
- Modify: `src/main/resources/templates/result.html`
- Modify: `src/main/resources/static/css/mmu/components.css`
- Modify: `src/main/resources/static/css/app.css`
- Modify: `src/main/resources/static/js/result.js`
- Modify: `src/main/resources/messages.properties`
- Modify: `src/main/resources/messages_en.properties`
- Test: `src/test/kotlin/com/toolhub/classdiagramgenerator/web/ViewControllerTest.kt`
- Test: `src/test/kotlin/com/toolhub/classdiagramgenerator/api/JobControllerTest.kt`

- [ ] **Step 1: 결과 페이지의 새 요약 슬롯을 검증하는 실패 테스트를 추가한다**

`src/test/kotlin/com/toolhub/classdiagramgenerator/web/ViewControllerTest.kt`

```kotlin
"GET /jobs/{id}/result renders summary cards and warning container" {
    mockMvc.get("/jobs/00000000-0000-0000-0000-000000000001/result").andExpect {
        status { isOk() }
        content { string(org.hamcrest.Matchers.containsString("id=\"createdAt\"")) }
        content { string(org.hamcrest.Matchers.containsString("id=\"expiresAt\"")) }
        content { string(org.hamcrest.Matchers.containsString("id=\"artifactCount\"")) }
        content { string(org.hamcrest.Matchers.containsString("id=\"resultWarnings\"")) }
    }
}
```

`src/test/kotlin/com/toolhub/classdiagramgenerator/api/JobControllerTest.kt`

```kotlin
"GET /api/v1/jobs/{id}/result keeps warnings array for result rendering" {
    val jobId = UUID.randomUUID()
    val workDir = Files.createTempDirectory("job-result-warning-test")
    val artifactPath = workDir.resolve("artifact.txt")
    Files.writeString(artifactPath, "ok")

    jobStore.create(
        JobRecord(
            id = jobId,
            programName = "demo",
            version = "v1.0",
            language = OutputLanguage.KO,
            formats = listOf("md"),
            includeDiagrams = false,
            status = JobStatus.DONE,
            workDir = workDir,
            warnings = mutableListOf(Warning("WARN_1", "render this warning")),
            artifacts = mutableListOf(
                ArtifactRecord("demo", "md", "artifact.txt", artifactPath, Files.size(artifactPath)),
            ),
        ),
    )

    mockMvc.get("/api/v1/jobs/$jobId/result").andExpect {
        status { isOk() }
        jsonPath("$.warnings.length()") { value(1) }
        jsonPath("$.warnings[0].message") { value("render this warning") }
    }
}
```

- [ ] **Step 2: 실패를 확인한다**

Run: `./gradlew test --tests "*ViewControllerTest*" --tests "*JobControllerTest*"`

Expected: `createdAt` DOM 슬롯 또는 `resultWarnings` 컨테이너가 없어 FAIL

- [ ] **Step 3: `result.html`에 hero, 요약 메타 카드, 경고 컨테이너를 추가한다**

```html
<main class="container mmu-shell">
    <section class="mmu-hero-card">
        <div class="d-flex flex-column flex-lg-row justify-content-between align-items-start gap-3">
            <div>
                <p class="mmu-eyebrow" th:text="#{page.result.section}">Result</p>
                <h1 class="page-title" th:text="#{page.result.title}">완료</h1>
                <p class="mmu-hero-copy" th:text="#{page.result.lead}">
                    생성된 산출물을 검토하고 한 번에 내려받거나 개별 다운로드할 수 있습니다.
                </p>
            </div>
            <a id="bundleBtn" class="btn btn-primary btn-lg btn-with-icon" th:text="#{page.result.bundle}">묶음 다운로드</a>
        </div>
        <div class="mmu-meta-grid mt-4">
            <div class="mmu-meta-card">
                <span class="meta-label" th:text="#{page.result.createdAt}">생성 시각</span>
                <strong id="createdAt" class="meta-value">-</strong>
            </div>
            <div class="mmu-meta-card">
                <span class="meta-label" th:text="#{page.result.expiresAt}">만료</span>
                <strong id="expiresAt" class="meta-value">-</strong>
            </div>
            <div class="mmu-meta-card">
                <span class="meta-label" th:text="#{page.result.artifacts}">산출물</span>
                <strong id="artifactCount" class="meta-value">0</strong>
            </div>
        </div>
    </section>

    <section id="resultWarnings" class="mmu-surface-card mt-4" hidden>
        <h2 class="mmu-section-title" th:text="#{page.result.warningTitle}">주의 사항</h2>
        <div id="resultWarningsList" class="mmu-warning-stack mt-3"></div>
    </section>

    <section class="mmu-surface-card mt-4">
        <div id="artifacts" class="artifact-grid" role="list"></div>
    </section>
</main>
```

- [ ] **Step 4: `result.js`와 결과 카드 스타일을 확장한다**

`src/main/resources/static/js/result.js`

```javascript
function renderWarnings(list) {
    const section = document.getElementById('resultWarnings');
    const container = document.getElementById('resultWarningsList');
    if (!section || !container) return;
    if (!list.length) {
        section.hidden = true;
        container.replaceChildren();
        return;
    }

    section.hidden = false;
    container.replaceChildren();
    list.forEach((warning) => {
        const card = el('article', 'mmu-warning-card');
        const title = el('strong', 'mmu-warning-card__code', warning.code ?? '');
        const body = el('p', 'mmu-warning-card__message', warning.message ?? '');
        card.append(title, body);
        container.appendChild(card);
    });
}

async function load() {
    const res = await fetch(`/api/v1/jobs/${jobId}/result`);
    if (!res.ok) {
        const banner = el('div', 'alert alert-danger', resultLabels.loadError);
        document.body.prepend(banner);
        return;
    }
    const data = await res.json();
    document.getElementById('createdAt').textContent = formatDate(data.createdAt);
    document.getElementById('expiresAt').textContent = formatDate(data.expiresAt);
    document.getElementById('artifactCount').textContent = String(data.artifacts.length);
    renderWarnings(data.warnings ?? []);
    const grid = document.getElementById('artifacts');
    grid.replaceChildren();
    data.artifacts.forEach((artifact) => grid.appendChild(buildArtifactCard(artifact)));
    document.getElementById('bundleBtn').setAttribute('href', data.bundleUrl);
}
```

`src/main/resources/static/css/mmu/components.css`

```css
.mmu-meta-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 1rem;
}

.mmu-warning-card__code {
    display: block;
    margin-bottom: 0.375rem;
}

.artifact-filename {
    overflow-wrap: anywhere;
}

@media (max-width: 767.98px) {
    .mmu-meta-grid {
        grid-template-columns: 1fr;
    }
}
```

메시지 키를 추가한다.

```properties
page.result.section=Result
page.result.lead=생성된 산출물을 검토하고 묶음 또는 개별 다운로드를 진행할 수 있습니다
page.result.createdAt=생성 시각
page.result.warningTitle=주의 사항
```

`src/main/resources/messages_en.properties`

```properties
page.result.section=Result
page.result.lead=Review the generated artifacts and download them individually or as one bundle
page.result.createdAt=Created At
page.result.warningTitle=Warnings
```

- [ ] **Step 5: 결과 페이지 테스트를 다시 돌려 통과를 확인한다**

Run: `./gradlew test --tests "*ViewControllerTest*" --tests "*JobControllerTest*"`

Expected: `BUILD SUCCESSFUL`

- [ ] **Step 6: 변경을 커밋한다**

```bash
git add \
  src/main/resources/templates/result.html \
  src/main/resources/static/css/mmu/components.css \
  src/main/resources/static/css/app.css \
  src/main/resources/static/js/result.js \
  src/main/resources/messages.properties \
  src/main/resources/messages_en.properties \
  src/test/kotlin/com/toolhub/classdiagramgenerator/web/ViewControllerTest.kt \
  src/test/kotlin/com/toolhub/classdiagramgenerator/api/JobControllerTest.kt
git commit -m "feat(class-diagram-generator): redesign result page summary"
```

---

### Task 6: 최종 스타일 보정과 전체 검증을 마무리한다

**Files:**
- Modify: `src/main/resources/static/css/app.css`
- Modify: `src/main/resources/static/css/mmu/components.css`
- Modify: `src/main/resources/templates/upload.html`
- Modify: `src/main/resources/templates/progress.html`
- Modify: `src/main/resources/templates/result.html`

- [ ] **Step 1: Bootstrap 재스킨과 공통 포커스/버튼 규칙을 정리한다**

```css
.btn-primary {
    background-color: var(--mmu-accent);
    border-color: var(--mmu-accent);
}

.btn-primary:hover,
.btn-primary:focus-visible {
    background-color: var(--mmu-accent-strong);
    border-color: var(--mmu-accent-strong);
}

.btn-outline-primary {
    color: var(--mmu-accent);
    border-color: var(--mmu-accent);
}

.form-control:focus,
.form-select:focus,
.form-check-input:focus {
    border-color: var(--mmu-accent);
    box-shadow: 0 0 0 0.2rem var(--mmu-accent-soft);
}

.form-check-input:checked {
    background-color: var(--mmu-accent);
    border-color: var(--mmu-accent);
}
```

- [ ] **Step 2: 전체 자동 검증을 실행한다**

Run: `./gradlew check`

Expected: `BUILD SUCCESSFUL`

- [ ] **Step 3: 로컬 앱을 띄우고 수동 시나리오를 점검한다**

Run: `mise run dev`

수동 점검 순서:

1. `http://localhost:8080/` 접속
2. 데스크톱 폭에서 업로드 hero, 카드 분리, 드롭존 상태 확인
3. 테마 토글을 눌러 light/dark 모두 확인
4. 언어 토글 `KO / EN` 모두 확인
5. ZIP 업로드 후 진행 화면에서 타임라인/상태 카드 확인
6. 결과 화면에서 `createdAt / expiresAt / artifactCount / warnings` 표시 확인
7. 375px 폭으로 줄여 수평 스크롤 없는지 확인

Expected: 수평 스크롤 없음, 토글 정상, 업로드 → 진행 → 결과 흐름 정상

- [ ] **Step 4: 모바일 헤더와 카드 간격에 대한 최종 보정 규칙을 적용한다**

```css
@media (max-width: 575.98px) {
    .navbar-brand {
        font-size: 0.95rem;
    }

    .mmu-page-context {
        display: none;
    }

    .mmu-toolbar {
        gap: 0.5rem;
    }

    .mmu-hero-card,
    .mmu-surface-card {
        padding: 1.25rem;
    }
}
```

- [ ] **Step 5: 최종 변경을 커밋한다**

```bash
git add \
  src/main/resources/static/css/app.css \
  src/main/resources/static/css/mmu/components.css \
  src/main/resources/templates/upload.html \
  src/main/resources/templates/progress.html \
  src/main/resources/templates/result.html
git commit -m "style(class-diagram-generator): polish modern UI responsiveness"
```
