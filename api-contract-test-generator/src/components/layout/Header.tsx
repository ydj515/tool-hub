import { ShieldCheck } from 'lucide-react';
import type { Theme } from '../../theme';
import { TOOL_HUB_URL } from '../../constants';
import { ToolHeader } from '../design-system/ToolHeader';
import { PRODUCT, ProductIcon } from '../design-system/product.generated';

interface HeaderProps {
  theme: Theme;
  onToggleTheme: () => void;
}

export function Header({ theme, onToggleTheme }: HeaderProps) {
  return (
    <ToolHeader
      product={{ ...PRODUCT, icon: ProductIcon }}
      homeHref={TOOL_HUB_URL}
      theme={theme}
      onThemeToggle={onToggleTheme}
      actions={(
        <p className="privacy-note">
          <ShieldCheck size={16} strokeWidth={2} aria-hidden="true" />
          명세와 결과는 브라우저 밖으로 전송하지 않습니다.
        </p>
      )}
    />
  );
}
