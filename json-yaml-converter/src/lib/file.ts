import type { ConverterDirection } from './converter';
import { SIZE_LIMIT_BYTES } from './size';

export interface FileProblem {
  code: 'FILE_EXTENSION' | 'FILE_TOO_LARGE' | 'FILE_READ_FAILED';
  message: string;
}

export type FileResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: FileProblem };

export function directionForFileName(name: string): FileResult<ConverterDirection> {
  const extension = name.toLowerCase().split('.').pop();
  if (extension === 'json') return { ok: true, value: 'json-to-yaml' };
  if (extension === 'yaml' || extension === 'yml') return { ok: true, value: 'yaml-to-json' };
  return { ok: false, error: { code: 'FILE_EXTENSION', message: 'JSON 또는 YAML 파일만 열 수 있습니다.' } };
}

export async function readSourceFile(
  file: File,
): Promise<FileResult<{ source: string; direction: ConverterDirection }>> {
  const direction = directionForFileName(file.name);
  if (!direction.ok) return direction;
  if (file.size > SIZE_LIMIT_BYTES) {
    return { ok: false, error: { code: 'FILE_TOO_LARGE', message: '1MB 이하 파일만 열 수 있습니다.' } };
  }
  try {
    return { ok: true, value: { source: await file.text(), direction: direction.value } };
  } catch {
    return { ok: false, error: { code: 'FILE_READ_FAILED', message: '파일을 읽을 수 없습니다.' } };
  }
}

export function downloadResult(source: string, direction: ConverterDirection): void {
  const output = direction === 'json-to-yaml'
    ? { name: 'converted.yaml', type: 'application/yaml' }
    : { name: 'converted.json', type: 'application/json' };
  const url = URL.createObjectURL(new Blob([source], { type: output.type }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = output.name;
  anchor.hidden = true;
  anchor.click();
  URL.revokeObjectURL(url);
}
