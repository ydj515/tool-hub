import type { OpenApiDocument } from '../../domain/document';

export interface MeaningInventory {
  paths: Set<string>;
  operations: Set<string>;
  parameters: Set<string>;
  requestMedia: Set<string>;
  responses: Set<string>;
  schemas: Set<string>;
  references: Set<string>;
  securitySchemes: Set<string>;
  servers: Set<string>;
  features: Set<string>;
  extensions: Set<string>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function mediaFromResponses(responses: unknown, result: Set<string>, prefix: string): void {
  if (!isRecord(responses)) return;
  for (const [status, response] of Object.entries(responses)) {
    result.add(`${prefix}:${status}`);
    if (!isRecord(response)) continue;
    if (isRecord(response.content)) for (const media of Object.keys(response.content)) result.add(`${prefix}:${status}:${media}`);
  }
}

function normalizedReference(reference: string): string {
  return reference
    .replace('#/definitions/', '#/schemas/')
    .replace('#/components/schemas/', '#/schemas/')
    .replace('#/parameters/', '#/parameters/')
    .replace('#/components/parameters/', '#/parameters/')
    .replace('#/responses/', '#/responses/')
    .replace('#/components/responses/', '#/responses/');
}

export function collectMeaningInventory(document: OpenApiDocument): MeaningInventory {
  const inventory: MeaningInventory = {
    paths: new Set(), operations: new Set(), parameters: new Set(), requestMedia: new Set(), responses: new Set(),
    schemas: new Set(), references: new Set(), securitySchemes: new Set(), servers: new Set(), features: new Set(), extensions: new Set(),
  };
  const paths = isRecord(document.paths) ? document.paths : {};
  for (const [path, item] of Object.entries(paths)) {
    inventory.paths.add(path);
    if (!isRecord(item)) continue;
    for (const [method, operation] of Object.entries(item)) {
      if (!['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace', 'query'].includes(method) || !isRecord(operation)) continue;
      const key = `${method.toUpperCase()} ${path}`;
      inventory.operations.add(typeof operation.operationId === 'string' ? `${key}:${operation.operationId}` : key);
      for (const parameter of Array.isArray(operation.parameters) ? operation.parameters : []) {
        if (!isRecord(parameter) || typeof parameter.in !== 'string' || typeof parameter.name !== 'string') continue;
        if (parameter.in === 'body' || parameter.in === 'formData') {
          const media = strings(operation.consumes).length > 0 ? strings(operation.consumes) : strings(document.consumes);
          for (const type of media.length > 0 ? media : ['application/json']) inventory.requestMedia.add(`${key}:${type}`);
        } else inventory.parameters.add(`${key}:${parameter.in}:${parameter.name}:${parameter.required === true}`);
      }
      if (isRecord(operation.requestBody) && isRecord(operation.requestBody.content)) for (const media of Object.keys(operation.requestBody.content)) inventory.requestMedia.add(`${key}:${media}`);
      mediaFromResponses(operation.responses, inventory.responses, key);
    }
    if (isRecord(item.additionalOperations)) {
      inventory.features.add('additionalOperations');
      for (const [method, operation] of Object.entries(item.additionalOperations)) {
        if (!isRecord(operation)) continue;
        const key = `${method.toUpperCase()} ${path}`;
        inventory.operations.add(typeof operation.operationId === 'string' ? `${key}:${operation.operationId}` : key);
        mediaFromResponses(operation.responses, inventory.responses, key);
      }
    }
  }
  const schemas = isRecord(document.components) && isRecord(document.components.schemas) ? document.components.schemas : document.definitions;
  if (isRecord(schemas)) for (const name of Object.keys(schemas)) inventory.schemas.add(name);
  const schemes = isRecord(document.components) && isRecord(document.components.securitySchemes) ? document.components.securitySchemes : document.securityDefinitions;
  if (isRecord(schemes)) for (const name of Object.keys(schemes)) inventory.securitySchemes.add(name);
  if (Array.isArray(document.servers)) {
    for (const server of document.servers) if (isRecord(server) && typeof server.url === 'string') inventory.servers.add(server.url);
  } else if (typeof document.host === 'string') {
    inventory.servers.add(`${strings(document.schemes)[0] ?? 'https'}://${document.host}${typeof document.basePath === 'string' ? document.basePath : ''}`);
  }
  for (const key of ['callbacks', 'links', 'webhooks']) if (Object.hasOwn(document, key)) inventory.features.add(key);
  const stack: unknown[] = [document];
  const visited = new WeakSet<object>();
  while (stack.length > 0) {
    const value = stack.pop();
    if (typeof value !== 'object' || value === null || visited.has(value)) continue;
    visited.add(value);
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      if (key === '$ref' && typeof child === 'string') inventory.references.add(normalizedReference(child));
      if (key.startsWith('x-')) inventory.extensions.add(key);
      stack.push(child);
    }
  }
  return inventory;
}

export function missingMeaning(source: MeaningInventory, target: MeaningInventory): string[] {
  return (Object.keys(source) as Array<keyof MeaningInventory>).flatMap((key) => [...source[key]].filter((value) => !target[key].has(value)).map((value) => `${key}:${value}`));
}
