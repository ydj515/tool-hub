import { LineCounter, Parser, parseDocument, stringify, type YAMLError } from 'yaml';
import type { DataNode, OperationResult } from './data-node';
import { diagnosticAt } from './diagnostics';

const YAML_MESSAGES: Record<string, string> = {
  BAD_INDENT: '이 위치의 들여쓰기가 올바르지 않습니다.',
  MULTIPLE_DOCS: 'YAML 다중 문서는 지원하지 않습니다.',
  NON_STRING_KEY: 'YAML mapping 키는 문자열이어야 합니다.',
  DUPLICATE_KEY: '같은 mapping 키를 두 번 사용할 수 없습니다.',
  TAG_RESOLVE_FAILED: '지원하지 않는 YAML tag입니다.',
  BAD_ALIAS: 'YAML alias가 올바르지 않습니다.',
  UNEXPECTED_TOKEN: '예상하지 못한 YAML 토큰이 있습니다.',
};

const JSON_COMPATIBLE_TAGS = new Set([
  'tag:yaml.org,2002:map',
  'tag:yaml.org,2002:seq',
  'tag:yaml.org,2002:str',
  'tag:yaml.org,2002:null',
  'tag:yaml.org,2002:bool',
  'tag:yaml.org,2002:int',
  'tag:yaml.org,2002:float',
]);
const MAX_ALIAS_EXPANSIONS = 100;

type TagRange = [number, number];
type AttachedTag = { source?: string; range: TagRange };
type CstSourceToken = { type: string; offset: number; source: string };
type CstItem = {
  start?: CstSourceToken[];
  key?: CstToken;
  sep?: CstSourceToken[];
  value?: CstToken;
};
type CstToken = {
  type: string;
  offset: number;
  source?: string;
  start?: CstSourceToken[];
  props?: CstSourceToken[];
  items?: CstItem[];
  value?: CstToken;
};

function failure(source: string, code: string, message: string, offset = 0, length = 0): OperationResult<never> {
  return { ok: false, diagnostic: diagnosticAt('yaml', code, message, source, offset, length) };
}

function parseDiagnostic(source: string, error: YAMLError): OperationResult<never> {
  const [start, end] = error.pos;
  return failure(source, error.code, YAML_MESSAGES[error.code] ?? error.message.split('\n')[0], start, end - start);
}

function tokenKey(token: { type: string; offset: number }): string {
  return `${token.type}:${token.offset}`;
}

function attachedTag(tokens: CstSourceToken[] | undefined): CstSourceToken | undefined {
  return tokens?.find((token) => token.type === 'tag');
}

function collectCstTags(source: string): Map<string, AttachedTag> {
  const tags = new Map<string, AttachedTag>();

  function attach(token: CstToken | undefined, tokens: CstSourceToken[] | undefined) {
    if (!token) return;
    const tag = attachedTag(tokens);
    if (tag) tags.set(tokenKey(token), { source: tag.source, range: [tag.offset, tag.offset + tag.source.length] });
  }

  function visit(token: CstToken | undefined) {
    if (!token) return;
    attach(token, token.props);
    for (const item of token.items ?? []) {
      attach(item.key, item.start);
      attach(item.value, item.sep ?? item.start);
      visit(item.key);
      visit(item.value);
    }
  }

  for (const parsed of new Parser().parse(source)) {
    const token = parsed as CstToken;
    if (token.type !== 'document') continue;
    attach(token.value, token.start);
    visit(token.value);
  }
  return tags;
}

function attachedTagForNode(
  node: { range?: unknown; srcToken?: unknown },
  cstTags: Map<string, AttachedTag>,
  warnings: YAMLError[],
): AttachedTag | undefined {
  const srcToken = node.srcToken as { type?: unknown; offset?: unknown } | undefined;
  if (srcToken && typeof srcToken.type === 'string' && typeof srcToken.offset === 'number') {
    const cstTag = cstTags.get(tokenKey({ type: srcToken.type, offset: srcToken.offset }));
    if (cstTag) {
      const warning = warnings.find(
        (issue) =>
          issue.code === 'TAG_RESOLVE_FAILED' && issue.pos[0] === cstTag.range[0] && issue.pos[1] === cstTag.range[1],
      );
      return warning ? { ...cstTag, range: [...warning.pos] } : cstTag;
    }
  }

  const nodeStart = Array.isArray(node.range) ? node.range[0] : undefined;
  if (typeof nodeStart === 'number') {
    const warning = warnings.find((issue) => issue.code === 'TAG_RESOLVE_FAILED' && issue.pos[1] === nodeStart);
    if (warning) return { range: [...warning.pos] };
  }
  return undefined;
}

function unsupportedTagRange(
  value: unknown,
  cstTags: Map<string, AttachedTag>,
  warnings: YAMLError[],
  visited = new WeakSet<object>(),
): TagRange | undefined {
  if (typeof value !== 'object' || value === null || visited.has(value)) return undefined;
  visited.add(value);

  const node = value as {
    tag?: unknown;
    range?: unknown;
    srcToken?: unknown;
    items?: unknown;
    key?: unknown;
    value?: unknown;
  };
  const tag = attachedTagForNode(node, cstTags, warnings);
  const isNonSpecificTag = node.tag === '!' && tag?.source === '!';
  if (typeof node.tag === 'string' && !isNonSpecificTag && !JSON_COMPATIBLE_TAGS.has(node.tag)) {
    if (tag) return tag.range;
  }
  for (const child of [node.key, node.value]) {
    const range = unsupportedTagRange(child, cstTags, warnings, visited);
    if (range !== undefined) return range;
  }
  if (Array.isArray(node.items)) {
    for (const item of node.items) {
      const range = unsupportedTagRange(item, cstTags, warnings, visited);
      if (range !== undefined) return range;
    }
  }
  return undefined;
}

function sequenceFrom(source: string, values: unknown[], active: WeakSet<object>): OperationResult<DataNode> {
  const items: DataNode[] = [];
  for (const value of values) {
    const converted = fromYamlValue(source, value, active);
    if (!converted.ok) return converted;
    items.push(converted.value);
  }
  return { ok: true, value: { kind: 'sequence', items } };
}

function mappingFrom(source: string, values: Map<unknown, unknown>, active: WeakSet<object>): OperationResult<DataNode> {
  const entries: Array<{ key: string; value: DataNode }> = [];
  const keys = new Set<string>();
  for (const [key, value] of values) {
    if (typeof key !== 'string') return failure(source, 'NON_STRING_KEY', 'YAML mapping 키는 문자열이어야 합니다.');
    if (keys.has(key)) return failure(source, 'DUPLICATE_KEY', '같은 mapping 키를 두 번 사용할 수 없습니다.');
    keys.add(key);
    const converted = fromYamlValue(source, value, active);
    if (!converted.ok) return converted;
    entries.push({ key, value: converted.value });
  }
  return { ok: true, value: { kind: 'mapping', entries } };
}

function fromYamlValue(source: string, value: unknown, active: WeakSet<object>): OperationResult<DataNode> {
  if (value === null) return { ok: true, value: { kind: 'null' } };
  if (typeof value === 'string') return { ok: true, value: { kind: 'string', value } };
  if (typeof value === 'boolean') return { ok: true, value: { kind: 'boolean', value } };
  if (typeof value === 'number') {
    return Number.isFinite(value)
      ? { ok: true, value: { kind: 'number', value } }
      : failure(source, 'NON_FINITE_NUMBER', 'JSON으로 표현할 수 없는 숫자입니다.');
  }
  if (typeof value !== 'object') return failure(source, 'UNSUPPORTED_VALUE', 'JSON으로 표현할 수 없는 YAML 값입니다.');
  if (active.has(value)) return failure(source, 'CYCLIC_ALIAS', '순환 YAML alias는 지원하지 않습니다.');

  active.add(value);
  try {
    if (Array.isArray(value)) return sequenceFrom(source, value, active);
    if (value instanceof Map) return mappingFrom(source, value, active);
    return failure(source, 'UNSUPPORTED_VALUE', '지원하지 않는 YAML collection입니다.');
  } finally {
    active.delete(value);
  }
}

export function parseYaml(source: string): OperationResult<DataNode> {
  const lineCounter = new LineCounter();
  const document = parseDocument(source, {
    version: '1.2',
    strict: true,
    uniqueKeys: true,
    stringKeys: true,
    prettyErrors: true,
    logLevel: 'error',
    lineCounter,
    keepSourceTokens: true,
  });
  const cstTags = collectCstTags(source);
  const tagRange = unsupportedTagRange(document.contents, cstTags, document.warnings);
  let firstIssue: YAMLError | undefined;
  for (const issue of [...document.errors, ...document.warnings]) {
    if (tagRange && issue.code === 'TAG_RESOLVE_FAILED') continue;
    if (!firstIssue || issue.pos[0] < firstIssue.pos[0]) firstIssue = issue;
  }
  if (tagRange && (!firstIssue || tagRange[0] <= firstIssue.pos[0])) {
    const [start, end] = tagRange;
    return failure(source, 'TAG_RESOLVE_FAILED', '지원하지 않는 YAML tag입니다.', start, end - start);
  }
  if (firstIssue) return parseDiagnostic(source, firstIssue);

  let value: unknown;
  try {
    // yaml은 anchor 원본도 alias count에 포함하므로 허용 횟수에 1을 더한다.
    value = document.toJS({ mapAsMap: true, maxAliasCount: MAX_ALIAS_EXPANSIONS + 1 });
  } catch {
    return failure(source, 'ALIAS_LIMIT', 'YAML alias 확장 횟수가 제한을 초과했습니다.');
  }
  return fromYamlValue(source, value, new WeakSet<object>());
}

function toYamlValue(node: DataNode): unknown {
  switch (node.kind) {
    case 'null':
      return null;
    case 'boolean':
    case 'number':
    case 'string':
      return node.value;
    case 'sequence':
      return node.items.map(toYamlValue);
    case 'mapping':
      return new Map(node.entries.map(({ key, value }) => [key, toYamlValue(value)]));
  }
}

export function stringifyYaml(node: DataNode): string {
  const output = stringify(toYamlValue(node), {
    blockQuote: false,
    indent: 2,
    lineWidth: 0,
    sortMapEntries: false,
  });
  return output.replace(/\n+$/, '\n');
}

export function prettyYaml(source: string): OperationResult<string> {
  const parsed = parseYaml(source);
  if (!parsed.ok) return parsed;
  return { ok: true, value: stringifyYaml(parsed.value) };
}
