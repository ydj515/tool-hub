import { describe, expect, it } from 'vitest';
import { parseOpenApi } from '../lib/parser/parse-openapi';
import { sampleDocumentFor } from './samples';

describe('sampleDocumentFor', () => {
  it.each(['openapi-3.0', 'openapi-3.1'] as const)('%s 예제가 파싱되고 POST 계약을 포함한다', (version) => {
    const sample = sampleDocumentFor(version);
    const parsed = parseOpenApi(sample, 'sample.yaml');

    expect(parsed).toMatchObject({ ok: true, version });
    expect(sample).toContain('post:');
    expect(sample).toContain('bearerAuth');
  });
});
