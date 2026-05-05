# Dummy File Generator Contributor Guide

## Project Overview
`dummy-file-generator/` is a Next.js App Router app for generating files by size. UI code lives in `app/`, reusable UI in `app/_components/`, and core generation logic in `lib/` with format-specific code under `lib/generators/`.

## Project Commands
- `npm install`
- `npm run dev`
- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`
- `npm run start`

## Project Notes
- Keep route handlers thin and move reusable logic into `lib/`.
- Add or update regression tests for behavior changes.
- Use `tests/TEST_PLAN.md` as the manual verification baseline.
- If API behavior changes, update related docs in `docs/`.

## Manual Verification Checklist
- Generate at least one representative file and confirm the request succeeds.
- Verify downloaded output opens for the affected format or code path.
- Check edge behavior for size, mode, or seed-related changes when relevant.
- If API behavior changed, verify both the UI flow and the affected API response fields.
