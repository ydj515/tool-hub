import { describe, expect, it } from 'vitest';
import { analyzeContract } from './analyze-contract';

const document = (ref: string) => JSON.stringify({
  openapi: '3.1.0',
  info: { title: 'Reference API', version: '1' },
  paths: {
    '/users': {
      post: {
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: ref } } } },
        responses: { 201: { description: 'created' } },
      },
    },
    '/health': { get: { responses: { 204: { description: 'ok' } } } },
  },
});

describe('analyzeContract', () => {
  it('존재하지 않는 내부 ref는 전체 분석을 차단한다', async () => {
    const result = await analyzeContract(document('#/components/schemas/Missing'), 'api.json', 'seed');

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.diagnostics).toContainEqual(expect.objectContaining({ code: 'REFERENCE_NOT_FOUND', blocking: true }));
  });

  it('외부 ref는 영향받은 엔드포인트만 생략하고 나머지를 생성한다', async () => {
    const result = await analyzeContract(document('https://example.com/user.yaml'), 'api.json', 'seed');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.partial).toBe(true);
      expect(result.plan.testCases.some((testCase) => testCase.endpointId === 'GET /health')).toBe(true);
      expect(result.plan.testCases.some((testCase) => testCase.endpointId === 'POST /users')).toBe(false);
    }
  });
});
