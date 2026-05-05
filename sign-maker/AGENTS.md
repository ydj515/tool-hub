# Repository Guidelines

## Project Structure & Module Organization
This repository is a small Vite app for drawing signatures or extracting them from uploaded images. Main source files live in `src/`. Keep page-level wiring in `src/App.tsx`, shared UI in `src/components/`, and global styles in `src/index.css` and `src/App.css`. Static assets belong in `public/`, while documentation images stay in `docs/`. Build output is generated in `dist/` and should not be edited manually.

## Build, Test, and Development Commands
- `npm install`: install project dependencies.
- `npm run dev`: start the local Vite development server.
- `npm run build`: run TypeScript project build and produce a production bundle in `dist/`.
- `npm run preview`: serve the production build locally for a final browser check.
- `npm run lint`: run ESLint across the repository.
- `mise run dev` / `mise run build`: optional wrappers for contributors using `mise`.

## Coding Style & Naming Conventions
Use TypeScript and React function components throughout the app. Name components and component files in `PascalCase` such as `SignaturePad.tsx`; use `camelCase` for functions, refs, and local variables. Follow the surrounding file style rather than introducing a new formatter pattern; current source favors compact React components, explicit types, and short Korean comments only when they add context. Keep CSS variables and theme tokens centralized in `src/index.css`.

## Testing Guidelines
There is no automated test suite configured yet, so every change should pass `npm run lint` and `npm run build` before review. For UI work, also verify both flows manually in the browser:
- draw mode: stroke input, 3-second beautify, PNG download
- upload mode: image import, threshold adjustment, reset, PNG download

If you add automated tests later, keep them close to the feature as `src/**/*.test.ts` or `src/**/*.test.tsx`.

## Commit & Pull Request Guidelines
Recent history uses concise conventional prefixes such as `feat:`, `refactor:`, and `build(scope):`. Follow that style and keep subjects focused on one change, for example `feat: add upload threshold hint`. Pull requests should include a short summary, linked issue or task when available, test notes, and screenshots or recordings for visible UI changes.

## Security & Configuration Tips
Do not commit generated files, local environment secrets, or large sample assets. Keep user-facing file handling limited to supported image types and review any new dependency for browser compatibility before introducing it.
