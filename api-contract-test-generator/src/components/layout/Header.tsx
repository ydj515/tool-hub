import { Moon, ShieldCheck, Sun } from 'lucide-react';
import type { Theme } from '../../theme';
import { Button } from '../ui/Button';

interface HeaderProps {
  theme: Theme;
  onToggleTheme: () => void;
}

export function Header({ theme, onToggleTheme }: HeaderProps) {
  const nextTheme = theme === 'light' ? '다크' : '라이트';

  return (
    <header className="app-header">
      <div className="brand-block">
        <span className="brand-mark" aria-hidden="true">AC</span>
        <div>
          <p className="eyebrow">Tool Hub</p>
          <h1>API Contract Test Generator</h1>
        </div>
      </div>
      <div className="header-actions">
        <p className="privacy-note"><ShieldCheck size={16} aria-hidden="true" /> 명세와 결과는 브라우저 밖으로 전송하지 않습니다.</p>
        <Button variant="ghost" className="icon-button" aria-label={`${nextTheme} 테마로 전환`} onClick={onToggleTheme}>
          {theme === 'light' ? <Moon size={18} aria-hidden="true" /> : <Sun size={18} aria-hidden="true" />}
        </Button>
      </div>
    </header>
  );
}
