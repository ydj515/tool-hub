import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent, RefObject } from 'react';
import type { ConverterState } from '../../hooks/useConverter';
import type { CodeEditorHandle } from '../editor/CodeEditor';
import type { Theme } from '../../theme';
import { Button } from '../ui/Button';
import { DiagnosticBanner } from './DiagnosticBanner';
import { EditorPanel } from './EditorPanel';

interface ConverterWorkspaceProps {
  state: ConverterState;
  theme: Theme;
  sourceEditorRef: RefObject<CodeEditorHandle | null>;
  activeTab: 'source' | 'result';
  filePending: boolean;
  copySucceeded: boolean;
  onTabChange(tab: 'source' | 'result'): void;
  onSourceChange(value: string): void;
  onPretty(): void;
  onCopy(): void;
  onDownload(): void;
  onSwap(): void;
  onDiagnosticFocus(): void;
}

export function ConverterWorkspace({ state, theme, sourceEditorRef, activeTab, filePending, copySucceeded, onTabChange, onSourceChange, onPretty, onCopy, onDownload, onSwap, onDiagnosticFocus }: ConverterWorkspaceProps) {
  const [isMobile, setIsMobile] = useState(() => window.matchMedia('(max-width: 767px)').matches);
  const sourceTabRef = useRef<HTMLButtonElement>(null);
  const resultTabRef = useRef<HTMLButtonElement>(null);
  const sourceFormat = state.direction === 'json-to-yaml' ? 'json' : 'yaml';
  const resultFormat = sourceFormat === 'json' ? 'yaml' : 'json';
  const disabled = filePending || !state.resultFresh || state.result.length === 0;
  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 767px)');
    const update = () => setIsMobile(mediaQuery.matches);
    update();
    mediaQuery.addEventListener('change', update);
    return () => mediaQuery.removeEventListener('change', update);
  }, []);
  const selectTab = (tab: 'source' | 'result') => {
    onTabChange(tab);
    (tab === 'source' ? sourceTabRef : resultTabRef).current?.focus();
  };
  const handleTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const current = event.currentTarget.id === 'converter-source-tab' ? 'source' : 'result';
    const next = event.key === 'Home' ? 'source'
      : event.key === 'End' ? 'result'
        : event.key === 'ArrowRight' || event.key === 'ArrowDown'
          ? current === 'source' ? 'result' : 'source'
          : event.key === 'ArrowLeft' || event.key === 'ArrowUp'
            ? current === 'source' ? 'result' : 'source'
            : null;
    if (!next) return;
    event.preventDefault();
    selectTab(next);
  };
  const switchAndSwap = () => { onTabChange('source'); onSwap(); };
  return <section className="converter-workspace" data-testid="converter-workspace">
    <div className="mobile-tabs" {...(isMobile ? { role: 'tablist', 'aria-label': '편집기 보기' } : {})}>
      <button ref={sourceTabRef} type="button" {...(isMobile ? { role: 'tab', id: 'converter-source-tab', 'aria-controls': 'converter-source-panel', 'aria-selected': activeTab === 'source', tabIndex: activeTab === 'source' ? 0 : -1 } : {})} onClick={() => selectTab('source')} onKeyDown={isMobile ? handleTabKeyDown : undefined}>원본</button>
      <button ref={resultTabRef} type="button" {...(isMobile ? { role: 'tab', id: 'converter-result-tab', 'aria-controls': 'converter-result-panel', 'aria-selected': activeTab === 'result', tabIndex: activeTab === 'result' ? 0 : -1 } : {})} onClick={() => selectTab('result')} onKeyDown={isMobile ? handleTabKeyDown : undefined}>결과{state.resultFresh ? <span className="completion-badge">변환 완료</span> : null}</button>
    </div>
    <div className="converter-grid">
      <EditorPanel kind="source" format={sourceFormat} value={state.source} theme={theme} diagnostic={state.diagnostic} editorRef={sourceEditorRef} onChange={onSourceChange} onPretty={onPretty} prettyDisabled={state.status !== 'valid'} mobileHidden={activeTab !== 'source'} panelId="converter-source-panel" tabId="converter-source-tab" isMobile={isMobile} />
      <div className="converter-grid__swap"><Button type="button" className="converter-grid__swap-button" variant="icon" aria-label="변환 방향 전환" disabled={disabled} onClick={switchAndSwap}>⇄</Button></div>
      <EditorPanel kind="result" format={resultFormat} value={state.result} theme={theme} diagnostic={null} onCopy={onCopy} onDownload={onDownload} resultDisabled={disabled} copySucceeded={copySucceeded} mobileHidden={activeTab !== 'result'} panelId="converter-result-panel" tabId="converter-result-tab" isMobile={isMobile}>{!state.resultFresh && state.result.length > 0 ? <p className="stale-result" role="status">현재 입력과 동기화되지 않은 결과</p> : null}</EditorPanel>
    </div>
    {state.diagnostic ? <DiagnosticBanner diagnostic={state.diagnostic} onFocus={onDiagnosticFocus} /> : null}
  </section>;
}
