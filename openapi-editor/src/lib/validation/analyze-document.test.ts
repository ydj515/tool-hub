import { describe, expect, it } from 'vitest';
import { analyzeDocument } from './analyze-document';

describe('analyzeDocument', () => {
  it('returns an OpenAPI 3.1 analysis with a resolved internal reference count', () => {
    const result = analyzeDocument('openapi: 3.1.2\ninfo:\n  title: Pets\n  version: "1"\npaths: {}\ncomponents:\n  schemas:\n    Pet:\n      type: object\n    Holder:\n      $ref: "#/components/schemas/Pet"\n', { filename: 'pets.yaml' });

    expect(result.version).toBe('openapi-3.1');
    expect(result.internalReferenceCount).toBe(1);
    expect(result.diagnostics.filter((item) => item.severity === 'error')).toEqual([]);
  });

  it('recognizes OpenAPI 3.2 documents', () => {
    const result = analyzeDocument('{"openapi":"3.2.0","info":{"title":"Pets","version":"1"},"paths":{}}', { filename: 'pets.json' });

    expect(result.version).toBe('openapi-3.2');
    expect(result.diagnostics.filter((item) => item.severity === 'error')).toEqual([]);
  });

  it('rejects OpenAPI 3.2-only fields that remain in an OpenAPI 3.1 target', () => {
    const result = analyzeDocument('{"openapi":"3.1.2","info":{"title":"Pets","version":"1"},"paths":{},"components":{"mediaTypes":{"EventStream":{"schema":{"type":"string"}}}}}', { filename: 'pets.json' });

    expect(result.diagnostics).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'UNSUPPORTED_FIELD_FOR_SPEC_VERSION', sourcePointer: '/components/mediaTypes', severity: 'error' }),
    ]));
  });
});
