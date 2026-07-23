import type { DocumentFormat } from '../../domain/document';

export function normalizeDownloadFilename(filename: string | undefined, format: DocumentFormat): string {
  const extension = format === 'yaml' ? '.yaml' : '.json';
  const rawBasename = filename?.replace(/^.*[\\/]/, '') ?? '';
  const basename = [...rawBasename]
    .filter((character) => character.charCodeAt(0) >= 32 && !'<>:"|?*'.includes(character))
    .join('')
    .replace(/\.(ya?ml|json)$/i, '') || 'openapi';
  return `${basename || 'openapi'}${extension}`;
}

export function downloadText(text: string, filename: string, format: DocumentFormat): void {
  const type = format === 'yaml' ? 'application/yaml;charset=utf-8' : 'application/json;charset=utf-8';
  const url = URL.createObjectURL(new Blob([text], { type }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
