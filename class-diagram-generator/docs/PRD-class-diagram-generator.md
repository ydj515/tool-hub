# PRD: 클래스 설계서 자동 생성기 (`class-diagram-generator`)

| 항목 | 내용 |
|---|---|
| 프로젝트명 | class-diagram-generator |
| 문서명 | 클래스 설계서 자동 생성기 PRD |
| 위치 | tool-hub/class-diagram-generator |
| 작성일 | 2026-05-19 |
| 상태 | 초안 (v0.4) |
| 작성자 | ydj515 |

---

## 0. 연관 문서

- (예정) 구현 계획서: `docs/mvp-plan.md`
- (예정) 사용자 가이드: `docs/user-guide.md`

---

## 1. 제품 개요

### 한 줄 설명

Java 소스 코드(ZIP 업로드)를 입력받아 **클래스 설계서(Word/Excel/Markdown)** 를 자동으로 생성하는 Spring Boot 기반 REST API 도구이다.

### 배경

사내 프로젝트의 산출물(클래스 설계서)은 다음과 같은 흐름으로 작성되는 경우가 많다.

1. 패키지 구조를 보면서 Word/Excel 템플릿에 클래스명을 옮긴다.
2. IDE를 열어 각 클래스의 속성·메서드를 복사해 표에 채운다.
3. Javadoc을 보고 한국어 설명을 정리한다.
4. 새 버전이 나올 때마다 위 작업을 반복한다.

이 과정은 단순 반복 작업이면서도 **수작업 누락**과 **버전 불일치**가 자주 발생한다. 이미 소스에 존재하는 정보(클래스명, 필드, 메서드, Javadoc)를 다시 수기 옮겨 적기 때문이다.

본 도구는 **소스 코드를 단일 진실의 원천(Single Source of Truth)** 으로 두고, ZIP 한 번 업로드로 docx / xlsx / md 산출물을 동시에 생성한다.

---

## 2. 문제 정의

### 현재 문제

| 문제 | 설명 |
|---|---|
| 반복 수작업 | 클래스마다 속성/오퍼레이션 표를 손으로 채워야 함 |
| 일관성 부족 | 같은 정보가 docx/xlsx에 따로 작성되어 동기화가 깨짐 |
| 버전 동기화 누락 | 소스가 변경돼도 설계서가 업데이트되지 않음 |
| 형식 표준화 부재 | 작성자마다 표 구조, 항목 명칭, 분류 기준이 다름 |
| 산출물 다양성 부재 | docx만 만들거나 xlsx만 만들어 사용자별 요구에 맞추기 어려움 |

### 본 도구의 가치

- **자동화**: 업로드 1회 → 3가지 포맷 동시 산출
- **표준화**: ID 규칙(`CLS-{3자리}`), 계층 분류, 표 구조가 결정적(deterministic)
- **반복 가능**: 소스가 바뀌면 다시 돌리기만 하면 됨
- **검증 가능**: 산출물의 모든 항목이 소스의 어디서 왔는지 추적 가능

---

## 3. 목표

### 제품 목표

| 목표 | 설명 | 우선순위 |
|---|---|---|
| ZIP 입력 → 3종 산출물 자동 생성 | docx, xlsx, md를 단일 요청에서 생성 | P0 |
| 멀티모듈 프로젝트 지원 | Gradle(Groovy/Kotlin DSL), Maven 메타 인식, 모듈별 산출물 분리 | P0 |
| 패키지 기반 계층 자동 분류 | 첫 하위 패키지명으로 Controller/Service/Mapper/Util/Model 판정 | P0 |
| SSE 기반 진행 스트리밍 | 업로드 후 단계별(STAGE) 진행 이벤트 전송 | P0 |
| Javadoc 기반 설명 자동 추출 | Javadoc 우선, 없으면 빈칸 | P0 |
| 임시 산출물 보관/정리 | 다운로드 가능 1시간, 이후 스케줄러로 삭제 | P0 |
| 산출물 묶음 다운로드 | 멀티모듈 시 전체 산출물 zip 패키지 다운로드 | P1 |
| 웹 UI 제공 | Bootstrap 5 + Thymeleaf 기반 업로드/진행/결과 화면. REST API의 클라이언트 역할 | P0 |
| 다국어 지원(한/영) | 웹 UI **및 산출물 본문(docx/xlsx/md)** 라벨을 한국어·영어로 제공. 헤더 토글과 산출물 언어 선택을 통해 제어 | P0 |

### 비목표 (MVP 제외)

| 비목표 | 사유 / 후속 처리 |
|---|---|
| Git 저장소 직접 입력 | Phase 2 task로 분리(아래 [12. 후속 Phase 작업] 참조) |
| Kotlin(.kt) 소스 클래스 설계서화 | Phase 2 task로 분리. MVP에서는 빌드 파일(`build.gradle.kts`) 인식까지만 수행 |
| 클래스 다이어그램 이미지 첨부 | 정보 가치 대비 구현 난이도가 높음. Phase 3 |
| LLM 기반 설명 보강 | Javadoc 부재 시 자연어 설명 생성. Phase 3 |
| 인증/멀티테넌시 | 로컬·사내망 사용 전제. Phase 4 |
| 비-Spring 어노테이션 기반 계층 추정 | MVP는 패키지 경로만 사용 |
| Word 자동 TOC, 자동 페이지 번호 자동 갱신 | 초기 버전에서는 정적 목차 생성 |
| 산출물 파일명에 한국어/유니코드 사용 | MVP는 ASCII 영문 파일명만. 한글 파일명 지원은 NEXT-09 |
| 사용자별 이력 / 영구 저장 | MVP는 1시간 임시 보관. 영구 저장·이력·검색은 NEXT-10 |
| 한/영 외 추가 언어(일본어/중국어 등) | MVP는 한국어·영어만. 추가 언어는 NEXT-12 |

---

## 4. 사용자 / 이해관계자

| 역할 | 시나리오 |
|---|---|
| 백엔드 개발자 | 본인 프로젝트의 클래스 설계서를 PR 검수용/문서화용으로 매번 새로 뽑는다 |
| 테크 리드 / 아키텍트 | 신규 입사자에게 코드베이스를 설명하기 위한 인덱스 문서로 활용 |
| QA / 사내 감리 | 산출물 점검 시 일관된 형식의 클래스 설계서 요구 |
| PM / 비개발자 | 코드는 못 봐도 xlsx의 클래스 리스트만으로 시스템 윤곽 파악 |

---

## 5. 기능 요구사항 (MVP)

### 5.1 입력 처리

| 항목 | 사양 |
|---|---|
| 입력 형식 | `application/zip` multipart 업로드 |
| 최대 파일 크기 | 100MB (Spring `spring.servlet.multipart.max-file-size` 로 설정) |
| 압축 해제 위치 | `${app.workdir}/jobs/{jobId}/input/` (기본값 시스템 temp 하위) |
| ZIP 내 비-Java 자원 처리 | 무시. `.java` 파일만 분석 대상 |
| 인코딩 가정 | UTF-8 우선, 실패 시 platform default로 재시도하고 결과에 경고 누적 |
| 보안 (Zip Slip 방어) | 압축 해제 시 모든 엔트리 경로를 정규화하여 작업 디렉터리 바깥 경로 차단 |

### 5.2 프로젝트/모듈 감지

| 항목 | 사양 |
|---|---|
| 빌드 파일 탐지 | `build.gradle`, `build.gradle.kts`, `pom.xml`, `settings.gradle`, `settings.gradle.kts` |
| 모듈 판정 규칙 | 빌드 파일이 있는 디렉터리를 모듈 루트로 간주. `settings.gradle*` 의 `include` 절로 보조 |
| 모듈명 우선순위 | 1) `settings.gradle*` 의 `rootProject.name` / `include` 경로명, 2) `pom.xml` 의 `artifactId`, 3) 빌드 파일이 위치한 디렉터리명 |
| 모듈명 충돌 처리 | 동일 모듈명이 둘 이상이면 `{모듈명}-{상대경로 해시 4자리}` 로 자동 접미사 부여 |
| 빌드 파일 없음 | 단일 모듈로 간주. 모듈명은 **요청 파라미터의 프로그램명** 사용 |
| 비표준 디렉터리 구조 | `src/main/java/**/*.java` 우선 검색, 없으면 모듈 루트 하위 모든 `*.java` 를 스캔하고 결과에 경고 누적 |

### 5.3 Java 소스 분석

| 항목 | 사양 |
|---|---|
| 파서 | JavaParser 3.26.x |
| 분석 대상 | `class`, `interface`, `enum`, `record` (annotation 타입은 MVP 제외) |
| 속성 추출 | 필드 선언 — 이름, 타입(원문 그대로), 접근지정자, Javadoc |
| 오퍼레이션 추출 | 메서드 선언 — 이름, Javadoc 설명. 파라미터/반환형은 본문 표에는 미표시(요구사항 §4.5의 컬럼 정의 준수) |
| 접근지정자 매핑 | `public` / `private` / `protected` / 없음→`default` |
| Javadoc 처리 | summary 첫 문장을 설명으로 사용. 줄바꿈 정규화 후 공백 trim. 부재 시 빈 문자열 |
| 내부 클래스(inner class) | 별도 클래스로 추출. ID는 외부와 무관하게 순차 부여 |
| Symbol resolution | MVP에서는 비활성 (의존성 미해결로 인한 분석 실패 회피) |

### 5.4 계층 분류

| 항목 | 사양 |
|---|---|
| 분류 기준 | 클래스의 패키지 경로 중 **첫 번째 하위 세그먼트**(모듈 base package 다음 첫 토큰) |
| Base package 결정 | 모듈의 모든 `.java` 패키지의 **공통 prefix**. 단일 클래스면 그 패키지 직접 사용 |
| 분류 매핑 (대소문자 무시) | `controller` → Controller, `service` → Service, `mapper` / `dao` / `repository` → Mapper, `util` / `utils` / `common` → Util, `model` / `domain` / `entity` / `dto` / `vo` → Model |
| 미매칭 처리 | `Etc` 계층으로 분류하고 결과 응답의 경고 항목에 추가 |

### 5.5 ID 부여

| 항목 | 사양 |
|---|---|
| 형식 | `CLS-{4자리 순번}` (예: `CLS-0001`) |
| 시퀀스 범위 | **모듈 단위**로 1부터 시작 |
| 정렬 기준 | 계층(Controller→Service→Mapper→Util→Model→Etc) → 패키지 사전순 → 클래스명 사전순 |
| 9999 초과 | 5자리 이상으로 자동 확장(예: `CLS-10000`). 응답에 경고 누적 |

### 5.6 산출물 생성

세 가지 포맷을 **항상 동시에** 생성한다. 사용자가 일부만 받고 싶다면 다운로드 시 선택한다.

#### 5.6.1 공통 사양

| 항목 | 사양 |
|---|---|
| 본문 언어 | 요청의 `language` 값(`ko` | `en`)을 따른다. 모든 표지·라벨·컬럼명·시트명·헤딩이 해당 언어로 출력됨. **5.6.5 라벨 사전 참조** |
| 폰트(docx) | 본문 **맑은 고딕 10pt** (`ko`·`en` 공통, 한·영 동시 가독을 위해 단일 폰트 유지), 제목 Bold |
| 표 스타일(docx) | 테두리 실선, 헤더 행 회색 음영 (RGB `#D9D9D9`) |
| 시트 구조(xlsx) | 시트 3개, 시트명은 언어에 따라 한국어/영어 |
| 페이지(docx) | A4 세로 |
| 산출물 파일명 | `class-design_{programName}_{moduleName}_{version}_{yyyyMMddHHmm}.{ext}` — **모든 토큰은 ASCII** (언어와 무관하게 영문 파일명) |
| 모듈명 sanitize | 입력 ZIP에서 추출된 모듈명에 ASCII 외 문자가 포함되면 ASCII만 남기고 나머지는 `-` 로 치환. 빈 문자열이 되면 `module-{index}` 사용 |
| 단일 모듈 시 | `{moduleName}` 토큰 생략 |
| 다운로드 Content-Disposition | `attachment; filename="..."` (RFC 5987 `filename*` 불필요, 파일명이 ASCII이므로) |

#### 5.6.2 docx 산출물

| 섹션 | 내용 |
|---|---|
| 표지 | 문서 제목 = `{doc.title.cover}({programName})`, 산출물명, 생성일, 버전 (라벨은 5.6.5 사전) |
| 목차 | Word TOC 필드(수동 새로고침 안내 문구 포함). 1단계: 프로그램명, 2단계: 클래스 리스트 / 계층별 |
| 클래스 리스트 | 컬럼: `classId` / `className` / `layer` / `description` |
| 클래스 설계서 본문 | 클래스마다 헤더 표 + 속성 표(`attributeName`/`type`/`accessModifier`/`description`) + 오퍼레이션 표(`operationName`/`description`) 반복 |

#### 5.6.3 xlsx 산출물

| 시트 | 내용 |
|---|---|
| `sheet.cover` | 제목, 프로그램명, 모듈명, 버전, 생성일을 단일 셀에 정리 |
| `sheet.classList` | 컬럼: `classId` / `className` / `layer` / `package` / `description`. 자동 필터 적용 |
| `sheet.classDesign` | 클래스별 블록을 세로 누적. 블록 구분 행(회색 음영)으로 시각 분리. 헤더 행 고정 |

#### 5.6.4 md 산출물

| 섹션 | 내용 |
|---|---|
| 표지 | H1 제목 + 메타 정보 표 |
| 클래스 리스트 | 마크다운 표 |
| 클래스 설계서 | 클래스마다 `## CLS-XXXX {className}` 헤더, 속성/오퍼레이션 표 |

#### 5.6.5 산출물 라벨 사전

산출물 본문에 사용되는 모든 라벨은 아래 사전을 단일 출처로 사용한다. 구현체는 `OutputLabels.of(Locale).key` 형태로 접근한다.

| 키 | ko (한국어) | en (English) |
|---|---|---|
| `doc.title.cover` | 클래스 설계서 | Class Design |
| `doc.title.classList` | 클래스 리스트 | Class List |
| `doc.title.classDesign` | 클래스 설계서 | Class Design |
| `doc.meta.programName` | 프로그램명 | Program |
| `doc.meta.moduleName` | 모듈명 | Module |
| `doc.meta.version` | 버전 | Version |
| `doc.meta.generatedAt` | 생성일 | Generated At |
| `col.classId` | 클래스 ID | Class ID |
| `col.className` | 클래스명 | Class Name |
| `col.layer` | 계층 | Layer |
| `col.package` | 패키지 | Package |
| `col.description` | 설명 | Description |
| `col.attributeName` | 속성명 | Attribute |
| `col.type` | 타입 | Type |
| `col.accessModifier` | 접근지정자 | Access |
| `col.operationName` | 오퍼레이션명 | Operation |
| `layer.controller` | Controller | Controller |
| `layer.service` | Service | Service |
| `layer.mapper` | Mapper | Mapper |
| `layer.util` | Util | Util |
| `layer.model` | Model | Model |
| `layer.etc` | 기타 | Etc |
| `access.public` | public | public |
| `access.private` | private | private |
| `access.protected` | protected | protected |
| `access.default` | default | default |
| `sheet.cover` | 표지 | Cover |
| `sheet.classList` | 클래스 리스트 | Class List |
| `sheet.classDesign` | 클래스 설계서 | Class Design |
| `toc.title` | 목차 | Table of Contents |
| `toc.refreshHint` | 목차는 F9 또는 우클릭 → 필드 업데이트로 갱신하세요. | Press F9 or right-click → Update Field to refresh. |

> **명명 규칙**: 한·영 동일 토큰(`Controller` 등 영문 표준어, `public` 등 키워드)은 양 로케일이 같은 값이다. 모듈/패키지/클래스명 등 **소스 코드에서 유래한 식별자는 절대 번역하지 않는다.**

### 5.7 REST API 명세

#### 5.7.1 작업 생성

```
POST /api/v1/jobs
Content-Type: multipart/form-data

Parts:
  - file       : Java 소스 ZIP (필수)
  - programName: 프로그램명 (필수, 1~64자, **영문/숫자/`_-` 만 허용**, 정규식 `^[A-Za-z0-9_-]+$`)
  - version    : 버전 문자열 (필수, 1~32자, 영문/숫자/`._-` 만 허용, 정규식 `^[A-Za-z0-9._-]+$`)
  - language   : 산출물·웹 UI 언어 (필수, `ko` | `en`. 웹 UI에서는 현재 로케일로 자동 채움)
  - formats    : 생성할 포맷 (선택, 콤마 구분. 예 "docx,xlsx,md". 기본 "docx,xlsx,md")
```

응답
```json
{
  "jobId": "0192f3ab-...",
  "status": "ACCEPTED",
  "streamUrl": "/api/v1/jobs/0192f3ab-.../events"
}
```

#### 5.7.2 진행 스트리밍 (SSE)

```
GET /api/v1/jobs/{jobId}/events
Accept: text/event-stream
```

이벤트 종류

| event | data 예시 | 설명 |
|---|---|---|
| `stage` | `{"stage":"EXTRACTING","percent":5}` | 단계 변경 |
| `progress` | `{"stage":"PARSING","percent":42,"processed":18,"total":42}` | 단계 내 진행도 |
| `warning` | `{"code":"UNKNOWN_LAYER","message":"...","context":{...}}` | 분석 중 경고 |
| `done` | `{"resultUrl":"/api/v1/jobs/.../result","expiresAt":"..."}` | 완료 |
| `error` | `{"code":"ZIP_SLIP","message":"..."}` | 실패 종료 (스트림 종료) |

단계(STAGE) 시퀀스 — `stage` 이벤트의 `stage` 값 enum

```
EXTRACTING  → DETECTING_MODULES → PARSING
            → CLASSIFYING       → ASSIGNING_IDS
            → RENDERING_DOCX    → RENDERING_XLSX → RENDERING_MD
            → PACKAGING
```

`PACKAGING` 종료 직후 별도의 `done` 이벤트가 전송되며 스트림이 종료된다. 클라이언트 비활성에 의한 SSE 타임아웃 방어를 위해 30초 간격으로 SSE comment(`: keep-alive\n\n`)를 전송한다.

#### 5.7.3 결과 조회 / 다운로드

```
GET /api/v1/jobs/{jobId}/result
```
응답 본문 — 산출물 메타 목록
```json
{
  "jobId": "0192f3ab-...",
  "expiresAt": "2026-05-19T11:00:00+09:00",
  "warnings": [...],
  "artifacts": [
    {
      "module": "user-service",
      "format": "docx",
      "filename": "클래스설계서_acme_user-service_v1.0_202605191020.docx",
      "downloadUrl": "/api/v1/jobs/0192f3ab-.../artifacts/0",
      "sizeBytes": 84231
    }
  ],
  "bundleUrl": "/api/v1/jobs/0192f3ab-.../bundle"
}
```

```
GET /api/v1/jobs/{jobId}/artifacts/{index}   → 개별 파일 스트림 다운로드
GET /api/v1/jobs/{jobId}/bundle              → 모든 산출물 묶음 zip
```

#### 5.7.4 에러 응답 표준

`application/problem+json` (RFC 7807) 형식 준수.

```json
{
  "type": "https://tool-hub/errors/invalid-zip",
  "title": "Invalid zip input",
  "status": 400,
  "code": "ZIP_INVALID",
  "detail": "...",
  "jobId": "..."
}
```

### 5.8 웹 UI

REST API의 1차 클라이언트로 동작하는 서버 사이드 렌더링 페이지. **Thymeleaf 템플릿 + Bootstrap 5 + Vanilla JS(EventSource)** 조합으로 구성한다. SPA가 아니다.

#### 5.8.1 페이지 흐름

```
GET /              → 업로드 폼 (UploadPage)
   onload          → 현재 로케일에 맞춰 KO / EN 토글 상태와 산출물 언어 기본값을 노출
   submit          → fetch POST /api/v1/jobs (multipart)
                     `language` 필드는 현재 로케일 값으로 자동 채움 (사용자가 폼에서 재확인 가능)
                     성공 시 location.href = `/jobs/{jobId}`

GET /jobs/{id}     → 진행 페이지 (ProgressPage)
   onload          → new EventSource(`/api/v1/jobs/{id}/events`)
                     단계/퍼센트/경고를 실시간 업데이트
   done 수신       → location.href = `/jobs/{id}/result`
   error 수신      → 오류 패널 + 다시 시도 버튼

GET /jobs/{id}/result → 결과 페이지 (ResultPage)
                       산출물 목록(모듈 × 포맷) 테이블 + 다운로드 버튼 + 묶음 다운로드
```

> 산출물 언어는 **작업 생성 시점의 `language` 값**으로 고정된다. 결과 페이지에서 UI 로케일을 바꿔도 이미 생성된 산출물은 재생성되지 않는다. 다른 언어로 받고 싶으면 새 업로드를 수행한다.

#### 5.8.2 페이지 상세

| 페이지 | 주요 컴포넌트 |
|---|---|
| `UploadPage` (`templates/upload.html`) | 좌: 폼(programName / version / **language(select, 현재 로케일로 사전 선택)** / formats 체크박스 / ZIP 드래그앤드롭), 우: 안내(허용 문자, 최대 크기, 멀티모듈 동작) |
| `ProgressPage` (`templates/progress.html`) | 단계 stepper(8단계), Bootstrap progress bar, 경고 알림 영역, 취소 버튼(MVP에서는 disabled) |
| `ResultPage` (`templates/result.html`) | 산출물 테이블(모듈 / 포맷 / 크기 / 다운로드), "전체 묶음 다운로드" 버튼, 만료 시각 카운트다운 |
| `ErrorPage` (`templates/error.html`) | RFC 7807 정보 표시. 다시 업로드 링크 |
| 공통 레이아웃 (`templates/layout.html`) | 헤더(로고/링크), 푸터(버전), Bootstrap 5 + Bootstrap Icons 로드 |

#### 5.8.3 정적 자원

| 경로 | 용도 |
|---|---|
| `src/main/resources/static/css/app.css` | 커스텀 스타일 (얇은 보강만) |
| `src/main/resources/static/js/upload.js` | 업로드 폼 처리(fetch + 진행 페이지로 이동) |
| `src/main/resources/static/js/progress.js` | EventSource 구독 + DOM 업데이트 |
| `src/main/resources/static/js/result.js` | 만료 카운트다운 |
| `webjars/bootstrap` | Bootstrap 5 CSS/JS (WebJars로 로드) |
| `webjars/bootstrap-icons` | 아이콘 |

#### 5.8.4 컨트롤러

| Controller | Path | 비고 |
|---|---|---|
| `ViewController` | `GET /`, `GET /jobs/{id}`, `GET /jobs/{id}/result`, `GET /error` | Thymeleaf 모델 바인딩만 수행. 비즈니스 로직 없음 |

#### 5.8.5 i18n / 다국어

MVP에서 **한국어(ko)·영어(en) 2개 로케일을 정식 지원**한다.

| 항목 | 사양 |
|---|---|
| 메시지 번들 | `messages.properties`(공통/기본, 한국어), `messages_en.properties`(영어) |
| 기본 로케일 | `ko_KR` |
| 로케일 결정 우선순위 (웹 UI) | 1) URL 쿼리 `?lang=ko|en`, 2) 쿠키 `LOCALE`, 3) HTTP `Accept-Language`, 4) 기본값 `ko_KR` |
| 구현 | Spring `MessageSource` + `LocaleResolver(CookieLocaleResolver, cookie=LOCALE, 30일)` + `LocaleChangeInterceptor(paramName=lang)` |
| 페이지 사용 | Thymeleaf 표현식 `#{key.path}` 로 모든 라벨·헤더·버튼·에러 문구 출력 |
| 언어 전환 UI | 공통 레이아웃 헤더 우측 토글 (`KO / EN`) — 클릭 시 `?lang=...` 부착 후 현재 페이지로 redirect |
| 산출물 본문 언어 | **요청 시 `language` 값을 따른다.** 라벨 사전은 5.6.5. UI 로케일과 산출물 언어는 독립적이지만, 폼은 UI 로케일을 사전 선택값으로 사용 |
| 에러 응답 | RFC 7807 `title`/`detail`은 `Accept-Language`를 우선 반영 (없으면 ko) |
| 키 네이밍 컨벤션 | `page.{page}.{element}` 형식 (예: `page.upload.title`, `page.upload.submit`, `error.zip.invalid`) |
| 누락 키 정책 | 영어 번들에 키가 없으면 한국어 폴백, 한국어에도 없으면 키 자체 노출(개발 단계 검출 용이) |

#### 5.8.6 접근성·반응형

- WCAG AA 색대비 준수(Bootstrap 기본 팔레트 사용)
- 모바일에서 업로드/진행 페이지가 깨지지 않을 정도(테스트 우선순위 낮음)

---

## 6. 비기능 요구사항

| 항목 | 사양 |
|---|---|
| 동시 처리 | MVP에서는 in-memory job store + virtual thread 기반. 동시 작업 수 기본 4(설정 가능) |
| 최대 ZIP 크기 | 100MB |
| 최대 클래스 수 | 모듈당 5,000개까지 정상 처리 (벤치마크 기준) |
| SSE 타임아웃 | 클라이언트 비활성 5분이면 서버측 close |
| 결과 보관 | 생성 후 1시간. `@Scheduled(fixedDelay=10m)` 클리너로 만료 디렉터리 삭제 |
| 로그 | SLF4J + Logback. jobId를 MDC로 모든 로그에 부착 |
| 메트릭 | Spring Boot Actuator + Micrometer (단계별 소요 시간, 작업 성공/실패 카운트) |
| 보안 | 인증 없음(사내망 전제). Zip Slip 방어 필수. 업로드 파일은 ZIP 매직넘버 검사 |
| 시간대 | `Asia/Seoul` 고정 |

---

## 7. 기술 스택 (정확한 버전)

| 영역 | 선택 | 버전 / 비고 |
|---|---|---|
| JDK | Eclipse Temurin | **21 LTS** (mise 관리) |
| 언어 | **Kotlin** | **2.0.21** (jvmTarget 21) |
| 빌드 | Gradle | **8.10.x** (Kotlin DSL, `build.gradle.kts`) |
| 도구 버전 관리 | mise | `.mise.toml` 에 `java`, `gradle` 핀 |
| 애플리케이션 프레임워크 | Spring Boot | **3.3.5** (`spring-boot-starter-web`, `actuator`, `validation`, **`thymeleaf`**) |
| 서버 사이드 템플릿 | **Thymeleaf** | Spring Boot BOM 동봉 (3.1.x). HTML5 모드, `text/html;charset=UTF-8` |
| i18n | Spring `MessageSource`(ResourceBundleMessageSource, UTF-8) + `CookieLocaleResolver` + `LocaleChangeInterceptor` | 추가 라이브러리 없음. 로케일 `ko_KR`, `en` |
| UI 프레임워크 | **Bootstrap 5** | **5.3.3** (WebJars: `org.webjars.npm:bootstrap`) |
| 아이콘 | **Bootstrap Icons** | **1.11.x** (WebJars: `org.webjars.npm:bootstrap-icons`) |
| WebJars 로케이터 | `org.webjars:webjars-locator-lite` | 버전 무관 URL `/webjars/bootstrap/css/bootstrap.min.css` |
| 클라이언트 스크립트 | Vanilla JS (ES2020) + `EventSource` API | 별도 빌드 도구 없음. 정적 파일로 서빙 |
| Kotlin 통합 | `kotlin-reflect`, `jackson-module-kotlin` | Spring Boot BOM 버전 |
| Java 소스 파서 | JavaParser | **3.26.2** (`com.github.javaparser:javaparser-core`) |
| Office 문서 생성 | Apache POI | **5.3.0** (`poi`, `poi-ooxml`) |
| Markdown 생성 | 자체 템플릿 (외부 라이브러리 없음) | StringBuilder |
| XML 파서(Maven) | JDK 기본 `javax.xml` (DOM) | |
| Gradle 빌드 파일 파서 | 자체 정규식 + 토큰 스캐너 | DSL 풀 파싱 아님 (필요 토큰만) |
| 직렬화 | Jackson (Spring Boot 기본) | + `jackson-module-kotlin` |
| 검증 | Jakarta Bean Validation | `spring-boot-starter-validation` (Hibernate Validator 8.x) |
| 비동기 / SSE | Spring MVC `SseEmitter` | virtual thread 디스패처 |
| 작업 디렉터리 관리 | `java.nio.file` | |
| 스케줄러 | Spring `@Scheduled` | TTL 기반 정리 |
| 로깅 | SLF4J 2 + Logback | Spring Boot 기본 |
| 메트릭 | Micrometer + Actuator | Prometheus endpoint 노출 |
| 코드 포맷 | Spotless + **ktlint** | `id("com.diffplug.spotless")` |
| 정적 분석 | **Detekt** | `id("io.gitlab.arturbosch.detekt")` |
| 테스트 프레임워크 | **Kotest** (`kotest-runner-junit5`) | **5.9.x** — `StringSpec` 기본 |
| 모킹 | **MockK** | **1.13.x** |
| 어서션 보강 | Kotest assertions, AssertJ (POI 표 검증용) | |
| 컨트롤러 테스트 | Spring `MockMvc` (Kotlin DSL) | |
| 통합 테스트 픽스처 | 실제 ZIP 샘플 (`src/test/resources/fixtures/*.zip`) | |
| CI 검증 명령 | `./gradlew check` (test + spotless + detekt) | |

### 7.1 디렉터리 구조 (예정)

```
class-diagram-generator/
├── .mise.toml
├── build.gradle.kts
├── settings.gradle.kts
├── gradle/
├── src/
│   ├── main/
│   │   ├── kotlin/com/toolhub/classdiagramgenerator/
│   │   │   ├── ClassDiagramGeneratorApplication.kt
│   │   │   ├── api/                # REST 컨트롤러, DTO
│   │   │   ├── web/                # ViewController (Thymeleaf 페이지)
│   │   │   ├── job/                # JobService, JobStore, SSE
│   │   │   ├── input/              # ZipExtractor, ProjectDetector
│   │   │   ├── analyzer/           # JavaSourceAnalyzer, LayerClassifier, ClassIdAssigner
│   │   │   ├── domain/             # Program, Module, ClassInfo, ...
│   │   │   ├── render/             # DocxGenerator, XlsxGenerator, MarkdownGenerator
│   │   │   ├── storage/            # OutputStorage, ScheduledCleaner
│   │   │   └── config/             # AppProperties, WebConfig, WebMvcConfig
│   │   └── resources/
│   │       ├── application.yml
│   │       ├── messages.properties             # 한국어(기본)
│       ├── messages_en.properties          # 영어
│   │       ├── templates/                      # Thymeleaf 페이지
│   │       │   ├── layout.html
│   │       │   ├── upload.html
│   │       │   ├── progress.html
│   │       │   ├── result.html
│   │       │   ├── error.html
│   │       │   └── fragments/                  # nav, footer 등 재사용 fragment
│   │       └── static/
│   │           ├── css/app.css
│   │           └── js/{upload,progress,result}.js
│   └── test/
│       ├── kotlin/...              # Kotest spec
│       └── resources/fixtures/     # 샘플 ZIP, 기대 산출물
└── docs/
    └── PRD-class-diagram-generator.md
```

### 7.2 mise 설정 예시

```toml
[tools]
java = "temurin-21"
gradle = "8.10"
```

---

## 8. 아키텍처

```
                ┌──────────────────────────────────────────────────────┐
   Browser ───▶ │ ViewController (Thymeleaf)                           │
                │   GET  /                                             │
                │   GET  /jobs/{id}                                    │
                │   GET  /jobs/{id}/result                             │
                └───────────────────────────┬──────────────────────────┘
                                            │  (fetch / EventSource)
                                            ▼
                ┌──────────────────────────────────────────────────────┐
   HTTP(S) ───▶ │ JobController (REST API)                             │
                │   POST /api/v1/jobs                                  │
                │   GET  /api/v1/jobs/{id}/events    (SseEmitter)      │
                │   GET  /api/v1/jobs/{id}/result                      │
                │   GET  /api/v1/jobs/{id}/artifacts/{i}               │
                │   GET  /api/v1/jobs/{id}/bundle                      │
                └──────────────────────────────────────────────────────┘
                                       │
                                       ▼
                ┌──────────────────────────────────────────────────────┐
                │ JobService                                           │
                │  - JobStore (in-memory, ConcurrentHashMap)           │
                │  - ProgressBus (jobId → SseEmitter[])                │
                │  - VirtualThread executor                            │
                └──────────────────────────────────────────────────────┘
                                       │
        ┌──────────────────────────────┼──────────────────────────────┐
        ▼                              ▼                              ▼
 ┌────────────┐               ┌───────────────┐              ┌────────────────┐
 │ ZipExtractor│──────────────▶│ ProjectDetector│──────────────▶│JavaSourceAnalyzer│
 └────────────┘               └───────────────┘              └────────────────┘
                                                                    │
                                                                    ▼
                                                            ┌────────────────┐
                                                            │ LayerClassifier │
                                                            │ ClassIdAssigner │
                                                            └────────────────┘
                                                                    │
                                                                    ▼
                                                        ┌──────────────────────┐
                                                        │ DocumentGenerator    │
                                                        │  ├─ DocxGenerator    │
                                                        │  ├─ XlsxGenerator    │
                                                        │  └─ MarkdownGenerator│
                                                        └──────────────────────┘
                                                                    │
                                                                    ▼
                                                              ┌─────────────┐
                                                              │OutputStorage│
                                                              └─────────────┘
                                                                    │
                                                                    ▼
                                                       (ScheduledCleaner, 1h TTL)
```

각 컴포넌트는 인터페이스로 노출되어 단위 테스트에서 페이크/모킹 가능하다.

---

## 9. 도메인 모델

```kotlin
enum class Layer { CONTROLLER, SERVICE, MAPPER, UTIL, MODEL, ETC }

enum class AccessModifier { PUBLIC, PRIVATE, PROTECTED, DEFAULT }

enum class OutputLanguage { KO, EN }

data class Program(
    val name: String,
    val version: String,
    val language: OutputLanguage,
    val generatedAt: ZonedDateTime,
    val modules: List<Module>,
    val warnings: List<Warning> = emptyList(),
)

data class Module(
    val name: String,
    val classes: List<ClassInfo>,
)

data class ClassInfo(
    val id: String,           // CLS-001
    val name: String,
    val layer: Layer,
    val description: String,  // Javadoc 1문장 또는 ""
    val packagePath: String,
    val attributes: List<AttributeInfo>,
    val operations: List<OperationInfo>,
)

data class AttributeInfo(
    val name: String,
    val type: String,
    val accessModifier: AccessModifier,
    val description: String,
)

data class OperationInfo(
    val name: String,
    val description: String,
)

data class Warning(
    val code: String,
    val message: String,
    val context: Map<String, Any?> = emptyMap(),
)
```

---

## 10. 산출물 명세

### 10.1 ID·정렬·계층 규칙 (5.4 / 5.5 참조)

규칙은 결정적이어야 하며, 같은 입력에 대해 같은 출력이 보장되어야 한다.

### 10.2 docx 표 구조 (라벨 키는 5.6.5 사전 참조)

| 표 | 컬럼 (라벨 키) |
|---|---|
| 헤더 | `col.classId` / `col.className` / `col.description` |
| 속성 | `col.attributeName` / `col.type` / `col.accessModifier` / `col.description` |
| 오퍼레이션 | `col.operationName` / `col.description` |
| 클래스 리스트 | `col.classId` / `col.className` / `col.layer` / `col.description` |

### 10.3 xlsx 시트 구조 (시트명은 5.6.5 사전 참조)

| 시트 (키) | 비고 |
|---|---|
| `sheet.cover` | 단일 셀 영역. A1:E10 안에 메타 정보 |
| `sheet.classList` | 1행 헤더 고정, 자동 필터 |
| `sheet.classDesign` | 클래스별 블록 사이 1행 공백 + 회색 음영 |

### 10.4 md 산출물 형식

요구사항 정의서 §4.5의 표 구조를 그대로 마크다운 표로 옮긴다. 클래스 사이는 `---` 구분선. 모든 표 헤더는 요청의 `language` 값에 맞춰 5.6.5 사전의 라벨을 사용한다.

---

## 11. 운영

### 11.1 파일 보관 정책

| 항목 | 정책 |
|---|---|
| 위치 | `${app.workdir}/jobs/{jobId}/` |
| 보관 기간 | 생성 완료 시점부터 1시간 |
| 정리 주기 | `@Scheduled(fixedDelay=10m)` 로 만료 디렉터리 일괄 삭제 |
| 다운로드 만료 후 요청 | `404 Not Found` + `code=ARTIFACT_EXPIRED` |

### 11.2 로깅 / 메트릭

- 모든 요청에 `jobId` MDC 부착
- 단계별 처리 시간(`stage.duration`) 히스토그램
- ZIP 크기(`input.zip.size_bytes`), 클래스 수(`analysis.class_count`) 메트릭

### 11.3 설정 키

```yaml
app:
  workdir: ${java.io.tmpdir}/class-diagram-generator
  job:
    max-concurrent: 4
    ttl-minutes: 60
    cleaner-interval-minutes: 10
  upload:
    max-file-size-mb: 100
  analysis:
    max-classes-per-module: 5000
```

---

## 12. 후속 Phase 작업

아래는 본 MVP의 비목표이며, 별도 task로 분리한다.

| ID | 주제 | 내용 요약 |
|---|---|---|
| **NEXT-01** | Git repo 입력 지원 | `repoUrl + ref` 입력 받아 서버측 shallow clone → 기존 파이프라인 재사용. 인증(토큰), private repo, LFS 처리, 작업 디렉터리 격리, 네트워크 제한 정책 검토 필요. |
| **NEXT-02** | Kotlin(.kt) 소스 클래스 설계서화 | Kotlin compiler embeddable API 또는 detekt-parsing(PSI) 기반. 데이터 클래스/오브젝트/sealed 처리 규칙 정의 필요. |
| **NEXT-03** | ~~클래스 다이어그램 이미지 첨부~~ (완료 2026-05-19) | PlantUML(서버 사이드 PNG, Smetana 레이아웃) + Mermaid(md). 본문에 계층/클래스 다이어그램 임베드. 구현 스펙: `docs/superpowers/specs/2026-05-19-class-diagram-embed-design.md` |
| **NEXT-04** | LLM 기반 설명 보강 | Javadoc 없는 항목에 한해 코드 시그니처 기반 한국어 설명 생성. 비용/지연/외부 API 의존 검토 필요. |
| **NEXT-05** | 인증/멀티테넌시 | API 키 or OAuth2 Resource Server. 사용자별 job/산출물 격리. |
| **NEXT-06** | 비-Java JVM 언어(Groovy 등) | 필요성 확인 후 결정. |
| **NEXT-07** | 산출물 템플릿 사용자 커스터마이즈 | 회사별 표지/표 스타일 차이를 외부 템플릿 파일로 흡수. |
| **NEXT-08** | 작업 영속화 (JobStore) | in-memory JobStore → DB(SQLite/PostgreSQL). 재시작 후 결과 메타 조회 가능. NEXT-10의 선행 단계. |
| **NEXT-09** | 한글 파일명 지원 | RFC 5987 `filename*=UTF-8''...` 적용 및 한글 입력 허용. 운영 환경별 호환성 검증 필요. |
| **NEXT-10** | 데이터 저장소 & 사용자 이력 | (1) **메타DB** — JPA/JDBC 기반(PostgreSQL/MySQL/SQLite). 엔티티 후보: `User`, `Job`, `Artifact`, `Module`, `Warning`. (2) **객체 스토리지** — 산출물을 로컬 임시 디렉터리에서 **S3 호환 스토리지(S3 / MinIO)** 로 이전, presigned URL 다운로드. (3) **사용자별 이력 화면** — `GET /history`, 기간/프로그램명/상태 필터, 재실행/재다운로드. (4) **보존 정책** — 사용자/조직별 TTL 설정. NEXT-05(인증)와 묶어 진행 권장. |
| **NEXT-11** | 산출물 검색·인덱싱 | 생성된 클래스 설계서를 텍스트 인덱싱(예: Elasticsearch/OpenSearch)하여 클래스명·메서드명 전체 검색. NEXT-10 데이터 모델 확정 후 진행. |
| **NEXT-12** | 추가 언어 지원 (일본어/중국어 등) | 산출물 라벨 사전 + 웹 UI 메시지 번들에 언어 추가. CJK 폰트 호환성(맑은 고딕 → Noto Sans CJK 등) 검증 필요. |

각 항목은 별도 PRD/spec 작성 후 진행한다.

---

## 13. 수용 기준 (Acceptance Criteria)

MVP가 다음을 만족해야 "완료"로 본다.

- [ ] 멀티모듈 Gradle 프로젝트(샘플 fixture) 업로드 시 모듈 수만큼 docx/xlsx/md가 생성된다.
- [ ] 단일 모듈 Maven 프로젝트 업로드 시 산출물 3종이 생성된다.
- [ ] Javadoc이 있는 클래스/필드/메서드의 설명이 산출물에 그대로 채워진다.
- [ ] Javadoc이 없는 항목은 빈칸으로 채워지고 경고는 발생하지 않는다.
- [ ] 계층 분류가 패키지명 기준으로 결정적으로 부여된다.
- [ ] SSE 스트림으로 `EXTRACTING → ... → DONE` 단계 이벤트를 클라이언트가 수신한다.
- [ ] 생성된 산출물이 1시간 후 자동 삭제된다.
- [ ] 잘못된 ZIP, Zip Slip 시도, 미허용 확장자 입력에 대해 RFC 7807 응답이 반환된다.
- [ ] `./gradlew check` 가 통과한다 (Kotest 단위/통합 테스트 + Spotless + Detekt).
- [ ] 동일 입력에 대해 두 번 실행 시 산출물의 모든 표 내용이 byte-level 또는 의미 동일(타임스탬프 제외).
- [ ] 산출물 파일명에 ASCII 외 문자가 절대 포함되지 않는다(모듈명 sanitize 동작).
- [ ] 브라우저에서 `GET /` → 업로드 → 진행 → 결과 페이지 흐름이 동작한다(Chrome 최신 기준).
- [ ] 진행 페이지에서 EventSource로 단계/퍼센트가 실시간 갱신된다.
- [ ] 결과 페이지에서 개별 다운로드 및 묶음 다운로드 버튼이 정상 동작한다.
- [ ] 웹 UI 헤더의 KO/EN 토글로 모든 페이지 라벨이 한국어 ↔ 영어로 즉시 전환된다.
- [ ] `language=ko` 요청은 한국어 라벨로, `language=en` 요청은 영어 라벨로 산출물(docx/xlsx/md)이 생성된다.
- [ ] 영어 모드 산출물에서 모듈명·패키지명·클래스명·필드명·메서드명 등 **식별자는 그대로**(번역되지 않음) 출력된다.
- [ ] 누락된 i18n 키가 없다(테스트로 web 메시지 번들 + 산출물 라벨 사전의 키 집합 일치 검증).
- [ ] `includeDiagrams=true` (기본) 업로드 시 docx 본문에 계층 다이어그램과 클래스 다이어그램 PNG가 임베드된다.
- [ ] `includeDiagrams=true` 업로드 시 xlsx의 `classDesign` 시트와 `layerDiagrams` 시트에 PNG가 임베드된다.
- [ ] `includeDiagrams=true` 업로드 시 md 산출물에 ` ```mermaid` 코드 블록이 클래스/계층 자리에 삽입된다.
- [ ] `includeDiagrams=false` 업로드 시 산출물 3종에 다이어그램 흔적이 전혀 없다(PNG 0건, mermaid 펜스 0건).
- [ ] `java.lang.Object`는 어떤 다이어그램에도 노드로 등장하지 않는다.
- [ ] 모듈 외부 상속/구현 대상은 점선 박스(docx/xlsx) 또는 `stroke-dasharray`(md/Mermaid)로 표시된다.

---

## 14. 리스크 / 미해결 사항

| 리스크 | 영향 | 대응 |
|---|---|---|
| Apache POI의 표 셀 음영·테두리 API가 버전마다 미묘하게 다름 | docx 스타일 깨짐 | 5.3.0 고정, 스타일 적용 단위 테스트로 회귀 방어 |
| Gradle Kotlin DSL의 자유도 높은 표현을 정규식으로 인식 시 false negative | 모듈 미감지 | `settings.gradle*` `include` 문 우선, 폴백 디렉터리 스캔으로 보정 |
| Javadoc 첫 문장 추출 시 마크업/링크 잔재 | 산출물 가독성 저하 | 정규식으로 `{@link ...}`, HTML 태그 제거 |
| ZIP 안에 거대한 generated source가 섞여 분석 시간 폭증 | 5,000개 한도 초과 | 한도 초과 시 분석 중단 + RFC 7807 에러로 응답 |
| SSE 연결 끊김 후 재접속 시 누락 이벤트 | UX 저하 | MVP에서는 last-event-id 미지원. 끊기면 `GET /jobs/{id}` 폴링으로 폴백 안내 |

---

## 15. 변경 이력

| 일자 | 버전 | 변경 내용 | 작성자 |
|---|---|---|---|
| 2026-05-19 | 0.1 | 초안 작성 | ydj515 |
| 2026-05-19 | 0.2 | 산출물 파일명 ASCII 한정, programName/version 입력 검증을 영문/숫자로 조정, 웹 UI(Thymeleaf + Bootstrap 5) 섹션 5.8 신설, 기술 스택·디렉터리 구조·아키텍처 다이어그램·수용 기준 갱신, 한글 파일명 지원 NEXT-09로 분리 | ydj515 |
| 2026-05-19 | 0.3 | 웹 UI 다국어(한/영) 정식 지원으로 격상(5.8.5 재작성·`messages_en.properties` 추가·기술 스택에 LocaleResolver 명시), 데이터 저장소(DB/S3)·사용자 이력 NEXT-10 신설(NEXT-08과 단계 분리), 산출물 검색 NEXT-11·본문 다국어 NEXT-12 추가, 수용 기준에 i18n 항목 추가 | ydj515 |
| 2026-05-19 | 0.4 | **산출물 본문 다국어를 MVP로 포함**. API에 `language` 필수 파라미터 추가, 5.6.5 산출물 라벨 사전 신설, `Program` 도메인에 `language`/`OutputLanguage` 추가, 웹 UI 시작 시 언어 선택 흐름 도입, 10.2/10.3을 라벨 키 표현으로 일관화, NEXT-12를 추가 언어 지원(JA/ZH 등)으로 재정의, 수용 기준 갱신 | ydj515 |
| 2026-05-19 | 0.5 | NEXT-03 완료: 산출물 본문에 PlantUML PNG + Mermaid 코드 블록 임베드, `includeDiagrams` API 파라미터 추가, 수용 기준 6개 추가 | ydj515 |
| 2026-05-25 | 0.6 | 시작 시점 언어 선택 단계를 제거하고, 웹 UI 언어 선택 흐름을 헤더의 `KO / EN` 토글과 업로드 폼의 산출물 언어 선택 중심으로 정리. 관련 페이지 흐름, 수용 기준, i18n 우선순위 업데이트 | ydj515 |
