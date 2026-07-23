import { describe, expect, it } from 'vitest';
import { detectSpecVersion } from './version-detector';

describe('detectSpecVersion', () => {
  it.each([
    [{ swagger: '2.0' }, 'swagger-2.0'],
    [{ openapi: '3.0.4' }, 'openapi-3.0'],
    [{ openapi: '3.1.2' }, 'openapi-3.1'],
    [{ openapi: '3.2.0' }, 'openapi-3.2'],
    [{ openapi: '3.2.1' }, 'openapi-3.2'],
  ] as const)('recognizes %o', (document, family) => {
    expect(detectSpecVersion(document)).toMatchObject({ ok: true, family });
  });

  it('rejects a future unsupported OpenAPI minor version without mutating the document', () => {
    expect(detectSpecVersion({ openapi: '3.3.0' })).toMatchObject({
      ok: false,
      diagnostic: { code: 'UNSUPPORTED_SPEC_VERSION' },
    });
  });
});
