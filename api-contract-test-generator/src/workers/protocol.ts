import type { Diagnostic } from '../domain/diagnostic';
import type { ExportFormat, GenerationResult, TestCaseSelection, TestPlan } from '../domain/test-case';
import type { ExportArtifact } from '../lib/export/export-plan';

export type WorkspaceStatus =
  | 'idle'
  | 'reading-file'
  | 'analyzing'
  | 'invalid'
  | 'partially-valid'
  | 'ready'
  | 'stale'
  | 'generation-failed'
  | 'exporting';

export type WorkerRequest =
  | { type: 'analyze'; revision: number; raw: string; filename?: string; seed: string }
  | { type: 'export'; revision: number; plan: TestPlan; selections: Record<string, TestCaseSelection>; format: ExportFormat };

export type WorkerResponse =
  | ({ type: 'analysis-ready'; revision: number; partial: boolean } & GenerationResult)
  | { type: 'analysis-invalid'; revision: number; diagnostics: Diagnostic[] }
  | { type: 'export-ready'; revision: number; artifact: ExportArtifact }
  | { type: 'worker-failure'; revision: number; message: string };

export interface WorkerLike {
  onmessage: ((event: MessageEvent<WorkerResponse>) => void) | null;
  onerror: ((event: ErrorEvent) => void) | null;
  postMessage(message: WorkerRequest): void;
  terminate(): void;
}

export function acceptsRevision(responseRevision: number, latestRevision: number): boolean {
  return responseRevision === latestRevision;
}
