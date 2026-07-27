# Contributor Guide

## Scope
This document covers repository-wide rules only. Keep project-specific instructions in each project’s `docs/` folder and reference them instead of expanding this file.

## Common Working Rules
- Work inside the project directory you are changing.
- Follow the existing code style and file layout of that project.
- Keep `AGENTS.md` files short and use them as indexes to detailed docs.
- Move long explanations, architecture notes, and workflow details into `docs/*.md`.
- Add or update test code for behavior changes whenever the project’s stack reasonably allows it.
- If a project does not yet have a test setup for the affected area, add one when practical or clearly document the testing gap and manual verification scope.

## Required Verification
Verification is mandatory for every completed change.

- Do not stop at implementation only; changes should include test code when the behavior or logic changed.
- Run the applicable `test`, `lint`, `typecheck`, and `build` commands for the affected project.
- If a project is missing a verification script that should reasonably exist for its stack, add it before calling the work complete.
- Treat successful verification as the definition of done.

## Documentation Writing Examples
Keep shared guidance short in `AGENTS.md` and move detail into `docs/*.md`.

- Good: put “run `test`, `lint`, `typecheck`, and `build` before completion” in `AGENTS.md`.
- Good: put step-by-step UI checks, architecture notes, or parser edge cases in `docs/contributor-guide.md`.
- Good: create project-specific docs such as `home/docs/contributor-guide.md` when instructions differ by project.
- Avoid: turning `AGENTS.md` into a long handbook with project-specific implementation details.

## Frontend Conventions
Web apps (Vite + Next.js) share a structure playbook — shell/content split, CSS topic split, `theme.ts`/`useTheme`, and repeated UI as components.

- [frontend-conventions.md](frontend-conventions.md)

## Project-Specific References

| Project | Local index | Detailed guide |
|---|---|---|
| `home/` | [AGENTS.md](../home/AGENTS.md) | [Contributor guide](../home/docs/contributor-guide.md) |
| `sign-maker/` | [AGENTS.md](../sign-maker/AGENTS.md) | [Contributor guide](../sign-maker/docs/contributor-guide.md) |
| `json-yaml-converter/` | [AGENTS.md](../json-yaml-converter/AGENTS.md) | [Contributor guide](../json-yaml-converter/docs/contributor-guide.md) |
| `openapi-editor/` | [AGENTS.md](../openapi-editor/AGENTS.md) | [Contributor guide](../openapi-editor/docs/contributor-guide.md) |
| `api-contract-test-generator/` | [AGENTS.md](../api-contract-test-generator/AGENTS.md) | [Contributor guide](../api-contract-test-generator/docs/contributor-guide.md) |
| `ddl-seed-generator/` | [AGENTS.md](../ddl-seed-generator/AGENTS.md) | [Contributor guide](../ddl-seed-generator/docs/contributor-guide.md) |
| `config-diff-viewer/` | [AGENTS.md](../config-diff-viewer/AGENTS.md) | [Contributor guide](../config-diff-viewer/docs/contributor-guide.md) |
| `dummy-file-generator/` | [AGENTS.md](../dummy-file-generator/AGENTS.md) | [Contributor guide](../dummy-file-generator/docs/contributor-guide.md) |
| `webpage-capture-tool/` | [AGENTS.md](../webpage-capture-tool/AGENTS.md) | [Contributor guide](../webpage-capture-tool/docs/contributor-guide.md) |
| `class-diagram-generator/` | 없음 | [README](../class-diagram-generator/README.md) |
