import type { RefObject, ReactNode } from 'react';
import { CodeEditor, type CodeEditorHandle } from '../editor/CodeEditor';
import type { DataFormat, Diagnostic } from '../../lib/diagnostics';
import type { Theme } from '../../theme';
import { Button } from '../ui/Button';

interface EditorPanelProps {
  kind: 'source' | 'result';
  format: DataFormat;
  value: string;
  theme: Theme;
  diagnostic: Diagnostic | null;
  editorRef?: RefObject<CodeEditorHandle | null>;
  onChange?(value: string): void;
  onPretty?(): void;
  onCopy?(): void;
  onDownload?(): void;
  prettyDisabled?: boolean;
  resultDisabled?: boolean;
  mobileHidden: boolean;
  panelId: string;
  tabId: string;
  isMobile: boolean;
  children?: ReactNode;
}

export function EditorPanel({
  kind, format, value, theme, diagnostic, editorRef, onChange, onPretty, onCopy, onDownload,
  prettyDisabled = false, resultDisabled = false, mobileHidden, panelId, tabId, isMobile, children,
}: EditorPanelProps) {
  const source = kind === 'source';
  const label = `${format.toUpperCase()} ${source ? '원본' : '결과'}`;
  const mobileTabPanelProps = isMobile ? { role: 'tabpanel', id: panelId, 'aria-labelledby': tabId, tabIndex: 0 } : {};
  return <section className="editor-panel" {...mobileTabPanelProps} data-kind={kind} data-mobile-hidden={mobileHidden} aria-label={`${source ? '원본' : '결과'} 편집기`}>
    <header className="editor-panel__header">
      <div><strong>{source ? '원본' : '결과'}</strong><span className="format-label">{format.toUpperCase()}</span></div>
      <div className="editor-panel__actions">
        {source
          ? <Button type="button" variant="ghost" onClick={onPretty} disabled={prettyDisabled}>{format.toUpperCase()} Pretty</Button>
          : <><Button type="button" variant="ghost" onClick={onCopy} disabled={resultDisabled}>결과 복사</Button><Button type="button" variant="ghost" onClick={onDownload} disabled={resultDisabled}>결과 다운로드</Button></>}
      </div>
    </header>
    {children}
    <div className="editor-frame"><CodeEditor ref={editorRef} ariaLabel={label} value={value} format={format} theme={theme} readOnly={!source} diagnostic={source ? diagnostic : null} onChange={onChange ?? (() => undefined)} /></div>
  </section>;
}
