import { exportPlan } from '../lib/export/export-plan';
import { analyzeContract } from '../lib/pipeline/analyze-contract';
import type { WorkerRequest, WorkerResponse } from './protocol';

interface WorkerScope {
  onmessage: ((event: MessageEvent<WorkerRequest>) => void) | null;
  postMessage(message: WorkerResponse): void;
}

const workerScope = self as unknown as WorkerScope;

workerScope.onmessage = async (event) => {
  const request = event.data;
  try {
    if (request.type === 'analyze') {
      const result = await analyzeContract(request.raw, request.filename, request.seed);
      if (!result.ok) {
        workerScope.postMessage({ type: 'analysis-invalid', revision: request.revision, diagnostics: result.diagnostics });
        return;
      }
      workerScope.postMessage({
        type: 'analysis-ready',
        revision: request.revision,
        plan: result.plan,
        selections: result.selections,
        partial: result.partial,
      });
      return;
    }

    const artifact = exportPlan(request.plan, request.selections, request.format);
    workerScope.postMessage({ type: 'export-ready', revision: request.revision, artifact });
  } catch {
    workerScope.postMessage({
      type: 'worker-failure',
      revision: request.revision,
      message: '브라우저 작업 중 오류가 발생했습니다. 입력은 유지되며 다시 시도할 수 있습니다.',
    });
  }
};
