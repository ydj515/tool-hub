# Webpage Capture Tool (Electron + CLI)

Playwright로 URL 목록을 순회하며 전체 페이지 스크린샷을 저장합니다. CLI로 바로 실행하거나 Electron UI에서 파일/옵션을 고르고 실행 로그를 볼 수 있습니다.

## 설치

```bash
npm install
npm run setup   # Playwright용 Chromium 설치
```

> 브라우저를 앱에 포함하려면 빌드 전에 `npm run setup:bundle`을 실행하세요. (이 스크립트는 `PLAYWRIGHT_BROWSERS_PATH=playwright-browsers`로 Chromium을 내려받아 빌드 시 리소스로 함께 포함합니다.)

## CLI 사용법

```bash
node screenshot.js --file datalist.xlsx
node screenshot.js --files sample.xlsx,sample.csv --headless false --wait 2500
```

필수
- `--file` 또는 `--files`: 콤마로 구분한 xlsx/csv/txt 경로.

주요 옵션
- `--sheet`: 시트명 (기본 `page-list`).
- `--id` / `--subject` / `--url`: 컬럼 헤더 이름 (대소문자/언더스코어 차이는 자동 매핑).
- `--out`: 출력 폴더 (기본 `./screenshots`).
- `--wait`: 페이지 진입 후 대기(ms), 기본 2000.
- `--headless false`: 브라우저 UI 표시.
- `--dedupe false`: URL 중복 제거 끄기.
- `--csvEncoding`: CSV 인코딩(`utf8`, `cp949`, `euc-kr`). 잘못된 값 입력 시 경고 후 기본값 사용.

입력 포맷
- xlsx/csv: 기본 시트 `page-list`, 헤더 `id / subject / detailPage`. 대소문자/언더스코어(`detail_page`)는 자동 매핑됩니다.
- txt: 한 줄 한 URL, `#`로 시작하는 라인은 무시.
- 시트명을 찾지 못하면 첫 번째 시트로 자동 대체하면서 경고를 출력합니다.

출력
- 기본 저장 경로는 `./screenshots`, 파일명은 `001_subject.png` 형태로 생성됩니다.

## Electron UI

```bash
npm start
```

- 입력: 드래그&드롭 또는 클릭으로 파일 선택(복수), 경로 수동 입력 지원.
- 출력/옵션: 출력 폴더 선택, 시트명, 컬럼 매핑, 대기 시간, dedupe/헤드리스 체크박스.
- 로그: 실행/에러 로그 스트림 확인, 실행 중 취소 버튼으로 프로세스 종료.
- 내부적으로 `node screenshot.js ...` 를 `child_process.spawn` 으로 호출하여 stdout/stderr를 실시간 표시합니다.

## 패키징

```bash
npm run build:mac   # macOS dmg
npm run build:win   # Windows nsis
```

- 빌드 전에 `npm run setup:bundle`을 실행하면 Playwright Chromium이 `playwright-browsers` 폴더에 다운로드되고, 빌드 시 함께 포함되어 사용자 PC에 별도 설치 없이 동작합니다.
- 내부적으로 Electron이 CLI(`screenshot.js`)를 실행하며 `PLAYWRIGHT_BROWSERS_PATH`를 포함된 브라우저 폴더로 지정합니다. (미포함 시엔 로컬 cache `.local-browsers` → 사용자 캐시 순으로 탐색)
