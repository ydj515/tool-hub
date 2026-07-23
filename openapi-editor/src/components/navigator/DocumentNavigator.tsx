import { AlertTriangle, ChevronRight, FileWarning, FolderTree } from 'lucide-react';
import { useState } from 'react';
import type { AnalysisResult, ConversionCandidate, Diagnostic } from '../../domain/document';
import { buildNavigatorIndex, type NavigatorItem } from '../../lib/navigation/navigator-index';

interface DocumentNavigatorProps {
  analysis?: AnalysisResult;
  candidate?: ConversionCandidate;
  fileNotice?: Diagnostic;
  onSelectDiagnostic(diagnostic: Diagnostic): void;
  onSelectPointer(pointer: string): void;
}

function TreeItem({ item, depth, onSelect }: { item: NavigatorItem; depth: number; onSelect(pointer: string): void }) {
  return <li>
    <button type="button" className="navigator-tree-item" style={{ paddingInlineStart: `${10 + depth * 14}px` }} onClick={() => onSelect(item.pointer)}>
      {item.children?.length ? <ChevronRight size={13} aria-hidden="true" /> : <span className="navigator-spacer" />}
      {item.label}
    </button>
    {item.children?.length ? <ul>{item.children.map((child) => <TreeItem key={child.pointer} item={child} depth={depth + 1} onSelect={onSelect} />)}</ul> : null}
  </li>;
}

export function DocumentNavigator({ analysis, candidate, fileNotice, onSelectDiagnostic, onSelectPointer }: DocumentNavigatorProps) {
  const [tab, setTab] = useState<'structure' | 'diagnostics'>('structure');
  const document = candidate?.targetDocument ?? analysis?.parsed.value;
  const version = candidate?.targetVersion ?? analysis?.version;
  const diagnostics = [...(fileNotice ? [fileNotice] : []), ...(candidate?.diagnostics ?? analysis?.diagnostics ?? [])];
  const tree = document ? buildNavigatorIndex(document, version) : [];
  return <div className="navigator-content">
    <div className="panel-tabs" role="tablist" aria-label="탐색기 보기">
      <button className={tab === 'structure' ? 'active' : ''} role="tab" aria-selected={tab === 'structure'} type="button" onClick={() => setTab('structure')}><FolderTree size={14} />구조</button>
      <button className={tab === 'diagnostics' ? 'active' : ''} role="tab" aria-selected={tab === 'diagnostics'} type="button" onClick={() => setTab('diagnostics')}><FileWarning size={14} />진단 <span>{diagnostics.length}</span></button>
    </div>
    {tab === 'structure' ? <div className="navigator-scroll">
      {tree.length ? <ul className="navigator-tree">{tree.map((item) => <TreeItem key={item.pointer} item={item} depth={0} onSelect={onSelectPointer} />)}</ul> : <p className="empty-panel-copy">유효한 OpenAPI 문서를 입력하면 구조가 표시됩니다.</p>}
    </div> : <div className="navigator-scroll diagnostics-list">
      {diagnostics.length ? diagnostics.map((item) => <button type="button" className={`diagnostic-row ${item.severity}`} key={item.id} onClick={() => onSelectDiagnostic(item)}>
        <AlertTriangle size={15} /><span><strong>{item.code}</strong>{item.message}<small>{item.sourcePointer || '/'}</small></span>
      </button>) : <p className="empty-panel-copy">표시할 진단이 없습니다.</p>}
    </div>}
  </div>;
}
