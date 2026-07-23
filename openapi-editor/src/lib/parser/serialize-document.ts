import { stringify } from 'yaml';
import type { DocumentFormat, OpenApiDocument } from '../../domain/document';

export function serializeDocument(document: OpenApiDocument, format: DocumentFormat): string {
  if (format === 'json') return `${JSON.stringify(document, null, 2)}\n`;
  const output = stringify(document, { indent: 2, lineWidth: 0 });
  return output.endsWith('\n') ? output : `${output}\n`;
}
