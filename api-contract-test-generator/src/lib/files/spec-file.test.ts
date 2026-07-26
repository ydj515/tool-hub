import { describe, expect, it } from 'vitest';
import { readSpecFile } from './spec-file';

describe('readSpecFile', () => {
  it('20MB보다 큰 파일을 차단한다', async () => {
    const file = new File([new Uint8Array(20 * 1024 * 1024 + 1)], 'large.yaml');

    await expect(readSpecFile(file)).resolves.toMatchObject({ ok: false, error: { code: 'FILE_TOO_LARGE' } });
  });

  it('지원하지 않는 확장자를 차단한다', async () => {
    const file = new File(['openapi: 3.1.0'], 'notes.txt');

    await expect(readSpecFile(file)).resolves.toMatchObject({ ok: false, error: { code: 'UNSUPPORTED_FILE_TYPE' } });
  });

  it('5MB 이상 파일을 경고와 함께 읽는다', async () => {
    const file = new File([new Uint8Array(5 * 1024 * 1024)], 'large.json');

    await expect(readSpecFile(file)).resolves.toMatchObject({ ok: true, warning: { code: 'LARGE_INPUT_WARNING' } });
  });
});
