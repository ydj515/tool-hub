import { FileCode2, Play } from 'lucide-react';
import type { Diagnostic } from '../../domain/diagnostic';
import { sampleDocumentFor } from '../../data/samples';
import type { Theme } from '../../theme';
import { Button } from '../design-system/Button';
import { FileDropzone } from './FileDropzone';
import { SpecEditor } from './SpecEditor';

export interface SpecInputStepProps {
  source: string;
  filename?: string;
  diagnostics: Diagnostic[];
  theme?: Theme;
  disabled: boolean;
  canAnalyze: boolean;
  onSourceChange: (value: string) => void;
  onFile: (file: File) => void;
  onAnalyze: () => void;
}

export function SpecInputStep({
  source,
  filename,
  diagnostics,
  theme = 'light',
  disabled,
  canAnalyze,
  onSourceChange,
  onFile,
  onAnalyze,
}: SpecInputStepProps) {
  return (
    <section className="ds-card step-panel input-step" aria-labelledby="input-heading">
      <div className="section-heading">
        <div>
          <p className="eyebrow">1단계</p>
          <h2 id="input-heading">OpenAPI 명세 입력</h2>
          <p>YAML 또는 JSON을 붙여 넣거나 브라우저에서 파일을 여세요.</p>
        </div>
        <div className="sample-actions" aria-label="예제 명세">
          <Button onClick={() => onSourceChange(sampleDocumentFor('openapi-3.0'))}>OpenAPI 3.0 예제</Button>
          <Button onClick={() => onSourceChange(sampleDocumentFor('openapi-3.1'))}>OpenAPI 3.1 예제</Button>
        </div>
      </div>

      <FileDropzone disabled={disabled} onFile={onFile} />
      <div className="editor-card">
        <div className="editor-toolbar">
          <span><FileCode2 size={16} strokeWidth={2} aria-hidden="true" /> {filename ?? '새 명세'}</span>
          <span>{new TextEncoder().encode(source).byteLength.toLocaleString()} B</span>
        </div>
        <SpecEditor value={source} filename={filename} diagnostics={diagnostics} theme={theme} disabled={disabled} onChange={onSourceChange} />
      </div>

      {diagnostics.length > 0 && (
        <div className="diagnostic-list" role={diagnostics.some((item) => item.blocking) ? 'alert' : 'status'}>
          {diagnostics.map((diagnostic) => <p key={diagnostic.id}><strong>{diagnostic.code}</strong> {diagnostic.message}</p>)}
        </div>
      )}

      <div className="step-actions">
        <p>분석은 버튼을 누를 때만 시작합니다.</p>
        <Button variant="primary" disabled={!canAnalyze || disabled} onClick={onAnalyze}>
          <Play size={16} strokeWidth={2} aria-hidden="true" /> 테스트 생성
        </Button>
      </div>
    </section>
  );
}
