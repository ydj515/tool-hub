import { describe, expect, it } from 'vitest';
import type { DataNode } from './data-node';
import { parseYaml, prettyYaml, stringifyYaml } from './yaml';
import { OUTPUT_LIMIT_BYTES } from './safety';

const nestedYaml = (depth: number) => '['.repeat(depth) + '0' + ']'.repeat(depth);

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
    expect(stringifyYaml(parsed.value)).toEqual({
      ok: true,
      value: '"10": ten\n"2": two\nvalue:\n  - true\n  - null\n',
    });
  });

  it('anchor와 alias를 실제 값으로 확장한다', () => {
    const parsed = parseYaml('base: &base\n  enabled: true\ncopy: *base\n');
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const output = stringifyYaml(parsed.value);
    expect(output.ok).toBe(true);
    if (!output.ok) return;
    expect(output.value).toContain('copy:\n  enabled: true');
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

  it('bare !와 같은 AST 표현으로 이어질 수 있는 lexical custom tag !<!>를 거부한다', () => {
    const result = parseYaml('value: !<!> 123\n');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.diagnostic).toEqual({
      format: 'yaml',
      code: 'TAG_RESOLVE_FAILED',
      message: '지원하지 않는 YAML tag입니다.',
      startOffset: 7,
      endOffset: 11,
      line: 1,
      column: 8,
    });
  });

  it.each([
    ['!custom data\n', 0, 7],
    ['!custom\nkey: value\n', 0, 7],
    ['!custom { key: value }\n', 0, 7],
    ['!custom\n- one\n', 0, 7],
    ['!custom [one, two]\n', 0, 7],
    ['? !custom key\n: value\n', 2, 9],
  ])('CST 부착 경로에서 %s의 tag token을 진단한다', (source, startOffset, endOffset) => {
    const result = parseYaml(source);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.diagnostic.code).toBe('TAG_RESOLVE_FAILED');
    expect(result.diagnostic.startOffset).toBe(startOffset);
    expect(result.diagnostic.endOffset).toBe(endOffset);
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
    expect(output).toEqual({ ok: true, value: `${value}\n` });
  });

  it('후행 개행이 있는 문자열의 의미를 보존하고 파일 끝에는 LF 하나만 둔다', () => {
    const node = { kind: 'string', value: 'a\n\n' } as const;
    const output = stringifyYaml(node);
    expect(output.ok).toBe(true);
    if (!output.ok) return;
    expect(output.value.endsWith('\n')).toBe(true);
    expect(output.value.endsWith('\n\n')).toBe(false);
    expect(parseYaml(output.value)).toEqual({ ok: true, value: node });
  });

  it.each(['value: .nan\n', 'value: .inf\n', 'value: -.inf\n'])('비유한 숫자 %s를 거부한다', (source) => {
    const result = parseYaml(source);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.diagnostic.code).toBe('NON_FINITE_NUMBER');
  });

  it('첫 줄이 아닌 비유한 scalar의 실제 범위를 진단한다', () => {
    const result = parseYaml('header: ok\nvalue: .inf\n');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.diagnostic).toMatchObject({
      code: 'NON_FINITE_NUMBER',
      startOffset: 18,
      endOffset: 22,
      line: 2,
      column: 8,
    });
  });

  it('순환을 닫는 alias token의 실제 범위를 진단한다', () => {
    const result = parseYaml('header: ok\nroot: &root\n  self: *root\n');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.diagnostic).toMatchObject({
      code: 'CYCLIC_ALIAS',
      startOffset: 31,
      endOffset: 36,
      line: 3,
      column: 9,
    });
  });

  it('얕은 anchor와 alias 조합이 정규화 깊이 제한을 우회하지 못한다', () => {
    const wrapped = (value: string, depth: number) => '['.repeat(depth) + value + ']'.repeat(depth);
    const source = [
      `base: &base ${wrapped('0', 60)}`,
      `combined: &combined ${wrapped('*base', 60)}`,
      'result: *combined',
      '',
    ].join('\n');

    const result = parseYaml(source);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.diagnostic.code).toBe('MAX_DEPTH_EXCEEDED');
  });

  it('브라우저 안전 깊이를 넘는 YAML을 blocking 진단으로 거부한다', () => {
    const result = parseYaml(nestedYaml(101));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.diagnostic.code).toBe('MAX_DEPTH_EXCEEDED');
  });

  it('직접 받은 DataNode에도 깊이와 출력 제한을 적용한다', () => {
    let deepNode: DataNode = { kind: 'null' };
    for (let depth = 0; depth < 101; depth += 1) deepNode = { kind: 'sequence', items: [deepNode] };
    const deepResult = stringifyYaml(deepNode);
    expect(deepResult.ok).toBe(false);
    if (!deepResult.ok) expect(deepResult.diagnostic.code).toBe('MAX_DEPTH_EXCEEDED');

    let deepEmptyCollection: DataNode = { kind: 'sequence', items: [] };
    for (let depth = 0; depth < 100; depth += 1) {
      deepEmptyCollection = { kind: 'sequence', items: [deepEmptyCollection] };
    }
    const deepEmptyResult = stringifyYaml(deepEmptyCollection);
    expect(deepEmptyResult.ok).toBe(false);
    if (!deepEmptyResult.ok) expect(deepEmptyResult.diagnostic.code).toBe('MAX_DEPTH_EXCEEDED');

    const largeResult = stringifyYaml({ kind: 'string', value: 'a'.repeat(OUTPUT_LIMIT_BYTES) });
    expect(largeResult.ok).toBe(false);
    if (!largeResult.ok) expect(largeResult.diagnostic.code).toBe('OUTPUT_TOO_LARGE');

    const nonFiniteResult = stringifyYaml({ kind: 'number', value: Number.POSITIVE_INFINITY });
    expect(nonFiniteResult.ok).toBe(false);
    if (!nonFiniteResult.ok) expect(nonFiniteResult.diagnostic.code).toBe('NON_FINITE_NUMBER');

    const cyclicNode: DataNode = { kind: 'sequence', items: [] };
    cyclicNode.items.push(cyclicNode);
    const cyclicResult = stringifyYaml(cyclicNode);
    expect(cyclicResult.ok).toBe(false);
    if (!cyclicResult.ok) expect(cyclicResult.diagnostic.code).toBe('CYCLIC_DATA');
  });

  it('실제 출력이 제한보다 작은 다수의 빈 문자열을 false reject하지 않는다', () => {
    const count = 120_000;
    const node: DataNode = {
      kind: 'sequence',
      items: Array.from({ length: count }, () => ({ kind: 'string', value: '' })),
    };

    const result = stringifyYaml(node);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(new TextEncoder().encode(result.value).byteLength).toBe(count * 5);
  });

  it('실제 출력이 제한을 넘는 다수의 빈 문자열은 full YAML 구성 전에 거부한다', () => {
    const count = Math.floor(OUTPUT_LIMIT_BYTES / 5) + 1;
    const items = Array.from({ length: count }, (): DataNode => ({ kind: 'string', value: '' }));

    const result = stringifyYaml({ kind: 'sequence', items });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.diagnostic.code).toBe('OUTPUT_TOO_LARGE');
  });

  it('YAML Pretty가 제한보다 작은 다수의 짧은 scalar를 보존한다', () => {
    const source = '- ""\n'.repeat(120_000);

    const result = prettyYaml(source);

    expect(result.ok).toBe(true);
    if (!result.ok) expect(result.diagnostic.code).not.toBe('OUTPUT_TOO_LARGE');
  });

  it('깊게 중첩된 long multiline scalar의 실제 작은 출력을 허용한다', () => {
    let node: DataNode = { kind: 'string', value: '\n'.repeat(12_000) };
    for (let depth = 0; depth < 90; depth += 1) node = { kind: 'sequence', items: [node] };

    const result = stringifyYaml(node);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const actualBytes = new TextEncoder().encode(result.value).byteLength;
    expect(actualBytes).toBeLessThan(36 * 1024);
  });

  it('plain scalar의 정확한 2MB 출력을 허용하고 다음 1바이트는 거부한다', () => {
    const exactNode: DataNode = { kind: 'string', value: 'a'.repeat(OUTPUT_LIMIT_BYTES - 1) };
    const exact = stringifyYaml(exactNode);
    expect(exact.ok).toBe(true);
    if (exact.ok) expect(new TextEncoder().encode(exact.value).byteLength).toBe(OUTPUT_LIMIT_BYTES);

    const oversizedNode: DataNode = { kind: 'string', value: 'a'.repeat(OUTPUT_LIMIT_BYTES) };
    const oversized = stringifyYaml(oversizedNode);
    expect(oversized.ok).toBe(false);
    if (!oversized.ok) expect(oversized.diagnostic.code).toBe('OUTPUT_TOO_LARGE');
  });

  it('LF escape가 있는 quoted scalar를 정확히 2MB까지 쓰고 다음 1바이트는 거부한다', () => {
    const lineFeeds = (OUTPUT_LIMIT_BYTES - 4) / 2;
    const exact = stringifyYaml({ kind: 'string', value: `x${'\n'.repeat(lineFeeds)}` });
    expect(exact.ok).toBe(true);
    if (exact.ok) expect(new TextEncoder().encode(exact.value).byteLength).toBe(OUTPUT_LIMIT_BYTES);

    const oversized = stringifyYaml({ kind: 'string', value: `xx${'\n'.repeat(lineFeeds)}` });
    expect(oversized.ok).toBe(false);
    if (!oversized.ok) expect(oversized.diagnostic.code).toBe('OUTPUT_TOO_LARGE');
  });

  it('quoted Unicode surrogate pair가 writer chunk 경계에 있어도 정확한 UTF-8 바이트를 센다', () => {
    const prefix = `.${'a'.repeat(8_190)}😀`;
    const exactValue = `${prefix}${'b'.repeat(OUTPUT_LIMIT_BYTES - 8_198)}`;

    const exact = stringifyYaml({ kind: 'string', value: exactValue });

    expect(exact.ok).toBe(true);
    if (!exact.ok) return;
    expect(new TextEncoder().encode(exact.value).byteLength).toBe(OUTPUT_LIMIT_BYTES);
    expect(parseYaml(exact.value)).toEqual({ ok: true, value: { kind: 'string', value: exactValue } });
  });

  it('signed hex long scalar의 deterministic quoted 출력을 정확히 2MB까지 쓴다', () => {
    const exactNode: DataNode = {
      kind: 'string',
      value: `+0x${'a'.repeat(OUTPUT_LIMIT_BYTES - 6)}`,
    };
    const exact = stringifyYaml(exactNode);
    expect(exact.ok).toBe(true);
    if (exact.ok) expect(new TextEncoder().encode(exact.value).byteLength).toBe(OUTPUT_LIMIT_BYTES);

    const oversized = stringifyYaml({
      kind: 'string',
      value: `+0x${'a'.repeat(OUTPUT_LIMIT_BYTES - 5)}`,
    });
    expect(oversized.ok).toBe(false);
    if (!oversized.ok) expect(oversized.diagnostic.code).toBe('OUTPUT_TOO_LARGE');
  });

  it('space-before-LF scalar의 실제 escape 크기로 aggregate 초과를 조기 거부한다', () => {
    const value = ' \n'.repeat(1_000);
    const scalar = stringifyYaml({ kind: 'string', value });
    expect(scalar.ok).toBe(true);
    if (!scalar.ok) return;
    const scalarBytes = new TextEncoder().encode(scalar.value).byteLength;
    expect(scalarBytes).toBeGreaterThan(value.length);
    expect(scalarBytes * 1_000).toBeGreaterThan(OUTPUT_LIMIT_BYTES);

    const items = Array.from({ length: 1_000 }, (): DataNode => ({ kind: 'string', value }));
    const aggregate = stringifyYaml({ kind: 'sequence', items });
    expect(aggregate.ok).toBe(false);
    if (!aggregate.ok) expect(aggregate.diagnostic.code).toBe('OUTPUT_TOO_LARGE');
  });

  it('일반 mapping과 중첩 sequence를 예측 가능한 block 형식으로 출력한다', () => {
    const node: DataNode = {
      kind: 'mapping',
      entries: [
        { key: 'name', value: { kind: 'string', value: 'tool-hub' } },
        { key: 'enabled', value: { kind: 'boolean', value: true } },
        {
          key: 'items',
          value: {
            kind: 'sequence',
            items: [
              { kind: 'sequence', items: [{ kind: 'string', value: 'one' }] },
              { kind: 'mapping', entries: [{ key: 'label', value: { kind: 'string', value: 'two' } }] },
            ],
          },
        },
      ],
    };

    expect(stringifyYaml(node)).toEqual({
      ok: true,
      value: [
        'name: tool-hub',
        'enabled: true',
        'items:',
        '  -',
        '    - one',
        '  -',
        '    label: two',
        '',
      ].join('\n'),
    });
  });

  it('직접 받은 mapping의 duplicate key를 거부하고 distinct key 순서는 보존한다', () => {
    const duplicate = stringifyYaml({
      kind: 'mapping',
      entries: [
        { key: 'same', value: { kind: 'number', value: 1 } },
        { key: 'same', value: { kind: 'number', value: 2 } },
      ],
    });
    expect(duplicate.ok).toBe(false);
    if (!duplicate.ok) expect(duplicate.diagnostic.code).toBe('DUPLICATE_KEY');

    expect(stringifyYaml({
      kind: 'mapping',
      entries: [
        { key: 'first', value: { kind: 'number', value: 1 } },
        { key: 'second', value: { kind: 'number', value: 2 } },
      ],
    })).toEqual({ ok: true, value: 'first: 1\nsecond: 2\n' });
  });

  it.each([
    ['signed hex', '+0xaff', '"+0xaff"\n'],
    ['signed octal', '-0o77', '"-0o77"\n'],
    ['nan-like', '.NaN', '".NaN"\n'],
    ['multiline', 'line1\nline2', '"line1\\nline2"\n'],
    ['space-before-LF', ' \n', '" \\n"\n'],
    ['NUL control', '\0', '"\\u0000"\n'],
    ['hex control', '\u001f', '"\\u001f"\n'],
    ['invalid surrogate', '\ud800', '"\\ud800"\n'],
    ['unicode', '한글😀', '한글😀\n'],
  ])('%s 문자열에 deterministic scalar policy를 적용하고 같은 값으로 reparse한다', (_label, value, expected) => {
    const output = stringifyYaml({ kind: 'string', value });

    expect(output).toEqual({ ok: true, value: expected });
    expect(parseYaml(expected)).toEqual({ ok: true, value: { kind: 'string', value } });
  });

  it('1,024자 key는 implicit로, 1,025자 key는 explicit로 출력하고 둘 다 reparse한다', () => {
    const implicitNode: DataNode = {
      kind: 'mapping',
      entries: [{ key: 'k'.repeat(1_024), value: { kind: 'null' } }],
    };
    const implicit = stringifyYaml(implicitNode);
    expect(implicit).toEqual({ ok: true, value: `${'k'.repeat(1_024)}: null\n` });
    if (implicit.ok) expect(parseYaml(implicit.value)).toEqual({ ok: true, value: implicitNode });

    const explicitNode: DataNode = {
      kind: 'mapping',
      entries: [{
        key: 'outer',
        value: {
          kind: 'mapping',
          entries: [{
            key: 'k'.repeat(1_025),
            value: { kind: 'sequence', items: [{ kind: 'boolean', value: true }] },
          }],
        },
      }],
    };
    const explicit = stringifyYaml(explicitNode);
    expect(explicit.ok).toBe(true);
    if (!explicit.ok) return;
    expect(parseYaml(explicit.value)).toEqual({ ok: true, value: explicitNode });
    expect(explicit).toEqual({
      ok: true,
      value: `outer:\n  ? ${'k'.repeat(1_025)}\n  :\n    - true\n`,
    });
  });

  it('UTF-16 1,024단위 emoji key는 implicit로, 1,026단위 key는 explicit로 출력한다', () => {
    const implicitKey = '😀'.repeat(512);
    const implicitNode: DataNode = {
      kind: 'mapping',
      entries: [{ key: implicitKey, value: { kind: 'null' } }],
    };
    const implicit = stringifyYaml(implicitNode);
    expect(implicit).toEqual({ ok: true, value: `${implicitKey}: null\n` });
    if (implicit.ok) expect(parseYaml(implicit.value)).toEqual({ ok: true, value: implicitNode });

    const explicitKey = '😀'.repeat(513);
    const invalidImplicit = parseYaml(`${explicitKey}: null\n`);
    expect(invalidImplicit.ok).toBe(false);
    if (!invalidImplicit.ok) {
      expect(invalidImplicit.diagnostic).toMatchObject({
        code: 'KEY_OVER_1024_CHARS',
        startOffset: 0,
        endOffset: 1_026,
      });
    }

    const explicitNode: DataNode = {
      kind: 'mapping',
      entries: [{ key: explicitKey, value: { kind: 'string', value: 'value' } }],
    };
    const explicit = stringifyYaml(explicitNode);
    expect(explicit.ok).toBe(true);
    if (!explicit.ok) return;
    expect(parseYaml(explicit.value)).toEqual({ ok: true, value: explicitNode });
    expect(explicit.value).toBe(`? ${explicitKey}\n: value\n`);
  });

  it('600-LF quoted key를 explicit key로 출력하고 원래 값으로 reparse한다', () => {
    const node: DataNode = {
      kind: 'mapping',
      entries: [{ key: '\n'.repeat(600), value: { kind: 'string', value: 'value' } }],
    };

    const output = stringifyYaml(node);

    expect(output.ok).toBe(true);
    if (!output.ok) return;
    expect(parseYaml(output.value)).toEqual({ ok: true, value: node });
    expect(output).toEqual({
      ok: true,
      value: `? "${'\\n'.repeat(600)}"\n: value\n`,
    });
  });

  it('explicit long key를 정확히 2MB까지 쓰고 초과 뒤의 Proxy entry는 읽지 않는다', () => {
    const exactKey = 'k'.repeat(OUTPUT_LIMIT_BYTES - 10);
    const exact = stringifyYaml({
      kind: 'mapping',
      entries: [{ key: exactKey, value: { kind: 'null' } }],
    });
    expect(exact.ok).toBe(true);
    if (exact.ok) expect(new TextEncoder().encode(exact.value).byteLength).toBe(OUTPUT_LIMIT_BYTES);

    const entries = new Proxy(
      [
        { key: `${exactKey}k`, value: { kind: 'null' } },
        { key: 'unread', value: { kind: 'null' } },
      ] satisfies Array<{ key: string; value: DataNode }>,
      {
        get(target, property, receiver) {
          if (property === '1') throw new Error('출력 제한 뒤의 entry를 조회했습니다.');
          return Reflect.get(target, property, receiver) as unknown;
        },
      },
    );
    const oversized = stringifyYaml({
      kind: 'mapping',
      entries,
    });
    expect(oversized.ok).toBe(false);
    if (!oversized.ok) expect(oversized.diagnostic.code).toBe('OUTPUT_TOO_LARGE');
  });

  it('nested --- value의 deterministic quoted 출력을 정확히 2MB까지 허용한다', () => {
    const exactValue = `---${'.'.repeat(OUTPUT_LIMIT_BYTES - 22)}`;
    const nested = (value: string): DataNode => ({
      kind: 'mapping',
      entries: [{
        key: 'outer',
        value: {
          kind: 'mapping',
          entries: [{ key: 'value', value: { kind: 'string', value } }],
        },
      }],
    });

    const exact = stringifyYaml(nested(exactValue));
    expect(exact.ok).toBe(true);
    if (exact.ok) expect(new TextEncoder().encode(exact.value).byteLength).toBe(OUTPUT_LIMIT_BYTES);

    const oversized = stringifyYaml(nested(`${exactValue}.`));
    expect(oversized.ok).toBe(false);
    if (!oversized.ok) expect(oversized.diagnostic.code).toBe('OUTPUT_TOO_LARGE');
  });

  it('깊은 sequence도 compact layout 없이 정확한 2MB 경계에서 중단한다', () => {
    const depth = 90;
    const blockOverhead = depth * (depth - 1) + 2 * depth + 1;
    const nested = (value: string) => {
      let node: DataNode = { kind: 'string', value };
      for (let index = 0; index < depth; index += 1) node = { kind: 'sequence', items: [node] };
      return node;
    };

    const exact = stringifyYaml(nested('a'.repeat(OUTPUT_LIMIT_BYTES - blockOverhead)));
    expect(exact.ok).toBe(true);
    if (exact.ok) expect(new TextEncoder().encode(exact.value).byteLength).toBe(OUTPUT_LIMIT_BYTES);

    const oversized = stringifyYaml(nested('a'.repeat(OUTPUT_LIMIT_BYTES - blockOverhead + 1)));
    expect(oversized.ok).toBe(false);
    if (!oversized.ok) expect(oversized.diagnostic.code).toBe('OUTPUT_TOO_LARGE');
  });

  it('출력 제한을 넘긴 뒤에는 collection의 다음 항목을 조회하지 않는다', () => {
    const items = new Proxy(
      [
        { kind: 'string', value: 'a'.repeat(OUTPUT_LIMIT_BYTES) },
        { kind: 'null' },
      ] satisfies DataNode[],
      {
        get(target, property, receiver) {
          if (property === '1') throw new Error('출력 제한 뒤의 항목을 조회했습니다.');
          return Reflect.get(target, property, receiver) as unknown;
        },
      },
    );

    const result = stringifyYaml({ kind: 'sequence', items });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.diagnostic.code).toBe('OUTPUT_TOO_LARGE');
  });
});
