import { describe, expect, it } from 'vitest';
import type { DataNode } from './data-node';
import { parseJson, preflightJsonOutput, preflightPrettyJsonOutput, prettyJson, stringifyJson } from './json';
import { OUTPUT_LIMIT_BYTES } from './safety';

const nestedJson = (depth: number) => '['.repeat(depth) + '0' + ']'.repeat(depth);

function amplifiedNode(onConstruction: () => never): DataNode {
  const items = new Proxy(
    Array.from({ length: 12_000 }, (): DataNode => ({ kind: 'number', value: 0 })),
    {
      get(target, property, receiver) {
        if (property === 'map') return onConstruction;
        return Reflect.get(target, property, receiver) as unknown;
      },
    },
  );
  let node: DataNode = { kind: 'sequence', items };
  for (let depth = 0; depth < 89; depth += 1) node = { kind: 'sequence', items: [node] };
  return node;
}

describe('JSON domain', () => {
  it.each(['null', 'true', '"text"', '3', '[1,2]'])('루트 값 %s를 허용한다', (source) => {
    expect(parseJson(source).ok).toBe(true);
  });

  it('객체, 배열, 스칼라와 키 순서를 보존한다', () => {
    const parsed = parseJson('{"10":"ten","2":"two","value":[true,null,3]}');
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(stringifyJson(parsed.value)).toEqual({
      ok: true,
      value: '{\n  "10": "ten",\n  "2": "two",\n  "value": [\n    true,\n    null,\n    3\n  ]\n}\n',
    });
  });

  it.each([
    ['{"a":1,}', 'PropertyNameExpected'],
    ['{/*x*/"a":1}', 'InvalidCommentToken'],
    ['{"a":1,"a":2}', 'DUPLICATE_KEY'],
  ])('엄격하지 않은 JSON %s를 거부한다', (source, code) => {
    const result = parseJson(source);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.diagnostic.code).toBe(code);
  });

  it('첫 오류의 행과 열을 계산한다', () => {
    const result = parseJson('{\n  "enabled" true\n}');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.diagnostic).toMatchObject({ line: 2, column: 13 });
  });

  it('JSON Pretty를 2칸 들여쓰기와 마지막 줄바꿈으로 만든다', () => {
    expect(prettyJson('{"b":2,"a":1}')).toEqual({
      ok: true,
      value: '{\n  "b": 2,\n  "a": 1\n}\n',
    });
  });

  it.each(['', ' \t\r\n '])('빈 JSON 문서 %j를 거부한다', (source) => {
    const result = parseJson(source);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.diagnostic.code).toBe('ValueExpected');
  });

  it('유한하지 않은 숫자의 위치와 범위를 표시한다', () => {
    const result = parseJson('1e999');
    expect(result).toEqual({
      ok: false,
      diagnostic: expect.objectContaining({
        code: 'NON_FINITE_NUMBER',
        startOffset: 0,
        endOffset: 5,
        line: 1,
        column: 1,
      }),
    });
  });

  it('브라우저 안전 깊이를 넘는 JSON을 blocking 진단으로 거부한다', () => {
    const result = parseJson(nestedJson(101));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.diagnostic.code).toBe('MAX_DEPTH_EXCEEDED');
  });

  it('직접 받은 DataNode에도 깊이와 출력 제한을 적용한다', () => {
    let deepNode: DataNode = { kind: 'null' };
    for (let depth = 0; depth < 101; depth += 1) deepNode = { kind: 'sequence', items: [deepNode] };
    const deepResult = stringifyJson(deepNode);
    expect(deepResult.ok).toBe(false);
    if (!deepResult.ok) expect(deepResult.diagnostic.code).toBe('MAX_DEPTH_EXCEEDED');

    const largeResult = stringifyJson({ kind: 'string', value: 'a'.repeat(OUTPUT_LIMIT_BYTES) });
    expect(largeResult.ok).toBe(false);
    if (!largeResult.ok) expect(largeResult.diagnostic.code).toBe('OUTPUT_TOO_LARGE');
  });

  it('출력 preflight가 증폭된 JSON을 문자열 구성 전에 거부한다', () => {
    const node = amplifiedNode(() => {
      throw new Error('serialize()가 출력 제한 판정보다 먼저 실행되었습니다.');
    });

    const preflight = preflightJsonOutput(node);
    expect(preflight.ok).toBe(false);
    if (!preflight.ok) expect(preflight.diagnostic.code).toBe('OUTPUT_TOO_LARGE');

    const result = stringifyJson(node);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.diagnostic.code).toBe('OUTPUT_TOO_LARGE');
  });

  it('Pretty preflight가 증폭된 JSON의 전체 출력 생성 전에 제한을 판정한다', () => {
    const source = `${'['.repeat(90)}${Array.from({ length: 12_000 }, () => '0').join(',')}${']'.repeat(90)}`;

    const preflight = preflightPrettyJsonOutput(source);

    expect(preflight.ok).toBe(false);
    if (!preflight.ok) expect(preflight.diagnostic.code).toBe('OUTPUT_TOO_LARGE');
    const result = prettyJson(source);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.diagnostic.code).toBe('OUTPUT_TOO_LARGE');
  });

  it('직렬화 preflight가 escape와 중첩 구조의 실제 UTF-8 출력 크기를 정확히 계산한다', () => {
    const node: DataNode = {
      kind: 'mapping',
      entries: [
        { key: '한글', value: { kind: 'string', value: '"\\\u0000😀' } },
        { key: 'items', value: { kind: 'sequence', items: [{ kind: 'boolean', value: true }] } },
      ],
    };
    const preflight = preflightJsonOutput(node);
    const output = stringifyJson(node);
    expect(preflight.ok).toBe(true);
    expect(output.ok).toBe(true);
    if (!preflight.ok || !output.ok) return;
    expect(preflight.value).toBe(new TextEncoder().encode(output.value).byteLength);
  });

  it('escape 후 같은 키가 되면 두 번째 키 token 위치를 표시한다', () => {
    const result = parseJson('{"a":1,"\\u0061":2}');
    expect(result).toEqual({
      ok: false,
      diagnostic: expect.objectContaining({
        code: 'DUPLICATE_KEY',
        startOffset: 7,
        endOffset: 15,
        line: 1,
        column: 8,
      }),
    });
  });

  it('따옴표, 역슬래시, 제어 문자와 유니코드 escape를 왕복한다', () => {
    const parsed = parseJson('{"text":"\\"\\\\\\b\\f\\n\\r\\t\\u0041"}');
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const serialized = stringifyJson(parsed.value);
    expect(serialized.ok).toBe(true);
    if (!serialized.ok) return;
    const reparsed = parseJson(serialized.value);
    expect(reparsed).toEqual(parsed);
  });

  it.each([
    ['null', 'null\n'],
    ['false', 'false\n'],
    ['"text"', '"text"\n'],
    ['3.5', '3.5\n'],
  ])('스칼라 루트 %s를 직렬화한다', (source, expected) => {
    const parsed = parseJson(source);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(stringifyJson(parsed.value)).toEqual({ ok: true, value: expected });
  });
});
