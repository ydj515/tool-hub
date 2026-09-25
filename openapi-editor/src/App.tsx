import { useEffect, useEffectEvent, useRef, useState } from 'react';
import type { DocumentFormat, SpecFamily } from './domain/document';
import { Topbar } from './components/layout/Topbar';
import { Workspace } from './components/layout/Workspace';
import { useTheme } from './hooks/useTheme';
import { useWorkspace } from './hooks/useWorkspace';
import { downloadText, normalizeDownloadFilename } from './lib/files/download';
import { serializeDocument } from './lib/parser/serialize-document';
import { sampleDocumentFor, sampleDownloadFilename } from './data/spec-samples';
import { redocUnavailableReason } from './lib/files/redoc-support';

function canUseParsedDocument(source: ReturnType<typeof useWorkspace>['state']): boolean {
  return source.analysis?.parsed.value !== undefined && !source.analysis.diagnostics.some((item) => item.severity === 'error');
}

export default function App() {
  const { theme, toggle } = useTheme();
  const workspace = useWorkspace();
  const [target, setTarget] = useState<SpecFamily>('openapi-3.1');
  const { state } = workspace;
  const [draggingFile, setDraggingFile] = useState(false);
  const resetFileDrag = useRef(() => {});
  const [exportingHtml, setExportingHtml] = useState(false);
  const [htmlError, setHtmlError] = useState<{ message: string; source: string }>();
  const receiveDroppedFile = useEffectEvent((file: File) => {
    if (state.status !== 'reviewing') void workspace.loadFile(file);
  });

  useEffect(() => {
    let depth = 0;
    const hasFiles = (event: DragEvent) => event.dataTransfer?.types.includes('Files');
    const reset = () => { depth = 0; setDraggingFile(false); };
    resetFileDrag.current = reset;
    const enter = (event: DragEvent) => {
      if (!hasFiles(event)) return;
      event.preventDefault();
      depth += 1;
      setDraggingFile(true);
    };
    const over = (event: DragEvent) => {
      if (!hasFiles(event)) return;
      event.preventDefault();
      event.stopPropagation();
      if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
    };
    const leave = (event: DragEvent) => {
      if (!hasFiles(event)) return;
      depth = Math.max(0, depth - 1);
      if (depth === 0) reset();
    };
    const drop = (event: DragEvent) => {
      reset();
      if (!hasFiles(event)) return;
      event.preventDefault();
      event.stopPropagation();
      const file = event.dataTransfer?.files[0];
      if (file) receiveDroppedFile(file);
    };
    window.addEventListener('dragenter', enter, true);
    window.addEventListener('dragover', over, true);
    window.addEventListener('dragleave', leave, true);
    window.addEventListener('drop', drop, true);
    window.addEventListener('dragend', reset);
    window.addEventListener('blur', reset);
    return () => {
      resetFileDrag.current = () => {};
      window.removeEventListener('dragenter', enter, true);
      window.removeEventListener('dragover', over, true);
      window.removeEventListener('dragleave', leave, true);
      window.removeEventListener('drop', drop, true);
      window.removeEventListener('dragend', reset);
      window.removeEventListener('blur', reset);
    };
  }, []);
  const valid = canUseParsedDocument(state);
  const canDownloadHtml = valid && state.status === 'valid' && state.analysis?.parsed.raw === state.source;
  const downloadHtml = async () => {
    if (!canDownloadHtml || exportingHtml || !state.analysis?.parsed.value) return;
    const document = state.analysis.parsed.value;
    const reason = redocUnavailableReason(document);
    if (reason) { setHtmlError({ message: reason, source: state.source }); return; }
    const filename = normalizeDownloadFilename(state.filename, 'html');
    setExportingHtml(true);
    setHtmlError(undefined);
    try {
      const { createHtmlDocument } = await import('./lib/files/html-document');
      downloadText(createHtmlDocument(document), filename, 'html');
    } catch {
      setHtmlError({ message: 'HTML 명세서를 생성하지 못했습니다. 다시 시도해 주세요.', source: state.source });
    } finally {
      setExportingHtml(false);
    }
  };
  const conversionEnabled = valid && state.analysis?.version !== undefined && state.status !== 'converting';
  const download = (format: DocumentFormat) => {
    const text = state.analysis?.parsed.value
      ? serializeDocument(state.analysis.parsed.value, format)
      : format === state.format ? state.source : undefined;
    if (!text) return;
    downloadText(text, normalizeDownloadFilename(state.filename, format), format);
  };
  const downloadSample = (version: SpecFamily) => {
    downloadText(serializeDocument(sampleDocumentFor(version), 'yaml'), sampleDownloadFilename(version), 'yaml');
  };

  useEffect(() => {
    const preventLoss = (event: BeforeUnloadEvent) => {
      if (state.source.trim() === '') return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', preventLoss);
    return () => window.removeEventListener('beforeunload', preventLoss);
  }, [state.source]);

  return <div className="app-shell" data-ds-page-shell>
    {draggingFile && <div className="file-drop-overlay" role="status">
      <p>{state.status === 'reviewing' ? '변환 결과를 적용하거나 취소한 뒤 파일을 놓아 주세요.' : '파일을 놓으면 OpenAPI 문서를 불러옵니다.'}</p>
    </div>}
    <Topbar
      filename={state.filename}
      format={state.format}
      sourceVersion={state.analysis?.version}
      target={target}
      conversionEnabled={conversionEnabled}
      reviewing={state.status === 'reviewing'}
      theme={theme}
      onFile={(file) => { void workspace.loadFile(file); }}
      onTarget={setTarget}
      onDownloadSample={downloadSample}
      onConvert={() => workspace.requestConversion(target)}
      onDownload={download}
      onDownloadHtml={() => { void downloadHtml(); }}
      canDownloadHtml={canDownloadHtml}
      exportingHtml={exportingHtml}
      canDownloadYaml={valid || (state.source.trim() !== '' && state.format === 'yaml')}
      canDownloadJson={valid || (state.source.trim() !== '' && state.format === 'json')}
      onRestore={workspace.restoreSource}
      canRestore={state.restoreSnapshot !== undefined}
      onToggleTheme={toggle}
    />
    {exportingHtml && <p role="status">HTML 명세서를 생성하고 있습니다.</p>}
    {htmlError?.source === state.source && <p role="alert">{htmlError.message}</p>}
    <Workspace state={state} theme={theme} onChange={workspace.setSource} onFile={(file) => { resetFileDrag.current(); if (state.status !== 'reviewing') void workspace.loadFile(file); }} formatConversionEnabled={valid} reviewing={state.status === 'reviewing'} onConvertFormat={workspace.convertFormat} onRedetect={workspace.redetectFormat} onForceFormat={workspace.forceFormat} onCancel={workspace.cancelCandidate} onApply={workspace.applyCandidate} />
  </div>;
}
