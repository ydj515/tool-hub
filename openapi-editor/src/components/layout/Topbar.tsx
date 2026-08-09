import { BookOpen, FileUp, RotateCcw, WandSparkles } from 'lucide-react';
import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { UtilityMenu } from '../common/UtilityMenu';
import type { DocumentFormat, SpecFamily } from '../../domain/document';
import { TOOL_HUB_URL } from '../../constants';
import type { Theme } from '../../theme';
import { Button } from '../design-system/Button';
import { ToolHeader } from '../design-system/ToolHeader';
import { PRODUCT, ProductIcon } from '../design-system/product.generated';
import { VersionGuideDialog } from '../version-guide/VersionGuideDialog';

type UtilityMenuName = 'more';

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

const sampleLabel: Record<SpecFamily, string> = { 'swagger-2.0': 'Swagger 2.0', 'openapi-3.0': 'OpenAPI 3.0.4', 'openapi-3.1': 'OpenAPI 3.1.2', 'openapi-3.2': 'OpenAPI 3.2.0' };
const sampleVersions: SpecFamily[] = ['swagger-2.0', 'openapi-3.0', 'openapi-3.1', 'openapi-3.2'];

export function Topbar({ sourceVersion, target, conversionEnabled, reviewing, theme, onFile, onTarget, onDownloadSample, onConvert, onDownload, canDownloadYaml, canDownloadJson, onRestore, canRestore, onToggleTheme }: TopbarProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const menuAreaRef = useRef<HTMLDivElement>(null);
  const moreTriggerRef = useRef<HTMLButtonElement>(null);
  const suppressMoreOpenRef = useRef(false);
  const [openMenu, setOpenMenu] = useState<UtilityMenuName | null>(null);
  const [versionGuideOpen, setVersionGuideOpen] = useState(false);
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
  const openMoreMenu = () => {
    if (suppressMoreOpenRef.current) {
      suppressMoreOpenRef.current = false;
      return;
    }
    setOpenMenu('more');
  };
  const closeVersionGuide = () => {
    suppressMoreOpenRef.current = true;
    setVersionGuideOpen(false);
  };

  const actions = <div ref={menuAreaRef} className="openapi-header-actions">
    <label className="select-label"><span className="select-label-text">대상 버전</span>
      <select aria-label="대상 버전" value={target} onChange={(event) => onTarget(event.target.value as SpecFamily)} disabled={reviewing}>
        <option value="swagger-2.0">Swagger 2.0</option>
        <option value="openapi-3.0">OpenAPI 3.0.4</option>
        <option value="openapi-3.1">OpenAPI 3.1.2</option>
        <option value="openapi-3.2">OpenAPI 3.2.0</option>
      </select>
    </label>
    <input ref={inputRef} className="hidden-file-input" type="file" accept=".yaml,.yml,.json" onChange={chooseFile} />
    <Button variant="secondary" className="openapi-upload" aria-label="파일 업로드" onClick={() => inputRef.current?.click()} disabled={reviewing}>
      <FileUp size={16} strokeWidth={2} />
      <span className="openapi-action-label">업로드</span>
    </Button>
    <Button variant="primary" aria-label="문서 변환" onClick={onConvert} disabled={!conversionEnabled || reviewing}>
      <WandSparkles size={16} strokeWidth={2} />
      변환
    </Button>
    <UtilityMenu triggerRef={moreTriggerRef} label="더보기" isOpen={openMenu === 'more'} onOpen={openMoreMenu} onClose={() => closeMenu('more')}>
      <Button variant="secondary" role="menuitem" onClick={() => runMenuAction(() => setVersionGuideOpen(true))}><BookOpen size={16} strokeWidth={2} />버전 가이드</Button>
      <span className="utility-menu-separator" role="separator" />
      <Button variant="secondary" role="menuitem" onClick={() => runMenuAction(() => onDownload('yaml'))} disabled={!canDownloadYaml}>YAML 다운로드</Button>
      <Button variant="secondary" role="menuitem" onClick={() => runMenuAction(() => onDownload('json'))} disabled={!canDownloadJson}>JSON 다운로드</Button>
      {sampleVersions.map((version) => <Button key={version} variant="secondary" role="menuitem" onClick={() => runMenuAction(() => onDownloadSample(version))} disabled={reviewing}>{sampleLabel[version]} 샘플</Button>)}
      <Button variant="secondary" role="menuitem" onClick={() => runMenuAction(onRestore)} disabled={!canRestore || reviewing}>
        <RotateCcw size={16} strokeWidth={2} />
        원본 복원
      </Button>
    </UtilityMenu>
  </div>;

  return <>
    <ToolHeader
      product={{ ...PRODUCT, icon: ProductIcon }}
      homeHref={TOOL_HUB_URL}
      theme={theme}
      onThemeToggle={onToggleTheme}
      actions={actions}
    />
    <VersionGuideDialog
      open={versionGuideOpen}
      sourceVersion={sourceVersion}
      targetVersion={target}
      returnFocusRef={moreTriggerRef}
      onClose={closeVersionGuide}
    />
  </>;
}
