/**
 * 토큰 기반 액션 버튼.
 * variant로 시각 스타일(.btn-primary/.btn-secondary)을, className으로 크기/레이아웃을 받는다.
 */
import type { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary";
}

export default function Button({ variant = "primary", className = "", ...props }: ButtonProps) {
  const base = variant === "primary" ? "btn-primary" : "btn-secondary";
  return <button className={`${base} ${className}`.trim()} {...props} />;
}
