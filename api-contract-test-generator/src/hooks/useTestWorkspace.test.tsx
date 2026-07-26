import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { TestPlan } from '../domain/test-case';
import { planFixture, selectionFixture, testCase } from '../test/factories';
import type { WorkerLike, WorkerRequest, WorkerResponse } from '../workers/protocol';
import { useTestWorkspace } from './useTestWorkspace';

class FakeWorker implements WorkerLike {
  onmessage: ((event: MessageEvent<WorkerResponse>) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  lastRequest?: WorkerRequest;

  postMessage(message: WorkerRequest): void {
    this.lastRequest = message;
  }

  terminate(): void {}

  respondWithPlan(plan: TestPlan): void {
    if (this.lastRequest?.type !== 'analyze') throw new Error('analyze 요청이 필요합니다.');
    const selections = Object.fromEntries(plan.testCases.map((item) => [item.id, { included: true, reviewed: !item.expected.needsReview }]));
    this.onmessage?.(new MessageEvent('message', { data: {
      type: 'analysis-ready', revision: this.lastRequest.revision, plan, selections, partial: false,
    } }));
  }
}

function planWithIds(...ids: string[]): TestPlan {
  const plan = planFixture();
  plan.testCases = ids.map((id, index) => testCase({ id, title: id, variantId: id, priority: index }));
  plan.summary.testCount = ids.length;
  return plan;
}

async function analyze(worker: FakeWorker, result: { current: ReturnType<typeof useTestWorkspace> }, plan: TestPlan) {
  let pending: Promise<void> | undefined;
  act(() => { pending = result.current.analyzeAndGenerate(); });
  act(() => worker.respondWithPlan(plan));
  await act(async () => pending);
}

describe('useTestWorkspace', () => {
  it('준비된 결과에서 입력이 바뀌면 stale로 표시한다', async () => {
    const worker = new FakeWorker();
    const { result } = renderHook(() => useTestWorkspace({ createWorker: () => worker }));
    act(() => result.current.setSource('openapi: 3.1.0'));
    await analyze(worker, result, planFixture());
    expect(result.current.state.status).toBe('ready');

    act(() => result.current.setSource('openapi: 3.1.0\n# change'));

    expect(result.current.state.status).toBe('stale');
    expect(result.current.canExport).toBe(false);
  });

  it('재생성 후에도 존재하는 ID의 선택만 복원한다', async () => {
    const worker = new FakeWorker();
    const { result } = renderHook(() => useTestWorkspace({ createWorker: () => worker }));
    act(() => result.current.setSource('openapi: 3.1.0'));
    await analyze(worker, result, planWithIds('stable-id', 'removed-id'));
    act(() => result.current.updateSelection('stable-id', { included: false }));
    act(() => result.current.setSource('openapi: 3.1.0\n# regenerated'));
    await analyze(worker, result, planWithIds('stable-id', 'new-id'));

    expect(result.current.state.selections['stable-id']?.included).toBe(false);
    expect(result.current.state.selections['removed-id']).toBeUndefined();
    expect(result.current.state.selections['new-id']?.included).toBe(true);
  });

  it('기존 선택 fixture를 타입 안전하게 유지한다', () => {
    expect(selectionFixture()['required-email-id']?.included).toBe(true);
  });

  it('5MB 이상 파일의 성능 경고를 입력 화면에 유지한다', async () => {
    const worker = new FakeWorker();
    const { result } = renderHook(() => useTestWorkspace({ createWorker: () => worker }));
    const file = new File([new Uint8Array(5 * 1024 * 1024)], 'large.yaml');

    await act(async () => result.current.loadFile(file));

    expect(result.current.state.diagnostics).toContainEqual(expect.objectContaining({ code: 'LARGE_INPUT_WARNING' }));
  });
});
