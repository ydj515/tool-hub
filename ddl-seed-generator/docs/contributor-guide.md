# DDL Seed Generator Contributor Guide

## Project Overview
`ddl-seed-generator/` is a Next.js App Router app that generates seed SQL from DDL input. Route UI lives in `app/`, shared client components in `app/_components/`, and parsing/generation logic in `lib/`.

## Project Commands
- `npm install`
- `npm run dev`
- `npm run test`
- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `npm run start`

## Project Notes
- Keep DDL parsing, validation, graph ordering, and SQL rendering isolated inside `lib/`.
- Use the existing `@/*` alias instead of deep relative imports.
- Validate parser changes against FK ordering, cycle handling, and SQL output behavior.
- Keep generated artifacts such as `.next/` out of manual edits and commits.
- Add or update test code for parser, graph, and SQL-generation behavior changes.

## Manual Verification Checklist
- Paste representative DDL and confirm seed SQL generation completes successfully.
- Verify FK dependency ordering for parent/child tables after related logic changes.
- Check validation and error messaging for malformed or unsupported DDL input.
- Confirm the main editor and output panels render correctly in the browser.
