import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { TestWorkspaceController } from '../hooks/useTestWorkspace';
import { planFixture, selectionFixture } from '../test/factories';
import { GeneratorPage } from './GeneratorPage';

function controller(): TestWorkspaceController {
  const plan = planFixture();
  const selections = selectionFixture();
  return {
    state: {
      source: 'openapi: 3.1.1', revision: 1, status: 'ready', step: 'review', plan, selections,
      selectedEndpointId: 'POST /users', selectedTestCaseId: 'required-email-id', diagnostics: [],
    },
    canAnalyze: true,
    canExport: true,
    setSource: vi.fn(), loadFile: vi.fn(), loadSample: vi.fn(), analyzeAndGenerate: vi.fn(),
    selectEndpoint: vi.fn(), selectTestCase: vi.fn(), updateSelection: vi.fn(), exportSelected: vi.fn(),
    goToStep: vi.fn((step) => { if (step === 'export') values.state.step = 'export'; }), retryWorker: vi.fn(),
  };
}

let values: TestWorkspaceController;

describe('GeneratorPage', () => {
  it('검토에서 내보내기로 이동 요청을 전달한다', async () => {
    const user = userEvent.setup();
    values = controller();
    const { rerender } = render(<GeneratorPage controller={values} theme="light" />);

    await user.click(screen.getByRole('button', { name: '내보내기 단계로' }));
    expect(values.goToStep).toHaveBeenCalledWith('export');
    rerender(<GeneratorPage controller={values} theme="light" />);
    expect(screen.getByRole('heading', { name: '테스트 계획 내보내기' })).toBeInTheDocument();
  });
});
