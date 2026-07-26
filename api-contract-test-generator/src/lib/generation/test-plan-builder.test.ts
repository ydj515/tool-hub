import { describe, expect, it } from 'vitest';
import type { NormalizedContract, NormalizedEndpoint, NormalizedSchema } from '../../domain/contract';
import { generateTestPlan } from './test-plan-builder';

function schema(pointer: string): NormalizedSchema {
  return {
    pointer, identity: pointer, type: 'object', nullable: false, required: ['email'], uniqueItems: false,
    properties: {
      email: {
        pointer: `${pointer}/properties/email`, identity: `${pointer}/properties/email`, type: 'string', nullable: false,
        required: [], properties: {}, uniqueItems: false, format: 'email', minLength: 3, maxLength: 40,
      },
    },
  };
}

function endpoint(method: string, path: string): NormalizedEndpoint {
  return {
    id: `${method} ${path}`, method, path, tags: ['Users'], parameters: [], responses: ['201', '400'], security: [], incomplete: false,
    requestBodyRequired: true, requestBodyMediaType: 'application/json', requestBody: schema(`/paths/${path}/body`), sourcePointer: `/paths/${path}/${method.toLowerCase()}`,
  };
}

function contractFixture(): NormalizedContract {
  return {
    title: 'User API', apiVersion: '1.0.0', specVersion: 'openapi-3.1', serverUrl: 'https://api.example.com', diagnostics: [],
    endpoints: [endpoint('POST', '/users'), endpoint('PUT', '/users/{id}')],
  };
}

describe('generateTestPlan', () => {
  it('같은 계약과 seed에서 ID와 순서를 유지한다', async () => {
    const first = await generateTestPlan(contractFixture(), 'toolhub');
    const second = await generateTestPlan(contractFixture(), 'toolhub');

    expect(second.plan.testCases.map((item) => item.id)).toEqual(first.plan.testCases.map((item) => item.id));
    expect(new Set(first.plan.testCases.map((item) => item.id)).size).toBe(first.plan.testCases.length);
  });

  it('엔드포인트와 전체 상한을 적용하고 진단한다', async () => {
    const unlimited = await generateTestPlan(contractFixture(), 'toolhub');
    const result = await generateTestPlan(contractFixture(), 'toolhub', { maxPerEndpoint: 2, maxTotal: 3 });

    expect(result.plan.testCases).toHaveLength(3);
    expect(result.plan.summary.skippedCount).toBe(unlimited.plan.testCases.length - 3);
    expect(result.plan.diagnostics).toContainEqual(expect.objectContaining({ code: 'TEST_LIMIT_REACHED' }));
  });

  it('생성된 모든 테스트를 기본 선택한다', async () => {
    const result = await generateTestPlan(contractFixture(), 'toolhub');

    expect(Object.keys(result.selections)).toHaveLength(result.plan.testCases.length);
    expect(Object.values(result.selections).every((selection) => selection.included)).toBe(true);
  });
});
