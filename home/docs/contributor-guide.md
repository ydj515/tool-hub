# Home Contributor Guide

## Project Overview
`home/` is the Vite + React + TypeScript landing page for Tool Hub. Main app code lives in `src/`, reusable UI in `src/components/`, shared hooks in `src/hooks/`, and tool metadata in `src/data/tools.ts`.

## Project Commands
- `npm install`
- `npm run dev`
- `npm run test`
- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `npm run preview`

## Project Notes
- Preserve the current Vite/Tailwind structure.
- Use `PascalCase` for components and `useXxx` for hooks.
- Do not edit generated output in `dist/`.
- When updating tool entries, verify links, labels, and status values in `src/data/tools.ts`.
- Add or update test code for behavior changes instead of relying on manual checks alone.

## Manual Verification Checklist
- Confirm the page loads in the browser without runtime errors.
- Check that filtering and navigation work as expected on the home screen.
- Verify visible UI updates in both light and dark themes.
- If tool metadata changed, confirm the affected cards render the expected labels and links.
