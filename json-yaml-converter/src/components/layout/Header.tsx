import type { ConverterDirection } from '../../lib/converter';
import type { Theme } from '../../theme';
import { TOOL_HUB_URL } from '../../constants';
import { SegmentedControl } from '../design-system/SegmentedControl';
import { ToolHeader } from '../design-system/ToolHeader';
import { PRODUCT, ProductIcon } from '../design-system/product.generated';

interface HeaderProps {
  theme: Theme;
  direction: ConverterDirection;
  onDirectionChange(direction: ConverterDirection): void;
  onToggleTheme(): void;
}

export function Header({ theme, direction, onDirectionChange, onToggleTheme }: HeaderProps) {
  return (
    <ToolHeader
      product={{ ...PRODUCT, icon: ProductIcon }}
      homeHref={TOOL_HUB_URL}
      theme={theme}
      onThemeToggle={onToggleTheme}
      actions={(
        <SegmentedControl
          value={direction}
          onValueChange={onDirectionChange}
          ariaLabel="변환 방향"
          options={[
            { value: 'json-to-yaml', label: 'JSON → YAML' },
            { value: 'yaml-to-json', label: 'YAML → JSON' },
          ]}
        />
      )}
    />
  );
}
