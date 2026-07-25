import type { Theme } from '../theme';
import type { TestWorkspaceController } from '../hooks/useTestWorkspace';
import { ExportStep } from '../components/export/ExportStep';
import { SpecInputStep } from '../components/input/SpecInputStep';
import { ReviewStep } from '../components/review/ReviewStep';

interface GeneratorPageProps {
  controller: TestWorkspaceController;
  theme: Theme;
}

export function GeneratorPage({ controller, theme }: GeneratorPageProps) {
  const { state } = controller;
  const busy = ['reading-file', 'analyzing', 'exporting'].includes(state.status);

  if (state.step === 'review' && state.plan) {
    return (
      <ReviewStep
        plan={state.plan}
        selections={state.selections}
        selectedEndpointId={state.selectedEndpointId}
        selectedTestCaseId={state.selectedTestCaseId}
        onSelectEndpoint={controller.selectEndpoint}
        onSelectTestCase={controller.selectTestCase}
        onSelectionChange={controller.updateSelection}
        onProceed={() => controller.goToStep('export')}
      />
    );
  }

  if (state.step === 'export' && state.plan) {
    const included = state.plan.testCases.filter((testCase) => state.selections[testCase.id]?.included);
    const unreviewed = included.filter((testCase) => !state.selections[testCase.id]?.reviewed);
    return (
      <ExportStep
        plan={state.plan}
        selections={state.selections}
        includedCount={included.length}
        unreviewedCount={unreviewed.length}
        skippedCount={state.plan.summary.skippedCount}
        exporting={state.status === 'exporting'}
        onBack={() => controller.goToStep('review')}
        onExport={(format) => void controller.exportSelected(format)}
      />
    );
  }

  return (
    <>
      {state.error && <p className="page-alert" role="alert">{state.error} <button type="button" onClick={controller.retryWorker}>작업 다시 시작</button></p>}
      <SpecInputStep
        source={state.source}
        filename={state.filename}
        diagnostics={state.diagnostics}
        theme={theme}
        disabled={busy}
        canAnalyze={controller.canAnalyze}
        onSourceChange={(value) => controller.setSource(value, state.filename)}
        onFile={(file) => void controller.loadFile(file)}
        onAnalyze={() => void controller.analyzeAndGenerate()}
      />
    </>
  );
}

export default GeneratorPage;
