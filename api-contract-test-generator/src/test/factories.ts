import type { NormalizedEndpoint } from '../domain/contract';
import type { GeneratedTestCase, TestCaseSelection, TestPlan } from '../domain/test-case';

export function testCase(overrides: Partial<GeneratedTestCase> = {}): GeneratedTestCase {
  return {
    id: 'required-email-id',
    endpointId: 'POST /users',
    method: 'POST',
    path: '/users',
    tags: ['Users'],
    title: '필수 email 필드 누락',
    category: 'validation',
    confidence: 'explicit',
    sourcePointer: '/components/schemas/CreateUser/required',
    rationale: 'required 제약을 한 번만 변경합니다.',
    request: {
      pathParameters: {},
      queryParameters: {},
      headers: { Authorization: 'Bearer real-secret' },
      cookies: {},
      body: { name: '홍길동' },
    },
    expected: { statuses: [400], needsReview: false, rationale: '400 응답이 선언되어 있습니다.' },
    ruleId: 'required-body-property',
    variantId: 'email',
    priority: 10,
    ...overrides,
  };
}

export function endpoint(overrides: Partial<NormalizedEndpoint> = {}): NormalizedEndpoint {
  return {
    id: 'POST /users', method: 'POST', path: '/users', tags: ['Users'], parameters: [], responses: ['201', '400'],
    security: [], incomplete: false, requestBodyRequired: true, requestBodyMediaType: 'application/json', sourcePointer: '/paths/~1users/post',
    ...overrides,
  };
}

export function planFixture(): TestPlan {
  const tests = [
    testCase(),
    testCase({
      id: 'auth-id', title: '인증 토큰 누락', category: 'authentication', sourcePointer: '/components/securitySchemes/bearerAuth',
      expected: { statuses: [], needsReview: true, rationale: '상태 코드 검토가 필요합니다.' },
      ruleId: 'authentication-omitted', variantId: 'auth', priority: 20, request: { pathParameters: {}, queryParameters: {}, headers: {}, cookies: {} },
    }),
    testCase({ id: 'excluded-id', title: '제외된 테스트', ruleId: 'type-mismatch', variantId: 'excluded', priority: 30 }),
  ];
  return {
    schemaVersion: 'toolhub.api-contract-test-plan/v1',
    title: 'User API', apiVersion: '1.0.0', specVersion: 'openapi-3.1', serverUrl: 'https://api.example.com',
    generatedAt: '2026-07-25T00:00:00.000Z', endpoints: [endpoint()], testCases: tests, diagnostics: [], sourceDigest: 'digest',
    summary: { endpointCount: 1, testCount: tests.length, reviewRequiredCount: 1, skippedCount: 0 },
  };
}

export function selectionFixture(): Record<string, TestCaseSelection> {
  return {
    'required-email-id': { included: true, reviewed: true },
    'auth-id': { included: true, reviewed: false },
    'excluded-id': { included: false, reviewed: true },
  };
}
