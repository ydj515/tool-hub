# Repository Guidelines

## Project Structure & Module Organization

This package is the Tool Hub home page, built with Vite, React, TypeScript, and Tailwind CSS v4. Application code lives in `src/`: `main.tsx` mounts React, `App.tsx` owns layout and filtering, `components/` contains reusable UI such as `ToolCard.tsx`, `hooks/` contains shared hooks, and `data/tools.ts` is the source of truth for listed tools. Global styles and Tailwind imports are in `src/index.css`. Static assets belong in `public/`; generated output in `dist/` should not be edited by hand.

## Build, Test, and Development Commands

- `npm install`: install dependencies from `package-lock.json`.
- `npm run dev`: start the Vite development server.
- `npm run build`: run TypeScript project build checks, then create the production bundle.
- `npm run lint`: run ESLint across the project.
- `npm run preview`: serve the built app locally for production verification.
- `mise run dev` / `mise run build`: run the same workflows with the pinned Node version from `mise.toml`.

## Coding Style & Naming Conventions

Use TypeScript with strict compiler settings from `tsconfig.app.json`. Follow the existing style: two-space indentation, semicolons, single quotes, named interfaces for shared shapes, and explicit types where they clarify contracts. React components use PascalCase file and export names, hooks use the `useThing` pattern, and data modules use lower camel case names such as `tools.ts`. Prefer Tailwind utilities; keep global CSS limited to resets, theme variants, and keyframes.

## Testing Guidelines

No dedicated test runner is configured yet. For every change, run `npm run lint` and `npm run build` before handing off. When adding tests, prefer colocated `*.test.ts` or `*.test.tsx` files and a Vite-friendly stack such as Vitest plus React Testing Library. UI changes should be checked manually in light and dark themes.

## Commit & Pull Request Guidelines

Recent history uses short Conventional Commit prefixes, often with Korean summaries, for example `feat: ...` and `refactor: ...`. Keep commits focused on one logical change. Pull requests should include a concise summary, validation steps such as `npm run lint` and `npm run build`, linked issues, and screenshots or recordings for visible UI changes.

## Security & Configuration Tips

This is a client-side app, so do not place secrets or private tokens in source files, `public/`, or Vite-exposed environment variables. When adding a tool entry in `src/data/tools.ts`, verify external URLs, repository links, status, tags, and accessible link labels.
