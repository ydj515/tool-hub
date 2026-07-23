import { describe, expect, it } from 'vitest';
import { detectDocumentFormat } from './format-detector';

describe('detectDocumentFormat', () => {
  it.each([
    ['openapi.yaml', 'openapi: 3.1.2', 'yaml'],
    ['openapi.yml', 'swagger: "2.0"', 'yaml'],
    ['openapi.json', '{"openapi":"3.0.4"}', 'json'],
  ] as const)('uses a matching extension for %s', (filename, raw, format) => {
    expect(detectDocumentFormat({ filename, raw })).toMatchObject({ format, locked: true });
  });

  it('falls back to content with an extension mismatch warning', () => {
    const result = detectDocumentFormat({ filename: 'openapi.json', raw: 'openapi: 3.1.2' });

    expect(result.format).toBe('yaml');
    expect(result.diagnostics).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'FILE_EXTENSION_MISMATCH', severity: 'warning' }),
    ]));
  });

  it('prefers JSON for extensionless valid JSON', () => {
    expect(detectDocumentFormat({ raw: '{"openapi":"3.1.2"}' })).toMatchObject({ format: 'json', locked: true });
  });

  it('keeps the locked format while incomplete text is being edited', () => {
    expect(detectDocumentFormat({ raw: '{', lockedFormat: 'json' })).toMatchObject({ format: 'json', locked: true });
  });
});
