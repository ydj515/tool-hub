import { ChevronRight, Search } from 'lucide-react';
import { useMemo } from 'react';
import type { Confidence, GeneratedTestCase, TestCaseSelection, TestCategory } from '../../domain/test-case';
import { EmptyState } from '../design-system/EmptyState';
import { StatusBadge } from '../ui/StatusBadge';

export interface TestCaseFilters {
  query: string;
  category: TestCategory | 'all';
  confidence: Confidence | 'all';
}

interface TestCaseListProps {
  testCases: GeneratedTestCase[];
  selections: Record<string, TestCaseSelection>;
  selectedId?: string;
  onSelect: (id: string) => void;
  onShowDetail: (id: string) => void;
  onSelectionChange: (id: string, patch: Partial<TestCaseSelection>) => void;
  filters: TestCaseFilters;
  onFiltersChange: (patch: Partial<TestCaseFilters>) => void;
  onBack?: () => void;
}

export function TestCaseList({
  testCases,
  selections,
  selectedId,
  onSelect,
  onShowDetail,
  onSelectionChange,
  filters,
  onFiltersChange,
  onBack,
}: TestCaseListProps) {
  const { query, category, confidence } = filters;
  const filtered = useMemo(() => testCases.filter((testCase) => {
    const normalizedQuery = query.trim().toLowerCase();
    const matchesQuery = !normalizedQuery || [testCase.title, testCase.rationale, testCase.ruleId].some((value) => value.toLowerCase().includes(normalizedQuery));
    return matchesQuery && (category === 'all' || testCase.category === category) && (confidence === 'all' || testCase.confidence === confidence);
  }), [category, confidence, query, testCases]);

  return (
    <section className="review-column test-list-column" aria-label="테스트 목록">
      <div className="column-heading list-heading">
        <div>{onBack && <button className="text-button mobile-only" type="button" onClick={onBack}>엔드포인트</button>}<strong>{filtered.length}개 테스트</strong></div>
      </div>
      <div className="test-filters">
        <label className="search-field"><Search size={16} strokeWidth={2} aria-hidden="true" /><input type="search" aria-label="테스트 검색" value={query} onChange={(event) => onFiltersChange({ query: event.target.value })} placeholder="제목, 규칙 검색" /></label>
        <select aria-label="테스트 분류" value={category} onChange={(event) => onFiltersChange({ category: event.target.value as TestCategory | 'all' })}>
          <option value="all">모든 분류</option><option value="valid">정상</option><option value="validation">오류</option><option value="boundary">경계값</option><option value="authentication">인증</option>
        </select>
        <select aria-label="신뢰 수준" value={confidence} onChange={(event) => onFiltersChange({ confidence: event.target.value as Confidence | 'all' })}>
          <option value="all">모든 신뢰 수준</option><option value="explicit">명시적</option><option value="derived">파생</option><option value="review-required">검토 필요</option>
        </select>
      </div>
      <div className="test-card-list">
        {filtered.map((testCase) => {
          const included = selections[testCase.id]?.included ?? false;
          return (
            <article key={testCase.id} className={`test-card ${selectedId === testCase.id ? 'is-selected' : ''}`} onClick={() => onSelect(testCase.id)}>
              <div className="test-card-top">
                <label onClick={(event) => event.stopPropagation()}>
                  <input
                    type="checkbox"
                    aria-label={`${testCase.title} 포함`}
                    checked={included}
                    onChange={() => onSelectionChange(testCase.id, { included: !included })}
                  />
                </label>
                <div><strong>{testCase.title}</strong><p>{testCase.ruleId}</p></div>
                <button type="button" className="detail-button" aria-label={`${testCase.title} 상세`} onClick={(event) => { event.stopPropagation(); onShowDetail(testCase.id); }}><ChevronRight size={16} strokeWidth={2} aria-hidden="true" /></button>
              </div>
              <div className="badge-row"><StatusBadge status={testCase.category} /><StatusBadge status={testCase.confidence} /></div>
            </article>
          );
        })}
        {filtered.length === 0 && <EmptyState title="조건에 맞는 테스트가 없습니다." />}
      </div>
    </section>
  );
}
