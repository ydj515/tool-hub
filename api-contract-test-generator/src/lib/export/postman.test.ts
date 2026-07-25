import { describe, expect, it } from 'vitest';
import { planFixture, selectionFixture } from '../../test/factories';
import { exportPostman } from './postman';

describe('exportPostman', () => {
  it('태그 폴더, baseUrl, 검토된 상태 assertion을 만든다', () => {
    const output = JSON.parse(exportPostman(planFixture(), selectionFixture())) as Record<string, unknown>;
    const serialized = JSON.stringify(output);

    expect((output.info as { schema: string }).schema).toContain('v2.1.0');
    expect(output.variable).toContainEqual(expect.objectContaining({ key: 'baseUrl', value: 'https://api.example.com' }));
    expect((output.item as Array<{ name: string }>)[0]?.name).toBe('Users');
    expect(serialized).toContain('pm.response.to.have.status(400)');
    expect(serialized).not.toContain('Bearer real-secret');
    expect(serialized).not.toContain('pm.response.to.have.status(undefined)');
  });

  it('파라미터 style과 explode에 맞춰 배열과 객체를 직렬화한다', () => {
    const plan = planFixture();
    const testCase = plan.testCases[0]!;
    plan.endpoints[0]!.path = '/users/{segments}';
    plan.endpoints[0]!.parameters = [
      { name: 'segments', location: 'path', required: true, style: 'simple', explode: false, schema: { pointer: '/segments', identity: '/segments', type: 'array', nullable: false, required: [], properties: {}, items: { pointer: '/segment', identity: '/segment', type: 'string', nullable: false, required: [], properties: {}, uniqueItems: false }, uniqueItems: false }, sourcePointer: '/segments' },
      { name: 'tag', location: 'query', required: false, style: 'form', explode: true, schema: { pointer: '/tag', identity: '/tag', type: 'array', nullable: false, required: [], properties: {}, uniqueItems: false }, sourcePointer: '/tag' },
      { name: 'filter', location: 'query', required: false, style: 'form', explode: true, schema: { pointer: '/filter', identity: '/filter', type: 'object', nullable: false, required: [], properties: {}, uniqueItems: false }, sourcePointer: '/filter' },
      { name: 'X-Meta', location: 'header', required: false, style: 'simple', explode: true, schema: { pointer: '/meta', identity: '/meta', type: 'object', nullable: false, required: [], properties: {}, uniqueItems: false }, sourcePointer: '/meta' },
      { name: 'session', location: 'cookie', required: false, style: 'form', explode: true, schema: { pointer: '/session', identity: '/session', type: 'array', nullable: false, required: [], properties: {}, uniqueItems: false }, sourcePointer: '/session' },
    ];
    testCase.path = '/users/{segments}';
    testCase.request = {
      pathParameters: { segments: ['north', 'seoul'] },
      queryParameters: { tag: ['red', 'blue'], filter: { role: 'admin', active: true } },
      headers: { 'X-Meta': { role: 'admin', level: 2 } },
      cookies: { session: ['a', 'b'] },
    };
    plan.testCases = [testCase];
    const selections = { [testCase.id]: { included: true, reviewed: true } };
    const output = JSON.parse(exportPostman(plan, selections)) as { item: Array<{ item: Array<{ request: { url: string; header: Array<{ key: string; value: string }> } }> }> };
    const request = output.item[0]!.item[0]!.request;

    expect(decodeURIComponent(request.url)).toContain('/users/north,seoul?tag=red&tag=blue&role=admin&active=true');
    expect(request.header).toContainEqual(expect.objectContaining({ key: 'X-Meta', value: 'role=admin,level=2' }));
    expect(request.header).toContainEqual(expect.objectContaining({ key: 'Cookie', value: 'session=a; session=b' }));
  });

  it('2XX 또는 4XX 범위에는 정확한 상태 assertion을 만들지 않는다', () => {
    const plan = planFixture();
    plan.testCases[0]!.expected = { statuses: ['2XX'], needsReview: false, rationale: '범위 응답' };
    const output = exportPostman(plan, selectionFixture());

    expect(output).not.toContain('pm.response.to.have.status');
  });

  it('서버 URL이 없으면 baseUrl 값을 비워 둔다', () => {
    const plan = planFixture();
    plan.serverUrl = undefined;
    const output = JSON.parse(exportPostman(plan, selectionFixture())) as { variable: Array<{ key: string; value: string }> };

    expect(output.variable).toContainEqual(expect.objectContaining({ key: 'baseUrl', value: '' }));
  });
});
