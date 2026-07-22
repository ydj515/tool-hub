import { useRef } from 'react';
import type { KeyboardEvent } from 'react';
import { Braces, Moon, Sun } from 'lucide-react';
import type { ConverterDirection } from '../../lib/converter';
import type { Theme } from '../../theme';
import { Button } from '../ui/Button';

interface HeaderProps {
  theme: Theme;
  direction: ConverterDirection;
  onDirectionChange(direction: ConverterDirection): void;
  onToggleTheme(): void;
}

export function Header({ theme, direction, onDirectionChange, onToggleTheme }: HeaderProps) {
  const jsonDirectionRef = useRef<HTMLButtonElement>(null);
  const yamlDirectionRef = useRef<HTMLButtonElement>(null);
  const handleDirectionKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const current = event.currentTarget.dataset.direction as ConverterDirection;
    const next = event.key === 'Home' ? 'json-to-yaml'
      : event.key === 'End' ? 'yaml-to-json'
        : event.key === 'ArrowRight' || event.key === 'ArrowDown'
          ? current === 'json-to-yaml' ? 'yaml-to-json' : 'json-to-yaml'
          : event.key === 'ArrowLeft' || event.key === 'ArrowUp'
            ? current === 'json-to-yaml' ? 'yaml-to-json' : 'json-to-yaml'
            : null;
    if (!next) return;
    event.preventDefault();
    if (next !== current) onDirectionChange(next);
    (next === 'json-to-yaml' ? jsonDirectionRef : yamlDirectionRef).current?.focus();
  };

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
      <div role="radiogroup" aria-label="변환 방향" className="direction-selector">
        {([
          ['json-to-yaml', 'JSON → YAML'],
          ['yaml-to-json', 'YAML → JSON'],
        ] as const).map(([value, label]) => <button
          key={value}
          ref={value === 'json-to-yaml' ? jsonDirectionRef : yamlDirectionRef}
          type="button"
          role="radio"
          aria-checked={direction === value}
          data-direction={value}
          tabIndex={direction === value ? 0 : -1}
          className="direction-selector__option"
          onClick={() => onDirectionChange(value)}
          onKeyDown={handleDirectionKeyDown}
        >{label}</button>)}
      </div>
      <Button className="theme-button" type="button" variant="icon" aria-label="테마 전환" onClick={onToggleTheme}>
        {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
      </Button>
    </header>
  );
}
