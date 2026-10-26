# API Contract Test Generator Contributor Guide

## Architecture

React manages the three-step screen flow and user selections. Parsing, internal `$ref` resolution, normalization, test generation, and export live in UI-independent pure modules invoked by `src/workers/api-contract.worker.ts`. Worker messages carry a `revision` number, and responses older than the current input revision are ignored by the UI state.

Do not log raw input specifications or generated requests. Adding network clients, remote `$ref` loaders, or persistent storage for user input will violate the project's privacy boundary.

## OpenAPI Specification References

Refer to the official specifications when implementing or reviewing OpenAPI features:

- [OpenAPI Specification 3.2](https://spec.openapis.org/oas/v3.2)
- [OpenAPI Specification 3.1](https://spec.openapis.org/oas/v3.1)
- [OpenAPI Specification 3.0](https://spec.openapis.org/oas/v3.0)

## Generation Rules

Add rules as small, focused branches in `src/lib/generation/rules.ts`:

- `ruleId` must be a stable lowercase `kebab-case` identifier with fixed semantics.
- `variantId` must distinguish variants generated from the same source location.
- Each negative candidate must mutate only one constraint from the valid baseline request.
- `sourcePointer` must point to the exact OpenAPI location that justified the test.
- If the specification does not determine a numeric status code, set `needsReview: true` instead of guessing a status.
- Preserve declared `2XX` and `4XX` ranges as string statuses without generating exact status code assertions in Postman exports.
- Re-validate candidate values against a schema with only the target constraint relaxed so other constraints are not violated simultaneously.
- Serialize parameter values in Postman exports using normalized `style` and `explode` settings.
- Write a failing test first before implementing new functions or branches.

## Fixtures

Use the type-safe factories in `src/test/factories.ts` for small objects. Add YAML or JSON files under `test/fixtures/` only when raw parser input or reference graphs are essential.

Fixtures should clearly show the minimal condition under test and the expected source pointer. Never copy real service specifications, tokens, or host secrets. For rules where OpenAPI 3.0 and 3.1 semantics differ, write separate regression tests for both versions.

## Stable IDs

Maintain the following input order for test ID generation:

```text
UPPERCASE_METHOD | normalized_path | source_pointer | rule_id | variant_id
```

The hash is a lowercase hex UTF-8 SHA-256 digest computed via browser `crypto.subtle`. Changing the ID input format breaks selection restoration across regenerations, so do not modify it without a documented migration.

## Responsive Verification

Do not float detail panels or action bars on the review screen with `fixed` or `absolute` positioning. Keep `min-width: 0` on all grid children.

- `320px`, `375px`: Display endpoints, test list, and details one view at a time
- `768px` and wider: Two-column layout for endpoint navigator and review area, with details below the test list

`e2e/responsive.spec.ts` verifies horizontal overflow, desktop column boundaries, mobile single-panel navigation, and non-overlapping action bars.

## Required Verification

```bash
 npm run test
 npm run lint
 npm run typecheck
 npm run build
 npm run test:e2e
```

## Design Reference

- [Test generation, review, and export](test-generation.md)

