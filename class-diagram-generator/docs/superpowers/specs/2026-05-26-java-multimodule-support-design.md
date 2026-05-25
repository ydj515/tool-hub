# Java Multi-Module Support Design

## 1. 배경

`class-diagram-generator`는 현재 Java 단일 모듈과 Gradle 멀티모듈 일부를 처리할 수 있지만, Maven 멀티모듈은 부모 `pom.xml`을 단일 모듈처럼 해석하는 한계가 있다. 또한 결과 페이지 다운로드 UX는 개별 산출물과 전체 묶음만 제공하므로, 멀티모듈 사용자가 포맷별 결과를 한 번에 받기 불편하다.

이번 변경의 목표는 Java 기준으로 Gradle/Maven 멀티모듈 프로젝트를 안정적으로 지원하고, 결과 페이지에서 포맷별 다운로드를 단순하게 제공하는 것이다. Kotlin `.kt` 지원과 혼합형 루트 소스 프로젝트 지원은 이번 범위에서 제외한다.

## 2. 범위

### 포함

- Java 기준 Gradle 멀티모듈 프로젝트 감지와 산출물 생성
- Java 기준 Maven 멀티모듈 프로젝트 감지와 산출물 생성
- 결과 페이지의 포맷별 다운로드 UX 추가
- 전체 묶음 다운로드 유지
- `sample-projects` 멀티모듈 샘플 4종 추가
- 자동 테스트 보강

### 제외

- Kotlin `.kt` 소스 분석
- 루트에 소스가 함께 존재하는 혼합형 멀티모듈 프로젝트
- Groovy 등 비-Java JVM 언어
- 결과 페이지에서 모듈별 개별 다운로드 중심 UX로의 회귀

## 3. 요구사항 정리

### 기능 요구사항

1. Gradle 멀티모듈 ZIP 업로드 시 `settings.gradle` 또는 `settings.gradle.kts`의 `include` 선언 기준으로 하위 모듈을 감지한다.
2. Maven 멀티모듈 ZIP 업로드 시 루트 `pom.xml`의 `<modules>` 선언 기준으로 하위 모듈을 감지한다.
3. 멀티모듈 선언이 있으면 선언된 하위 모듈만 산출물 대상으로 본다.
4. 각 모듈에 대해 `docx`, `xlsx`, `md` 산출물을 생성한다.
5. 결과 페이지는 모듈별 산출물 목록을 정보 표시용으로 유지한다.
6. 결과 페이지는 포맷별 다운로드 버튼을 제공한다.
7. 단일 모듈의 포맷별 다운로드는 실제 파일 하나를 직접 내려준다.
8. 멀티모듈의 포맷별 다운로드는 모듈별 동일 포맷 파일을 담은 zip을 내려준다.
9. 전체 묶음 다운로드 버튼은 유지한다.
10. 멀티모듈 선언은 있으나 실제 디렉터리가 없는 모듈은 실패시키지 않고 warning으로 남긴다.

### 비기능 요구사항

- 기존 단일 모듈 동작을 깨지 않는다.
- 전체 검증 명령 `./gradlew check build`를 통과해야 한다.
- 샘플 프로젝트는 업로드 회귀 검증에 바로 사용할 수 있어야 한다.

## 4. 사용자 경험

### 업로드 및 결과 흐름

- 사용자는 기존과 동일하게 ZIP을 업로드한다.
- 결과 페이지는 기존처럼 모듈별 산출물 카드 목록을 보여준다.
- 결과 페이지 상단에는 아래 다운로드 동작을 제공한다.
  - 전체 묶음 다운로드
  - DOCX 다운로드
  - XLSX 다운로드
  - MD 다운로드

### 다운로드 규칙

- 단일 모듈
  - `DOCX 다운로드` 클릭 시 `.docx` 파일 직접 다운로드
  - `XLSX 다운로드` 클릭 시 `.xlsx` 파일 직접 다운로드
  - `MD 다운로드` 클릭 시 `.md` 파일 직접 다운로드
- 멀티모듈
  - `DOCX 다운로드` 클릭 시 모듈별 `.docx`를 담은 zip 다운로드
  - `XLSX 다운로드` 클릭 시 모듈별 `.xlsx`를 담은 zip 다운로드
  - `MD 다운로드` 클릭 시 모듈별 `.md`를 담은 zip 다운로드

### 결과 페이지 표시 원칙

- 모듈별 artifact 카드 목록은 유지한다.
- 카드의 다운로드 버튼은 남겨 두되, 포맷별 다운로드가 기본 UX라는 점이 더 잘 드러나도록 상단 버튼을 우선 배치한다.
- 포맷별 다운로드 버튼은 실제 생성된 포맷만 노출한다.

## 5. 멀티모듈 감지 규칙

### Gradle

1. 루트에 `settings.gradle` 또는 `settings.gradle.kts`가 존재하면 Gradle 루트로 본다.
2. `include 'api', 'service', 'support'` 또는 `include("api", "service", "support")` 형식에서 모듈 경로를 추출한다.
3. 추출된 경로를 실제 디렉터리로 해석해 존재하는 모듈만 수집한다.
4. 존재하지 않는 모듈 경로는 warning으로 기록한다.
5. 멀티모듈 선언이 존재하면 루트 디렉터리 자체는 산출물 대상으로 삼지 않는다.

### Maven

1. 루트 `pom.xml`에 `<modules>`가 존재하면 Maven 멀티모듈 루트로 본다.
2. `<module>api</module>` 형식에서 모듈 경로를 추출한다.
3. 추출된 경로를 실제 디렉터리로 해석해 존재하는 모듈만 수집한다.
4. 존재하지 않는 모듈 경로는 warning으로 기록한다.
5. 부모 `pom.xml`은 집계용으로만 보고 산출물 대상으로 삼지 않는다.

### 단일 모듈 폴백

- Gradle/Maven 멀티모듈 선언이 없으면 기존 단일 모듈 로직으로 처리한다.
- 루트 `pom.xml`만 있고 `<modules>`가 비어 있으면 단일 모듈 Maven 프로젝트로 간주한다.

## 6. 백엔드 설계

### 6.1 ProjectDetector

`ProjectDetector`는 다음 순서로 동작한다.

1. Gradle 멀티모듈 선언 확인
2. Maven 멀티모듈 선언 확인
3. 단일 모듈 Gradle/Maven 확인
4. 빌드 파일이 없으면 기존 폴백 스캔

핵심 변경점은 아래와 같다.

- Maven `<modules>` 파싱 추가
- 선언 기반 멀티모듈 수집 공통화
- 누락된 모듈 디렉터리 warning 수집
- 멀티모듈 선언 존재 시 루트 소스 제외

### 6.2 Warning 처리

누락된 모듈 디렉터리는 실패가 아니라 warning으로 처리한다.

- 코드 예시
  - `MISSING_DECLARED_MODULE`
- context 예시
  - `buildSystem=gradle|maven`
  - `module=service`
  - `path=service`

warning은 최종 결과 페이지와 결과 API에서 기존 warnings와 동일하게 노출한다.

### 6.3 산출물 생성

현재 `JobOrchestrator`는 `program.modules.forEach` 기반으로 모듈별 artifact를 생성한다. 따라서 산출물 생성 레이어의 핵심 변경은 없다. 핵심은 `ProjectDetector`가 정확한 모듈 목록을 반환하도록 보장하는 것이다.

파일명 규칙은 기존처럼 모듈명이 포함되도록 유지한다.

- 단일 모듈: `class-design_{program}_{version}_{timestamp}.{ext}`
- 멀티모듈: `class-design_{program}_{module}_{version}_{timestamp}.{ext}`

## 7. 다운로드 API 설계

### 7.1 기존 API 유지

- `GET /api/v1/jobs/{id}/artifacts/{idx}`
  - 개별 artifact 다운로드
- `GET /api/v1/jobs/{id}/bundle`
  - 모든 artifact를 포함한 전체 zip 다운로드

### 7.2 신규 API

- `GET /api/v1/jobs/{id}/downloads/{format}`

지원 format:

- `docx`
- `xlsx`
- `md`

동작:

- 해당 format artifact가 1개면 실제 파일을 직접 반환
- 해당 format artifact가 2개 이상이면 zip을 스트리밍 반환
- 해당 format artifact가 0개면 `404 Not Found`

응답 파일명:

- 단일 artifact 직접 반환 시 기존 artifact 파일명 그대로 사용
- 복수 artifact zip 반환 시 `bundle-{jobId}-{format}.zip`

## 8. 결과 API DTO 설계

`JobResultResponse`에 포맷별 다운로드 정보를 추가한다.

예상 구조:

```json
{
  "jobId": "...",
  "createdAt": "...",
  "expiresAt": "...",
  "warnings": [],
  "artifacts": [],
  "bundleUrl": "/api/v1/jobs/{id}/bundle",
  "formatDownloads": [
    {
      "format": "xlsx",
      "artifactCount": 3,
      "downloadUrl": "/api/v1/jobs/{id}/downloads/xlsx",
      "archive": true
    }
  ]
}
```

필드 의미:

- `format`: 포맷명
- `artifactCount`: 해당 포맷 artifact 개수
- `downloadUrl`: 포맷별 다운로드 URL
- `archive`: zip 반환 여부를 미리 표현하는 보조 정보

`archive`는 UI에서 “ZIP 다운로드” 문구를 보강할 때 사용한다.

## 9. 프론트엔드 설계

### 9.1 결과 페이지

상단 hero 또는 산출물 목록 상단에 다운로드 액션 영역을 둔다.

- 전체 묶음 다운로드 버튼 유지
- 포맷별 다운로드 버튼 추가
- 예시 라벨
  - `DOCX 다운로드`
  - `XLSX 다운로드`
  - `MD 다운로드`

### 9.2 모듈별 목록

- 기존 artifact 카드 목록은 그대로 유지한다.
- 각 카드에는 모듈명, 파일명, 포맷, 크기를 표시한다.
- 카드의 개별 다운로드 버튼도 유지한다.
- 사용자는 필요 시 개별 파일을 확인할 수 있고, 일반적 상황에서는 포맷별 다운로드 버튼을 사용할 수 있다.

### 9.3 라벨 정책

다국어 메시지에 다음 라벨이 필요하다.

- 포맷별 다운로드 영역 제목
- 각 포맷 다운로드 버튼 라벨
- zip/직접 다운로드 보조 문구

## 10. sample-projects 설계

### 10.1 추가할 디렉터리

- `sample-projects/gradle-multi-jdk17`
- `sample-projects/gradle-multi-jdk21`
- `sample-projects/maven-multi-jdk17`
- `sample-projects/maven-multi-jdk21`

### 10.2 공통 구조

모든 샘플은 아래 3모듈 구조를 사용한다.

- `api`
- `service`
- `support`

모듈 역할:

- `support`
  - 공용 모델
  - enum
  - util
  - 공통 interface
- `service`
  - 비즈니스 서비스
  - `support` 의존
- `api`
  - 컨트롤러 성격 클래스
  - `service` 의존

### 10.3 공통 코드 원칙

- 기본 패키지 `com.example.catalog`
- Javadoc 포함
- `class`, `interface`, `enum`, `record`, inner class 포함
- 접근 제어자 다양성 유지
- 빌드 결과물 디렉터리 제외

## 11. 테스트 전략

### 11.1 ProjectDetectorTest

추가 검증:

- Maven 멀티모듈에서 `api`, `service`, `support` 3개 모듈 감지
- Gradle 멀티모듈에서 선언된 하위 모듈만 감지
- 누락된 선언 모듈은 warning 대상이 되는 메타 흐름 검증

### 11.2 EndToEndTest

추가 검증:

- Gradle 멀티모듈 3모듈 + `docx,xlsx,md` 선택 시 artifact 9개
- Maven 멀티모듈 3모듈 + `docx,xlsx,md` 선택 시 artifact 9개
- artifact 파일명에 모듈명 포함

### 11.3 JobControllerTest

추가 검증:

- 결과 응답에 `formatDownloads` 포함
- 단일 모듈 `downloads/xlsx`가 직접 파일 반환
- 멀티모듈 `downloads/xlsx`가 zip 반환
- zip 내부에 `xlsx` 파일만 포함
- 포맷 미존재 시 404 반환

### 11.4 ViewControllerTest

추가 검증:

- 결과 페이지에 포맷별 다운로드 액션 영역 렌더링
- 전체 묶음 버튼 유지
- 모듈별 artifact 목록 컨테이너 유지

## 12. 구현 순서

1. `ProjectDetectorTest`에 실패 테스트 추가
2. `ProjectDetector`에 Maven 멀티모듈 감지와 warning 처리 구현
3. `EndToEndTest`에 Gradle/Maven 3모듈 케이스 추가
4. `JobControllerTest`에 포맷별 다운로드 API 실패 테스트 추가
5. `JobController`와 DTO 수정
6. `result.html`/`result.js` 수정
7. 다국어 메시지 보강
8. `sample-projects` 4종 추가
9. `./gradlew check build` 수행

## 13. 복잡도

- 시간 복잡도: `O(B + M + F)`
  - `B`: 빌드 메타 파일 파싱 비용
  - `M`: 모듈 수
  - `F`: Java 소스 파일 순회 비용
- 포맷별 다운로드 시간 복잡도: `O(A_f + bytes_f)`
  - `A_f`: 해당 포맷 artifact 개수
  - `bytes_f`: 해당 포맷 총 바이트 수
- 공간 복잡도: `O(M + S)`
  - `S`: 수집된 소스 경로 수

## 14. 리스크와 대응

- Maven `<modules>` 파싱이 단순 정규식에 과도하게 의존할 수 있다.
  - 대응: 테스트 케이스를 공백, 줄바꿈 포함 형태로 충분히 추가한다.
- 누락된 모듈 디렉터리를 warning으로 넘기면 사용자가 일부 누락을 즉시 모를 수 있다.
  - 대응: 결과 페이지 warning 영역에 명확한 코드와 메시지를 표시한다.
- 포맷별 다운로드가 단일 파일과 zip을 모두 반환하므로 프론트 문구가 모호할 수 있다.
  - 대응: DTO의 `archive` 필드와 라벨 문구로 보조 설명을 제공한다.

## 15. 완료 기준

- Gradle 멀티모듈 Java ZIP 업로드 시 모듈별 산출물이 생성된다.
- Maven 멀티모듈 Java ZIP 업로드 시 모듈별 산출물이 생성된다.
- 결과 페이지에서 전체 묶음 다운로드 버튼이 유지된다.
- 결과 페이지에서 포맷별 다운로드 버튼이 동작한다.
- 단일 모듈 포맷 다운로드는 직접 파일을 반환한다.
- 멀티모듈 포맷 다운로드는 zip을 반환한다.
- 모듈별 artifact 목록은 결과 페이지에 계속 표시된다.
- `sample-projects` 4종을 이용해 수동 회귀 검증이 가능하다.
- `./gradlew check build`가 통과한다.
