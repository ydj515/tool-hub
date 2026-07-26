import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { BrandMark } from './BrandMark';
import { ThemeToggle } from './ThemeToggle';

interface ProductView {
  name: string;
  description: string;
  icon: LucideIcon;
}

export function ToolHeader({
  product,
  homeHref,
  theme,
  mounted = true,
  actions,
  utilities,
  onThemeToggle,
}: {
  product: ProductView;
  homeHref: string;
  theme: 'light' | 'dark';
  mounted?: boolean;
  actions?: ReactNode;
  utilities?: ReactNode;
  onThemeToggle(): void;
}) {
  return (
    <header data-ds-tool-header className="ds-tool-header">
      <a
        data-ds-tool-brand
        className="ds-tool-header__brand"
        href={homeHref}
        aria-label="Tool Hub로 이동"
      >
        <BrandMark icon={product.icon} />
        <span className="ds-tool-header__copy">
          <strong>{product.name}</strong>
          <span>{product.description}</span>
        </span>
      </a>
      <div data-ds-tool-actions className="ds-tool-header__actions">
        {actions}
      </div>
      <div data-ds-tool-utilities className="ds-tool-header__utilities">
        {utilities}
        <ThemeToggle theme={theme} mounted={mounted} onToggle={onThemeToggle} />
      </div>
    </header>
  );
}
