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

## Design Tokens

`ds-tokens.css`, `ds-base.css`, `ds-primitives.css`, and `ds-sync.test.ts` under `apps/electron/renderer/styles/` are generated from the canonical source in `packages/design-system/`. **Do not edit them directly.** Modify the canonical source and run `npm run tokens:sync` from the repository root. If synchronization is skipped, `npm run test` will fail.

Keep app-specific tokens only in `styles/theme.local.css`:

- Always-dark colors for the sidebar and log panel, which cannot use canonical light-theme surface tokens.
- Fixed workbench dimensions (such as `--topbar-h`) and modal `::backdrop` colors.
- Local `@font-face` declarations using relative paths, overriding canonical root-relative font URLs because the Electron renderer loads over `file://`.

Do not add raw color, radius, shadow, font-size, or z-index literals to `style.css`. `e2e/design-tokens.spec.js` verifies token consumption and dark-surface contrast against computed styles in the renderer.

## Manual Verification Checklist
- Run the sample CLI flow and confirm screenshots are created in the expected output path.
- Verify failure handling and logs if the changed code affects input parsing or capture behavior.
- For Electron changes, confirm app launch, file selection, capture start, and cancellation flows.
- If packaging-related code changed, run the relevant bundle or packaging command and confirm it completes.

## Dependency Security Notes

- SheetJS `xlsx` uses the versioned 0.20.3 tarball from the [official distribution](https://docs.sheetjs.com/docs/getting-started/installation/nodejs/), because the npm registry release remains at the vulnerable 0.18.5 version. Keep the tarball URL and lockfile integrity together when updating it.
- The root `pptxgenjs` override pins its transitive `image-size` dependency to the patched 2.x line. PptxGenJS 4.0.1 does not import it in its distributed runtime; verify real PPTX generation with `packages/core/src/exporters/ppt-assets.test.mjs` when changing this override.
