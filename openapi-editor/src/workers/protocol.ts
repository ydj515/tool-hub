import type { AnalysisResult, ConversionCandidate, DocumentFormat, OpenApiDocument, SpecFamily } from '../domain/document';

export type WorkerRequest =
  | { type: 'analyze'; revision: number; raw: string; filename?: string; formatHint?: DocumentFormat }
  | { type: 'convert'; revision: number; document: OpenApiDocument; source: SpecFamily; target: SpecFamily; sourceSnapshot: string; outputFormat: DocumentFormat };

export type WorkerResponse =
  | { type: 'analysis-result'; revision: number; result: AnalysisResult }
  | { type: 'conversion-result'; revision: number; candidate: ConversionCandidate }
  | { type: 'worker-error'; revision: number; error: { message: string } };

export function acceptsRevision(responseRevision: number, latestRevision: number): boolean {
  return responseRevision === latestRevision;
}
