# OpenAPI Editor Contributor Guide

## Project Structure

- `src/lib/parser/`: YAML/JSON parsing, format detection, and serialization
- `src/lib/validation/`: Version checks, minimum structure validation, and internal/external `$ref` checks
- `src/lib/conversion/`: Browser-only conversion adapters and semantic inventory
- `src/workers/`: Revision-based analysis and conversion Worker protocol
- `src/components/`: Explorer, Monaco editor, Swagger UI, and workspace layout

## Conversion Rules

When modifying conversion adapters, explicitly specify the input and target versions. For fields lost during downgrade conversions, preserve the original value under an `x-toolhub-original-<keyword>` extension and emit a diagnostic with `lossy: true`. When downgrading from OpenAPI 3.2 to 3.1 or lower, do not silently drop 3.2-specific fields—always record preservation warnings. Never resolve external `$ref` pointers or introduce network requests.

## Verification

```bash
mise run check
```

Add directional unit tests and semantic inventory regression tests whenever conversion logic changes. Version-specific sample specifications must remain detectable by version and downloadable as YAML. For UI changes, verify the structure tree, editor, and preview across desktop, `768px`–`1023px`, and `767px` or narrower viewports.

## Design References

- [Document analysis and version conversion](document-processing.md)
- [Workspace and menu controls](workspace.md)

