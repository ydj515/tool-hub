import { LineCounter, parseDocument } from 'yaml';
import type { SourceLocation } from '../../domain/diagnostic';

export function buildYamlPointerLocations(raw: string): Record<string, SourceLocation> {
  const lineCounter = new LineCounter();
  const document = parseDocument(raw, { lineCounter, uniqueKeys: true });
  const locations: Record<string, SourceLocation> = {
    '': {
      startLine: 1,
      startColumn: 1,
      endLine: Math.max(1, raw.split('\n').length),
      endColumn: 1,
    },
  };

  if (document.contents?.range) {
    const start = lineCounter.linePos(document.contents.range[0]);
    const end = lineCounter.linePos(document.contents.range[1]);
    locations[''] = {
      startLine: start.line,
      startColumn: start.col,
      endLine: end.line,
      endColumn: end.col,
    };
  }

  return locations;
}

export function buildJsonPointerLocations(raw: string): Record<string, SourceLocation> {
  return {
    '': {
      startLine: 1,
      startColumn: 1,
      endLine: Math.max(1, raw.split('\n').length),
      endColumn: 1,
    },
  };
}
