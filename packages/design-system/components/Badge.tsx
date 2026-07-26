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
