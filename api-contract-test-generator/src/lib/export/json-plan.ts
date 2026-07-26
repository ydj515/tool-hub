import type { TestCaseSelection, TestPlan } from '../../domain/test-case';
import { expectedStatuses, sanitizeRequest, selectedTests } from './shared';

export function exportJsonPlan(plan: TestPlan, selections: Record<string, TestCaseSelection>): string {
  const testCases = selectedTests(plan, selections).map((testCase) => ({
    ...testCase,
    request: sanitizeRequest(plan, testCase),
    expected: {
      ...testCase.expected,
      statuses: expectedStatuses(testCase, selections[testCase.id]),
      needsReview: !selections[testCase.id]?.reviewed && testCase.expected.needsReview,
    },
    selection: selections[testCase.id],
  }));

  return JSON.stringify({
    schemaVersion: plan.schemaVersion,
    source: {
      title: plan.title,
      version: plan.apiVersion,
      documentHash: plan.sourceDigest,
    },
    specVersion: plan.specVersion,
    serverUrl: plan.serverUrl,
    generatedAt: plan.generatedAt,
    diagnostics: plan.diagnostics,
    testCases,
  }, null, 2);
}
