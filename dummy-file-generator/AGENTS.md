# Repository Guidelines

## Project Structure & Module Organization
`app/` contains the Next.js App Router UI and API routes, including `app/api/generate`, `app/api/download/[id]`, and `app/api/blob/sign`. Put reusable UI in `app/_components/`. Core generation logic lives in `lib/`, with format-specific code under `lib/generators/` and supporting modules such as `policy.ts`, `store.ts`, and `rate-limit.ts`. Unit tests sit close to the generator code in `lib/generators/__tests__/`. Reference material belongs in `docs/`, and broader validation scenarios belong in `tests/TEST_PLAN.md`.

## Build, Test, and Development Commands
Use `npm install` to install dependencies. Run `npm run dev` for local development at `http://localhost:3000`. Use `npm run build` to create a production build and `npm run start` to serve it. Run `npm run lint` for Next.js lint checks, `npm run typecheck` for strict TypeScript validation, `npm test` for a one-shot Vitest run, and `npm run test:watch` while developing.

## Coding Style & Naming Conventions
This repository uses strict TypeScript. Match the existing style: 2-space indentation, semicolons, double quotes, and small focused functions. Keep route handlers thin and move reusable logic into `lib/`. Use PascalCase for React components, lowercase file names for utility modules such as `hash.ts` or `store.ts`, and `*.test.ts` for tests. Prefer the `@/` alias from `tsconfig.json` over deep relative imports.

## Testing Guidelines
Vitest runs in a `node` environment. Add tests alongside the related generator or helper, and use fixed seeds to keep outputs deterministic. Cover new file types, fallback branches, size-policy edge cases, and API contract changes. There is no enforced coverage threshold, but every behavior change should ship with a regression test and, if user-facing, an update to `tests/TEST_PLAN.md` or `docs/API.md`.

## Commit & Pull Request Guidelines
Recent history follows a conventional format like `build(dummy-file-generator): package version update & ts config 적용`. Prefer `type(scope): summary`, with clear scopes such as `app`, `lib`, or `dummy-file-generator`. PRs should explain the user-visible change, list validation commands run, link related issues, and include screenshots when `app/` UI changes. If API behavior changes, update `README.md` and `docs/API.md` in the same PR.

## Security & Configuration Tips
Do not commit secrets or generated artifacts such as `.next/` output. `POST /api/blob/sign` is only fully useful when `BLOB_READ_WRITE_TOKEN` is configured; otherwise it remains a stub path. Remember that generated files are stored in memory with a 30-minute TTL, so changes to storage or retention policy should be documented clearly.
