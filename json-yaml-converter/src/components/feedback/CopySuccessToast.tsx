import { Check } from 'lucide-react';

export function CopySuccessToast() {
  return <div className="copy-success-toast" role="status" aria-live="polite">
    <Check size={16} aria-hidden="true" />
    <span>결과를 클립보드에 복사했습니다.</span>
  </div>;
}
