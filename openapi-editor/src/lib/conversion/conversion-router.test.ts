import { describe, expect, it } from 'vitest';
import { sampleDocumentFor } from '../../data/spec-samples';
import type { SpecFamily } from '../../domain/document';
import { convertDocument } from './conversion-router';

const swagger = {
  swagger: '2.0',
  info: { title: 'Pets', version: '1.0.0' },
  host: 'api.example.com',
  basePath: '/v1',
  schemes: ['https'],
  produces: ['application/json'],
  definitions: { Pet: { type: 'object', properties: { id: { type: 'integer' } } } },
  paths: { '/pets': { get: { operationId: 'listPets', responses: { '200': { description: 'OK', schema: { $ref: '#/definitions/Pet' } } } } } },
};

describe('convertDocument', () => {
  it.each([
    ['swagger-2.0', 'openapi-3.0'], ['swagger-2.0', 'openapi-3.1'], ['swagger-2.0', 'openapi-3.2'],
    ['openapi-3.0', 'swagger-2.0'], ['openapi-3.0', 'openapi-3.1'], ['openapi-3.0', 'openapi-3.2'],
    ['openapi-3.1', 'swagger-2.0'], ['openapi-3.1', 'openapi-3.0'], ['openapi-3.1', 'openapi-3.2'],
    ['openapi-3.2', 'swagger-2.0'], ['openapi-3.2', 'openapi-3.0'], ['openapi-3.2', 'openapi-3.1'],
  ] as Array<[SpecFamily, SpecFamily]>)('routes %s documents to %s', (source, target) => {
    const result = convertDocument(sampleDocumentFor(source), source, target);
    const expectedVersion = target === 'swagger-2.0' ? { swagger: '2.0' } : { openapi: target === 'openapi-3.0' ? '3.0.4' : target === 'openapi-3.1' ? '3.1.2' : '3.2.0' };

    expect(result.document).toMatchObject(expectedVersion);
    expect(result.diagnostics.some((item) => item.severity === 'error')).toBe(false);
  });

  it('converts Swagger 2.0 to normalized OpenAPI 3.1 through the documented chain', () => {
    const result = convertDocument(swagger, 'swagger-2.0', 'openapi-3.1');

    expect(result.document).toMatchObject({
      openapi: '3.1.2',
      servers: [{ url: 'https://api.example.com/v1' }],
      components: { schemas: { Pet: { type: 'object' } } },
    });
    expect(result.document.paths).toMatchObject({
      '/pets': { get: { responses: { '200': { content: { 'application/json': { schema: { $ref: '#/components/schemas/Pet' } } } } } } },
    });
  });

  it('converts nullable OpenAPI 3.0 schema values to OpenAPI 3.1 type arrays', () => {
    const result = convertDocument({
      openapi: '3.0.4', info: { title: 'Pets', version: '1' }, paths: {},
      components: { schemas: { Pet: { type: 'string', nullable: true } } },
    }, 'openapi-3.0', 'openapi-3.1');

    expect(result.document).toMatchObject({ openapi: '3.1.2', components: { schemas: { Pet: { type: ['string', 'null'] } } } });
  });

  it('promotes OpenAPI 3.1 documents to OpenAPI 3.2 without changing compatible fields', () => {
    const result = convertDocument({
      openapi: '3.1.2', info: { title: 'Pets', version: '1' }, paths: { '/pets': { get: { responses: { '200': { description: 'OK' } } } } },
    }, 'openapi-3.1', 'openapi-3.2');

    expect(result.document).toMatchObject({ openapi: '3.2.0', paths: { '/pets': { get: { responses: { '200': { description: 'OK' } } } } } });
    expect(result.diagnostics).toEqual([]);
  });

  it('preserves OpenAPI 3.2-only fields in extensions before converting to 3.1', () => {
    const result = convertDocument({
      openapi: '3.2.0',
      $self: 'https://example.com/openapi.yaml',
      info: { title: 'Tasks', version: '1' },
      tags: [{ name: 'tasks', summary: 'Tasks', kind: 'navigation' }],
      paths: {
        '/tasks': {
          get: { responses: { '200': { description: 'OK', content: { 'text/event-stream': { itemSchema: { type: 'string' } } } } } },
          query: { responses: { '200': { description: 'OK' } } },
          additionalOperations: { COPY: { responses: { '204': { description: 'Copied' } } } },
        },
      },
      components: {
        securitySchemes: {
          device: {
            type: 'oauth2',
            oauth2MetadataUrl: 'https://example.com/.well-known/oauth-authorization-server',
            flows: { deviceAuthorization: { deviceAuthorizationUrl: 'https://example.com/device', tokenUrl: 'https://example.com/token', scopes: {} } },
          },
        },
      },
    }, 'openapi-3.2', 'openapi-3.1');

    expect(result.document).toMatchObject({
      openapi: '3.1.2',
      'x-toolhub-original-$self': 'https://example.com/openapi.yaml',
      tags: [{ 'x-toolhub-original-summary': 'Tasks', 'x-toolhub-original-kind': 'navigation' }],
      paths: {
        '/tasks': {
          'x-toolhub-original-query': expect.any(Object),
          'x-toolhub-original-additionalOperations': expect.any(Object),
          get: { responses: { '200': { content: { 'text/event-stream': { 'x-toolhub-original-itemSchema': { type: 'string' } } } } } },
        },
      },
      components: { securitySchemes: { device: { 'x-toolhub-original-oauth2MetadataUrl': expect.any(String), flows: { 'x-toolhub-original-deviceAuthorization': expect.any(Object) } } } },
    });
    expect(result.diagnostics).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'LOSSY_UNSUPPORTED_OAS32_FEATURE', lossy: true }),
    ]));
  });

  it('does not rewrite OpenAPI example data that happens to use 3.2 field names', () => {
    const example = { itemSchema: { type: 'string' }, dataValue: { nodeType: 'value' }, serializedValue: 'raw', in: 'querystring' };
    const result = convertDocument({
      openapi: '3.2.0',
      info: { title: 'Examples', version: '1' },
      paths: {
        '/examples': {
          get: {
            responses: {
              '200': {
                description: 'OK',
                content: { 'application/json': { schema: { type: 'object', example }, itemSchema: { type: 'object' } } },
              },
            },
          },
        },
      },
    }, 'openapi-3.2', 'openapi-3.1');

    expect(result.document).toMatchObject({
      paths: { '/examples': { get: { responses: { '200': { content: { 'application/json': {
        schema: { example },
        'x-toolhub-original-itemSchema': { type: 'object' },
      } } } } } } },
    });
  });

  it('preserves all remaining OpenAPI 3.2-only fields across 3.1 and Swagger conversions', () => {
    const document = {
      openapi: '3.2.0',
      info: { title: 'Feature inventory', version: '1' },
      paths: {
        '/features': {
          get: {
            responses: {
              '200': { summary: 'Feature response', description: 'OK' },
            },
          },
        },
      },
      components: {
        mediaTypes: { EventStream: { schema: { type: 'string' } } },
        schemas: {
          Feature: {
            type: 'object',
            discriminator: { propertyName: 'kind', defaultMapping: '#/components/schemas/DefaultFeature' },
          },
        },
      },
    };

    const openApi31 = convertDocument(document, 'openapi-3.2', 'openapi-3.1');
    expect(openApi31.document).toMatchObject({
      components: {
        'x-toolhub-original-mediaTypes': { EventStream: expect.any(Object) },
        schemas: { Feature: { discriminator: { 'x-toolhub-original-defaultMapping': '#/components/schemas/DefaultFeature' } } },
      },
      paths: { '/features': { get: { responses: { '200': { 'x-toolhub-original-summary': 'Feature response' } } } } },
    });

    const swagger = convertDocument(document, 'openapi-3.2', 'swagger-2.0');
    expect(swagger.document).toMatchObject({
      'x-toolhub-original-mediaTypes': { EventStream: expect.any(Object) },
      definitions: { Feature: { discriminator: { 'x-toolhub-original-defaultMapping': '#/components/schemas/DefaultFeature' } } },
      paths: { '/features': { get: { responses: { '200': { 'x-toolhub-original-summary': 'Feature response' } } } } },
    });
    expect(swagger.diagnostics.filter((item) => item.code === 'LOSSY_UNSUPPORTED_OAS32_FEATURE')).toHaveLength(3);
  });

  it('warns when a 3.1-only schema keyword is preserved during a down conversion', () => {
    const result = convertDocument({
      openapi: '3.1.2', info: { title: 'Pets', version: '1' }, paths: {},
      components: { schemas: { Pet: { type: 'string', unevaluatedProperties: false } } },
    }, 'openapi-3.1', 'openapi-3.0');

    expect(result.document).toMatchObject({ openapi: '3.0.4' });
    expect(result.diagnostics).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'LOSSY_UNSUPPORTED_SCHEMA_KEYWORD', lossy: true }),
    ]));
  });
});
