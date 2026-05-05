# Repository Guidelines

## Project Structure & Module Organization
This repository is a Next.js 16 App Router project for generating seed SQL from DDL input. Keep route-level UI in `app/`, shared client components in `app/_components/`, and parsing or generation logic in `lib/`. Core modules include `lib/ddl-parser.ts`, `lib/ddl-validation.ts`, `lib/generator.ts`, and `lib/sql-renderer.ts`. Global styles live in `app/globals.css`. Use the `@/*` path alias from `tsconfig.json` instead of long relative imports.

## Build, Test, and Development Commands
- `npm install`: install dependencies from `package-lock.json`.
- `npm run dev`: start the local dev server at `http://localhost:3000`.
- `npm run build`: create a production build and catch integration issues.
- `npm run start`: run the built app locally for a production-style check.
- `npm run typecheck`: run strict TypeScript checks with no emit.
- `npm run lint`: intended ESLint entry point, but currently broken under the present Next.js/ESLint setup and should be fixed before relying on it.

Before opening a PR, run at least `npm run typecheck` and `npm run build`.

## Coding Style & Naming Conventions
Use TypeScript with strict mode enabled. Follow the existing style: 2-space indentation, semicolons, double quotes, and small focused modules. Name React components in PascalCase (`GeneratorClient`), component files in kebab-case (`generator-client.tsx`), and utility modules in lowercase kebab-case or descriptive nouns (`sql-renderer.ts`, `types.ts`). Prefer explicit types for exported APIs and keep DDL dialect logic isolated in `lib/`.

## Testing Guidelines
There is no dedicated automated test directory yet. For now, treat `npm run typecheck` and `npm run build` as the required verification baseline. When adding tests, place them beside the source file or in a local `__tests__/` folder, and name them `*.test.ts` or `*.test.tsx`. Focus coverage on DDL parsing, FK dependency ordering, cycle handling, and dialect-specific SQL output.

## Commit & Pull Request Guidelines
Recent history follows a conventional pattern like `build(ddl-seed-generator): ...`. Prefer `type(scope): summary`, for example `feat(ddl-parser): support quoted schema names`. Keep commits scoped to one concern. PRs should include a short description, validation commands run, related issue links, and screenshots or short recordings for UI changes.

## Security & Configuration Tips
Do not commit generated `.next/` artifacts, secrets, or sample data that looks production-real. Keep browser-only logic inside client components, and validate DDL input before passing it into SQL generation code.
