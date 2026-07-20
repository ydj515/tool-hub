import { useRef } from 'react';
import type { ChangeEvent, KeyboardEvent } from 'react';
import type { ConverterDirection } from '../../lib/converter';
import { Button } from '../ui/Button';

interface ConverterToolbarProps {
  direction: ConverterDirection;
  onDirectionChange(direction: ConverterDirection): void;
  onLoadSample(): void;
  onOpenFile(file: File): void;
  onClear(): void;
}

export function ConverterToolbar({
  direction, onDirectionChange, onLoadSample, onOpenFile, onClear,
}: ConverterToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const jsonDirectionRef = useRef<HTMLButtonElement>(null);
  const yamlDirectionRef = useRef<HTMLButtonElement>(null);
  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) onOpenFile(file);
    event.target.value = '';
  };
  const handleDirectionKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const next = event.key === 'ArrowRight' || event.key === 'ArrowDown' || event.key === 'End'
      ? 'yaml-to-json'
      : event.key === 'ArrowLeft' || event.key === 'ArrowUp' || event.key === 'Home'
        ? 'json-to-yaml'
        : null;
    if (!next) return;
    event.preventDefault();
    onDirectionChange(next);
    (next === 'json-to-yaml' ? jsonDirectionRef : yamlDirectionRef).current?.focus();
  };

  return <section className="converter-toolbar" aria-label="변환 도구 모음">
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
        tabIndex={direction === value ? 0 : -1}
        className="direction-selector__option"
        onClick={() => onDirectionChange(value)}
        onKeyDown={handleDirectionKeyDown}
      >{label}</button>)}
    </div>
    <Button type="button" onClick={onLoadSample}>예제 불러오기</Button>
    <Button type="button" onClick={() => fileInputRef.current?.click()}>파일 열기</Button>
    <input ref={fileInputRef} id="source-file" className="visually-hidden" type="file" aria-label="JSON 또는 YAML 파일 열기" accept=".json,.yaml,.yml,application/json,application/yaml,text/yaml" onChange={handleFileChange} />
    <Button type="button" onClick={onClear}>원본 지우기</Button>
  </section>;
}
