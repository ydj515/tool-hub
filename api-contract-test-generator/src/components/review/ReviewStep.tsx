import { useEffect, useMemo, useRef, useState } from 'react';
import type { TestCaseSelection, TestPlan } from '../../domain/test-case';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { Button } from '../design-system/Button';
import { EndpointNavigator } from './EndpointNavigator';
import { TestCaseDetail } from './TestCaseDetail';
import { TestCaseList, type TestCaseFilters } from './TestCaseList';

type MobileView = 'endpoints' | 'tests' | 'detail';

export interface ReviewStepProps {
  plan: TestPlan;
  selections: Record<string, TestCaseSelection>;
  selectedEndpointId?: string;
  selectedTestCaseId?: string;
  onSelectEndpoint: (id: string) => void;
  onSelectTestCase: (id: string) => void;
  onSelectionChange: (id: string, patch: Partial<TestCaseSelection>) => void;
  onProceed: () => void;
}

export function ReviewStep({
  plan,
  selections,
  selectedEndpointId,
  selectedTestCaseId,
  onSelectEndpoint,
  onSelectTestCase,
  onSelectionChange,
  onProceed,
}: ReviewStepProps) {
  const mobile = useMediaQuery('(max-width: 767px)');
  const [mobileView, setMobileView] = useState<MobileView>('endpoints');
  const [filters, setFilters] = useState<TestCaseFilters>({ query: '', category: 'all', confidence: 'all' });
  const scrollOffsets = useRef<Record<MobileView, number>>({ endpoints: 0, tests: 0, detail: 0 });
  const endpointTests = useMemo(
    () => plan.testCases.filter((testCase) => testCase.endpointId === selectedEndpointId),
    [plan.testCases, selectedEndpointId],
  );
  const selectedTest = plan.testCases.find((testCase) => testCase.id === selectedTestCaseId);
  const includedCount = plan.testCases.filter((testCase) => selections[testCase.id]?.included).length;
  const reviewRequiredCount = plan.testCases.filter((testCase) => {
    const selection = selections[testCase.id];
    return selection?.included && !selection.reviewed;
  }).length;

  useEffect(() => {
    if (mobile) window.scrollTo({ top: scrollOffsets.current[mobileView] });
  }, [mobile, mobileView]);

  const changeView = (view: MobileView) => {
    scrollOffsets.current[mobileView] = window.scrollY;
    setMobileView(view);
  };

  const endpoints = <EndpointNavigator endpoints={plan.endpoints} testCases={plan.testCases} selections={selections} selectedId={selectedEndpointId} onSelect={(id) => { onSelectEndpoint(id); if (mobile) changeView('tests'); }} />;
  const tests = <TestCaseList testCases={endpointTests} selections={selections} selectedId={selectedTestCaseId} onSelect={onSelectTestCase} onShowDetail={(id) => { onSelectTestCase(id); if (mobile) changeView('detail'); }} onSelectionChange={onSelectionChange} filters={filters} onFiltersChange={(patch) => setFilters((current) => ({ ...current, ...patch }))} onBack={mobile ? () => changeView('endpoints') : undefined} />;
  const detail = <TestCaseDetail key={selectedTest?.id ?? 'empty'} testCase={selectedTest} selection={selectedTest ? selections[selectedTest.id] : undefined} onSelectionChange={onSelectionChange} onBack={mobile ? () => changeView('tests') : undefined} />;

  return (
    <section className="ds-card step-panel review-step" aria-labelledby="review-heading">
      <div className="section-heading review-summary">
        <div><p className="eyebrow">2단계</p><h2 id="review-heading">테스트 검토</h2><p>{plan.summary.endpointCount}개 엔드포인트 · {includedCount}/{plan.testCases.length}개 포함 · 검토 필요 {reviewRequiredCount}개 · 생략 {plan.summary.skippedCount}개</p></div>
        <Button variant="primary" disabled={includedCount === 0} onClick={onProceed}>내보내기 단계로</Button>
      </div>
      {plan.diagnostics.length > 0 && (
        <div className="review-diagnostics" role="status" aria-label="생성 진단">
          {plan.diagnostics.map((diagnostic) => <p key={diagnostic.id}><strong>{diagnostic.code}</strong> {diagnostic.message}</p>)}
        </div>
      )}
      {mobile ? (
        <div className="review-workspace review-workspace--mobile" data-mobile-view={mobileView}>
          {mobileView === 'endpoints' && endpoints}
          {mobileView === 'tests' && tests}
          {mobileView === 'detail' && detail}
        </div>
      ) : (
        <div className="review-workspace">
          {endpoints}{tests}{detail}
        </div>
      )}
    </section>
  );
}
