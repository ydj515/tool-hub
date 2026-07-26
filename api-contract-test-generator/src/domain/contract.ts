import type { Diagnostic, SourceLocation } from './diagnostic';

export type SpecVersion = 'openapi-3.0' | 'openapi-3.1' | 'openapi-3.2';
export type OpenApiDocument = Record<string, unknown>;

export interface NormalizedSchema {
  pointer: string;
  identity: string;
  type?: 'string' | 'number' | 'integer' | 'boolean' | 'object' | 'array' | 'null';
  nullable: boolean;
  required: string[];
  properties: Record<string, NormalizedSchema>;
  items?: NormalizedSchema;
  oneOf?: NormalizedSchema[];
  anyOf?: NormalizedSchema[];
  additionalProperties?: boolean | NormalizedSchema;
  enum?: unknown[];
  constValue?: unknown;
  examples?: unknown[];
  example?: unknown;
  defaultValue?: unknown;
  minimum?: number;
  maximum?: number;
  exclusiveMinimum?: number;
  exclusiveMaximum?: number;
  multipleOf?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  format?: string;
  minItems?: number;
  maxItems?: number;
  uniqueItems: boolean;
}

export interface NormalizedParameter {
  name: string;
  location: 'path' | 'query' | 'header' | 'cookie';
  required: boolean;
  style: 'simple' | 'form';
  explode: boolean;
  schema: NormalizedSchema;
  sourcePointer: string;
}

export interface NormalizedSecurityScheme {
  name: string;
  type: 'http-bearer' | 'http-basic' | 'oauth2' | 'api-key-header' | 'api-key-query' | 'api-key-cookie';
  parameterName?: string;
  sourcePointer: string;
}

export type SecurityAlternative = NormalizedSecurityScheme[];

export interface NormalizedEndpoint {
  id: string;
  method: string;
  path: string;
  summary?: string;
  tags: string[];
  parameters: NormalizedParameter[];
  requestBody?: NormalizedSchema;
  requestBodyRequired: boolean;
  requestBodyMediaType?: string;
  responses: string[];
  security: SecurityAlternative[];
  incomplete: boolean;
  sourcePointer: string;
}

export interface NormalizedContract {
  title: string;
  apiVersion: string;
  specVersion: SpecVersion;
  serverUrl?: string;
  endpoints: NormalizedEndpoint[];
  diagnostics: Diagnostic[];
}

export type ParseResult =
  | {
      ok: true;
      format: 'yaml' | 'json';
      version: SpecVersion;
      document: OpenApiDocument;
      pointerLocations: Record<string, SourceLocation>;
      diagnostics: Diagnostic[];
    }
  | {
      ok: false;
      format: 'yaml' | 'json';
      diagnostics: Diagnostic[];
    };
