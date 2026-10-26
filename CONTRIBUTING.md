# Contributing to Tool Hub

Thank you for contributing to Tool Hub. This document summarizes the core workflow for making changes across the repository. For detailed repository rules, environment profiles, and project-specific instructions, see the [Contributor Guide](./docs/contributor-guide.md).

## Prerequisites

- [mise](https://mise.jdx.dev/) — Node.js (`24.19.0`) and Java (`21.0.2`) versions are pinned in each directory's `mise.toml`.

## Development Workflow

1. **Move to the target project directory**: Each tool is an independent application with its own dependencies and lockfile.
   ```bash
   cd <project-directory>
   mise trust
   mise run bootstrap
   mise run dev
   ```
2. **Follow project conventions**: Match the existing code style, directory layout, and framework conventions of the project you are editing. Web app conventions are documented in [Frontend Conventions](./docs/frontend-conventions.md).
3. **Sync canonical design system assets (when applicable)**: Never edit generated files (`ds-*`, `src/components/design-system/`, `app/_components/design-system/`, `product.generated.ts`) directly inside individual apps. Edit the canonical source under [`packages/design-system/`](./packages/design-system) and run synchronization from the repository root:
   ```bash
   npm run design-system:sync
   npm run design-system:check
   npm run design-system:test
   ```

## Required Verification

Every change must include appropriate tests and pass the full verification suite in the affected project directory before submitting a pull request:

```bash
mise run check
```

If you modified shared design tokens, primitives, or root documentation contracts, also run the root verification gate:

```bash
mise run verify
```

## References

- [Contributor Guide & Project References](./docs/contributor-guide.md)
- [Documentation Index](./docs/README.md)
- [Frontend Conventions](./docs/frontend-conventions.md)
- [Design System Architecture](./docs/design-system.md)
- [UI Verification Rules](./docs/ui-verification.md)
