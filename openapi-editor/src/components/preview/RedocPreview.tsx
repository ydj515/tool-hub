import { useEffect, useEffectEvent, useRef, useState } from 'react';
import type { OpenApiDocument } from '../../domain/document';
import type { Theme } from '../../theme';
import { redocUnavailableReason } from '../../lib/files/redoc-support';

interface RedocPreviewProps {
  document?: OpenApiDocument;
  stale: boolean;
  theme: Theme;
  onFile(file: File): void;
}

export function RedocPreview({ document, stale, theme, onFile }: RedocPreviewProps) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const receiveFile = useEffectEvent(onFile);
  const [result, setResult] = useState<{ document: OpenApiDocument; theme: Theme; html?: string; failed?: boolean }>();
  const reason = document ? redocUnavailableReason(document) : undefined;
  useEffect(() => {
    if (!document || reason) return;
    let cancelled = false;
    void import('../../lib/files/html-document').then(({ createHtmlDocument }) => {
      if (!cancelled) setResult({ document, theme, html: createHtmlDocument(document, { theme, embedded: true }) });
    }).catch(() => {
      if (!cancelled) setResult({ document, theme, failed: true });
    });
    return () => { cancelled = true; };
  }, [document, reason, theme]);
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (event.source !== frameRef.current?.contentWindow || event.data?.type !== 'redoc-file-drop') return;
      if (event.data.file instanceof File) receiveFile(event.data.file);
    };
    window.addEventListener('message', receive);
    return () => window.removeEventListener('message', receive);
  }, []);

  if (!document) return <div className="preview-empty"><p>유효한 문서를 입력하면 읽기 전용 API 문서가 표시됩니다.</p></div>;
  if (reason) return <p className="preview-error" role="alert">{reason}</p>;
  if (result?.document !== document || result.theme !== theme) return <p className="preview-empty" role="status">ReDoc 미리보기를 불러오는 중입니다.</p>;
  if (result.failed) return <p className="preview-error" role="alert">ReDoc 미리보기를 불러오지 못했습니다. Swagger UI로 전환하거나 다시 시도해 주세요.</p>;
  return <div className="redoc-preview">
    {stale && <span className="stale-badge">현재 편집 내용과 다름</span>}
    <iframe ref={frameRef} title="ReDoc 명세서" sandbox="allow-scripts" srcDoc={result.html} />
  </div>;
}
