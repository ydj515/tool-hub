import type { DataNode, OperationResult } from './data-node';
import { MAX_NESTING_DEPTH, OutputByteBudget, safetyDiagnostic } from './safety';

const INDENT = '  ';
const QUOTED_CHUNK_CODE_UNITS = 8 * 1024;

type WriteFailure = 'MAX_DEPTH_EXCEEDED' | 'OUTPUT_TOO_LARGE' | 'NON_FINITE_NUMBER' | 'CYCLIC_DATA' | 'DUPLICATE_KEY';

function isAsciiEqualIgnoreCase(value: string, expected: string): boolean {
  if (value.length !== expected.length) return false;
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    const folded = code >= 0x41 && code <= 0x5a ? code + 0x20 : code;
    if (folded !== expected.charCodeAt(index)) return false;
  }
  return true;
}

function isPlainString(value: string): boolean {
  if (value.length === 0 || value.charCodeAt(0) === 0x20 || value.charCodeAt(value.length - 1) === 0x20) return false;
  const first = value.charCodeAt(0);
  // 숫자·문서 표식·indicator로 시작하는 값은 schema나 문맥을 추론하지 않고 항상 quote한다.
  if ((first >= 0x30 && first <= 0x39) || '.-+?!,:[]{}#&*|>\'"%@`~'.includes(value[0])) return false;
  if (isAsciiEqualIgnoreCase(value, 'null')
    || isAsciiEqualIgnoreCase(value, 'true')
    || isAsciiEqualIgnoreCase(value, 'false')) return false;

  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code < 0x20 || (code >= 0x7f && code <= 0x9f) || code === 0x2028 || code === 0x2029 || code === 0xfeff) return false;
    if (':#[],{}&*!|>\'"%@`?'.includes(value[index])) return false;
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) return false;
      index += 1;
    } else if (code >= 0xdc00 && code <= 0xdfff) return false;
  }
  return true;
}

function unicodeEscape(code: number): string {
  return `\\u${code.toString(16).padStart(4, '0')}`;
}

function quotedEscape(value: string, index: number): { text: string; width: number } | undefined {
  const code = value.charCodeAt(index);
  switch (code) {
    case 0x08:
      return { text: '\\b', width: 1 };
    case 0x09:
      return { text: '\\t', width: 1 };
    case 0x0a:
      return { text: '\\n', width: 1 };
    case 0x0c:
      return { text: '\\f', width: 1 };
    case 0x0d:
      return { text: '\\r', width: 1 };
    case 0x22:
      return { text: '\\"', width: 1 };
    case 0x5c:
      return { text: '\\\\', width: 1 };
  }
  if (code <= 0x1f || (code >= 0x7f && code <= 0x9f) || code === 0x2028 || code === 0x2029 || code === 0xfeff) {
    return { text: unicodeEscape(code), width: 1 };
  }
  if (code >= 0xd800 && code <= 0xdbff) {
    const next = value.charCodeAt(index + 1);
    return next >= 0xdc00 && next <= 0xdfff ? undefined : { text: unicodeEscape(code), width: 1 };
  }
  if (code >= 0xdc00 && code <= 0xdfff) return { text: unicodeEscape(code), width: 1 };
  return undefined;
}

function canUseImplicitKey(value: string): boolean {
  const plain = isPlainString(value);
  let sourceCharacters = plain ? 0 : 2;
  for (let index = 0; index < value.length; index += 1) {
    const escape = plain ? undefined : quotedEscape(value, index);
    if (escape) {
      sourceCharacters += escape.text.length;
      index += escape.width - 1;
    } else {
      sourceCharacters += 1;
      const code = value.charCodeAt(index);
      if (code >= 0xd800 && code <= 0xdbff) index += 1;
    }
    if (sourceCharacters > 1_024) return false;
  }
  return true;
}

function failureMessage(code: WriteFailure): string {
  switch (code) {
    case 'MAX_DEPTH_EXCEEDED':
      return `중첩 깊이는 ${MAX_NESTING_DEPTH}단계까지 지원합니다.`;
    case 'OUTPUT_TOO_LARGE':
      return '생성 결과가 2MB 제한을 초과했습니다.';
    case 'NON_FINITE_NUMBER':
      return '유한한 숫자만 사용할 수 있습니다.';
    case 'CYCLIC_DATA':
      return '순환 데이터는 직렬화할 수 없습니다.';
    case 'DUPLICATE_KEY':
      return '같은 mapping 키를 두 번 사용할 수 없습니다.';
  }
}

class BoundedYamlWriter {
  private readonly budget = new OutputByteBudget();
  private readonly chunks: string[] = [];
  private readonly active = new WeakSet<object>();
  private pending: string[] = [];
  private pendingUnits = 0;
  private failure: WriteFailure | undefined;

  write(node: DataNode): OperationResult<string> {
    const written = this.isNonEmptyCollection(node)
      ? this.writeCollection(node, 0, 1)
      : this.writeInline(node, 1) && this.append('\n');
    if (!written || this.failure) {
      const code = this.failure ?? 'OUTPUT_TOO_LARGE';
      return { ok: false, diagnostic: safetyDiagnostic('yaml', code, failureMessage(code)) };
    }
    this.flushPending();
    return { ok: true, value: this.chunks.join('') };
  }

  private fail(code: WriteFailure): false {
    this.failure ??= code;
    return false;
  }

  private append(value: string): boolean {
    if (!this.budget.addUtf8(value)) return this.fail('OUTPUT_TOO_LARGE');
    if (value.length >= QUOTED_CHUNK_CODE_UNITS) {
      this.flushPending();
      this.chunks.push(value);
    } else {
      this.pending.push(value);
      this.pendingUnits += value.length;
      if (this.pendingUnits >= QUOTED_CHUNK_CODE_UNITS) this.flushPending();
    }
    return true;
  }

  private flushPending(): void {
    if (this.pendingUnits === 0) return;
    this.chunks.push(this.pending.join(''));
    this.pending = [];
    this.pendingUnits = 0;
  }

  private appendIndent(level: number): boolean {
    return level === 0 || this.append(INDENT.repeat(level));
  }

  private isNonEmptyCollection(node: DataNode): node is Extract<DataNode, { kind: 'sequence' | 'mapping' }> {
    return (node.kind === 'sequence' && node.items.length > 0)
      || (node.kind === 'mapping' && node.entries.length > 0);
  }

  private writeQuoted(value: string): boolean {
    let buffered: string[] = ['"'];
    let bufferedUnits = 1;
    const flush = () => {
      if (bufferedUnits === 0) return true;
      const chunk = buffered.join('');
      buffered = [];
      bufferedUnits = 0;
      return this.append(chunk);
    };
    const add = (piece: string) => {
      buffered.push(piece);
      bufferedUnits += piece.length;
      return bufferedUnits < QUOTED_CHUNK_CODE_UNITS || flush();
    };
    const addRange = (start: number, end: number) => {
      let offset = start;
      while (offset < end) {
        let chunkEnd = Math.min(end, offset + QUOTED_CHUNK_CODE_UNITS);
        const last = value.charCodeAt(chunkEnd - 1);
        const next = value.charCodeAt(chunkEnd);
        if (chunkEnd < end && last >= 0xd800 && last <= 0xdbff && next >= 0xdc00 && next <= 0xdfff) chunkEnd += 1;
        if (!add(value.slice(offset, chunkEnd))) return false;
        offset = chunkEnd;
      }
      return true;
    };

    let runStart = 0;
    for (let index = 0; index < value.length; index += 1) {
      const escape = quotedEscape(value, index);
      if (escape) {
        if (!addRange(runStart, index) || !add(escape.text)) return false;
        index += escape.width - 1;
        runStart = index + 1;
      } else if (value.charCodeAt(index) >= 0xd800 && value.charCodeAt(index) <= 0xdbff) {
        index += 1;
      }
    }
    return addRange(runStart, value.length) && add('"') && flush();
  }

  private writeString(value: string): boolean {
    return isPlainString(value) ? this.append(value) : this.writeQuoted(value);
  }

  private writeInline(node: DataNode, depth: number): boolean {
    switch (node.kind) {
      case 'null':
        return this.append('null');
      case 'boolean':
        return this.append(node.value ? 'true' : 'false');
      case 'number':
        if (!Number.isFinite(node.value)) return this.fail('NON_FINITE_NUMBER');
        return this.append(Object.is(node.value, -0) ? '-0' : String(node.value));
      case 'string':
        return this.writeString(node.value);
      case 'sequence':
        if (depth > MAX_NESTING_DEPTH) return this.fail('MAX_DEPTH_EXCEEDED');
        return node.items.length === 0 ? this.append('[]') : this.fail('OUTPUT_TOO_LARGE');
      case 'mapping':
        if (depth > MAX_NESTING_DEPTH) return this.fail('MAX_DEPTH_EXCEEDED');
        return node.entries.length === 0 ? this.append('{}') : this.fail('OUTPUT_TOO_LARGE');
    }
  }

  private writeCollection(
    node: Extract<DataNode, { kind: 'sequence' | 'mapping' }>,
    indent: number,
    depth: number,
  ): boolean {
    if (depth > MAX_NESTING_DEPTH) return this.fail('MAX_DEPTH_EXCEEDED');
    if (this.active.has(node)) return this.fail('CYCLIC_DATA');
    this.active.add(node);
    try {
      if (node.kind === 'sequence') {
        for (let index = 0; index < node.items.length; index += 1) {
          const item = node.items[index];
          if (!this.appendIndent(indent)) return false;
          if (this.isNonEmptyCollection(item)) {
            if (!this.append('-\n') || !this.writeCollection(item, indent + 1, depth + 1)) return false;
          } else if (!this.append('- ') || !this.writeInline(item, depth + 1) || !this.append('\n')) return false;
        }
        return true;
      }

      const keys = new Set<string>();
      for (let index = 0; index < node.entries.length; index += 1) {
        const entry = node.entries[index];
        if (keys.has(entry.key)) return this.fail('DUPLICATE_KEY');
        keys.add(entry.key);
        const implicitKey = canUseImplicitKey(entry.key);
        if (!this.appendIndent(indent)) return false;
        if (!implicitKey && !this.append('? ')) return false;
        if (!this.writeString(entry.key) || (!implicitKey && (!this.append('\n') || !this.appendIndent(indent)))) return false;
        if (this.isNonEmptyCollection(entry.value)) {
          if (!this.append(':\n') || !this.writeCollection(entry.value, indent + 1, depth + 1)) return false;
        } else if (!this.append(': ') || !this.writeInline(entry.value, depth + 1) || !this.append('\n')) return false;
      }
      return true;
    } finally {
      this.active.delete(node);
    }
  }
}

export function writeYaml(node: DataNode): OperationResult<string> {
  return new BoundedYamlWriter().write(node);
}
