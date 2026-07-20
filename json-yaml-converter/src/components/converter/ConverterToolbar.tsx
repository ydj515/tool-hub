import type { ChangeEvent } from 'react';
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
  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) onOpenFile(file);
    event.target.value = '';
  };

  return <section className="converter-toolbar" aria-label="변환 도구 모음">
    <div role="radiogroup" aria-label="변환 방향" className="direction-selector">
      {([
        ['json-to-yaml', 'JSON → YAML'],
        ['yaml-to-json', 'YAML → JSON'],
      ] as const).map(([value, label]) => <button
        key={value}
        type="button"
        role="radio"
        aria-checked={direction === value}
        className="direction-selector__option"
        onClick={() => onDirectionChange(value)}
      >{label}</button>)}
    </div>
    <Button type="button" onClick={onLoadSample}>예제 불러오기</Button>
    <label className="btn btn-secondary" htmlFor="source-file">파일 열기</label>
    <input id="source-file" className="visually-hidden" type="file" aria-label="JSON 또는 YAML 파일 열기" accept=".json,.yaml,.yml,application/json,application/yaml,text/yaml" onChange={handleFileChange} />
    <Button type="button" onClick={onClear}>원본 지우기</Button>
  </section>;
}
