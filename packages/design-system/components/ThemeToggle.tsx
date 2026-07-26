import { Moon, Sun } from 'lucide-react';
import { Button } from './Button';

export function ThemeToggle({
  theme,
  mounted = true,
  onToggle,
}: {
  theme: 'light' | 'dark';
  mounted?: boolean;
  onToggle(): void;
}) {
  const next = theme === 'light' ? '다크' : '라이트';

  return (
    <Button variant="icon" data-ds-theme-toggle aria-label={`${next} 테마로 전환`} onClick={onToggle}>
      {mounted ? (
        theme === 'light' ? (
          <Moon data-ds-icon size={16} strokeWidth={2} />
        ) : (
          <Sun data-ds-icon size={16} strokeWidth={2} />
        )
      ) : (
        <span className="ds-theme-placeholder" aria-hidden="true" />
      )}
    </Button>
  );
}
