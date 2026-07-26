import { describe, expect, it } from 'vitest';
import type { OpenApiDocument } from '../../domain/contract';
import { normalizeContract } from './normalize-contract';

function contractDocument(): OpenApiDocument {
  return {
    openapi: '3.1.1',
    info: { title: 'User API', version: '1.0.0' },
    servers: [{ url: 'https://api.example.com' }],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer' },
        apiKey: { type: 'apiKey', in: 'header', name: 'X-API-Key' },
      },
      schemas: {
        CreateUser: {
          type: 'object',
          required: ['email'],
          properties: { email: { type: 'string', format: 'email', minLength: 3 } },
        },
      },
    },
    paths: {
      '/users/{id}': {
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        post: {
          tags: ['Users'],
          parameters: [{ name: 'expand', in: 'query', schema: { type: 'boolean' } }],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateUser' } } },
          },
          responses: { '201': {}, '400': {}, '401': {} },
          security: [{ bearerAuth: [] }, { apiKey: [] }],
        },
      },
    },
  };
}

describe('normalizeContract', () => {
  it('파라미터, JSON 본문, 응답, 보안 대안을 정규화한다', () => {
    const result = normalizeContract(contractDocument(), 'openapi-3.1');

    expect(result.contract.endpoints[0]).toMatchObject({
      method: 'POST',
      path: '/users/{id}',
      tags: ['Users'],
      requestBody: { type: 'object', required: ['email'] },
      responses: ['201', '400', '401'],
      security: [
        [expect.objectContaining({ type: 'http-bearer' })],
        [expect.objectContaining({ type: 'api-key-header', parameterName: 'X-API-Key' })],
      ],
      incomplete: false,
    });
    expect(result.contract.serverUrl).toBe('https://api.example.com');
    expect(result.contract.endpoints[0]?.parameters).toHaveLength(2);
  });

  it('외부 본문 참조가 있는 엔드포인트만 불완전 상태로 둔다', () => {
    const document = contractDocument();
    const paths = document.paths as Record<string, Record<string, unknown>>;
    const operation = paths['/users/{id}']?.post as Record<string, unknown>;
    operation.requestBody = { content: { 'application/json': { schema: { $ref: 'https://example.com/user.yaml' } } } };

    const result = normalizeContract(document, 'openapi-3.1');

    expect(result.contract.endpoints[0]?.incomplete).toBe(true);
    expect(result.diagnostics).toContainEqual(expect.objectContaining({ code: 'EXTERNAL_REFERENCE_UNSUPPORTED', blocking: false }));
  });

  it('경로 파라미터를 작업 파라미터가 덮어쓴다', () => {
    const document = contractDocument();
    const paths = document.paths as Record<string, Record<string, unknown>>;
    const operation = paths['/users/{id}']?.post as Record<string, unknown>;
    operation.parameters = [{ name: 'id', in: 'path', required: true, schema: { type: 'integer', minimum: 1 } }];

    const result = normalizeContract(document, 'openapi-3.1');

    expect(result.contract.endpoints[0]?.parameters).toHaveLength(1);
    expect(result.contract.endpoints[0]?.parameters[0]?.schema).toMatchObject({ type: 'integer', minimum: 1 });
  });

  it('지원되지 않는 보안 스키마가 섞인 AND 대안을 부분 허용하지 않는다', () => {
    const document = contractDocument();
    const components = document.components as Record<string, Record<string, unknown>>;
    const schemes = components.securitySchemes as Record<string, unknown>;
    schemes.oauth = { type: 'oauth2', flows: {} };
    const paths = document.paths as Record<string, Record<string, unknown>>;
    const operation = paths['/users/{id}']?.post as Record<string, unknown>;
    operation.security = [{ bearerAuth: [], oauth: [] }];

    const result = normalizeContract(document, 'openapi-3.1');

    expect(result.contract.endpoints[0]?.security).toEqual([]);
    expect(result.contract.endpoints[0]?.incomplete).toBe(true);
  });

  it('빈 보안 대안을 인증 없는 OR 분기로 보존한다', () => {
    const document = contractDocument();
    const paths = document.paths as Record<string, Record<string, unknown>>;
    const operation = paths['/users/{id}']?.post as Record<string, unknown>;
    operation.security = [{}, { bearerAuth: [] }];

    const result = normalizeContract(document, 'openapi-3.1');

    expect(result.contract.endpoints[0]?.security).toEqual([
      [],
      [expect.objectContaining({ type: 'http-bearer' })],
    ]);
    expect(result.contract.endpoints[0]?.incomplete).toBe(false);
  });

  it('해석할 수 없는 필수 경로 파라미터가 있으면 엔드포인트를 불완전 처리한다', () => {
    const document = contractDocument();
    const paths = document.paths as Record<string, Record<string, unknown>>;
    const pathItem = paths['/users/{id}'] as Record<string, unknown>;
    pathItem.parameters = [{ $ref: 'https://example.com/id.yaml' }];

    const result = normalizeContract(document, 'openapi-3.1');

    expect(result.contract.endpoints[0]?.incomplete).toBe(true);
  });

  it('oneOf, anyOf와 additionalProperties를 보존한다', () => {
    const result = normalizeContract({
      openapi: '3.1.0', info: { title: 'Variants', version: '1' },
      paths: {
        '/events': {
          post: {
            requestBody: { required: true, content: { 'application/json': { schema: {
              type: 'object',
              properties: {
                payload: { oneOf: [{ type: 'string' }, { type: 'integer' }] },
                metadata: { anyOf: [{ type: 'object' }, { type: 'null' }] },
              },
              additionalProperties: false,
            } } } },
            responses: { 204: { description: 'ok' } },
          },
        },
      },
    }, 'openapi-3.1');
    const body = result.contract.endpoints[0]?.requestBody;

    expect(body?.properties.payload.oneOf).toHaveLength(2);
    expect(body?.properties.metadata.anyOf).toHaveLength(2);
    expect(body?.additionalProperties).toBe(false);
  });

  it('파라미터와 미디어 타입 example을 스키마 example보다 우선한다', () => {
    const document = contractDocument();
    const paths = document.paths as Record<string, Record<string, unknown>>;
    const operation = paths['/users/{id}']?.post as Record<string, unknown>;
    operation.parameters = [{ name: 'expand', in: 'query', example: true, schema: { type: 'boolean', example: false } }];
    operation.requestBody = {
      required: true,
      content: { 'application/json': { example: { email: 'media@example.com' }, schema: { $ref: '#/components/schemas/CreateUser' } } },
    };

    const result = normalizeContract(document, 'openapi-3.1');

    expect(result.contract.endpoints[0]?.parameters.find((parameter) => parameter.name === 'expand')?.schema.example).toBe(true);
    expect(result.contract.endpoints[0]?.requestBody?.example).toEqual({ email: 'media@example.com' });
  });

  it('OpenAPI 3.2 QUERY, OAuth2, 표준 포맷과 binary 본문을 정규화한다', () => {
    const result = normalizeContract({
      openapi: '3.2.0',
      info: { title: 'Search API', version: '1' },
      components: {
        securitySchemes: {
          oauth: { type: 'oauth2', flows: { clientCredentials: { tokenUrl: 'https://example.com/token', scopes: {} } } },
        },
      },
      paths: {
        '/assets/{assetId}': {
          query: {
            parameters: [{ name: 'assetId', in: 'path', required: true, schema: { type: 'integer', format: 'int64' } }],
            requestBody: { required: true, content: { 'application/octet-stream': { schema: { type: 'string', format: 'binary' } } } },
            responses: { 200: { description: 'ok' } },
            security: [{ oauth: [] }],
          },
        },
        '/measurements': {
          post: {
            requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { score: { type: 'number', format: 'float' } } } } } },
            responses: { 201: { description: 'created' } },
          },
        },
      },
    }, 'openapi-3.2');

    expect(result.contract.endpoints).toEqual(expect.arrayContaining([
      expect.objectContaining({
        method: 'QUERY',
        requestBodyMediaType: 'application/octet-stream',
        requestBody: expect.objectContaining({ format: 'binary' }),
        security: [[expect.objectContaining({ type: 'oauth2' })]],
        incomplete: false,
      }),
      expect.objectContaining({
        method: 'POST',
        requestBody: expect.objectContaining({ properties: { score: expect.objectContaining({ format: 'float' }) } }),
        incomplete: false,
      }),
    ]));
    expect(result.diagnostics).not.toContainEqual(expect.objectContaining({ code: 'UNSUPPORTED_FORMAT' }));
  });
});
