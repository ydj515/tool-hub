import type { Theme } from '../../theme';

interface HeaderProps {
  theme: Theme;
  onToggleTheme(): void;
}

export function Header({ theme, onToggleTheme }: HeaderProps) {
  return (
    <header className="app-header">
      <div>
        <h1 className="app-title">JSON YAML Converter</h1>
        <p className="privacy-note">입력 내용은 브라우저에서만 처리됩니다.</p>
      </div>
      <button className="theme-button" type="button" aria-label="테마 전환" onClick={onToggleTheme}>
        {theme === 'light' ? '다크 테마' : '라이트 테마'}
      </button>
    </header>
  );
}
