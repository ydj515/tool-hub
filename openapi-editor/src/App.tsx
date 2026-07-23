import { useEffect, useState } from 'react';
import type { DocumentFormat, SpecFamily } from './domain/document';
import { Topbar } from './components/layout/Topbar';
import { Workspace } from './components/layout/Workspace';
import { useTheme } from './hooks/useTheme';
import { useWorkspace } from './hooks/useWorkspace';
import { downloadText, normalizeDownloadFilename } from './lib/files/download';
import { serializeDocument } from './lib/parser/serialize-document';
import { sampleDocumentFor, sampleDownloadFilename } from './data/spec-samples';

function canUseParsedDocument(source: ReturnType<typeof useWorkspace>['state']): boolean {
  return source.analysis?.parsed.value !== undefined && !source.analysis.diagnostics.some((item) => item.severity === 'error');
}

export default function App() {
  const { theme, toggle } = useTheme();
  const workspace = useWorkspace();
  const [target, setTarget] = useState<SpecFamily>('openapi-3.1');
  const { state } = workspace;
  const valid = canUseParsedDocument(state);
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

  return <div className="app-shell">
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
      canDownloadYaml={valid || (state.source.trim() !== '' && state.format === 'yaml')}
      canDownloadJson={valid || (state.source.trim() !== '' && state.format === 'json')}
      onRestore={workspace.restoreSource}
      canRestore={state.restoreSnapshot !== undefined}
      onToggleTheme={toggle}
    />
    <Workspace state={state} theme={theme} onChange={workspace.setSource} formatConversionEnabled={valid} reviewing={state.status === 'reviewing'} onConvertFormat={workspace.convertFormat} onRedetect={workspace.redetectFormat} onForceFormat={workspace.forceFormat} onCancel={workspace.cancelCandidate} onApply={workspace.applyCandidate} />
  </div>;
}
