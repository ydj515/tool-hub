# Repository Guidelines

## Purpose
Use this file as the top-level index for contributor and agent guidance. Keep it short, scannable, and stable.

## How To Use This Repository
- Run commands from the target project directory unless a root-level command is explicitly documented.
- When working on a specific project from the repository root, read its local `AGENTS.md` when present and follow the project reference below.
- Follow the existing style and structure of the project you are editing instead of forcing one convention across the whole repository.

## Projects

- Web apps (8): `home/`, `sign-maker/`, `json-yaml-converter/`, `openapi-editor/`, `api-contract-test-generator/`, `ddl-seed-generator/`, `config-diff-viewer/`, `dummy-file-generator/`
- Desktop app (1): `webpage-capture-tool/`
- Server-rendered Kotlin app (1): `class-diagram-generator/`

## Required Verification
Finishing code changes without verification is not allowed.

- Always run the applicable `test`, `lint`, `typecheck`, and `build` commands for the affected project.
- If a repository is missing a verification script that should reasonably exist for its stack, add that script before considering the work complete.
- Treat successful verification as the definition of done.

## Documentation Rule
`AGENTS.md` must remain an index, not a long-form handbook.

- If guidance starts getting long, create or update a document under `docs/` and link it from here.
- Put detailed workflow notes, project-specific commands, architecture explanations, and extended contribution rules in `docs/`.
- Prefer small topic-focused docs over one oversized guide.

## Detailed References
- Contributor guide: [docs/contributor-guide.md](docs/contributor-guide.md)
- Frontend conventions (web apps): [docs/frontend-conventions.md](docs/frontend-conventions.md)
- Project-specific guides: see the references listed inside [docs/contributor-guide.md](docs/contributor-guide.md)
