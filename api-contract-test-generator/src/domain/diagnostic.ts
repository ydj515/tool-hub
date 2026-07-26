export interface SourceLocation {
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
}

export type DiagnosticStage = 'parse' | 'validate' | 'reference' | 'normalize' | 'generate' | 'export';

export interface Diagnostic {
  id: string;
  code: string;
  severity: 'info' | 'warning' | 'error';
  stage: DiagnosticStage;
  message: string;
  sourcePointer: string;
  location?: SourceLocation;
  action?: string;
  blocking: boolean;
}

export function createDiagnostic(
  code: string,
  message: string,
  options: Partial<Omit<Diagnostic, 'id' | 'code' | 'message'>> = {},
): Diagnostic {
  return {
    id: [
      code,
      options.sourcePointer ?? '',
      options.location?.startLine ?? 0,
      options.location?.startColumn ?? 0,
      options.location?.endLine ?? 0,
      options.location?.endColumn ?? 0,
    ].join(':'),
    code,
    message,
    severity: options.severity ?? 'error',
    stage: options.stage ?? 'validate',
    sourcePointer: options.sourcePointer ?? '',
    blocking: options.blocking ?? true,
    ...options,
  };
}
