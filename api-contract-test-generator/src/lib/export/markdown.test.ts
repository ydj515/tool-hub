import { describe, expect, it } from 'vitest';
import { planFixture, selectionFixture } from '../../test/factories';
import { exportMarkdown } from './markdown';

describe('exportMarkdown', () => {
  it('근거와 검토 경고를 포함한다', () => {
    const output = exportMarkdown(planFixture(), selectionFixture());

    expect(output).toContain('# User API 테스트 계획');
    expect(output).toContain('검토 필요');
    expect(output).toContain('/components/schemas/CreateUser/required');
    expect(output).toContain('입력 문서 SHA-256: digest');
    expect(output).not.toContain('Bearer real-secret');
    expect(output).toContain('Bearer {{API_TOKEN}}');
    expect(output).not.toContain('제외된 테스트');
  });

  it('미지원 및 생략 진단을 포함한다', () => {
    const plan = planFixture();
    plan.diagnostics = [{ id: 'external', code: 'EXTERNAL_REFERENCE_UNSUPPORTED', severity: 'warning', stage: 'reference', message: '외부 참조 생략', sourcePointer: 'https://example.com/schema.yaml', blocking: false }];

    const output = exportMarkdown(plan, selectionFixture());

    expect(output).toContain('## 진단');
    expect(output).toContain('EXTERNAL_REFERENCE_UNSUPPORTED');
    expect(output).toContain('외부 참조 생략');
  });
});
