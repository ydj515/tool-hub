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
});
