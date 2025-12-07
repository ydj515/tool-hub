# Webpage Capture Tool

Playwright 기반으로 URL 목록을 순회하며 전체 페이지 스크린샷을 저장하는 CLI와 Electron UI를 한 저장소에서 관리합니다. npm workspaces를 사용합니다.

## 패키지 구성
- `packages/core` (`@webpage-capture/core`): 옵션 파서, 데이터 로더, Playwright 스크린샷 실행 로직.
- `packages/cli` (`@webpage-capture/cli`): CLI 엔트리(`webpage-capture`), 샘플 데이터(`sample-files/`, `datalist.xlsx`).
- `apps/electron` (`@webpage-capture/electron-app`): GUI 래퍼. 내부에서 CLI를 child process로 실행해 로그를 보여줍니다.

## 설치
```bash
npm install
# Playwright Chromium 설치 (GUI/빌드 전 1회)
npm run setup
```

## CLI 사용
루트에서 실행:
```bash
npm run cli -- --file absolutePath/packages/cli/sample-files/sample.xlsx
# 또는
npx webpage-capture --file packages/cli/sample-files/sample.xlsx --wait 2500 --headless false
```

주요 옵션은 `--sheet`, `--id`/`--subject`/`--url`, `--out`(기본: 실행 디렉토리의 `./screenshots`), `--wait`, `--headless false`, `--dedupe false`, `--csvEncoding utf8|cp949|euc-kr`. TXT 파일은 한 줄 한 URL, `#` 주석 허용.

샘플 데이터는 `packages/cli/sample-files`와 `packages/cli/datalist.xlsx`에 있습니다.

## Electron 앱
```bash
npm start                 # dev 모드로 GUI 실행
npm run setup:bundle      # Playwright 브라우저 번들 다운로드
npm run build:mac         # macOS dmg (workspace 스크립트 호출)
npm run build:win         # Windows nsis
```

앱은 `@webpage-capture/cli`를 실행해 stdout/stderr를 실시간 스트리밍하며, 브라우저 경로가 없으면 Playwright 캐시/번들 순으로 탐색합니다.

## 작업 메모

- 의존성 추가/삭제시 항상 루트에서
    ```sh
    npm install some-lib --workspace @webpage-capture/cli
    npm install some-lib --workspace @webpage-capture/electron-app
    ```