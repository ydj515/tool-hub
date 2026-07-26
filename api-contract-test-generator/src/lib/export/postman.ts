import type { NormalizedEndpoint, NormalizedParameter } from '../../domain/contract';
import type { ExpectedStatus, GeneratedRequest, GeneratedTestCase, TestCaseSelection, TestPlan } from '../../domain/test-case';
import { expectedStatuses, sanitizeRequest, selectedTests } from './shared';

interface PostmanItem {
  name: string;
  request: Record<string, unknown>;
  event?: Array<Record<string, unknown>>;
}

function sanitizeHeader(name: string, value: string): string {
  if (name.toLowerCase() === 'authorization') {
    if (value === 'Bearer' || value === 'Basic invalid') return value;
    if (/^basic\s/i.test(value)) return 'Basic {{BASIC_AUTH}}';
    return 'Bearer {{API_TOKEN}}';
  }
  if (/api[-_]?key/i.test(name) && value !== 'invalid-api-key') return '{{API_KEY}}';
  return value;
}

function objectEntries(value: unknown): Array<[string, unknown]> {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? Object.entries(value) : [];
}

function serializeSimple(value: unknown, explode: boolean): string {
  if (Array.isArray(value)) return value.map(String).join(',');
  const entries = objectEntries(value);
  if (entries.length > 0) {
    return explode
      ? entries.map(([key, item]) => `${key}=${String(item)}`).join(',')
      : entries.flatMap(([key, item]) => [key, String(item)]).join(',');
  }
  return String(value ?? '');
}

function formPairs(name: string, value: unknown, explode: boolean): Array<[string, string]> {
  if (Array.isArray(value)) return explode ? value.map((item) => [name, String(item)]) : [[name, value.map(String).join(',')]];
  const entries = objectEntries(value);
  if (entries.length > 0) {
    return explode
      ? entries.map(([key, item]) => [key, String(item)])
      : [[name, entries.flatMap(([key, item]) => [key, String(item)]).join(',')]];
  }
  return [[name, String(value ?? '')]];
}

function findParameter(endpoint: NormalizedEndpoint | undefined, location: NormalizedParameter['location'], name: string): NormalizedParameter | undefined {
  return endpoint?.parameters.find((parameter) => parameter.location === location && parameter.name.toLowerCase() === name.toLowerCase());
}

function requestUrl(testCase: GeneratedTestCase, endpoint: NormalizedEndpoint | undefined): string {
  let path = testCase.path;
  for (const [name, value] of Object.entries(testCase.request.pathParameters)) {
    const parameter = findParameter(endpoint, 'path', name);
    const serialized = parameter ? serializeSimple(value, parameter.explode) : String(value);
    path = path.replace(`{${name}}`, testCase.ruleId === 'path-parameter-invalid-encoding' ? serialized : encodeURIComponent(serialized));
  }
  const query = new URLSearchParams();
  for (const [name, value] of Object.entries(testCase.request.queryParameters)) {
    const parameter = findParameter(endpoint, 'query', name);
    const pairs = parameter ? formPairs(name, value, parameter.explode) : [[name, String(value)]];
    for (const [key, item] of pairs) query.append(key, item);
  }
  return `{{baseUrl}}${path}${query.size ? `?${query.toString()}` : ''}`;
}

function headers(request: GeneratedRequest, endpoint: NormalizedEndpoint | undefined): Array<{ key: string; value: string; type: 'text' }> {
  const values = Object.entries(request.headers).map(([key, value]) => {
    const parameter = findParameter(endpoint, 'header', key);
    const serialized = parameter ? serializeSimple(value, parameter.explode) : String(value);
    return { key, value: sanitizeHeader(key, serialized), type: 'text' as const };
  });
  if (request.body !== undefined && !values.some((header) => header.key.toLowerCase() === 'content-type')) {
    values.push({ key: 'Content-Type', value: 'application/json', type: 'text' });
  }
  if (Object.keys(request.cookies).length > 0) {
    const cookieValues = Object.entries(request.cookies).flatMap(([key, value]) => {
      const parameter = findParameter(endpoint, 'cookie', key);
      const pairs = parameter ? formPairs(key, value, parameter.explode) : [[key, String(value)]];
      return pairs.map(([name, item]) => `${name}=${/api[-_]?key/i.test(name) && item !== 'invalid-api-key' ? '{{API_KEY}}' : item}`);
    });
    values.push({
      key: 'Cookie',
      value: cookieValues.join('; '),
      type: 'text',
    });
  }
  return values;
}

function statusEvent(statuses: ExpectedStatus[]): Array<Record<string, unknown>> | undefined {
  if (statuses.length === 0 || !statuses.every((status): status is number => typeof status === 'number')) return undefined;
  return [{
    listen: 'test',
    script: {
      type: 'text/javascript',
      exec: statuses.length === 1
        ? [`pm.test("상태 코드 ${statuses[0]}", function () {`, `  pm.response.to.have.status(${statuses[0]});`, '});']
        : [`pm.test("허용된 상태 코드", function () {`, `  pm.expect(${JSON.stringify(statuses)}).to.include(pm.response.code);`, '});'],
    },
  }];
}

function postmanItem(testCase: GeneratedTestCase, selection: TestCaseSelection | undefined, plan: TestPlan): PostmanItem {
  const statuses = expectedStatuses(testCase, selection);
  const endpoint = plan.endpoints.find((item) => item.id === testCase.endpointId);
  const request = sanitizeRequest(plan, testCase);
  return {
    name: testCase.title,
    request: {
      method: testCase.method,
      header: headers(request, endpoint),
      body: request.body === undefined ? undefined : { mode: 'raw', raw: JSON.stringify(request.body, null, 2), options: { raw: { language: 'json' } } },
      url: requestUrl({ ...testCase, request }, endpoint),
      description: `${testCase.rationale}\n\n근거: ${testCase.sourcePointer}`,
    },
    event: statusEvent(statuses),
  };
}

export function exportPostman(plan: TestPlan, selections: Record<string, TestCaseSelection>): string {
  const folders = new Map<string, PostmanItem[]>();
  for (const testCase of selectedTests(plan, selections)) {
    const tag = testCase.tags[0] || '기타';
    const folder = folders.get(tag) ?? [];
    folder.push(postmanItem(testCase, selections[testCase.id], plan));
    folders.set(tag, folder);
  }

  return JSON.stringify({
    info: {
      name: `${plan.title} Contract Tests`,
      description: 'API Contract Test Generator에서 생성한 검토 가능한 요청 모음입니다.',
      schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
    },
    variable: [
      { key: 'baseUrl', value: plan.serverUrl ?? '', type: 'string' },
      { key: 'API_TOKEN', value: '', type: 'string' },
      { key: 'API_KEY', value: '', type: 'string' },
      { key: 'BASIC_AUTH', value: '', type: 'string' },
    ],
    item: [...folders].map(([name, item]) => ({ name, item })),
  }, null, 2);
}
