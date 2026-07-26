import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { analyzeContract } from './analyze-contract';

const fixtures = [
  { name: 'OpenAPI 3.0.4 Petstore', file: '3.0.4.yml', endpointCount: 19, baselineCount: 20, specVersion: 'openapi-3.0' },
  { name: 'OpenAPI 3.1.0 Petstore', file: '3.1.0.yml', endpointCount: 19, baselineCount: 20, specVersion: 'openapi-3.1' },
  { name: 'OpenAPI 3.2.0 Petstore', file: '3.2.0.yml', endpointCount: 21, baselineCount: 22, specVersion: 'openapi-3.2' },
] as const;

describe.each(fixtures)('$name 회귀 명세', ({ file, endpointCount, baselineCount, specVersion }) => {
  it('모든 작업과 인증 대안의 정상 기준 요청을 생성한다', async () => {
    const raw = readFileSync(resolve(process.cwd(), 'src/test/fixtures', file), 'utf8');
    const result = await analyzeContract(raw, file, 'petstore-regression');

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.plan.specVersion).toBe(specVersion);
    expect(result.plan.summary.endpointCount).toBe(endpointCount);
    expect(result.plan.summary.skippedCount).toBe(0);
    const baselineCases = result.plan.testCases.filter((testCase) => testCase.ruleId === 'valid-baseline');
    expect(new Set(baselineCases.map((testCase) => testCase.endpointId))).toHaveLength(endpointCount);
    expect(baselineCases).toHaveLength(baselineCount);
  });
});
