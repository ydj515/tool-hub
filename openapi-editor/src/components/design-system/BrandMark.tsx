// 이 파일은 packages/design-system/components/BrandMark.tsx 에서 생성되었다.
// 직접 편집하지 말고 정본을 고친 뒤 저장소 루트에서
// `npm run design-system:sync` 를 실행한다.
import type { LucideIcon } from 'lucide-react';

export function BrandMark({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <span data-ds-brand-mark aria-hidden="true">
      <Icon data-ds-icon size={16} strokeWidth={2} />
    </span>
  );
}
