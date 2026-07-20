export type DataFormat = 'json' | 'yaml';

export interface Diagnostic {
  format: DataFormat;
  code: string;
  message: string;
  startOffset: number;
  endOffset: number;
  line: number;
  column: number;
}

export function buildLineStarts(source: string): number[] {
  const starts = [0];
  for (let index = 0; index < source.length; index += 1) {
    if (source[index] === '\n') starts.push(index + 1);
  }
  return starts;
}

export function positionAt(starts: number[], offset: number): { line: number; column: number } {
  let low = 0;
  let high = starts.length - 1;

  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    if (starts[middle] <= offset) low = middle + 1;
    else high = middle - 1;
  }

  const lineIndex = Math.max(0, high);
  return { line: lineIndex + 1, column: offset - starts[lineIndex] + 1 };
}

export function diagnosticAt(
  format: DataFormat,
  code: string,
  message: string,
  source: string,
  offset: number,
  length: number,
): Diagnostic {
  const safeOffset = Math.max(0, Math.min(offset, source.length));
  const { line, column } = positionAt(buildLineStarts(source), safeOffset);

  return {
    format,
    code,
    message,
    startOffset: safeOffset,
    endOffset: safeOffset + Math.max(1, length),
    line,
    column,
  };
}
