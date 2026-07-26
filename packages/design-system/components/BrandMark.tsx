import type { LucideIcon } from 'lucide-react';

export function BrandMark({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <span data-ds-brand-mark aria-hidden="true">
      <Icon data-ds-icon size={16} strokeWidth={2} />
    </span>
  );
}
