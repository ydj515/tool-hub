import { describe, expect, it } from 'vitest';
import type { SpecFamily } from '../domain/document';
import { sampleDocumentFor, sampleDownloadFilename } from './spec-samples';
import { detectSpecVersion } from '../lib/validation/version-detector';

const versions: SpecFamily[] = ['swagger-2.0', 'openapi-3.0', 'openapi-3.1', 'openapi-3.2'];

describe('versioned specification samples', () => {
  it.each(versions)('creates a detectable %s sample', (version) => {
    expect(detectSpecVersion(sampleDocumentFor(version))).toMatchObject({ ok: true, family: version });
    expect(sampleDownloadFilename(version)).toMatch(/-sample\.yaml$/);
  });

  it('demonstrates an OpenAPI 3.2-only additional operation', () => {
    expect(sampleDocumentFor('openapi-3.2')).toMatchObject({
      paths: { '/tasks/{taskId}': { additionalOperations: { COPY: expect.any(Object) } } },
    });
  });
});
