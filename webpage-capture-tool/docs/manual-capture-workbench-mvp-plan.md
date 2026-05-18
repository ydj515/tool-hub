# MVP 개발 태스크 분해: Manual Capture Workbench

| 항목 | 내용 |
|---|---|
| 프로젝트 | webpage-capture-tool |
| 문서 목적 | MVP 범위의 개발 순서, 태스크 단위, 검증 기준 정의 |
| 작성일 | 2026-05-07 |
| 상태 | 초안 |

---

## 0. 연관 문서

- 제품 요구사항: [PRD-manual-capture-workbench.md](PRD-manual-capture-workbench.md)
- Electron 메뉴/화면 와이어프레임: [manual-capture-workbench-wireframes.md](manual-capture-workbench-wireframes.md)
- 개발 전 추가 결정 체크리스트: [manual-capture-workbench-predev-checklist.md](manual-capture-workbench-predev-checklist.md)

---

## 1. 문서 목적

이 문서는 `Manual Capture Workbench` MVP를 실제 구현 가능한 개발 단위로 쪼개기 위한 실행 문서입니다.

핵심 목표는 아래와 같습니다.

- 와이어프레임 수준의 아이디어를 실제 작업 순서로 바꾼다.
- `packages/core`, `packages/cli`, `apps/electron`의 역할을 분리한다.
- 각 단계별 완료 조건과 검증 방법을 명확히 한다.

---

## 2. MVP 범위 재확인

### 포함 범위

- 단일 URL / 목록 파일 캡처
- 뷰포트 프리셋
- selector 기반 텍스트 치환
- selector 기반 요소 숨기기
- 캡처 후 블러 / 박스 가리기
- 크롭 / 리사이즈
- 레시피 저장 / 불러오기
- Markdown / Word Assets / PPT Assets 내보내기

### 제외 범위

- `.docx` / `.pptx` 직접 생성
- 화살표 / 스텝 번호 / 강조 박스
- AI 인페인팅 / 자연스러운 객체 제거
- 팀 공유 / 동기화 기능

---

## 3. 구현 전략

### 원칙

1. 기존 CLI 캡처 흐름을 깨지 않는다.
2. 캡처 전 규칙과 캡처 후 규칙을 서로 다른 데이터 모델로 관리한다.
3. Electron UI는 한 번에 완성하지 말고 App Shell부터 단계적으로 바꾼다.
4. 내보내기 기능은 처음부터 채널별 프로필 구조를 갖추고 시작한다.

### 작업 순서 개요

```text
0. 기반 정리
1. App Shell 전환
2. 캡처 옵션 확장
3. DOM 규칙 엔진
4. 이미지 후처리 엔진
5. 레시피 저장/불러오기
6. 내보내기 프로필
7. Electron 화면 연결
8. 회귀 테스트 / 문서 정리
```

---

## 4. 워크스트림 분해

### 4.1 Stream A: App Shell / 상태 구조

목표:

- 기존 단일 폼을 워크벤치형 레이아웃으로 전환
- 향후 기능을 끼워 넣을 수 있는 상태 구조 확보

주요 태스크:

| ID | 태스크 | 위치 | 우선순위 |
|---|---|---|---|
| A-01 | 현재 `index.html`을 App Shell 구조로 재구성 | `apps/electron/renderer/index.html` | P0 |
| A-02 | 좌측 탐색, 중앙 작업영역, 우측 속성 패널, 하단 로그 레이아웃 추가 | `apps/electron/renderer/index.html`, `style.css` | P0 |
| A-03 | `renderer.js`를 모드 전환 중심 상태 관리 구조로 리팩터링 | `apps/electron/renderer/renderer.js` | P0 |
| A-04 | 현재 화면 모드(`capture`, `dom`, `edit`, `export`) 상태 모델 도입 | `renderer.js` | P0 |
| A-05 | 공통 상태 렌더 함수와 이벤트 바인딩 분리 | `renderer.js` | P1 |

완료 조건:

- 좌측 메뉴 클릭 시 중앙 화면이 전환된다.
- 기존 로그 영역은 계속 동작한다.
- 캡처 실행 기능이 새 레이아웃에서도 깨지지 않는다.

검증:

- `npm run lint`
- `npm run test`
- `npm start` 후 메뉴 전환, 실행 버튼, 실패 URL 영역 수동 확인

---

### 4.2 Stream B: 캡처 옵션 / 뷰포트 프리셋

목표:

- 단일 URL 입력과 뷰포트 프리셋 지원
- 캡처 범위 옵션 확장

주요 태스크:

| ID | 태스크 | 위치 | 우선순위 |
|---|---|---|---|
| B-01 | CLI/Core 옵션에 `singleUrl` 입력 지원 | `packages/core/src/options.js`, `packages/cli/src/run-capture.js` | P0 |
| B-02 | `viewportPreset` 데이터 구조 추가 | `packages/core/src/options.js` | P0 |
| B-03 | 사용자 정의 width/height 입력 지원 | `packages/core/src/options.js` | P0 |
| B-04 | 캡처 범위 옵션(`fullPage`, `viewport`, `selector`) 정의 | `packages/core/src/options.js`, `screenshot-runner.js` | P0 |
| B-05 | Electron 캡처 화면에 단일 URL 입력 폼 추가 | `apps/electron/renderer/*` | P0 |
| B-06 | 뷰포트 프리셋 셀렉터와 사용자 정의 입력 추가 | `apps/electron/renderer/*` | P0 |

완료 조건:

- 파일 입력 없이 단일 URL만으로 캡처 가능하다.
- Word/PPT/Markdown 기본 프리셋을 선택하면 캡처 크기에 반영된다.
- 현재 뷰포트 캡처와 전체 페이지 캡처를 전환할 수 있다.

검증:

- 옵션 파싱 테스트 추가
- Playwright 캡처 범위 분기 테스트 추가
- 샘플 URL 대상으로 수동 캡처 확인

---

### 4.3 Stream C: DOM 규칙 엔진

목표:

- 캡처 전 텍스트 치환과 요소 숨기기 지원
- 규칙 실패를 구조화된 로그로 남김

주요 태스크:

| ID | 태스크 | 위치 | 우선순위 |
|---|---|---|---|
| C-01 | DOM 규칙 데이터 모델 정의 | `packages/core/src` | P0 |
| C-02 | `dom-rule-runner.js` 신규 추가 | `packages/core/src/dom-rule-runner.js` | P0 |
| C-03 | `replaceText` 규칙 처리 구현 | `packages/core/src/dom-rule-runner.js` | P0 |
| C-04 | `hide` 규칙 처리 구현 | `packages/core/src/dom-rule-runner.js` | P0 |
| C-05 | selector 미존재 시 구조화된 경고/오류 로깅 | `packages/core/src/dom-rule-runner.js` | P0 |
| C-06 | 스크린샷 실행 직전 DOM 규칙 적용 흐름 연결 | `packages/core/src/screenshot-runner.js` | P0 |
| C-07 | Electron DOM 규칙 편집 UI 추가 | `apps/electron/renderer/*` | P0 |
| C-08 | 규칙 목록 추가/삭제/활성화 토글 UI | `apps/electron/renderer/*` | P0 |

완료 조건:

- 지정 selector의 텍스트가 캡처 전에 치환된다.
- 지정 selector가 숨김 처리된 상태로 캡처된다.
- 규칙 실패가 URL 실패와 구분되어 로그에 표시된다.

검증:

- DOM 규칙 단위 테스트
- 샘플 HTML 또는 테스트 페이지로 규칙 적용 결과 검증
- Electron에서 규칙 추가 후 실행 수동 확인

---

### 4.4 Stream D: 이미지 후처리 엔진

목표:

- 캡처된 PNG에 대해 블러 / 박스 / 크롭 / 리사이즈를 적용
- 후처리 규칙을 저장 가능한 형태로 관리

주요 태스크:

| ID | 태스크 | 위치 | 우선순위 |
|---|---|---|---|
| D-01 | 후처리 규칙 데이터 모델 정의 | `packages/core/src` | P0 |
| D-02 | 이미지 편집 엔진 파일 추가 | `packages/core/src/image-edit-runner.js` | P0 |
| D-03 | 크롭 처리 구현 | `packages/core/src/image-edit-runner.js` | P0 |
| D-04 | 리사이즈 처리 구현 | `packages/core/src/image-edit-runner.js` | P0 |
| D-05 | 블러 처리 구현 | `packages/core/src/image-edit-runner.js` | P0 |
| D-06 | 단색 박스 오버레이 구현 | `packages/core/src/image-edit-runner.js` | P0 |
| D-07 | 후처리 파이프라인을 캡처 결과에 연결 | `packages/core/src/screenshot-runner.js` 또는 별도 orchestrator | P0 |
| D-08 | Electron 이미지 편집 캔버스 UI 추가 | `apps/electron/renderer/*` | P0 |
| D-09 | 블러/박스/크롭 조작 핸들 구현 | `apps/electron/renderer/*` | P0 |

완료 조건:

- 이미지 한 장에 대해 영역 블러와 박스 가리기가 가능하다.
- 크롭/리사이즈 결과를 내보내기 전에 미리 확인할 수 있다.
- 후처리 규칙이 JSON 형태로 직렬화 가능하다.

검증:

- 이미지 편집 단위 테스트
- 샘플 PNG를 이용한 golden output 또는 메타 검증
- Electron에서 드래그 기반 편집 수동 확인

---

### 4.5 Stream E: 레시피 / 프로젝트 저장

목표:

- DOM 규칙과 이미지 편집 규칙을 저장하고 다시 적용

주요 태스크:

| ID | 태스크 | 위치 | 우선순위 |
|---|---|---|---|
| E-01 | 프로젝트 JSON 스키마 정의 | `packages/core/src` | P0 |
| E-02 | 레시피 저장/불러오기 유틸 추가 | `packages/core/src/recipe-store.js` | P0 |
| E-03 | Electron 프로젝트 저장 IPC 추가 | `apps/electron/main.js`, `preload.js` | P0 |
| E-04 | 새 프로젝트 / 저장 / 불러오기 UI 추가 | `apps/electron/renderer/*` | P0 |
| E-05 | 최근 프로젝트 목록 관리 | `apps/electron/*` | P1 |
| E-06 | 특정 페이지 예외 규칙 덮어쓰기 구조 정의 | `packages/core/src` | P1 |

완료 조건:

- 프로젝트를 파일로 저장하고 다시 열었을 때 상태가 복원된다.
- 저장한 레시피를 다른 캡처 세트에 다시 적용할 수 있다.

검증:

- JSON 저장/로드 테스트
- Electron 파일 저장/열기 수동 확인

---

### 4.6 Stream F: 내보내기 프로필

목표:

- Markdown / Word Assets / PPT Assets 출력 구조 생성

주요 태스크:

| ID | 태스크 | 위치 | 우선순위 |
|---|---|---|---|
| F-01 | 출력 프로필 모델 정의 | `packages/core/src/export-profile.js` | P0 |
| F-02 | Markdown exporter 구현 | `packages/core/src/exporters/markdown.js` | P0 |
| F-03 | Word assets exporter 구현 | `packages/core/src/exporters/word-assets.js` | P0 |
| F-04 | PPT assets exporter 구현 | `packages/core/src/exporters/ppt-assets.js` | P0 |
| F-05 | `manifest.json` 공통 스키마 정의 | `packages/core/src/exporters/*` | P0 |
| F-06 | 파일명 규칙 처리 유틸 추가 | `packages/core/src/export-filename.js` | P0 |
| F-07 | Electron 내보내기 화면과 출력 옵션 UI 추가 | `apps/electron/renderer/*` | P0 |

완료 조건:

- Markdown 초안과 이미지 폴더가 생성된다.
- Word/PPT용 자산 폴더와 메타데이터 파일이 생성된다.
- 파일명 규칙이 일관되게 적용된다.

검증:

- exporter 단위 테스트
- 샘플 프로젝트로 내보내기 수동 검증
- 생성 디렉터리 구조 확인

---

### 4.7 Stream G: 배치 작업 / 실패 복구

목표:

- 여러 대상에 레시피를 반복 적용
- 실패 항목만 재실행

주요 태스크:

| ID | 태스크 | 위치 | 우선순위 |
|---|---|---|---|
| G-01 | 캡처 결과 리스트 상태 모델 추가 | `apps/electron/renderer/*` | P0 |
| G-02 | 선택 항목 기반 배치 적용 UI | `apps/electron/renderer/*` | P0 |
| G-03 | 실패 항목 필터와 재실행 UI 강화 | `apps/electron/renderer/*` | P0 |
| G-04 | 규칙 실패 / 네비게이션 실패 / 내보내기 실패 구분 로깅 | `packages/core/src`, `apps/electron/*` | P0 |
| G-05 | 배치 적용 오케스트레이터 추가 | `packages/core/src` 또는 `packages/cli/src` | P1 |

완료 조건:

- 실패 항목만 다시 선택하고 재실행할 수 있다.
- 배치 적용 대상과 결과 상태를 UI에서 볼 수 있다.

검증:

- 구조화된 로그 테스트
- 의도적 실패 케이스 수동 검증

---

## 5. 구현 순서 제안

### 1차 스프린트

- A-01 ~ A-04
- B-01 ~ B-06

산출:

- App Shell
- 단일 URL 지원
- 뷰포트 프리셋
- 캡처 화면 기본 전환

### 2차 스프린트

- C-01 ~ C-08

산출:

- DOM 치환 / 숨기기 엔진
- DOM 편집 화면

### 3차 스프린트

- D-01 ~ D-09

산출:

- 이미지 편집 MVP
- 블러 / 박스 / 크롭 / 리사이즈

### 4차 스프린트

- E-01 ~ E-04
- F-01 ~ F-07

산출:

- 프로젝트 저장/로드
- Markdown / Word Assets / PPT Assets 내보내기

### 5차 스프린트

- G-01 ~ G-04
- 문서 정리 / 회귀 검증

산출:

- 배치 작업 강화
- 실패 복구 UX 정리

---

## 6. 파일 단위 예상 변경 범위

### 기존 파일 수정

| 파일 | 변경 내용 |
|---|---|
| `apps/electron/renderer/index.html` | App Shell 구조로 재편 |
| `apps/electron/renderer/style.css` | 워크벤치 레이아웃, 패널, 캔버스 스타일 추가 |
| `apps/electron/renderer/renderer.js` | 모드 전환, 상태 관리, 편집 UI 로직 추가 |
| `apps/electron/main.js` | 프로젝트 저장/불러오기, 추가 IPC |
| `apps/electron/preload.js` | 저장/불러오기/내보내기 관련 브리지 추가 |
| `packages/core/src/options.js` | 단일 URL, 뷰포트 프리셋, 캡처 범위 옵션 추가 |
| `packages/core/src/screenshot-runner.js` | DOM 규칙 적용, 캡처 범위 분기, 후처리 호출 연결 |
| `packages/cli/src/run-capture.js` | 신규 옵션 반영 |

### 신규 파일 예상

| 파일 | 역할 |
|---|---|
| `packages/core/src/dom-rule-runner.js` | DOM 치환 / 숨기기 엔진 |
| `packages/core/src/image-edit-runner.js` | 이미지 후처리 엔진 |
| `packages/core/src/recipe-store.js` | 프로젝트 / 레시피 저장 |
| `packages/core/src/export-profile.js` | 출력 프로필 정의 |
| `packages/core/src/exporters/markdown.js` | Markdown 내보내기 |
| `packages/core/src/exporters/word-assets.js` | Word 자산 패키지 |
| `packages/core/src/exporters/ppt-assets.js` | PPT 자산 패키지 |

---

## 7. 테스트 전략

### 자동 테스트

| 영역 | 검증 |
|---|---|
| 옵션 파싱 | 단일 URL, 뷰포트, 캡처 범위, 내보내기 옵션 파싱 |
| DOM 규칙 | `replaceText`, `hide`, selector 실패 처리 |
| 이미지 후처리 | 크롭, 리사이즈, 블러, 박스 처리 결과 |
| 저장/로드 | 프로젝트 JSON 직렬화/복원 |
| 내보내기 | Markdown / Word Assets / PPT Assets 파일 구조 생성 |

### 수동 검증

| 시나리오 | 확인 항목 |
|---|---|
| 단일 URL 캡처 | 뷰포트 프리셋 반영 여부 |
| DOM 치환 캡처 | 치환 텍스트/숨김 요소 결과 확인 |
| 이미지 편집 | 블러/박스/크롭 UI와 결과 확인 |
| 프로젝트 저장/로드 | 상태 복원 여부 |
| 내보내기 | 채널별 산출 디렉터리 구조와 파일명 확인 |
| 실패 복구 | 실패 항목 재실행 여부 |

---

## 8. 완료 정의

아래를 만족하면 MVP 완료로 봅니다.

1. 사용자가 단일 URL 또는 목록 파일을 입력할 수 있다.
2. DOM 텍스트 치환 또는 selector 숨기기를 설정할 수 있다.
3. 캡처 후 블러 또는 박스 가리기 편집이 가능하다.
4. 프로젝트를 저장했다가 다시 열 수 있다.
5. Markdown / Word Assets / PPT Assets 내보내기가 동작한다.
6. 실패 항목만 다시 실행할 수 있다.
7. 관련 자동 테스트와 수동 검증 체크가 완료된다.

---

## 9. 예상 리스크

| 리스크 | 설명 | 대응 |
|---|---|---|
| Electron UI 복잡도 상승 | 한 파일에 로직이 집중되면 유지보수가 어려워짐 | 모드별 렌더/이벤트 함수 분리 |
| 이미지 편집 라이브러리 선택 | 직접 구현 시 비용 증가 가능 | 초기에는 최소 기능에 맞는 검증된 라이브러리 검토 |
| DOM 규칙 적용 타이밍 | SPA 렌더링 시 selector가 늦게 생길 수 있음 | 대기 전략과 재시도 옵션 도입 |
| 내보내기 포맷 확장 | 초기 구조가 좁으면 `.docx` / `.pptx` 확장 어려움 | 프로필/manifest 중심 모델로 설계 |

---

## 10. 대안 비교

### 대안 1: UI부터 먼저 완성

- 장점:
  - 사용자 데모가 빠르다.
  - 화면 흐름을 조기에 검증하기 좋다.
- 단점:
  - 코어 엔진이 늦어지면 목업 UI가 쉽게 깨진다.
  - 재작업 가능성이 크다.

### 대안 2: 코어 엔진부터 먼저 완성

- 장점:
  - CLI와 재사용 가능한 로직이 먼저 안정화된다.
  - 테스트 작성이 수월하다.
- 단점:
  - 사용자 입장에서 진척이 눈에 덜 보인다.

### 권장안

App Shell과 캡처 기본 흐름을 먼저 잡고, 그 다음 DOM 규칙과 후처리 엔진을 연결하는 **혼합 전략**이 가장 적합합니다.

이 방식은 데모 가능성과 구조 안정성을 둘 다 챙길 수 있습니다.

---

## 11. 결론

MVP 구현은 기능을 한 번에 다 넣기보다 아래 순서로 가는 것이 가장 안전합니다.

1. App Shell과 캡처 입력 구조 전환
2. DOM 규칙 엔진 도입
3. 이미지 후처리 MVP
4. 프로젝트 저장과 채널별 내보내기
5. 배치 작업과 실패 복구 정리

이 순서를 따르면 현재 `webpage-capture-tool`의 강점인 Playwright 캡처 기반을 유지하면서도, 매뉴얼 제작 워크플로에 필요한 기능을 단계적으로 쌓아갈 수 있습니다.
