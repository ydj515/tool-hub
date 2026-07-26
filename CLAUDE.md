# Repository Guidelines

## Purpose
Use this file as the top-level index for contributor and agent guidance. Keep it short, scannable, and stable.

## How To Use This Repository
- Each tool lives in its own project directory: `home/`, `sign-maker/`, `json-yaml-converter/`, `openapi-editor/`, `ddl-seed-generator/`, `config-diff-viewer/`, `dummy-file-generator/`, `webpage-capture-tool/`, `class-diagram-generator/`.
- Run commands from the target project directory unless a root-level command is explicitly documented.
- When working on a specific project from the repository root, read that project's local `AGENTS.md` before making changes.
- Follow the existing style and structure of the project you are editing instead of forcing one convention across the whole repository.
- 저장소 루트에서 실행하는 명령은 디자인 시스템 동기화뿐이다. 루트 `package.json`에는 `dependencies`도 `workspaces`도 없어 `npm install`이 필요 없다.
  - `npm run tokens:sync` — `packages/design-system/` 정본을 각 앱의 `styles/`로 복사한다
  - `npm run tokens:check` — 복사하지 않고 불일치만 보고한다
  - `npm run tokens:test` — 동기화 스크립트의 단위 테스트

## Required Verification
Finishing code changes without verification is not allowed.

- Always run the applicable `test`, `lint`, `typecheck`, and `build` commands for the affected project.
- If a repository is missing a verification script that should reasonably exist for its stack, add that script before considering the work complete.
- Treat successful verification as the definition of done.
- 앱마다 `mise run check`가 표준 진입점이다.
- e2e가 있는 앱(`json-yaml-converter`, `openapi-editor`)은 `mise run install` 뒤 `npx playwright install chromium`을 실행한다. `npm ci`가 `node_modules`를 재설치하면서 Playwright 브라우저 요구 버전 핀이 바뀌어 캐시에 없는 빌드를 찾게 되고, e2e 전체가 브라우저 실행 단계에서 실패한다.

## Documentation Rule
`AGENTS.md` must remain an index, not a long-form handbook.

- If guidance starts getting long, create or update a document under `docs/` and link it from here.
- Put detailed workflow notes, project-specific commands, architecture explanations, and extended contribution rules in `docs/`.
- Prefer small topic-focused docs over one oversized guide.

## Detailed References
- Contributor guide: [docs/contributor-guide.md](docs/contributor-guide.md)
- Frontend conventions (web apps): [docs/frontend-conventions.md](docs/frontend-conventions.md)
- Project-specific guides: see the references listed inside [docs/contributor-guide.md](docs/contributor-guide.md)
