import { parse, type ParseError } from 'jsonc-parser';
import { LineCounter, parseAllDocuments } from 'yaml';
import type { OpenApiDocument, ParseResult, SpecVersion } from '../../domain/contract';
import { createDiagnostic, type Diagnostic, type SourceLocation } from '../../domain/diagnostic';
import { buildJsonPointerLocations, buildYamlPointerLocations } from './pointer-locations';

const WARNING_BYTES = 5 * 1024 * 1024;
const BLOCK_BYTES = 20 * 1024 * 1024;

function detectFormat(raw: string, filename?: string): 'yaml' | 'json' {
  const extension = filename?.split('.').pop()?.toLowerCase();
  if (extension === 'json') return 'json';
  if (extension === 'yaml' || extension === 'yml') return 'yaml';
  const first = raw.trimStart()[0];
  return first === '{' || first === '[' ? 'json' : 'yaml';
}

function offsetLocation(raw: string, offset: number, length = 1): SourceLocation {
  const before = raw.slice(0, offset);
  const line = before.split('\n').length;
  const column = offset - before.lastIndexOf('\n');
  return { startLine: line, startColumn: column, endLine: line, endColumn: column + Math.max(1, length) };
}

function findUnclosedFlowOffset(raw: string): number | undefined {
  const stack: Array<{ character: '[' | '{'; offset: number }> = [];
  let quote: '"' | "'" | undefined;
  let escaped = false;

  for (let offset = 0; offset < raw.length; offset += 1) {
    const character = raw[offset];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (quote && character === '\\' && quote === '"') {
      escaped = true;
      continue;
    }
    if (character === '"' || character === "'") {
      quote = quote === character ? undefined : quote ?? character;
      continue;
    }
    if (quote) continue;
    if (character === '[' || character === '{') stack.push({ character, offset });
    if (character === ']' && stack.at(-1)?.character === '[') stack.pop();
    if (character === '}' && stack.at(-1)?.character === '{') stack.pop();
  }

  return stack.at(-1)?.offset;
}

function parseJson(raw: string): { document?: unknown; diagnostics: Diagnostic[] } {
  const errors: ParseError[] = [];
  const document = parse(raw, errors, { allowTrailingComma: false, disallowComments: true });
  if (errors.length === 0) return { document, diagnostics: [] };

  return {
    diagnostics: errors.map((error, index) => {
      const diagnostic = createDiagnostic('JSON_SYNTAX_ERROR', 'JSON 문법을 확인해 주세요.', {
        stage: 'parse',
        location: offsetLocation(raw, error.offset, error.length),
      });
      return { ...diagnostic, id: `${diagnostic.id}:${index}` };
    }),
  };
}

function parseYaml(raw: string): { document?: unknown; diagnostics: Diagnostic[] } {
  const lineCounter = new LineCounter();
  const documents = parseAllDocuments(raw, { lineCounter, uniqueKeys: true });
  if (documents.length !== 1) {
    return {
      diagnostics: [createDiagnostic('MULTIPLE_YAML_DOCUMENTS', 'YAML 문서는 하나만 입력할 수 있습니다.', { stage: 'parse' })],
    };
  }

  const document = documents[0];
  if (!document || document.errors.length > 0) {
    const errors = document?.errors ?? [];
    return {
      diagnostics: errors.length > 0
        ? errors.map((error, index) => {
            const unclosedOffset = error.pos[0] >= raw.length - 1 ? findUnclosedFlowOffset(raw) : undefined;
            const start = lineCounter.linePos(unclosedOffset ?? error.pos[0]);
            const end = lineCounter.linePos(error.pos[1]);
            const diagnostic = createDiagnostic('YAML_SYNTAX_ERROR', 'YAML 문법을 확인해 주세요.', {
              stage: 'parse',
              location: { startLine: start.line, startColumn: start.col, endLine: end.line, endColumn: end.col },
            });
            return { ...diagnostic, id: `${diagnostic.id}:${index}` };
          })
        : [createDiagnostic('YAML_SYNTAX_ERROR', 'YAML 문법을 확인해 주세요.', { stage: 'parse' })],
    };
  }

  return { document: document.toJS({ maxAliasCount: 100 }), diagnostics: [] };
}

function isRecord(value: unknown): value is OpenApiDocument {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validateDocument(document: OpenApiDocument): { version?: SpecVersion; diagnostics: Diagnostic[] } {
  const diagnostics: Diagnostic[] = [];
  const openapi = document.openapi;
  let version: SpecVersion | undefined;

  if (typeof openapi !== 'string') {
    diagnostics.push(createDiagnostic('MISSING_SPEC_VERSION', 'openapi 버전 필드가 필요합니다.', { sourcePointer: '/openapi' }));
  } else if (/^3\.0\.\d+(?:[-+].*)?$/.test(openapi)) {
    version = 'openapi-3.0';
  } else if (/^3\.1\.\d+(?:[-+].*)?$/.test(openapi)) {
    version = 'openapi-3.1';
  } else {
    diagnostics.push(createDiagnostic('UNSUPPORTED_SPEC_VERSION', 'OpenAPI 3.0.x와 3.1.x만 지원합니다.', { sourcePointer: '/openapi' }));
  }

  const info = document.info;
  if (!isRecord(info) || typeof info.title !== 'string' || typeof info.version !== 'string') {
    diagnostics.push(createDiagnostic('INVALID_INFO', 'info.title과 info.version 문자열이 필요합니다.', { sourcePointer: '/info' }));
  }
  if (!isRecord(document.paths)) {
    diagnostics.push(createDiagnostic('INVALID_PATHS', 'paths 객체가 필요합니다.', { sourcePointer: '/paths' }));
  }

  return { version, diagnostics };
}

export function parseOpenApi(raw: string, filename?: string): ParseResult {
  const format = detectFormat(raw, filename);
  const bytes = new TextEncoder().encode(raw).byteLength;
  if (bytes > BLOCK_BYTES) {
    return {
      ok: false,
      format,
      diagnostics: [createDiagnostic('INPUT_TOO_LARGE', '입력은 UTF-8 기준 20MB를 넘을 수 없습니다.', { stage: 'parse' })],
    };
  }

  const parsed = format === 'json' ? parseJson(raw) : parseYaml(raw);
  if (parsed.diagnostics.length > 0 || !isRecord(parsed.document)) {
    return {
      ok: false,
      format,
      diagnostics: parsed.diagnostics.length > 0
        ? parsed.diagnostics
        : [createDiagnostic('INVALID_DOCUMENT', 'OpenAPI 문서의 최상위 값은 객체여야 합니다.', { stage: 'parse' })],
    };
  }

  const validation = validateDocument(parsed.document);
  const diagnostics = [...validation.diagnostics];
  if (bytes >= WARNING_BYTES) {
    diagnostics.unshift(createDiagnostic('LARGE_INPUT_WARNING', '5MB 이상의 명세는 분석이 느릴 수 있습니다.', {
      severity: 'warning',
      stage: 'parse',
      blocking: false,
    }));
  }
  if (!validation.version || diagnostics.some((diagnostic) => diagnostic.blocking)) {
    return { ok: false, format, diagnostics };
  }

  return {
    ok: true,
    format,
    version: validation.version,
    document: parsed.document,
    pointerLocations: format === 'json' ? buildJsonPointerLocations(raw) : buildYamlPointerLocations(raw),
    diagnostics,
  };
}
