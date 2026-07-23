import { Download, FileUp, Moon, RotateCcw, Sun, WandSparkles } from 'lucide-react';
import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { UtilityMenu } from '../common/UtilityMenu';
import type { DocumentFormat, SpecFamily } from '../../domain/document';
import type { Theme } from '../../theme';

type UtilityMenuName = 'export' | 'sample';

interface TopbarProps {
  filename?: string;
  format: DocumentFormat;
  sourceVersion?: SpecFamily;
  target: SpecFamily;
  conversionEnabled: boolean;
  reviewing: boolean;
  theme: Theme;
  onFile(file: File): void;
  onTarget(target: SpecFamily): void;
  onDownloadSample(version: SpecFamily): void;
  onConvert(): void;
  onDownload(format: DocumentFormat): void;
  canDownloadYaml: boolean;
  canDownloadJson: boolean;
  onRestore(): void;
  canRestore: boolean;
  onToggleTheme(): void;
}

const versionLabel: Record<SpecFamily, string> = { 'swagger-2.0': 'Swagger 2.0', 'openapi-3.0': 'OpenAPI 3.0', 'openapi-3.1': 'OpenAPI 3.1', 'openapi-3.2': 'OpenAPI 3.2' };
const sampleLabel: Record<SpecFamily, string> = { 'swagger-2.0': 'Swagger 2.0', 'openapi-3.0': 'OpenAPI 3.0.4', 'openapi-3.1': 'OpenAPI 3.1.2', 'openapi-3.2': 'OpenAPI 3.2.0' };
const sampleVersions: SpecFamily[] = ['swagger-2.0', 'openapi-3.0', 'openapi-3.1', 'openapi-3.2'];

export function Topbar({ filename, format, sourceVersion, target, conversionEnabled, reviewing, theme, onFile, onTarget, onDownloadSample, onConvert, onDownload, canDownloadYaml, canDownloadJson, onRestore, canRestore, onToggleTheme }: TopbarProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const menuAreaRef = useRef<HTMLDivElement>(null);
  const [openMenu, setOpenMenu] = useState<UtilityMenuName | null>(null);
  const closeMenu = (menu?: UtilityMenuName) => setOpenMenu((current) => menu === undefined || current === menu ? null : current);
  const chooseFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) onFile(file);
    event.target.value = '';
  };

  useEffect(() => {
    const closeOutside = (event: PointerEvent) => {
      if (!menuAreaRef.current?.contains(event.target as Node)) closeMenu();
    };
    const closeEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeMenu();
    };
    document.addEventListener('pointerdown', closeOutside);
    document.addEventListener('keydown', closeEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOutside);
      document.removeEventListener('keydown', closeEscape);
    };
  }, []);

  const runMenuAction = (action: () => void) => {
    action();
    closeMenu();
  };

  return <header className="topbar">
    <div className="topbar-main-row">
      <div className="document-context">
        <div className="brand-block">
          <div className="brand-icon"><WandSparkles size={21} /></div>
          <div><h1>OpenAPI Studio</h1><p>브라우저 안에서 편집 · 검증 · 변환합니다.</p></div>
        </div>
        <div className="document-meta">
          <span className="file-chip" title={filename}>{filename ?? '새 문서'} · {format.toUpperCase()}</span>
          <span className="version-chip">{sourceVersion ? versionLabel[sourceVersion] : '버전 미감지'}</span>
        </div>
      </div>
      <div className="topbar-action-group">
        <div className="primary-actions" role="group" aria-label="핵심 작업">
          <label className="select-label">대상 버전
            <select aria-label="대상 버전" value={target} onChange={(event) => onTarget(event.target.value as SpecFamily)} disabled={reviewing}>
              <option value="swagger-2.0">Swagger 2.0</option><option value="openapi-3.0">OpenAPI 3.0.4</option><option value="openapi-3.1">OpenAPI 3.1.2</option><option value="openapi-3.2">OpenAPI 3.2.0</option>
            </select>
          </label>
          <input ref={inputRef} className="hidden-file-input" type="file" accept=".yaml,.yml,.json" onChange={chooseFile} />
          <button className="secondary-btn compact" type="button" aria-label="파일 업로드" onClick={() => inputRef.current?.click()} disabled={reviewing}><FileUp size={15} />업로드</button>
          <button className="primary-btn" type="button" aria-label="변환" onClick={onConvert} disabled={!conversionEnabled || reviewing}><WandSparkles size={15} />변환</button>
        </div>
        <button className="theme-btn topbar-theme-btn" type="button" aria-label="테마 전환" onClick={onToggleTheme}>{theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}</button>
      </div>
    </div>
    <div ref={menuAreaRef} className="topbar-secondary-row" role="group" aria-label="보조 작업">
      <UtilityMenu label="내보내기" isOpen={openMenu === 'export'} onOpen={() => setOpenMenu('export')} onClose={() => closeMenu('export')}>
        <button className="secondary-btn compact" type="button" role="menuitem" aria-label="YAML 다운로드" onClick={() => runMenuAction(() => onDownload('yaml'))} disabled={!canDownloadYaml}><Download size={15} />YAML 다운로드</button>
        <button className="secondary-btn compact" type="button" role="menuitem" aria-label="JSON 다운로드" onClick={() => runMenuAction(() => onDownload('json'))} disabled={!canDownloadJson}><Download size={15} />JSON 다운로드</button>
      </UtilityMenu>
      <UtilityMenu label="샘플" isOpen={openMenu === 'sample'} onOpen={() => setOpenMenu('sample')} onClose={() => closeMenu('sample')}>
        {sampleVersions.map((version) => <button key={version} className="secondary-btn compact" type="button" role="menuitem" aria-label={`${sampleLabel[version]} 샘플 다운로드`} onClick={() => runMenuAction(() => onDownloadSample(version))} disabled={reviewing}><Download size={15} />{sampleLabel[version]}</button>)}
      </UtilityMenu>
      <button className="icon-btn" type="button" aria-label="원본 복원" title="원본 복원" onClick={onRestore} disabled={!canRestore || reviewing}><RotateCcw size={16} /></button>
    </div>
  </header>;
}
