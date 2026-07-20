import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'icon';
}

export function Button({ children, className = '', variant = 'secondary', ...props }: ButtonProps) {
  return <button {...props} className={`btn btn-${variant} ${className}`.trim()}>{children}</button>;
}
