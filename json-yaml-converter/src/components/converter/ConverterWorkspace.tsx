import { useState } from 'react';
import type { RefObject } from 'react';
import type { ConverterState } from '../../hooks/useConverter';
import type { CodeEditorHandle } from '../editor/CodeEditor';
import type { Theme } from '../../theme';
import { EditorPanel } from './EditorPanel';

interface ConverterWorkspaceProps {
  state: ConverterState;
  theme: Theme;
  sourceEditorRef: RefObject<CodeEditorHandle | null>;
  onSourceChange(value: string): void;
  onPretty(): void;
  onCopy(): void;
  onDownload(): void;
  onSwap(): void;
}

export function ConverterWorkspace({ state, theme, sourceEditorRef, onSourceChange, onPretty, onCopy, onDownload, onSwap }: ConverterWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<'source' | 'result'>('source');
  const sourceFormat = state.direction === 'json-to-yaml' ? 'json' : 'yaml';
  const resultFormat = sourceFormat === 'json' ? 'yaml' : 'json';
  const disabled = !state.resultFresh || state.result.length === 0;
  const switchAndSwap = () => { setActiveTab('source'); onSwap(); };
  return <>
    <div className="mobile-tabs" role="tablist" aria-label="편집기 보기">
      <button type="button" role="tab" aria-selected={activeTab === 'source'} onClick={() => setActiveTab('source')}>원본</button>
      <button type="button" role="tab" aria-selected={activeTab === 'result'} onClick={() => setActiveTab('result')}>결과{state.resultFresh ? <span className="completion-badge">변환 완료</span> : null}</button>
    </div>
    <div className="converter-grid">
      <EditorPanel kind="source" format={sourceFormat} value={state.source} theme={theme} diagnostic={state.diagnostic} editorRef={sourceEditorRef} onChange={onSourceChange} onPretty={onPretty} prettyDisabled={state.status !== 'valid'} mobileHidden={activeTab !== 'source'} />
      <div className="converter-grid__swap"><button type="button" className="btn btn-icon" aria-label="변환 방향 전환" disabled={disabled} onClick={switchAndSwap}>⇄</button></div>
      <EditorPanel kind="result" format={resultFormat} value={state.result} theme={theme} diagnostic={null} onCopy={onCopy} onDownload={onDownload} resultDisabled={disabled} mobileHidden={activeTab !== 'result'}>{!state.resultFresh && state.result.length > 0 ? <p className="stale-result" role="status">현재 입력과 동기화되지 않은 결과</p> : null}</EditorPanel>
    </div>
  </>;
}
