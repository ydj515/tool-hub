import { describe, expect, it } from 'vitest';
import { parseYaml, prettyYaml, stringifyYaml } from './yaml';

describe('YAML domain', () => {
  const aliases = (count: number) => Array.from({ length: count }, () => '  - *base').join('\n');

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
    ['root: &root\n  self: *root\n', 'CYCLIC_ALIAS'],
  ])('%s를 차단 오류로 처리한다', (source, code) => {
    const result = parseYaml(source);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.diagnostic.code).toBe(code);
  });

  it('문법 오류의 첫 진단 전체를 반환한다', () => {
    const result = parseYaml('service:\n  name: converter\n enabled: true\n');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.diagnostic).toEqual({
      format: 'yaml',
      code: 'BAD_INDENT',
      message: '이 위치의 들여쓰기가 올바르지 않습니다.',
      startOffset: 27,
      endOffset: 28,
      line: 3,
      column: 1,
    });
    expect(result.diagnostic.endOffset - result.diagnostic.startOffset).toBe(1);
  });

  it.each([
    ['value: !custom data\n', 7, 14, 1, 8],
    ['value: !<tag:example.com,2026:foo> data\n', 7, 34, 1, 8],
    ['%TAG !e! tag:example.com,2026:\n---\nvalue: !e!foo data\n', 42, 48, 3, 8],
    ['value: !!timestamp 2026-01-01\n', 7, 18, 1, 8],
    ['%TAG !e! tag:yaml.org,2002:\n---\nvalue: !e!timestamp 2026-01-01\n', 39, 51, 3, 8],
  ])('JSON 호환 기본 tag가 아닌 %s의 실제 tag token을 진단한다', (source, startOffset, endOffset, line, column) => {
    const result = parseYaml(source);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.diagnostic.code).toBe('TAG_RESOLVE_FAILED');
    expect(result.diagnostic.message).toBe('지원하지 않는 YAML tag입니다.');
    expect(result.diagnostic.startOffset).toBe(startOffset);
    expect(result.diagnostic.endOffset).toBe(endOffset);
    expect(result.diagnostic.endOffset - result.diagnostic.startOffset).toBe(endOffset - startOffset);
    expect(result.diagnostic.line).toBe(line);
    expect(result.diagnostic.column).toBe(column);
  });

  it.each([
    'value: !!str data\n',
    'value: !!int 1\n',
    'value: !!float 1.5\n',
    'value: !!bool true\n',
    'value: !!null null\n',
    'value: !!seq [1, 2]\n',
    'value: !!map { key: data }\n',
  ])('JSON 호환 기본 tag %s를 허용한다', (source) => {
    expect(parseYaml(source).ok).toBe(true);
  });

  it('여러 custom tag 중 첫 tag token 범위를 진단한다', () => {
    const result = parseYaml('first: !<tag:example.com,2026:foo> data\nsecond: !custom other\n');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.diagnostic.startOffset).toBe(7);
    expect(result.diagnostic.endOffset).toBe(34);
    expect(result.diagnostic.line).toBe(1);
    expect(result.diagnostic.column).toBe(8);
  });

  it('뒤쪽 문법 오류보다 앞쪽 custom tag를 먼저 진단한다', () => {
    const result = parseYaml('first: !custom data\nservice:\n  name: converter\n enabled: true\n');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.diagnostic.code).toBe('TAG_RESOLVE_FAILED');
    expect(result.diagnostic.startOffset).toBe(7);
  });

  it('앞쪽 문법 오류를 뒤쪽 custom tag보다 먼저 진단한다', () => {
    const result = parseYaml('service:\n  name: converter\n enabled: true\ncustom: !custom data\n');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.diagnostic.code).toBe('BAD_INDENT');
    expect(result.diagnostic.startOffset).toBe(27);
  });

  it('non-specific tag 단독 !를 문자열 의미로 허용한다', () => {
    expect(parseYaml('value: ! 123\n')).toEqual({
      ok: true,
      value: {
        kind: 'mapping',
        entries: [{ key: 'value', value: { kind: 'string', value: '123' } }],
      },
    });
  });

  it('YAML Pretty에서 주석과 anchor 표현을 제거한다', () => {
    const result = prettyYaml('# comment\nbase: &base { enabled: true }\ncopy: *base\n');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).not.toContain('# comment');
    expect(result.value).not.toContain('&base');
    expect(result.value).not.toContain('*base');
    expect(result.value).toContain('copy:\n  enabled: true');
  });

  it('alias 확장을 정확히 100회까지 허용한다', () => {
    const result = parseYaml(`base: &base { enabled: true }\nitems:\n${aliases(100)}\n`);
    expect(result.ok).toBe(true);
  });

  it('101회의 alias 확장을 거부한다', () => {
    const result = parseYaml(`base: &base { enabled: true }\nitems:\n${aliases(101)}\n`);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.diagnostic.code).toBe('ALIAS_LIMIT');
  });

  it('긴 문자열을 자동 줄바꿈하지 않는다', () => {
    const value = 'a'.repeat(160);
    const output = stringifyYaml({ kind: 'string', value });
    expect(output).toBe(`${value}\n`);
  });

  it('후행 개행이 있는 문자열의 의미를 보존하고 파일 끝에는 LF 하나만 둔다', () => {
    const node = { kind: 'string', value: 'a\n\n' } as const;
    const output = stringifyYaml(node);
    expect(output.endsWith('\n')).toBe(true);
    expect(output.endsWith('\n\n')).toBe(false);
    expect(parseYaml(output)).toEqual({ ok: true, value: node });
  });

  it.each(['value: .nan\n', 'value: .inf\n', 'value: -.inf\n'])('비유한 숫자 %s를 거부한다', (source) => {
    const result = parseYaml(source);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.diagnostic.code).toBe('NON_FINITE_NUMBER');
  });
});
