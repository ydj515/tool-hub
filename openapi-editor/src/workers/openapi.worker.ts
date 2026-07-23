/// <reference lib="webworker" />
import { analyzeDocument } from '../lib/validation/analyze-document';
import { createConversionCandidate } from './convert-candidate';
import type { WorkerRequest, WorkerResponse } from './protocol';

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const request = event.data;
  try {
    if (request.type === 'analyze') {
      const response: WorkerResponse = {
        type: 'analysis-result',
        revision: request.revision,
        result: analyzeDocument(request.raw, { filename: request.filename, formatHint: request.formatHint }),
      };
      self.postMessage(response);
      return;
    }
    const response: WorkerResponse = {
      type: 'conversion-result',
      revision: request.revision,
      candidate: createConversionCandidate(request.revision, request.sourceSnapshot, request.document, request.source, request.target, request.outputFormat),
    };
    self.postMessage(response);
  } catch {
    const response: WorkerResponse = { type: 'worker-error', revision: request.revision, error: { message: 'Worker 처리 중 예상하지 못한 오류가 발생했습니다.' } };
    self.postMessage(response);
  }
};
