import { describe, expect, it } from 'vitest';
import type { NormalizedEndpoint, NormalizedSchema } from '../../domain/contract';
import { buildBaselineRequest } from './baseline-builder';
import { generateRuleCandidates } from './rules';

function schema(overrides: Partial<NormalizedSchema> = {}): NormalizedSchema {
  return {
    pointer: '/components/schemas/CreateUser', identity: '/components/schemas/CreateUser', type: 'string', nullable: false,
    required: [], properties: {}, uniqueItems: false, ...overrides,
  };
}

function endpointFixture(): NormalizedEndpoint {
  return {
    id: 'POST /users', method: 'POST', path: '/users', summary: '사용자 생성', tags: ['Users'],
    responses: ['201', '400', '401'], incomplete: false, requestBodyRequired: true,
    requestBodyMediaType: 'application/json', sourcePointer: '/paths/~1users/post', parameters: [],
    requestBody: schema({
      type: 'object', required: ['email'],
      properties: {
        email: schema({ pointer: '/components/schemas/CreateUser/properties/email', format: 'email', minLength: 5 }),
        age: schema({ pointer: '/components/schemas/CreateUser/properties/age', type: 'integer', minimum: 1, maximum: 120 }),
        role: schema({ pointer: '/components/schemas/CreateUser/properties/role', enum: ['member', 'admin'] }),
        name: schema({ pointer: '/components/schemas/CreateUser/properties/name', example: '홍길동' }),
      },
    }),
    security: [[{ name: 'bearerAuth', type: 'http-bearer', sourcePointer: '/components/securitySchemes/bearerAuth' }]],
  };
}

describe('generateRuleCandidates', () => {
  it('필수 본문 속성 하나만 제거한다', () => {
    const endpoint = endpointFixture();
    const baseline = buildBaselineRequest(endpoint, 'seed').request;

    const candidate = generateRuleCandidates(endpoint, baseline, 'seed').find((item) => item.ruleId === 'required-body-property');

    expect(candidate).toMatchObject({
      sourcePointer: '/components/schemas/CreateUser/required',
      request: { body: { age: expect.any(Number), role: 'member', name: '홍길동' } },
      expected: { statuses: [400], needsReview: false },
    });
  });

  it('숫자 경계와 enum 위반을 각각 만든다', () => {
    const endpoint = endpointFixture();
    const baseline = buildBaselineRequest(endpoint, 'seed').request;
    const rules = generateRuleCandidates(endpoint, baseline, 'seed').map((item) => item.ruleId);

    expect(rules).toEqual(expect.arrayContaining(['minimum-below', 'maximum-above', 'enum-outside']));
  });

  it('인증 누락 테스트는 401을 기대한다', () => {
    const endpoint = endpointFixture();
    const baseline = buildBaselineRequest(endpoint, 'seed').request;

    const candidate = generateRuleCandidates(endpoint, baseline, 'seed').find((item) => item.ruleId === 'authentication-omitted');

    expect(candidate).toMatchObject({ category: 'authentication', request: { headers: {} }, expected: { statuses: [401] } });
  });

  it('선택한 두 번째 보안 대안의 인증 정보만 제거한다', () => {
    const endpoint = endpointFixture();
    endpoint.security.push([{ name: 'apiKey', type: 'api-key-header', parameterName: 'X-API-Key', sourcePointer: '/api-key' }]);
    const baseline = buildBaselineRequest(endpoint, 'seed', 1).request;

    const candidate = generateRuleCandidates(endpoint, baseline, 'seed', 1).find((item) => item.ruleId === 'authentication-omitted');

    expect(candidate).toMatchObject({ request: { headers: {} }, variantId: expect.stringContaining('security-1') });
  });

  it('빈 보안 대안에는 인증 누락 테스트를 만들지 않는다', () => {
    const endpoint = endpointFixture();
    endpoint.security = [[]];
    const baseline = buildBaselineRequest(endpoint, 'seed', 0).request;

    expect(generateRuleCandidates(endpoint, baseline, 'seed', 0).some((item) => item.ruleId === 'authentication-omitted')).toBe(false);
  });

  it('배열 경계 후보는 유효한 item과 uniqueItems를 유지한다', () => {
    const endpoint = endpointFixture();
    endpoint.requestBody!.properties.tags = schema({
      pointer: '/components/schemas/CreateUser/properties/tags',
      identity: '/components/schemas/CreateUser/properties/tags',
      type: 'array',
      minItems: 1,
      maxItems: 3,
      uniqueItems: true,
      items: schema({ pointer: '/components/schemas/CreateUser/properties/tags/items', identity: '/tags/items' }),
    });
    const baseline = buildBaselineRequest(endpoint, 'seed').request;
    const candidates = generateRuleCandidates(endpoint, baseline, 'seed');
    const maximum = candidates.find((item) => item.ruleId === 'max-items-above')?.request.body as { tags: unknown[] };
    const duplicate = candidates.find((item) => item.ruleId === 'unique-items-duplicate')?.request.body as { tags: unknown[] };

    expect(maximum.tags).toHaveLength(4);
    expect(maximum.tags.every((item) => typeof item === 'string')).toBe(true);
    expect(new Set(maximum.tags).size).toBe(4);
    expect(duplicate.tags).toHaveLength(2);
    expect(new Set(duplicate.tags).size).toBe(1);
  });

  it('필수 파라미터 누락과 파라미터 제약 위반을 각각 만든다', () => {
    const endpoint = endpointFixture();
    endpoint.parameters = [
      { name: 'id', location: 'path', required: true, style: 'simple', explode: false, schema: schema({ pointer: '/parameters/id', minLength: 2 }), sourcePointer: '/parameters/id' },
      { name: 'limit', location: 'query', required: false, style: 'form', explode: true, schema: schema({ pointer: '/parameters/limit', type: 'integer', minimum: 1, maximum: 100 }), sourcePointer: '/parameters/limit' },
    ];
    const baseline = buildBaselineRequest(endpoint, 'seed').request;
    const candidates = generateRuleCandidates(endpoint, baseline, 'seed');

    expect(candidates).toContainEqual(expect.objectContaining({
      ruleId: 'required-parameter',
      variantId: 'path:id',
      request: expect.objectContaining({ pathParameters: {} }),
    }));
    expect(candidates).toContainEqual(expect.objectContaining({
      ruleId: 'path-parameter-empty',
      request: expect.objectContaining({ pathParameters: { id: '' } }),
    }));
    expect(candidates).toContainEqual(expect.objectContaining({
      ruleId: 'minimum-below',
      variantId: 'query:limit',
      request: expect.objectContaining({ queryParameters: { limit: 0 } }),
    }));
  });

  it('범위 응답을 보존하고 정상 요청은 가장 낮은 숫자 2xx만 선택한다', () => {
    const endpoint = endpointFixture();
    endpoint.responses = ['204', '200', '4XX'];
    const baseline = buildBaselineRequest(endpoint, 'seed').request;
    const candidates = generateRuleCandidates(endpoint, baseline, 'seed');

    expect(candidates.find((item) => item.ruleId === 'valid-baseline')?.expected).toMatchObject({ statuses: [200], needsReview: false });
    expect(candidates.find((item) => item.ruleId === 'required-body-property')?.expected).toMatchObject({ statuses: ['4XX'], needsReview: false });
  });

  it('AND 인증 조합에서 각 스킴 누락과 잘못된 값을 따로 만든다', () => {
    const endpoint = endpointFixture();
    endpoint.security = [[
      { name: 'bearerAuth', type: 'http-bearer', sourcePointer: '/security/bearer' },
      { name: 'apiKey', type: 'api-key-header', parameterName: 'X-API-Key', sourcePointer: '/security/api-key' },
    ]];
    const baseline = buildBaselineRequest(endpoint, 'seed').request;
    const candidates = generateRuleCandidates(endpoint, baseline, 'seed');
    const omitted = candidates.filter((item) => item.ruleId === 'authentication-omitted');
    const malformed = candidates.filter((item) => item.ruleId === 'authentication-malformed');

    expect(omitted).toHaveLength(2);
    expect(omitted).toContainEqual(expect.objectContaining({ request: expect.objectContaining({ headers: { 'X-API-Key': '{{API_KEY}}' } }) }));
    expect(omitted).toContainEqual(expect.objectContaining({ request: expect.objectContaining({ headers: { Authorization: 'Bearer {{API_TOKEN}}' } }) }));
    expect(malformed).toHaveLength(2);
  });

  it('배열 항목 타입 위반을 하나의 변이로 만든다', () => {
    const endpoint = endpointFixture();
    endpoint.requestBody!.properties.tags = schema({
      pointer: '/components/schemas/CreateUser/properties/tags',
      identity: '/components/schemas/CreateUser/properties/tags',
      type: 'array',
      items: schema({ pointer: '/components/schemas/CreateUser/properties/tags/items', identity: '/tags/items', type: 'integer' }),
    });
    const baseline = buildBaselineRequest(endpoint, 'seed').request;
    const candidate = generateRuleCandidates(endpoint, baseline, 'seed').find((item) => item.ruleId === 'array-item-type-mismatch');

    expect(candidate?.request.body).toMatchObject({ tags: ['not-a-number'] });
  });

  it('필수 요청 본문 누락과 추가 속성 금지 위반을 만든다', () => {
    const endpoint = endpointFixture();
    endpoint.requestBody!.additionalProperties = false;
    const baseline = buildBaselineRequest(endpoint, 'seed').request;
    const candidates = generateRuleCandidates(endpoint, baseline, 'seed');

    expect(candidates).toContainEqual(expect.objectContaining({ ruleId: 'required-request-body', request: expect.not.objectContaining({ body: expect.anything() }) }));
    expect(candidates).toContainEqual(expect.objectContaining({ ruleId: 'additional-property', request: expect.objectContaining({ body: expect.objectContaining({ __unexpected__: true }) }) }));
  });

  it('oneOf 각 분기의 정상 기준값을 만든다', () => {
    const endpoint = endpointFixture();
    endpoint.requestBody!.properties.choice = schema({
      pointer: '/components/schemas/CreateUser/properties/choice',
      identity: '/choice',
      type: undefined,
      oneOf: [
        schema({ pointer: '/choice/oneOf/0', identity: '/choice/oneOf/0', type: 'integer', minimum: 2 }),
        schema({ pointer: '/choice/oneOf/1', identity: '/choice/oneOf/1', type: 'boolean' }),
      ],
    });
    const baseline = buildBaselineRequest(endpoint, 'seed').request;
    const variants = generateRuleCandidates(endpoint, baseline, 'seed').filter((item) => item.ruleId === 'one-of-valid-branch');

    expect(variants).toHaveLength(2);
    expect(variants.map((item) => (item.request.body as { choice: unknown }).choice)).toEqual(expect.arrayContaining([2, true]));
  });

  it('오류 응답을 확정할 수 없으면 검토 필요 신뢰 수준을 사용한다', () => {
    const endpoint = endpointFixture();
    endpoint.responses = ['201'];
    const baseline = buildBaselineRequest(endpoint, 'seed').request;
    const candidate = generateRuleCandidates(endpoint, baseline, 'seed').find((item) => item.ruleId === 'required-body-property');

    expect(candidate).toMatchObject({ confidence: 'review-required', expected: { needsReview: true, statuses: [] } });
  });

  it('const 불일치는 선언값과 같은 타입으로 만든다', () => {
    const endpoint = endpointFixture();
    endpoint.requestBody!.properties.enabled = schema({
      pointer: '/components/schemas/CreateUser/properties/enabled',
      identity: '/enabled',
      type: 'boolean',
      constValue: true,
    });
    const baseline = buildBaselineRequest(endpoint, 'seed').request;
    const candidate = generateRuleCandidates(endpoint, baseline, 'seed').find((item) => item.ruleId === 'const-mismatch');

    expect(candidate?.request.body).toMatchObject({ enabled: false });
  });
});
