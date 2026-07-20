import { describe, expect, it } from 'vitest';
import { convertSource, prettySource, sampleFor } from './converter';

describe('converter', () => {
  it('JSON을 YAML로 변환한다', () => {
    expect(convertSource('{"name":"tool-hub"}', 'json-to-yaml')).toEqual({
      ok: true,
      value: 'name: tool-hub\n',
    });
  });

  it('YAML을 JSON으로 변환한다', () => {
    expect(convertSource('name: tool-hub\n', 'yaml-to-json')).toEqual({
      ok: true,
      value: '{\n  "name": "tool-hub"\n}\n',
    });
  });

  it('현재 방향에 맞는 Pretty와 예제를 제공한다', () => {
    expect(prettySource('{"a":1}', 'json-to-yaml').ok).toBe(true);
    expect(prettySource('a: 1', 'yaml-to-json').ok).toBe(true);
    expect(sampleFor('json-to-yaml')).toContain('"name"');
    expect(sampleFor('yaml-to-json')).toContain('name:');
  });

  it('방향이 정한 입력 문법 오류를 그대로 반환한다', () => {
    const result = convertSource('name: tool-hub\n', 'json-to-yaml');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.diagnostic.format).toBe('json');
  });
});
