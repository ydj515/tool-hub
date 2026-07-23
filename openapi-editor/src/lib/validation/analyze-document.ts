import type { AnalysisResult, Diagnostic, DocumentFormat, OpenApiDocument, SpecFamily } from '../../domain/document';
import { detectDocumentFormat } from '../parser/format-detector';
import { parseSource } from '../parser/parse-source';
import { validateReferences } from './ref-validator';
import { detectSpecVersion } from './version-detector';

interface AnalyzeOptions {
  filename?: string;
  lockedFormat?: DocumentFormat;
  formatHint?: DocumentFormat;
}

function isRecord(value: unknown): value is OpenApiDocument {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function structureDiagnostics(document: OpenApiDocument): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  if (!isRecord(document.info) || typeof document.info.title !== 'string' || document.info.title.trim() === '' || typeof document.info.version !== 'string') {
    diagnostics.push({
      id: 'INVALID_INFO:root', code: 'INVALID_INFO', severity: 'error', stage: 'validate',
      message: 'info.title과 info.version 문자열이 필요합니다.', sourcePointer: '/info', lossy: false,
    });
  }
  if (!isRecord(document.paths)) {
    diagnostics.push({
      id: 'INVALID_PATHS:root', code: 'INVALID_PATHS', severity: 'error', stage: 'validate',
      message: 'paths 객체가 필요합니다.', sourcePointer: '/paths', lossy: false,
    });
  }
  return diagnostics;
}

function escapePointerToken(token: string): string {
  return token.replaceAll('~', '~0').replaceAll('/', '~1');
}

function isReference(value: unknown): boolean {
  return isRecord(value) && typeof value.$ref === 'string';
}

function unsupportedOas32Diagnostic(pointer: string, key: string): Diagnostic {
  return {
    id: `UNSUPPORTED_FIELD_FOR_SPEC_VERSION:${pointer}/${escapePointerToken(key)}`,
    code: 'UNSUPPORTED_FIELD_FOR_SPEC_VERSION',
    severity: 'error',
    stage: 'validate',
    message: `OpenAPI 3.1은 OpenAPI 3.2 전용 ${key} 필드를 지원하지 않습니다.`,
    sourcePointer: `${pointer}/${escapePointerToken(key)}`,
    lossy: false,
  };
}

function reportOas32Field(value: unknown, key: string, pointer: string, diagnostics: Diagnostic[]): void {
  if (isRecord(value) && Object.hasOwn(value, key)) diagnostics.push(unsupportedOas32Diagnostic(pointer, key));
}

function validateOas32Schema(value: unknown, pointer: string, diagnostics: Diagnostic[]): void {
  if (!isRecord(value) || isReference(value)) return;
  if (isRecord(value.xml)) reportOas32Field(value.xml, 'nodeType', `${pointer}/xml`, diagnostics);
  if (isRecord(value.discriminator)) reportOas32Field(value.discriminator, 'defaultMapping', `${pointer}/discriminator`, diagnostics);
  for (const key of ['items', 'contains', 'not', 'if', 'then', 'else', 'propertyNames', 'contentSchema', 'additionalProperties', 'unevaluatedProperties']) {
    validateOas32Schema(value[key], `${pointer}/${key}`, diagnostics);
  }
  for (const key of ['prefixItems', 'allOf', 'anyOf', 'oneOf']) {
    if (Array.isArray(value[key])) value[key].forEach((item, index) => validateOas32Schema(item, `${pointer}/${key}/${index}`, diagnostics));
  }
  for (const key of ['properties', 'patternProperties', 'dependentSchemas', '$defs']) {
    if (!isRecord(value[key])) continue;
    for (const [name, schema] of Object.entries(value[key])) validateOas32Schema(schema, `${pointer}/${key}/${escapePointerToken(name)}`, diagnostics);
  }
}

function validateOas32Example(value: unknown, pointer: string, diagnostics: Diagnostic[]): void {
  if (!isRecord(value) || isReference(value)) return;
  for (const key of ['dataValue', 'serializedValue']) reportOas32Field(value, key, pointer, diagnostics);
}

function validateOas32Examples(value: unknown, pointer: string, diagnostics: Diagnostic[]): void {
  if (!isRecord(value)) return;
  for (const [name, example] of Object.entries(value)) validateOas32Example(example, `${pointer}/${escapePointerToken(name)}`, diagnostics);
}

function validateOas32Header(value: unknown, pointer: string, diagnostics: Diagnostic[]): void {
  if (!isRecord(value) || isReference(value)) return;
  validateOas32Schema(value.schema, `${pointer}/schema`, diagnostics);
  validateOas32Content(value.content, `${pointer}/content`, diagnostics);
  validateOas32Examples(value.examples, `${pointer}/examples`, diagnostics);
}

function validateOas32MediaType(value: unknown, pointer: string, diagnostics: Diagnostic[]): void {
  if (!isRecord(value) || isReference(value)) return;
  for (const key of ['itemSchema', 'itemEncoding', 'prefixEncoding']) reportOas32Field(value, key, pointer, diagnostics);
  validateOas32Schema(value.schema, `${pointer}/schema`, diagnostics);
  validateOas32Examples(value.examples, `${pointer}/examples`, diagnostics);
  if (!isRecord(value.encoding)) return;
  for (const [name, encoding] of Object.entries(value.encoding)) {
    if (!isRecord(encoding) || isReference(encoding) || !isRecord(encoding.headers)) continue;
    for (const [headerName, header] of Object.entries(encoding.headers)) validateOas32Header(header, `${pointer}/encoding/${escapePointerToken(name)}/headers/${escapePointerToken(headerName)}`, diagnostics);
  }
}

function validateOas32Content(value: unknown, pointer: string, diagnostics: Diagnostic[]): void {
  if (!isRecord(value)) return;
  for (const [mediaType, media] of Object.entries(value)) validateOas32MediaType(media, `${pointer}/${escapePointerToken(mediaType)}`, diagnostics);
}

function validateOas32Parameter(value: unknown, pointer: string, diagnostics: Diagnostic[]): void {
  if (!isRecord(value) || isReference(value)) return;
  if (value.in === 'querystring') diagnostics.push(unsupportedOas32Diagnostic(pointer, 'in'));
  validateOas32Schema(value.schema, `${pointer}/schema`, diagnostics);
  validateOas32Content(value.content, `${pointer}/content`, diagnostics);
  validateOas32Examples(value.examples, `${pointer}/examples`, diagnostics);
}

function validateOas32Parameters(value: unknown, pointer: string, diagnostics: Diagnostic[]): void {
  if (Array.isArray(value)) value.forEach((parameter, index) => validateOas32Parameter(parameter, `${pointer}/${index}`, diagnostics));
}

function validateOas32Response(value: unknown, pointer: string, diagnostics: Diagnostic[]): void {
  if (!isRecord(value) || isReference(value)) return;
  reportOas32Field(value, 'summary', pointer, diagnostics);
  validateOas32Content(value.content, `${pointer}/content`, diagnostics);
  if (isRecord(value.headers)) for (const [name, header] of Object.entries(value.headers)) validateOas32Header(header, `${pointer}/headers/${escapePointerToken(name)}`, diagnostics);
}

function validateOas32Callbacks(value: unknown, pointer: string, diagnostics: Diagnostic[]): void {
  if (!isRecord(value)) return;
  for (const [name, callback] of Object.entries(value)) {
    if (!isRecord(callback) || isReference(callback)) continue;
    for (const [expression, item] of Object.entries(callback)) validateOas32PathItem(item, `${pointer}/${escapePointerToken(name)}/${escapePointerToken(expression)}`, diagnostics);
  }
}

function validateOas32Operation(value: unknown, pointer: string, diagnostics: Diagnostic[]): void {
  if (!isRecord(value) || isReference(value)) return;
  validateOas32Parameters(value.parameters, `${pointer}/parameters`, diagnostics);
  if (isRecord(value.requestBody) && !isReference(value.requestBody)) validateOas32Content(value.requestBody.content, `${pointer}/requestBody/content`, diagnostics);
  if (isRecord(value.responses)) for (const [status, response] of Object.entries(value.responses)) validateOas32Response(response, `${pointer}/responses/${escapePointerToken(status)}`, diagnostics);
  validateOas32Callbacks(value.callbacks, `${pointer}/callbacks`, diagnostics);
}

function validateOas32PathItem(value: unknown, pointer: string, diagnostics: Diagnostic[]): void {
  if (!isRecord(value) || isReference(value)) return;
  for (const key of ['query', 'additionalOperations']) reportOas32Field(value, key, pointer, diagnostics);
  validateOas32Parameters(value.parameters, `${pointer}/parameters`, diagnostics);
  for (const method of ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace']) validateOas32Operation(value[method], `${pointer}/${method}`, diagnostics);
}

function unsupportedVersionDiagnostics(document: OpenApiDocument, family: SpecFamily): Diagnostic[] {
  if (family !== 'openapi-3.1') return [];
  const diagnostics: Diagnostic[] = [];
  reportOas32Field(document, '$self', '', diagnostics);
  if (Array.isArray(document.tags)) document.tags.forEach((tag, index) => ['summary', 'parent', 'kind'].forEach((key) => reportOas32Field(tag, key, `/tags/${index}`, diagnostics)));
  if (isRecord(document.paths)) for (const [path, item] of Object.entries(document.paths)) validateOas32PathItem(item, `/paths/${escapePointerToken(path)}`, diagnostics);
  if (isRecord(document.webhooks)) for (const [name, item] of Object.entries(document.webhooks)) validateOas32PathItem(item, `/webhooks/${escapePointerToken(name)}`, diagnostics);
  if (!isRecord(document.components)) return diagnostics;

  const components = document.components;
  reportOas32Field(components, 'mediaTypes', '/components', diagnostics);
  if (isRecord(components.schemas)) for (const [name, schema] of Object.entries(components.schemas)) validateOas32Schema(schema, `/components/schemas/${escapePointerToken(name)}`, diagnostics);
  if (isRecord(components.responses)) for (const [name, response] of Object.entries(components.responses)) validateOas32Response(response, `/components/responses/${escapePointerToken(name)}`, diagnostics);
  if (isRecord(components.parameters)) for (const [name, parameter] of Object.entries(components.parameters)) validateOas32Parameter(parameter, `/components/parameters/${escapePointerToken(name)}`, diagnostics);
  if (isRecord(components.examples)) for (const [name, example] of Object.entries(components.examples)) validateOas32Example(example, `/components/examples/${escapePointerToken(name)}`, diagnostics);
  if (isRecord(components.requestBodies)) for (const [name, body] of Object.entries(components.requestBodies)) {
    if (isRecord(body) && !isReference(body)) validateOas32Content(body.content, `/components/requestBodies/${escapePointerToken(name)}/content`, diagnostics);
  }
  if (isRecord(components.headers)) for (const [name, header] of Object.entries(components.headers)) validateOas32Header(header, `/components/headers/${escapePointerToken(name)}`, diagnostics);
  validateOas32Callbacks(components.callbacks, '/components/callbacks', diagnostics);
  if (isRecord(components.pathItems)) for (const [name, pathItem] of Object.entries(components.pathItems)) validateOas32PathItem(pathItem, `/components/pathItems/${escapePointerToken(name)}`, diagnostics);
  if (isRecord(components.securitySchemes)) {
    for (const [name, scheme] of Object.entries(components.securitySchemes)) {
      if (!isRecord(scheme) || isReference(scheme)) continue;
      const pointer = `/components/securitySchemes/${escapePointerToken(name)}`;
      reportOas32Field(scheme, 'oauth2MetadataUrl', pointer, diagnostics);
      if (isRecord(scheme.flows)) reportOas32Field(scheme.flows, 'deviceAuthorization', `${pointer}/flows`, diagnostics);
    }
  }
  return diagnostics;
}

function attachLocations(diagnostics: Diagnostic[], locations: Record<string, AnalysisResult['parsed']['pointerLocations'][string]>): Diagnostic[] {
  return diagnostics.map((item) => ({ ...item, location: item.location ?? locations[item.sourcePointer] ?? locations[''] }));
}

export function analyzeDocument(raw: string, options: AnalyzeOptions = {}): AnalysisResult {
  const detection = options.formatHint
    ? { format: options.formatHint, locked: true, diagnostics: [] }
    : detectDocumentFormat({ raw, filename: options.filename, lockedFormat: options.lockedFormat });
  const parsed = parseSource(raw, detection.format);
  if (!parsed.ok || !parsed.value) {
    const diagnostics = [...detection.diagnostics, ...parsed.diagnostics];
    return { parsed: { ...parsed, diagnostics }, diagnostics, internalReferenceCount: 0, externalReferenceCount: 0 };
  }
  const version = detectSpecVersion(parsed.value);
  if (!version.ok) {
    const diagnostics = attachLocations([...detection.diagnostics, ...parsed.diagnostics, version.diagnostic], parsed.pointerLocations);
    return { parsed: { ...parsed, diagnostics }, diagnostics, internalReferenceCount: 0, externalReferenceCount: 0 };
  }
  const references = validateReferences(parsed.value);
  const diagnostics = attachLocations([...detection.diagnostics, ...parsed.diagnostics, ...structureDiagnostics(parsed.value), ...unsupportedVersionDiagnostics(parsed.value, version.family), ...references.diagnostics], parsed.pointerLocations);
  return {
    parsed: { ...parsed, version: version.family, diagnostics },
    version: version.family,
    diagnostics,
    internalReferenceCount: references.internalCount,
    externalReferenceCount: references.externalCount,
  };
}
