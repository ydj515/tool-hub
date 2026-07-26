# Webpage Capture Tool Contributor Guide

## Project Overview
`webpage-capture-tool/` is an `npm workspaces` monorepo. Shared capture logic lives in `packages/core`, the CLI lives in `packages/cli`, and the Electron app lives in `apps/electron`.

## Project Commands
- `npm install`
- `npm run setup`
- `npm run test`
- `npm run lint`
- `npm run cli -- --file docs/sample-files/sample.xlsx`
- `npm start`
- `npm run setup:bundle`
- `npm run build:mac`
- `npm run build:win`

## Project Notes
- Keep shared browser/file logic in `packages/core`.
- Keep CLI and Electron layers focused on orchestration and UI integration.
- Preserve the existing CommonJS style used across the workspace.
- Do not commit generated screenshots, local browser caches, or real spreadsheet data.
- Add or update test code for CLI parsing and core capture logic changes whenever practical.

## 디자인 토큰

`apps/electron/renderer/styles/` 의 `ds-tokens.css` · `ds-base.css` · `ds-primitives.css` · `ds-sync.test.ts` 는 `packages/design-system/` 정본의 생성물이다. **직접 편집하지 않는다.** 정본을 고친 뒤 저장소 루트에서 `npm run tokens:sync` 를 실행한다. 동기화를 잊으면 `npm run test` 가 실패한다.

앱 고유 토큰만 `styles/theme.local.css` 에 둔다.

- 사이드바·로그 패널의 상시 다크 색상 — 라이트 테마 안의 어두운 영역이라 정본 팔레트를 쓸 수 없다.
- 워크벤치 고정 치수(`--topbar-h` 등)와 모달 `::backdrop` 색.
- 로컬 `@font-face` — 렌더러가 `file://` 로 로드되므로 정본의 절대 경로가 깨진다. 같은 family 를 상대 경로로 재선언해 덮는다.

`style.css` 에는 색상·radius·shadow·font-size·z-index 리터럴을 새로 넣지 않는다. `e2e/design-tokens.spec.js` 가 실제 렌더러의 계산값으로 토큰 소비와 다크 영역 대비를 검증한다.

## Manual Verification Checklist
- Run the sample CLI flow and confirm screenshots are created in the expected output path.
- Verify failure handling and logs if the changed code affects input parsing or capture behavior.
- For Electron changes, confirm app launch, file selection, capture start, and cancellation flows.
- If packaging-related code changed, run the relevant bundle or packaging command and confirm it completes.
