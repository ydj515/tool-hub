import { describe, expect, it } from 'vitest';
import type { NormalizedEndpoint, NormalizedSchema } from '../../domain/contract';
import { buildBaselineRequest, buildValidValue } from './baseline-builder';

function schema(overrides: Partial<NormalizedSchema> = {}): NormalizedSchema {
  return {
    pointer: '/schema',
    identity: '/schema',
    type: 'string',
    nullable: false,
    required: [],
    properties: {},
    uniqueItems: false,
    ...overrides,
  };
}

describe('buildValidValue', () => {
  it('example, examples, default, enum, 생성값 순으로 선택한다', () => {
    expect(buildValidValue(schema({ example: 'shown', examples: ['sample'], defaultValue: 'fallback' }), 'seed')).toMatchObject({ value: 'shown' });
    expect(buildValidValue(schema({ example: undefined, examples: ['sample'], defaultValue: 'fallback' }), 'seed')).toMatchObject({ value: 'sample' });
    expect(buildValidValue(schema({ defaultValue: 'fallback' }), 'seed')).toMatchObject({ value: 'fallback' });
    expect(buildValidValue(schema({ enum: ['member', 'admin'] }), 'seed')).toMatchObject({ value: 'member' });
    expect(buildValidValue(schema({ format: 'email' }), 'seed')).toMatchObject({ value: expect.stringMatching(/@example\.com$/) });
  });

  it('100개보다 큰 최소 배열을 제한하고 진단한다', () => {
    const result = buildValidValue(schema({ type: 'array', minItems: 101, items: schema() }), 'seed');

    expect(result.value).toHaveLength(100);
    expect(result.diagnostics).toContainEqual(expect.objectContaining({ code: 'ARRAY_ITEM_LIMIT_REACHED' }));
  });

  it('반복된 스키마 identity에서 재귀 생성을 중단한다', () => {
    const recursive = schema({ type: 'object', identity: 'Node', required: ['next'] });
    recursive.properties = { next: recursive };

    const result = buildValidValue(recursive, 'seed');

    expect(JSON.stringify(result.value).length).toBeLessThan(100);
    expect(result.diagnostics).toContainEqual(expect.objectContaining({ code: 'RECURSIVE_SCHEMA_TRUNCATED' }));
  });

  it('만족하는 값을 만들지 못한 pattern 기준값을 실패 처리한다', () => {
    const result = buildValidValue(schema({ pattern: '^Z{20}$' }), 'seed');

    expect(result.ok).toBe(false);
    expect(result.diagnostics).toContainEqual(expect.objectContaining({ code: 'PATTERN_BASELINE_UNAVAILABLE' }));
  });

  it('서로 충돌하는 문자열 길이 제약을 실패 처리한다', () => {
    const result = buildValidValue(schema({ minLength: 10, maxLength: 5 }), 'seed');

    expect(result.ok).toBe(false);
    expect(result.diagnostics).toContainEqual(expect.objectContaining({ code: 'CONFLICTING_STRING_BOUNDS' }));
  });

  it('정의되지 않은 필수 속성이 있으면 객체 기준값을 실패 처리한다', () => {
    const result = buildValidValue(schema({ type: 'object', required: ['missing'], properties: {} }), 'seed');

    expect(result.ok).toBe(false);
    expect(result.diagnostics).toContainEqual(expect.objectContaining({ code: 'REQUIRED_PROPERTY_SCHEMA_MISSING' }));
  });

  it('충돌하는 숫자 경계에서는 기준값 생성을 실패한다', () => {
    const result = buildValidValue(schema({ type: 'integer', minimum: 10, maximum: 5 }), 'seed');

    expect(result.ok).toBe(false);
    expect(result.diagnostics).toContainEqual(expect.objectContaining({ code: 'BASELINE_VALUE_INVALID' }));
  });

  it('제약을 위반한 example을 건너뛰고 다음 유효한 값을 선택한다', () => {
    const result = buildValidValue(schema({ example: 'x', defaultValue: 'valid', minLength: 3 }), 'seed');

    expect(result).toMatchObject({ ok: true, value: 'valid' });
    expect(result.diagnostics).toContainEqual(expect.objectContaining({ code: 'INVALID_EXAMPLE_SKIPPED' }));
  });

  it('지원하지 않는 format은 유효한 기준값으로 추측하지 않는다', () => {
    const result = buildValidValue(schema({ format: 'internal-account-id' }), 'seed');

    expect(result.ok).toBe(false);
    expect(result.diagnostics).toContainEqual(expect.objectContaining({ code: 'UNSUPPORTED_FORMAT' }));
  });

  it('oneOf의 첫 유효 분기에서 기준값을 만든다', () => {
    const result = buildValidValue(schema({
      type: undefined,
      oneOf: [
        schema({ pointer: '/schema/oneOf/0', identity: '/schema/oneOf/0', type: 'integer', minimum: 3 }),
        schema({ pointer: '/schema/oneOf/1', identity: '/schema/oneOf/1', type: 'boolean' }),
      ],
    }), 'seed');

    expect(result).toMatchObject({ ok: true, value: 3 });
  });
});

describe('buildBaselineRequest', () => {
  it('필수 파라미터, JSON 본문, 첫 보안 대안을 채운다', () => {
    const endpoint: NormalizedEndpoint = {
      id: 'POST /users/{id}', method: 'POST', path: '/users/{id}', tags: ['Users'], responses: ['201'], incomplete: false,
      requestBodyRequired: true, requestBodyMediaType: 'application/json', sourcePointer: '/paths/~1users~1{id}/post',
      parameters: [
        { name: 'id', location: 'path', required: true, style: 'simple', explode: false, schema: schema({ pointer: '/id' }), sourcePointer: '/id' },
        { name: 'expand', location: 'query', required: false, style: 'form', explode: true, schema: schema({ type: 'boolean', pointer: '/expand' }), sourcePointer: '/expand' },
      ],
      requestBody: schema({ type: 'object', required: ['email'], properties: { email: schema({ format: 'email', pointer: '/email' }) } }),
      security: [[{ name: 'bearerAuth', type: 'http-bearer', sourcePointer: '/security' }]],
    };

    const result = buildBaselineRequest(endpoint, 'seed');

    expect(result.request).toMatchObject({
      pathParameters: { id: expect.any(String) },
      queryParameters: {},
      headers: { Authorization: 'Bearer {{API_TOKEN}}' },
      body: { email: expect.stringMatching(/@example\.com$/) },
    });
  });

  it('OAuth2, 표준 숫자 포맷과 binary 본문에 유효한 기준값을 만든다', () => {
    const endpoint: NormalizedEndpoint = {
      id: 'QUERY /assets/{assetId}', method: 'QUERY', path: '/assets/{assetId}', tags: [], responses: ['200'], incomplete: false,
      requestBodyRequired: true, requestBodyMediaType: 'application/octet-stream', sourcePointer: '/paths/~1assets~1{assetId}/query',
      parameters: [
        { name: 'assetId', location: 'path', required: true, style: 'simple', explode: false, schema: schema({ pointer: '/assetId', type: 'integer', format: 'int64' }), sourcePointer: '/assetId' },
      ],
      requestBody: schema({ pointer: '/binary', format: 'binary' }),
      security: [[{ name: 'oauth', type: 'oauth2', sourcePointer: '/oauth' }]],
    };

    const result = buildBaselineRequest(endpoint, 'seed');

    expect(result).toMatchObject({
      ok: true,
      request: {
        pathParameters: { assetId: expect.any(Number) },
        headers: { Authorization: 'Bearer {{OAUTH2_ACCESS_TOKEN}}' },
        body: expect.any(String),
      },
    });
  });
});
