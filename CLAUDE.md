# Repository Guidelines

## Purpose
Use this file as the top-level index for contributor and agent guidance. Keep it short, scannable, and stable.

## How To Use This Repository
- Each tool lives in its own project directory: `home/`, `sign-maker/`, `dummy-file-generator/`, `ddl-seed-generator/`, `config-diff-viewer/`, and `webpage-capture-tool/`.
- Run commands from the target project directory unless a root-level command is explicitly documented.
- When working on a specific project from the repository root, read that project's local `AGENTS.md` before making changes.
- Follow the existing style and structure of the project you are editing instead of forcing one convention across the whole repository.

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
- Contributor guide: [docs/contributor-guide.md](/Users/dongjin/dev/study/tool-hub/docs/contributor-guide.md)
- Project-specific guides: see the references listed inside [docs/contributor-guide.md](/Users/dongjin/dev/study/tool-hub/docs/contributor-guide.md)
