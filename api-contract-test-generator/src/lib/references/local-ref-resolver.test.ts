import { describe, expect, it } from 'vitest';
import { resolveLocalReference } from './local-ref-resolver';

describe('resolveLocalReference', () => {
  it('이스케이프된 로컬 JSON Pointer를 해석한다', () => {
    const document = { components: { schemas: { 'A/B': { type: 'string' } } } };

    expect(resolveLocalReference(document, '#/components/schemas/A~1B')).toMatchObject({
      ok: true,
      value: { type: 'string' },
    });
  });

  it('외부 참조를 가져오지 않고 경고한다', () => {
    expect(resolveLocalReference({}, 'https://example.com/schema.yaml')).toMatchObject({
      ok: false,
      diagnostic: { code: 'EXTERNAL_REFERENCE_UNSUPPORTED', blocking: false },
    });
  });

  it('순환 참조를 차단한다', () => {
    const document = { components: { schemas: { Node: { $ref: '#/components/schemas/Node' } } } };

    expect(resolveLocalReference(document, '#/components/schemas/Node')).toMatchObject({
      ok: false,
      diagnostic: { code: 'CIRCULAR_REFERENCE', blocking: false },
    });
  });
});
