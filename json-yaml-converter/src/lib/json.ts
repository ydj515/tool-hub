import { applyEdits, format, parseTree, printParseErrorCode, type Node, type ParseError } from 'jsonc-parser';
import type { DataNode, OperationResult } from './data-node';
import { diagnosticAt } from './diagnostics';
import { MAX_NESTING_DEPTH, outputWithinLimit, safetyDiagnostic, validateDataNode } from './safety';

const JSON_OPTIONS = {
  disallowComments: true,
  allowTrailingComma: false,
  allowEmptyContent: false,
} as const;

const JSON_MESSAGES: Record<string, string> = {
  InvalidSymbol: '사용할 수 없는 문자가 있습니다.',
  InvalidNumberFormat: '숫자 형식이 올바르지 않습니다.',
  PropertyNameExpected: '속성 이름이 필요합니다.',
  ValueExpected: '값이 필요합니다.',
  ColonExpected: '속성 이름 뒤에 콜론이 필요합니다.',
  CommaExpected: '항목 사이에 쉼표가 필요합니다.',
  CloseBraceExpected: '닫는 중괄호가 필요합니다.',
  CloseBracketExpected: '닫는 대괄호가 필요합니다.',
  EndOfFileExpected: '문서 끝에 예상하지 못한 내용이 있습니다.',
  InvalidCommentToken: 'JSON에서는 주석을 사용할 수 없습니다.',
  UnexpectedEndOfComment: '주석이 끝나지 않았습니다.',
  UnexpectedEndOfString: '문자열이 끝나지 않았습니다.',
  UnexpectedEndOfNumber: '숫자가 끝나지 않았습니다.',
  InvalidUnicode: '유니코드 이스케이프가 올바르지 않습니다.',
  InvalidEscapeCharacter: '이스케이프 문자가 올바르지 않습니다.',
  InvalidCharacter: '문자열에 사용할 수 없는 문자가 있습니다.',
};

function parseDiagnostic(source: string, error: ParseError) {
  const code = printParseErrorCode(error.error);
  return diagnosticAt('json', code, JSON_MESSAGES[code] ?? 'JSON 형식이 올바르지 않습니다.', source, error.offset, error.length);
}

function nodeToDataNode(source: string, node: Node, depth = 0): OperationResult<DataNode> {
  if ((node.type === 'array' || node.type === 'object') && depth >= MAX_NESTING_DEPTH) {
    return {
      ok: false,
      diagnostic: diagnosticAt('json', 'MAX_DEPTH_EXCEEDED', `중첩 깊이는 ${MAX_NESTING_DEPTH}단계까지 지원합니다.`, source, node.offset, node.length),
    };
  }
  switch (node.type) {
    case 'null':
      return { ok: true, value: { kind: 'null' } };
    case 'boolean':
      return { ok: true, value: { kind: 'boolean', value: node.value as boolean } };
    case 'string':
      return { ok: true, value: { kind: 'string', value: node.value as string } };
    case 'number': {
      const value = node.value as number;
      if (!Number.isFinite(value)) {
        return {
          ok: false,
          diagnostic: diagnosticAt('json', 'NON_FINITE_NUMBER', '유한한 숫자만 사용할 수 있습니다.', source, node.offset, node.length),
        };
      }
      return { ok: true, value: { kind: 'number', value } };
    }
    case 'array': {
      const items: DataNode[] = [];
      for (const child of node.children ?? []) {
        const converted = nodeToDataNode(source, child, depth + 1);
        if (!converted.ok) return converted;
        items.push(converted.value);
      }
      return { ok: true, value: { kind: 'sequence', items } };
    }
    case 'object': {
      const entries: Array<{ key: string; value: DataNode }> = [];
      const keys = new Set<string>();
      for (const property of node.children ?? []) {
        const [keyNode, valueNode] = property.children ?? [];
        if (!keyNode || !valueNode || typeof keyNode.value !== 'string') continue;
        const key = keyNode.value;
        if (keys.has(key)) {
          return {
            ok: false,
            diagnostic: diagnosticAt('json', 'DUPLICATE_KEY', '중복된 속성 이름을 사용할 수 없습니다.', source, keyNode.offset, keyNode.length),
          };
        }
        keys.add(key);
        const converted = nodeToDataNode(source, valueNode, depth + 1);
        if (!converted.ok) return converted;
        entries.push({ key, value: converted.value });
      }
      return { ok: true, value: { kind: 'mapping', entries } };
    }
    default:
      return {
        ok: false,
        diagnostic: diagnosticAt('json', 'UNSUPPORTED_NODE', '지원하지 않는 JSON 값입니다.', source, node.offset, node.length),
      };
  }
}

export function parseJson(source: string): OperationResult<DataNode> {
  try {
    const errors: ParseError[] = [];
    const tree = parseTree(source, errors, JSON_OPTIONS);
    if (errors.length > 0) return { ok: false, diagnostic: parseDiagnostic(source, errors[0]) };
    if (!tree) {
      return {
        ok: false,
        diagnostic: diagnosticAt('json', 'ValueExpected', JSON_MESSAGES.ValueExpected, source, 0, 0),
      };
    }
    return nodeToDataNode(source, tree);
  } catch {
    return {
      ok: false,
      diagnostic: safetyDiagnostic('json', 'UNEXPECTED_ERROR', 'JSON 처리 중 예상하지 못한 오류가 발생했습니다.', source),
    };
  }
}

function indent(depth: number): string {
  return '  '.repeat(depth);
}

function serialize(node: DataNode, depth: number): string {
  switch (node.kind) {
    case 'null':
      return 'null';
    case 'boolean':
    case 'number':
      return String(node.value);
    case 'string':
      return JSON.stringify(node.value);
    case 'sequence':
      if (node.items.length === 0) return '[]';
      return `[\n${node.items.map((item) => `${indent(depth + 1)}${serialize(item, depth + 1)}`).join(',\n')}\n${indent(depth)}]`;
    case 'mapping':
      if (node.entries.length === 0) return '{}';
      return `{\n${node.entries.map(({ key, value }) => `${indent(depth + 1)}${JSON.stringify(key)}: ${serialize(value, depth + 1)}`).join(',\n')}\n${indent(depth)}}`;
  }
}

export function stringifyJson(node: DataNode): OperationResult<string> {
  try {
    const valid = validateDataNode(node, 'json');
    if (!valid.ok) return valid;
    return outputWithinLimit('json', `${serialize(node, 0)}\n`);
  } catch {
    return {
      ok: false,
      diagnostic: safetyDiagnostic('json', 'UNEXPECTED_ERROR', 'JSON 직렬화 중 예상하지 못한 오류가 발생했습니다.'),
    };
  }
}

export function prettyJson(source: string): OperationResult<string> {
  try {
    const parsed = parseJson(source);
    if (!parsed.ok) return parsed;
    const edits = format(source, undefined, { insertSpaces: true, tabSize: 2, eol: '\n' });
    const formatted = applyEdits(source, edits).replace(/\s*$/, '') + '\n';
    return outputWithinLimit('json', formatted);
  } catch {
    return {
      ok: false,
      diagnostic: safetyDiagnostic('json', 'UNEXPECTED_ERROR', 'JSON Pretty 중 예상하지 못한 오류가 발생했습니다.', source),
    };
  }
}
