# Repository Guidelines

## Project Structure & Module Organization
This repository is a `Next.js 16 + TypeScript` config comparison tool. The page entry point is `app/page.tsx`, and most UI code lives in `app/_components/`. Shared domain logic is organized under `lib/`, with focused modules such as parsing (`parser.ts`), diffing (`differ.ts`), validation (`validator.ts`), and secret detection (`detector.ts`). Global styles are in `app/globals.css`, and product context is documented in `docs/PRD-FINAL.md`.

## Build, Test, and Development Commands
Use the following commands during local development:

- `npm run dev`: start the local development server
- `npm run build`: create a production build
- `npm run start`: run the production build locally
- `npm run lint`: run static checks with `eslint-config-next`
- `npm run typecheck`: run TypeScript type checking in strict mode

After any code change, run at least `npm run lint` and `npm run typecheck`.

## Coding Style & Naming Conventions
TypeScript runs in `strict` mode and uses the `@/*` path alias. Follow the existing style: 2-space indentation, double quotes, and trailing semicolons. React components should use `PascalCase` exports with kebab-case file names, for example `app/_components/result-panel.tsx` exporting `ResultPanel`. Hooks should follow the `use-*.ts` file pattern and `useSomething` naming.

## Testing Guidelines
There is currently no dedicated test framework or `tests/` directory. For now, the minimum PR validation is `npm run lint`, `npm run typecheck`, and manual verification through `npm run dev` for the main compare flow when behavior changes. If you add tests, keep them close to the implementation and prefer `*.test.ts` or `*.test.tsx` naming.

## Commit & Pull Request Guidelines
Recent history follows Conventional Commits, for example `feat: tool hub main page 추가`, `refactor: 불필요한 interactive 요소 제거`, and `build(config-diff-viewer): ...`. Keep each commit focused on one change, and include a scope when it adds clarity. PRs should explain the purpose of the change, list validation steps, include screenshots for UI updates, and link related issues when available.

## Security & Configuration Tips
This project handles configuration values and secret detection, so never commit real production secrets. Keep sample data in safe forms such as `application-dev.yml` with masked values. When editing parser logic, verify the impact across all supported formats: YAML, JSON, `.properties`, and `.env`.
