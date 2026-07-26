import type { TestCaseSelection, TestPlan } from '../../domain/test-case';
import { expectedStatuses, sanitizeRequest, selectedTests } from './shared';

function confidenceLabel(confidence: string): string {
  if (confidence === 'explicit') return '명시적';
  if (confidence === 'derived') return '파생';
  return '검토 필요';
}

export function exportMarkdown(plan: TestPlan, selections: Record<string, TestCaseSelection>): string {
  const tests = selectedTests(plan, selections);
  const lines = [
    `# ${plan.title} 테스트 계획`,
    '',
    `- API 버전: ${plan.apiVersion}`,
    `- 명세 버전: ${plan.specVersion}`,
    `- 선택한 테스트: ${tests.length}개`,
    `- 생성 시각: ${plan.generatedAt}`,
    `- 입력 문서 SHA-256: ${plan.sourceDigest}`,
    '',
  ];

  for (const testCase of tests) {
    const selection = selections[testCase.id];
    const statuses = expectedStatuses(testCase, selection);
    lines.push(
      `## ${testCase.method} ${testCase.path} — ${testCase.title}`,
      '',
      `- 분류: ${testCase.category}`,
      `- 신뢰 수준: ${confidenceLabel(testCase.confidence)}`,
      `- 근거 위치: \`${testCase.sourcePointer}\``,
      `- 기대 상태: ${statuses.length ? statuses.join(', ') : '검토 필요'}`,
      `- 근거: ${testCase.rationale}`,
      '',
      '```json',
      JSON.stringify(sanitizeRequest(plan, testCase), null, 2),
      '```',
      '',
    );
  }

  if (plan.diagnostics.length > 0) {
    lines.push('## 진단', '');
    for (const diagnostic of plan.diagnostics) {
      const location = diagnostic.sourcePointer ? ` (${diagnostic.sourcePointer})` : '';
      lines.push(`- **${diagnostic.code}** ${diagnostic.message}${location}`);
    }
    lines.push('');
  }

  return `${lines.join('\n').trim()}\n`;
}
