import type { ExpectedStatus, GeneratedRequest, GeneratedTestCase, TestCaseSelection, TestPlan } from '../../domain/test-case';

export function selectedTests(plan: TestPlan, selections: Record<string, TestCaseSelection>): GeneratedTestCase[] {
  return plan.testCases.filter((testCase) => selections[testCase.id]?.included);
}

export function expectedStatuses(testCase: GeneratedTestCase, selection: TestCaseSelection | undefined): ExpectedStatus[] {
  if (selection?.expectedStatuses?.length && selection.reviewed) return selection.expectedStatuses;
  if (!testCase.expected.needsReview || selection?.reviewed) return testCase.expected.statuses;
  return [];
}

export function safeSlug(title: string): string {
  const slug = title
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'api';
}

function replaceNamedValue(values: Record<string, unknown>, name: string, replacement: string): void {
  const key = Object.keys(values).find((candidate) => candidate.toLowerCase() === name.toLowerCase());
  if (key && values[key] !== 'invalid-api-key') values[key] = replacement;
}

export function sanitizeRequest(plan: TestPlan, testCase: GeneratedTestCase): GeneratedRequest {
  const request = structuredClone(testCase.request);
  const authorizationKey = Object.keys(request.headers).find((name) => name.toLowerCase() === 'authorization');
  if (authorizationKey) {
    const value = String(request.headers[authorizationKey]);
    if (!['Bearer', 'Basic invalid'].includes(value)) {
      request.headers[authorizationKey] = /^basic\s/i.test(value) ? 'Basic {{BASIC_AUTH}}' : 'Bearer {{API_TOKEN}}';
    }
  }

  const endpoint = plan.endpoints.find((item) => item.id === testCase.endpointId);
  for (const alternative of endpoint?.security ?? []) {
    for (const scheme of alternative) {
      if (!scheme.parameterName) continue;
      if (scheme.type === 'api-key-header') replaceNamedValue(request.headers, scheme.parameterName, '{{API_KEY}}');
      if (scheme.type === 'api-key-query') replaceNamedValue(request.queryParameters, scheme.parameterName, '{{API_KEY}}');
      if (scheme.type === 'api-key-cookie') replaceNamedValue(request.cookies, scheme.parameterName, '{{API_KEY}}');
    }
  }
  for (const [name, value] of Object.entries(request.headers)) if (/api[-_]?key/i.test(name) && value !== 'invalid-api-key') request.headers[name] = '{{API_KEY}}';
  for (const [name, value] of Object.entries(request.queryParameters)) if (/api[-_]?key/i.test(name) && value !== 'invalid-api-key') request.queryParameters[name] = '{{API_KEY}}';
  for (const [name, value] of Object.entries(request.cookies)) if (/api[-_]?key/i.test(name) && value !== 'invalid-api-key') request.cookies[name] = '{{API_KEY}}';
  return request;
}
