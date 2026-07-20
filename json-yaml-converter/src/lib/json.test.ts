import { describe, expect, it } from 'vitest';
import { parseJson, prettyJson, stringifyJson } from './json';

describe('JSON domain', () => {
  it.each(['null', 'true', '"text"', '3', '[1,2]'])('루트 값 %s를 허용한다', (source) => {
    expect(parseJson(source).ok).toBe(true);
  });

  it('객체, 배열, 스칼라와 키 순서를 보존한다', () => {
    const parsed = parseJson('{"10":"ten","2":"two","value":[true,null,3]}');
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(stringifyJson(parsed.value)).toBe(
      '{\n  "10": "ten",\n  "2": "two",\n  "value": [\n    true,\n    null,\n    3\n  ]\n}\n',
    );
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
    const reparsed = parseJson(serialized);
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
    expect(stringifyJson(parsed.value)).toBe(expected);
  });
});
