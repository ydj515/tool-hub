# Sign Maker Contributor Guide

## Project Overview
`sign-maker/` is a Vite app for drawing signatures or extracting them from uploaded images. Main source files live in `src/`, shared UI is in `src/components/`, and styles live in `src/index.css` and `src/App.css`.

## Project Commands
- `npm install`
- `npm run dev`
- `npm run test`
- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `npm run preview`

## Project Notes
- Keep page wiring in `src/App.tsx` and reusable UI in `src/components/`.
- Preserve the current React + TypeScript style used in surrounding files.
- Do not edit generated output in `dist/`.
- For UI changes, manually verify draw mode and upload mode flows.
- Add or update test code for behavior changes, especially around theme logic and non-canvas helpers.

## Manual Verification Checklist
- In draw mode, verify stroke input, clear/reset behavior, and PNG export.
- In upload mode, verify image import, threshold adjustments, reset, and PNG export.
- Confirm the app renders without console errors after the change.
- Check that the updated UI still works on a narrow mobile-sized viewport.
