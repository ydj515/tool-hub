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

## Manual Verification Checklist
- Run the sample CLI flow and confirm screenshots are created in the expected output path.
- Verify failure handling and logs if the changed code affects input parsing or capture behavior.
- For Electron changes, confirm app launch, file selection, capture start, and cancellation flows.
- If packaging-related code changed, run the relevant bundle or packaging command and confirm it completes.
