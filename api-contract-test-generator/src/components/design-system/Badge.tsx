// 이 파일은 packages/design-system/components/Badge.tsx 에서 생성되었다.
// 직접 편집하지 말고 정본을 고친 뒤 저장소 루트에서
// `npm run design-system:sync` 를 실행한다.
import type { HTMLAttributes, ReactNode } from 'react';

export type BadgeVariant = 'neutral' | 'primary' | 'success' | 'warning' | 'danger';

export function Badge({
  variant = 'neutral',
  children,
  className = '',
  ...props
}: HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant; children: ReactNode }) {
  return (
    <span
      data-ds-badge
      data-variant={variant}
      className={`ds-badge ds-badge--${variant} ${className}`.trim()}
      {...props}
    >
      {children}
    </span>
  );
}
