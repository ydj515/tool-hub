import type { Diagnostic, DocumentFormat } from '../../domain/document';
import { parseSource } from './parse-source';

interface DetectionInput {
  raw: string;
  filename?: string;
  lockedFormat?: DocumentFormat;
}

export interface FormatDetection {
  format: DocumentFormat;
  locked: boolean;
  diagnostics: Diagnostic[];
}

function extensionFormat(filename?: string): DocumentFormat | undefined {
  const lower = filename?.toLowerCase();
  if (lower?.endsWith('.json')) return 'json';
  if (lower?.endsWith('.yaml') || lower?.endsWith('.yml')) return 'yaml';
  return undefined;
}

export function detectDocumentFormat({ raw, filename, lockedFormat }: DetectionInput): FormatDetection {
  if (lockedFormat) return { format: lockedFormat, locked: true, diagnostics: [] };
  const extension = extensionFormat(filename);
  const candidates: DocumentFormat[] = extension ? [extension, extension === 'json' ? 'yaml' : 'json'] : ['json', 'yaml'];
  const successful = candidates.find((format) => parseSource(raw, format).ok);
  const format = successful ?? extension ?? 'yaml';
  const mismatch = extension !== undefined && successful !== undefined && extension !== successful;
  const diagnostics: Diagnostic[] = mismatch ? [{
    id: 'FILE_EXTENSION_MISMATCH:root',
    code: 'FILE_EXTENSION_MISMATCH',
    severity: 'warning',
    stage: 'parse',
    message: `파일 확장자와 내용이 달라 ${format.toUpperCase()}로 열었습니다.`,
    sourcePointer: '',
    lossy: false,
  }] : [];
  return { format, locked: extension !== undefined || successful !== undefined, diagnostics };
}
