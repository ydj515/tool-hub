# Repository Guidelines

## Project Structure & Module Organization
This repository is an `npm workspaces` monorepo. Shared capture logic lives in `packages/core`, with key files in `src/options.js`, `src/data-loader.js`, and `src/screenshot-runner.js`. The CLI entrypoint and orchestration flow live in `packages/cli` under `bin/screenshot.js` and `src/run-capture.js`. The Electron GUI is managed in `apps/electron`, split across `main.js`, `preload.js`, and `renderer/`. Use `docs/sample-files` and `docs/sample-screenshots` for sample inputs and expected output references.

## Build, Test, and Development Commands
`npm install`: install root workspace dependencies.
`npm run setup`: install Playwright Chromium.
`npm run cli -- --file docs/sample-files/sample.xlsx`: run the CLI with sample data.
`npm start`: launch the Electron app in development mode.
`npm run setup:bundle`: download the bundled Playwright browser for packaging.
`npm run build:mac` / `npm run build:win`: create Electron distributables.

## Coding Style & Naming Conventions
Follow the existing CommonJS style (`require`, `module.exports`), use 2-space indentation, double quotes, and semicolons. File names use kebab-case such as `run-capture.js`, while functions and variables use camelCase such as `takeScreenshots`. Respect workspace boundaries: keep browser control and file I/O in `packages/core` when possible, and keep CLI and Electron code focused on orchestration. There is no enforced `eslint` or `prettier` config yet, so prefer small diffs that match surrounding code.

## Testing Guidelines
There is currently no dedicated automated test script. After changes, run `npm run cli -- --file docs/sample-files/sample.xlsx` at least once to verify successful capture output, output directory creation, and failure log formatting. For Electron changes, run `npm start` and verify UI launch, log streaming, file selection, and cancellation flow. If you add tests, place them inside the affected workspace and wire them into root or workspace `scripts`.

## Commit & Pull Request Guidelines
Recent history mostly follows `feat: ...`, `fix: ...`, `chore: ...`, and `build: ...`. When possible, add a scope such as `fix(core): handle empty URL rows` to make the change area clear. Keep each commit focused on one workspace or one user-visible behavior change. PRs should include a short summary, affected paths, manual verification commands and results, related issues, and screenshots when `apps/electron/renderer` changes.

## Security & Configuration Tips
Do not commit real business spreadsheets, generated screenshots, or local Playwright browser caches. Follow the browser cache discovery logic already implemented in `apps/electron/main.js`, and avoid hardcoding user-specific environment paths in new code.
