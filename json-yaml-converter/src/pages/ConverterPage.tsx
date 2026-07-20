import { useEffect, useRef, useState } from 'react';
import { ConverterToolbar } from '../components/converter/ConverterToolbar';
import { ConverterWorkspace } from '../components/converter/ConverterWorkspace';
import { DiagnosticBanner } from '../components/converter/DiagnosticBanner';
import { StatusBar } from '../components/converter/StatusBar';
import type { CodeEditorHandle } from '../components/editor/CodeEditor';
import { useConverter } from '../hooks/useConverter';
import { prettySource } from '../lib/converter';
import { downloadResult, readSourceFile } from '../lib/file';
import type { Theme } from '../theme';

export function ConverterPage({ theme }: { theme: Theme }) {
  const { state, setSource, selectDirection, setDirectionAndSource, loadSample, clear, swap } = useConverter();
  const sourceEditorRef = useRef<CodeEditorHandle>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'source' | 'result'>('source');
  const fileRequestRef = useRef(0);
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
    setMessage(null);
    return fileRequestRef.current;
  };

  const handlePretty = () => {
    if (state.status !== 'valid') return;
    beginMutation();
    const result = prettySource(state.source, state.direction);
    if (result.ok) sourceEditorRef.current?.replaceAll(result.value);
  };
  const handleFile = async (file: File) => {
    const request = beginMutation();
    const result = await readSourceFile(file);
    if (!mountedRef.current || request !== fileRequestRef.current) return;
    if (result.ok) {
      setDirectionAndSource(result.value.direction, result.value.source);
    } else setMessage(result.error.message);
  };
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(state.result);
      setMessage('결과를 클립보드에 복사했습니다.');
    } catch {
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
  const handleDirectionChange = (direction: typeof state.direction) => { beginMutation(); selectDirection(direction); };
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

  return <main className="converter-page" aria-label="변환기 작업 공간">
    <ConverterToolbar direction={state.direction} onDirectionChange={handleDirectionChange} onLoadSample={handleLoadSample} onOpenFile={handleFile} onClear={handleClear} />
    {message ? <p className="action-message" role="status">{message}</p> : null}
    {state.diagnostic ? <DiagnosticBanner diagnostic={state.diagnostic} onFocus={handleDiagnosticFocus} /> : null}
    <StatusBar state={state} />
    <ConverterWorkspace state={state} theme={theme} sourceEditorRef={sourceEditorRef} activeTab={activeTab} onTabChange={setActiveTab} onSourceChange={handleSourceChange} onPretty={handlePretty} onCopy={handleCopy} onDownload={handleDownload} onSwap={handleSwap} />
  </main>;
}

export default ConverterPage;
