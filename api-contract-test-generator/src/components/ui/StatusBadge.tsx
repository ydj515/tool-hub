import type { Confidence, TestCategory } from '../../domain/test-case';

type Status = Confidence | TestCategory | 'included' | 'excluded';

const labels: Record<Status, string> = {
  explicit: '명시적',
  derived: '파생',
  'review-required': '검토 필요',
  valid: '정상',
  validation: '오류',
  boundary: '경계값',
  authentication: '인증',
  included: '포함',
  excluded: '제외',
};

export function StatusBadge({ status }: { status: Status }) {
  return <span className={`status-badge status-badge--${status}`}>{labels[status]}</span>;
}
