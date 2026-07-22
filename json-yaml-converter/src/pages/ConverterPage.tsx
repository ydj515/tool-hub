import { useEffect, useRef, useState } from 'react';
import { ConverterToolbar } from '../components/converter/ConverterToolbar';
import { ConverterWorkspace } from '../components/converter/ConverterWorkspace';
import { DiagnosticBanner } from '../components/converter/DiagnosticBanner';
import { StatusBar } from '../components/converter/StatusBar';
import type { CodeEditorHandle } from '../components/editor/CodeEditor';
import { Header } from '../components/layout/Header';
import { useConverter } from '../hooks/useConverter';
import { prettySource } from '../lib/converter';
import { downloadResult, readSourceFile } from '../lib/file';
import type { Theme } from '../theme';

interface ConverterPageProps {
  theme: Theme;
  onToggleTheme(): void;
}

export function ConverterPage({ theme, onToggleTheme }: ConverterPageProps) {
  const { state, setSource, selectDirection, setDirectionAndSource, loadSample, clear, swap, reportDiagnostic } = useConverter();
  const sourceEditorRef = useRef<CodeEditorHandle>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'source' | 'result'>('source');
  const [filePending, setFilePending] = useState(false);
  const fileRequestRef = useRef(0);
  const clipboardRequestRef = useRef(0);
  const mountedRef = useRef(true);
  const diagnosticFocusTimerRef = useRef<number | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (diagnosticFocusTimerRef.current !== null) window.clearTimeout(diagnosticFocusTimerRef.current);
    };
  }, []);

  const beginMutation = () => {
    fileRequestRef.current += 1;
    clipboardRequestRef.current += 1;
    setFilePending(false);
    setMessage(null);
    return fileRequestRef.current;
  };

  const handlePretty = () => {
    if (state.status !== 'valid') return;
    beginMutation();
    try {
      const result = prettySource(state.source, state.direction);
      if (result.ok) sourceEditorRef.current?.replaceAll(result.value);
      else reportDiagnostic(result.diagnostic);
    } catch {
      reportDiagnostic({
        format: state.direction === 'json-to-yaml' ? 'json' : 'yaml',
        code: 'UNEXPECTED_ERROR',
        message: 'Pretty 중 예상하지 못한 오류가 발생했습니다.',
        startOffset: 0,
        endOffset: 1,
        line: 1,
        column: 1,
      });
    }
  };
  const handleFile = async (file: File) => {
    const request = beginMutation();
    setFilePending(true);
    const result = await readSourceFile(file);
    if (!mountedRef.current || request !== fileRequestRef.current) return;
    setFilePending(false);
    if (result.ok) {
      clipboardRequestRef.current += 1;
      setDirectionAndSource(result.value.direction, result.value.source);
    } else setMessage(result.error.message);
  };
  const handleCopy = async () => {
    const revision = fileRequestRef.current;
    const request = clipboardRequestRef.current + 1;
    const result = state.result;
    clipboardRequestRef.current = request;
    try {
      await navigator.clipboard.writeText(result);
      if (!mountedRef.current || revision !== fileRequestRef.current || request !== clipboardRequestRef.current) return;
      setMessage('결과를 클립보드에 복사했습니다.');
    } catch {
      if (!mountedRef.current || revision !== fileRequestRef.current || request !== clipboardRequestRef.current) return;
      setMessage('결과를 클립보드에 복사하지 못했습니다.');
    }
  };
  const handleDownload = () => {
    try {
      downloadResult(state.result, state.direction);
    } catch {
      setMessage('결과 파일을 만들지 못했습니다.');
    }
  };
  const handleSourceChange = (value: string) => { beginMutation(); setSource(value); };
  const handleDirectionChange = (direction: typeof state.direction) => { beginMutation(); setActiveTab('source'); selectDirection(direction); };
  const handleLoadSample = () => { beginMutation(); loadSample(); };
  const handleClear = () => { beginMutation(); clear(); };
  const handleSwap = () => { beginMutation(); setActiveTab('source'); swap(); };
  const handleDiagnosticFocus = () => {
    setActiveTab('source');
    if (diagnosticFocusTimerRef.current !== null) window.clearTimeout(diagnosticFocusTimerRef.current);
    diagnosticFocusTimerRef.current = window.setTimeout(() => {
      diagnosticFocusTimerRef.current = null;
      if (mountedRef.current) sourceEditorRef.current?.focusDiagnostic();
    }, 0);
  };
  const handleTabChange = (tab: 'source' | 'result') => {
    if (diagnosticFocusTimerRef.current !== null) {
      window.clearTimeout(diagnosticFocusTimerRef.current);
      diagnosticFocusTimerRef.current = null;
    }
    setActiveTab(tab);
  };

  return <>
    <Header theme={theme} direction={state.direction} onDirectionChange={handleDirectionChange} onToggleTheme={onToggleTheme} />
    <main className="converter-page" aria-label="변환기 작업 공간" data-testid="converter-studio">
      <section className="studio-control-card" data-testid="converter-control-card">
        <div className="studio-control-card__main">
          <ConverterToolbar onLoadSample={handleLoadSample} onOpenFile={handleFile} onClear={handleClear} />
          <StatusBar state={state} />
        </div>
        <p className="control-card__privacy">자동 변환 · 모든 처리는 브라우저 안에서 완료됩니다.</p>
      </section>
      {message ? <p className="action-message" role="status">{message}</p> : null}
      {state.diagnostic ? <DiagnosticBanner diagnostic={state.diagnostic} onFocus={handleDiagnosticFocus} /> : null}
      <ConverterWorkspace state={state} theme={theme} sourceEditorRef={sourceEditorRef} activeTab={activeTab} filePending={filePending} onTabChange={handleTabChange} onSourceChange={handleSourceChange} onPretty={handlePretty} onCopy={handleCopy} onDownload={handleDownload} onSwap={handleSwap} />
    </main>
  </>;
}

export default ConverterPage;
