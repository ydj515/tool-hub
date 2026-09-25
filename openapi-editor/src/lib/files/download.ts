import type { DocumentFormat } from '../../domain/document';

type DownloadFormat = DocumentFormat | 'html';

export function normalizeDownloadFilename(filename: string | undefined, format: DownloadFormat): string {
  const extension = `.${format}`;
  const rawBasename = filename?.replace(/^.*[\\/]/, '') ?? '';
  const basename = [...rawBasename]
    .filter((character) => character.charCodeAt(0) >= 32 && !'<>:"|?*'.includes(character))
    .join('')
    .replace(/\.(ya?ml|json|html)$/i, '') || 'openapi';
  return `${basename || 'openapi'}${extension}`;
}

export function downloadText(text: string, filename: string, format: DownloadFormat): void {
  const type = format === 'html' ? 'text/html;charset=utf-8' : `application/${format};charset=utf-8`;
  const url = URL.createObjectURL(new Blob([text], { type }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
