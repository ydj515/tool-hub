import type {
  NormalizedContract,
  NormalizedEndpoint,
  NormalizedParameter,
  NormalizedSchema,
  NormalizedSecurityScheme,
  OpenApiDocument,
  SecurityAlternative,
  SpecVersion,
} from '../../domain/contract';
import { createDiagnostic, type Diagnostic } from '../../domain/diagnostic';
import { resolveLocalReference } from '../references/local-ref-resolver';

const HTTP_METHODS = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace', 'query'] as const;
const SUPPORTED_FORMATS = new Set([
  'email', 'uuid', 'date', 'date-time', 'uri', 'hostname', 'ipv4', 'ipv6',
  'int32', 'int64', 'float', 'double', 'byte', 'binary', 'password',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function escapePointer(value: string): string {
  return value.replace(/~/g, '~0').replace(/\//g, '~1');
}

interface NormalizationContext {
  document: OpenApiDocument;
  version: SpecVersion;
  diagnostics: Diagnostic[];
  identities: string[];
}

function numberValue(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function mergeAllOf(raw: Record<string, unknown>, pointer: string, context: NormalizationContext): Record<string, unknown> {
  if (!Array.isArray(raw.allOf)) return raw;
  const merged: Record<string, unknown> = { ...raw };
  delete merged.allOf;
  const required = new Set(Array.isArray(raw.required) ? raw.required.filter((item): item is string => typeof item === 'string') : []);
  const properties: Record<string, unknown> = isRecord(raw.properties) ? { ...raw.properties } : {};

  for (const [index, member] of raw.allOf.entries()) {
    const resolved = resolveSchemaRecord(member, `${pointer}/allOf/${index}`, context);
    if (!resolved) continue;
    if (typeof merged.type === 'string' && typeof resolved.raw.type === 'string' && merged.type !== resolved.raw.type) {
      context.diagnostics.push(createDiagnostic('CONFLICTING_ALLOF', 'allOf의 스키마 타입이 서로 충돌합니다.', {
        stage: 'normalize', sourcePointer: pointer, severity: 'warning', blocking: false,
      }));
      continue;
    }
    Object.assign(merged, resolved.raw);
    if (isRecord(resolved.raw.properties)) Object.assign(properties, resolved.raw.properties);
    if (Array.isArray(resolved.raw.required)) {
      for (const item of resolved.raw.required) if (typeof item === 'string') required.add(item);
    }
  }
  if (Object.keys(properties).length > 0) merged.properties = properties;
  if (required.size > 0) merged.required = [...required];
  return merged;
}

function resolveSchemaRecord(
  value: unknown,
  pointer: string,
  context: NormalizationContext,
): { raw: Record<string, unknown>; pointer: string; identity: string } | undefined {
  if (!isRecord(value)) return undefined;
  const ref = value.$ref;
  if (typeof ref !== 'string') return { raw: value, pointer, identity: pointer };
  const resolved = resolveLocalReference(context.document, ref, context.identities);
  if (!resolved.ok) {
    context.diagnostics.push(resolved.diagnostic);
    return undefined;
  }
  if (!isRecord(resolved.value)) {
    context.diagnostics.push(createDiagnostic('REFERENCE_TARGET_INVALID', '스키마 $ref 대상은 객체여야 합니다.', {
      stage: 'reference', sourcePointer: resolved.pointer,
    }));
    return undefined;
  }
  return { raw: resolved.value, pointer: resolved.pointer || pointer, identity: ref };
}

function schemaType(raw: Record<string, unknown>, version: SpecVersion): NormalizedSchema['type'] {
  if (typeof raw.type === 'string') return raw.type as NormalizedSchema['type'];
  if (version !== 'openapi-3.0' && Array.isArray(raw.type)) {
    return raw.type.find((item): item is NormalizedSchema['type'] => typeof item === 'string' && item !== 'null');
  }
  if (isRecord(raw.properties)) return 'object';
  if (raw.items) return 'array';
  return undefined;
}

function normalizeSchema(value: unknown, pointer: string, context: NormalizationContext): NormalizedSchema | undefined {
  const resolved = resolveSchemaRecord(value, pointer, context);
  if (!resolved) return undefined;
  if (context.identities.includes(resolved.identity)) {
    context.diagnostics.push(createDiagnostic('CIRCULAR_REFERENCE', '순환 스키마는 첫 반복 지점에서 중단합니다.', {
      stage: 'reference', sourcePointer: resolved.pointer, severity: 'warning', blocking: false,
    }));
    return undefined;
  }

  const nextContext = { ...context, identities: [...context.identities, resolved.identity] };
  const raw = mergeAllOf(resolved.raw, resolved.pointer, nextContext);
  const properties: Record<string, NormalizedSchema> = {};
  if (isRecord(raw.properties)) {
    for (const [name, child] of Object.entries(raw.properties)) {
      const childSchema = normalizeSchema(child, `${resolved.pointer}/properties/${escapePointer(name)}`, nextContext);
      if (childSchema) properties[name] = childSchema;
    }
  }
  const normalizeVariants = (keyword: 'oneOf' | 'anyOf'): NormalizedSchema[] | undefined => {
    const variants = raw[keyword];
    if (!Array.isArray(variants)) return undefined;
    const normalized = variants
      .map((variant, index) => normalizeSchema(variant, `${resolved.pointer}/${keyword}/${index}`, nextContext))
      .filter((variant): variant is NormalizedSchema => Boolean(variant));
    return normalized.length > 0 ? normalized : undefined;
  };
  let additionalProperties: boolean | NormalizedSchema | undefined;
  if (typeof raw.additionalProperties === 'boolean') additionalProperties = raw.additionalProperties;
  else if (isRecord(raw.additionalProperties)) {
    additionalProperties = normalizeSchema(raw.additionalProperties, `${resolved.pointer}/additionalProperties`, nextContext);
  }

  let exclusiveMinimum = numberValue(raw.exclusiveMinimum);
  let exclusiveMaximum = numberValue(raw.exclusiveMaximum);
  if (context.version === 'openapi-3.0') {
    if (raw.exclusiveMinimum === true) exclusiveMinimum = numberValue(raw.minimum);
    if (raw.exclusiveMaximum === true) exclusiveMaximum = numberValue(raw.maximum);
  }
  const type = schemaType(raw, context.version);
  const nullable = raw.nullable === true || (context.version !== 'openapi-3.0' && Array.isArray(raw.type) && raw.type.includes('null'));
  const format = typeof raw.format === 'string' ? raw.format : undefined;
  if (format && !SUPPORTED_FORMATS.has(format)) {
    context.diagnostics.push(createDiagnostic('UNSUPPORTED_FORMAT', `${format} format의 유효한 기준값을 자동 생성할 수 없습니다.`, {
      stage: 'normalize', sourcePointer: `${resolved.pointer}/format`, severity: 'warning', blocking: false,
    }));
  }

  return {
    pointer: resolved.pointer,
    identity: resolved.identity,
    type,
    nullable,
    required: Array.isArray(raw.required) ? raw.required.filter((item): item is string => typeof item === 'string') : [],
    properties,
    items: normalizeSchema(raw.items, `${resolved.pointer}/items`, nextContext),
    oneOf: normalizeVariants('oneOf'),
    anyOf: normalizeVariants('anyOf'),
    additionalProperties,
    enum: Array.isArray(raw.enum) ? raw.enum : undefined,
    constValue: context.version !== 'openapi-3.0' && 'const' in raw ? raw.const : undefined,
    examples: Array.isArray(raw.examples) ? raw.examples : undefined,
    example: raw.example,
    defaultValue: raw.default,
    minimum: numberValue(raw.minimum),
    maximum: numberValue(raw.maximum),
    exclusiveMinimum,
    exclusiveMaximum,
    multipleOf: numberValue(raw.multipleOf),
    minLength: numberValue(raw.minLength),
    maxLength: numberValue(raw.maxLength),
    pattern: typeof raw.pattern === 'string' ? raw.pattern : undefined,
    format,
    minItems: numberValue(raw.minItems),
    maxItems: numberValue(raw.maxItems),
    uniqueItems: raw.uniqueItems === true,
  };
}

function resolveObject(value: unknown, _pointer: string, context: NormalizationContext): Record<string, unknown> | undefined {
  if (!isRecord(value)) return undefined;
  if (typeof value.$ref !== 'string') return value;
  const result = resolveLocalReference(context.document, value.$ref);
  if (!result.ok) {
    context.diagnostics.push(result.diagnostic);
    return undefined;
  }
  if (!isRecord(result.value)) {
    context.diagnostics.push(createDiagnostic('REFERENCE_TARGET_INVALID', '$ref 대상은 객체여야 합니다.', {
      stage: 'reference', sourcePointer: result.pointer,
    }));
    return undefined;
  }
  return result.value;
}

interface ParameterNormalizationResult {
  parameters: NormalizedParameter[];
  unsafe: boolean;
}

function normalizeParameters(values: unknown, pointer: string, context: NormalizationContext): ParameterNormalizationResult {
  if (!Array.isArray(values)) return { parameters: [], unsafe: false };
  const output: NormalizedParameter[] = [];
  let unsafe = false;
  for (const [index, value] of values.entries()) {
    const sourcePointer = `${pointer}/${index}`;
    const raw = resolveObject(value, sourcePointer, context);
    if (!raw || typeof raw.name !== 'string' || !['path', 'query', 'header', 'cookie'].includes(String(raw.in))) {
      unsafe = true;
      continue;
    }
    const location = raw.in as NormalizedParameter['location'];
    const required = location === 'path' || raw.required === true;
    const defaultStyle = location === 'query' || location === 'cookie' ? 'form' : 'simple';
    const style = typeof raw.style === 'string' ? raw.style : defaultStyle;
    if (style !== defaultStyle) {
      context.diagnostics.push(createDiagnostic('UNSUPPORTED_PARAMETER_SERIALIZATION', `${raw.name} 파라미터의 ${style} 직렬화는 지원하지 않습니다.`, {
        stage: 'normalize', sourcePointer, severity: 'warning', blocking: false,
      }));
      unsafe = unsafe || required;
      continue;
    }
    const normalizedSchema = normalizeSchema(raw.schema, `${sourcePointer}/schema`, context);
    const parameterExample = explicitExample(raw);
    const schema = normalizedSchema && parameterExample !== undefined
      ? { ...normalizedSchema, example: parameterExample }
      : normalizedSchema;
    if (!schema) {
      unsafe = unsafe || required;
      continue;
    }
    output.push({
      name: raw.name,
      location,
      required,
      style: defaultStyle,
      explode: typeof raw.explode === 'boolean' ? raw.explode : defaultStyle === 'form',
      schema,
      sourcePointer,
    });
  }
  return { parameters: output, unsafe };
}

function mergeParameters(pathParameters: NormalizedParameter[], operationParameters: NormalizedParameter[]): NormalizedParameter[] {
  const merged = new Map<string, NormalizedParameter>();
  for (const parameter of [...pathParameters, ...operationParameters]) merged.set(`${parameter.location}:${parameter.name}`, parameter);
  return [...merged.values()];
}

function explicitExample(raw: Record<string, unknown>): unknown {
  if (raw.example !== undefined) return raw.example;
  if (!isRecord(raw.examples)) return undefined;
  const first = Object.values(raw.examples)[0];
  return isRecord(first) && 'value' in first ? first.value : undefined;
}

function securitySchemes(document: OpenApiDocument): Record<string, unknown> {
  const components = isRecord(document.components) ? document.components : {};
  return isRecord(components.securitySchemes) ? components.securitySchemes : {};
}

interface SecurityNormalizationResult {
  alternatives: SecurityAlternative[];
  incomplete: boolean;
}

function normalizeSecurity(value: unknown, pointer: string, context: NormalizationContext): SecurityNormalizationResult {
  if (!Array.isArray(value)) return { alternatives: [], incomplete: false };
  const definitions = securitySchemes(context.document);
  const alternatives: SecurityAlternative[] = [];

  for (const [alternativeIndex, alternative] of value.entries()) {
    if (!isRecord(alternative)) continue;
    const schemes: NormalizedSecurityScheme[] = [];
    const names = Object.keys(alternative);
    if (names.length === 0) {
      alternatives.push([]);
      continue;
    }
    let supported = true;
    for (const name of names) {
      const raw = resolveObject(definitions[name], `/components/securitySchemes/${escapePointer(name)}`, context);
      let normalized: NormalizedSecurityScheme | undefined;
      if (raw?.type === 'http' && String(raw.scheme).toLowerCase() === 'bearer') {
        normalized = { name, type: 'http-bearer', sourcePointer: `/components/securitySchemes/${escapePointer(name)}` };
      } else if (raw?.type === 'http' && String(raw.scheme).toLowerCase() === 'basic') {
        normalized = { name, type: 'http-basic', sourcePointer: `/components/securitySchemes/${escapePointer(name)}` };
      } else if (raw?.type === 'oauth2' && isRecord(raw.flows) && Object.keys(raw.flows).length > 0) {
        normalized = { name, type: 'oauth2', sourcePointer: `/components/securitySchemes/${escapePointer(name)}` };
      } else if (raw?.type === 'apiKey' && ['header', 'query', 'cookie'].includes(String(raw.in)) && typeof raw.name === 'string') {
        normalized = {
          name,
          type: `api-key-${raw.in}` as NormalizedSecurityScheme['type'],
          parameterName: raw.name,
          sourcePointer: `/components/securitySchemes/${escapePointer(name)}`,
        };
      }
      if (normalized) schemes.push(normalized);
      else {
        supported = false;
        context.diagnostics.push(createDiagnostic('UNSUPPORTED_SECURITY_SCHEME', `${name} 보안 스키마는 자동 생성할 수 없습니다.`, {
          stage: 'normalize', sourcePointer: `${pointer}/${alternativeIndex}/${escapePointer(name)}`, severity: 'warning', blocking: false,
        }));
      }
    }
    if (supported) alternatives.push(schemes);
  }
  return { alternatives, incomplete: value.length > 0 && alternatives.length === 0 };
}

function requestBodySchema(raw: Record<string, unknown>, pointer: string, context: NormalizationContext) {
  const body = resolveObject(raw.requestBody, `${pointer}/requestBody`, context);
  const content = body && isRecord(body.content) ? body.content : undefined;
  if (!body || !content) return {};
  const mediaType = Object.keys(content).find((key) => key === 'application/json')
    ?? Object.keys(content).find((key) => key.endsWith('+json'))
    ?? Object.keys(content).find((key) => key === 'application/octet-stream' || key.startsWith('text/'));
  if (!mediaType) {
    context.diagnostics.push(createDiagnostic('UNSUPPORTED_REQUEST_BODY_MEDIA_TYPE', 'JSON, octet-stream, text 요청 본문만 자동 생성합니다.', {
      stage: 'normalize', sourcePointer: `${pointer}/requestBody/content`, severity: 'warning', blocking: false,
    }));
    return { required: body.required === true };
  }
  const media = isRecord(content[mediaType]) ? content[mediaType] : undefined;
  const normalizedSchema = normalizeSchema(media?.schema, `${pointer}/requestBody/content/${escapePointer(mediaType)}/schema`, context);
  const mediaExample = media ? explicitExample(media) : undefined;
  return {
    schema: normalizedSchema && mediaExample !== undefined ? { ...normalizedSchema, example: mediaExample } : normalizedSchema,
    required: body.required === true,
    mediaType,
  };
}

export interface NormalizationResult {
  contract: NormalizedContract;
  diagnostics: Diagnostic[];
}

export function normalizeContract(document: OpenApiDocument, version: SpecVersion): NormalizationResult {
  const diagnostics: Diagnostic[] = [];
  const context: NormalizationContext = { document, version, diagnostics, identities: [] };
  const info = isRecord(document.info) ? document.info : {};
  const paths = isRecord(document.paths) ? document.paths : {};
  const globalSecurity = document.security;
  const endpoints: NormalizedEndpoint[] = [];

  for (const [path, pathValue] of Object.entries(paths)) {
    if (!isRecord(pathValue)) continue;
    const pathPointer = `/paths/${escapePointer(path)}`;
    const pathDiagnosticsStart = diagnostics.length;
    const pathParameters = normalizeParameters(pathValue.parameters, `${pathPointer}/parameters`, context);
    const pathDiagnostics = diagnostics.slice(pathDiagnosticsStart);
    for (const method of HTTP_METHODS) {
      const operation = pathValue[method];
      if (!isRecord(operation)) continue;
      const operationPointer = `${pathPointer}/${method}`;
      const diagnosticsBefore = diagnostics.length;
      const operationParameters = normalizeParameters(operation.parameters, `${operationPointer}/parameters`, context);
      const body = requestBodySchema(operation, operationPointer, context);
      const responses = isRecord(operation.responses) ? Object.keys(operation.responses) : [];
      const securityValue = 'security' in operation ? operation.security : globalSecurity;
      const security = normalizeSecurity(securityValue, `${operationPointer}/security`, context);
      const newDiagnostics = diagnostics.slice(diagnosticsBefore);
      const incomplete = pathParameters.unsafe || operationParameters.unsafe || security.incomplete || newDiagnostics.some((diagnostic) => [
        'EXTERNAL_REFERENCE_UNSUPPORTED', 'REFERENCE_NOT_FOUND', 'REFERENCE_TARGET_INVALID', 'CIRCULAR_REFERENCE', 'CONFLICTING_ALLOF', 'UNSUPPORTED_REQUEST_BODY_MEDIA_TYPE', 'UNSUPPORTED_FORMAT',
      ].includes(diagnostic.code)) || pathDiagnostics.some((diagnostic) => diagnostic.code === 'UNSUPPORTED_FORMAT');

      endpoints.push({
        id: `${method.toUpperCase()} ${path}`,
        method: method.toUpperCase(),
        path,
        summary: typeof operation.summary === 'string' ? operation.summary : undefined,
        tags: Array.isArray(operation.tags) ? operation.tags.filter((tag): tag is string => typeof tag === 'string') : [],
        parameters: mergeParameters(pathParameters.parameters, operationParameters.parameters),
        requestBody: body.schema,
        requestBodyRequired: body.required ?? false,
        requestBodyMediaType: body.mediaType,
        responses,
        security: security.alternatives,
        incomplete,
        sourcePointer: operationPointer,
      });
    }
  }

  const servers = Array.isArray(document.servers) ? document.servers : [];
  const firstServer = isRecord(servers[0]) && typeof servers[0].url === 'string' ? servers[0].url : undefined;
  const contract: NormalizedContract = {
    title: typeof info.title === 'string' ? info.title : 'API',
    apiVersion: typeof info.version === 'string' ? info.version : '',
    specVersion: version,
    serverUrl: firstServer,
    endpoints,
    diagnostics,
  };
  return { contract, diagnostics };
}
