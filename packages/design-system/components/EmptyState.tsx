import type { HTMLAttributes, ReactNode } from 'react';

export function EmptyState({
  icon,
  title,
  description,
  action,
  className = '',
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div data-ds-empty-state className={`ds-empty-state ${className}`.trim()} {...props}>
      {icon ? (
        <span className="ds-empty-state__icon" aria-hidden="true">
          {icon}
        </span>
      ) : null}
      <strong>{title}</strong>
      {description ? <p>{description}</p> : null}
      {action ? <div className="ds-empty-state__action">{action}</div> : null}
    </div>
  );
}
