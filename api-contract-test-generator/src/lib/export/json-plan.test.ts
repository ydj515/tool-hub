import { describe, expect, it } from 'vitest';
import { planFixture, selectionFixture } from '../../test/factories';
import { exportJsonPlan } from './json-plan';

describe('exportJsonPlan', () => {
  it('버전 스키마와 선택된 테스트만 내보낸다', () => {
    const serialized = exportJsonPlan(planFixture(), selectionFixture());
    const output = JSON.parse(serialized) as { schemaVersion: string; source: { title: string; version: string; documentHash: string }; testCases: Array<{ id: string }> };

    expect(output.schemaVersion).toBe('toolhub.api-contract-test-plan/v1');
    expect(output.source).toEqual({ title: 'User API', version: '1.0.0', documentHash: 'digest' });
    expect(output.testCases.map((item) => item.id)).toEqual(['required-email-id', 'auth-id']);
    expect(serialized).not.toContain('Bearer real-secret');
  });
});
