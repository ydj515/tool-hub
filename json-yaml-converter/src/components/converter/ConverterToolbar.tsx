import { useRef } from 'react';
import type { ChangeEvent } from 'react';
import { Button } from '../design-system/Button';
import { FileCode2, FolderOpen, Trash2 } from 'lucide-react';

interface ConverterToolbarProps {
  onLoadSample(): void;
  onOpenFile(file: File): void;
  onClear(): void;
}

export function ConverterToolbar({
  onLoadSample, onOpenFile, onClear,
}: ConverterToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) onOpenFile(file);
    event.target.value = '';
  };

  return <section className="converter-toolbar" aria-label="변환 도구 모음">
    <Button type="button" onClick={onLoadSample}><FileCode2 size={16} aria-hidden="true" />예제 불러오기</Button>
    <Button type="button" onClick={() => fileInputRef.current?.click()}><FolderOpen size={16} aria-hidden="true" />파일 열기</Button>
    <input ref={fileInputRef} id="source-file" className="visually-hidden" tabIndex={-1} type="file" aria-label="JSON 또는 YAML 파일 열기" accept=".json,.yaml,.yml,application/json,application/yaml,text/yaml" onChange={handleFileChange} />
    <Button type="button" onClick={onClear}><Trash2 size={16} aria-hidden="true" />원본 지우기</Button>
  </section>;
}
