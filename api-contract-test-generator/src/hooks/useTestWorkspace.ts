import { useCallback, useEffect, useRef, useState } from 'react';
import type { SpecVersion } from '../domain/contract';
import { createDiagnostic, type Diagnostic } from '../domain/diagnostic';
import type { ExportFormat, TestCaseSelection, TestPlan } from '../domain/test-case';
import { downloadArtifact } from '../lib/files/download';
import { readSpecFile } from '../lib/files/spec-file';
import { acceptsRevision, type WorkerLike, type WorkerRequest, type WorkerResponse, type WorkspaceStatus } from '../workers/protocol';

export type WorkflowStep = 'input' | 'review' | 'export';

export interface TestWorkspaceState {
  source: string;
  filename?: string;
  revision: number;
  status: WorkspaceStatus;
  step: WorkflowStep;
  plan?: TestPlan;
  selections: Record<string, TestCaseSelection>;
  selectedEndpointId?: string;
  selectedTestCaseId?: string;
  diagnostics: Diagnostic[];
  error?: string;
}

export interface TestWorkspaceOptions {
  createWorker?: () => WorkerLike;
}

export interface TestWorkspaceController {
  state: TestWorkspaceState;
  canAnalyze: boolean;
  canExport: boolean;
  setSource(value: string, filename?: string): void;
  loadFile(file: File): Promise<void>;
  loadSample(version: SpecVersion, source: string): void;
  analyzeAndGenerate(): Promise<void>;
  selectEndpoint(id: string): void;
  selectTestCase(id: string): void;
  updateSelection(id: string, patch: Partial<TestCaseSelection>): void;
  exportSelected(format: ExportFormat): Promise<void>;
  goToStep(step: WorkflowStep): void;
  retryWorker(): void;
}

const initialState: TestWorkspaceState = {
  source: '',
  revision: 0,
  status: 'idle',
  step: 'input',
  selections: {},
  diagnostics: [],
};

function defaultWorker(): WorkerLike {
  return new Worker(new URL('../workers/api-contract.worker.ts', import.meta.url), { type: 'module' });
}

export function useTestWorkspace(options: TestWorkspaceOptions = {}): TestWorkspaceController {
  const [state, setState] = useState<TestWorkspaceState>(initialState);
  const workerRef = useRef<WorkerLike | null>(null);
  const revisionRef = useRef(0);
  const sourceRef = useRef('');
  const filenameRef = useRef<string | undefined>(undefined);
  const selectionsRef = useRef<Record<string, TestCaseSelection>>({});
  const pendingRef = useRef(new Map<number, () => void>());
  const createWorkerRef = useRef(options.createWorker ?? defaultWorker);

  const finishPending = useCallback((revision: number) => {
    pendingRef.current.get(revision)?.();
    pendingRef.current.delete(revision);
  }, []);

  const attachWorker = useCallback(() => {
    const worker = createWorkerRef.current();
    worker.onmessage = (event) => {
      const response: WorkerResponse = event.data;
      if (!acceptsRevision(response.revision, revisionRef.current)) {
        finishPending(response.revision);
        return;
      }

      if (response.type === 'analysis-ready') {
        setState((current) => {
          const restored = Object.fromEntries(Object.entries(response.selections).map(([id, selection]) => [
            id,
            selectionsRef.current[id] ?? selection,
          ]));
          selectionsRef.current = restored;
          return {
            ...current,
            status: response.partial ? 'partially-valid' : 'ready',
            step: 'review',
            plan: response.plan,
            selections: restored,
            selectedEndpointId: response.plan.endpoints[0]?.id,
            selectedTestCaseId: response.plan.testCases[0]?.id,
            diagnostics: response.plan.diagnostics,
            error: undefined,
          };
        });
      } else if (response.type === 'analysis-invalid') {
        selectionsRef.current = {};
        setState((current) => ({ ...current, status: 'invalid', plan: undefined, selections: {}, diagnostics: response.diagnostics }));
      } else if (response.type === 'export-ready') {
        downloadArtifact(response.artifact);
        setState((current) => ({ ...current, status: current.plan?.diagnostics.length ? 'partially-valid' : 'ready' }));
      } else {
        setState((current) => ({ ...current, status: 'generation-failed', plan: undefined, error: response.message }));
      }
      finishPending(response.revision);
    };
    worker.onerror = () => {
      setState((current) => ({ ...current, status: 'generation-failed', plan: undefined, error: '브라우저 작업을 다시 시작해 주세요.' }));
      finishPending(revisionRef.current);
    };
    workerRef.current = worker;
  }, [finishPending]);

  useEffect(() => {
    attachWorker();
    return () => workerRef.current?.terminate();
  }, [attachWorker]);

  const setSource = useCallback((value: string, filename?: string) => {
    revisionRef.current += 1;
    sourceRef.current = value;
    filenameRef.current = filename;
    setState((current) => ({
      ...current,
      source: value,
      filename,
      revision: revisionRef.current,
      status: current.plan ? 'stale' : 'idle',
      step: 'input',
      diagnostics: current.plan ? current.diagnostics : [],
      error: undefined,
    }));
  }, []);

  const loadFile = useCallback(async (file: File) => {
    setState((current) => ({ ...current, status: 'reading-file', error: undefined }));
    const result = await readSpecFile(file);
    if (!result.ok) {
      setState((current) => ({ ...current, status: 'invalid', error: result.error.message }));
      return;
    }
    setSource(result.content, result.filename);
    const warning = result.warning;
    if (warning) {
      setState((current) => ({
        ...current,
        diagnostics: [createDiagnostic(warning.code, warning.message, {
          stage: 'parse',
          severity: 'warning',
          blocking: false,
        })],
      }));
    }
  }, [setSource]);

  const loadSample = useCallback((_version: SpecVersion, source: string) => {
    setSource(source, undefined);
  }, [setSource]);

  const send = useCallback((request: WorkerRequest): Promise<void> => new Promise((resolve) => {
    pendingRef.current.set(request.revision, resolve);
    workerRef.current?.postMessage(request);
  }), []);

  const analyzeAndGenerate = useCallback(async () => {
    if (!sourceRef.current.trim() || !workerRef.current) return;
    const revision = revisionRef.current;
    setState((current) => ({ ...current, status: 'analyzing', error: undefined }));
    await send({ type: 'analyze', revision, raw: sourceRef.current, filename: filenameRef.current, seed: 'toolhub' });
  }, [send]);

  const updateSelection = useCallback((id: string, patch: Partial<TestCaseSelection>) => {
    setState((current) => {
      if (!['ready', 'partially-valid'].includes(current.status) || !current.selections[id]) return current;
      const selections = { ...current.selections, [id]: { ...current.selections[id], ...patch } };
      selectionsRef.current = selections;
      return { ...current, selections };
    });
  }, []);

  const exportSelected = useCallback(async (format: ExportFormat) => {
    const current = state;
    if (!current.plan || !['ready', 'partially-valid'].includes(current.status)) return;
    setState((value) => ({ ...value, status: 'exporting' }));
    await send({ type: 'export', revision: revisionRef.current, plan: current.plan, selections: current.selections, format });
  }, [send, state]);

  const goToStep = useCallback((step: WorkflowStep) => {
    setState((current) => {
      if (step !== 'input' && !current.plan) return current;
      return { ...current, step };
    });
  }, []);

  const retryWorker = useCallback(() => {
    workerRef.current?.terminate();
    attachWorker();
    setState((current) => ({ ...current, status: current.source ? 'idle' : 'idle', error: undefined, plan: undefined }));
  }, [attachWorker]);

  return {
    state,
    canAnalyze: Boolean(state.source.trim()) && !['analyzing', 'reading-file', 'exporting'].includes(state.status),
    canExport: Boolean(state.plan) && ['ready', 'partially-valid'].includes(state.status),
    setSource,
    loadFile,
    loadSample,
    analyzeAndGenerate,
    selectEndpoint: (id) => setState((current) => ({ ...current, selectedEndpointId: id, selectedTestCaseId: current.plan?.testCases.find((item) => item.endpointId === id)?.id })),
    selectTestCase: (id) => setState((current) => ({ ...current, selectedTestCaseId: id })),
    updateSelection,
    exportSelected,
    goToStep,
    retryWorker,
  };
}
