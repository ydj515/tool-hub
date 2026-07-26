import type { ButtonHTMLAttributes, ReactNode } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'icon';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: ButtonVariant;
}

export function Button({ children, className = '', variant = 'secondary', type = 'button', ...props }: ButtonProps) {
  // icon 은 정본 프리미티브 하나로만 스타일한다. .button 과 겹치면
  // border·padding·min-height 가 .ds-icon-btn 과 충돌한다.
  const base = variant === 'icon' ? 'ds-icon-btn' : `button button--${variant}`;

  return (
    <button className={`${base} ${className}`.trim()} type={type} {...props}>
      {children}
    </button>
  );
}
