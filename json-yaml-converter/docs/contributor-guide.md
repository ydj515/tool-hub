# JSON YAML Converter Contributor Guide

## Project Overview

`json-yaml-converter/` is a Vite + React + TypeScript SPA. UI components live under `src/components/`, page orchestration under `src/pages/`, conversion state under `src/hooks/`, and React-independent parsing and serialization under `src/lib/`.

## Project Commands

- `npm install`
- `npm run dev`
- `npm run test`
- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `npm run test:e2e`

## Conversion Rules

- Keep JSON strict: reject comments, trailing commas, and duplicate keys.
- Keep YAML limited to one YAML 1.2 document with string mapping keys.
- Emit ordered YAML mappings and sequences in deterministic two-space block form; quote ambiguous, special, multiline, control, and invalid-surrogate strings with JSON-compatible escapes.
- Reject custom tags, duplicate mapping keys, circular aliases, and non-finite numbers.
- Preserve mapping entry order and use two-space indentation.
- Reject JSON/YAML collections deeper than 100 levels and generated UTF-8 output larger than 2MB.
- Convert parser, normalizer, serializer, and debounced conversion exceptions into blocking diagnostics.
- Do not store source or converted content in localStorage or send it to a server.

## Project Structure

- `src/lib/`: ordered data model, parsers, serializers, diagnostics, size, and file adapters
- `src/hooks/`: debounced conversion state and theme state
- `src/components/editor/`: Monaco setup, workers, markers, and editor wrapper
- `src/components/converter/`: toolbar, panels, diagnostics, status, and responsive workspace
- `src/pages/`: page-level event orchestration
- `e2e/`: real-browser Monaco and responsive-flow tests

## Manual Verification

- Confirm JSON → YAML and YAML → JSON on desktop and mobile.
- Confirm JSON Pretty and YAML Pretty preserve key order and support undo.
- Confirm syntax markers and line/column messages point to the same source location.
- Confirm stale results cannot be copied, downloaded, or swapped.
- Confirm 500KB warning and 1MB blocking behavior.
- Confirm the 100-level nesting and 2MB generated-output limits return diagnostics without leaving conversion scheduled.
- Confirm light and dark themes remain readable.

## Complexity

- Source changes take `O(n)` time and temporary `O(n)` space because whitespace classification and UTF-8 byte measurement scan/encode the full source.
- Parsing and validation take `O(n)` time; serialization and Pretty take `O(n + m)` time and `O(n + m)` working space for input size `n` and output size `m`.
- Recursive helpers are bounded by the 100-level product limit.

## Documentation Sync

When behavior changes, update tests, this guide, the project README, and the root tool list in the same change.
