import { ArrowLeft, Check } from 'lucide-react';
import { useState } from 'react';
import type { ExpectedStatus, GeneratedTestCase, TestCaseSelection } from '../../domain/test-case';
import { Button } from '../ui/Button';
import { StatusBadge } from '../ui/StatusBadge';

interface TestCaseDetailProps {
  testCase?: GeneratedTestCase;
  selection?: TestCaseSelection;
  onSelectionChange: (id: string, patch: Partial<TestCaseSelection>) => void;
  onBack?: () => void;
}

export function TestCaseDetail({ testCase, selection, onSelectionChange, onBack }: TestCaseDetailProps) {
  const [statusText, setStatusText] = useState(() => testCase
    ? (selection?.expectedStatuses ?? testCase.expected.statuses).join(', ')
    : '');
  const [error, setError] = useState<string>();

  if (!testCase) {
    return <section className="review-column detail-column" aria-label="테스트 상세"><p className="empty-state">테스트를 선택해 주세요.</p></section>;
  }

  const displayedStatuses = selection?.expectedStatuses ?? testCase.expected.statuses;

  const saveStatuses = () => {
    const values = statusText.split(',').map((value) => value.trim()).filter(Boolean);
    if (values.length === 0 || values.some((value) => !/^(?:[1-5]\d\d|2XX|4XX)$/.test(value))) {
      setError('100부터 599까지의 상태 코드 또는 2XX, 4XX를 쉼표로 구분해 입력해 주세요.');
      return;
    }
    const statuses = [...new Set(values.map((value): ExpectedStatus => /^\d+$/.test(value) ? Number(value) : value as ExpectedStatus))];
    setError(undefined);
    onSelectionChange(testCase.id, { expectedStatuses: statuses, reviewed: true });
  };

  return (
    <section className="review-column detail-column" aria-label="테스트 상세">
      {onBack && <button className="text-button mobile-only detail-back" type="button" onClick={onBack}><ArrowLeft size={16} aria-hidden="true" /> 테스트 목록으로 돌아가기</button>}
      <div className="detail-heading">
        <p className="eyebrow">Selected test</p>
        <h3>선택한 테스트: {testCase.title}</h3>
        <div className="badge-row"><StatusBadge status={testCase.category} /><StatusBadge status={testCase.confidence} /></div>
      </div>
      <dl className="evidence-list">
        <div><dt>엔드포인트</dt><dd><span className={`method method--${testCase.method.toLowerCase()}`}>{testCase.method}</span> {testCase.path}</dd></div>
        <div><dt>근거 위치</dt><dd><code>{testCase.sourcePointer}</code></dd></div>
        <div><dt>생성 근거</dt><dd>{testCase.rationale}</dd></div>
        <div><dt>기대 상태</dt><dd>{displayedStatuses.length ? displayedStatuses.join(', ') : '검토 필요'}</dd></div>
        <div><dt>{testCase.expected.needsReview && !selection?.reviewed ? '검토 필요 사유' : '기대 상태 근거'}</dt><dd>{testCase.expected.rationale}</dd></div>
      </dl>
      <div className="request-preview">
        <h4>생성 요청</h4>
        <pre>{JSON.stringify(testCase.request, null, 2)}</pre>
      </div>
      <div className="status-review">
        <label htmlFor={`status-${testCase.id}`}>기대 상태 코드</label>
        <input id={`status-${testCase.id}`} value={statusText} onChange={(event) => setStatusText(event.target.value)} placeholder="예: 400, 422 또는 4XX" />
        <Button onClick={saveStatuses}><Check size={15} aria-hidden="true" /> 상태 코드 검토 완료</Button>
        <Button onClick={() => onSelectionChange(testCase.id, { included: !(selection?.included ?? false) })}>
          {selection?.included ? '내보내기에서 제외' : '내보내기에 포함'}
        </Button>
        {selection?.reviewed && <p className="reviewed-copy">검토 완료</p>}
        {error && <p className="inline-alert" role="alert">{error}</p>}
      </div>
    </section>
  );
}
