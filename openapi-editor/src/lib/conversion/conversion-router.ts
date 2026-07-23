import type { Diagnostic, OpenApiDocument, SpecFamily } from '../../domain/document';

type RecordValue = Record<string, unknown>;

export interface ConversionResult {
  document: OpenApiDocument;
  diagnostics: Diagnostic[];
}

function isRecord(value: unknown): value is RecordValue {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function extensionFields(value: RecordValue): RecordValue {
  return Object.fromEntries(Object.entries(value).filter(([key]) => key.startsWith('x-')));
}

function conversionDiagnostic(code: string, severity: Diagnostic['severity'], sourcePointer: string, message: string, lossy = false): Diagnostic {
  return {
    id: `${code}:${sourcePointer || 'root'}`,
    code,
    severity,
    stage: 'convert',
    message,
    sourcePointer,
    lossy,
  };
}

function rewriteReferences(value: unknown, replacements: Array<[string, string]>): unknown {
  if (Array.isArray(value)) return value.map((item) => rewriteReferences(item, replacements));
  if (!isRecord(value)) return value;
  const result: RecordValue = {};
  for (const [key, item] of Object.entries(value)) {
    if (key === '$ref' && typeof item === 'string') {
      const replacement = replacements.find(([from]) => item.startsWith(from));
      result[key] = replacement ? `${replacement[1]}${item.slice(replacement[0].length)}` : item;
    } else result[key] = rewriteReferences(item, replacements);
  }
  return result;
}

function mediaTypes(operation: RecordValue, root: RecordValue, key: 'consumes' | 'produces'): string[] {
  const selected = Array.isArray(operation[key]) ? operation[key] : root[key];
  return Array.isArray(selected) && selected.every((item) => typeof item === 'string') && selected.length > 0
    ? selected as string[]
    : ['application/json'];
}

function swaggerResponseToOpenApi(value: unknown, operation: RecordValue, root: RecordValue): unknown {
  if (!isRecord(value) || typeof value.$ref === 'string') return clone(value);
  const { schema, examples, ...rest } = value;
  if (schema === undefined && examples === undefined) return rest;
  const content = Object.fromEntries(mediaTypes(operation, root, 'produces').map((type) => [type, {
    ...(schema === undefined ? {} : { schema: clone(schema) }),
    ...(examples === undefined ? {} : { examples: clone(examples) }),
  }]));
  return { ...rest, content };
}

function swaggerOperationToOpenApi(value: unknown, root: RecordValue): unknown {
  if (!isRecord(value)) return clone(value);
  const candidateParameters = value.parameters;
  const candidateResponses = value.responses;
  const rest = clone(value);
  delete rest.parameters;
  delete rest.responses;
  delete rest.consumes;
  delete rest.produces;
  const parameters = Array.isArray(candidateParameters) ? candidateParameters : [];
  const regularParameters: unknown[] = [];
  const bodyParameters: RecordValue[] = [];
  const formParameters: RecordValue[] = [];
  for (const parameter of parameters) {
    if (!isRecord(parameter) || typeof parameter.$ref === 'string') {
      regularParameters.push(clone(parameter));
      continue;
    }
    if (parameter.in === 'body') bodyParameters.push(parameter);
    else if (parameter.in === 'formData') formParameters.push(parameter);
    else regularParameters.push(clone(parameter));
  }
  const result: RecordValue = { ...rest };
  if (regularParameters.length > 0) result.parameters = regularParameters;
  if (bodyParameters.length > 0) {
    const body = bodyParameters[0]!;
    const bodyExtensions = clone(body);
    delete bodyExtensions.in;
    delete bodyExtensions.name;
    delete bodyExtensions.required;
    delete bodyExtensions.description;
    delete bodyExtensions.schema;
    const { required, description, schema } = body;
    result.requestBody = {
      ...(typeof required === 'boolean' ? { required } : {}),
      ...(typeof description === 'string' ? { description } : {}),
      ...extensionFields(bodyExtensions),
      content: Object.fromEntries(mediaTypes(value, root, 'consumes').map((type) => [type, schema === undefined ? {} : { schema: clone(schema) }])),
    };
  } else if (formParameters.length > 0) {
    const properties: RecordValue = {};
    const required: string[] = [];
    for (const form of formParameters) {
      if (typeof form.name !== 'string') continue;
      const restForm = clone(form);
      delete restForm.in;
      delete restForm.name;
      delete restForm.required;
      delete restForm.type;
      delete restForm.items;
      const { required: formRequired, type, items } = form;
      properties[form.name] = { ...(typeof type === 'string' ? { type } : {}), ...(items === undefined ? {} : { items }), ...restForm };
      if (formRequired === true) required.push(form.name);
    }
    result.requestBody = {
      required: required.length > 0,
      content: { 'application/x-www-form-urlencoded': { schema: { type: 'object', properties, ...(required.length > 0 ? { required } : {}) } } },
    };
  }
  if (isRecord(candidateResponses)) {
    result.responses = Object.fromEntries(Object.entries(candidateResponses).map(([status, response]) => [status, swaggerResponseToOpenApi(response, value, root)]));
  }
  return result;
}

function swaggerPathsToOpenApi(value: unknown, root: RecordValue): unknown {
  if (!isRecord(value)) return {};
  const operations = new Set(['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace']);
  return Object.fromEntries(Object.entries(value).map(([path, item]) => {
    if (!isRecord(item)) return [path, clone(item)];
    return [path, Object.fromEntries(Object.entries(item).map(([key, operation]) => [key, operations.has(key) ? swaggerOperationToOpenApi(operation, root) : clone(operation)]))];
  }));
}

function securitySchemesToOpenApi(value: unknown): unknown {
  if (!isRecord(value)) return undefined;
  return Object.fromEntries(Object.entries(value).map(([name, item]) => {
    if (!isRecord(item)) return [name, clone(item)];
    if (item.type === 'basic') return [name, { ...item, type: 'http', scheme: 'basic' }];
    return [name, clone(item)];
  }));
}

function swaggerToOpenApi30(document: OpenApiDocument): ConversionResult {
  const components: RecordValue = {};
  if (isRecord(document.definitions)) components.schemas = clone(document.definitions);
  if (isRecord(document.parameters)) components.parameters = clone(document.parameters);
  if (isRecord(document.responses)) components.responses = clone(document.responses);
  const securitySchemes = securitySchemesToOpenApi(document.securityDefinitions);
  if (securitySchemes !== undefined) components.securitySchemes = securitySchemes;
  const scheme = Array.isArray(document.schemes) && typeof document.schemes[0] === 'string' ? document.schemes[0] : 'https';
  const host = typeof document.host === 'string' ? document.host : '';
  const basePath = typeof document.basePath === 'string' ? document.basePath : '';
  const serverUrl = host ? `${scheme}://${host}${basePath.startsWith('/') || basePath === '' ? basePath : `/${basePath}`}` : undefined;
  const target: OpenApiDocument = {
    ...extensionFields(document),
    openapi: '3.0.4',
    info: isRecord(document.info) ? clone(document.info) : { title: 'Untitled API', version: '1.0.0' },
    ...(serverUrl ? { servers: [{ url: serverUrl }] } : {}),
    paths: swaggerPathsToOpenApi(document.paths, document),
    ...(Object.keys(components).length > 0 ? { components } : {}),
    ...(Array.isArray(document.tags) ? { tags: clone(document.tags) } : {}),
    ...(Array.isArray(document.security) ? { security: clone(document.security) } : {}),
    ...(document.externalDocs === undefined ? {} : { externalDocs: clone(document.externalDocs) }),
  };
  return {
    document: rewriteReferences(target, [
      ['#/definitions/', '#/components/schemas/'],
      ['#/parameters/', '#/components/parameters/'],
      ['#/responses/', '#/components/responses/'],
      ['#/securityDefinitions/', '#/components/securitySchemes/'],
    ]) as OpenApiDocument,
    diagnostics: [],
  };
}

function transformSchemaValues(value: unknown, transform: (record: RecordValue, pointer: string) => RecordValue, pointer = ''): unknown {
  if (Array.isArray(value)) return value.map((item, index) => transformSchemaValues(item, transform, `${pointer}/${index}`));
  if (!isRecord(value)) return value;
  const nested = Object.fromEntries(Object.entries(value).map(([key, item]) => [key, transformSchemaValues(item, transform, `${pointer}/${key.replaceAll('~', '~0').replaceAll('/', '~1')}`)]));
  return transform(nested, pointer);
}

function openApi30To31(document: OpenApiDocument): ConversionResult {
  const transformed = transformSchemaValues(document, (record) => {
    const result = { ...record };
    if (result.nullable === true) {
      delete result.nullable;
      if (typeof result.type === 'string') result.type = [result.type, 'null'];
      else if (Array.isArray(result.type) && !result.type.includes('null')) result.type = [...result.type, 'null'];
      else if (result.type === undefined) result.anyOf = [...(Array.isArray(result.anyOf) ? result.anyOf : []), { type: 'null' }];
    }
    if (result.exclusiveMinimum === true && typeof result.minimum === 'number') {
      result.exclusiveMinimum = result.minimum;
      delete result.minimum;
    }
    if (result.exclusiveMaximum === true && typeof result.maximum === 'number') {
      result.exclusiveMaximum = result.maximum;
      delete result.maximum;
    }
    return result;
  }) as OpenApiDocument;
  transformed.openapi = '3.1.2';
  return { document: transformed, diagnostics: [] };
}

function openApi31To30(document: OpenApiDocument): ConversionResult {
  const diagnostics: Diagnostic[] = [];
  const unsupported = new Set(['unevaluatedProperties', 'unevaluatedItems', 'prefixItems', 'contentSchema', '$dynamicRef', '$dynamicAnchor', 'dependentSchemas']);
  const transformed = transformSchemaValues(document, (record, pointer) => {
    const result = { ...record };
    if (Array.isArray(result.type) && result.type.every((item) => typeof item === 'string') && result.type.includes('null')) {
      const nonNull = result.type.filter((item) => item !== 'null');
      result.nullable = true;
      if (nonNull.length === 1) result.type = nonNull[0];
      else {
        result.type = nonNull[0] ?? 'string';
        diagnostics.push(conversionDiagnostic('LOSSY_MULTI_TYPE_SCHEMA', 'warning', pointer, 'OpenAPI 3.0은 null 이외의 다중 type 배열을 표현할 수 없습니다.', true));
      }
    }
    if (Object.hasOwn(result, 'const')) {
      result.enum = [result.const];
      delete result.const;
    }
    if (typeof result.exclusiveMinimum === 'number') {
      result.minimum = result.exclusiveMinimum;
      result.exclusiveMinimum = true;
    }
    if (typeof result.exclusiveMaximum === 'number') {
      result.maximum = result.exclusiveMaximum;
      result.exclusiveMaximum = true;
    }
    for (const key of unsupported) {
      if (!Object.hasOwn(result, key)) continue;
      result[`x-toolhub-original-${key}`] = result[key];
      delete result[key];
      diagnostics.push(conversionDiagnostic('LOSSY_UNSUPPORTED_SCHEMA_KEYWORD', 'warning', `${pointer}/${key}`, `OpenAPI 3.0에서 지원하지 않는 ${key}를 확장 필드에 보존했습니다.`, true));
    }
    return result;
  }) as OpenApiDocument;
  if (Object.hasOwn(transformed, 'webhooks')) {
    transformed['x-toolhub-original-webhooks'] = transformed.webhooks;
    delete transformed.webhooks;
    diagnostics.push(conversionDiagnostic('LOSSY_UNSUPPORTED_ROOT_FEATURE', 'warning', '/webhooks', 'OpenAPI 3.0에서 지원하지 않는 webhooks를 확장 필드에 보존했습니다.', true));
  }
  transformed.openapi = '3.0.4';
  return { document: transformed, diagnostics };
}

function escapePointerToken(token: string): string {
  return token.replaceAll('~', '~0').replaceAll('/', '~1');
}

function preserveOas32Field(record: RecordValue, key: string, pointer: string, diagnostics: Diagnostic[]): void {
  if (!Object.hasOwn(record, key)) return;
  record[`x-toolhub-original-${key}`] = record[key];
  delete record[key];
  diagnostics.push(conversionDiagnostic(
    'LOSSY_UNSUPPORTED_OAS32_FEATURE',
    'warning',
    `${pointer}/${escapePointerToken(key)}`,
    `OpenAPI 3.1에서 지원하지 않는 OpenAPI 3.2 ${key}를 확장 필드에 보존했습니다.`,
    true,
  ));
}

function isReference(value: unknown): boolean {
  return isRecord(value) && typeof value.$ref === 'string';
}

function downgradeOas32Example(value: unknown, pointer: string, diagnostics: Diagnostic[]): void {
  if (!isRecord(value) || isReference(value)) return;
  for (const key of ['dataValue', 'serializedValue']) preserveOas32Field(value, key, pointer, diagnostics);
}

function downgradeOas32Examples(value: unknown, pointer: string, diagnostics: Diagnostic[]): void {
  if (!isRecord(value)) return;
  for (const [name, example] of Object.entries(value)) downgradeOas32Example(example, `${pointer}/${escapePointerToken(name)}`, diagnostics);
}

function downgradeOas32Schema(value: unknown, pointer: string, diagnostics: Diagnostic[]): void {
  if (!isRecord(value) || isReference(value)) return;
  if (isRecord(value.xml)) preserveOas32Field(value.xml, 'nodeType', `${pointer}/xml`, diagnostics);
  if (isRecord(value.discriminator)) preserveOas32Field(value.discriminator, 'defaultMapping', `${pointer}/discriminator`, diagnostics);
  for (const key of ['items', 'contains', 'not', 'if', 'then', 'else', 'propertyNames', 'contentSchema']) {
    downgradeOas32Schema(value[key], `${pointer}/${key}`, diagnostics);
  }
  for (const key of ['prefixItems', 'allOf', 'anyOf', 'oneOf']) {
    if (!Array.isArray(value[key])) continue;
    value[key].forEach((item, index) => downgradeOas32Schema(item, `${pointer}/${key}/${index}`, diagnostics));
  }
  for (const key of ['properties', 'patternProperties', 'dependentSchemas', '$defs']) {
    if (!isRecord(value[key])) continue;
    for (const [name, schema] of Object.entries(value[key])) downgradeOas32Schema(schema, `${pointer}/${key}/${escapePointerToken(name)}`, diagnostics);
  }
  for (const key of ['additionalProperties', 'unevaluatedProperties']) {
    downgradeOas32Schema(value[key], `${pointer}/${key}`, diagnostics);
  }
}

function downgradeOas32Header(value: unknown, pointer: string, diagnostics: Diagnostic[]): void {
  if (!isRecord(value) || isReference(value)) return;
  downgradeOas32Schema(value.schema, `${pointer}/schema`, diagnostics);
  downgradeOas32Content(value.content, `${pointer}/content`, diagnostics);
  downgradeOas32Examples(value.examples, `${pointer}/examples`, diagnostics);
}

function downgradeOas32MediaType(value: unknown, pointer: string, diagnostics: Diagnostic[]): void {
  if (!isRecord(value) || isReference(value)) return;
  for (const key of ['itemSchema', 'itemEncoding', 'prefixEncoding']) preserveOas32Field(value, key, pointer, diagnostics);
  downgradeOas32Schema(value.schema, `${pointer}/schema`, diagnostics);
  downgradeOas32Examples(value.examples, `${pointer}/examples`, diagnostics);
  if (!isRecord(value.encoding)) return;
  for (const [name, encoding] of Object.entries(value.encoding)) {
    if (!isRecord(encoding) || isReference(encoding) || !isRecord(encoding.headers)) continue;
    for (const [headerName, header] of Object.entries(encoding.headers)) {
      downgradeOas32Header(header, `${pointer}/encoding/${escapePointerToken(name)}/headers/${escapePointerToken(headerName)}`, diagnostics);
    }
  }
}

function downgradeOas32Content(value: unknown, pointer: string, diagnostics: Diagnostic[]): void {
  if (!isRecord(value)) return;
  for (const [mediaType, media] of Object.entries(value)) downgradeOas32MediaType(media, `${pointer}/${escapePointerToken(mediaType)}`, diagnostics);
}

function downgradeOas32Parameter(value: unknown, pointer: string, diagnostics: Diagnostic[]): void {
  if (!isRecord(value) || isReference(value)) return;
  if (value.in === 'querystring') {
    value['x-toolhub-original-in'] = 'querystring';
    value.in = 'query';
    diagnostics.push(conversionDiagnostic(
      'LOSSY_UNSUPPORTED_OAS32_FEATURE',
      'warning',
      `${pointer}/in`,
      'OpenAPI 3.1은 querystring parameter를 지원하지 않아 query parameter와 확장 필드로 보존했습니다.',
      true,
    ));
  }
  downgradeOas32Schema(value.schema, `${pointer}/schema`, diagnostics);
  downgradeOas32Content(value.content, `${pointer}/content`, diagnostics);
  downgradeOas32Examples(value.examples, `${pointer}/examples`, diagnostics);
}

function downgradeOas32Parameters(value: unknown, pointer: string, diagnostics: Diagnostic[]): void {
  if (!Array.isArray(value)) return;
  value.forEach((parameter, index) => downgradeOas32Parameter(parameter, `${pointer}/${index}`, diagnostics));
}

function downgradeOas32RequestBody(value: unknown, pointer: string, diagnostics: Diagnostic[]): void {
  if (!isRecord(value) || isReference(value)) return;
  downgradeOas32Content(value.content, `${pointer}/content`, diagnostics);
}

function downgradeOas32Response(value: unknown, pointer: string, diagnostics: Diagnostic[]): void {
  if (!isRecord(value) || isReference(value)) return;
  preserveOas32Field(value, 'summary', pointer, diagnostics);
  downgradeOas32Content(value.content, `${pointer}/content`, diagnostics);
  if (!isRecord(value.headers)) return;
  for (const [name, header] of Object.entries(value.headers)) downgradeOas32Header(header, `${pointer}/headers/${escapePointerToken(name)}`, diagnostics);
}

function downgradeOas32Callbacks(value: unknown, pointer: string, diagnostics: Diagnostic[]): void {
  if (!isRecord(value)) return;
  for (const [name, callback] of Object.entries(value)) {
    if (!isRecord(callback) || isReference(callback)) continue;
    for (const [expression, item] of Object.entries(callback)) downgradeOas32PathItem(item, `${pointer}/${escapePointerToken(name)}/${escapePointerToken(expression)}`, diagnostics);
  }
}

function downgradeOas32Operation(value: unknown, pointer: string, diagnostics: Diagnostic[]): void {
  if (!isRecord(value) || isReference(value)) return;
  downgradeOas32Parameters(value.parameters, `${pointer}/parameters`, diagnostics);
  downgradeOas32RequestBody(value.requestBody, `${pointer}/requestBody`, diagnostics);
  if (isRecord(value.responses)) {
    for (const [status, response] of Object.entries(value.responses)) downgradeOas32Response(response, `${pointer}/responses/${escapePointerToken(status)}`, diagnostics);
  }
  downgradeOas32Callbacks(value.callbacks, `${pointer}/callbacks`, diagnostics);
}

function downgradeOas32PathItem(value: unknown, pointer: string, diagnostics: Diagnostic[]): void {
  if (!isRecord(value) || isReference(value)) return;
  for (const key of ['query', 'additionalOperations']) preserveOas32Field(value, key, pointer, diagnostics);
  downgradeOas32Parameters(value.parameters, `${pointer}/parameters`, diagnostics);
  for (const method of ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace']) {
    downgradeOas32Operation(value[method], `${pointer}/${method}`, diagnostics);
  }
}

function downgradeOas32Components(value: unknown, pointer: string, diagnostics: Diagnostic[]): void {
  if (!isRecord(value)) return;
  preserveOas32Field(value, 'mediaTypes', pointer, diagnostics);
  if (isRecord(value.schemas)) for (const [name, schema] of Object.entries(value.schemas)) downgradeOas32Schema(schema, `${pointer}/schemas/${escapePointerToken(name)}`, diagnostics);
  if (isRecord(value.responses)) for (const [name, response] of Object.entries(value.responses)) downgradeOas32Response(response, `${pointer}/responses/${escapePointerToken(name)}`, diagnostics);
  if (isRecord(value.parameters)) for (const [name, parameter] of Object.entries(value.parameters)) downgradeOas32Parameter(parameter, `${pointer}/parameters/${escapePointerToken(name)}`, diagnostics);
  if (isRecord(value.examples)) for (const [name, example] of Object.entries(value.examples)) downgradeOas32Example(example, `${pointer}/examples/${escapePointerToken(name)}`, diagnostics);
  if (isRecord(value.requestBodies)) for (const [name, body] of Object.entries(value.requestBodies)) downgradeOas32RequestBody(body, `${pointer}/requestBodies/${escapePointerToken(name)}`, diagnostics);
  if (isRecord(value.headers)) for (const [name, header] of Object.entries(value.headers)) downgradeOas32Header(header, `${pointer}/headers/${escapePointerToken(name)}`, diagnostics);
  downgradeOas32Callbacks(value.callbacks, `${pointer}/callbacks`, diagnostics);
  if (isRecord(value.pathItems)) for (const [name, item] of Object.entries(value.pathItems)) downgradeOas32PathItem(item, `${pointer}/pathItems/${escapePointerToken(name)}`, diagnostics);
}

function openApi32To31(document: OpenApiDocument): ConversionResult {
  const transformed = clone(document);
  const diagnostics: Diagnostic[] = [];

  preserveOas32Field(transformed, '$self', '', diagnostics);
  if (Array.isArray(transformed.tags)) {
    transformed.tags.forEach((tag, index) => {
      if (!isRecord(tag)) return;
      for (const key of ['summary', 'parent', 'kind']) preserveOas32Field(tag, key, `/tags/${index}`, diagnostics);
    });
  }
  if (isRecord(transformed.paths)) for (const [path, item] of Object.entries(transformed.paths)) downgradeOas32PathItem(item, `/paths/${escapePointerToken(path)}`, diagnostics);
  if (isRecord(transformed.webhooks)) for (const [name, item] of Object.entries(transformed.webhooks)) downgradeOas32PathItem(item, `/webhooks/${escapePointerToken(name)}`, diagnostics);
  if (isRecord(transformed.components) && isRecord(transformed.components.securitySchemes)) {
    for (const [name, scheme] of Object.entries(transformed.components.securitySchemes)) {
      if (!isRecord(scheme)) continue;
      const pointer = `/components/securitySchemes/${escapePointerToken(name)}`;
      preserveOas32Field(scheme, 'oauth2MetadataUrl', pointer, diagnostics);
      if (isRecord(scheme.flows)) preserveOas32Field(scheme.flows, 'deviceAuthorization', `${pointer}/flows`, diagnostics);
    }
  }
  downgradeOas32Components(transformed.components, '/components', diagnostics);
  transformed.openapi = '3.1.2';
  return { document: transformed, diagnostics };
}

function openApi31To32(document: OpenApiDocument): ConversionResult {
  const transformed = clone(document);
  transformed.openapi = '3.2.0';
  return { document: transformed, diagnostics: [] };
}

function firstMediaType(content: unknown): [string, RecordValue] | undefined {
  if (!isRecord(content)) return undefined;
  const entry = Object.entries(content).find((entry): entry is [string, RecordValue] => isRecord(entry[1]));
  return entry;
}

function openApiResponseToSwagger(value: unknown, pointer: string, diagnostics: Diagnostic[]): unknown {
  if (!isRecord(value) || typeof value.$ref === 'string') return clone(value);
  const { content, ...rest } = value;
  const media = firstMediaType(content);
  if (!media) return rest;
  const [type, body] = media;
  if (isRecord(content) && Object.keys(content).length > 1) diagnostics.push(conversionDiagnostic('LOSSY_MULTIPLE_MEDIA_TYPES', 'warning', pointer, `응답의 첫 번째 미디어 타입 ${type}만 Swagger 2.0에 반영했습니다.`, true));
  return { ...rest, ...(body.schema === undefined ? {} : { schema: clone(body.schema) }), ...(body.examples === undefined ? {} : { examples: clone(body.examples) }) };
}

function openApiOperationToSwagger(value: unknown, pointer: string, diagnostics: Diagnostic[]): unknown {
  if (!isRecord(value)) return clone(value);
  const { requestBody, responses, parameters: candidateParameters, callbacks, ...rest } = value;
  const parameters = Array.isArray(candidateParameters) ? clone(candidateParameters) : [];
  const result: RecordValue = { ...rest };
  if (isRecord(requestBody)) {
    const media = firstMediaType(requestBody.content);
    if (media) {
      const [type, body] = media;
      if (isRecord(requestBody.content) && Object.keys(requestBody.content).length > 1) diagnostics.push(conversionDiagnostic('LOSSY_MULTIPLE_MEDIA_TYPES', 'warning', `${pointer}/requestBody`, `요청 본문의 첫 번째 미디어 타입 ${type}만 Swagger 2.0에 반영했습니다.`, true));
      parameters.push({ in: 'body', name: 'body', ...(requestBody.description === undefined ? {} : { description: requestBody.description }), ...(requestBody.required === true ? { required: true } : {}), ...(body.schema === undefined ? {} : { schema: clone(body.schema) }) });
      result.consumes = [type];
    }
  }
  const mappedParameters = parameters.map((parameter, index) => {
    if (!isRecord(parameter) || parameter.in !== 'cookie') return parameter;
    diagnostics.push(conversionDiagnostic('LOSSY_COOKIE_PARAMETER', 'warning', `${pointer}/parameters/${index}`, 'Swagger 2.0은 cookie parameter를 지원하지 않아 헤더로 보존했습니다.', true));
    return { ...parameter, in: 'header', name: `Cookie-${typeof parameter.name === 'string' ? parameter.name : 'parameter'}`, 'x-toolhub-original-in': 'cookie' };
  });
  if (mappedParameters.length > 0) result.parameters = mappedParameters;
  if (isRecord(responses)) result.responses = Object.fromEntries(Object.entries(responses).map(([status, response]) => [status, openApiResponseToSwagger(response, `${pointer}/responses/${status}`, diagnostics)]));
  if (callbacks !== undefined) {
    result['x-toolhub-original-callbacks'] = clone(callbacks);
    diagnostics.push(conversionDiagnostic('LOSSY_UNSUPPORTED_OPERATION_FEATURE', 'warning', `${pointer}/callbacks`, 'Swagger 2.0은 callbacks를 지원하지 않아 확장 필드에 보존했습니다.', true));
  }
  return result;
}

function openApiPathsToSwagger(value: unknown, diagnostics: Diagnostic[]): unknown {
  if (!isRecord(value)) return {};
  const operations = new Set(['get', 'put', 'post', 'delete', 'options', 'head', 'patch']);
  return Object.fromEntries(Object.entries(value).map(([path, item]) => {
    if (!isRecord(item)) return [path, clone(item)];
    return [path, Object.fromEntries(Object.entries(item).map(([key, operation]) => [key, operations.has(key) ? openApiOperationToSwagger(operation, `/paths/${path}/${key}`, diagnostics) : clone(operation)]))];
  }));
}

function securitySchemesToSwagger(value: unknown): unknown {
  if (!isRecord(value)) return undefined;
  return Object.fromEntries(Object.entries(value).map(([name, item]) => {
    if (!isRecord(item)) return [name, clone(item)];
    if (item.type === 'http' && item.scheme === 'basic') {
      const rest = clone(item);
      delete rest.scheme;
      return [name, { ...rest, type: 'basic' }];
    }
    return [name, clone(item)];
  }));
}

function parseFirstServer(document: OpenApiDocument, diagnostics: Diagnostic[]): RecordValue {
  const servers = Array.isArray(document.servers) ? document.servers.filter(isRecord) : [];
  if (servers.length === 0 || typeof servers[0]!.url !== 'string') return {};
  if (servers.length > 1) diagnostics.push(conversionDiagnostic('LOSSY_MULTIPLE_SERVERS', 'warning', '/servers', '첫 번째 서버만 Swagger 2.0에 반영했습니다.', true));
  try {
    const url = new URL(servers[0]!.url);
    return { schemes: [url.protocol.replace(':', '')], host: url.host, basePath: url.pathname || '/' };
  } catch {
    diagnostics.push(conversionDiagnostic('LOSSY_SERVER_URL', 'warning', '/servers/0/url', '상대 서버 URL은 Swagger 2.0 host로 변환할 수 없습니다.', true));
    return { 'x-toolhub-original-servers': clone(servers) };
  }
}

function openApiToSwagger(document: OpenApiDocument): ConversionResult {
  const diagnostics: Diagnostic[] = [];
  const components = isRecord(document.components) ? document.components : {};
  const securityDefinitions = securitySchemesToSwagger(components.securitySchemes);
  const target: OpenApiDocument = {
    ...extensionFields(document),
    ...extensionFields(components),
    swagger: '2.0',
    info: isRecord(document.info) ? clone(document.info) : { title: 'Untitled API', version: '1.0.0' },
    ...parseFirstServer(document, diagnostics),
    paths: openApiPathsToSwagger(document.paths, diagnostics),
    ...(isRecord(components.schemas) ? { definitions: clone(components.schemas) } : {}),
    ...(isRecord(components.parameters) ? { parameters: clone(components.parameters) } : {}),
    ...(isRecord(components.responses) ? { responses: clone(components.responses) } : {}),
    ...(securityDefinitions === undefined ? {} : { securityDefinitions }),
    ...(Array.isArray(document.tags) ? { tags: clone(document.tags) } : {}),
    ...(Array.isArray(document.security) ? { security: clone(document.security) } : {}),
    ...(document.externalDocs === undefined ? {} : { externalDocs: clone(document.externalDocs) }),
  };
  for (const key of ['webhooks', 'callbacks', 'links']) {
    if (!Object.hasOwn(document, key)) continue;
    target[`x-toolhub-original-${key}`] = clone(document[key]);
    diagnostics.push(conversionDiagnostic('LOSSY_UNSUPPORTED_ROOT_FEATURE', 'warning', `/${key}`, `Swagger 2.0에서 지원하지 않는 ${key}를 확장 필드에 보존했습니다.`, true));
  }
  return {
    document: rewriteReferences(target, [
      ['#/components/schemas/', '#/definitions/'],
      ['#/components/parameters/', '#/parameters/'],
      ['#/components/responses/', '#/responses/'],
      ['#/components/securitySchemes/', '#/securityDefinitions/'],
    ]) as OpenApiDocument,
    diagnostics,
  };
}

function normalize(document: OpenApiDocument, family: SpecFamily): ConversionResult {
  const output = clone(document);
  if (family === 'swagger-2.0') output.swagger = '2.0';
  else output.openapi = family === 'openapi-3.0' ? '3.0.4' : family === 'openapi-3.1' ? '3.1.2' : '3.2.0';
  return {
    document: output,
    diagnostics: [conversionDiagnostic('NORMALIZED_PATCH_VERSION', 'info', '', '대상 계열의 최신 지원 패치 버전으로 정규화했습니다.')],
  };
}

export function convertDocument(document: OpenApiDocument, source: SpecFamily, target: SpecFamily): ConversionResult {
  if (source === target) return normalize(document, target);
  if (source === 'swagger-2.0') {
    const up = swaggerToOpenApi30(document);
    if (target === 'openapi-3.0') return up;
    const up31 = openApi30To31(up.document);
    if (target === 'openapi-3.1') return { document: up31.document, diagnostics: [...up.diagnostics, ...up31.diagnostics] };
    const up32 = openApi31To32(up31.document);
    return { document: up32.document, diagnostics: [...up.diagnostics, ...up31.diagnostics, ...up32.diagnostics] };
  }
  if (source === 'openapi-3.0') {
    if (target === 'openapi-3.1') return openApi30To31(document);
    if (target === 'openapi-3.2') {
      const up31 = openApi30To31(document);
      const up32 = openApi31To32(up31.document);
      return { document: up32.document, diagnostics: [...up31.diagnostics, ...up32.diagnostics] };
    }
    return openApiToSwagger(document);
  }
  if (source === 'openapi-3.1') {
    if (target === 'openapi-3.2') return openApi31To32(document);
    const down = openApi31To30(document);
    if (target === 'openapi-3.0') return down;
    const swagger = openApiToSwagger(down.document);
    return { document: swagger.document, diagnostics: [...down.diagnostics, ...swagger.diagnostics] };
  }
  const down31 = openApi32To31(document);
  if (target === 'openapi-3.1') return down31;
  const down30 = openApi31To30(down31.document);
  if (target === 'openapi-3.0') return { document: down30.document, diagnostics: [...down31.diagnostics, ...down30.diagnostics] };
  const swagger = openApiToSwagger(down30.document);
  return { document: swagger.document, diagnostics: [...down31.diagnostics, ...down30.diagnostics, ...swagger.diagnostics] };
}
