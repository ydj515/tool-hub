export type DocumentFormat = 'yaml' | 'json';

export type SpecFamily = 'swagger-2.0' | 'openapi-3.0' | 'openapi-3.1' | 'openapi-3.2';

export type Severity = 'info' | 'warning' | 'error';

export type DiagnosticStage = 'parse' | 'validate' | 'convert' | 'reconcile' | 'render';

export type OpenApiDocument = Record<string, unknown>;

export interface SourceLocation {
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
}

export interface Diagnostic {
  id: string;
  code: string;
  severity: Severity;
  stage: DiagnosticStage;
  message: string;
  sourcePointer: string;
  targetPointer?: string;
  location?: SourceLocation;
  action?: string;
  lossy: boolean;
}

export interface ParsedDocument {
  raw: string;
  format: DocumentFormat;
  version?: SpecFamily;
  value?: OpenApiDocument;
  pointerLocations: Record<string, SourceLocation>;
  diagnostics: Diagnostic[];
}

export interface AnalysisResult {
  parsed: ParsedDocument;
  version?: SpecFamily;
  diagnostics: Diagnostic[];
  internalReferenceCount: number;
  externalReferenceCount: number;
}

export interface ConversionCandidate {
  revision: number;
  sourceVersion: SpecFamily;
  targetVersion: SpecFamily;
  sourceSnapshot: string;
  targetDocument: OpenApiDocument;
  targetText: string;
  diagnostics: Diagnostic[];
  targetValid: boolean;
}

export type WorkspaceStatus = 'idle' | 'analyzing' | 'valid' | 'invalid' | 'converting' | 'reviewing' | 'worker-error';
