import { AlertTriangle, Check, X } from 'lucide-react';
import type { ConversionCandidate } from '../../domain/document';

interface ConversionReviewProps {
  candidate?: ConversionCandidate;
  onApply(): void;
  onCancel(): void;
}

export function ConversionReview({ candidate, onApply, onCancel }: ConversionReviewProps) {
  if (!candidate) return null;
  const warnings = candidate.diagnostics.filter((item) => item.severity !== 'info');
  return <section className="conversion-review" role="status">
    <div><AlertTriangle size={17} /><span><strong>변환 결과 검토 중</strong><small>{warnings.length ? `${warnings.length}개 진단을 확인하세요.` : '대상 버전 검증을 통과했습니다.'}</small></span></div>
    <div className="review-actions"><button className="secondary-btn compact" type="button" onClick={onCancel}><X size={14} />취소</button><button className="primary-btn compact" type="button" onClick={onApply} disabled={!candidate.targetValid}><Check size={14} />편집기에 적용</button></div>
  </section>;
}
