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
- Reject custom tags, duplicate mapping keys, circular aliases, and non-finite numbers.
- Preserve mapping entry order and use two-space indentation.
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
- Confirm light and dark themes remain readable.

## Documentation Sync

When behavior changes, update tests, this guide, the project README, and the root tool list in the same change.
