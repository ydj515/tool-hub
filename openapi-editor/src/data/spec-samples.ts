import type { OpenApiDocument, SpecFamily } from '../domain/document';

const sampleFactories: Record<SpecFamily, () => OpenApiDocument> = {
  'swagger-2.0': () => ({
    swagger: '2.0',
    info: { title: 'Task API', version: '1.0.0', description: 'Swagger 2.0 예시 명세입니다.' },
    host: 'api.example.com',
    basePath: '/v1',
    schemes: ['https'],
    produces: ['application/json'],
    paths: {
      '/tasks': {
        get: {
          summary: '작업 목록 조회',
          responses: { '200': { description: '작업 목록', schema: { type: 'array', items: { $ref: '#/definitions/Task' } } } },
        },
      },
    },
    definitions: { Task: { type: 'object', required: ['id', 'title'], properties: { id: { type: 'integer', format: 'int64' }, title: { type: 'string' } } } },
  }),
  'openapi-3.0': () => ({
    openapi: '3.0.4',
    info: { title: 'Task API', version: '1.0.0', description: 'OpenAPI 3.0 예시 명세입니다.' },
    servers: [{ url: 'https://api.example.com/v1' }],
    paths: {
      '/tasks': {
        get: {
          summary: '작업 목록 조회',
          responses: { '200': { description: '작업 목록', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Task' } } } } } },
        },
      },
    },
    components: { schemas: { Task: { type: 'object', required: ['id', 'title'], properties: { id: { type: 'integer', format: 'int64' }, title: { type: 'string' }, completedAt: { type: 'string', format: 'date-time', nullable: true } } } } },
  }),
  'openapi-3.1': () => ({
    openapi: '3.1.2',
    info: { title: 'Task API', version: '1.0.0', description: 'OpenAPI 3.1 예시 명세입니다.' },
    servers: [{ url: 'https://api.example.com/v1' }],
    paths: {
      '/tasks': {
        get: {
          summary: '작업 목록 조회',
          responses: { '200': { description: '작업 목록', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Task' } } } } } },
        },
      },
    },
    components: { schemas: { Task: { type: 'object', required: ['id', 'title'], properties: { id: { type: 'integer', format: 'int64' }, title: { type: 'string' }, completedAt: { type: ['string', 'null'], format: 'date-time' } } } } },
  }),
  'openapi-3.2': () => ({
    openapi: '3.2.0',
    info: { title: 'Task API', version: '1.0.0', description: 'OpenAPI 3.2 예시 명세입니다.' },
    servers: [{ url: 'https://api.example.com/v1' }],
    tags: [{ name: 'tasks', summary: '작업', description: '작업 관리 API', kind: 'navigation' }],
    paths: {
      '/tasks': {
        get: {
          tags: ['tasks'],
          summary: '작업 목록 조회',
          responses: { '200': { description: '작업 목록', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Task' } } } } } },
        },
      },
      '/tasks/{taskId}': {
        parameters: [{ name: 'taskId', in: 'path', required: true, schema: { type: 'integer', format: 'int64' } }],
        additionalOperations: {
          COPY: { summary: '작업 복제', responses: { '204': { description: '작업을 복제했습니다.' } } },
        },
      },
    },
    components: { schemas: { Task: { type: 'object', required: ['id', 'title'], properties: { id: { type: 'integer', format: 'int64' }, title: { type: 'string' }, completedAt: { type: ['string', 'null'], format: 'date-time' } } } } },
  }),
};

export function sampleDocumentFor(version: SpecFamily): OpenApiDocument {
  return sampleFactories[version]();
}

export function sampleDownloadFilename(version: SpecFamily): string {
  return `${version}-sample.yaml`;
}
