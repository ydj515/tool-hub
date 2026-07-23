import { describe, expect, it } from 'vitest';
import { parseSource } from './parse-source';
import { serializeDocument } from './serialize-document';

describe('serializeDocument', () => {
  const document = { openapi: '3.1.2', info: { title: 'API', version: '1.0.0' }, paths: {} };

  it('serializes stable two-space JSON with a final newline', () => {
    expect(serializeDocument(document, 'json')).toBe(`${JSON.stringify(document, null, 2)}\n`);
  });

  it('serializes parseable YAML', () => {
    const yaml = serializeDocument(document, 'yaml');

    expect(parseSource(yaml, 'yaml').ok).toBe(true);
  });
});
