import { describe, expect, it } from 'vitest';
import { convertSource, prettySource, sampleFor } from './converter';
import { OUTPUT_LIMIT_BYTES } from './safety';
import { parseYaml } from './yaml';

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

  it('현재 방향에 맞는 Pretty를 제공한다', () => {
    expect(prettySource('{"a":1}', 'json-to-yaml').ok).toBe(true);
    expect(prettySource('a: 1', 'yaml-to-json').ok).toBe(true);
  });

  it('현재 방향에 맞는 동일한 AsyncAPI 예제를 제공한다', () => {
    const jsonSample = sampleFor('json-to-yaml');
    const yamlSample = sampleFor('yaml-to-json');

    expect(jsonSample).toContain('"title": "Streetlights Kafka API"');
    expect(jsonSample).toContain('"smartylighting.streetlights.1.0.event.{streetlightId}.lighting.measured"');
    expect(yamlSample).toContain('title: Streetlights Kafka API');
    expect(yamlSample).toContain('"smartylighting.streetlights.1.0.event.{streetlightId}.lighting.measured":');
    expect(convertSource(yamlSample, 'yaml-to-json')).toEqual({ ok: true, value: jsonSample });
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

  it('JSON → YAML 변환의 1,025자 object key를 valid explicit key로 출력한다', () => {
    const key = 'k'.repeat(1_025);
    const result = convertSource(JSON.stringify({ [key]: 1 }), 'json-to-yaml');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(parseYaml(result.value)).toEqual({
      ok: true,
      value: { kind: 'mapping', entries: [{ key, value: { kind: 'number', value: 1 } }] },
    });
    expect(result.value).toBe(`? ${key}\n: 1\n`);
  });

  it('JSON → YAML 변환의 UTF-16 1,026단위 emoji key를 valid explicit key로 출력한다', () => {
    const key = '😀'.repeat(513);
    const result = convertSource(JSON.stringify({ [key]: true }), 'json-to-yaml');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(parseYaml(result.value)).toEqual({
      ok: true,
      value: { kind: 'mapping', entries: [{ key, value: { kind: 'boolean', value: true } }] },
    });
    expect(result.value).toBe(`? ${key}\n: true\n`);
  });
});
