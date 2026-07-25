import type { NormalizedEndpoint } from '../../domain/contract';
import type { GeneratedTestCase, TestCaseSelection } from '../../domain/test-case';

interface EndpointNavigatorProps {
  endpoints: NormalizedEndpoint[];
  testCases: GeneratedTestCase[];
  selections: Record<string, TestCaseSelection>;
  selectedId?: string;
  onSelect: (id: string) => void;
}

export function EndpointNavigator({ endpoints, testCases, selections, selectedId, onSelect }: EndpointNavigatorProps) {
  return (
    <section className="review-column endpoint-column" aria-label="엔드포인트 목록">
      <div className="column-heading">
        <p className="eyebrow">Endpoints</p>
        <strong>{endpoints.length}개</strong>
      </div>
      <div className="endpoint-list">
        {endpoints.map((endpoint) => {
          const cases = testCases.filter((testCase) => testCase.endpointId === endpoint.id);
          const included = cases.filter((testCase) => selections[testCase.id]?.included).length;
          return (
            <button
              key={endpoint.id}
              type="button"
              className={`endpoint-item ${selectedId === endpoint.id ? 'is-selected' : ''}`}
              aria-label={`${endpoint.id} 테스트 보기`}
              aria-pressed={selectedId === endpoint.id}
              onClick={() => onSelect(endpoint.id)}
            >
              <span className={`method method--${endpoint.method.toLowerCase()}`}>{endpoint.method}</span>
              <strong>{endpoint.path}</strong>
              <small>{included}/{cases.length} 포함{endpoint.incomplete ? ' · 불완전' : ''}</small>
            </button>
          );
        })}
      </div>
    </section>
  );
}
