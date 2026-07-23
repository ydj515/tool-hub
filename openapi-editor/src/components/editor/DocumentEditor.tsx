import { RefreshCcw } from 'lucide-react';
import { useEffect, useRef, useState, type RefObject } from 'react';
import type { ConversionCandidate, Diagnostic, DocumentFormat } from '../../domain/document';
import type { Theme } from '../../theme';
import { UtilityMenu } from '../common/UtilityMenu';
import { CodeEditor, type CodeEditorHandle } from './CodeEditor';

interface DocumentEditorProps {
  source: string;
  format: DocumentFormat;
  theme: Theme;
  diagnostics: Diagnostic[];
  candidate?: ConversionCandidate;
  onChange(source: string): void;
  formatConversionEnabled: boolean;
  reviewing: boolean;
  onConvertFormat(format: DocumentFormat): void;
  onRedetect(): void;
  onForceFormat(format: DocumentFormat): void;
  editorHandleRef?: RefObject<CodeEditorHandle | null>;
}

export function DocumentEditor({ source, format, theme, diagnostics, candidate, onChange, formatConversionEnabled, reviewing, onConvertFormat, onRedetect, onForceFormat, editorHandleRef }: DocumentEditorProps) {
  const [tab, setTab] = useState<'source' | 'candidate'>('source');
  const [formatMenuOpen, setFormatMenuOpen] = useState(false);
  const ownRef = useRef<CodeEditorHandle>(null);
  const formatMenuRef = useRef<HTMLDivElement>(null);
  const ref = editorHandleRef ?? ownRef;
  const candidateActive = candidate && tab === 'candidate';
  const runFormatAction = (action: () => void) => {
    action();
    setFormatMenuOpen(false);
  };

  useEffect(() => {
    const closeOutside = (event: PointerEvent) => {
      if (!formatMenuRef.current?.contains(event.target as Node)) setFormatMenuOpen(false);
    };
    const closeEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setFormatMenuOpen(false);
    };
    document.addEventListener('pointerdown', closeOutside);
    document.addEventListener('keydown', closeEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOutside);
      document.removeEventListener('keydown', closeEscape);
    };
  }, []);

  return <section className="editor-panel" aria-label="문서 편집기">
    <header className="panel-header editor-header">
      <div>
        <strong>{candidateActive ? '변환 결과' : '원본 문서'}</strong>
        <span className="format-badge">{format.toUpperCase()}</span>
      </div>
      <div className="editor-header-actions">
        <div ref={formatMenuRef}>
          <UtilityMenu label="형식" isOpen={formatMenuOpen} onOpen={() => setFormatMenuOpen(true)} onClose={() => setFormatMenuOpen(false)}>
            <button className="secondary-btn compact" type="button" role="menuitem" aria-label="YAML로 변환" onClick={() => runFormatAction(() => onConvertFormat('yaml'))} disabled={!formatConversionEnabled || format === 'yaml' || reviewing}>YAML로 변환</button>
            <button className="secondary-btn compact" type="button" role="menuitem" aria-label="JSON으로 변환" onClick={() => runFormatAction(() => onConvertFormat('json'))} disabled={!formatConversionEnabled || format === 'json' || reviewing}>JSON으로 변환</button>
            <span className="utility-menu-separator" role="separator" />
            <button className="secondary-btn compact" type="button" role="menuitem" aria-label="형식 다시 감지" onClick={() => runFormatAction(onRedetect)} disabled={reviewing}><RefreshCcw size={15} />형식 다시 감지</button>
            <button className="secondary-btn compact" type="button" role="menuitem" aria-label="YAML로 읽기" onClick={() => runFormatAction(() => onForceFormat('yaml'))} disabled={reviewing}>YAML로 읽기</button>
            <button className="secondary-btn compact" type="button" role="menuitem" aria-label="JSON으로 읽기" onClick={() => runFormatAction(() => onForceFormat('json'))} disabled={reviewing}>JSON으로 읽기</button>
          </UtilityMenu>
        </div>
        {candidate ? <div className="editor-tabs" role="tablist" aria-label="변환 문서 보기">
          <button className={tab === 'source' ? 'active' : ''} role="tab" aria-selected={tab === 'source'} type="button" onClick={() => setTab('source')}>원본</button>
          <button className={tab === 'candidate' ? 'active' : ''} role="tab" aria-selected={tab === 'candidate'} type="button" onClick={() => setTab('candidate')}>변환 결과</button>
        </div> : null}
      </div>
    </header>
    <div className="editor-frame">
      <CodeEditor ref={ref} value={candidateActive ? candidate.targetText : source} format={format} theme={theme} readOnly={candidate !== undefined} diagnostics={candidateActive ? candidate.diagnostics : diagnostics} onChange={onChange} />
    </div>
  </section>;
}
