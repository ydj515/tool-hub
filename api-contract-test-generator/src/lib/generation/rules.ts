import type { NormalizedEndpoint, NormalizedParameter, NormalizedSchema, NormalizedSecurityScheme } from '../../domain/contract';
import type { ExpectedOutcome, GeneratedRequest, TestCandidate, TestCategory } from '../../domain/test-case';
import { buildValidValue, valueMatchesSchema } from './baseline-builder';

function validationOutcome(endpoint: NormalizedEndpoint): ExpectedOutcome {
  if (endpoint.responses.includes('400')) return { statuses: [400], needsReview: false, rationale: '명세에 400 응답이 선언되어 있습니다.' };
  if (endpoint.responses.includes('422')) return { statuses: [422], needsReview: false, rationale: '명세에 422 응답이 선언되어 있습니다.' };
  if (endpoint.responses.some((status) => status.toUpperCase() === '4XX')) return { statuses: ['4XX'], needsReview: false, rationale: '명세에 4XX 범위 응답이 선언되어 있습니다.' };
  return { statuses: [], needsReview: true, rationale: '검증 오류 응답 상태를 명세에서 확정할 수 없습니다.' };
}

function authenticationOutcome(endpoint: NormalizedEndpoint): ExpectedOutcome {
  if (endpoint.responses.includes('401')) return { statuses: [401], needsReview: false, rationale: '명세에 401 응답이 선언되어 있습니다.' };
  if (endpoint.responses.some((status) => status.toUpperCase() === '4XX')) return { statuses: ['4XX'], needsReview: false, rationale: '명세에 4XX 범위 응답이 선언되어 있습니다.' };
  return { statuses: [], needsReview: true, rationale: '인증 오류 응답 상태를 명세에서 확정할 수 없습니다.' };
}

function successOutcome(endpoint: NormalizedEndpoint): ExpectedOutcome {
  const exact = endpoint.responses
    .filter((status) => /^2\d\d$/.test(status))
    .map(Number)
    .sort((left, right) => left - right)[0];
  if (exact !== undefined) return { statuses: [exact], needsReview: false, rationale: '명세에 선언된 가장 낮은 숫자 2xx 응답을 사용합니다.' };
  if (endpoint.responses.some((status) => status.toUpperCase() === '2XX')) return { statuses: ['2XX'], needsReview: false, rationale: '명세에 2XX 범위 응답이 선언되어 있습니다.' };
  return { statuses: [], needsReview: true, rationale: '성공 응답 상태를 명세에서 확정할 수 없습니다.' };
}

function confidenceFor(outcome: ExpectedOutcome): TestCandidate['confidence'] {
  return outcome.needsReview ? 'review-required' : 'derived';
}

function cloneRequest(request: GeneratedRequest): GeneratedRequest {
  return structuredClone(request);
}

function setBodyValue(request: GeneratedRequest, path: string[], value: unknown, remove = false): void {
  if (path.length === 0) {
    if (remove) delete request.body;
    else request.body = value;
    return;
  }
  if (!request.body || typeof request.body !== 'object') return;
  let current = request.body as Record<string, unknown>;
  for (const segment of path.slice(0, -1)) {
    const child = current[segment];
    if (typeof child !== 'object' || child === null || Array.isArray(child)) return;
    current = child as Record<string, unknown>;
  }
  const key = path.at(-1);
  if (!key) return;
  if (remove) delete current[key];
  else current[key] = value;
}

function getBodyValue(request: GeneratedRequest, path: string[]): unknown {
  let current: unknown = request.body;
  for (const segment of path) {
    if (typeof current !== 'object' || current === null || Array.isArray(current)) return undefined;
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
}

function buildArrayItems(schema: NormalizedSchema, count: number, seed: string): unknown[] | undefined {
  if (!schema.items) return Array.from({ length: count }, (_, index) => index);
  const values: unknown[] = [];
  for (let index = 0; index < count; index += 1) {
    const result = buildValidValue(schema.items, `${seed}:array:${index}`);
    if (!result.ok) return undefined;
    values.push(result.value);
  }
  if (schema.uniqueItems && new Set(values.map((value) => JSON.stringify(value))).size !== values.length) return undefined;
  return values;
}

function differentType(schema: NormalizedSchema): unknown {
  if (schema.type === 'string') return 123;
  if (schema.type === 'number' || schema.type === 'integer') return 'not-a-number';
  if (schema.type === 'boolean') return 'not-a-boolean';
  if (schema.type === 'array') return {};
  if (schema.type === 'object') return [];
  return 'not-null';
}

function differentSameType(value: unknown): unknown {
  if (typeof value === 'string') return `${value}__different`;
  if (typeof value === 'number') return value + 1;
  if (typeof value === 'boolean') return !value;
  if (Array.isArray(value)) return [...value, '__different__'];
  if (typeof value === 'object' && value !== null) return { ...value, __different__: true };
  return 'not-null';
}

function schemaWithoutTargetConstraint(schema: NormalizedSchema, ruleId: string): NormalizedSchema {
  const relaxed = { ...schema };
  if (ruleId === 'type-mismatch') relaxed.type = undefined;
  if (ruleId === 'min-length-below') relaxed.minLength = undefined;
  if (ruleId === 'max-length-above') relaxed.maxLength = undefined;
  if (ruleId === 'minimum-below') relaxed.minimum = undefined;
  if (ruleId === 'maximum-above') relaxed.maximum = undefined;
  if (ruleId === 'exclusive-minimum') relaxed.exclusiveMinimum = undefined;
  if (ruleId === 'exclusive-maximum') relaxed.exclusiveMaximum = undefined;
  if (ruleId === 'multiple-of') relaxed.multipleOf = undefined;
  if (ruleId === 'enum-outside') relaxed.enum = undefined;
  if (ruleId === 'const-mismatch') relaxed.constValue = undefined;
  if (ruleId === 'format-invalid') relaxed.format = undefined;
  if (ruleId === 'pattern-mismatch') relaxed.pattern = undefined;
  if (ruleId === 'min-items-below') relaxed.minItems = undefined;
  if (ruleId === 'max-items-above') relaxed.maxItems = undefined;
  if (ruleId === 'unique-items-duplicate') relaxed.uniqueItems = false;
  if (ruleId === 'array-item-type-mismatch' && schema.items) relaxed.items = { ...schema.items, type: undefined };
  if (ruleId === 'additional-property') relaxed.additionalProperties = true;
  return relaxed;
}

function changesOnlyTargetConstraint(schema: NormalizedSchema, ruleId: string, value: unknown): boolean {
  return valueMatchesSchema(schemaWithoutTargetConstraint(schema, ruleId), value);
}

function stringWithLength(schema: NormalizedSchema, length: number): string | undefined {
  if (length < 0 || schema.pattern) return undefined;
  if (!schema.format) return 'a'.repeat(length);
  if (schema.format === 'email' && length >= 5) return `${'a'.repeat(length - 4)}@b.c`;
  if (schema.format === 'uri' && length >= 13) return `https://e.co/${'a'.repeat(length - 13)}`;
  return undefined;
}

interface CandidateInput {
  endpoint: NormalizedEndpoint;
  baseline: GeneratedRequest;
  schema: NormalizedSchema;
  path: string[];
  title: string;
  ruleId: string;
  value?: unknown;
  remove?: boolean;
  category?: TestCategory;
  priority?: number;
}

function bodyCandidate(input: CandidateInput): TestCandidate | undefined {
  if (!input.remove && SCHEMA_CONSTRAINT_RULES.has(input.ruleId) && !changesOnlyTargetConstraint(input.schema, input.ruleId, input.value)) return undefined;
  const request = cloneRequest(input.baseline);
  setBodyValue(request, input.path, input.value, input.remove);
  const expected = validationOutcome(input.endpoint);
  return {
    endpointId: input.endpoint.id,
    title: input.title,
    category: input.category ?? 'validation',
    confidence: confidenceFor(expected),
    sourcePointer: input.ruleId === 'required-body-property' ? `${input.schema.pointer}/required` : input.schema.pointer,
    rationale: `${input.schema.pointer}의 ${input.ruleId} 제약을 한 번만 변경합니다.`,
    request,
    expected,
    ruleId: input.ruleId,
    variantId: input.path.join('.') || 'body',
    priority: input.priority ?? 30,
  };
}

function enumOutside(values: unknown[]): unknown {
  if (values.every((value) => typeof value === 'string')) return '__not_in_enum__';
  if (values.every((value) => typeof value === 'number')) return Math.max(...values as number[]) + 1;
  return { invalid: true };
}

function parameterValues(request: GeneratedRequest, location: NormalizedParameter['location']): Record<string, unknown> {
  if (location === 'path') return request.pathParameters;
  if (location === 'query') return request.queryParameters;
  if (location === 'header') return request.headers;
  return request.cookies;
}

interface ParameterCandidateInput {
  endpoint: NormalizedEndpoint;
  baseline: GeneratedRequest;
  parameter: NormalizedParameter;
  title: string;
  ruleId: string;
  value?: unknown;
  remove?: boolean;
  category?: TestCategory;
  priority?: number;
}

const SCHEMA_CONSTRAINT_RULES = new Set([
  'type-mismatch', 'min-length-below', 'max-length-above', 'minimum-below', 'maximum-above',
  'exclusive-minimum', 'exclusive-maximum', 'multiple-of', 'enum-outside', 'const-mismatch',
  'format-invalid', 'pattern-mismatch', 'min-items-below', 'max-items-above',
  'unique-items-duplicate', 'array-item-type-mismatch', 'additional-property',
]);

function appendBodyCandidate(output: TestCandidate[], input: CandidateInput): void {
  const candidate = bodyCandidate(input);
  if (candidate) output.push(candidate);
}

function parameterCandidate(input: ParameterCandidateInput): TestCandidate | undefined {
  if (!input.remove && SCHEMA_CONSTRAINT_RULES.has(input.ruleId) && !changesOnlyTargetConstraint(input.parameter.schema, input.ruleId, input.value)) return undefined;
  const request = cloneRequest(input.baseline);
  const values = parameterValues(request, input.parameter.location);
  if (input.remove) delete values[input.parameter.name];
  else values[input.parameter.name] = input.value;
  const expected = validationOutcome(input.endpoint);
  return {
    endpointId: input.endpoint.id,
    title: input.title,
    category: input.category ?? 'validation',
    confidence: confidenceFor(expected),
    sourcePointer: input.ruleId === 'required-parameter' ? input.parameter.sourcePointer : input.parameter.schema.pointer,
    rationale: `${input.parameter.location} 파라미터 ${input.parameter.name}의 ${input.ruleId} 제약만 변경합니다.`,
    request,
    expected,
    ruleId: input.ruleId,
    variantId: `${input.parameter.location}:${input.parameter.name}`,
    priority: input.priority ?? 30,
  };
}

function appendParameterCandidate(output: TestCandidate[], input: ParameterCandidateInput): void {
  const candidate = parameterCandidate(input);
  if (candidate) output.push(candidate);
}

function parameterCandidates(endpoint: NormalizedEndpoint, baseline: GeneratedRequest, parameter: NormalizedParameter, seed: string): TestCandidate[] {
  const output: TestCandidate[] = [];
  const schema = parameter.schema;
  const label = `${parameter.location} ${parameter.name}`;
  if (parameter.required) {
    appendParameterCandidate(output, { endpoint, baseline, parameter, title: `${label} 필수값 누락`, ruleId: 'required-parameter', remove: true, priority: 10 });
  }
  if (parameter.location === 'path') {
    appendParameterCandidate(output, { endpoint, baseline, parameter, title: `${label} 빈 값`, ruleId: 'path-parameter-empty', value: '', priority: 11 });
    appendParameterCandidate(output, { endpoint, baseline, parameter, title: `${label} 잘못된 인코딩`, ruleId: 'path-parameter-invalid-encoding', value: '%', priority: 12 });
  }
  appendParameterCandidate(output, { endpoint, baseline, parameter, title: `${label} 타입 오류`, ruleId: 'type-mismatch', value: differentType(schema), priority: 20 });
  if (schema.minLength !== undefined && schema.minLength > 0) {
    appendParameterCandidate(output, { endpoint, baseline, parameter, title: `${label} 최소 길이 미달`, ruleId: 'min-length-below', value: stringWithLength(schema, schema.minLength - 1), category: 'boundary' });
  }
  if (schema.maxLength !== undefined) {
    appendParameterCandidate(output, { endpoint, baseline, parameter, title: `${label} 최대 길이 초과`, ruleId: 'max-length-above', value: stringWithLength(schema, schema.maxLength + 1), category: 'boundary' });
  }
  if (schema.minimum !== undefined) {
    appendParameterCandidate(output, { endpoint, baseline, parameter, title: `${label} 최솟값 미달`, ruleId: 'minimum-below', value: schema.minimum - 1, category: 'boundary' });
  }
  if (schema.maximum !== undefined) {
    appendParameterCandidate(output, { endpoint, baseline, parameter, title: `${label} 최댓값 초과`, ruleId: 'maximum-above', value: schema.maximum + 1, category: 'boundary' });
  }
  if (schema.exclusiveMinimum !== undefined) {
    appendParameterCandidate(output, { endpoint, baseline, parameter, title: `${label} 배타적 최솟값 위반`, ruleId: 'exclusive-minimum', value: schema.exclusiveMinimum, category: 'boundary' });
  }
  if (schema.exclusiveMaximum !== undefined) {
    appendParameterCandidate(output, { endpoint, baseline, parameter, title: `${label} 배타적 최댓값 위반`, ruleId: 'exclusive-maximum', value: schema.exclusiveMaximum, category: 'boundary' });
  }
  if (schema.multipleOf !== undefined) {
    appendParameterCandidate(output, { endpoint, baseline, parameter, title: `${label} 배수 제약 위반`, ruleId: 'multiple-of', value: schema.multipleOf + schema.multipleOf / 2, category: 'boundary' });
  }
  if (schema.enum?.length) {
    appendParameterCandidate(output, { endpoint, baseline, parameter, title: `${label} enum 외 값`, ruleId: 'enum-outside', value: enumOutside(schema.enum) });
  }
  if (schema.constValue !== undefined) {
    appendParameterCandidate(output, { endpoint, baseline, parameter, title: `${label} const 불일치`, ruleId: 'const-mismatch', value: differentSameType(schema.constValue) });
  }
  if (schema.format) {
    appendParameterCandidate(output, { endpoint, baseline, parameter, title: `${label} ${schema.format} 형식 오류`, ruleId: 'format-invalid', value: 'invalid-format' });
  }
  if (schema.pattern) {
    try {
      if (!new RegExp(schema.pattern).test('__pattern_mismatch__')) {
        appendParameterCandidate(output, { endpoint, baseline, parameter, title: `${label} pattern 불일치`, ruleId: 'pattern-mismatch', value: '__pattern_mismatch__' });
      }
    } catch {
      // 기준값 생성 진단에서 잘못된 pattern을 처리한다.
    }
  }
  if (schema.type === 'array') {
    if (schema.minItems !== undefined && schema.minItems > 0) {
      const values = buildArrayItems(schema, schema.minItems - 1, `${seed}:${schema.pointer}:min-items`);
      if (values) appendParameterCandidate(output, { endpoint, baseline, parameter, title: `${label} 최소 항목 수 미달`, ruleId: 'min-items-below', value: values, category: 'boundary' });
    }
    if (schema.maxItems !== undefined && schema.maxItems < 100) {
      const values = buildArrayItems(schema, schema.maxItems + 1, `${seed}:${schema.pointer}:max-items`);
      if (values) appendParameterCandidate(output, { endpoint, baseline, parameter, title: `${label} 최대 항목 수 초과`, ruleId: 'max-items-above', value: values, category: 'boundary' });
    }
    if (schema.items) {
      const length = Math.max(1, Math.min(schema.minItems ?? 1, schema.maxItems ?? 100));
      const values = buildArrayItems(schema, length, `${seed}:${schema.pointer}:items`) ?? [];
      if (values.length > 0) {
        values[0] = differentType(schema.items);
        appendParameterCandidate(output, { endpoint, baseline, parameter, title: `${label} 항목 타입 오류`, ruleId: 'array-item-type-mismatch', value: values });
      }
    }
    if (schema.uniqueItems) {
      const length = Math.max(2, schema.minItems ?? 0);
      const first = buildArrayItems({ ...schema, uniqueItems: false }, 1, `${seed}:${schema.pointer}:duplicate`)?.[0];
      if (first !== undefined && (schema.maxItems === undefined || length <= schema.maxItems)) {
        appendParameterCandidate(output, { endpoint, baseline, parameter, title: `${label} 중복 항목`, ruleId: 'unique-items-duplicate', value: Array.from({ length }, () => structuredClone(first)) });
      }
    }
  }
  return output;
}

function visitBodySchema(
  endpoint: NormalizedEndpoint,
  baseline: GeneratedRequest,
  schema: NormalizedSchema,
  path: string[],
  output: TestCandidate[],
  seed: string,
): void {
  const variants = schema.oneOf?.length
    ? { keyword: 'one-of', values: schema.oneOf }
    : schema.anyOf?.length
      ? { keyword: 'any-of', values: schema.anyOf }
      : undefined;
  if (variants) {
    for (const [index, variant] of variants.values.entries()) {
      const result = buildValidValue(variant, `${seed}:${schema.pointer}:${variants.keyword}:${index}`);
      if (!result.ok || !valueMatchesSchema(schema, result.value)) continue;
      const request = cloneRequest(baseline);
      setBodyValue(request, path, result.value);
      const expected = successOutcome(endpoint);
      output.push({
        endpointId: endpoint.id,
        title: `${path.at(-1) ?? '요청 본문'} ${variants.keyword === 'one-of' ? 'oneOf' : 'anyOf'} ${index + 1}번 정상 분기`,
        category: 'valid',
        confidence: confidenceFor(expected),
        sourcePointer: `${schema.pointer}/${variants.keyword === 'one-of' ? 'oneOf' : 'anyOf'}/${index}`,
        rationale: `${variants.keyword === 'one-of' ? 'oneOf' : 'anyOf'}의 ${index + 1}번 분기만 사용한 유효한 요청입니다.`,
        request,
        expected,
        ruleId: `${variants.keyword}-valid-branch`,
        variantId: `${path.join('.') || 'body'}:${index}`,
        priority: 1,
      });
    }
  }
  if (schema.additionalProperties === false) {
    const current = getBodyValue(baseline, path);
    if (typeof current === 'object' && current !== null && !Array.isArray(current)) {
      appendBodyCandidate(output, {
        endpoint,
        baseline,
        schema,
        path,
        title: `${path.at(-1) ?? '요청 본문'} 허용되지 않은 추가 속성`,
        ruleId: 'additional-property',
        value: { ...structuredClone(current), __unexpected__: true },
      });
    }
  }
  for (const name of schema.required) {
    if (!(name in schema.properties)) continue;
    appendBodyCandidate(output, { endpoint, baseline, schema, path: [...path, name], title: `필수 ${name} 필드 누락`, ruleId: 'required-body-property', remove: true, priority: 10 });
  }
  for (const [name, child] of Object.entries(schema.properties)) {
    const childPath = [...path, name];
    appendBodyCandidate(output, { endpoint, baseline, schema: child, path: childPath, title: `${name} 타입 오류`, ruleId: 'type-mismatch', value: differentType(child), priority: 20 });
    if (child.minLength !== undefined && child.minLength > 0) {
      appendBodyCandidate(output, { endpoint, baseline, schema: child, path: childPath, title: `${name} 최소 길이 미달`, ruleId: 'min-length-below', value: stringWithLength(child, child.minLength - 1), category: 'boundary' });
    }
    if (child.maxLength !== undefined) {
      appendBodyCandidate(output, { endpoint, baseline, schema: child, path: childPath, title: `${name} 최대 길이 초과`, ruleId: 'max-length-above', value: stringWithLength(child, child.maxLength + 1), category: 'boundary' });
    }
    if (child.minimum !== undefined) {
      appendBodyCandidate(output, { endpoint, baseline, schema: child, path: childPath, title: `${name} 최솟값 미달`, ruleId: 'minimum-below', value: child.minimum - 1, category: 'boundary' });
    }
    if (child.maximum !== undefined) {
      appendBodyCandidate(output, { endpoint, baseline, schema: child, path: childPath, title: `${name} 최댓값 초과`, ruleId: 'maximum-above', value: child.maximum + 1, category: 'boundary' });
    }
    if (child.exclusiveMinimum !== undefined) {
      appendBodyCandidate(output, { endpoint, baseline, schema: child, path: childPath, title: `${name} 배타적 최솟값 위반`, ruleId: 'exclusive-minimum', value: child.exclusiveMinimum, category: 'boundary' });
    }
    if (child.exclusiveMaximum !== undefined) {
      appendBodyCandidate(output, { endpoint, baseline, schema: child, path: childPath, title: `${name} 배타적 최댓값 위반`, ruleId: 'exclusive-maximum', value: child.exclusiveMaximum, category: 'boundary' });
    }
    if (child.multipleOf !== undefined) {
      appendBodyCandidate(output, { endpoint, baseline, schema: child, path: childPath, title: `${name} 배수 제약 위반`, ruleId: 'multiple-of', value: child.multipleOf + child.multipleOf / 2, category: 'boundary' });
    }
    if (child.enum?.length) {
      appendBodyCandidate(output, { endpoint, baseline, schema: child, path: childPath, title: `${name} enum 외 값`, ruleId: 'enum-outside', value: enumOutside(child.enum) });
    }
    if (child.constValue !== undefined) {
      appendBodyCandidate(output, { endpoint, baseline, schema: child, path: childPath, title: `${name} const 불일치`, ruleId: 'const-mismatch', value: differentSameType(child.constValue) });
    }
    if (child.format) {
      appendBodyCandidate(output, { endpoint, baseline, schema: child, path: childPath, title: `${name} ${child.format} 형식 오류`, ruleId: 'format-invalid', value: 'invalid-format' });
    }
    if (child.pattern) {
      try {
        const expression = new RegExp(child.pattern);
        if (!expression.test('__pattern_mismatch__')) {
          appendBodyCandidate(output, { endpoint, baseline, schema: child, path: childPath, title: `${name} pattern 불일치`, ruleId: 'pattern-mismatch', value: '__pattern_mismatch__' });
        }
      } catch {
        // 정규화 단계의 진단으로 처리하며 잘못된 패턴 테스트는 만들지 않는다.
      }
    }
    if (child.type === 'array') {
      if (child.minItems !== undefined && child.minItems > 0) {
        const values = buildArrayItems(child, child.minItems - 1, `${seed}:${child.pointer}:min-items`);
        if (values) appendBodyCandidate(output, { endpoint, baseline, schema: child, path: childPath, title: `${name} 최소 항목 수 미달`, ruleId: 'min-items-below', value: values, category: 'boundary' });
      }
      if (child.maxItems !== undefined && child.maxItems < 100) {
        const values = buildArrayItems(child, child.maxItems + 1, `${seed}:${child.pointer}:max-items`);
        if (values) appendBodyCandidate(output, { endpoint, baseline, schema: child, path: childPath, title: `${name} 최대 항목 수 초과`, ruleId: 'max-items-above', value: values, category: 'boundary' });
      }
      if (child.uniqueItems) {
        const length = Math.max(2, child.minItems ?? 0);
        const current = getBodyValue(baseline, childPath);
        const first = Array.isArray(current) ? current[0] : buildArrayItems({ ...child, uniqueItems: false }, 1, `${seed}:${child.pointer}:duplicate`)?.[0];
        if (first !== undefined && (child.maxItems === undefined || length <= child.maxItems)) {
          appendBodyCandidate(output, { endpoint, baseline, schema: child, path: childPath, title: `${name} 중복 항목`, ruleId: 'unique-items-duplicate', value: Array.from({ length }, () => structuredClone(first)) });
        }
      }
      if (child.items) {
        const current = getBodyValue(baseline, childPath);
        const values = Array.isArray(current) && current.length > 0
          ? structuredClone(current)
          : buildArrayItems(child, Math.max(1, child.minItems ?? 1), `${seed}:${child.pointer}:items`);
        if (values?.length) {
          values[0] = differentType(child.items);
          appendBodyCandidate(output, { endpoint, baseline, schema: child, path: childPath, title: `${name} 항목 타입 오류`, ruleId: 'array-item-type-mismatch', value: values });
        }
      }
    }
    if (child.type === 'object' || child.oneOf?.length || child.anyOf?.length || Object.keys(child.properties).length > 0) {
      visitBodySchema(endpoint, baseline, child, childPath, output, seed);
    }
  }
}

function removeAuthentication(request: GeneratedRequest, scheme: NormalizedSecurityScheme): GeneratedRequest {
  const next = cloneRequest(request);
  if (scheme.type === 'http-bearer' || scheme.type === 'http-basic') delete next.headers.Authorization;
  if (scheme.type === 'api-key-header' && scheme.parameterName) delete next.headers[scheme.parameterName];
  if (scheme.type === 'api-key-query' && scheme.parameterName) delete next.queryParameters[scheme.parameterName];
  if (scheme.type === 'api-key-cookie' && scheme.parameterName) delete next.cookies[scheme.parameterName];
  return next;
}

function malformedAuthentication(request: GeneratedRequest, scheme: NormalizedSecurityScheme): GeneratedRequest {
  const next = cloneRequest(request);
  if (scheme.type === 'http-bearer') next.headers.Authorization = 'Bearer';
  if (scheme.type === 'http-basic') next.headers.Authorization = 'Basic invalid';
  if (scheme.type === 'api-key-header' && scheme.parameterName) next.headers[scheme.parameterName] = 'invalid-api-key';
  if (scheme.type === 'api-key-query' && scheme.parameterName) next.queryParameters[scheme.parameterName] = 'invalid-api-key';
  if (scheme.type === 'api-key-cookie' && scheme.parameterName) next.cookies[scheme.parameterName] = 'invalid-api-key';
  return next;
}

export function generateRuleCandidates(
  endpoint: NormalizedEndpoint,
  baseline: GeneratedRequest,
  _seed: string,
  securityAlternativeIndex = 0,
): TestCandidate[] {
  const success = successOutcome(endpoint);
  const output: TestCandidate[] = [{
    endpointId: endpoint.id,
    title: `${endpoint.summary ?? endpoint.id} 정상 요청`,
    category: 'valid',
    confidence: confidenceFor(success),
    sourcePointer: endpoint.sourcePointer,
    rationale: '명세의 예제와 제약으로 구성한 유효한 기준 요청입니다.',
    request: cloneRequest(baseline),
    expected: success,
    ruleId: 'valid-baseline', variantId: 'baseline', priority: 0,
  }];
  for (const parameter of endpoint.parameters) output.push(...parameterCandidates(endpoint, baseline, parameter, _seed));
  if (endpoint.requestBody) visitBodySchema(endpoint, baseline, endpoint.requestBody, [], output, _seed);
  if (endpoint.requestBodyRequired) {
    const request = cloneRequest(baseline);
    delete request.body;
    const expected = validationOutcome(endpoint);
    output.push({
      endpointId: endpoint.id,
      title: '필수 요청 본문 누락',
      category: 'validation',
      confidence: confidenceFor(expected),
      sourcePointer: `${endpoint.sourcePointer}/requestBody`,
      rationale: '필수 요청 본문만 제거합니다.',
      request,
      expected,
      ruleId: 'required-request-body',
      variantId: 'request-body',
      priority: 10,
    });
  }
  const securityAlternative = endpoint.security[securityAlternativeIndex] ?? [];
  for (const scheme of securityAlternative) {
    const expected = authenticationOutcome(endpoint);
    output.push({
      endpointId: endpoint.id,
      title: `${scheme.name} 인증 정보 누락`,
      category: 'authentication',
      confidence: confidenceFor(expected),
      sourcePointer: scheme.sourcePointer,
      rationale: '선택한 AND 인증 조합에서 이 인증 스킴만 제거합니다.',
      request: removeAuthentication(baseline, scheme),
      expected,
      ruleId: 'authentication-omitted', variantId: `security-${securityAlternativeIndex}:${scheme.name}`, priority: 15,
    });
    output.push({
      endpointId: endpoint.id,
      title: `${scheme.name} 인증 형식 오류`,
      category: 'authentication',
      confidence: confidenceFor(expected),
      sourcePointer: scheme.sourcePointer,
      rationale: '선택한 AND 인증 조합에서 이 인증 스킴의 값만 잘못된 형식으로 바꿉니다.',
      request: malformedAuthentication(baseline, scheme),
      expected,
      ruleId: 'authentication-malformed', variantId: `security-${securityAlternativeIndex}:${scheme.name}`, priority: 16,
    });
  }
  return output;
}
