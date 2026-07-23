import { useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import { ChevronLeft, ChevronRight, Columns2, Eye, FileCode2, ListTree } from 'lucide-react';
import type { Diagnostic } from '../../domain/document';
import type { DocumentFormat } from '../../domain/document';
import { DocumentEditor } from '../editor/DocumentEditor';
import type { CodeEditorHandle } from '../editor/CodeEditor';
import { DocumentNavigator } from '../navigator/DocumentNavigator';
import { SwaggerPreview } from '../preview/SwaggerPreview';
import { ConversionReview } from '../conversion/ConversionReview';
import { usePanelLayout } from '../../hooks/usePanelLayout';
import type { WorkspaceState } from '../../hooks/useWorkspace';
import type { Theme } from '../../theme';

interface WorkspaceProps {
  state: WorkspaceState;
  theme: Theme;
  onChange(source: string): void;
  formatConversionEnabled: boolean;
  reviewing: boolean;
  onConvertFormat(format: DocumentFormat): void;
  onRedetect(): void;
  onForceFormat(format: DocumentFormat): void;
  onCancel(): void;
  onApply(): void;
}

function nearestLocation(pointer: string, locations: Record<string, Diagnostic['location']>): Diagnostic['location'] {
  let current = pointer;
  while (true) {
    const location = locations[current];
    if (location) return location;
    const index = current.lastIndexOf('/');
    if (index <= 0) return locations[''];
    current = current.slice(0, index);
  }
}

export function Workspace({ state, theme, onChange, formatConversionEnabled, reviewing, onConvertFormat, onRedetect, onForceFormat, onCancel, onApply }: WorkspaceProps) {
  const { layout, resize, toggle } = usePanelLayout();
  const editorRef = useRef<CodeEditorHandle>(null);
  const workspaceRef = useRef<HTMLElement>(null);
  const [mobileTab, setMobileTab] = useState<'navigator' | 'editor' | 'preview'>('editor');
  const locations = state.analysis?.parsed.pointerLocations ?? {};
  const selectPointer = (pointer: string) => {
    const location = nearestLocation(pointer, locations);
    if (location) editorRef.current?.selectLocation(location);
  };
  const selectDiagnostic = (diagnostic: Diagnostic) => {
    const location = diagnostic.location ?? nearestLocation(diagnostic.sourcePointer, locations);
    if (location) editorRef.current?.selectLocation(location);
  };
  const resizeFromPointer = (left: 'navigator' | 'editor', event: PointerEvent<HTMLButtonElement>) => {
    const element = workspaceRef.current;
    if (!element) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const update = (clientX: number) => {
      const percent = ((clientX - element.getBoundingClientRect().left) / element.getBoundingClientRect().width) * 100;
      const compactWorkspace = window.matchMedia('(max-width: 1023px)').matches;
      const boundary = left === 'editor' && compactWorkspace
        ? layout.navigator + ((100 - layout.navigator) * percent) / 100
        : percent;
      resize(left, boundary);
    };
    update(event.clientX);
    const move = (moveEvent: globalThis.PointerEvent) => update(moveEvent.clientX);
    const end = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', end);
      window.removeEventListener('pointercancel', end);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', end, { once: true });
    window.addEventListener('pointercancel', end, { once: true });
  };
  const previewDocument = state.candidate?.targetDocument ?? state.lastValid?.parsed.value;
  const stale = !state.candidate && state.status === 'invalid' && previewDocument !== undefined;
  const style = {
    '--navigator-size': layout.navigatorCollapsed ? '44px' : `${layout.navigator}fr`,
    '--navigator-divider': layout.navigatorCollapsed ? '0px' : '8px',
    '--editor-size': `${layout.editor}fr`,
    '--preview-divider': layout.previewCollapsed ? '0px' : '8px',
    '--preview-size': layout.previewCollapsed ? '44px' : `${layout.preview}fr`,
  } as CSSProperties;
  return <>
    <ConversionReview candidate={state.candidate} onApply={onApply} onCancel={onCancel} />
    <div className="mobile-workspace-tabs" role="tablist" aria-label="작업 영역 보기">
      <button className={mobileTab === 'navigator' ? 'active' : ''} type="button" role="tab" aria-selected={mobileTab === 'navigator'} onClick={() => setMobileTab('navigator')}><ListTree size={15} />구조</button>
      <button className={mobileTab === 'editor' ? 'active' : ''} type="button" role="tab" aria-selected={mobileTab === 'editor'} onClick={() => setMobileTab('editor')}><FileCode2 size={15} />편집기</button>
      <button className={mobileTab === 'preview' ? 'active' : ''} type="button" role="tab" aria-selected={mobileTab === 'preview'} onClick={() => setMobileTab('preview')}><Eye size={15} />미리보기</button>
    </div>
    <footer className="workspace-statusbar"><span className={`status-dot ${state.status}`} /> <strong>{state.status === 'valid' ? '검증 완료' : state.status === 'invalid' ? '오류 있음' : state.status === 'reviewing' ? '변환 검토 중' : state.status === 'analyzing' ? '분석 중' : state.status === 'worker-error' ? 'Worker 복구 실패 — 원문을 다운로드한 뒤 새로고침하세요.' : '입력 대기'}</strong><span>내부 참조 {state.analysis?.internalReferenceCount ?? 0}</span><span>외부 참조 경고 {state.analysis?.externalReferenceCount ?? 0}</span><span className="privacy-status">문서는 브라우저 밖으로 전송되지 않습니다.</span></footer>
    <main ref={workspaceRef} className="workspace-grid" style={style} data-reviewing={state.candidate !== undefined}>
      <aside className="workspace-panel navigator-panel" aria-label="문서 탐색기" data-mobile-hidden={mobileTab !== 'navigator'} data-collapsed={layout.navigatorCollapsed}>
        <header className="panel-header"><div><ListTree size={16} /><strong>문서 탐색기</strong></div><button className="panel-collapse-btn" aria-label={layout.navigatorCollapsed ? '탐색기 열기' : '탐색기 접기'} title={layout.navigatorCollapsed ? '탐색기 열기' : '탐색기 접기'} aria-expanded={!layout.navigatorCollapsed} type="button" onClick={() => toggle('navigator')}>{layout.navigatorCollapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}</button></header>
        {!layout.navigatorCollapsed ? <DocumentNavigator analysis={state.analysis} candidate={state.candidate} fileNotice={state.fileNotice} onSelectDiagnostic={selectDiagnostic} onSelectPointer={selectPointer} /> : null}
      </aside>
      <button className="panel-resizer" data-collapsed={layout.navigatorCollapsed} type="button" aria-label="탐색기 폭 조절" onPointerDown={(event) => resizeFromPointer('navigator', event)}><Columns2 size={12} /></button>
      <section className="workspace-panel editor-workspace-panel" data-mobile-hidden={mobileTab !== 'editor'}><DocumentEditor editorHandleRef={editorRef} source={state.source} format={state.format} theme={theme} diagnostics={state.analysis?.diagnostics ?? []} candidate={state.candidate} onChange={onChange} formatConversionEnabled={formatConversionEnabled} reviewing={reviewing} onConvertFormat={onConvertFormat} onRedetect={onRedetect} onForceFormat={onForceFormat} /></section>
      <button className="panel-resizer" data-collapsed={layout.previewCollapsed} type="button" aria-label="미리보기 폭 조절" onPointerDown={(event) => resizeFromPointer('editor', event)}><Columns2 size={12} /></button>
      <section className="workspace-panel preview-panel" aria-label="API 미리보기" data-mobile-hidden={mobileTab !== 'preview'} data-collapsed={layout.previewCollapsed}>
        <header className="panel-header"><div><Eye size={16} /><strong>API 미리보기</strong></div><button className="panel-collapse-btn" aria-label={layout.previewCollapsed ? '미리보기 열기' : '미리보기 접기'} title={layout.previewCollapsed ? '미리보기 열기' : '미리보기 접기'} aria-expanded={!layout.previewCollapsed} type="button" onClick={() => toggle('preview')}>{layout.previewCollapsed ? <ChevronLeft size={15} /> : <ChevronRight size={15} />}</button></header>
        {!layout.previewCollapsed ? <SwaggerPreview document={previewDocument} stale={stale} /> : null}
      </section>
    </main>
  </>;
}
