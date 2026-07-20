import { useRef, useState } from 'react';
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

  const handlePretty = () => {
    if (state.status !== 'valid') return;
    const result = prettySource(state.source, state.direction);
    if (result.ok) sourceEditorRef.current?.replaceAll(result.value);
  };
  const handleFile = async (file: File) => {
    const result = await readSourceFile(file);
    if (result.ok) {
      setMessage(null);
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

  return <main className="converter-page" aria-label="변환기 작업 공간">
    <ConverterToolbar direction={state.direction} onDirectionChange={selectDirection} onLoadSample={loadSample} onOpenFile={handleFile} onClear={clear} />
    {message ? <p className="action-message" role="status">{message}</p> : null}
    {state.diagnostic ? <DiagnosticBanner diagnostic={state.diagnostic} onFocus={() => sourceEditorRef.current?.focusDiagnostic()} /> : null}
    <StatusBar state={state} />
    <ConverterWorkspace state={state} theme={theme} sourceEditorRef={sourceEditorRef} onSourceChange={setSource} onPretty={handlePretty} onCopy={handleCopy} onDownload={handleDownload} onSwap={swap} />
  </main>;
}

export default ConverterPage;
