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

## Design Documentation

See the [documentation index](README.md) for shared design guides and project-local architecture documents.

## Mise Environment Configuration

`mise.toml` defines pinned tool versions and shared tasks, while `mise.dev.toml` and `mise.prod.toml` select shared environment overlays.

```bash
mise trust ./mise.toml   # Trust after reviewing tasks and overlays
mise run bootstrap       # Install pinned tool versions and project dependencies
mise run config:check    # Validate task references and cycles without starting apps
mise run verify          # Run project verification (retaining existing prerequisites like Docker)
mise -E dev run verify
```

- The default execution environment is `APP_ENV=local`, `-E dev` selects the development overlay, and `-E prod` selects production configuration. Selecting an environment does not deploy or start services by itself.
- For personal development overrides, review `mise.dev.local.toml.example` and copy it to `mise.dev.local.toml`. If you create `.env.dev.local` and enable `env._.file`, it is loaded only under `dev`. Do not overwrite existing personal files.
- `mise.local.toml` is loaded in **all environments**. Do not place personal overrides or development dotenv files in a production checkout. Do not use `-E local`.
- `APP_ENV` is the shared environment identifier. Spring execution tasks map their profiles within the task definition and do not auto-generate missing production configuration. Selecting `prod` alone does not make a development app production-ready.
- Vite `build` tasks use `production` mode in default/`prod` and `development` mode in `dev`. Next.js retains its native `dev`/`build` modes. Avoid setting `NODE_ENV=production` globally so devDependencies are not skipped during installation.
- `mise` pins exact tool versions and separates environment profiles. Tool lockfile generation is disabled via `[settings] lockfile = false`, and `mise.lock` is not tracked. This repository policy takes precedence over generic `mise.lock` guidelines unless binary-level lock requirements arise.
- Tool versions are managed in `[tools]` inside `mise.toml` and shared across `dev` and `prod`. Both local machines and CI prepare tools via `mise install` or matching setup actions. Application dependency lockfiles (`package-lock.json`, `pnpm-lock.yaml`, `uv.lock`, Gradle lockfiles) and verification checks remain enforced.
- OS support follows the compatibility of each tool and script; disabling `mise.lock` does not automatically guarantee Windows execution.
- `mise run bootstrap` initializes project dependencies. Machine-wide `mise bootstrap` for OS packages, dotfiles, or system services is managed separately per developer machine.
- Subprojects (`home`, `sign-maker`, `ddl-seed-generator`, `config-diff-viewer`, `api-contract-test-generator`, `dummy-file-generator`, `json-yaml-converter`, `class-diagram-generator`, `webpage-capture-tool`, `openapi-editor`) expose the same task commands in their own directories. Root `bootstrap`/`verify` does not automatically run across all subprojects.
- The `webpage-capture-tool` lockfile includes Windows x64 entries, and each subproject's `bootstrap` installs only its own `package-lock.json`.

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
| `class-diagram-generator/` | None | [README](../class-diagram-generator/README.md) |
