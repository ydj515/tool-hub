# Config Diff Viewer Contributor Guide

## Project Overview
`config-diff-viewer/` is a Next.js 16 + TypeScript app for comparing configuration files. Page entry is `app/page.tsx`, most UI lives in `app/_components/`, and domain logic is organized under `lib/` for parsing, diffing, validation, and detection.

## Project Commands
- `npm install`
- `npm run dev`
- `npm run test`
- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `npm run start`

## Project Notes
- Keep parsing, diffing, validation, and secret-detection logic separated in `lib/`.
- Verify changes across supported formats such as YAML, JSON, `.properties`, and `.env`.
- Never commit real configuration secrets or production-like sensitive samples.
- Use `docs/PRD-FINAL.md` for product context when needed.
- Add or update test code for parser, diff, validator, and detector behavior changes.

## Manual Verification Checklist
- Compare representative inputs and confirm the diff result matches expectations.
- Verify parsing behavior for the affected file formats, especially when parser logic changed.
- Check missing keys, risk flags, or secret detection behavior when related logic changed.
- Confirm the main compare flow renders without runtime errors in the browser.
