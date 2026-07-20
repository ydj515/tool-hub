import { describe, expect, it } from 'vitest';
import { parseYaml, prettyYaml, stringifyYaml } from './yaml';

describe('YAML domain', () => {
  it.each(['null\n', 'true\n', 'text\n', '3\n', '- 1\n- 2\n'])('루트 값 %s를 허용한다', (source) => {
    expect(parseYaml(source).ok).toBe(true);
  });

  it('문서 시작 표식이 있는 단일 문서를 허용한다', () => {
    expect(parseYaml('---\nvalue: true\n').ok).toBe(true);
  });

  it('객체, 배열, 스칼라 루트와 mapping 순서를 보존한다', () => {
    const parsed = parseYaml('"10": ten\n"2": two\nvalue:\n  - true\n  - null\n');
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(stringifyYaml(parsed.value)).toBe('"10": ten\n"2": two\nvalue:\n  - true\n  - null\n');
  });

  it('anchor와 alias를 실제 값으로 확장한다', () => {
    const parsed = parseYaml('base: &base\n  enabled: true\ncopy: *base\n');
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(stringifyYaml(parsed.value)).toContain('copy:\n  enabled: true');
  });

  it.each([
    ['---\na: 1\n---\nb: 2\n', 'MULTIPLE_DOCS'],
    ['? [a, b]\n: value\n', 'NON_STRING_KEY'],
    ['a: 1\na: 2\n', 'DUPLICATE_KEY'],
    ['value: !custom data\n', 'TAG_RESOLVE_FAILED'],
    ['root: &root\n  self: *root\n', 'CYCLIC_ALIAS'],
  ])('%s를 차단 오류로 처리한다', (source, code) => {
    const result = parseYaml(source);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.diagnostic.code).toBe(code);
  });

  it('잘못된 들여쓰기의 첫 행과 열을 반환한다', () => {
    const result = parseYaml('service:\n  name: converter\n enabled: true\n');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.diagnostic.line).toBe(3);
  });

  it('YAML Pretty에서 주석과 anchor 표현을 제거한다', () => {
    const result = prettyYaml('# comment\nbase: &base { enabled: true }\ncopy: *base\n');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).not.toContain('# comment');
    expect(result.value).not.toContain('&base');
    expect(result.value).toContain('copy:\n  enabled: true');
  });

  it('100회를 초과하는 alias 확장을 거부한다', () => {
    const aliases = Array.from({ length: 101 }, () => '  - *base').join('\n');
    const result = parseYaml(`base: &base { enabled: true }\nitems:\n${aliases}\n`);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.diagnostic.code).toBe('ALIAS_LIMIT');
  });

  it.each(['value: .nan\n', 'value: .inf\n', 'value: -.inf\n'])('비유한 숫자 %s를 거부한다', (source) => {
    const result = parseYaml(source);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.diagnostic.code).toBe('NON_FINITE_NUMBER');
  });
});
