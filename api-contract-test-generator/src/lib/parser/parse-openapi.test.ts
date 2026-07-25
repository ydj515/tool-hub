import { describe, expect, it } from 'vitest';
import { parseOpenApi } from './parse-openapi';

const validInfo = 'info:\n  title: Pets\n  version: "1"\npaths: {}\n';

describe('parseOpenApi', () => {
  it('OpenAPI 3.1 YAML을 파싱한다', () => {
    const result = parseOpenApi(`openapi: 3.1.1\n${validInfo}`, 'pets.yaml');

    expect(result).toMatchObject({ ok: true, format: 'yaml', version: 'openapi-3.1' });
  });

  it('OpenAPI 3.0 JSON을 파싱한다', () => {
    const result = parseOpenApi('{"openapi":"3.0.4","info":{"title":"Pets","version":"1"},"paths":{}}', 'pets.json');

    expect(result).toMatchObject({ ok: true, format: 'json', version: 'openapi-3.0' });
  });

  it('OpenAPI 3.2를 차단한다', () => {
    const result = parseOpenApi('{"openapi":"3.2.0","info":{"title":"Pets","version":"1"},"paths":{}}', 'pets.json');

    expect(result.diagnostics).toContainEqual(expect.objectContaining({ code: 'UNSUPPORTED_SPEC_VERSION', blocking: true }));
  });

  it('YAML 문법 오류 위치를 보고한다', () => {
    const result = parseOpenApi('openapi: 3.1.0\ninfo: [\n', 'broken.yaml');

    expect(result.diagnostics[0]).toEqual(expect.objectContaining({
      code: 'YAML_SYNTAX_ERROR',
      location: expect.objectContaining({ startLine: 2 }),
    }));
  });

  it('YAML 다중 문서를 차단한다', () => {
    const result = parseOpenApi(`openapi: 3.1.0\n${validInfo}---\nopenapi: 3.1.0\n${validInfo}`, 'multi.yaml');

    expect(result.diagnostics).toContainEqual(expect.objectContaining({ code: 'MULTIPLE_YAML_DOCUMENTS', blocking: true }));
  });

  it('같은 줄의 JSON 문법 오류도 고유한 진단 ID를 사용한다', () => {
    const result = parseOpenApi('{"openapi":"3.1.0","info":', 'broken.json');
    const ids = result.diagnostics.map((diagnostic) => diagnostic.id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it('UTF-8 5MB 이상 직접 입력에 경고를 추가한다', () => {
    const padding = 'a'.repeat(5 * 1024 * 1024);
    const result = parseOpenApi(`openapi: 3.1.0\n${validInfo}x-padding: ${padding}\n`, 'large.yaml');

    expect(result.diagnostics).toContainEqual(expect.objectContaining({ code: 'LARGE_INPUT_WARNING', blocking: false }));
  });
});
