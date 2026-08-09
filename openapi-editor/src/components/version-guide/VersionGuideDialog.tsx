import { ExternalLink, X } from 'lucide-react';
import { useEffect, useId, useRef, type KeyboardEvent, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import type { SpecFamily } from '../../domain/document';
import { SPEC_VERSION_GUIDE, SPEC_VERSION_GUIDE_ORDER } from '../../data/spec-version-guide';
import { Badge } from '../design-system/Badge';
import { Button } from '../design-system/Button';

interface VersionGuideDialogProps {
  open: boolean;
  sourceVersion?: SpecFamily;
  targetVersion: SpecFamily;
  returnFocusRef: RefObject<HTMLButtonElement | null>;
  onClose(): void;
}

const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function VersionGuideDialog({ open, sourceVersion, targetVersion, returnFocusRef, onClose }: VersionGuideDialogProps) {
  const titleId = useId();
  const syntaxTitleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!open) return undefined;
    const previousOverflow = document.body.style.overflow;
    const returnFocusTarget = returnFocusRef.current;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      returnFocusTarget?.focus();
    };
  }, [open, returnFocusRef]);

  if (!open) return null;

  const trapFocus = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key !== 'Tab') return;
    const focusable = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []);
    const first = focusable[0];
    const last = focusable.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  };

  return createPortal(
    <div className="version-guide-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section ref={dialogRef} className="version-guide-dialog" role="dialog" aria-modal="true" aria-labelledby={titleId} onKeyDown={trapFocus}>
        <header className="version-guide-header">
          <div>
            <h2 id={titleId}>Swagger/OpenAPI 버전 가이드</h2>
            <p>명세 버전별 표현 기능과 선택 기준을 비교합니다.</p>
          </div>
          <Button ref={closeRef} variant="icon" aria-label="버전 가이드 닫기" onClick={onClose}><X size={18} /></Button>
        </header>
        <p className="version-guide-patch-note">3.0.4와 3.1.2 같은 패치 버전은 기능 추가가 아니라 명세 설명과 오류를 보완합니다.</p>
        <div className="version-guide-content">
          <table className="version-guide-table" aria-label="버전별 핵심 차이와 선택 기준">
            <thead><tr><th scope="col">버전</th><th scope="col">핵심 차이</th><th scope="col">선택 기준</th></tr></thead>
            <tbody>{SPEC_VERSION_GUIDE_ORDER.map((family) => {
              const item = SPEC_VERSION_GUIDE[family];
              return <tr key={family}>
                <th scope="row">
                  <strong>{item.label}</strong>
                  <span className="version-guide-badges">
                    {sourceVersion === family ? <Badge variant="success">현재 문서</Badge> : null}
                    {targetVersion === family ? <Badge variant="primary">변환 대상</Badge> : null}
                  </span>
                </th>
                <td data-label="핵심 차이">{item.difference}</td>
                <td data-label="선택 기준">
                  <p>{item.selection}</p>
                  <a href={item.officialUrl} target="_blank" rel="noreferrer" aria-label={`${item.label} 공식 명세 새 탭에서 열기`}>
                    공식 명세 보기<ExternalLink size={14} />
                  </a>
                </td>
              </tr>;
            })}</tbody>
          </table>
          <section className="version-guide-syntax-section" aria-labelledby={syntaxTitleId}>
            <h3 id={syntaxTitleId}>자주 헷갈리는 문법</h3>
            <p>같은 이름의 키워드도 Schema와 Parameter·Media Type에서 값의 형태가 다를 수 있습니다.</p>
            <table className="version-guide-syntax-table" aria-label="버전별 작성 문법">
              <thead><tr><th scope="col">버전</th><th scope="col">null 허용</th><th scope="col">Schema 예시</th><th scope="col">Parameter/Media 예시</th></tr></thead>
              <tbody>{SPEC_VERSION_GUIDE_ORDER.map((family) => {
                const item = SPEC_VERSION_GUIDE[family];
                return <tr key={family}>
                  <th scope="row">{item.label}</th>
                  <td data-label="null 허용"><p>{item.syntax.nullability.description}</p><code>{item.syntax.nullability.example}</code></td>
                  <td data-label="Schema 예시"><p>{item.syntax.schemaExamples.description}</p><code>{item.syntax.schemaExamples.example}</code></td>
                  <td data-label="Parameter/Media 예시"><p>{item.syntax.parameterMediaExamples.description}</p><code>{item.syntax.parameterMediaExamples.example}</code></td>
                </tr>;
              })}</tbody>
            </table>
          </section>
        </div>
      </section>
    </div>,
    document.body,
  );
}
