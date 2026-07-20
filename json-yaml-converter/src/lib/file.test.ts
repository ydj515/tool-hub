import { beforeEach, describe, expect, it, vi } from 'vitest';
import { directionForFileName, downloadResult, readSourceFile } from './file';
import { SIZE_LIMIT_BYTES } from './size';

describe('file adapter', () => {
  beforeEach(() => {
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => 'blob:test'),
      revokeObjectURL: vi.fn(),
    });
  });

  it.each([
    ['config.json', 'json-to-yaml'],
    ['config.yaml', 'yaml-to-json'],
    ['config.yml', 'yaml-to-json'],
    ['CONFIG.JSON', 'json-to-yaml'],
  ] as const)('%s의 방향을 결정한다', (name, direction) => {
    expect(directionForFileName(name)).toEqual({ ok: true, value: direction });
  });

  it('지원하지 않는 확장자와 1MB 초과 파일을 거부한다', async () => {
    expect(directionForFileName('config.txt').ok).toBe(false);
    const file = new File(['x'], 'large.json');
    Object.defineProperty(file, 'size', { value: SIZE_LIMIT_BYTES + 1 });
    expect((await readSourceFile(file)).ok).toBe(false);
  });

  it('정확히 1MB인 파일은 읽는다', async () => {
    const file = new File(['x'], 'limit.json');
    Object.defineProperty(file, 'size', { value: SIZE_LIMIT_BYTES });
    await expect(readSourceFile(file)).resolves.toEqual({
      ok: true,
      value: { source: 'x', direction: 'json-to-yaml' },
    });
  });

  it('1MB 이하 YAML 파일을 읽고 방향과 원문을 반환한다', async () => {
    const result = await readSourceFile(new File(['name: tool-hub\n'], 'config.yaml'));
    expect(result).toEqual({
      ok: true,
      value: { source: 'name: tool-hub\n', direction: 'yaml-to-json' },
    });
  });

  it('파일 읽기 실패를 별도 오류로 반환한다', async () => {
    const file = { name: 'broken.json', size: 1, text: vi.fn().mockRejectedValue(new Error('failed')) } as unknown as File;
    await expect(readSourceFile(file)).resolves.toEqual({
      ok: false,
      error: { code: 'FILE_READ_FAILED', message: '파일을 읽을 수 없습니다.' },
    });
  });

  it.each([
    ['a: 1\n', 'json-to-yaml', 'converted.yaml', 'application/yaml'],
    ['{\n  "a": 1\n}\n', 'yaml-to-json', 'converted.json', 'application/json'],
  ] as const)('%s 방향 결과를 올바른 파일로 다운로드한다', (source, direction, name, mime) => {
    const click = vi.fn();
    const anchor = { click, download: '', href: '' } as unknown as HTMLAnchorElement;
    const createElement = vi.spyOn(document, 'createElement').mockReturnValue(anchor);
    const blob = vi.spyOn(globalThis, 'Blob');

    downloadResult(source, direction);

    expect(blob).toHaveBeenCalledWith([source], { type: mime });
    expect(anchor.download).toBe(name);
    expect(anchor.href).toBe('blob:test');
    expect(click).toHaveBeenCalledOnce();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:test');
    createElement.mockRestore();
    blob.mockRestore();
  });
});
