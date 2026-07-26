import { AlertTriangle, Check, X } from 'lucide-react';
import type { ConversionCandidate } from '../../domain/document';
import { Button } from '../design-system/Button';

interface ConversionReviewProps {
  candidate?: ConversionCandidate;
  onApply(): void;
  onCancel(): void;
}

export function ConversionReview({ candidate, onApply, onCancel }: ConversionReviewProps) {
  if (!candidate) return null;
  const warnings = candidate.diagnostics.filter((item) => item.severity !== 'info');
  return <section className="conversion-review" role="status">
    <div><AlertTriangle size={16} strokeWidth={2} /><span><strong>변환 결과 검토 중</strong><small>{warnings.length ? `${warnings.length}개 진단을 확인하세요.` : '대상 버전 검증을 통과했습니다.'}</small></span></div>
    <div className="review-actions"><Button variant="secondary" onClick={onCancel}><X size={16} strokeWidth={2} />취소</Button><Button variant="primary" onClick={onApply} disabled={!candidate.targetValid}><Check size={16} strokeWidth={2} />편집기에 적용</Button></div>
  </section>;
}
