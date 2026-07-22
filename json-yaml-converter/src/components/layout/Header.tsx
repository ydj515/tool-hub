import { Braces, Moon, Sun } from 'lucide-react';
import type { Theme } from '../../theme';
import { Button } from '../ui/Button';

interface HeaderProps {
  theme: Theme;
  onToggleTheme(): void;
}

export function Header({ theme, onToggleTheme }: HeaderProps) {
  return (
    <header className="studio-topbar">
      <div className="studio-brand">
        <span className="studio-brand__mark" data-testid="converter-app-mark" aria-hidden="true">
          <Braces size={18} />
        </span>
        <div>
          <h1 className="app-title">JSON YAML Converter</h1>
          <p className="privacy-note">입력 내용은 브라우저에서만 처리됩니다.</p>
        </div>
      </div>
      <Button className="theme-button" type="button" variant="icon" aria-label="테마 전환" onClick={onToggleTheme}>
        {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
      </Button>
    </header>
  );
}
