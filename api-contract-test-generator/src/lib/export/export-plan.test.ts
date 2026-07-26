import { describe, expect, it } from 'vitest';
import { planFixture, selectionFixture } from '../../test/factories';
import { exportPlan } from './export-plan';

describe('exportPlan', () => {
  it('제목을 안전한 파일명으로 바꾼다', () => {
    expect(exportPlan(planFixture(), selectionFixture(), 'markdown').filename).toBe('user-api-test-plan.md');
    expect(exportPlan(planFixture(), selectionFixture(), 'json').filename).toBe('user-api-test-plan.json');
    expect(exportPlan(planFixture(), selectionFixture(), 'postman').filename).toBe('user-api-postman-collection.json');
  });
});
