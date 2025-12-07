# Webpage Capture Electron App

모노레포(`npm workspaces`) 내에서 동작하는 GUI 래퍼입니다. `@webpage-capture/cli`를 child process로 실행해 stdout/stderr 로그를 표시합니다.

## 실행

루트에서 의존성 설치 후:
```bash
npm install
npm start   # 워크스페이스(@webpage-capture/electron-app) start 실행
```

Chromium 준비:
```bash
npm run setup         # Playwright용 Chromium 설치
npm run setup:bundle  # 번들 포함 빌드 시 사용 (playwright-browsers 폴더 생성)
```

## 패키징

```bash
npm run build:mac   # macOS dmg
npm run build:win   # Windows nsis
```

- 빌드 전에 `npm run setup:bundle`을 실행하면 Playwright Chromium이 `playwright-browsers` 폴더에 다운로드되고, 빌드 시 함께 포함됩니다.
- 실행 시 CLI(`webpage-capture`)를 스폰하며, Playwright 브라우저 경로를 번들/캐시 순으로 탐색합니다.

## 사용 흐름
- 입력: 드래그&드롭 또는 파일 선택으로 xlsx/csv/txt 다중 지정.
- 옵션: 시트명, 컬럼 매핑, 출력 폴더, 대기 시간, dedupe/headless/csv 인코딩 설정.
- 로그: stdout/stderr를 실시간 표시, 취소 버튼으로 child process 종료.
