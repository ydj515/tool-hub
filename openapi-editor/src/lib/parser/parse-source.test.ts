import { describe, expect, it } from 'vitest';
import { parseSource } from './parse-source';

describe('parseSource', () => {
  it('parses a YAML document and indexes the root field location', () => {
    const result = parseSource('openapi: 3.1.2\ninfo:\n  title: Sample\n  version: 1.0.0\npaths: {}\n', 'yaml');

    expect(result.ok).toBe(true);
    expect(result.pointerLocations['/info']).toMatchObject({ startLine: 2, startColumn: 1 });
  });

  it('rejects a JSON comment and a trailing comma', () => {
    const result = parseSource('{"openapi":"3.1.2",}', 'json');

    expect(result.ok).toBe(false);
    expect(result.diagnostics[0]).toMatchObject({ code: 'JSON_SYNTAX_ERROR', severity: 'error' });
  });

  it('rejects a non-object root', () => {
    const result = parseSource('- item\n', 'yaml');

    expect(result.ok).toBe(false);
    expect(result.diagnostics[0]).toMatchObject({ code: 'DOCUMENT_ROOT_NOT_OBJECT' });
  });
});
