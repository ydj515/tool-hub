import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'icon';
}

export function Button({ children, className = '', variant = 'secondary', ...props }: ButtonProps) {
  // icon 변형은 정본 프리미티브가 크기·배경·테두리·상태를 모두 소유하므로
  // .btn 기반 클래스를 붙이지 않는다. 나머지 변형은 앱 로컬 .btn 체계를 쓴다.
  const base = variant === 'icon' ? 'ds-icon-btn' : `btn btn-${variant}`;
  return <button {...props} className={`${base} ${className}`.trim()}>{children}</button>;
}
