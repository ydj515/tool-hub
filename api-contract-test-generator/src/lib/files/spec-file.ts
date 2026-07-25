const WARNING_BYTES = 5 * 1024 * 1024;
const BLOCK_BYTES = 20 * 1024 * 1024;
const SUPPORTED_EXTENSIONS = new Set(['yaml', 'yml', 'json']);

export interface SpecFileIssue {
  code: 'FILE_TOO_LARGE' | 'UNSUPPORTED_FILE_TYPE' | 'LARGE_INPUT_WARNING' | 'FILE_READ_ERROR';
  message: string;
}

export type SpecFileResult =
  | { ok: true; filename: string; content: string; warning?: SpecFileIssue }
  | { ok: false; error: SpecFileIssue };

export async function readSpecFile(file: File): Promise<SpecFileResult> {
  const extension = file.name.split('.').pop()?.toLowerCase();
  if (!extension || !SUPPORTED_EXTENSIONS.has(extension)) {
    return { ok: false, error: { code: 'UNSUPPORTED_FILE_TYPE', message: 'yaml, yml, json 파일만 열 수 있습니다.' } };
  }
  if (file.size > BLOCK_BYTES) {
    return { ok: false, error: { code: 'FILE_TOO_LARGE', message: '20MB보다 큰 파일은 열 수 없습니다.' } };
  }

  try {
    const content = await file.text();
    return {
      ok: true,
      filename: file.name,
      content,
      warning: file.size >= WARNING_BYTES
        ? { code: 'LARGE_INPUT_WARNING', message: '5MB 이상의 명세는 분석이 느릴 수 있습니다.' }
        : undefined,
    };
  } catch {
    return { ok: false, error: { code: 'FILE_READ_ERROR', message: '파일을 읽지 못했습니다.' } };
  }
}
