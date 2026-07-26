import type { Confidence, TestCategory } from '../../domain/test-case';
import { Badge, type BadgeVariant } from '../design-system/Badge';

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

const variants: Record<Status, BadgeVariant> = {
  explicit: 'success',
  derived: 'neutral',
  'review-required': 'warning',
  valid: 'success',
  validation: 'danger',
  boundary: 'warning',
  authentication: 'danger',
  included: 'primary',
  excluded: 'neutral',
};

export function StatusBadge({ status }: { status: Status }) {
  return <Badge variant={variants[status]}>{labels[status]}</Badge>;
}
