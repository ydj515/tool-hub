import { parse, parseTree, printParseErrorCode, type Node, type ParseError } from 'jsonc-parser';
import { LineCounter, parseDocument } from 'yaml';
import type { Diagnostic, DocumentFormat, OpenApiDocument, ParsedDocument, SourceLocation } from '../../domain/document';

function diagnostic(code: string, message: string, location?: SourceLocation): Diagnostic {
  return {
    id: `${code}:${location?.startLine ?? 1}:${location?.startColumn ?? 1}`,
    code,
    severity: 'error',
    stage: 'parse',
    message,
    sourcePointer: '',
    location,
    lossy: false,
  };
}

function isRecord(value: unknown): value is OpenApiDocument {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function escapePointerToken(token: string): string {
  return token.replaceAll('~', '~0').replaceAll('/', '~1');
}

function lineStarts(raw: string): number[] {
  const starts = [0];
  for (let index = 0; index < raw.length; index += 1) if (raw[index] === '\n') starts.push(index + 1);
  return starts;
}

function locationAt(starts: number[], offset: number, length = 1): SourceLocation {
  let low = 0;
  let high = starts.length - 1;
  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    if (starts[middle]! <= offset) low = middle + 1;
    else high = middle - 1;
  }
  const startLineIndex = Math.max(0, high);
  const endOffset = Math.max(offset, offset + Math.max(length, 1) - 1);
  low = 0;
  high = starts.length - 1;
  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    if (starts[middle]! <= endOffset) low = middle + 1;
    else high = middle - 1;
  }
  const endLineIndex = Math.max(0, high);
  return {
    startLine: startLineIndex + 1,
    startColumn: offset - starts[startLineIndex]! + 1,
    endLine: endLineIndex + 1,
    endColumn: endOffset - starts[endLineIndex]! + 2,
  };
}

function jsonPointerLocations(raw: string): Record<string, SourceLocation> {
  const locations: Record<string, SourceLocation> = {};
  const starts = lineStarts(raw);
  const visit = (node: Node | undefined, pointer: string): void => {
    if (!node) return;
    locations[pointer] = locationAt(starts, node.offset, node.length);
    if (node.type === 'object') {
      for (const property of node.children ?? []) {
        const [keyNode, valueNode] = property.children ?? [];
        if (typeof keyNode?.value !== 'string') continue;
        visit(valueNode, `${pointer}/${escapePointerToken(keyNode.value)}`);
      }
    }
    if (node.type === 'array') {
      for (const [index, child] of (node.children ?? []).entries()) visit(child, `${pointer}/${index}`);
    }
  };
  visit(parseTree(raw, [], { allowTrailingComma: false, disallowComments: true }) ?? undefined, '');
  return locations;
}

type YamlNodeLike = {
  range?: [number, number, number?];
  items?: unknown[];
  key?: YamlNodeLike;
  valueOf?: () => unknown;
  value?: unknown;
};

function yamlNodeValue(node: YamlNodeLike | undefined): unknown {
  if (!node) return undefined;
  return node.value !== undefined ? node.value : typeof node.valueOf === 'function' ? node.valueOf() : undefined;
}

function yamlPointerLocations(raw: string, contents: unknown): Record<string, SourceLocation> {
  const locations: Record<string, SourceLocation> = {};
  const counter = new LineCounter();
  counter.addNewLine(0);
  for (let offset = 0; offset < raw.length; offset += 1) if (raw[offset] === '\n') counter.addNewLine(offset + 1);
  const locationFor = (range: [number, number, number?] | undefined): SourceLocation | undefined => {
    if (!range) return undefined;
    const start = counter.linePos(range[0]);
    const end = counter.linePos(Math.max(range[0], range[1] - 1));
    if (!start || !end) return undefined;
    return { startLine: start.line, startColumn: start.col, endLine: end.line, endColumn: end.col + 1 };
  };
  const visit = (candidate: unknown, pointer: string, pointerLocation?: SourceLocation): void => {
    const node = candidate as YamlNodeLike | undefined;
    if (!node || typeof node !== 'object') return;
    const location = pointerLocation ?? locationFor(node.range);
    if (location) locations[pointer] = location;
    if (!Array.isArray(node.items)) return;
    const isMapping = node.items.every((item) => typeof item === 'object' && item !== null && 'key' in item);
    if (isMapping) {
      for (const item of node.items as YamlNodeLike[]) {
        const key = yamlNodeValue(item.key);
        if (typeof key === 'string') visit(item.value, `${pointer}/${escapePointerToken(key)}`, locationFor(item.key?.range));
      }
      return;
    }
    for (const [index, item] of node.items.entries()) visit(item, `${pointer}/${index}`);
  };
  visit(contents, '');
  return locations;
}

function parsed(raw: string, format: DocumentFormat, value: OpenApiDocument, pointerLocations: Record<string, SourceLocation>): ParsedDocument {
  return { raw, format, value, pointerLocations, diagnostics: [] };
}

function failed(raw: string, format: DocumentFormat, item: Diagnostic): ParsedDocument {
  return { raw, format, pointerLocations: {}, diagnostics: [item] };
}

export function parseSource(raw: string, format: DocumentFormat): ParsedDocument & { ok: boolean } {
  if (format === 'json') {
    const errors: ParseError[] = [];
    const value = parse(raw, errors, { allowTrailingComma: false, disallowComments: true });
    if (errors.length > 0) {
      const error = errors[0]!;
      return { ok: false, ...failed(raw, format, diagnostic('JSON_SYNTAX_ERROR', printParseErrorCode(error.error), locationAt(lineStarts(raw), error.offset, error.length))) };
    }
    if (!isRecord(value)) return { ok: false, ...failed(raw, format, diagnostic('DOCUMENT_ROOT_NOT_OBJECT', '루트는 객체여야 합니다.')) };
    return { ok: true, ...parsed(raw, format, value, jsonPointerLocations(raw)) };
  }

  const document = parseDocument(raw, { version: '1.2', strict: true, prettyErrors: true, uniqueKeys: true });
  if (document.errors.length > 0) {
    const error = document.errors[0]!;
    return { ok: false, ...failed(raw, format, diagnostic('YAML_SYNTAX_ERROR', error.message.split('\n')[0] ?? 'YAML 문법 오류')) };
  }
  let value: unknown;
  try {
    value = document.toJS({ maxAliasCount: 100 });
  } catch {
    return { ok: false, ...failed(raw, format, diagnostic('YAML_ALIAS_LIMIT', 'YAML alias 확장 한도를 초과했습니다.')) };
  }
  if (!isRecord(value)) return { ok: false, ...failed(raw, format, diagnostic('DOCUMENT_ROOT_NOT_OBJECT', '루트는 객체여야 합니다.')) };
  return { ok: true, ...parsed(raw, format, value, yamlPointerLocations(raw, document.contents)) };
}
