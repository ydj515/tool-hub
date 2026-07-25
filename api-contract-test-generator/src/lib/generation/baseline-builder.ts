import type { NormalizedEndpoint, NormalizedSchema, SecurityAlternative } from '../../domain/contract';
import { createDiagnostic, type Diagnostic } from '../../domain/diagnostic';
import type { GeneratedRequest } from '../../domain/test-case';

export interface BuildContext {
  depth?: number;
  identities?: string[];
}

export interface BuildValueResult {
  ok: boolean;
  value: unknown;
  diagnostics: Diagnostic[];
}

export interface BaselineResult {
  ok: boolean;
  request: GeneratedRequest;
  diagnostics: Diagnostic[];
  securityAlternativeIndex: number;
}

function stableNumber(value: string): number {
  let hash = 2166136261;
  for (const character of value) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function stringLength(schema: NormalizedSchema): number {
  const minimum = Math.max(1, schema.minLength ?? 1);
  return Math.min(minimum, schema.maxLength ?? Math.max(minimum, 16));
}

function matchesFormat(format: string | undefined, value: string): boolean {
  if (!format) return true;
  if (format === 'email') return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  if (format === 'uuid') return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-8[0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
  if (format === 'date') return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
  if (format === 'date-time') return !Number.isNaN(Date.parse(value));
  if (format === 'uri') {
    try { return Boolean(new URL(value).protocol); } catch { return false; }
  }
  if (format === 'hostname') return /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(value);
  if (format === 'ipv4') return value.split('.').length === 4 && value.split('.').every((part) => /^\d+$/.test(part) && Number(part) <= 255);
  if (format === 'ipv6') return value.includes(':');
  return false;
}

function sameValue(left: unknown, right: unknown): boolean {
  return Object.is(left, right) || JSON.stringify(left) === JSON.stringify(right);
}

export function valueMatchesSchema(schema: NormalizedSchema, value: unknown, depth = 0): boolean {
  if (depth > 32) return false;
  if (value === null) return schema.nullable || schema.type === 'null';
  if (schema.constValue !== undefined && !sameValue(value, schema.constValue)) return false;
  if (schema.enum?.length && !schema.enum.some((item) => sameValue(item, value))) return false;
  if (schema.oneOf?.length && schema.oneOf.filter((variant) => valueMatchesSchema(variant, value, depth + 1)).length !== 1) return false;
  if (schema.anyOf?.length && !schema.anyOf.some((variant) => valueMatchesSchema(variant, value, depth + 1))) return false;

  if (schema.type === 'string' && typeof value !== 'string') return false;
  if (schema.type === 'number' && (typeof value !== 'number' || !Number.isFinite(value))) return false;
  if (schema.type === 'integer' && (typeof value !== 'number' || !Number.isInteger(value))) return false;
  if (schema.type === 'boolean' && typeof value !== 'boolean') return false;
  if (schema.type === 'array' && !Array.isArray(value)) return false;
  if (schema.type === 'object' && (typeof value !== 'object' || value === null || Array.isArray(value))) return false;
  if (schema.type === 'null') return false;

  if (typeof value === 'string') {
    if (schema.minLength !== undefined && value.length < schema.minLength) return false;
    if (schema.maxLength !== undefined && value.length > schema.maxLength) return false;
    if (schema.format && !matchesFormat(schema.format, value)) return false;
    if (schema.pattern) {
      try { if (!new RegExp(schema.pattern).test(value)) return false; } catch { return false; }
    }
  }
  if (typeof value === 'number') {
    if (schema.minimum !== undefined && value < schema.minimum) return false;
    if (schema.maximum !== undefined && value > schema.maximum) return false;
    if (schema.exclusiveMinimum !== undefined && value <= schema.exclusiveMinimum) return false;
    if (schema.exclusiveMaximum !== undefined && value >= schema.exclusiveMaximum) return false;
    if (schema.multipleOf !== undefined) {
      if (schema.multipleOf <= 0) return false;
      const quotient = value / schema.multipleOf;
      if (Math.abs(quotient - Math.round(quotient)) > 1e-9) return false;
    }
  }
  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems) return false;
    if (schema.maxItems !== undefined && value.length > schema.maxItems) return false;
    if (schema.uniqueItems && new Set(value.map((item) => JSON.stringify(item))).size !== value.length) return false;
    if (schema.items && !value.every((item) => valueMatchesSchema(schema.items!, item, depth + 1))) return false;
  }
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    const record = value as Record<string, unknown>;
    if (schema.required.some((name) => !(name in record))) return false;
    for (const [name, child] of Object.entries(schema.properties)) {
      if (name in record && !valueMatchesSchema(child, record[name], depth + 1)) return false;
    }
    const additionalNames = Object.keys(record).filter((name) => !(name in schema.properties));
    if (schema.additionalProperties === false && additionalNames.length > 0) return false;
    if (typeof schema.additionalProperties === 'object' && additionalNames.some((name) => !valueMatchesSchema(schema.additionalProperties as NormalizedSchema, record[name], depth + 1))) return false;
  }
  return true;
}

function generatedString(schema: NormalizedSchema, seed: string, diagnostics: Diagnostic[]): { value: string; ok: boolean } {
  const suffix = stableNumber(`${seed}:${schema.pointer}`).toString(36).slice(0, 8);
  const formats: Record<string, string> = {
    email: `user-${suffix}@example.com`,
    uuid: `00000000-0000-4000-8000-${suffix.padEnd(12, '0')}`,
    date: '2026-01-15',
    'date-time': '2026-01-15T12:00:00.000Z',
    uri: `https://example.com/${suffix}`,
    hostname: 'api.example.com',
    ipv4: '192.0.2.1',
    ipv6: '2001:db8::1',
  };
  let value = schema.format ? formats[schema.format] : undefined;
  if (!value) value = `value-${suffix}`;
  let ok = true;

  if (schema.minLength !== undefined && schema.maxLength !== undefined && schema.minLength > schema.maxLength) {
    diagnostics.push(createDiagnostic('CONFLICTING_STRING_BOUNDS', 'minLength가 maxLength보다 커서 기준 문자열을 만들 수 없습니다.', {
      stage: 'generate', sourcePointer: schema.pointer, severity: 'warning', blocking: false,
    }));
    ok = false;
  }

  if (schema.pattern) {
    try {
      const expression = new RegExp(schema.pattern);
      const candidates = [value, 'a', 'A', '0', 'test', 'TEST', 'value123', suffix];
      const match = candidates.find((candidate) => expression.test(candidate));
      if (match) value = match;
      else {
        ok = false;
        diagnostics.push(createDiagnostic('PATTERN_BASELINE_UNAVAILABLE', 'pattern을 만족하는 기준 문자열을 만들지 못했습니다.', {
          stage: 'generate', sourcePointer: schema.pointer, severity: 'warning', blocking: false,
        }));
      }
    } catch {
      ok = false;
      diagnostics.push(createDiagnostic('INVALID_PATTERN', '정규식 pattern을 해석하지 못했습니다.', {
        stage: 'generate', sourcePointer: schema.pointer, severity: 'warning', blocking: false,
      }));
    }
  }

  const length = stringLength(schema);
  if (value.length < length) value = value.padEnd(length, 'a');
  if (schema.maxLength !== undefined && value.length > schema.maxLength) value = value.slice(0, schema.maxLength);
  if (!matchesFormat(schema.format, value)) {
    ok = false;
    diagnostics.push(createDiagnostic('FORMAT_BASELINE_UNAVAILABLE', `${schema.format} 형식과 길이 제약을 함께 만족하는 값을 만들지 못했습니다.`, {
      stage: 'generate', sourcePointer: schema.pointer, severity: 'warning', blocking: false,
    }));
  }
  if (schema.pattern) {
    try { ok = new RegExp(schema.pattern).test(value) && ok; } catch { ok = false; }
  }
  return { value, ok };
}

function generatedNumber(schema: NormalizedSchema): number {
  let value = schema.exclusiveMinimum !== undefined
    ? schema.exclusiveMinimum + (schema.type === 'integer' ? 1 : Number.EPSILON)
    : schema.minimum ?? 1;
  if (schema.multipleOf && schema.multipleOf > 0) value = Math.ceil(value / schema.multipleOf) * schema.multipleOf;
  if (schema.exclusiveMaximum !== undefined && value >= schema.exclusiveMaximum) {
    value = schema.exclusiveMaximum - (schema.type === 'integer' ? 1 : Number.EPSILON);
  } else if (schema.maximum !== undefined && value > schema.maximum) {
    value = schema.maximum;
  }
  return schema.type === 'integer' ? Math.trunc(value) : value;
}

export function buildValidValue(schema: NormalizedSchema, seed: string, context: BuildContext = {}): BuildValueResult {
  const diagnostics: Diagnostic[] = [];
  const preferred: Array<{ code: string; value: unknown }> = [
    { code: 'EXAMPLE', value: schema.example },
    { code: 'EXAMPLE', value: schema.examples?.[0] },
    { code: 'DEFAULT', value: schema.defaultValue },
    { code: 'ENUM', value: schema.enum?.[0] },
    { code: 'CONST', value: schema.constValue },
  ];
  for (const candidate of preferred) {
    if (candidate.value === undefined) continue;
    if (valueMatchesSchema(schema, candidate.value)) return { ok: true, value: structuredClone(candidate.value), diagnostics };
    diagnostics.push(createDiagnostic(`INVALID_${candidate.code}_SKIPPED`, '선언된 기준값이 스키마 제약을 만족하지 않아 건너뜁니다.', {
      stage: 'generate', sourcePointer: schema.pointer, severity: 'warning', blocking: false,
    }));
  }

  const variants = schema.oneOf?.length ? schema.oneOf : schema.anyOf;
  if (variants?.length) {
    for (const [index, variant] of variants.entries()) {
      const result = buildValidValue(variant, `${seed}:variant:${index}`, context);
      diagnostics.push(...result.diagnostics);
      if (result.ok && valueMatchesSchema(schema, result.value)) return { ok: true, value: result.value, diagnostics };
    }
    diagnostics.push(createDiagnostic('COMPOSITE_BASELINE_UNAVAILABLE', 'oneOf 또는 anyOf의 유효한 기준 분기를 만들지 못했습니다.', {
      stage: 'generate', sourcePointer: schema.pointer, severity: 'warning', blocking: false,
    }));
    return { ok: false, value: undefined, diagnostics };
  }

  if (schema.format && !['email', 'uuid', 'date', 'date-time', 'uri', 'hostname', 'ipv4', 'ipv6'].includes(schema.format)) {
    diagnostics.push(createDiagnostic('UNSUPPORTED_FORMAT', `${schema.format} format의 유효한 값을 추측하지 않습니다.`, {
      stage: 'generate', sourcePointer: schema.pointer, severity: 'warning', blocking: false,
    }));
    return { ok: false, value: undefined, diagnostics };
  }

  const depth = context.depth ?? 0;
  const identities = context.identities ?? [];
  const composite = schema.type === 'object' || schema.type === 'array' || Object.keys(schema.properties).length > 0;
  if (composite && (depth >= 32 || identities.includes(schema.identity))) {
    diagnostics.push(createDiagnostic('RECURSIVE_SCHEMA_TRUNCATED', '재귀 또는 깊이 상한에서 값 생성을 중단했습니다.', {
      stage: 'generate', sourcePointer: schema.pointer, severity: 'warning', blocking: false,
    }));
    return { ok: false, value: schema.type === 'array' ? [] : {}, diagnostics };
  }
  const nextContext = {
    depth: depth + 1,
    identities: composite ? [...identities, schema.identity] : identities,
  };

  if (schema.type === 'object' || Object.keys(schema.properties).length > 0) {
    const value: Record<string, unknown> = {};
    const missingRequired = schema.required.filter((name) => !(name in schema.properties));
    let ok = missingRequired.length === 0;
    if (missingRequired.length > 0) diagnostics.push(createDiagnostic('REQUIRED_PROPERTY_SCHEMA_MISSING', `필수 속성 스키마가 없습니다: ${missingRequired.join(', ')}`, {
      stage: 'generate', sourcePointer: `${schema.pointer}/required`, severity: 'warning', blocking: false,
    }));
    for (const [name, child] of Object.entries(schema.properties)) {
      const childResult = buildValidValue(child, seed, nextContext);
      diagnostics.push(...childResult.diagnostics);
      if (childResult.ok) value[name] = childResult.value;
      if (!childResult.ok && schema.required.includes(name)) ok = false;
    }
    ok = ok && valueMatchesSchema(schema, value);
    if (!ok && !diagnostics.some((diagnostic) => diagnostic.code === 'REQUIRED_PROPERTY_SCHEMA_MISSING')) diagnostics.push(createDiagnostic('BASELINE_VALUE_INVALID', '객체 스키마 제약을 만족하는 기준값을 만들지 못했습니다.', {
      stage: 'generate', sourcePointer: schema.pointer, severity: 'warning', blocking: false,
    }));
    return { ok, value, diagnostics };
  }
  if (schema.type === 'array') {
    const requestedLength = schema.minItems ?? 1;
    const length = Math.min(requestedLength, schema.maxItems ?? requestedLength, 100);
    if (requestedLength > 100) diagnostics.push(createDiagnostic('ARRAY_ITEM_LIMIT_REACHED', '배열 기준값을 최대 100개로 제한했습니다.', {
      stage: 'generate', sourcePointer: schema.pointer, severity: 'warning', blocking: false,
    }));
    const values: unknown[] = [];
    let ok = requestedLength <= 100;
    for (let index = 0; index < length; index += 1) {
      if (!schema.items) break;
      const child = buildValidValue(schema.items, `${seed}:${index}`, nextContext);
      diagnostics.push(...child.diagnostics);
      values.push(child.value);
      ok = ok && child.ok;
    }
    ok = ok && valueMatchesSchema(schema, values);
    if (!ok && !diagnostics.some((diagnostic) => diagnostic.code === 'ARRAY_ITEM_LIMIT_REACHED')) diagnostics.push(createDiagnostic('BASELINE_VALUE_INVALID', '배열 스키마 제약을 만족하는 기준값을 만들지 못했습니다.', {
      stage: 'generate', sourcePointer: schema.pointer, severity: 'warning', blocking: false,
    }));
    return { ok, value: values, diagnostics };
  }
  if (schema.type === 'integer' || schema.type === 'number') {
    const value = generatedNumber(schema);
    const ok = valueMatchesSchema(schema, value);
    if (!ok) diagnostics.push(createDiagnostic('BASELINE_VALUE_INVALID', '숫자 스키마 제약을 만족하는 기준값을 만들지 못했습니다.', {
      stage: 'generate', sourcePointer: schema.pointer, severity: 'warning', blocking: false,
    }));
    return { ok, value, diagnostics };
  }
  if (schema.type === 'boolean') {
    const value = true;
    const ok = valueMatchesSchema(schema, value);
    if (!ok) diagnostics.push(createDiagnostic('BASELINE_VALUE_INVALID', 'boolean 스키마 제약을 만족하는 기준값을 만들지 못했습니다.', {
      stage: 'generate', sourcePointer: schema.pointer, severity: 'warning', blocking: false,
    }));
    return { ok, value, diagnostics };
  }
  if (schema.type === 'null') {
    const value = null;
    const ok = valueMatchesSchema(schema, value);
    if (!ok) diagnostics.push(createDiagnostic('BASELINE_VALUE_INVALID', 'null 스키마 제약을 만족하는 기준값을 만들지 못했습니다.', {
      stage: 'generate', sourcePointer: schema.pointer, severity: 'warning', blocking: false,
    }));
    return { ok, value, diagnostics };
  }
  const stringResult = generatedString(schema, seed, diagnostics);
  const ok = stringResult.ok && valueMatchesSchema(schema, stringResult.value);
  if (!ok && !diagnostics.some((diagnostic) => ['PATTERN_BASELINE_UNAVAILABLE', 'INVALID_PATTERN', 'FORMAT_BASELINE_UNAVAILABLE'].includes(diagnostic.code))) {
    diagnostics.push(createDiagnostic('BASELINE_VALUE_INVALID', '문자열 스키마 제약을 만족하는 기준값을 만들지 못했습니다.', {
      stage: 'generate', sourcePointer: schema.pointer, severity: 'warning', blocking: false,
    }));
  }
  return { ok, value: stringResult.value, diagnostics };
}

function applySecurity(request: GeneratedRequest, alternative: SecurityAlternative | undefined): void {
  for (const scheme of alternative ?? []) {
    if (scheme.type === 'http-bearer') request.headers.Authorization = 'Bearer {{API_TOKEN}}';
    if (scheme.type === 'http-basic') request.headers.Authorization = 'Basic {{BASIC_AUTH}}';
    if (scheme.type === 'api-key-header' && scheme.parameterName) request.headers[scheme.parameterName] = '{{API_KEY}}';
    if (scheme.type === 'api-key-query' && scheme.parameterName) request.queryParameters[scheme.parameterName] = '{{API_KEY}}';
    if (scheme.type === 'api-key-cookie' && scheme.parameterName) request.cookies[scheme.parameterName] = '{{API_KEY}}';
  }
}

export function buildBaselineRequest(endpoint: NormalizedEndpoint, seed: string, securityAlternativeIndex = 0): BaselineResult {
  const request: GeneratedRequest = { pathParameters: {}, queryParameters: {}, headers: {}, cookies: {} };
  const diagnostics: Diagnostic[] = [];
  let ok = true;
  for (const parameter of endpoint.parameters) {
    if (!parameter.required) continue;
    const result = buildValidValue(parameter.schema, seed);
    diagnostics.push(...result.diagnostics);
    ok = ok && result.ok;
    if (parameter.location === 'path') request.pathParameters[parameter.name] = result.value;
    if (parameter.location === 'query') request.queryParameters[parameter.name] = result.value;
    if (parameter.location === 'header') request.headers[parameter.name] = String(result.value);
    if (parameter.location === 'cookie') request.cookies[parameter.name] = String(result.value);
  }
  if (endpoint.requestBody) {
    const result = buildValidValue(endpoint.requestBody, seed);
    diagnostics.push(...result.diagnostics);
    ok = ok && result.ok;
    request.body = result.value;
  }
  applySecurity(request, endpoint.security[securityAlternativeIndex]);
  return { ok, request, diagnostics, securityAlternativeIndex };
}
