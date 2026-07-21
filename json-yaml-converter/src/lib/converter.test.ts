import { describe, expect, it } from 'vitest';
import { convertSource, prettySource, sampleFor } from './converter';
import { OUTPUT_LIMIT_BYTES } from './safety';

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

  it('들여쓰기 증폭으로 출력 제한을 넘는 변환을 blocking 진단으로 거부한다', () => {
    const source = `${'['.repeat(90)}${Array.from({ length: 12_000 }, () => '0').join(',')}${']'.repeat(90)}`;
    expect(new TextEncoder().encode(source).byteLength).toBeLessThan(1024 * 1024);

    const result = convertSource(source, 'json-to-yaml');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.diagnostic.code).toBe('OUTPUT_TOO_LARGE');
    expect(result.diagnostic.format).toBe('json');
    expect(OUTPUT_LIMIT_BYTES).toBe(2 * 1024 * 1024);
  });

  it('Pretty 출력이 제한을 넘으면 원문 대신 blocking 진단을 반환한다', () => {
    const source = `${'['.repeat(90)}${Array.from({ length: 12_000 }, () => '0').join(',')}${']'.repeat(90)}`;
    const result = prettySource(source, 'json-to-yaml');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.diagnostic.code).toBe('OUTPUT_TOO_LARGE');
  });

  it('JSON → YAML 변환에서 제한보다 작은 다수의 빈 문자열을 허용한다', () => {
    const count = 120_000;
    const source = `[${Array.from({ length: count }, () => '""').join(',')}]`;

    const result = convertSource(source, 'json-to-yaml');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(new TextEncoder().encode(result.value).byteLength).toBe(count * 5);
  });
});
