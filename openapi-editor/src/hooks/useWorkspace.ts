import { useCallback, useEffect, useRef, useState } from 'react';
import type { AnalysisResult, ConversionCandidate, Diagnostic, DocumentFormat, SpecFamily, WorkspaceStatus } from '../domain/document';
import { serializeDocument } from '../lib/parser/serialize-document';
import { analyzeDocument } from '../lib/validation/analyze-document';
import { createConversionCandidate } from '../workers/convert-candidate';
import { acceptsRevision, type WorkerResponse } from '../workers/protocol';

const ANALYSIS_DEBOUNCE_MS = 400;

export interface WorkspaceState {
  source: string;
  filename?: string;
  format: DocumentFormat;
  status: WorkspaceStatus;
  analysis?: AnalysisResult;
  lastValid?: AnalysisResult;
  candidate?: ConversionCandidate;
  restoreSnapshot?: string;
  fileNotice?: Diagnostic;
}

function hasError(analysis: AnalysisResult): boolean {
  return analysis.diagnostics.some((item) => item.severity === 'error');
}

function fileWarning(message: string): Diagnostic {
  return { id: 'FILE_SIZE_WARNING:root', code: 'FILE_SIZE_WARNING', severity: 'warning', stage: 'parse', message, sourcePointer: '', lossy: false };
}

export function useWorkspace(): {
  state: WorkspaceState;
  setSource: (source: string) => void;
  loadFile: (file: File) => Promise<void>;
  forceFormat: (format: DocumentFormat) => void;
  redetectFormat: () => void;
  convertFormat: (format: DocumentFormat) => void;
  requestConversion: (target: SpecFamily) => void;
  applyCandidate: () => void;
  cancelCandidate: () => void;
  restoreSource: () => void;
} {
  const [state, setState] = useState<WorkspaceState>({ source: '', format: 'yaml', status: 'idle' });
  const stateRef = useRef(state);
  const revisionRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const workerRef = useRef<Worker | undefined>(undefined);
  const workerFailuresRef = useRef(0);

  const replace = useCallback((next: WorkspaceState | ((current: WorkspaceState) => WorkspaceState)) => {
    const resolved = typeof next === 'function' ? next(stateRef.current) : next;
    stateRef.current = resolved;
    setState(resolved);
  }, []);

  const consumeWorkerResponse = useCallback((response: WorkerResponse) => {
    if (!acceptsRevision(response.revision, revisionRef.current)) return;
    if (response.type !== 'worker-error') workerFailuresRef.current = 0;
    if (response.type === 'analysis-result') {
      const result = response.result;
      replace((current) => ({ ...current, analysis: result, format: result.parsed.format, status: hasError(result) ? 'invalid' : 'valid', lastValid: hasError(result) ? current.lastValid : result }));
      return;
    }
    if (response.type === 'conversion-result') {
      if (response.candidate.sourceSnapshot !== stateRef.current.source) return;
      replace((current) => ({ ...current, candidate: response.candidate, status: 'reviewing' }));
      return;
    }
    replace((current) => ({ ...current, status: 'worker-error' }));
  }, [replace]);

  useEffect(() => {
    if (typeof Worker === 'undefined') return undefined;
    let disposed = false;
    const startWorker = () => {
      const worker = new Worker(new URL('../workers/openapi.worker.ts', import.meta.url), { type: 'module' });
      worker.onmessage = (event: MessageEvent<WorkerResponse>) => consumeWorkerResponse(event.data);
      worker.onerror = () => {
        worker.terminate();
        if (disposed || workerFailuresRef.current >= 1) {
          consumeWorkerResponse({ type: 'worker-error', revision: revisionRef.current, error: { message: 'Worker를 다시 시작할 수 없습니다.' } });
          return;
        }
        workerFailuresRef.current += 1;
        replace((current) => ({ ...current, status: 'analyzing' }));
        setTimeout(() => {
          if (disposed) return;
          startWorker();
          const current = stateRef.current;
          if (current.source.trim() === '') return;
          revisionRef.current += 1;
          workerRef.current?.postMessage({ type: 'analyze', revision: revisionRef.current, raw: current.source, filename: current.filename, formatHint: current.format });
        }, 0);
      };
      workerRef.current = worker;
    };
    startWorker();
    return () => {
      disposed = true;
      workerRef.current?.terminate();
      workerRef.current = undefined;
    };
  }, [consumeWorkerResponse, replace]);

  const analyze = (source: string, filename: string | undefined, formatHint: DocumentFormat | undefined): void => {
    revisionRef.current += 1;
    const revision = revisionRef.current;
    if (timerRef.current) clearTimeout(timerRef.current);
    if (source.trim() === '') {
      replace((current) => ({ ...current, source, analysis: undefined, candidate: undefined, status: 'idle' }));
      return;
    }
    replace((current) => ({ ...current, source, filename, candidate: undefined, status: 'analyzing' }));
    timerRef.current = setTimeout(() => {
      const request = { type: 'analyze' as const, revision, raw: source, filename, formatHint };
      if (workerRef.current) workerRef.current.postMessage(request);
      else consumeWorkerResponse({ type: 'analysis-result', revision, result: analyzeDocument(source, { filename, formatHint }) });
    }, ANALYSIS_DEBOUNCE_MS);
  };

  const setSource = (source: string) => analyze(source, stateRef.current.filename, stateRef.current.format);

  const loadFile = async (file: File): Promise<void> => {
    if (file.size > 20 * 1024 * 1024) {
      replace((current) => ({ ...current, fileNotice: fileWarning('20MB를 초과하는 파일은 열 수 없습니다.') }));
      return;
    }
    const source = await file.text();
    replace((current) => ({ ...current, fileNotice: file.size > 5 * 1024 * 1024 ? fileWarning('5MB를 초과하는 문서는 분석과 미리보기에 시간이 걸릴 수 있습니다.') : undefined }));
    analyze(source, file.name, undefined);
  };

  const forceFormat = (format: DocumentFormat) => {
    replace((current) => ({ ...current, format }));
    analyze(stateRef.current.source, stateRef.current.filename, format);
  };

  const redetectFormat = () => analyze(stateRef.current.source, stateRef.current.filename, undefined);

  const convertFormat = (format: DocumentFormat) => {
    const current = stateRef.current;
    if (current.format === format || !current.analysis?.parsed.value || hasError(current.analysis)) return;
    const source = serializeDocument(current.analysis.parsed.value, format);
    replace((previous) => ({ ...previous, restoreSnapshot: previous.source, format }));
    analyze(source, current.filename, format);
  };

  const requestConversion = (target: SpecFamily) => {
    const current = stateRef.current;
    if (!current.analysis?.parsed.value || !current.analysis.version || hasError(current.analysis)) return;
    revisionRef.current += 1;
    const revision = revisionRef.current;
    replace((previous) => ({ ...previous, candidate: undefined, status: 'converting' }));
    const request = { type: 'convert' as const, revision, document: current.analysis.parsed.value, source: current.analysis.version, target, sourceSnapshot: current.source, outputFormat: current.format };
    if (workerRef.current) workerRef.current.postMessage(request);
    else consumeWorkerResponse({ type: 'conversion-result', revision, candidate: createConversionCandidate(revision, current.source, current.analysis.parsed.value, current.analysis.version, target, current.format) });
  };

  const applyCandidate = () => {
    const current = stateRef.current;
    if (!current.candidate?.targetValid) return;
    const source = current.candidate.targetText;
    replace((previous) => ({ ...previous, restoreSnapshot: previous.source, candidate: undefined }));
    analyze(source, current.filename, current.format);
  };

  const cancelCandidate = () => replace((current) => ({
    ...current,
    candidate: undefined,
    status: current.analysis ? (hasError(current.analysis) ? 'invalid' : 'valid') : 'idle',
  }));

  const restoreSource = () => {
    const current = stateRef.current;
    if (!current.restoreSnapshot) return;
    const source = current.restoreSnapshot;
    replace((previous) => ({ ...previous, restoreSnapshot: undefined }));
    analyze(source, current.filename, current.format);
  };

  return { state, setSource, loadFile, forceFormat, redetectFormat, convertFormat, requestConversion, applyCandidate, cancelCandidate, restoreSource };
}
