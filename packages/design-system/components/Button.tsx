import { forwardRef, type ButtonHTMLAttributes } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'icon';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', type = 'button', className = '', ...props },
  ref,
) {
  if (variant === 'icon' && !props['aria-label'] && !props['aria-labelledby']) {
    throw new Error('icon Button에는 aria-label 또는 aria-labelledby가 필요합니다.');
  }

  return (
    <button
      ref={ref}
      type={type}
      data-ds-button
      data-ds-control
      data-variant={variant}
      className={`ds-button ds-button--${variant} ${className}`.trim()}
      {...props}
    />
  );
});

export default Button;
